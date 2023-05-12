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

const _ = require('lodash');
const assert = require('assert');
const helpers = require('./helpers');

const Sway = helpers.getSway();

const invalidCreateScenarios = [
  [[], 'options is required'],
  [['wrongType'], 'options must be an object'],
  [[{}], 'options.definition is required'],
  [[{ definition: false }], 'options.definition must be either an object or a string'],
  [[{ definition: {}, jsonRefs: 'wrongType' }], 'options.jsonRefs must be an object'],
  [[{ definition: {}, customFormats: 'wrongType' }], 'options.customFormats must be an array'],
  [[{ definition: {}, customFormats: ['wrongType'] }], 'options.customFormats at index 0 must be a function'],
  [[{ definition: {}, customFormatGenerators: 'wrongType' }], 'options.customFormatGenerators must be an array'],
  [[{ definition: {}, customFormatGenerators: ['wrongType'] }],
    'options.customFormatGenerators at index 0 must be a function'],
  [[{ definition: {}, customValidators: 'wrongType' }], 'options.customValidators must be an array'],
  [[{ definition: {}, customValidators: ['wrongType'] }], 'options.customValidators at index 0 must be a function'],
];

describe('sway', () => {
  describe('sway#create', () => {
    function validateCreateApiDefinition(options) {
      return function (theApi) {
        assert.deepEqual(theApi.definition, helpers.oaiDoc);
        assert.equal(
          theApi.documentationUrl,
          'https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md',
        );
        assert.deepEqual(theApi.options, options);
        assert.equal(theApi.version, '2.0');

        // Make sure all references were found
        _.forEach(theApi.references, (details) => {
          assert.ok(!_.has(details, 'missing'));
        });

        // Validate the merging of the OpenAPI definition properties and the OpenAPI properties
        _.forEach(helpers.oaiDoc, (val, key) => {
          assert.deepEqual(theApi[key], val);
        });

        // Validate the operations (Simple tests for now, deeper testing is below)
        assert.ok(_.isArray(theApi.pathObjects));
        assert.ok(theApi.pathObjects.length > 0);

        // Validate the registration of customValidator on ApiDefinition
        assert.deepEqual(theApi.customValidators, options.customValidators || []);
      };
    }

    it('should always return a promise', () => {
      assert.ok(Sway.create({
        definition: helpers.oaiDoc,
      }) instanceof Promise);
      assert.ok(Sway.create({
        definition: helpers.oaiDoc,
      }, () => {}) instanceof Promise);
    });

    it('should return proper error', (done) => {
      let allTests = Promise.resolve();

      _.each(invalidCreateScenarios, (scenario, index) => {
        allTests = allTests
          .then(() => new Promise((resolve, reject) => {
            Sway.create(...scenario[0])
              .then(() => {
                reject(new Error(`Sway#create should had failed (Test #${index})`));
              }, (err) => {
                try {
                  assert.ok(err instanceof TypeError);
                  assert.equal(err.message, scenario[1]);

                  resolve();
                } catch (err2) {
                  reject(err2);
                }
              });
          }));
      });

      allTests.then(done, done);
    });

    it('should handle definition object', (done) => {
      const options = {
        definition: helpers.oaiDoc,
      };

      Sway.create(options)
        .then(validateCreateApiDefinition(options))
        .then(done, done);
    });

    it('should handle definition file location', (done) => {
      const options = {
        definition: helpers.oaiDocPath,
      };

      Sway.create(options)
        .then(validateCreateApiDefinition(options))
        .then(done, done);
    });

    it('should register customValidators', (done) => {
      const options = {
        definition: helpers.oaiDoc,
        customValidators: [
          function validator1() {
            return {
              errors: [],
              warnings: [],
            };
          },
        ],
      };

      Sway.create(options)
        .then(validateCreateApiDefinition(options))
        .then(done, done);
    });

    // TODO: Add test for definition file URL (remote)
  });
});
