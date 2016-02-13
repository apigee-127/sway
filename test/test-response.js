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
var sHelpers = require('../lib/helpers');
var Sway = helpers.getSway();
var YAML = require('js-yaml');

describe('Response', function () {
  var swaggerApi;

  before(function (done) {
    helpers.getSwaggerApi(function (api) {
      swaggerApi = api;

      done();
    });
  });

  describe('#getExample', function () {
    var example = {
      name: 'Sparky',
      photoUrls: []
    };
    var exampleXML = [
      '<pet>',
      '  <name>Sparky></name>',
      '  <photoUrls></photoUrls>',
      '</pet>'
    ].join('\n');
    var operation;

    before(function (done) {
      var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);
      var examples = {
        'application/json': example,
        'application/x-yaml': example,
        'application/xml': exampleXML
      };

      cSwaggerDoc.paths['/pet/{petId}'].get.responses.default = {
        description: 'Some description',
        schema: {
          $ref: '#/definitions/Pet'
        },
        examples: examples
      };
      cSwaggerDoc.paths['/pet/{petId}'].get.responses['200'].examples = examples;

      Sway.create({
        definition: cSwaggerDoc
      })
        .then(function (api) {
          operation = api.getOperation('/pet/{petId}', 'get');
        })
        .then(done, done);
    });

    it('should return default response example when no code is provided', function () {
      assert.deepEqual(operation.getResponse().getExample('application/json'), JSON.stringify(example, null, 2));
    });

    it('should return the proper response example for the provided code', function () {
      assert.deepEqual(operation.getResponse(200).getExample('application/json'), JSON.stringify(example, null, 2));
    });

    it('should return the proper response example for non-string example (YAML)', function () {
      assert.deepEqual(operation.getResponse('200').getExample('application/x-yaml'),
                       YAML.safeDump(example, {indent: 2}));
    });

    it('should return the proper response example for string example', function () {
      assert.deepEqual(operation.getResponse().getExample('application/xml'), exampleXML);
    });
  });

  describe('#getSample', function () {
    it('should return sample for default response when no code is provided', function () {
      assert.ok(_.isUndefined(swaggerApi.getOperation('/user', 'post').getResponse().getSample()));
    });

    it('should return sample for the requested response code', function () {
      var operation = swaggerApi.getOperation('/pet/{petId}', 'get');

      try {
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator,
                                       operation.getResponse(200).definition.schema,
                                       operation.getResponse(200).getSample());
      } catch (err) {
        helpers.shouldNotHadFailed(err);
      }
    });

    it('should return undefined for void response', function () {
      assert.ok(_.isUndefined(swaggerApi.getOperation('/pet', 'post').getResponse(405).getSample()));
    });
  });

  describe('#validateResponse', function () {
    var validPet = {
      name: 'Test Pet',
      photoUrls: []
    };

    describe('validate Content-Type', function () {
      describe('operation level produces', function () {
        var cSway;

        before(function (done) {
          var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

          // Schemas are added so they don't get recognized as void responses
          cSwaggerDoc.paths['/pet/{petId}'].delete.responses['204'] = {
            description: 'Successfully deleted',
            schema: {
              type: 'string'
            }
          };
          cSwaggerDoc.paths['/pet/{petId}'].get.responses['304'] = {
            description: 'Cached response',
            schema: {
              type: 'string'
            }
          };

          Sway.create({
            definition: cSwaggerDoc
          })
            .then(function (api) {
              cSway = api;
            })
            .then(done, done);
        });

        describe('unsupported value', function () {
          it('should return an error for a provided value', function () {
            var results = swaggerApi.getOperation('/pet/{petId}', 'get').validateResponse({
              body: validPet,
              headers: {
                'content-type': 'application/x-yaml'
              },
              statusCode: 200
            });

            assert.equal(results.warnings.length, 0);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_CONTENT_TYPE',
                message: 'Invalid Content-Type (application/x-yaml).  ' +
                         'These are supported: application/xml, application/json',
                path: []
              }
            ]);
          });

          it('should not return an error for a void response', function () {
            var results = swaggerApi.getOperation('/user', 'post').validateResponse({
              headers: {
                'content-type': 'application/x-yaml'
              }
            });

            assert.equal(results.errors.length, 0);
            assert.equal(results.warnings.length, 0);
          });

          it('should not return an error for a 204 response', function () {
            var results = cSway.getOperation('/pet/{petId}', 'delete').validateResponse({
              body: validPet,
              headers: {
                'content-type': 'application/x-yaml'
              },
              statusCode: 204
            });

            assert.equal(results.errors.length, 0);
            assert.equal(results.warnings.length, 0);
          });

          it('should not return an error for a 304 response', function () {
            var results = cSway.getOperation('/pet/{petId}', 'get').validateResponse({
              body: validPet,
              headers: {
                'content-type': 'application/x-yaml'
              },
              statusCode: 304
            });

            assert.equal(results.errors.length, 0);
            assert.equal(results.warnings.length, 0);
          });
        });

        it('should not return an error for a supported value', function () {
          var results = swaggerApi.getOperation('/pet/{petId}', 'get').validateResponse({
            body: validPet,
            headers: {
              'content-type': 'application/json'
            },
            statusCode: 200
          });

          assert.equal(results.errors.length, 0);
          assert.equal(results.warnings.length, 0);
        });

        describe('undefined value', function () {
          it('should return an error when not a void/204/304 response', function () {
            var results = swaggerApi.getOperation('/pet/{petId}', 'get').validateResponse({
              body: validPet,
              statusCode: 200
            });

            assert.equal(results.warnings.length, 0);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_CONTENT_TYPE',
                message: 'Invalid Content-Type (undefined).  ' +
                         'These are supported: application/xml, application/json',
                path: []
              }
            ]);
          });

          it('should not return an error for a void response', function () {
            var results = cSway.getOperation('/user', 'post').validateResponse(undefined, {}, validPet);

            assert.equal(results.errors.length, 0);
            assert.equal(results.warnings.length, 0);
          });

          it('should not return an error for a 204 response', function () {
            var results = cSway.getOperation('/pet/{petId}', 'delete').validateResponse({
              body: validPet,
              statusCode: 204
            });

            assert.equal(results.errors.length, 0);
            assert.equal(results.warnings.length, 0);
          });

          it('should not return an error for a 304 response', function () {
            var results = cSway.getOperation('/pet/{petId}', 'get').validateResponse({
              body: validPet,
              statusCode: 304
            });

            assert.equal(results.errors.length, 0);
            assert.equal(results.warnings.length, 0);
          });
        });
      });

      // We only need one test to make sure that we're using the global produces

      it('should handle global level produces', function (done) {
        var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

        cSwaggerDoc.produces = [
          'application/json',
          'application/xml'
        ];

        delete cSwaggerDoc.paths['/pet/{petId}'].get.produces;

        Sway.create({
          definition: cSwaggerDoc
        })
          .then(function (api) {
            var results = api.getOperation('/pet/{petId}', 'get').validateResponse({
              body: validPet,
              headers: {
                'content-type': 'application/x-yaml'
              },
              statusCode: 200
            });

            assert.equal(results.warnings.length, 0);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_CONTENT_TYPE',
                message: 'Invalid Content-Type (application/x-yaml).  ' +
                  'These are supported: application/json, application/xml',
                path: []
              }
            ]);
          })
          .then(done, done);
      });

      it('should handle mime-type parameters (exact match)', function (done) {
        var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);
        var mimeType = 'application/x-yaml; charset=utf-8';

        cSwaggerDoc.paths['/pet/{petId}'].get.produces.push(mimeType);

        Sway.create({
          definition: cSwaggerDoc
        })
          .then(function (api) {
            var results = api.getOperation('/pet/{petId}', 'get').validateResponse({
              body: validPet,
              headers: {
                'content-type': mimeType
              },
              statusCode: 200
            });

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, 0);
          })
          .then(done, done);
      });
    });

    describe('validate headers', function () {
      it('should return errors for invalid headers (schema)', function (done) {
        var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

        cSwaggerDoc.paths['/user/login'].get.responses['200'].headers['X-Rate-Limit'].maximum = 5;

        Sway.create({
          definition: cSwaggerDoc
        })
          .then(function (api) {
            var results = api.getOperation('/user/login', 'get').validateResponse({
              body: 'OK',
              headers: {
                'content-type': 'application/json',
                'x-rate-limit': 1000
              },
              statusCode: 200
            });

            assert.equal(results.warnings.length, 0);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_RESPONSE_HEADER',
                errors: [
                  {
                    code: 'MAXIMUM',
                    description: 'calls per hour allowed by the user',
                    message: 'Value 1000 is greater than maximum 5',
                    params: [1000, 5],
                    path: []
                  }
                ],
                message: 'Invalid header (X-Rate-Limit): Value 1000 is greater than maximum 5',
                name: 'X-Rate-Limit',
                path: []
              }
            ]);
          })
          .then(done, done);
      });

      it('should return errors for invalid headers (type)', function () {
        var results = swaggerApi.getOperation('/user/login', 'get').validateResponse({
          body: 'OK',
          headers: {
            'content-type': 'application/json',
            'x-rate-limit': 'invalid',
            'x-expires-after': 'invalid'
          },
          statusCode: 200
        });

        assert.equal(results.warnings.length, 0);
        assert.deepEqual(results.errors, [
          {
            code: 'INVALID_RESPONSE_HEADER',
            errors: [
              {
                code: 'INVALID_TYPE',
                message: 'Expected type integer but found type string',
                path: []
              }
            ],
            message: 'Invalid header (X-Rate-Limit): Expected type integer but found type string',
            name: 'X-Rate-Limit',
            path: []
          },
          {
            code: 'INVALID_RESPONSE_HEADER',
            errors: [
              {
                code: 'INVALID_FORMAT',
                message: 'Object didn\'t pass validation for format date-time: invalid',
                path: []
              }
            ],
            message: 'Invalid header (X-Expires-After): Object didn\'t pass validation for format date-time: invalid',
            name: 'X-Expires-After',
            path: []
          }
        ]);
      });

      it('should not return errors for valid headers', function () {
        var results = swaggerApi.getOperation('/user/login', 'get').validateResponse({
          body: 'OK',
          headers: {
            'content-type': 'application/json',
            'x-rate-limit': '1000',
            'x-expires-after': '2015-04-09T14:07:26-06:00'
          },
          statusCode: 200
        });

        assert.equal(results.warnings.length, 0);
        assert.equal(results.errors.length, 0);
      });
    });

    describe('validate body', function () {
      describe('should not return an error for a valid response body', function () {
        it('empty body for void response', function () {
          var results = swaggerApi.getOperation('/pet', 'post').validateResponse({
            statusCode: 405
          });

          assert.equal(results.errors.length, 0);
          assert.equal(results.warnings.length, 0);
        });

        it('non-empty body for void response', function () {
          var results = swaggerApi.getOperation('/pet', 'post').validateResponse({
            body: 'Bad Request',
            statusCode: 405
          });

          assert.equal(results.errors.length, 0);
          assert.equal(results.warnings.length, 0);
        });

        it('primitive body', function () {
          var results = swaggerApi.getOperation('/user/login', 'get').validateResponse({
            body: 'OK',
            headers: {
              'content-type': 'application/json',
              'x-rate-limit': '1000',
              'x-expires-after': '2015-04-09T14:07:26-06:00'
            },
            statusCode: 200
          });

          assert.equal(results.errors.length, 0);
          assert.equal(results.warnings.length, 0);
        });

        it('complex body', function () {
          var results = swaggerApi.getOperation('/pet/{petId}', 'get').validateResponse({
            body: {
              name: 'First Pet',
              photoUrls: []
            },
            headers: {
            'content-type': 'application/json'
            },
            statusCode: 200
          });

          assert.equal(results.errors.length, 0);
          assert.equal(results.warnings.length, 0);
        });

        it('Buffer body', function () {
          var results;
          var value;

          // Browsers do not have a 'Buffer' type so we basically skip this test
          if (typeof window === 'undefined') {
            value = new Buffer('OK');
          } else {
            value = 'OK';
          }

          results = swaggerApi.getOperation('/user/login', 'get').validateResponse({
            body: value,
            headers: {
              'content-type': 'application/json'
            },
            statusCode: 200
          });

          assert.equal(results.errors.length, 0);
          assert.equal(results.warnings.length, 0);
        });
      });

      describe('should return an error for an invalid response body', function () {
        it('primitive body', function () {
          var results = swaggerApi.getOperation('/user/login', 'get').validateResponse({
            body: {},
            headers: {
              'content-type': 'application/json',
              'x-rate-limit': '1000',
              'x-expires-after': '2015-04-09T14:07:26-06:00'
            },
            statusCode: 200
          });

          assert.equal(results.warnings.length, 0);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_RESPONSE_BODY',
              errors: [
                {
                  code: 'INVALID_TYPE',
                  message: 'Expected type string but found type object',
                  path: []
                }
              ],
              message: 'Invalid body: Expected type string but found type object',
              path: []
            }
          ]);
        });

        it('complex body', function () {
          var results = swaggerApi.getOperation('/pet/{petId}', 'get').validateResponse({
            body: {},
            headers: {
              'content-type': 'application/json'
            },
            statusCode: 200
          });

          assert.equal(results.warnings.length, 0);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_RESPONSE_BODY',
              errors: [
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
              ],
              message: 'Invalid body: Value failed JSON Schema validation',
              path: []
            }
          ]);
        });

        it('Buffer body', function (done) {
          var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

          cSwaggerDoc.paths['/user/login'].get.responses['200'].schema.minLength = 3;

          Sway.create({
            definition: cSwaggerDoc
          })
            .then(function (api) {
              var results;
              var value;

              // Browsers do not have a 'Buffer' type so we basically skip this test
              if (typeof window === 'undefined') {
                value = new Buffer('OK');
              } else {
                value = 'OK';
              }

              results = api.getOperation('/user/login', 'get').validateResponse({
                body: value,
                encoding: 'utf-8',
                headers: {
                  'content-type': 'application/json'
                },
                statusCode: 200
              });

              assert.deepEqual(results.errors, [
                {
                  code: 'INVALID_RESPONSE_BODY',
                  errors: [
                    {
                      code: 'MIN_LENGTH',
                      message: 'String is too short (2 chars), minimum 3',
                      params: [2, 3],
                      path: []
                    }
                  ],
                  message: 'Invalid body: String is too short (2 chars), minimum 3',
                  path: []
                }
              ]);
              assert.equal(results.warnings.length, 0);
            })
            .then(done, done);
        });
      });
    });
  });
});
