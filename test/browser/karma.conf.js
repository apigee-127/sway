/* Karma configuration for standalone build */

'use strict';

var NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = function (config) {
  console.log();
  console.log('Browser Tests');
  console.log();

  config.set({
    autoWatch: false,
    basePath: '..',
    browsers: ['ChromeHeadless'],
    frameworks: ['mocha', 'webpack'],
    reporters: ['mocha'],
    singleRun: true,
    files: [
      {pattern: 'test-*.js', watch: false},
      {pattern: 'browser/documents/**/*', watched: false, included: false}
    ],
    client: {
      mocha: {
        reporter: 'html',
        timeout: 10000,
        ui: 'bdd'
      }
    },
    plugins: [
      'karma-chrome-launcher',
      'karma-mocha',
      'karma-mocha-reporter',
      'karma-webpack'
    ],
    preprocessors: {
      'test-*.js': ['webpack']
    },
    webpack: {
      mode: 'development',
      plugins: [
        new NodePolyfillPlugin()
      ],
      module: {
        rules: [
          {
            test: /\.js$/,
            use: [
              {
                loader: 'transform-loader?brfs'
              }
            ]
          },
          {
            test: /\.js$/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/env']
              }
            }
          }
        ]
      }
    },
    webpackMiddleware: {
      stats: 'errors-only'
    }
  });
};
