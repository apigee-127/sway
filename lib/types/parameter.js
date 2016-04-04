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
var JsonRefs = require('json-refs');
var ParameterValue = require('./parameter-value');
var parseUrl = require('url').parse;

/**
 * The Swagger Parameter object.
 *
 * **Note:** Do not use directly.
 *
 * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
 * object.
 *
 * @param {module:Sway~Operation|module:Sway~Path} opOrPathObject - The `Operation` or `Path` object
 * @param {object} definition - The parameter definition *(The raw parameter definition __after__ remote references were
 *                              resolved)*
 * @param {object} definitionFullyResolved - The parameter definition with all of its resolvable references resolved
 * @param {string[]} pathToDefinition - The path segments to the parameter definition
 *
 * @property {object} definition - The parameter definition *(The raw parameter definition __after__ remote references
 *                                 were resolved)*
 * @property {object} definitionFullyResolved - The parameter definition with all of its resolvable references resolved
 * @property {module:Sway~Operation} operationObject - The `Operation` object the parameter belongs to *(Can be
 *                                                     `undefined` for path-level parameters)*
 * @property {module:Sway~Path} pathObject - The `Path` object the parameter belongs to
 * @property {string[]} pathToDefinition - The path segments to the parameter definition
 * @property {string} ptr - The JSON Pointer to the parameter definition
 * @property {object} schema - The JSON Schema for the parameter *(For non-body parameters, this is a computed value)*
 *
 * @constructor
 */
function Parameter (opOrPathObject, definition, definitionFullyResolved, pathToDefinition) {
  // Assign local properties
  this.definition = definition;
  this.definitionFullyResolved = definitionFullyResolved;
  this.pathToDefinition = pathToDefinition;
  this.ptr = JsonRefs.pathToPtr(pathToDefinition);

  if (_.has(opOrPathObject, 'consumes')) {
    this.operationObject = opOrPathObject;
    this.pathObject = opOrPathObject.pathObject;
  } else {
    this.operationObject = undefined;
    this.pathObject = opOrPathObject;
  }

  // Assign local properties from the Swagger definition properties
  _.assign(this, definitionFullyResolved);

  if (_.isUndefined(this.schema)) {
    this.schema = helpers.computeParameterSchema(definitionFullyResolved);
  }

  this.pathObject.api._debug('          %s%s (in: %s) at %s',
                             _.isUndefined(this.operationObject) ? '' : '  ',
                             definitionFullyResolved.name,
                             definitionFullyResolved.in,
                             this.ptr);
}

/**
 * Returns a sample value for the parameter based on its schema;
 *
 * @returns {*} The sample value
 */
Parameter.prototype.getSample = function () {
  return helpers.getJSONSchemaMocker()(this.schema);
};

/**
 * Returns the parameter value from the request.
 *
 * **Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:
 *
 *   * `body`: Used for `body` and `formData` parameters
 *   * `files`: Used for `formData` parameters whose `type` is `file`
 *   * `headers`: Used for `header` parameters
 *   * `query`: Used for `query` parameters
 *   * `url`: used for `path` parameters
 *
 * For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the `url` property.
 *
 * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
 *
 * @param {object} req - The http client request *(or equivalent)*
 *
 * @returns {module:Sway~ParameterValue} The parameter value object
 *
 * @throws {Error} If the `in` value of the parameter's schema is not valid or if the `req` property to retrieve the parameter is missing
 */
Parameter.prototype.getValue = function (req) {
  if (_.isUndefined(req)) {
    throw new TypeError('req is required');
  } else if (helpers.parameterLocations.indexOf(this.in) === -1) {
    throw new Error('Invalid \'in\' value: ' + this.in);
  }

  // We do not need to explicitly check the type of req

  var that = this;
  var type = this.schema.type;
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

    value = helpers.getHeaderValue(req.headers, this.name);
    break;
  case 'path':
    if (_.isUndefined(req.url)) {
      throw new Error('req.url must be provided for \'path\' parameters');
    }

    pathMatch = this.pathObject.regexp.exec(parseUrl(req.url).pathname);

    if (pathMatch) {
      // decode URI component here to avoid issues with encoded slashes
      value = decodeURIComponent(pathMatch[_.findIndex(this.pathObject.regexp.keys, function (key) {
        return key.name === that.name;
      }) + 1]);
    }
    break;
  case 'query':
    if (_.isUndefined(req.query)) {
      throw new Error('req.query must be provided for \'query\' parameters');
    }

    value = _.get(req.query, this.name);

    break;

    // no default
  }

  return new ParameterValue(this, value);
};

module.exports = Parameter;
