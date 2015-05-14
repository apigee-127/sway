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
var JsonRefs = require('json-refs');
var types = require('../../types');
var SwaggerApi = types.SwaggerApi;

var docsUrl = 'https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md';
var version = '2.0';

// The URL to the Swagger 2.0 documentation
module.exports.documentation = docsUrl;

// The version for this Swagger version
module.exports.version = '2.0';

/**
 * Returns whether or not the provided document can be processed.
 *
 * @param {object} document - The potential Swagger document to test
 *
 * @returns {boolean} Returns true only if document is a Swagger 2.0 document or a URL to a Swagger 2.0 document
 */
module.exports.canProcess = function (document) {
  return document.swagger === version;
};

/**
 * Creates a SwaggerApi object from the provided Swagger document.
 *
 * @param {object} document - The Swagger document
 * @param {object} options - The options passed to swaggerApi.create
 *
 * @returns {Promise} A promise that resolves the SwaggerApi after processing
 */
module.exports.createSwaggerApi = function (document, options) {
  return new Promise(function (resolve, reject) {
    var api = new SwaggerApi(document, docsUrl, version);

    JsonRefs.resolveRefs(document, options.loaderOptions || {}, function (err, resolved) {
      if (err) {
        reject(err);
      } else {
        api.resolved = resolved;

        if (_.isString(options.document)) {
          api.originalLocation = options.document;
        }

        resolve(api);
      }
    });
  });
};
