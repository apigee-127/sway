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

describe('issues (Swagger 2.0)', function () {
  var sway;

  before(function (done) {
    helpers.getSway(function (api) {
      sway = api;

      done();
    });
  });

  it('should trap document processing errors (Issue 16)', function (done) {
    var cSwagger = _.cloneDeep(helpers.swaggerDoc);

    cSwagger.paths['/pet/{petId}'].get = null;

    helpers.swaggerApi.create({
      definition: cSwagger
    })
      .then(function () {
        tHelpers.shouldHadFailed();
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
    helpers.swaggerApi.create({
      definition: './2.0/swagger-relative-refs.yaml',
      jsonRefs: {
        relativeBase: tHelpers.relativeBase
      }
    })
      .then(function () {
        assert.ok(_.isUndefined(sway.resolved.info.$ref));
        assert.ok(Object.keys(sway.resolved.definitions).length > 1);
        assert.ok(Object.keys(sway.resolved.paths).length > 1);
        assert.equal(sway.resolved.info.title, 'Swagger Petstore');
        assert.ok(_.isPlainObject(sway.resolved.definitions.Pet));
        assert.ok(_.isPlainObject(sway.resolved.paths['/pet/{petId}'].get));

        _.each(sway.references, function (entry) {
          assert.ok(typeof entry.missing === 'undefined');
        });
      })
      .then(done, done);
  });

  it('should not throw an error for unknown formats (Issue 20)', function (done) {
    var cSwaggerDoc = _.cloneDeep(helpers.swaggerDoc);

    cSwaggerDoc.definitions.Pet.properties.name.format = 'unknown';

    helpers.swaggerApi.create({
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

    helpers.swaggerApi.create({
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
      sway.getOperation('/pet/{petId}', 'get').getParameter('petId').getValue(mockReq);
    } catch (err) {
      tHelpers.shouldNotHadFailed();
    }
  });

  it('should validate file parameters based on existence alone (Issue 37)', function () {
    var mockFile = {
      originalname: 'swagger.yaml',
      mimetype: 'application/x-yaml'
    };
    var paramValue = sway.getOperation('/pet/{petId}/uploadImage', 'post').getParameter('file').getValue({
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

    helpers.swaggerApi.create({
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

    helpers.swaggerApi.create({
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

    helpers.swaggerApi.create({
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

    helpers.swaggerApi.create({
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
});
