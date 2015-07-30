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

var _ = require('lodash-compat');
var debug = require('debug')('swagger-core-api');
var parseUrl = require('url').parse;

var validCollectionFormats = [undefined, 'csv', 'multi', 'pipes', 'ssv', 'tsv'];
var validParameterLocations = ['body', 'formData', 'header', 'path', 'query'];
var validTypes = ['array', 'boolean', 'integer', 'object', 'number', 'string'];

function convertValue (schema, collectionFormat, value) {
  var originalValue = value; // Used in error reporting for invalid values
  var type = _.isPlainObject(schema) ? (schema.type || 'object') : undefined;

  if (validTypes.indexOf(type) === -1) {
    throw new TypeError('Invalid \'type\' value: ' + type);
  }

  // If there is no value, do not convert it
  if (_.isUndefined(value)) {
    return value;
  }

  switch (type) {
  case 'array':
    if (_.isString(value)) {
      if (validCollectionFormats.indexOf(collectionFormat) === -1) {
        throw new TypeError('Invalid \'collectionFormat\' value: ' + collectionFormat);
      }

      switch (collectionFormat) {
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
        return convertValue(_.isArray(schema.items) ? schema.items[index] : schema.items, collectionFormat, item);
      });
    } else {
      // Assume the value provided was intended to be an array
      value = [value];
    }

    break;
  case 'boolean':
    if (!_.isBoolean(value)) {
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else {
        throw new TypeError('Not a valid boolean: ' + value);
      }
    }

    break;
  case 'integer':
    if (!_.isNumber(value)) {
      value = parseInt(value, 10);

      if (_.isNaN(value)) {
        throw new TypeError('Not a valid integer: ' + originalValue);
      }
    }

    break;
  case 'object':
    if (!_.isPlainObject(value)) {
      if (_.isString(value)) {
        value = JSON.parse(value);
      } else {
        throw new TypeError('Not a valid object: ' + JSON.stringify(originalValue));
      }
    }

    break;
  case 'number':
    if (!_.isNumber(value)) {
      value = parseFloat(value);

      if (_.isNaN(value)) {
        throw new TypeError('Not a valid number: ' + originalValue);
      }
    }
    break;
  case 'string':
    if (['date', 'date-time'].indexOf(schema.format) > -1) {
      if (_.isString(value)) {
        value = new Date(value);
      }

      if (!_.isDate(value) || value.toString() === 'Invalid Date') {
        throw new TypeError('Not a valid ' + schema.format + ' string: ' + originalValue);
      }
    } else if (!_.isString(value)) {
      throw new TypeError('Not a valid string: ' + value);
    }

    break;

    // no default
  }

  return value;
}

/**
 * The Swagger Operation object.
 *
 * **Note:** Do not use directly.
 *
 * @param {SwaggerApi} api - The Swagger API object
 * @param {string} path - The operation path
 * @param {string} method - The operation method
 * @param {string} ptr - The JSON Pointer to the operation
 * @param {object} definition - The operation definition
 * @param {regexp} regexp - The regexp used to match request paths against this operation
 *
 * @constructor
 */
function Operation (api, path, method, ptr, definition, regexp) {
  this.api = api;
  this.path = path;
  this.method = method;
  this.ptr = ptr;
  this.definition = definition;
  this.regexp = regexp;

  // Assign Swagger definition properties to the operation for easy access
  _.assign(this, definition);

  debug('Found operation at %s', ptr);

  this.parameterObjects = api.plugin.getOperationParameters(this);

  // Bring in the security definitions for easier access
  this.securityDefinitions = _.reduce(definition.security, function (defs, reqs) {
    _.each(reqs, function (req, name) {
      var def = api.resolved.securityDefinitions[name];

      if (!_.isUndefined(def)) {
        defs[name] = def;
      }
    });

    return defs;
  }, {});
}

/**
 * Returns all parameters for the operation.
 *
 * @returns {Parameter[]} All parameters for the operation.
 */
