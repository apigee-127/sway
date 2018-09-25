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
var helpers = require('../helpers');
var parseUrl = require('url').parse;
var Path = require('./path');
var validators = require('../validation/validators');

/**
 * The Swagger API object.
 *
 * **Note:** Do not use directly.
 *
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
 * object.
 *
 * @param {object} definition - The original Swagger definition
 * @param {object} definitionRemotesResolved - The Swagger definition with all of its remote references resolved
 * @param {object} definitionFullyResolved - The Swagger definition with all of its references resolved
 * @param {object} references - The location and resolution of the resolved references in the Swagger definition
 * @param {object} options - The options passed to swaggerApi.create
 *
 * @property {object} customFormats - The key/value pair of custom formats *(The keys are the format name and the values
 * are async functions.  See [ZSchema Custom Formats](https://github.com/zaggino/z-schema#register-a-custom-format))*
 * @property {object} customFormatGenerators - The key/value pair of custom format generators *(The keys are the format name and the values
 * are functions.  See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))*
 * @property {module:sway.DocumentValidationFunction[]} customValidators - The array of custom validators
 * @property {object} definition - The original Swagger definition
 * @property {object} definitionRemotesResolved - The Swagger definition with only its remote references resolved *(This
 * means all references to external/remote documents are replaced with its dereferenced value but all local references
 * are left unresolved.)*
 * @property {object} definitionFullyResolved - The Swagger definition with all of its resolvable references resolved
 * *(This means that all resolvable references are replaced with their dereferenced value.)*
 * @property {string} documentationUrl - The URL to the Swagger documentation
 * @property {module:sway.Path[]} pathObjects - The unique `Path` objects
 * @property {object} options - The options passed to the constructor
 * @property {object} references - The reference metadata *(See [JsonRefs~ResolvedRefDetails](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..ResolvedRefDetails))*
 *
 * @property {string} version - The Swagger API version
 *
 * @constructor
 *
 * @memberof module:sway
 */
