# autodesk-forks-sway

This package is a fork of [apigee-127/sway](https://github.com/apigee-127/sway).
The purpose of this fork is to update dependencies and continue to maintain the original package.

Would you like to contribute? Read [our contribution guidelines](./CONTRIBUTING.md).

[![License](http://img.shields.io/npm/l/sway.svg)](https://github.com/autodesk-forks/sway/blob/master/LICENSE)
[![NodeJS with Gulp](https://github.com/autodesk-forks/sway/actions/workflows/npm-gulp.yml/badge.svg)](https://github.com/autodesk-forks/sway/actions/workflows/npm-gulp.yml)
![semver](https://img.shields.io/badge/semver-2.0.0-blue)
[![npm version](https://badgen.net/npm/v/autodesk-forks-sway)](https://www.npmjs.com/package/autodesk-forks-sway)
[![contributors](https://img.shields.io/github/contributors/autodesk-forks/sway)](https://github.com/autodesk-forks/sway/graphs/contributors)

## :book: Resources

- [Documentation](./docs/API.md)
- [Typescript definitions](./index.d.ts)
- [Changelog](https://github.com/autodesk-forks/sway/releases)

## Getting started

You can install this fork via npm:
```bash
npm i autodesk-forks-swagger-node-runner
```

Sample usage:
```javascript
const Sway = require("./index");
const YAML = require('js-yaml');
const fs = require("fs");
const path = require("path");

Sway.create({
  definition: YAML.load(fs.readFileSync(path.join(__dirname, './test/browser/documents/2.0/swagger.yaml'), 'utf8')),
})
  .then(apiDef => {
    const goodParamValue = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
      query: {
        status: 'available'
      }
    });
    console.log(goodParamValue.valid); // will be true

    const badParamValue = apiDef.getOperation('/pet/findByStatus', 'get').getParameter('status').getValue({
      query: {
        status: 1
      }
    });
    console.log(badParamValue.valid); // will be false
  })
  .catch(console.error)
```
