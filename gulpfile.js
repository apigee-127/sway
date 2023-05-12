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

const $ = require('gulp-load-plugins')();
const del = require('del');
const gulp = require('gulp');
const gutil = require('gulp-util');
const webpack = require('webpack');
const run = require('gulp-run-command').default;
const jsdoc2md = require('jsdoc-to-markdown');
const fs = require('fs');
// eslint-disable-next-line import/no-unresolved
const gulpESLintNew = require('gulp-eslint-new');
require('native-promise-only'); // Load promises polyfill if necessary
const webpackConfig = require('./webpack.config');

function clean() {
  return del([
    'coverage',
  ]);
}

function dist(done) {
  return webpack(webpackConfig, (err, stats) => {
    if (err) throw new gutil.PluginError('webpack', err);
    gutil.log('[webpack]', `Bundles generated:\n${stats.toString('minimal').split('\n').map((line) => `  ${line.replace('Child ', 'dist/').replace(':', '.js:')}`).join('\n')}`);
    done();
  });
}

function docs() {
  return jsdoc2md.render({
    files: [
      './index.js',
      'lib/typedefs.js',
      'lib/types/*.js',
    ],
  }).then((output) => {
    fs.writeFileSync('docs/API.md', output);
  });
}

function docsTypescriptRaw(done) {
  gulp.src([
    './index.js',
    'lib/typedefs.js',
    'lib/types/*.js',
  ])
    .pipe($.jsdoc3({
      opts: {
        destination: 'index.d.ts',
        template: 'node_modules/@otris/jsdoc-tsd',
      },
    }, done));
}

// Due to bugs in @otris/jsdoc-tsd, we need to "fix" the generated TSD.
//
//  * https://github.com/otris/jsdoc-tsd/issues/38
//  * https://github.com/otris/jsdoc-tsd/issues/39
function docsTypescript() {
  return gulp.src(['index.d.ts'])
    .pipe($.replace('<*>', '<any>'))
    .pipe($.replace('module:sway.', ''))
    .pipe($.replace('Promise.<', 'Promise<'))
    .pipe(gulp.dest('.'));
}

function lint() {
  return gulp.src([
    'index.js',
    'lib/**/*.js',
    'test/**/*.js',
    '!test/browser/**/*.js',
    'gulpfile.js',
  ])
    .pipe(gulpESLintNew())
    .pipe(gulpESLintNew.format('stylish'))
    .pipe(gulpESLintNew.failAfterError());
}

function lintFix() {
  return gulp.src([
    'index.js',
    'lib/**/*.js',
    'test/**/*.js',
    '!test/browser/**/*.js',
    'gulpfile.js',
  ])
    .pipe(gulpESLintNew({ fix: true }))
    .pipe(gulpESLintNew.fix())
    .pipe(gulpESLintNew.format('stylish'))
    .pipe(gulpESLintNew.failAfterError());
}

exports.lint = lint;
exports['lint-fix'] = lintFix;
exports.clean = clean;
exports['test-node'] = run('nyc mocha test/**/test-*.js');
exports['test-browser'] = run('karma start test/browser/karma.conf.js');
exports.test = gulp.series(exports['test-node'], exports['test-browser']);
exports.docs = docs;
exports['docs-ts'] = gulp.series(docsTypescriptRaw, docsTypescript);
exports.dist = dist;
exports.pipeline = gulp.series(lint, exports.test);
exports.default = gulp.series(lint, clean, exports.test, exports['docs-ts'], dist);
