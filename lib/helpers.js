/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Apigee Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var _ = require('lodash');
var formatGenerators = require('./validation/format-generators');
var formatValidators = require('./validation/format-validators');
var mocker = require('json-schema-faker');
var ZSchema = require('z-schema');

// full-date from http://xml2rfc.ietf.org/public/rfc/html/rfc3339.html#anchor14
var dateRegExp = new RegExp(
  '^' +
  '\\d{4}' + // year
  '-' +
  '([0]\\d|1[012])' + // month
  '-' +
  '(0[1-9]|[12]\\d|3[01])' + // day
  '$');

// date-time from http://xml2rfc.ietf.org/public/rfc/html/rfc3339.html#anchor14
var dateTimeRegExp = new RegExp(
  '^' +
  '\\d{4}' + // year
  '-' +
  '([0]\\d|1[012])' + // month
  '-' +
  '(0[1-9]|[12]\\d|3[01])' + // day
  'T' +
  '([01]\\d|2[0-3])' + // hour
  ':' +
  '[0-5]\\d' + // minute
  ':' +
  '[0-5]\\d' + // second
  '(\\.\\d+)?' + // fractional seconds
  '(Z|(\\+|-)([01]\\d|2[0-4]):[0-5]\\d)' + // Z or time offset
  '$');

var collectionFormats = [undefined, 'csv', 'multi', 'pipes', 'ssv', 'tsv'];
var jsonMocker = createJSONMocker();
var jsonSchemaValidator = createJSONValidator();
// https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#parameter-object
var parameterSchemaProperties = [
  'allowEmptyValue',
  'default',
  'description',
  'enum',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'format',
  'items',
  'maxItems',
  'maxLength',
  'maximum',
  'minItems',
  'minLength',
  'minimum',
  'multipleOf',
  'pattern',
  'type',
  'uniqueItems'
];
var types = ['array', 'boolean', 'integer', 'object', 'number', 'string'];

function createJSONMocker () {
  // Extend faker.js to only include the 'en' locale
  mocker.extend('faker', function (faker) {
    faker.locale = 'en';

    return faker;
  });

  // Add the custom format generators
  _.each(formatGenerators, function (handler, name) {
    mocker.formats(name, handler);
  });

  return mocker;
}

function createJSONValidator () {
  var validator = new ZSchema({
    breakOnFirstError: false,
    ignoreUnknownFormats: true,
    reportPathAsArray: true
  });

  // Add the custom validators
  _.each(formatValidators, function (handler, name) {
    ZSchema.registerFormat(name, handler);
  });

  return validator;
}

function normalizeError (obj) {
  // Remove superfluous error details
  if (_.isUndefined(obj.schemaId)) {
    delete obj.schemaId;
  }

  if (obj.inner) {
    _.each(obj.inner, function (nObj) {
      normalizeError(nObj);
    });
  }
}
/**
 * Helper method to take a Swagger parameter definition and compute its schema.
 *
 * For non-body Swagger parameters, the definition itself is not suitable as a JSON Schema so we must compute it.
 *
 * @param {object} paramDef - The parameter definition
 *
 * @returns {object} The computed schema
 */
module.exports.computeParameterSchema = function (paramDef) {
  var schema;

  if (_.isUndefined(paramDef.schema)) {
    schema = {};

    // Build the schema from the schema-like parameter structure
    _.forEach(parameterSchemaProperties, function (name) {
      if (!_.isUndefined(paramDef[name])) {
        schema[name] = paramDef[name];
      }
    });
  } else {
    schema = paramDef.schema;
  }

  return schema;
};

/**
 * Converts a raw JavaScript value to a JSON Schema value based on its schema.
 *
 * @param {object} schema - The schema for the value
 * @param {object} options - The conversion options
 * @param {string} [options.collectionFormat] - The collection format
 * @param {string} [options.encoding] - The encoding if the raw value is a `Buffer`
 * @param {*} value - The value to convert
 *
 * @returns {*} The converted value
 *
 * @throws {TypeError} IF the `collectionFormat` or `type` is invalid for the `schema`, or if conversion fails
 */
