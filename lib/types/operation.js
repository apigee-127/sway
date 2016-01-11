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
var JsonRefs = require('json-refs');
var Parameter = require('./parameter');
var Response = require('./response');
var helpers = require('../helpers');

/**
 * The Swagger Operation object.
 *
 * **Note:** Do not use directly.
 *
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
 *                       object.
 *
 * @param {Path} pathObject - The Path object
 * @param {string} method - The operation method
 * @param {object} definition - The operation definition
 * @param {string[]} pathToDefinition - The path segments to the operation definition
 *
 * @property {object} definition - The operation definition
 * @property {string} method - The HTTP method for this operation
 * @property {Path} pathObject - The Path object
 * @property {string[]} pathToDefinition - The path segments to the operation definition
 * @property {Parameter[]} parameterObjects - The Parameter objects
 * @property {string} ptr - The JSON Pointer to the operation
 * @property {object} securityDefinitions - The security definitions used by this operation
 *
 * @constructor
 */
function Operation (pathObject, method, definition, pathToDefinition) {
  var seenParameters = [];
  var that = this;

  // Assign local properties
  this.consumes = definition.consumes || pathObject.api.consumes || [];
  this.definition = _.cloneDeep(definition); // Clone so we do not alter the original
  this.method = method;
  this.parameterObjects = []; // Computed below
  this.pathObject = pathObject;
  this.pathToDefinition = pathToDefinition;
  this.produces = definition.produces || pathObject.api.produces || [];
  this.ptr = JsonRefs.pathToPtr(pathToDefinition);

  // Assign local properties from the Swagger definition properties
  _.assign(this, definition);

  // Default to the global security
  if (_.isUndefined(this.security)) {
    this.security = this.definition.security = pathObject.api.definitionFullyResolved.security;
  }

  // Add the Parameter objects from the Path object that were not redefined in the operation definition
  this.parameterObjects = _.map(pathObject.parameterObjects, function (parameterObject) {
    seenParameters.push(parameterObject.in + ':' + parameterObject.name);

    return parameterObject;
  });

  // Create Parameter objects from parameters defined in the operation definition
  _.each(definition.parameters, function (paramDef, index) {
    var key = paramDef.in + ':' + paramDef.name;
    var seenIndex = seenParameters.indexOf(key);
    var parameterObject = new Parameter(that,
                                        paramDef,
                                        pathToDefinition.concat(['parameters', index.toString()]));

    if (seenIndex > -1) {
      that.parameterObjects[seenIndex] = parameterObject;
    } else {
      that.parameterObjects.push(parameterObject);

      seenParameters.push(key);
    }
  });

  this.parameters = this.definition.parameters = _.map(this.parameterObjects, function (parameterObject) {
    return parameterObject.definition;
  });

  // Create response objects from responses defined in the operation definition
  this.responseObjects = _.map(definition.responses, function (responseDef, code) {
    return new Response(that,
                        code,
                        responseDef,
                        pathToDefinition.concat(['responses', code]));
  });

  // Bring in the security definitions for easier access
  this.securityDefinitions = _.reduce(this.security, function (defs, reqs) {
    _.each(reqs, function (req, name) {
      var def = pathObject.api.definitionFullyResolved.securityDefinitions ?
            pathObject.api.definitionFullyResolved.securityDefinitions[name] :
            undefined;

      if (!_.isUndefined(def)) {
        defs[name] = def;
      }
    });

    return defs;
  }, {});

  debug('Found operation at %s', this.ptr);
}

/**
 * Returns the parameter with the provided name and location when provided.
 *
 * @param {string} name - The name of the parameter
 * @param {string} [location] - The location *(`in`)* of the parameter *(Used for disambiguation)*
 *
 * @returns {Parameter} The parameter matching the location and name combination or `undefined` if there is no match.
 */
Operation.prototype.getParameter = function (name, location) {
  return _.find(this.parameterObjects, function (parameterObject) {
    return parameterObject.name === name && (_.isUndefined(location) ? true : parameterObject.in === location);
  });
};

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
    helpers.validateContentType(req.headers['content-type'] || 'application/octet-stream', this.consumes, results);
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
