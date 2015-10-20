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
var debug = require('debug')('sway:path');

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

module.exports = Path;
