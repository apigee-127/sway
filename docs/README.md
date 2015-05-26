swagger-core-api is an API around consuming [Swagger][swagger] definitions.  The APIs provided attempt to solve common
problems when working with Swagger definitions, like loading a Swagger definition.  _(For example: You might want to compose
a Swagger definition programmatically or you might want to load a Swagger definition from the filesystem...or some URL.)_

What you will find below is information on how to install swagger-core-api based on your environment.  You will also
find detailed information about how to use the provided APIs.

# Disclaimer

This is an unreleased API and is subject to change without any warning.  Also, this document may be out of date at any
time up until we publish the first release.

## Installation

swagger-core-api is available for both Node.js and the browser.  Installation instructions for each environment are below.

### Browser

Installation for browser applications can be done via [Bower][bower] or by downloading a standalone binary.

#### Using Bower

```
bower install swagger-core-api --save
```

#### Standalone Binaries

The standalone binaries come in two flavors:

* [swagger-core-api.js](https://raw.github.com/apigee-127/swagger-core-api/master/browser/swagger-core-api.js): _2,312kb_, full source  and source maps
* [swagger-core-api-min.js](https://raw.github.com/apigee-127/swagger-core-api/master/browser/swagger-core-api-min.js): _244kb_, minified, compressed and no sourcemap

### Node.js

Installation for Node.js applications can be done via [NPM][npm].

```
npm install swagger-core-api --save
```

## API Documentation

The swagger-core-api project's API documentation can be found here: https://github.com/apigee-127/swagger-core-api/blob/master/docs/API.md

[bower]: http://bower.io/
[npm]: https://www.npmjs.org/
[swagger]: http://swagger.io
