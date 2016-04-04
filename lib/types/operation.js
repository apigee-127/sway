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
 * @param {module:Sway~Path} pathObject - The Path object
 * @param {string} method - The operation method
 * @param {object} definition - The operation definition *(The raw operation definition __after__ remote references were
 *                              resolved)*
 * @param {object} definitionFullyResolved - The operation definition with all of its resolvable references resolved
 * @param {string[]} pathToDefinition - The path segments to the operation definition
 *
 * @property {object} definition - The operation definition *(The raw operation definition __after__ remote references were
 *                                 resolved)*
 * @property {object} definitionFullyResolved - The operation definition with all of its resolvable references resolved
 * @property {string} method - The HTTP method for this operation
 * @property {module:Sway~Path} pathObject - The `Path` object
 * @property {string[]} pathToDefinition - The path segments to the operation definition
 * @property {module:Sway~Parameter[]} parameterObjects - The `Parameter` objects
 * @property {string} ptr - The JSON Pointer to the operation
 * @property {object} securityDefinitions - The security definitions used by this operation
 *
 * @constructor
 */
function Operation (pathObject, method, definition, definitionFullyResolved, pathToDefinition) {
  var seenParameters = [];
  var that = this;

  // Assign local properties
  this.consumes = definition.consumes || pathObject.api.consumes || [];
  this.definition = _.cloneDeep(definition); // Clone so we do not alter the original
  this.definitionFullyResolved = _.cloneDeep(definitionFullyResolved); // Clone so we do not alter the original
  this.method = method;
  this.parameterObjects = []; // Computed below
  this.pathObject = pathObject;
  this.pathToDefinition = pathToDefinition;
  this.produces = definition.produces || pathObject.api.produces || [];
  this.ptr = JsonRefs.pathToPtr(pathToDefinition);

  // Assign local properties from the Swagger definition properties
  _.assign(this, definitionFullyResolved);

  this._debug = this.pathObject.api._debug;

  // Add the Parameter objects from the Path object that were not redefined in the operation definition
  this.parameterObjects = _.map(pathObject.parameterObjects, function (parameterObject) {
    seenParameters.push(parameterObject.in + ':' + parameterObject.name);

    return parameterObject;
  });

  this._debug('        %s at %s', this.method.toUpperCase(), this.ptr);
  this._debug('          Consumes:');

  _.each(this.consumes, function (mimeType) {
    that._debug('            %s', mimeType);
  });

  this._debug('          Parameters:');

  // Create Parameter objects from parameters defined in the operation definition
  _.each(definitionFullyResolved.parameters, function (paramDef, index) {
    var key = paramDef.in + ':' + paramDef.name;
    var seenIndex = seenParameters.indexOf(key);
    var pPath = pathToDefinition.concat(['parameters', index.toString()]);
    var parameterObject = new Parameter(that, _.get(pathObject.api.definitionRemotesResolved, pPath), paramDef, pPath);

    if (seenIndex > -1) {
      that.parameterObjects[seenIndex] = parameterObject;
    } else {
      that.parameterObjects.push(parameterObject);

      seenParameters.push(key);
    }
  });

  this._debug('          Produces:');

  _.each(this.produces, function (mimeType) {
    that._debug('            %s', mimeType);
  });

  this._debug('          Responses:');

  // Create response objects from responses defined in the operation definition
  this.responseObjects = _.map(this.definitionFullyResolved.responses, function (responseDef, code) {
    var rPath = pathToDefinition.concat(['responses', code])

    return new Response(that,
                        code,
                        _.get(that.pathObject.api.definitionRemotesResolved, rPath),
                        responseDef,
                        rPath);
  });

  this._debug('          Security:');

  // Bring in the security definitions for easier access
  this.securityDefinitions = _.reduce(this.security, function (defs, reqs) {
    _.each(reqs, function (req, name) {
      var def = pathObject.api.definitionFullyResolved.securityDefinitions ?
            pathObject.api.definitionFullyResolved.securityDefinitions[name] :
            undefined;

      if (!_.isUndefined(def)) {
        defs[name] = def;
      }

      that._debug('            %s (type: %s)', name, _.isUndefined(def) ? 'missing': def.type);
    });

    return defs;
  }, {});
}

/**
 * Returns the parameter with the provided name and location when provided.
 *
 * @param {string} name - The name of the parameter
 * @param {string} [location] - The location *(`in`)* of the parameter *(Used for disambiguation)*
 *
 * @returns {module:Sway~Parameter} The `Parameter` matching the location and name combination or `undefined` if there is
 *                                  no match
 */
Operation.prototype.getParameter = function (name, location) {
  return _.find(this.parameterObjects, function (parameterObject) {
    return parameterObject.name === name && (_.isUndefined(location) ? true : parameterObject.in === location);
  });
};

/**
 * Returns all parameters for the operation.
 *
 * @returns {module:Sway~Parameter[]} All `Parameter` objects for the operation
 */
Operation.prototype.getParameters = function () {
  return this.parameterObjects;
};

/**
 * Returns the response for the requested status code or the default response *(if available)* if none is provided.
 *
 * @param {number|string} [statusCode='default'] - The status code
 *
 * @returns {module:Sway~Response} The `Response` or `undefined` if one cannot be found
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
 * @returns {module:Sway~Response[]} All `Response` objects for the operation
 */
Operation.prototype.getResponses = function () {
  return this.responseObjects;
};

/**
 * Returns the composite security definitions for this operation.
 *
 * The difference between this API and `this.security` is that `this.security` is the raw `security` value for the
 * operation where as this API will return the global `security` value when available and this operation's security
 * is undefined.
 *
 * @returns {object[]} The security for this operation
 */
Operation.prototype.getSecurity = function () {
  return this.definitionFullyResolved.security || this.pathObject.api.definitionFullyResolved.security;
}

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
 * @returns {module:Sway~ValidationResults} The validation results
 */
Operation.prototype.validateRequest = function (req) {
  var results = {
    errors: [],
    warnings: []
  };

  // Validate the Content-Type but only for POST and PUT (The rest do not have bodies)
  if (['post', 'put'].indexOf(this.method) > -1) {
    helpers.validateContentType(helpers.getContentType(req.headers), this.consumes, results);
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
 * @param {module:Sway~ServerResponseWrapper} res - The response or response like object
 *
 * @returns {module:Sway~ValidationResults} The validation results
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
