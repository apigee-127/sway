/**
 * Creates a SwaggerApi object from its Swagger definition(s).
 * @param options The options for loading the definition(s)
 */
export declare function create(options: CreateOptions): Promise<SwaggerApi>

/** Options for the `Sway.create` function */
export interface CreateOptions {
  /**
   * The Swagger definition location or structure
   */
  definition: Object | string
  /**
   * The options used for various JsonRefs APIs.
   *
   * {@link https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..JsonRefsOptions})
   */
  jsonRefs?: Object
  /**
   * The custom validators
   */
  customValidators?: ValidatorCallback[]
}

/**
 * Callback used for validation.
 * @param api The Swagger API objec
 * @return The validation results
 */
declare type ValidatorCallback = (api: SwaggerApi) => ValidationResults

/**
 * The Swagger API object.
 *
 * Extra Properties: Other than the documented properties, this object also exposes all properties of the
 * definition object.
 */
declare class SwaggerApi {

  /**
   * The array of custom validators
   */
  customValidators: ValidatorCallback[]

  /**
   * The original Swagger definition
   */
  definition: Object

  /**
   * The Swagger definition with only its remote references resolved
   *
   * (This means all references to external/remote documents are replaced with its dereferenced
   * value but all local references are left unresolved.)
   */
  definitionRemotesResolved: Object

  /**
   * The Swagger definition with all of its resolvable references resolved
   *
   * (This means that all resolvable references are replaced with their dereferenced value.)
   */
  definitionFullyResolved: Object

  /**
   * The URL to the Swagger documentation
   */
  documentationUrl: string

  /**
   *The unique `Path` objects
   */
  pathObjects: Path[]

  /**
   * The options passed to the constructor
   */
  options: Object

  /**
   * The reference metadata
   * docs: {@link https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..ResolvedRefDetails}
   */
  references: UnresolvedRefDetails

  /**
   * 	The Swagger API version
   */
  version: string

  /**
   * The Swagger API object.
   *
   * Note: Do not use directly.
   * @param definition The original Swagger definition
   * @param definitionRemotesResolved The Swagger definition with all of its remote references resolved
   * @param definitionFullyResolved The Swagger definition with all of its references resolved
   * @param references The location and resolution of the resolved references in the Swagger definition
   * @param options The options passed to `swaggerApi.create`
   */
  new(definition: Object, definitionRemotesResolved: Object, definitionFullyResolved: Object, references: Object, options: Object): SwaggerApi

  /**
   * Returns the operation for the given path and operation.
   *
   * @param pathOrRequest The Swagger path string or the http client request (or equivalent)
   * @param [method] The Swagger operation method
   * @return {Operation} The Operation for the provided path and method or undefined if there is no operation for that
   * path and method combination
   */
  getOperation(pathOrRequest: string | Request, method?: string): Operation

  /**
   * Returns all operations for the provided path or all operations in the API.
   * @param [path] The Swagger path
   * @return All `Operation` objects for the provided path or all API operations
   */
  getOperations(path?: string): Operation[]

  /**
   * Returns all operations for the provided tag.
   * @param [tag] The Swagger tag
   * @return All`Operation` objects for the provided tag
   */
  getOperationsByTag(tag?: string): Operation[]

  /**
   * Returns the path object for the given path or request.
   * @param pathOrRequest The Swagger path string or the http client request (or equivalent)
   *  @return The corresponding `Path` object for the requested path or request
   */
  getPath(pathOrRequest: string | Request): Path

  /**
   * Returns all path objects for the Swagger API.
   *  @return The `Path` objects
   */
  getPaths(): Path[]

  /**
   * Registers a validator.
   * @param validator The validator
   * @throws {TypeError} If the validator is not a function
   */
  registerValidator(validator: ValidatorCallback): void

  /**
   * Performs validation of the Swagger API document(s).
   * @return The validation results
   */
  validate(): ValidationResults
}

