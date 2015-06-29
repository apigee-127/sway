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

function walkSchema (blacklist, schema, path, handlers, response) {
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

      walkSchema(blacklist, item, pPath.concat(name), handlers, response);
    });

    _.forEach(handlers, function (handler) {
      handler(response, pSchema, pPath);
    });
  }

  if (!_.isUndefined(schema.schema)) {
    walkSchema(blacklist, schema.schema, path.concat('schema'), handlers, response);
  } else if (type === 'array' && !_.isUndefined(schema.items)) {
    walker(schema.items, path.concat('items'));
  } else if (type === 'object') {
    if (!_.isUndefined(schema.additionalProperties)) {
      walkSchema(blacklist, schema.additionalProperties, path.concat('additionalProperties'), handlers, response);
    }

    _.forEach(['allOf', 'properties'], function (propName) {
      if (!_.isUndefined(schema[propName])) {
        walker(schema[propName], path.concat(propName));
      }
    });
  }

  _.forEach(handlers, function (handler) {
    handler(response, schema, path);
  });
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

/* Schema Object Validators */

function validateArrayTypeItemsExistence (response, schema, path) {
  if (schema.type === 'array' && _.isUndefined(schema.items)) {
    response.errors.push({
      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
      message: 'Missing required property: items',
      path: path
    });
  }
}

function validateDefaultValue (response, schema, path) {
  var result;

  if (!_.isUndefined(schema.default)) {
    result = helpers.validateAgainstSchema(helpers.createJSONValidator({
      formatValidators: customFormatValidators
    }), schema, schema.default);

    _.forEach(result.errors, function (error) {
      error.path = path.concat(error.path.concat('default'));

      response.errors.push(error);
    });

    _.forEach(result.warnings, function (warning) {
      warning.path = path.concat(warning.path.push('default'));

      response.warnings.push(warning);
    });
  }
}

/**
 * Validates all references are to existing documents/document fragments.
 *
 * @param {SwaggerApi} api - The SwaggerApi object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validateMissingReferences (api) {
  var response = {
    errors: [],
    warnings: []
  };

  _.forEach(api.references, function (ref, ptr) {
    if (!_.has(ref, 'value')) {
      response.errors.push({
        code: 'UNRESOLVABLE_REFERENCE',
        message: 'Reference could not be resolved: ' + ref.ref,
        path: JsonRefs.pathFromPointer(ptr)
      });
    }
  });

  return response;
}

/**
 * Validates all schema objects and schema-like objects (non-body path parameters).
 *
 * * Validates that all array types have their required items property
 *     (@see {@link https://github.com/swagger-api/swagger-spec/issues/174})
 * * Validates that all default values are valid based on its respective schema
 *
 * @param {SwaggerApi} api - The SwaggerApi object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validateSchemaObjects (api) {
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
  var validators = [
    validateArrayTypeItemsExistence,
    validateDefaultValue
  ];

  function validateParameters (parameters, path) {
    _.forEach(parameters, function (parameterDef, name) {
      var pPath;

      if (_.isNumber(name)) {
        name = name.toString();
      }

      pPath = path.concat(name);

      // Create JSON Schema for non-body parameters
      if (parameterDef.in !== 'body') {
        parameterDef = vHelpers.getParameterSchema(parameterDef);
      }

      walkSchema(blacklist, parameterDef, pPath, validators, response);
    });
  }

  function validateResponses (responses, path) {
    _.forEach(responses, function (responseDef, name) {
      var rPath = path.concat(name);

      _.forEach(responseDef.headers, function (header, hName) {
        walkSchema(blacklist, header, rPath.concat(['headers', hName]), validators, response);
      });

      if (!_.isUndefined(responseDef.schema)) {
        walkSchema(blacklist, responseDef.schema, rPath.concat('schema'), validators, response);
      }
    });
  }

  // Validate definitions
  _.forEach(api.resolved.definitions, function (definitionDef, name) {
    walkSchema(blacklist, definitionDef, ['definitions', name], validators, response);
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

/**
 * Validates paths and path paramters (Written as one validator to avoid multiple passes)
 *
 * * Ensure that path parameters are defined for each path parameter declaration
 * * Ensure that defined path parameters match a declared path parameter
 * * Ensure that paths are functionally different
 *
 * @param {SwaggerApi} api - The SwaggerApi object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validatePathsAndPathParameters (api) {
  var response = {
    errors: [],
    warnings: []
  };

  _.reduce(api.resolved.paths, function (paths, pathDef, path) {
    var declaredPathParameters = [];
    var normalizedPath = path;
    var pPath = ['paths', path];

    _.forEach(path.match(/\{(.*?)\}/g), function (arg, index) {
      // Record the path parameter name
      declaredPathParameters.push(arg.replace(/[{}]/g, ''));

      // Update the normalized path
      normalizedPath = normalizedPath.replace(arg, 'arg' + index);
    });

    // Idenfity paths that are functionally the same
    if (_.indexOf(paths, normalizedPath) > -1) {
      response.errors.push({
        code: 'EQUIVALENT_PATH',
        message: 'Equivalent path already exists: ' + path,
        path: pPath
      });
    } else {
      paths.push(normalizedPath);
    }

    _.forEach(pathDef, function (operationDef, method) {
      var definedPathParameters;
      var parameters;

      // Do not process non-operations
      if (_.indexOf(vHelpers.supportedHttpMethods, method) === -1) {
        return;
      }

      parameters = api.getOperation(path, method).getParameters();

      // Use SwaggerApi#getOperation to avoid having to consolidate parameters
      definedPathParameters = _.reduce(parameters, function (pathParameters, parameter) {
        if (parameter.in === 'path') {
          pathParameters[parameter.name] = parameter.ptr;
        }

        return pathParameters;
      }, {});

      // Identify undefined path parameters
      _.forEach(_.difference(declaredPathParameters, _.keys(definedPathParameters)), function (name) {
        response.errors.push({
          code: 'MISSING_PATH_PARAMETER_DEFINITION',
          message: 'Path parameter is declared but is not defined: ' + name,
          path: pPath.concat(method)
        });
      });

      // Identify undeclared path parameters
      _.forEach(_.difference(_.keys(definedPathParameters), declaredPathParameters), function (name) {
        response.errors.push({
          code: 'MISSING_PATH_PARAMETER_DECLARATION',
          message: 'Path parameter is defined but is not declared: ' + name,
          path: JsonRefs.pathFromPointer(definedPathParameters[name])
        });
      });
    });

    return paths;
  }, []);

  return response;
}

module.exports = {
  jsonSchemaValidator: validateStructure,
  semanticValidators: [
    validateMissingReferences,
    validateSchemaObjects,
    validatePathsAndPathParameters
  ]
};
