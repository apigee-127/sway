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

const _ = require('lodash');
const assert = require('assert');
const JsonRefs = require('json-refs');
const supportedHttpMethods = require('swagger-methods');
const tHelpers = require('./helpers');

const Sway = tHelpers.getSway();

function getOperationCount(pathDef) {
  let count = 0;

  _.each(pathDef, (operation, method) => {
    if (supportedHttpMethods.indexOf(method) > -1) {
      count += 1;
    }
  });

  return count;
}

function runTests(mode) {
  const label = mode === 'with-refs' ? 'with' : 'without';
  let apiDefinition;

  before((done) => {
    function callback(apiDef) {
      apiDefinition = apiDef;

      done();
    }

    if (mode === 'with-refs') {
      tHelpers.getApiDefinitionRelativeRefs(callback);
    } else {
      tHelpers.getApiDefinition(callback);
    }
  });

  beforeEach(() => {
    apiDefinition.customValidators = [];
    apiDefinition.customFormats = {};
    apiDefinition.customFormatGenerators = {};

    // When we test ApiDefinition#registerFormat, it registers globally in ZSchema and it has to be unregistered
    apiDefinition.unregisterFormat('alwaysFails');
    apiDefinition.unregisterFormatGenerator('sway');
  });

  describe(`should handle OpenAPI document ${label} relative references`, () => {
    describe('#getOperations', () => {
      it('should return all operations', () => {
        const operations = apiDefinition.getOperations();

        assert.equal(operations.length, _.reduce(apiDefinition.definitionFullyResolved.paths, (count, path) => {
          count += getOperationCount(path);

          return count;
        }, 0));

        // Validate the operations
      });

      it('should return return all operations for the given path', () => {
        const operations = apiDefinition.getOperations('/pet/{petId}');

        assert.ok(apiDefinition.getOperations().length > operations.length);
        assert.equal(operations.length, getOperationCount(apiDefinition.definitionFullyResolved.paths['/pet/{petId}']));
      });

      it('should return return no operations for a missing path', () => {
        assert.equal(apiDefinition.getOperations('/some/fake/path').length, 0);
      });
    });

    describe('#getOperation', () => {
      it('should return the expected operation by id', () => {
        tHelpers.checkType(apiDefinition.getOperation('addPet'), 'Operation');
      });

      describe('path + method', () => {
        it('should return the expected operation', () => {
          tHelpers.checkType(apiDefinition.getOperation('/pet/{petId}', 'get'), 'Operation');
        });

        it('should return no operation for missing path', () => {
          assert.ok(_.isUndefined(apiDefinition.getOperation('/petz/{petId}', 'get')));
        });

        it('should return no operation for missing method', () => {
          assert.ok(_.isUndefined(apiDefinition.getOperation('/pet/{petId}', 'head')));
        });
      });

      describe('http.ClientRequest (or similar)', () => {
        it('should return the expected operation', () => {
          tHelpers.checkType(apiDefinition.getOperation({
            method: 'GET',
            url: `${apiDefinition.basePath}/pet/1`,
          }), 'Operation');
        });

        it('should return the expected operation (req.originalUrl)', () => {
          tHelpers.checkType((apiDefinition.getOperation({
            method: 'GET',
            originalUrl: `${apiDefinition.basePath}/pet/1`,
          })), 'Operation');
        });

        it('should return no operation for missing path', () => {
          assert.ok(_.isUndefined(apiDefinition.getOperation({
            method: 'GET',
            url: `${apiDefinition.basePath}/petz/1`,
          })));
        });

        it('should return no operation for missing method', () => {
          assert.ok(_.isUndefined(apiDefinition.getOperation({
            method: 'HEAD',
            url: `${apiDefinition.basePath}/pet/1`,
          })));
        });
      });
    });

    describe('#getOperationsByTag', () => {
      it('should return no operation for incorrect tag', () => {
        const operations = apiDefinition.getOperationsByTag('incorrect tag');

        assert.equal(operations.length, 0);
      });

      it('should return all operations for the given tag', () => {
        const operations = apiDefinition.getOperationsByTag('store');

        assert.equal(
          operations.length,
          getOperationCount(apiDefinition.definitionFullyResolved.paths['/store/inventory'])
                    + getOperationCount(apiDefinition.definitionFullyResolved.paths['/store/order'])
                    + getOperationCount(apiDefinition.definitionFullyResolved.paths['/store/order/{orderId}']),
        );
      });
    });

    describe('#getPath', () => {
      describe('path', () => {
        describe('multiple matches', () => {
          // This test is likely superfluous but while working on Issue 76 this was broken (pre-commit) and so this test
          // is here just to be sure.
          it('match identical', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
            const matches = [
              '/foo/{0}/baz',
              '/foo/{1}/baz',
            ];

            _.forEach(matches, (newPath) => {
              cOAIDoc.paths[newPath] = {};
            });

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                assert.equal(apiDef.getPath('/foo/{1}/baz').path, matches[1]);
              })
              .then(done, done);
          });
        });

        it('should handle regex characters in path', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
          const path = '/foo/({bar})';

          cOAIDoc.paths[path] = {};

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              tHelpers.checkType(apiDef.getPath(path), 'Path');
            })
            .then(done, done);
        });

        it('should return the expected path object', () => {
          tHelpers.checkType(apiDefinition.getPath('/pet/{petId}'), 'Path');
        });

        it('should return no path object', () => {
          assert.ok(_.isUndefined(apiDefinition.getPath('/petz/{petId}')));
        });
      });

      describe('http.ClientRequest (or similar)', () => {
        describe('multiple matches', () => {
          it('complete static match', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
            const lesserMatches = [
              '/foo/bar/{baz}',
              '/foo/{bar}/baz',
              '/{foo}/bar/baz',
            ];
            const match = '/foo/bar/baz';

            _.forEach(lesserMatches.concat(match), (newPath) => {
              cOAIDoc.paths[newPath] = {};
            });

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                assert.equal(apiDef.getPath({
                  url: apiDefinition.basePath + match,
                }).path, match);
              })
              .then(done, done);
          });

          // While this scenario should never happen in a valid OpenAPI document, we handle it anyways
          it('match multiple levels deep', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
            const lesserMatches = [
              '/foo/{bar}/baz/{qux}',
            ];
            const match = '/foo/{bar}/baz/qux';

            _.forEach(lesserMatches.concat(match), (newPath) => {
              cOAIDoc.paths[newPath] = {};
            });

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                assert.equal(apiDef.getPath({
                  url: apiDefinition.basePath + match,
                }).path, match);
              })
              .then(done, done);
          });

          it('match single level deep', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
            const lesserMatches = [
              '/foo/{bar}/baz',
              '/{foo}/bar/baz',
            ];
            const match = '/foo/bar/{baz}';

            _.forEach(lesserMatches.concat(match), (newPath) => {
              cOAIDoc.paths[newPath] = {};
            });

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                assert.equal(apiDef.getPath({
                  url: apiDefinition.basePath + match,
                }).path, match);
              })
              .then(done, done);
          });

          // While this scenario should never happen in a valid OpenAPI document, we handle it anyways
          it('match identical', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
            const matches = [
              '/foo/{0}/baz',
              '/foo/{1}/baz',
            ];

            _.forEach(matches, (newPath) => {
              cOAIDoc.paths[newPath] = {};
            });

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                tHelpers.checkType(apiDef.getPath({
                  url: `${apiDefinition.basePath}/foo/bar/baz`,
                }), 'Path');
              })
              .then(done, done);
          });
        });

        it('should handle regex characters in path', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
          const path = '/foo/({bar})';

          cOAIDoc.paths[path] = {};

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              tHelpers.checkType(apiDef.getPath({
                url: `${apiDefinition.basePath}/foo/(bar)`,
              }), 'Path');
            })
            .then(done, done);
        });

        it('should return the expected path object', () => {
          tHelpers.checkType(apiDefinition.getPath({
            url: `${apiDefinition.basePath}/pet/1`,
          }), 'Path');
        });

        it('should return no path object', () => {
          assert.ok(_.isUndefined(apiDefinition.getPath({
            url: `${apiDefinition.basePath}/petz/1`,
          })));
        });
      });
    });

    describe('#getPaths', () => {
      it('should return the expected path objects', () => {
        assert.equal(apiDefinition.getPaths().length, Object.keys(apiDefinition.definitionFullyResolved.paths).length);
      });
    });

    describe('#registerFormat', () => {
      it('should throw TypeError for invalid arguments', () => {
        const scenarios = [
          [[], 'name is required'],
          [[true], 'name must be a string'],
          [['test'], 'validator is required'],
          [['test', true], 'validator must be a function'],
        ];

        _.forEach(scenarios, (scenario) => {
          try {
            apiDefinition.registerFormat(...scenario[0]);

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(scenario[1], err.message);
          }
        });
      });

      it('should add validator to list of validators', (done) => {
        const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

        cOAIDoc.definitions.Pet.properties.customFormat = {
          format: 'alwaysFails',
          type: 'string',
        };

        Sway.create({
          definition: cOAIDoc,
        })
          .then((apiDef) => {
            const req = {
              body: {
                customFormat: 'shouldFail',
                name: 'Test Pet',
                photoUrls: [],
              },
            };
            let paramValue = apiDef.getOperation('/pet', 'post').getParameter('body').getValue(req);

            assert.ok(_.isUndefined(paramValue.error));
            assert.deepEqual(req.body, paramValue.raw);
            assert.deepEqual(req.body, paramValue.value);

            // Register the custom format
            apiDef.registerFormat('alwaysFails', () => false);

            paramValue = apiDef.getOperation('/pet', 'post').getParameter('body').getValue(req);

            assert.equal(paramValue.error.message, 'Value failed JSON Schema validation');
            assert.equal(paramValue.error.code, 'SCHEMA_VALIDATION_FAILED');
            assert.deepEqual(paramValue.error.path, ['paths', '/pet', 'post', 'parameters', '0']);
            assert.ok(paramValue.error.failedValidation);
            assert.deepEqual(paramValue.error.errors, [
              {
                code: 'INVALID_FORMAT',
                params: ['alwaysFails', 'shouldFail'],
                message: "Object didn't pass validation for format alwaysFails: shouldFail",
                path: ['customFormat'],
              },
            ]);
            assert.deepEqual(req.body, paramValue.raw);
            assert.deepEqual(req.body, paramValue.value);
          })
          .then(done, done);
      });
    });

    describe('#registerFormatGenerator', () => {
      it('should throw TypeError for invalid arguments', () => {
        const scenarios = [
          [[], 'name is required'],
          [[true], 'name must be a string'],
          [['test'], 'formatGenerator is required'],
          [['test', true], 'formatGenerator must be a function'],
        ];

        _.forEach(scenarios, (scenario) => {
          try {
            apiDefinition.registerFormatGenerator(...scenario[0]);

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(scenario[1], err.message);
          }
        });
      });

      it('should add validator to list of format generators', (done) => {
        const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

        cOAIDoc.paths['/user/{username}'].get.parameters[0].format = 'sway';

        Sway.create({
          definition: cOAIDoc,
        })
          .then((apiDef) => {
            const param = apiDef.getOperation('/user/{username}', 'get').getParameter('username');

            try {
              param.getSample();

              tHelpers.shouldHadFailed();
            } catch (err) {
              assert.ok(err.message, /unknown registry key "sway" in /);
            }

            // Register the custom format
            apiDef.registerFormatGenerator('sway', () => 'sway');

            assert.equal(param.getSample(), 'sway');
          })
          .then(done, done);
      });
    });

    describe('#registerValidator', () => {
      it('should throw TypeError for invalid arguments', () => {
        const scenarios = [
          [[], 'validator is required'],
          [['wrongType'], 'validator must be a function'],
        ];

        _.forEach(scenarios, (scenario) => {
          try {
            apiDefinition.registerValidator(...scenario[0]);

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(scenario[1], err.message);
          }
        });
      });

      it('should add validator to list of validators', () => {
        let results = apiDefinition.validate();
        const expectedErrors = [
          'error',
        ];
        const expectedWarnings = [
          'warning',
        ];

        assert.deepEqual(results.errors, []);
        assert.deepEqual(results.warnings, []);

        apiDefinition.registerValidator((apiDef) => {
          tHelpers.checkType(apiDef, 'ApiDefinition');

          return {
            errors: expectedErrors,
            warnings: expectedWarnings,
          };
        });

        results = apiDefinition.validate();

        assert.deepEqual(results.errors, expectedErrors);
        assert.deepEqual(results.warnings, expectedWarnings);
      });
    });

    describe('#validate', () => {
      it('should return zero errors/warnings for a valid document', () => {
        const results = apiDefinition.validate();

        assert.deepEqual(results.errors, []);
        assert.deepEqual(results.warnings, []);
      });

      describe('should return errors for an invalid document', () => {
        it('does not validate against JSON Schema', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          delete cOAIDoc.paths;

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                  message: 'Missing required property: paths',
                  params: ['paths'],
                  path: [],
                  schemaId: 'http://swagger.io/v2/schema.json#',
                  title: 'A JSON Schema for Swagger 2.0 API.',
                },
              ]);
            })
            .then(done, done);
        });

        describe('array type missing required items property', () => {
          function validateBrokenArray(cOAIDoc, path, done) {
            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                // Validate that all warnings are unused definitions
                _.forEach(results.warnings, (warning) => {
                  assert.equal(warning.code, 'UNUSED_DEFINITION');
                });

                assert.deepEqual(results.errors, [
                  {
                    code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                    message: 'Missing required property: items',
                    path,
                  },
                ]);
              })
              .then(done, done);
          }

          describe('schema definitions', () => {
            describe('array', () => {
              it('no items', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.definitions.Pet = {
                  type: 'array',
                };

                validateBrokenArray(cOAIDoc, ['definitions', 'Pet'], done);
              });

              it('items object', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.definitions.Pet = {
                  type: 'array',
                  items: {
                    type: 'array',
                  },
                };

                validateBrokenArray(cOAIDoc, ['definitions', 'Pet', 'items'], done);
              });

              it('items array', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.definitions.Pet = {
                  type: 'array',
                  items: [
                    {
                      type: 'array',
                    },
                  ],
                };

                validateBrokenArray(cOAIDoc, ['definitions', 'Pet', 'items', '0'], done);
              });
            });

            describe('object', () => {
              describe('additionalProperties', () => {
                it('no items', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.definitions.Pet = {
                    type: 'object',
                    additionalProperties: {
                      type: 'array',
                    },
                  };

                  validateBrokenArray(cOAIDoc, ['definitions', 'Pet', 'additionalProperties'], done);
                });

                it('items object', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.definitions.Pet = {
                    type: 'object',
                    additionalProperties: {
                      type: 'array',
                      items: {
                        type: 'array',
                      },
                    },
                  };

                  validateBrokenArray(cOAIDoc, ['definitions', 'Pet', 'additionalProperties', 'items'], done);
                });

                it('items array', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.definitions.Pet = {
                    type: 'object',
                    additionalProperties: {
                      type: 'array',
                      items: [
                        {
                          type: 'array',
                        },
                      ],
                    },
                  };

                  validateBrokenArray(
                    cOAIDoc,
                    ['definitions', 'Pet', 'additionalProperties', 'items', '0'],
                    done,
                  );
                });
              });

              describe('properties', () => {
                it('no items', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.definitions.Pet = {
                    type: 'object',
                    properties: {
                      aliases: {
                        type: 'array',
                      },
                    },
                  };

                  validateBrokenArray(cOAIDoc, ['definitions', 'Pet', 'properties', 'aliases'], done);
                });

                it('items object', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.definitions.Pet = {
                    type: 'object',
                    properties: {
                      aliases: {
                        type: 'array',
                        items: {
                          type: 'array',
                        },
                      },
                    },
                  };

                  validateBrokenArray(cOAIDoc, ['definitions', 'Pet', 'properties', 'aliases', 'items'], done);
                });

                it('items array', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.definitions.Pet = {
                    type: 'object',
                    properties: {
                      aliases: {
                        type: 'array',
                        items: [
                          {
                            type: 'array',
                          },
                        ],
                      },
                    },
                  };

                  validateBrokenArray(cOAIDoc, ['definitions', 'Pet', 'properties', 'aliases', 'items', '0'], done);
                });
              });

              describe('allOf', () => {
                it('no items', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.definitions.Pet = {
                    type: 'object',
                    allOf: [
                      {
                        type: 'array',
                      },
                    ],
                  };

                  validateBrokenArray(cOAIDoc, ['definitions', 'Pet', 'allOf', '0'], done);
                });

                it('items object', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.definitions.Pet = {
                    type: 'object',
                    allOf: [
                      {
                        type: 'object',
                        properties: {
                          aliases: {
                            type: 'array',
                            items: {
                              type: 'array',
                            },
                          },
                        },
                      },
                    ],
                  };

                  validateBrokenArray(
                    cOAIDoc,
                    ['definitions', 'Pet', 'allOf', '0', 'properties', 'aliases', 'items'],
                    done,
                  );
                });

                it('items array', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.definitions.Pet = {
                    type: 'object',
                    allOf: [
                      {
                        type: 'object',
                        properties: {
                          aliases: {
                            type: 'array',
                            items: [
                              {
                                type: 'array',
                              },
                            ],
                          },
                        },
                      },
                    ],
                  };

                  validateBrokenArray(
                    cOAIDoc,
                    ['definitions', 'Pet', 'allOf', '0', 'properties', 'aliases', 'items', '0'],
                    done,
                  );
                });
              });
            });

            it('recursive', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
              const errorSchema = {
                type: 'object',
                allOf: [
                  {
                    type: 'array',
                  },
                ],
                properties: {
                  aliases: {
                    type: 'array',
                  },
                },
                additionalProperties: {
                  type: 'array',
                },
              };

              cOAIDoc.definitions.Pet = {
                allOf: [
                  errorSchema,
                ],
                properties: {
                  aliases: errorSchema,
                },
                additionalProperties: errorSchema,
              };

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  const results = apiDef.validate();

                  // Validate that all warnings are unused definitions
                  _.forEach(results.warnings, (warning) => {
                    assert.equal(warning.code, 'UNUSED_DEFINITION');
                  });

                  assert.deepEqual(results.errors, [
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'additionalProperties', 'additionalProperties'],
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'additionalProperties', 'allOf', '0'],
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'additionalProperties', 'properties', 'aliases'],
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'allOf', '0', 'additionalProperties'],
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'allOf', '0', 'allOf', '0'],
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'allOf', '0', 'properties', 'aliases'],
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'properties', 'aliases', 'additionalProperties'],
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'properties', 'aliases', 'allOf', '0'],
                    },
                    {
                      code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                      message: 'Missing required property: items',
                      path: ['definitions', 'Pet', 'properties', 'aliases', 'properties', 'aliases'],
                    },
                  ]);
                })
                .then(done, done);
            });
          });

          describe('parameter definitions', () => {
            describe('global', () => {
              it('body parameter', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.parameters = {
                  petInBody: {
                    in: 'body',
                    name: 'body',
                    description: 'A Pet',
                    required: true,
                    schema: {
                      properties: {
                        aliases: {
                          type: 'array',
                        },
                      },
                    },
                  },
                };

                validateBrokenArray(cOAIDoc, ['parameters', 'petInBody', 'schema', 'properties', 'aliases'], done);
              });

              it('non-body parameter', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.parameters = {
                  petStatus: _.cloneDeep(cOAIDoc.paths['/pet/findByStatus'].get.parameters[0]),
                };

                delete cOAIDoc.parameters.petStatus.items;

                validateBrokenArray(cOAIDoc, ['parameters', 'petStatus'], done);
              });
            });

            describe('path-level', () => {
              it('body parameter', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.paths['/pet'].parameters = [
                  {
                    in: 'body',
                    name: 'body',
                    description: 'A Pet',
                    required: true,
                    schema: {
                      properties: {
                        aliases: {
                          type: 'array',
                        },
                      },
                    },
                  },
                ];

                validateBrokenArray(
                  cOAIDoc,
                  ['paths', '/pet', 'parameters', '0', 'schema', 'properties', 'aliases'],
                  done,
                );
              });

              it('non-body parameter', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.paths['/pet'].parameters = [
                  _.cloneDeep(cOAIDoc.paths['/pet/findByStatus'].get.parameters[0]),
                ];

                delete cOAIDoc.paths['/pet'].parameters[0].items;

                validateBrokenArray(cOAIDoc, ['paths', '/pet', 'parameters', '0'], done);
              });
            });

            describe('operation', () => {
              it('body parameter', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                delete cOAIDoc.paths['/user/createWithArray'].post.parameters[0].schema.items;

                validateBrokenArray(
                  cOAIDoc,
                  ['paths', '/user/createWithArray', 'post', 'parameters', '0', 'schema'],
                  done,
                );
              });

              it('non-body parameter', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                delete cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].items;

                validateBrokenArray(cOAIDoc, ['paths', '/pet/findByStatus', 'get', 'parameters', '0'], done);
              });
            });
          });

          describe('responses', () => {
            describe('global', () => {
              it('headers', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.responses = {
                  success: {
                    description: 'A response indicative of a successful request',
                    headers: {
                      'X-Broken-Array': {
                        type: 'array',
                      },
                    },
                  },
                };

                validateBrokenArray(cOAIDoc, ['responses', 'success', 'headers', 'X-Broken-Array'], done);
              });

              it('schema definition', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.responses = {
                  success: {
                    description: 'A response indicative of a successful request',
                    schema: {
                      type: 'array',
                    },
                  },
                };

                validateBrokenArray(cOAIDoc, ['responses', 'success', 'schema'], done);
              });
            });

            describe('operation', () => {
              it('headers', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.paths['/pet/findByStatus'].get.responses['200'].headers = {
                  'X-Broken-Array': {
                    type: 'array',
                  },
                };

                validateBrokenArray(
                  cOAIDoc,
                  [
                    'paths',
                    '/pet/findByStatus',
                    'get',
                    'responses',
                    '200',
                    'headers',
                    'X-Broken-Array',
                  ],
                  done,
                );
              });

              it('schema definition', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                delete cOAIDoc.paths['/pet/findByStatus'].get.responses['200'].schema.items;

                validateBrokenArray(
                  cOAIDoc,
                  ['paths', '/pet/findByStatus', 'get', 'responses', '200', 'schema'],
                  done,
                );
              });
            });
          });
        });

        describe('circular composition/inheritance', () => {
          function validateErrors(actual, expected) {
            assert.equal(actual.length, expected.length);

            _.each(actual, (aErr) => {
              assert.deepEqual(aErr, _.find(expected, (vErr) => JsonRefs.pathToPtr(aErr.path) === JsonRefs.pathToPtr(vErr.path)));
            });
          }

          it('definition (direct)', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.definitions.A = {
              allOf: [
                {
                  $ref: '#/definitions/B',
                },
              ],
            };
            cOAIDoc.definitions.B = {
              allOf: [
                {
                  $ref: '#/definitions/A',
                },
              ],
            };

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.warnings, []);

                validateErrors(results.errors, [
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    lineage: ['#/definitions/B', '#/definitions/A', '#/definitions/B'],
                    message: 'Schema object inherits from itself: #/definitions/B',
                    path: ['definitions', 'B'],
                  },
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    lineage: ['#/definitions/A', '#/definitions/B', '#/definitions/A'],
                    message: 'Schema object inherits from itself: #/definitions/A',
                    path: ['definitions', 'A'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('definition (indirect)', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.definitions.A = {
              allOf: [
                {
                  $ref: '#/definitions/B',
                },
              ],
            };
            cOAIDoc.definitions.B = {
              allOf: [
                {
                  $ref: '#/definitions/C',
                },
              ],
            };
            cOAIDoc.definitions.C = {
              allOf: [
                {
                  $ref: '#/definitions/A',
                },
              ],
            };

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.warnings, []);
                validateErrors(results.errors, [
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    lineage: ['#/definitions/C', '#/definitions/A', '#/definitions/B', '#/definitions/C'],
                    message: 'Schema object inherits from itself: #/definitions/C',
                    path: ['definitions', 'C'],
                  },
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    lineage: ['#/definitions/B', '#/definitions/C', '#/definitions/A', '#/definitions/B'],
                    message: 'Schema object inherits from itself: #/definitions/B',
                    path: ['definitions', 'B'],
                  },
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    lineage: ['#/definitions/A', '#/definitions/B', '#/definitions/C', '#/definitions/A'],
                    message: 'Schema object inherits from itself: #/definitions/A',
                    path: ['definitions', 'A'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('inline schema', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.definitions.A = {
              allOf: [
                {
                  allOf: [
                    {
                      $ref: '#/definitions/A/allOf/0',
                    },
                  ],
                },
              ],
            };

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    lineage: ['#/definitions/A/allOf/0', '#/definitions/A/allOf/0'],
                    message: 'Schema object inherits from itself: #/definitions/A/allOf/0',
                    path: ['definitions', 'A', 'allOf', '0'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('not composition/inheritance', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.definitions.Pet.properties.friends = {
              type: 'array',
              items: {
                $ref: '#/definitions/Pet',
              },
            };

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.errors, []);
                assert.deepEqual(results.warnings, []);
              })
              .then(done, done);
          });
        });

        describe('default values fail JSON Schema validation', () => {
          it('schema-like object (non-body parameter)', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.paths['/pet'].post.parameters.push({
              in: 'query',
              name: 'status',
              description: 'The Pet status',
              required: true,
              type: 'string',
              default: 123,
            });

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'INVALID_TYPE',
                    description: 'The Pet status', // Copied in for non-body parameters
                    message: 'Expected type string but found type integer',
                    params: ['string', 'integer'],
                    path: ['paths', '/pet', 'post', 'parameters', '1', 'default'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('schema object', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.definitions.Pet.properties.name.default = 123;

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'INVALID_TYPE',
                    message: 'Expected type string but found type integer',
                    params: ['string', 'integer'],
                    path: ['definitions', 'Pet', 'properties', 'name', 'default'],
                  },
                ]);
              })
              .then(done, done);
          });
        });

        describe('duplicate operation parameter', () => {
          it('operation-level', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
            const cParam = _.cloneDeep(cOAIDoc.paths['/pet/findByStatus'].get.parameters[0]);

            // Alter the parameter so that it is not identical as that will create a JSON Schema uniqueness error
            cParam.description = 'Duplicate';

            cOAIDoc.paths['/pet/findByStatus'].get.parameters.push(cParam);

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'DUPLICATE_PARAMETER',
                    message: 'Operation cannot have duplicate parameters: #/paths/~1pet~1findByStatus/get/parameters/1',
                    path: ['paths', '/pet/findByStatus', 'get', 'parameters', '1'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('path-level', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
            const cParam = _.cloneDeep(cOAIDoc.paths['/pet/{petId}'].parameters[0]);

            // Alter the parameter so that it is not identical as that will create a JSON Schema uniqueness error
            cParam.description = 'Duplicate';

            cOAIDoc.paths['/pet/{petId}'].parameters.push(cParam);

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'DUPLICATE_PARAMETER',
                    message: 'Operation cannot have duplicate parameters: #/paths/~1pet~1{petId}/parameters/1',
                    path: ['paths', '/pet/{petId}', 'parameters', '1'],
                  },
                ]);
              })
              .then(done, done);
          });
        });

        it('invalid JSON Reference', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/something'] = {
            $ref: 'http://:8080',
          };

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'INVALID_REFERENCE',
                  message: 'HTTP URIs must have a host.',
                  path: ['paths', '/something', '$ref'],
                },
              ]);
            })
            .then(done, done);
        });

        it('path parameter in pattern is empty', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/invalid/{}'] = {};

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'EMPTY_PATH_PARAMETER_DECLARATION',
                  message: 'Path parameter declaration cannot be empty: /invalid/{}',
                  path: ['paths', '/invalid/{}'],
                },
              ]);
            })
            .then(done, done);
        });

        it('missing path parameter declaration', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/pet/{petId}'].get.parameters = [
            {
              description: 'Superfluous path parameter',
              in: 'path',
              name: 'petId2',
              required: true,
              type: 'string',
            },
          ];

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'MISSING_PATH_PARAMETER_DECLARATION',
                  message: 'Path parameter is defined but is not declared: petId2',
                  path: ['paths', '/pet/{petId}', 'get', 'parameters', '0'],
                },
              ]);
            })
            .then(done, done);
        });

        it('missing path parameter definition', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/pet/{petId}'].parameters = [];

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'MISSING_PATH_PARAMETER_DEFINITION',
                  message: 'Path parameter is declared but is not defined: petId',
                  path: ['paths', '/pet/{petId}', 'get'],
                },
                {
                  code: 'MISSING_PATH_PARAMETER_DEFINITION',
                  message: 'Path parameter is declared but is not defined: petId',
                  path: ['paths', '/pet/{petId}', 'post'],
                },
                {
                  code: 'MISSING_PATH_PARAMETER_DEFINITION',
                  message: 'Path parameter is declared but is not defined: petId',
                  path: ['paths', '/pet/{petId}', 'delete'],
                },
              ]);
            })
            .then(done, done);
        });

        it('multiple equivalent paths', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/pet/{notPetId}'] = {};

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'EQUIVALENT_PATH',
                  message: 'Equivalent path already exists: /pet/{notPetId}',
                  path: ['paths', '/pet/{notPetId}'],
                },
              ]);
            })
            .then(done, done);
        });

        it('multiple operations with the same operationId', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
          const { operationId } = cOAIDoc.paths['/pet'].post;

          cOAIDoc.paths['/pet'].put.operationId = operationId;

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'DUPLICATE_OPERATIONID',
                  message: `Cannot have multiple operations with the same operationId: ${operationId}`,
                  path: ['paths', '/pet', 'put', 'operationId'],
                },
              ]);
            })
            .then(done, done);
        });

        it('operation has multiple body parameters', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);
          const dBodyParam = _.cloneDeep(cOAIDoc.paths['/pet'].post.parameters[0]);

          dBodyParam.name += 'Duplicate';

          cOAIDoc.paths['/pet'].post.parameters.push(dBodyParam);

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'MULTIPLE_BODY_PARAMETERS',
                  message: 'Operation cannot have multiple body parameters',
                  path: ['paths', '/pet', 'post'],
                },
              ]);
            })
            .then(done, done);
        });

        it('operation can have body or form parameter but not both', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/pet'].post.parameters.push({
            name: 'name',
            in: 'formData',
            description: 'The Pet name',
            required: true,
            type: 'string',
          });

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.validate();

              assert.deepEqual(results.warnings, []);
              assert.deepEqual(results.errors, [
                {
                  code: 'INVALID_PARAMETER_COMBINATION',
                  message: 'Operation cannot have a body parameter and a formData parameter',
                  path: ['paths', '/pet', 'post'],
                },
              ]);
            })
            .then(done, done);
        });

        describe('missing required property definition', () => {
          it('allOf', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            delete cOAIDoc.definitions.Pet.properties.name;

            cOAIDoc.definitions.Pet.allOf = [
              {
                type: 'object',
                properties: _.cloneDeep(cOAIDoc.definitions.Pet.properties),

              },
            ];

            delete cOAIDoc.definitions.Pet.properties;

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'OBJECT_MISSING_REQUIRED_PROPERTY_DEFINITION',
                    message: 'Missing required property definition: name',
                    path: ['definitions', 'Pet'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('properties', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            delete cOAIDoc.definitions.Pet.properties.name;

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.warnings, []);
                assert.deepEqual(results.errors, [
                  {
                    code: 'OBJECT_MISSING_REQUIRED_PROPERTY_DEFINITION',
                    message: 'Missing required property definition: name',
                    path: ['definitions', 'Pet'],
                  },
                ]);
              })
              .then(done, done);
          });
        });

        describe('unused definitions', () => {
          it('definition', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.definitions.Missing = {};

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.errors, []);
                assert.deepEqual(results.warnings, [
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/definitions/Missing',
                    path: ['definitions', 'Missing'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('parameter', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.parameters = {
              missing: {
                name: 'missing',
                in: 'query',
                type: 'string',
              },
            };

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.errors, []);
                assert.deepEqual(results.warnings, [
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/parameters/missing',
                    path: ['parameters', 'missing'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('response', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.responses = {
              Missing: {
                description: 'I am missing',
              },
            };

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.errors, []);
                assert.deepEqual(results.warnings, [
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/responses/Missing',
                    path: ['responses', 'Missing'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('securityDefinition', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.securityDefinitions.missing = {
              type: 'apiKey',
              name: 'api_key',
              in: 'header',
            };

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.errors, []);
                assert.deepEqual(results.warnings, [
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/securityDefinitions/missing',
                    path: ['securityDefinitions', 'missing'],
                  },
                ]);
              })
              .then(done, done);
          });

          it('security scope', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.securityDefinitions.petstore_auth.scopes.missing = 'I am missing';

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const results = apiDef.validate();

                assert.deepEqual(results.errors, []);
                assert.deepEqual(results.warnings, [
                  {
                    code: 'UNUSED_DEFINITION',
                    message: 'Definition is not used: #/securityDefinitions/petstore_auth/scopes/missing',
                    path: ['securityDefinitions', 'petstore_auth', 'scopes', 'missing'],
                  },
                ]);
              })
              .then(done, done);
          });
        });

        describe('unresolvable references', () => {
          describe('json reference', () => {
            it('local', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/pet'].post.parameters[0].schema.$ref = '#/definitions/Missing';

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  const results = apiDef.validate();

                  assert.deepEqual(results.warnings, []);
                  assert.deepEqual(results.errors, [
                    {
                      code: 'UNRESOLVABLE_REFERENCE',
                      message: 'Reference could not be resolved: #/definitions/Missing',
                      path: ['paths', '/pet', 'post', 'parameters', '0', 'schema', '$ref'],
                      error: 'JSON Pointer points to missing location: #/definitions/Missing',
                    },
                  ]);
                })
                .then(done, done);
            });

            it('remote', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/pet'].post.parameters[0].schema.$ref = 'fake.json';

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  const results = apiDef.validate();
                  const { errors: [error] } = results;

                  assert.deepEqual(results.warnings, []);
                  assert.equal(results.errors.length, 1);

                  assert.equal(error.code, 'UNRESOLVABLE_REFERENCE');
                  assert.equal(error.message, 'Reference could not be resolved: fake.json');
                  assert.deepEqual(error.path, ['paths', '/pet', 'post', 'parameters', '0', 'schema', '$ref']);
                  assert.ok(_.has(error, 'error'));
                })
                .then(done, done);
            });
          });

          describe('security definition', () => {
            it('global', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.security.push({
                missing: [],
              });

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  const results = apiDef.validate();

                  assert.deepEqual(results.warnings, []);
                  assert.deepEqual(results.errors, [
                    {
                      code: 'UNRESOLVABLE_REFERENCE',
                      message: 'Security definition could not be resolved: missing',
                      path: ['security', '1', 'missing'],
                    },
                  ]);
                })
                .then(done, done);
            });

            it('operation-level', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/store/inventory'].get.security.push({
                missing: [],
              });

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  const results = apiDef.validate();

                  assert.deepEqual(results.warnings, []);
                  assert.deepEqual(results.errors, [
                    {
                      code: 'UNRESOLVABLE_REFERENCE',
                      message: 'Security definition could not be resolved: missing',
                      path: ['paths', '/store/inventory', 'get', 'security', '1', 'missing'],
                    },
                  ]);
                })
                .then(done, done);
            });
          });

          describe('security scope definition', () => {
            it('global', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.security[0].petstore_auth.push('missing');

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  const results = apiDef.validate();

                  assert.deepEqual(results.warnings, []);
                  assert.deepEqual(results.errors, [
                    {
                      code: 'UNRESOLVABLE_REFERENCE',
                      message: 'Security scope definition could not be resolved: missing',
                      path: ['security', '0', 'petstore_auth', '2'],
                    },
                  ]);
                })
                .then(done, done);
            });

            it('operation-level', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/store/inventory'].get.security.push({
                petstore_auth: [
                  'missing',
                ],
              });

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  const results = apiDef.validate();

                  assert.deepEqual(results.warnings, []);
                  assert.deepEqual(results.errors, [
                    {
                      code: 'UNRESOLVABLE_REFERENCE',
                      message: 'Security scope definition could not be resolved: missing',
                      path: ['paths', '/store/inventory', 'get', 'security', '1', 'petstore_auth', '0'],
                    },
                  ]);
                })
                .then(done, done);
            });
          });
        });
      });

      it('should return errors for JsonRefs errors', (done) => {
        const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

        cOAIDoc.paths['/pet'].post.parameters[0].schema.$ref = '#definitions/Pet';

        Sway.create({
          definition: cOAIDoc,
        })
          .then((apiDef) => {
            assert.deepEqual(apiDef.validate(), {
              errors: [
                {
                  code: 'INVALID_REFERENCE',
                  message: 'ptr must start with a / or #/',
                  path: ['paths', '/pet', 'post', 'parameters', '0', 'schema', '$ref'],
                },
              ],
              warnings: [],
            });
          })
          .then(done, done);
      });

      it('should return warnings for JsonRefs warnings', (done) => {
        const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

        cOAIDoc.paths['/pet'].post.parameters[0].schema.extraField = 'This is an extra field';

        Sway.create({
          definition: cOAIDoc,
        })
          .then((apiDef) => {
            const results = apiDef.validate();

            assert.deepEqual(results, {
              errors: [],
              warnings: [
                {
                  code: 'EXTRA_REFERENCE_PROPERTIES',
                  message: 'Extra JSON Reference properties will be ignored: extraField',
                  path: ['paths', '/pet', 'post', 'parameters', '0', 'schema'],
                },
              ],
            });
          })
          .then(done, done);
      });

      describe('human readable errors for invalid schema', () => {
        function validateError(apiDef, defType) {
          const results = apiDef.validate();

          assert.equal(results.errors.length, 1);
          assert.equal(results.warnings.length, 0);
          assert.equal(results.errors[0].message, `Not a valid ${defType} definition`);
        }

        it('should handle parameter definition', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/pet'].post.parameters[0] = {};

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              validateError(apiDef, 'parameter');
            })
            .then(done, done);
        });

        it('should handle global parameter definition', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.parameters = {
            broken: {},
          };

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              validateError(apiDef, 'parameter');
            })
            .then(done, done);
        });

        it('should handle response definition', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/pet'].post.responses.default = {};

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              validateError(apiDef, 'response');
            })
            .then(done, done);
        });

        it('should handle response schema definition', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/pet'].post.responses.default = {
            description: 'A broken response',
            schema: [],
          };

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              validateError(apiDef, 'response');
            })
            .then(done, done);
        });

        it('should handle schema additionalProperties definition', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.definitions.Broken = {
            type: 'object',
            additionalProperties: [],
          };

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              validateError(apiDef, 'schema additionalProperties');
            })
            .then(done, done);
        });

        it('should handle schema items definition', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.definitions.Broken = {
            type: 'object',
            properties: {
              urls: {
                type: 'array',
                items: false,
              },
            },
          };

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              validateError(apiDef, 'schema items');
            })
            .then(done, done);
        });

        it('should handle securityDefinitions definition', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.securityDefinitions.broken = {};

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              validateError(apiDef, 'securityDefinitions');
            })
            .then(done, done);
        });

        it('should handle schema items definition', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.definitions.Broken = {
            type: 'object',
            properties: {
              urls: {
                type: 'array',
                items: true,
              },
            },
          };

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              validateError(apiDef, 'schema items');
            })
            .then(done, done);
        });
      });
    });
  });
}

describe('ApiDefinition', () => {
  // OpenAPI document without references
  runTests('no-refs');
  // OpenAPI document with references
  runTests('with-refs');
});
