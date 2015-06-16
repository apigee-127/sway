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

var _ = require('lodash-compat');
var customFormatValidators = require('./format-validators');
var helpers = require('../../helpers');
var JsonRefs = require('json-refs');
var swaggerSchema = require('./schema.json');
var vHelpers = require('./helpers');

function walkSchema (blacklist, schema, path, handler) {
  var type = schema.type || 'object';

  function shouldSkip (cPath) {
    return _.indexOf(blacklist, JsonRefs.pathToPointer(cPath)) > -1;
  }

  // Do not process items in the blacklist as they've been processed already
  if (shouldSkip(path)) {
    return;
  }

  function walker (pSchema, pPath) {
    // Do not process items in the blacklist as they've been processed already
    if (shouldSkip(pPath)) {
      return;
    }

    _.forEach(pSchema, function (item, name) {
      if (_.isNumber(name)) {
        name = name.toString();
      }

      walkSchema(blacklist, item, pPath.concat(name), handler);
    });

    handler(pSchema, pPath);
  }

  if (!_.isUndefined(schema.schema)) {
    walkSchema(blacklist, schema.schema, path.concat('schema'), handler);
  } else if (type === 'array' && !_.isUndefined(schema.items)) {
    walker(schema.items, path.concat('items'));
  } else if (type === 'object') {
    if (!_.isUndefined(schema.additionalProperties)) {
      walkSchema(blacklist, schema.additionalProperties, path.concat('additionalProperties'), handler);
    }

    _.forEach(['allOf', 'properties'], function (propName) {
      if (!_.isUndefined(schema[propName])) {
        walker(schema[propName], path.concat(propName));
      }
    });
  }

  handler(schema, path);
}

/**
 * Validates the resolved Swagger document against the Swagger 2.0 JSON Schema.
 *
 * @param {SwaggerApi} api - The SwaggerApi object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validateStructure (api) {
  return helpers.validateAgainstSchema(helpers.createJSONValidator({
    formatValidators: customFormatValidators
  }), swaggerSchema, api.resolved);
}

/**
 * Validates that all arrays have their required items property.
 *
 * @see {@link https://github.com/swagger-api/swagger-spec/issues/174}
 *
 * @param {SwaggerApi} api - The SwaggerApi object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validateArrayItems (api) {
  // Build a blacklist to avoid cascading errors/warnings
  var blacklist = _.reduce(api.references, function (list, metadata, ptr) {
    var refPath = JsonRefs.pathFromPointer(ptr);

    // Remove the $ref part of the path
    refPath.pop();

    list.push(JsonRefs.pathToPointer(refPath));

    return list;
  }, []);
  var response = {
    errors: [],
    warnings: []
  };

  function validate (schema, path) {
    if (schema.type === 'array' && _.isUndefined(schema.items)) {
      response.errors.push({
        code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
        message: 'Missing required property: items',
        path: path
      });
    }
  }

  function validateParameters (parameters, path) {
    _.forEach(parameters, function (parameterDef, name) {
      if (_.isNumber(name)) {
        name = name.toString();
      }

      walkSchema(blacklist, parameterDef, path.concat(name), validate);
    });
  }

  function validateResponses (responses, path) {
    _.forEach(responses, function (responseDef, name) {
      var rPath = path.concat(name);

      _.forEach(responseDef.headers, function (header, hName) {
        walkSchema(blacklist, header, rPath.concat(['headers', hName]), validate);
      });

      if (!_.isUndefined(responseDef.schema)) {
        walkSchema(blacklist, responseDef.schema, rPath.concat('schema'), validate);
      }
    });
  }

  // Validate definitions
  _.forEach(api.resolved.definitions, function (definitionDef, name) {
    walkSchema(blacklist, definitionDef, ['definitions', name], validate);
  });

  // Validate global parameter definitions
  validateParameters(api.resolved.parameters, ['parameters']);

  // Validate global response definitions
  validateResponses(api.resolved.responses, ['responses']);

  // Validate paths and operations
  _.forEach(api.resolved.paths, function (pathDef, path) {
    var pPath = ['paths', path];

    // Validate path-level parameter definitions
    validateParameters(pathDef.parameters, pPath.concat('parameters'));

    _.forEach(pathDef, function (operationDef, method) {
      var oPath = pPath.concat(method);

      // Do not process non-operations
      if (_.indexOf(vHelpers.supportedHttpMethods, method) === -1) {
        return;
      }

      // Validate operation parameter definitions
      validateParameters(operationDef.parameters, oPath.concat('parameters'));

      // Validate operation response definitions
      validateResponses(operationDef.responses, oPath.concat('responses'));
    });
  });

  return response;
}

module.exports = {
  jsonSchemaValidator: validateStructure,
  semanticValidators: [
    validateArrayItems
  ]
};
