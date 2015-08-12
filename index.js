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
var pathLoader = require('path-loader');
var YAML = require('js-yaml');

// Load promises polyfill if necessary
/* istanbul ignore if */
if (typeof Promise === 'undefined') {
  require('native-promise-only');
}

var supportedVersions = {
  '2.0': require('./lib/versions/2.0/')
};

/**
 * Creates a SwaggerApi object from its Swagger definition(s).
 *
 * @param {object} options - The options for loading the definition(s)
 * @param {object|string} options.definition - The Swagger definition location or structure
 * @param {object} [options.jsonRefs] - The options to pass to json-refs
 * @param {validatorCallback[]} [options.customValidators] - The custom validators
 * @param {function} [callback] - Node.js error-first callback
 *
 * @returns {Promise} A promise is always returned even if you provide a callback but it is not required to be used
 *
 * @example
 * // Example using promises
 * SwaggerApi.create({definition: 'http://petstore.swagger.io/v2/swagger.yaml'})
 *   .then(function (api) {
 *     console.log('Documentation URL: ', api.documentation);
 *   }, function (err) {
 *     console.error(err.stack);
 *   });
 *
 * @example
 * // Example using callbacks
 * SwaggerApi.create({definition: 'http://petstore.swagger.io/v2/swagger.yaml'}, function (err, api) {
 *   if (err) {
 *     console.error(err.stack);
 *   } else {
 *     console.log('Documentation URL: ', api.documentation);
 *   });
 */
module.exports.create = function (options, callback) {
  var allTasks = Promise.resolve();

  // Validate arguments
  allTasks = allTasks.then(function () {
    return new Promise(function (resolve) {
      if (_.isUndefined(options)) {
        throw new TypeError('options is required');
      } else if (!_.isPlainObject(options)) {
        throw new TypeError('options must be an object');
      } else if (_.isUndefined(options.definition)) {
        throw new TypeError('options.definition is required');
      } else if (!_.isPlainObject(options.definition) && !_.isString(options.definition)) {
        throw new TypeError('options.definition must be either an object or a string');
      } else if (!_.isUndefined(options.jsonRefs) && !_.isPlainObject(options.jsonRefs)) {
        throw new TypeError('options.jsonRefs must be an object');
      } else if (!_.isUndefined(options.customValidators) && !_.isArray(options.customValidators)) {
        throw new TypeError('options.customValidators must be an array');
      } else if (!_.isUndefined(callback) && !_.isFunction(callback)) {
        throw new TypeError('callback must be a function');
      }

      _.forEach(options.customValidators, function (validator, index) {
        if (!_.isFunction(validator)) {
          throw new TypeError('options.customValidators at index ' + index + ' must be a function');
        }
      });

      resolve();
    });
  });

  // Make a copy of the input options so as not to alter them
  options = _.cloneDeep(options);

  // Retrieve the definition if it is a path/URL
  allTasks = allTasks
    // Load the remote definition or return options.definition
    .then(function () {
      if (_.isString(options.definition)) {
        return pathLoader.load(options.definition, options.jsonRefs || {}).then(YAML.safeLoad);
      } else {
        return options.definition;
      }
    });

  // Process the Swagger definition (if possible)
  allTasks = allTasks
    .then(function (apiDefinition) {
      var definition = _.find(supportedVersions, function (pDefinition) {
        return pDefinition.canProcess(apiDefinition);
      });

      if (_.isUndefined(definition)) {
        throw new TypeError('Unable to identify the Swagger version or the Swagger version is unsupported');
      }

      return definition.createSwaggerApi(apiDefinition, options);
    });

  // Use the callback if provided and it is a function
  if (!_.isUndefined(callback) && _.isFunction(callback)) {
    allTasks = allTasks
      .then(function (swaggerApi) {
        callback(undefined, swaggerApi);
      }, function (err) {
        callback(err);
      });
  }

  return allTasks;
};
