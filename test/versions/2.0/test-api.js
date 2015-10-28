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
var helpers = require('./helpers'); // Helpers for this suite of tests
var tHelpers = require('../../helpers'); // Helpers for tests

describe('SwaggerApi (Swagger 2.0)', function () {
  var sway;

  before(function (done) {
    helpers.getSway(function (api) {
      sway = api;

      done();
    });
  });

  beforeEach(function () {
    sway.customValidators = [];
    sway.errors = [];
    sway.warnings = [];
  });

  describe('#getOperations', function () {
    it('should return return all operations', function () {
      var operations = sway.getOperations();

      assert.equal(operations.length, _.reduce(sway.definition.paths, function (count, path) {
        count += helpers.getOperationCount(path);

        return count;
      }, 0));

      // Validate the operations
    });

    it('should return return all operations for the given path', function () {
      var operations = sway.getOperations('/pet/{petId}');

      assert.ok(sway.getOperations().length > operations.length);
      assert.equal(operations.length, helpers.getOperationCount(sway.definition.paths['/pet/{petId}']));
    });

    it('should return return no operations for a missing path', function () {
      assert.equal(sway.getOperations('/some/fake/path').length, 0);
    });
  });

  describe('#getOperation', function () {
    describe('path + method', function () {
      it('should return the expected operation', function () {
        var operation = sway.getOperation('/pet/{petId}', 'get');

        assert.ok(!_.isUndefined(operation));
      });

      it('should return no operation for missing path', function () {
        assert.ok(_.isUndefined(sway.getOperation('/petz/{petId}', 'get')));
      });

      it('should return no operation for missing method', function () {
        assert.ok(_.isUndefined(sway.getOperation('/pet/{petId}', 'head')));
      });
    });

    describe('http.ClientRequest (or similar)', function () {
      it('should return the expected operation', function () {
        assert.ok(!_.isUndefined(sway.getOperation({
          method: 'GET',
          url: sway.basePath + '/pet/1'
        })));
      });

      it('should return no operation for missing path', function () {
        assert.ok(_.isUndefined(sway.getOperation({
          method: 'GET',
          url: sway.basePath + '/petz/1'
        })));
      });

      it('should return no operation for missing method', function () {
        assert.ok(_.isUndefined(sway.getOperation({
          method: 'HEAD',
          url: sway.basePath + '/pet/1'
        })));
      });
    });
  });

  describe('#getOperationsByTag', function () {
    it('should return no operation for incorrect tag', function () {
      var operations = sway.getOperationsByTag('incorrect tag');

      assert.equal(operations.length, 0);
    });

    it('should return all operations for the given tag', function () {
      var operations = sway.getOperationsByTag('store');

      assert.equal(operations.length,
                   helpers.getOperationCount(sway.definition.paths['/store/inventory']) +
                   helpers.getOperationCount(sway.definition.paths['/store/order']) +
                   helpers.getOperationCount(sway.definition.paths['/store/order/{orderId}']));
    });
  });

  describe('#getPath', function () {
    describe('path', function () {
      it('should return the expected path object', function () {
        assert.ok(!_.isUndefined(sway.getPath('/pet/{petId}')));
      });

      it('should return no path object', function () {
        assert.ok(_.isUndefined(sway.getPath('/petz/{petId}')));
      });
    });

    describe('http.ClientRequest (or similar)', function () {
      it('should return the expected path object', function () {
        assert.ok(!_.isUndefined(sway.getPath({
          url: sway.basePath + '/pet/1'
        })));
      });

      it('should return no path object', function () {
        assert.ok(_.isUndefined(sway.getPath({
          url: sway.basePath + '/petz/1'
        })));
      });
    });
  });

  describe('#getPaths', function () {
    it('should return the expected path objects', function () {
      assert.equal(sway.getPaths().length, Object.keys(sway.resolved.paths).length);
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
          sway.registerValidator.apply(sway, scenario[0]);

          tHelpers.shouldHadFailed();
        } catch (err) {
          assert.equal(scenario[1], err.message);
        }
      });
    });

    it('should add validator to list of validators', function () {
      var result = sway.validate();
      var expectedErrors = [
        'error'
      ];
      var expectedWarnings = [
        'warning'
      ];

      assert.ok(result === true);
      assert.deepEqual([], sway.getLastErrors());
      assert.deepEqual([], sway.getLastWarnings());

      sway.registerValidator(function () {
        return {
          errors: expectedErrors,
          warnings: expectedWarnings
        };
      });

      result = sway.validate();

      assert.ok(result === false);
      assert.deepEqual(expectedErrors, sway.getLastErrors());
      assert.deepEqual(expectedWarnings, sway.getLastWarnings());
    });
  });

  describe('#validate', function () {
    it('should not throw an Error for a valid document', function () {
      try {
        sway.validate();
      } catch (err) {
        tHelpers.shouldNotHadFailed(err);
      }
    });

    describe('should throw an Error for an invalid document', function () {
      it('does not validate against JSON Schema', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        delete cSwagger.paths;

        helpers.swaggerApi.create({
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
          helpers.swaggerApi.create({
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

            helpers.swaggerApi.create({
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

          helpers.swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/A', '#/definitions/B', '#/definitions/A'],
                  message: 'Schema object inherits from itself: #/definitions/A',
                  path: ['definitions', 'A']
                },
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/B', '#/definitions/A', '#/definitions/B'],
                  message: 'Schema object inherits from itself: #/definitions/B',
                  path: ['definitions', 'B']
                }
              ], api.getLastErrors());
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

          helpers.swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/A', '#/definitions/B', '#/definitions/C', '#/definitions/A'],
                  message: 'Schema object inherits from itself: #/definitions/A',
                  path: ['definitions', 'A']
                },
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/B', '#/definitions/C', '#/definitions/A', '#/definitions/B'],
                  message: 'Schema object inherits from itself: #/definitions/B',
                  path: ['definitions', 'B']
                },
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/C', '#/definitions/A', '#/definitions/B', '#/definitions/C'],
                  message: 'Schema object inherits from itself: #/definitions/C',
                  path: ['definitions', 'C']
                }
              ], api.getLastErrors());
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

          helpers.swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === false);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([
                {
                  code: 'CIRCULAR_INHERITANCE',
                  lineage: ['#/definitions/A/allOf/0', '#/definitions/A/allOf/0'],
                  message: 'Schema object inherits from itself: #/definitions/A/allOf/0',
                  path: ['definitions', 'A', 'allOf', '0']
                }
              ], api.getLastErrors());
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

          helpers.swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              var result = api.validate();

              assert.ok(result === true);
              assert.deepEqual([], api.getLastWarnings());
              assert.deepEqual([], api.getLastErrors());
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

          helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.definitions.Pet.properties.name.default = 123;

          helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);
          var cParam = _.cloneDeep(cSwagger.paths['/pet/findByStatus'].get.parameters[0]);

          // Alter the parameter so that it is not identical as that will create a JSON Schema uniqueness error
          cParam.description = 'Duplicate';

          cSwagger.paths['/pet/findByStatus'].get.parameters.push(cParam);

          helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);
          var cParam = _.cloneDeep(cSwagger.paths['/pet/{petId}'].parameters[0]);

          // Alter the parameter so that it is not identical as that will create a JSON Schema uniqueness error
          cParam.description = 'Duplicate';

          cSwagger.paths['/pet/{petId}'].parameters.push(cParam);

          helpers.swaggerApi.create({
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

        helpers.swaggerApi.create({
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
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet/{petId}'].parameters = [];

        helpers.swaggerApi.create({
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
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet/{notPetId}'] = {};

        helpers.swaggerApi.create({
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
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);
        var operationId = cSwagger.paths['/pet'].post.operationId;

        cSwagger.paths['/pet'].put.operationId = operationId;

        helpers.swaggerApi.create({
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
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);
        var dBodyParam = _.cloneDeep(cSwagger.paths['/pet'].post.parameters[0]);

        dBodyParam.name = dBodyParam.name + 'Duplicate';

        cSwagger.paths['/pet'].post.parameters.push(dBodyParam);

        helpers.swaggerApi.create({
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
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet'].post.parameters.push({
          name: 'name',
            in: 'formData',
          description: 'The Pet name',
          required: true,
          type: 'string'
        });

        helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          delete cSwagger.definitions.Pet.properties.name;

          cSwagger.definitions.Pet.allOf = [
            {
              type: 'object',
              properties: _.cloneDeep(cSwagger.definitions.Pet.properties)

            }
          ];

          delete cSwagger.definitions.Pet.properties;

          helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          delete cSwagger.definitions.Pet.properties.name;

          helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.definitions.Missing = {};

          helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.parameters = {
            missing: {
              name: 'missing',
                in: 'query',
              type: 'string'
            }
          };

          helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.responses = {
            Missing: {
              description: 'I am missing'
            }
          };

          helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.securityDefinitions.missing = {
            type: 'apiKey',
            name: 'api_key',
              in: 'header'
          };

          helpers.swaggerApi.create({
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
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.securityDefinitions.petstore_auth.scopes.missing = 'I am missing';

          helpers.swaggerApi.create({
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
        describe('json reference', function () {
          it('local', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet'].post.parameters[0].schema.$ref = '#/definitions/Missing';

            helpers.swaggerApi.create({
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

          it('remote', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet'].post.parameters[0].schema.$ref = 'fake.json';

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();
                var error;

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.ok(api.getLastErrors().length === 1);

                error = api.getLastErrors()[0];

                assert.equal(error.code, 'UNRESOLVABLE_REFERENCE');
                assert.equal(error.message, 'Reference could not be resolved: fake.json');
                assert.deepEqual(error.path, ['paths', '/pet', 'post', 'parameters', '0', 'schema', '$ref']);
                assert.ok(_.has(error, 'err'));
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

            helpers.swaggerApi.create({
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
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/store/inventory'].get.security.push({
              missing: []
            });

            helpers.swaggerApi.create({
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
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.security[0].petstore_auth.push('missing');

            helpers.swaggerApi.create({
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
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/store/inventory'].get.security.push({
              'petstore_auth': [
                'missing'
              ]
            });

            helpers.swaggerApi.create({
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

    describe('human readable errors for invalid schema', function () {
      function validateError (api, defType) {
        assert.ok(!api.validate());
        assert.equal(api.getLastErrors().length, 1);
        assert.equal(api.getLastWarnings().length, 0);
        assert.equal(api.getLastErrors()[0].message, 'Not a valid ' + defType + ' definition');
      }

      it('should handle parameter definition', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet'].post.parameters[0] = {};

        helpers.swaggerApi.create({
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

        helpers.swaggerApi.create({
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

        helpers.swaggerApi.create({
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

        helpers.swaggerApi.create({
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

        helpers.swaggerApi.create({
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

        helpers.swaggerApi.create({
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

        helpers.swaggerApi.create({
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

        helpers.swaggerApi.create({
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
