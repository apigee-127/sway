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

/**
 * The Swagger Operation object.
 *
 * <strong>Note:</strong> Do not use directly.
 *
 * @param {string} path - The operation path
 * @param {string} method - The operation method
 * @param {string} ptr - The JSON Pointer to the operation
 * @param {object} definition - The operation definition
 * @param {Parameter[]} parameters - The Swagger parameter objects
 *
 * @constructor
 */
function Operation (path, method, ptr, definition, parameters) {
  this.path = path;
  this.method = method;
  this.ptr = ptr;
  this.definition = definition;
  this.parameterObjects = parameters;

  // Assign Swagger definition properties to the operation for easy access
  _.assign(this, definition);
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
 * The Swagger Parameter object.
 *
 * <strong>Note:</strong> Do not use directly.
 *
 * @param {string} ptr - The JSON Pointer to the parameter
 * @param {object} definition - The parameter definition
 *
 * @constructor
 */
function Parameter (ptr, definition) {
  this.ptr = ptr;
  this.definition = definition;

  // Assign Swagger definition properties to the parameter for easy access
  _.assign(this, definition);
}

/**
 * The Swagger API object.
 *
 * <strong>Note:</strong> Do not use directly.
 *
 * @param {object} definition - The Swagger definition
 * @param {string} version - The Swagger definition version
 * @param {string} documentation - The Swagger Specification documentation URL
 * @param {Operation[]} operations - The Swagger operation objects
 * @param {object} options - The options passed to swaggerApi.create
 *
 * @constructor
 */
function SwaggerApi (definition, version, documentation, operations, options) {
  this.version = version;
  this.definition = definition;
  this.documentation = documentation;
  this.operationObjects = operations;
  this.options = options;

  // Assign Swagger definition properties to the api for easy access
  _.assign(this, definition);
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

module.exports = {
  Operation: Operation,
  Parameter: Parameter,
  SwaggerApi: SwaggerApi
};
