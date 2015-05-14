swagger-core-api is an API around consuming [Swagger][swagger] documents.  The APIs provided attempt to solve common
problems when working with Swagger documents, like loading a Swagger document.  _(For example: You might want to compose
a Swagger document programmatically or you might want to load a Swagger document from the filesystem...or some URL.)_

What you will find below is information on how to install swagger-core-api based on your environment.  You will also
find detailed information about how to use the provided APIs.

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

## API Types

The swagger-core-api exposes a few JavaScript objects and their documentation is below.

### SwaggerApi

#### properties

##### document {object}

This is the JavaScript object representing your Swagger document

##### documentation {string}

This is the URL to the Swagger Specification document for the Swagger version your SwaggerApi object corresponds to.

#### functions

**NONE YET***

## API

swagger-core-api exposes a single function for creating the `SwaggerApi` object.  Depending on your, environment,
how you call this function changes.  For the browser, swagger-core-api is exposed as `SwaggerApi`.  Of course, in
Node.js it depends on which variable you assign the swagger-core-api module to.  For consistency, all examples you see
assume you've named your Node.js variable `SwaggerApi` like this:

```js
var SwaggerApi = require('swagger-core-api');
```

### load(options, [callback])

#### Arguments

##### options {object}

This argument is required and its content are the options necessary for swagger-core-api, and its upstream dependencies,
to work.  Below are the keys and their purpose:

* `{object} [loaderOptions]`: This is the options that get passed to [path-loader][path-loader] when retrieving Swagger
documents from the filesystem or a URL.  Right now it supports the `method` property _({string}, used to dictate which
HTTP method to use for remote http/https URLs)_ and the  `prepareRequest` property _({function}, used to prepare the
HTTP request for remote http/https URLs for things like authentication/authorization)_.
* `{object|string} document`: This is the path/URL to your Swagger document or the Swagger document in JavaScript object
form

##### callback {function}

This is an optional error-first callback.

##### Returns {Promise}

This API **always** returns a `Promise`, even if you provide a callback.

[bower]: http://bower.io/
[npm]: https://www.npmjs.org/
[path-loader]: https://github.com/whitlockjc/path-loader
[swagger]: http://swagger.io
