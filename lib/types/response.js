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
var helpers = require('../helpers');
var jsonValidator = helpers.getJSONSchemaValidator();
var JsonRefs = require('json-refs');
var YAML = require('js-yaml');

/**
 * The Swagger Response object.
 *
 * **Note:** Do not use directly.
 *
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the
 *                       definition object.
 *
 * @param {module:Sway~Operation} operationObject - The `Operation` object
 * @param {string} statusCode - The status code
 * @param {object} definition - The response definition *(The raw response definition __after__ remote references were
 *                              resolved)*
 * @param {object} definitionFullyResolved - The response definition with all of its resolvable references resolved
 * @param {string[]} pathToDefinition - The path segments to the path definition
 *
 * @property {object} definition - The response definition *(The raw responsedefinition __after__ remote references were
 *                                 resolved)*
 * @property {object} definitionFullyResolved - The response definition with all of its resolvable references resolved
 * @property {module:Sway~Operation} operationObject - The Operation object
 * @property {string[]} pathToDefinition - The path segments to the path definition
 * @property {string} ptr - The JSON Pointer to the response definition
 * @property {string} statusCode - The status code
 *
 * @constructor
 */
function Response (operationObject, statusCode, definition, definitionFullyResolved, pathToDefinition) {
  // Assign local properties
  this.definition = definition;
  this.definitionFullyResolved = definitionFullyResolved;
  this.operationObject = operationObject;
  this.pathToDefinition = pathToDefinition;
  this.ptr = JsonRefs.pathToPtr(pathToDefinition);
  this.statusCode = statusCode;

  // Assign local properties from the Swagger definition properties
  _.assign(this, definitionFullyResolved);

  this.operationObject.pathObject.api._debug('            %s at %s', statusCode, this.ptr);
}

/**
 * Returns the response example for the mime-type.
 *
 * @param {string} [mimeType] - The mime type
 *
 * @returns {string} The response example as a string or `undefined` if the response code and/or mime-type is missing
 */
Response.prototype.getExample = function (mimeType) {
  var example;

  if (_.isPlainObject(this.definitionFullyResolved.examples)) {
    example = this.definitionFullyResolved.examples[mimeType];
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
 * Returns a sample value.
 *
 * @returns {*} The sample value for the response, which can be undefined if the response schema is not provided
 */
Response.prototype.getSample = function () {
  var sample;

  if (!_.isUndefined(this.definitionFullyResolved.schema)) {
    sample = helpers.getJSONSchemaMocker()(this.definitionFullyResolved.schema);
  }

  return sample;
};

/**
 * Validates the response.
 *
 * @param {module:Sway~ServerResponseWrapper} res - The response or response like object
 *
 * @returns {module:Sway~ValidationResults} The validation results
 */
Response.prototype.validateResponse = function (res) {
  var results = {
    errors: [],
    warnings: []
  };
  var bodyValue;
  var bvResults;

  // Set some default just in case
  if (_.isUndefined(res)) {
    res = {};
  }

  if (_.isUndefined(res.headers)) {
    res.headers = {};
  }

  // Validate the Content-Type except for void responses, 204 responses and 304 responses as they have no body
  if (!_.isUndefined(this.definitionFullyResolved.schema) && _.indexOf(['204', '304'], this.statusCode) === -1) {
    helpers.validateContentType(helpers.getContentType(res.headers), this.operationObject.produces, results);
  }

  // Validate the response headers
  _.forEach(this.headers, function (schema, name) {
    var headerValue;
    var hvResults;

    try {
      headerValue = helpers.convertValue(schema,
                                         {
                                           collectionFormat: schema.collectionFormat
                                         },
                                         // Overly cautious
                                         res.headers[name.toLowerCase()] ||
                                         res.headers[name] ||
                                         schema.default);
    } catch (err) {
      results.errors.push({
        code: 'INVALID_RESPONSE_HEADER',
        errors: err.errors || [
          {
            code: err.code,
            message: err.message,
            path: err.path
          }
        ],
        message: 'Invalid header (' + name + '): ' + err.message,
        name: name,
        path: err.path
      });
    }

    // Due to ambiguity in the Swagger 2.0 Specification (https://github.com/swagger-api/swagger-spec/issues/321), it
    // is probably not a good idea to do requiredness checks for response headers.  This means we will validate
    // existing headers but will not throw an error if a header is defined in a response schema but not in the response.
    //
    // We also do not want to validate date objects because it is redundant.  If we have already converted the value
    // from a string+format to a date, we know it passes schema validation.
    if (!_.isUndefined(headerValue) && !_.isDate(headerValue)) {
      hvResults = helpers.validateAgainstSchema(jsonValidator, schema, headerValue);

      if (hvResults.errors.length > 0) {
        results.errors.push({
          code: 'INVALID_RESPONSE_HEADER',
          errors: hvResults.errors,
          // Report the actual error if there is only one error.  Otherwise, report a JSON Schema
          // validation error.
          message: 'Invalid header (' + name + '): ' + (hvResults.errors.length > 1 ?
                                                        'Value failed JSON Schema validation' :
                                                        hvResults.errors[0].message),
          name: name,
          path: []
        });
      }
    }
  });

  // Validate response for non-void responses
  if (!_.isUndefined(this.definitionFullyResolved.schema) && _.indexOf(['204', '304'], this.statusCode) === -1) {
    try {
      bodyValue = helpers.convertValue(this.definitionFullyResolved.schema, {
        encoding: res.encoding
      }, res.body);
      bvResults = helpers.validateAgainstSchema(jsonValidator, this.definitionFullyResolved.schema, bodyValue);
    } catch (err) {
      bvResults = {
        errors: [
          {
            code: err.code,
            message: err.message,
            path: err.path
          }
        ]
      };
    }

    if (bvResults.errors.length > 0) {
      results.errors.push({
        code: 'INVALID_RESPONSE_BODY',
        errors: bvResults.errors,
        message: 'Invalid body: ' + (bvResults.errors.length > 1 ?
                                     'Value failed JSON Schema validation' :
                                     bvResults.errors[0].message),
        path: []
      });
    }
  }

  return results;
};

module.exports = Response;