/**
 * Detailed information about resolved JSON References.
 * docs: {@link https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..ResolvedRefDetails}
 */
interface UnresolvedRefDetails {
  /**
   * Whether or not the JSON Reference is circular (Will not be set if the JSON Reference is not circular)
   */
  circular: boolean
  /**
   * Whether or not the referenced value was missing or not (Will not be set if the referenced value is not missing)
   */
  missing: boolean
  /**
   * The referenced value (Will not be set if the referenced value is missing)
   */
  value: any
}

//TODO confirm this is all any of them use

declare interface Request {
  [index: string]: any
  url: string
}

/**
 * The Swagger Operation object.
 *
 * Extra Properties: Other than the documented properties, this object also exposes all properties of the definition object.
 */
export declare class Operation {

  consumes: string[]
  /**
   * The operation definition (The raw operation definition after remote references were resolved)
   */
  definition: Object
  /**
   * The operation definition with all of its resolvable references resolved
   */
  definitionFullyResolved: Object
  /**
   * The HTTP method for this operation
   */
  method: string
  /**
   * 	The Path object
   */
  pathObject: Path
  /**
   * The path segments to the operation definition
   */
  pathToDefinition: string[]
  /**
   * The Parameter objects
   */
  parameterObjects: Parameter[]
  /**
   * The JSON Pointer to the operation
   */
  ptr: string
  /**
   * The security definitions used by this operation
   */
  securityDefinitions: {
    [name: string]: any
  }

  responseObjects: Response[]

  /**
   * The Swagger Operation object.
   *
   * Note: Do not use directly.
   *
   * @param pathObject The Path object
   * @param method The operation method
   * @param definition The operation definition (The raw operation definition after remote references were resolved)
   * @param definitionFullyResolved The operation definition with all of its resolvable references resolved
   * @param pathToDefinition The path segments to the operation definition
   */
  new(pathObject: Path, method: string, definition: Object, definitionFullyResolved: Object, pathToDefinition: string[]): Operation

/**
 * Returns the parameter with the provided name and location when provided.
 *
 * @param {string} name The name of the parameter
 * @param {string} [location] The location *(`in`)* of the parameter *(Used for disambiguation)*
 *
 * @returns {Parameter} The `Parameter` matching the location and name combination or `undefined` if there
 *                                  is no match
 */
  getParameter(name: string, location?: string): Parameter

  /**
   * Returns all parameters for the operation.
   * @return {Parameter[]} All Parameter objects for the operation
   */
  getParameters(): Parameter[]

  /**
   * Returns the response for the requested status code or the default response _(if available)_ if none is provided.
   * @param [statusCode=default]
   */
  getResponse(statusCode?: number | string): Response

  /**
   * Returns all responses for the operation.
   * @return {Response[]} All Response objects for the operation
   */
  getResponses(): Response[]

  /**
   * Returns the composite security definitions for this operation.
   *
   * The difference between this API and `this.security` is that `this.security `is the raw `security` value for the
   * operation where as this API will return the global security value when available and this operation's
   * security is undefined.
   *
   * @returns {Object[]} The security for this operation
   */
  getSecurity(): Object[]

  /**
   * Validates the request.
   *
   * Note: req should be an `http.ClientRequest` or equivalent
   * @param request The http client request (or equivalent)
   */
  validateRequest(request: Request): ValidationResults

  /**
   * Validates the response.
   * @param response The response or response like object
   */
  validateResponse(response: ServerResponseWrapper): ValidationResults
}

/**
 * Validation results object.
 */
declare type ValidationResults = {
  /**
   * The validation errors
   */
  errors: ValidationEntry[],

  /**
   * The validation warnings
   */
  warnings: ValidationEntry[]
}

/**
 * Validation error/warning object.
 *
 * When this object is created as a result of JSON Schema validation, this object is created by z-schema and it
 * owns the structure so there can be extra properties not documented below.
 */
