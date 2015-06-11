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

/**
 * The Swagger Operation object.
 *
 * <strong>Note:</strong> Do not use directly.
 *
 * @param {SwaggerApi} api - The Swagger API object
 * @param {string} path - The operation path
 * @param {string} method - The operation method
 * @param {string} ptr - The JSON Pointer to the operation
 * @param {object} definition - The operation definition
 *
 * @constructor
 */
function Operation (api, path, method, ptr, definition) {
  this.api = api;
  this.path = path;
  this.method = method;
  this.ptr = ptr;
  this.definition = definition;

  // Assign Swagger definition properties to the operation for easy access
  _.assign(this, definition);

  debug('Found operation at %s', ptr);

  this.parameterObjects = api.plugin.getOperationParameters(this);
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
 * The Swagger Parameter object.
 *
 * <strong>Note:</strong> Do not use directly.
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
  var sample;

  if (!_.isUndefined(this.computedSchema)) {
    sample = this.operation.api.plugin.getSample(this.computedSchema);
  }

  return sample;
};

/**
 * Callback used for validation.
 *
 * @param {SwaggerApi} api - The Swagger API object
 *
 * @callback validatorCallback
 */

/**
 * The Swagger API object.
 *
 * <strong>Note:</strong> Do not use directly.
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
  this.plugin = plugin;
  this.references = references;
  this.resolved = resolved;
  this.validators = plugin.getValidators();
  this.version = plugin.version;
  this.options = options;

  // Assign Swagger definition properties to the api for easy access
  _.assign(this, definition);

  debug('New Swagger API (%s)', _.isString(options.definition) ? options.definition : 'JavaScript Object');

  this.operationObjects = plugin.getOperations(this);

  // Register custom validators
  _.forEach(options.validators, this.registerValidator);
}

/**
 * Returns the operation for the provided path and method.
 *
 * @param {string} path - The Swagger path
 * @param {string} method - The Swagger operation method
 *
 * @returns {Operation} The operation for the provided path and method or undefined if there is no operation for that
 *                      path and method combination.
 */
SwaggerApi.prototype.getOperation = function (path, method) {
  return _.find(this.operationObjects, function (operation) {
    return operation.path === path && operation.method === method.toLowerCase();
  });
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
 * @throws {Error} If any validators fail
 */
SwaggerApi.prototype.validate = function () {
  var self = this;

  function doValidation (validator) {
    validator(self);
  }

  // Run plugin validators
  _.forEach(this.validators, doValidation);

  // Run custom validators
  _.forEach(this.customValidators, doValidation);
};

module.exports = {
  Operation: Operation,
  Parameter: Parameter,
  SwaggerApi: SwaggerApi
};
