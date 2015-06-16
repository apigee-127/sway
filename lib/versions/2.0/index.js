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
var JsonRefs = require('json-refs');
var formatGenerators = require('./format-generators');
var helpers = require('../../helpers');
var types = require('../../types');
var validators = require('./validators');
var vHelpers = require('./helpers');

var docsUrl = 'https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md';
var mocker = helpers.createJSONSchemaMocker({
  formatGenerators: formatGenerators
});
// https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#parameter-object
var parameterSchemaProperties = [
  'default',
  'description',
  'enum',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'format',
  'items',
  'maxItems',
  'maxLength',
  'maximum',
  'minItems',
  'minLength',
  'minimum',
  'multipleOf',
  'pattern',
  'type',
  'uniqueItems'
];
var version = '2.0';

function getParameterSchema (parameter) {
  var schema;

  if (_.isUndefined(parameter.schema)) {
    schema = {};

    // Build the schema from the schema-like parameter structure
    _.each(parameterSchemaProperties, function (name) {
      if (!_.isUndefined(parameter[name])) {
        schema[name] = parameter[name];
      }
    });
  } else {
    schema = parameter.schema;
  }

  return schema;
}

// The URL to the Swagger 2.0 documentation
module.exports.documentation = docsUrl;

// The array of supported HTTP methods for each path
module.exports.supportedHttpMethods = vHelpers.supportedHttpMethods;

// The version for this Swagger version
module.exports.version = version;

/**
 * Returns whether or not the provided definition can be processed.
 *
 * @param {object} definition - The potential Swagger definition to test
 *
 * @returns {boolean} Returns true only if the definition represents a Swagger 2.0 definition
 */
module.exports.canProcess = function (definition) {
  return definition.swagger === version;
};

/**
 * Creates a SwaggerApi object from the provided Swagger definition.
 *
 * @param {object} definition - The Swagger definition
 * @param {object} options - The options passed to swaggerApi.create
 *
 * @returns {Promise} A promise that resolves the SwaggerApi after processing
 */
module.exports.createSwaggerApi = function (definition, options) {
  return new Promise(function (resolve, reject) {
    JsonRefs.resolveRefs(definition, options.loaderOptions || {}, function (err, resolved, metadata) {
      var api;

      /* istanbul ignore if */
      if (err) {
        reject(err);
      } else {
        api = new types.SwaggerApi(module.exports, definition, resolved, metadata, options);

        resolve(api);
      }
    });
  });
};

/**
 * Returns a function used to validate Swagger 2.0 documents against its JSON Schema.
 *
 * @returns {function} The validator to use
 */
module.exports.getJSONSchemaValidator = function () {
  return validators.jsonSchemaValidator;
};

/**
 * Creates an array of Operation objects for each operation defined in the Swagger document
 *
 * @param {types.SwaggerApi} api - The Swagger API object
 *
 * @returns {types.Operation[]} The Operation object array
 */
module.exports.getOperations = function (api) {
  var operations = [];

  _.forEach(api.resolved.paths, function (pathDef, path) {
    var pPath = ['paths', path];
    var pParams = _.reduce(pathDef.parameters || {}, function (parameters, paramDef, index) {
      parameters[paramDef.name + ':' + paramDef.in] = {
        path: pPath.concat(['parameters', index.toString()]),
        definition: paramDef
      };

      return parameters;
    }, {});

    _.forEach(pathDef, function (operation, method) {
      // Do not process non-operations
      if (_.indexOf(vHelpers.supportedHttpMethods, method) === -1) {
        return;
      }

      var cOperation = _.cloneDeep(operation); // Clone so we do not alter the input
      var oParams = {}; // Used to keep track of unique parameters
      var oPath = pPath.concat(method);

      // Add path parameters
      _.forEach(pParams, function (pParam, key) {
        oParams[key] = pParam;
      });

      // Add operation parameters (Overrides path-level parameters of same name+in combination)
      _.forEach(operation.parameters, function (paramDef, index) {
        oParams[paramDef.name + ':' + paramDef.in] = {
          path: oPath.concat(['parameters', index.toString()]),
          definition: paramDef
        };
      });

      // Attach our computed parameters/security to the operation
      cOperation.parameters = _.map(_.values(oParams), function (parameter) {
        // Used later by getOperationParameters to circumvent the chicken/egg situation (Removed there as well)
        parameter.definition.$$$ptr$$$ = JsonRefs.pathToPointer(parameter.path);

        return parameter.definition;
      });


      if (_.isUndefined(cOperation.security)) {
        cOperation.security = api.resolved.security;
      }

      operations.push(new types.Operation(api, path, method, JsonRefs.pathToPointer(oPath), cOperation));
    });
  });

  return operations;
};

/**
 * Returns an array of Parameter objects for the proviced Operation.
 *
 * @param {types.Operation} operation - The Operation object
 *
 * @returns {types.Parameter[]} The Parameter object array
 */
module.exports.getOperationParameters = function (operation) {
  return _.map(operation.parameters, function (paramDef) {
    var ptr = paramDef.$$$ptr$$$;

    // Remove so we do not have these properties litered throughout the document
    delete paramDef.$$$ptr$$$;

    return new types.Parameter(operation, ptr, paramDef, getParameterSchema(paramDef));
  });
};

/**
 * Creates a sample value for the provided JSON Schema.
 *
 * @param {*} schema - The JSON Schema
 *
 * @returns {*} The sample value
 */
module.exports.getSample = function (schema) {
  return mocker(schema);
};

/**
 * Returns an array of functions used to validate Swagger 2.0 documents semantically.
 *
 * @returns {function[]} The validators to use
 */
module.exports.getSemanticValidators = function () {
  return validators.semanticValidators;
};
