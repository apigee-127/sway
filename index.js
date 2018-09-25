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
var helpers = require('./lib/helpers');
var JsonRefs = require('json-refs');
var SwaggerApi = require('./lib/types/api');
var YAML = require('js-yaml');

// Load promises polyfill if necessary
/* istanbul ignore if */
if (typeof Promise === 'undefined') {
  require('native-promise-only');
}

/**
 * A library for simpler [Swagger](http://swagger.io/) integrations.
 *
 * @module sway
 */

/**
 * Creates a SwaggerApi object from its Swagger definition(s).
 *
 * @param {module:sway.CreateOptions} options - The options for loading the definition(s)
 *
 * @returns {Promise<module:sway.SwaggerApi>} The promise
 *
 * @example
 * SwaggerApi.create({definition: 'http://petstore.swagger.io/v2/swagger.yaml'})
 *   .then(function (api) {
 *     console.log('Documentation URL: ', api.documentationUrl);
 *   }, function (err) {
 *     console.error(err.stack);
 *   });
 */
module.exports.create = function (options) {
  var allTasks = Promise.resolve();
  var cOptions;

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
      } else if (!_.isUndefined(options.customFormats) && !_.isArray(options.customFormats)) {
        throw new TypeError('options.customFormats must be an array');
      } else if (!_.isUndefined(options.customFormatGenerators) && !_.isArray(options.customFormatGenerators)) {
        throw new TypeError('options.customFormatGenerators must be an array');
      } else if (!_.isUndefined(options.customValidators) && !_.isArray(options.customValidators)) {
        throw new TypeError('options.customValidators must be an array');
      }

      helpers.validateOptionsAllAreFunctions(options.customFormats, 'customFormats');
      helpers.validateOptionsAllAreFunctions(options.customFormatGenerators, 'customFormatGenerators');
      helpers.validateOptionsAllAreFunctions(options.customValidators, 'customValidators');

      resolve();
    });
  });

  // Make a copy of the input options so as not to alter them
  cOptions = _.cloneDeep(options);

  //
  allTasks = allTasks
    // Resolve relative/remote references
    .then(function () {
      // Prepare the json-refs options
      if (_.isUndefined(cOptions.jsonRefs)) {
        cOptions.jsonRefs = {};
      }

      // Include invalid reference information
      cOptions.jsonRefs.includeInvalid = true;

      // Resolve only relative/remote references
      cOptions.jsonRefs.filter = ['relative', 'remote'];

      // Update the json-refs options to process YAML
      if (_.isUndefined(cOptions.jsonRefs.loaderOptions)) {
        cOptions.jsonRefs.loaderOptions = {};
      }

      if (_.isUndefined(cOptions.jsonRefs.loaderOptions.processContent)) {
        cOptions.jsonRefs.loaderOptions.processContent = function (res, cb) {
          cb(undefined, YAML.safeLoad(res.text));
        };
      }

      // Call the appropriate json-refs API
      if (_.isString(cOptions.definition)) {
        return JsonRefs.resolveRefsAt(cOptions.definition, cOptions.jsonRefs);
      } else {
        return JsonRefs.resolveRefs(cOptions.definition, cOptions.jsonRefs);
      }
    })
    // Resolve local references and merge results
    .then(function (remoteResults) {
      // Resolve local references (Remote references should had already been resolved)
      cOptions.jsonRefs.filter = 'local';

      return JsonRefs.resolveRefs(remoteResults.resolved || cOptions.definition, cOptions.jsonRefs)
        .then(function (results) {
          _.each(remoteResults.refs, function (refDetails, refPtr) {
            results.refs[refPtr] = refDetails;
          });

          return {
            // The original Swagger definition
            definition: _.isString(cOptions.definition) ? remoteResults.value : cOptions.definition,
            // The original Swagger definition with its remote references resolved
            definitionRemotesResolved: remoteResults.resolved,
            // The original Swagger definition with all its references resolved
            definitionFullyResolved: results.resolved,
            // Merge the local reference details with the remote reference details
            refs: results.refs
          }
        });
    })
    // Process the Swagger document and return the API
    .then(function (results) {
      // We need to remove all circular objects as z-schema does not work with them:
      //   https://github.com/zaggino/z-schema/issues/137
      helpers.removeCirculars(results.definition);
      helpers.removeCirculars(results.definitionRemotesResolved);
      helpers.removeCirculars(results.definitionFullyResolved);

      // Create object model
      return new SwaggerApi(results.definition,
                            results.definitionRemotesResolved,
                            results.definitionFullyResolved,
                            results.refs,
                            options);
    });

  return allTasks;
};