declare type ValidationEntry = {
  /**
   * The code used to identify the error/warning
   */
  code: string
  /**
   * 	Whenever there is an upstream `Error` encountered, its message is here
   */
  error?: string
  /**
   * The nested error(s) encountered during validation
   */
  errors?: ValidationEntry[] //for nested errors

  /**
   * Contains the composition lineage for circular composition errors
   */
  lineage?: string[]

  /**
   * The human readable description of the error/warning
   */
  message: string

  /**
   * The header name for header validation errors
   */
  name?: string

  /**
   * The parameters used when validation failed
   *
   * (This is a z-schema construct and is only set for JSON Schema validation errors.)
   */
  params?: Object[]

  /**
   * The path to the location in the document where the error/warning occurred
   */
  path: string[]

  /**
   * The schema id
   *
   * *(This is a z-schema construct and is only set for JSON Schema validation errors and when its value
   * is not `undefined`.)
   */
  schemaId?: string
}

/**
 * The Swagger Response object.
 *
 * Extra Properties: Other than the documented properties, this object also exposes all properties of the
 * definition object.
 */
declare class Response {
  /**
   * The response definition (The raw responsedefinition after remote references were resolved)
   */
  definition: Object

  /**
   * The response definition with all of its resolvable references resolved
   */
  definitionFullyResolved: Object

  /**
   * The Operation object
   */
  operationObject: Operation

  /**
   * The path segments to the path definition
   */
  pathToDefinition: string[]

  /**
   * 	The JSON Pointer to the response definition
   */
  ptr: string

  /**
   * 	The status code
   */
  statusCode: string

  /**
   * The Swagger Response object.
   *
   * Note: Do not use directly.
   * @param operationObject The `Operation` object
   * @param statusCode The status code
   * @param definition The response definition (The raw response definition after remote references were resolved)
   * @param definitionFullyResolved The response definition with all of its resolvable references resolved
   * @param pathToDefinition The path segments to the path definition
   */
  new(operationObject: Operation, statusCode: string, definition: object, definitionFullyResolved: object, pathToDefinition: string[]): Response

  /**
   * Returns the response example for the mime-type.
   * @param mimeType The mime type
   * @return The response example as a string or `undefined` if the response code and/or mime-type is missing
   */
  getExample(mimeType: string): string

  /**
   * Returns a sample value.
   * @return {*} The sample value for the response, which can be undefined if the response schema is not provided
   */
  getSample(): any

  /**
   * Validates the response.
   * @param response The response or response like object
   * @return The validation results
   */
  validateResponse(response: ServerResponseWrapper): ValidationResults
}

/**
 * The Swagger Parameter object.
 *
 * Extra Properties: Other than the documented properties, this object also exposes all properties of
 * the definition object.
 */
declare class Parameter {
  /**
   * The parameter definition (The raw parameter definition after remote references were resolved)
   */
  definition: Object

  /**
   * The parameter definition with all of its resolvable references resolved
   */
  definitionFullyResolved: Object

  /**
   * The `Operation` object the parameter belongs to (Can be `undefined` for path-level parameters)
   */
  operationObject?: Operation

  /**
   * The `Path` object the parameter belongs to
   */
  pathObject: Path

  /**
   * The path segments to the parameter definition
   */
  pathToDefinition: string[]

  /**
   * 	The JSON Pointer to the parameter definition
   */
  ptr: string

  /**
   * The JSON Schema for the parameter _(For non-body parameters, this is a computed value)_
   */
  schema: Object

  /**
   * The Swagger Parameter object.
   *
   * Note: Do not use directly.
   * @param opOrPathObject The Operation or Path object
   * @param definition The parameter definition (The raw parameter definition after remote references were resolved)
   * @param definitionFullyResolved The parameter definition with all of its resolvable references resolved
   * @param pathToDefinition The path segments to the parameter definition
   */
  new(opOrPathObject: Operation | Path, definition: Object, definitionFullyResolved: Object, pathToDefinition: string[]): Parameter

