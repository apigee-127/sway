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
var dirname = require('path').dirname;
var formatGenerators = require('./format-generators');
var helpers = require('../../helpers');
var JsonRefs = require('json-refs');
var Operation = require('../../types/operation');
var Parameter = require('../../types/parameter');
var Path = require('../../types/path');
var pathToRegexp = require('path-to-regexp');
var Response = require('../../types/response');
var SwaggerApi = require('../../types/api');
var validators = require('./validators');
var vHelpers = require('./helpers');
var YAML = require('js-yaml');

var collectionFormats = [undefined, 'csv', 'multi', 'pipes', 'ssv', 'tsv'];
var docsUrl = 'https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md';
var mocker = helpers.createJSONSchemaMocker({
  formatGenerators: formatGenerators
});
var parameterLocations = ['body', 'formData', 'header', 'path', 'query'];
var types = ['array', 'boolean', 'integer', 'object', 'number', 'string'];
var version = '2.0';

function realConvertValue (schema, options, value) {
  var originalValue = value; // Used in error reporting for invalid values
  var type = _.isPlainObject(schema) ? schema.type : undefined;
  var pValue = value;
  var pType = typeof pValue;
  var err;

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
        return realConvertValue(_.isArray(schema.items) ? schema.items[index] : schema.items, options, item);
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
        value = new Date(value);
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
}

function removeCirculars (doc) {
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
      _.set(doc, path, {});
    }

    ancestors.pop();
  }

  walk([], doc, []);
}

module.exports.collectionFormats = collectionFormats;

// The URL to the Swagger 2.0 documentation
module.exports.documentation = docsUrl;

module.exports.parameterLocations = parameterLocations;

// The array of supported HTTP methods for each path
module.exports.supportedHttpMethods = vHelpers.supportedHttpMethods;

module.exports.types = types;

// The version for this Swagger version
module.exports.version = version;

/**
 * Returns whether or not the provided definition can be processed.
 *
 * @param {object} definition - The potential Swagger definition to test
 *
 * @returns {boolean} Returns true only if the definition represents a Swagger 2.0 definition
 */
