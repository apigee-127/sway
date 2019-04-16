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
var Sway = require('..');
var YAML = require('js-yaml');

var documentBase = path.join(__dirname, 'browser', 'documents');
var relativeBase = typeof window === 'undefined' ? documentBase : 'base/browser/documents';
var oaiDoc = YAML.safeLoad(fs.readFileSync(path.join(__dirname, './browser/documents/2.0/swagger.yaml'), 'utf8'));
var oaiDocCircular = YAML.safeLoad(fs.readFileSync(path.join(__dirname,
                                                             './browser/documents/2.0/swagger-circular.yaml'),
                                                   'utf8'));
var oaiDocRelativeRefs = YAML.safeLoad(fs.readFileSync(path.join(__dirname,
                                                                 './browser/documents/2.0/swagger-relative-refs.yaml'),
                                                       'utf8'));
var oaiDocValidator = helpers.getJSONSchemaValidator();
var apiDefinition;
var apiDefinitionCircular;
var apiDefinitionRelativeRefs;

function fail (msg) {
  assert.fail(msg);
}

module.exports.checkType = function (obj, expectedType) {
  assert.equal(obj.constructor.name, expectedType);
}

module.exports.documentBase = documentBase;

module.exports.fail = fail;

module.exports.getApiDefinition = function (callback) {
  if (apiDefinition) {
    callback(apiDefinition);
  } else {
    Sway.create({
      definition: oaiDoc
    })
      .then(function (obj) {
        apiDefinition = obj;

        callback(apiDefinition);
      }, function (err) {
        callback(err);
      });
  }
};

module.exports.getApiDefinitionCircular = function (callback) {
  if (apiDefinitionCircular) {
    callback(apiDefinitionCircular);
  } else {
    Sway.create({
      definition: oaiDocCircular,
      jsonRefs: {
        resolveCirculars: true
      }
    })
      .then(function (obj) {
        apiDefinitionCircular = obj;

        callback(apiDefinitionCircular);
      }, function (err) {
        callback(err);
      });
  }
};

module.exports.getApiDefinitionRelativeRefs = function (callback) {
  if (apiDefinitionRelativeRefs) {
    callback(apiDefinitionRelativeRefs);
  } else {
    Sway.create({
      definition: oaiDocRelativeRefs,
      jsonRefs: {location: path.join(relativeBase, './2.0/swagger-relative-refs.yaml')}
    })
      .then(function (obj) {
        apiDefinitionRelativeRefs = obj;

        callback(apiDefinitionRelativeRefs);
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

module.exports.oaiDoc = oaiDoc;

module.exports.oaiDocPath = path.join(relativeBase, './2.0/swagger.yaml');

module.exports.oaiDocCircular = oaiDocCircular;

module.exports.oaiDocCircularPath = path.join(relativeBase, './2.0/swagger-circular.yaml');

module.exports.oaiDocRelativeRefsPath = path.join(relativeBase, './2.0/swagger-relative-refs.yaml');

module.exports.oaiDocValidator = oaiDocValidator;
