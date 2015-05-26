(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.SwaggerApi = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

var _ = (window._);
var pathLoader = (window.PathLoader);
var YAML = (window.jsyaml);

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
 * @param {object} [options.loaderOptions] - The options to pass to path-loader
 * @param {object|string} options.definition - The Swagger definition location or structure
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
      } else if (!_.isUndefined(options.loaderOptions) && !_.isPlainObject(options.loaderOptions)) {
        throw new TypeError('options.loaderOptions must be an object');
      } else if (!_.isUndefined(callback) && !_.isFunction(callback)) {
        throw new TypeError('callback must be a function');
      }

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
        return pathLoader.load(options.definition, options.loaderOptions || {}).then(YAML.safeLoad);
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

},{"./lib/versions/2.0/":3,"native-promise-only":4}],2:[function(require,module,exports){
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

var _ = (window._);

/**
 * The Swagger Operation object.
 *
 * <strong>Note:</strong> Do not use directly.
 *
 * @param {string} path - The operation path
 * @param {string} method - The operation method
 * @param {string} ptr - The JSON Pointer to the operation
 * @param {object} definition - The operation definition
 * @param {Parameter[]} parameters - The Swagger parameter objects
 *
 * @constructor
 */
function Operation (path, method, ptr, definition, parameters) {
  this.path = path;
  this.method = method;
  this.ptr = ptr;
  this.definition = definition;
  this.parameterObjects = parameters;

  // Assign Swagger definition properties to the operation for easy access
  _.assign(this, definition);
}

/**
 * Returns all parameters for the operation.
 *
 * @returns {Parameter[]} All parameters for the operation.
 */
Operation.prototype.getParameters = function () {
  return this.parameterObjects;
};

/**
 * The Swagger Parameter object.
 *
 * <strong>Note:</strong> Do not use directly.
 *
 * @param {string} ptr - The JSON Pointer to the parameter
 * @param {object} definition - The parameter definition
 *
 * @constructor
 */
function Parameter (ptr, definition) {
  this.ptr = ptr;
  this.definition = definition;

  // Assign Swagger definition properties to the parameter for easy access
  _.assign(this, definition);
}

/**
 * The Swagger API object.
 *
 * <strong>Note:</strong> Do not use directly.
 *
 * @param {object} definition - The Swagger definition
 * @param {string} version - The Swagger definition version
 * @param {string} documentation - The Swagger Specification documentation URL
 * @param {Operation[]} operations - The Swagger operation objects
 * @param {object} options - The options passed to swaggerApi.create
 *
 * @constructor
 */
function SwaggerApi (definition, version, documentation, operations, options) {
  this.version = version;
  this.definition = definition;
  this.documentation = documentation;
  this.operationObjects = operations;
  this.options = options;

  // Assign Swagger definition properties to the api for easy access
  _.assign(this, definition);
}

/**
 * Returns the operation for the provided path and method.
 *
 * @param {string} path - The Swagger path
 * @param {string} method - The Swagger operation method
 *
 * @returns {Operation} The operation for the provided path and method or undefined if there is no operation for that
 *                      path and method combination.
 */
SwaggerApi.prototype.getOperation = function (path, method) {
  return _.find(this.operationObjects, function (operation) {
    return operation.path === path && operation.method === method.toLowerCase();
  });
};

/**
 * Returns all operations for the provided path or all operations in the API.
 *
 * @param {string} [path] - The Swagger path
 *
 * @returns {Operation[]} All operations for the provided path or all API operations.
 */
SwaggerApi.prototype.getOperations = function (path) {
  return _.filter(this.operationObjects, function (operation) {
    return _.isUndefined(path) ? true : operation.path === path;
  });
};

module.exports = {
  Operation: Operation,
  Parameter: Parameter,
  SwaggerApi: SwaggerApi
};

},{}],3:[function(require,module,exports){
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

var _ = (window._);
var JsonRefs = (window.JsonRefs);
var types = require('../../types');
var docsUrl = 'https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md';
var supportedHttpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
var version = '2.0';

function getOperations (resolved) {
  var operations = [];

  _.forEach(resolved.paths, function (pathDef, path) {
    var pPath = ['paths', path];
    var pParams = _.reduce(pathDef.parameters || {}, function (parameters, paramDef, index) {
      parameters[paramDef.name + ':' + paramDef.in] = {
        path: pPath.concat(['parameters', index.toString()]),
        definition: paramDef
      };

      return parameters;
    }, {});

    _.forEach(pathDef, function (operation, method) {
      // Do not process non-operations
      if (_.indexOf(supportedHttpMethods, method) === -1) {
        return;
      }

      var cOperation = _.cloneDeep(operation); // Clone so we do not alter the input
      var oParams = {}; // Used to keep track of unique parameters
      var oPath = pPath.concat(method);
      var paramObjs = [];

      // Add path parameters
      _.forEach(pParams, function (pParam, key) {
        oParams[key] = pParam;
      });

      // Add operation parameters (Overrides path-level parameters of same name+in combination)
      _.forEach(operation.parameters, function (paramDef, index) {
        oParams[paramDef.name + ':' + paramDef.in] = {
          path: oPath.concat(['parameters', index.toString()]),
          definition: paramDef
        };
      });

      // Attach our computed parameters/security to the operation
      cOperation.parameters = _.map(_.values(oParams), function (parameter) {
        paramObjs.push(new types.Parameter(JsonRefs.pathToPointer(parameter.path), parameter.definition));

        return parameter.definition;
      });


      if (_.isUndefined(cOperation.security)) {
        cOperation.security = resolved.security;
      }

      operations.push(new types.Operation(path, method, JsonRefs.pathToPointer(oPath), cOperation, paramObjs));
    });
  });

  return operations;
}

// The URL to the Swagger 2.0 documentation
module.exports.documentation = docsUrl;

// The array of supported HTTP methods for each path
module.exports.supportedHttpMethods = supportedHttpMethods;

// The version for this Swagger version
module.exports.version = version;

/**
 * Returns whether or not the provided definition can be processed.
 *
 * @param {object} definition - The potential Swagger definition to test
 *
 * @returns {boolean} Returns true only if the definition represents a Swagger 2.0 definition
 */
module.exports.canProcess = function (definition) {
  return definition.swagger === version;
};

/**
 * Creates a SwaggerApi object from the provided Swagger definition.
 *
 * @param {object} definition - The Swagger definition
 * @param {object} options - The options passed to swaggerApi.create
 *
 * @returns {Promise} A promise that resolves the SwaggerApi after processing
 */
module.exports.createSwaggerApi = function (definition, options) {
  return new Promise(function (resolve, reject) {
    JsonRefs.resolveRefs(definition, options.loaderOptions || {}, function (err, resolved, metadata) {
      var api;

      /* istanbul ignore if */
      if (err) {
        reject(err);
      } else {
        api = new types.SwaggerApi(definition, version, docsUrl, getOperations(resolved), options);

        api.references = metadata;
        api.resolved = resolved;

        resolve(api);
      }
    });
  });
};

},{"../../types":2}],4:[function(require,module,exports){
(function (global){
/*! Native Promise Only
    v0.7.8-a (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/
!function(t,n,e){n[t]=n[t]||e(),"undefined"!=typeof module&&module.exports?module.exports=n[t]:"function"==typeof define&&define.amd&&define(function(){return n[t]})}("Promise","undefined"!=typeof global?global:this,function(){"use strict";function t(t,n){l.add(t,n),h||(h=y(l.drain))}function n(t){var n,e=typeof t;return null==t||"object"!=e&&"function"!=e||(n=t.then),"function"==typeof n?n:!1}function e(){for(var t=0;t<this.chain.length;t++)o(this,1===this.state?this.chain[t].success:this.chain[t].failure,this.chain[t]);this.chain.length=0}function o(t,e,o){var r,i;try{e===!1?o.reject(t.msg):(r=e===!0?t.msg:e.call(void 0,t.msg),r===o.promise?o.reject(TypeError("Promise-chain cycle")):(i=n(r))?i.call(r,o.resolve,o.reject):o.resolve(r))}catch(c){o.reject(c)}}function r(o){var c,u,a=this;if(!a.triggered){a.triggered=!0,a.def&&(a=a.def);try{(c=n(o))?(u=new f(a),c.call(o,function(){r.apply(u,arguments)},function(){i.apply(u,arguments)})):(a.msg=o,a.state=1,a.chain.length>0&&t(e,a))}catch(s){i.call(u||new f(a),s)}}}function i(n){var o=this;o.triggered||(o.triggered=!0,o.def&&(o=o.def),o.msg=n,o.state=2,o.chain.length>0&&t(e,o))}function c(t,n,e,o){for(var r=0;r<n.length;r++)!function(r){t.resolve(n[r]).then(function(t){e(r,t)},o)}(r)}function f(t){this.def=t,this.triggered=!1}function u(t){this.promise=t,this.state=0,this.triggered=!1,this.chain=[],this.msg=void 0}function a(n){if("function"!=typeof n)throw TypeError("Not a function");if(0!==this.__NPO__)throw TypeError("Not a promise");this.__NPO__=1;var o=new u(this);this.then=function(n,r){var i={success:"function"==typeof n?n:!0,failure:"function"==typeof r?r:!1};return i.promise=new this.constructor(function(t,n){if("function"!=typeof t||"function"!=typeof n)throw TypeError("Not a function");i.resolve=t,i.reject=n}),o.chain.push(i),0!==o.state&&t(e,o),i.promise},this["catch"]=function(t){return this.then(void 0,t)};try{n.call(void 0,function(t){r.call(o,t)},function(t){i.call(o,t)})}catch(c){i.call(o,c)}}var s,h,l,p=Object.prototype.toString,y="undefined"!=typeof setImmediate?function(t){return setImmediate(t)}:setTimeout;try{Object.defineProperty({},"x",{}),s=function(t,n,e,o){return Object.defineProperty(t,n,{value:e,writable:!0,configurable:o!==!1})}}catch(d){s=function(t,n,e){return t[n]=e,t}}l=function(){function t(t,n){this.fn=t,this.self=n,this.next=void 0}var n,e,o;return{add:function(r,i){o=new t(r,i),e?e.next=o:n=o,e=o,o=void 0},drain:function(){var t=n;for(n=e=h=void 0;t;)t.fn.call(t.self),t=t.next}}}();var g=s({},"constructor",a,!1);return a.prototype=g,s(g,"__NPO__",0,!1),s(a,"resolve",function(t){var n=this;return t&&"object"==typeof t&&1===t.__NPO__?t:new n(function(n,e){if("function"!=typeof n||"function"!=typeof e)throw TypeError("Not a function");n(t)})}),s(a,"reject",function(t){return new this(function(n,e){if("function"!=typeof n||"function"!=typeof e)throw TypeError("Not a function");e(t)})}),s(a,"all",function(t){var n=this;return"[object Array]"!=p.call(t)?n.reject(TypeError("Not an array")):0===t.length?n.resolve([]):new n(function(e,o){if("function"!=typeof e||"function"!=typeof o)throw TypeError("Not a function");var r=t.length,i=Array(r),f=0;c(n,t,function(t,n){i[t]=n,++f===r&&e(i)},o)})}),s(a,"race",function(t){var n=this;return"[object Array]"!=p.call(t)?n.reject(TypeError("Not an array")):new n(function(e,o){if("function"!=typeof e||"function"!=typeof o)throw TypeError("Not a function");c(n,t,function(t,n){e(n)},o)})}),a});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi90eXBlcy5qcyIsImxpYi92ZXJzaW9ucy8yLjAvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmF0aXZlLXByb21pc2Utb25seS9ucG8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgQXBpZ2VlIENvcnBvcmF0aW9uXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHdpbmRvdy5fKTtcbnZhciBwYXRoTG9hZGVyID0gKHdpbmRvdy5QYXRoTG9hZGVyKTtcbnZhciBZQU1MID0gKHdpbmRvdy5qc3lhbWwpO1xuXG4vLyBMb2FkIHByb21pc2VzIHBvbHlmaWxsIGlmIG5lY2Vzc2FyeVxuLyogaXN0YW5idWwgaWdub3JlIGlmICovXG5pZiAodHlwZW9mIFByb21pc2UgPT09ICd1bmRlZmluZWQnKSB7XG4gIHJlcXVpcmUoJ25hdGl2ZS1wcm9taXNlLW9ubHknKTtcbn1cblxudmFyIHN1cHBvcnRlZFZlcnNpb25zID0ge1xuICAnMi4wJzogcmVxdWlyZSgnLi9saWIvdmVyc2lvbnMvMi4wLycpXG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBTd2FnZ2VyQXBpIG9iamVjdCBmcm9tIGl0cyBTd2FnZ2VyIGRlZmluaXRpb24ocykuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBUaGUgb3B0aW9ucyBmb3IgbG9hZGluZyB0aGUgZGVmaW5pdGlvbihzKVxuICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zLmxvYWRlck9wdGlvbnNdIC0gVGhlIG9wdGlvbnMgdG8gcGFzcyB0byBwYXRoLWxvYWRlclxuICogQHBhcmFtIHtvYmplY3R8c3RyaW5nfSBvcHRpb25zLmRlZmluaXRpb24gLSBUaGUgU3dhZ2dlciBkZWZpbml0aW9uIGxvY2F0aW9uIG9yIHN0cnVjdHVyZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIE5vZGUuanMgZXJyb3ItZmlyc3QgY2FsbGJhY2tcbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIGlzIGFsd2F5cyByZXR1cm5lZCBldmVuIGlmIHlvdSBwcm92aWRlIGEgY2FsbGJhY2sgYnV0IGl0IGlzIG5vdCByZXF1aXJlZCB0byBiZSB1c2VkXG4gKlxuICogQGV4YW1wbGVcbiAqIC8vIEV4YW1wbGUgdXNpbmcgcHJvbWlzZXNcbiAqIFN3YWdnZXJBcGkuY3JlYXRlKHtkZWZpbml0aW9uOiAnaHR0cDovL3BldHN0b3JlLnN3YWdnZXIuaW8vdjIvc3dhZ2dlci55YW1sJ30pXG4gKiAgIC50aGVuKGZ1bmN0aW9uIChhcGkpIHtcbiAqICAgICBjb25zb2xlLmxvZygnRG9jdW1lbnRhdGlvbiBVUkw6ICcsIGFwaS5kb2N1bWVudGF0aW9uKTtcbiAqICAgfSwgZnVuY3Rpb24gKGVycikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoZXJyLnN0YWNrKTtcbiAqICAgfSk7XG4gKlxuICogQGV4YW1wbGVcbiAqIC8vIEV4YW1wbGUgdXNpbmcgY2FsbGJhY2tzXG4gKiBTd2FnZ2VyQXBpLmNyZWF0ZSh7ZGVmaW5pdGlvbjogJ2h0dHA6Ly9wZXRzdG9yZS5zd2FnZ2VyLmlvL3YyL3N3YWdnZXIueWFtbCd9LCBmdW5jdGlvbiAoZXJyLCBhcGkpIHtcbiAqICAgaWYgKGVycikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoZXJyLnN0YWNrKTtcbiAqICAgfSBlbHNlIHtcbiAqICAgICBjb25zb2xlLmxvZygnRG9jdW1lbnRhdGlvbiBVUkw6ICcsIGFwaS5kb2N1bWVudGF0aW9uKTtcbiAqICAgfSk7XG4gKi9cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uIChvcHRpb25zLCBjYWxsYmFjaykge1xuICB2YXIgYWxsVGFza3MgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAvLyBWYWxpZGF0ZSBhcmd1bWVudHNcbiAgYWxsVGFza3MgPSBhbGxUYXNrcy50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKG9wdGlvbnMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbnMgaXMgcmVxdWlyZWQnKTtcbiAgICAgIH0gZWxzZSBpZiAoIV8uaXNQbGFpbk9iamVjdChvcHRpb25zKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb25zIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICB9IGVsc2UgaWYgKF8uaXNVbmRlZmluZWQob3B0aW9ucy5kZWZpbml0aW9uKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb25zLmRlZmluaXRpb24gaXMgcmVxdWlyZWQnKTtcbiAgICAgIH0gZWxzZSBpZiAoIV8uaXNQbGFpbk9iamVjdChvcHRpb25zLmRlZmluaXRpb24pICYmICFfLmlzU3RyaW5nKG9wdGlvbnMuZGVmaW5pdGlvbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9ucy5kZWZpbml0aW9uIG11c3QgYmUgZWl0aGVyIGFuIG9iamVjdCBvciBhIHN0cmluZycpO1xuICAgICAgfSBlbHNlIGlmICghXy5pc1VuZGVmaW5lZChvcHRpb25zLmxvYWRlck9wdGlvbnMpICYmICFfLmlzUGxhaW5PYmplY3Qob3B0aW9ucy5sb2FkZXJPcHRpb25zKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb25zLmxvYWRlck9wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgIH0gZWxzZSBpZiAoIV8uaXNVbmRlZmluZWQoY2FsbGJhY2spICYmICFfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuXG4gICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIE1ha2UgYSBjb3B5IG9mIHRoZSBpbnB1dCBvcHRpb25zIHNvIGFzIG5vdCB0byBhbHRlciB0aGVtXG4gIG9wdGlvbnMgPSBfLmNsb25lRGVlcChvcHRpb25zKTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgZGVmaW5pdGlvbiBpZiBpdCBpcyBhIHBhdGgvVVJMXG4gIGFsbFRhc2tzID0gYWxsVGFza3NcbiAgICAvLyBMb2FkIHRoZSByZW1vdGUgZGVmaW5pdGlvbiBvciByZXR1cm4gb3B0aW9ucy5kZWZpbml0aW9uXG4gICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKF8uaXNTdHJpbmcob3B0aW9ucy5kZWZpbml0aW9uKSkge1xuICAgICAgICByZXR1cm4gcGF0aExvYWRlci5sb2FkKG9wdGlvbnMuZGVmaW5pdGlvbiwgb3B0aW9ucy5sb2FkZXJPcHRpb25zIHx8IHt9KS50aGVuKFlBTUwuc2FmZUxvYWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGVmaW5pdGlvbjtcbiAgICAgIH1cbiAgICB9KTtcblxuICAvLyBQcm9jZXNzIHRoZSBTd2FnZ2VyIGRlZmluaXRpb24gKGlmIHBvc3NpYmxlKVxuICBhbGxUYXNrcyA9IGFsbFRhc2tzXG4gICAgLnRoZW4oZnVuY3Rpb24gKGFwaURlZmluaXRpb24pIHtcbiAgICAgIHZhciBkZWZpbml0aW9uID0gXy5maW5kKHN1cHBvcnRlZFZlcnNpb25zLCBmdW5jdGlvbiAocERlZmluaXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHBEZWZpbml0aW9uLmNhblByb2Nlc3MoYXBpRGVmaW5pdGlvbik7XG4gICAgICB9KTtcblxuICAgICAgaWYgKF8uaXNVbmRlZmluZWQoZGVmaW5pdGlvbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5hYmxlIHRvIGlkZW50aWZ5IHRoZSBTd2FnZ2VyIHZlcnNpb24gb3IgdGhlIFN3YWdnZXIgdmVyc2lvbiBpcyB1bnN1cHBvcnRlZCcpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmaW5pdGlvbi5jcmVhdGVTd2FnZ2VyQXBpKGFwaURlZmluaXRpb24sIG9wdGlvbnMpO1xuICAgIH0pO1xuXG4gIC8vIFVzZSB0aGUgY2FsbGJhY2sgaWYgcHJvdmlkZWQgYW5kIGl0IGlzIGEgZnVuY3Rpb25cbiAgaWYgKCFfLmlzVW5kZWZpbmVkKGNhbGxiYWNrKSAmJiBfLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgYWxsVGFza3MgPSBhbGxUYXNrc1xuICAgICAgLnRoZW4oZnVuY3Rpb24gKHN3YWdnZXJBcGkpIHtcbiAgICAgICAgY2FsbGJhY2sodW5kZWZpbmVkLCBzd2FnZ2VyQXBpKTtcbiAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGFsbFRhc2tzO1xufTtcbiIsIi8qXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgQXBpZ2VlIENvcnBvcmF0aW9uXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHdpbmRvdy5fKTtcblxuLyoqXG4gKiBUaGUgU3dhZ2dlciBPcGVyYXRpb24gb2JqZWN0LlxuICpcbiAqIDxzdHJvbmc+Tm90ZTo8L3N0cm9uZz4gRG8gbm90IHVzZSBkaXJlY3RseS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCAtIFRoZSBvcGVyYXRpb24gcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCAtIFRoZSBvcGVyYXRpb24gbWV0aG9kXG4gKiBAcGFyYW0ge3N0cmluZ30gcHRyIC0gVGhlIEpTT04gUG9pbnRlciB0byB0aGUgb3BlcmF0aW9uXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmaW5pdGlvbiAtIFRoZSBvcGVyYXRpb24gZGVmaW5pdGlvblxuICogQHBhcmFtIHtQYXJhbWV0ZXJbXX0gcGFyYW1ldGVycyAtIFRoZSBTd2FnZ2VyIHBhcmFtZXRlciBvYmplY3RzXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIE9wZXJhdGlvbiAocGF0aCwgbWV0aG9kLCBwdHIsIGRlZmluaXRpb24sIHBhcmFtZXRlcnMpIHtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy5tZXRob2QgPSBtZXRob2Q7XG4gIHRoaXMucHRyID0gcHRyO1xuICB0aGlzLmRlZmluaXRpb24gPSBkZWZpbml0aW9uO1xuICB0aGlzLnBhcmFtZXRlck9iamVjdHMgPSBwYXJhbWV0ZXJzO1xuXG4gIC8vIEFzc2lnbiBTd2FnZ2VyIGRlZmluaXRpb24gcHJvcGVydGllcyB0byB0aGUgb3BlcmF0aW9uIGZvciBlYXN5IGFjY2Vzc1xuICBfLmFzc2lnbih0aGlzLCBkZWZpbml0aW9uKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBwYXJhbWV0ZXJzIGZvciB0aGUgb3BlcmF0aW9uLlxuICpcbiAqIEByZXR1cm5zIHtQYXJhbWV0ZXJbXX0gQWxsIHBhcmFtZXRlcnMgZm9yIHRoZSBvcGVyYXRpb24uXG4gKi9cbk9wZXJhdGlvbi5wcm90b3R5cGUuZ2V0UGFyYW1ldGVycyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMucGFyYW1ldGVyT2JqZWN0cztcbn07XG5cbi8qKlxuICogVGhlIFN3YWdnZXIgUGFyYW1ldGVyIG9iamVjdC5cbiAqXG4gKiA8c3Ryb25nPk5vdGU6PC9zdHJvbmc+IERvIG5vdCB1c2UgZGlyZWN0bHkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHB0ciAtIFRoZSBKU09OIFBvaW50ZXIgdG8gdGhlIHBhcmFtZXRlclxuICogQHBhcmFtIHtvYmplY3R9IGRlZmluaXRpb24gLSBUaGUgcGFyYW1ldGVyIGRlZmluaXRpb25cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUGFyYW1ldGVyIChwdHIsIGRlZmluaXRpb24pIHtcbiAgdGhpcy5wdHIgPSBwdHI7XG4gIHRoaXMuZGVmaW5pdGlvbiA9IGRlZmluaXRpb247XG5cbiAgLy8gQXNzaWduIFN3YWdnZXIgZGVmaW5pdGlvbiBwcm9wZXJ0aWVzIHRvIHRoZSBwYXJhbWV0ZXIgZm9yIGVhc3kgYWNjZXNzXG4gIF8uYXNzaWduKHRoaXMsIGRlZmluaXRpb24pO1xufVxuXG4vKipcbiAqIFRoZSBTd2FnZ2VyIEFQSSBvYmplY3QuXG4gKlxuICogPHN0cm9uZz5Ob3RlOjwvc3Ryb25nPiBEbyBub3QgdXNlIGRpcmVjdGx5LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZpbml0aW9uIC0gVGhlIFN3YWdnZXIgZGVmaW5pdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHZlcnNpb24gLSBUaGUgU3dhZ2dlciBkZWZpbml0aW9uIHZlcnNpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSBkb2N1bWVudGF0aW9uIC0gVGhlIFN3YWdnZXIgU3BlY2lmaWNhdGlvbiBkb2N1bWVudGF0aW9uIFVSTFxuICogQHBhcmFtIHtPcGVyYXRpb25bXX0gb3BlcmF0aW9ucyAtIFRoZSBTd2FnZ2VyIG9wZXJhdGlvbiBvYmplY3RzXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIFRoZSBvcHRpb25zIHBhc3NlZCB0byBzd2FnZ2VyQXBpLmNyZWF0ZVxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBTd2FnZ2VyQXBpIChkZWZpbml0aW9uLCB2ZXJzaW9uLCBkb2N1bWVudGF0aW9uLCBvcGVyYXRpb25zLCBvcHRpb25zKSB7XG4gIHRoaXMudmVyc2lvbiA9IHZlcnNpb247XG4gIHRoaXMuZGVmaW5pdGlvbiA9IGRlZmluaXRpb247XG4gIHRoaXMuZG9jdW1lbnRhdGlvbiA9IGRvY3VtZW50YXRpb247XG4gIHRoaXMub3BlcmF0aW9uT2JqZWN0cyA9IG9wZXJhdGlvbnM7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgLy8gQXNzaWduIFN3YWdnZXIgZGVmaW5pdGlvbiBwcm9wZXJ0aWVzIHRvIHRoZSBhcGkgZm9yIGVhc3kgYWNjZXNzXG4gIF8uYXNzaWduKHRoaXMsIGRlZmluaXRpb24pO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIG9wZXJhdGlvbiBmb3IgdGhlIHByb3ZpZGVkIHBhdGggYW5kIG1ldGhvZC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCAtIFRoZSBTd2FnZ2VyIHBhdGhcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgLSBUaGUgU3dhZ2dlciBvcGVyYXRpb24gbWV0aG9kXG4gKlxuICogQHJldHVybnMge09wZXJhdGlvbn0gVGhlIG9wZXJhdGlvbiBmb3IgdGhlIHByb3ZpZGVkIHBhdGggYW5kIG1ldGhvZCBvciB1bmRlZmluZWQgaWYgdGhlcmUgaXMgbm8gb3BlcmF0aW9uIGZvciB0aGF0XG4gKiAgICAgICAgICAgICAgICAgICAgICBwYXRoIGFuZCBtZXRob2QgY29tYmluYXRpb24uXG4gKi9cblN3YWdnZXJBcGkucHJvdG90eXBlLmdldE9wZXJhdGlvbiA9IGZ1bmN0aW9uIChwYXRoLCBtZXRob2QpIHtcbiAgcmV0dXJuIF8uZmluZCh0aGlzLm9wZXJhdGlvbk9iamVjdHMsIGZ1bmN0aW9uIChvcGVyYXRpb24pIHtcbiAgICByZXR1cm4gb3BlcmF0aW9uLnBhdGggPT09IHBhdGggJiYgb3BlcmF0aW9uLm1ldGhvZCA9PT0gbWV0aG9kLnRvTG93ZXJDYXNlKCk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBvcGVyYXRpb25zIGZvciB0aGUgcHJvdmlkZWQgcGF0aCBvciBhbGwgb3BlcmF0aW9ucyBpbiB0aGUgQVBJLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBbcGF0aF0gLSBUaGUgU3dhZ2dlciBwYXRoXG4gKlxuICogQHJldHVybnMge09wZXJhdGlvbltdfSBBbGwgb3BlcmF0aW9ucyBmb3IgdGhlIHByb3ZpZGVkIHBhdGggb3IgYWxsIEFQSSBvcGVyYXRpb25zLlxuICovXG5Td2FnZ2VyQXBpLnByb3RvdHlwZS5nZXRPcGVyYXRpb25zID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgcmV0dXJuIF8uZmlsdGVyKHRoaXMub3BlcmF0aW9uT2JqZWN0cywgZnVuY3Rpb24gKG9wZXJhdGlvbikge1xuICAgIHJldHVybiBfLmlzVW5kZWZpbmVkKHBhdGgpID8gdHJ1ZSA6IG9wZXJhdGlvbi5wYXRoID09PSBwYXRoO1xuICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBPcGVyYXRpb246IE9wZXJhdGlvbixcbiAgUGFyYW1ldGVyOiBQYXJhbWV0ZXIsXG4gIFN3YWdnZXJBcGk6IFN3YWdnZXJBcGlcbn07XG4iLCIvKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEFwaWdlZSBDb3Jwb3JhdGlvblxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh3aW5kb3cuXyk7XG52YXIgSnNvblJlZnMgPSAod2luZG93Lkpzb25SZWZzKTtcbnZhciB0eXBlcyA9IHJlcXVpcmUoJy4uLy4uL3R5cGVzJyk7XG52YXIgZG9jc1VybCA9ICdodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1zcGVjL2Jsb2IvbWFzdGVyL3ZlcnNpb25zLzIuMC5tZCc7XG52YXIgc3VwcG9ydGVkSHR0cE1ldGhvZHMgPSBbJ2dldCcsICdwdXQnLCAncG9zdCcsICdkZWxldGUnLCAnb3B0aW9ucycsICdoZWFkJywgJ3BhdGNoJ107XG52YXIgdmVyc2lvbiA9ICcyLjAnO1xuXG5mdW5jdGlvbiBnZXRPcGVyYXRpb25zIChyZXNvbHZlZCkge1xuICB2YXIgb3BlcmF0aW9ucyA9IFtdO1xuXG4gIF8uZm9yRWFjaChyZXNvbHZlZC5wYXRocywgZnVuY3Rpb24gKHBhdGhEZWYsIHBhdGgpIHtcbiAgICB2YXIgcFBhdGggPSBbJ3BhdGhzJywgcGF0aF07XG4gICAgdmFyIHBQYXJhbXMgPSBfLnJlZHVjZShwYXRoRGVmLnBhcmFtZXRlcnMgfHwge30sIGZ1bmN0aW9uIChwYXJhbWV0ZXJzLCBwYXJhbURlZiwgaW5kZXgpIHtcbiAgICAgIHBhcmFtZXRlcnNbcGFyYW1EZWYubmFtZSArICc6JyArIHBhcmFtRGVmLmluXSA9IHtcbiAgICAgICAgcGF0aDogcFBhdGguY29uY2F0KFsncGFyYW1ldGVycycsIGluZGV4LnRvU3RyaW5nKCldKSxcbiAgICAgICAgZGVmaW5pdGlvbjogcGFyYW1EZWZcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBwYXJhbWV0ZXJzO1xuICAgIH0sIHt9KTtcblxuICAgIF8uZm9yRWFjaChwYXRoRGVmLCBmdW5jdGlvbiAob3BlcmF0aW9uLCBtZXRob2QpIHtcbiAgICAgIC8vIERvIG5vdCBwcm9jZXNzIG5vbi1vcGVyYXRpb25zXG4gICAgICBpZiAoXy5pbmRleE9mKHN1cHBvcnRlZEh0dHBNZXRob2RzLCBtZXRob2QpID09PSAtMSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBjT3BlcmF0aW9uID0gXy5jbG9uZURlZXAob3BlcmF0aW9uKTsgLy8gQ2xvbmUgc28gd2UgZG8gbm90IGFsdGVyIHRoZSBpbnB1dFxuICAgICAgdmFyIG9QYXJhbXMgPSB7fTsgLy8gVXNlZCB0byBrZWVwIHRyYWNrIG9mIHVuaXF1ZSBwYXJhbWV0ZXJzXG4gICAgICB2YXIgb1BhdGggPSBwUGF0aC5jb25jYXQobWV0aG9kKTtcbiAgICAgIHZhciBwYXJhbU9ianMgPSBbXTtcblxuICAgICAgLy8gQWRkIHBhdGggcGFyYW1ldGVyc1xuICAgICAgXy5mb3JFYWNoKHBQYXJhbXMsIGZ1bmN0aW9uIChwUGFyYW0sIGtleSkge1xuICAgICAgICBvUGFyYW1zW2tleV0gPSBwUGFyYW07XG4gICAgICB9KTtcblxuICAgICAgLy8gQWRkIG9wZXJhdGlvbiBwYXJhbWV0ZXJzIChPdmVycmlkZXMgcGF0aC1sZXZlbCBwYXJhbWV0ZXJzIG9mIHNhbWUgbmFtZStpbiBjb21iaW5hdGlvbilcbiAgICAgIF8uZm9yRWFjaChvcGVyYXRpb24ucGFyYW1ldGVycywgZnVuY3Rpb24gKHBhcmFtRGVmLCBpbmRleCkge1xuICAgICAgICBvUGFyYW1zW3BhcmFtRGVmLm5hbWUgKyAnOicgKyBwYXJhbURlZi5pbl0gPSB7XG4gICAgICAgICAgcGF0aDogb1BhdGguY29uY2F0KFsncGFyYW1ldGVycycsIGluZGV4LnRvU3RyaW5nKCldKSxcbiAgICAgICAgICBkZWZpbml0aW9uOiBwYXJhbURlZlxuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEF0dGFjaCBvdXIgY29tcHV0ZWQgcGFyYW1ldGVycy9zZWN1cml0eSB0byB0aGUgb3BlcmF0aW9uXG4gICAgICBjT3BlcmF0aW9uLnBhcmFtZXRlcnMgPSBfLm1hcChfLnZhbHVlcyhvUGFyYW1zKSwgZnVuY3Rpb24gKHBhcmFtZXRlcikge1xuICAgICAgICBwYXJhbU9ianMucHVzaChuZXcgdHlwZXMuUGFyYW1ldGVyKEpzb25SZWZzLnBhdGhUb1BvaW50ZXIocGFyYW1ldGVyLnBhdGgpLCBwYXJhbWV0ZXIuZGVmaW5pdGlvbikpO1xuXG4gICAgICAgIHJldHVybiBwYXJhbWV0ZXIuZGVmaW5pdGlvbjtcbiAgICAgIH0pO1xuXG5cbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGNPcGVyYXRpb24uc2VjdXJpdHkpKSB7XG4gICAgICAgIGNPcGVyYXRpb24uc2VjdXJpdHkgPSByZXNvbHZlZC5zZWN1cml0eTtcbiAgICAgIH1cblxuICAgICAgb3BlcmF0aW9ucy5wdXNoKG5ldyB0eXBlcy5PcGVyYXRpb24ocGF0aCwgbWV0aG9kLCBKc29uUmVmcy5wYXRoVG9Qb2ludGVyKG9QYXRoKSwgY09wZXJhdGlvbiwgcGFyYW1PYmpzKSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHJldHVybiBvcGVyYXRpb25zO1xufVxuXG4vLyBUaGUgVVJMIHRvIHRoZSBTd2FnZ2VyIDIuMCBkb2N1bWVudGF0aW9uXG5tb2R1bGUuZXhwb3J0cy5kb2N1bWVudGF0aW9uID0gZG9jc1VybDtcblxuLy8gVGhlIGFycmF5IG9mIHN1cHBvcnRlZCBIVFRQIG1ldGhvZHMgZm9yIGVhY2ggcGF0aFxubW9kdWxlLmV4cG9ydHMuc3VwcG9ydGVkSHR0cE1ldGhvZHMgPSBzdXBwb3J0ZWRIdHRwTWV0aG9kcztcblxuLy8gVGhlIHZlcnNpb24gZm9yIHRoaXMgU3dhZ2dlciB2ZXJzaW9uXG5tb2R1bGUuZXhwb3J0cy52ZXJzaW9uID0gdmVyc2lvbjtcblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBwcm92aWRlZCBkZWZpbml0aW9uIGNhbiBiZSBwcm9jZXNzZWQuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZmluaXRpb24gLSBUaGUgcG90ZW50aWFsIFN3YWdnZXIgZGVmaW5pdGlvbiB0byB0ZXN0XG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBvbmx5IGlmIHRoZSBkZWZpbml0aW9uIHJlcHJlc2VudHMgYSBTd2FnZ2VyIDIuMCBkZWZpbml0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzLmNhblByb2Nlc3MgPSBmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xuICByZXR1cm4gZGVmaW5pdGlvbi5zd2FnZ2VyID09PSB2ZXJzaW9uO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgU3dhZ2dlckFwaSBvYmplY3QgZnJvbSB0aGUgcHJvdmlkZWQgU3dhZ2dlciBkZWZpbml0aW9uLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZpbml0aW9uIC0gVGhlIFN3YWdnZXIgZGVmaW5pdGlvblxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBUaGUgb3B0aW9ucyBwYXNzZWQgdG8gc3dhZ2dlckFwaS5jcmVhdGVcbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdGhlIFN3YWdnZXJBcGkgYWZ0ZXIgcHJvY2Vzc2luZ1xuICovXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVTd2FnZ2VyQXBpID0gZnVuY3Rpb24gKGRlZmluaXRpb24sIG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBKc29uUmVmcy5yZXNvbHZlUmVmcyhkZWZpbml0aW9uLCBvcHRpb25zLmxvYWRlck9wdGlvbnMgfHwge30sIGZ1bmN0aW9uIChlcnIsIHJlc29sdmVkLCBtZXRhZGF0YSkge1xuICAgICAgdmFyIGFwaTtcblxuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBpID0gbmV3IHR5cGVzLlN3YWdnZXJBcGkoZGVmaW5pdGlvbiwgdmVyc2lvbiwgZG9jc1VybCwgZ2V0T3BlcmF0aW9ucyhyZXNvbHZlZCksIG9wdGlvbnMpO1xuXG4gICAgICAgIGFwaS5yZWZlcmVuY2VzID0gbWV0YWRhdGE7XG4gICAgICAgIGFwaS5yZXNvbHZlZCA9IHJlc29sdmVkO1xuXG4gICAgICAgIHJlc29sdmUoYXBpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuIiwiLyohIE5hdGl2ZSBQcm9taXNlIE9ubHlcbiAgICB2MC43LjgtYSAoYykgS3lsZSBTaW1wc29uXG4gICAgTUlUIExpY2Vuc2U6IGh0dHA6Ly9nZXRpZnkubWl0LWxpY2Vuc2Uub3JnXG4qL1xuIWZ1bmN0aW9uKHQsbixlKXtuW3RdPW5bdF18fGUoKSxcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1uW3RdOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZCYmZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIG5bdF19KX0oXCJQcm9taXNlXCIsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9nbG9iYWw6dGhpcyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHQodCxuKXtsLmFkZCh0LG4pLGh8fChoPXkobC5kcmFpbikpfWZ1bmN0aW9uIG4odCl7dmFyIG4sZT10eXBlb2YgdDtyZXR1cm4gbnVsbD09dHx8XCJvYmplY3RcIiE9ZSYmXCJmdW5jdGlvblwiIT1lfHwobj10LnRoZW4pLFwiZnVuY3Rpb25cIj09dHlwZW9mIG4/bjohMX1mdW5jdGlvbiBlKCl7Zm9yKHZhciB0PTA7dDx0aGlzLmNoYWluLmxlbmd0aDt0Kyspbyh0aGlzLDE9PT10aGlzLnN0YXRlP3RoaXMuY2hhaW5bdF0uc3VjY2Vzczp0aGlzLmNoYWluW3RdLmZhaWx1cmUsdGhpcy5jaGFpblt0XSk7dGhpcy5jaGFpbi5sZW5ndGg9MH1mdW5jdGlvbiBvKHQsZSxvKXt2YXIgcixpO3RyeXtlPT09ITE/by5yZWplY3QodC5tc2cpOihyPWU9PT0hMD90Lm1zZzplLmNhbGwodm9pZCAwLHQubXNnKSxyPT09by5wcm9taXNlP28ucmVqZWN0KFR5cGVFcnJvcihcIlByb21pc2UtY2hhaW4gY3ljbGVcIikpOihpPW4ocikpP2kuY2FsbChyLG8ucmVzb2x2ZSxvLnJlamVjdCk6by5yZXNvbHZlKHIpKX1jYXRjaChjKXtvLnJlamVjdChjKX19ZnVuY3Rpb24gcihvKXt2YXIgYyx1LGE9dGhpcztpZighYS50cmlnZ2VyZWQpe2EudHJpZ2dlcmVkPSEwLGEuZGVmJiYoYT1hLmRlZik7dHJ5eyhjPW4obykpPyh1PW5ldyBmKGEpLGMuY2FsbChvLGZ1bmN0aW9uKCl7ci5hcHBseSh1LGFyZ3VtZW50cyl9LGZ1bmN0aW9uKCl7aS5hcHBseSh1LGFyZ3VtZW50cyl9KSk6KGEubXNnPW8sYS5zdGF0ZT0xLGEuY2hhaW4ubGVuZ3RoPjAmJnQoZSxhKSl9Y2F0Y2gocyl7aS5jYWxsKHV8fG5ldyBmKGEpLHMpfX19ZnVuY3Rpb24gaShuKXt2YXIgbz10aGlzO28udHJpZ2dlcmVkfHwoby50cmlnZ2VyZWQ9ITAsby5kZWYmJihvPW8uZGVmKSxvLm1zZz1uLG8uc3RhdGU9MixvLmNoYWluLmxlbmd0aD4wJiZ0KGUsbykpfWZ1bmN0aW9uIGModCxuLGUsbyl7Zm9yKHZhciByPTA7cjxuLmxlbmd0aDtyKyspIWZ1bmN0aW9uKHIpe3QucmVzb2x2ZShuW3JdKS50aGVuKGZ1bmN0aW9uKHQpe2Uocix0KX0sbyl9KHIpfWZ1bmN0aW9uIGYodCl7dGhpcy5kZWY9dCx0aGlzLnRyaWdnZXJlZD0hMX1mdW5jdGlvbiB1KHQpe3RoaXMucHJvbWlzZT10LHRoaXMuc3RhdGU9MCx0aGlzLnRyaWdnZXJlZD0hMSx0aGlzLmNoYWluPVtdLHRoaXMubXNnPXZvaWQgMH1mdW5jdGlvbiBhKG4pe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIG4pdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7aWYoMCE9PXRoaXMuX19OUE9fXyl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBwcm9taXNlXCIpO3RoaXMuX19OUE9fXz0xO3ZhciBvPW5ldyB1KHRoaXMpO3RoaXMudGhlbj1mdW5jdGlvbihuLHIpe3ZhciBpPXtzdWNjZXNzOlwiZnVuY3Rpb25cIj09dHlwZW9mIG4/bjohMCxmYWlsdXJlOlwiZnVuY3Rpb25cIj09dHlwZW9mIHI/cjohMX07cmV0dXJuIGkucHJvbWlzZT1uZXcgdGhpcy5jb25zdHJ1Y3RvcihmdW5jdGlvbih0LG4pe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHR8fFwiZnVuY3Rpb25cIiE9dHlwZW9mIG4pdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7aS5yZXNvbHZlPXQsaS5yZWplY3Q9bn0pLG8uY2hhaW4ucHVzaChpKSwwIT09by5zdGF0ZSYmdChlLG8pLGkucHJvbWlzZX0sdGhpc1tcImNhdGNoXCJdPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnRoZW4odm9pZCAwLHQpfTt0cnl7bi5jYWxsKHZvaWQgMCxmdW5jdGlvbih0KXtyLmNhbGwobyx0KX0sZnVuY3Rpb24odCl7aS5jYWxsKG8sdCl9KX1jYXRjaChjKXtpLmNhbGwobyxjKX19dmFyIHMsaCxsLHA9T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyx5PVwidW5kZWZpbmVkXCIhPXR5cGVvZiBzZXRJbW1lZGlhdGU/ZnVuY3Rpb24odCl7cmV0dXJuIHNldEltbWVkaWF0ZSh0KX06c2V0VGltZW91dDt0cnl7T2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LFwieFwiLHt9KSxzPWZ1bmN0aW9uKHQsbixlLG8pe3JldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkodCxuLHt2YWx1ZTplLHdyaXRhYmxlOiEwLGNvbmZpZ3VyYWJsZTpvIT09ITF9KX19Y2F0Y2goZCl7cz1mdW5jdGlvbih0LG4sZSl7cmV0dXJuIHRbbl09ZSx0fX1sPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCh0LG4pe3RoaXMuZm49dCx0aGlzLnNlbGY9bix0aGlzLm5leHQ9dm9pZCAwfXZhciBuLGUsbztyZXR1cm57YWRkOmZ1bmN0aW9uKHIsaSl7bz1uZXcgdChyLGkpLGU/ZS5uZXh0PW86bj1vLGU9byxvPXZvaWQgMH0sZHJhaW46ZnVuY3Rpb24oKXt2YXIgdD1uO2ZvcihuPWU9aD12b2lkIDA7dDspdC5mbi5jYWxsKHQuc2VsZiksdD10Lm5leHR9fX0oKTt2YXIgZz1zKHt9LFwiY29uc3RydWN0b3JcIixhLCExKTtyZXR1cm4gYS5wcm90b3R5cGU9ZyxzKGcsXCJfX05QT19fXCIsMCwhMSkscyhhLFwicmVzb2x2ZVwiLGZ1bmN0aW9uKHQpe3ZhciBuPXRoaXM7cmV0dXJuIHQmJlwib2JqZWN0XCI9PXR5cGVvZiB0JiYxPT09dC5fX05QT19fP3Q6bmV3IG4oZnVuY3Rpb24obixlKXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBufHxcImZ1bmN0aW9uXCIhPXR5cGVvZiBlKXRocm93IFR5cGVFcnJvcihcIk5vdCBhIGZ1bmN0aW9uXCIpO24odCl9KX0pLHMoYSxcInJlamVjdFwiLGZ1bmN0aW9uKHQpe3JldHVybiBuZXcgdGhpcyhmdW5jdGlvbihuLGUpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIG58fFwiZnVuY3Rpb25cIiE9dHlwZW9mIGUpdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7ZSh0KX0pfSkscyhhLFwiYWxsXCIsZnVuY3Rpb24odCl7dmFyIG49dGhpcztyZXR1cm5cIltvYmplY3QgQXJyYXldXCIhPXAuY2FsbCh0KT9uLnJlamVjdChUeXBlRXJyb3IoXCJOb3QgYW4gYXJyYXlcIikpOjA9PT10Lmxlbmd0aD9uLnJlc29sdmUoW10pOm5ldyBuKGZ1bmN0aW9uKGUsbyl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZXx8XCJmdW5jdGlvblwiIT10eXBlb2Ygbyl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTt2YXIgcj10Lmxlbmd0aCxpPUFycmF5KHIpLGY9MDtjKG4sdCxmdW5jdGlvbih0LG4pe2lbdF09biwrK2Y9PT1yJiZlKGkpfSxvKX0pfSkscyhhLFwicmFjZVwiLGZ1bmN0aW9uKHQpe3ZhciBuPXRoaXM7cmV0dXJuXCJbb2JqZWN0IEFycmF5XVwiIT1wLmNhbGwodCk/bi5yZWplY3QoVHlwZUVycm9yKFwiTm90IGFuIGFycmF5XCIpKTpuZXcgbihmdW5jdGlvbihlLG8pe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIGV8fFwiZnVuY3Rpb25cIiE9dHlwZW9mIG8pdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7YyhuLHQsZnVuY3Rpb24odCxuKXtlKG4pfSxvKX0pfSksYX0pO1xuIl19