module.exports.canProcess = function (definition) {
  return definition.swagger === version;
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
 */
module.exports.convertValue = function (schema, options, value) {
  return realConvertValue(schema, options, value);
};

/**
 * Creates a SwaggerApi object from the provided Swagger definition.
 *
 * @param {object} definition - The Swagger definition
 * @param {object} options - The options passed to swaggerApi.create
 *
 * @returns {Promise} A promise that resolves the SwaggerApi after processing
 */
module.exports.createSwaggerApi = function (definition, options) {
  var jsonRefsOptions = options.jsonRefs || {};

  // Update the json-refs options to use the definition location
  if (_.isString(options.definition)) {
    jsonRefsOptions.relativeBase = dirname(options.definition);
  }

  // Update the json-refs options to process YAML
  if (_.isUndefined(jsonRefsOptions.loaderOptions)) {
    jsonRefsOptions.loaderOptions = {};
  }

  if (_.isUndefined(jsonRefsOptions.loaderOptions.processContent)) {
    jsonRefsOptions.loaderOptions.processContent = function (res, cb) {
      cb(undefined, YAML.safeLoad(res.text));
    };
  }

  return JsonRefs.resolveRefs(definition, jsonRefsOptions)
    .then(function (results) {
      // We need to remove all circular objects as z-schema does not work with them:
      //   https://github.com/zaggino/z-schema/issues/137
      removeCirculars(results.resolved);

      return new SwaggerApi(module.exports, definition, results.resolved, results.refs, options);
    });
};

/**
 * Returns a function used to validate Swagger 2.0 documents against its JSON Schema.
 *
 * @returns {function} The validator to use
 */
module.exports.getJSONSchemaValidator = function () {
  return validators.jsonSchemaValidator;
};

/**
 * Creates an array of Operation objects for each operation defined in path definition.
 *
 * @param {Path} pathObject - The Path object
 *
 * @returns {Operation[]} The Operation object array
 */
module.exports.getOperations = function (pathObject) {
  var operations = [];
  var pPath = JsonRefs.pathFromPtr(pathObject.ptr);
  var pParams = _.reduce(pathObject.definition.parameters, function (parameters, paramDef, index) {
    parameters[paramDef.name + ':' + paramDef.in] = {
      path: pPath.concat(['parameters', index.toString()]),
      definition: paramDef
    };

    return parameters;
  }, {});

  _.forEach(pathObject.definition, function (operation, method) {
    // Do not process non-operations
    if (_.indexOf(vHelpers.supportedHttpMethods, method) === -1) {
      return;
    }

    var cOperation = _.cloneDeep(operation); // Clone so we do not alter the input
    var oParams = {}; // Used to keep track of unique parameters
    var oPath = pPath.concat(method);

    // Add path parameters
    _.forEach(pParams, function (pParam, key) {
      oParams[key] = pParam;
    });

    // Add operation parameters (Overrides path-level parameters of same name+in combination)
    _.forEach(operation.parameters, function (paramDef, index) {
      oParams[paramDef.name + ':' + paramDef.in] = {
        path: oPath.concat(['parameters', index.toString()]),
        definition: paramDef
      };
    });

    // Attach our computed parameters/security to the operation
    cOperation.parameters = _.map(_.values(oParams), function (parameter) {
      // Used later by getOperationParameters to circumvent the chicken/egg situation (Removed there as well)
      parameter.definition.$$$ptr$$$ = JsonRefs.pathToPtr(parameter.path);

      return parameter.definition;
    });


    if (_.isUndefined(cOperation.security)) {
      cOperation.security = pathObject.api.resolved.security;
    }

    operations.push(new Operation(pathObject.api,
                                  pathObject,
                                  method,
                                  JsonRefs.pathToPtr(oPath),
                                  cOperation,
                                  cOperation.consumes || pathObject.api.resolved.consumes || [],
                                  cOperation.produces || pathObject.api.resolved.produces || []));
  });

  return operations;
};

/**
 * Returns an array of Parameter objects for the provided Operation.
 *
 * @param {Operation} operation - The Operation object
 *
 * @returns {Parameter[]} The Parameter object array
 */
module.exports.getOperationParameters = function (operation) {
  var pParams = _.reduce(operation.pathObject.getParameters(), function (params, param) {
    params[param.ptr] = param;

    return params;
  }, {});

  return _.map(operation.parameters, function (paramDef) {
    var ptr = paramDef.$$$ptr$$$;
    var pParam = pParams[ptr];

    // Remove so we do not have these properties littered throughout the document
    delete paramDef.$$$ptr$$$;

    if (_.isUndefined(pParam)) {
      return new Parameter(operation, ptr, paramDef, vHelpers.getParameterSchema(paramDef));
    } else {
      return pParam;
    }
  });
};

/**
 * Returns an array of Response objects for the provided Operation.
 *
 * @param {Operation} operation - The Operation object
 *
 * @returns {Response[]} The Response object array
 */
module.exports.getOperationResponses = function (operation) {
  return _.map(operation.definition.responses, function (responseDef, code) {
    return new Response(operation,
                        JsonRefs.pathToPtr(JsonRefs.pathFromPtr(operation.ptr).concat(['responses', code])),
                        responseDef,
                        code);
  });
};

/**
 * Returns an array of path-level Parameter objects for the provided Path.
 *
 * @param {Path} path - The Path object
 *
 * @returns {Parameter[]} The Parameter object array
 */
module.exports.getPathParameters = function (path) {
  return _.map(path.definition.parameters, function (paramDef, index) {
    return new Parameter(path,
                         JsonRefs.pathToPtr(JsonRefs.pathFromPtr(path.ptr).concat(index.toString())),
                         paramDef,
                         vHelpers.getParameterSchema(paramDef));
  });
};

/**
 * Creates an array of Path objects for each path defined in the Swagger document.
 *
 * @param {SwaggerApi} api - The Swagger API object
 *
 * @returns {Path[]} The Operation object array
 */
module.exports.getPaths = function (api) {
  var basePathPrefix = api.resolved.basePath || '/';

  // Remove trailing slash from the basePathPrefix so we do not end up with double slashes
  if (basePathPrefix.charAt(basePathPrefix.length - 1) === '/') {
    basePathPrefix = basePathPrefix.substring(0, basePathPrefix.length - 1);
  }

  return _.map(api.resolved.paths, function (pathDef, path) {
    return new Path(api,
                    path,
                    JsonRefs.pathToPtr(['paths', path]),
                    pathDef,
                    pathToRegexp(basePathPrefix + path.replace(/\{/g, ':').replace(/\}/g, '')));

  });
};

/**
 * Creates a sample value for the provided JSON Schema.
 *
 * @param {*} schema - The JSON Schema
 *
 * @returns {*} The sample value
 */
module.exports.getSample = function (schema) {
  return mocker(schema);
};

/**
 * Returns an array of functions used to validate Swagger 2.0 documents semantically.
 *
 * @returns {function[]} The validators to use
 */
module.exports.getSemanticValidators = function () {
  return validators.semanticValidators;
};
