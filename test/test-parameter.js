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
var sHelpers = require('../lib/helpers'); // Helpers from Sway
var Sway = helpers.getSway();

describe('Parameter', function () {
  var swaggerApi;

  before(function (done) {
    helpers.getSwaggerApi(function (api) {
      swaggerApi = api;

      done();
    });
  });

  it('should have proper structure', function () {
    var path = '/pet/{petId}';
    var pathDef = swaggerApi.definitionFullyResolved.paths[path];

    _.each(swaggerApi.getOperation(path, 'post').getParameters(), function (parameter, index) {
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
      var schema = swaggerApi.getOperation('/pet', 'post').getParameter('body').schema;

      // Make sure the generated JSON Schema is identical to its referenced schema
      assert.deepEqual(schema, swaggerApi.definitionFullyResolved.definitions.Pet);

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
        helpers.shouldNotHadFailed(err);
      }
    });

    it('should handle parameter with schema-like definition (non-body parameter)', function () {
      var schema = swaggerApi.getOperation('/pet/findByTags', 'get').getParameter('tags').schema;

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
        helpers.shouldNotHadFailed(err);
      }
    });
  });

  describe('#getSample', function () {
    it('should handle parameter with explicit schema definition (body parameter)', function () {
      var parameter = swaggerApi.getOperation('/pet', 'post').getParameter('body');

      try {
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator,
                                       parameter.schema,
                                       parameter.getSample());
      } catch (err) {
        helpers.shouldNotHadFailed(err);
      }
    });

    it('should handle parameter with schema-like definition (non-body parameter)', function () {
      var parameter = swaggerApi.getOperation('/pet/findByTags', 'get').getParameter('tags');

      try {
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator,
                                      parameter.schema,
                                      parameter.getSample());
      } catch (err) {
        helpers.shouldNotHadFailed(err);
      }
    });
  });

  describe('#getValue', function () {
    describe('raw values', function () {
      describe('body', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet', 'post').getParameter('body');
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

      describe('formData (file) - required', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet/{petId}/uploadImage', 'post').getParameter('file');
        });

        it('missing req.files', function () {
          try {
            parameter.getValue({});

            helpers.shouldHadFailed();
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

      describe('formData (file) - optional', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet/{petId}/uploadImage', 'post').getParameter('optionalFile');
        });

        it('missing req.files', function () {
          try {
            parameter.getValue({});
          } catch (err) {
            helpers.shouldNotHadFailed();
          }
        });
      });

      describe('formData (not file) - required', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet/{petId}', 'post').getParameter('name');
        });

        it('missing req.body', function () {
          try {
            parameter.getValue({});

            helpers.shouldHadFailed();
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

      describe('formData (not file) - optional', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet/{petId}', 'post').getParameter('status');
        });

        it('missing req.body', function () {
          try {
            parameter.getValue({});
          } catch (err) {
            helpers.shouldNotHadFailed
          }
        });
      });

      describe('header - required', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet/{petId}', 'delete').getParameter('api_key');
        });

        it('missing req.headers', function () {
          try {
            parameter.getValue({});

            helpers.shouldHadFailed();
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

      describe('header - optional', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet/{petId}', 'delete').getParameter('optional_header');
        });

        it('missing req.headers', function () {
          try {
            parameter.getValue({});
          } catch (err) {
            helpers.shouldNotHadFailed
          }
        });
      });

      describe('path', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet/{petId}', 'post').getParameter('petId');
        });

        it('missing req.url', function () {
          try {
            parameter.getValue({});

            helpers.shouldHadFailed();
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

          Sway.create({
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

        it('provided value with slash (encoded)', function () {
          assert.deepEqual(parameter.getValue({
            url: '/v2/pet/abc%2FHZ'
          }).raw, 'abc/HZ');
        });
      });

      describe('query', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet/findByStatus', 'get').getParameter('status');
        });

        it('missing req.query', function () {
          try {
            parameter.getValue({});

            helpers.shouldHadFailed();
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

        Sway.create({
          definition: cSwagger
        })
          .then(function (api) {
            try {
              api.getOperation('/pet/{petId}', 'get').getParameter('petId').getValue({});

              helpers.shouldHadFailed();
            } catch (err) {
              assert.equal(err.message, 'Invalid \'in\' value: invalid');
            }
          })
          .then(done, done);
      });

      it('missing request', function () {
        try {
          swaggerApi.getOperation('/pet/{petId}', 'get').getParameter('petId').getValue();

          helpers.shouldHadFailed();
        } catch (err) {
          assert.equal(err.message, 'req is required');
        }
      });
    });

    describe('processed values', function () {
      describe('getter', function () {
        var parameter;

        before(function () {
          parameter = swaggerApi.getOperation('/pet/{petId}', 'get').getParameter('petId');
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

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {}
                }).value, ['available', undefined]);
              })
              .then(done, done);
          });

          it('provided (array items object)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {}
                }).value, ['available']);
              })
              .then(done, done);
          });

          it('provided (non-array)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.equal(api.getOperation('/pet/{petId}', 'delete').getParameter('api_key').getValue({
                  headers: {}
                }).value, '');
              })
              .then(done, done);
          });

          it('provided (global array default)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet/findByStatus'].get.parameters[0].items = [
              {
                type: 'string',
              }
            ];
            cSwagger.paths['/pet/findByStatus'].get.parameters[0].default = ['available', 'pending'];

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {}
                }).value, ['available', 'pending']);
              })
              .then(done, done);
          });

          it('provided (global array default + items default) : should take the items default', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet/findByStatus'].get.parameters[0].default = ['available', 'pending'];

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {}
                }).value, ['available']);
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

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.ok(_.isUndefined(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {}
                }).value));
              })
              .then(done, done);
          });

          it('missing (array items object)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            delete cSwagger.paths['/pet/findByStatus'].get.parameters[0].items.default;

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.ok(_.isUndefined(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                  query: {}
                }).value));
              })
              .then(done, done);
          });

          it('missing (non-array)', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                assert.ok(_.isUndefined(api.getOperation('/pet/{petId}', 'get').getParameter('petId').getValue({
                  url: '/v2/pet'
                }).value));
              })
              .then(done, done);
          });
        });

        it('optional value', function (done) {
          var cSwagger = _.cloneDeep(helpers.swaggerDoc);

          cSwagger.paths['/pet/findByStatus'].get.parameters.push({
            name: 'age',
            type: 'integer',
              in: 'query',
            required: false
          });

          Sway.create({
            definition: cSwagger
          })
            .then(function (api) {
              var optionalValue = api.getOperation('/pet/findByStatus', 'get').getParameter('age').getValue({
                query: {}
              });

              assert.ok(_.isUndefined(optionalValue.raw));
              assert.ok(_.isUndefined(optionalValue.error));
              assert.ok(_.isUndefined(optionalValue.value));
              assert.ok(optionalValue.valid);
            })
            .then(done, done);
        });

        describe('type coercion', function () {
          function validateDate (actual, expected) {
            assert.ok(actual instanceof Date);
            assert.equal(actual.toISOString(), expected.toISOString());
          }

          var singleNumParamValue;
          var singleStrParamValue;
          var multipleParamValue;
          var singleStrBooleanLikeValue;

          before(function (done) {
            var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

            cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
              name: 'versions',
                in: 'query',
              type: 'array',
              items: {
                type: 'string'
              }
            });

            // Test primitive values, because req.query.PARAM will return a primitive
            // if only one is passed to the query param.
            Sway.create({definition: cSwaggerDoc})
              .then(function (api) {
                var parameter = api.getOperation('/pet/findByStatus', 'get').getParameter('versions');

                // Test a string value that JSON.parse would coerse to Number
                singleNumParamValue = parameter.getValue({
                  query: {
                    versions: '1.1'
                  }
                });
                // Test a string value that JSON.parse would coerse to Number
                singleStrBooleanLikeValue = parameter.getValue({
                  query: {
                    versions: 'true'
                  }
                });
                // Test a string value
                singleStrParamValue = parameter.getValue({
                  query: {
                    versions: '1.1#rc'
                  }
                });
                // Test an array value
                multipleParamValue = parameter.getValue({
                  query: {
                    versions: ['1.0', '1.1#rc']
                  }
                });
              })
              .then(done, done);
          });

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

              Sway.create({
                definition: cSwagger
              })
                .then(function (api) {
                  assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
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
              assert.deepEqual(swaggerApi.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                query: {
                  status: [
                    'available', 'pending'
                  ]
                }
              }).value, ['available', 'pending']);
            });

            it('non-array JSON string request value', function () {
              assert.deepEqual(swaggerApi.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                query: {
                  status: '["pending"]'
                }
              }).value, ['pending']);
            });

            it('non-array string request value', function () {
              assert.deepEqual(swaggerApi.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                query: {
                  status: 'pending'
                }
              }).value, ['pending']);
            });

            it('array value', function () {
              assert.ok(multipleParamValue.valid);
            });

            it('array request value', function () {
              assert.deepEqual(swaggerApi.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                query: {
                  status: ['available', 'pending']
                }
              }).value, ['available', 'pending']);
            });

            it('string value that could be coersed to Number', function () {
              assert.ok(singleNumParamValue.valid);
            });

            it('string value that could be coersed to Boolean', function () {
              assert.ok(singleStrBooleanLikeValue.valid);
            });

            it('string value (as req.query.param returns primitive if only one param is passed)', function () {
              assert.ok(singleStrParamValue.valid);
            });

            describe('collectionFormat', function () {
              it('default (csv)', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                delete cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat;

                Sway.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
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

                Sway.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                      query: {
                        status: 'available,pending'
                      }
                    }).value, ['available', 'pending']);
                  })
                  .then(done, done);
              });

              describe('multi', function () {
                it('multiple values', function (done) {
                  var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                  Sway.create({
                    definition: cSwagger
                  })
                    .then(function (api) {
                      assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                        query: {
                          status: [
                            'available', 'pending'
                          ]
                        }
                      }).value, ['available', 'pending']);
                    })
                    .then(done, done);
                });

                // This test is required to make sure that when the query string parser only sees one item that an
                // array is still returned.
                it('single value', function (done) {
                  var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                  Sway.create({
                    definition: cSwagger
                  })
                    .then(function (api) {
                      assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
                        query: {
                          status: 'available'
                        }
                      }).value, ['available']);
                    })
                    .then(done, done);
                });
              });

              it('pipes', function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'pipes';

                Sway.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
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

                Sway.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
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

                Sway.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
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

                Sway.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    var paramValue = api.getOperation('/pet/findByStatus', 'get')
                          .getParameter('status')
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

              Sway.create({
                definition: cSwagger
              })
                .then(function (api) {
                  cParam = api.getOperation('/pet/available', 'get').getParameter('status');
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
              assert.equal(paramValue.error.message, 'Expected type boolean but found type string');
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

              Sway.create({
                definition: cSwagger
              })
                .then(function (api) {
                  cParam = api.getOperation('/pet/{petId}/friends', 'get').getParameter('limit');
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

              Sway.create({
                definition: cSwagger
              })
                .then(function (api) {
                  var paramValue = api
                        .getOperation('/pet/{petId}/friends', 'get')
                        .getParameter('limit')
                        .getValue({
                          query: {
                            limit: '2something'
                          }
                        });

                  assert.ok(_.isUndefined(paramValue.value));
                  assert.equal(paramValue.error.message, 'Expected type number but found type string');
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
              cParam = swaggerApi.getOperation('/pet', 'post').getParameter('body');
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

              assert.equal(paramValue.value, 1);
              assert.equal(paramValue.error.code, 'SCHEMA_VALIDATION_FAILED');
              assert.equal(paramValue.error.message, 'Value failed JSON Schema validation');
              assert.ok(paramValue.error.failedValidation);
              assert.deepEqual(paramValue.error.errors, [
                {
                  code: 'INVALID_TYPE',
                  message: 'Expected type object but found type integer',
                  params: ['object', 'integer'],
                  path: []
                }
              ]);
              assert.deepEqual(paramValue.error.path, [
                'paths',
                '/pet',
                'post',
                'parameters',
                '0'
              ]);
            });

            it('invalid request value (string)', function () {
              var paramValue = cParam.getValue({
                body: 'invalid'
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
                  path: []
                }
              ]);
              assert.deepEqual(paramValue.error.path, [
                'paths',
                '/pet',
                'post',
                'parameters',
                '0'
              ]);
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

              Sway.create({
                definition: cSwagger
              })
                .then(function (api) {
                  cParam = api.getOperation('/pet/{petId}/friends', 'get').getParameter('limit');
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

              Sway.create({
                definition: cSwagger
              })
                .then(function (api) {
                  var paramValue = api
                        .getOperation('/pet/{petId}/friends', 'get')
                        .getParameter('limit')
                        .getValue({
                          query: {
                            limit: '2something'
                          }
                        });

                  assert.ok(_.isUndefined(paramValue.value));
                  assert.equal(paramValue.error.message, 'Expected type number but found type string');
                })
                .then(done, done);
            });
          });

          describe('string', function () {
            var cParam;

            before(function () {
              cParam = swaggerApi.getOperation('/pet/{petId}', 'post').getParameter('name');
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
              assert.equal(paramValue.error.message, 'Expected type string but found type number');
            });

            describe('date format', function () {
              var date = new Date('2015-04-09');
              var validValues = ['2015-04-09', '0000-01-01', '9999-12-31'];
              var invalidValues = ['invalid', '12345', 'jan 5', '"2015-04-09"',
                '2015-00-09', '2015-13-09', '2015-04-00', '2015-04-32', '10000-01-01'];

              before(function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/{petId}'].parameters.push({
                  name: 'createdBefore',
                    in: 'query',
                  description: 'Find pets created before',
                  type: 'string',
                  format: 'date'
                });

                Sway.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    cParam = api.getOperation('/pet/{petId}', 'get').getParameter('createdBefore');
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
                assert.ok(paramValue.valid);
              });

              _.each(validValues, function (value, index) {
                it('string request value ' + index, function () {
                  var paramValue = cParam.getValue({
                    query: {
                      createdBefore: value
                    }
                  });

                  validateDate(paramValue.value, new Date(value));
                  assert.ok(paramValue.valid);
                });
              });

              _.each(invalidValues, function (value, index) {
                it('invalid request value ' + index, function () {
                  var paramValue = cParam.getValue({
                    query: {
                      createdBefore: value
                    }
                  });

                  assert.ok(_.isUndefined(paramValue.value));
                  assert.equal(paramValue.error.message, 'Object didn\'t pass validation for format date: ' + value);
                });
              });
            });

            describe('date-time format', function () {
              var dateTime = new Date('2015-04-09T14:07:26-06:00');
              var validValues = [
                '2015-04-09T14:07:26-06:00', '2015-04-09T14:07:26.0182-06:00', '2015-04-09T14:07:26+06:00',
                '2015-04-09T14:07:26Z', '2001-01-01T00:00:00+00:00', '9999-12-31T23:59:59+23:59'];
              var invalidValues = ['invalid', '12345', 'jan 5', '"2015-04-09T14:07:26-06:00"',
                '2015-00-09T14:07:26-06:00', '2015-13-09T14:07:26-06:00', '2015-04-00T14:07:26-06:00',
                '2015-04-32T14:07:26-06:00', '2015-04-09T24:07:26-06:00', '2015-04-09T14:60:26-06:00',
                '2015-04-09T14:07:61-06:00', '2015-04-09T14:07:26-25:00', '2015-04-09T14:07:26+25:00'];

              before(function (done) {
                var cSwagger = _.cloneDeep(helpers.swaggerDoc);

                cSwagger.paths['/pet/{petId}'].parameters.push({
                  name: 'createdBefore',
                    in: 'query',
                  description: 'Find pets created before',
                  type: 'string',
                  format: 'date-time'
                });

                Sway.create({
                  definition: cSwagger
                })
                  .then(function (api) {
                    cParam = api.getOperation('/pet/{petId}', 'get').getParameter('createdBefore');
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
                assert.ok(paramValue.valid);
              });

              _.each(validValues, function (value, index) {
                it('string request value ' + index, function () {
                  var paramValue = cParam.getValue({
                    query: {
                      createdBefore: value
                    }
                  });

                  validateDate(paramValue.value, new Date(value));
                  assert.ok(paramValue.valid);
                });
              });

              _.each(invalidValues, function (value, index) {
                it('invalid request value ' + index, function () {
                  var paramValue = cParam.getValue({
                    query: {
                      createdBefore: value
                    }
                  });

                  assert.ok(_.isUndefined(paramValue.value));
                  assert.equal(paramValue.error.message,  'Object didn\'t pass validation for format date-time: ' + value);
                });
              });
            });
          });

          it('invalid type', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet'].post.parameters[0].schema = {
              type: 'invalid'
            };

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet', 'post').getParameter('body').getValue({
                  body: {}
                });

                assert.ok(!paramValue.valid)
                assert.equal('Invalid \'type\' value: invalid', paramValue.error.message);
                assert.deepEqual({}, paramValue.raw);
                assert.ok(_.isUndefined(paramValue.value));
              })
              .then(done, done);
          });

          it('missing type', function (done) {
            var cSwagger = _.cloneDeep(helpers.swaggerDoc);

            cSwagger.paths['/pet'].post.parameters[0].schema = {};

            Sway.create({
              definition: cSwagger
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet', 'post').getParameter('body').getValue({
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
        var paramValue = swaggerApi.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
          query: {}
        });

        assert.deepEqual(paramValue.value, ['available']);
        assert.ok(paramValue.valid);
        assert.ok(_.isUndefined(paramValue.error));
      });

      it('missing required value (without default)', function () {
        var paramValue = swaggerApi.getOperation('/pet/findByTags', 'get').getParameter('tags').getValue({
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

            Sway.create({
              definition: cSwaggerDoc
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
                  query: {
                    limit: ''
                  }
                });

                assert.equal(paramValue.raw, '');
                assert.equal(paramValue.value, undefined);
                assert.ok(!paramValue.valid);
                assert.equal(paramValue.error.message, 'Expected type integer but found type string');
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

            Sway.create({
              definition: cSwaggerDoc
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
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

            Sway.create({
              definition: cSwaggerDoc
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
                  query: {
                    limit: ''
                  }
                });

                assert.equal(paramValue.raw, '');
                assert.equal(paramValue.value, undefined);
                assert.ok(!paramValue.valid);
                assert.equal(paramValue.error.message, 'Expected type number but found type string');
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

            Sway.create({
              definition: cSwaggerDoc
            })
              .then(function (api) {
                var paramValue = api.getOperation('/pet/findByStatus', 'get').getParameter('limit').getValue({
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
        var paramValue = swaggerApi.getOperation('/pet', 'post').getParameter('body').getValue({
          body: pet
        });

        assert.deepEqual(paramValue.value, pet);
        assert.ok(_.isUndefined(paramValue.error));
        assert.ok(paramValue.valid);
      });

      it('provided value fails JSON Schema validation', function () {
        var paramValue = swaggerApi.getOperation('/pet', 'post').getParameter('body').getValue({
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
            params: ['photoUrls'],
            path: []
          },
          {
            code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
            message: 'Missing required property: name',
            params: ['name'],
            path: []
          }
        ]);
      });
    });
  });
});
