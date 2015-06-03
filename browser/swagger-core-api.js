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
 * Returns the JSON Schema for the requested code or the default response if no code is provided.
 *
 * @param {number|string} [code=default] - The response code
 *
 * @returns {object} The JSON Schema for the response, which can be undefined if the response schema is not provided
 *
 * @throws {Error} Thrown whenever the requested code does not exist (Throwing an error instead of returning undefined
 *                 is required due to undefined being a valid response schema indicating a void response)
 */
Operation.prototype.getResponseSchema = function (code) {
  var response;

  if (_.isUndefined(code)) {
    code = 'default';
  } else if (_.isNumber(code)) {
    code = (Math.floor(100 * code) / 100).toFixed(); // Overly cautious but oh well...
  }

  response = this.definition.responses[code];

  if (_.isUndefined(response)) {
    throw new Error('This operation does not have a defined \'' + code + '\' response code');
  } else {
    return response.schema;
  }
};

/**
 * The Swagger Parameter object.
 *
 * <strong>Note:</strong> Do not use directly.
 *
 * @param {string} ptr - The JSON Pointer to the parameter
 * @param {object} definition - The parameter definition
 * @param {object} schema - The JSON Schema for the parameter
 *
 * @constructor
 */
function Parameter (ptr, definition, schema) {
  this.ptr = ptr;
  this.definition = definition;
  this.computedSchema = schema;

  // Assign Swagger definition properties to the parameter for easy access
  _.assign(this, definition);
}

/**
 * Returns the computed JSON Schema for this parameter object.
 *
 * @returns {object} The JSON Schema
 */
Parameter.prototype.getSchema = function () {
  return this.computedSchema;
};

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

var customSchemaFormatValidators = {};
var docsUrl = 'https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md';
// https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#parameter-object
var parameterSchemaProperties = [
  'default',
  'description',
  'enum',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'format',
  'items',
  'maxItems',
  'maxLength',
  'maximum',
  'minItems',
  'minLength',
  'minimum',
  'multipleOf',
  'pattern',
  'type',
  'uniqueItems'
];
var supportedHttpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
var version = '2.0';

// Build the list of custom JSON Schema validator formats
customSchemaFormatValidators.int32 = customSchemaFormatValidators.int64 = function (val) {
  var valid = true;
  var cVal;

  if (!_.isNumber(val)) {
    try {
      cVal = parseInt(val, 10);
    } catch (err) {
      valid = false;
    }
  }

  if (_.isNumber(cVal)) {
    valid = cVal % 1 === 0;
  }

  return valid;
};

customSchemaFormatValidators.double = customSchemaFormatValidators.float = function (val) {
  var valid = true;

  if (!_.isNumber(val)) {
    try {
      parseFloat(val);
    } catch (err) {
      valid = false;
    }
  }

  return valid;
};

customSchemaFormatValidators.byte = function (val) {
  // TODO: We could do more here since technically 'byte' means a base64 encoded string
  return _.isString(val);
};

customSchemaFormatValidators.password = function (val) {
  return _.isString(val);
};

function getParameterSchema (parameter) {
  var schema;

  if (_.isUndefined(parameter.schema)) {
    schema = {};

    // Build the schema from the schema-like parameter structure
    _.each(parameterSchemaProperties, function (name) {
      if (!_.isUndefined(parameter[name])) {
        schema[name] = parameter[name];
      }
    });
  } else {
    schema = parameter.schema;
  }

  return schema;
}

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
        paramObjs.push(new types.Parameter(JsonRefs.pathToPointer(parameter.path), parameter.definition,
                                           getParameterSchema(parameter.definition)));

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

