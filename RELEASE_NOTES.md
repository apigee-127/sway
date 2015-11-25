## Release Notes

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
