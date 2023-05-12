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
const helpers = require('./helpers');

const Sway = helpers.getSway();

function runTests(mode) {
  const label = mode === 'with-refs' ? 'with' : 'without';
  let apiDefinition;

  before((done) => {
    function callback(apiDef) {
      apiDefinition = apiDef;

      done();
    }

    if (mode === 'with-refs') {
      helpers.getApiDefinitionRelativeRefs(callback);
    } else {
      helpers.getApiDefinition(callback);
    }
  });

  describe(`should handle OpenAPI document ${label} relative references`, () => {
    it('should handle composite parameters', () => {
      const method = 'post';
      const path = '/pet/{petId}';

      const operation = apiDefinition.getOperation(path, method);
      const pathDef = apiDefinition.definitionFullyResolved.paths['/pet/{petId}'];

      assert.equal(operation.pathObject.path, path);
      assert.equal(operation.method, method);
      assert.equal(operation.ptr, `#/paths/~1pet~1{petId}/${method}`);

      _.each(operation.definition, (val, key) => {
        assert.deepEqual(val, pathDef[method][key]);
      });

      assert.equal(operation.parameterObjects.length, 3);
    });

    it('should handle explicit parameters', () => {
      const method = 'post';
      const path = '/pet/{petId}/uploadImage';
      const operation = apiDefinition.getOperation(path, method);
      const pathDef = apiDefinition.definitionRemotesResolved.paths[path];
      const pathDefFullyResolved = apiDefinition.definitionFullyResolved.paths[path];

      assert.equal(operation.pathObject.path, path);
      assert.equal(operation.method, method);
      assert.equal(operation.ptr, '#/paths/~1pet~1{petId}~1uploadImage/post');

      _.each(operation.definition, (val, key) => {
        if (key === 'security') {
          assert.deepEqual(val, [
            {
              petstore_auth: [
                'read:pets',
                'write:pets',
              ],
            },
          ]);
        } else {
          assert.deepEqual(val, pathDef[method][key]);
        }
      });

      _.each(operation.definitionFullyResolved, (val, key) => {
        if (key === 'security') {
          assert.deepEqual(val, [
            {
              petstore_auth: [
                'read:pets',
                'write:pets',
              ],
            },
          ]);
        } else {
          assert.deepEqual(val, pathDefFullyResolved[method][key]);
        }
      });
    });

    it('should take global security definitions', () => {
      const method = 'post';
      const path = '/pet/{petId}/uploadImage';
      const operation = apiDefinition.getOperation(path, method);

      assert.ok(typeof operation.securityDefinitions !== 'undefined', 'Should define securityDefinitions');
      assert.ok(typeof operation.securityDefinitions.petstore_auth !== 'undefined', 'Should take \'petstore_auth\' from global security');
      assert.deepEqual(operation.securityDefinitions.petstore_auth, apiDefinition.securityDefinitions.petstore_auth);
    });

    it('should handle explicit parameters', () => {
      assert.deepEqual(apiDefinition.getOperation('/user/{username}', 'get').security, [
        {
          api_key: [],
        },
      ]);
    });

    function validateRegExps(api, basePath) {
      const createPet = api.getOperation('/pet', 'post');
      const updatePet = api.getOperation('/pet/{petId}', 'post');

      // Make sure they are of the proper type
      assert.ok(createPet.pathObject.regexp instanceof RegExp);
      assert.ok(updatePet.pathObject.regexp instanceof RegExp);

      // Make sure they have the proper keys
      assert.equal(0, createPet.pathObject.regexp.keys.length);
      assert.equal(1, updatePet.pathObject.regexp.keys.length);
      assert.equal('petId', updatePet.pathObject.regexp.keys[0].name);

      // Make sure they match the expected URLs
      assert.ok(_.isArray(createPet.pathObject.regexp.exec(`${basePath}/pet`)));
      assert.ok(!_.isArray(createPet.pathObject.regexp.exec(`${basePath}/pets`)));
      assert.ok(_.isArray(updatePet.pathObject.regexp.exec(`${basePath}/pet/1`)));
      assert.ok(!_.isArray(createPet.pathObject.regexp.exec(`${basePath}/pets/1`)));
    }

    it('should create proper regexp (with basePath)', () => {
      validateRegExps(apiDefinition, apiDefinition.basePath);
    });

    it('should create proper regexp (with basePath ending in slash)', (done) => {
      const cOAIDoc = _.cloneDeep(helpers.oaiDoc);

      cOAIDoc.basePath = '/';

      Sway.create({ definition: cOAIDoc })
        .then((apiDef) => {
          validateRegExps(apiDef, '');
        })
        .then(done, done);
    });

    it('should create proper regexp (without basePath)', (done) => {
      const cOAIDoc = _.cloneDeep(helpers.oaiDoc);

      delete cOAIDoc.basePath;

      Sway.create({ definition: cOAIDoc })
        .then((apiDef) => {
          validateRegExps(apiDef, '');
        })
        .then(done, done);
    });

    describe('#getParameter', () => {
      it('should return the proper response', (done) => {
        const cOAIDoc = _.cloneDeep(helpers.oaiDoc);

        cOAIDoc.paths['/pet/{petId}'].get.parameters = [
          {
            description: 'This is a duplicate name but different location',
            name: 'petId',
            in: 'query',
            type: 'string',
          },
        ];

        Sway.create({ definition: cOAIDoc })
          .then((apiDef) => {
            const operation = apiDef.getOperation('/pet/{petId}', 'get');

            assert.ok(_.isUndefined(operation.getParameter()));
            assert.ok(_.isUndefined(operation.getParameter('missing')));
            assert.ok(_.isUndefined(operation.getParameter('petId', 'header')));
            assert.deepEqual(
              operation.getParameter('petId', 'path').definition,
              cOAIDoc.paths['/pet/{petId}'].parameters[0],
            );
            assert.deepEqual(
              operation.getParameter('petId', 'query').definition,
              cOAIDoc.paths['/pet/{petId}'].get.parameters[0],
            );
          })
          .then(done, done);
      });
    });

    // More vigorous testing of the Parameter object itself and the parameter composition are done elsewhere
    describe('#getParameters', () => {
      it('should return the proper parameter objects', () => {
        const operation = apiDefinition.getOperation('/pet/{petId}', 'post');

        assert.deepEqual(operation.getParameters(), operation.parameterObjects);
      });
    });

    describe('#getSecurity', () => {
      it('should return the proper parameter objects', () => {
        const op1 = apiDefinition.getOperation('/pet/{petId}', 'post');
        const op2 = apiDefinition.getOperation('/store/inventory', 'get');

        assert.notDeepEqual(op1.getSecurity, op1.security);
        assert.deepEqual(op1.getSecurity(), apiDefinition.definition.security);

        assert.deepEqual(op2.getSecurity(), op2.security);
      });
    });

    describe('#validateRequest', () => {
      it('should throw TypeError for invalid arguments', () => {
        const scenarios = [
          [[], 'req is required'],
          [[true], 'req must be an object'],
          [[{}, 'test'], 'options must be an object'],
          [[{}, { customValidators: 'test' }], 'options.customValidators must be an array'],
          [[{}, { customValidators: [function () {}, 'test'] }], 'options.customValidators at index 1 must be a function'],
          [[{}, { strictMode: 'test' }], 'options.strictMode must be a boolean or an object'],
          [[{}, { strictMode: { formData: 'test' } }], 'options.strictMode.formData must be a boolean'],
          [[{}, { strictMode: { header: 'test' } }], 'options.strictMode.header must be a boolean'],
          [[{}, { strictMode: { query: 'test' } }], 'options.strictMode.query must be a boolean'],
        ];
        const operation = apiDefinition.getOperation('/pet', 'post');

        _.forEach(scenarios, (scenario) => {
          try {
            operation.validateRequest(...scenario[0]);

            helpers.shouldHadFailed();
          } catch (err) {
            assert.equal(scenario[1], err.message);
          }
        });
      });

      describe('validate Content-Type', () => {
        const baseRequest = {
          url: '/pet',
          body: {
            name: 'Test Pet',
            photoUrls: [],
          },
        };

        describe('operation level consumes - ignore when empty', () => {
          let operation;

          before(() => {
            // this path+op doesn't specify 'consumes'
            operation = apiDefinition.getOperation('/pet/findByStatus', 'get');
          });

          it('should not return an unsupported content-type error', () => {
            const request = {
              url: '/pet/findByStatus',
              query: {
                status: 'sold',
              },
              headers: {
                'content-type': 'application/json', // extraneous content-type header
              },
            };
            const results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, 0);
          });
        });

        describe('operation level consumes', () => {
          let operation;

          before(() => {
            operation = apiDefinition.getOperation('/pet', 'post');
          });

          it('should return an error for an unsupported value', () => {
            const request = _.cloneDeep(baseRequest);
            request.headers = {
              'content-type': 'application/x-yaml',
            };
            const results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, 1);
          });

          it('should handle an undefined value (defaults to application/octet-stream)', () => {
            const request = _.cloneDeep(baseRequest);
            request.headers = {};
            const results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_CONTENT_TYPE',
                message: 'Invalid Content-Type (application/octet-stream).  '
                        + 'These are supported: application/json, application/xml',
                path: [],
              },
            ]);
          });

          it('should not return an error for a supported value', () => {
            const request = _.cloneDeep(baseRequest);
            request.headers = {
              'content-type': 'application/json',
            };
            const results = operation.validateRequest(request);

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, 0);
          });
        });

        // We only need one test to make sure that we're using the global consumes

        it('should handle global level consumes', (done) => {
          const cOAIDoc = _.cloneDeep(helpers.oaiDoc);

          cOAIDoc.consumes = cOAIDoc.paths['/pet'].post.consumes;

          delete cOAIDoc.paths['/pet'].post.consumes;

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const operation = apiDef.getOperation('/pet', 'post');
              const request = _.cloneDeep(baseRequest);
              request.headers = {
                'content-type': 'application/x-yaml',
              };
              const results = operation.validateRequest(request);

              assert.equal(results.warnings.length, 0);
              assert.deepEqual(results.errors, [
                {
                  code: 'INVALID_CONTENT_TYPE',
                  message: 'Invalid Content-Type (application/x-yaml).  '
                    + 'These are supported: application/json, application/xml',
                  path: [],
                },
              ]);
            })
            .then(done, done);
        });

        it('should handle mime-type parameters (exact match)', (done) => {
          const cOAIDoc = _.cloneDeep(helpers.oaiDoc);
          const mimeType = 'application/x-yaml; charset=utf-8';

          cOAIDoc.paths['/pet'].post.consumes.push(mimeType);

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const request = _.cloneDeep(baseRequest);
              request.headers = {
                'content-type': mimeType,
              };
              const results = apiDef.getOperation('/pet', 'post').validateRequest(request);

              assert.equal(results.warnings.length, 0);
              assert.equal(results.errors.length, 0);
            })
            .then(done, done);
        });

        it('should not return an INVALID_CONENT_TYPE error for empty body (Issue 164)', (done) => {
          const cOAIDoc = _.cloneDeep(helpers.oaiDoc);

          cOAIDoc.paths['/user'].post.parameters[0].required = false;
          cOAIDoc.paths['/user'].post.consumes = ['application/json'];

          Sway.create({
            definition: cOAIDoc,
          })
            .then((apiDef) => {
              const results = apiDef.getOperation('/user', 'post').validateRequest({});

              assert.equal(results.warnings.length, 0);
              assert.equal(results.errors.length, 0);
            })
            .then(done, done);
        });
      });

      describe('validate parameters', () => {
        // We do not need to exhaustively test parameter validation since we're basically just relying on
        // ParameterValue's validation and which is heavily tested elsewhere.

        it('should return an error for invalid non-primitive parameters', () => {
          const operation = apiDefinition.getOperation('/pet', 'post');
          const results = operation.validateRequest({
            url: '/v2/pet',
            headers: {
              'content-type': 'application/json',
            },
            body: {},
            files: {},
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
                  path: [],
                },
                {
                  code: 'OBJECT_MISSING_REQUIRED_PROPERTY',
                  message: 'Missing required property: name',
                  params: ['name'],
                  path: [],
                },
              ],
              in: 'body',
              message: 'Invalid parameter (body): Value failed JSON Schema validation',
              name: 'body',
              path: ['paths', '/pet', 'post', 'parameters', '0'],
            },
          ]);
        });

        it('should return an error for invalid primitive parameters', () => {
          const operation = apiDefinition.getOperation('/pet/{petId}/uploadImage', 'post');
          const results = operation.validateRequest({
            url: '/v2/pet/notANumber/uploadImage',
            headers: {
              'content-type': 'multipart/form-data',
            },
            body: {},
            files: {
              file: {},
            },
          });

          assert.equal(results.warnings.length, 0);
          assert.deepEqual(results.errors, [
            {
              code: 'INVALID_REQUEST_PARAMETER',
              errors: [
                {
                  code: 'INVALID_TYPE',
                  message: 'Expected type integer but found type string',
                  path: [],
                },
              ],
              in: 'path',
              message: 'Invalid parameter (petId): Expected type integer but found type string',
              name: 'petId',
              path: [],
            },
          ]);
        });

        it('should not return an error for valid parameters', () => {
          const operation = apiDefinition.getOperation('/pet/{petId}', 'post');
          const results = operation.validateRequest({
            url: '/v2/pet/1',
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
            },
            body: {
              name: 'New Pet',
              status: 'available',
            },
          });

          assert.equal(results.errors.length, 0);
          assert.equal(results.warnings.length, 0);
        });
      });

      it('should validate strict mode', () => {
        const invalidRequest = {
          body: {
            extra: 'extra',
            name: 'Pet 1',
          },
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
          query: {
            extra: 'extra',
          },
          url: '/v2/pet/1',
        };
        const scenarios = [
          [[], []],
          [[{
            strictMode: false,
          }], []],
          [[{
            strictMode: {},
          }], []],
          [[{
            strictMode: {
              formData: false,
              header: false,
              query: false,
            },
          }], []],
          [[{ strictMode: true }], ['formData', 'header', 'query']],
          [[{
            strictMode: {
              formData: true,
              header: true,
              query: true,
            },
          }], ['formData', 'header', 'query']],
          [[{
            strictMode: {
              header: true,
            },
          }], ['header']],
        ];
        const operation = apiDefinition.getOperation('/pet/{petId}', 'post');

        _.forEach(scenarios, (scenario) => {
          const results = operation.validateRequest(...[invalidRequest].concat(scenario[0]));

          assert.equal(results.warnings.length, 0);
          assert.equal(results.errors.length, scenario[1].length);

          _.forEach(scenario[1], (location) => {
            let codeSuffix = location.toUpperCase();
            let name = 'extra';

            switch (location) {
              case 'formData':
                codeSuffix = 'FORM_DATA';
                location = 'form data field';
                break;
              case 'header':
                name = 'content-type';
                break;
              case 'query':
                location = 'query parameter';
                break;

              // no default
            }

            assert.ok(_.findIndex(results.errors, (err) => _.isEqual(err, {
              code: `REQUEST_ADDITIONAL_${codeSuffix}`,
              message: `Additional ${location} not allowed: ${name}`,
              path: [],
            })) > -1);
          });
        });
      });

      it('should process custom validators', () => {
        const error = {
          code: 'FAKE_ERROR',
          message: 'This is a fake error!',
          path: [],
        };
        const operation = apiDefinition.getOperation('/pet/findByStatus', 'get');
        const req = {
          query: {
            status: 'sold',
          },
        };
        const warning = {
          code: 'FAKE_WARNING',
          message: 'This is a fake warning!',
          path: [],
        };

        assert.deepEqual(operation.validateRequest(req, {
          customValidators: [
            function (target, op) {
              assert.deepEqual(target, req);

              helpers.checkType(op, 'Operation');

              return {
                errors: [
                  error,
                ],
              };
            },
            function (target, op) {
              assert.deepEqual(target, req);

              helpers.checkType(op, 'Operation');

              return {
                warnings: [
                  warning,
                ],
              };
            },
          ],
        }), {
          errors: [error],
          warnings: [warning],
        });
      });
    });

    describe('#validateResponse', () => {
      it('should throw TypeError for invalid arguments', () => {
        const res = {
          statusCode: 200,
        };
        const scenarios = [
          [[], 'res is required'],
          [[true], 'res must be an object'],
          [[res, 'test'], 'options must be an object'],
          [[res, { customValidators: 'test' }], 'options.customValidators must be an array'],
          [[res, { customValidators: [function () {}, 'test'] }], 'options.customValidators at index 1 must be a function'],
          [[res, { strictMode: 'test' }], 'options.strictMode must be a boolean or an object'],
          [[res, { strictMode: { formData: 'test' } }], 'options.strictMode.formData must be a boolean'],
          [[res, { strictMode: { header: 'test' } }], 'options.strictMode.header must be a boolean'],
          [[res, { strictMode: { query: 'test' } }], 'options.strictMode.query must be a boolean'],
        ];
        const operation = apiDefinition.getOperation('/pet/findByStatus', 'get');

        _.forEach(scenarios, (scenario) => {
          try {
            operation.validateResponse(...scenario[0]);

            helpers.shouldHadFailed();
          } catch (err) {
            assert.equal(err.message, scenario[1]);
          }
        });
      });

      it('should not return an INVALID_CONENT_TYPE error for empty body (Issue 164)', (done) => {
        const cOAIDoc = _.cloneDeep(helpers.oaiDoc);

        cOAIDoc.paths['/user'].post.produces = ['application/xml'];
        cOAIDoc.paths['/user'].post.responses.default.schema = {
          type: 'object',
        };

        Sway.create({
          definition: cOAIDoc,
        })
          .then((apiDef) => {
            const results = apiDef.getOperation('/user', 'post').validateResponse({
              headers: {
                'Content-Type': 'application/json',
              },
            });

            assert.equal(results.warnings.length, 0);
            assert.deepEqual(results.errors, [
              {
                code: 'INVALID_RESPONSE_BODY',
                errors: [
                  {
                    code: 'INVALID_TYPE',
                    params: ['object', 'undefined'],
                    message: 'Expected type object but found type undefined',
                    path: [],
                  },
                ],
                message: 'Invalid body: Expected type object but found type undefined',
                path: [],
              },
            ]);
          })
          .then(done, done);
      });

      // We only test that Operation#validateResponse handles missing responses because the testing of the remainder
      // is in test-response.js.
      it('should return an error for undefined response', () => {
        const results = apiDefinition.getOperation('/pet/{petId}', 'post').validateResponse({
          statusCode: 201,
        });

        assert.deepEqual(results.warnings, []);
        assert.deepEqual(results.errors, [
          {
            code: 'INVALID_RESPONSE_CODE',
            message: 'This operation does not have a defined \'201\' or \'default\' response code',
            path: [],
          },
        ]);
      });

      it('should use the \'default\' response for undefined response status code', () => {
        const results = apiDefinition.getOperation('/user', 'post').validateResponse({
          statusCode: 201,
        });

        assert.deepEqual(results.errors, []);
        assert.deepEqual(results.warnings, []);
      });

      it('should process custom validators', () => {
        const error = {
          code: 'FAKE_ERROR',
          message: 'This is a fake error!',
          path: [],
        };
        const res = {
          body: [
            {
              name: 'Test Pet',
              photoUrls: [],
            },
          ],
          headers: {
            'Content-Type': 'application/json',
          },
        };
        const resObj = apiDefinition.getOperation('/pet/findByStatus', 'get').getResponse(200);
        const warning = {
          code: 'FAKE_WARNING',
          message: 'This is a fake warning!',
          path: [],
        };

        assert.deepEqual(resObj.validateResponse(res, {
          customValidators: [
            function (target, op) {
              assert.deepEqual(target, res);

              helpers.checkType(op, 'Response');

              return {
                errors: [
                  error,
                ],
              };
            },
            function (target, op) {
              assert.deepEqual(target, res);

              helpers.checkType(op, 'Response');

              return {
                warnings: [
                  warning,
                ],
              };
            },
          ],
        }), {
          errors: [error],
          warnings: [warning],
        });
      });
    });

    it('should validate strict mode', (done) => {
      const invalidRequest = {
        body: {
          extra: 'extra',
          name: 'Pet 1',
          photoUrls: [],
        },
        headers: {
          'content-type': 'application/json',
        },
        query: {
          extra: 'extra',
        },
        url: '/v2/pet/1',
      };
      const scenarios = [
        [[], []],
        [[{
          strictMode: false,
        }], []],
        [[{
          strictMode: {},
        }], []],
        [[{
          strictMode: {
            formData: false,
            header: false,
            query: false,
          },
        }], []],
        [[{
          strictMode: true,
        }], ['header']],
        [[{
          strictMode: {
            formData: true,
            header: true,
            query: true,
          },
        }], ['header']],
        [[{
          strictMode: {
            header: true,
          },
        }], ['header']],
      ];
      const cOAIDoc = _.cloneDeep(helpers.oaiDoc);

      cOAIDoc.paths['/pet/{petId}'].post.responses.default = {
        description: 'successful operation',
        schema: {
          $ref: '#/definitions/Pet',
        },
      };

      Sway.create({ definition: cOAIDoc })
        .then((apiDef) => {
          _.forEach(scenarios, (scenario) => {
            const operation = apiDef.getOperation('/pet/{petId}', 'post');
            const results = operation.validateResponse(...[invalidRequest].concat(scenario[0]));

            assert.equal(results.warnings.length, 0);
            assert.equal(results.errors.length, scenario[1].length);

            _.forEach(scenario[1], () => {
              assert.ok(_.findIndex(results.errors, (err) => _.isEqual(err, {
                code: 'REQUEST_ADDITIONAL_HEADER',
                message: 'Additional header not allowed: content-type',
                path: [],
              })) > -1);
            });
          });
        })
        .then(done, done);
    });
  });
}

describe('Operation', () => {
  // OpenAPI document without references
  runTests('no-refs');
  // OpenAPI document with references
  runTests('with-refs');
});
