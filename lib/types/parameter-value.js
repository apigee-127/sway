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
var helpers = require('../helpers');
var JsonRefs = require('json-refs');

/**
 * Object representing a parameter value.
 *
 * **Note:** Do not use directly.
 *
 * @param {module:Sway~Parameter} parameterObject - The `Parameter` object
 * @param {*} raw - The original/raw value
 *
 * @property {Error} error - The error(s) encountered during processing/validating the parameter value
 * @property {module:Sway~Parameter} parameterObject - The `Parameter` object
 * @property {*} raw - The original parameter value *(Does not take default values into account)*
 * @property {boolean} valid - Whether or not this parameter is valid based on its JSON Schema
 * @property {*} value - The processed value *(Takes default values into account and does type coercion when necessary
 *                       and possible)*.  This can the original value in the event that processing the value is
 *                       impossible *(missing schema type)* or `undefined` if processing the value failed *(invalid
 *                       types, etc.)*.
 *
 * @constructor
 */
function ParameterValue (parameterObject, raw) {
  var pPath = JsonRefs.pathFromPtr(parameterObject.ptr);
  var processed = false;
  var schema = parameterObject.schema;
  var error;
  var isValid;
  var processedValue;

  this.parameterObject = parameterObject;
  this.raw = raw;

  // Use Object.defineProperty for 'value' to allow for lazy processing of the raw value
  Object.defineProperties(this, {
    error: {
      enumerable: true,
      get: function () {
        // Always call this.valid to ensure we validate the value prior to returning any values
        if (this.valid === true) {
          return undefined;
        } else {
          return error;
        }
      }
    },
    valid: {
      enumerable: true,
      get: function () {
        var result = {
          errors: [],
          warnings: []
        };
        var skipValidation = false;
        var value;
        var vError;

        if (_.isUndefined(isValid)) {
          isValid = true;
          value = this.value;

          if (_.isUndefined(error)) {
            try {
              // Validate requiredness
              if (parameterObject.required === true && _.isUndefined(value)) {
                vError = new Error('Value is required but was not provided');

                vError.code = 'REQUIRED';

                throw vError;
              }

              // Cases we do not want to do schema validation:
              //
              //   * The schema explicitly allows empty values and the value is empty
              //   * The schema allow optional values and the value is undefined
              //   * The schema defines a file parameter
              //   * The schema is for a string type with date/date-time format and the value is a date
              //   * The schema is for a string type and the value is a Buffer
              if ((_.isUndefined(parameterObject.required) || parameterObject.required === false) &&
                  _.isUndefined(value)) {
                skipValidation = true;
              } else if (schema.allowEmptyValue === true && value === '') {
                skipValidation = true;
              } else if (parameterObject.type === 'file') {
                skipValidation = true;
              } else if (schema.type === 'string') {
                if (['date', 'date-time'].indexOf(schema.format) > -1 && _.isDate(value)) {
                  skipValidation = true;
                } else if (schema.type === 'string' && _.isFunction(value.readUInt8)) {
                  skipValidation = true;
                }
              }

              if (!skipValidation) {
                // Validate against JSON Schema
                result = helpers.validateAgainstSchema(helpers.getJSONSchemaValidator(), parameterObject.schema, value);
              }

              if (result.errors.length > 0) {
                vError = new Error('Value failed JSON Schema validation');

                vError.code = 'SCHEMA_VALIDATION_FAILED';
                vError.errors = result.errors;

                throw vError;
              }
            } catch (err) {
              err.failedValidation = true;
              err.path = pPath;

              error = err;
              isValid = false;
            }
          } else {
            isValid = false;
          }
        }

        return isValid;
      }
    },
    value: {
      enumerable: true,
      get: function () {
        if (!processed) {
          if (schema.type === 'file') {
            processedValue = raw;
          } else {
            // Convert/Coerce the raw value from the request object
            try {
              processedValue = helpers.convertValue(schema, {
                collectionFormat: parameterObject.collectionFormat
              }, raw);
            } catch (err) {
              error = err;
            }

            // If there is still no value and there are no errors, use the default value if available (no coercion)
            if (_.isUndefined(processedValue) && _.isUndefined(error)) {
              if (schema.type === 'array') {
                if (_.isArray(schema.items)) {
                  processedValue = _.reduce(schema.items, function (items, item) {
                    items.push(item.default);

                    return items;
                  }, []);

                  // If none of the items have a default value reset the processed value to 'undefined'
                  if (_.every(processedValue, _.isUndefined)) {
                    processedValue = undefined;
                  }
                } else {
                  if (!_.isUndefined(schema.items) && !_.isUndefined(schema.items.default)) {
                    processedValue = [schema.items.default];
                  }
                }
              } else {
                if (!_.isUndefined(schema.default)) {
                  processedValue = schema.default;
                }
              }
            }
          }

          processed = true;
        }

        return processedValue;
      }
    }
  });
}

module.exports = ParameterValue;