Operation.prototype.getParameters = function () {
  return this.parameterObjects;
};

/**
 * Returns the JSON Schema for the requested code or the default response if no code is provided.
 *
 * @param {number|string} [code=default] - The response code
 *
 * @returns {object} The JSON Schema for the response, which can be undefined if the response schema is not provided
 *
 * @throws {Error} Thrown whenever the requested code does not exist (Throwing an error instead of returning undefined
 *                 is required due to undefined being a valid response schema indicating a void response)
 */
Operation.prototype.getResponseSchema = function (code) {
  var response;

  if (_.isUndefined(code)) {
    code = 'default';
  } else if (_.isNumber(code)) {
    code = (Math.floor(100 * code) / 100).toFixed(); // Overly cautious but oh well...
  }

  response = this.definition.responses[code];

  if (_.isUndefined(response)) {
    throw new Error('This operation does not have a defined \'' + code + '\' response code');
  } else {
    return response.schema;
  }
};

/**
 * Returns a sample value based on the requested code or the default response if no code is provided.
 *
 * @param {number|string} [code=default] - The response code
 *
 * @returns {*} The sample value for the response, which can be undefined if the response schema is not provided
 *
 * @throws {Error} Thrown whenever the requested code does not exist (Throwing an error instead of returning undefined
 *                 is required due to undefined being a valid response schema indicating a void response)
 */
Operation.prototype.getResponseSample = function (code) {
  var schema = this.getResponseSchema(code);
  var sample;

  if (!_.isUndefined(schema)) {
    sample = this.api.plugin.getSample(schema);
  }

  return sample;
};

/**
 * Object representing a parameter value.
 *
 * @param {Parameter} parameter - The Parameter Object
 * @param {*} raw - The original/raw value
 *
 * @property {Error[]} errors - The error(s) encountered during processing the paramter value
 * @property {*} raw - The original parameter value *(Does not take default values into account)*
 * @property {*} value - The processed value *(Takes default values into account and does type coercion when necessary)*
 *
 * @constructor
 */
function ParameterValue (parameter, raw) {
  var processed = false;
  var schema = parameter.computedSchema;
  var processedValue;

  this.errors = [];
  this.raw = raw;

  // Use Object.defineProperty for 'value' to allow for lazy processing of the raw value
  Object.defineProperty(this, 'value', {
    enumerable: true,
    get: function () {
      if (!processed) {
        // Convert/Coerce the raw value from the request object
        try {
          processedValue = convertValue(schema, parameter.collectionFormat, raw);
        } catch (err) {
          this.errors.push(err);
        }

        // If there is still no value and there are no errors, use the default value if available (no coercion)
        if (_.isUndefined(processedValue) && this.errors.length === 0) {
          if (schema.type === 'array') {
            if (_.isArray(schema.items)) {
              processedValue = _.reduce(schema.items, function (items, item) {
                items.push(item.default);

                return items;
              }, []);

              // If none of the items have a default value reset the processed value to 'undefined'
              if (_.all(processedValue, _.isUndefined)) {
                processedValue = undefined;
              }
            } else {
              if (!_.isUndefined(schema.items) && !_.isUndefined(schema.items.default)) {
                processedValue = [schema.items.default];
              }
            }
          } else {
            if (!_.isUndefined(schema.default)) {
              processedValue = schema.default;
            }
          }
        }

        processed = true;
      }

      return processedValue;
    }
  });
}

/**
 * The Swagger Parameter object.
 *
 * **Note:** Do not use directly.
 *
 * @param {Operation} operation - The Swagger Operation object
 * @param {string} ptr - The JSON Pointer to the parameter
 * @param {object} definition - The parameter definition
 * @param {object} schema - The JSON Schema for the parameter
 *
 * @constructor
 */
function Parameter (operation, ptr, definition, schema) {
  this.operation = operation;
  this.ptr = ptr;
  this.definition = definition;
  this.computedSchema = schema;

  // Assign Swagger definition properties to the parameter for easy access
  _.assign(this, definition);

  debug('Found operation parameter (%s %s) at %s', operation.method.toUpperCase(), operation.path, ptr);
}