function SwaggerApi (definition, definitionRemotesResolved, definitionFullyResolved, references, options) {
  var that = this;

  debug('Creating SwaggerApi from %s', _.isString(options.definition) ? options.definition : 'the provided document');

  // Assign this so other object can use it
  this._debug = debug;

  // Assign local properties
  this.customFormats = {};
  this.customFormatGenerators = {};
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

  // Register custom formats
  _.each(options.customFormats, _.bind(SwaggerApi.prototype.registerFormat, this));

  // Register custom formats
  _.each(options.customFormatGenerators, _.bind(SwaggerApi.prototype.registerFormatGenerator, this));

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
 *   * `originalUrl`
 *   * `url`
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {string|object} idOrPathOrReq - The Swagger opeartion id, path string or the http client request *(or
 * equivalent)*
 * @param {string} [method] - The Swagger operation method _(not used when providing an operation id)_
 *
 * @returns {module:sway.Operation} The `Operation` for the provided operation id, or path and method or `undefined` if
 * there is no operation for that operation id, or path and method combination
 */
SwaggerApi.prototype.getOperation = function (idOrPathOrReq, method) {
  var pathObject;
  var operation;

  if (_.isObject(idOrPathOrReq)) {
    method = idOrPathOrReq.method;
  }

  if (_.isUndefined(method)) {
    _.each(this.getPaths(), function (path) {
      if (_.isUndefined(operation)) {
        operation = path.getOperation(idOrPathOrReq);
      }
    });
  } else {
    pathObject = this.getPath(idOrPathOrReq);

    if (!_.isUndefined(pathObject)) {
      operation = pathObject.getOperation(method);
    }
  }

  return operation;
};

/**
 * Returns all operations for the provided path or all operations in the API.
 *
 * @param {string} [path] - The Swagger path
 *
 * @returns {module:sway.Operation[]} All `Operation` objects for the provided path or all API operations
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
 * @returns {module:sway.Operation[]} All `Operation` objects for the provided tag
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
 *   * `originalUrl`
 *   * `url`
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {string|object} pathOrReq - The Swagger path string or the http client request *(or equivalent)*
 *
 * @returns {module:sway.Path} The corresponding `Path` object for the requested path or request
 */
SwaggerApi.prototype.getPath = function (pathOrReq) {
  var lastIndex = -1;
  var nextIndex = -1;
  var matches;
  var url;

  if (_.isObject(pathOrReq)) {
    url = parseUrl(pathOrReq.originalUrl || pathOrReq.url).pathname;

    // Find all matching paths
    matches = _.reduce(this.pathObjects, function (newMatches, pathObject, index) {
      var isMatch = _.isArray(pathObject.regexp.exec(url));

      if (isMatch) {
        newMatches.push({
          index: index,
          segments: pathObject.path.split('/')
        })
      }

      return newMatches;
    }, []);

    // TODO: Log all matches

    while (matches.length > 1) {
      matches = _.reduce(matches, function (newMatches, match) {
        var newIndex = _.findIndex(match.segments, function (segment) {
          return _.startsWith(segment, '{') && _.endsWith(segment, '}');
        }, lastIndex + 1);

        // Complete static match so use some value that can't be exceeded
        if (newIndex === -1) {
          newIndex = Infinity;
        }

        if (newIndex > nextIndex) {
          nextIndex = newIndex;
          newMatches = [match];
        } else if (newIndex === nextIndex) {
          newMatches.push(match);
        }

        return newMatches;
      }, []);

      // At this point we have tried to filter the matches but there are multiple matches that are identical and cannot
      // be filtered further.  The only choice is to choose the first match.
      if (lastIndex === nextIndex) {
        matches.splice(1);
      }

      lastIndex = nextIndex;
    }

    // TODO: Log match

    return matches.length > 0 ? this.pathObjects[matches[0].index] : undefined;
  } else {
    return _.find(this.pathObjects, function (pathObject) {
      return pathOrReq === pathObject.path;
    });
  }
};

/**
 * Returns all path objects for the Swagger API.
 *
 * @returns {module:sway.Path[]} The `Path` objects
 */
SwaggerApi.prototype.getPaths = function () {
  return this.pathObjects;
};

/**
 * Registers a custom format.
 *
 * @param {string} name - The name of the format
 * @param {function} validator - The format validator *(See [ZSchema Custom Format](https://github.com/zaggino/z-schema#register-a-custom-format))*
 */
SwaggerApi.prototype.registerFormat = function (name, validator) {
  if (_.isUndefined(name)) {
    throw new TypeError('name is required');
  } else if (!_.isString(name)) {
    throw new TypeError('name must be a string');
  } else if (_.isUndefined(validator)) {
    throw new TypeError('validator is required');
  } else if (!_.isFunction(validator)) {
    throw new TypeError('validator must be a function');
  }

  this.customFormats[name] = validator;

  helpers.registerFormat(name, validator);
}

/**
 * Registers a custom format generator.
 *
 * @param {string} name - The name of the format
 * @param {function} formatGenerator - The format generator *(See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))*
 */
SwaggerApi.prototype.registerFormatGenerator = function (name, formatGenerator) {
  if (_.isUndefined(name)) {
    throw new TypeError('name is required');
  } else if (!_.isString(name)) {
    throw new TypeError('name must be a string');
  } else if (_.isUndefined(formatGenerator)) {
    throw new TypeError('formatGenerator is required');
  } else if (!_.isFunction(formatGenerator)) {
    throw new TypeError('formatGenerator must be a function');
  }

  this.customFormatGenerators[name] = formatGenerator;

  helpers.registerFormatGenerator(name, formatGenerator);
}

/**
 * Unregisters a custom format.
 *
 * @param {string} name - The name of the format
 */
SwaggerApi.prototype.unregisterFormat = function (name) {
  if (_.isString(name)) {
    delete this.customFormats[name];

    helpers.unregisterFormat(name);
  }
}

/**
 * Unregisters a custom format generator.
 *
 * @param {string} name - The name of the format generator
 */
SwaggerApi.prototype.unregisterFormatGenerator = function (name) {
  if (_.isString(name)) {
    delete this.customFormatGenerators[name];

    helpers.unregisterFormatGenerator(name);
  }
}

/**
 * Registers a custom validator.
 *
 * @param {module:sway.DocumentValidationFunction} validator - The validator
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
 * @returns {module:sway.ValidationResults} The validation results
 */
SwaggerApi.prototype.validate = function () {
  var results = {
    errors: [],
    warnings: []
  };

  // Validate the document structurally
  helpers.processValidators(this, undefined, [validators.jsonSchemaValidator], results);

  // Perform remaining validation only if the document is structurally valid
  if (results.errors.length === 0) {
    // Run plugin validators
    helpers.processValidators(this, undefined, validators.semanticValidators, results);

    // Run custom validators
    helpers.processValidators(this, undefined, this.customValidators, results);
  }

  return results;
};

module.exports = SwaggerApi;
