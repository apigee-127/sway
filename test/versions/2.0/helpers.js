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
var fs = require('fs');
var path = require('path');
var plugin = require('../../../lib/versions/2.0');
var sHelpers = require('../../../lib/helpers'); // Helpers from Sway
var tHelpers = require('../../helpers');
var YAML = require('js-yaml');

var swaggerApi = typeof window === 'undefined' ? require('../../..') : window.SwaggerApi;
var swaggerDoc = YAML.safeLoad(fs.readFileSync(path.join(__dirname, '../../browser/documents/2.0/swagger.yaml'),
                                               'utf8'));
var swaggerDocValidator = sHelpers.createJSONValidator({
  formatValidators: require('../../../lib/versions/2.0/format-validators')
});
var sway;

function getOperationCount (pathDef) {
  var count = 0;

  _.each(pathDef, function (operation, method) {
    if (plugin.supportedHttpMethods.indexOf(method) > -1) {
      count += 1;
    }
  });

  return count;
}

function getSway (callback) {
  if (sway) {
    callback(sway);
  } else {
    swaggerApi.create({
      definition: swaggerDoc,
      jsonRefs: {
        relativeBase: tHelpers.relativeBase
      }
    })
      .then(function (obj) {
        sway = obj;

        callback(sway);
      }, function (err) {
        callback(err);
      });
  }
}

module.exports = {
  getOperationCount: getOperationCount,
  getSway: getSway,
  plugin: plugin,
  swaggerApi: swaggerApi,
  swaggerDoc: swaggerDoc,
  swaggerDocPath: './2.0/swagger.yaml',
  swaggerDocValidator: swaggerDocValidator
};
