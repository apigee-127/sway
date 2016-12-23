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

describe('issues', function () {
  var swaggerApi;

  before(function (done) {
    helpers.getSwaggerApi(function (api) {
      swaggerApi = api;

      done();
    });
  });

  it('should trap document processing errors (Issue 16)', function (done) {
    var cSwagger = _.cloneDeep(helpers.swaggerDoc);

    cSwagger.paths['/pet/{petId}'].get = null;

    Sway.create({
      definition: cSwagger
    })
      .then(function () {
        helpers.shouldHadFailed();
      })
      .catch(function (err) {
        var errorMessages = [
          'Cannot read property \'consumes\' of null', // Node.js
          'null is not an object (evaluating \'definitionFullyResolved.consumes\')' // PhantomJS (browser)
        ];

        assert.ok(errorMessages.indexOf(err.message) > -1);
      })
      .then(done, done);
  });

  it('should support relative references (and to YAML files) (Issue 17)', function (done) {
    helpers.getSwaggerApiRelativeRefs(function (swaggerApiRelativeRefs) {
      assert.ok(_.isUndefined(swaggerApiRelativeRefs.definitionFullyResolved.info.$ref));
      assert.ok(Object.keys(swaggerApiRelativeRefs.definitionFullyResolved.definitions).length > 1);
      assert.ok(Object.keys(swaggerApiRelativeRefs.definitionFullyResolved.paths).length > 1);
      assert.equal(swaggerApiRelativeRefs.definitionFullyResolved.info.title, 'Swagger Petstore');
      assert.ok(_.isPlainObject(swaggerApiRelativeRefs.definitionFullyResolved.definitions.Pet));
      assert.ok(_.isPlainObject(swaggerApiRelativeRefs.definitionFullyResolved.paths['/pet/{petId}'].get));

      _.each(swaggerApiRelativeRefs.references, function (entry) {
        assert.ok(typeof entry.missing === 'undefined');
      });

      done();
    })
  });

  it('should support external nested references', function (done) {
    Sway.create({
      definition: helpers.swaggerDocNestedRefsPath
    })
      .then(function (api) {
        var entry = api.references['#/definitions/x/properties/children/items'];
        assert.ok(typeof entry.missing === 'undefined');
      })
      .then(done, done);
  });

  it('should not throw an error for unknown formats (Issue 20)', function (done) {
    var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

    cSwaggerDoc.definitions.Pet.properties.name.format = 'unknown';

    Sway.create({
      definition: cSwaggerDoc
    })
      .then(function (api) {
        assert.ok(api.validate());
      })
      .then(done, done);
  });

  it('should handle default and id fields (Issue 29)', function (done) {
    var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

    cSwaggerDoc.definitions.Pet.properties.default = {type: 'string'};

    Sway.create({
      definition: cSwaggerDoc
    })
      .then(function (api) {
        assert.ok(api.validate());
      })
      .then(done, done);
  });

  it('should handle request objects that are not plain objects (Issue 35)', function () {
    var mockReq = new Object(); // eslint-disable-line no-new-object

    mockReq.url = '/pet/1';

    try {
      swaggerApi.getOperation('/pet/{petId}', 'get').getParameter('petId').getValue(mockReq);
    } catch (err) {
      helpers.shouldNotHadFailed();
    }
  });

  it('should validate file parameters based on existence alone (Issue 37)', function () {
    var mockFile = {
      originalname: 'swagger.yaml',
      mimetype: 'application/x-yaml'
    };
    var paramValue = swaggerApi.getOperation('/pet/{petId}/uploadImage', 'post').getParameter('file').getValue({
      url: '/pet/1/uploadImage',
      files: {
        file: mockFile
      }
    });

    assert.deepEqual(paramValue.raw, mockFile);
    assert.deepEqual(paramValue.value, mockFile);
    assert.ok(_.isUndefined(paramValue.error));
    assert.ok(paramValue.valid);
  });

  it('should handle allOf $ref to a definition with circular reference (Issue 38)', function (done) {
    var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

    cSwaggerDoc.definitions.A = {
      allOf: [
        {
          $ref: '#/definitions/B'
        }
      ],
      properties: {
        b: {
          $ref: '#/definitions/B'
        }
      }
    };

    cSwaggerDoc.definitions.B = {
      properties: {
        a: {
          $ref: '#/definitions/A'
        }
      }
    };

    cSwaggerDoc.definitions.C = {
      allOf: [
        {
          $ref: '#/definitions/A'
        }
      ]
    };

    Sway.create({
      definition: cSwaggerDoc
    })
      .then(function (api) {
        assert.ok(api.validate());
      })
      .then(done, done);
  });

  it('string value for object type (Issue #46)', function (done) {
    var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

    cSwaggerDoc.paths['/user/login'].get.responses['200'].schema = {
      properties: {
        message: {
          type: 'string'
        }
      },
      type: 'object'
    };

    Sway.create({
      definition: cSwaggerDoc
    })
      .then(function (api) {
        var results;

        results = api.getOperation('/user/login', 'get').validateResponse({
          body: 'If-Match header required',
          encoding: 'utf-8',
          headers: {
            'content-type': 'application/json'
          },
          statusCode: 200
        });

        // Prior to this fix, the error would be related to JSON.parse not being able to parse the string
        assert.deepEqual(results, {
          errors: [
            {
              code: 'INVALID_RESPONSE_BODY',
              errors: [
                {
                  code: 'INVALID_TYPE',
                  message: 'Expected type object but found type string',
                  params: ['object', 'string'],
                  path: []
                }
              ],
              message: 'Invalid body: Expected type object but found type string',
              path: []
            }
          ],
          warnings: []
        });
      })
      .then(done, done);
  });

  it('Buffer value for object type (Issue #46)', function (done) {
    var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

    cSwaggerDoc.paths['/user/login'].get.responses['200'].schema = {
      properties: {
        message: {
          type: 'string'
        }
      },
      type: 'object'
    };

    Sway.create({
      definition: cSwaggerDoc
    })
      .then(function (api) {
        var rawValue = 'If-Match header required';
        var results;
        var value;

        // Browsers do not have a 'Buffer' type so we basically skip this test
        if (typeof window === 'undefined') {
          value = new Buffer(rawValue);
        } else {
          value = rawValue;
        }

        results = api.getOperation('/user/login', 'get').validateResponse({
          body: value,
          encoding: 'utf-8',
          headers: {
            'content-type': 'application/json'
          },
          statusCode: 200
        });

        // Prior to this fix, the error would be related to JSON.parse not being able to parse the string
        assert.deepEqual(results, {
          errors: [
            {
              code: 'INVALID_RESPONSE_BODY',
              errors: [
                {
                  code: 'INVALID_TYPE',
                  message: 'Expected type object but found type string',
                  params: ['object', 'string'],
                  path: []
                }
              ],
              message: 'Invalid body: Expected type object but found type string',
              path: []
            }
          ],
          warnings: []
        });
      })
      .then(done, done);
  });

  it('should handle hierchical query parameters (Issue 39)', function (done) {
    var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

    cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
      name: 'page[limit]',
        in: 'query',
      description: 'The maximum number of records to return',
      type: 'integer'
    });
    cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
      name: 'page[nested][offset]',
        in: 'query',
      description: 'The page',
      type: 'integer'
    });

    Sway.create({
      definition: cSwaggerDoc
    })
      .then(function (api) {
        var req = {
          query: {
            page: {
              limit: '100',
              nested: {
                offset: '1'
              }
            }
          }
        };
        var pageLimitParam = api.getOperation('/pet/findByStatus', 'get').getParameter('page[limit]');
        var pageLimitParamValue = pageLimitParam.getValue(req);
        var pageOffsetParam = api.getOperation('/pet/findByStatus', 'get').getParameter('page[nested][offset]');
        var pageOffsetParamValue = pageOffsetParam.getValue(req);

        assert.equal(pageLimitParamValue.raw, req.query.page.limit)
        assert.equal(pageLimitParamValue.value, 100);

        assert.equal(pageOffsetParamValue.raw, req.query.page.nested.offset);
        assert.equal(pageOffsetParamValue.value, 1);
      })
      .then(done, done);
  });

  it('should not validate optional parameters that are undefined (Issue 60)', function (done) {
    var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

    cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
      name: 'alive',
        in: 'query',
      description: 'Whether the animal is alive or not',
      type: 'boolean'
    });

    Sway.create({
      definition: cSwaggerDoc
    })
      .then(function (api) {
        assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').validateRequest({
          query: {}
        }), {
          errors: [],
          warnings: []
        })
      })
      .then(done, done);
  });

  it('should not throw an error for optional strings that are undefined (Issue 60)', function (done) {
    var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

    cSwaggerDoc.paths['/pet/findByStatus'].get.parameters.push({
      name: 'nickname',
        in: 'query',
      description: 'The pet\' nickname',
      type: 'string'
    });

    Sway.create({
      definition: cSwaggerDoc
    })
      .then(function (api) {
        assert.deepEqual(api.getOperation('/pet/findByStatus', 'get').validateRequest({
          query: {}
        }), {
          errors: [],
          warnings: []
        })
      })
      .then(done, done);
  });

  describe('should handle mixed-case headers for validation (Issue 67)', function () {
    it('parameter processing', function () {
      var parameterValue = swaggerApi.getOperation('/pet/{petId}', 'DELETE').getParameter('api_key').getValue({
        headers: {
          'ApI_KeY': 'Testing'
        }
      });

      assert.equal(parameterValue.value, 'Testing');
    });

    it('request validation', function () {
      var results = swaggerApi.getOperation('/pet', 'POST').validateRequest({
        url: '/pet',
        body: {
          name: 'Test Pet',
          photoUrls: []
        },
        headers: {
          'CoNtEnT-TyPe': 'application/json'
        }
      });

      assert.equal(results.warnings.length, 0);
      assert.equal(results.errors.length, 0);
    });

    it('response validation', function () {
      var results = swaggerApi.getOperation('/pet/findByStatus', 'GET').validateResponse({
        headers: {
          'CoNtEnT-TyPe': 'application/json'
        },
        statusCode: 200,
        body: [
          {
            name: 'Test Pet',
            photoUrls: []
          }
        ]
      });

      assert.equal(results.warnings.length, 0);
      assert.equal(results.errors.length, 0);
    });
  });
});
