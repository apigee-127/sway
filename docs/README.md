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

## API Types

The swagger-core-api exposes a few JavaScript objects and their documentation is below.

### Operation

This object represents a Swagger operation.

#### properties

This object has all of the properties set on the Swagger operation defintion as well as the properties provided below.

##### path {string}

This is the Swagger operation path.

##### method {string}

This is the Swagger operation method.

##### ptr {string}

This is the [JSON Pointer][json-pointer] to the location in the Swagger definition document where the operation is
defined.

##### definition {object}

This is the Swagger operation definition.  _(Note: The `parameters` and `security` properties are composites that
represent the applied equivalent.  So for `parameters`, this includes path-level parameters and for `security`, this
includes global security if available and there is no explicit security described.)_

#### functions

##### getParameters()

##### Returns

Returns a `Parameter[]` for the given operation.

### Parameter

This object represents a Swagger operation parameter.

#### properties

This object has all of the properties set on the Swagger operation parameter defintion as well as the properties
provided below.

##### ptr {string}

This is the [JSON Pointer][json-pointer] to the location in the Swagger definition document where the operation
parameter is defined.

##### definition {object}

This is the Swagger operation parameter definition.

### SwaggerApi

This object represents the Swagger definition document.

#### properties

This object has all of the properties set on the Swagger document defintion as well as the properties provided below.

##### definition {object}

This is the JavaScript object representing your Swagger definition

##### documentation {string}

This is the URL to the Swagger Specification document for the Swagger version your SwaggerApi object corresponds to.

##### options {object}

This is the options object passed to `SwaggerApi.load`.

##### version {string}

This is the Swagger version for the provided Swagger definition document.

#### functions

##### getOperations([path])

###### Arguments

####### path {string}

This is the optional Swagger operation path to filter the operations by.

###### Returns

This API always returns an `Operation[]`.  If no `path` is provided, all operations are returned.  If a path is
provided, all operations for the given `path` are returned.

##### getOperation(path, method)

###### Arguments

####### path {string}

This is the Swagger operation path

####### method {string}

This is the Swagger operation method

###### Returns

Returns the `Operation` for the provided `path` and `method` combination or `undefined` if no operation matches those
criteria.

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
definitions from the filesystem or a URL.  Right now it supports the `method` property _({string}, used to dictate which
HTTP method to use for remote http/https URLs)_ and the  `prepareRequest` property _({function}, used to prepare the
HTTP request for remote http/https URLs for things like authentication/authorization)_.
* `{object|string} definition`: This is the path/URL to your Swagger definition or the Swagger definition in JavaScript object
form

##### callback {function}

This is an optional error-first callback.

##### Returns {Promise}

This API **always** returns a `Promise`, even if you provide a callback.

##### Example _(Promise)_

```js
SwaggerApi.create('http://petstore.swagger.io/v2/swagger.yaml')
  .then(function (api) {
    console.log('Documentation URL: ', api.documentation);
  }, function (err) {
    console.error(err.stack);
  });
```

##### Example _(Callback)_

```js
SwaggerApi.create('http://petstore.swagger.io/v2/swagger.yaml', function (err, api) {
  if (err) {
    console.error(err.stack);
  } else {
    console.log('Documentation URL: ', api.documentation);
  });
```

[bower]: http://bower.io/
[json-pointer]: https://tools.ietf.org/html/rfc6901
[npm]: https://www.npmjs.org/
[path-loader]: https://github.com/whitlockjc/path-loader
[swagger]: http://swagger.io
