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
var tHelpers = require('../../helpers');

// This should be broken out into a test framework that runs the same tests against the different version(s) of Swagger
// we support but for now, only one version is supported so let's keep it simple.

describe('sway (Swagger 2.0)', function () {
  describe('#create', function () {
    function validateCreateSwaggerApi (options) {
      return function (theApi) {
        assert.deepEqual(theApi.definition, helpers.swaggerDoc);
        assert.equal(theApi.documentation, helpers.plugin.documentation);
        assert.deepEqual(theApi.options, options);
        assert.equal(theApi.version, helpers.plugin.version);

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

    it('should handle definition object', function (done) {
      var options = {
        definition: helpers.swaggerDoc
      };

      helpers.swaggerApi.create(options)
        .then(validateCreateSwaggerApi(options))
        .then(done, done);
    });

    it('should handle definition file location', function (done) {
      var options = {
        definition: helpers.swaggerDocPath,
        jsonRefs: {
          relativeBase: tHelpers.relativeBase
        }
      };

      helpers.swaggerApi.create(options)
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

      helpers.swaggerApi.create(options)
        .then(validateCreateSwaggerApi(options))
        .then(done, done);
    });

    // TODO: Add test for definition file URL (remote)
  });
});
