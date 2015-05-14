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
 * Creates a SwaggerApi object from its Swagger document(s).
 *
 * @param {object} options - The options for loading the document(s)
 * @param {object} [options.loaderOptions] - The options to pass to path-loader
 * @param {object|string} options.document - The Swagger document location or structure
 * @param {function} [callback] - Node.js error-first callback
 *
 * @returns {Promise} A promise is always returned even if you provide a callback but it is not required to be used
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
      } else if (_.isUndefined(options.document)) {
        throw new TypeError('options.document is required');
      } else if (!_.isPlainObject(options.document) && !_.isString(options.document)) {
        throw new TypeError('options.document must be either an object or a string');
      } else if (!_.isUndefined(options.loaderOptions) && !_.isPlainObject(options.loaderOptions)) {
        throw new TypeError('options.loaderOptions must be an object');
      } else if (!_.isUndefined(callback) && !_.isFunction(callback)) {
        throw new TypeError('callback must be a function');
      }

      resolve();
    });
  });

  // Retrieve the document if it is a path/URL
  allTasks = allTasks
    // Load the remote document or return options.document
    .then(function () {
      if (_.isString(options.document)) {
        return pathLoader.load(options.document, options.loaderOptions || {}).then(YAML.safeLoad);
      } else {
        return options.document;
      }
    });

  // Process the Swagger document (if possible)
  allTasks = allTasks
    .then(function (apiDocument) {
      var document = _.find(supportedVersions, function (pDocument) {
        return pDocument.canProcess(apiDocument);
      });

      if (_.isUndefined(document)) {
        throw new TypeError('Unable to identify the Swagger version or the Swagger version is unsupported');
      }

      return document.createSwaggerApi(apiDocument, options);
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
