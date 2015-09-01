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
var JsonRefs = require('json-refs');
var swaggerApi = typeof window === 'undefined' ? require('..') : window.SwaggerApi;
var pathLoader = require('path-loader');
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

describe('sway (Swagger 2.0)', function () {
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

  describe('sway#create', function () {
    function validateCreateSwaggerApi (options) {
      return function (theApi) {
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
        assert.ok(_.isArray(theApi.pathObjects));
        assert.ok(theApi.pathObjects.length > 0);
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

  describe('general', function () {
    describe('format generators', function () {
      it('byte', function (done) {
        var cSwaggerDoc = _.cloneDeep(swaggerDoc);

        cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
          name: 'byte',
          in: 'query',
          type: 'string',
          format: 'byte'
        });

        swaggerApi.create({
          definition: cSwaggerDoc
        })
          .then(function (api) {
            assert.ok(_.isString(api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getSample()));
          })
          .then(done, done);
      });

      it('password', function (done) {
        var cSwaggerDoc = _.cloneDeep(swaggerDoc);

        cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
          name: 'byte',
            in: 'query',
          type: 'string',
          format: 'password'
        });

        swaggerApi.create({
          definition: cSwaggerDoc
        })
          .then(function (api) {
            assert.ok(_.isString(api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getSample()));
          })
          .then(done, done);
      });
    });

    describe('format validators', function () {
      it('always truthy', function (done) {
        var cSwaggerDoc = _.cloneDeep(swaggerDoc);

        cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
          name: 'byte',
            in: 'query',
          type: 'string',
          format: 'byte',
          default: 'pretendThisIsABase64EncodedString'
        });

        cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
          name: 'double',
            in: 'query',
          type: 'number',
          format: 'double',
          default: 1.1
        });

        cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
          name: 'float',
            in: 'query',
          type: 'number',
          format: 'float',
          default: 1.1
        });

        cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
          name: 'password',
            in: 'query',
          type: 'string',
          format: 'password',
          default: 'somepassword'
        });

        swaggerApi.create({definition: cSwaggerDoc})
          .then(function (api) {
            assert.ok(api.validate());
          })
          .then(done, done);
      });

      describe('int32', function () {
        var badParam;
        var goodParam;

        before(function (done) {
          var cSwaggerDoc = _.cloneDeep(swaggerDoc);

          cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
            name: 'int32',
              in: 'query',
            type: 'integer',
            format: 'int32'
          });

          // Test the format validator using parameter validation
          swaggerApi.create({definition: cSwaggerDoc})
            .then(function (api) {
              badParam = api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getValue({
                query: {
                  int32: 1.1
                }
              });
              goodParam = api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getValue({
                query: {
                  int32: 1
                }
              });
            })
            .then(done, done);
        });

        it('bad value', function () {
          var error = badParam.error;

          assert.ok(!badParam.valid);
          assert.ok(!_.isUndefined(badParam.value));
          assert.equal(badParam.raw, 1.1);
          assert.equal(error.message, 'Value failed JSON Schema validation');
          assert.equal(error.code, 'SCHEMA_VALIDATION_FAILED');
          assert.ok(error.failedValidation);
          assert.deepEqual(error.errors, [
            {
              code: 'INVALID_TYPE',
              message: 'Expected type integer but found type number',
              path: []
            }
          ]);
        });

        it('good value', function () {
          assert.ok(goodParam.valid);
        });
      });

      describe('int64', function () {
        var badParam;
        var goodParam;

        before(function (done) {
          var cSwaggerDoc = _.cloneDeep(swaggerDoc);

          cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
            name: 'int64',
              in: 'query',
            type: 'integer',
            format: 'int64'
          });

          // Test the format validator using parameter validation
          swaggerApi.create({definition: cSwaggerDoc})
            .then(function (api) {
              badParam = api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getValue({
                query: {
                  int64: 1.1
                }
              });
              goodParam = api.getOperation('/pet/findByStatus', 'get').getParameters()[1].getValue({
                query: {
                  int64: 1
                }
              });
            })
            .then(done, done);
        });

        it('bad value', function () {
          var error = badParam.error;

          assert.ok(!badParam.valid);
          assert.ok(!_.isUndefined(badParam.value));
          assert.equal(badParam.raw, 1.1);
          assert.equal(error.message, 'Value failed JSON Schema validation');
          assert.equal(error.code, 'SCHEMA_VALIDATION_FAILED');
          assert.ok(error.failedValidation);
          assert.deepEqual(error.errors, [
            {
              code: 'INVALID_TYPE',
              message: 'Expected type integer but found type number',
              path: []
            }
          ]);
        });

        it('good value', function () {
          assert.ok(goodParam.valid);
        });
      });
    });
  });

  describe('Operation', function () {
    it('should handle composite parameters', function () {
      var method = 'post';
      var path = '/pet/{petId}';
      var operation = swagger.getOperation(path, method);
      var pathDef = swagger.resolved.paths[path];
      var operationDef = swagger.resolved.paths[path][method];

      assert.equal(operation.pathObject.path, path);
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
    });

    it('should handle explicit parameters', function () {
      var method = 'post';
      var path = '/pet/{petId}/uploadImage';
      var operation = swagger.getOperation(path, method);
      var pathDef = swagger.resolved.paths[path];

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
    });

    it('should handle composite security', function () {
      var operation = swagger.getOperation('/pet/{petId}', 'get');

      assert.deepEqual(operation.security, [
        {
          'petstore_auth': [
            'read:pets',
            'write:pets'
          ]
        }
      ]);
      assert.deepEqual(operation.securityDefinitions, {
        'petstore_auth': swagger.resolved.securityDefinitions.petstore_auth
      });
    });

    it('should handle explicit parameters', function () {
      assert.deepEqual(swagger.getOperation('/user/{username}', 'get').security, [
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
      validateRegExps(swagger, swagger.basePath);
    });

    it('should create proper regexp (with basePath ending in slash)', function (done) {
      var cSwagger = _.cloneDeep(swaggerDoc);

      cSwagger.basePath = '/';

      swaggerApi.create({definition: cSwagger})
        .then(function (api) {
          validateRegExps(api, '');
        })
        .then(done, done);
    });

    it('should create proper regexp (without basePath)', function (done) {
      var cSwagger = _.cloneDeep(swaggerDoc);

      delete cSwagger.basePath;

      swaggerApi.create({definition: cSwagger})
        .then(function (api) {
          validateRegExps(api, '');
        })
        .then(done, done);
    });

    // More vigorous testing of the Parameter object itself and the parameter composition are done elsewhere
    describe('#getParameters', function () {
      it('should return the proper parameter objects', function () {
        var operation = swagger.getOperation('/pet/{petId}', 'post');

        assert.deepEqual(operation.getParameters(), operation.parameterObjects);
      });
    });

    describe('#getResponseExample', function () {
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
        var cSwaggerDoc = _.cloneDeep(swaggerDoc);
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

        swaggerApi.create({
          definition: cSwaggerDoc
        })
          .then(function (api) {
            operation = api.getOperation('/pet/{petId}', 'get');
          })
          .then(done, done);
      });

      it('should return default response example when no code is provided', function () {
        assert.deepEqual(operation.getResponseExample('application/json'), JSON.stringify(example, null, 2));
      });

      it('should return the proper response example for the provided code', function () {
        assert.deepEqual(operation.getResponseExample(200, 'application/json'), JSON.stringify(example, null, 2));
      });

      it('should return the proper response example for non-string example (YAML)', function () {
        assert.deepEqual(operation.getResponseExample(200, 'application/x-yaml'), YAML.safeDump(example, {indent: 2}));
      });

      it('should return the proper response example for string example', function () {
        assert.deepEqual(operation.getResponseExample('application/xml'), exampleXML);
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

    describe('#getValue', function () {
      describe('raw values', function () {
        describe('body', function () {
          var parameter;

          before(function () {
            parameter = swagger.getOperation('/pet', 'post').getParameters()[0];
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
            parameter = swagger.getOperation('/pet/{petId}/uploadImage', 'post').getParameters()[2];
          });

          it('missing req.files', function () {
            try {
              parameter.getValue({});

              shouldHadFailed();
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
            parameter = swagger.getOperation('/pet/{petId}', 'post').getParameters()[1];
          });

          it('missing req.body', function () {
            try {
              parameter.getValue({});

              shouldHadFailed();
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
            parameter = swagger.getOperation('/pet/{petId}', 'delete').getParameters()[1];
          });

          it('missing req.headers', function () {
            try {
              parameter.getValue({});

              shouldHadFailed();
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
            parameter = swagger.getOperation('/pet/{petId}', 'post').getParameters()[0];
          });

          it('missing req.url', function () {
            try {
              parameter.getValue({});

              shouldHadFailed();
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
            var cSwagger = _.cloneDeep(swaggerDoc);

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

            swaggerApi.create({
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
            parameter = swagger.getOperation('/pet/findByStatus', 'get').getParameters()[0];
          });

          it('missing req.query', function () {
            try {
              parameter.getValue({});

              shouldHadFailed();
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
          var cSwagger = _.cloneDeep(swaggerDoc);

          cSwagger.paths['/pet/{petId}'].parameters[0].in = 'invalid';

          swaggerApi.create({
            definition: cSwagger
          })
            .then(function (api) {
              try {
                api.getOperation('/pet/{petId}', 'get').getParameters()[0].getValue({});

                shouldHadFailed();
              } catch (err) {
                assert.equal(err.message, 'Invalid \'in\' value: invalid');
              }
            })
            .then(done, done);
        });

        it('missing request', function () {
          try {
            swagger.getOperation('/pet/{petId}', 'get').getParameters()[0].getValue();

            shouldHadFailed();
          } catch (err) {
            assert.equal(err.message, 'req is required');
          }
        });

        it('wrong request type', function () {
          try {
            swagger.getOperation('/pet/{petId}', 'get').getParameters()[0].getValue('wrong type');

            shouldHadFailed();
          } catch (err) {
            assert.equal(err.message, 'req must be an object');
          }
        });
      });

      describe('processed values', function () {
        describe('getter', function () {
          var parameter;

          before(function () {
            parameter = swagger.getOperation('/pet/{petId}', 'get').getParameters()[0];
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
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.paths['/pet/findByStatus'].get.parameters[0].items = [
                {
                  type: 'string',
                  default: 'available'
                },
                {
                  type: 'integer'
                }
              ];

              swaggerApi.create({
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
              var cSwagger = _.cloneDeep(swaggerDoc);

              swaggerApi.create({
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
              var cSwagger = _.cloneDeep(swaggerDoc);

              swaggerApi.create({
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
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.paths['/pet/findByStatus'].get.parameters[0].items = [
                {
                  type: 'string'
                },
                {
                  type: 'integer'
                }
              ];

              swaggerApi.create({
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
              var cSwagger = _.cloneDeep(swaggerDoc);

              delete cSwagger.paths['/pet/findByStatus'].get.parameters[0].items.default;

              swaggerApi.create({
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
              var cSwagger = _.cloneDeep(swaggerDoc);

              swaggerApi.create({
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
                var cSwagger = _.cloneDeep(swaggerDoc);

                cSwagger.paths['/pet/findByStatus'].get.parameters[0].items = [
                  {
                    type: 'string'
                  },
                  {
                    type: 'string'
                  }
                ];

                swaggerApi.create({
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
                assert.deepEqual(swagger.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {
                    status: [
                      'available', 'pending'
                    ]
                  }
                }).value, ['available', 'pending']);
              });

              it('non-array string request value', function () {
                assert.deepEqual(swagger.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {
                    status: 'pending'
                  }
                }).value, ['pending']);
              });

              it('non-array, non-string request value', function () {
                assert.deepEqual(swagger.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {
                    status: 1 // We cannot use string because it would be processed by different logic
                  }
                }).value, [1]);
              });

              it('array request value', function () {
                assert.deepEqual(swagger.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
                  query: {
                    status: ['available', 'pending']
                  }
                }).value, ['available', 'pending']);
              });

              describe('collectionFormat', function () {
                it('default (csv)', function (done) {
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  delete cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat;

                  swaggerApi.create({
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
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'csv';

                  swaggerApi.create({
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
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  swaggerApi.create({
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
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'pipes';

                  swaggerApi.create({
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
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'ssv';

                  swaggerApi.create({
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
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'tsv';

                  swaggerApi.create({
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
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.paths['/pet/findByStatus'].get.parameters[0].collectionFormat = 'invalid';

                  swaggerApi.create({
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
                var cSwagger = _.cloneDeep(swaggerDoc);

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

                swaggerApi.create({
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
                var cSwagger = _.cloneDeep(swaggerDoc);

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

                swaggerApi.create({
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

              it('invalid request value', function () {
                var paramValue = cParam.getValue({
                  query: {
                    limit: 'invalid'
                  }
                });

                assert.ok(_.isUndefined(paramValue.value));
                assert.equal(paramValue.error.message, 'Not a valid integer: invalid');
              });
            });

            describe('object', function () {
              var pet = {
                name: 'My Pet'
              };
              var cParam;

              before(function () {
                cParam = swagger.getOperation('/pet', 'post').getParameters()[0];
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
                var cSwagger = _.cloneDeep(swaggerDoc);

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

                swaggerApi.create({
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

              it('invalid request value', function () {
                var paramValue = cParam.getValue({
                  query: {
                    limit: 'invalid'
                  }
                });

                assert.ok(_.isUndefined(paramValue.value));
                assert.equal(paramValue.error.message, 'Not a valid number: invalid');
              });
            });

            describe('string', function () {
              var cParam;

              before(function () {
                cParam = swagger.getOperation('/pet/{petId}', 'post').getParameters()[1];
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
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.paths['/pet/{petId}'].parameters.push({
                    name: 'createdBefore',
                    in: 'query',
                    description: 'Find pets created before',
                    type: 'string',
                    format: 'date'
                  });

                  swaggerApi.create({
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
                  var cSwagger = _.cloneDeep(swaggerDoc);

                  cSwagger.paths['/pet/{petId}'].parameters.push({
                    name: 'createdBefore',
                      in: 'query',
                    description: 'Find pets created before',
                    type: 'string',
                    format: 'date-time'
                  });

                  swaggerApi.create({
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
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.paths['/pet/findByStatus'].get.parameters[0].items.type = 'invalid';

              swaggerApi.create({
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
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.paths['/pet/findByStatus'].get.parameters[0].items = [
                {
                  type: 'string'
                },
                {
                  type: 'string'
                }
              ];

              swaggerApi.create({
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
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.paths['/pet'].post.parameters[0].schema = {};

              swaggerApi.create({
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
          var paramValue = swagger.getOperation('/pet/findByStatus', 'get').getParameters()[0].getValue({
            query: {}
          });

          assert.deepEqual(paramValue.value, ['available']);
          assert.ok(paramValue.valid);
          assert.ok(_.isUndefined(paramValue.error));
        });

        it('missing required value (without default)', function () {
          var paramValue = swagger.getOperation('/pet/findByTags', 'get').getParameters()[0].getValue({
            query: {}
          });
          var error = paramValue.error;

          assert.ok(_.isUndefined(paramValue.value));
          assert.ok(paramValue.valid === false);
          assert.equal(error.message, 'Value is required but was not provided');
          assert.equal(error.code, 'REQUIRED');
          assert.ok(error.failedValidation);
        });

        it('provided required value', function () {
          var pet = {
            name: 'Sparky',
            photoUrls: []
          };
          var paramValue = swagger.getOperation('/pet', 'post').getParameters()[0].getValue({
            body: pet
          });

          assert.deepEqual(paramValue.value, pet);
          assert.ok(_.isUndefined(paramValue.error));
          assert.ok(paramValue.valid);
        });

        it('provided value fails JSON Schema validation', function () {
          var paramValue = swagger.getOperation('/pet', 'post').getParameters()[0].getValue({
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

  describe('Path', function () {
    it('should have proper structure', function () {
      var path = '/pet/{petId}';
      var pathObject = swagger.getOperation(path, 'get').pathObject;

      assert.deepEqual(pathObject.api, swagger);
      assert.equal(pathObject.path, path);
      assert.equal(pathObject.ptr, JsonRefs.pathToPointer(['paths', path]));
      assert.deepEqual(pathObject.definition, swagger.resolved.paths[path]);

      // Make sure they are of the proper type
      assert.ok(pathObject.regexp instanceof RegExp);

      // Make sure they have the proper keys
      assert.equal(1, pathObject.regexp.keys.length);
      assert.equal('petId', pathObject.regexp.keys[0].name);

      // Make sure they match the expected URLs
      assert.ok(_.isArray(pathObject.regexp.exec(swagger.resolved.basePath + '/pet/1')));
      assert.ok(!_.isArray(pathObject.regexp.exec(swagger.resolved.basePath + '/pets/1')));
    });

    describe('#getOperation', function () {
      it('should return the expected operation', function () {
        assert.ok(!_.isUndefined(swagger.getPath('/pet/{petId}').getOperation('get')));
      });

      it('should return no operation for the missing method', function () {
        assert.ok(_.isUndefined(swagger.getPath('/pet/{petId}').getOperation('head')));
      });
    });

    describe('#getOperations', function () {
      it('should return the expected operations', function () {
        assert.equal(swagger.getPath('/pet/{petId}').getOperations().length, 3);
      });

      it('should return no operations', function (done) {
        var cSwagger = _.cloneDeep(swaggerDoc);
        var path = '/petz';

        cSwagger.paths[path] = {};

        swaggerApi.create({
          definition: cSwagger
        }).then(function (api) {
          assert.equal(api.getPath(path).getOperations().length, 0);
        }).then(done, done);
      });
    });

    describe('#getOperationsByTag', function () {
      it('should return the expected operations', function () {
        assert.equal(swagger.getPath('/pet/{petId}').getOperationsByTag('pet').length, 3);
      });

      it('should return no operations', function () {
        assert.equal(swagger.getPath('/pet/{petId}').getOperationsByTag('petz').length, 0);
      });
    });

    describe('#getParameters', function () {
      it('should return the expected parameters', function () {
        var parameters = swagger.getPath('/pet/{petId}').getParameters();

        assert.equal(parameters.length, 1);
      });

      it('should return no parameters', function () {
        assert.equal(swagger.getPath('/pet').getParameters().length, 0);
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
      describe('path + method', function () {
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

      describe('http.ClientRequest (or similar)', function () {
        it('should return the expected operation', function () {
          assert.ok(!_.isUndefined(swagger.getOperation({
            method: 'GET',
            url: swagger.basePath + '/pet/1'
          })));
        });

        it('should return no operation for missing path', function () {
          assert.ok(_.isUndefined(swagger.getOperation({
            method: 'GET',
            url: swagger.basePath + '/petz/1'
          })));
        });

        it('should return no operation for missing method', function () {
          assert.ok(_.isUndefined(swagger.getOperation({
            method: 'HEAD',
            url: swagger.basePath + '/pet/1'
          })));
        });
      });
    });

    describe('#getOperationsByTag', function () {
      it('should return no operation for incorrect tag', function () {
        var operations = swagger.getOperationsByTag('incorrect tag');

        assert.equal(operations.length, 0);
      });

      it('should return all operations for the given tag', function () {
        var operations = swagger.getOperationsByTag('store');

        assert.equal(operations.length,
                     getOperationCount(swagger.definition.paths['/store/inventory']) +
                     getOperationCount(swagger.definition.paths['/store/order']) +
                     getOperationCount(swagger.definition.paths['/store/order/{orderId}']));
      });
    });

    describe('#getPath', function () {
      describe('path', function () {
        it('should return the expected path object', function () {
          assert.ok(!_.isUndefined(swagger.getPath('/pet/{petId}')));
        });

        it('should return no path object', function () {
          assert.ok(_.isUndefined(swagger.getPath('/petz/{petId}')));
        });
      });

      describe('http.ClientRequest (or similar)', function () {
        it('should return the expected path object', function () {
          assert.ok(!_.isUndefined(swagger.getPath({
            url: swagger.basePath + '/pet/1'
          })));
        });

        it('should return no path object', function () {
          assert.ok(_.isUndefined(swagger.getPath({
            url: swagger.basePath + '/petz/1'
          })));
        });
      });
    });

    describe('#getPaths', function () {
      it('should return the expected path objects', function () {
        assert.equal(swagger.getPaths().length, Object.keys(swagger.resolved.paths).length);
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

        describe('circular composition/inheritance', function () {
          it('definition (direct)', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

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

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    message: 'Schema object inherits from itself: #/definitions/B',
                    path: ['definitions', 'A', 'allOf', '0', '$ref']
                  },
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    message: 'Schema object inherits from itself: #/definitions/A',
                    path: ['definitions', 'B', 'allOf', '0', '$ref']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });

          it('definition (indirect)', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

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

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    message: 'Schema object inherits from itself: #/definitions/B',
                    path: ['definitions', 'A', 'allOf', '0', '$ref']
                  },
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    message: 'Schema object inherits from itself: #/definitions/C',
                    path: ['definitions', 'B', 'allOf', '0', '$ref']
                  },
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    message: 'Schema object inherits from itself: #/definitions/A',
                    path: ['definitions', 'C', 'allOf', '0', '$ref']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });

          it('inline schema', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

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

            swaggerApi.create({
              definition: cSwagger
            })
              .then(function (api) {
                var result = api.validate();

                assert.ok(result === false);
                assert.deepEqual([], api.getLastWarnings());
                assert.deepEqual([
                  {
                    code: 'CIRCULAR_INHERITANCE',
                    message: 'Schema object inherits from itself: #/definitions/A/allOf/0',
                    path: ['definitions', 'A', 'allOf', '0', 'allOf', '0', '$ref']
                  }
                ], api.getLastErrors());
              })
              .then(done, done);
          });

          it('not composition/inheritance', function (done) {
            var cSwagger = _.cloneDeep(swaggerDoc);

            cSwagger.definitions.Pet.properties.friends = {
              type: 'array',
              items: {
                $ref: '#/definitions/Pet'
              }
            };

            swaggerApi.create({
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
          describe('json reference', function () {
            it('local', function (done) {
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

            it('remote', function (done) {
              var cSwagger = _.cloneDeep(swaggerDoc);

              cSwagger.paths['/pet'].post.parameters[0].schema.$ref = 'fake.json';

              swaggerApi.create({
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

  describe('issues', function () {
    it('should trap document processing errors (Issue 16)', function (done) {
      var cSwagger = _.cloneDeep(swaggerDoc);

      cSwagger.paths['/pet/{petId}'].get = null;

      swaggerApi.create({
        definition: cSwagger
      })
        .then(function () {
          shouldHadFailed();
        })
        .catch(function (err) {
          var errorMessages = [
            'Cannot read property \'parameters\' of null', // Node.js
            '\'null\' is not an object (evaluating \'operation.parameters\')' // PhantomJS (browser)
          ];

          assert.ok(errorMessages.indexOf(err.message) > -1);
        })
        .then(done, done);
    });

    it('should support relative references (and to YAML files) (Issue 17)', function (done) {
      swaggerApi.create({
        definition: 'http://localhost:44444/swagger-relative-refs.yaml'
      })
        .then(function () {
          assert.ok(_.isUndefined(swagger.resolved.info.$ref));
          assert.ok(Object.keys(swagger.resolved.definitions).length > 1);
          assert.ok(Object.keys(swagger.resolved.paths).length > 1);
          assert.equal(swagger.resolved.info.title, 'Swagger Petstore');
          assert.ok(_.isPlainObject(swagger.resolved.definitions.Pet));
          assert.ok(_.isPlainObject(swagger.resolved.paths['/pet/{petId}'].get));

          _.each(swagger.references, function (entry) {
            assert.ok(typeof entry.missing === 'undefined');
          });
        })
        .then(done, done);
    });
  });
});
