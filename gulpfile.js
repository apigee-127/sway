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
var KarmaServer = require('karma').Server;
var path = require('path');
var pathmodify = require('pathmodify');
var runSequence = require('run-sequence');
var source = require('vinyl-source-stream');
var testServer = require('./test/mock-server');

var runningAllTests = process.argv.indexOf('test-browser') === -1 && process.argv.indexOf('test-node') === -1;

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

gulp.task('browserify', function () {
  function browserifyBuild (isStandalone, useDebug) {
    return function () {
      return new Promise(function (resolve, reject) {
        var b = browserify('./index.js', {
          debug: useDebug,
          standalone: 'SwaggerApi'
        });

        // Only include the 'en' faker.js locale
        b.plugin(pathmodify(), {mods: [
          function (rec) {
            var alias;

            if (rec.id === 'faker' && rec.opts.filename.indexOf('json-schema-faker/lib/util/container.js') > -1) {
              alias = {id: 'faker/locale/en'};
            }

            return alias;
          }
        ]});

        if (!isStandalone) {
          // Expose Bower modules so they can be required
          exposify.config = {
            'json-refs': 'JsonRefs',
            'js-yaml': 'jsyaml',
            'lodash': '_',
            'path-loader': 'PathLoader'
          };

          b.transform('exposify');
        }

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

  return Promise.resolve()
    // Standalone build with source maps and complete source
    .then(browserifyBuild(true, true))
    // Standalone build minified and without source maps
    .then(browserifyBuild(true, false))
    // Bower build with source maps and complete source
    .then(browserifyBuild(false, true))
    // Bower build minified and without source maps
    .then(browserifyBuild(false, false));
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
                    'lib/types/*.js'
                  ])
             .pipe($.concat('API.md'))
             .pipe($.jsdoc2MD({'sort-by': ['category', 'name']}))
             .pipe(gulp.dest('docs'));
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

gulp.task('test-node', function () {
  var httpServer;

  function cleanUp () {
    try {
      httpServer.close();
    } catch (err2) {
      if (err2.message.indexOf('Not running') === -1) {
        console.error(err2.stack);
      }
    }
  }

  return Promise.resolve()
    .then(function () {
      httpServer = testServer.createServer(require('http')).listen(44444);
    })
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
                cleanUp();

                reject(err);
              })
              .on('end', function () {
                cleanUp();
                displayCoverageReport(!runningAllTests);

                resolve();
              });
          });
      });
    });
});

gulp.task('test-browser', ['browserify'], function () {
  var basePath = './test/browser/';
  var httpServer;

  function cleanUp () {
    // Clean up just in case
    del.sync([
      basePath + 'sway.js',
      basePath + 'sway-standalone.js',
      basePath + 'test-browser.js'
    ]);

    if (httpServer) {
      httpServer.close();
    }
  }

  function finisher (err) {
    cleanUp();

    displayCoverageReport(runningAllTests);

    return err;
  }

  return Promise.resolve()
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
      httpServer = testServer.createServer(require('http')).listen(44444);
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
    .then(finisher, finisher);
});

gulp.task('test', function (cb) {
  runSequence('test-node', 'test-browser', cb);
});

gulp.task('default', function (cb) {
  runSequence('lint', 'test', 'docs', cb);
});
