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

const _ = require('lodash');
const JsonRefs = require('json-refs');
const supportedHttpMethods = require('swagger-methods');
const swaggerSchema = require('swagger-schema-official/schema');
const helpers = require('../helpers');

function getSchemaProperties(schema) {
  const properties = _.keys(schema.properties); // Start with the defined properties

  // Add properties defined in the parent
  _.forEach(schema.allOf, (parent) => {
    _.forEach(getSchemaProperties(parent), (property) => {
      if (_.indexOf(properties, property) === -1) {
        properties.push(property);
      }
    });
  });

  return properties;
}

function walkSchema(api, blacklist, schema, path, handlers, response) {
  const type = schema.type || 'object';

  function shouldSkip(cPath) {
    return _.indexOf(blacklist, JsonRefs.pathToPtr(cPath)) > -1;
  }

  // Do not process items in the blacklist as they've been processed already
  if (shouldSkip(path)) {
    return;
  }

  function walker(pSchema, pPath) {
    // Do not process items in the blacklist as they've been processed already
    if (shouldSkip(pPath)) {
      return;
    }

    _.forEach(pSchema, (item, name) => {
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

    _.forEach(['allOf', 'properties'], (propName) => {
      if (!_.isUndefined(schema[propName])) {
        walker(schema[propName], path.concat(propName));
      }
    });
  }

  _.forEach(handlers, (handler) => {
    handler(api, response, schema, path);
  });
}

/**
 * Validates the resolved OpenAPI Definition against the OpenAPI 3.x JSON Schema.
 *
 * @param {ApiDefinition} apiDefinition - The `ApiDefinition` object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validateStructure(apiDefinition) {
  const results = helpers.validateAgainstSchema(
    helpers.getJSONSchemaValidator(),
    swaggerSchema,
    apiDefinition.definitionFullyResolved,
  );

  // Make complex JSON Schema validation errors easier to understand (Issue 15)
  results.errors = results.errors.map((error) => {
    let defType = ['additionalProperties', 'items'].indexOf(error.path[error.path.length - 1]) > -1
      ? 'schema'
      : error.path[error.path.length - 2];

    if (['ANY_OF_MISSING', 'ONE_OF_MISSING'].indexOf(error.code) > -1) {
      switch (defType) {
        case 'parameters':
          defType = 'parameter';
          break;

        case 'responses':
          defType = 'response';
          break;

        case 'schema':
          defType += ` ${error.path[error.path.length - 1]}`;

        // no default
      }

      error.message = `Not a valid ${defType} definition`;
    }

    return error;
  });

  // Treat invalid/missing references as structural errors
  _.each(apiDefinition.references, (refDetails, refPtr) => {
    const refPath = JsonRefs.pathFromPtr(refPtr);
    let err;

    if (refDetails.missing) {
      err = {
        code: 'UNRESOLVABLE_REFERENCE',
        message: `Reference could not be resolved: ${refDetails.uri}`,
        path: refPath.concat('$ref'),
      };

      if (_.has(refDetails, 'error')) {
        err.error = refDetails.error;
      }

      results.errors.push(err);
    } else if (refDetails.type === 'invalid') {
      results.errors.push({
        code: 'INVALID_REFERENCE',
        message: refDetails.error || 'Invalid JSON Reference',
        path: refPath.concat('$ref'),
      });
    } else if (_.has(refDetails, 'warning')) {
      // json-refs only creates warnings for JSON References with superfluous properties which will be ignored
      results.warnings.push({
        code: 'EXTRA_REFERENCE_PROPERTIES',
        message: refDetails.warning,
        path: refPath,
      });
    }
  });

  return results;
}

/* Schema Object Validators */

function validateArrayTypeItemsExistence(api, response, schema, path) {
  if (schema.type === 'array' && _.isUndefined(schema.items)) {
    response.errors.push({
      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
      message: 'Missing required property: items',
      path,
    });
  }
}

function validateDefaultValue(api, response, schema, path) {
  let result;

  if (!_.isUndefined(schema.default)) {
    result = helpers.validateAgainstSchema(helpers.getJSONSchemaValidator(), schema, schema.default);

    _.forEach(result.errors, (error) => {
      error.path = path.concat(error.path.concat('default'));

      response.errors.push(error);
    });

    _.forEach(result.warnings, (warning) => {
      warning.path = path.concat(warning.path.push('default'));

      response.warnings.push(warning);
    });
  }
}

function validateSchemaProperties(api, response, schema, path) {
  _.forEach(_.difference(schema.required || [], getSchemaProperties(schema)), (name) => {
    response.errors.push({
      code: 'OBJECT_MISSING_REQUIRED_PROPERTY_DEFINITION',
      message: `Missing required property definition: ${name}`,
      path,
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
 * @param {ApiDefinition} apiDefinition - The `ApiDefinition` object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validateReferences(apiDefinition) {
  const docReferences = {};
  const inheritanceDetails = {};
  const referenceable = [];
  let references = {};
  const response = {
    errors: [],
    warnings: [],
  };

  function addAncestor(dsc, anc) {
    if (!_.has(inheritanceDetails, dsc)) {
      inheritanceDetails[dsc] = {
        lineage: [],
        parents: [
          anc,
        ],
      };
    } else {
      inheritanceDetails[dsc].parents.push(anc);
    }
  }

  function addReference(ref, ptr) {
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

  function createSecurityProcessor(path) {
    return (security, index) => {
      _.forEach(security, (scopes, name) => {
        const sdPath = ['securityDefinitions', name];
        const sdPtr = JsonRefs.pathToPtr(sdPath);
        const srPath = path.concat([index.toString(), name]);

        // Identify missing reference to the security definition
        if (_.indexOf(referenceable, sdPtr) === -1) {
          response.errors.push({
            code: 'UNRESOLVABLE_REFERENCE',
            message: `Security definition could not be resolved: ${name}`,
            path: srPath,
          });
        } else {
          addReference(sdPtr, JsonRefs.pathToPtr(srPath));

          _.forEach(scopes, (scope, sIndex) => {
            const ssrPath = srPath.concat(sIndex.toString());
            const ssrPtr = JsonRefs.pathToPtr(sdPath.concat(['scopes', scope]));

            if (_.indexOf(referenceable, ssrPtr) === -1) {
              response.errors.push({
                code: 'UNRESOLVABLE_REFERENCE',
                message: `Security scope definition could not be resolved: ${scope}`,
                path: ssrPath,
              });
            } else {
              addReference(JsonRefs.pathToPtr(sdPath.concat(['scopes', scope])), ssrPtr);
            }
          });
        }
      });
    };
  }

  function walkLineage(root, id, lineage) {
    const details = inheritanceDetails[id || root];

    if (details) {
      _.each(details.parents, (parent) => {
        lineage.push(parent);

        if (root !== parent) {
          walkLineage(root, parent, lineage);
        }
      });
    }
  }

  // Identify referenceable definitions
  _.forEach(apiDefinition.definitionFullyResolved.definitions, (def, name) => {
    referenceable.push(JsonRefs.pathToPtr(['definitions', name]));
  });

  _.forEach(apiDefinition.definitionFullyResolved.parameters, (def, name) => {
    referenceable.push(JsonRefs.pathToPtr(['parameters', name]));
  });

  _.forEach(apiDefinition.definitionFullyResolved.responses, (def, name) => {
    referenceable.push(JsonRefs.pathToPtr(['responses', name]));
  });

  _.forEach(apiDefinition.definitionFullyResolved.securityDefinitions, (def, name) => {
    const sPath = ['securityDefinitions', name];

    referenceable.push(JsonRefs.pathToPtr(sPath));

    _.forEach(def.scopes, (description, scope) => {
      const ptr = JsonRefs.pathToPtr(sPath.concat(['scopes', scope]));

      if (_.indexOf(referenceable, ptr) === -1) {
        referenceable.push(ptr);
      }
    });
  });

  // Identify references and build inheritance model
  _.forEach(apiDefinition.references, (metadata, ptr) => {
    const ptrPath = JsonRefs.pathFromPtr(ptr);

    if (!_.has(metadata, 'missing')) {
      // This reference is a document reference, record it for later
      if (['relative', 'remote'].indexOf(metadata.type) > -1 && metadata.fqURI.indexOf('#') === -1) {
        if (_.isUndefined(docReferences[metadata.fqURI])) {
          docReferences[metadata.fqURI] = [];
        }

        docReferences[metadata.fqURI].push(ptr);
      }

      addReference(metadata.fqURI, ptr);

      if (ptrPath[ptrPath.length - 2] === 'allOf') {
        addAncestor(JsonRefs.pathToPtr(ptrPath.slice(0, ptrPath.length - 2)), metadata.uri);
      }
    }
  });

  // json-refs only processes each referenced document once, no matter how many places that document is referenced from.
  // To ensure that all places where referenceable objects are referenced can be identified, we need ot post-process the
  // reference model created above and record each reference within a relative/remote document relative to where the
  // containing document was referenced.
  references = _.reduce(references, (allRefs, from, to) => {
    const toParts = to.split('#');

    if (toParts[0] !== '' && toParts[1] !== '') {
      _.forEach(docReferences[toParts[0]], (dFrom) => {
        allRefs[[dFrom, toParts[1]].join('')] = from;
      });
    } else {
      allRefs[to] = from;
    }

    return allRefs;
  }, {});

  // Identify circular inheritance
  _.forEach(inheritanceDetails, (details, ptr) => {
    walkLineage(ptr, undefined, details.lineage);

    const firstCondition = details.lineage.length > 1 && details.lineage[details.lineage.length - 1] === ptr;
    const secondCondition = details.parents[0] === ptr;
    if (firstCondition || secondCondition) {
      response.errors.push({
        code: 'CIRCULAR_INHERITANCE',
        lineage: [ptr].concat(details.lineage),
        message: `Schema object inherits from itself: ${ptr}`,
        path: JsonRefs.pathFromPtr(ptr),
      });
    }
  });

  // Identify references and validate missing references for non-JSON References (security)
  _.forEach(apiDefinition.definitionFullyResolved.security, createSecurityProcessor(['security']));

  _.forEach(apiDefinition.definitionFullyResolved.paths, (pathDef, name) => {
    const pPath = ['paths', name];

    _.forEach(pathDef.security, createSecurityProcessor(pPath.concat('security')));

    _.forEach(pathDef, (operationDef, method) => {
      // Do not process non-operations
      if (_.indexOf(supportedHttpMethods, method) === -1) {
        return;
      }

      _.forEach(
        operationDef.security,
        createSecurityProcessor(pPath.concat([method, 'security'])),
      );
    });
  });

  // Identify unused references (missing references are already handled above)
  _.forEach(_.difference(referenceable, Object.keys(references)), (ptr) => {
    response.warnings.push({
      code: 'UNUSED_DEFINITION',
      message: `Definition is not used: ${ptr}`,
      path: JsonRefs.pathFromPtr(ptr),
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
 * @param {ApiDefinition} apiDefinition - The `ApiDefinition` object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validateSchemaObjects(apiDefinition) {
  // Build a blacklist to avoid cascading errors/warnings
  const blacklist = _.reduce(apiDefinition.references, (list, metadata, ptr) => {
    const refPath = JsonRefs.pathFromPtr(ptr);

    list.push(JsonRefs.pathToPtr(refPath));

    return list;
  }, []);
  const response = {
    errors: [],
    warnings: [],
  };
  const validators = [
    validateArrayTypeItemsExistence,
    validateDefaultValue,
    validateSchemaProperties,
  ];

  function validateParameters(parameters, path) {
    _.forEach(parameters, (parameterDef, name) => {
      name = _.isNumber(name) ? name.toString() : name;
      const pPath = path.concat(name);

      // Create JSON Schema for non-body parameters
      if (parameterDef.in !== 'body') {
        parameterDef = helpers.computeParameterSchema(parameterDef);
      }

      walkSchema(apiDefinition, blacklist, parameterDef, pPath, validators, response);
    });
  }

  function validateResponses(responses, path) {
    _.forEach(responses, (responseDef, name) => {
      const rPath = path.concat(name);

      _.forEach(responseDef.headers, (header, hName) => {
        walkSchema(apiDefinition, blacklist, header, rPath.concat(['headers', hName]), validators, response);
      });

      if (!_.isUndefined(responseDef.schema)) {
        walkSchema(apiDefinition, blacklist, responseDef.schema, rPath.concat('schema'), validators, response);
      }
    });
  }

  // Validate definitions
  _.forEach(apiDefinition.definitionFullyResolved.definitions, (definitionDef, name) => {
    walkSchema(apiDefinition, blacklist, definitionDef, ['definitions', name], validators, response);
  });

  // Validate global parameter definitions
  validateParameters(apiDefinition.definitionFullyResolved.parameters, ['parameters']);

  // Validate global response definitions
  validateResponses(apiDefinition.definitionFullyResolved.responses, ['responses']);

  // Validate paths and operations
  _.forEach(apiDefinition.definitionFullyResolved.paths, (pathDef, path) => {
    const pPath = ['paths', path];

    // Validate path-level parameter definitions
    validateParameters(pathDef.parameters, pPath.concat('parameters'));

    _.forEach(pathDef, (operationDef, method) => {
      const oPath = pPath.concat(method);

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
 * @param {ApiDefinition} apiDefinition - The `ApiDefinition` object
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
function validatePathsAndOperations(apiDefinition) {
  const response = {
    errors: [],
    warnings: [],
  };

  function validateDuplicateParameter(seenParameters, parameter, path) {
    const pName = `${parameter.in}:${parameter.name}`;

    // Identify duplicate parameter names
    if (_.indexOf(seenParameters, pName) > -1) {
      response.errors.push({
        code: 'DUPLICATE_PARAMETER',
        message: `Operation cannot have duplicate parameters: ${JsonRefs.pathToPtr(path)}`,
        path,
      });
    } else {
      seenParameters.push(pName);
    }

    return seenParameters;
  }

  _.reduce(apiDefinition.definitionFullyResolved.paths, (metadata, pathDef, path) => {
    const declaredPathParameters = [];
    let normalizedPath = path;
    const pPath = ['paths', path];

    _.forEach(path.match(/\{(.*?)\}/g), (arg, index) => {
      // Record the path parameter name
      declaredPathParameters.push(arg.replace(/[{}]/g, ''));

      // Update the normalized path
      normalizedPath = normalizedPath.replace(arg, `arg${index}`);
    });

    // Identify paths with empty parameter declarations
    if (declaredPathParameters.indexOf('') > -1) {
      response.errors.push({
        code: 'EMPTY_PATH_PARAMETER_DECLARATION',
        message: `Path parameter declaration cannot be empty: ${path}`,
        path: ['paths', path],
      });
    }

    // Idenfity paths that are functionally the same
    if (_.indexOf(metadata.paths, normalizedPath) > -1) {
      response.errors.push({
        code: 'EQUIVALENT_PATH',
        message: `Equivalent path already exists: ${path}`,
        path: pPath,
      });
    } else {
      metadata.paths.push(normalizedPath);
    }

    // Identify duplicate path-level parameters (We do this manually since ApiDefinition#getOperation consolidates them)
    _.reduce(pathDef.parameters, (seenParameters, parameter, index) => validateDuplicateParameter(seenParameters, parameter, pPath.concat(['parameters', index.toString()])), []);

    _.forEach(pathDef, (operationDef, method) => {
      const definedPathParameters = {};
      const oPath = pPath.concat(method);
      const { operationId } = operationDef;

      // Do not process non-operations
      if (_.indexOf(supportedHttpMethods, method) === -1) {
        return;
      }

      // Identify duplicate operationIds
      if (!_.isUndefined(operationId)) {
        if (_.indexOf(metadata.operationIds, operationId) !== -1) {
          response.errors.push({
            code: 'DUPLICATE_OPERATIONID',
            message: `Cannot have multiple operations with the same operationId: ${operationId}`,
            path: oPath.concat(['operationId']),
          });
        } else {
          metadata.operationIds.push(operationId);
        }
      }

      // Identify duplicate operation-level parameters (We do this manually for the same reasons above)
      _.reduce(operationDef.parameters, (seenParameters, parameter, index) => validateDuplicateParameter(seenParameters, parameter, oPath.concat(['parameters', index.toString()])), []);

      // Use ApiDefinition#getOperation to avoid having to consolidate parameters
      const parameters = apiDefinition.getOperation(path, method).getParameters();

      const pathMetadata = _.reduce(parameters, (pMetadata, parameter) => {
        // Record path parameters
        if (parameter.in === 'path') {
          definedPathParameters[parameter.name] = parameter.ptr;
        } else if (parameter.in === 'body') {
          pMetadata.bodyParameteters += 1;
        } else if (parameter.in === 'formData') {
          pMetadata.formParameters += 1;
        }

        return pMetadata;
      }, { bodyParameteters: 0, formParameters: 0 });

      // Identify multiple body parameters
      if (pathMetadata.bodyParameteters > 1) {
        response.errors.push({
          code: 'MULTIPLE_BODY_PARAMETERS',
          message: 'Operation cannot have multiple body parameters',
          path: oPath,
        });
      }

      // Identify having both a body and a form parameter
      if (pathMetadata.bodyParameteters > 0 && pathMetadata.formParameters > 0) {
        response.errors.push({
          code: 'INVALID_PARAMETER_COMBINATION',
          message: 'Operation cannot have a body parameter and a formData parameter',
          path: oPath,
        });
      }

      // Identify undefined path parameters
      _.forEach(_.difference(declaredPathParameters, _.keys(definedPathParameters)), (name) => {
        response.errors.push({
          code: 'MISSING_PATH_PARAMETER_DEFINITION',
          message: `Path parameter is declared but is not defined: ${name}`,
          path: oPath,
        });
      });

      // Identify undeclared path parameters
      _.forEach(_.difference(_.keys(definedPathParameters), declaredPathParameters), (name) => {
        response.errors.push({
          code: 'MISSING_PATH_PARAMETER_DECLARATION',
          message: `Path parameter is defined but is not declared: ${name}`,
          path: JsonRefs.pathFromPtr(definedPathParameters[name]),
        });
      });
    });

    return metadata;
  }, { paths: [], operationIds: [] });

  return response;
}

module.exports = {
  jsonSchemaValidator: validateStructure,
  semanticValidators: [
    validateReferences,
    validateSchemaObjects,
    validatePathsAndOperations,
  ],
};
