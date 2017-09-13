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
var Sway = helpers.getSway();

describe('Operation', function () {
  describe('swaggerApiRelativeRefs', function () {
    var swaggerApiRelativeRefs;

    before(function (done) {
      helpers.getSwaggerApiRelativeRefs(function (api) {
        swaggerApiRelativeRefs = api;

        done();
      });
    });

    it('should handle composite parameters', function () {
      var method = 'post';
      var path = '/pet/{petId}';

      var operation = swaggerApiRelativeRefs.getOperation(path, method);
      var pathDef = swaggerApiRelativeRefs.definitionFullyResolved.paths['/pet/{petId}'];

      assert.equal(operation.pathObject.path, path);
      assert.equal(operation.method, method);
      assert.equal(operation.ptr, '#/paths/~1pet~1{petId}/' + method);

      _.each(operation.definition, function (val, key) {
        assert.deepEqual(val, pathDef[method][key]);
      });

      assert.equal(operation.parameterObjects.length, 3);
    });

    it('should handle explicit parameters', function () {
      var method = 'post';
      var path = '/pet/{petId}/uploadImage';
      var operation = swaggerApiRelativeRefs.getOperation(path, method);
      var pathDef = swaggerApiRelativeRefs.definitionRemotesResolved.paths[path];
      var pathDefFullyResolved = swaggerApiRelativeRefs.definitionFullyResolved.paths[path];

      assert.equal(operation.pathObject.path, path);
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

      _.each(operation.definitionFullyResolved, function (val, key) {
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
          assert.deepEqual(val, pathDefFullyResolved[method][key]);
        }
      });
    });

    it('should take global security definitions', function () {
      var method = 'post';
      var path = '/pet/{petId}/uploadImage';
      var operation = swaggerApiRelativeRefs.getOperation(path, method);

      assert.ok(typeof operation.securityDefinitions !== 'undefined', 'Should define securityDefinitions');
      assert.ok(typeof operation.securityDefinitions['petstore_auth'] !== 'undefined', 'Should take \'petstore_auth\' from global security');
      assert.deepEqual(operation.securityDefinitions['petstore_auth'], swaggerApiRelativeRefs.securityDefinitions['petstore_auth']);
    });

    it('should handle explicit parameters', function () {
      assert.deepEqual(swaggerApiRelativeRefs.getOperation('/user/{username}', 'get').security, [
        {
          'api_key': []
        }
      ]);
    });

    function validateRegExps (api, basePath) {
      var createPet = api.getOperation('/pet', 'post');
      var updatePet = api.getOperation('/pet/{petId}', 'post');

      // Make sure they are of the proper type
      assert.ok(createPet.pathObject.regexp instanceof RegExp);
      assert.ok(updatePet.pathObject.regexp instanceof RegExp);

      // Make sure they have the proper keys
      assert.equal(0, createPet.pathObject.regexp.keys.length);
      assert.equal(1, updatePet.pathObject.regexp.keys.length);
      assert.equal('petId', updatePet.pathObject.regexp.keys[0].name);

      // Make sure they match the expected URLs
      assert.ok(_.isArray(createPet.pathObject.regexp.exec(basePath + '/pet')));
      assert.ok(!_.isArray(createPet.pathObject.regexp.exec(basePath + '/pets')));
      assert.ok(_.isArray(updatePet.pathObject.regexp.exec(basePath + '/pet/1')));
      assert.ok(!_.isArray(createPet.pathObject.regexp.exec(basePath + '/pets/1')));
    }

    it('should create proper regexp (with basePath)', function () {
      validateRegExps(swaggerApiRelativeRefs, swaggerApiRelativeRefs.basePath);
    });

    it('should create proper regexp (with basePath ending in slash)', function (done) {
      var cSwagger = _.cloneDeep(helpers.swaggerDoc);

      cSwagger.basePath = '/';

      Sway.create({definition: cSwagger})
            .then(function (api) {
              validateRegExps(api, '');
            })
            .then(done, done);
    });

    it('should create proper regexp (without basePath)', function (done) {
      var cSwagger = _.cloneDeep(helpers.swaggerDoc);

      delete cSwagger.basePath;

      Sway.create({definition: cSwagger})
            .then(function (api) {
              validateRegExps(api, '');
            })
            .then(done, done);
    });

    describe('#getParameter', function () {
      it('should return the proper response', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet/{petId}'].get.parameters = [
          {
            description: 'This is a duplicate name but different location',
            name: 'petId',
            in: 'query',
            type: 'string'
          }
        ];

        Sway.create({definition: cSwagger})
          .then(function (api) {
            var operation = api.getOperation('/pet/{petId}', 'get');

            assert.ok(_.isUndefined(operation.getParameter()));
            assert.ok(_.isUndefined(operation.getParameter('missing')));
            assert.ok(_.isUndefined(operation.getParameter('petId', 'header')));
            assert.deepEqual(operation.getParameter('petId', 'path').definition,
                            cSwagger.paths['/pet/{petId}'].parameters[0]);
            assert.deepEqual(operation.getParameter('petId', 'query').definition,
                            cSwagger.paths['/pet/{petId}'].get.parameters[0]);
          })
          .then(done, done);
      });
    });

    // More vigorous testing of the Parameter object itself and the parameter composition are done elsewhere
    describe('#getParameters', function () {
      it('should return the proper parameter objects', function () {
        var operation = swaggerApiRelativeRefs.getOperation('/pet/{petId}', 'post');

        assert.deepEqual(operation.getParameters(), operation.parameterObjects);
      });
    });

    describe('#getSecurity', function () {
      it('should return the proper parameter objects', function () {
        var op1 = swaggerApiRelativeRefs.getOperation('/pet/{petId}', 'post');
        var op2 = swaggerApiRelativeRefs.getOperation('/store/inventory', 'get');

        assert.notDeepEqual(op1.getSecurity, op1.security);
        assert.deepEqual(op1.getSecurity(), swaggerApiRelativeRefs.definition.security);

        assert.deepEqual(op2.getSecurity(), op2.security);
      });
    });

    describe('#validateRequest', function () {
      describe('validate Content-Type', function () {
        var baseRequest = {
          url: '/pet',
          body: {
            name: 'Test Pet',
            photoUrls: []
          }
        };

        describe('operation level consumes - ignore when empty', function () {
          var operation; 

          before(function () {
            // this path+op doesn't specify 'consumes'
            operation = swaggerApiRelativeRefs.getOperation('/pet/findByStatus', 'get');
          });
          
          it('should not return an unsupported content-type error', function () {
            var request = {
              url: '/pet/findByStatus',
              query: {
                'status': 'sold'
              },
              headers: {
                'content-type': 'application/json' // extraneous content-type header
              }
            };
            var results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, 0);
          });
        });

        describe('operation level consumes', function () {
          var operation;

          before(function () {
            operation = swaggerApiRelativeRefs.getOperation('/pet', 'post');
          });

          it('should return an error for an unsupported value', function () {
            var request = _.cloneDeep(baseRequest);
            var results;

            request.headers = {
              'content-type': 'application/x-yaml'
            };

            results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, 1);
          });

          it('should handle an undefined value (defaults to application/octet-stream)', function () {
            var request = _.cloneDeep(baseRequest);
            var results;

            request.headers = {};

            results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_CONTENT_TYPE',
                message: 'Invalid Content-Type (application/octet-stream).  ' +
                        'These are supported: application/json, application/xml',
                path: []
              }
            ]);
          });

          it('should not return an error for a supported value', function () {
            var request = _.cloneDeep(baseRequest);
            var results;

            request.headers = {
              'content-type': 'application/json'
            };

            results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, 0);
          });
        });

        // We only need one test to make sure that we're using the global consumes

        it('should handle global level consumes', function (done) {
          var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

          cSwaggerDoc.consumes = cSwaggerDoc.paths['/pet'].post.consumes;

          delete cSwaggerDoc.paths['/pet'].post.consumes;

          Sway.create({
            definition: cSwaggerDoc
          })
            .then(function (api) {
              var operation = api.getOperation('/pet', 'post');
              var request = _.cloneDeep(baseRequest);
              var results;

              request.headers = {
                'content-type': 'application/x-yaml'
              };

              results = operation.validateRequest(request);

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

          cSwaggerDoc.paths['/pet'].post.consumes.push(mimeType);

          Sway.create({
            definition: cSwaggerDoc
          })
            .then(function (api) {
              var request = _.cloneDeep(baseRequest);
              var results;

              request.headers = {
                'content-type': mimeType
              };

              results = api.getOperation('/pet', 'post').validateRequest(request);

              assert.equal(results.warnings.length, 0);
              assert.equal(results.errors.length, 0);
            })
            .then(done, done);
        });
      });

      describe('validate parameters', function () {
        // We do not need to exhaustively test parameter validation since we're basically just relying on
        // ParameterValue's validation and which is heavily tested elsewhere.

        it('should return an error for invalid non-primitive parameters', function () {
          var operation = swaggerApiRelativeRefs.getOperation('/pet', 'post');
          var results = operation.validateRequest({
            url: '/v2/pet',
            headers: {
              'content-type': 'application/json'
            },
            body: {},
            files: {}
          });

          assert.equal(results.warnings.length, 0);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_REQUEST_PARAMETER',
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
              in: 'body',
              message: 'Invalid parameter (body): Value failed JSON Schema validation',
              name: 'body',
              path: ['paths', '/pet', 'post', 'parameters', '0']
            }
          ]);
        });

        it('should return an error for invalid primitive parameters', function () {
          var operation = swaggerApiRelativeRefs.getOperation('/pet/{petId}/uploadImage', 'post');
          var results = operation.validateRequest({
            url: '/v2/pet/notANumber/uploadImage',
            headers: {
              'content-type': 'multipart/form-data'
            },
            body: {},
            files: {}
          });

          assert.equal(results.warnings.length, 0);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_REQUEST_PARAMETER',
              errors: [
                {
                  code: 'INVALID_TYPE',
                  message: 'Expected type integer but found type string',
                  path: []
                }
              ],
              in: 'path',
              message: 'Invalid parameter (petId): Expected type integer but found type string',
              name: 'petId',
              path: []
            }
          ]);
        });

        it('should not return an error for valid parameters', function () {
          var operation = swaggerApiRelativeRefs.getOperation('/pet/{petId}', 'post');
          var results = operation.validateRequest({
            url: '/v2/pet/1',
            headers: {
              'content-type': 'application/x-www-form-urlencoded'
            },
            body: {
              name: 'New Pet',
              status: 'available'
            }
          });

          assert.equal(results.errors.length, 0);
          assert.equal(results.warnings.length, 0);
        });
      });
    });

    describe('#validateResponse', function () {
      // We only test that Operation#validateResponse handles missing responses because the testing of the remainder
      // is in test-response.js.
      describe('should return an error for undefined response', function () {
        it('undefined value but no default', function () {
          var results = swaggerApiRelativeRefs.getOperation('/pet', 'post').validateResponse();

          assert.deepEqual(results.warnings, []);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_RESPONSE_CODE',
              message: 'This operation does not have a defined \'default\' response code',
              path: []
            }
          ]);
        });

        it('provided value', function () {
          var results = swaggerApiRelativeRefs.getOperation('/pet/{petId}', 'post').validateResponse({
            statusCode: 201
          });

          assert.deepEqual(results.warnings, []);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_RESPONSE_CODE',
              message: 'This operation does not have a defined \'201\' or \'default\' response code',
              path: []
            }
          ]);
        });
      });

      it('should return the \'default\' response when validating an undefined response', function () {
        var results = swaggerApiRelativeRefs.getOperation('/user', 'post').validateResponse({
          statusCode: 201
        });

        assert.deepEqual(results.errors, []);
        assert.deepEqual(results.warnings, []);
      });
    });
  });

  describe('swaggerApi', function () {
    var swaggerApi;

    before(function (done) {
      helpers.getSwaggerApi(function (api) {
        swaggerApi = api;

        done();
      });
    });

    it('should handle composite parameters', function () {
      var method = 'post';
      var path = '/pet/{petId}';
      var operation = swaggerApi.getOperation(path, method);
      var pathDef = swaggerApi.definitionFullyResolved.paths['/pet/{petId}'];

      assert.equal(operation.pathObject.path, path);
      assert.equal(operation.method, method);
      assert.equal(operation.ptr, '#/paths/~1pet~1{petId}/' + method);

      _.each(operation.definition, function (val, key) {
        assert.deepEqual(val, pathDef[method][key]);
      });

      assert.equal(operation.parameterObjects.length, 3);
    });

    it('should handle explicit parameters', function () {
      var method = 'post';
      var path = '/pet/{petId}/uploadImage';
      var operation = swaggerApi.getOperation(path, method);
      var pathDef = swaggerApi.definitionRemotesResolved.paths[path];
      var pathDefFullyResolved = swaggerApi.definitionFullyResolved.paths[path];

      assert.equal(operation.pathObject.path, path);
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

      _.each(operation.definitionFullyResolved, function (val, key) {
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
          assert.deepEqual(val, pathDefFullyResolved[method][key]);
        }
      });
    });

    it('should handle explicit parameters', function () {
      assert.deepEqual(swaggerApi.getOperation('/user/{username}', 'get').security, [
        {
          'api_key': []
        }
      ]);
    });

    function validateRegExps (api, basePath) {
      var createPet = api.getOperation('/pet', 'post');
      var updatePet = api.getOperation('/pet/{petId}', 'post');

      // Make sure they are of the proper type
      assert.ok(createPet.pathObject.regexp instanceof RegExp);
      assert.ok(updatePet.pathObject.regexp instanceof RegExp);

      // Make sure they have the proper keys
      assert.equal(0, createPet.pathObject.regexp.keys.length);
      assert.equal(1, updatePet.pathObject.regexp.keys.length);
      assert.equal('petId', updatePet.pathObject.regexp.keys[0].name);

      // Make sure they match the expected URLs
      assert.ok(_.isArray(createPet.pathObject.regexp.exec(basePath + '/pet')));
      assert.ok(!_.isArray(createPet.pathObject.regexp.exec(basePath + '/pets')));
      assert.ok(_.isArray(updatePet.pathObject.regexp.exec(basePath + '/pet/1')));
      assert.ok(!_.isArray(createPet.pathObject.regexp.exec(basePath + '/pets/1')));
    }

    it('should create proper regexp (with basePath)', function () {
      validateRegExps(swaggerApi, swaggerApi.basePath);
    });

    it('should create proper regexp (with basePath ending in slash)', function (done) {
      var cSwagger = _.cloneDeep(helpers.swaggerDoc);

      cSwagger.basePath = '/';

      Sway.create({definition: cSwagger})
            .then(function (api) {
              validateRegExps(api, '');
            })
            .then(done, done);
    });

    it('should create proper regexp (without basePath)', function (done) {
      var cSwagger = _.cloneDeep(helpers.swaggerDoc);

      delete cSwagger.basePath;

      Sway.create({definition: cSwagger})
            .then(function (api) {
              validateRegExps(api, '');
            })
            .then(done, done);
    });

    describe('#getParameter', function () {
      it('should return the proper response', function (done) {
        var cSwagger = _.cloneDeep(helpers.swaggerDoc);

        cSwagger.paths['/pet/{petId}'].get.parameters = [
          {
            description: 'This is a duplicate name but different location',
            name: 'petId',
            in: 'query',
            type: 'string'
          }
        ];

        Sway.create({definition: cSwagger})
          .then(function (api) {
            var operation = api.getOperation('/pet/{petId}', 'get');

            assert.ok(_.isUndefined(operation.getParameter()));
            assert.ok(_.isUndefined(operation.getParameter('missing')));
            assert.ok(_.isUndefined(operation.getParameter('petId', 'header')));
            assert.deepEqual(operation.getParameter('petId', 'path').definition,
                            cSwagger.paths['/pet/{petId}'].parameters[0]);
            assert.deepEqual(operation.getParameter('petId', 'query').definition,
                            cSwagger.paths['/pet/{petId}'].get.parameters[0]);
          })
          .then(done, done);
      });
    });

    // More vigorous testing of the Parameter object itself and the parameter composition are done elsewhere
    describe('#getParameters', function () {
      it('should return the proper parameter objects', function () {
        var operation = swaggerApi.getOperation('/pet/{petId}', 'post');

        assert.deepEqual(operation.getParameters(), operation.parameterObjects);
      });
    });

    describe('#getSecurity', function () {
      it('should return the proper parameter objects', function () {
        var op1 = swaggerApi.getOperation('/pet/{petId}', 'post');
        var op2 = swaggerApi.getOperation('/store/inventory', 'get');

        assert.notDeepEqual(op1.getSecurity, op1.security);
        assert.deepEqual(op1.getSecurity(), swaggerApi.definition.security);

        assert.deepEqual(op2.getSecurity(), op2.security);
      });
    });

    describe('#validateRequest', function () {
      describe('validate Content-Type', function () {
        var baseRequest = {
          url: '/pet',
          body: {
            name: 'Test Pet',
            photoUrls: []
          }
        };

        describe('operation level consumes', function () {
          var operation;

          before(function () {
            operation = swaggerApi.getOperation('/pet', 'post');
          });

          it('should return an error for an unsupported value', function () {
            var request = _.cloneDeep(baseRequest);
            var results;

            request.headers = {
              'content-type': 'application/x-yaml'
            };

            results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, 1);
          });

          it('should handle an undefined value (defaults to application/octet-stream)', function () {
            var request = _.cloneDeep(baseRequest);
            var results;

            request.headers = {};

            results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_CONTENT_TYPE',
                message: 'Invalid Content-Type (application/octet-stream).  ' +
                        'These are supported: application/json, application/xml',
                path: []
              }
            ]);
          });

          it('should not return an error for a supported value', function () {
            var request = _.cloneDeep(baseRequest);
            var results;

            request.headers = {
              'content-type': 'application/json'
            };

            results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, 0);
          });
        });

        // We only need one test to make sure that we're using the global consumes

        it('should handle global level consumes', function (done) {
          var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

          cSwaggerDoc.consumes = cSwaggerDoc.paths['/pet'].post.consumes;

          delete cSwaggerDoc.paths['/pet'].post.consumes;

          Sway.create({
            definition: cSwaggerDoc
          })
            .then(function (api) {
              var operation = api.getOperation('/pet', 'post');
              var request = _.cloneDeep(baseRequest);
              var results;

              request.headers = {
                'content-type': 'application/x-yaml'
              };

              results = operation.validateRequest(request);

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

          cSwaggerDoc.paths['/pet'].post.consumes.push(mimeType);

          Sway.create({
            definition: cSwaggerDoc
          })
            .then(function (api) {
              var request = _.cloneDeep(baseRequest);
              var results;

              request.headers = {
                'content-type': mimeType
              };

              results = api.getOperation('/pet', 'post').validateRequest(request);

              assert.equal(results.warnings.length, 0);
              assert.equal(results.errors.length, 0);
            })
            .then(done, done);
        });
      });

      describe('validate parameters', function () {
        // We do not need to exhaustively test parameter validation since we're basically just relying on
        // ParameterValue's validation and which is heavily tested elsewhere.

        it('should return an error for invalid non-primitive parameters', function () {
          var operation = swaggerApi.getOperation('/pet', 'post');
          var results = operation.validateRequest({
            url: '/v2/pet',
            headers: {
              'content-type': 'application/json'
            },
            body: {},
            files: {}
          });

          assert.equal(results.warnings.length, 0);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_REQUEST_PARAMETER',
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
              in: 'body',
              message: 'Invalid parameter (body): Value failed JSON Schema validation',
              name: 'body',
              path: ['paths', '/pet', 'post', 'parameters', '0']
            }
          ]);
        });

        it('should return an error for invalid primitive parameters', function () {
          var operation = swaggerApi.getOperation('/pet/{petId}/uploadImage', 'post');
          var results = operation.validateRequest({
            url: '/v2/pet/notANumber/uploadImage',
            headers: {
              'content-type': 'multipart/form-data'
            },
            body: {},
            files: {}
          });

          assert.equal(results.warnings.length, 0);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_REQUEST_PARAMETER',
              errors: [
                {
                  code: 'INVALID_TYPE',
                  message: 'Expected type integer but found type string',
                  path: []
                }
              ],
              in: 'path',
              message: 'Invalid parameter (petId): Expected type integer but found type string',
              name: 'petId',
              path: []
            }
          ]);
        });

        it('should not return an error for valid parameters', function () {
          var operation = swaggerApi.getOperation('/pet/{petId}', 'post');
          var results = operation.validateRequest({
            url: '/v2/pet/1',
            headers: {
              'content-type': 'application/x-www-form-urlencoded'
            },
            body: {
              name: 'New Pet',
              status: 'available'
            }
          });

          assert.equal(results.errors.length, 0);
          assert.equal(results.warnings.length, 0);
        });
      });
    });

    describe('#validateResponse', function () {
      // We only test that Operation#validateResponse handles missing responses because the testing of the remainder
      // is in test-response.js.
      describe('should return an error for undefined response', function () {
        it('undefined value but no default', function () {
          var results = swaggerApi.getOperation('/pet', 'post').validateResponse();

          assert.deepEqual(results.warnings, []);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_RESPONSE_CODE',
              message: 'This operation does not have a defined \'default\' response code',
              path: []
            }
          ]);
        });

        it('provided value', function () {
          var results = swaggerApi.getOperation('/pet/{petId}', 'post').validateResponse({
            statusCode: 201
          });

          assert.deepEqual(results.warnings, []);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_RESPONSE_CODE',
              message: 'This operation does not have a defined \'201\' or \'default\' response code',
              path: []
            }
          ]);
        });
      });

      it('should return the \'default\' response when validating an undefined response', function () {
        var results = swaggerApi.getOperation('/user', 'post').validateResponse({
          statusCode: 201
        });

        assert.deepEqual(results.errors, []);
        assert.deepEqual(results.warnings, []);
      });
    });
  });
});
