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

var $ = require('gulp-load-plugins')({
  rename: {
    'gulp-jsdoc-to-markdown': 'jsdoc2MD'
  }
});
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var del = require('del');
var exposify = require('exposify');
var fs = require('fs');
var glob = require('glob');
var gulp = require('gulp');
var gutil = require('gulp-util');
var KarmaServer = require('karma').Server;
var path = require('path');
var runSequence = require('run-sequence');
var snyk = require('snyk');
var source = require('vinyl-source-stream');

var runningAllTests = process.argv.indexOf('test-browser') === -1 && process.argv.indexOf('test-node') === -1;

var babelIgnore = /\/node_modules\/underscore\//;

// Load promises polyfill if necessary
if (typeof Promise === 'undefined') {
  require('native-promise-only');
}

function displayCoverageReport (display) {
  if (display) {
    gulp.src([])
      .pipe($.istanbul.writeReports());
  }
}

gulp.task('browserify', function (cb) {
  function browserifyBuild (isStandalone, useDebug) {
    return function () {
      return new Promise(function (resolve, reject) {
        var b = browserify('./index.js', {
          debug: useDebug,
          standalone: 'Sway'
        });

        if (!isStandalone) {
          // Expose Bower modules so they can be required
          exposify.config = {
            'graphlib': 'graphlib',
            'js-base64': 'Base64',
            'json-refs': 'JsonRefs',
            'js-yaml': 'jsyaml',
            'lodash': '_',
            'path-loader': 'PathLoader',
            'z-schema': 'ZSchema'
          };

          b.transform('exposify');
        }

        b.transform('babelify', {
          compact: false,
          global: true,
          presets: ['es2015'],
          ignore: babelIgnore
        });

        b.bundle()
          .pipe(source('sway' + (isStandalone ? '-standalone' : '') + (!useDebug ? '-min' : '') + '.js'))
          .pipe($.if(!useDebug, buffer()))
          .pipe($.if(!useDebug, $.uglify()))
          .pipe(gulp.dest('browser/'))
          .on('error', reject)
          .on('end', resolve);
      });
    };
  }

  Promise.resolve()
    // Standalone build with source maps and complete source
    .then(browserifyBuild(true, true))
    // Standalone build minified and without source maps
    .then(browserifyBuild(true, false))
    // Bower build with source maps and complete source
    .then(browserifyBuild(false, true))
    // Bower build minified and without source maps
    .then(browserifyBuild(false, false))
    .then(cb, cb);
});

gulp.task('clean', function (done) {
  del([
    'bower_components',
    'coverage',
    'test/browser/sway*.js'
  ], done);
});

gulp.task('docs', function () {
  return gulp.src([
    './index.js',
    'lib/typedefs.js',
    'lib/types/*.js'
  ])
    .pipe($.concat('API.md'))
    .pipe($.jsdoc2MD({'sort-by': ['category', 'name']}))
    .pipe(gulp.dest('docs'));
});

gulp.task('docs-ts-raw', function (cb) {
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
    }, cb));
});

// Due to bugs in @otris/jsdoc-tsd, we need to "fix" the generated TSD.
//
//  * https://github.com/otris/jsdoc-tsd/issues/38
//  * https://github.com/otris/jsdoc-tsd/issues/39
gulp.task('docs-ts', ['docs-ts-raw'], function () {
  gulp.src(['index.d.ts'])
    .pipe($.replace('<*>', '<any>'))
    .pipe($.replace('module:sway.', ''))
    .pipe($.replace('Promise.<', 'Promise<'))
    .pipe(gulp.dest('.'));
});

gulp.task('lint', function () {
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
});

gulp.task('snyk', function (done) {
  snyk.test('.')
    .then(function (data) {
      if (data.vulnerabilities.length) { 
        gutil.log(gutil.colors.red(data.vulnerabilities));

        throw new Error('Snyk found ' + data.vulnerabilities.length + 'vulnernabilities');
      } else {
        gutil.log(gutil.colors.green(data.summary));
      }
    })
    .then(done, done);
});

gulp.task('test-node', function (done) {
  Promise.resolve()
    .then(function () {
      return new Promise(function (resolve, reject) {
        gulp.src([
          'index.js',
          'lib/**/*.js'
        ])
          .pipe($.istanbul({includeUntested: true}))
          .pipe($.istanbul.hookRequire()) // Force `require` to return covered files
          .on('finish', function () {
            gulp.src([
              'test/**/test-*.js',
              '!test/browser/test-*.js'
            ])
              .pipe($.mocha({reporter: 'spec'}))
              .on('error', function (err) {
                reject(err);
              })
              .on('end', function () {
                displayCoverageReport(!runningAllTests);

                resolve();
              });
          });
      });
    })
    .then(done, done);
});

gulp.task('test-browser', ['browserify'], function (done) {
  var basePath = './test/browser/';

  function cleanUp () {
    // Clean up just in case
    del.sync([
      basePath + 'sway.js',
      basePath + 'sway-standalone.js',
      basePath + 'test-browser.js'
    ]);
  }

  function finisher (err) {
    cleanUp();

    displayCoverageReport(runningAllTests);

    return err;
  }

  Promise.resolve()
    .then(cleanUp)
    .then(function () {
      // Copy the browser build of sway to the test directory
      fs.createReadStream('./browser/sway.js')
        .pipe(fs.createWriteStream(basePath + 'sway.js'));
      fs.createReadStream('./browser/sway-standalone.js')
        .pipe(fs.createWriteStream(basePath + 'sway-standalone.js'));

      return new Promise(function (resolve, reject) {
        var b = browserify(glob.sync('test/**/test-*.js'), {
          debug: true
        });

        b.transform('brfs')
         .transform('babelify', {
           compact: false,
           global: true,
           presets: ['es2015'],
           ignore: babelIgnore
          })
          .bundle()
          .pipe(source('test-browser.js'))
          .pipe(gulp.dest(basePath))
          .on('error', function (err) {
            reject(err);
          })
          .on('end', function () {
            resolve();
          });
      });
    })
    .then(function () {
      return new Promise(function (resolve, reject) {
        new KarmaServer({
          configFile: path.join(__dirname, 'test/browser/karma-bower.conf.js'),
          singleRun: true
        }, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }).start();
      });
    })
    .then(function () {
      return new Promise(function (resolve, reject) {
        new KarmaServer({
          configFile: path.join(__dirname, 'test/browser/karma-standalone.conf.js'),
          singleRun: true
        }, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }).start();
      });
    })
    .then(finisher, finisher)
    .then(done, done);
});

gulp.task('test', function (done) {
  runSequence('test-node', 'test-browser', done);
});

gulp.task('default', function (done) {
  runSequence('lint', 'test', 'docs', 'docs-ts', done);
});
