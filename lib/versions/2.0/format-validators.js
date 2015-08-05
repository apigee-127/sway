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

function returnTrue () {
  return true;
}

module.exports.int32 = module.exports.int64 = function (val) {
  // z-schema seems to continue processing the format even when the type is known to be invalid so we must do a type
  // check prior to validating this format.
  return _.isNumber(val) && val % 1 === 0;
};

// These format validators will always return 'true' because they are already type valid and there are no constraints
// on the format that would produce an invalid value.
module.exports.byte = returnTrue;
module.exports.double = returnTrue;
module.exports.float = returnTrue;
module.exports.password = returnTrue;
