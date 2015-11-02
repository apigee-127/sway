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
var debug = require('debug')('sway:parameter');
var Operation = require('./operation');
var ParameterValue = require('./parameter-value');
var parseUrl = require('url').parse;

/**
 * The Swagger Parameter object.
 *
 * **Note:** Do not use directly.
 *
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
 *                       object.
 *
 * @param {Operation|Path} opOrPath - The Operation or Path object
 * @param {string} ptr - The JSON Pointer to the parameter
 * @param {object} definition - The parameter definition
 * @param {object} schema - The JSON Schema for the parameter
 *
 * @property {object} definition - The parameter definition
 * @property {Operation} operationObject - The Operation object (Can be undefined for path-level parameters)
 * @property {Path} pathObject - The Path object
 * @property {string} ptr - The JSON Pointer to the parameter definition
 * @property {object} schema - The JSON Schema for the parameter
 *
 * @constructor
 */
function Parameter (opOrPath, ptr, definition, schema) {
  this.computedSchema = schema;
  this.definition = definition;
  this.ptr = ptr;

  if (opOrPath instanceof Operation) {
    this.operationObject = opOrPath;
    this.pathObject = opOrPath.pathObject;
  } else {
    this.operationObject = undefined;
    this.pathObject = opOrPath;
  }

  // Assign Swagger definition properties to the parameter for easy access
  _.assign(this, definition);

  debug('Found %s parameter (%s in %s) at %s',
        _.isUndefined(this.operationObject) ? 'path-level' : 'operation',
        definition.name,
        definition.in,
        ptr);
}

/**
 * Returns the computed JSON Schema for this parameter object.
 *
 * @returns {object} The JSON Schema
 */
Parameter.prototype.getSchema = function () {
  return this.computedSchema;
};

/**
 * Returns a sample value for the parameter based on its schema;
 *
 * @returns {*} The sample value
 */
Parameter.prototype.getSample = function () {
  return this.pathObject.api.plugin.getSample(this.computedSchema);
};

/**
 * Returns the parameter value from the request.
 *
 * **Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:
 *
 * * `body`: Used for `body` and `formData` parameters
 * * `files`: Used for `formData` parameters whose `type` is `file`
 * * `headers`: Used for `header` parameters
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
 * @returns {ParameterValue} The parameter value object
 *
 * @throws {Error} If the `in` value of the parameter's schema is not valid or if the `req` property to retrieve the
 *                 parameter is missing.
 */
Parameter.prototype.getValue = function (req) {
  var api = (this.operationObject || this.pathObject).api;

  if (_.isUndefined(req)) {
    throw new TypeError('req is required');
  } else if (api.plugin.parameterLocations.indexOf(this.in) === -1) {
    throw new Error('Invalid \'in\' value: ' + this.in);
  }

  // We do not need to explicitly check the type of req

  var that = this;
  var type = this.computedSchema.type || 'object';
  var pathMatch;
  var value;

  switch (this.in) {
  case 'body':
    value = req.body;
    break;
  case 'formData':
    // For formData, either the value is a file or a property of req.body.  req.body as a whole can never be the
    // value since the JSON Schema for formData parameters does not allow a type of 'object'.
    if (type === 'file') {
      if (_.isUndefined(req.files)) {
        throw new Error('req.files must be provided for \'formData\' parameters of type \'file\'');
      }

      value = req.files[this.name];
    } else {
      if (_.isUndefined(req.body)) {
        throw new Error('req.body must be provided for \'formData\' parameters');
      }
      value = req.body[this.name];
    }
    break;
  case 'header':
    if (_.isUndefined(req.headers)) {
      throw new Error('req.headers must be provided for \'header\' parameters');
    }

    value = req.headers[this.name.toLowerCase()];
    break;
  case 'path':
    if (_.isUndefined(req.url)) {
      throw new Error('req.url must be provided for \'path\' parameters');
    }

    // Since we get the raw path parameter value, we need to URI decode it
    pathMatch = this.pathObject.regexp.exec(parseUrl(decodeURIComponent(req.url)).pathname);

    if (pathMatch) {
      value = pathMatch[_.findIndex(this.pathObject.regexp.keys, function (key) {
        return key.name === that.name;
      }) + 1];
    }
    break;
  case 'query':
    if (_.isUndefined(req.query)) {
      throw new Error('req.query must be provided for \'query\' parameters');
    }
    value = req.query[this.name];
    break;

    // no default
  }

  return new ParameterValue(this, value);
};

module.exports = Parameter;
