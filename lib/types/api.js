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
var Path = require('./path');
var validators = require('../validation/validators');

/**
 * The Swagger API object.
 *
 * **Note:** Do not use directly.
 *
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
 *                       object.
 *
 * @param {object} definition - The original Swagger definition
 * @param {object} definitionRemotesResolved - The Swagger definition with all of its remote references resolved
 * @param {object} definitionFullyResolved - The Swagger definition with all of its references resolved
 * @param {object} references - The location and resolution of the resolved references in the Swagger definition
 * @param {object} options - The options passed to swaggerApi.create
 *
 * @property {module:Sway~ValidatorCallback[]} customValidators - The array of custom validators
 * @property {object} definition - The original Swagger definition
 * @property {object} definitionRemotesResolved - The Swagger definition with only its remote references resolved *(This
 *                                                means all references to external/remote documents are replaced with
 *                                                its dereferenced value but all local references are left unresolved.)*
 * @property {object} definitionFullyResolved - The Swagger definition with all of its resolvable references resolved
 *                                              *(This means that all resolvable references are replaced with their
 *                                              dereferenced value.)*
 * @property {string} documentationUrl - The URL to the Swagger documentation
 * @property {module:Sway~Path[]} pathObjects - The unique `Path` objects
 * @property {object} options - The options passed to the constructor
 * @property {object} references - The reference metadata *(See [JsonRefs~ResolvedRefDetails](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..ResolvedRefDetails))*
 * @property {string} version - The Swagger API version
 *
 * @constructor
 */
function SwaggerApi (definition, definitionRemotesResolved, definitionFullyResolved, references, options) {
  var that = this;

  debug('Creating SwaggerApi from %s', _.isString(options.definition) ? options.definition : 'the provided document');

  // Assign this so other object can use it
  this._debug = debug;

  // Assign local properties
  this.customValidators = [];
  this.definition = definition;
  this.definitionFullyResolved = definitionFullyResolved;
  this.definitionRemotesResolved = definitionRemotesResolved;
  this.documentationUrl = 'https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md';
  this.options = options;
  this.references = references;
  this.version = '2.0';

  // Assign local properties from the Swagger definition properties
  _.assign(this, definition);

  // Register custom validators
  _.each(options.customValidators, _.bind(SwaggerApi.prototype.registerValidator, this));

  debug('  Paths:');

  // Create the Path objects
  this.pathObjects = _.map(definitionFullyResolved.paths, function (pathDef, path) {
    return new Path(that,
                    path,
                    _.get(definitionRemotesResolved, ['paths', path]),
                    pathDef,
                    ['paths', path]);
  });
}

/**
 * Returns the operation for the given path and operation.
 *
 * **Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:
 *
 *   * `method`
 *   * `url`
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {string|object} pathOrReq - The Swagger path string or the http client request *(or equivalent)*
 * @param {string} [method] - The Swagger operation method
 *
 * @returns {module:Sway~Operation} The `Operation` for the provided path and method or `undefined` if there is no
 *                                  operation for that path and method combination
 */
SwaggerApi.prototype.getOperation = function (pathOrReq, method) {
  var pathObject = this.getPath(pathOrReq);
  var operation;

  if (!_.isUndefined(pathObject)) {
    if (_.isObject(pathOrReq)) {
      method = pathOrReq.method;
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
 * @returns {module:Sway~Operation[]} All `Operation` objects for the provided path or all API operations
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
 * @returns {module:Sway~Operation[]} All `Operation` objects for the provided tag
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
 * **Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:
 *
 *   * `url`
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {string|object} pathOrReq - The Swagger path string or the http client request *(or equivalent)*
 *
 * @returns {module:Sway~Path} The corresponding `Path` object for the requested path or request
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
 * @returns {module:Sway~Path[]} The `Path` objects
 */
SwaggerApi.prototype.getPaths = function () {
  return this.pathObjects;
};

/**
 * Registers a validator.
 *
 * @param {module:Sway~ValidatorCallback} validator - The validator
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
 * @returns {module:Sway~ValidationResults} The validation results
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
  doValidation(validators.jsonSchemaValidator);

  // Perform remaining validation only if the document is structurally valid
  if (results.errors.length === 0) {
    // Run plugin validators
    _.each(validators.semanticValidators, doValidation);

    // Run custom validators
    _.each(this.customValidators, doValidation);
  }

  return results;
};

module.exports = SwaggerApi;
