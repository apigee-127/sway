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
var types = require('../../types');

var customSchemaFormatValidators = {};
var docsUrl = 'https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md';
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
var supportedHttpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
var version = '2.0';

// Build the list of custom JSON Schema validator formats
customSchemaFormatValidators.int32 = customSchemaFormatValidators.int64 = function (val) {
  var valid = true;
  var cVal;

  if (!_.isNumber(val)) {
    try {
      cVal = parseInt(val, 10);
    } catch (err) {
      valid = false;
    }
  }

  if (_.isNumber(cVal)) {
    valid = cVal % 1 === 0;
  }

  return valid;
};

customSchemaFormatValidators.double = customSchemaFormatValidators.float = function (val) {
  var valid = true;

  if (!_.isNumber(val)) {
    try {
      parseFloat(val);
    } catch (err) {
      valid = false;
    }
  }

  return valid;
};

customSchemaFormatValidators.byte = function (val) {
  // TODO: We could do more here since technically 'byte' means a base64 encoded string
  return _.isString(val);
};

customSchemaFormatValidators.password = function (val) {
  return _.isString(val);
};

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

function getOperations (resolved) {
  var operations = [];

  _.forEach(resolved.paths, function (pathDef, path) {
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
      if (_.indexOf(supportedHttpMethods, method) === -1) {
        return;
      }

      var cOperation = _.cloneDeep(operation); // Clone so we do not alter the input
      var oParams = {}; // Used to keep track of unique parameters
      var oPath = pPath.concat(method);
      var paramObjs = [];

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
        paramObjs.push(new types.Parameter(JsonRefs.pathToPointer(parameter.path), parameter.definition,
                                           getParameterSchema(parameter.definition)));

        return parameter.definition;
      });


      if (_.isUndefined(cOperation.security)) {
        cOperation.security = resolved.security;
      }

      operations.push(new types.Operation(path, method, JsonRefs.pathToPointer(oPath), cOperation, paramObjs));
    });
  });

  return operations;
}

// The custom JSON Schema format validators
// (All formats not explicitly handled here: https://github.com/zaggino/z-schema/blob/master/src/FormatValidators.js)
module.exports.customSchemaFormatValidators = customSchemaFormatValidators;

// The URL to the Swagger 2.0 documentation
module.exports.documentation = docsUrl;

// The array of supported HTTP methods for each path
module.exports.supportedHttpMethods = supportedHttpMethods;

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
        api = new types.SwaggerApi(definition, version, docsUrl, getOperations(resolved), options);

        api.references = metadata;
        api.resolved = resolved;

        resolve(api);
      }
    });
  });
};
