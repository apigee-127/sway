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
 * SwaggerApi.create('http://petstore.swagger.io/v2/swagger.yaml')
 *   .then(function (api) {
 *     console.log('Documentation URL: ', api.documentation);
 *   }, function (err) {
 *     console.error(err.stack);
 *   });
 *
 * @example
 * // Example using callbacks
 * SwaggerApi.create('http://petstore.swagger.io/v2/swagger.yaml', function (err, api) {
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi90eXBlcy5qcyIsImxpYi92ZXJzaW9ucy8yLjAvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmF0aXZlLXByb21pc2Utb25seS9ucG8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgQXBpZ2VlIENvcnBvcmF0aW9uXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHdpbmRvdy5fKTtcbnZhciBwYXRoTG9hZGVyID0gKHdpbmRvdy5QYXRoTG9hZGVyKTtcbnZhciBZQU1MID0gKHdpbmRvdy5qc3lhbWwpO1xuXG4vLyBMb2FkIHByb21pc2VzIHBvbHlmaWxsIGlmIG5lY2Vzc2FyeVxuLyogaXN0YW5idWwgaWdub3JlIGlmICovXG5pZiAodHlwZW9mIFByb21pc2UgPT09ICd1bmRlZmluZWQnKSB7XG4gIHJlcXVpcmUoJ25hdGl2ZS1wcm9taXNlLW9ubHknKTtcbn1cblxudmFyIHN1cHBvcnRlZFZlcnNpb25zID0ge1xuICAnMi4wJzogcmVxdWlyZSgnLi9saWIvdmVyc2lvbnMvMi4wLycpXG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBTd2FnZ2VyQXBpIG9iamVjdCBmcm9tIGl0cyBTd2FnZ2VyIGRlZmluaXRpb24ocykuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBUaGUgb3B0aW9ucyBmb3IgbG9hZGluZyB0aGUgZGVmaW5pdGlvbihzKVxuICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zLmxvYWRlck9wdGlvbnNdIC0gVGhlIG9wdGlvbnMgdG8gcGFzcyB0byBwYXRoLWxvYWRlclxuICogQHBhcmFtIHtvYmplY3R8c3RyaW5nfSBvcHRpb25zLmRlZmluaXRpb24gLSBUaGUgU3dhZ2dlciBkZWZpbml0aW9uIGxvY2F0aW9uIG9yIHN0cnVjdHVyZVxuICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIE5vZGUuanMgZXJyb3ItZmlyc3QgY2FsbGJhY2tcbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIGlzIGFsd2F5cyByZXR1cm5lZCBldmVuIGlmIHlvdSBwcm92aWRlIGEgY2FsbGJhY2sgYnV0IGl0IGlzIG5vdCByZXF1aXJlZCB0byBiZSB1c2VkXG4gKlxuICogQGV4YW1wbGVcbiAqIC8vIEV4YW1wbGUgdXNpbmcgcHJvbWlzZXNcbiAqIFN3YWdnZXJBcGkuY3JlYXRlKCdodHRwOi8vcGV0c3RvcmUuc3dhZ2dlci5pby92Mi9zd2FnZ2VyLnlhbWwnKVxuICogICAudGhlbihmdW5jdGlvbiAoYXBpKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ0RvY3VtZW50YXRpb24gVVJMOiAnLCBhcGkuZG9jdW1lbnRhdGlvbik7XG4gKiAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGVyci5zdGFjayk7XG4gKiAgIH0pO1xuICpcbiAqIEBleGFtcGxlXG4gKiAvLyBFeGFtcGxlIHVzaW5nIGNhbGxiYWNrc1xuICogU3dhZ2dlckFwaS5jcmVhdGUoJ2h0dHA6Ly9wZXRzdG9yZS5zd2FnZ2VyLmlvL3YyL3N3YWdnZXIueWFtbCcsIGZ1bmN0aW9uIChlcnIsIGFwaSkge1xuICogICBpZiAoZXJyKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihlcnIuc3RhY2spO1xuICogICB9IGVsc2Uge1xuICogICAgIGNvbnNvbGUubG9nKCdEb2N1bWVudGF0aW9uIFVSTDogJywgYXBpLmRvY3VtZW50YXRpb24pO1xuICogICB9KTtcbiAqL1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24gKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIHZhciBhbGxUYXNrcyA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIC8vIFZhbGlkYXRlIGFyZ3VtZW50c1xuICBhbGxUYXNrcyA9IGFsbFRhc2tzLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuICAgICAgaWYgKF8uaXNVbmRlZmluZWQob3B0aW9ucykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9ucyBpcyByZXF1aXJlZCcpO1xuICAgICAgfSBlbHNlIGlmICghXy5pc1BsYWluT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgICAgIH0gZWxzZSBpZiAoXy5pc1VuZGVmaW5lZChvcHRpb25zLmRlZmluaXRpb24pKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbnMuZGVmaW5pdGlvbiBpcyByZXF1aXJlZCcpO1xuICAgICAgfSBlbHNlIGlmICghXy5pc1BsYWluT2JqZWN0KG9wdGlvbnMuZGVmaW5pdGlvbikgJiYgIV8uaXNTdHJpbmcob3B0aW9ucy5kZWZpbml0aW9uKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb25zLmRlZmluaXRpb24gbXVzdCBiZSBlaXRoZXIgYW4gb2JqZWN0IG9yIGEgc3RyaW5nJyk7XG4gICAgICB9IGVsc2UgaWYgKCFfLmlzVW5kZWZpbmVkKG9wdGlvbnMubG9hZGVyT3B0aW9ucykgJiYgIV8uaXNQbGFpbk9iamVjdChvcHRpb25zLmxvYWRlck9wdGlvbnMpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbnMubG9hZGVyT3B0aW9ucyBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICAgICAgfSBlbHNlIGlmICghXy5pc1VuZGVmaW5lZChjYWxsYmFjaykgJiYgIV8uaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG5cbiAgICAgIHJlc29sdmUoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gTWFrZSBhIGNvcHkgb2YgdGhlIGlucHV0IG9wdGlvbnMgc28gYXMgbm90IHRvIGFsdGVyIHRoZW1cbiAgb3B0aW9ucyA9IF8uY2xvbmVEZWVwKG9wdGlvbnMpO1xuXG4gIC8vIFJldHJpZXZlIHRoZSBkZWZpbml0aW9uIGlmIGl0IGlzIGEgcGF0aC9VUkxcbiAgYWxsVGFza3MgPSBhbGxUYXNrc1xuICAgIC8vIExvYWQgdGhlIHJlbW90ZSBkZWZpbml0aW9uIG9yIHJldHVybiBvcHRpb25zLmRlZmluaXRpb25cbiAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoXy5pc1N0cmluZyhvcHRpb25zLmRlZmluaXRpb24pKSB7XG4gICAgICAgIHJldHVybiBwYXRoTG9hZGVyLmxvYWQob3B0aW9ucy5kZWZpbml0aW9uLCBvcHRpb25zLmxvYWRlck9wdGlvbnMgfHwge30pLnRoZW4oWUFNTC5zYWZlTG9hZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kZWZpbml0aW9uO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIC8vIFByb2Nlc3MgdGhlIFN3YWdnZXIgZGVmaW5pdGlvbiAoaWYgcG9zc2libGUpXG4gIGFsbFRhc2tzID0gYWxsVGFza3NcbiAgICAudGhlbihmdW5jdGlvbiAoYXBpRGVmaW5pdGlvbikge1xuICAgICAgdmFyIGRlZmluaXRpb24gPSBfLmZpbmQoc3VwcG9ydGVkVmVyc2lvbnMsIGZ1bmN0aW9uIChwRGVmaW5pdGlvbikge1xuICAgICAgICByZXR1cm4gcERlZmluaXRpb24uY2FuUHJvY2VzcyhhcGlEZWZpbml0aW9uKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoXy5pc1VuZGVmaW5lZChkZWZpbml0aW9uKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmFibGUgdG8gaWRlbnRpZnkgdGhlIFN3YWdnZXIgdmVyc2lvbiBvciB0aGUgU3dhZ2dlciB2ZXJzaW9uIGlzIHVuc3VwcG9ydGVkJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkZWZpbml0aW9uLmNyZWF0ZVN3YWdnZXJBcGkoYXBpRGVmaW5pdGlvbiwgb3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgLy8gVXNlIHRoZSBjYWxsYmFjayBpZiBwcm92aWRlZCBhbmQgaXQgaXMgYSBmdW5jdGlvblxuICBpZiAoIV8uaXNVbmRlZmluZWQoY2FsbGJhY2spICYmIF8uaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICBhbGxUYXNrcyA9IGFsbFRhc2tzXG4gICAgICAudGhlbihmdW5jdGlvbiAoc3dhZ2dlckFwaSkge1xuICAgICAgICBjYWxsYmFjayh1bmRlZmluZWQsIHN3YWdnZXJBcGkpO1xuICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSk7XG4gIH1cblxuICByZXR1cm4gYWxsVGFza3M7XG59O1xuIiwiLypcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBBcGlnZWUgQ29ycG9yYXRpb25cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIF8gPSAod2luZG93Ll8pO1xuXG4vKipcbiAqIFRoZSBTd2FnZ2VyIE9wZXJhdGlvbiBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggLSBUaGUgb3BlcmF0aW9uIHBhdGhcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgLSBUaGUgb3BlcmF0aW9uIG1ldGhvZFxuICogQHBhcmFtIHtzdHJpbmd9IHB0ciAtIFRoZSBKU09OIFBvaW50ZXIgdG8gdGhlIG9wZXJhdGlvblxuICogQHBhcmFtIHtvYmplY3R9IGRlZmluaXRpb24gLSBUaGUgb3BlcmF0aW9uIGRlZmluaXRpb25cbiAqIEBwYXJhbSB7UGFyYW1ldGVyW119IHBhcmFtZXRlcnMgLSBUaGUgU3dhZ2dlciBwYXJhbWV0ZXIgb2JqZWN0c1xuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBPcGVyYXRpb24gKHBhdGgsIG1ldGhvZCwgcHRyLCBkZWZpbml0aW9uLCBwYXJhbWV0ZXJzKSB7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMubWV0aG9kID0gbWV0aG9kO1xuICB0aGlzLnB0ciA9IHB0cjtcbiAgdGhpcy5kZWZpbml0aW9uID0gZGVmaW5pdGlvbjtcbiAgdGhpcy5wYXJhbWV0ZXJPYmplY3RzID0gcGFyYW1ldGVycztcblxuICAvLyBBc3NpZ24gU3dhZ2dlciBkZWZpbml0aW9uIHByb3BlcnRpZXMgdG8gdGhlIG9wZXJhdGlvbiBmb3IgZWFzeSBhY2Nlc3NcbiAgXy5hc3NpZ24odGhpcywgZGVmaW5pdGlvbik7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgcGFyYW1ldGVycyBmb3IgdGhlIG9wZXJhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyB7UGFyYW1ldGVyW119IEFsbCBwYXJhbWV0ZXJzIGZvciB0aGUgb3BlcmF0aW9uLlxuICovXG5PcGVyYXRpb24ucHJvdG90eXBlLmdldFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnBhcmFtZXRlck9iamVjdHM7XG59O1xuXG4vKipcbiAqIFRoZSBTd2FnZ2VyIFBhcmFtZXRlciBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHB0ciAtIFRoZSBKU09OIFBvaW50ZXIgdG8gdGhlIHBhcmFtZXRlclxuICogQHBhcmFtIHtvYmplY3R9IGRlZmluaXRpb24gLSBUaGUgcGFyYW1ldGVyIGRlZmluaXRpb25cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUGFyYW1ldGVyIChwdHIsIGRlZmluaXRpb24pIHtcbiAgdGhpcy5wdHIgPSBwdHI7XG4gIHRoaXMuZGVmaW5pdGlvbiA9IGRlZmluaXRpb247XG5cbiAgLy8gQXNzaWduIFN3YWdnZXIgZGVmaW5pdGlvbiBwcm9wZXJ0aWVzIHRvIHRoZSBwYXJhbWV0ZXIgZm9yIGVhc3kgYWNjZXNzXG4gIF8uYXNzaWduKHRoaXMsIGRlZmluaXRpb24pO1xufVxuXG4vKipcbiAqIFRoZSBTd2FnZ2VyIEFQSSBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZmluaXRpb24gLSBUaGUgU3dhZ2dlciBkZWZpbml0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdmVyc2lvbiAtIFRoZSBTd2FnZ2VyIGRlZmluaXRpb24gdmVyc2lvblxuICogQHBhcmFtIHtzdHJpbmd9IGRvY3VtZW50YXRpb24gLSBUaGUgU3dhZ2dlciBTcGVjaWZpY2F0aW9uIGRvY3VtZW50YXRpb24gVVJMXG4gKiBAcGFyYW0ge09wZXJhdGlvbltdfSBvcGVyYXRpb25zIC0gVGhlIFN3YWdnZXIgb3BlcmF0aW9uIG9iamVjdHNcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gVGhlIG9wdGlvbnMgcGFzc2VkIHRvIHN3YWdnZXJBcGkuY3JlYXRlXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFN3YWdnZXJBcGkgKGRlZmluaXRpb24sIHZlcnNpb24sIGRvY3VtZW50YXRpb24sIG9wZXJhdGlvbnMsIG9wdGlvbnMpIHtcbiAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgdGhpcy5kZWZpbml0aW9uID0gZGVmaW5pdGlvbjtcbiAgdGhpcy5kb2N1bWVudGF0aW9uID0gZG9jdW1lbnRhdGlvbjtcbiAgdGhpcy5vcGVyYXRpb25PYmplY3RzID0gb3BlcmF0aW9ucztcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAvLyBBc3NpZ24gU3dhZ2dlciBkZWZpbml0aW9uIHByb3BlcnRpZXMgdG8gdGhlIGFwaSBmb3IgZWFzeSBhY2Nlc3NcbiAgXy5hc3NpZ24odGhpcywgZGVmaW5pdGlvbik7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgb3BlcmF0aW9uIGZvciB0aGUgcHJvdmlkZWQgcGF0aCBhbmQgbWV0aG9kLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gVGhlIFN3YWdnZXIgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCAtIFRoZSBTd2FnZ2VyIG9wZXJhdGlvbiBtZXRob2RcbiAqXG4gKiBAcmV0dXJucyB7T3BlcmF0aW9ufSBUaGUgb3BlcmF0aW9uIGZvciB0aGUgcHJvdmlkZWQgcGF0aCBhbmQgbWV0aG9kIG9yIHVuZGVmaW5lZCBpZiB0aGVyZSBpcyBubyBvcGVyYXRpb24gZm9yIHRoYXRcbiAqICAgICAgICAgICAgICAgICAgICAgIHBhdGggYW5kIG1ldGhvZCBjb21iaW5hdGlvbi5cbiAqL1xuU3dhZ2dlckFwaS5wcm90b3R5cGUuZ2V0T3BlcmF0aW9uID0gZnVuY3Rpb24gKHBhdGgsIG1ldGhvZCkge1xuICByZXR1cm4gXy5maW5kKHRoaXMub3BlcmF0aW9uT2JqZWN0cywgZnVuY3Rpb24gKG9wZXJhdGlvbikge1xuICAgIHJldHVybiBvcGVyYXRpb24ucGF0aCA9PT0gcGF0aCAmJiBvcGVyYXRpb24ubWV0aG9kID09PSBtZXRob2QudG9Mb3dlckNhc2UoKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYWxsIG9wZXJhdGlvbnMgZm9yIHRoZSBwcm92aWRlZCBwYXRoIG9yIGFsbCBvcGVyYXRpb25zIGluIHRoZSBBUEkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IFtwYXRoXSAtIFRoZSBTd2FnZ2VyIHBhdGhcbiAqXG4gKiBAcmV0dXJucyB7T3BlcmF0aW9uW119IEFsbCBvcGVyYXRpb25zIGZvciB0aGUgcHJvdmlkZWQgcGF0aCBvciBhbGwgQVBJIG9wZXJhdGlvbnMuXG4gKi9cblN3YWdnZXJBcGkucHJvdG90eXBlLmdldE9wZXJhdGlvbnMgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gXy5maWx0ZXIodGhpcy5vcGVyYXRpb25PYmplY3RzLCBmdW5jdGlvbiAob3BlcmF0aW9uKSB7XG4gICAgcmV0dXJuIF8uaXNVbmRlZmluZWQocGF0aCkgPyB0cnVlIDogb3BlcmF0aW9uLnBhdGggPT09IHBhdGg7XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIE9wZXJhdGlvbjogT3BlcmF0aW9uLFxuICBQYXJhbWV0ZXI6IFBhcmFtZXRlcixcbiAgU3dhZ2dlckFwaTogU3dhZ2dlckFwaVxufTtcbiIsIi8qXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgQXBpZ2VlIENvcnBvcmF0aW9uXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHdpbmRvdy5fKTtcbnZhciBKc29uUmVmcyA9ICh3aW5kb3cuSnNvblJlZnMpO1xudmFyIHR5cGVzID0gcmVxdWlyZSgnLi4vLi4vdHlwZXMnKTtcbnZhciBkb2NzVXJsID0gJ2h0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLXNwZWMvYmxvYi9tYXN0ZXIvdmVyc2lvbnMvMi4wLm1kJztcbnZhciBzdXBwb3J0ZWRIdHRwTWV0aG9kcyA9IFsnZ2V0JywgJ3B1dCcsICdwb3N0JywgJ2RlbGV0ZScsICdvcHRpb25zJywgJ2hlYWQnLCAncGF0Y2gnXTtcbnZhciB2ZXJzaW9uID0gJzIuMCc7XG5cbmZ1bmN0aW9uIGdldE9wZXJhdGlvbnMgKHJlc29sdmVkKSB7XG4gIHZhciBvcGVyYXRpb25zID0gW107XG5cbiAgXy5mb3JFYWNoKHJlc29sdmVkLnBhdGhzLCBmdW5jdGlvbiAocGF0aERlZiwgcGF0aCkge1xuICAgIHZhciBwUGF0aCA9IFsncGF0aHMnLCBwYXRoXTtcbiAgICB2YXIgcFBhcmFtcyA9IF8ucmVkdWNlKHBhdGhEZWYucGFyYW1ldGVycyB8fCB7fSwgZnVuY3Rpb24gKHBhcmFtZXRlcnMsIHBhcmFtRGVmLCBpbmRleCkge1xuICAgICAgcGFyYW1ldGVyc1twYXJhbURlZi5uYW1lICsgJzonICsgcGFyYW1EZWYuaW5dID0ge1xuICAgICAgICBwYXRoOiBwUGF0aC5jb25jYXQoWydwYXJhbWV0ZXJzJywgaW5kZXgudG9TdHJpbmcoKV0pLFxuICAgICAgICBkZWZpbml0aW9uOiBwYXJhbURlZlxuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHBhcmFtZXRlcnM7XG4gICAgfSwge30pO1xuXG4gICAgXy5mb3JFYWNoKHBhdGhEZWYsIGZ1bmN0aW9uIChvcGVyYXRpb24sIG1ldGhvZCkge1xuICAgICAgLy8gRG8gbm90IHByb2Nlc3Mgbm9uLW9wZXJhdGlvbnNcbiAgICAgIGlmIChfLmluZGV4T2Yoc3VwcG9ydGVkSHR0cE1ldGhvZHMsIG1ldGhvZCkgPT09IC0xKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGNPcGVyYXRpb24gPSBfLmNsb25lRGVlcChvcGVyYXRpb24pOyAvLyBDbG9uZSBzbyB3ZSBkbyBub3QgYWx0ZXIgdGhlIGlucHV0XG4gICAgICB2YXIgb1BhcmFtcyA9IHt9OyAvLyBVc2VkIHRvIGtlZXAgdHJhY2sgb2YgdW5pcXVlIHBhcmFtZXRlcnNcbiAgICAgIHZhciBvUGF0aCA9IHBQYXRoLmNvbmNhdChtZXRob2QpO1xuICAgICAgdmFyIHBhcmFtT2JqcyA9IFtdO1xuXG4gICAgICAvLyBBZGQgcGF0aCBwYXJhbWV0ZXJzXG4gICAgICBfLmZvckVhY2gocFBhcmFtcywgZnVuY3Rpb24gKHBQYXJhbSwga2V5KSB7XG4gICAgICAgIG9QYXJhbXNba2V5XSA9IHBQYXJhbTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBZGQgb3BlcmF0aW9uIHBhcmFtZXRlcnMgKE92ZXJyaWRlcyBwYXRoLWxldmVsIHBhcmFtZXRlcnMgb2Ygc2FtZSBuYW1lK2luIGNvbWJpbmF0aW9uKVxuICAgICAgXy5mb3JFYWNoKG9wZXJhdGlvbi5wYXJhbWV0ZXJzLCBmdW5jdGlvbiAocGFyYW1EZWYsIGluZGV4KSB7XG4gICAgICAgIG9QYXJhbXNbcGFyYW1EZWYubmFtZSArICc6JyArIHBhcmFtRGVmLmluXSA9IHtcbiAgICAgICAgICBwYXRoOiBvUGF0aC5jb25jYXQoWydwYXJhbWV0ZXJzJywgaW5kZXgudG9TdHJpbmcoKV0pLFxuICAgICAgICAgIGRlZmluaXRpb246IHBhcmFtRGVmXG4gICAgICAgIH07XG4gICAgICB9KTtcblxuICAgICAgLy8gQXR0YWNoIG91ciBjb21wdXRlZCBwYXJhbWV0ZXJzL3NlY3VyaXR5IHRvIHRoZSBvcGVyYXRpb25cbiAgICAgIGNPcGVyYXRpb24ucGFyYW1ldGVycyA9IF8ubWFwKF8udmFsdWVzKG9QYXJhbXMpLCBmdW5jdGlvbiAocGFyYW1ldGVyKSB7XG4gICAgICAgIHBhcmFtT2Jqcy5wdXNoKG5ldyB0eXBlcy5QYXJhbWV0ZXIoSnNvblJlZnMucGF0aFRvUG9pbnRlcihwYXJhbWV0ZXIucGF0aCksIHBhcmFtZXRlci5kZWZpbml0aW9uKSk7XG5cbiAgICAgICAgcmV0dXJuIHBhcmFtZXRlci5kZWZpbml0aW9uO1xuICAgICAgfSk7XG5cblxuICAgICAgaWYgKF8uaXNVbmRlZmluZWQoY09wZXJhdGlvbi5zZWN1cml0eSkpIHtcbiAgICAgICAgY09wZXJhdGlvbi5zZWN1cml0eSA9IHJlc29sdmVkLnNlY3VyaXR5O1xuICAgICAgfVxuXG4gICAgICBvcGVyYXRpb25zLnB1c2gobmV3IHR5cGVzLk9wZXJhdGlvbihwYXRoLCBtZXRob2QsIEpzb25SZWZzLnBhdGhUb1BvaW50ZXIob1BhdGgpLCBjT3BlcmF0aW9uLCBwYXJhbU9ianMpKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIG9wZXJhdGlvbnM7XG59XG5cbi8vIFRoZSBVUkwgdG8gdGhlIFN3YWdnZXIgMi4wIGRvY3VtZW50YXRpb25cbm1vZHVsZS5leHBvcnRzLmRvY3VtZW50YXRpb24gPSBkb2NzVXJsO1xuXG4vLyBUaGUgYXJyYXkgb2Ygc3VwcG9ydGVkIEhUVFAgbWV0aG9kcyBmb3IgZWFjaCBwYXRoXG5tb2R1bGUuZXhwb3J0cy5zdXBwb3J0ZWRIdHRwTWV0aG9kcyA9IHN1cHBvcnRlZEh0dHBNZXRob2RzO1xuXG4vLyBUaGUgdmVyc2lvbiBmb3IgdGhpcyBTd2FnZ2VyIHZlcnNpb25cbm1vZHVsZS5leHBvcnRzLnZlcnNpb24gPSB2ZXJzaW9uO1xuXG4vKipcbiAqIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIHByb3ZpZGVkIGRlZmluaXRpb24gY2FuIGJlIHByb2Nlc3NlZC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmaW5pdGlvbiAtIFRoZSBwb3RlbnRpYWwgU3dhZ2dlciBkZWZpbml0aW9uIHRvIHRlc3RcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIG9ubHkgaWYgdGhlIGRlZmluaXRpb24gcmVwcmVzZW50cyBhIFN3YWdnZXIgMi4wIGRlZmluaXRpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMuY2FuUHJvY2VzcyA9IGZ1bmN0aW9uIChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uLnN3YWdnZXIgPT09IHZlcnNpb247XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBTd2FnZ2VyQXBpIG9iamVjdCBmcm9tIHRoZSBwcm92aWRlZCBTd2FnZ2VyIGRlZmluaXRpb24uXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZmluaXRpb24gLSBUaGUgU3dhZ2dlciBkZWZpbml0aW9uXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIFRoZSBvcHRpb25zIHBhc3NlZCB0byBzd2FnZ2VyQXBpLmNyZWF0ZVxuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0aGUgU3dhZ2dlckFwaSBhZnRlciBwcm9jZXNzaW5nXG4gKi9cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZVN3YWdnZXJBcGkgPSBmdW5jdGlvbiAoZGVmaW5pdGlvbiwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIEpzb25SZWZzLnJlc29sdmVSZWZzKGRlZmluaXRpb24sIG9wdGlvbnMubG9hZGVyT3B0aW9ucyB8fCB7fSwgZnVuY3Rpb24gKGVyciwgcmVzb2x2ZWQsIG1ldGFkYXRhKSB7XG4gICAgICB2YXIgYXBpO1xuXG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcGkgPSBuZXcgdHlwZXMuU3dhZ2dlckFwaShkZWZpbml0aW9uLCB2ZXJzaW9uLCBkb2NzVXJsLCBnZXRPcGVyYXRpb25zKHJlc29sdmVkKSwgb3B0aW9ucyk7XG5cbiAgICAgICAgYXBpLnJlZmVyZW5jZXMgPSBtZXRhZGF0YTtcbiAgICAgICAgYXBpLnJlc29sdmVkID0gcmVzb2x2ZWQ7XG5cbiAgICAgICAgcmVzb2x2ZShhcGkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG4iLCIvKiEgTmF0aXZlIFByb21pc2UgT25seVxuICAgIHYwLjcuOC1hIChjKSBLeWxlIFNpbXBzb25cbiAgICBNSVQgTGljZW5zZTogaHR0cDovL2dldGlmeS5taXQtbGljZW5zZS5vcmdcbiovXG4hZnVuY3Rpb24odCxuLGUpe25bdF09blt0XXx8ZSgpLFwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPW5bdF06XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kJiZkZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gblt0XX0pfShcIlByb21pc2VcIixcInVuZGVmaW5lZFwiIT10eXBlb2YgZ2xvYmFsP2dsb2JhbDp0aGlzLGZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gdCh0LG4pe2wuYWRkKHQsbiksaHx8KGg9eShsLmRyYWluKSl9ZnVuY3Rpb24gbih0KXt2YXIgbixlPXR5cGVvZiB0O3JldHVybiBudWxsPT10fHxcIm9iamVjdFwiIT1lJiZcImZ1bmN0aW9uXCIhPWV8fChuPXQudGhlbiksXCJmdW5jdGlvblwiPT10eXBlb2Ygbj9uOiExfWZ1bmN0aW9uIGUoKXtmb3IodmFyIHQ9MDt0PHRoaXMuY2hhaW4ubGVuZ3RoO3QrKylvKHRoaXMsMT09PXRoaXMuc3RhdGU/dGhpcy5jaGFpblt0XS5zdWNjZXNzOnRoaXMuY2hhaW5bdF0uZmFpbHVyZSx0aGlzLmNoYWluW3RdKTt0aGlzLmNoYWluLmxlbmd0aD0wfWZ1bmN0aW9uIG8odCxlLG8pe3ZhciByLGk7dHJ5e2U9PT0hMT9vLnJlamVjdCh0Lm1zZyk6KHI9ZT09PSEwP3QubXNnOmUuY2FsbCh2b2lkIDAsdC5tc2cpLHI9PT1vLnByb21pc2U/by5yZWplY3QoVHlwZUVycm9yKFwiUHJvbWlzZS1jaGFpbiBjeWNsZVwiKSk6KGk9bihyKSk/aS5jYWxsKHIsby5yZXNvbHZlLG8ucmVqZWN0KTpvLnJlc29sdmUocikpfWNhdGNoKGMpe28ucmVqZWN0KGMpfX1mdW5jdGlvbiByKG8pe3ZhciBjLHUsYT10aGlzO2lmKCFhLnRyaWdnZXJlZCl7YS50cmlnZ2VyZWQ9ITAsYS5kZWYmJihhPWEuZGVmKTt0cnl7KGM9bihvKSk/KHU9bmV3IGYoYSksYy5jYWxsKG8sZnVuY3Rpb24oKXtyLmFwcGx5KHUsYXJndW1lbnRzKX0sZnVuY3Rpb24oKXtpLmFwcGx5KHUsYXJndW1lbnRzKX0pKTooYS5tc2c9byxhLnN0YXRlPTEsYS5jaGFpbi5sZW5ndGg+MCYmdChlLGEpKX1jYXRjaChzKXtpLmNhbGwodXx8bmV3IGYoYSkscyl9fX1mdW5jdGlvbiBpKG4pe3ZhciBvPXRoaXM7by50cmlnZ2VyZWR8fChvLnRyaWdnZXJlZD0hMCxvLmRlZiYmKG89by5kZWYpLG8ubXNnPW4sby5zdGF0ZT0yLG8uY2hhaW4ubGVuZ3RoPjAmJnQoZSxvKSl9ZnVuY3Rpb24gYyh0LG4sZSxvKXtmb3IodmFyIHI9MDtyPG4ubGVuZ3RoO3IrKykhZnVuY3Rpb24ocil7dC5yZXNvbHZlKG5bcl0pLnRoZW4oZnVuY3Rpb24odCl7ZShyLHQpfSxvKX0ocil9ZnVuY3Rpb24gZih0KXt0aGlzLmRlZj10LHRoaXMudHJpZ2dlcmVkPSExfWZ1bmN0aW9uIHUodCl7dGhpcy5wcm9taXNlPXQsdGhpcy5zdGF0ZT0wLHRoaXMudHJpZ2dlcmVkPSExLHRoaXMuY2hhaW49W10sdGhpcy5tc2c9dm9pZCAwfWZ1bmN0aW9uIGEobil7aWYoXCJmdW5jdGlvblwiIT10eXBlb2Ygbil0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtpZigwIT09dGhpcy5fX05QT19fKXRocm93IFR5cGVFcnJvcihcIk5vdCBhIHByb21pc2VcIik7dGhpcy5fX05QT19fPTE7dmFyIG89bmV3IHUodGhpcyk7dGhpcy50aGVuPWZ1bmN0aW9uKG4scil7dmFyIGk9e3N1Y2Nlc3M6XCJmdW5jdGlvblwiPT10eXBlb2Ygbj9uOiEwLGZhaWx1cmU6XCJmdW5jdGlvblwiPT10eXBlb2Ygcj9yOiExfTtyZXR1cm4gaS5wcm9taXNlPW5ldyB0aGlzLmNvbnN0cnVjdG9yKGZ1bmN0aW9uKHQsbil7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdHx8XCJmdW5jdGlvblwiIT10eXBlb2Ygbil0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtpLnJlc29sdmU9dCxpLnJlamVjdD1ufSksby5jaGFpbi5wdXNoKGkpLDAhPT1vLnN0YXRlJiZ0KGUsbyksaS5wcm9taXNlfSx0aGlzW1wiY2F0Y2hcIl09ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMudGhlbih2b2lkIDAsdCl9O3RyeXtuLmNhbGwodm9pZCAwLGZ1bmN0aW9uKHQpe3IuY2FsbChvLHQpfSxmdW5jdGlvbih0KXtpLmNhbGwobyx0KX0pfWNhdGNoKGMpe2kuY2FsbChvLGMpfX12YXIgcyxoLGwscD1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLHk9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNldEltbWVkaWF0ZT9mdW5jdGlvbih0KXtyZXR1cm4gc2V0SW1tZWRpYXRlKHQpfTpzZXRUaW1lb3V0O3RyeXtPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sXCJ4XCIse30pLHM9ZnVuY3Rpb24odCxuLGUsbyl7cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LG4se3ZhbHVlOmUsd3JpdGFibGU6ITAsY29uZmlndXJhYmxlOm8hPT0hMX0pfX1jYXRjaChkKXtzPWZ1bmN0aW9uKHQsbixlKXtyZXR1cm4gdFtuXT1lLHR9fWw9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQsbil7dGhpcy5mbj10LHRoaXMuc2VsZj1uLHRoaXMubmV4dD12b2lkIDB9dmFyIG4sZSxvO3JldHVybnthZGQ6ZnVuY3Rpb24ocixpKXtvPW5ldyB0KHIsaSksZT9lLm5leHQ9bzpuPW8sZT1vLG89dm9pZCAwfSxkcmFpbjpmdW5jdGlvbigpe3ZhciB0PW47Zm9yKG49ZT1oPXZvaWQgMDt0Oyl0LmZuLmNhbGwodC5zZWxmKSx0PXQubmV4dH19fSgpO3ZhciBnPXMoe30sXCJjb25zdHJ1Y3RvclwiLGEsITEpO3JldHVybiBhLnByb3RvdHlwZT1nLHMoZyxcIl9fTlBPX19cIiwwLCExKSxzKGEsXCJyZXNvbHZlXCIsZnVuY3Rpb24odCl7dmFyIG49dGhpcztyZXR1cm4gdCYmXCJvYmplY3RcIj09dHlwZW9mIHQmJjE9PT10Ll9fTlBPX18/dDpuZXcgbihmdW5jdGlvbihuLGUpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIG58fFwiZnVuY3Rpb25cIiE9dHlwZW9mIGUpdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7bih0KX0pfSkscyhhLFwicmVqZWN0XCIsZnVuY3Rpb24odCl7cmV0dXJuIG5ldyB0aGlzKGZ1bmN0aW9uKG4sZSl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2Ygbnx8XCJmdW5jdGlvblwiIT10eXBlb2YgZSl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtlKHQpfSl9KSxzKGEsXCJhbGxcIixmdW5jdGlvbih0KXt2YXIgbj10aGlzO3JldHVyblwiW29iamVjdCBBcnJheV1cIiE9cC5jYWxsKHQpP24ucmVqZWN0KFR5cGVFcnJvcihcIk5vdCBhbiBhcnJheVwiKSk6MD09PXQubGVuZ3RoP24ucmVzb2x2ZShbXSk6bmV3IG4oZnVuY3Rpb24oZSxvKXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBlfHxcImZ1bmN0aW9uXCIhPXR5cGVvZiBvKXRocm93IFR5cGVFcnJvcihcIk5vdCBhIGZ1bmN0aW9uXCIpO3ZhciByPXQubGVuZ3RoLGk9QXJyYXkociksZj0wO2Mobix0LGZ1bmN0aW9uKHQsbil7aVt0XT1uLCsrZj09PXImJmUoaSl9LG8pfSl9KSxzKGEsXCJyYWNlXCIsZnVuY3Rpb24odCl7dmFyIG49dGhpcztyZXR1cm5cIltvYmplY3QgQXJyYXldXCIhPXAuY2FsbCh0KT9uLnJlamVjdChUeXBlRXJyb3IoXCJOb3QgYW4gYXJyYXlcIikpOm5ldyBuKGZ1bmN0aW9uKGUsbyl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZXx8XCJmdW5jdGlvblwiIT10eXBlb2Ygbyl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtjKG4sdCxmdW5jdGlvbih0LG4pe2Uobil9LG8pfSl9KSxhfSk7XG4iXX0=
