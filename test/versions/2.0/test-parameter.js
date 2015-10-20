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
var sHelpers = require('../../../lib/helpers'); // Helpers from Sway
var tHelpers = require('../../helpers'); // Helpers for test

describe('Parameter (Swagger 2.0)', function () {
  var sway;

  before(function (done) {
    helpers.getSway(function (api) {
      sway = api;

      done();
    });
  });

  it('should have proper structure', function () {
    var path = '/pet/{petId}';
    var pathDef = sway.resolved.paths[path];

    _.each(sway.getOperation(path, 'post').getParameters(), function (parameter, index) {
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
      var schema = sway.getOperation('/pet', 'post').getParameters()[0].getSchema();

      // Make sure the generated JSON Schema is identical to its referenced schema
      assert.deepEqual(schema, sway.resolved.definitions.Pet);

      // Make sure the generated JSON Schema validates an invalid object properly
      try {
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator, schema, {});
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
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator, schema, {
          photoUrls: [],
          name: 'Test Pet'
        });
      } catch (err) {
        tHelpers.shouldNotHadFailed(err);
      }
    });

    it('should handle parameter with schema-like definition (non-body parameter)', function () {
      var schema = sway.getOperation('/pet/findByTags', 'get').getParameters()[0].getSchema();

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
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator, schema, 1);
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
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator, schema, [
          'tag1',
          'tag2',
          'tag3'
        ]);
      } catch (err) {
        tHelpers.shouldNotHadFailed(err);
      }
    });
  });

  describe('#getSample', function () {
    it('should handle parameter with explicit schema definition (body parameter)', function () {
      var parameter = sway.getOperation('/pet', 'post').getParameters()[0];

      try {
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator,
                                       parameter.getSchema(),
                                       parameter.getSample());
      } catch (err) {
        tHelpers.shouldNotHadFailed(err);
      }
    });

    it('should handle parameter with schema-like definition (non-body parameter)', function () {
      var parameter = sway.getOperation('/pet/findByTags', 'get').getParameters()[0];

      try {
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator,
                                      parameter.getSchema(),
                                      parameter.getSample());
      } catch (err) {
        tHelpers.shouldNotHadFailed(err);
      }
    });
  });

  describe('#getValue', function () {
    describe('raw values', function () {
      describe('body', function () {
        var parameter;

        before(function () {
          parameter = sway.getOperation('/pet', 'post').getParameters()[0];
        });

        it('missing value', function () {
          assert.ok(_.isUndefined(parameter.getValue({}).raw));
        });

        it('provided value', function () {
          var provided = {
            name: 'Testing'
          };

          assert.deepEqual(parameter.getValue({
            body: provided
          }).raw, provided);
        });
      });

      describe('formData (file)', function () {
        var parameter;

        before(function () {
          parameter = sway.getOperation('/pet/{petId}/uploadImage', 'post').getParameters()[2];
        });

        it('missing req.files', function () {
          try {
            parameter.getValue({});

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(err.message, 'req.files must be provided for \'formData\' parameters of type \'file\'');
          }
        });

        it('missing value', function () {
          assert.ok(_.isUndefined(parameter.getValue({
            files: {}
          }).raw));
        });

        it('provided value', function () {
          assert.deepEqual(parameter.getValue({
            files: {
              file: 'fake file'
            }
          }).raw, 'fake file');
        });
      });

      describe('formData (not file)', function () {
        var parameter;

        before(function () {
          parameter = sway.getOperation('/pet/{petId}', 'post').getParameters()[1];
        });

        it('missing req.body', function () {
          try {
            parameter.getValue({});

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(err.message, 'req.body must be provided for \'formData\' parameters');
          }
        });

        it('missing value', function () {
          assert.ok(_.isUndefined(parameter.getValue({
            body: {}
          }).raw));
        });

        it('provided value', function () {
          assert.deepEqual(parameter.getValue({
            body: {
              name: 'Testing',
              status: 'available'
            }
          }).raw, 'Testing');
        });
      });

      describe('header', function () {
        var parameter;

        before(function () {
          parameter = sway.getOperation('/pet/{petId}', 'delete').getParameters()[1];
        });

        it('missing req.headers', function () {
          try {
            parameter.getValue({});

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(err.message, 'req.headers must be provided for \'header\' parameters');
          }
        });

        it('missing value', function () {
          assert.ok(_.isUndefined(parameter.getValue({
            headers: {}
          }).raw));
        });

        it('provided value (lower case)', function () {
          assert.deepEqual(parameter.getValue({
            headers: {
              'api_key': 'application/json'
            }
          }).raw, 'application/json');
        });

        it('provided value (mixed case)', function () {
          // Change the parameter name to be mixed case
          parameter.name = 'Api_Key';

          assert.deepEqual(parameter.getValue({
            headers: {
              'api_key': 'application/json'
            }
          }).raw, 'application/json');

          // Change it back
          parameter.name = 'api_key';
        });
      });

      describe('path', function () {
        var parameter;

        before(function () {
          parameter = sway.getOperation('/pet/{petId}', 'post').getParameters()[0];
        });

        it('missing req.url', function () {
          try {
            parameter.getValue({});

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(err.message, 'req.url must be provided for \'path\' parameters');
          }
        });

        it('missing value', function () {
          assert.ok(_.isUndefined(parameter.getValue({
            url: '/v2/pet'
          }).raw));
        });

        it('provided value (single)', function () {
          assert.deepEqual(parameter.getValue({
            url: '/v2/pet/1'
          }).raw, '1');
        });

        it('provided value (multiple)', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.paths['/pet/{petId}/family/{memberId}'] = {
            parameters: [
              {
                name: 'petId',
                  in: 'path',
                description: 'ID of pet to return',
                required: true,
                type: 'integer',
                format: 'int64'
              },
              {
                name: 'memberId',
                  in: 'path',
                description: 'ID of pet\' family member to return',
                required: true,
                type: 'integer',
                format: 'int64'
              }
            ],
            get: {
              responses: cSwagger.paths['/pet/{petId}'].get.responses
            }
          };

          helpers.swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              _.each(api.getOperation('/pet/{petId}/family/{memberId}', 'get').getParameters(), function (param) {
                var expected;

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
                  url: '/v2/pet/1/family/3'
                }).raw, expected);
              });
            })
            .then(done, done);
        });

        it('provided value (encoded)', function () {
          assert.deepEqual(parameter.getValue({
            url: '/v2/pet/abc%3AHZ'
          }).raw, 'abc:HZ');
        });
      });

      describe('query', function () {
        var parameter;

        before(function () {
          parameter = sway.getOperation('/pet/findByStatus', 'get').getParameters()[0];
        });

        it('missing req.query', function () {
          try {
            parameter.getValue({});

            tHelpers.shouldHadFailed();
          } catch (err) {
            assert.equal(err.message, 'req.query must be provided for \'query\' parameters');
          }
        });

        it('missing value', function () {
          assert.ok(_.isUndefined(parameter.getValue({
            query: {}
          }).raw));
        });

        it('provided value', function () {
          var statuses = ['available', 'pending'];

          assert.deepEqual(parameter.getValue({
            query: {
              status: statuses
            }
          }).raw, statuses);
        });
      });

      it('invalid \'in\' value', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet/{petId}'].parameters[0].in = 'invalid';

        helpers.swaggerApi.create({
          definition: cSwagger
        })
          .then(function (api) {
            try {
              api.getOperation('/pet/{petId}', 'get').getParameters()[0].getValue({});

              tHelpers.shouldHadFailed();
            } catch (err) {
              assert.equal(err.message, 'Invalid \'in\' value: invalid');
            }
          })
          .then(done, done);
      });

      it('missing request', function () {
        try {
          sway.getOperation('/pet/{petId}', 'get').getParameters()[0].getValue();

          tHelpers.shouldHadFailed();
        } catch (err) {
          assert.equal(err.message, 'req is required');
        }
      });

      it('wrong request type', function () {
        try {
          sway.getOperation('/pet/{petId}', 'get').getParameters()[0].getValue('wrong type');

          tHelpers.shouldHadFailed();
        } catch (err) {
          assert.equal(err.message, 'req must be an object');
        }
      });
    });

    describe('processed values', function () {
      describe('getter', function () {
        var parameter;

        before(function () {
          parameter = sway.getOperation('/pet/{petId}', 'get').getParameters()[0];
        });

        it('never processed', function () {
          // Internal state does not exist until processed
          assert.equal(parameter.getValue({
            url: '/v2/pet/1'
          }).value, 1);
        });

        it('processed', function () {
          // Internal state does not exist until processed
          assert.equal(parameter.getValue({
            url: '/v2/pet/1'
          }).value, 1);

          // Call again to make sure we're using the internal cache and not reprocessing
          assert.equal(parameter.getValue({
            url: '/v2/pet/1'
          }).value, 1);
        });

        describe('default values', function () {
          it('provided (array items array)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet/findByStatus'].get.parameters[0].items = [
              {
                type: 'string',
                default: 'available'
              },
              {
                type: 'integer'
              }
            ];

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {}
                }).value, ['available', undefined]);
              })
              .then(done, done);
          });

          it('provided (array items object)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {}
                }).value, ['available']);
              })
              .then(done, done);
          });

          it('provided (non-array)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.equal(api.getOperation('/pet/{petId}', 'delete').getParameters()[1].getValue({
                  headers: {}
                }).value, '');
              })
              .then(done, done);
          });

          it('missing (array items array)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet/findByStatus'].get.parameters[0].items = [
              {
                type: 'string'
              },
              {
                type: 'integer'
              }
            ];

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.ok(_.isUndefined(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {}
                }).value));
              })
              .then(done, done);
          });

          it('missing (array items object)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            delete cSwagger.paths['/pet/findByStatus'].get.parameters[0].items.default;

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.ok(_.isUndefined(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {}
                }).value));
              })
              .then(done, done);
          });

          it('missing (non-array)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.ok(_.isUndefined(api.getOperation('/pet/{petId}', 'get').getParameters()[0].getValue({
                  url: '/v2/pet'
                }).value));
              })
              .then(done, done);
          });
        });

        describe('type coercion', function () {
          function validateDate (actual, expected) {
            assert.ok(actual instanceof Date);
            assert.equal(actual.toISOString(), expected.toISOString());
          }

          describe('array', function () {
            it('items array', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.paths['/pet/findByStatus'].get.parameters[0].items = [
                {
                  type: 'string'
                },
                {
                  type: 'string'
                }
              ];

              helpers.swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                    query: {
                      status: [
                        'one', 'two'
                      ]
                    }
                  }).value, ['one', 'two']);
                })
                .then(done, done);
            });

            it('items object', function () {
              assert.deepEqual(sway.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                query: {
                  status: [
                    'available', 'pending'
                  ]
                }
              }).value, ['available', 'pending']);
            });

            it('non-array string request value', function () {
              assert.deepEqual(sway.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                query: {
                  status: 'pending'
                }
              }).value, ['pending']);
            });

            it('non-array, non-string request value', function () {
              assert.deepEqual(sway.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                query: {
                  status: 1 // We cannot use string because it would be processed by different logic
                }
              }).value, [1]);
            });

            it('array request value', function () {
              assert.deepEqual(sway.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                query: {
                  status: ['available', 'pending']
                }
              }).value, ['available', 'pending']);
            });

            describe('collectionFormat', function () {
              it('default (csv)', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                delete cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat;

                helpers.swaggerApi.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                      query: {
                        status: 'available,pending'
                      }
                    }).value, ['available', 'pending']);
                  })
                  .then(done, done);
              });

              it('csv', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'csv';

                helpers.swaggerApi.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                      query: {
                        status: 'available,pending'
                      }
                    }).value, ['available', 'pending']);
                  })
                  .then(done, done);
              });

              it('multi', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                helpers.swaggerApi.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                      query: {
                        status: [
                          'available', 'pending'
                        ]
                      }
                    }).value, ['available', 'pending']);
                  })
                  .then(done, done);
              });

              it('pipes', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'pipes';

                helpers.swaggerApi.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                      query: {
                        status: 'available|pending'
                      }
                    }).value, ['available', 'pending']);
                  })
                  .then(done, done);
              });

              it('ssv', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'ssv';

                helpers.swaggerApi.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                      query: {
                        status: 'available pending'
                      }
                    }).value, ['available', 'pending']);
                  })
                  .then(done, done);
              });

              it('tsv', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'tsv';

                helpers.swaggerApi.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                      query: {
                        status: 'available\tpending'
                      }
                    }).value, ['available', 'pending']);
                  })
                  .then(done, done);
              });

              it('invalid', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'invalid';

                helpers.swaggerApi.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    var paramValue = api.getOperation('/pet/findByStatus', 'get')
                          .getParameters()[0]
                          .getValue({
                            query: {
                              status: '1invalid2invalid3'
                            }
                          });

                    assert.ok(_.isUndefined(paramValue.value));
                    assert.equal(paramValue.error.message, 'Invalid \'collectionFormat\' value: invalid');
                  })
                  .then(done, done);
              });
            });
          });

          describe('boolean', function () {
            var cParam;

            before(function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.paths['/pet/available'] = {
                parameters: [
                  {
                    name: 'status',
                      in: 'query',
                    description: 'Whether or not the pet is available',
                    required: true,
                    type: 'boolean'
                  }
                ],
                get: {
                  responses: cSwagger.paths['/pet/{petId}'].get.responses
                }
              };

              helpers.swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  cParam = api.getOperation('/pet/available', 'get').getParameters()[0];
                })
                .then(done, done);
            });

            it('boolean request value', function () {
              assert.equal(cParam.getValue({
                query: {
                  status: true
                }
              }).value, true);
            });

            it('string request value', function () {
              assert.equal(cParam.getValue({
                query: {
                  status: 'false'
                }
              }).value, false);

              assert.equal(cParam.getValue({
                query: {
                  status: 'true'
                }
              }).value, true);
            });

            it('invalid request value', function () {
              var paramValue = cParam.getValue({
                query: {
                  status: 'invalid'
                }
              });

              assert.ok(_.isUndefined(paramValue.value));
              assert.equal(paramValue.error.message, 'Not a valid boolean: invalid');
            });
          });

          describe('integer', function () {
            var cParam;

            before(function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.paths['/pet/{petId}/friends'] = {
                parameters: [
                  cSwagger.paths['/pet/{petId}'].parameters[0],
                  {
                    name: 'limit',
                      in: 'query',
                    description: 'Maximum number of friends returned',
                    type: 'integer'
                  }
                ],
                get: {
                  responses: cSwagger.paths['/pet/{petId}'].get.responses
                }
              };

              helpers.swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  cParam = api.getOperation('/pet/{petId}/friends', 'get').getParameters()[1];
                })
                .then(done, done);
            });

            it('integer request value', function () {
              assert.equal(cParam.getValue({
                query: {
                  limit: 5
                }
              }).value, 5);
            });

            it('string request value', function () {
              assert.equal(cParam.getValue({
                query: {
                  limit: '5'
                }
              }).value, 5);
            });

            it('invalid request value', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.paths['/pet/{petId}/friends'] = {
                parameters: [
                  cSwagger.paths['/pet/{petId}'].parameters[0],
                  {
                    name: 'limit',
                      in: 'query',
                    description: 'Maximum number of friends returned',
                    type: 'number'
                  }
                ],
                get: {
                  responses: cSwagger.paths['/pet/{petId}'].get.responses
                }
              };

              helpers.swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  var paramValue = api
                        .getOperation('/pet/{petId}/friends', 'get')
                        .getParameters()[1]
                        .getValue({
                          query: {
                            limit: '2something'
                          }
                        });

                  assert.ok(_.isUndefined(paramValue.value));
                  assert.equal(paramValue.error.message, 'Not a valid number: 2something');
                })
                .then(done, done);
            });
          });

          describe('object', function () {
            var pet = {
              name: 'My Pet'
            };
            var cParam;

            before(function () {
              cParam = sway.getOperation('/pet', 'post').getParameters()[0];
            });

            it('object request value', function () {
              assert.deepEqual(cParam.getValue({
                body: pet
              }).value, pet);
            });

            it('string request value', function () {
              assert.deepEqual(cParam.getValue({
                body: JSON.stringify(pet)
              }).value, pet);
            });

            it('invalid request value (non-string)', function () {
              var paramValue = cParam.getValue({
                body: 1 // We cannot use string because it would be processed by different logic
              });

              assert.ok(_.isUndefined(paramValue.value));
              assert.equal(paramValue.error.message, 'Not a valid object: 1');
            });

            it('invalid request value (string)', function () {
              var paramValue = cParam.getValue({
                body: 'invalid'
              });

              assert.ok(_.isUndefined(paramValue.value));
              assert.equal(paramValue.error.message,
                           typeof window === 'undefined' ? 'Unexpected token i' : 'Unable to parse JSON string');
            });
          });

          describe('number', function () {
            var cParam;

            before(function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.paths['/pet/{petId}/friends'] = {
                parameters: [
                  cSwagger.paths['/pet/{petId}'].parameters[0],
                  {
                    name: 'limit',
                      in: 'query',
                    description: 'Maximum number of friends returned',
                    type: 'number'
                  }
                ],
                get: {
                  responses: cSwagger.paths['/pet/{petId}'].get.responses
                }
              };

              helpers.swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  cParam = api.getOperation('/pet/{petId}/friends', 'get').getParameters()[1];
                })
                .then(done, done);
            });

            it('number request value', function () {
              assert.equal(cParam.getValue({
                query: {
                  limit: 5.5
                }
              }).value, 5.5);
            });

            it('string request value', function () {
              assert.equal(cParam.getValue({
                query: {
                  limit: '5.5'
                }
              }).value, 5.5);
            });
            it('invalid request value', function (done) {
              var cSwagger = _.cloneDeep(helpers.swaggerDoc);

              cSwagger.paths['/pet/{petId}/friends'] = {
                parameters: [
                  cSwagger.paths['/pet/{petId}'].parameters[0],
                  {
                    name: 'limit',
                      in: 'query',
                    description: 'Maximum number of friends returned',
                    type: 'number'
                  }
                ],
                get: {
                  responses: cSwagger.paths['/pet/{petId}'].get.responses
                }
              };

              helpers.swaggerApi.create({
                definition: cSwagger
              })
                .then(function (api) {
                  var paramValue = api
                        .getOperation('/pet/{petId}/friends', 'get')
                        .getParameters()[1]
                        .getValue({
                          query: {
                            limit: '2something'
                          }
                        });

                  assert.ok(_.isUndefined(paramValue.value));
                  assert.equal(paramValue.error.message, 'Not a valid number: 2something');
                })
                .then(done, done);
            });
          });

          describe('string', function () {
            var cParam;

            before(function () {
              cParam = sway.getOperation('/pet/{petId}', 'post').getParameters()[1];
            });

            it('string request value', function () {
              assert.equal(cParam.getValue({
                body: {
                  name: 'New Name'
                }
              }).value, 'New Name');
            });

            it('invalid request value', function () {
              var paramValue = cParam.getValue({
                body: {
                  name: 1
                }
              });

              assert.ok(_.isUndefined(paramValue.value));
              assert.equal(paramValue.error.message, 'Not a valid string: 1');
            });

            describe('date format', function () {
              var dateStr = '2015-04-09';
              var date = new Date(dateStr);

              before(function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/{petId}'].parameters.push({
                  name: 'createdBefore',
                    in: 'query',
                  description: 'Find pets created before',
                  type: 'string',
                  format: 'date'
                });

                helpers.swaggerApi.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    cParam = api.getOperation('/pet/{petId}', 'get').getParameters()[1];
                  })
                  .then(done, done);
              });

              it('date request value', function () {
                var paramValue = cParam.getValue({
                  query: {
                    createdBefore: date
                  }
                });

                validateDate(paramValue.value, date);
              });

              it('string request value', function () {
                var paramValue = cParam.getValue({
                  query: {
                    createdBefore: dateStr
                  }
                });

                validateDate(paramValue.value, date);
              });

              it('invalid request value', function () {
                var paramValue = cParam.getValue({
                  query: {
                    createdBefore: 'invalid'
                  }
                });

                assert.ok(_.isUndefined(paramValue.value));
                assert.equal(paramValue.error.message, 'Not a valid date string: invalid');
              });
            });

            describe('date-time format', function () {
              var dateTimeStr = '2015-04-09T14:07:26-06:00';
              var dateTime = new Date(dateTimeStr);

              before(function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/{petId}'].parameters.push({
                  name: 'createdBefore',
                    in: 'query',
                  description: 'Find pets created before',
                  type: 'string',
                  format: 'date-time'
                });

                helpers.swaggerApi.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    cParam = api.getOperation('/pet/{petId}', 'get').getParameters()[1];
                  })
                  .then(done, done);
              });

              it('date request value', function () {
                var paramValue = cParam.getValue({
                  query: {
                    createdBefore: dateTime
                  }
                });

                validateDate(paramValue.value, dateTime);
              });

              it('string request value', function () {
                var paramValue = cParam.getValue({
                  query: {
                    createdBefore: dateTimeStr
                  }
                });

                validateDate(paramValue.value, dateTime);
              });

              it('invalid request value', function () {
                var paramValue = cParam.getValue({
                  query: {
                    createdBefore: 'invalid'
                  }
                });

                assert.ok(_.isUndefined(paramValue.value));
                assert.equal(paramValue.error.message, 'Not a valid date-time string: invalid');
              });
            });
          });

          it('invalid type', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet/findByStatus'].get.parameters[0].items.type = 'invalid';

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {
                    status: [
                      'one', 'two', 'three'
                    ]
                  }
                });

                assert.ok(_.isUndefined(paramValue.value));
                assert.equal(paramValue.error.message, 'Invalid \'type\' value: invalid');
              })
              .then(done, done);
          });

          it('invalid type (undefined)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet/findByStatus'].get.parameters[0].items = [
              {
                type: 'string'
              },
              {
                type: 'string'
              }
            ];

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {
                    status: [
                      'one', 'two', 'three' // The extra parameter will cause an 'undefined' schema
                    ]
                  }
                });

                assert.ok(_.isUndefined(paramValue.value));
                assert.equal(paramValue.error.message, 'Invalid \'type\' value: undefined');
              })
              .then(done, done);
          });

          it('missing type', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet'].post.parameters[0].schema = {};

            helpers.swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet', 'post').getParameters()[0].getValue({
                  body: {}
                });

                assert.deepEqual({}, paramValue.raw);
                assert.deepEqual({}, paramValue.value);
              })
              .then(done, done);
          });
        });
      });
    });

    describe('validation', function () {
      it('missing required value (with default)', function () {
        var paramValue = sway.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
          query: {}
        });

        assert.deepEqual(paramValue.value, ['available']);
        assert.ok(paramValue.valid);
        assert.ok(_.isUndefined(paramValue.error));
      });

      it('missing required value (without default)', function () {
        var paramValue = sway.getOperation('/pet/findByTags', 'get').getParameters()[0].getValue({
          query: {}
        });
        var error = paramValue.error;

        assert.ok(_.isUndefined(paramValue.value));
        assert.ok(paramValue.valid === false);
        assert.equal(error.message, 'Value is required but was not provided');
        assert.equal(error.code, 'REQUIRED');
        assert.ok(error.failedValidation);
      });

      describe('provided empty value', function () {
        describe('integer', function () {
          it('allowEmptyValue false', function (done) {
            var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

            cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
              type: 'integer',
              format: 'int32',
              name: 'limit',
                in: 'query'
            });

            helpers.swaggerApi.create({
              definition: cSwaggerDoc
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getValue({
                  query: {
                    limit: ''
                  }
                });

                assert.equal(paramValue.raw, '');
                assert.equal(paramValue.value, undefined);
                assert.ok(!paramValue.valid);
                assert.equal(paramValue.error.message, 'Not a valid integer: ');
              })
              .then(done, done);
          });

          it('allowEmptyValue true', function (done) {
            var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

            cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
              type: 'integer',
              format: 'int32',
              name: 'limit',
                in: 'query',
              allowEmptyValue: true
            });

            helpers.swaggerApi.create({
              definition: cSwaggerDoc
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getValue({
                  query: {
                    limit: ''
                  }
                });

                assert.equal(paramValue.raw, '');
                assert.equal(paramValue.value, '');
                assert.ok(paramValue.valid);
              })
              .then(done, done);
          });
        });

        describe('number', function () {
          it('allowEmptyValue false', function (done) {
            var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

            cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
              type: 'number',
              format: 'int32',
              name: 'limit',
                in: 'query'
            });

            helpers.swaggerApi.create({
              definition: cSwaggerDoc
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getValue({
                  query: {
                    limit: ''
                  }
                });

                assert.equal(paramValue.raw, '');
                assert.equal(paramValue.value, undefined);
                assert.ok(!paramValue.valid);
                assert.equal(paramValue.error.message, 'Not a valid number: ');
              })
              .then(done, done);
          });

          it('allowEmptyValue true', function (done) {
            var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

            cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
              type: 'number',
              format: 'int32',
              name: 'limit',
                in: 'query',
              allowEmptyValue: true
            });

            helpers.swaggerApi.create({
              definition: cSwaggerDoc
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getValue({
                  query: {
                    limit: ''
                  }
                });

                assert.equal(paramValue.raw, '');
                assert.equal(paramValue.value, '');
                assert.ok(paramValue.valid);
              })
              .then(done, done);
          });
        });
      });

      it('provided required value', function () {
        var pet = {
          name: 'Sparky',
          photoUrls: []
        };
        var paramValue = sway.getOperation('/pet', 'post').getParameters()[0].getValue({
          body: pet
        });

        assert.deepEqual(paramValue.value, pet);
        assert.ok(_.isUndefined(paramValue.error));
        assert.ok(paramValue.valid);
      });

      it('provided value fails JSON Schema validation', function () {
        var paramValue = sway.getOperation('/pet', 'post').getParameters()[0].getValue({
          body: {}
        });
        var error = paramValue.error;

        assert.deepEqual(paramValue.value, {});
        assert.ok(paramValue.valid === false);
        assert.equal(error.message, 'Value failed JSON Schema validation');
        assert.equal(error.code, 'SCHEMA_VALIDATION_FAILED');
        assert.ok(error.failedValidation);
        assert.deepEqual(error.errors, [
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
      });
    });
  });
});
