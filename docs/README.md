A library that simplifies [Swagger][swagger] integrations.  The APIs provided attempt to solve common
problems when working with Swagger definitions, like loading a Swagger definition.  _(For example: You might want to compose
a Swagger definition programmatically or you might want to load a Swagger definition from the filesystem...or some URL.)_

What you will find below is information on how to install sway based on your environment.  You will also
find detailed information about how to use the provided APIs.

# Disclaimer

This is an unreleased API and is subject to change without any warning.  Also, this document may be out of date at any
time up until we publish the first release.

## Installation

sway is available for both Node.js and the browser.  Installation instructions for each environment are below.

### Browser

Installation for browser applications can be done via [Bower][bower] or by downloading a standalone binary.

#### Using Bower

```
bower install sway --save
```

#### Standalone Binaries

The standalone binaries come in two flavors:

* [sway-standalone.js](https://raw.github.com/apigee-127/sway/master/browser/sway.js): _5,536kb_, full source  and source maps
* [sway-standalone-min.js](https://raw.github.com/apigee-127/sway/master/browser/sway-min.js): _1,020kb_, minified, compressed and no source map

**Note:** I realize these browser binaries are not small.  For the most part, this is due to a library we are using for
creating mock/sample parameters/responses.  [json-schema-faker](https://github.com/pateketrueke/json-schema-faker) uses
[faker.js](https://github.com/Marak/faker.js) which ships with a number of locales, which we currently are not using.
Attempts to package sway in a way to make it smaller led to a
[json-schema-faker packaging issue](https://github.com/pateketrueke/json-schema-faker/issues/56) that is unresolved.  In
the future, if we were to expose this local support we would need these locales in the binary anyways so at the end of
the day I've marked this as unavoidable.

### Node.js

Installation for Node.js applications can be done via [NPM][npm].

```
npm install sway --save
```

## API Documentation

The sway project's API documentation can be found here: https://github.com/apigee-127/sway/blob/master/docs/API.md

## Swagger Versions

sway uses [The Factory Method Pattern][factory-method-pattern] to create the `SwaggerApi` object you see
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

Below is the list of projects being used by sway and the purpose(s) they are used for:

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
* [path-to-regexp][path-to-regexp]: Used to create `RegExp` objects from Swagger paths
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
[npm]: https://www.npmjs.org/
[path-loader]: https://www.npmjs.com/package/path-loader
[path-to-regexp]: https://github.com/pillarjs/path-to-regexp
[promises]: https://www.promisejs.org/
[version-2.0-documentation]: https://github.com/apigee-127/sway/blob/master/docs/versions/2.0.md
[swagger]: http://swagger.io
[z-schema]: https://www.npmjs.com/package/z-schema
