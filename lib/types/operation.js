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
  this.responseObjects = api.plugin.getOperationResponses(this);

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

// TODO: Add a getParameter(location, name) API

/**
 * Returns all parameters for the operation.
 *
 * @returns {Parameter[]} All parameters for the operation.
 */
Operation.prototype.getParameters = function () {
  return this.parameterObjects;
};

/**
 * Returns the response for the requested status code or the default response *(if available)* if none is provided.
 *
 * @param {number|string} [statusCode='default'] - The status code
 *
 * @returns {Response} The response or undefined if one cannot be found
 */
Operation.prototype.getResponse = function (statusCode) {
  if (_.isUndefined(statusCode)) {
    statusCode = 'default';
  } else if (_.isNumber(statusCode)) {
    statusCode = statusCode.toString();
  }

  return _.find(this.getResponses(), function (responseObject) {
    return responseObject.statusCode === statusCode;
  });
};

/**
 * Returns all responses for the operation.
 *
 * @returns {Response[]} All responses for the operation.
 */
Operation.prototype.getResponses = function () {
  return this.responseObjects;
};

/**
 * Validates the request.
 *
 * **Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:
 *
 *   * `body`: Used for `body` and `formData` parameters
 *   * `files`: Used for `formData` parameters whose `type` is `file`
 *   * `headers`: Used for `header` parameters and consumes
 *   * `query`: Used for `query` parameters
 *   * `url`: used for `path` parameters
 *
 * For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the `url`
 * property.
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {object} req - The http client request *(or equivalent)*
 *
 * @returns {ValidationResults} The validation results
 */
Operation.prototype.validateRequest = function (req) {
  var results = {
    errors: [],
    warnings: []
  };

  // Validate the Content-Type but only for POST and PUT (The rest do not have bodies)
  if (['post', 'put'].indexOf(this.method) > -1) {
    // Defaults to application/octet-stream per http://www.w3.org/Protocols/rfc2616/rfc2616-sec7.html#sec7.2.1
    sHelpers.validateContentType(req.headers['content-type'] || 'application/octet-stream', this.consumes, results);
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
 * @param {ServerResponseWrapper} res - The response or response like object
 *
 * @returns {ValidationResults} The validation results
 */
Operation.prototype.validateResponse = function (res) {
  var results = {
    errors: [],
    warnings: []
  };
  var realStatusCode = res ? res.statusCode : 'default';
  var response = this.getResponse(realStatusCode);

  if (_.isUndefined(response)) {
    // If there is no response for the requested status, use the default if there is one (This is Swagger's approach)
    response = this.getResponse('default');

    if (_.isUndefined(response)) {
      results.errors.push({
                            code: 'INVALID_RESPONSE_CODE',
                            message: 'This operation does not have a defined \'' + (realStatusCode === 'default' ?
                                                                                    realStatusCode :
                                     realStatusCode + '\' or \'default') + '\' response code',
                            path: []
                          });
    }
  } else {
    results = response.validateResponse(res);
  }

  return results;
};

module.exports = Operation;