  /**
   * Returns a sample value for the parameter based on its schema;
   * @return {*} The sample value
   */
  getSample(): any

  /**
   * Returns the parameter value from the request.
   * @param request The http client request (or equivalent)
   * @return {ParameterValue} The parameter value object
   *
   * @throws {Error} If the `in` value of the parameter's schema is not valid or if the `req` property to retrieve the parameter is missing
   */
  getValue(request: Request): ParameterValue
}

/**
 * The Path object.
 *
 * Extra Properties: Other than the documented properties, this object also exposes all properties of the
 * definition object.
 */
declare class Path {
  /** The SwaggerApi object */
  api: SwaggerApi

  /**
   * The path definition (The raw path definition after remote references were resolved)
   */
  definition: Object

  /**
   * The path definition with all of its resolvable references resolved
   */
  definitionFullyResolved: Object

  /**
   * The `Operation` objects
   */
  operationObjects: Operation[]

  /**
   * The path-level `Parameter` objects
   */
  parameterObjects: Parameter[]

  /**
   * The path string
   */
  path: string

  /**
   * The path segments to the path definition
   */
  pathToDefinition: string[]

  /**
   * The JSON Pointer to the path
   */
  ptr: string

  /**
   * The `RegExp` used to match request paths against this path
   */
  regexp: RegExp

  /**
   * The Path object.
   *
   * Note: Do not use directly.
   * @param api The SwaggerApi object
   * @param path The path string
   * @param definition The path definition (The raw path definition after remote references were resolved)
   * @param definitionFullyResolved The path definition with all of its resolvable references resolved
   * @param pathToDefinition 	The path segments to the path definition
   */
  new(api: SwaggerApi, path: string, definition: Object, definitionFullyResolved: Object, pathToDefinition: string[]): Path

  /**
   * Return the operation for this path and method.
   * @param method
   * @return The `Operation` objects for this path and method or undefined if there is no operation for the provided method
   */
  getOperation(method: string): Operation[]

  /**
   * Return the operations for this path.
   * @return {Operation[]} The `Operation` objects for this path
   */
  getOperations(): Operation[]

  /**
   * Return the operations for this path and tag.
   * @param tag the tag
   * @return {Operation[]} The `Operation` objects for this path and tag
   */
  getOperationsByTag(tag: string): Operation[]

  /**
   * Return the parameters for this path.
   * @return The `Parameter` objects for this path
   */
  getParameters(): Parameter[]
}


/**
 * Object representing a parameter value.
 */
export declare class ParameterValue {
  /**
   * The error(s) encountered during processing/validating the parameter value
   */
  error: Error
  /**
   * The `Parameter` object
   */
  parameterObject: Parameter
  /**
   * The original parameter value
   *
   * _(Does not take default values into account)_
   */
  raw: any
  /**
   * Whether or not this parameter is valid based on its JSON Schema
   */
  valid: boolean
  /**
   * The processed value (Takes default values into account and does type coercion when necessary and possible).
   * This can the original value in the event that processing the value is impossible (missing schema type) or
   * `undefined` if processing the value failed (invalid types, etc.).
   */
  value: any

  /**
   * Object representing a parameter value.
   *
   * Note: Do not use directly.
   *
   * @param parameterObject The `Parameter` object
   * @param {*} raw The original/raw value
   */
  new(parameterObject: Parameter, raw: any): ParameterValue
}


/**
 * Server response wrapper.
 *
 * Since the low level `http.ServerResponse` object is not always guaranteed and even if it is, there is no public way
 * to gather the necessary parts of the response to perform validation, this object encapsulates
 * the required response information to perform response validation.
 */
interface ServerResponseWrapper {
  /**
   * The response body
   */
  body: any
  /**
   * The encoding of the body when the body is a `Buffer`
   */
  encoding?: string
  /**
   * The response headers
   */
  headers: Object
  /**
   * The response status code
   */
  statusCode: number|string
}
