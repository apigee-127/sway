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

module.exports.int32 = module.exports.int64 = function (val) {
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

module.exports.double = module.exports.float = function (val) {
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

module.exports.byte = function (val) {
  // TODO: We could do more here since technically 'byte' means a base64 encoded string
  return _.isString(val);
};

module.exports.password = function (val) {
  return _.isString(val);
};
