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

## Swagger Versions

swagger-core-api uses [The Factory Method Pattern][factory-method-pattern] to create the `SwaggerApi` object you see
documented in the API documentation above.  The core API is concrete but how each version of Swagger generates the
`SwaggerApi` object and its business logic is Swagger version dependent.  That being said, below are the supported
versions of Swagger and their documentation:

* [2.0][version-2.0-documentation]

## Swagger Validation

Swagger validation can be broken up into three phases:

* `Structural Validation`: This is where we use the Swagger provided JSON Schema linked above and use a JSON Schema
validator to validate the structure of your Swagger document
* `Semantic Validation`: This is where to do validation above and beyond the general structure of your Swagger document.
The reason for this is that there are some situations that cannot be described using JSON Schema.  There are also
situations where the existing JSON Schema for Swagger is broken or not as strict as it could be.
* `Custom Validation`: This is user-configurable validation that typically fall into stylistic checks.

`Structural Validation` is the only type of validation that occurs in a special way.  If structural validation fails,
no other validation will occur.  But once the structural validation happens, `Semantic Validation` and
`Custom Validation` will happen.

## Dependencies

Below is the list of projects being used by swagger-core-api and the purpose(s) they are used for:

* [debug][debug]: Used for producing useful debugging information
* [js-base64][js-base64]: Used for generating mock/sample data for the `byte` format
* [js-yaml][js-yaml]: Used for parsing YAML Swagger files
* [json-refs][json-refs]: Used for dereferncing JSON References in Swagger files
* [json-schema-faker][json-schema-faker]: Used for generating mock/sample values from JSON Schemas
* [lodash-compat][lodash-compat]: Used for browser compatibility and miscellaneous utilities _(We use `lodash-compat`
instead of `lodash` for compatibility with IE8 and IE9.  We will likely change this but the reasons behind it were the
Swagger project itself has JavaScript libraries that support IE8+ and we wanted to support the same level of browsers
they did just in case they wanted to use these libraries.)_
* [native-promise-only][native-promise-only]: Used to shim in [Promises][promises] support
* [path-loader][path-loader]: Used to load Swagger files from the local filesystem and remote URLs
* [z-schema][z-schema]: Used for JSON Schema validation

[bower]: http://bower.io/
[debug]: https://www.npmjs.com/package/debug
[factory-method-pattern]: https://en.wikipedia.org/wiki/Factory_method_pattern
[js-base64]: https://www.npmjs.com/package/js-base64
[js-yaml]: https://www.npmjs.com/package/js-yaml
[json-refs]: https://www.npmjs.com/package/json-refs
[json-schema-faker]: https://www.npmjs.com/package/json-schema-faker
[lodash-compat]: https://www.npmjs.com/package/lodash-compat
[native-promise-only]: https://www.npmjs.com/package/native-promise-only
[path-loader]: https://www.npmjs.com/package/path-loader
[promises]: https://www.promisejs.org/
[npm]: https://www.npmjs.org/
[version-2.0-documentation]: https://github.com/apigee-127/swagger-core-api/blob/master/docs/versions/2.0.md
[swagger]: http://swagger.io
[z-schema]: https://www.npmjs.com/package/z-schema
