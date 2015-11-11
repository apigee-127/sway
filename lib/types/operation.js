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
var debug = require('debug')('sway:operation');
var sHelpers = require('../helpers');
var YAML = require('js-yaml');

/**
 * Validates the content type.
 *
 * @param {string} contentType - The Content-Type value of the request/response
 * @param {string[]} supportedTypes - The supported (declared) Content-Type values for the request/response
 * @param {object} results - The results object to update in the event of an invalid content type
 */
function validateContentType (contentType, supportedTypes, results) {
  var rawContentType = contentType;

  if (!_.isUndefined(contentType)) {
    // http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.17
    contentType = contentType.split(';')[0]; // Strip the parameter(s) from the content type
  }

  // Check for exact match or mime-type only match
  if (_.indexOf(supportedTypes, rawContentType) === -1 && _.indexOf(supportedTypes, contentType) === -1) {
    results.errors.push({
      code: 'INVALID_CONTENT_TYPE',
      message: 'Invalid Content-Type (' + contentType + ').  These are supported: ' + supportedTypes.join(', '),
      path: []
    });
  }
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
 * @param {string[]} consumes - The mime types this operation consumes
 * @param {string[]} produces - The mime types this operation produces
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
function Operation (api, pathObject, method, ptr, definition, consumes, produces) {
  this.api = api;
  this.pathObject = pathObject;
  this.method = method;
  this.ptr = ptr;
  this.definition = definition;

  // Assign Swagger definition properties to the operation for easy access
  _.assign(this, definition);

  // Assign consumes/produces after merging properties
  this.consumes = consumes;
  this.produces = produces;

  debug('Found operation at %s', ptr);

  this.parameterObjects = api.plugin.getOperationParameters(this);

  // Bring in the security definitions for easier access
  this.securityDefinitions = _.reduce(definition.security, function (defs, reqs) {
    _.each(reqs, function (req, name) {
      var def = api.resolved.securityDefinitions ? api.resolved.securityDefinitions[name] : undefined;

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

  response = this.api.plugin.getOperationResponse(this, codeOrMimeType);

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
  var response = this.api.plugin.getOperationResponse(this, code);

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
 * Validates the request.
 *
 * **Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:
 *
 * * `body`: Used for `body` and `formData` parameters
 * * `files`: Used for `formData` parameters whose `type` is `file`
 * * `headers`: Used for `header` parameters and consumes
 * * `query`: Used for `query` parameters
 * * `url`: used for `path` parameters
 *
 * For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the `url`
 * property.
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {object} req - The http client request *(or equivalent)*
 *
 * @returns {object} The validation results.  This object should contain two properties: `errors` and `warnings`.  Each
 *                   of these property values should be an array of objects that have at minimum the following
 *                   properties:
 *
 *                     * code: The code used to identify the error/warning
 *                     * [errors]: The error(s) encountered during validation
 *                       * code: The code used to identify the error/warning
 *                       * [in]: The parameter location when the errors is a parameter validation error
 *                       * message: The human readable message for the error/warning
 *                       * [name]: The parameter name when the error is a parameter validation error
 *                       * path: The path to the failure or [] for the value itself being invalid
 *                     * message: The human readable message for the error/warning
 *
 *                   Any other properties can be added to the error/warning objects as well but these must be there.
 */
Operation.prototype.validateRequest = function (req) {
  var results = {
    errors: [],
    warnings: []
  };

  // Validate the Content-Type but only for POST and PUT (The rest do not have bodies)
  if (['post', 'put'].indexOf(this.method) > -1) {
    // Defaults to application/octet-stream per http://www.w3.org/Protocols/rfc2616/rfc2616-sec7.html#sec7.2.1
    validateContentType(req.headers['content-type'] || 'application/octet-stream', this.consumes, results);
  }

  // Validate the parameters
  _.each(this.getParameters(), function (param) {
    var paramValue = param.getValue(req);
    var vErr;

    if (!paramValue.valid) {
      vErr = {
        code: 'INVALID_REQUEST_PARAMETER',
        errors: paramValue.error.errors || [
          {
            code: paramValue.error.code,
            message: paramValue.error.message,
            path: paramValue.error.path
          }
        ],
        in: paramValue.parameterObject.in,
        // Report the actual error if there is only one error.  Otherwise, report a JSON Schema validation error.
        message: 'Invalid parameter (' + param.name + '): ' + ((paramValue.errors || []).length > 1 ?
                                                               'Value failed JSON Schema validation' :
                                                               paramValue.error.message),
        name: paramValue.parameterObject.name,
        path: paramValue.error.path
      };

      results.errors.push(vErr);
    }
  });

  return results;
};

/**
 * Validates the response.
 *
 * **Note:** We are not using an `http.ServerResponse` or equivalent because to do so would require an opinionated
 *           interaction flow and we do not want to have to impose any restrictions.  We also do not validate the
 *           `Content-Type` or body for void, 204 or 304 responses.
 *
 * @param {number} statusCode - The response status code *(`undefined` will map to the `default` response)*
 * @param {object} headers - The response headers
 * @param {*} body - The response body
 * @param {string} [encoding] - The encoding of the body when the body is a `Buffer`
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
 *                     * [path]: The array of path segments to portion of the document associated with the error/warning
 *
 *                   Any other properties can be added to the error/warning objects as well but these must be there.
 */
Operation.prototype.validateResponse = function (statusCode, headers, body, encoding) {
  var results = {
    errors: [],
    warnings: []
  };
  var realStatusCode = statusCode || 'default';
  var response = this.api.plugin.getOperationResponse(this, realStatusCode);
  var that = this;
  var bodyValue;
  var bvResults;

  if (_.isUndefined(response)) {
    // If there is no response for the requested status, use the default if there is one (This is Swagger's approach)
    response = this.api.plugin.getOperationResponse(this, 'default');

    if (_.isUndefined(response)) {
      results.errors.push({
        code: 'INVALID_RESPONSE_CODE',
        message: 'This operation does not have a defined \'' + (realStatusCode === 'default' ?
                                                                realStatusCode :
                                                                realStatusCode + '\' or \'default') + '\' response code',
        path: []
      });

      return results;
    }
  }

  // Validate the Content-Type except for void responses, 204 responses and 304 responses as they have no body
  if (!_.isUndefined(response.schema) && _.indexOf([204, 304], statusCode) === -1) {
    validateContentType(headers['content-type'], this.produces, results);
  }

  // Validate the response headers
  _.forEach(response.headers, function (schema, name) {
    var headerValue;
    var hvResults;

    try {
      headerValue = that.api.plugin.convertValue(schema,
                                                 {
                                                   collectionFormat: schema.collectionFormat
                                                 },
                                                 // Most Node.js environment lowercase the header but just in case...
                                                 headers[name.toLowerCase()] || headers[name] || schema.default);
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
      hvResults = sHelpers.validateAgainstSchema(sHelpers.createJSONValidator({
        formatValidators: that.api.plugin.customFormatValidators
      }), schema, headerValue);

      if (hvResults.errors.length > 0) {
        results.errors.push({
          code: 'INVALID_RESPONSE_HEADER',
          errors: hvResults.errors,
          // Report the actual error if there is only one error.  Otherwise, report a JSON Schema validation error.
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
  if (!_.isUndefined(response.schema) && _.indexOf([204, 304], statusCode) === -1) {
    try {
      bodyValue = that.api.plugin.convertValue(response.schema, {
        encoding: encoding
      }, body);
      bvResults = sHelpers.validateAgainstSchema(sHelpers.createJSONValidator({
        formatValidators: that.api.plugin.customFormatValidators
      }), response.schema, bodyValue);
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

module.exports = Operation;
