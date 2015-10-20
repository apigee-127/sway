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
var tHelpers = require('../../helpers'); // Helpers for tests
var YAML = require('js-yaml');

describe('Operation (Swagger 2.0)', function () {
  var sway;

  before(function (done) {
    helpers.getSway(function (api) {
      sway = api;

      done();
    });
  });

  it('should handle composite parameters', function () {
    var method = 'post';
    var path = '/pet/{petId}';
    var operation = sway.getOperation(path, method);
    var pathDef = sway.resolved.paths[path];
    var operationDef = sway.resolved.paths[path][method];

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
    var operation = sway.getOperation(path, method);
    var pathDef = sway.resolved.paths[path];

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
    var operation = sway.getOperation('/pet/{petId}', 'get');

    assert.deepEqual(operation.security, [
      {
        'petstore_auth': [
          'read:pets',
          'write:pets'
        ]
      }
    ]);
    assert.deepEqual(operation.securityDefinitions, {
      'petstore_auth': sway.resolved.securityDefinitions.petstore_auth
    });
  });

  it('should handle explicit parameters', function () {
    assert.deepEqual(sway.getOperation('/user/{username}', 'get').security, [
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
    validateRegExps(sway, sway.basePath);
  });

  it('should create proper regexp (with basePath ending in slash)', function (done) {
    var cSwagger = _.cloneDeep(helpers.swaggerDoc);

    cSwagger.basePath = '/';

    helpers.swaggerApi.create({definition: cSwagger})
      .then(function (api) {
        validateRegExps(api, '');
      })
      .then(done, done);
  });

  it('should create proper regexp (without basePath)', function (done) {
    var cSwagger = _.cloneDeep(helpers.swaggerDoc);

    delete cSwagger.basePath;

    helpers.swaggerApi.create({definition: cSwagger})
      .then(function (api) {
        validateRegExps(api, '');
      })
      .then(done, done);
  });

  // More vigorous testing of the Parameter object itself and the parameter composition are done elsewhere
  describe('#getParameters', function () {
    it('should return the proper parameter objects', function () {
      var operation = sway.getOperation('/pet/{petId}', 'post');

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

      helpers.swaggerApi.create({
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
        sway.getOperation('/pet/{petId}', 'get').getResponseSchema('fake');

        tHelpers.shouldHadFailed();
      } catch (err) {
        assert.equal(err.message, 'This operation does not have a defined \'fake\' response code');
      }
    });

    it('should return default response when no code is provided', function () {
      var operation = sway.getOperation('/user', 'post');

      assert.deepEqual(operation.getResponseSchema(), operation.definition.responses.default.schema);
    });

    it('should return the proper schema for the provided code', function () {
      var operation = sway.getOperation('/pet/{petId}', 'get');

      assert.deepEqual(operation.getResponseSchema(200), operation.definition.responses['200'].schema);
    });
  });

  describe('#getResponseSample', function () {
    it('should throw an Error for invalid response code', function () {
      try {
        sway.getOperation('/pet/{petId}', 'get').getResponseSample('fake');

        tHelpers.shouldHadFailed();
      } catch (err) {
        assert.equal(err.message, 'This operation does not have a defined \'fake\' response code');
      }
    });

    it('should return sample for default response when no code is provided', function () {
      assert.ok(_.isUndefined(sway.getOperation('/user', 'post').getResponseSample()));
    });

    it('should return sample for the requested response code', function () {
      var operation = sway.getOperation('/pet/{petId}', 'get');

      try {
        sHelpers.validateAgainstSchema(helpers.swaggerDocValidator,
                                       operation.getResponseSchema(200),
                                       operation.getResponseSample(200));
      } catch (err) {
        tHelpers.shouldNotHadFailed(err);
      }
    });

    it('should return undefined for void response', function () {
      assert.ok(_.isUndefined(sway.getOperation('/pet', 'post').getResponseSample(405)));
    });
  });
});
