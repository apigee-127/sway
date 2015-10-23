## Release Notes

### TBD

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
