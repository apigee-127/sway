'use strict';

var path = require('path');
var NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = [{
  devtool: 'inline-source-map',
  entry: './index.js',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/env', {
                targets: 'cover 100%'
              }]
            ]
          }
        }
      }
    ]
  },
  name: 'sway',
  plugins: [
    new NodePolyfillPlugin()
  ],
  optimization: {
    minimize: false
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'sway.js',
    library: 'Sway'
  }
}, {
  entry: './index.js',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/env', {
                targets: 'cover 100%'
              }]
            ]
          }
        }
      }
    ]
  },
  name: 'sway-min',
  plugins: [
    new NodePolyfillPlugin()
  ],
  optimization: {
    minimize: true
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'sway-min.js',
    library: 'Sway'
  }
}];
