/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Jeremy Whitlock
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

var connect = require('connect');
var fs = require('fs');
var path = require('path');

var app = connect();
var infoYaml = fs.readFileSync(path.resolve(__dirname, '../samples/2.0/refs/info.yaml'), 'utf-8');
var pathsYaml = fs.readFileSync(path.resolve(__dirname, '../samples/2.0/refs/paths.yaml'), 'utf-8');
var swaggerYaml = fs.readFileSync(path.resolve(__dirname, '../samples/2.0/swagger.yaml'), 'utf-8');
var swaggerRelRefsYaml = fs.readFileSync(path.resolve(__dirname, '../samples/2.0/swagger-relative-refs.yaml'), 'utf-8');

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Allow,Authorization,Content-Type');
  res.setHeader('Access-Control-Request-Methods', 'GET,PUT,POST,DELETE');

  next();
});

app.use(function (req, res) {
  switch (req.url) {
  case '/refs/info.yaml':
    res.setHeader('Content-Type', 'application/x-yaml');
    res.statusCode = 200;
    res.end(infoYaml);

    break;
  case '/refs/paths.yaml':
    res.setHeader('Content-Type', 'application/x-yaml');
    res.statusCode = 200;
    res.end(pathsYaml);

    break;
  case '/swagger.yaml':
    res.setHeader('Content-Type', 'application/x-yaml');
    res.statusCode = 200;
    res.end(swaggerYaml);

    break;
  case '/swagger-relative-refs.yaml':
    res.setHeader('Content-Type', 'application/x-yaml');
    res.statusCode = 200;
    res.end(swaggerRelRefsYaml);

    break;
  default:
    res.writeHead(404);
    res.end();
  }
});

module.exports.createServer = function (transport) {
  return transport.createServer(app);
};
