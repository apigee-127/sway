<a name="module_sway"></a>

## sway
A library that simplifies [OpenAPI](https://www.openapis.org/) integrations.


* [sway](#module_sway)
    * [.ApiDefinition](#module_sway.ApiDefinition)
        * [new ApiDefinition(definition, definitionRemotesResolved, definitionFullyResolved, references, options)](#new_module_sway.ApiDefinition_new)
        * [.getOperation(idOrPathOrReq, [method])](#module_sway.ApiDefinition+getOperation) ⇒ <code>[Operation](#module_sway.Operation)</code>
        * [.getOperations([path])](#module_sway.ApiDefinition+getOperations) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
        * [.getOperationsByTag([tag])](#module_sway.ApiDefinition+getOperationsByTag) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
        * [.getPath(pathOrReq)](#module_sway.ApiDefinition+getPath) ⇒ <code>[Path](#module_sway.Path)</code>
        * [.getPaths()](#module_sway.ApiDefinition+getPaths) ⇒ <code>[Array.&lt;Path&gt;](#module_sway.Path)</code>
        * [.registerFormat(name, validator)](#module_sway.ApiDefinition+registerFormat)
        * [.registerFormatGenerator(name, formatGenerator)](#module_sway.ApiDefinition+registerFormatGenerator)
        * [.registerValidator(validator)](#module_sway.ApiDefinition+registerValidator)
        * [.unregisterFormat(name)](#module_sway.ApiDefinition+unregisterFormat)
        * [.unregisterFormatGenerator(name)](#module_sway.ApiDefinition+unregisterFormatGenerator)
        * [.validate()](#module_sway.ApiDefinition+validate) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
    * [.CreateOptions](#module_sway.CreateOptions) : <code>object</code>
    * [.DocumentValidationFunction](#module_sway.DocumentValidationFunction) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
    * [.Operation](#module_sway.Operation)
        * [new Operation(pathObject, method, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Operation_new)
        * [.getParameter(name, [location])](#module_sway.Operation+getParameter) ⇒ <code>[Parameter](#module_sway.Parameter)</code>
        * [.getParameters()](#module_sway.Operation+getParameters) ⇒ <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code>
        * [.getResponse([statusCode])](#module_sway.Operation+getResponse) ⇒ <code>[Response](#module_sway.Response)</code>
        * [.getResponses()](#module_sway.Operation+getResponses) ⇒ <code>[Array.&lt;Response&gt;](#module_sway.Response)</code>
        * [.getSecurity()](#module_sway.Operation+getSecurity) ⇒ <code>Array.&lt;object&gt;</code>
        * [.validateRequest(req, [options])](#module_sway.Operation+validateRequest) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
        * [.validateResponse(res, [options])](#module_sway.Operation+validateResponse) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
    * [.Parameter](#module_sway.Parameter)
        * [new Parameter(opOrPathObject, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Parameter_new)
        * [.getSample()](#module_sway.Parameter+getSample) ⇒ <code>\*</code>
        * [.getValue(req)](#module_sway.Parameter+getValue) ⇒ <code>[ParameterValue](#module_sway.ParameterValue)</code>
    * [.ParameterValue](#module_sway.ParameterValue)
        * [new ParameterValue(parameterObject, raw)](#new_module_sway.ParameterValue_new)
    * [.Path](#module_sway.Path)
        * [new Path(apiDefinition, path, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Path_new)
        * [.getOperation(idOrMethod)](#module_sway.Path+getOperation) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
        * [.getOperations()](#module_sway.Path+getOperations) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
        * [.getOperationsByTag(tag)](#module_sway.Path+getOperationsByTag) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
        * [.getParameters()](#module_sway.Path+getParameters) ⇒ <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code>
    * [.RequestValidationFunction](#module_sway.RequestValidationFunction) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
    * [.RequestValidationOptions](#module_sway.RequestValidationOptions) : <code>object</code>
    * [.Response](#module_sway.Response)
        * [new Response(operationObject, statusCode, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Response_new)
        * [.getExample([mimeType])](#module_sway.Response+getExample) ⇒ <code>string</code>
        * [.getSample()](#module_sway.Response+getSample) ⇒ <code>\*</code>
        * [.validateResponse(res, [options])](#module_sway.Response+validateResponse) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
    * [.ResponseValidationFunction](#module_sway.ResponseValidationFunction) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
    * [.ResponseValidationOptions](#module_sway.ResponseValidationOptions) : <code>object</code>
    * [.ServerResponseWrapper](#module_sway.ServerResponseWrapper) : <code>object</code>
    * [.ValidationEntry](#module_sway.ValidationEntry) : <code>object</code>
    * [.ValidationResults](#module_sway.ValidationResults) : <code>object</code>
    * [.create(options)](#module_sway.create) ⇒ <code>[Promise.&lt;ApiDefinition&gt;](#module_sway.ApiDefinition)</code>

<a name="module_sway.ApiDefinition"></a>

### sway.ApiDefinition
**Kind**: static class of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| customFormats | <code>object</code> | The key/value pair of custom formats *(The keys are the format name and the values are async functions.  See [ZSchema Custom Formats](https://github.com/zaggino/z-schema#register-a-custom-format))* |
| customFormatGenerators | <code>object</code> | The key/value pair of custom format generators *(The keys are the format name and the values are functions.  See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))* |
| customValidators | <code>[Array.&lt;DocumentValidationFunction&gt;](#module_sway.DocumentValidationFunction)</code> | The array of custom validators |
| definition | <code>object</code> | The original OpenAPI definition |
| definitionRemotesResolved | <code>object</code> | The OpenAPI definition with only its remote references resolved *(This means all references to external/remote documents are replaced with its dereferenced value but all local references are left unresolved.)* |
| definitionFullyResolved | <code>object</code> | The OpenAPI definition with all of its resolvable references resolved *(This means that all resolvable references are replaced with their dereferenced value.)* |
| documentationUrl | <code>string</code> | The URL to the OpenAPI documentation |
| pathObjects | <code>[Array.&lt;Path&gt;](#module_sway.Path)</code> | The unique `Path` objects |
| options | <code>object</code> | The options passed to the constructor |
| references | <code>object</code> | The reference metadata *(See [JsonRefs~ResolvedRefDetails](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..ResolvedRefDetails))* |
| version | <code>string</code> | The OpenAPI version |


* [.ApiDefinition](#module_sway.ApiDefinition)
    * [new ApiDefinition(definition, definitionRemotesResolved, definitionFullyResolved, references, options)](#new_module_sway.ApiDefinition_new)
    * [.getOperation(idOrPathOrReq, [method])](#module_sway.ApiDefinition+getOperation) ⇒ <code>[Operation](#module_sway.Operation)</code>
    * [.getOperations([path])](#module_sway.ApiDefinition+getOperations) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
    * [.getOperationsByTag([tag])](#module_sway.ApiDefinition+getOperationsByTag) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
    * [.getPath(pathOrReq)](#module_sway.ApiDefinition+getPath) ⇒ <code>[Path](#module_sway.Path)</code>
    * [.getPaths()](#module_sway.ApiDefinition+getPaths) ⇒ <code>[Array.&lt;Path&gt;](#module_sway.Path)</code>
    * [.registerFormat(name, validator)](#module_sway.ApiDefinition+registerFormat)
    * [.registerFormatGenerator(name, formatGenerator)](#module_sway.ApiDefinition+registerFormatGenerator)
    * [.registerValidator(validator)](#module_sway.ApiDefinition+registerValidator)
    * [.unregisterFormat(name)](#module_sway.ApiDefinition+unregisterFormat)
    * [.unregisterFormatGenerator(name)](#module_sway.ApiDefinition+unregisterFormatGenerator)
    * [.validate()](#module_sway.ApiDefinition+validate) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>

<a name="new_module_sway.ApiDefinition_new"></a>

#### new ApiDefinition(definition, definitionRemotesResolved, definitionFullyResolved, references, options)
The OpenAPI Definition object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the
[OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#openapi-object).


| Param | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The original OpenAPI definition |
| definitionRemotesResolved | <code>object</code> | The OpenAPI definition with all of its remote references resolved |
| definitionFullyResolved | <code>object</code> | The OpenAPI definition with all of its references resolved |
| references | <code>object</code> | The location and resolution of the resolved references in the OpenAPI definition |
| options | <code>object</code> | The options passed to ApiDefinition.create |

<a name="module_sway.ApiDefinition+getOperation"></a>

#### apiDefinition.getOperation(idOrPathOrReq, [method]) ⇒ <code>[Operation](#module_sway.Operation)</code>
Returns the operation for the given path and operation.

**Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:

  * `method`
  * `originalUrl`
  * `url`

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  
**Returns**: <code>[Operation](#module_sway.Operation)</code> - The `Operation` for the provided operation id, or path and method or `undefined` if
there is no operation for that operation id, or path and method combination  

| Param | Type | Description |
| --- | --- | --- |
| idOrPathOrReq | <code>string</code> &#124; <code>object</code> | The OpenAPI operation id, path string or the http client request *(or equivalent)* |
| [method] | <code>string</code> | The OpenAPI operation method _(not used when providing an operation id)_ |

<a name="module_sway.ApiDefinition+getOperations"></a>

#### apiDefinition.getOperations([path]) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
Returns all operations for the provided path or all operations in the API.

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code> - All `Operation` objects for the provided path or all API operations  

| Param | Type | Description |
| --- | --- | --- |
| [path] | <code>string</code> | The OpenAPI path |

<a name="module_sway.ApiDefinition+getOperationsByTag"></a>

#### apiDefinition.getOperationsByTag([tag]) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
Returns all operations for the provided tag.

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code> - All `Operation` objects for the provided tag  

| Param | Type | Description |
| --- | --- | --- |
| [tag] | <code>string</code> | The OpenAPI tag |

<a name="module_sway.ApiDefinition+getPath"></a>

#### apiDefinition.getPath(pathOrReq) ⇒ <code>[Path](#module_sway.Path)</code>
Returns the path object for the given path or request.

**Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:

  * `originalUrl`
  * `url`

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  
**Returns**: <code>[Path](#module_sway.Path)</code> - The corresponding `Path` object for the requested path or request  

| Param | Type | Description |
| --- | --- | --- |
| pathOrReq | <code>string</code> &#124; <code>object</code> | The OpenAPI path string or the http client request *(or equivalent)* |

<a name="module_sway.ApiDefinition+getPaths"></a>

#### apiDefinition.getPaths() ⇒ <code>[Array.&lt;Path&gt;](#module_sway.Path)</code>
Returns all path objects for the OpenAPI definition.

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  
**Returns**: <code>[Array.&lt;Path&gt;](#module_sway.Path)</code> - The `Path` objects  
<a name="module_sway.ApiDefinition+registerFormat"></a>

#### apiDefinition.registerFormat(name, validator)
Registers a custom format.

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the format |
| validator | <code>function</code> | The format validator *(See [ZSchema Custom Format](https://github.com/zaggino/z-schema#register-a-custom-format))* |

<a name="module_sway.ApiDefinition+registerFormatGenerator"></a>

#### apiDefinition.registerFormatGenerator(name, formatGenerator)
Registers a custom format generator.

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the format |
| formatGenerator | <code>function</code> | The format generator *(See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))* |

<a name="module_sway.ApiDefinition+registerValidator"></a>

#### apiDefinition.registerValidator(validator)
Registers a custom validator.

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  
**Throws**:

- <code>TypeError</code> If the validator is not a function


| Param | Type | Description |
| --- | --- | --- |
| validator | <code>[DocumentValidationFunction](#module_sway.DocumentValidationFunction)</code> | The validator |

<a name="module_sway.ApiDefinition+unregisterFormat"></a>

#### apiDefinition.unregisterFormat(name)
Unregisters a custom format.

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the format |

<a name="module_sway.ApiDefinition+unregisterFormatGenerator"></a>

#### apiDefinition.unregisterFormatGenerator(name)
Unregisters a custom format generator.

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the format generator |

<a name="module_sway.ApiDefinition+validate"></a>

#### apiDefinition.validate() ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
Performs validation of the OpenAPI definition.

**Kind**: instance method of <code>[ApiDefinition](#module_sway.ApiDefinition)</code>  
**Returns**: <code>[ValidationResults](#module_sway.ValidationResults)</code> - The validation results  
<a name="module_sway.CreateOptions"></a>

### sway.CreateOptions : <code>object</code>
Options used when creating the `ApiDefinition`.

**Kind**: static typedef of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> &#124; <code>string</code> | The OpenAPI definition location or structure |
| jsonRefs | <code>object</code> | *(See [JsonRefs~JsonRefsOptions](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..JsonRefsOptions))* |
| customFormats | <code>object</code> | The key/value pair of custom formats *(The keys are the format name and the values are async functions.  See [ZSchema Custom Formats](https://github.com/zaggino/z-schema#register-a-custom-format))* |
| customFormatGenerators | <code>object</code> | The key/value pair of custom format generators *(The keys are the format name and the values are functions.  See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))* |
| customValidators | <code>[Array.&lt;DocumentValidationFunction&gt;](#module_sway.DocumentValidationFunction)</code> | The custom validators |

<a name="module_sway.DocumentValidationFunction"></a>

### sway.DocumentValidationFunction ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
Function used for custom validation of OpenAPI documents

**Kind**: static typedef of <code>[sway](#module_sway)</code>  
**Returns**: <code>[ValidationResults](#module_sway.ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| apiDefinition | <code>[ApiDefinition](#module_sway.ApiDefinition)</code> | The `ApiDefinition` object |

<a name="module_sway.Operation"></a>

### sway.Operation
**Kind**: static class of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The operation definition *(The raw operation definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The operation definition with all of its resolvable references resolved |
| method | <code>string</code> | The HTTP method for this operation |
| pathObject | <code>[Path](#module_sway.Path)</code> | The `Path` object |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the operation definition |
| parameterObjects | <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code> | The `Parameter` objects |
| ptr | <code>string</code> | The JSON Pointer to the operation |
| securityDefinitions | <code>object</code> | The security definitions used by this operation |


* [.Operation](#module_sway.Operation)
    * [new Operation(pathObject, method, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Operation_new)
    * [.getParameter(name, [location])](#module_sway.Operation+getParameter) ⇒ <code>[Parameter](#module_sway.Parameter)</code>
    * [.getParameters()](#module_sway.Operation+getParameters) ⇒ <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code>
    * [.getResponse([statusCode])](#module_sway.Operation+getResponse) ⇒ <code>[Response](#module_sway.Response)</code>
    * [.getResponses()](#module_sway.Operation+getResponses) ⇒ <code>[Array.&lt;Response&gt;](#module_sway.Response)</code>
    * [.getSecurity()](#module_sway.Operation+getSecurity) ⇒ <code>Array.&lt;object&gt;</code>
    * [.validateRequest(req, [options])](#module_sway.Operation+validateRequest) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
    * [.validateResponse(res, [options])](#module_sway.Operation+validateResponse) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>

<a name="new_module_sway.Operation_new"></a>

#### new Operation(pathObject, method, definition, definitionFullyResolved, pathToDefinition)
The OpenAPI Operation object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the
[OpenAPI Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operationObject).


| Param | Type | Description |
| --- | --- | --- |
| pathObject | <code>[Path](#module_sway.Path)</code> | The Path object |
| method | <code>string</code> | The operation method |
| definition | <code>object</code> | The operation definition *(The raw operation definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The operation definition with all of its resolvable references resolved |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the operation definition |

<a name="module_sway.Operation+getParameter"></a>

#### operation.getParameter(name, [location]) ⇒ <code>[Parameter](#module_sway.Parameter)</code>
Returns the parameter with the provided name and location when provided.

**Kind**: instance method of <code>[Operation](#module_sway.Operation)</code>  
**Returns**: <code>[Parameter](#module_sway.Parameter)</code> - The `Parameter` matching the location and name combination or `undefined` if there
is no match  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the parameter |
| [location] | <code>string</code> | The location *(`in`)* of the parameter *(Used for disambiguation)* |

<a name="module_sway.Operation+getParameters"></a>

#### operation.getParameters() ⇒ <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code>
Returns all parameters for the operation.

**Kind**: instance method of <code>[Operation](#module_sway.Operation)</code>  
**Returns**: <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code> - All `Parameter` objects for the operation  
<a name="module_sway.Operation+getResponse"></a>

#### operation.getResponse([statusCode]) ⇒ <code>[Response](#module_sway.Response)</code>
Returns the response for the requested status code or the default response *(if available)* if none is provided.

**Kind**: instance method of <code>[Operation](#module_sway.Operation)</code>  
**Returns**: <code>[Response](#module_sway.Response)</code> - The `Response` or `undefined` if one cannot be found  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [statusCode] | <code>number</code> &#124; <code>string</code> | <code>&#x27;default&#x27;</code> | The status code |

<a name="module_sway.Operation+getResponses"></a>

#### operation.getResponses() ⇒ <code>[Array.&lt;Response&gt;](#module_sway.Response)</code>
Returns all responses for the operation.

**Kind**: instance method of <code>[Operation](#module_sway.Operation)</code>  
**Returns**: <code>[Array.&lt;Response&gt;](#module_sway.Response)</code> - All `Response` objects for the operation  
<a name="module_sway.Operation+getSecurity"></a>

#### operation.getSecurity() ⇒ <code>Array.&lt;object&gt;</code>
Returns the composite security definitions for this operation.

The difference between this API and `this.security` is that `this.security` is the raw `security` value for the
operation where as this API will return the global `security` value when available and this operation's security
is undefined.

**Kind**: instance method of <code>[Operation](#module_sway.Operation)</code>  
**Returns**: <code>Array.&lt;object&gt;</code> - The security for this operation  
<a name="module_sway.Operation+validateRequest"></a>

#### operation.validateRequest(req, [options]) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
Validates the request.

**Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:

  * `body`: Used for `body` and `formData` parameters
  * `files`: Used for `formData` parameters whose `type` is `file`
  * `headers`: Used for `header` parameters and consumes
  * `originalUrl`: used for `path` parameters
  * `query`: Used for `query` parameters
  * `url`: used for `path` parameters

For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the
`originalUrl` or `url` property.

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[Operation](#module_sway.Operation)</code>  
**Returns**: <code>[ValidationResults](#module_sway.ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | The http client request *(or equivalent)* |
| [options] | <code>[RequestValidationOptions](#module_sway.RequestValidationOptions)</code> | The validation options |

<a name="module_sway.Operation+validateResponse"></a>

#### operation.validateResponse(res, [options]) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
Validates the response.

**Kind**: instance method of <code>[Operation](#module_sway.Operation)</code>  
**Returns**: <code>[ValidationResults](#module_sway.ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| res | <code>[ServerResponseWrapper](#module_sway.ServerResponseWrapper)</code> | The response or response like object |
| [options] | <code>[ResponseValidationOptions](#module_sway.ResponseValidationOptions)</code> | The validation options |

<a name="module_sway.Parameter"></a>

### sway.Parameter
**Kind**: static class of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The parameter definition *(The raw parameter definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The parameter definition with all of its resolvable references resolved |
| operationObject | <code>[Operation](#module_sway.Operation)</code> | The `Operation` object the parameter belongs to *(Can be `undefined` for path-level parameters)* |
| pathObject | <code>[Path](#module_sway.Path)</code> | The `Path` object the parameter belongs to |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the parameter definition |
| ptr | <code>string</code> | The JSON Pointer to the parameter definition |
| schema | <code>object</code> | The JSON Schema for the parameter *(For non-body parameters, this is a computed value)* |


* [.Parameter](#module_sway.Parameter)
    * [new Parameter(opOrPathObject, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Parameter_new)
    * [.getSample()](#module_sway.Parameter+getSample) ⇒ <code>\*</code>
    * [.getValue(req)](#module_sway.Parameter+getValue) ⇒ <code>[ParameterValue](#module_sway.ParameterValue)</code>

<a name="new_module_sway.Parameter_new"></a>

#### new Parameter(opOrPathObject, definition, definitionFullyResolved, pathToDefinition)
The OpenAPI Parameter object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the
[OpenAPI Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#parameterObject).


| Param | Type | Description |
| --- | --- | --- |
| opOrPathObject | <code>[Operation](#module_sway.Operation)</code> &#124; <code>[Path](#module_sway.Path)</code> | The `Operation` or `Path` object |
| definition | <code>object</code> | The parameter definition *(The raw parameter definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The parameter definition with all of its resolvable references resolved |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the parameter definition |

<a name="module_sway.Parameter+getSample"></a>

#### parameter.getSample() ⇒ <code>\*</code>
Returns a sample value for the parameter based on its schema;

**Kind**: instance method of <code>[Parameter](#module_sway.Parameter)</code>  
**Returns**: <code>\*</code> - The sample value  
<a name="module_sway.Parameter+getValue"></a>

#### parameter.getValue(req) ⇒ <code>[ParameterValue](#module_sway.ParameterValue)</code>
Returns the parameter value from the request.

**Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:

  * `body`: Used for `body` and `formData` parameters
  * `files`: Used for `formData` parameters whose `type` is `file`
  * `headers`: Used for `header` parameters
  * `originalUrl`: used for `path` parameters
  * `query`: Used for `query` parameters
  * `url`: used for `path` parameters

For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the
`originalUrl` or `url` property.

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[Parameter](#module_sway.Parameter)</code>  
**Returns**: <code>[ParameterValue](#module_sway.ParameterValue)</code> - The parameter value object  
**Throws**:

- <code>Error</code> If the `in` value of the parameter's schema is not valid or if the `req` property to retrieve the
parameter is missing


| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | The http client request *(or equivalent)* |

<a name="module_sway.ParameterValue"></a>

### sway.ParameterValue
**Kind**: static class of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | The error(s) encountered during processing/validating the parameter value |
| parameterObject | <code>[Parameter](#module_sway.Parameter)</code> | The `Parameter` object |
| raw | <code>\*</code> | The original parameter value *(Does not take default values into account)* |
| valid | <code>boolean</code> | Whether or not this parameter is valid based on its JSON Schema |
| value | <code>\*</code> | The processed value *(Takes default values into account and does type coercion when necessary and possible)*.  This can the original value in the event that processing the value is impossible *(missing schema type)* or `undefined` if processing the value failed *(invalid types, etc.)*. |

<a name="new_module_sway.ParameterValue_new"></a>

#### new ParameterValue(parameterObject, raw)
Object representing a parameter value.

**Note:** Do not use directly.


| Param | Type | Description |
| --- | --- | --- |
| parameterObject | <code>[Parameter](#module_sway.Parameter)</code> | The `Parameter` object |
| raw | <code>\*</code> | The original/raw value |

<a name="module_sway.Path"></a>

### sway.Path
**Kind**: static class of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| apiDefinition | <code>[ApiDefinition](#module_sway.ApiDefinition)</code> | The `ApiDefinition` object |
| definition | <code>object</code> | The path definition *(The raw path definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The path definition with all of its resolvable references resolved |
| operationObjects | <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code> | The `Operation` objects |
| parameterObjects | <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code> | The path-level `Parameter` objects |
| path | <code>string</code> | The path string |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |
| ptr | <code>ptr</code> | The JSON Pointer to the path |
| regexp | <code>regexp</code> | The `RegExp` used to match request paths against this path |


* [.Path](#module_sway.Path)
    * [new Path(apiDefinition, path, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Path_new)
    * [.getOperation(idOrMethod)](#module_sway.Path+getOperation) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
    * [.getOperations()](#module_sway.Path+getOperations) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
    * [.getOperationsByTag(tag)](#module_sway.Path+getOperationsByTag) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
    * [.getParameters()](#module_sway.Path+getParameters) ⇒ <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code>

<a name="new_module_sway.Path_new"></a>

#### new Path(apiDefinition, path, definition, definitionFullyResolved, pathToDefinition)
The Path object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the
[OpenAPI Path Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#pathItemObject).


| Param | Type | Description |
| --- | --- | --- |
| apiDefinition | <code>[ApiDefinition](#module_sway.ApiDefinition)</code> | The `ApiDefinition` object |
| path | <code>string</code> | The path string |
| definition | <code>object</code> | The path definition *(The raw path definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The path definition with all of its resolvable references resolved |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |

<a name="module_sway.Path+getOperation"></a>

#### path.getOperation(idOrMethod) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
Return the operation for this path and operation id or method.

**Kind**: instance method of <code>[Path](#module_sway.Path)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code> - The `Operation` objects for this path and method or `undefined` if there is no
operation for the provided method  

| Param | Type | Description |
| --- | --- | --- |
| idOrMethod | <code>string</code> | The operation id or method |

<a name="module_sway.Path+getOperations"></a>

#### path.getOperations() ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
Return the operations for this path.

**Kind**: instance method of <code>[Path](#module_sway.Path)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code> - The `Operation` objects for this path  
<a name="module_sway.Path+getOperationsByTag"></a>

#### path.getOperationsByTag(tag) ⇒ <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code>
Return the operations for this path and tag.

**Kind**: instance method of <code>[Path](#module_sway.Path)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#module_sway.Operation)</code> - The `Operation` objects for this path and tag  

| Param | Type | Description |
| --- | --- | --- |
| tag | <code>string</code> | The tag |

<a name="module_sway.Path+getParameters"></a>

#### path.getParameters() ⇒ <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code>
Return the parameters for this path.

**Kind**: instance method of <code>[Path](#module_sway.Path)</code>  
**Returns**: <code>[Array.&lt;Parameter&gt;](#module_sway.Parameter)</code> - The `Parameter` objects for this path  
<a name="module_sway.RequestValidationFunction"></a>

### sway.RequestValidationFunction ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
Request validation function.

**Kind**: static typedef of <code>[sway](#module_sway)</code>  
**Returns**: <code>[ValidationResults](#module_sway.ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| res | <code>[ServerResponseWrapper](#module_sway.ServerResponseWrapper)</code> | The response or response like object |
| def | <code>[Response](#module_sway.Response)</code> | The `Response` definition _(useful primarily when calling `Operation#validateResponse` as `Response#validateResponse` the caller should have access to the `Response` object already.)_ |

<a name="module_sway.RequestValidationOptions"></a>

### sway.RequestValidationOptions : <code>object</code>
Request validation options.

**Kind**: static typedef of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| strictMode | <code>boolean</code> &#124; <code>object</code> | <code>false</code> | Enablement of strict mode validation.  If `strictMode` is a `boolean` and is `true`, all form fields, headers and query parameters **must** be defined in the OpenAPI document for this operation.  If `strictMode` is an `object`, the keys correspond to the `in` property values of the [OpenAPI Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#parameterObject) and its value is a `boolean` that when `true` turns on strict mode validation for the request location matching the key.  Valid keys are `formData`, `header` and `query`.  _(`body` and `path` are not necessary since `body` strict mode is possible via its schema and `path` is **always** required.)_ |
| customValidators | <code>[RequestValidationFunction](#module_sway.RequestValidationFunction)</code> |  | The custom validators |

<a name="module_sway.Response"></a>

### sway.Response
**Kind**: static class of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The response definition *(The raw responsedefinition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The response definition with all of its resolvable references resolved |
| operationObject | <code>[Operation](#module_sway.Operation)</code> | The Operation object |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |
| ptr | <code>string</code> | The JSON Pointer to the response definition |
| statusCode | <code>string</code> | The status code |


* [.Response](#module_sway.Response)
    * [new Response(operationObject, statusCode, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Response_new)
    * [.getExample([mimeType])](#module_sway.Response+getExample) ⇒ <code>string</code>
    * [.getSample()](#module_sway.Response+getSample) ⇒ <code>\*</code>
    * [.validateResponse(res, [options])](#module_sway.Response+validateResponse) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>

<a name="new_module_sway.Response_new"></a>

#### new Response(operationObject, statusCode, definition, definitionFullyResolved, pathToDefinition)
The OpenAPI Response object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the
[OpenAPI Response Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#responseObject).


| Param | Type | Description |
| --- | --- | --- |
| operationObject | <code>[Operation](#module_sway.Operation)</code> | The `Operation` object |
| statusCode | <code>string</code> | The status code |
| definition | <code>object</code> | The response definition *(The raw response definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The response definition with all of its resolvable references resolved |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |

<a name="module_sway.Response+getExample"></a>

#### response.getExample([mimeType]) ⇒ <code>string</code>
Returns the response example for the mime-type.

**Kind**: instance method of <code>[Response](#module_sway.Response)</code>  
**Returns**: <code>string</code> - The response example as a string or `undefined` if the response code and/or mime-type is missing  

| Param | Type | Description |
| --- | --- | --- |
| [mimeType] | <code>string</code> | The mime type |

<a name="module_sway.Response+getSample"></a>

#### response.getSample() ⇒ <code>\*</code>
Returns a sample value.

**Kind**: instance method of <code>[Response](#module_sway.Response)</code>  
**Returns**: <code>\*</code> - The sample value for the response, which can be undefined if the response schema is not provided  
<a name="module_sway.Response+validateResponse"></a>

#### response.validateResponse(res, [options]) ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
Validates the response.

**Kind**: instance method of <code>[Response](#module_sway.Response)</code>  
**Returns**: <code>[ValidationResults](#module_sway.ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| res | <code>[ServerResponseWrapper](#module_sway.ServerResponseWrapper)</code> | The response or response like object |
| [options] | <code>[ResponseValidationOptions](#module_sway.ResponseValidationOptions)</code> | The validation options |

<a name="module_sway.ResponseValidationFunction"></a>

### sway.ResponseValidationFunction ⇒ <code>[ValidationResults](#module_sway.ValidationResults)</code>
Response validation function.

**Kind**: static typedef of <code>[sway](#module_sway)</code>  
**Returns**: <code>[ValidationResults](#module_sway.ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | The http client request *(or equivalent)* |
| op | <code>[Operation](#module_sway.Operation)</code> | The `Operation` object for the request |

<a name="module_sway.ResponseValidationOptions"></a>

### sway.ResponseValidationOptions : <code>object</code>
Response validation options.

**Kind**: static typedef of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| strictMode | <code>boolean</code> &#124; <code>object</code> | <code>false</code> | Enablement of strict mode validation.  If `strictMode` is a `boolean` and is `true`, all form fields, headers and query parameters **must** be defined in the OpenAPI definition for this operation.  If `strictMode` is an `object`, the keys correspond to the `in` property values of the [OpenAPI Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject) and its value is a `boolean` that when `true` turns on strict mode validation for the request location matching the key.  Valid keys are `header`.  _(`body`, `query` and `path` are not necessary since `body` strict mode is possible via its schema and `path`, `query` do not matter for responses.)_ |
| customValidators | <code>[RequestValidationFunction](#module_sway.RequestValidationFunction)</code> |  | The custom validators |

<a name="module_sway.ServerResponseWrapper"></a>

### sway.ServerResponseWrapper : <code>object</code>
Server response wrapper.

Since the low level `http.ServerResponse` object is not always guaranteed and even if it is, there is no public way
to gather the necessary parts of the response to perform validation, this object encapsulates the required response
information to perform response validation.

**Kind**: static typedef of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| body | <code>\*</code> |  | The response body |
| encoding | <code>string</code> |  | The encoding of the body when the body is a `Buffer` |
| headers | <code>object</code> |  | The response headers |
| statusCode | <code>number</code> &#124; <code>string</code> | <code>default</code> | The response status code |

<a name="module_sway.ValidationEntry"></a>

### sway.ValidationEntry : <code>object</code>
Validation error/warning object.

When this object is created as a result of JSON Schema validation, this object is created by
[z-schema](https://github.com/zaggino/z-schema) and it owns the structure so there can be extra properties not
documented below.

**Kind**: static typedef of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| code | <code>string</code> | The code used to identify the error/warning |
| error | <code>string</code> | Whenever there is an upstream `Error` encountered, its message is here |
| errors | <code>[Array.&lt;ValidationEntry&gt;](#module_sway.ValidationEntry)</code> | The nested error(s) encountered during validation |
| lineage | <code>Array.&lt;string&gt;</code> | Contains the composition lineage for circular composition errors |
| message | <code>string</code> | The human readable description of the error/warning |
| name | <code>string</code> | The header name for header validation errors |
| params | <code>array</code> | The parameters used when validation failed *(This is a z-schema construct and is only set for JSON Schema validation errors.)* |
| path | <code>Array.&lt;string&gt;</code> | The path to the location in the document where the error/warning occurred |
| schemaId | <code>string</code> | The schema id *(This is a z-schema construct and is only set for JSON Schema validation errors and when its value is not `undefined`.) |

<a name="module_sway.ValidationResults"></a>

### sway.ValidationResults : <code>object</code>
Validation results object.

**Kind**: static typedef of <code>[sway](#module_sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| errors | <code>[Array.&lt;ValidationEntry&gt;](#module_sway.ValidationEntry)</code> | The validation errors |
| warnings | <code>[Array.&lt;ValidationEntry&gt;](#module_sway.ValidationEntry)</code> | The validation warnings |

<a name="module_sway.create"></a>

### sway.create(options) ⇒ <code>[Promise.&lt;ApiDefinition&gt;](#module_sway.ApiDefinition)</code>
Creates an ApiDefinition object from the provided OpenAPI definition.

**Kind**: static method of <code>[sway](#module_sway)</code>  
**Returns**: <code>[Promise.&lt;ApiDefinition&gt;](#module_sway.ApiDefinition)</code> - The promise  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>[CreateOptions](#module_sway.CreateOptions)</code> | The options for loading the definition(s) |

**Example**  
```js
Sway.create({
  definition: 'https://github.com/OAI/OpenAPI-Specification/blob/master/examples/v3.0/petstore.yaml'
})
.then(function (apiDefinition) {
  console.log('Documentation URL: ', apiDefinition.documentationUrl);
}, function (err) {
  console.error(err.stack);
});
```
