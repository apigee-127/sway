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

var invalidCreateScenarios = [
  [[], 'options is required'],
  [['wrongType'], 'options must be an object'],
  [[{}], 'options.definition is required'],
  [[{definition: false}], 'options.definition must be either an object or a string'],
  [[{definition: {}, jsonRefs: 'wrongType'}], 'options.jsonRefs must be an object'],
  [[{definition: {}, customFormats: 'wrongType'}], 'options.customFormats must be an array'],
  [[{definition: {}, customFormats: ['wrongType']}], 'options.customFormats at index 0 must be a function'],
  [[{definition: {}, customFormatGenerators: 'wrongType'}], 'options.customFormatGenerators must be an array'],
  [[{definition: {}, customFormatGenerators: ['wrongType']}],
    'options.customFormatGenerators at index 0 must be a function'],
  [[{definition: {}, customValidators: 'wrongType'}], 'options.customValidators must be an array'],
  [[{definition: {}, customValidators: ['wrongType']}], 'options.customValidators at index 0 must be a function']
];

describe('sway', function () {
  describe('sway#create', function () {
    function validateCreateSwaggerApi (options) {
      return function (theApi) {
        assert.deepEqual(theApi.definition, helpers.swaggerDoc);
        assert.equal(theApi.documentationUrl,
                     'https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md');
        assert.deepEqual(theApi.options, options);
        assert.equal(theApi.version, '2.0');

        // Make sure all references were found
        _.forEach(theApi.references, function (details) {
          assert.ok(!_.has(details, 'missing'));
        });

        // Validate the merging of the Swagger definition properties and the SwaggerApi properties
        _.forEach(helpers.swaggerDoc, function (val, key) {
          assert.deepEqual(theApi[key], val);
        });

        // Validate the operations (Simple tests for now, deeper testing is below)
        assert.ok(_.isArray(theApi.pathObjects));
        assert.ok(theApi.pathObjects.length > 0);

        // Validate the registration of customValidator on SwaggerApi
        assert.deepEqual(theApi.customValidators, options.customValidators || [])
      };
    }

    it('should always return a promise', function () {
      assert.ok(Sway.create({
        definition: helpers.swaggerDoc
      }) instanceof Promise);
      assert.ok(Sway.create({
        definition: helpers.swaggerDoc
      }, function () {}) instanceof Promise);
    });

    it('should return proper error', function (done) {
      var allTests = Promise.resolve();

      _.each(invalidCreateScenarios, function (scenario, index) {
        allTests = allTests
          .then(function () {
            return new Promise(function (resolve, reject) {
              Sway.create.apply(Sway, scenario[0])
                .then(function () {
                  reject(new Error('Sway#create should had failed (Test #' + index + ')'));
                }, function (err) {
                  try {
                    assert.ok(err instanceof TypeError);
                    assert.equal(err.message, scenario[1]);

                    resolve();
                  } catch (err2) {
                    reject(err2);
                  }
                });
            });
          });
      });

      allTests.then(done, done);
    });

    it('should handle definition object', function (done) {
      var options = {
        definition: helpers.swaggerDoc
      };

      Sway.create(options)
        .then(validateCreateSwaggerApi(options))
        .then(done, done);
    });

    it('should handle definition file location', function (done) {
      var options = {
        definition: helpers.swaggerDocPath
      };

      Sway.create(options)
        .then(validateCreateSwaggerApi(options))
        .then(done, done);
    });

    it('should register customValidators', function (done) {
      var options = {
        definition: helpers.swaggerDoc,
        customValidators: [
          function validator1 () {
            return {
              errors: [],
              warnings: []
            };
          }
        ]
      };

      Sway.create(options)
        .then(validateCreateSwaggerApi(options))
        .then(done, done);
    });

    // TODO: Add test for definition file URL (remote)
  });
});
