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
var swaggerApi = typeof window === 'undefined' ? require('..') : window.SwaggerApi;

var invalidCreateScenarios = [
  [[], 'options is required'],
  [['wrongType'], 'options must be an object'],
  [[{}], 'options.definition is required'],
  [[{definition: false}], 'options.definition must be either an object or a string'],
  [[{definition: {}}], 'Unable to identify the Swagger version or the Swagger version is unsupported'],
  [[{definition: {}, jsonRefs: 'wrongType'}], 'options.jsonRefs must be an object'],
  [[{definition: {}, customValidators: 'wrongType'}], 'options.customValidators must be an array'],
  [[{definition: {}, customValidators: ['wrongType']}], 'options.customValidators at index 0 must be a function'],
  [[{definition: {}}, 'wrongType'], 'callback must be a function']
];

describe('sway (General)', function () {
  describe('sway#create', function () {
    it('should always return a promise', function () {
      assert.ok(swaggerApi.create({}) instanceof Promise);
      assert.ok(swaggerApi.create({}, function () {}) instanceof Promise);
    });

    describe('promises', function () {
      it('should return proper error', function (done) {
        var allTests = Promise.resolve();

        _.each(invalidCreateScenarios, function (scenario, index) {
          allTests = allTests
            .then(function () {
              return new Promise(function (resolve, reject) {
                swaggerApi.create.apply(swaggerApi, scenario[0])
                  .then(function () {
                    reject(new Error('swaggerApi.create should had failed (Test #' + index + ')'));
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
    });

    describe('callbacks', function () {
      it('should return proper error', function (done) {
        var allTests = Promise.resolve();

        // We cannot test the first or last scenarios with callbacks
        _.each(invalidCreateScenarios.slice(1, invalidCreateScenarios.length - 1), function (scenario) {
          allTests = allTests
            .then(function () {
              return new Promise(function (resolve, reject) {
                var args = scenario[0].concat(function (err) {
                  try {
                    assert.ok(err instanceof TypeError);
                    assert.equal(err.message, scenario[1]);

                    resolve();
                  } catch (err2) {
                    reject(err2);
                  }
                });

                swaggerApi.create.apply(swaggerApi, args);
              }).catch(done);
            });
        });

        allTests.then(done, done);
      });
    });
  });
});
