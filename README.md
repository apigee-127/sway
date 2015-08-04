An API for interacting with [Swagger][swagger] documents.

## Project Badges

* Build status: [![Build Status](https://travis-ci.org/apigee-127/swagger-core-api.svg)](https://travis-ci.org/apigee-127/swagger-core-api)
* Dependencies: [![Dependencies](https://david-dm.org/apigee-127/swagger-core-api.svg)](https://david-dm.org/apigee-127/swagger-core-api)
* Developer dependencies: [![Dev Dependencies](https://david-dm.org/apigee-127/swagger-core-api/dev-status.svg)](https://david-dm.org/apigee-127/swagger-core-api#info=devDependencies&view=table)
* Downloads: [![NPM Downloads Per Month](http://img.shields.io/npm/dm/swagger-core-api.svg)](https://www.npmjs.org/package/swagger-core-api)
* Gitter: [![Join the chat at https://gitter.im/apigee-127/swagger-core-api](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apigee-127/swagger-core-api?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
* License: [![License](http://img.shields.io/npm/l/swagger-core-api.svg)](https://github.com/apigee-127/swagger-core-api/blob/master/LICENSE)
* Version: [![NPM Version](http://img.shields.io/npm/v/swagger-core-api.svg)](https://www.npmjs.org/package/swagger-core-api)

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

* [swagger-core-api-standalone.js](https://raw.github.com/apigee-127/swagger-core-api/master/browser/swagger-core-api.js): _3,940kb_, full source  and source maps
* [swagger-core-api-standalone-min.js](https://raw.github.com/apigee-127/swagger-core-api/master/browser/swagger-core-api-min.js): _580kb_, minified, compressed and no source map

### Node.js

Installation for Node.js applications can be done via [NPM][npm].

```
npm install swagger-core-api --save
```

## Documentation

The documentation for this project can be found here: https://github.com/apigee-127/swagger-core-api/blob/master/docs/README.md

## Contributing

This project uses [Gulp][gulp] for building so `npm install -g gulp` once you clone this project.  Running `gulp` in the
project root will lint check the source code and run the unit tests.

[bower]: http://bower.io/
[gulp]: http://gulpjs.com/
[npm]: https://www.npmjs.org/
[swagger]: http://swagger.io