var convertValue = module.exports.convertValue = function (schema, options, value) {
  var originalValue = value; // Used in error reporting for invalid values
  var type = _.isPlainObject(schema) ? schema.type : undefined;
  var pValue = value;
  var pType = typeof pValue;
  var err;
  var isDate;
  var isDateTime;

  // If there is an explicit type provided, make sure it's one of the supported ones
  if (_.has(schema, 'type') && types.indexOf(type) === -1) {
    throw new TypeError('Invalid \'type\' value: ' + type);
  }

  // Since JSON Schema allows you to not specify a type and it is treated as a wildcard of sorts, we should not do any
  // coercion for these types of values.
  if (_.isUndefined(type)) {
    return value;
  }

  // If there is no value, do not convert it
  if (_.isUndefined(value)) {
    return value;
  }

  // Convert Buffer value to String
  // (We use this type of check to identify Buffer objects.  The browser does not have a Buffer type and to avoid having
  //  import the browserify buffer module, we just do a simple check.  This is brittle but should work.)
  if (_.isFunction(value.readUInt8)) {
    value = value.toString(options.encoding);
    pValue = value;
    pType = typeof value;
  }

  // If the value is empty and empty is allowed, use it
  if (schema.allowEmptyValue && value === '') {
    return value;
  }

  // Attempt to parse the string as JSON if the type is array or object
  if (['array', 'object'].indexOf(type) > -1) {
    try {
      value = JSON.parse(value);
    } catch (err) {
      // Nothing to do here, just fall through
    }
  }

  switch (type) {
  case 'array':
    if (_.isString(value)) {
      if (collectionFormats.indexOf(options.collectionFormat) === -1) {
        throw new TypeError('Invalid \'collectionFormat\' value: ' + options.collectionFormat);
      }

      switch (options.collectionFormat) {
      case 'csv':
      case undefined:
        value = value.split(',');
        break;
      case 'multi':
        value = [value];
        break;
      case 'pipes':
        value = value.split('|');
        break;
      case 'ssv':
        value = value.split(' ');
        break;
      case 'tsv':
        value = value.split('\t');
        break;

        // no default
      }
    }

    if (_.isArray(value)) {
      value = _.map(value, function (item, index) {
        return convertValue(_.isArray(schema.items) ? schema.items[index] : schema.items, options, item);
      });
    }

    break;
  case 'boolean':
    if (!_.isBoolean(value)) {
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else {
        err = new TypeError('Not a valid boolean: ' + value);
      }
    }

    break;
  case 'integer':
    if (!_.isNumber(value)) {
      if (_.isString(value) && _.trim(value).length === 0) {
        value = NaN;
      }

      value = Number(value);

      if (_.isNaN(value)) {
        err = new TypeError('Not a valid integer: ' + originalValue);
      }
    }

    break;
  case 'number':
    if (!_.isNumber(value)) {
      if (_.isString(value) && _.trim(value).length === 0) {
        value = NaN;
      }

      value = Number(value);

      if (_.isNaN(value)) {
        err = new TypeError('Not a valid number: ' + originalValue);
      }
    }
    break;
  case 'string':
    if (['date', 'date-time'].indexOf(schema.format) > -1) {
      if (_.isString(value)) {
        isDate = schema.format === 'date' && dateRegExp.test(value);
        isDateTime = schema.format === 'date-time' && dateTimeRegExp.test(value);

        if (!isDate && !isDateTime) {
          err = new TypeError('Not a valid ' + schema.format + ' string: ' + originalValue);
          err.code = 'INVALID_FORMAT';
        } else {
          value = new Date(value);
        }
      }

      if (!_.isDate(value) || value.toString() === 'Invalid Date') {
        err = new TypeError('Not a valid ' + schema.format + ' string: ' + originalValue);

        err.code = 'INVALID_FORMAT';
      }
    } else if (!_.isString(value)) {
      err = new TypeError('Not a valid string: ' + value);
    }

    break;

    // no default
  }

  if (!_.isUndefined(err)) {
    // Convert the error to be more like a JSON Schema validation error
    if (_.isUndefined(err.code)) {
      err.code = 'INVALID_TYPE';
      err.message = 'Expected type ' + type + ' but found type ' + pType;
    } else {
      err.message = 'Object didn\'t pass validation for format ' + schema.format + ': ' + pValue;
    }

    // Format and type errors resemble JSON Schema validation errors
    err.failedValidation = true;
    err.path = [];

    throw err;
  }

  return value;
};

