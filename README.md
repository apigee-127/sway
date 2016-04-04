A library that simplifies [Swagger][swagger] integrations.  This library handles the minutiae of loading Swagger
documents *(local and remote)*, resolving references *(local, remote)*, building an object model and providing you with
a rich set of APIs for things like Swagger document validation, request/response validation, etc.  For more details on
the available APIs, please view the [API Documentation](https://github.com/apigee-127/sway/blob/master/docs/API.md).

Sway will always be built around the latest stable release of Swagger, which happens to be version `2.0` right now.
This means that its APIs and object model will be specific to that version of Swagger and supporting any other versions
of Swagger will require a conversion step prior to using Sway.

## Project Badges

* Build status: [![Build Status](https://travis-ci.org/apigee-127/sway.svg)](https://travis-ci.org/apigee-127/sway)
* Dependencies: [![Dependencies](https://david-dm.org/apigee-127/sway.svg)](https://david-dm.org/apigee-127/sway)
* Developer dependencies: [![Dev Dependencies](https://david-dm.org/apigee-127/sway/dev-status.svg)](https://david-dm.org/apigee-127/sway#info=devDependencies&view=table)
* Downloads: [![NPM Downloads Per Month](http://img.shields.io/npm/dm/sway.svg)](https://www.npmjs.org/package/sway)
* Gitter: [![Join the chat at https://gitter.im/apigee-127/sway](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apigee-127/sway?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
* License: [![License](http://img.shields.io/npm/l/sway.svg)](https://github.com/apigee-127/sway/blob/master/LICENSE)
* Version: [![NPM Version](http://img.shields.io/npm/v/sway.svg)](https://www.npmjs.org/package/sway)

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

* [sway-standalone.js](https://raw.github.com/apigee-127/sway/master/browser/sway-standalone.js): _6,312kb_, full source  and source maps
* [sway-standalone-min.js](https://raw.github.com/apigee-127/sway/master/browser/sway-standalone-min.js): _1,156kb_, minified, compressed and no source map

**Note:** I realize these binaries are big and I'm working on making them smaller.  Unfortunately, some of this is out
of my control without rewriting some of the core features provided by third-party libraries currently contributing to
the size issue.

### Node.js

Installation for Node.js applications can be done via [NPM][npm].

```
npm install sway --save
```

## Documentation

The documentation for this project can be found here: [/docs/README](/docs/README.md)

Of course, if you just want a quick link to the API documentation, that would be here:[/docs/API.md](/docs/API.md)

## Contributing

This project uses [Gulp][gulp] for building so `npm install -g gulp` once you clone this project.  Running `gulp` in the
project root will lint check the source code and run the unit tests.

[bower]: http://bower.io/
[gulp]: http://gulpjs.com/
[npm]: https://www.npmjs.org/
[swagger]: http://swagger.io
