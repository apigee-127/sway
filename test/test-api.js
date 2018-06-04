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

var _ = require('lodash');
var assert = require('assert');
var helpers = require('./helpers');
var JsonRefs = require('json-refs');
var supportedHttpMethods = require('swagger-methods');
var Sway = helpers.getSway();

function getOperationCount (pathDef) {
  var count = 0;

  _.each(pathDef, function (operation, method) {
    if (supportedHttpMethods.indexOf(method) > -1) {
      count += 1;
    }
  });

  return count;
}

describe('SwaggerApi', function () {
  var swaggerApi;

  before(function (done) {
    helpers.getSwaggerApi(function (api) {
      swaggerApi = api;

      done();
    });
  });

  beforeEach(function () {
    swaggerApi.customValidators = [];
  });

  describe('#getOperations', function () {
    it('should return all operations', function () {
      var operations = swaggerApi.getOperations();

      assert.equal(operations.length, _.reduce(swaggerApi.definition.paths, function (count, path) {
        count += getOperationCount(path);

        return count;
      }, 0));

      // Validate the operations
    });

    it('should return return all operations for the given path', function () {
      var operations = swaggerApi.getOperations('/pet/{petId}');

      assert.ok(swaggerApi.getOperations().length > operations.length);
      assert.equal(operations.length, getOperationCount(swaggerApi.definition.paths['/pet/{petId}']));
    });

    it('should return return no operations for a missing path', function () {
      assert.equal(swaggerApi.getOperations('/some/fake/path').length, 0);
    });
  });

  describe('#getOperation', function () {
    it('should return the expected operation by id', function () {
      var operation = swaggerApi.getOperation('addPet');

      assert.ok(!_.isUndefined(operation));
    });

    describe('path + method', function () {
      it('should return the expected operation', function () {
        var operation = swaggerApi.getOperation('/pet/{petId}', 'get');

        assert.ok(!_.isUndefined(operation));
      });

      it('should return no operation for missing path', function () {
        assert.ok(_.isUndefined(swaggerApi.getOperation('/petz/{petId}', 'get')));
      });

      it('should return no operation for missing method', function () {
        assert.ok(_.isUndefined(swaggerApi.getOperation('/pet/{petId}', 'head')));
      });
    });

    describe('http.ClientRequest (or similar)', function () {
      it('should return the expected operation', function () {
        assert.ok(!_.isUndefined(swaggerApi.getOperation({
          method: 'GET',
          url: swaggerApi.basePath + '/pet/1'
        })));
      });

      it('should return the expected operation (req.originalUrl)', function () {
        assert.ok(!_.isUndefined(swaggerApi.getOperation({
          method: 'GET',
          originalUrl: swaggerApi.basePath + '/pet/1'
        })));
      });

      it('should return no operation for missing path', function () {
        assert.ok(_.isUndefined(swaggerApi.getOperation({
          method: 'GET',
          url: swaggerApi.basePath + '/petz/1'
        })));
      });

      it('should return no operation for missing method', function () {
        assert.ok(_.isUndefined(swaggerApi.getOperation({
          method: 'HEAD',
          url: swaggerApi.basePath + '/pet/1'
        })));
      });
    });
  });

  describe('#getOperationsByTag', function () {
    it('should return no operation for incorrect tag', function () {
      var operations = swaggerApi.getOperationsByTag('incorrect tag');

      assert.equal(operations.length, 0);
    });

    it('should return all operations for the given tag', function () {
      var operations = swaggerApi.getOperationsByTag('store');

      assert.equal(operations.length,
                   getOperationCount(swaggerApi.definition.paths['/store/inventory']) +
                   getOperationCount(swaggerApi.definition.paths['/store/order']) +
                   getOperationCount(swaggerApi.definition.paths['/store/order/{orderId}']));
    });
  });

  describe('#getPath', function () {
    describe('path', function () {
      it('should return the expected path object', function () {
        assert.ok(!_.isUndefined(swaggerApi.getPath('/pet/{petId}')));
      });

      it('should return no path object', function () {
        assert.ok(_.isUndefined(swaggerApi.getPath('/petz/{petId}')));
      });

      describe('multiple matches', function () {
        // This test is likely superfluous but while working on Issue 76 this was broken (pre-commit) and so this test
        // is here just to be sure.
        it('match identical', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);
          var matches = [
            '/foo/{0}/baz',
            '/foo/{1}/baz'
          ];

          _.forEach(matches, function (newPath) {
            cSwagger.paths[newPath] = {};
          });

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              assert.equal(api.getPath('/foo/{1}/baz').path, matches[1]);
            })
            .then(done, done);
        });
      });
    });

    describe('http.ClientRequest (or similar)', function () {
      it('should return the expected path object', function () {
        assert.ok(!_.isUndefined(swaggerApi.getPath({
          url: swaggerApi.basePath + '/pet/1'
        })));
      });

      it('should return no path object', function () {
        assert.ok(_.isUndefined(swaggerApi.getPath({
          url: swaggerApi.basePath + '/petz/1'
        })));
      });

      describe('multiple matches', function () {
        it('complete static match', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);
          var lesserMatches = [
            '/foo/bar/{baz}',
            '/foo/{bar}/baz',
            '/{foo}/bar/baz'
          ];
          var match = '/foo/bar/baz';

          _.forEach(lesserMatches.concat(match), function (newPath) {
            cSwagger.paths[newPath] = {};
          });

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              assert.equal(api.getPath({
                url: swaggerApi.basePath + match
              }).path, match);
            })
            .then(done, done);
        });

        // While this scenario should never happen in a valid Swagger document, we handle it anyways
        it('match multiple levels deep', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);
          var lesserMatches = [
            '/foo/{bar}/baz/{qux}'
          ];
          var match = '/foo/{bar}/baz/qux';

          _.forEach(lesserMatches.concat(match), function (newPath) {
            cSwagger.paths[newPath] = {};
          });

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              assert.equal(api.getPath({
                url: swaggerApi.basePath + match
              }).path, match);
            })
            .then(done, done);
        });

        it('match single level deep', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);
          var lesserMatches = [
            '/foo/{bar}/baz',
            '/{foo}/bar/baz'
          ];
          var match = '/foo/bar/{baz}';

          _.forEach(lesserMatches.concat(match), function (newPath) {
            cSwagger.paths[newPath] = {};
          });

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              assert.equal(api.getPath({
                url: swaggerApi.basePath + match
              }).path, match);
            })
            .then(done, done);
        });

        // While this scenario should never happen in a valid Swagger document, we handle it anyways
        it('match identical', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);
          var matches = [
            '/foo/{0}/baz',
            '/foo/{1}/baz'
          ];

          _.forEach(matches, function (newPath) {
            cSwagger.paths[newPath] = {};
          });

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              assert.ok(!_.isUndefined(api.getPath({
                url: swaggerApi.basePath + '/foo/bar/baz'
              })));
            })
            .then(done, done);
        });
      });
    });
  });

  describe('#getPaths', function () {
    it('should return the expected path objects', function () {
      assert.equal(swaggerApi.getPaths().length, Object.keys(swaggerApi.definitionFullyResolved.paths).length);
    });
  });

  describe('#registerFormat', function () {
    it('should throw TypeError for invalid arguments', function () {
      var scenarios = [
        [[], 'name is required'],
        [[true], 'name must be a string'],
        [['test'], 'validator is required'],
        [['test', true], 'validator must be a function']
      ];

      _.forEach(scenarios, function (scenario) {
        try {
          swaggerApi.registerFormat.apply(swaggerApi, scenario[0]);

          helpers.shouldHadFailed();
        } catch (err) {
          assert.equal(scenario[1], err.message);
        }
      });
    });

    it('should add validator to list of validators', function (done) {
      var cSwagger = _.cloneDeep(helpers.swaggerDoc);

      cSwagger.definitions.Pet.properties.customFormat = {
        format: 'alwaysFails',
        type: 'string'
      };

      Sway.create({
        definition: cSwagger
      })
        .then(function (api) {
          var req = {
            body: {
              customFormat: 'shouldFail',
              name: 'Test Pet',
              photoUrls: []
            }
          };
          var paramValue = api.getOperation('/pet', 'post').getParameter('body').getValue(req);

          assert.ok(_.isUndefined(paramValue.error));
          assert.deepEqual(req.body, paramValue.raw);
          assert.deepEqual(req.body, paramValue.value);

          // Register the custom format
          api.registerFormat('alwaysFails', function () {
            return false;
          });

          paramValue = api.getOperation('/pet', 'post').getParameter('body').getValue(req);

          assert.equal(paramValue.error.message, 'Value failed JSON Schema validation');
          assert.equal(paramValue.error.code, 'SCHEMA_VALIDATION_FAILED');
          assert.deepEqual(paramValue.error.path, ['paths', '/pet', 'post', 'parameters', '0']);
          assert.ok(paramValue.error.failedValidation)
          assert.deepEqual(paramValue.error.errors, [
            {
              code: 'INVALID_FORMAT',
              params: ['alwaysFails', 'shouldFail'],
              message: "Object didn't pass validation for format alwaysFails: shouldFail",
              path: ['customFormat']
            }
          ]);
          assert.deepEqual(req.body, paramValue.raw);
          assert.deepEqual(req.body, paramValue.value);
        })
        .then(done, done);
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
          swaggerApi.registerValidator.apply(swaggerApi, scenario[0]);

          helpers.shouldHadFailed();
        } catch (err) {
          assert.equal(scenario[1], err.message);
        }
      });
    });

    it('should add validator to list of validators', function () {
      var results = swaggerApi.validate();
      var expectedErrors = [
        'error'
      ];
      var expectedWarnings = [
        'warning'
      ];

      assert.deepEqual(results.errors, []);
      assert.deepEqual(results.warnings, []);

      swaggerApi.registerValidator(function () {
        return {
          errors: expectedErrors,
          warnings: expectedWarnings
        };
      });

      results = swaggerApi.validate();

      assert.deepEqual(results.errors, expectedErrors);
      assert.deepEqual(results.warnings, expectedWarnings);
    });
  });

  describe('#validate', function () {
    it('should return zero errors/warnings for a valid document', function () {
      var results = swaggerApi.validate();

      assert.deepEqual(results.errors, []);
      assert.deepEqual(results.warnings, []);
    });

    describe('should return errors for an invalid document', function () {
      it('does not validate against JSON Schema', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        delete cSwagger.paths;

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            var results = api.validate();

            assert.deepEqual(results.warnings, []);
            assert.deepEqual(results.errors, [
              {
                code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                message: 'Missing required property: paths',
                params: ['paths'],
                path: [],
                schemaId: 'http://swagger.io/v2/schema.json#'
              }
            ]);
          })
          .then(done, done);
      });

      describe('array type missing required items property', function () {
        function validateBrokenArray (cSwagger, path, done) {
          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              // Validate that all warnings are unused definitions
              _.forEach(results.warnings, function (warning) {
                assert.equal(warning.code, 'UNUSED_DEFINITION');
              });

              assert.deepEqual(results.errors, [
                {
                  code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                  message: 'Missing required property: items',
                  path: path
                }
              ]);
            })
            .then(done, done);
        }

        describe('schema definitions', function () {
          describe('array', function () {
            it('no items', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.definitions.Pet = {
                type: 'array'
              };

              validateBrokenArray(cSwagger, ['definitions', 'Pet'], done);
            });

            it('items object', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.definitions.Pet = {
                type: 'array',
                items: {
                  type: 'array'
                }
              };

              validateBrokenArray(cSwagger, ['definitions', 'Pet', 'items'], done);
            });

            it('items array', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.definitions.Pet = {
                  type: 'object',
                  additionalProperties: {
                    type: 'array'
                  }
                };

                validateBrokenArray(cSwagger, ['definitions', 'Pet', 'additionalProperties'], done);
              });

              it('items object', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);
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

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                var results = api.validate();

                // Validate that all warnings are unused definitions
                _.forEach(results.warnings, function (warning) {
                  assert.equal(warning.code, 'UNUSED_DEFINITION');
                });

                assert.deepEqual(results.errors, [
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
                ]);
              })
              .then(done, done);
          });
        });

        describe('parameter definitions', function () {
          describe('global', function () {
            it('body parameter', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.parameters = {
                petStatus: _.cloneDeep(cSwagger.paths['/pet/findByStatus'].get.parameters[0])
              };

              delete cSwagger.parameters.petStatus.items;

              validateBrokenArray(cSwagger, ['parameters', 'petStatus'], done);
            });
          });

          describe('path-level', function () {
            it('body parameter', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.paths['/pet'].parameters = [
                _.cloneDeep(cSwagger.paths['/pet/findByStatus'].get.parameters[0])
              ];

              delete cSwagger.paths['/pet'].parameters[0].items;

              validateBrokenArray(cSwagger, ['paths', '/pet', 'parameters', '0'], done);
            });
          });

          describe('operation', function () {
            it('body parameter', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              delete cSwagger.paths['/user/createWithArray'].post.parameters[0].schema.items;

              validateBrokenArray(cSwagger,
                                  ['paths', '/user/createWithArray', 'post', 'parameters', '0', 'schema'],
                                  done);
            });

            it('non-body parameter', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              delete cSwagger.paths['/pet/findByStatus'].get.parameters[0].items;

              validateBrokenArray(cSwagger, ['paths', '/pet/findByStatus', 'get', 'parameters', '0'], done);
            });
          });
        });

        describe('responses', function () {
          describe('global', function () {
            it('headers', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

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
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              delete cSwagger.paths['/pet/findByStatus'].get.responses['200'].schema.items;

              validateBrokenArray(cSwagger,
                                  ['paths', '/pet/findByStatus', 'get', 'responses', '200', 'schema'],
                                  done);
            });
          });
        });
      });

      describe('circular composition/inheritance', function () {
        function validateErrors (actual, expected) {
          assert.equal(actual.length, expected.length);

          _.each(actual, function (aErr) {
            assert.deepEqual(aErr, _.find(expected, function (vErr) {
              return JsonRefs.pathToPtr(aErr.path) === JsonRefs.pathToPtr(vErr.path);
            }));
          });
        }

        it('definition (direct)', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.definitions.A = {
            allOf: [
              {
                $ref: '#/definitions/B'
              }
            ]
          };
          cSwagger.definitions.B = {
            allOf: [
              {
                $ref: '#/definitions/A'
              }
            ]
          };

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.warnings, []);

              validateErrors(results.errors, [
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/B', '#/definitions/A', '#/definitions/B'],
                  message: 'Schema object inherits from itself: #/definitions/B',
                  path: ['definitions', 'B']
                },
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/A', '#/definitions/B', '#/definitions/A'],
                  message: 'Schema object inherits from itself: #/definitions/A',
                  path: ['definitions', 'A']
                }
              ]);
            })
            .then(done, done);
        });

        it('definition (indirect)', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.definitions.A = {
            allOf: [
              {
                $ref: '#/definitions/B'
              }
            ]
          };
          cSwagger.definitions.B = {
            allOf: [
              {
                $ref: '#/definitions/C'
              }
            ]
          };
          cSwagger.definitions.C = {
            allOf: [
              {
                $ref: '#/definitions/A'
              }
            ]
          };

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.warnings, []);
              validateErrors(results.errors, [
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/C', '#/definitions/A', '#/definitions/B', '#/definitions/C'],
                  message: 'Schema object inherits from itself: #/definitions/C',
                  path: ['definitions', 'C']
                },
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/B', '#/definitions/C', '#/definitions/A', '#/definitions/B'],
                  message: 'Schema object inherits from itself: #/definitions/B',
                  path: ['definitions', 'B']
                },
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/A', '#/definitions/B', '#/definitions/C', '#/definitions/A'],
                  message: 'Schema object inherits from itself: #/definitions/A',
                  path: ['definitions', 'A']
                }
              ]);
            })
            .then(done, done);
        });

        it('inline schema', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.definitions.A = {
            allOf: [
              {
                allOf: [
                  {
                    $ref: '#/definitions/A/allOf/0'
                  }
                ]
              }
            ]
          };

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/A/allOf/0', '#/definitions/A/allOf/0'],
                  message: 'Schema object inherits from itself: #/definitions/A/allOf/0',
                  path: ['definitions', 'A', 'allOf', '0']
                }
              ]);
            })
            .then(done, done);
        });

        it('not composition/inheritance', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.definitions.Pet.properties.friends = {
            type: 'array',
            items: {
              $ref: '#/definitions/Pet'
            }
          };

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.errors, []);
              assert.deepEqual(results.warnings, []);
            })
            .then(done, done);
        });
      });

      describe('default values fail JSON Schema validation', function () {
        it('schema-like object (non-body parameter)', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.paths['/pet'].post.parameters.push({
              in: 'query',
            name: 'status',
            description: 'The Pet status',
            required: true,
            type: 'string',
            default: 123
          });

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'INVALID_TYPE',
                  description: 'The Pet status', // Copied in for non-body parameters
                  message: 'Expected type string but found type integer',
                  params: ['string', 'integer'],
                  path: ['paths', '/pet', 'post', 'parameters', '1', 'default']
                }
              ]);
            })
            .then(done, done);
        });

        it('schema object', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.definitions.Pet.properties.name.default = 123;

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'INVALID_TYPE',
                  message: 'Expected type string but found type integer',
                  params: ['string', 'integer'],
                  path: ['definitions', 'Pet', 'properties', 'name', 'default']
                }
              ]);
            })
            .then(done, done);
        });
      });

      describe('duplicate operation parameter', function () {
        it('operation-level', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);
          var cParam = _.cloneDeep(cSwagger.paths['/pet/findByStatus'].get.parameters[0]);

          // Alter the parameter so that it is not identical as that will create a JSON Schema uniqueness error
          cParam.description = 'Duplicate';

          cSwagger.paths['/pet/findByStatus'].get.parameters.push(cParam);

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'DUPLICATE_PARAMETER',
                  message: 'Operation cannot have duplicate parameters: #/paths/~1pet~1findByStatus/get/parameters/1',
                  path: ['paths', '/pet/findByStatus', 'get', 'parameters', '1']
                }
              ]);
            })
            .then(done, done);
        });

        it('path-level', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);
          var cParam = _.cloneDeep(cSwagger.paths['/pet/{petId}'].parameters[0]);

          // Alter the parameter so that it is not identical as that will create a JSON Schema uniqueness error
          cParam.description = 'Duplicate';

          cSwagger.paths['/pet/{petId}'].parameters.push(cParam);

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'DUPLICATE_PARAMETER',
                  message: 'Operation cannot have duplicate parameters: #/paths/~1pet~1{petId}/parameters/1',
                  path: ['paths', '/pet/{petId}', 'parameters', '1']
                }
              ]);
            })
            .then(done, done);
        });
      });

      it('invalid JSON Reference', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/something'] = {
          $ref: 'http://:8080'
        };

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            var results = api.validate();

            assert.deepEqual(results.warnings, []);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_REFERENCE',
                message: 'HTTP URIs must have a host.',
                path: ['paths', '/something', '$ref']
              }
            ]);
          })
          .then(done, done);
      });

      it('path parameter in pattern is empty', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/invalid/{}'] = {};

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            var results = api.validate();

            assert.deepEqual(results.warnings, []);
            assert.deepEqual(results.errors, [
              {
                code: 'EMPTY_PATH_PARAMETER_DECLARATION',
                message: 'Path parameter declaration cannot be empty: /invalid/{}',
                path: ['paths', '/invalid/{}']
              }
            ]);
          })
          .then(done, done);
      });

      it('missing path parameter declaration', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet/{petId}'].get.parameters = [
          {
            description: 'Superfluous path parameter',
              in: 'path',
            name: 'petId2',
            required: true,
            type: 'string'
          }
        ];

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            var results = api.validate();

            assert.deepEqual(results.warnings, []);
            assert.deepEqual(results.errors, [
              {
                code: 'MISSING_PATH_PARAMETER_DECLARATION',
                message: 'Path parameter is defined but is not declared: petId2',
                path: ['paths', '/pet/{petId}', 'get', 'parameters', '0']
              }
            ]);
          })
          .then(done, done);
      });

      it('missing path parameter definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet/{petId}'].parameters = [];

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            var results = api.validate();

            assert.deepEqual(results.warnings, []);
            assert.deepEqual(results.errors, [
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
            ]);
          })
          .then(done, done);
      });

      it('multiple equivalent paths', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet/{notPetId}'] = {};

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            var results = api.validate();

            assert.deepEqual(results.warnings, []);
            assert.deepEqual(results.errors, [
              {
                code: 'EQUIVALENT_PATH',
                message: 'Equivalent path already exists: /pet/{notPetId}',
                path: ['paths', '/pet/{notPetId}']
              }
            ]);
          })
          .then(done, done);
      });

      it('multiple operations with the same operationId', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);
        var operationId = cSwagger.paths['/pet'].post.operationId;

        cSwagger.paths['/pet'].put.operationId = operationId;

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            var results = api.validate();

            assert.deepEqual(results.warnings, []);
            assert.deepEqual(results.errors, [
              {
                code: 'DUPLICATE_OPERATIONID',
                message: 'Cannot have multiple operations with the same operationId: ' + operationId,
                path: ['paths', '/pet', 'put', 'operationId']
              }
            ]);
          })
          .then(done, done);
      });

      it('operation has multiple body parameters', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);
        var dBodyParam = _.cloneDeep(cSwagger.paths['/pet'].post.parameters[0]);

        dBodyParam.name = dBodyParam.name + 'Duplicate';

        cSwagger.paths['/pet'].post.parameters.push(dBodyParam);

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            var results = api.validate();

            assert.deepEqual(results.warnings, []);
            assert.deepEqual(results.errors, [
              {
                code: 'MULTIPLE_BODY_PARAMETERS',
                message: 'Operation cannot have multiple body parameters',
                path: ['paths', '/pet', 'post']
              }
            ]);
          })
          .then(done, done);
      });

      it('operation can have body or form parameter but not both', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet'].post.parameters.push({
          name: 'name',
            in: 'formData',
          description: 'The Pet name',
          required: true,
          type: 'string'
        });

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            var results = api.validate();

            assert.deepEqual(results.warnings, []);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_PARAMETER_COMBINATION',
                message: 'Operation cannot have a body parameter and a formData parameter',
                path: ['paths', '/pet', 'post']
              }
            ]);
          })
          .then(done, done);
      });

      describe('missing required property definition', function () {
        it('allOf', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          delete cSwagger.definitions.Pet.properties.name;

          cSwagger.definitions.Pet.allOf = [
            {
              type: 'object',
              properties: _.cloneDeep(cSwagger.definitions.Pet.properties)

            }
          ];

          delete cSwagger.definitions.Pet.properties;

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'OBJECT_MISSING_REQUIRED_PROPERTY_DEFINITION',
                  message: 'Missing required property definition: name',
                  path: ['definitions', 'Pet']
                }
              ]);
            })
            .then(done, done);
        });

        it('properties', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          delete cSwagger.definitions.Pet.properties.name;

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'OBJECT_MISSING_REQUIRED_PROPERTY_DEFINITION',
                  message: 'Missing required property definition: name',
                  path: ['definitions', 'Pet']
                }
              ]);
            })
            .then(done, done);
        });
      });

      describe('unused definitions', function () {
        it('definition', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.definitions.Missing = {};

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.errors, []);
              assert.deepEqual(results.warnings, [
                {
                  code: 'UNUSED_DEFINITION',
                  message: 'Definition is not used: #/definitions/Missing',
                  path: ['definitions', 'Missing']
                }
              ]);
            })
            .then(done, done);
        });

        it('parameter', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.parameters = {
            missing: {
              name: 'missing',
                in: 'query',
              type: 'string'
            }
          };

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.errors, []);
              assert.deepEqual(results.warnings, [
                {
                  code: 'UNUSED_DEFINITION',
                  message: 'Definition is not used: #/parameters/missing',
                  path: ['parameters', 'missing']
                }
              ]);
            })
            .then(done, done);
        });

        it('response', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.responses = {
            Missing: {
              description: 'I am missing'
            }
          };

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.errors, []);
              assert.deepEqual(results.warnings, [
                {
                  code: 'UNUSED_DEFINITION',
                  message: 'Definition is not used: #/responses/Missing',
                  path: ['responses', 'Missing']
                }
              ]);
            })
            .then(done, done);
        });

        it('securityDefinition', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.securityDefinitions.missing = {
            type: 'apiKey',
            name: 'api_key',
              in: 'header'
          };

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.errors, []);
              assert.deepEqual(results.warnings, [
                {
                  code: 'UNUSED_DEFINITION',
                  message: 'Definition is not used: #/securityDefinitions/missing',
                  path: ['securityDefinitions', 'missing']
                }
              ]);
            })
            .then(done, done);
        });

        it('security scope', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.securityDefinitions.petstore_auth.scopes.missing = 'I am missing';

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var results = api.validate();

              assert.deepEqual(results.errors, []);
              assert.deepEqual(results.warnings, [
                {
                  code: 'UNUSED_DEFINITION',
                  message: 'Definition is not used: #/securityDefinitions/petstore_auth/scopes/missing',
                  path: ['securityDefinitions', 'petstore_auth', 'scopes', 'missing']
                }
              ]);
            })
            .then(done, done);
        });
      });

      describe('unresolvable references', function () {
        describe('json reference', function () {
          it('local', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet'].post.parameters[0].schema.$ref = '#/definitions/Missing';

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                var results = api.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'UNRESOLVABLE_REFERENCE',
                    message: 'Reference could not be resolved: #/definitions/Missing',
                    path: ['paths', '/pet', 'post', 'parameters', '0', 'schema', '$ref'],
                    error: 'JSON Pointer points to missing location: #/definitions/Missing'
                  }
                ]);
              })
              .then(done, done);
          });

          it('remote', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet'].post.parameters[0].schema.$ref = 'fake.json';

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                var results = api.validate();
                var error;

                assert.deepEqual(results.warnings, []);
                assert.equal(results.errors.length, 1);

                error = results.errors[0];

                assert.equal(error.code, 'UNRESOLVABLE_REFERENCE');
                assert.equal(error.message, 'Reference could not be resolved: fake.json');
                assert.deepEqual(error.path, ['paths', '/pet', 'post', 'parameters', '0', 'schema', '$ref']);
                assert.ok(_.has(error, 'error'));
              })
              .then(done, done);
          });
        });

        describe('security definition', function () {
          it('global', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.security.push({
              missing: []
            });

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                var results = api.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'UNRESOLVABLE_REFERENCE',
                    message: 'Security definition could not be resolved: missing',
                    path: ['security', '1', 'missing']
                  }
                ]);
              })
              .then(done, done);
          });

          it('operation-level', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/store/inventory'].get.security.push({
              missing: []
            });

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                var results = api.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'UNRESOLVABLE_REFERENCE',
                    message: 'Security definition could not be resolved: missing',
                    path: ['paths', '/store/inventory', 'get', 'security', '1', 'missing']
                  }
                ]);
              })
              .then(done, done);
          });
        });

        describe('security scope definition', function () {
          it('global', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.security[0].petstore_auth.push('missing');

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                var results = api.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'UNRESOLVABLE_REFERENCE',
                    message: 'Security scope definition could not be resolved: missing',
                    path: ['security', '0', 'petstore_auth', '2']
                  }
                ]);
              })
              .then(done, done);
          });

          it('operation-level', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/store/inventory'].get.security.push({
              'petstore_auth': [
                'missing'
              ]
            });

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                var results = api.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
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

    it('should return errors for JsonRefs errors', function (done) {
      var cSwagger = _.cloneDeep(helpers.swaggerDoc);

      cSwagger.paths['/pet'].post.parameters[0].schema.$ref = '#definitions/Pet';

      Sway.create({
        definition: cSwagger
      })
        .then(function (api) {
          assert.deepEqual(api.validate(), {
            errors: [
              {
                code: 'INVALID_REFERENCE',
                message: 'ptr must start with a / or #/',
                path: ['paths', '/pet', 'post', 'parameters', '0', 'schema', '$ref']
              }
            ],
            warnings: []
          });
        })
        .then(done, done);
    });

    it('should return warnings for JsonRefs warnings', function (done) {
      var cSwagger = _.cloneDeep(helpers.swaggerDoc);

      cSwagger.paths['/pet'].post.parameters[0].schema.extraField = 'This is an extra field';

      Sway.create({
        definition: cSwagger
      })
        .then(function (api) {
          var results =  api.validate();

          assert.deepEqual(results, {
            errors: [],
            warnings: [
              {
                code: 'EXTRA_REFERENCE_PROPERTIES',
                message: 'Extra JSON Reference properties will be ignored: extraField',
                path: ['paths', '/pet', 'post', 'parameters', '0', 'schema']
              }
            ]
          });
        })
        .then(done, done);
    });

    describe('human readable errors for invalid schema', function () {
      function validateError (api, defType) {
        var results = api.validate();

        assert.equal(results.errors.length, 1);
        assert.equal(results.warnings.length, 0);
        assert.equal(results.errors[0].message, 'Not a valid ' + defType + ' definition');
      }

      it('should handle parameter definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet'].post.parameters[0] = {};

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            validateError(api, 'parameter');
          })
          .then(done, done);
      });

      it('should handle global parameter definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.parameters = {
          broken: {}
        };

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            validateError(api, 'parameter');
          })
          .then(done, done);
      });

      it('should handle response definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet'].post.responses.default = {};

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            validateError(api, 'response');
          })
          .then(done, done);
      });

      it('should handle response schema definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet'].post.responses.default = {
          description: 'A broken response',
          schema: []
        };

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            validateError(api, 'response');
          })
          .then(done, done);
      });

      it('should handle schema additionalProperties definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.definitions.Broken = {
          type: 'object',
          additionalProperties: []
        };

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            validateError(api, 'schema additionalProperties');
          })
          .then(done, done);
      });

      it('should handle schema items definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.definitions.Broken = {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: false
            }
          }
        };

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            validateError(api, 'schema items');
          })
          .then(done, done);
      });

      it('should handle securityDefinitions definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.securityDefinitions.broken = {};

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            validateError(api, 'securityDefinitions');
          })
          .then(done, done);
      });

      it('should handle schema items definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.definitions.Broken = {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: true
            }
          }
        };

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            validateError(api, 'schema items');
          })
          .then(done, done);
      });
    });
  });
});
