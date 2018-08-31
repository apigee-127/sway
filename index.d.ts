/**
 * A library for simpler [Swagger](http://swagger.io/) integrations.
 */
declare module 'sway' {
    /**
     * Creates a SwaggerApi object from its Swagger definition(s).
     * @param options - The options for loading the definition(s)
     * @returns The promise
     */
    export function create(options: CreateOptions): Promise<SwaggerApi>;

    /**
     * Options used when creating the `SwaggerApi`.
     */
    interface CreateOptions {
        /**
         * The Swagger definition location or structure
         */
        definition: object | string;
        /**
         * *(See [JsonRefs~JsonRefsOptions](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..JsonRefsOptions))*
         */
        jsonRefs?: object;
        /**
         * The key/value pair of custom formats *(The keys are the format name and the
         * values are async functions.  See [ZSchema Custom Formats](https://github.com/zaggino/z-schema#register-a-custom-format))*
         */
        customFormats?: object;
        /**
         * The key/value pair of custom format generators *(The keys are the
         * format name and the values are functions.  See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))*
         */
        customFormatGenerators?: object;
        /**
         * The custom validators
         */
        customValidators?: any[];
    }

    /**
     * Function used for custom validation of Swagger documents
     * @param api - The Swagger API object
     * @returns The validation results
     */
    export type DocumentValidationFunction = (api: SwaggerApi)=>ValidationResults;

    /**
     * Request validation function.
     * @param res - The response or response like object
     * @param def - The `Response` definition _(useful primarily when calling
     *        `Operation#validateResponse` as `Response#validateResponse` the caller should have access to the `Response` object
     *        already.)_
     * @returns The validation results
     */
    export type RequestValidationFunction = (res: ServerResponseWrapper, def: Response)=>ValidationResults;

    /**
     * Request validation options.
     */
    interface RequestValidationOptions {
        /**
         * Enablement of strict mode validation.  If `strictMode` is a
         * `boolean` and is `true`, all form fields, headers and query parameters **must** be defined in the Swagger document
         * for this operation.  If `strictMode` is an `object`, the keys correspond to the `in` property values of the
         * [Swagger Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject)
         * and its value is a `boolean` that when `true` turns on strict mode validation for the request location matching the
         * key.  Valid keys are `formData`, `header` and `query`.  _(`body` and `path` are not necessary since `body` strict
         * mode is possible via its schema and `path` is **always** required.)_
         */
        strictMode?: boolean | object;
        /**
         * The custom validators
         */
        customValidators?: RequestValidationFunction;
    }

    /**
     * Response validation function.
     * @param req - The http client request *(or equivalent)*
     * @param op - The `Operation` object for the request
     * @returns The validation results
     */
    export type ResponseValidationFunction = (req: object, op: Operation)=>ValidationResults;

    /**
     * Response validation options.
     */
    interface ResponseValidationOptions {
        /**
         * Enablement of strict mode validation.  If `strictMode` is a
         * `boolean` and is `true`, all form fields, headers and query parameters **must** be defined in the Swagger document
         * for this operation.  If `strictMode` is an `object`, the keys correspond to the `in` property values of the
         * [Swagger Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject)
         * and its value is a `boolean` that when `true` turns on strict mode validation for the request location matching the
         * key.  Valid keys are `header`.  _(`body`, `query` and `path` are not necessary since `body` strict mode is possible
         * via its schema and `path`, `query` do not matter for responses.)_
         */
        strictMode?: boolean | object;
        /**
         * The custom validators
         */
        customValidators?: RequestValidationFunction;
    }

    /**
     * Server response wrapper.
     * 
     * Since the low level `http.ServerResponse` object is not always guaranteed and even if it is, there is no public way
     * to gather the necessary parts of the response to perform validation, this object encapsulates the required response
     * information to perform response validation.
     */
    interface ServerResponseWrapper {
        /**
         * The response body
         */
        body: any;
        /**
         * The encoding of the body when the body is a `Buffer`
         */
        encoding?: string;
        /**
         * The response headers
         */
        headers?: object;
        /**
         * The response status code
         */
        statusCode?: number | string;
    }

    /**
     * Validation error/warning object.
     * 
     * When this object is created as a result of JSON Schema validation, this object is created by
     * [z-schema](https://github.com/zaggino/z-schema) and it owns the structure so there can be extra properties not
     * documented below.
     */
    interface ValidationEntry {
        /**
         * The code used to identify the error/warning
         */
        code: string;
        /**
         * Whenever there is an upstream `Error` encountered, its message is here
         */
        error?: string;
        /**
         * The nested error(s) encountered during validation
         */
        errors?: any[];
        /**
         * Contains the composition lineage for circular composition errors
         */
        lineage?: string[];
        /**
         * The human readable description of the error/warning
         */
        message: string;
        /**
         * The header name for header validation errors
         */
        name?: string;
        /**
         * The parameters used when validation failed *(This is a z-schema construct and is only
         * set for JSON Schema validation errors.)*
         */
        params?: any[];
        /**
         * The path to the location in the document where the error/warning occurred
         */
        path: string[];
        /**
         * The schema id *(This is a z-schema construct and is only set for JSON Schema
         * validation errors and when its value is not `undefined`.)
         */
        schemaId?: string;
    }

