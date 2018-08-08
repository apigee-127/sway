/**
 * This file contains all type definitions that are purely for documentation purposes.
 */

/**
 * Options used when creating the `SwaggerApi`.
 *
 * @typedef {object} CreateOptions
 *
 * @property {object|string} definition - The Swagger definition location or structure
 * @property {object} [jsonRefs] - *(See [JsonRefs~JsonRefsOptions](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..JsonRefsOptions))*
 * @property {object} [customFormats] - The key/value pair of custom formats *(The keys are the format name and the
 * values are async functions.  See [ZSchema Custom Formats](https://github.com/zaggino/z-schema#register-a-custom-format))*
 * @property {object} [customFormatGenerators] - The key/value pair of custom format generators *(The keys are the
 * format name and the values are functions.  See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))*
 * @property {DocumentValidationFunction[]} [customValidators] - The custom validators
 */

/**
 * Function used for custom validation of Swagger documents
 *
 * @typedef {function} DocumentValidationFunction
 *
 * @param {SwaggerApi} api - The Swagger API object
 *
 * @returns {ValidationResults} The validation results
 */

/**
 * Request validation function.
 *
 * @typedef {function} RequestValidationFunction
 *
 * @param {ServerResponseWrapper} res - The response or response like object
 * @param {Response} def - The `Response` definition _(useful primarily when calling
 * `Operation#validateResponse` as `Response#validateResponse` the caller should have access to the `Response` object
 * already.)_
 *
 * @returns {ValidationResults} The validation results
 */

/**
 * Request validation options.
 *
 * @typedef {object} RequestValidationOptions
 *
 * @property {boolean|object} [strictMode=false] - Enablement of strict mode validation.  If `strictMode` is a
 * `boolean` and is `true`, all form fields, headers and query parameters **must** be defined in the Swagger document
 * for this operation.  If `strictMode` is an `object`, the keys correspond to the `in` property values of the
 * [Swagger Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject)
 * and its value is a `boolean` that when `true` turns on strict mode validation for the request location matching the
 * key.  Valid keys are `formData`, `header` and `query`.  _(`body` and `path` are not necessary since `body` strict
 * mode is possible via its schema and `path` is **always** required.)_
 * @property {RequestValidationFunction} [customValidators] - The custom validators
 */

/**
 * Response validation function.
 *
 * @typedef {function} ResponseValidationFunction
 *
 * @param {object} req - The http client request *(or equivalent)*
 * @param {Operation} op - The `Operation` object for the request
 *
 * @returns {ValidationResults} The validation results
 */

/**
 * Response validation options.
 *
 * @typedef {object} ResponseValidationOptions
 *
 * @property {boolean|object} [strictMode=false] - Enablement of strict mode validation.  If `strictMode` is a
 * `boolean` and is `true`, all form fields, headers and query parameters **must** be defined in the Swagger document
 * for this operation.  If `strictMode` is an `object`, the keys correspond to the `in` property values of the
 * [Swagger Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject)
 * and its value is a `boolean` that when `true` turns on strict mode validation for the request location matching the
 * key.  Valid keys are `header`.  _(`body`, `query` and `path` are not necessary since `body` strict mode is possible
 * via its schema and `path`, `query` do not matter for responses.)_
 * @property {RequestValidationFunction} [customValidators] - The custom validators
 */

/**
 * Server response wrapper.
 *
 * Since the low level `http.ServerResponse` object is not always guaranteed and even if it is, there is no public way
 * to gather the necessary parts of the response to perform validation, this object encapsulates the required response
 * information to perform response validation.
 *
 * @typedef {object} ServerResponseWrapper
 *
 * @property {*} body - The response body
 * @property {string} [encoding] - The encoding of the body when the body is a `Buffer`
 * @property {object} headers - The response headers
 * @property {number|string} [statusCode=default] - The response status code
 */

/**
 * Validation error/warning object.
 *
 * When this object is created as a result of JSON Schema validation, this object is created by
 * [z-schema](https://github.com/zaggino/z-schema) and it owns the structure so there can be extra properties not
 * documented below.
 *
 * @typedef {object} ValidationEntry
 *
 * @property {string} code - The code used to identify the error/warning
 * @property {string} [error] - Whenever there is an upstream `Error` encountered, its message is here
 * @property {ValidationEntry[]} [errors] - The nested error(s) encountered during validation
 * @property {string[]} [lineage] - Contains the composition lineage for circular composition errors
 * @property {string} message - The human readable description of the error/warning
 * @property {string} [name] - The header name for header validation errors
 * @property {array} [params] - The parameters used when validation failed *(This is a z-schema construct and is only
 * set for JSON Schema validation errors.)*
 * @property {string[]} path - The path to the location in the document where the error/warning occurred
 * @property {string} [schemaId] - The schema id *(This is a z-schema construct and is only set for JSON Schema
 * validation errors and when its value is not `undefined`.)
 */

/**
 * Validation results object.
 *
 * @typedef {object} ValidationResults
 *
 * @property {ValidationEntry[]} errors - The validation errors
 * @property {ValidationEntry[]} warnings - The validation warnings
 */
