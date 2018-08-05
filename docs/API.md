## Classes

<dl>
<dt><a href="#Operation">Operation</a></dt>
<dd></dd>
<dt><a href="#Parameter">Parameter</a></dt>
<dd></dd>
<dt><a href="#ParameterValue">ParameterValue</a></dt>
<dd></dd>
<dt><a href="#Path">Path</a></dt>
<dd></dd>
<dt><a href="#Response">Response</a></dt>
<dd></dd>
<dt><a href="#SwaggerApi">SwaggerApi</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#create">create(options)</a> ⇒ <code>Promise</code></dt>
<dd><p>Creates a SwaggerApi object from its Swagger definition(s).</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#CreateOptions">CreateOptions</a> : <code>object</code></dt>
<dd><p>Options used when creating the <code>SwaggerApi</code>.</p>
</dd>
<dt><a href="#DocumentValidationFunction">DocumentValidationFunction</a> ⇒ <code><a href="#ValidationResults">ValidationResults</a></code></dt>
<dd><p>Function used for custom validation of Swagger documents</p>
</dd>
<dt><a href="#RequestValidationFunction">RequestValidationFunction</a> ⇒ <code><a href="#ValidationResults">ValidationResults</a></code></dt>
<dd><p>Request validation function.</p>
</dd>
<dt><a href="#RequestValidationOptions">RequestValidationOptions</a> : <code>object</code></dt>
<dd><p>Request validation options.</p>
</dd>
<dt><a href="#ResponseValidationFunction">ResponseValidationFunction</a> ⇒ <code><a href="#ValidationResults">ValidationResults</a></code></dt>
<dd><p>Response validation function.</p>
</dd>
<dt><a href="#ResponseValidationOptions">ResponseValidationOptions</a> : <code>object</code></dt>
<dd><p>Response validation options.</p>
</dd>
<dt><a href="#ServerResponseWrapper">ServerResponseWrapper</a> : <code>object</code></dt>
<dd><p>Server response wrapper.</p>
<p>Since the low level <code>http.ServerResponse</code> object is not always guaranteed and even if it is, there is no public way
to gather the necessary parts of the response to perform validation, this object encapsulates the required response
information to perform response validation.</p>
</dd>
<dt><a href="#ValidationEntry">ValidationEntry</a> : <code>object</code></dt>
<dd><p>Validation error/warning object.</p>
<p>When this object is created as a result of JSON Schema validation, this object is created by
<a href="https://github.com/zaggino/z-schema">z-schema</a> and it owns the structure so there can be extra properties not
documented below.</p>
</dd>
<dt><a href="#ValidationResults">ValidationResults</a> : <code>object</code></dt>
<dd><p>Validation results object.</p>
</dd>
</dl>

<a name="CreateOptions"></a>

