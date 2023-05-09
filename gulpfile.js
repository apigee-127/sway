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

var $ = require('gulp-load-plugins')();
var del = require('del');
var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');
var webpackConfig = require('./webpack.config');
var run = require('gulp-run-command').default;
var jsdoc2md = require('jsdoc-to-markdown');
var fs = require('fs');

// Load promises polyfill if necessary
if (typeof Promise === 'undefined') {
  require('native-promise-only');
}

function clean () {
  return del([
    'coverage'
  ]);
}

function dist (done) {
	return webpack(webpackConfig, function (err, stats) {
		if (err) throw new gutil.PluginError('webpack', err);
		gutil.log('[webpack]', 'Bundles generated:\n' + stats.toString('minimal').split('\n').map(function (line) {
      return '  ' + line.replace('Child ', 'dist/').replace(':', '.js:');
    }).join('\n'));
		done();
	});
}

function docs (done) {
  return jsdoc2md.render({
    files: [
      './index.js',
      'lib/typedefs.js',
      'lib/types/*.js'
    ],
  }).then(function (output) {
    fs.writeFileSync('docs/API.md', output)
  });
  done();
}

function docsTypescriptRaw (done) {
  gulp.src([
    './index.js',
    'lib/typedefs.js',
    'lib/types/*.js'
  ])
    .pipe($.jsdoc3({
      opts: {
        destination: 'index.d.ts',
        template: 'node_modules/@otris/jsdoc-tsd'
      }
    }, done));
}

// Due to bugs in @otris/jsdoc-tsd, we need to "fix" the generated TSD.
//
//  * https://github.com/otris/jsdoc-tsd/issues/38
//  * https://github.com/otris/jsdoc-tsd/issues/39
function docsTypescript () {
  return gulp.src(['index.d.ts'])
    .pipe($.replace('<*>', '<any>'))
    .pipe($.replace('module:sway.', ''))
    .pipe($.replace('Promise.<', 'Promise<'))
    .pipe(gulp.dest('.'));
}

function lint () {
  return gulp.src([
    'index.js',
    'lib/**/*.js',
    'test/**/*.js',
    '!test/browser/**/*.js',
    'gulpfile.js'
  ])
    .pipe($.eslint())
    .pipe($.eslint.format('stylish'))
    .pipe($.eslint.failAfterError());
}

exports.lint = lint;
exports.clean = clean;
exports['test-node'] = run('nyc mocha test/**/test-*.js');
exports['test-browser'] = run('karma start test/browser/karma.conf.js');
exports.test = gulp.series(exports['test-node'], exports['test-browser']);
exports.docs = docs;
exports['docs-ts'] = gulp.series(docsTypescriptRaw, docsTypescript);
exports.dist = dist;
exports.pipeline = gulp.series(lint, exports.test);
exports.default = gulp.series(lint, clean, exports.test, exports['docs-ts'], dist);
