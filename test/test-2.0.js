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

var _ = require('lodash-compat');
var assert = require('assert');
var swaggerApi = require('..');
var pathLoader = require('path-loader');
var types = require('../lib/types');
var YAML = require('js-yaml');

var implementation = require('../lib/versions/2.0');
var swaggerDocPath = 'http://localhost:44444/swagger.yaml';

describe('swagger-core-api (Swagger 2.0)', function () {
  describe('#create', function () {
    var swaggerDoc;

    before(function (done) {
      pathLoader
        .load(swaggerDocPath)
        .then(YAML.safeLoad)
        .then(function (json) {
          swaggerDoc = json;

          done();
        }, function (err) {
          done(err);
        });
    });

    function validateCreateSwaggerApi (document) {
      return function (swagger) {
        assert.ok(swagger instanceof types.SwaggerApi);
        assert.deepEqual(swaggerDoc, swagger.document);
        assert.equal(implementation.documentation, swagger.documentation);
        assert.equal(implementation.version, swagger.version);

        if (_.isString(document)) {
          assert.equal(document, swagger.originalLocation);
        } else {
          assert.ok(_.isUndefined(swagger.originalLocation));
        }
      };
    }

    function validateCreateSwaggerApiCallback (document, done) {
      return function (err, theApi) {
        assert.ok(_.isUndefined(err));

        validateCreateSwaggerApi(document)(theApi);

        done();
      };
    }

    describe('promises', function () {
      it('should handle document object', function (done) {
        swaggerApi.create({
          document: swaggerDoc
        })
          .then(validateCreateSwaggerApi(swaggerDoc))
          .then(done, done);
      });

      it('should handle document file location', function (done) {
        swaggerApi.create({
          document: swaggerDocPath
        })
          .then(validateCreateSwaggerApi(swaggerDocPath))
          .then(done, done);
      });

      // TODO: Add test for document file URL (remote)
    });

    describe('callbacks', function () {
      it('should handle document object', function (done) {
        swaggerApi.create({
          document: swaggerDoc
        }, validateCreateSwaggerApiCallback(swaggerDoc, done))
          .catch(done);
      });

      it('should handle document file location', function (done) {
        swaggerApi.create({
          document: swaggerDocPath
        }, validateCreateSwaggerApiCallback(swaggerDocPath, done))
          .catch(done);
      });

      // TODO: Add test for document file URL (remote)
    });
  });
});