    /**
     * Validation results object.
     */
    interface ValidationResults {
        /**
         * The validation errors
         */
        errors: any[];
        /**
         * The validation warnings
         */
        warnings: any[];
    }

    class SwaggerApi {
        /**
         * The Swagger API object.
         * 
         * **Note:** Do not use directly.
         * 
         * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
         * object.
         * @param definition - The original Swagger definition
         * @param definitionRemotesResolved - The Swagger definition with all of its remote references resolved
         * @param definitionFullyResolved - The Swagger definition with all of its references resolved
         * @param references - The location and resolution of the resolved references in the Swagger definition
         * @param options - The options passed to swaggerApi.create
         */
        constructor(definition: object, definitionRemotesResolved: object, definitionFullyResolved: object, references: object, options: object);

        /**
         * Returns the operation for the given path and operation.
         * 
         * **Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:
         * 
         * * `method`
         * * `originalUrl`
         * * `url`
         * 
         * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
         * @param idOrPathOrReq - The Swagger opeartion id, path string or the http client request *(or
         *        equivalent)*
         * @param method - The Swagger operation method _(not used when providing an operation id)_
         * @returns The `Operation` for the provided operation id, or path and method or `undefined` if
         *          there is no operation for that operation id, or path and method combination
         */
        getOperation(idOrPathOrReq: string | object, method?: string): Operation;

        /**
         * Returns all operations for the provided path or all operations in the API.
         * @param path - The Swagger path
         * @returns All `Operation` objects for the provided path or all API operations
         */
        getOperations(path?: string): any[];

        /**
         * Returns all operations for the provided tag.
         * @param tag - The Swagger tag
         * @returns All `Operation` objects for the provided tag
         */
        getOperationsByTag(tag?: string): any[];

        /**
         * Returns the path object for the given path or request.
         * 
         * **Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:
         * 
         * * `originalUrl`
         * * `url`
         * 
         * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
         * @param pathOrReq - The Swagger path string or the http client request *(or equivalent)*
         * @returns The corresponding `Path` object for the requested path or request
         */
        getPath(pathOrReq: string | object): Path;

        /**
         * Returns all path objects for the Swagger API.
         * @returns The `Path` objects
         */
        getPaths(): any[];

        /**
         * Registers a custom format.
         * @param name - The name of the format
         * @param validator - The format validator *(See [ZSchema Custom Format](https://github.com/zaggino/z-schema#register-a-custom-format))*
         */
        registerFormat(name: string, validator: Function): void;

        /**
         * Registers a custom format generator.
         * @param name - The name of the format
         * @param formatGenerator - The format generator *(See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))*
         */
        registerFormatGenerator(name: string, formatGenerator: Function): void;

        /**
         * Unregisters a custom format.
         * @param name - The name of the format
         */
        unregisterFormat(name: string): void;

        /**
         * Unregisters a custom format generator.
         * @param name - The name of the format generator
         */
        unregisterFormatGenerator(name: string): void;

        /**
         * Registers a custom validator.
         * @param validator - The validator
         * @throws If the validator is not a function
         */
        registerValidator(validator: DocumentValidationFunction): void;

        /**
         * Performs validation of the Swagger API document(s).
         * @returns The validation results
         */
        validate(): ValidationResults;

    }

    class Operation {
        /**
         * The Swagger Operation object.
         * 
         * **Note:** Do not use directly.
         * 
         * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
         * object.
         * @param pathObject - The Path object
         * @param method - The operation method
         * @param definition - The operation definition *(The raw operation definition __after__ remote references were
         *        resolved)*
         * @param definitionFullyResolved - The operation definition with all of its resolvable references resolved
         * @param pathToDefinition - The path segments to the operation definition
         */
        constructor(pathObject: Path, method: string, definition: object, definitionFullyResolved: object, pathToDefinition: string[]);

        /**
         * Returns the parameter with the provided name and location when provided.
         * @param name - The name of the parameter
         * @param location - The location *(`in`)* of the parameter *(Used for disambiguation)*
         * @returns The `Parameter` matching the location and name combination or `undefined` if there
         *          is no match
         */
        getParameter(name: string, location?: string): Parameter;

        /**
         * Returns all parameters for the operation.
         * @returns All `Parameter` objects for the operation
         */
        getParameters(): any[];

        /**
         * Returns the response for the requested status code or the default response *(if available)* if none is provided.
         * @param statusCode - The status code
         * @returns The `Response` or `undefined` if one cannot be found
         */
        getResponse(statusCode?: number | string): Response;

        /**
         * Returns all responses for the operation.
         * @returns All `Response` objects for the operation
         */
        getResponses(): any[];

        /**
         * Returns the composite security definitions for this operation.
         * 
         * The difference between this API and `this.security` is that `this.security` is the raw `security` value for the
         * operation where as this API will return the global `security` value when available and this operation's security
         * is undefined.
         * @returns The security for this operation
         */
        getSecurity(): object[];

