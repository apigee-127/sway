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
var YAML = require('js-yaml');

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
function Operation (api, pathObject, method, ptr, definition) {
  this.api = api;
  this.pathObject = pathObject;
  this.method = method;
  this.ptr = ptr;
  this.definition = definition;

  // Assign Swagger definition properties to the operation for easy access
  _.assign(this, definition);

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

  response = this.definition.responses[codeOrMimeType];

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
  var response;

  if (_.isUndefined(code)) {
    code = 'default';
  } else if (_.isNumber(code)) {
    code = (Math.floor(100 * code) / 100).toFixed(); // Overly cautious but oh well...
  }

  response = this.definition.responses[code];

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

module.exports = Operation;
