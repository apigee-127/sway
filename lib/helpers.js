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
var mocker = require('json-schema-faker');
var ZSchema = require('z-schema');

function removeValidationErrorParams (obj) {
  delete obj.params;

  if (obj.inner) {
    _.each(obj.inner, function (nObj) {
      removeValidationErrorParams(nObj);
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
  if (_.isUndefined(options)) {
    options = {};
  }

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
 * @param {obejct[]} [options.schemas] - The JSON Schema(s) to use
 * @param {object} [options.formatValidators] - The custom format validators to use
 *
 * @returns {object} The JSON Schema validator
 */
module.exports.createJSONValidator = function (options) {
  var validator = new ZSchema({
    reportPathAsArray: true
  });
  var result;

  if (_.isUndefined(options)) {
    options = {};
  }

  // Add the custom validators
  _.each(options.formatValidators, function (handler, name) {
    ZSchema.registerFormat(name, handler);
  });

  if (_.isArray(options.schemas)) {
    // Compile and validate the schemas
    result = validator.compileSchema(options.schemas);

    // If there is an error, it's unrecoverable so just blow the eff up
    if (result === false) {
      result = new Error('Unable to create the JSON Validator due to invalid JSON Schema(s)');

      result.errors = validator.getLastErrors();

      throw result;
    }
  }

  return validator;
};

/**
 * Validates the provided value against the JSON Schema by name or value.
 *
 * @param {object} validator - The JSON Schema validator created via {@link #createJSONValidator}
 * @param {object|string} schemaOrName - The JSON Schema name or string
 * @param {*} value - The value to validate
 *
 * @throws {Error} If the JSON Schema validation fails
 */
module.exports.validateAgainstSchema = function (validator, schemaOrName, value) {
  var schema = _.isPlainObject(schemaOrName) ? _.cloneDeep(schemaOrName) : schemaOrName;
  var result = validator.validate(value, schema);

  if (!result) {
    result = new Error('JSON Schema validation failed');

    result.code = 'SCHEMA_VALIDATION_FAILED';
    result.errors = _.map(validator.getLastErrors(), function (err) {
      removeValidationErrorParams(err);

      return err;
    });
    result.warnings = [];

    throw result;
  }
};