        /**
         * Validates the request.
         * 
         * **Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:
         * 
         * * `body`: Used for `body` and `formData` parameters
         * * `files`: Used for `formData` parameters whose `type` is `file`
         * * `headers`: Used for `header` parameters and consumes
         * * `originalUrl`: used for `path` parameters
         * * `query`: Used for `query` parameters
         * * `url`: used for `path` parameters
         * 
         * For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the
         * `originalUrl` or `url` property.
         * 
         * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
         * @param req - The http client request *(or equivalent)*
         * @param options - The validation options
         * @returns The validation results
         */
        validateRequest(req: object, options?: RequestValidationOptions): ValidationResults;

        /**
         * Validates the response.
         * @param res - The response or response like object
         * @param options - The validation options
         * @returns The validation results
         */
        validateResponse(res: ServerResponseWrapper, options?: ResponseValidationOptions): ValidationResults;

    }

    class ParameterValue {
        /**
         * Object representing a parameter value.
         * 
         * **Note:** Do not use directly.
         * @param parameterObject - The `Parameter` object
         * @param raw - The original/raw value
         */
        constructor(parameterObject: Parameter, raw: any);

    }

    class Parameter {
        /**
         * The Swagger Parameter object.
         * 
         * **Note:** Do not use directly.
         * 
         * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
         * object.
         * @param opOrPathObject - The `Operation` or `Path` object
         * @param definition - The parameter definition *(The raw parameter definition __after__ remote references were
         *        resolved)*
         * @param definitionFullyResolved - The parameter definition with all of its resolvable references resolved
         * @param pathToDefinition - The path segments to the parameter definition
         */
        constructor(opOrPathObject: Operation | Path, definition: object, definitionFullyResolved: object, pathToDefinition: string[]);

        /**
         * Returns a sample value for the parameter based on its schema;
         * @returns The sample value
         */
        getSample(): any;

        /**
         * Returns the parameter value from the request.
         * 
         * **Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:
         * 
         * * `body`: Used for `body` and `formData` parameters
         * * `files`: Used for `formData` parameters whose `type` is `file`
         * * `headers`: Used for `header` parameters
         * * `originalUrl`: used for `path` parameters
         * * `query`: Used for `query` parameters
         * * `url`: used for `path` parameters
         * 
         * For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the
         * `originalUrl` or `url` property.
         * 
         * *(See: {@link https://nodejs.org/api/http.html#http_class_http_clientrequest})*
         * @param req - The http client request *(or equivalent)*
         * @returns The parameter value object
         * @throws If the `in` value of the parameter's schema is not valid or if the `req` property to retrieve the
         *         parameter is missing
         */
        getValue(req: object): ParameterValue;

    }

    class Path {
        /**
         * The Path object.
         * 
         * **Note:** Do not use directly.
         * 
         * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the
         * definition object.
         * @param api - The `SwaggerApi` object
         * @param path - The path string
         * @param definition - The path definition *(The raw path definition __after__ remote references were
         *        resolved)*
         * @param definitionFullyResolved - The path definition with all of its resolvable references resolved
         * @param pathToDefinition - The path segments to the path definition
         */
        constructor(api: SwaggerApi, path: string, definition: object, definitionFullyResolved: object, pathToDefinition: string[]);

        /**
         * Return the operation for this path and operation id or method.
         * @param idOrMethod - The operation id or method
         * @returns The `Operation` objects for this path and method or `undefined` if there is no
         *          operation for the provided method
         */
        getOperation(idOrMethod: string): any[];

        /**
         * Return the operations for this path.
         * @returns The `Operation` objects for this path
         */
        getOperations(): any[];

        /**
         * Return the operations for this path and tag.
         * @param tag - The tag
         * @returns The `Operation` objects for this path and tag
         */
        getOperationsByTag(tag: string): any[];

        /**
         * Return the parameters for this path.
         * @returns The `Parameter` objects for this path
         */
        getParameters(): any[];

    }

    class Response {
        /**
         * The Swagger Response object.
         * 
         * **Note:** Do not use directly.
         * 
         * **Extra Properties:** Other than the documented properties, this object also exposes all properties of the
         * definition object.
         * @param operationObject - The `Operation` object
         * @param statusCode - The status code
         * @param definition - The response definition *(The raw response definition __after__ remote references were
         *        resolved)*
         * @param definitionFullyResolved - The response definition with all of its resolvable references resolved
         * @param pathToDefinition - The path segments to the path definition
         */
        constructor(operationObject: Operation, statusCode: string, definition: object, definitionFullyResolved: object, pathToDefinition: string[]);

        /**
         * Returns the response example for the mime-type.
         * @param mimeType - The mime type
         * @returns The response example as a string or `undefined` if the response code and/or mime-type is missing
         */
        getExample(mimeType?: string): string;

        /**
         * Returns a sample value.
         * @returns The sample value for the response, which can be undefined if the response schema is not provided
         */
        getSample(): any;

        /**
         * Validates the response.
         * @param res - The response or response like object
         * @param options - The validation options
         * @returns The validation results
         */
        validateResponse(res: ServerResponseWrapper, options?: ResponseValidationOptions): ValidationResults;

    }

}

