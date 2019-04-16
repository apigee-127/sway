'use strict';

var path = require('path');

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
  node: {
    fs: 'empty'
  },
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
  node: {
    fs: 'empty'
  },
  optimization: {
    minimize: true
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'sway-min.js',
    library: 'Sway'
  }
}];
