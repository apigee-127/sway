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
var debug = require('debug')('sway');
var helpers = require('./helpers');
var JsonRefs = require('json-refs');
var parseUrl = require('url').parse;
var YAML = require('js-yaml');

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
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
 *                       object.
 *
 * @param {SwaggerApi} api - The Swagger API object
 * @param {Path} pathObject - The Path object
 * @param {string} method - The operation method
 * @param {string} ptr - The JSON Pointer to the operation
 * @param {object} definition - The operation definition
 *
 * @property {SwaggerApi} api - The Swagger API object
 * @property {object} definition - The operation definition
 * @property {string} method - The HTTP method for this operation
 * @property {Path} pathObject - The Path object
 * @property {Parameter[]} parameterObjects - The Parameter objects
 * @property {string} ptr - The JSON Pointer to the operation
 * @property {object} securityDefinitions - The security definitions used by this operation
 *
 * @constructor
 */
function Operation (api, pathObject, method, ptr, definition) {
  this.api = api;
  this.pathObject = pathObject;
  this.method = method;
  this.ptr = ptr;
  this.definition = definition;

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
 * Returns the response example for the requested code and/or mime-type.
 *
 * @param {number|string} codeOrMimeType - The response code or mime-type (Uses the default response code if this is
 *                                         the only argument)
 * @param {string} [mimeType] - The mime type
 *
 * @returns {string} The response example as a string or `undefined` if the response code and/or mime-type is missing
 */
Operation.prototype.getResponseExample = function (codeOrMimeType, mimeType) {
  var response;
  var example;

  if (_.isUndefined(mimeType)) {
    mimeType = codeOrMimeType;
    codeOrMimeType = 'default';
  }

  response = this.definition.responses[codeOrMimeType];

  if (!_.isUndefined(response) && _.isPlainObject(response.examples)) {
    example = response.examples[mimeType];
  }

  if (!_.isUndefined(example) && !_.isString(example)) {
    if (mimeType === 'application/json') {
      example = JSON.stringify(example, null, 2);
    } else if (mimeType === 'application/x-yaml') {
      example = YAML.safeDump(example, {indent: 2});
    }
  }

  return example;
};

/**
 * Returns the JSON Schema for the requested code.
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
 * **Note:** Do not use directly.
 *
 * @param {Parameter} parameter - The Parameter Object
 * @param {*} raw - The original/raw value
 *
 * @property {Error} error - The error(s) encountered during processing/validating the paramter value
 * @property {*} raw - The original parameter value *(Does not take default values into account)*
 * @property {boolean} valid - Whether or not this parameter is valid based on its JSON Schema
 * @property {*} value - The processed value *(Takes default values into account and does type coercion when necessary)*
 *
 * @constructor
 */
function ParameterValue (parameter, raw) {
  var pPath = JsonRefs.pathFromPointer(parameter.ptr);
  var processed = false;
  var schema = parameter.computedSchema;
  var error;
  var isValid;
  var processedValue;

  this.raw = raw;

  // Use Object.defineProperty for 'value' to allow for lazy processing of the raw value
  Object.defineProperties(this, {
    error: {
      enumerable: true,
      get: function () {
        // Always call this.valid to ensure we validate the value prior to returning any values
        if (this.valid === true) {
          return undefined;
        } else {
          return error;
        }
      }
    },
    valid: {
      enumerable: true,
      get: function () {
        var result;
        var value;
        var vError;

        if (_.isUndefined(isValid)) {
          isValid = true;
          value = this.value;

          if (_.isUndefined(error)) {
            try {
              // Validate requiredness
              if (parameter.required === true && _.isUndefined(value)) {
                vError = new Error('Value is required but was not provided');

                vError.code = 'REQUIRED';

                throw vError;
              }

              // Validate against JSON Schema
              result = helpers.validateAgainstSchema(helpers.createJSONValidator({
                formatValidators: parameter.pathObject.api.plugin.customFormatValidators
              }), parameter.getSchema(), value);

              if (result.errors.length > 0) {
                vError = new Error('Value failed JSON Schema validation');

                vError.code = 'SCHEMA_VALIDATION_FAILED';
                vError.errors = result.errors;

                throw vError;
              }
            } catch (err) {
              err.failedValidation = true;
              err.path = pPath;

              error = err;
              isValid = false;
            }
          } else {
            isValid = false;
          }
        }

        return isValid;
      }
    },
    value: {
      enumerable: true,
      get: function () {
        if (!processed) {
          // Convert/Coerce the raw value from the request object
          try {
            processedValue = convertValue(schema, parameter.collectionFormat, raw);
          } catch (err) {
            error = err;
          }

          // If there is still no value and there are no errors, use the default value if available (no coercion)
          if (_.isUndefined(processedValue) && _.isUndefined(error)) {
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
    }
  });
}

/**
 * The Swagger Parameter object.
 *
 * **Note:** Do not use directly.
 *
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
 *                       object.
 *
 * @param {Operation|Path} opOrPath - The Operation or Path object
 * @param {string} ptr - The JSON Pointer to the parameter
 * @param {object} definition - The parameter definition
 * @param {object} schema - The JSON Schema for the parameter
 *
 * @property {object} definition - The parameter definition
 * @property {Operation} operationObject - The Operation object (Can be undefined for path-level parameters)
 * @property {Path} pathObject - The Path object
 * @property {string} ptr - The JSON Pointer to the parameter definition
 * @property {object} schema - The JSON Schema for the parameter
 *
 * @constructor
 */
function Parameter (opOrPath, ptr, definition, schema) {
  this.computedSchema = schema;
  this.definition = definition;
  this.ptr = ptr;

  if (opOrPath instanceof Operation) {
    this.operationObject = opOrPath;
    this.pathObject = opOrPath.pathObject;
  } else {
    this.operationObject = undefined;
    this.pathObject = opOrPath;
  }

  // Assign Swagger definition properties to the parameter for easy access
  _.assign(this, definition);

  debug('Found %s parameter (%s in %s) at %s',
        _.isUndefined(this.operationObject) ? 'path-level' : 'operation',
        definition.name,
        definition.in,
        ptr);
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
  return this.pathObject.api.plugin.getSample(this.computedSchema);
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
    pathMatch = this.pathObject.regexp.exec(parseUrl(decodeURIComponent(req.url)).pathname);

    if (pathMatch) {
      value = pathMatch[_.findIndex(this.pathObject.regexp.keys, function (key) {
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
 * The Path object.
 *
 * **Note:** Do not use directly.
 *
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
 *                       object.
 *
 * @param {SwaggerApi} api - The Swagger API object
 * @param {string} path - The path string
 * @param {ptr} ptr - The JSON Pointer to the path
 * @param {object} definition - The path definition
 * @param {regexp} regexp - The regexp used to match request paths against this path
 *
 * @property {SwaggerApi} api - The Swagger API object
 * @property {object} definition - The path definition
 * @property {Operation[]} operationObjects - The operation objects
 * @property {Parameter[]} parameterObjects - The path-level parameter objects
 * @property {string} path - The path string
 * @property {ptr} ptr - The JSON Pointer to the path
 * @property {regexp} regexp - The regexp used to match request paths against this path
 *
 * @constructor
 */
function Path (api, path, ptr, definition, regexp) {
  this.api = api;
  this.path = path;
  this.ptr = ptr;
  this.definition = definition;
  this.regexp = regexp;

  // Assign Swagger definition properties to the operation for easy access
  _.assign(this, definition);

  debug('Found path at %s', ptr);

  this.parameterObjects = api.plugin.getPathParameters(this);
  this.operationObjects = api.plugin.getOperations(this);
}

/**
 * Return the operation for this path and method.
 *
 * @param {string} method - The method
 *
 * @returns {Operation[]} The Operation objects for this path and method or undefined if there is no operation for the
 *                        provided method.
 */
Path.prototype.getOperation = function (method) {
  return _.find(this.operationObjects, function (operationObject) {
    return operationObject.method === method;
  });
};

/**
 * Return the operations for this path.
 *
 * @returns {Operation[]} The Operation objects for this path.
 */
Path.prototype.getOperations = function () {
  return this.operationObjects;
};

/**
 * Return the operations for this path and tag.
 *
 * @param {string} tag - The tag
 *
 * @returns {Operation[]} The Operation objects for this path and tag
 */
Path.prototype.getOperationsByTag = function (tag) {
  return _.filter(this.operationObjects, function (operationObject) {
    return _.contains(operationObject.tags, tag);
  });
};

/**
 * Return the parameters for this path.
 *
 * @returns {Parameter[]} The Parameter objects for this path.
 */
Path.prototype.getParameters = function () {
  return this.parameterObjects;
};

/**
 * Callback used for validation.
 *
 * @param {SwaggerApi} api - The Swagger API object
 *
 * @returns {object} The validation results.  This object should contain two properties: `errors` and `warnings`.  Each
 *                   of these property values should be an array of objects that have at minimum the following
 *                   properties:
 *
 *                     * code: The code used to identify the error/warning
 *                     * message: The human readable message for the error/warning
 *                     * path: The array of path segments to portion of the document associated with the error/warning
 *
 *                   Any other properties can be added to the error/warning objects as well but these must be there.
 *
 * @callback validatorCallback
 */

/**
 * The Swagger API object.
 *
 * **Note:** Do not use directly.
 *
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
 *                       object.
 *
 * @param {object} plugin - The Swagger version plugin
 * @param {object} definition - The Swagger definition
 * @param {object} resolved - The fully resolved Swagger definition
 * @param {object} references - The location and resolution of the resolved references in the Swagger definition
 * @param {object} options - The options passed to swaggerApi.create
 * @param {validatorCallback[]} [options.customValidators] - The custom validators
 *
 * @property {function[]} customValidators - The array of custom validators
 * @property {object} definition - The API definition
 * @property {string} documentation - The URL to the Swagger documentation
 * @property {object[]} errors - The validation errors or undefined if validation has not run
 * @property {Path[]} pathObjects - The unique path objects
 * @property {object} options - The options passed to the constructor
 * @property {object} references - The reference metadata
 * @property {object} resolved - The fully resolved API definition
 * @property {string} version - The Swagger API version
 * @property {object[]} warnings - The validation warnings or undefined if validation has not run
 *
 * @constructor
 */
function SwaggerApi (plugin, definition, resolved, references, options) {
  this.customValidators = [];
  this.definition = definition;
  this.documentation = plugin.documentation;
  this.errors = undefined;
  this.options = options;
  this.plugin = plugin;
  this.references = references;
  this.resolved = resolved;
  this.version = plugin.version;
  this.warnings = undefined;

  // Assign Swagger definition properties to the api for easy access
  _.assign(this, definition);

  debug('New Swagger API (%s)', _.isString(options.definition) ? options.definition : 'JavaScript Object');

  this.pathObjects = plugin.getPaths(this);

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
  var pathObject = this.getPath(pathOrReq);
  var operation;

  if (!_.isUndefined(pathObject)) {
    if (_.isObject(pathOrReq)) {
      method = pathOrReq.method;
    }

    if (!_.isUndefined(method)) {
      method = method.toLowerCase();
    }

    operation = pathObject.getOperation(method);
  }

  return operation;
};

/**
 * Returns all operations for the provided path or all operations in the API.
 *
 * @param {string} [path] - The Swagger path
 *
 * @returns {Operation[]} All operations for the provided path or all API operations.
 */
SwaggerApi.prototype.getOperations = function (path) {
  var operations = [];
  var pathObject;

  if (_.isUndefined(path)) {
    _.each(this.pathObjects, function (pObject) {
      operations.push.apply(operations, pObject.getOperations());
    });
  } else {
    pathObject = this.getPath(path);

    if (!_.isUndefined(pathObject)) {
      operations = pathObject.getOperations();
    }
  }

  return operations;
};

/**
 * Returns all operations for the provided tag.
 *
 * @param {string} [tag] - The Swagger tag
 *
 * @returns {Operation[]} All operations for the provided tag.
 */
SwaggerApi.prototype.getOperationsByTag = function (tag) {
  return _.reduce(this.pathObjects, function (operations, pathObject) {
    operations.push.apply(operations, pathObject.getOperationsByTag(tag));

    return operations;
  }, []);
};

/**
 * Returns the path object for the given path or request.
 *
 * **Note:** Below is the list of `reqOrPath` properties used when `reqOrPath` is an `http.ClientRequest`
 *           *(or equivalent)*:
 *
 * * `url`
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {string|object} pathOrReq - The Swagger path string or the http client request *(or equivalent)*
 *
 * @returns {Path} The corresponding Path object for the requested path or request.
 */
SwaggerApi.prototype.getPath = function (pathOrReq) {
  var url;

  if (_.isObject(pathOrReq)) {
    url = parseUrl(pathOrReq.url).pathname;

    return _.find(this.pathObjects, function (pathObject) {
      return _.isArray(pathObject.regexp.exec(url));
    });
  } else {
    return _.find(this.pathObjects, function (pathObject) {
      return pathOrReq === pathObject.path;
    });
  }
};

/**
 * Returns all path objects for the Swagger API.
 *
 * @returns {Path[]} The Path objects
 */
SwaggerApi.prototype.getPaths = function () {
  return this.pathObjects;
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
  Path: Path,
  SwaggerApi: SwaggerApi
};
