A library that simplifies [Swagger][swagger] integrations.  This library handles the minutiae of loading Swagger
documents *(local and remote)*, resolving references *(local and remote)*, building an object model and providing you
with a rich set of APIs for things like Swagger document validation, request/response validation, etc.  For more details
on the available APIs, please view the [API Documentation](https://github.com/apigee-127/sway/blob/master/docs/API.md).

Sway will always be built around the latest stable release of Swagger, which happens to be version `2.0` right now.
This means that its APIs and object model will be specific to that version of Swagger and supporting any other versions
of Swagger will require a conversion step prior to using Sway.

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

* [sway-standalone.js](https://raw.github.com/apigee-127/sway/master/browser/sway-standalone.js): _6,784kb_, full source  and source maps
* [sway-standalone-min.js](https://raw.github.com/apigee-127/sway/master/browser/sway-standalone-min.js): _812kb_, minified, compressed and no source map

**Note:** I realize these binaries are big and I'm working on making them smaller.  Unfortunately, some of this is out
of my control without rewriting some of the core features provided by third-party libraries currently contributing to
the size issue.

### Node.js

Installation for Node.js applications can be done via [NPM][npm].

```
npm install sway --save
```

## API Documentation

The sway project's API documentation can be found here: https://github.com/apigee-127/sway/blob/master/docs/API.md

## Swagger Resources

* Specification Documentation: https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md
* JSON Schema: https://github.com/swagger-api/swagger-spec/blob/master/schemas/v2.0/schema.json

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

### Semantic Validation

| Description | Type  |
| :---------  | :---: |
| Operations cannot have both a `body` parameter and a `formData` parameter | Error |
| Operations must have only one `body` parameter | Error |
| Operations must have unique *(`name` + `in` combination)* parameters | Error |
| Operations must have unique `operationId` | Error |
| Path parameters declared in the path string need matching parameter definitions *(Either at the path-level or the operation)* | Error |
| Path parameter declarations do not allow empty names *(`/path/{}` is not valid)* | Error |
| Path parameters definition *(Either at the path-level or the operation)* need matching paramater declarations | Error |
| Path strings must be *(equivalently)* different *(Example: `/pet/{petId}` and `/pet/{petId2}` are equivalently the same and would generate an error)* | Error |
| Paths must have unique *(`name` + `in` combination)* parameters | Error |
| Referenceable definitions should be *used* by being referenced in the appropriate way | Warning |
| References must point to existing documents or document fragments | Error |
| The `default` property for [Schema Objects][schema-object], or schema-like objects *(non-body parameters)*, must validate against the respective JSON Schema | Error |
| Circular composition/inheritance for [Schema Objects][schema-object] is not allowed *(You can have circular references everywhere except in composition/inheritance.)* | Error |
| The `items` property for [Schema Objects][schema-object], or schema-like objects *(non-body parameters)*, is required when `type` is set to `array` _(See [swagger-api/swagger-spec/issues/174](https://github.com/swagger-api/swagger-spec/issues/174))_ | Error |
| The `required` properties for a [Schema Object][schema-object] must be defined in the object or one of its ancestors | Error |

[bower]: http://bower.io/
[npm]: https://www.npmjs.org/
[schema-object]: https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#schemaObject
[swagger]: http://swagger.io
