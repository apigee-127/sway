## Fork notes
This is a fork of the original [apigee-127/sway](https://github.com/apigee-127/sway) repo, mostly for updating dependencies & 
continue to maintain this package

## Intro
A library that simplifies [OpenAPI][openapi] integrations.  This library handles the minutiae of loading OpenAPI
documents *(local and remote)*, resolving references *(local, remote)*, building an object model and providing you with
a rich set of APIs for things like OpenAPI document validation, request/response validation, etc.  For more details on
the available APIs, please view the [API Documentation](https://github.com/danielgolub/sway-fork/blob/master/docs/API.md).

`master` will always be built to support the latest release of OpenAPI, which right now is `3.x`.  Previous versions are
in their own respective `v{N}.x` branch:

* _3.x Support (WIP):_ `master`
* _2.x Support:_ [v2.x](https://github.com/danielgolub/sway-fork/tree/v2.x)

## Project Badges

[![Build Status](https://github.com/danielgolub/sway-fork/actions/workflows/npm-gulp.yml/badge.svg)](https://github.com/danielgolub/sway-fork/actions/workflows/npm-gulp.yml)

## Installation

sway is available for both Node.js and the browser.  Installation instructions for each environment are below.

### Browser

sway binaries for the browser are available in the `dist/` directory:

* [sway-standalone.js](https://raw.github.com/danielgolub/sway-fork/master/dist/sway.js): _9,160kb_, full source  and source maps
* [sway-standalone-min.js](https://raw.github.com/danielgolub/sway-fork/master/dist/sway-min.js): _864kb_, minified, compressed and no source map

**Note:** I realize these binaries are big and I'm working on making them smaller.  Unfortunately, some of this is out
of my control without rewriting some of the core features provided by third-party libraries currently contributing to
the size issue.

Of course, these links are for the master builds so feel free to download from the release of your choice.  Once you've
gotten them downloaded, to use the standalone binaries, your HTML include might look like this:

``` html
<!-- ... -->
<script src="sway.js"></script>
<!-- ... -->
```

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

[gulp]: http://gulpjs.com/
[openapi]: https://www.openapis.org/
[npm]: https://www.npmjs.org/
