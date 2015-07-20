/* eslint-env browser, mocha */

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
var assert = require('assert');
var JsonRefs = require('json-refs');
var swaggerApi = require('..');
var pathLoader = require('path-loader');
var types = require('../lib/types');
var YAML = require('js-yaml');

var helpers = require('../lib/helpers');
var implementation = require('../lib/versions/2.0');
var swaggerDocPath = 'http://localhost:44444/swagger.yaml';
var swaggerDocValidator = helpers.createJSONValidator({
  formatValidators: require('../lib/versions/2.0/format-validators')
});

function getOperationCount (path) {
  var count = 0;

  _.each(path, function (operation, method) {
    if (implementation.supportedHttpMethods.indexOf(method) > -1) {
      count += 1;
    }
  });

  return count;
}

function fail (msg) {
  assert.fail(msg);
}

function shouldHadFailed () {
  fail('The code above should had thrown an error');
}

function shouldNotHadFailed (err) {
  console.error(err.stack);

  fail('The code above should not had thrown an error');
}

describe('swagger-core-api (Swagger 2.0)', function () {
  var resolvedRefs;
  var resolvedSwaggerDoc;
  var swagger;
  var swaggerDoc;

  before(function (done) {
    pathLoader
      .load(swaggerDocPath)
      .then(YAML.safeLoad)
      .then(function (json) {
        swaggerDoc = json;

        return json;
      })
      .then(function (json) {
        return new Promise(function (resolve, reject) {
          JsonRefs.resolveRefs(json, function (err, resolved, metadata) {
            if (err) {
              reject(err);
            } else {
              resolvedRefs = metadata;
              resolvedSwaggerDoc = resolved;

              resolve();
            }
          });
        });
      })
      .then(function () {
        return swaggerApi.create({
          definition: swaggerDoc
        })
          .then(function (obj) {
            swagger = obj;
          });
      })
      .then(done, done);
  });

  describe('swagger-core-api#create', function () {
    function validateCreateSwaggerApi (options) {
      return function (theApi) {
        assert.ok(theApi instanceof types.SwaggerApi);
        assert.deepEqual(theApi.definition, swaggerDoc);
        assert.equal(theApi.documentation, implementation.documentation);
        assert.deepEqual(theApi.options, options);
        assert.equal(theApi.version, implementation.version);
        assert.deepEqual(theApi.references, resolvedRefs);
        assert.deepEqual(theApi.resolved, resolvedSwaggerDoc);

        // Validate the merging of the Swagger definition properties and the SwaggerApi properties
        _.forEach(swaggerDoc, function (val, key) {
          assert.deepEqual(theApi[key], val);
        });

        // Validate the operations (Simple tests for now, deeper testing is below)
        assert.ok(_.isArray(theApi.operationObjects));
        assert.ok(theApi.operationObjects.length > 0);

        _.each(theApi.operationObjects, function (operation) {
          assert.ok(operation instanceof types.Operation);

          // Validate the parameters (Simple tests for now, deeper testing is below)
          _.each(operation.parameterObjects, function (parameter) {
            assert.ok(parameter instanceof types.Parameter);
          });
        });
      };
    }

    function validateCreateSwaggerApiCallback (options, done) {
      return function (err, theApi) {
        assert.ok(_.isUndefined(err));

        validateCreateSwaggerApi(options)(theApi);

        done();
      };
    }

    describe('promises', function () {
      it('should handle definition object', function (done) {
        var options = {
          definition: swaggerDoc
        };

        swaggerApi.create(options)
          .then(validateCreateSwaggerApi(options))
          .then(done, done);
      });

      it('should handle definition file location', function (done) {
        var options = {
          definition: swaggerDocPath
        };

        swaggerApi.create(options)
          .then(validateCreateSwaggerApi(options))
          .then(done, done);
      });

      // TODO: Add test for definition file URL (remote)
    });

    describe('callbacks', function () {
      it('should handle definition object', function (done) {
        var options = {
          definition: swaggerDoc
        };

        swaggerApi.create(options, validateCreateSwaggerApiCallback(options, done))
          .catch(done);
      });

      it('should handle definition file location', function (done) {
        var options = {
          definition: swaggerDocPath
        };

        swaggerApi.create(options, validateCreateSwaggerApiCallback(options, done))
          .catch(done);
      });

      // TODO: Add test for definition file URL (remote)
    });
  });

  describe('Operation', function () {
    it('should handle composite parameters', function () {
      var method = 'post';
      var path = '/pet/{petId}';
      var operation = swagger.getOperation(path, method);
      var pathDef = swagger.resolved.paths[path];
      var operationDef = swagger.resolved.paths[path][method];

      assert.equal(operation.path, path);
      assert.equal(operation.method, method);
      assert.equal(operation.ptr, '#/paths/~1pet~1{petId}/' + method);

      _.each(operation.definition, function (val, key) {
        if (key === 'parameters') {
          assert.deepEqual(val, [
            pathDef.parameters[0],
            operationDef.parameters[0],
            operationDef.parameters[1]
          ]);
        } else if (key === 'security') {
          assert.deepEqual(val, [
            {
              'petstore_auth': [
                'read:pets',
                'write:pets'
              ]
            }
          ]);
        } else {
          assert.deepEqual(val, pathDef[method][key]);
        }
      });

      assert.equal(operation.parameterObjects.length, 3);

      _.each(operation.parameterObjects, function (parameter) {
        assert.ok(parameter instanceof types.Parameter);
      });
    });

    it('should handle explicit parameters', function () {
      var method = 'post';
      var path = '/pet/{petId}/uploadImage';
      var operation = swagger.getOperation(path, method);
      var pathDef = swagger.resolved.paths[path];

      assert.equal(operation.path, path);
      assert.equal(operation.method, method);
      assert.equal(operation.ptr, '#/paths/~1pet~1{petId}~1uploadImage/post');

      _.each(operation.definition, function (val, key) {
        if (key === 'security') {
          assert.deepEqual(val, [
            {
              'petstore_auth': [
                'read:pets',
                'write:pets'
              ]
            }
          ]);
        } else {
          assert.deepEqual(val, pathDef[method][key]);
        }
      });

      _.each(operation.parameterObjects, function (parameter) {
        assert.ok(parameter instanceof types.Parameter);
      });
    });

    it('should handle composite security', function () {
      assert.deepEqual(swagger.getOperation('/pet/{petId}', 'get').security, [
        {
          'petstore_auth': [
            'read:pets',
            'write:pets'
          ]
        }
      ]);
    });

    it('should handle explicit parameters', function () {
      assert.deepEqual(swagger.getOperation('/user/{username}', 'get').security, [
        {
          'api_key': []
        }
      ]);
    });

    // More vigorous testing of the Parameter object itself and the parameter composition are done elsewhere
    describe('#getParameters', function () {
      it('should return the proper parameter objects', function () {
        var operation = swagger.getOperation('/pet/{petId}', 'post');

        assert.deepEqual(operation.getParameters(), operation.parameterObjects);
      });
    });

    describe('#getResponseSchema', function () {
      it('should throw an Error for invalid response code', function () {
        try {
          swagger.getOperation('/pet/{petId}', 'get').getResponseSchema('fake');

          shouldHadFailed();
        } catch (err) {
          assert.equal(err.message, 'This operation does not have a defined \'fake\' response code');
        }
      });

      it('should return default response when no code is provided', function () {
        var operation = swagger.getOperation('/user', 'post');

        assert.deepEqual(operation.getResponseSchema(), operation.definition.responses.default.schema);
      });

      it('should return the proper schema for the provided code', function () {
        var operation = swagger.getOperation('/pet/{petId}', 'get');

        assert.deepEqual(operation.getResponseSchema(200), operation.definition.responses['200'].schema);
      });
    });

    describe('#getResponseSample', function () {
      it('should throw an Error for invalid response code', function () {
        try {
          swagger.getOperation('/pet/{petId}', 'get').getResponseSample('fake');

          shouldHadFailed();
        } catch (err) {
          assert.equal(err.message, 'This operation does not have a defined \'fake\' response code');
        }
      });

      it('should return sample for default response when no code is provided', function () {
        assert.ok(_.isUndefined(swagger.getOperation('/user', 'post').getResponseSample()));
      });

      it('should return sample for the requested response code', function () {
        var operation = swagger.getOperation('/pet/{petId}', 'get');

        try {
          helpers.validateAgainstSchema(swaggerDocValidator,
                                        operation.getResponseSchema(200),
                                        operation.getResponseSample(200));
        } catch (err) {
          shouldNotHadFailed(err);
        }
      });

      it('should return undefined for void response', function () {
        assert.ok(_.isUndefined(swagger.getOperation('/pet', 'post').getResponseSample(405)));
      });
    });
  });

  describe('Parameter', function () {
    it('should have proper structure', function () {
      var path = '/pet/{petId}';
      var pathDef = swagger.resolved.paths[path];

      _.each(swagger.getOperation(path, 'post').getParameters(), function (parameter, index) {
        var ptr = '#/paths/~1pet~1{petId}/';
        var def;

        if (index === 0) {
          def = pathDef.parameters[0];
          ptr += 'parameters/0';
        } else {
          def = pathDef.post.parameters[index - 1];
          ptr += 'post/parameters/' + (index - 1);
        }

        assert.equal(parameter.ptr, ptr);
        assert.deepEqual(parameter.definition, def);
      });
    });

    describe('#getSchema', function () {
      it('should handle parameter with explicit schema definition (body parameter)', function () {
        var schema = swagger.getOperation('/pet', 'post').getParameters()[0].getSchema();

        // Make sure the generated JSON Schema is identical to its referenced schema
        assert.deepEqual(schema, swagger.resolved.definitions.Pet);

        // Make sure the generated JSON Schema validates an invalid object properly
        try {
          helpers.validateAgainstSchema(swaggerDocValidator, schema, {});
        } catch (err) {
          assert.equal(err.code, 'SCHEMA_VALIDATION_FAILED');
          assert.equal(err.message, 'JSON Schema validation failed');
          assert.deepEqual(err.errors, [
            {
              code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
              message: 'Missing required property: photoUrls',
              path: []
            },
            {
              code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
              message: 'Missing required property: name',
              path: []
            }
          ]);
          assert.deepEqual(err.warnings, []);
        }

        // Make sure the generated JSON Schema validates a valid object properly
        try {
          helpers.validateAgainstSchema(swaggerDocValidator, schema, {
            photoUrls: [],
            name: 'Test Pet'
          });
        } catch (err) {
          shouldNotHadFailed(err);
        }
      });

      it('should handle parameter with schema-like definition (non-body parameter)', function () {
        var schema = swagger.getOperation('/pet/findByTags', 'get').getParameters()[0].getSchema();

        // Make sure the generated JSON Schema is as expected
        assert.deepEqual(schema, {
          description: 'Tags to filter by',
          type: 'array',
          items: {
            type: 'string'
          }
        });

        // Make sure the generated JSON Schema validates an invalid object properly
        try {
          helpers.validateAgainstSchema(swaggerDocValidator, schema, 1);
        } catch (err) {
          assert.equal(err.code, 'SCHEMA_VALIDATION_FAILED');
          assert.equal(err.message, 'JSON Schema validation failed');
          assert.deepEqual(err.errors, [
            {
              code: 'INVALID_TYPE',
              description: 'Tags to filter by',
              message: 'Expected type array but found type integer',
              path: []
            }
          ]);
          assert.deepEqual([], err.warnings);
        }

        // Make sure the generated JSON Schema validates a valid object properly
        try {
          helpers.validateAgainstSchema(swaggerDocValidator, schema, [
            'tag1',
            'tag2',
            'tag3'
          ]);
        } catch (err) {
          shouldNotHadFailed(err);
        }
      });
    });

    describe('#getSample', function () {
      it('should handle parameter with explicit schema definition (body parameter)', function () {
        var parameter = swagger.getOperation('/pet', 'post').getParameters()[0];

        try {
          helpers.validateAgainstSchema(swaggerDocValidator,
                                        parameter.getSchema(),
                                        parameter.getSample());
        } catch (err) {
          shouldNotHadFailed(err);
        }
      });

      it('should handle parameter with schema-like definition (non-body parameter)', function () {
        var parameter = swagger.getOperation('/pet/findByTags', 'get').getParameters()[0];

        try {
          helpers.validateAgainstSchema(swaggerDocValidator,
                                        parameter.getSchema(),
                                        parameter.getSample());
        } catch (err) {
          shouldNotHadFailed(err);
        }
      });
    });
  });

  describe('SwaggerApi', function () {
    beforeEach(function () {
      swagger.customValidators = [];
      swagger.errors = [];
      swagger.warnings = [];
    });

    describe('#getOperations', function () {
      it('should return return all operations', function () {
        var operations = swagger.getOperations();

        assert.equal(operations.length, _.reduce(swagger.definition.paths, function (count, path) {
          count += getOperationCount(path);

          return count;
        }, 0));

        // Validate the operations
      });

      it('should return return all operations for the given path', function () {
        var operations = swagger.getOperations('/pet/{petId}');

        assert.ok(swagger.getOperations().length > operations.length);
        assert.equal(operations.length, getOperationCount(swagger.definition.paths['/pet/{petId}']));
      });

      it('should return return no operations for a missing path', function () {
        assert.equal(swagger.getOperations('/some/fake/path').length, 0);
      });
    });

    describe('#getOperation', function () {
      it('should return the expected operation', function () {
        var operation = swagger.getOperation('/pet/{petId}', 'get');

        assert.ok(!_.isUndefined(operation));
      });

      it('should return no operation for missing path', function () {
        assert.ok(_.isUndefined(swagger.getOperation('/petz/{petId}', 'get')));
      });

      it('should return no operation for missing method', function () {
        assert.ok(_.isUndefined(swagger.getOperation('/pet/{petId}', 'head')));
      });
    });

    describe('#registerValidator', function () {
      it('should throw TypeError for invalid arguments', function () {
        var scenarios = [
          [[], 'validator is required'],
          [['wrongType'], 'validator must be a function']
        ];

        _.forEach(scenarios, function (scenario) {
          try {
            swagger.registerValidator.apply(swagger, scenario[0]);

            shouldHadFailed();
          } catch (err) {
            assert.equal(scenario[1], err.message);
          }
        });
      });

      it('should add validator to list of validators', function () {
        var result = swagger.validate();
        var expectedErrors = [
          'error'
        ];
        var expectedWarnings = [
          'warning'
        ];

        assert.ok(result === true);
        assert.deepEqual([], swagger.getLastErrors());
        assert.deepEqual([], swagger.getLastWarnings());

        swagger.registerValidator(function () {
          return {
            errors: expectedErrors,
            warnings: expectedWarnings
          };
        });

        result = swagger.validate();

        assert.ok(result === false);
        assert.deepEqual(expectedErrors, swagger.getLastErrors());
        assert.deepEqual(expectedWarnings, swagger.getLastWarnings());
      });
    });

    describe('#validate', function () {
      it('should not throw an Error for a valid document', function () {
        try {
          swagger.validate();
        } catch (err) {
          shouldNotHadFailed(err);
        }
      });

      describe('should throw an Error for an invalid document', function () {
        it('does not validate against JSON Schema', function (done) {
          var cSwagger = _.cloneDeep(swaggerDoc);

          delete cSwagger.paths;

          swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                  message: 'Missing required property: paths',
                  path: []
                }
              ], api.getLastErrors());
            })
            .then(done, done);
        });

        describe('array type missing required items property', function () {
          function validateBrokenArray (cSwagger, path, done) {
            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);

                // Validate that all warnings are unused definitions
                _.forEach(api.getLastWarnings(), function (warning) {
                  assert.equal('UNUSED_DEFINITION', warning.code);
                });

                assert.deepEqual([
                  {
                    code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                    message: 'Missing required property: items',
                    path: path
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          }

          describe('schema definitions', function () {
            describe('array', function () {
              it('no items', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.definitions.Pet = {
                  type: 'array'
                };

                validateBrokenArray(cSwagger, ['definitions', 'Pet'], done);
              });

              it('items object', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.definitions.Pet = {
                  type: 'array',
                  items: {
                    type: 'array'
                  }
                };

                validateBrokenArray(cSwagger, ['definitions', 'Pet', 'items'], done);
              });

              it('items array', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.definitions.Pet = {
                  type: 'array',
                  items: [
                    {
                      type: 'array'
                    }
                  ]
                };

                validateBrokenArray(cSwagger, ['definitions', 'Pet', 'items', '0'], done);
              });
            });

            describe('object', function () {
              describe('additionalProperties', function () {
                it('no items', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.definitions.Pet = {
                    type: 'object',
                    additionalProperties: {
                      type: 'array'
                    }
                  };

                  validateBrokenArray(cSwagger, ['definitions', 'Pet', 'additionalProperties'], done);
                });

                it('items object', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.definitions.Pet = {
                    type: 'object',
                    additionalProperties: {
                      type: 'array',
                      items: {
                        type: 'array'
                      }
                    }
                  };

                  validateBrokenArray(cSwagger, ['definitions', 'Pet', 'additionalProperties', 'items'], done);
                });

                it('items array', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.definitions.Pet = {
                    type: 'object',
                    additionalProperties: {
                      type: 'array',
                      items: [
                        {
                          type: 'array'
                        }
                      ]
                    }
                  };

                  validateBrokenArray(cSwagger,
                                      ['definitions', 'Pet', 'additionalProperties', 'items', '0'],
                                      done);
                });
              });

              describe('properties', function () {
                it('no items', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.definitions.Pet = {
                    type: 'object',
                    properties: {
                      aliases: {
                        type: 'array'
                      }
                    }
                  };

                  validateBrokenArray(cSwagger, ['definitions', 'Pet', 'properties', 'aliases'], done);
                });

                it('items object', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.definitions.Pet = {
                    type: 'object',
                    properties: {
                      aliases: {
                        type: 'array',
                        items: {
                          type: 'array'
                        }
                      }
                    }
                  };

                  validateBrokenArray(cSwagger, ['definitions', 'Pet', 'properties', 'aliases', 'items'], done);
                });

                it('items array', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.definitions.Pet = {
                    type: 'object',
                    properties: {
                      aliases: {
                        type: 'array',
                        items: [
                          {
                            type: 'array'
                          }
                        ]
                      }
                    }
                  };

                  validateBrokenArray(cSwagger, ['definitions', 'Pet', 'properties', 'aliases', 'items', '0'], done);
                });
              });

              describe('allOf', function () {
                it('no items', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.definitions.Pet = {
                    type: 'object',
                    allOf: [
                      {
                        type: 'array'
                      }
                    ]
                  };

                  validateBrokenArray(cSwagger, ['definitions', 'Pet', 'allOf', '0'], done);
                });

                it('items object', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.definitions.Pet = {
                    type: 'object',
                    allOf: [
                      {
                        type: 'object',
                        properties: {
                          aliases: {
                            type: 'array',
                            items: {
                              type: 'array'
                            }
                          }
                        }
                      }
                    ]
                  };

                  validateBrokenArray(cSwagger,
                                      ['definitions', 'Pet', 'allOf', '0', 'properties', 'aliases', 'items'],
                                      done);
                });

                it('items array', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.definitions.Pet = {
                    type: 'object',
                    allOf: [
                      {
                        type: 'object',
                        properties: {
                          aliases: {
                            type: 'array',
                            items: [
                              {
                                type: 'array'
                              }
                            ]
                          }
                        }
                      }
                    ]
                  };

                  validateBrokenArray(cSwagger,
                                      ['definitions', 'Pet', 'allOf', '0', 'properties', 'aliases', 'items', '0'],
                                      done);
                });
              });
            });

            it('recursive', function (done) {
              var cSwagger = _.cloneDeep(swaggerDoc);
              var errorSchema = {
                type: 'object',
                allOf: [
                  {
                    type: 'array'
                  }
                ],
                properties: {
                  aliases: {
                    type: 'array'
                  }
                },
                additionalProperties: {
                  type: 'array'
                }
              };

              cSwagger.definitions.Pet = {
                allOf: [
                  errorSchema
                ],
                properties: {
                  aliases: errorSchema
                },
                additionalProperties: errorSchema
              };

              swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  var result = api.validate();

                  assert.ok(result === false);

                  // Validate that all warnings are unused definitions
                  _.forEach(api.getLastWarnings(), function (warning) {
                    assert.equal('UNUSED_DEFINITION', warning.code);
                  });

                  assert.deepEqual([
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'additionalProperties', 'additionalProperties']
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'additionalProperties', 'allOf', '0']
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'additionalProperties', 'properties', 'aliases']
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'allOf', '0', 'additionalProperties']
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'allOf', '0', 'allOf', '0']
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'allOf', '0', 'properties', 'aliases']
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'properties', 'aliases', 'additionalProperties']
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'properties', 'aliases', 'allOf', '0']
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'properties', 'aliases', 'properties', 'aliases']
                    }
                  ], api.getLastErrors());
                })
                .then(done, done);
            });
          });

          describe('parameter definitions', function () {
            describe('global', function () {
              it('body parameter', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.parameters = {
                  petInBody: {
                      in: 'body',
                    name: 'body',
                    description: 'A Pet',
                    required: true,
                    schema: {
                      properties: {
                        aliases: {
                          type: 'array'
                        }
                      }
                    }
                  }
                };

                validateBrokenArray(cSwagger, ['parameters', 'petInBody', 'schema', 'properties', 'aliases'], done);
              });

              it('non-body parameter', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.parameters = {
                  petStatus: _.cloneDeep(cSwagger.paths['/pet/findByStatus'].get.parameters[0])
                };

                delete cSwagger.parameters.petStatus.items;

                validateBrokenArray(cSwagger, ['parameters', 'petStatus'], done);
              });
            });

            describe('path-level', function () {
              it('body parameter', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.paths['/pet'].parameters = [
                  {
                      in: 'body',
                    name: 'body',
                    description: 'A Pet',
                    required: true,
                    schema: {
                      properties: {
                        aliases: {
                          type: 'array'
                        }
                      }
                    }
                  }
                ];

                validateBrokenArray(cSwagger,
                                    ['paths', '/pet', 'parameters', '0', 'schema', 'properties', 'aliases'],
                                    done);
              });

              it('non-body parameter', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.paths['/pet'].parameters = [
                  _.cloneDeep(cSwagger.paths['/pet/findByStatus'].get.parameters[0])
                ];

                delete cSwagger.paths['/pet'].parameters[0].items;

                validateBrokenArray(cSwagger, ['paths', '/pet', 'parameters', '0'], done);
              });
            });

            describe('operation', function () {
              it('body parameter', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                delete cSwagger.paths['/user/createWithArray'].post.parameters[0].schema.items;

                validateBrokenArray(cSwagger,
                                    ['paths', '/user/createWithArray', 'post', 'parameters', '0', 'schema'],
                                    done);
              });

              it('non-body parameter', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                delete cSwagger.paths['/pet/findByStatus'].get.parameters[0].items;

                validateBrokenArray(cSwagger, ['paths', '/pet/findByStatus', 'get', 'parameters', '0'], done);
              });
            });
          });

          describe('responses', function () {
            describe('global', function () {
              it('headers', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.responses = {
                  success: {
                    description: 'A response indicative of a successful request',
                    headers: {
                      'X-Broken-Array': {
                        type: 'array'
                      }
                    }
                  }
                };

                validateBrokenArray(cSwagger, ['responses', 'success', 'headers', 'X-Broken-Array'], done);
              });

              it('schema definition', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.responses = {
                  success: {
                    description: 'A response indicative of a successful request',
                    schema: {
                      type: 'array'
                    }
                  }
                };

                validateBrokenArray(cSwagger, ['responses', 'success', 'schema'], done);
              });
            });

            describe('operation', function () {
              it('headers', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.paths['/pet/findByStatus'].get.responses['200'].headers = {
                  'X-Broken-Array': {
                    type: 'array'
                  }
                };

                validateBrokenArray(cSwagger,
                                    [
                                      'paths',
                                      '/pet/findByStatus',
                                      'get',
                                      'responses',
                                      '200',
                                      'headers',
                                      'X-Broken-Array'
                                    ],
                                    done);
              });

              it('schema definition', function (done) {
                var cSwagger = _.cloneDeep(swaggerDoc);

                delete cSwagger.paths['/pet/findByStatus'].get.responses['200'].schema.items;

                validateBrokenArray(cSwagger,
                                    ['paths', '/pet/findByStatus', 'get', 'responses', '200', 'schema'],
                                    done);
              });
            });
          });
        });

        describe('default values fail JSON Schema validation', function () {
          it('schema-like object (non-body parameter)', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            cSwagger.paths['/pet'].post.parameters.push({
                in: 'query',
              name: 'status',
              description: 'The Pet status',
              required: true,
              type: 'string',
              default: 123
            });

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'INVALID_TYPE',
                    description: 'The Pet status', // Copied in for non-body parameters
                    message: 'Expected type string but found type integer',
                    path: ['paths', '/pet', 'post', 'parameters', '1', 'default']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });

          it('schema object', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            cSwagger.definitions.Pet.properties.name.default = 123;

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'INVALID_TYPE',
                    message: 'Expected type string but found type integer',
                    path: ['definitions', 'Pet', 'properties', 'name', 'default']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });
        });

        describe('duplicate operation parameter', function () {
          it('operation-level', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);
            var cParam = _.cloneDeep(cSwagger.paths['/pet/findByStatus'].get.parameters[0]);

            // Alter the parameter so that it is not identical as that will create a JSON Schema uniqueness error
            cParam.description = 'Duplicate';

            cSwagger.paths['/pet/findByStatus'].get.parameters.push(cParam);

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'DUPLICATE_PARAMETER',
                    message: 'Operation cannot have duplicate parameters: #/paths/~1pet~1findByStatus/get/parameters/1',
                    path: ['paths', '/pet/findByStatus', 'get', 'parameters', '1']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });

          it('path-level', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);
            var cParam = _.cloneDeep(cSwagger.paths['/pet/{petId}'].parameters[0]);

            // Alter the parameter so that it is not identical as that will create a JSON Schema uniqueness error
            cParam.description = 'Duplicate';

            cSwagger.paths['/pet/{petId}'].parameters.push(cParam);

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'DUPLICATE_PARAMETER',
                    message: 'Operation cannot have duplicate parameters: #/paths/~1pet~1{petId}/parameters/1',
                    path: ['paths', '/pet/{petId}', 'parameters', '1']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });
        });

        it('missing path parameter declaration', function (done) {
          var cSwagger = _.cloneDeep(swaggerDoc);

          cSwagger.paths['/pet/{petId}'].get.parameters = [
            {
              description: 'Superfluous path parameter',
              in: 'path',
              name: 'petId2',
              required: true,
              type: 'string'
            }
          ];

          swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'MISSING_PATH_PARAMETER_DECLARATION',
                  message: 'Path parameter is defined but is not declared: petId2',
                  path: ['paths', '/pet/{petId}', 'get', 'parameters', '0']
                }
              ], api.getLastErrors());
            })
            .then(done, done);
        });

        it('missing path parameter definition', function (done) {
          var cSwagger = _.cloneDeep(swaggerDoc);

          cSwagger.paths['/pet/{petId}'].parameters = [];

          swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'MISSING_PATH_PARAMETER_DEFINITION',
                  message: 'Path parameter is declared but is not defined: petId',
                  path: ['paths', '/pet/{petId}', 'get']
                },
                {
                  code: 'MISSING_PATH_PARAMETER_DEFINITION',
                  message: 'Path parameter is declared but is not defined: petId',
                  path: ['paths', '/pet/{petId}', 'post']
                },
                {
                  code: 'MISSING_PATH_PARAMETER_DEFINITION',
                  message: 'Path parameter is declared but is not defined: petId',
                  path: ['paths', '/pet/{petId}', 'delete']
                }
              ], api.getLastErrors());
            })
            .then(done, done);
        });

        it('multiple equivalent paths', function (done) {
          var cSwagger = _.cloneDeep(swaggerDoc);

          cSwagger.paths['/pet/{notPetId}'] = {};

          swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'EQUIVALENT_PATH',
                  message: 'Equivalent path already exists: /pet/{notPetId}',
                  path: ['paths', '/pet/{notPetId}']
                }
              ], api.getLastErrors());
            })
            .then(done, done);
        });

        it('multiple operations with the same operationId', function (done) {
          var cSwagger = _.cloneDeep(swaggerDoc);
          var operationId = cSwagger.paths['/pet'].post.operationId;

          cSwagger.paths['/pet'].put.operationId = operationId;

          swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'DUPLICATE_OPERATIONID',
                  message: 'Cannot have multiple operations with the same operationId: ' + operationId,
                  path: ['paths', '/pet', 'put', 'operationId']
                }
              ], api.getLastErrors());
            })
            .then(done, done);
        });

        it('operation has multiple body parameters', function (done) {
          var cSwagger = _.cloneDeep(swaggerDoc);
          var dBodyParam = _.cloneDeep(cSwagger.paths['/pet'].post.parameters[0]);

          dBodyParam.name = dBodyParam.name + 'Duplicate';

          cSwagger.paths['/pet'].post.parameters.push(dBodyParam);

          swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'MULTIPLE_BODY_PARAMETERS',
                  message: 'Operation cannot have multiple body parameters',
                  path: ['paths', '/pet', 'post']
                }
              ], api.getLastErrors());
            })
            .then(done, done);
        });

        it('operation can have body or form parameter but not both', function (done) {
          var cSwagger = _.cloneDeep(swaggerDoc);

          cSwagger.paths['/pet'].post.parameters.push({
            name: 'name',
            in: 'formData',
            description: 'The Pet name',
            required: true,
            type: 'string'
          });

          swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'INVALID_PARAMETER_COMBINATION',
                  message: 'Operation cannot have a body parameter and a formData parameter',
                  path: ['paths', '/pet', 'post']
                }
              ], api.getLastErrors());
            })
            .then(done, done);
        });

        describe('missing required property definition', function () {
          it('allOf', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            delete cSwagger.definitions.Pet.properties.name;

            cSwagger.definitions.Pet.allOf = [
              {
                type: 'object',
                properties: _.cloneDeep(cSwagger.definitions.Pet.properties)

              }
            ];

            delete cSwagger.definitions.Pet.properties;

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'OBJECT_MISSING_REQUIRED_PROPERTY_DEFINITION',
                    message: 'Missing required property definition: name',
                    path: ['definitions', 'Pet']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });

          it('properties', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            delete cSwagger.definitions.Pet.properties.name;

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'OBJECT_MISSING_REQUIRED_PROPERTY_DEFINITION',
                    message: 'Missing required property definition: name',
                    path: ['definitions', 'Pet']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });
        });

        describe('unused definitions', function () {
          it('definition', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            cSwagger.definitions.Missing = {};

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result);
                assert.deepEqual([], api.getLastErrors());
                assert.deepEqual([
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/definitions/Missing',
                    path: ['definitions', 'Missing']
                  }
                ], api.getLastWarnings());
              })
              .then(done, done);
          });

          it('parameter', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            cSwagger.parameters = {
              missing: {
                name: 'missing',
                  in: 'query',
                type: 'string'
              }
            };

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result);
                assert.deepEqual([], api.getLastErrors());
                assert.deepEqual([
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/parameters/missing',
                    path: ['parameters', 'missing']
                  }
                ], api.getLastWarnings());
              })
              .then(done, done);
          });

          it('response', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            cSwagger.responses = {
              Missing: {
                description: 'I am missing'
              }
            };

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result);
                assert.deepEqual([], api.getLastErrors());
                assert.deepEqual([
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/responses/Missing',
                    path: ['responses', 'Missing']
                  }
                ], api.getLastWarnings());
              })
              .then(done, done);
          });

          it('securityDefinition', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            cSwagger.securityDefinitions.missing = {
              type: 'apiKey',
              name: 'api_key',
                in: 'header'
            };

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result);
                assert.deepEqual([], api.getLastErrors());
                assert.deepEqual([
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/securityDefinitions/missing',
                    path: ['securityDefinitions', 'missing']
                  }
                ], api.getLastWarnings());
              })
              .then(done, done);
          });

          it('security scope', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            cSwagger.securityDefinitions.petstore_auth.scopes.missing = 'I am missing';

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result);
                assert.deepEqual([], api.getLastErrors());
                assert.deepEqual([
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/securityDefinitions/petstore_auth/scopes/missing',
                    path: ['securityDefinitions', 'petstore_auth', 'scopes', 'missing']
                  }
                ], api.getLastWarnings());
              })
              .then(done, done);
          });
        });

        describe('unresolvable references', function () {
          it('json reference', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            cSwagger.paths['/pet'].post.parameters[0].schema.$ref = '#/definitions/Missing';

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'UNRESOLVABLE_REFERENCE',
                    message: 'Reference could not be resolved: #/definitions/Missing',
                    path: ['paths', '/pet', 'post', 'parameters', '0', 'schema', '$ref']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });

          describe('security definition', function () {
            it('global', function (done) {
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.security.push({
                missing: []
              });

              swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  var result = api.validate();

                  assert.ok(result === false);
                  assert.deepEqual([], api.getLastWarnings());
                  assert.deepEqual([
                    {
                      code: 'UNRESOLVABLE_REFERENCE',
                      message: 'Security definition could not be resolved: missing',
                      path: ['security', '1', 'missing']
                    }
                  ], api.getLastErrors());
                })
                .then(done, done);
            });

            it('operation-level', function (done) {
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.paths['/store/inventory'].get.security.push({
                missing: []
              });

              swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  var result = api.validate();

                  assert.ok(result === false);
                  assert.deepEqual([], api.getLastWarnings());
                  assert.deepEqual([
                    {
                      code: 'UNRESOLVABLE_REFERENCE',
                      message: 'Security definition could not be resolved: missing',
                      path: ['paths', '/store/inventory', 'get', 'security', '1', 'missing']
                    }
                  ], api.getLastErrors());
                })
                .then(done, done);
            });
          });

          describe('security scope definition', function () {
            it('global', function (done) {
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.security[0].petstore_auth.push('missing');

              swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  var result = api.validate();

                  assert.ok(result === false);
                  assert.deepEqual([], api.getLastWarnings());
                  assert.deepEqual([
                    {
                      code: 'UNRESOLVABLE_REFERENCE',
                      message: 'Security scope definition could not be resolved: missing',
                      path: ['security', '0', 'petstore_auth', '2']
                    }
                  ], api.getLastErrors());
                })
                .then(done, done);
            });

            it('operation-level', function (done) {
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.paths['/store/inventory'].get.security.push({
                'petstore_auth': [
                  'missing'
                ]
              });

              swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  var result = api.validate();

                  assert.ok(result === false);
                  assert.deepEqual(api.getLastWarnings(), []);
                  assert.deepEqual(api.getLastErrors(), [
                    {
                      code: 'UNRESOLVABLE_REFERENCE',
                      message: 'Security scope definition could not be resolved: missing',
                      path: ['paths', '/store/inventory', 'get', 'security', '1', 'petstore_auth', '0']
                    }
                  ]);
                })
                .then(done, done);
            });
          });
        });
      });
    });
  });
});
