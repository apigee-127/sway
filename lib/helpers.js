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
var mocker = require('json-schema-faker');
var ZSchema = require('z-schema');

var draft04Json = require('./json-schema-draft-04.json');
var draft04Url = 'http://json-schema.org/draft-04/schema';

function normalizeError (obj) {
  // Remove fields that are not important or are not a part of the exposed contract
  delete obj.params;
  delete obj.schemaId;

  if (obj.inner) {
    _.each(obj.inner, function (nObj) {
      normalizeError(nObj);
    });
  }
}

/**
 * Helper method to create a JSON Schema Mocker.
 *
 * @param {object} [options] - The mocker options
 * @param {object} [options.formatGenerators] - The custom format generators to use
 *
 * @returns {object} The JSON Schema mocker
 */
module.exports.createJSONSchemaMocker = function (options) {
  /* istanbul ignore if */
  if (_.isUndefined(options)) {
    options = {};
  }

  // Extend faker.js to only include the 'en' locale
  mocker.extend('faker', function (faker) {
    faker.locale = 'en';

    return faker;
  });

  // Add the custom format generators
  _.each(options.formatGenerators, function (handler, name) {
    mocker.formats(name, handler);
  });

  return mocker;
};

/**
 * Helper method to create a JSON Validator.
 *
 * @param {object} [options] - The validator options
 * @param {object} [options.formatValidators] - The custom format validators to use
 *
 * @returns {object} The JSON Schema validator
 */
module.exports.createJSONValidator = function (options) {
  var validator = new ZSchema({
    ignoreUnknownFormats: true,
    reportPathAsArray: true
  });

  /* istanbul ignore if */
  if (_.isUndefined(options)) {
    options = {};
  }

  // Add the draft-04 spec
  validator.setRemoteReference(draft04Url, draft04Json);

  // Add the custom validators
  _.each(options.formatValidators, function (handler, name) {
    ZSchema.registerFormat(name, handler);
  });

  return validator;
};

/**
 * Validates the provided value against the JSON Schema by name or value.
 *
 * @param {object} validator - The JSON Schema validator created via {@link #createJSONValidator}
 * @param {object} schema - The JSON Schema
 * @param {*} value - The value to validate
 *
 * @returns {object} Object containing the errors and warnings of the validation
 */
module.exports.validateAgainstSchema = function (validator, schema, value) {
  schema = _.cloneDeep(schema); // Clone the schema as z-schema alters the provided document

  var response = {
    errors: [],
    warnings: []
  };

  if (!validator.validate(value, schema)) {
    response.errors = _.map(validator.getLastErrors(), function (err) {
      normalizeError(err);

      return err;
    });
  }

  return response;
};
