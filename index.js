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
 * @module Sway
 */

/**
 * Callback used for validation.
 *
 * @typedef {function} ValidatorCallback
 *
 * @param {module:Sway~SwaggerApi} api - The Swagger API object
 *
 * @returns {module:Sway~ValidationResults} The validation results
 */

/**
 * Server response wrapper.
 *
 * Since the low level `http.ServerResponse` object is not always guaranteed and even if it is, there is no public way
 * to gather the necessary parts of the response to perform validation, this object encapsulates the required response
 * information to perform response validation.
 *
 * @typedef {object} ServerResponseWrapper
 *
 * @property {*} body - The response body
 * @property {string} [encoding] - The encoding of the body when the body is a `Buffer`
 * @property {object} headers - The response headers
 * @property {number|string} [statusCode=default] - The response status code
 */

/**
 * Validation error/warning object.
 *
 * When this object is created as a result of JSON Schema validation, this object is created by 
 * [z-schema](https://github.com/zaggino/z-schema) and it owns the structure so there can be extra properties not
 * documented below.
 *
 * @typedef {object} ValidationEntry
 *
 * @property {string} code - The code used to identify the error/warning
 * @property {string} [error] - Whenever there is an upstream `Error` encountered, its message is here
 * @property {ValidationEntry[]} [errors] - The nested error(s) encountered during validation
 * @property {string[]} [lineage] - Contains the composition lineage for circular composition errors
 * @property {string} message - The human readable description of the error/warning
 * @property {string} [name] - The header name for header validation errors
 * @property {array} [params] - The parameters used when validation failed *(This is a z-schema construct and is only
 * set for JSON Schema validation errors.)*
 * @property {string[]} path - The path to the location in the document where the error/warning occurred
 * @property {string} [schemaId] - The schema id *(This is a z-schema construct and is only set for JSON Schema
 * validation errors and when its value is not `undefined`.)
 */

/**
 * Validation results object.
 *
 * @typedef {object} ValidationResults
 *
 * @property {module:Sway~ValidationEntry[]} errors - The validation errors
 * @property {module:Sway~ValidationEntry[]} warnings - The validation warnings
 */

/**
 * Creates a SwaggerApi object from its Swagger definition(s).
 *
 * @param {object} options - The options for loading the definition(s)
 * @param {object|string} options.definition - The Swagger definition location or structure
 * @param {object} [options.jsonRefs] - *(See [JsonRefs~JsonRefsOptions](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..JsonRefsOptions))*
 * @param {module:Sway~ValidatorCallback[]} [options.customValidators] - The custom validators
 *
 * @returns {Promise} The promise
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
      } else if (!_.isUndefined(options.customValidators) && !_.isArray(options.customValidators)) {
        throw new TypeError('options.customValidators must be an array');
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
      // Resolve all references (Should only resolve locals now since the remote references are resolved)
      delete cOptions.jsonRefs.filter;

      return JsonRefs.resolveRefs(remoteResults.value || cOptions.definition, cOptions.jsonRefs)
        .then(function (results) {
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