// The custom JSON Schema format validators
// (All formats not explicitly handled here: https://github.com/zaggino/z-schema/blob/master/src/FormatValidators.js)
module.exports.customSchemaFormatValidators = customSchemaFormatValidators;

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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi90eXBlcy5qcyIsImxpYi92ZXJzaW9ucy8yLjAvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmF0aXZlLXByb21pc2Utb25seS9ucG8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEFwaWdlZSBDb3Jwb3JhdGlvblxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh3aW5kb3cuXyk7XG52YXIgcGF0aExvYWRlciA9ICh3aW5kb3cuUGF0aExvYWRlcik7XG52YXIgWUFNTCA9ICh3aW5kb3cuanN5YW1sKTtcblxuLy8gTG9hZCBwcm9taXNlcyBwb2x5ZmlsbCBpZiBuZWNlc3Nhcnlcbi8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuaWYgKHR5cGVvZiBQcm9taXNlID09PSAndW5kZWZpbmVkJykge1xuICByZXF1aXJlKCduYXRpdmUtcHJvbWlzZS1vbmx5Jyk7XG59XG5cbnZhciBzdXBwb3J0ZWRWZXJzaW9ucyA9IHtcbiAgJzIuMCc6IHJlcXVpcmUoJy4vbGliL3ZlcnNpb25zLzIuMC8nKVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgU3dhZ2dlckFwaSBvYmplY3QgZnJvbSBpdHMgU3dhZ2dlciBkZWZpbml0aW9uKHMpLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gVGhlIG9wdGlvbnMgZm9yIGxvYWRpbmcgdGhlIGRlZmluaXRpb24ocylcbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9ucy5sb2FkZXJPcHRpb25zXSAtIFRoZSBvcHRpb25zIHRvIHBhc3MgdG8gcGF0aC1sb2FkZXJcbiAqIEBwYXJhbSB7b2JqZWN0fHN0cmluZ30gb3B0aW9ucy5kZWZpbml0aW9uIC0gVGhlIFN3YWdnZXIgZGVmaW5pdGlvbiBsb2NhdGlvbiBvciBzdHJ1Y3R1cmVcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBOb2RlLmpzIGVycm9yLWZpcnN0IGNhbGxiYWNrXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9IEEgcHJvbWlzZSBpcyBhbHdheXMgcmV0dXJuZWQgZXZlbiBpZiB5b3UgcHJvdmlkZSBhIGNhbGxiYWNrIGJ1dCBpdCBpcyBub3QgcmVxdWlyZWQgdG8gYmUgdXNlZFxuICpcbiAqIEBleGFtcGxlXG4gKiAvLyBFeGFtcGxlIHVzaW5nIHByb21pc2VzXG4gKiBTd2FnZ2VyQXBpLmNyZWF0ZSh7ZGVmaW5pdGlvbjogJ2h0dHA6Ly9wZXRzdG9yZS5zd2FnZ2VyLmlvL3YyL3N3YWdnZXIueWFtbCd9KVxuICogICAudGhlbihmdW5jdGlvbiAoYXBpKSB7XG4gKiAgICAgY29uc29sZS5sb2coJ0RvY3VtZW50YXRpb24gVVJMOiAnLCBhcGkuZG9jdW1lbnRhdGlvbik7XG4gKiAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGVyci5zdGFjayk7XG4gKiAgIH0pO1xuICpcbiAqIEBleGFtcGxlXG4gKiAvLyBFeGFtcGxlIHVzaW5nIGNhbGxiYWNrc1xuICogU3dhZ2dlckFwaS5jcmVhdGUoe2RlZmluaXRpb246ICdodHRwOi8vcGV0c3RvcmUuc3dhZ2dlci5pby92Mi9zd2FnZ2VyLnlhbWwnfSwgZnVuY3Rpb24gKGVyciwgYXBpKSB7XG4gKiAgIGlmIChlcnIpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGVyci5zdGFjayk7XG4gKiAgIH0gZWxzZSB7XG4gKiAgICAgY29uc29sZS5sb2coJ0RvY3VtZW50YXRpb24gVVJMOiAnLCBhcGkuZG9jdW1lbnRhdGlvbik7XG4gKiAgIH0pO1xuICovXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbiAob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgdmFyIGFsbFRhc2tzID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgLy8gVmFsaWRhdGUgYXJndW1lbnRzXG4gIGFsbFRhc2tzID0gYWxsVGFza3MudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlKSB7XG4gICAgICBpZiAoXy5pc1VuZGVmaW5lZChvcHRpb25zKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdvcHRpb25zIGlzIHJlcXVpcmVkJyk7XG4gICAgICB9IGVsc2UgaWYgKCFfLmlzUGxhaW5PYmplY3Qob3B0aW9ucykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9ucyBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICAgICAgfSBlbHNlIGlmIChfLmlzVW5kZWZpbmVkKG9wdGlvbnMuZGVmaW5pdGlvbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9ucy5kZWZpbml0aW9uIGlzIHJlcXVpcmVkJyk7XG4gICAgICB9IGVsc2UgaWYgKCFfLmlzUGxhaW5PYmplY3Qob3B0aW9ucy5kZWZpbml0aW9uKSAmJiAhXy5pc1N0cmluZyhvcHRpb25zLmRlZmluaXRpb24pKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ29wdGlvbnMuZGVmaW5pdGlvbiBtdXN0IGJlIGVpdGhlciBhbiBvYmplY3Qgb3IgYSBzdHJpbmcnKTtcbiAgICAgIH0gZWxzZSBpZiAoIV8uaXNVbmRlZmluZWQob3B0aW9ucy5sb2FkZXJPcHRpb25zKSAmJiAhXy5pc1BsYWluT2JqZWN0KG9wdGlvbnMubG9hZGVyT3B0aW9ucykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignb3B0aW9ucy5sb2FkZXJPcHRpb25zIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICB9IGVsc2UgaWYgKCFfLmlzVW5kZWZpbmVkKGNhbGxiYWNrKSAmJiAhXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cblxuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBNYWtlIGEgY29weSBvZiB0aGUgaW5wdXQgb3B0aW9ucyBzbyBhcyBub3QgdG8gYWx0ZXIgdGhlbVxuICBvcHRpb25zID0gXy5jbG9uZURlZXAob3B0aW9ucyk7XG5cbiAgLy8gUmV0cmlldmUgdGhlIGRlZmluaXRpb24gaWYgaXQgaXMgYSBwYXRoL1VSTFxuICBhbGxUYXNrcyA9IGFsbFRhc2tzXG4gICAgLy8gTG9hZCB0aGUgcmVtb3RlIGRlZmluaXRpb24gb3IgcmV0dXJuIG9wdGlvbnMuZGVmaW5pdGlvblxuICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChfLmlzU3RyaW5nKG9wdGlvbnMuZGVmaW5pdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIHBhdGhMb2FkZXIubG9hZChvcHRpb25zLmRlZmluaXRpb24sIG9wdGlvbnMubG9hZGVyT3B0aW9ucyB8fCB7fSkudGhlbihZQU1MLnNhZmVMb2FkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLmRlZmluaXRpb247XG4gICAgICB9XG4gICAgfSk7XG5cbiAgLy8gUHJvY2VzcyB0aGUgU3dhZ2dlciBkZWZpbml0aW9uIChpZiBwb3NzaWJsZSlcbiAgYWxsVGFza3MgPSBhbGxUYXNrc1xuICAgIC50aGVuKGZ1bmN0aW9uIChhcGlEZWZpbml0aW9uKSB7XG4gICAgICB2YXIgZGVmaW5pdGlvbiA9IF8uZmluZChzdXBwb3J0ZWRWZXJzaW9ucywgZnVuY3Rpb24gKHBEZWZpbml0aW9uKSB7XG4gICAgICAgIHJldHVybiBwRGVmaW5pdGlvbi5jYW5Qcm9jZXNzKGFwaURlZmluaXRpb24pO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGRlZmluaXRpb24pKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1VuYWJsZSB0byBpZGVudGlmeSB0aGUgU3dhZ2dlciB2ZXJzaW9uIG9yIHRoZSBTd2FnZ2VyIHZlcnNpb24gaXMgdW5zdXBwb3J0ZWQnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlZmluaXRpb24uY3JlYXRlU3dhZ2dlckFwaShhcGlEZWZpbml0aW9uLCBvcHRpb25zKTtcbiAgICB9KTtcblxuICAvLyBVc2UgdGhlIGNhbGxiYWNrIGlmIHByb3ZpZGVkIGFuZCBpdCBpcyBhIGZ1bmN0aW9uXG4gIGlmICghXy5pc1VuZGVmaW5lZChjYWxsYmFjaykgJiYgXy5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgIGFsbFRhc2tzID0gYWxsVGFza3NcbiAgICAgIC50aGVuKGZ1bmN0aW9uIChzd2FnZ2VyQXBpKSB7XG4gICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgc3dhZ2dlckFwaSk7XG4gICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBhbGxUYXNrcztcbn07XG4iLCIvKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEFwaWdlZSBDb3Jwb3JhdGlvblxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgXyA9ICh3aW5kb3cuXyk7XG5cbi8qKlxuICogVGhlIFN3YWdnZXIgT3BlcmF0aW9uIG9iamVjdC5cbiAqXG4gKiA8c3Ryb25nPk5vdGU6PC9zdHJvbmc+IERvIG5vdCB1c2UgZGlyZWN0bHkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggLSBUaGUgb3BlcmF0aW9uIHBhdGhcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgLSBUaGUgb3BlcmF0aW9uIG1ldGhvZFxuICogQHBhcmFtIHtzdHJpbmd9IHB0ciAtIFRoZSBKU09OIFBvaW50ZXIgdG8gdGhlIG9wZXJhdGlvblxuICogQHBhcmFtIHtvYmplY3R9IGRlZmluaXRpb24gLSBUaGUgb3BlcmF0aW9uIGRlZmluaXRpb25cbiAqIEBwYXJhbSB7UGFyYW1ldGVyW119IHBhcmFtZXRlcnMgLSBUaGUgU3dhZ2dlciBwYXJhbWV0ZXIgb2JqZWN0c1xuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBPcGVyYXRpb24gKHBhdGgsIG1ldGhvZCwgcHRyLCBkZWZpbml0aW9uLCBwYXJhbWV0ZXJzKSB7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMubWV0aG9kID0gbWV0aG9kO1xuICB0aGlzLnB0ciA9IHB0cjtcbiAgdGhpcy5kZWZpbml0aW9uID0gZGVmaW5pdGlvbjtcbiAgdGhpcy5wYXJhbWV0ZXJPYmplY3RzID0gcGFyYW1ldGVycztcblxuICAvLyBBc3NpZ24gU3dhZ2dlciBkZWZpbml0aW9uIHByb3BlcnRpZXMgdG8gdGhlIG9wZXJhdGlvbiBmb3IgZWFzeSBhY2Nlc3NcbiAgXy5hc3NpZ24odGhpcywgZGVmaW5pdGlvbik7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgcGFyYW1ldGVycyBmb3IgdGhlIG9wZXJhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyB7UGFyYW1ldGVyW119IEFsbCBwYXJhbWV0ZXJzIGZvciB0aGUgb3BlcmF0aW9uLlxuICovXG5PcGVyYXRpb24ucHJvdG90eXBlLmdldFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnBhcmFtZXRlck9iamVjdHM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIEpTT04gU2NoZW1hIGZvciB0aGUgcmVxdWVzdGVkIGNvZGUgb3IgdGhlIGRlZmF1bHQgcmVzcG9uc2UgaWYgbm8gY29kZSBpcyBwcm92aWRlZC5cbiAqXG4gKiBAcGFyYW0ge251bWJlcnxzdHJpbmd9IFtjb2RlPWRlZmF1bHRdIC0gVGhlIHJlc3BvbnNlIGNvZGVcbiAqXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBUaGUgSlNPTiBTY2hlbWEgZm9yIHRoZSByZXNwb25zZSwgd2hpY2ggY2FuIGJlIHVuZGVmaW5lZCBpZiB0aGUgcmVzcG9uc2Ugc2NoZW1hIGlzIG5vdCBwcm92aWRlZFxuICpcbiAqIEB0aHJvd3Mge0Vycm9yfSBUaHJvd24gd2hlbmV2ZXIgdGhlIHJlcXVlc3RlZCBjb2RlIGRvZXMgbm90IGV4aXN0IChUaHJvd2luZyBhbiBlcnJvciBpbnN0ZWFkIG9mIHJldHVybmluZyB1bmRlZmluZWRcbiAqICAgICAgICAgICAgICAgICBpcyByZXF1aXJlZCBkdWUgdG8gdW5kZWZpbmVkIGJlaW5nIGEgdmFsaWQgcmVzcG9uc2Ugc2NoZW1hIGluZGljYXRpbmcgYSB2b2lkIHJlc3BvbnNlKVxuICovXG5PcGVyYXRpb24ucHJvdG90eXBlLmdldFJlc3BvbnNlU2NoZW1hID0gZnVuY3Rpb24gKGNvZGUpIHtcbiAgdmFyIHJlc3BvbnNlO1xuXG4gIGlmIChfLmlzVW5kZWZpbmVkKGNvZGUpKSB7XG4gICAgY29kZSA9ICdkZWZhdWx0JztcbiAgfSBlbHNlIGlmIChfLmlzTnVtYmVyKGNvZGUpKSB7XG4gICAgY29kZSA9IChNYXRoLmZsb29yKDEwMCAqIGNvZGUpIC8gMTAwKS50b0ZpeGVkKCk7IC8vIE92ZXJseSBjYXV0aW91cyBidXQgb2ggd2VsbC4uLlxuICB9XG5cbiAgcmVzcG9uc2UgPSB0aGlzLmRlZmluaXRpb24ucmVzcG9uc2VzW2NvZGVdO1xuXG4gIGlmIChfLmlzVW5kZWZpbmVkKHJlc3BvbnNlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgaGF2ZSBhIGRlZmluZWQgXFwnJyArIGNvZGUgKyAnXFwnIHJlc3BvbnNlIGNvZGUnKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmVzcG9uc2Uuc2NoZW1hO1xuICB9XG59O1xuXG4vKipcbiAqIFRoZSBTd2FnZ2VyIFBhcmFtZXRlciBvYmplY3QuXG4gKlxuICogPHN0cm9uZz5Ob3RlOjwvc3Ryb25nPiBEbyBub3QgdXNlIGRpcmVjdGx5LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwdHIgLSBUaGUgSlNPTiBQb2ludGVyIHRvIHRoZSBwYXJhbWV0ZXJcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZpbml0aW9uIC0gVGhlIHBhcmFtZXRlciBkZWZpbml0aW9uXG4gKiBAcGFyYW0ge29iamVjdH0gc2NoZW1hIC0gVGhlIEpTT04gU2NoZW1hIGZvciB0aGUgcGFyYW1ldGVyXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFBhcmFtZXRlciAocHRyLCBkZWZpbml0aW9uLCBzY2hlbWEpIHtcbiAgdGhpcy5wdHIgPSBwdHI7XG4gIHRoaXMuZGVmaW5pdGlvbiA9IGRlZmluaXRpb247XG4gIHRoaXMuY29tcHV0ZWRTY2hlbWEgPSBzY2hlbWE7XG5cbiAgLy8gQXNzaWduIFN3YWdnZXIgZGVmaW5pdGlvbiBwcm9wZXJ0aWVzIHRvIHRoZSBwYXJhbWV0ZXIgZm9yIGVhc3kgYWNjZXNzXG4gIF8uYXNzaWduKHRoaXMsIGRlZmluaXRpb24pO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGNvbXB1dGVkIEpTT04gU2NoZW1hIGZvciB0aGlzIHBhcmFtZXRlciBvYmplY3QuXG4gKlxuICogQHJldHVybnMge29iamVjdH0gVGhlIEpTT04gU2NoZW1hXG4gKi9cblBhcmFtZXRlci5wcm90b3R5cGUuZ2V0U2NoZW1hID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5jb21wdXRlZFNjaGVtYTtcbn07XG5cbi8qKlxuICogVGhlIFN3YWdnZXIgQVBJIG9iamVjdC5cbiAqXG4gKiA8c3Ryb25nPk5vdGU6PC9zdHJvbmc+IERvIG5vdCB1c2UgZGlyZWN0bHkuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZmluaXRpb24gLSBUaGUgU3dhZ2dlciBkZWZpbml0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdmVyc2lvbiAtIFRoZSBTd2FnZ2VyIGRlZmluaXRpb24gdmVyc2lvblxuICogQHBhcmFtIHtzdHJpbmd9IGRvY3VtZW50YXRpb24gLSBUaGUgU3dhZ2dlciBTcGVjaWZpY2F0aW9uIGRvY3VtZW50YXRpb24gVVJMXG4gKiBAcGFyYW0ge09wZXJhdGlvbltdfSBvcGVyYXRpb25zIC0gVGhlIFN3YWdnZXIgb3BlcmF0aW9uIG9iamVjdHNcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gVGhlIG9wdGlvbnMgcGFzc2VkIHRvIHN3YWdnZXJBcGkuY3JlYXRlXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFN3YWdnZXJBcGkgKGRlZmluaXRpb24sIHZlcnNpb24sIGRvY3VtZW50YXRpb24sIG9wZXJhdGlvbnMsIG9wdGlvbnMpIHtcbiAgdGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgdGhpcy5kZWZpbml0aW9uID0gZGVmaW5pdGlvbjtcbiAgdGhpcy5kb2N1bWVudGF0aW9uID0gZG9jdW1lbnRhdGlvbjtcbiAgdGhpcy5vcGVyYXRpb25PYmplY3RzID0gb3BlcmF0aW9ucztcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAvLyBBc3NpZ24gU3dhZ2dlciBkZWZpbml0aW9uIHByb3BlcnRpZXMgdG8gdGhlIGFwaSBmb3IgZWFzeSBhY2Nlc3NcbiAgXy5hc3NpZ24odGhpcywgZGVmaW5pdGlvbik7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgb3BlcmF0aW9uIGZvciB0aGUgcHJvdmlkZWQgcGF0aCBhbmQgbWV0aG9kLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gVGhlIFN3YWdnZXIgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZCAtIFRoZSBTd2FnZ2VyIG9wZXJhdGlvbiBtZXRob2RcbiAqXG4gKiBAcmV0dXJucyB7T3BlcmF0aW9ufSBUaGUgb3BlcmF0aW9uIGZvciB0aGUgcHJvdmlkZWQgcGF0aCBhbmQgbWV0aG9kIG9yIHVuZGVmaW5lZCBpZiB0aGVyZSBpcyBubyBvcGVyYXRpb24gZm9yIHRoYXRcbiAqICAgICAgICAgICAgICAgICAgICAgIHBhdGggYW5kIG1ldGhvZCBjb21iaW5hdGlvbi5cbiAqL1xuU3dhZ2dlckFwaS5wcm90b3R5cGUuZ2V0T3BlcmF0aW9uID0gZnVuY3Rpb24gKHBhdGgsIG1ldGhvZCkge1xuICByZXR1cm4gXy5maW5kKHRoaXMub3BlcmF0aW9uT2JqZWN0cywgZnVuY3Rpb24gKG9wZXJhdGlvbikge1xuICAgIHJldHVybiBvcGVyYXRpb24ucGF0aCA9PT0gcGF0aCAmJiBvcGVyYXRpb24ubWV0aG9kID09PSBtZXRob2QudG9Mb3dlckNhc2UoKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYWxsIG9wZXJhdGlvbnMgZm9yIHRoZSBwcm92aWRlZCBwYXRoIG9yIGFsbCBvcGVyYXRpb25zIGluIHRoZSBBUEkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IFtwYXRoXSAtIFRoZSBTd2FnZ2VyIHBhdGhcbiAqXG4gKiBAcmV0dXJucyB7T3BlcmF0aW9uW119IEFsbCBvcGVyYXRpb25zIGZvciB0aGUgcHJvdmlkZWQgcGF0aCBvciBhbGwgQVBJIG9wZXJhdGlvbnMuXG4gKi9cblN3YWdnZXJBcGkucHJvdG90eXBlLmdldE9wZXJhdGlvbnMgPSBmdW5jdGlvbiAocGF0aCkge1xuICByZXR1cm4gXy5maWx0ZXIodGhpcy5vcGVyYXRpb25PYmplY3RzLCBmdW5jdGlvbiAob3BlcmF0aW9uKSB7XG4gICAgcmV0dXJuIF8uaXNVbmRlZmluZWQocGF0aCkgPyB0cnVlIDogb3BlcmF0aW9uLnBhdGggPT09IHBhdGg7XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIE9wZXJhdGlvbjogT3BlcmF0aW9uLFxuICBQYXJhbWV0ZXI6IFBhcmFtZXRlcixcbiAgU3dhZ2dlckFwaTogU3dhZ2dlckFwaVxufTtcbiIsIi8qXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgQXBpZ2VlIENvcnBvcmF0aW9uXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBfID0gKHdpbmRvdy5fKTtcbnZhciBKc29uUmVmcyA9ICh3aW5kb3cuSnNvblJlZnMpO1xudmFyIHR5cGVzID0gcmVxdWlyZSgnLi4vLi4vdHlwZXMnKTtcblxudmFyIGN1c3RvbVNjaGVtYUZvcm1hdFZhbGlkYXRvcnMgPSB7fTtcbnZhciBkb2NzVXJsID0gJ2h0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLXNwZWMvYmxvYi9tYXN0ZXIvdmVyc2lvbnMvMi4wLm1kJztcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLXNwZWMvYmxvYi9tYXN0ZXIvdmVyc2lvbnMvMi4wLm1kI3BhcmFtZXRlci1vYmplY3RcbnZhciBwYXJhbWV0ZXJTY2hlbWFQcm9wZXJ0aWVzID0gW1xuICAnZGVmYXVsdCcsXG4gICdkZXNjcmlwdGlvbicsXG4gICdlbnVtJyxcbiAgJ2V4Y2x1c2l2ZU1heGltdW0nLFxuICAnZXhjbHVzaXZlTWluaW11bScsXG4gICdmb3JtYXQnLFxuICAnaXRlbXMnLFxuICAnbWF4SXRlbXMnLFxuICAnbWF4TGVuZ3RoJyxcbiAgJ21heGltdW0nLFxuICAnbWluSXRlbXMnLFxuICAnbWluTGVuZ3RoJyxcbiAgJ21pbmltdW0nLFxuICAnbXVsdGlwbGVPZicsXG4gICdwYXR0ZXJuJyxcbiAgJ3R5cGUnLFxuICAndW5pcXVlSXRlbXMnXG5dO1xudmFyIHN1cHBvcnRlZEh0dHBNZXRob2RzID0gWydnZXQnLCAncHV0JywgJ3Bvc3QnLCAnZGVsZXRlJywgJ29wdGlvbnMnLCAnaGVhZCcsICdwYXRjaCddO1xudmFyIHZlcnNpb24gPSAnMi4wJztcblxuLy8gQnVpbGQgdGhlIGxpc3Qgb2YgY3VzdG9tIEpTT04gU2NoZW1hIHZhbGlkYXRvciBmb3JtYXRzXG5jdXN0b21TY2hlbWFGb3JtYXRWYWxpZGF0b3JzLmludDMyID0gY3VzdG9tU2NoZW1hRm9ybWF0VmFsaWRhdG9ycy5pbnQ2NCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgdmFyIHZhbGlkID0gdHJ1ZTtcbiAgdmFyIGNWYWw7XG5cbiAgaWYgKCFfLmlzTnVtYmVyKHZhbCkpIHtcbiAgICB0cnkge1xuICAgICAgY1ZhbCA9IHBhcnNlSW50KHZhbCwgMTApO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZiAoXy5pc051bWJlcihjVmFsKSkge1xuICAgIHZhbGlkID0gY1ZhbCAlIDEgPT09IDA7XG4gIH1cblxuICByZXR1cm4gdmFsaWQ7XG59O1xuXG5jdXN0b21TY2hlbWFGb3JtYXRWYWxpZGF0b3JzLmRvdWJsZSA9IGN1c3RvbVNjaGVtYUZvcm1hdFZhbGlkYXRvcnMuZmxvYXQgPSBmdW5jdGlvbiAodmFsKSB7XG4gIHZhciB2YWxpZCA9IHRydWU7XG5cbiAgaWYgKCFfLmlzTnVtYmVyKHZhbCkpIHtcbiAgICB0cnkge1xuICAgICAgcGFyc2VGbG9hdCh2YWwpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsaWQ7XG59O1xuXG5jdXN0b21TY2hlbWFGb3JtYXRWYWxpZGF0b3JzLmJ5dGUgPSBmdW5jdGlvbiAodmFsKSB7XG4gIC8vIFRPRE86IFdlIGNvdWxkIGRvIG1vcmUgaGVyZSBzaW5jZSB0ZWNobmljYWxseSAnYnl0ZScgbWVhbnMgYSBiYXNlNjQgZW5jb2RlZCBzdHJpbmdcbiAgcmV0dXJuIF8uaXNTdHJpbmcodmFsKTtcbn07XG5cbmN1c3RvbVNjaGVtYUZvcm1hdFZhbGlkYXRvcnMucGFzc3dvcmQgPSBmdW5jdGlvbiAodmFsKSB7XG4gIHJldHVybiBfLmlzU3RyaW5nKHZhbCk7XG59O1xuXG5mdW5jdGlvbiBnZXRQYXJhbWV0ZXJTY2hlbWEgKHBhcmFtZXRlcikge1xuICB2YXIgc2NoZW1hO1xuXG4gIGlmIChfLmlzVW5kZWZpbmVkKHBhcmFtZXRlci5zY2hlbWEpKSB7XG4gICAgc2NoZW1hID0ge307XG5cbiAgICAvLyBCdWlsZCB0aGUgc2NoZW1hIGZyb20gdGhlIHNjaGVtYS1saWtlIHBhcmFtZXRlciBzdHJ1Y3R1cmVcbiAgICBfLmVhY2gocGFyYW1ldGVyU2NoZW1hUHJvcGVydGllcywgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIGlmICghXy5pc1VuZGVmaW5lZChwYXJhbWV0ZXJbbmFtZV0pKSB7XG4gICAgICAgIHNjaGVtYVtuYW1lXSA9IHBhcmFtZXRlcltuYW1lXTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBzY2hlbWEgPSBwYXJhbWV0ZXIuc2NoZW1hO1xuICB9XG5cbiAgcmV0dXJuIHNjaGVtYTtcbn1cblxuZnVuY3Rpb24gZ2V0T3BlcmF0aW9ucyAocmVzb2x2ZWQpIHtcbiAgdmFyIG9wZXJhdGlvbnMgPSBbXTtcblxuICBfLmZvckVhY2gocmVzb2x2ZWQucGF0aHMsIGZ1bmN0aW9uIChwYXRoRGVmLCBwYXRoKSB7XG4gICAgdmFyIHBQYXRoID0gWydwYXRocycsIHBhdGhdO1xuICAgIHZhciBwUGFyYW1zID0gXy5yZWR1Y2UocGF0aERlZi5wYXJhbWV0ZXJzIHx8IHt9LCBmdW5jdGlvbiAocGFyYW1ldGVycywgcGFyYW1EZWYsIGluZGV4KSB7XG4gICAgICBwYXJhbWV0ZXJzW3BhcmFtRGVmLm5hbWUgKyAnOicgKyBwYXJhbURlZi5pbl0gPSB7XG4gICAgICAgIHBhdGg6IHBQYXRoLmNvbmNhdChbJ3BhcmFtZXRlcnMnLCBpbmRleC50b1N0cmluZygpXSksXG4gICAgICAgIGRlZmluaXRpb246IHBhcmFtRGVmXG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gcGFyYW1ldGVycztcbiAgICB9LCB7fSk7XG5cbiAgICBfLmZvckVhY2gocGF0aERlZiwgZnVuY3Rpb24gKG9wZXJhdGlvbiwgbWV0aG9kKSB7XG4gICAgICAvLyBEbyBub3QgcHJvY2VzcyBub24tb3BlcmF0aW9uc1xuICAgICAgaWYgKF8uaW5kZXhPZihzdXBwb3J0ZWRIdHRwTWV0aG9kcywgbWV0aG9kKSA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgY09wZXJhdGlvbiA9IF8uY2xvbmVEZWVwKG9wZXJhdGlvbik7IC8vIENsb25lIHNvIHdlIGRvIG5vdCBhbHRlciB0aGUgaW5wdXRcbiAgICAgIHZhciBvUGFyYW1zID0ge307IC8vIFVzZWQgdG8ga2VlcCB0cmFjayBvZiB1bmlxdWUgcGFyYW1ldGVyc1xuICAgICAgdmFyIG9QYXRoID0gcFBhdGguY29uY2F0KG1ldGhvZCk7XG4gICAgICB2YXIgcGFyYW1PYmpzID0gW107XG5cbiAgICAgIC8vIEFkZCBwYXRoIHBhcmFtZXRlcnNcbiAgICAgIF8uZm9yRWFjaChwUGFyYW1zLCBmdW5jdGlvbiAocFBhcmFtLCBrZXkpIHtcbiAgICAgICAgb1BhcmFtc1trZXldID0gcFBhcmFtO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEFkZCBvcGVyYXRpb24gcGFyYW1ldGVycyAoT3ZlcnJpZGVzIHBhdGgtbGV2ZWwgcGFyYW1ldGVycyBvZiBzYW1lIG5hbWUraW4gY29tYmluYXRpb24pXG4gICAgICBfLmZvckVhY2gob3BlcmF0aW9uLnBhcmFtZXRlcnMsIGZ1bmN0aW9uIChwYXJhbURlZiwgaW5kZXgpIHtcbiAgICAgICAgb1BhcmFtc1twYXJhbURlZi5uYW1lICsgJzonICsgcGFyYW1EZWYuaW5dID0ge1xuICAgICAgICAgIHBhdGg6IG9QYXRoLmNvbmNhdChbJ3BhcmFtZXRlcnMnLCBpbmRleC50b1N0cmluZygpXSksXG4gICAgICAgICAgZGVmaW5pdGlvbjogcGFyYW1EZWZcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBdHRhY2ggb3VyIGNvbXB1dGVkIHBhcmFtZXRlcnMvc2VjdXJpdHkgdG8gdGhlIG9wZXJhdGlvblxuICAgICAgY09wZXJhdGlvbi5wYXJhbWV0ZXJzID0gXy5tYXAoXy52YWx1ZXMob1BhcmFtcyksIGZ1bmN0aW9uIChwYXJhbWV0ZXIpIHtcbiAgICAgICAgcGFyYW1PYmpzLnB1c2gobmV3IHR5cGVzLlBhcmFtZXRlcihKc29uUmVmcy5wYXRoVG9Qb2ludGVyKHBhcmFtZXRlci5wYXRoKSwgcGFyYW1ldGVyLmRlZmluaXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0UGFyYW1ldGVyU2NoZW1hKHBhcmFtZXRlci5kZWZpbml0aW9uKSkpO1xuXG4gICAgICAgIHJldHVybiBwYXJhbWV0ZXIuZGVmaW5pdGlvbjtcbiAgICAgIH0pO1xuXG5cbiAgICAgIGlmIChfLmlzVW5kZWZpbmVkKGNPcGVyYXRpb24uc2VjdXJpdHkpKSB7XG4gICAgICAgIGNPcGVyYXRpb24uc2VjdXJpdHkgPSByZXNvbHZlZC5zZWN1cml0eTtcbiAgICAgIH1cblxuICAgICAgb3BlcmF0aW9ucy5wdXNoKG5ldyB0eXBlcy5PcGVyYXRpb24ocGF0aCwgbWV0aG9kLCBKc29uUmVmcy5wYXRoVG9Qb2ludGVyKG9QYXRoKSwgY09wZXJhdGlvbiwgcGFyYW1PYmpzKSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHJldHVybiBvcGVyYXRpb25zO1xufVxuXG4vLyBUaGUgY3VzdG9tIEpTT04gU2NoZW1hIGZvcm1hdCB2YWxpZGF0b3JzXG4vLyAoQWxsIGZvcm1hdHMgbm90IGV4cGxpY2l0bHkgaGFuZGxlZCBoZXJlOiBodHRwczovL2dpdGh1Yi5jb20vemFnZ2luby96LXNjaGVtYS9ibG9iL21hc3Rlci9zcmMvRm9ybWF0VmFsaWRhdG9ycy5qcylcbm1vZHVsZS5leHBvcnRzLmN1c3RvbVNjaGVtYUZvcm1hdFZhbGlkYXRvcnMgPSBjdXN0b21TY2hlbWFGb3JtYXRWYWxpZGF0b3JzO1xuXG4vLyBUaGUgVVJMIHRvIHRoZSBTd2FnZ2VyIDIuMCBkb2N1bWVudGF0aW9uXG5tb2R1bGUuZXhwb3J0cy5kb2N1bWVudGF0aW9uID0gZG9jc1VybDtcblxuLy8gVGhlIGFycmF5IG9mIHN1cHBvcnRlZCBIVFRQIG1ldGhvZHMgZm9yIGVhY2ggcGF0aFxubW9kdWxlLmV4cG9ydHMuc3VwcG9ydGVkSHR0cE1ldGhvZHMgPSBzdXBwb3J0ZWRIdHRwTWV0aG9kcztcblxuLy8gVGhlIHZlcnNpb24gZm9yIHRoaXMgU3dhZ2dlciB2ZXJzaW9uXG5tb2R1bGUuZXhwb3J0cy52ZXJzaW9uID0gdmVyc2lvbjtcblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBwcm92aWRlZCBkZWZpbml0aW9uIGNhbiBiZSBwcm9jZXNzZWQuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IGRlZmluaXRpb24gLSBUaGUgcG90ZW50aWFsIFN3YWdnZXIgZGVmaW5pdGlvbiB0byB0ZXN0XG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBvbmx5IGlmIHRoZSBkZWZpbml0aW9uIHJlcHJlc2VudHMgYSBTd2FnZ2VyIDIuMCBkZWZpbml0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzLmNhblByb2Nlc3MgPSBmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xuICByZXR1cm4gZGVmaW5pdGlvbi5zd2FnZ2VyID09PSB2ZXJzaW9uO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgU3dhZ2dlckFwaSBvYmplY3QgZnJvbSB0aGUgcHJvdmlkZWQgU3dhZ2dlciBkZWZpbml0aW9uLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBkZWZpbml0aW9uIC0gVGhlIFN3YWdnZXIgZGVmaW5pdGlvblxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBUaGUgb3B0aW9ucyBwYXNzZWQgdG8gc3dhZ2dlckFwaS5jcmVhdGVcbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdGhlIFN3YWdnZXJBcGkgYWZ0ZXIgcHJvY2Vzc2luZ1xuICovXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVTd2FnZ2VyQXBpID0gZnVuY3Rpb24gKGRlZmluaXRpb24sIG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBKc29uUmVmcy5yZXNvbHZlUmVmcyhkZWZpbml0aW9uLCBvcHRpb25zLmxvYWRlck9wdGlvbnMgfHwge30sIGZ1bmN0aW9uIChlcnIsIHJlc29sdmVkLCBtZXRhZGF0YSkge1xuICAgICAgdmFyIGFwaTtcblxuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBpID0gbmV3IHR5cGVzLlN3YWdnZXJBcGkoZGVmaW5pdGlvbiwgdmVyc2lvbiwgZG9jc1VybCwgZ2V0T3BlcmF0aW9ucyhyZXNvbHZlZCksIG9wdGlvbnMpO1xuXG4gICAgICAgIGFwaS5yZWZlcmVuY2VzID0gbWV0YWRhdGE7XG4gICAgICAgIGFwaS5yZXNvbHZlZCA9IHJlc29sdmVkO1xuXG4gICAgICAgIHJlc29sdmUoYXBpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xuIiwiLyohIE5hdGl2ZSBQcm9taXNlIE9ubHlcbiAgICB2MC43LjgtYSAoYykgS3lsZSBTaW1wc29uXG4gICAgTUlUIExpY2Vuc2U6IGh0dHA6Ly9nZXRpZnkubWl0LWxpY2Vuc2Uub3JnXG4qL1xuIWZ1bmN0aW9uKHQsbixlKXtuW3RdPW5bdF18fGUoKSxcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1uW3RdOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZCYmZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIG5bdF19KX0oXCJQcm9taXNlXCIsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9nbG9iYWw6dGhpcyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHQodCxuKXtsLmFkZCh0LG4pLGh8fChoPXkobC5kcmFpbikpfWZ1bmN0aW9uIG4odCl7dmFyIG4sZT10eXBlb2YgdDtyZXR1cm4gbnVsbD09dHx8XCJvYmplY3RcIiE9ZSYmXCJmdW5jdGlvblwiIT1lfHwobj10LnRoZW4pLFwiZnVuY3Rpb25cIj09dHlwZW9mIG4/bjohMX1mdW5jdGlvbiBlKCl7Zm9yKHZhciB0PTA7dDx0aGlzLmNoYWluLmxlbmd0aDt0Kyspbyh0aGlzLDE9PT10aGlzLnN0YXRlP3RoaXMuY2hhaW5bdF0uc3VjY2Vzczp0aGlzLmNoYWluW3RdLmZhaWx1cmUsdGhpcy5jaGFpblt0XSk7dGhpcy5jaGFpbi5sZW5ndGg9MH1mdW5jdGlvbiBvKHQsZSxvKXt2YXIgcixpO3RyeXtlPT09ITE/by5yZWplY3QodC5tc2cpOihyPWU9PT0hMD90Lm1zZzplLmNhbGwodm9pZCAwLHQubXNnKSxyPT09by5wcm9taXNlP28ucmVqZWN0KFR5cGVFcnJvcihcIlByb21pc2UtY2hhaW4gY3ljbGVcIikpOihpPW4ocikpP2kuY2FsbChyLG8ucmVzb2x2ZSxvLnJlamVjdCk6by5yZXNvbHZlKHIpKX1jYXRjaChjKXtvLnJlamVjdChjKX19ZnVuY3Rpb24gcihvKXt2YXIgYyx1LGE9dGhpcztpZighYS50cmlnZ2VyZWQpe2EudHJpZ2dlcmVkPSEwLGEuZGVmJiYoYT1hLmRlZik7dHJ5eyhjPW4obykpPyh1PW5ldyBmKGEpLGMuY2FsbChvLGZ1bmN0aW9uKCl7ci5hcHBseSh1LGFyZ3VtZW50cyl9LGZ1bmN0aW9uKCl7aS5hcHBseSh1LGFyZ3VtZW50cyl9KSk6KGEubXNnPW8sYS5zdGF0ZT0xLGEuY2hhaW4ubGVuZ3RoPjAmJnQoZSxhKSl9Y2F0Y2gocyl7aS5jYWxsKHV8fG5ldyBmKGEpLHMpfX19ZnVuY3Rpb24gaShuKXt2YXIgbz10aGlzO28udHJpZ2dlcmVkfHwoby50cmlnZ2VyZWQ9ITAsby5kZWYmJihvPW8uZGVmKSxvLm1zZz1uLG8uc3RhdGU9MixvLmNoYWluLmxlbmd0aD4wJiZ0KGUsbykpfWZ1bmN0aW9uIGModCxuLGUsbyl7Zm9yKHZhciByPTA7cjxuLmxlbmd0aDtyKyspIWZ1bmN0aW9uKHIpe3QucmVzb2x2ZShuW3JdKS50aGVuKGZ1bmN0aW9uKHQpe2Uocix0KX0sbyl9KHIpfWZ1bmN0aW9uIGYodCl7dGhpcy5kZWY9dCx0aGlzLnRyaWdnZXJlZD0hMX1mdW5jdGlvbiB1KHQpe3RoaXMucHJvbWlzZT10LHRoaXMuc3RhdGU9MCx0aGlzLnRyaWdnZXJlZD0hMSx0aGlzLmNoYWluPVtdLHRoaXMubXNnPXZvaWQgMH1mdW5jdGlvbiBhKG4pe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIG4pdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7aWYoMCE9PXRoaXMuX19OUE9fXyl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBwcm9taXNlXCIpO3RoaXMuX19OUE9fXz0xO3ZhciBvPW5ldyB1KHRoaXMpO3RoaXMudGhlbj1mdW5jdGlvbihuLHIpe3ZhciBpPXtzdWNjZXNzOlwiZnVuY3Rpb25cIj09dHlwZW9mIG4/bjohMCxmYWlsdXJlOlwiZnVuY3Rpb25cIj09dHlwZW9mIHI/cjohMX07cmV0dXJuIGkucHJvbWlzZT1uZXcgdGhpcy5jb25zdHJ1Y3RvcihmdW5jdGlvbih0LG4pe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHR8fFwiZnVuY3Rpb25cIiE9dHlwZW9mIG4pdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7aS5yZXNvbHZlPXQsaS5yZWplY3Q9bn0pLG8uY2hhaW4ucHVzaChpKSwwIT09by5zdGF0ZSYmdChlLG8pLGkucHJvbWlzZX0sdGhpc1tcImNhdGNoXCJdPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnRoZW4odm9pZCAwLHQpfTt0cnl7bi5jYWxsKHZvaWQgMCxmdW5jdGlvbih0KXtyLmNhbGwobyx0KX0sZnVuY3Rpb24odCl7aS5jYWxsKG8sdCl9KX1jYXRjaChjKXtpLmNhbGwobyxjKX19dmFyIHMsaCxsLHA9T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyx5PVwidW5kZWZpbmVkXCIhPXR5cGVvZiBzZXRJbW1lZGlhdGU/ZnVuY3Rpb24odCl7cmV0dXJuIHNldEltbWVkaWF0ZSh0KX06c2V0VGltZW91dDt0cnl7T2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LFwieFwiLHt9KSxzPWZ1bmN0aW9uKHQsbixlLG8pe3JldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkodCxuLHt2YWx1ZTplLHdyaXRhYmxlOiEwLGNvbmZpZ3VyYWJsZTpvIT09ITF9KX19Y2F0Y2goZCl7cz1mdW5jdGlvbih0LG4sZSl7cmV0dXJuIHRbbl09ZSx0fX1sPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCh0LG4pe3RoaXMuZm49dCx0aGlzLnNlbGY9bix0aGlzLm5leHQ9dm9pZCAwfXZhciBuLGUsbztyZXR1cm57YWRkOmZ1bmN0aW9uKHIsaSl7bz1uZXcgdChyLGkpLGU/ZS5uZXh0PW86bj1vLGU9byxvPXZvaWQgMH0sZHJhaW46ZnVuY3Rpb24oKXt2YXIgdD1uO2ZvcihuPWU9aD12b2lkIDA7dDspdC5mbi5jYWxsKHQuc2VsZiksdD10Lm5leHR9fX0oKTt2YXIgZz1zKHt9LFwiY29uc3RydWN0b3JcIixhLCExKTtyZXR1cm4gYS5wcm90b3R5cGU9ZyxzKGcsXCJfX05QT19fXCIsMCwhMSkscyhhLFwicmVzb2x2ZVwiLGZ1bmN0aW9uKHQpe3ZhciBuPXRoaXM7cmV0dXJuIHQmJlwib2JqZWN0XCI9PXR5cGVvZiB0JiYxPT09dC5fX05QT19fP3Q6bmV3IG4oZnVuY3Rpb24obixlKXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBufHxcImZ1bmN0aW9uXCIhPXR5cGVvZiBlKXRocm93IFR5cGVFcnJvcihcIk5vdCBhIGZ1bmN0aW9uXCIpO24odCl9KX0pLHMoYSxcInJlamVjdFwiLGZ1bmN0aW9uKHQpe3JldHVybiBuZXcgdGhpcyhmdW5jdGlvbihuLGUpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIG58fFwiZnVuY3Rpb25cIiE9dHlwZW9mIGUpdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7ZSh0KX0pfSkscyhhLFwiYWxsXCIsZnVuY3Rpb24odCl7dmFyIG49dGhpcztyZXR1cm5cIltvYmplY3QgQXJyYXldXCIhPXAuY2FsbCh0KT9uLnJlamVjdChUeXBlRXJyb3IoXCJOb3QgYW4gYXJyYXlcIikpOjA9PT10Lmxlbmd0aD9uLnJlc29sdmUoW10pOm5ldyBuKGZ1bmN0aW9uKGUsbyl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZXx8XCJmdW5jdGlvblwiIT10eXBlb2Ygbyl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTt2YXIgcj10Lmxlbmd0aCxpPUFycmF5KHIpLGY9MDtjKG4sdCxmdW5jdGlvbih0LG4pe2lbdF09biwrK2Y9PT1yJiZlKGkpfSxvKX0pfSkscyhhLFwicmFjZVwiLGZ1bmN0aW9uKHQpe3ZhciBuPXRoaXM7cmV0dXJuXCJbb2JqZWN0IEFycmF5XVwiIT1wLmNhbGwodCk/bi5yZWplY3QoVHlwZUVycm9yKFwiTm90IGFuIGFycmF5XCIpKTpuZXcgbihmdW5jdGlvbihlLG8pe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIGV8fFwiZnVuY3Rpb25cIiE9dHlwZW9mIG8pdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7YyhuLHQsZnVuY3Rpb24odCxuKXtlKG4pfSxvKX0pfSksYX0pO1xuIl19
