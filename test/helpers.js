/* eslint-env browser, mocha */

/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Jeremy Whitlock
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

var assert = require('assert');
var fs = require('fs');
var helpers = require('../lib/helpers');
var path = require('path');
var Sway = typeof window === 'undefined' ? require('..') : window.Sway;
var YAML = require('js-yaml');

var documentBase = path.join(__dirname, 'browser', 'documents');
var relativeBase = typeof window === 'undefined' ? documentBase : 'base/documents';
var swaggerDoc = YAML.safeLoad(fs.readFileSync(path.join(__dirname, './browser/documents/2.0/swagger.yaml'), 'utf8'));
var swaggerDocRelativeRefs = YAML.safeLoad(fs.readFileSync(path.join(__dirname, './browser/documents/2.0/swagger-relative-refs.yaml'), 'utf8'));
var swaggerDocPolymorphic = YAML.safeLoad(fs.readFileSync(path.join(__dirname, './browser/documents/2.0/swagger-polymorphic.yaml'), 'utf8'));
var swaggerDocValidator = helpers.getJSONSchemaValidator();
var swaggerApi;
var swaggerApiPolymorphic;
var swaggerApiRelativeRefs;

function fail (msg) {
  assert.fail(msg);
}

module.exports.documentBase = documentBase;

module.exports.fail = fail;

module.exports.getSwaggerApi = function (callback) {
  if (swaggerApi) {
    callback(swaggerApi);
  } else {
    Sway.create({
      definition: swaggerDoc
    })
      .then(function (obj) {
        swaggerApi = obj;

        callback(swaggerApi);
      }, function (err) {
        callback(err);
      });
  }
};

module.exports.getSwaggerApiRelativeRefs = function (callback) {
  if (swaggerApiRelativeRefs) {
    callback(swaggerApiRelativeRefs);
  } else {
    Sway.create({
      definition: swaggerDocRelativeRefs,
      jsonRefs: {relativeBase: path.join(relativeBase, './2.0')}
    })
      .then(function (obj) {
        swaggerApiRelativeRefs = obj;

        callback(swaggerApiRelativeRefs);
      }, function (err) {
        callback(err);
      });
  }
};

module.exports.getSwaggerApiPolymorphic = function (callback) {
  if (swaggerApiPolymorphic) {
    callback(swaggerApiPolymorphic);
  } else {
    Sway.create({
      definition: swaggerDocPolymorphic,
      jsonRefs: {relativeBase: path.join(relativeBase, './2.0')}
    })
      .then(function (obj) {
        swaggerApiPolymorphic = obj;

        callback(swaggerApiPolymorphic);
      }, function (err) {
        callback(err);
      });
  }
};

module.exports.getSway = function () {
  return Sway;
};

module.exports.shouldHadFailed = function () {
  fail('The code above should had thrown an error');
};

module.exports.shouldNotHadFailed = function (err) {
  console.error(err.stack);

  fail('The code above should not had thrown an error');
};

module.exports.swaggerDoc = swaggerDoc;

module.exports.swaggerDocPath = path.join(relativeBase, './2.0/swagger.yaml');

module.exports.swaggerDocRelativeRefsPath = path.join(relativeBase, './2.0/swagger-relative-refs.yaml');

module.exports.swaggerDocValidator = swaggerDocValidator;
