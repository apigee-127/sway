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
var supportedHttpMethods = require('swagger-methods');
var swaggerSchema = require('swagger-schema-official/schema');

function getSchemaProperties (schema) {
  var properties = _.keys(schema.properties); // Start with the defined properties

  // Add properties defined in the parent
  _.forEach(schema.allOf, function (parent) {
    _.forEach(getSchemaProperties(parent), function (property) {
      if (_.indexOf(properties, property) === -1) {
        properties.push(property);
      }
    });
  });

  return properties;
}

function walkSchema (api, blacklist, schema, path, handlers, response) {
  var type = schema.type || 'object';

  function shouldSkip (cPath) {
    return _.indexOf(blacklist, JsonRefs.pathToPtr(cPath)) > -1;
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

      walkSchema(api, blacklist, item, pPath.concat(name), handlers, response);
    });
  }

  if (!_.isUndefined(schema.schema)) {
    walkSchema(api, blacklist, schema.schema, path.concat('schema'), handlers, response);
  } else if (type === 'array' && !_.isUndefined(schema.items)) {
    if (_.isArray(schema.items)) {
      walker(schema.items, path.concat('items'));
    } else {
      walkSchema(api, blacklist, schema.items, path.concat('items'), handlers, response);
    }
  } else if (type === 'object') {
    if (!_.isUndefined(schema.additionalProperties)) {
      walkSchema(api, blacklist, schema.additionalProperties, path.concat('additionalProperties'), handlers, response);
    }

    _.forEach(['allOf', 'properties'], function (propName) {
      if (!_.isUndefined(schema[propName])) {
        walker(schema[propName], path.concat(propName));
      }
    });
  }

  _.forEach(handlers, function (handler) {
    handler(api, response, schema, path);
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
  var results = helpers.validateAgainstSchema(helpers.getJSONSchemaValidator(), swaggerSchema, api.definitionFullyResolved);

  // Make complex JSON Schema validation errors easier to understand (Issue 15)
  results.errors = results.errors.map(function (error) {
    var defType = ['additionalProperties', 'items'].indexOf(error.path[error.path.length - 1]) > -1 ?
          'schema' :
          error.path[error.path.length - 2];

    if (['ANY_OF_MISSING', 'ONE_OF_MISSING'].indexOf(error.code) > -1) {
      switch (defType) {
      case 'parameters':
        defType = 'parameter';
        break;

      case 'responses':
        defType = 'response';
        break;

      case 'schema':
        defType += ' ' + error.path[error.path.length - 1];

        // no default
      }

      error.message = 'Not a valid ' + defType + ' definition';
    }

    return error;
  });

  // Treat invalid/missing references as structural errors
  _.each(api.references, function (refDetails, refPtr) {
    var refPath = JsonRefs.pathFromPtr(refPtr);
    var err;

    if (refDetails.missing) {
      err = {
        code: 'UNRESOLVABLE_REFERENCE',
        message: 'Reference could not be resolved: ' + refDetails.uri,
        path: refPath.concat('$ref')
      };

      if (_.has(refDetails, 'error')) {
        err.error = refDetails.error;
      }

      results.errors.push(err);
    } else if (refDetails.type === 'invalid') {
      results.errors.push({
        code: 'INVALID_REFERENCE',
        message: refDetails.error || 'Invalid JSON Reference',
        path: refPath.concat('$ref')
      });
    } else if (_.has(refDetails, 'warning')) {
      // json-refs only creates warnings for JSON References with superfluous properties which will be ignored
      results.warnings.push({
        code: 'EXTRA_REFERENCE_PROPERTIES',
        message: refDetails.warning,
        path: refPath
      });
    }
  });

  return results;
}

/* Schema Object Validators */

function validateArrayTypeItemsExistence (api, response, schema, path) {
  if (schema.type === 'array' && _.isUndefined(schema.items)) {
    response.errors.push({
      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
      message: 'Missing required property: items',
      path: path
    });
  }
}

function validateDefaultValue (api, response, schema, path) {
  var result;

  if (!_.isUndefined(schema.default)) {
    result = helpers.validateAgainstSchema(helpers.getJSONSchemaValidator(), schema, schema.default);

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

function validateSchemaProperties (api, response, schema, path) {
  _.forEach(_.difference(schema.required || [], getSchemaProperties(schema)), function (name) {
    response.errors.push({
      code: 'OBJECT_MISSING_REQUIRED_PROPERTY_DEFINITION',
      message: 'Missing required property definition: ' + name,
      path: path
    });
  });
}

/**
 * Validates all references.
 *
 * * Identifies circular inheritance references
 * * Identifies unreferenced referenceable definitions
 * * Identifies unresolvable references
 *
 * @param {SwaggerApi} api - The SwaggerApi object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validateReferences (api) {
  var inheritanceDetails = {};
  var referenceable = [];
  var references = {};
  var response = {
    errors: [],
    warnings: []
  };

  function addAncestor (dsc, anc) {
    if (!_.has(inheritanceDetails, dsc)) {
      inheritanceDetails[dsc] = {
        lineage: [],
        parents: [
          anc
        ]
      };
    } else {
      inheritanceDetails[dsc].parents.push(anc);
    }
  }

  function addReference (ref, ptr) {
    if (_.indexOf(references, ref) === -1) {
      if (_.isUndefined(references[ref])) {
        references[ref] = [];
      }

      // Add references to ancestors
      if (ref.indexOf('allOf') > -1) {
        addReference(ref.substring(0, ref.lastIndexOf('/allOf')));
      }

      references[ref].push(ptr);
    }
  }

  function createSecurityProcessor (path) {
    return function (security, index) {
      _.forEach(security, function (scopes, name) {
        var sdPath = ['securityDefinitions', name];
        var sdPtr = JsonRefs.pathToPtr(sdPath);
        var srPath = path.concat([index.toString(), name]);

        // Identify missing reference to the security definition
        if (_.indexOf(referenceable, sdPtr) === -1) {
          response.errors.push({
            code: 'UNRESOLVABLE_REFERENCE',
            message: 'Security definition could not be resolved: ' + name,
            path: srPath
          });
        } else {
          addReference(sdPtr, JsonRefs.pathToPtr(srPath));

          _.forEach(scopes, function (scope, sIndex) {
            var ssrPath = srPath.concat(sIndex.toString());
            var ssrPtr = JsonRefs.pathToPtr(sdPath.concat(['scopes', scope]));

            if (_.indexOf(referenceable, ssrPtr) === -1) {
              response.errors.push({
                code: 'UNRESOLVABLE_REFERENCE',
                message: 'Security scope definition could not be resolved: ' + scope,
                path: ssrPath
              });
            } else {
              addReference(JsonRefs.pathToPtr(sdPath.concat(['scopes', scope])), ssrPtr);
            }
          });
        }
      });
    };
  }

  function walkLineage (root, id, lineage) {
    var details = inheritanceDetails[id || root];

    if (details) {
      _.each(details.parents, function (parent) {
        lineage.push(parent);

        if (root !== parent) {
          walkLineage(root, parent, lineage);
        }
      });
    }
  }

  // Identify referenceable definitions
  _.forEach(api.definitionFullyResolved.definitions, function (def, name) {
    referenceable.push(JsonRefs.pathToPtr(['definitions', name]));
  });

  _.forEach(api.definitionFullyResolved.parameters, function (def, name) {
    referenceable.push(JsonRefs.pathToPtr(['parameters', name]));
  });

  _.forEach(api.definitionFullyResolved.responses, function (def, name) {
    referenceable.push(JsonRefs.pathToPtr(['responses', name]));
  });

  _.forEach(api.definitionFullyResolved.securityDefinitions, function (def, name) {
    var sPath = ['securityDefinitions', name];

    referenceable.push(JsonRefs.pathToPtr(sPath));

    _.forEach(def.scopes, function (description, scope) {
      var ptr = JsonRefs.pathToPtr(sPath.concat(['scopes', scope]));

      if (_.indexOf(referenceable, ptr) === -1) {
        referenceable.push(ptr);
      }
    });
  });

  // Identify references and build inheritance model
  _.forEach(api.references, function (metadata, ptr) {
    var ptrPath = JsonRefs.pathFromPtr(ptr);

    if (!_.has(metadata, 'missing')) {
      addReference(metadata.uri, ptr);

      if (ptrPath[ptrPath.length - 2] === 'allOf') {
        addAncestor(JsonRefs.pathToPtr(ptrPath.slice(0, ptrPath.length - 2)), metadata.uri);
      }
    }
  });

  // Identify circular inheritance
  _.forEach(inheritanceDetails, function (details, ptr) {
    walkLineage(ptr, undefined, details.lineage);

    if (details.lineage.length > 1 && details.lineage[details.lineage.length - 1] === ptr ||
        details.parents[0] === ptr) {
      response.errors.push({
        code: 'CIRCULAR_INHERITANCE',
        lineage: [ptr].concat(details.lineage),
        message: 'Schema object inherits from itself: ' + ptr,
        path: JsonRefs.pathFromPtr(ptr)
      });
    }
  });

  // Identify references and validate missing references for non-JSON References (security)
  _.forEach(api.definitionFullyResolved.security, createSecurityProcessor(['security']));

  _.forEach(api.definitionFullyResolved.paths, function (pathDef, name) {
    var pPath = ['paths', name];

    _.forEach(pathDef.security, createSecurityProcessor(pPath.concat('security')));

    _.forEach(pathDef, function (operationDef, method) {
      // Do not process non-operations
      if (_.indexOf(supportedHttpMethods, method) === -1) {
        return;
      }

      _.forEach(operationDef.security,
                createSecurityProcessor(pPath.concat([method, 'security'])));
    });
  });

  // Identify unused references (missing references are already handled above)
  _.forEach(_.difference(referenceable, Object.keys(references)), function (ptr) {
    response.warnings.push({
      code: 'UNUSED_DEFINITION',
      message: 'Definition is not used: ' + ptr,
      path: JsonRefs.pathFromPtr(ptr)
    });
  });

  return response;
}

/**
 * Validates all schema objects and schema-like objects (non-body path parameters).
 *
 * * Validates circular references related to composition/inheritance
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
    var refPath = JsonRefs.pathFromPtr(ptr);

    list.push(JsonRefs.pathToPtr(refPath));

    return list;
  }, []);
  var response = {
    errors: [],
    warnings: []
  };
  var validators = [
    validateArrayTypeItemsExistence,
    validateDefaultValue,
    validateSchemaProperties
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
        parameterDef = helpers.computeParameterSchema(parameterDef);
      }

      walkSchema(api, blacklist, parameterDef, pPath, validators, response);
    });
  }

  function validateResponses (responses, path) {
    _.forEach(responses, function (responseDef, name) {
      var rPath = path.concat(name);

      _.forEach(responseDef.headers, function (header, hName) {
        walkSchema(api, blacklist, header, rPath.concat(['headers', hName]), validators, response);
      });

      if (!_.isUndefined(responseDef.schema)) {
        walkSchema(api, blacklist, responseDef.schema, rPath.concat('schema'), validators, response);
      }
    });
  }

  // Validate definitions
  _.forEach(api.definitionFullyResolved.definitions, function (definitionDef, name) {
    walkSchema(api, blacklist, definitionDef, ['definitions', name], validators, response);
  });

  // Validate global parameter definitions
  validateParameters(api.definitionFullyResolved.parameters, ['parameters']);

  // Validate global response definitions
  validateResponses(api.definitionFullyResolved.responses, ['responses']);

  // Validate paths and operations
  _.forEach(api.definitionFullyResolved.paths, function (pathDef, path) {
    var pPath = ['paths', path];

    // Validate path-level parameter definitions
    validateParameters(pathDef.parameters, pPath.concat('parameters'));

    _.forEach(pathDef, function (operationDef, method) {
      var oPath = pPath.concat(method);

      // Do not process non-operations
      if (_.indexOf(supportedHttpMethods, method) === -1) {
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
 * Validates paths and operations (Written as one validator to avoid multiple passes)
 *
 * * Ensure that path parameters are defined for each path parameter declaration
 * * Ensure that defined path parameters match a declared path parameter
 * * Ensure that paths are functionally different
 * * Ensure that an operation only has one body parameter
 * * Ensure that an operation has only a body or formData parameter but not both
 * * Ensure that all operation parameters are unique (in + name)
 * * Ensure that all operation ids are unique
 * * Ensure that path parameters have a name
 *
 * @param {SwaggerApi} api - The SwaggerApi object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validatePathsAndOperations (api) {
  var response = {
    errors: [],
    warnings: []
  };

  function validateDuplicateParameter (seenParameters, parameter, path) {
    var pName = parameter.in + ':' + parameter.name;

    // Identify duplicate parameter names
    if (_.indexOf(seenParameters, pName) > -1) {
      response.errors.push({
        code: 'DUPLICATE_PARAMETER',
        message: 'Operation cannot have duplicate parameters: ' + JsonRefs.pathToPtr(path),
        path: path
      });
    } else {
      seenParameters.push(pName);
    }

    return seenParameters;
  }

  _.reduce(api.definitionFullyResolved.paths, function (metadata, pathDef, path) {
    var declaredPathParameters = [];
    var normalizedPath = path;
    var pPath = ['paths', path];

    _.forEach(path.match(/\{(.*?)\}/g), function (arg, index) {
      // Record the path parameter name
      declaredPathParameters.push(arg.replace(/[{}]/g, ''));

      // Update the normalized path
      normalizedPath = normalizedPath.replace(arg, 'arg' + index);
    });

    // Identify paths with empty parameter declarations
    if (declaredPathParameters.indexOf('') > -1) {
      response.errors.push({
        code: 'EMPTY_PATH_PARAMETER_DECLARATION',
        message: 'Path parameter declaration cannot be empty: ' + path,
        path: ['paths', path]
      });
    }

    // Idenfity paths that are functionally the same
    if (_.indexOf(metadata.paths, normalizedPath) > -1) {
      response.errors.push({
        code: 'EQUIVALENT_PATH',
        message: 'Equivalent path already exists: ' + path,
        path: pPath
      });
    } else {
      metadata.paths.push(normalizedPath);
    }

    // Identify duplicate path-level parameters (We do this manually since SwaggerApi#getOperation consolidates them)
    _.reduce(pathDef.parameters, function (seenParameters, parameter, index) {
      return validateDuplicateParameter(seenParameters, parameter, pPath.concat(['parameters', index.toString()]));
    }, []);

    _.forEach(pathDef, function (operationDef, method) {
      var definedPathParameters = {};
      var oPath = pPath.concat(method);
      var operationId = operationDef.operationId;
      var pathMetadata;
      var parameters;

      // Do not process non-operations
      if (_.indexOf(supportedHttpMethods, method) === -1) {
        return;
      }

      // Identify duplicate operationIds
      if (!_.isUndefined(operationId)) {
        if (_.indexOf(metadata.operationIds, operationId) !== -1) {
          response.errors.push({
            code: 'DUPLICATE_OPERATIONID',
            message: 'Cannot have multiple operations with the same operationId: ' + operationId,
            path: oPath.concat(['operationId'])
          });
        } else {
          metadata.operationIds.push(operationId);
        }
      }

      // Identify duplicate operation-level parameters (We do this manually for the same reasons above)
      _.reduce(operationDef.parameters, function (seenParameters, parameter, index) {
        return validateDuplicateParameter(seenParameters, parameter, oPath.concat(['parameters', index.toString()]));
      }, []);

      // Use SwaggerApi#getOperation to avoid having to consolidate parameters
      parameters = api.getOperation(path, method).getParameters();

      pathMetadata = _.reduce(parameters, function (pMetadata, parameter) {
        // Record path parameters
        if (parameter.in === 'path') {
          definedPathParameters[parameter.name] = parameter.ptr;
        } else if (parameter.in === 'body') {
          pMetadata.bodyParameteters += 1;
        } else if (parameter.in === 'formData') {
          pMetadata.formParameters += 1;
        }

        return pMetadata;
      }, {bodyParameteters: 0, formParameters: 0});

      // Identify multiple body parameters
      if (pathMetadata.bodyParameteters > 1) {
        response.errors.push({
          code: 'MULTIPLE_BODY_PARAMETERS',
          message: 'Operation cannot have multiple body parameters',
          path: oPath
        });
      }

      // Identify having both a body and a form parameter
      if (pathMetadata.bodyParameteters > 0 && pathMetadata.formParameters > 0) {
        response.errors.push({
          code: 'INVALID_PARAMETER_COMBINATION',
          message: 'Operation cannot have a body parameter and a formData parameter',
          path: oPath
        });
      }

      // Identify undefined path parameters
      _.forEach(_.difference(declaredPathParameters, _.keys(definedPathParameters)), function (name) {
        response.errors.push({
          code: 'MISSING_PATH_PARAMETER_DEFINITION',
          message: 'Path parameter is declared but is not defined: ' + name,
          path: oPath
        });
      });

      // Identify undeclared path parameters
      _.forEach(_.difference(_.keys(definedPathParameters), declaredPathParameters), function (name) {
        response.errors.push({
          code: 'MISSING_PATH_PARAMETER_DECLARATION',
          message: 'Path parameter is defined but is not declared: ' + name,
          path: JsonRefs.pathFromPtr(definedPathParameters[name])
        });
      });
    });

    return metadata;
  }, {paths: [], operationIds: []});

  return response;
}

module.exports = {
  jsonSchemaValidator: validateStructure,
  semanticValidators: [
    validateReferences,
    validateSchemaObjects,
    validatePathsAndOperations
  ]
};