/**
 * Returns the provided content type or `application/octet-stream` if one is not provided.
 *
 * @see http://www.w3.org/Protocols/rfc2616/rfc2616-sec7.html#sec7.2.1
 *
 * @param {object} headers - The headers to search
 *
 * @returns {string} The content type
 */
module.exports.getContentType = function (headers) {
  return getHeaderValue(headers, 'content-type') || 'application/octet-stream';
};

/**
 * Returns the header value regardless of the case of the provided/requested header name.
 *
 * @param {object} headers - The headers to search
 * @param {string} headerName - The header name
 *
 * @returns {string} The header value or `undefined` if it is not found
 */
var getHeaderValue = module.exports.getHeaderValue = function (headers, headerName) {
  // Default to an empty object
  headers = headers || {};

  var lcHeaderName = headerName.toLowerCase();
  var realHeaderName = _.find(Object.keys(headers), function (header) {
    return header.toLowerCase() === lcHeaderName;
  });

  return headers[realHeaderName];
}

/**
 * Returns a json-schema-faker mocker.
 *
 * @returns {object} The json-schema-faker mocker to use
 */
module.exports.getJSONSchemaMocker = function () {
  return jsonMocker;
};

/**
 * Returns a z-schema validator.
 *
 * @returns {object} The z-schema validator to use
 */
module.exports.getJSONSchemaValidator = function () {
  return jsonSchemaValidator;
};

module.exports.parameterLocations = ['body', 'formData', 'header', 'path', 'query'];

/**
 * Replaces the circular references in the provided object with an empty object.
 *
 * @param {object} obj - The JavaScript object
 */
module.exports.removeCirculars = function (obj) {
  function walk (ancestors, node, path) {
    function walkItem (item, segment) {
      path.push(segment);
      walk(ancestors, item, path);
      path.pop();
    }

    // We do not process circular objects again
    if (ancestors.indexOf(node) === -1) {
      ancestors.push(node);

      if (_.isArray(node) || _.isPlainObject(node)) {
        _.each(node, function (member, indexOrKey) {
          walkItem(member, indexOrKey.toString());
        });
      }
    } else {
      _.set(obj, path, {});
    }

    ancestors.pop();
  }

  walk([], obj, []);
}

/**
 * Validates the provided value against the JSON Schema by name or value.
 *
 * @param {object} validator - The JSON Schema validator created via {@link #createJSONValidator}
 * @param {object} schema - The JSON Schema
 * @param {*} value - The value to validate
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
module.exports.validateAgainstSchema = function (validator, schema, value) {
  schema = _.cloneDeep(schema); // Clone the schema as z-schema alters the provided document

  var response = {
    errors: [],
    warnings: []
  };

  if (!validator.validate(value, schema)) {
    response.errors = _.map(validator.getLastErrors(), function (err) {
      normalizeError(err);

      return err;
    });
  }

  return response;
};

/**
 * Validates the content type.
 *
 * @param {string} contentType - The Content-Type value of the request/response
 * @param {string[]} supportedTypes - The supported (declared) Content-Type values for the request/response
 * @param {object} results - The results object to update in the event of an invalid content type
 */
module.exports.validateContentType = function (contentType, supportedTypes, results) {
  var rawContentType = contentType;

  if (!_.isUndefined(contentType)) {
    // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.17
    contentType = contentType.split(';')[0]; // Strip the parameter(s) from the content type
  }

  // Check for exact match or mime-type only match
  if (_.indexOf(supportedTypes, rawContentType) === -1 && _.indexOf(supportedTypes, contentType) === -1) {
    results.errors.push({
      code: 'INVALID_CONTENT_TYPE',
      message: 'Invalid Content-Type (' + contentType + ').  These are supported: ' +
        supportedTypes.join(', '),
      path: []
    });
  }
};