## CreateOptions : <code>object</code>
Options used when creating the `SwaggerApi`.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> &#124; <code>string</code> | The Swagger definition location or structure |
| jsonRefs | <code>object</code> | *(See [JsonRefs~JsonRefsOptions](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..JsonRefsOptions))* |
| customFormats | <code>object</code> | The key/value pair of custom formats *(The keys are the format name and the values are async functions.  See [ZSchema Custom Formats](https://github.com/zaggino/z-schema#register-a-custom-format))* |
| customFormatGenerators | <code>object</code> | The key/value pair of custom format generators *(The keys are the format name and the values are functions.  See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))* |
| customValidators | <code>[Array.&lt;DocumentValidationFunction&gt;](#DocumentValidationFunction)</code> | The custom validators |

<a name="DocumentValidationFunction"></a>

## DocumentValidationFunction ⇒ <code>[ValidationResults](#ValidationResults)</code>
Function used for custom validation of Swagger documents

**Kind**: global typedef  
**Returns**: <code>[ValidationResults](#ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| api | <code>[SwaggerApi](#SwaggerApi)</code> | The Swagger API object |

<a name="Operation"></a>

## Operation
**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The operation definition *(The raw operation definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The operation definition with all of its resolvable references resolved |
| method | <code>string</code> | The HTTP method for this operation |
| pathObject | <code>[Path](#Path)</code> | The `Path` object |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the operation definition |
| parameterObjects | <code>[Array.&lt;Parameter&gt;](#Parameter)</code> | The `Parameter` objects |
| ptr | <code>string</code> | The JSON Pointer to the operation |
| securityDefinitions | <code>object</code> | The security definitions used by this operation |


* [Operation](#Operation)
    * [new Operation(pathObject, method, definition, definitionFullyResolved, pathToDefinition)](#new_Operation_new)
    * [.getParameter(name, [location])](#Operation+getParameter) ⇒ <code>[Parameter](#Parameter)</code>
    * [.getParameters()](#Operation+getParameters) ⇒ <code>[Array.&lt;Parameter&gt;](#Parameter)</code>
    * [.getResponse([statusCode])](#Operation+getResponse) ⇒ <code>[Response](#Response)</code>
    * [.getResponses()](#Operation+getResponses) ⇒ <code>[Array.&lt;Response&gt;](#Response)</code>
    * [.getSecurity()](#Operation+getSecurity) ⇒ <code>Array.&lt;object&gt;</code>
    * [.validateRequest(req, [options])](#Operation+validateRequest) ⇒ <code>[ValidationResults](#ValidationResults)</code>
    * [.validateResponse(res, [options])](#Operation+validateResponse) ⇒ <code>[ValidationResults](#ValidationResults)</code>

<a name="new_Operation_new"></a>

### new Operation(pathObject, method, definition, definitionFullyResolved, pathToDefinition)
The Swagger Operation object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
                      object.


| Param | Type | Description |
| --- | --- | --- |
| pathObject | <code>[Path](#Path)</code> | The Path object |
| method | <code>string</code> | The operation method |
| definition | <code>object</code> | The operation definition *(The raw operation definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The operation definition with all of its resolvable references resolved |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the operation definition |

<a name="Operation+getParameter"></a>

### operation.getParameter(name, [location]) ⇒ <code>[Parameter](#Parameter)</code>
Returns the parameter with the provided name and location when provided.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>[Parameter](#Parameter)</code> - The `Parameter` matching the location and name combination or `undefined` if there
is no match  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the parameter |
| [location] | <code>string</code> | The location *(`in`)* of the parameter *(Used for disambiguation)* |

<a name="Operation+getParameters"></a>

### operation.getParameters() ⇒ <code>[Array.&lt;Parameter&gt;](#Parameter)</code>
Returns all parameters for the operation.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>[Array.&lt;Parameter&gt;](#Parameter)</code> - All `Parameter` objects for the operation  
<a name="Operation+getResponse"></a>

### operation.getResponse([statusCode]) ⇒ <code>[Response](#Response)</code>
Returns the response for the requested status code or the default response *(if available)* if none is provided.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>[Response](#Response)</code> - The `Response` or `undefined` if one cannot be found  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [statusCode] | <code>number</code> &#124; <code>string</code> | <code>&#x27;default&#x27;</code> | The status code |

<a name="Operation+getResponses"></a>

### operation.getResponses() ⇒ <code>[Array.&lt;Response&gt;](#Response)</code>
Returns all responses for the operation.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>[Array.&lt;Response&gt;](#Response)</code> - All `Response` objects for the operation  
<a name="Operation+getSecurity"></a>

### operation.getSecurity() ⇒ <code>Array.&lt;object&gt;</code>
Returns the composite security definitions for this operation.

The difference between this API and `this.security` is that `this.security` is the raw `security` value for the
operation where as this API will return the global `security` value when available and this operation's security
is undefined.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>Array.&lt;object&gt;</code> - The security for this operation  
<a name="Operation+validateRequest"></a>

### operation.validateRequest(req, [options]) ⇒ <code>[ValidationResults](#ValidationResults)</code>
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

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>[ValidationResults](#ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | The http client request *(or equivalent)* |
| [options] | <code>[RequestValidationOptions](#RequestValidationOptions)</code> | The validation options |

<a name="Operation+validateResponse"></a>

### operation.validateResponse(res, [options]) ⇒ <code>[ValidationResults](#ValidationResults)</code>
Validates the response.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>[ValidationResults](#ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| res | <code>[ServerResponseWrapper](#ServerResponseWrapper)</code> | The response or response like object |
| [options] | <code>[ResponseValidationOptions](#ResponseValidationOptions)</code> | The validation options |

<a name="Parameter"></a>

## Parameter
**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The parameter definition *(The raw parameter definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The parameter definition with all of its resolvable references resolved |
| operationObject | <code>[Operation](#Operation)</code> | The `Operation` object the parameter belongs to *(Can be `undefined` for path-level parameters)* |
| pathObject | <code>[Path](#Path)</code> | The `Path` object the parameter belongs to |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the parameter definition |
| ptr | <code>string</code> | The JSON Pointer to the parameter definition |
| schema | <code>object</code> | The JSON Schema for the parameter *(For non-body parameters, this is a computed value)* |


* [Parameter](#Parameter)
    * [new Parameter(opOrPathObject, definition, definitionFullyResolved, pathToDefinition)](#new_Parameter_new)
    * [.getSample()](#Parameter+getSample) ⇒ <code>\*</code>
    * [.getValue(req)](#Parameter+getValue) ⇒ <code>[ParameterValue](#ParameterValue)</code>

<a name="new_Parameter_new"></a>

### new Parameter(opOrPathObject, definition, definitionFullyResolved, pathToDefinition)
The Swagger Parameter object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
object.


| Param | Type | Description |
| --- | --- | --- |
| opOrPathObject | <code>[Operation](#Operation)</code> &#124; <code>[Path](#Path)</code> | The `Operation` or `Path` object |
| definition | <code>object</code> | The parameter definition *(The raw parameter definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The parameter definition with all of its resolvable references resolved |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the parameter definition |

<a name="Parameter+getSample"></a>

### parameter.getSample() ⇒ <code>\*</code>
Returns a sample value for the parameter based on its schema;

**Kind**: instance method of <code>[Parameter](#Parameter)</code>  
**Returns**: <code>\*</code> - The sample value  
<a name="Parameter+getValue"></a>

### parameter.getValue(req) ⇒ <code>[ParameterValue](#ParameterValue)</code>
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

**Kind**: instance method of <code>[Parameter](#Parameter)</code>  
**Returns**: <code>[ParameterValue](#ParameterValue)</code> - The parameter value object  
**Throws**:

- <code>Error</code> If the `in` value of the parameter's schema is not valid or if the `req` property to retrieve the
parameter is missing


| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | The http client request *(or equivalent)* |

<a name="ParameterValue"></a>

## ParameterValue
**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | The error(s) encountered during processing/validating the parameter value |
| parameterObject | <code>[Parameter](#Parameter)</code> | The `Parameter` object |
| raw | <code>\*</code> | The original parameter value *(Does not take default values into account)* |
| valid | <code>boolean</code> | Whether or not this parameter is valid based on its JSON Schema |
| value | <code>\*</code> | The processed value *(Takes default values into account and does type coercion when necessary and possible)*.  This can the original value in the event that processing the value is impossible *(missing schema type)* or `undefined` if processing the value failed *(invalid types, etc.)*. |

<a name="new_ParameterValue_new"></a>

### new ParameterValue(parameterObject, raw)
Object representing a parameter value.

**Note:** Do not use directly.


| Param | Type | Description |
| --- | --- | --- |
| parameterObject | <code>[Parameter](#Parameter)</code> | The `Parameter` object |
| raw | <code>\*</code> | The original/raw value |

<a name="Path"></a>

## Path
**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| api | <code>[SwaggerApi](#SwaggerApi)</code> | The `SwaggerApi` object |
| definition | <code>object</code> | The path definition *(The raw path definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The path definition with all of its resolvable references resolved |
| operationObjects | <code>[Array.&lt;Operation&gt;](#Operation)</code> | The `Operation` objects |
| parameterObjects | <code>[Array.&lt;Parameter&gt;](#Parameter)</code> | The path-level `Parameter` objects |
| path | <code>string</code> | The path string |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |
| ptr | <code>ptr</code> | The JSON Pointer to the path |
| regexp | <code>regexp</code> | The `RegExp` used to match request paths against this path |


* [Path](#Path)
    * [new Path(api, path, definition, definitionFullyResolved, pathToDefinition)](#new_Path_new)
    * [.getOperation(idOrMethod)](#Path+getOperation) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
    * [.getOperations()](#Path+getOperations) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
    * [.getOperationsByTag(tag)](#Path+getOperationsByTag) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
    * [.getParameters()](#Path+getParameters) ⇒ <code>[Array.&lt;Parameter&gt;](#Parameter)</code>

<a name="new_Path_new"></a>

### new Path(api, path, definition, definitionFullyResolved, pathToDefinition)
The Path object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the
                      definition object.


| Param | Type | Description |
| --- | --- | --- |
| api | <code>[SwaggerApi](#SwaggerApi)</code> | The `SwaggerApi` object |
| path | <code>string</code> | The path string |
| definition | <code>object</code> | The path definition *(The raw path definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The path definition with all of its resolvable references resolved |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |

<a name="Path+getOperation"></a>

### path.getOperation(idOrMethod) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
Return the operation for this path and operation id or method.

**Kind**: instance method of <code>[Path](#Path)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#Operation)</code> - The `Operation` objects for this path and method or `undefined` if there is no
operation for the provided method  

| Param | Type | Description |
| --- | --- | --- |
| idOrMethod | <code>string</code> | The operation id or method |

<a name="Path+getOperations"></a>

### path.getOperations() ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
Return the operations for this path.

**Kind**: instance method of <code>[Path](#Path)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#Operation)</code> - The `Operation` objects for this path  
<a name="Path+getOperationsByTag"></a>

### path.getOperationsByTag(tag) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
Return the operations for this path and tag.

**Kind**: instance method of <code>[Path](#Path)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#Operation)</code> - The `Operation` objects for this path and tag  

| Param | Type | Description |
| --- | --- | --- |
| tag | <code>string</code> | The tag |

<a name="Path+getParameters"></a>

### path.getParameters() ⇒ <code>[Array.&lt;Parameter&gt;](#Parameter)</code>
Return the parameters for this path.

**Kind**: instance method of <code>[Path](#Path)</code>  
**Returns**: <code>[Array.&lt;Parameter&gt;](#Parameter)</code> - The `Parameter` objects for this path  
<a name="RequestValidationFunction"></a>

## RequestValidationFunction ⇒ <code>[ValidationResults](#ValidationResults)</code>
Request validation function.

**Kind**: global typedef  
**Returns**: <code>[ValidationResults](#ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| res | <code>[ServerResponseWrapper](#ServerResponseWrapper)</code> | The response or response like object |
| def | <code>[Response](#Response)</code> | The `Response` definition _(useful primarily when calling `Operation#validateResponse` as `Response#validateResponse` the caller should have access to the `Response` object already.)_ |

<a name="RequestValidationOptions"></a>

## RequestValidationOptions : <code>object</code>
Request validation options.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| strictMode | <code>boolean</code> &#124; <code>object</code> | <code>false</code> | Enablement of strict mode validation.  If `strictMode` is a `boolean` and is `true`, all form fields, headers and query parameters **must** be defined in the Swagger document for this operation.  If `strictMode` is an `object`, the keys correspond to the `in` property values of the [Swagger Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject) and its value is a `boolean` that when `true` turns on strict mode validation for the request location matching the key.  Valid keys are `formData`, `header` and `query`.  _(`body` and `path` are not necessary since `body` strict mode is possible via its schema and `path` is **always** required.)_ |
| customValidators | <code>[RequestValidationFunction](#RequestValidationFunction)</code> |  | The custom validators |

<a name="Response"></a>

## Response
**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The response definition *(The raw responsedefinition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The response definition with all of its resolvable references resolved |
| operationObject | <code>[Operation](#Operation)</code> | The Operation object |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |
| ptr | <code>string</code> | The JSON Pointer to the response definition |
| statusCode | <code>string</code> | The status code |


* [Response](#Response)
    * [new Response(operationObject, statusCode, definition, definitionFullyResolved, pathToDefinition)](#new_Response_new)
    * [.getExample([mimeType])](#Response+getExample) ⇒ <code>string</code>
    * [.getSample()](#Response+getSample) ⇒ <code>\*</code>
    * [.validateResponse(res, [options])](#Response+validateResponse) ⇒ <code>[ValidationResults](#ValidationResults)</code>

<a name="new_Response_new"></a>

### new Response(operationObject, statusCode, definition, definitionFullyResolved, pathToDefinition)
The Swagger Response object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the
                      definition object.


| Param | Type | Description |
| --- | --- | --- |
| operationObject | <code>[Operation](#Operation)</code> | The `Operation` object |
| statusCode | <code>string</code> | The status code |
| definition | <code>object</code> | The response definition *(The raw response definition __after__ remote references were resolved)* |
| definitionFullyResolved | <code>object</code> | The response definition with all of its resolvable references resolved |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |

<a name="Response+getExample"></a>

### response.getExample([mimeType]) ⇒ <code>string</code>
Returns the response example for the mime-type.

**Kind**: instance method of <code>[Response](#Response)</code>  
**Returns**: <code>string</code> - The response example as a string or `undefined` if the response code and/or mime-type is missing  

| Param | Type | Description |
| --- | --- | --- |
| [mimeType] | <code>string</code> | The mime type |

<a name="Response+getSample"></a>

### response.getSample() ⇒ <code>\*</code>
Returns a sample value.

**Kind**: instance method of <code>[Response](#Response)</code>  
**Returns**: <code>\*</code> - The sample value for the response, which can be undefined if the response schema is not provided  
<a name="Response+validateResponse"></a>

### response.validateResponse(res, [options]) ⇒ <code>[ValidationResults](#ValidationResults)</code>
Validates the response.

**Kind**: instance method of <code>[Response](#Response)</code>  
**Returns**: <code>[ValidationResults](#ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| res | <code>[ServerResponseWrapper](#ServerResponseWrapper)</code> | The response or response like object |
| [options] | <code>[ResponseValidationOptions](#ResponseValidationOptions)</code> | The validation options |

<a name="ResponseValidationFunction"></a>

## ResponseValidationFunction ⇒ <code>[ValidationResults](#ValidationResults)</code>
Response validation function.

**Kind**: global typedef  
**Returns**: <code>[ValidationResults](#ValidationResults)</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | The http client request *(or equivalent)* |
| op | <code>[Operation](#Operation)</code> | The `Operation` object for the request |

<a name="ResponseValidationOptions"></a>

## ResponseValidationOptions : <code>object</code>
Response validation options.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| strictMode | <code>boolean</code> &#124; <code>object</code> | <code>false</code> | Enablement of strict mode validation.  If `strictMode` is a `boolean` and is `true`, all form fields, headers and query parameters **must** be defined in the Swagger document for this operation.  If `strictMode` is an `object`, the keys correspond to the `in` property values of the [Swagger Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject) and its value is a `boolean` that when `true` turns on strict mode validation for the request location matching the key.  Valid keys are `header`.  _(`body`, `query` and `path` are not necessary since `body` strict mode is possible via its schema and `path`, `query` do not matter for responses.)_ |
| customValidators | <code>[RequestValidationFunction](#RequestValidationFunction)</code> |  | The custom validators |

<a name="ServerResponseWrapper"></a>

## ServerResponseWrapper : <code>object</code>
Server response wrapper.

Since the low level `http.ServerResponse` object is not always guaranteed and even if it is, there is no public way
to gather the necessary parts of the response to perform validation, this object encapsulates the required response
information to perform response validation.

**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| body | <code>\*</code> |  | The response body |
| encoding | <code>string</code> |  | The encoding of the body when the body is a `Buffer` |
| headers | <code>object</code> |  | The response headers |
| statusCode | <code>number</code> &#124; <code>string</code> | <code>default</code> | The response status code |

<a name="SwaggerApi"></a>

## SwaggerApi
**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| customFormats | <code>object</code> | The key/value pair of custom formats *(The keys are the format name and the values are async functions.  See [ZSchema Custom Formats](https://github.com/zaggino/z-schema#register-a-custom-format))* |
| customFormatGenerators | <code>object</code> | The key/value pair of custom format generators *(The keys are the format name and the values are functions.  See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))* |
| customValidators | <code>[Array.&lt;DocumentValidationFunction&gt;](#DocumentValidationFunction)</code> | The array of custom validators |
| definition | <code>object</code> | The original Swagger definition |
| definitionRemotesResolved | <code>object</code> | The Swagger definition with only its remote references resolved *(This means all references to external/remote documents are replaced with its dereferenced value but all local references are left unresolved.)* |
| definitionFullyResolved | <code>object</code> | The Swagger definition with all of its resolvable references resolved *(This means that all resolvable references are replaced with their dereferenced value.)* |
| documentationUrl | <code>string</code> | The URL to the Swagger documentation |
| pathObjects | <code>[Array.&lt;Path&gt;](#Path)</code> | The unique `Path` objects |
| options | <code>object</code> | The options passed to the constructor |
| references | <code>object</code> | The reference metadata *(See [JsonRefs~ResolvedRefDetails](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..ResolvedRefDetails))* |
| version | <code>string</code> | The Swagger API version |


* [SwaggerApi](#SwaggerApi)
    * [new SwaggerApi(definition, definitionRemotesResolved, definitionFullyResolved, references, options)](#new_SwaggerApi_new)
    * [.getOperation(idOrPathOrReq, [method])](#SwaggerApi+getOperation) ⇒ <code>[Operation](#Operation)</code>
    * [.getOperations([path])](#SwaggerApi+getOperations) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
    * [.getOperationsByTag([tag])](#SwaggerApi+getOperationsByTag) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
    * [.getPath(pathOrReq)](#SwaggerApi+getPath) ⇒ <code>[Path](#Path)</code>
    * [.getPaths()](#SwaggerApi+getPaths) ⇒ <code>[Array.&lt;Path&gt;](#Path)</code>
    * [.registerFormat(name, validator)](#SwaggerApi+registerFormat)
    * [.registerFormatGenerator(name, formatGenerator)](#SwaggerApi+registerFormatGenerator)
    * [.registerValidator(validator)](#SwaggerApi+registerValidator)
    * [.unregisterFormat(name)](#SwaggerApi+unregisterFormat)
    * [.unregisterFormatGenerator(name)](#SwaggerApi+unregisterFormatGenerator)
    * [.validate()](#SwaggerApi+validate) ⇒ <code>[ValidationResults](#ValidationResults)</code>

<a name="new_SwaggerApi_new"></a>

### new SwaggerApi(definition, definitionRemotesResolved, definitionFullyResolved, references, options)
The Swagger API object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
                      object.


| Param | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The original Swagger definition |
| definitionRemotesResolved | <code>object</code> | The Swagger definition with all of its remote references resolved |
| definitionFullyResolved | <code>object</code> | The Swagger definition with all of its references resolved |
| references | <code>object</code> | The location and resolution of the resolved references in the Swagger definition |
| options | <code>object</code> | The options passed to swaggerApi.create |

<a name="SwaggerApi+getOperation"></a>

### swaggerApi.getOperation(idOrPathOrReq, [method]) ⇒ <code>[Operation](#Operation)</code>
Returns the operation for the given path and operation.

**Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:

  * `method`
  * `originalUrl`
  * `url`

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  
**Returns**: <code>[Operation](#Operation)</code> - The `Operation` for the provided operation id, or path and method or `undefined` if
there is no operation for that operation id, or path and method combination  

| Param | Type | Description |
| --- | --- | --- |
| idOrPathOrReq | <code>string</code> &#124; <code>object</code> | The Swagger opeartion id, path string or the http client request *(or equivalent)* |
| [method] | <code>string</code> | The Swagger operation method _(not used when providing an operation id)_ |

<a name="SwaggerApi+getOperations"></a>

### swaggerApi.getOperations([path]) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
Returns all operations for the provided path or all operations in the API.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#Operation)</code> - All `Operation` objects for the provided path or all API operations  

| Param | Type | Description |
| --- | --- | --- |
| [path] | <code>string</code> | The Swagger path |

<a name="SwaggerApi+getOperationsByTag"></a>

### swaggerApi.getOperationsByTag([tag]) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
Returns all operations for the provided tag.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#Operation)</code> - All `Operation` objects for the provided tag  

| Param | Type | Description |
| --- | --- | --- |
| [tag] | <code>string</code> | The Swagger tag |

<a name="SwaggerApi+getPath"></a>

### swaggerApi.getPath(pathOrReq) ⇒ <code>[Path](#Path)</code>
Returns the path object for the given path or request.

**Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:

  * `originalUrl`
  * `url`

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  
**Returns**: <code>[Path](#Path)</code> - The corresponding `Path` object for the requested path or request  

| Param | Type | Description |
| --- | --- | --- |
| pathOrReq | <code>string</code> &#124; <code>object</code> | The Swagger path string or the http client request *(or equivalent)* |

<a name="SwaggerApi+getPaths"></a>

### swaggerApi.getPaths() ⇒ <code>[Array.&lt;Path&gt;](#Path)</code>
Returns all path objects for the Swagger API.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  
**Returns**: <code>[Array.&lt;Path&gt;](#Path)</code> - The `Path` objects  
<a name="SwaggerApi+registerFormat"></a>

### swaggerApi.registerFormat(name, validator)
Registers a custom format.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the format |
| validator | <code>function</code> | The format validator *(See [ZSchema Custom Format](https://github.com/zaggino/z-schema#register-a-custom-format))* |

<a name="SwaggerApi+registerFormatGenerator"></a>

### swaggerApi.registerFormatGenerator(name, formatGenerator)
Registers a custom format generator.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the format |
| formatGenerator | <code>function</code> | The format generator *(See [json-schema-mocker Custom Format](https://github.com/json-schema-faker/json-schema-faker#custom-formats))* |

<a name="SwaggerApi+registerValidator"></a>

### swaggerApi.registerValidator(validator)
Registers a custom validator.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  
**Throws**:

- <code>TypeError</code> If the validator is not a function


| Param | Type | Description |
| --- | --- | --- |
| validator | <code>[DocumentValidationFunction](#DocumentValidationFunction)</code> | The validator |

<a name="SwaggerApi+unregisterFormat"></a>

### swaggerApi.unregisterFormat(name)
Unregisters a custom format.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the format |

<a name="SwaggerApi+unregisterFormatGenerator"></a>

### swaggerApi.unregisterFormatGenerator(name)
Unregisters a custom format generator.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the format generator |

<a name="SwaggerApi+validate"></a>

### swaggerApi.validate() ⇒ <code>[ValidationResults](#ValidationResults)</code>
Performs validation of the Swagger API document(s).

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  
**Returns**: <code>[ValidationResults](#ValidationResults)</code> - The validation results  
<a name="ValidationEntry"></a>

## ValidationEntry : <code>object</code>
Validation error/warning object.

When this object is created as a result of JSON Schema validation, this object is created by
[z-schema](https://github.com/zaggino/z-schema) and it owns the structure so there can be extra properties not
documented below.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| code | <code>string</code> | The code used to identify the error/warning |
| error | <code>string</code> | Whenever there is an upstream `Error` encountered, its message is here |
| errors | <code>[Array.&lt;ValidationEntry&gt;](#ValidationEntry)</code> | The nested error(s) encountered during validation |
| lineage | <code>Array.&lt;string&gt;</code> | Contains the composition lineage for circular composition errors |
| message | <code>string</code> | The human readable description of the error/warning |
| name | <code>string</code> | The header name for header validation errors |
| params | <code>array</code> | The parameters used when validation failed *(This is a z-schema construct and is only set for JSON Schema validation errors.)* |
| path | <code>Array.&lt;string&gt;</code> | The path to the location in the document where the error/warning occurred |
| schemaId | <code>string</code> | The schema id *(This is a z-schema construct and is only set for JSON Schema validation errors and when its value is not `undefined`.) |

<a name="ValidationResults"></a>

## ValidationResults : <code>object</code>
Validation results object.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| errors | <code>[Array.&lt;ValidationEntry&gt;](#ValidationEntry)</code> | The validation errors |
| warnings | <code>[Array.&lt;ValidationEntry&gt;](#ValidationEntry)</code> | The validation warnings |

<a name="create"></a>

## create(options) ⇒ <code>Promise</code>
Creates a SwaggerApi object from its Swagger definition(s).

**Kind**: global function  
**Returns**: <code>Promise</code> - The promise  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>[CreateOptions](#CreateOptions)</code> | The options for loading the definition(s) |

**Example**  
```js
SwaggerApi.create({definition: 'http://petstore.swagger.io/v2/swagger.yaml'})
  .then(function (api) {
    console.log('Documentation URL: ', api.documentationUrl);
  }, function (err) {
    console.error(err.stack);
  });
```