/**
 * Returns the computed JSON Schema for this parameter object.
 *
 * @returns {object} The JSON Schema
 */
Parameter.prototype.getSchema = function () {
  return this.computedSchema;
};

/**
 * Returns a sample value for the parameter based on its schema;
 *
 * @returns {*} The sample value
 */
Parameter.prototype.getSample = function () {
  return this.operation.api.plugin.getSample(this.computedSchema);
};

/**
 * Returns the parameter value from the request.
 *
 * **Note:** Below is the list `req` of properties used:
 *
 * * `body`: Used for `body` and `formData` parameters
 * * `files`: Used for `formData` parameters whose `type` is `file`
 * * `header`: Used for `header` parameters
 * * `query`: Used for `query` parameters
 *
 * For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the `url`
 * property.
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {object} req - The http client request *(or equivalent)*
 *
 * @returns {ParameterValue} The parameter value object
 *
 * @throws {Error} If the `in` value of the parameter's schema is not valid or if the `req` property to retrieve the
 *                 parameter is missing.
 */
Parameter.prototype.getValue = function (req) {
  if (_.isUndefined(req)) {
    throw new TypeError('req is required');
  } else if (!_.isPlainObject(req)) {
    throw new TypeError('req must be an object');
  } else if (validParameterLocations.indexOf(this.in) === -1) {
    throw new Error('Invalid \'in\' value: ' + this.in);
  }

  var that = this;
  var type = this.computedSchema.type || 'object';
  var pathMatch;
  var value;

  switch (this.in) {
  case 'body':
    value = req.body;
    break;
  case 'formData':
    // For formData, either the value is a file or a property of req.body.  req.body as a whole can never be the
    // value since the JSON Schema for formData parameters does not allow a type of 'object'.
    if (type === 'file') {
      if (_.isUndefined(req.files)) {
        throw new Error('req.files must be provided for \'formData\' parameters of type \'file\'');
      }

      value = req.files[this.name];
    } else {
      if (_.isUndefined(req.body)) {
        throw new Error('req.body must be provided for \'formData\' parameters');
      }
      value = req.body[this.name];
    }
    break;
  case 'header':
    if (_.isUndefined(req.headers)) {
      throw new Error('req.headers must be provided for \'header\' parameters');
    }

    value = req.headers[this.name.toLowerCase()];
    break;
  case 'path':
    if (_.isUndefined(req.url)) {
      throw new Error('req.url must be provided for \'path\' parameters');
    }

    // Since we get the raw path parameter value, we need to URI decode it
    pathMatch = this.operation.regexp.exec(parseUrl(decodeURIComponent(req.url)).pathname);

    if (pathMatch) {
      value = pathMatch[_.findIndex(this.operation.regexp.keys, function (key) {
        return key.name === that.name;
      }) + 1];
    }
    break;
  case 'query':
    if (_.isUndefined(req.query)) {
      throw new Error('req.query must be provided for \'query\' parameters');
    }
    value = req.query[this.name];
    break;

    // no default
  }

  return new ParameterValue(this, value);
};

/**
 * Callback used for validation.
 *
 * @param {SwaggerApi} api - The Swagger API object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 *
 * @callback validatorCallback
 */

/**
 * The Swagger API object.
 *
 * **Note:** Do not use directly.
 *
 * @param {object} plugin - The Swagger version plugin
 * @param {object} definition - The Swagger definition
 * @param {object} resolved - The fully resolved Swagger definition
 * @param {object} references - The location and resolution of the resolved references in the Swagger definition
 * @param {object} options - The options passed to swaggerApi.create
 * @param {validatorCallback[]} [options.customValidators] - The custom validators
 *
 * @constructor
 */
