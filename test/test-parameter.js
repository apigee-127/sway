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
const helpers = require('../lib/helpers'); // Helpers from Sway
const tHelpers = require('./helpers');
// Helpers for this suite of tests
const Sway = tHelpers.getSway();

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

  describe(`should handle OpenAPI document ${label} relative references`, () => {
    it('should have proper structure', () => {
      const path = '/pet/{petId}';
      const pathDef = apiDefinition.definitionFullyResolved.paths[path];

      _.each(apiDefinition.getOperation(path, 'post').getParameters(), (parameter, index) => {
        let ptr = '#/paths/~1pet~1{petId}/';
        let def;

        if (index === 0) {
          ({ parameters: [def] } = pathDef);
          ptr += 'parameters/0';
        } else {
          def = pathDef.post.parameters[index - 1];
          ptr += `post/parameters/${index - 1}`;
        }

        assert.equal(parameter.ptr, ptr);
        assert.deepEqual(parameter.definition, def);
      });
    });

    describe('#getSchema', () => {
      it('should handle parameter with explicit schema definition (body parameter)', () => {
        const { schema } = apiDefinition.getOperation('/pet', 'post').getParameter('body');

        // Make sure the generated JSON Schema is identical to its referenced schema
        assert.deepEqual(schema, apiDefinition.definitionFullyResolved.definitions.Pet);

        // Make sure the generated JSON Schema validates an invalid object properly
        try {
          helpers.validateAgainstSchema(tHelpers.oaiDocValidator, schema, {});
        } catch (err) {
          assert.equal(err.code, 'SCHEMA_VALIDATION_FAILED');
          assert.equal(err.message, 'JSON Schema validation failed');
          assert.deepEqual(err.errors, [
            {
              code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
              message: 'Missing required property: photoUrls',
              path: [],
            },
            {
              code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
              message: 'Missing required property: name',
              path: [],
            },
          ]);
          assert.deepEqual(err.warnings, []);
        }

        // Make sure the generated JSON Schema validates a valid object properly
        try {
          helpers.validateAgainstSchema(tHelpers.oaiDocValidator, schema, {
            photoUrls: [],
            name: 'Test Pet',
          });
        } catch (err) {
          tHelpers.shouldNotHadFailed(err);
        }
      });

      it('should handle parameter with schema-like definition (non-body parameter)', () => {
        const { schema } = apiDefinition.getOperation('/pet/findByTags', 'get').getParameter('tags');

        // Make sure the generated JSON Schema is as expected
        assert.deepEqual(schema, {
          description: 'Tags to filter by',
          type: 'array',
          items: {
            type: 'string',
          },
        });

        // Make sure the generated JSON Schema validates an invalid object properly
        try {
          helpers.validateAgainstSchema(tHelpers.oaiDocValidator, schema, 1);
        } catch (err) {
          assert.equal(err.code, 'SCHEMA_VALIDATION_FAILED');
          assert.equal(err.message, 'JSON Schema validation failed');
          assert.deepEqual(err.errors, [
            {
              code: 'INVALID_TYPE',
              description: 'Tags to filter by',
              message: 'Expected type array but found type integer',
              path: [],
            },
          ]);
          assert.deepEqual([], err.warnings);
        }

        // Make sure the generated JSON Schema validates a valid object properly
        try {
          helpers.validateAgainstSchema(tHelpers.oaiDocValidator, schema, [
            'tag1',
            'tag2',
            'tag3',
          ]);
        } catch (err) {
          tHelpers.shouldNotHadFailed(err);
        }
      });
    });

    describe('#getSample', () => {
      it('should handle parameter with explicit schema definition (body parameter)', () => {
        const parameter = apiDefinition.getOperation('/pet', 'post').getParameter('body');

        try {
          helpers.validateAgainstSchema(
            tHelpers.oaiDocValidator,
            parameter.schema,
            parameter.getSample(),
          );
        } catch (err) {
          tHelpers.shouldNotHadFailed(err);
        }
      });

      it('should handle parameter with schema-like definition (non-body parameter)', () => {
        const parameter = apiDefinition.getOperation('/pet/findByTags', 'get').getParameter('tags');

        try {
          helpers.validateAgainstSchema(
            tHelpers.oaiDocValidator,
            parameter.schema,
            parameter.getSample(),
          );
        } catch (err) {
          tHelpers.shouldNotHadFailed(err);
        }
      });

      it('should handle parameter with date format (Issue 99)', (done) => {
        const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

        cOAIDoc.paths['/pet'].post.parameters.push({
          in: 'query',
          name: 'availableDate',
          description: 'The date the Pet is available',
          required: true,
          type: 'string',
          format: 'date',
        });

        Sway.create({
          definition: cOAIDoc,
        })
          .then((apiDef) => {
            assert.ok(_.isString(apiDef.getOperation('/pet', 'post').getParameter('availableDate').getSample()));
          })
          .then(done, done);
      });

      it('should handle parameter with file type (Issue 159)', () => {
        assert.ok(_.isString(apiDefinition.getOperation(
          '/pet/{petId}/uploadImage',
          'post',
        ).getParameter('file').getSample()));
      });
    });

    describe('#getValue', () => {
      it('should throw TypeError for invalid arguments', () => {
        const scenarios = [
          [[], 'req is required'],
          [[true], 'req must be an object'],
        ];
        const param = apiDefinition.getOperation('/pet', 'post').getParameter('body');

        _.forEach(scenarios, (scenario) => {
          try {
            param.getValue(...scenario[0]);

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(scenario[1], err.message);
          }
        });
      });

      describe('raw values', () => {
        describe('body', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet', 'post').getParameter('body');
          });

          it('missing value', () => {
            assert.ok(_.isUndefined(parameter.getValue({}).raw));
          });

          it('provided value', () => {
            const provided = {
              name: 'Testing',
            };

            assert.deepEqual(parameter.getValue({
              body: provided,
            }).raw, provided);
          });
        });

        describe('formData (file) - required', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet/{petId}/uploadImage', 'post').getParameter('file');
          });

          it('missing req.files', () => {
            try {
              parameter.getValue({});

              tHelpers.shouldHadFailed();
            } catch (err) {
              assert.equal(err.message, 'req.files must be provided for \'formData\' parameters of type \'file\'');
            }
          });

          it('missing value', () => {
            assert.ok(_.isUndefined(parameter.getValue({
              files: {},
            }).raw));
          });

          it('provided value', () => {
            assert.deepEqual(parameter.getValue({
              files: {
                file: 'fake file',
              },
            }).raw, 'fake file');
          });
        });

        describe('formData (file) - optional', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet/{petId}/uploadImage', 'post').getParameter('optionalFile');
          });

          it('missing req.files', () => {
            try {
              parameter.getValue({});
            } catch (err) {
              tHelpers.shouldNotHadFailed();
            }
          });
        });

        describe('formData (not file) - required', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet/{petId}', 'post').getParameter('name');
          });

          it('missing req.body', () => {
            try {
              parameter.getValue({});

              tHelpers.shouldHadFailed();
            } catch (err) {
              assert.equal(err.message, 'req.body must be provided for \'formData\' parameters');
            }
          });

          it('missing value', () => {
            assert.ok(_.isUndefined(parameter.getValue({
              body: {},
            }).raw));
          });

          it('provided value', () => {
            assert.deepEqual(parameter.getValue({
              body: {
                name: 'Testing',
                status: 'available',
              },
            }).raw, 'Testing');
          });
        });

        describe('formData (not file) - optional', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet/{petId}', 'post').getParameter('status');
          });

          it('missing req.body', () => {
            try {
              parameter.getValue({});
            } catch (err) {
              tHelpers.shouldNotHadFailed();
            }
          });
        });

        describe('header - required', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet/{petId}', 'delete').getParameter('api_key');
          });

          it('missing req.headers', () => {
            try {
              parameter.getValue({});

              tHelpers.shouldHadFailed();
            } catch (err) {
              assert.equal(err.message, 'req.headers must be provided for \'header\' parameters');
            }
          });

          it('missing value', () => {
            assert.ok(_.isUndefined(parameter.getValue({
              headers: {},
            }).raw));
          });

          it('provided value (lower case)', () => {
            assert.deepEqual(parameter.getValue({
              headers: {
                api_key: 'application/json',
              },
            }).raw, 'application/json');
          });

          it('provided value (mixed case)', () => {
            // Change the parameter name to be mixed case
            parameter.name = 'Api_Key';

            assert.deepEqual(parameter.getValue({
              headers: {
                api_key: 'application/json',
              },
            }).raw, 'application/json');

            // Change it back
            parameter.name = 'api_key';
          });
        });

        describe('header - optional', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet/{petId}', 'delete').getParameter('optional_header');
          });

          it('missing req.headers', () => {
            try {
              parameter.getValue({});
            } catch (err) {
              // TODO: what this line in the original repo is supposed to do?
              // tHelpers.shouldNotHadFailed;
            }
          });
        });

        describe('path', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet/{petId}', 'post').getParameter('petId');
          });

          it('missing req.url', () => {
            try {
              parameter.getValue({});

              tHelpers.shouldHadFailed();
            } catch (err) {
              assert.equal(err.message, 'req.originalUrl or req.url must be provided for \'path\' parameters');
            }
          });

          it('missing value', () => {
            assert.ok(_.isUndefined(parameter.getValue({
              url: '/v2/pet',
            }).raw));
          });

          it('provided value (single)', () => {
            assert.deepEqual(parameter.getValue({
              url: '/v2/pet/1',
            }).raw, '1');
          });

          it('provided value (req.originalUrl)', () => {
            assert.deepEqual(parameter.getValue({
              originalUrl: '/v2/pet/1',
            }).raw, '1');
          });

          it('provided value (multiple)', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.paths['/pet/{petId}/family/{memberId}'] = {
              parameters: [
                {
                  name: 'petId',
                  in: 'path',
                  description: 'ID of pet to return',
                  required: true,
                  type: 'integer',
                  format: 'int64',
                },
                {
                  name: 'memberId',
                  in: 'path',
                  description: 'ID of pet\' family member to return',
                  required: true,
                  type: 'integer',
                  format: 'int64',
                },
              ],
              get: {
                responses: cOAIDoc.paths['/pet/{petId}'].get.responses,
              },
            };

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                _.each(apiDef.getOperation('/pet/{petId}/family/{memberId}', 'get').getParameters(), (param) => {
                  let expected;

                  switch (param.name) {
                    case 'petId':
                      expected = 1;
                      break;
                    case 'memberId':
                      expected = 3;
                      break;
                    default:
                      throw new Error('Should not happen');
                  }

                  assert.equal(param.getValue({
                    url: '/v2/pet/1/family/3',
                  }).raw, expected);
                });
              })
              .then(done, done);
          });

          it('provided value (encoded)', () => {
            assert.deepEqual(parameter.getValue({
              url: '/v2/pet/abc%3AHZ',
            }).raw, 'abc:HZ');
          });

          it('provided value with slash (encoded)', () => {
            assert.deepEqual(parameter.getValue({
              url: '/v2/pet/abc%2FHZ',
            }).raw, 'abc/HZ');
          });
        });

        describe('query', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet/findByStatus', 'get').getParameter('status');
          });

          it('missing req.query', () => {
            try {
              parameter.getValue({});

              tHelpers.shouldHadFailed();
            } catch (err) {
              assert.equal(err.message, 'req.query must be provided for \'query\' parameters');
            }
          });

          it('missing value', () => {
            assert.ok(_.isUndefined(parameter.getValue({
              query: {},
            }).raw));
          });

          it('provided value', () => {
            const statuses = ['available', 'pending'];

            assert.deepEqual(parameter.getValue({
              query: {
                status: statuses,
              },
            }).raw, statuses);
          });
        });

        it('invalid \'in\' value', (done) => {
          const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

          cOAIDoc.paths['/pet/{petId}'].parameters[0].in = 'invalid';

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              try {
                apiDef.getOperation('/pet/{petId}', 'get').getParameter('petId').getValue({});

                tHelpers.shouldHadFailed();
              } catch (err) {
                assert.equal(err.message, 'Invalid \'in\' value: invalid');
              }
            })
            .then(done, done);
        });

        it('missing request', () => {
          try {
            apiDefinition.getOperation('/pet/{petId}', 'get').getParameter('petId').getValue();

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(err.message, 'req is required');
          }
        });
      });

      describe('processed values', () => {
        describe('getter', () => {
          let parameter;

          before(() => {
            parameter = apiDefinition.getOperation('/pet/{petId}', 'get').getParameter('petId');
          });

          it('never processed', () => {
            // Internal state does not exist until processed
            assert.equal(parameter.getValue({
              url: '/v2/pet/1',
            }).value, 1);
          });

          it('processed', () => {
            // Internal state does not exist until processed
            assert.equal(parameter.getValue({
              url: '/v2/pet/1',
            }).value, 1);

            // Call again to make sure we're using the internal cache and not reprocessing
            assert.equal(parameter.getValue({
              url: '/v2/pet/1',
            }).value, 1);
          });

          describe('default values', () => {
            it('provided (array items array)', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].items = [
                {
                  type: 'string',
                  default: 'available',
                },
                {
                  type: 'integer',
                },
              ];

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                    query: {},
                  }).value, ['available', undefined]);
                })
                .then(done, done);
            });

            it('provided (array items object)', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                    query: {},
                  }).value, ['available']);
                })
                .then(done, done);
            });

            it('provided (non-array)', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  assert.equal(apiDef.getOperation('/pet/{petId}', 'delete').getParameter('api_key').getValue({
                    headers: {},
                  }).value, '');
                })
                .then(done, done);
            });

            it('provided (global array default)', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].items = [
                {
                  type: 'string',
                },
              ];
              cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].default = ['available', 'pending'];

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                    query: {},
                  }).value, ['available', 'pending']);
                })
                .then(done, done);
            });

            it('provided (global array default + items default) : should take the items default', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].default = ['available', 'pending'];

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                    query: {},
                  }).value, ['available']);
                })
                .then(done, done);
            });

            it('missing (array items array)', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].items = [
                {
                  type: 'string',
                },
                {
                  type: 'integer',
                },
              ];

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  assert.ok(_.isUndefined(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                    query: {},
                  }).value));
                })
                .then(done, done);
            });

            it('missing (array items object)', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              delete cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].items.default;

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  assert.ok(_.isUndefined(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                    query: {},
                  }).value));
                })
                .then(done, done);
            });

            it('missing (non-array)', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  assert.ok(_.isUndefined(apiDef.getOperation('/pet/{petId}', 'get').getParameter('petId').getValue({
                    url: '/v2/pet',
                  }).value));
                })
                .then(done, done);
            });
          });

          it('optional value', (done) => {
            const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

            cOAIDoc.paths['/pet/findByStatus'].get.parameters.push({
              name: 'age',
              type: 'integer',
              in: 'query',
              required: false,
            });

            Sway.create({
              definition: cOAIDoc,
            })
              .then((apiDef) => {
                const optionalValue = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('age').getValue({
                  query: {},
                });

                assert.ok(_.isUndefined(optionalValue.raw));
                assert.ok(_.isUndefined(optionalValue.error));
                assert.ok(_.isUndefined(optionalValue.value));
                assert.ok(optionalValue.valid);
              })
              .then(done, done);
          });

          describe('type coercion', () => {
            function validateDate(actual, expected) {
              assert.ok(actual instanceof Date);
              assert.equal(actual.toISOString(), expected.toISOString());
            }

            let singleNumParamValue;
            let singleStrParamValue;
            let multipleParamValue;
            let singleStrBooleanLikeValue;

            before((done) => {
              const coaiDoc = _.cloneDeep(tHelpers.oaiDoc);

              coaiDoc.paths['/pet/findByStatus'].get.parameters.push({
                name: 'versions',
                in: 'query',
                type: 'array',
                items: {
                  type: 'string',
                },
              });

              // Test primitive values, because req.query.PARAM will return a primitive
              // if only one is passed to the query param.
              Sway.create({ definition: coaiDoc })
                .then((apiDef) => {
                  const versionsParam = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('versions');

                  // Test a string value that JSON.parse would coerse to Number
                  singleNumParamValue = versionsParam.getValue({
                    query: {
                      versions: '1.1',
                    },
                  });
                  // Test a string value that JSON.parse would coerse to Number
                  singleStrBooleanLikeValue = versionsParam.getValue({
                    query: {
                      versions: 'true',
                    },
                  });
                  // Test a string value
                  singleStrParamValue = versionsParam.getValue({
                    query: {
                      versions: '1.1#rc',
                    },
                  });
                  // Test an array value
                  multipleParamValue = versionsParam.getValue({
                    query: {
                      versions: ['1.0', '1.1#rc'],
                    },
                  });
                })
                .then(done, done);
            });

            describe('array', () => {
              it('items array', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].items = [
                  {
                    type: 'string',
                  },
                  {
                    type: 'string',
                  },
                ];

                Sway.create({
                  definition: cOAIDoc,
                })
                  .then((apiDef) => {
                    assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                      query: {
                        status: [
                          'one', 'two',
                        ],
                      },
                    }).value, ['one', 'two']);
                  })
                  .then(done, done);
              });

              it('items object', () => {
                assert.deepEqual(apiDefinition.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {
                    status: [
                      'available', 'pending',
                    ],
                  },
                }).value, ['available', 'pending']);
              });

              it('non-array JSON string request value', () => {
                assert.deepEqual(apiDefinition.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {
                    status: '["pending"]',
                  },
                }).value, ['pending']);
              });

              it('non-array string request value', () => {
                assert.deepEqual(apiDefinition.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {
                    status: 'pending',
                  },
                }).value, ['pending']);
              });

              it('array value', () => {
                assert.ok(multipleParamValue.valid);
              });

              it('array request value', () => {
                assert.deepEqual(apiDefinition.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {
                    status: ['available', 'pending'],
                  },
                }).value, ['available', 'pending']);
              });

              it('string value that could be coersed to Number', () => {
                assert.ok(singleNumParamValue.valid);
              });

              it('string value that could be coersed to Boolean', () => {
                assert.ok(singleStrBooleanLikeValue.valid);
              });

              it('string value (as req.query.param returns primitive if only one param is passed)', () => {
                assert.ok(singleStrParamValue.valid);
              });

              describe('collectionFormat', () => {
                it('default (csv)', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  delete cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].collectionFormat;

                  Sway.create({
                    definition: cOAIDoc,
                  })
                    .then((apiDef) => {
                      assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                        query: {
                          status: 'available,pending',
                        },
                      }).value, ['available', 'pending']);
                    })
                    .then(done, done);
                });

                it('csv', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'csv';

                  Sway.create({
                    definition: cOAIDoc,
                  })
                    .then((apiDef) => {
                      assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                        query: {
                          status: 'available,pending',
                        },
                      }).value, ['available', 'pending']);
                    })
                    .then(done, done);
                });

                describe('multi', () => {
                  it('multiple values', (done) => {
                    const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                    Sway.create({
                      definition: cOAIDoc,
                    })
                      .then((apiDef) => {
                        assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                          query: {
                            status: [
                              'available', 'pending',
                            ],
                          },
                        }).value, ['available', 'pending']);
                      })
                      .then(done, done);
                  });

                  // This test is required to make sure that when the query string parser only sees one item that an
                  // array is still returned.
                  it('single value', (done) => {
                    const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                    Sway.create({
                      definition: cOAIDoc,
                    })
                      .then((apiDef) => {
                        assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                          query: {
                            status: 'available',
                          },
                        }).value, ['available']);
                      })
                      .then(done, done);
                  });
                });

                it('pipes', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'pipes';

                  Sway.create({
                    definition: cOAIDoc,
                  })
                    .then((apiDef) => {
                      assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                        query: {
                          status: 'available|pending',
                        },
                      }).value, ['available', 'pending']);
                    })
                    .then(done, done);
                });

                it('ssv', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'ssv';

                  Sway.create({
                    definition: cOAIDoc,
                  })
                    .then((apiDef) => {
                      assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                        query: {
                          status: 'available pending',
                        },
                      }).value, ['available', 'pending']);
                    })
                    .then(done, done);
                });

                it('tsv', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'tsv';

                  Sway.create({
                    definition: cOAIDoc,
                  })
                    .then((apiDef) => {
                      assert.deepEqual(apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                        query: {
                          status: 'available\tpending',
                        },
                      }).value, ['available', 'pending']);
                    })
                    .then(done, done);
                });

                it('invalid', (done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'invalid';

                  Sway.create({
                    definition: cOAIDoc,
                  })
                    .then((apiDef) => {
                      const paramValue = apiDef.getOperation('/pet/findByStatus', 'get')
                        .getParameter('status')
                        .getValue({
                          query: {
                            status: '1invalid2invalid3',
                          },
                        });

                      assert.ok(_.isUndefined(paramValue.value));
                      assert.equal(paramValue.error.message, 'Invalid \'collectionFormat\' value: invalid');
                    })
                    .then(done, done);
                });
              });
            });

            describe('boolean', () => {
              let cParam;

              before((done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.paths['/pet/available'] = {
                  parameters: [
                    {
                      name: 'status',
                      in: 'query',
                      description: 'Whether or not the pet is available',
                      required: true,
                      type: 'boolean',
                    },
                  ],
                  get: {
                    responses: cOAIDoc.paths['/pet/{petId}'].get.responses,
                  },
                };

                Sway.create({
                  definition: cOAIDoc,
                })
                  .then((apiDef) => {
                    cParam = apiDef.getOperation('/pet/available', 'get').getParameter('status');
                  })
                  .then(done, done);
              });

              it('boolean request value', () => {
                assert.equal(cParam.getValue({
                  query: {
                    status: true,
                  },
                }).value, true);
              });

              it('string request value', () => {
                assert.equal(cParam.getValue({
                  query: {
                    status: 'false',
                  },
                }).value, false);

                assert.equal(cParam.getValue({
                  query: {
                    status: 'true',
                  },
                }).value, true);
              });

              it('invalid request value', () => {
                const paramValue = cParam.getValue({
                  query: {
                    status: 'invalid',
                  },
                });

                assert.ok(_.isUndefined(paramValue.value));
                assert.equal(paramValue.error.message, 'Expected type boolean but found type string');
              });
            });

            describe('integer', () => {
              let cParam;

              before((done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.paths['/pet/{petId}/friends'] = {
                  parameters: [
                    cOAIDoc.paths['/pet/{petId}'].parameters[0],
                    {
                      name: 'limit',
                      in: 'query',
                      description: 'Maximum number of friends returned',
                      type: 'integer',
                    },
                  ],
                  get: {
                    responses: cOAIDoc.paths['/pet/{petId}'].get.responses,
                  },
                };

                Sway.create({
                  definition: cOAIDoc,
                })
                  .then((apiDef) => {
                    cParam = apiDef.getOperation('/pet/{petId}/friends', 'get').getParameter('limit');
                  })
                  .then(done, done);
              });

              it('integer request value', () => {
                assert.equal(cParam.getValue({
                  query: {
                    limit: 5,
                  },
                }).value, 5);
              });

              it('string request value', () => {
                assert.equal(cParam.getValue({
                  query: {
                    limit: '5',
                  },
                }).value, 5);
              });

              it('invalid request value', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.paths['/pet/{petId}/friends'] = {
                  parameters: [
                    cOAIDoc.paths['/pet/{petId}'].parameters[0],
                    {
                      name: 'limit',
                      in: 'query',
                      description: 'Maximum number of friends returned',
                      type: 'number',
                    },
                  ],
                  get: {
                    responses: cOAIDoc.paths['/pet/{petId}'].get.responses,
                  },
                };

                Sway.create({
                  definition: cOAIDoc,
                })
                  .then((apiDef) => {
                    const paramValue = apiDef
                      .getOperation('/pet/{petId}/friends', 'get')
                      .getParameter('limit')
                      .getValue({
                        query: {
                          limit: '2something',
                        },
                      });

                    assert.ok(_.isUndefined(paramValue.value));
                    assert.equal(paramValue.error.message, 'Expected type number but found type string');
                  })
                  .then(done, done);
              });
            });

            describe('object', () => {
              const pet = {
                name: 'My Pet',
              };
              let cParam;

              before(() => {
                cParam = apiDefinition.getOperation('/pet', 'post').getParameter('body');
              });

              it('object request value', () => {
                assert.deepEqual(cParam.getValue({
                  body: pet,
                }).value, pet);
              });

              it('string request value', () => {
                assert.deepEqual(cParam.getValue({
                  body: JSON.stringify(pet),
                }).value, pet);
              });

              it('invalid request value (non-string)', () => {
                const paramValue = cParam.getValue({
                  body: 1, // We cannot use string because it would be processed by different logic
                });

                assert.equal(paramValue.value, 1);
                assert.equal(paramValue.error.code, 'SCHEMA_VALIDATION_FAILED');
                assert.equal(paramValue.error.message, 'Value failed JSON Schema validation');
                assert.ok(paramValue.error.failedValidation);
                assert.deepEqual(paramValue.error.errors, [
                  {
                    code: 'INVALID_TYPE',
                    message: 'Expected type object but found type integer',
                    params: ['object', 'integer'],
                    path: [],
                  },
                ]);
                assert.deepEqual(paramValue.error.path, [
                  'paths',
                  '/pet',
                  'post',
                  'parameters',
                  '0',
                ]);
              });

              it('invalid request value (string)', () => {
                const paramValue = cParam.getValue({
                  body: 'invalid',
                });

                assert.equal(paramValue.value, 'invalid');
                assert.equal(paramValue.error.code, 'SCHEMA_VALIDATION_FAILED');
                assert.equal(paramValue.error.message, 'Value failed JSON Schema validation');
                assert.ok(paramValue.error.failedValidation);
                assert.deepEqual(paramValue.error.errors, [
                  {
                    code: 'INVALID_TYPE',
                    message: 'Expected type object but found type string',
                    params: ['object', 'string'],
                    path: [],
                  },
                ]);
                assert.deepEqual(paramValue.error.path, [
                  'paths',
                  '/pet',
                  'post',
                  'parameters',
                  '0',
                ]);
              });
            });

            describe('number', () => {
              let cParam;

              before((done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.paths['/pet/{petId}/friends'] = {
                  parameters: [
                    cOAIDoc.paths['/pet/{petId}'].parameters[0],
                    {
                      name: 'limit',
                      in: 'query',
                      description: 'Maximum number of friends returned',
                      type: 'number',
                    },
                  ],
                  get: {
                    responses: cOAIDoc.paths['/pet/{petId}'].get.responses,
                  },
                };

                Sway.create({
                  definition: cOAIDoc,
                })
                  .then((apiDef) => {
                    cParam = apiDef.getOperation('/pet/{petId}/friends', 'get').getParameter('limit');
                  })
                  .then(done, done);
              });

              it('number request value', () => {
                assert.equal(cParam.getValue({
                  query: {
                    limit: 5.5,
                  },
                }).value, 5.5);
              });

              it('string request value', () => {
                assert.equal(cParam.getValue({
                  query: {
                    limit: '5.5',
                  },
                }).value, 5.5);
              });
              it('invalid request value', (done) => {
                const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                cOAIDoc.paths['/pet/{petId}/friends'] = {
                  parameters: [
                    cOAIDoc.paths['/pet/{petId}'].parameters[0],
                    {
                      name: 'limit',
                      in: 'query',
                      description: 'Maximum number of friends returned',
                      type: 'number',
                    },
                  ],
                  get: {
                    responses: cOAIDoc.paths['/pet/{petId}'].get.responses,
                  },
                };

                Sway.create({
                  definition: cOAIDoc,
                })
                  .then((apiDef) => {
                    const paramValue = apiDef
                      .getOperation('/pet/{petId}/friends', 'get')
                      .getParameter('limit')
                      .getValue({
                        query: {
                          limit: '2something',
                        },
                      });

                    assert.ok(_.isUndefined(paramValue.value));
                    assert.equal(paramValue.error.message, 'Expected type number but found type string');
                  })
                  .then(done, done);
              });
            });

            describe('string', () => {
              let cParam;

              before(() => {
                cParam = apiDefinition.getOperation('/pet/{petId}', 'post').getParameter('name');
              });

              it('string request value', () => {
                assert.equal(cParam.getValue({
                  body: {
                    name: 'New Name',
                  },
                }).value, 'New Name');
              });

              it('invalid request value', () => {
                const paramValue = cParam.getValue({
                  body: {
                    name: 1,
                  },
                });

                assert.ok(_.isUndefined(paramValue.value));
                assert.equal(paramValue.error.message, 'Expected type string but found type number');
              });

              describe('date format', () => {
                const date = new Date('2015-04-09');
                const validValues = ['2015-04-09', '0000-01-01', '9999-12-31'];
                const invalidValues = ['invalid', '12345', 'jan 5', '"2015-04-09"',
                  '2015-00-09', '2015-13-09', '2015-04-00', '2015-04-32', '10000-01-01'];

                before((done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.paths['/pet/{petId}'].parameters.push({
                    name: 'createdBefore',
                    in: 'query',
                    description: 'Find pets created before',
                    type: 'string',
                    format: 'date',
                  });

                  Sway.create({
                    definition: cOAIDoc,
                  })
                    .then((apiDef) => {
                      cParam = apiDef.getOperation('/pet/{petId}', 'get').getParameter('createdBefore');
                    })
                    .then(done, done);
                });

                it('date request value', () => {
                  const paramValue = cParam.getValue({
                    query: {
                      createdBefore: date,
                    },
                  });

                  validateDate(paramValue.value, date);
                  assert.ok(paramValue.valid);
                });

                _.each(validValues, (value, index) => {
                  it(`string request value ${index}`, () => {
                    const paramValue = cParam.getValue({
                      query: {
                        createdBefore: value,
                      },
                    });

                    validateDate(paramValue.value, new Date(value));
                    assert.ok(paramValue.valid);
                  });
                });

                _.each(invalidValues, (value, index) => {
                  it(`invalid request value ${index}`, () => {
                    const paramValue = cParam.getValue({
                      query: {
                        createdBefore: value,
                      },
                    });

                    assert.ok(_.isUndefined(paramValue.value));
                    assert.equal(paramValue.error.message, `Object didn't pass validation for format date: ${value}`);
                  });
                });
              });

              describe('date-time format', () => {
                const dateTime = new Date('2015-04-09T14:07:26-06:00');
                const validValues = [
                  '2015-04-09T14:07:26-06:00', '2015-04-09T14:07:26.0182-06:00', '2015-04-09T14:07:26+06:00',
                  '2015-04-09T14:07:26Z', '2001-01-01T00:00:00+00:00', '9999-12-31T23:59:59+23:59'];
                const invalidValues = ['invalid', '12345', 'jan 5', '"2015-04-09T14:07:26-06:00"',
                  '2015-00-09T14:07:26-06:00', '2015-13-09T14:07:26-06:00', '2015-04-00T14:07:26-06:00',
                  '2015-04-32T14:07:26-06:00', '2015-04-09T24:07:26-06:00', '2015-04-09T14:60:26-06:00',
                  '2015-04-09T14:07:61-06:00', '2015-04-09T14:07:26-25:00', '2015-04-09T14:07:26+25:00'];

                before((done) => {
                  const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

                  cOAIDoc.paths['/pet/{petId}'].parameters.push({
                    name: 'createdBefore',
                    in: 'query',
                    description: 'Find pets created before',
                    type: 'string',
                    format: 'date-time',
                  });

                  Sway.create({
                    definition: cOAIDoc,
                  })
                    .then((apiDef) => {
                      cParam = apiDef.getOperation('/pet/{petId}', 'get').getParameter('createdBefore');
                    })
                    .then(done, done);
                });

                it('date request value', () => {
                  const paramValue = cParam.getValue({
                    query: {
                      createdBefore: dateTime,
                    },
                  });

                  validateDate(paramValue.value, dateTime);
                  assert.ok(paramValue.valid);
                });

                _.each(validValues, (value, index) => {
                  it(`string request value ${index}`, () => {
                    const paramValue = cParam.getValue({
                      query: {
                        createdBefore: value,
                      },
                    });

                    validateDate(paramValue.value, new Date(value));
                    assert.ok(paramValue.valid);
                  });
                });

                _.each(invalidValues, (value, index) => {
                  it(`invalid request value ${index}`, () => {
                    const paramValue = cParam.getValue({
                      query: {
                        createdBefore: value,
                      },
                    });

                    assert.ok(_.isUndefined(paramValue.value));
                    assert.equal(
                      paramValue.error.message,
                      `Object didn't pass validation for format date-time: ${value}`,
                    );
                  });
                });
              });
            });

            it('invalid type', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/pet'].post.parameters[0].schema = {
                type: 'invalid',
              };

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  const paramValue = apiDef.getOperation('/pet', 'post').getParameter('body').getValue({
                    body: {},
                  });

                  assert.ok(!paramValue.valid);
                  assert.equal('Invalid \'type\' value: invalid', paramValue.error.message);
                  assert.deepEqual({}, paramValue.raw);
                  assert.ok(_.isUndefined(paramValue.value));
                })
                .then(done, done);
            });

            it('missing type', (done) => {
              const cOAIDoc = _.cloneDeep(tHelpers.oaiDoc);

              cOAIDoc.paths['/pet'].post.parameters[0].schema = {};

              Sway.create({
                definition: cOAIDoc,
              })
                .then((apiDef) => {
                  const paramValue = apiDef.getOperation('/pet', 'post').getParameter('body').getValue({
                    body: {},
                  });

                  assert.deepEqual({}, paramValue.raw);
                  assert.deepEqual({}, paramValue.value);
                })
                .then(done, done);
            });
          });
        });
      });

      describe('validation', () => {
        it('missing required value (with default)', () => {
          const paramValue = apiDefinition.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
            query: {},
          });

          assert.deepEqual(paramValue.value, ['available']);
          assert.ok(paramValue.valid);
          assert.ok(_.isUndefined(paramValue.error));
        });

        it('missing required value (without default)', () => {
          const paramValue = apiDefinition.getOperation('/pet/findByTags', 'get').getParameter('tags').getValue({
            query: {},
          });
          const { error } = paramValue;

          assert.ok(_.isUndefined(paramValue.value));
          assert.ok(paramValue.valid === false);
          assert.equal(error.message, 'Value is required but was not provided');
          assert.equal(error.code, 'REQUIRED');
          assert.ok(error.failedValidation);
        });

        describe('provided empty value', () => {
          describe('integer', () => {
            it('allowEmptyValue false', (done) => {
              const coaiDoc = _.cloneDeep(tHelpers.oaiDoc);

              coaiDoc.paths['/pet/findByStatus'].get.parameters.push({
                allowEmptyValue: false,
                type: 'integer',
                format: 'int32',
                name: 'limit',
                in: 'query',
              });

              Sway.create({
                definition: coaiDoc,
              })
                .then((apiDef) => {
                  const paramValue = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
                    query: {
                      limit: '',
                    },
                  });

                  assert.equal(paramValue.raw, '');
                  assert.equal(paramValue.value, undefined);
                  assert.ok(!paramValue.valid);
                  assert.equal(paramValue.error.message, 'Value is not allowed to be empty');
                })
                .then(done, done);
            });

            it('allowEmptyValue true', (done) => {
              const coaiDoc = _.cloneDeep(tHelpers.oaiDoc);

              coaiDoc.paths['/pet/findByStatus'].get.parameters.push({
                type: 'integer',
                format: 'int32',
                name: 'limit',
                in: 'query',
                allowEmptyValue: true,
              });

              Sway.create({
                definition: coaiDoc,
              })
                .then((apiDef) => {
                  const paramValue = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
                    query: {
                      limit: '',
                    },
                  });

                  assert.equal(paramValue.raw, '');
                  assert.equal(paramValue.value, '');
                  assert.ok(paramValue.valid);
                })
                .then(done, done);
            });
          });

          describe('number', () => {
            it('allowEmptyValue false', (done) => {
              const coaiDoc = _.cloneDeep(tHelpers.oaiDoc);

              coaiDoc.paths['/pet/findByStatus'].get.parameters.push({
                allowEmptyValue: false,
                type: 'number',
                format: 'int32',
                name: 'limit',
                in: 'query',
              });

              Sway.create({
                definition: coaiDoc,
              })
                .then((apiDef) => {
                  const paramValue = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
                    query: {
                      limit: '',
                    },
                  });

                  assert.equal(paramValue.raw, '');
                  assert.equal(paramValue.value, undefined);
                  assert.ok(!paramValue.valid);
                  assert.equal(paramValue.error.message, 'Value is not allowed to be empty');
                })
                .then(done, done);
            });

            it('allowEmptyValue true', (done) => {
              const coaiDoc = _.cloneDeep(tHelpers.oaiDoc);

              coaiDoc.paths['/pet/findByStatus'].get.parameters.push({
                type: 'number',
                format: 'int32',
                name: 'limit',
                in: 'query',
                allowEmptyValue: true,
              });

              Sway.create({
                definition: coaiDoc,
              })
                .then((apiDef) => {
                  const paramValue = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
                    query: {
                      limit: '',
                    },
                  });

                  assert.equal(paramValue.raw, '');
                  assert.equal(paramValue.value, '');
                  assert.ok(paramValue.valid);
                })
                .then(done, done);
            });
          });

          describe('string', () => {
            it('allowEmptyValue false', (done) => {
              const coaiDoc = _.cloneDeep(tHelpers.oaiDoc);

              coaiDoc.paths['/pet/findByStatus'].get.parameters.push({
                allowEmptyValue: false,
                type: 'string',
                name: 'limit',
                in: 'query',
              });

              Sway.create({
                definition: coaiDoc,
              })
                .then((apiDef) => {
                  const paramValue = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
                    query: {
                      limit: '',
                    },
                  });

                  assert.equal(paramValue.raw, '');
                  assert.equal(paramValue.value, '');
                  assert.ok(!paramValue.valid);
                  assert.equal(paramValue.error.message, 'Value is not allowed to be empty');
                })
                .then(done, done);
            });

            it('allowEmptyValue true', (done) => {
              const coaiDoc = _.cloneDeep(tHelpers.oaiDoc);

              coaiDoc.paths['/pet/findByStatus'].get.parameters.push({
                type: 'string',
                name: 'limit',
                in: 'query',
                allowEmptyValue: true,
              });

              Sway.create({
                definition: coaiDoc,
              })
                .then((apiDef) => {
                  const paramValue = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
                    query: {
                      limit: '',
                    },
                  });

                  assert.equal(paramValue.raw, '');
                  assert.equal(paramValue.value, '');
                  assert.ok(paramValue.valid);
                })
                .then(done, done);
            });
          });
        });

        it('provided required value', () => {
          const pet = {
            name: 'Sparky',
            photoUrls: [],
          };
          const paramValue = apiDefinition.getOperation('/pet', 'post').getParameter('body').getValue({
            body: pet,
          });

          assert.deepEqual(paramValue.value, pet);
          assert.ok(_.isUndefined(paramValue.error));
          assert.ok(paramValue.valid);
        });

        it('provided value fails JSON Schema validation', () => {
          const paramValue = apiDefinition.getOperation('/pet', 'post').getParameter('body').getValue({
            body: {},
          });
          const { error } = paramValue;

          assert.deepEqual(paramValue.value, {});
          assert.ok(paramValue.valid === false);
          assert.equal(error.message, 'Value failed JSON Schema validation');
          assert.equal(error.code, 'SCHEMA_VALIDATION_FAILED');
          assert.ok(error.failedValidation);
          assert.deepEqual(error.errors, [
            {
              code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
              message: 'Missing required property: photoUrls',
              params: ['photoUrls'],
              path: [],
            },
            {
              code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
              message: 'Missing required property: name',
              params: ['name'],
              path: [],
            },
          ]);
        });
      });
    });
  });
}

describe('Parameter', () => {
  // Swagger document without references
  runTests('no-refs');
  // Swagger document with references
  runTests('with-refs');
});
