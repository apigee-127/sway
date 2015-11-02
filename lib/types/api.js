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
var debug = require('debug')('sway:api');
var parseUrl = require('url').parse;

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
  this.options = options;
  this.plugin = plugin;
  this.references = references;
  this.resolved = resolved;
  this.version = plugin.version;

  // Assign Swagger definition properties to the api for easy access
  _.assign(this, definition);

  debug('New Swagger API (%s)', _.isString(options.definition) ? options.definition : 'JavaScript Object');

  this.pathObjects = plugin.getPaths(this);

  // Register custom validators
  _.forEach(options.validators, this.registerValidator);
}

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
 * @returns {object} The validation results.  This object should contain two properties: `errors` and `warnings`.  Each
 *                   of these property values should be an array of objects that have at minimum the following
 *                   properties:
 *
 *                     * code: The code used to identify the error/warning
 *                     * [errors]: The nested error(s) encountered during validation
 *                       * code: The code used to identify the error/warning
 *                       * message: The human readable message for the error/warning
 *                       * path: The path to the failure or [] for the value itself being invalid
 *                     * message: The human readable message for the error/warning
 *                     * [name]: The header name when the error is a header validation error
 *                     * path: The array of path segments to portion of the document associated with the error/warning
 *
 *                   Any other properties can be added to the error/warning objects as well but these must be there.
 */
SwaggerApi.prototype.validate = function () {
  var results = {
    errors: [],
    warnings: []
  };
  var self = this;

  function doValidation (validator) {
    var vResults = validator(self);

    if (vResults.errors.length > 0) {
      results.errors.push.apply(results.errors, vResults.errors);
    }

    if (vResults.warnings.length > 0) {
      results.warnings.push.apply(results.warnings, vResults.warnings);
    }
  }

  // Validate the document structurally
  doValidation(this.plugin.getJSONSchemaValidator());

  // Perform remaining validation only if the document is structurally valid
  if (results.errors.length === 0) {
    // Run plugin validators
    _.forEach(this.plugin.getSemanticValidators(), doValidation);

    // Run custom validators
    _.forEach(this.customValidators, doValidation);
  }

  return results;
};

module.exports = SwaggerApi;