function SwaggerApi (plugin, definition, resolved, references, options) {
  this.customValidators = [];
  this.definition = definition;
  this.documentation = plugin.documentation;
  this.errors = undefined;
  this.plugin = plugin;
  this.references = references;
  this.resolved = resolved;
  this.version = plugin.version;
  this.warnings = undefined;
  this.options = options;

  // Assign Swagger definition properties to the api for easy access
  _.assign(this, definition);

  debug('New Swagger API (%s)', _.isString(options.definition) ? options.definition : 'JavaScript Object');

  this.operationObjects = plugin.getOperations(this);

  // Register custom validators
  _.forEach(options.validators, this.registerValidator);
}

/**
 * Returns the errors from the last validate call.
 *
 * @returns {object[]} The errors from the previous call to validate or undefined if validate was never called
 */
SwaggerApi.prototype.getLastErrors = function () {
  return this.errors;
};

/**
 * Returns the warnings from the last validate call.
 *
 * @returns {object[]} The warnings from the previous call to validate or undefined if validate was never called
 */
SwaggerApi.prototype.getLastWarnings = function () {
  return this.warnings;
};

/**
 * Returns the operation for the given path and operation.
 *
 * **Note:** Below is the list of `reqOrPath` properties used when `reqOrPath` is an `http.ClientRequest`
 *           *(or equivalent)*:
 *
 * * `method`
 * * `url`
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {string|object} pathOrReq - The Swagger path string or the http client request *(or equivalent)*
 * @param {string} [method] - The Swagger operation method
 *
 * @returns {Operation} The operation for the provided path and method or undefined if there is no operation for that
 *                      path and method combination.
 */
SwaggerApi.prototype.getOperation = function (pathOrReq, method) {
  var predicate;
  var url;

  if (_.isObject(pathOrReq)) {
    method = pathOrReq.method;
    url = parseUrl(pathOrReq.url).pathname;
    predicate = function (operation) {
      return operation.method === method && _.isArray(operation.regexp.exec(url));
    };
  } else {
    predicate = function (operation) {
      return operation.path === pathOrReq && operation.method === method;
    };
  }

  method = method.toLowerCase();

  return _.find(this.operationObjects, predicate);
};

/**
 * Returns all operations for the provided path or all operations in the API.
 *
 * @param {string} [path] - The Swagger path
 *
 * @returns {Operation[]} All operations for the provided path or all API operations.
 */
SwaggerApi.prototype.getOperations = function (path) {
  return _.filter(this.operationObjects, function (operation) {
    return _.isUndefined(path) ? true : operation.path === path;
  });
};

/**
 * Registers a validator.
 *
 * @param {validatorCallback} validator - The validator
 *
 * @throws {TypeError} If the validator is not a function
 */
SwaggerApi.prototype.registerValidator = function (validator) {
  if (_.isUndefined(validator)) {
    throw new TypeError('validator is required');
  } else if (!_.isFunction(validator)) {
    throw new TypeError('validator must be a function');
  }

  this.customValidators.push(validator);
};

/**
 * Performs validation of the Swagger API document(s).
 *
 * @returns {boolean} True if all validators produce zero errors and false otherwise
 */
SwaggerApi.prototype.validate = function () {
  var self = this;

  // Reset the errors and warnings
  this.errors = [];
  this.warnings = [];

  function doValidation (validator) {
    var results = validator(self);

    if (results.errors.length > 0) {
      self.errors = self.errors.concat(results.errors);
    }

    if (results.warnings.length > 0) {
      self.warnings = self.warnings.concat(results.warnings);
    }
  }

  // Validate the document structurally
  doValidation(this.plugin.getJSONSchemaValidator());

  // Perform remaining validation only if the document is structurally valid
  if (this.errors.length === 0) {
    // Run plugin validators
    _.forEach(this.plugin.getSemanticValidators(), doValidation);

    // Run custom validators
    _.forEach(this.customValidators, doValidation);
  }

  return this.errors.length === 0;
};

module.exports = {
  Operation: Operation,
  Parameter: Parameter,
  SwaggerApi: SwaggerApi
};
