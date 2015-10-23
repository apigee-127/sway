A library that simplifies [Swagger][swagger] integrations.

## Project Badges

* Build status: [![Build Status](https://travis-ci.org/apigee-127/sway.svg)](https://travis-ci.org/apigee-127/sway)
* Dependencies: [![Dependencies](https://david-dm.org/apigee-127/sway.svg)](https://david-dm.org/apigee-127/sway)
* Developer dependencies: [![Dev Dependencies](https://david-dm.org/apigee-127/sway/dev-status.svg)](https://david-dm.org/apigee-127/sway#info=devDependencies&view=table)
* Downloads: [![NPM Downloads Per Month](http://img.shields.io/npm/dm/sway.svg)](https://www.npmjs.org/package/sway)
* Gitter: [![Join the chat at https://gitter.im/apigee-127/sway](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apigee-127/sway?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
* License: [![License](http://img.shields.io/npm/l/sway.svg)](https://github.com/apigee-127/sway/blob/master/LICENSE)
* Version: [![NPM Version](http://img.shields.io/npm/v/sway.svg)](https://www.npmjs.org/package/sway)

## Project Status

Up until `1.0.0`, the API is unstable and can change without warning.  While we will do our best to ensure this does
not happen, as we begin to use sway we may run into situations where changing the API is required.

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

* [sway-standalone.js](https://raw.github.com/apigee-127/sway/master/browser/sway.js): _4,048kb_, full source  and source maps
* [sway-standalone-min.js](https://raw.github.com/apigee-127/sway/master/browser/sway-min.js): _592kb_, minified, compressed and no source map

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

## Documentation

The documentation for this project can be found here: https://github.com/apigee-127/sway/blob/master/docs/README.md
Of course, if you just want a quick link to the API documentation, that would be here: https://github.com/apigee-127/sway/blob/master/docs/API.md

## Contributing

This project uses [Gulp][gulp] for building so `npm install -g gulp` once you clone this project.  Running `gulp` in the
project root will lint check the source code and run the unit tests.

[bower]: http://bower.io/
[gulp]: http://gulpjs.com/
[npm]: https://www.npmjs.org/
[swagger]: http://swagger.io
