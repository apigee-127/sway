## Release Notes

### v1.0.0 (TBD)

* Added support for nested query parameters, as supported by [qs](https://github.com/ljharb/qs) *(Issue #39)*
* Added `Operation#getParameter(name, [location])` *(Issue #56)*
* Added `Operation#getSecurity` to gather the _composite security_ for an operation *(The previous approach was to
overwrite `Operation.security` with the computed value but this could be confusing)*
* Added `SwaggerApi.definitionRemotesResolved` *(Object containing the Swagger document with all of its remote
references resolved)*
* Changed object exported in the browser from `SwaggerApi` to `Sway`
* Changed the `definition` property for `Operation`, `Parameter`, `Path` and `Response` to now be
`definitionFullyResolved` and now the `definition` property is the original, non-dereferenced value
* Fixed a bug where `Sway#create` did not properly register custom validators *(Issue #53)*
* Fixed a bug where `Sway#create` with a relative `options.definition` did not take `options.jsonRefs.relativeBase`
into account for the initial load
* Fixed a bug where we removed `String -> [Array|Object]` coercion to fix issue #46 but shouldn't had *(Issue #48)*'
* Moved all response-specific APIs from `Operation` to the `Response` type except `Operation#validateResponse` *(Issue #44)*
    * API Additions
        * `Operation#getResponse`
        * `Operation#getResponses`
    * API Changes
        * `Operation#getResponseExample` -> `Response#getExample`
        * `Operation#getResponseSample` -> `Response#getSample`
* Removed callback support for `Sway#create` *(Issue 51)*
* Removed plugin support *(Issue #55)*
* Removed approach that would overwrite `Operation.parameters` with the _composite parameters_ *(The previous approach
would set `Operation.parameters` to include all parameter definitions, even ones defined at the path level.  This could
be confusing.  `Operation.parameterObjects`, `Operation#getParameters` and `Operation#getParameter` already solve the
need to have a _composite view_ for operation parameters.)*
* Removed `Parameter#getSchema` and `Parameter.computedSchema` in favor of using `Parameter.schema` for consistency
* Removed `SwaggerApi.resolved` in favor of `SwaggerApi.definitionFullyResolved` *(Object containing the Swagger
with all references fully resolved)*
* Updated invalid/missing JSON References to be a structural validation errors like z-schema does
* Updated `SwaggerApi#validate` to include json-refs warnings as validation warnings
* Various changes to all constructors in `lib/types` *(Should have no impact since these are technically internal)*

### v0.6.0 (2015-11-25)

* Remove logic to do type coercion when the expected type is unknown *(We use to assume that a missing `type` was of
`type` `object`.  This is wrong per JSON Schema which allows a missing `type` and handles it specially.)*

### v0.5.4 (2015-11-25)

* Fixed bug in error reporting when `Buffer` was converted to a `String` and failed type conversion

### v0.5.3 (2015-11-25)

* Fixed a bug with `String`->`Object` conversion resulting in unexpected response validation errors *(Issue #46)*

### v0.5.2 (2015-11-11)

* Added validator for empty path parameter declarations *(Issue #40)*
* Fixed a bug with validating strings that were not `date` or `date-time` format *(Issue #41)*
* Fixed a bug where passing a `Buffer` to `Operation#validateResposne` could result in unexpected schema validation failure *(Issue #42)*

### v0.5.1 (2015-11-03)

* Updated `Operation#validateResponse` to use the `default` response when validating a response code that isn't defined

### v0.5.0 (2015-11-02)

**Note:** This release changes how `Operation#validateResponse` works.  Instead of throwing an `Error` whenver the API
is consumed when providing a status code that is not documented in Swagger, we now provide the error details in the
response structure.  *(I realize I said I'd do my best to avoid breaking changes but this change was based on user
feedback and the chances of `v0.4.0` installations being out there are very small.)*

* Updated `Operation#validateResponse` to no longer throw an `Error` but instead to put the error details in the response structure

### v0.4.0 (2015-11-02)

**Note:** This release has a breaking change as documented below.  I realize changing APIs should result in a major
version release but I did not want to force an early `v1.0.0` release just because of this.  The possibility of
breaking API changes prior to `v1.0.0` were clearly mentioned on the project home page from day one.  While I will
do my best to avoid this happening, this was one of those cases where for API consistency, the change was merited.

* Added `Operation#validateRequest` and `Operation#validateResponse` APIs
* Fixed issue with valid models being marked as inheriting circularly when an ancestor model has a circular reference *(Issue #38)*
* **(BREAKING)** Removed `SwaggerApi#getLastErrors` and `SwaggerApi#getLastWarnings` in favor of `SwaggerApi#validate`
returning the validation results.  This will make all of the validation APIs consistent in how they work.

### v0.3.3 (2015-10-23)

* Fixed issue with file parameters being marked as invalid *(Issue #37)* 
* Fixed issue with optional parameters being marked as invalid *(Issue #34)*
* Fixed issue with `Parameter#getValue` not supporting non-plain object *(We need this for when passing in an `http.ClientRequest`) *(Issue #35)*
* Updated json-refs to fix a bug with remote reference errors *(Issue #36)*

### v0.3.2 (2015-10-14)

* Fixed sub-schema validation of properties with special names *(PR 30)*
* Updated Swagger 2.0 JSON Schema *(PR 31)*

### v0.3.1 (2015-09-30)

* Add support for `allowEmptyValue` for parameter value validation *(Issue #27)*
* Better integer validation for parameter values *(PR #26)*
* More human-readable errors related to JSON Schema validation when `anyOf` or `oneOf` validation fails *(Issue #15)*
* Update json-refs to work with `options.jsonRefs.location` having a hash *(Issue #24)*

### v0.3.0 (2015-09-18)

* Updated json-refs for service/web worker support *(Issues #22)*
* Updated z-schema to avoid throwing runtime errors on unknown formats *(Issues #20)*

### v0.2.3 (2015-08-31)

* Updated json-refs to fix a big bug in local reference resolution for remote documents *(See [json-refs/issues/30](https://github.com/whitlockjc/json-refs/issues/30))*

### v0.2.2 (2015-08-31)

* Fix a bug where missing `securityDefinitions` could result in a runtime error

### v0.2.1 (2015-08-26)

* Fix bug with loading relative references *(Issue #17)*
* Fix bug with loading YAML references *(Issue #17)*
* Make errors in `SwaggerApi#create` handleable *(Issue #16)*

### v0.2.0 (2015-08-25)

* Added `Path` object, `SwaggerApi#getPath(reqOrPath)` and `SwaggerApi#getPaths()`

### v0.1.0 (2015-08-12)

* Initial release
