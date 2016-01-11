<a name="module_Sway"></a>
## Sway
A library for simpler [Swagger](http://swagger.io/) integrations.


* [Sway](#module_Sway)
    * _inner_
        * [~Operation](#module_Sway..Operation)
            * [new Operation(pathObject, method, definition, pathToDefinition)](#new_module_Sway..Operation_new)
            * [.getParameter(name, [location])](#module_Sway..Operation+getParameter) ⇒ <code>Parameter</code>
            * [.getParameters()](#module_Sway..Operation+getParameters) ⇒ <code>Array.&lt;Parameter&gt;</code>
            * [.getResponse([statusCode])](#module_Sway..Operation+getResponse) ⇒ <code>Response</code>
            * [.getResponses()](#module_Sway..Operation+getResponses) ⇒ <code>Array.&lt;Response&gt;</code>
            * [.validateRequest(req)](#module_Sway..Operation+validateRequest) ⇒ <code>ValidationResults</code>
            * [.validateResponse(res)](#module_Sway..Operation+validateResponse) ⇒ <code>ValidationResults</code>
        * [~Parameter](#module_Sway..Parameter)
            * [new Parameter(opOrPathObject, definition, pathToDefinition)](#new_module_Sway..Parameter_new)
            * [.getSample()](#module_Sway..Parameter+getSample) ⇒ <code>\*</code>
            * [.getSchema()](#module_Sway..Parameter+getSchema) ⇒ <code>object</code>
            * [.getValue(req)](#module_Sway..Parameter+getValue) ⇒ <code>ParameterValue</code>
        * [~ParameterValue](#module_Sway..ParameterValue)
            * [new ParameterValue(parameterObject, raw)](#new_module_Sway..ParameterValue_new)
        * [~Path](#module_Sway..Path)
            * [new Path(api, path, definition, pathToDefinition)](#new_module_Sway..Path_new)
            * [.getOperation(method)](#module_Sway..Path+getOperation) ⇒ <code>Array.&lt;Operation&gt;</code>
            * [.getOperations()](#module_Sway..Path+getOperations) ⇒ <code>Array.&lt;Operation&gt;</code>
            * [.getOperationsByTag(tag)](#module_Sway..Path+getOperationsByTag) ⇒ <code>Array.&lt;Operation&gt;</code>
            * [.getParameters()](#module_Sway..Path+getParameters) ⇒ <code>Array.&lt;Parameter&gt;</code>
        * [~Response](#module_Sway..Response)
            * [new Response(operationObject, statusCode, definition, pathToDefinition)](#new_module_Sway..Response_new)
            * [.getExample([mimeType])](#module_Sway..Response+getExample) ⇒ <code>string</code>
            * [.getSample()](#module_Sway..Response+getSample) ⇒ <code>\*</code>
            * [.validateResponse(res)](#module_Sway..Response+validateResponse) ⇒ <code>ValidationResults</code>
        * [~ServerResponseWrapper](#module_Sway..ServerResponseWrapper) : <code>object</code>
        * [~SwaggerApi](#module_Sway..SwaggerApi)
            * [new SwaggerApi(definition, definitionRemotesResolved, definitionAllResolved, references, options)](#new_module_Sway..SwaggerApi_new)
            * [.getOperation(pathOrReq, [method])](#module_Sway..SwaggerApi+getOperation) ⇒ <code>Operation</code>
            * [.getOperations([path])](#module_Sway..SwaggerApi+getOperations) ⇒ <code>Array.&lt;Operation&gt;</code>
            * [.getOperationsByTag([tag])](#module_Sway..SwaggerApi+getOperationsByTag) ⇒ <code>Array.&lt;Operation&gt;</code>
            * [.getPath(pathOrReq)](#module_Sway..SwaggerApi+getPath) ⇒ <code>Path</code>
            * [.getPaths()](#module_Sway..SwaggerApi+getPaths) ⇒ <code>Array.&lt;Path&gt;</code>
            * [.registerValidator(validator)](#module_Sway..SwaggerApi+registerValidator)
            * [.validate()](#module_Sway..SwaggerApi+validate) ⇒ <code>ValidationResults</code>
        * [~ValidationEntry](#module_Sway..ValidationEntry) : <code>object</code>
        * [~ValidationResults](#module_Sway..ValidationResults) : <code>object</code>
        * [~ValidatorCallback](#module_Sway..ValidatorCallback) ⇒ <code>ValidationResults</code>
    * _static_
        * [.create(options)](#module_Sway.create) ⇒ <code>Promise</code>

<a name="module_Sway..Operation"></a>
### Sway~Operation
**Kind**: inner class of <code>[Sway](#module_Sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The operation definition |
| method | <code>string</code> | The HTTP method for this operation |
| pathObject | <code>Path</code> | The Path object |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the operation definition |
| parameterObjects | <code>Array.&lt;Parameter&gt;</code> | The Parameter objects |
| ptr | <code>string</code> | The JSON Pointer to the operation |
| securityDefinitions | <code>object</code> | The security definitions used by this operation |


* [~Operation](#module_Sway..Operation)
    * [new Operation(pathObject, method, definition, pathToDefinition)](#new_module_Sway..Operation_new)
    * [.getParameter(name, [location])](#module_Sway..Operation+getParameter) ⇒ <code>Parameter</code>
    * [.getParameters()](#module_Sway..Operation+getParameters) ⇒ <code>Array.&lt;Parameter&gt;</code>
    * [.getResponse([statusCode])](#module_Sway..Operation+getResponse) ⇒ <code>Response</code>
    * [.getResponses()](#module_Sway..Operation+getResponses) ⇒ <code>Array.&lt;Response&gt;</code>
    * [.validateRequest(req)](#module_Sway..Operation+validateRequest) ⇒ <code>ValidationResults</code>
    * [.validateResponse(res)](#module_Sway..Operation+validateResponse) ⇒ <code>ValidationResults</code>

<a name="new_module_Sway..Operation_new"></a>
#### new Operation(pathObject, method, definition, pathToDefinition)
The Swagger Operation object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
                      object.


| Param | Type | Description |
| --- | --- | --- |
| pathObject | <code>Path</code> | The Path object |
| method | <code>string</code> | The operation method |
| definition | <code>object</code> | The operation definition |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the operation definition |

<a name="module_Sway..Operation+getParameter"></a>
#### operation.getParameter(name, [location]) ⇒ <code>Parameter</code>
Returns the parameter with the provided name and location when provided.

**Kind**: instance method of <code>[Operation](#module_Sway..Operation)</code>  
**Returns**: <code>Parameter</code> - The parameter matching the location and name combination or `undefined` if there is no match.  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the parameter |
| [location] | <code>string</code> | The location *(`in`)* of the parameter *(Used for disambiguation)* |

<a name="module_Sway..Operation+getParameters"></a>
#### operation.getParameters() ⇒ <code>Array.&lt;Parameter&gt;</code>
Returns all parameters for the operation.

**Kind**: instance method of <code>[Operation](#module_Sway..Operation)</code>  
**Returns**: <code>Array.&lt;Parameter&gt;</code> - All parameters for the operation.  
<a name="module_Sway..Operation+getResponse"></a>
#### operation.getResponse([statusCode]) ⇒ <code>Response</code>
Returns the response for the requested status code or the default response *(if available)* if none is provided.

**Kind**: instance method of <code>[Operation](#module_Sway..Operation)</code>  
**Returns**: <code>Response</code> - The response or undefined if one cannot be found  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [statusCode] | <code>number</code> &#124; <code>string</code> | <code>&#x27;default&#x27;</code> | The status code |

<a name="module_Sway..Operation+getResponses"></a>
#### operation.getResponses() ⇒ <code>Array.&lt;Response&gt;</code>
Returns all responses for the operation.

**Kind**: instance method of <code>[Operation](#module_Sway..Operation)</code>  
**Returns**: <code>Array.&lt;Response&gt;</code> - All responses for the operation.  
<a name="module_Sway..Operation+validateRequest"></a>
#### operation.validateRequest(req) ⇒ <code>ValidationResults</code>
Validates the request.

**Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:

  * `body`: Used for `body` and `formData` parameters
  * `files`: Used for `formData` parameters whose `type` is `file`
  * `headers`: Used for `header` parameters and consumes
  * `query`: Used for `query` parameters
  * `url`: used for `path` parameters

For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the `url`
property.

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[Operation](#module_Sway..Operation)</code>  
**Returns**: <code>ValidationResults</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | The http client request *(or equivalent)* |

<a name="module_Sway..Operation+validateResponse"></a>
#### operation.validateResponse(res) ⇒ <code>ValidationResults</code>
Validates the response.

**Kind**: instance method of <code>[Operation](#module_Sway..Operation)</code>  
**Returns**: <code>ValidationResults</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| res | <code>ServerResponseWrapper</code> | The response or response like object |

<a name="module_Sway..Parameter"></a>
### Sway~Parameter
**Kind**: inner class of <code>[Sway](#module_Sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| computedSchema | <code>object</code> | The computed JSON Schema for the parameter |
| definition | <code>object</code> | The parameter definition |
| operationObject | <code>Operation</code> | The `Operation` object the parameter belongs to *(Can be undefined for path-level parameters)* |
| pathObject | <code>Path</code> | The `Path` object the parameter belongs t |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the parameter definition |
| ptr | <code>string</code> | The JSON Pointer to the parameter definition |


* [~Parameter](#module_Sway..Parameter)
    * [new Parameter(opOrPathObject, definition, pathToDefinition)](#new_module_Sway..Parameter_new)
    * [.getSample()](#module_Sway..Parameter+getSample) ⇒ <code>\*</code>
    * [.getSchema()](#module_Sway..Parameter+getSchema) ⇒ <code>object</code>
    * [.getValue(req)](#module_Sway..Parameter+getValue) ⇒ <code>ParameterValue</code>

<a name="new_module_Sway..Parameter_new"></a>
#### new Parameter(opOrPathObject, definition, pathToDefinition)
The Swagger Parameter object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
object.


| Param | Type | Description |
| --- | --- | --- |
| opOrPathObject | <code>Operation</code> &#124; <code>Path</code> | The `Operation` or `Path` object |
| definition | <code>object</code> | The parameter definition |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the parameter definition |

<a name="module_Sway..Parameter+getSample"></a>
#### parameter.getSample() ⇒ <code>\*</code>
Returns a sample value for the parameter based on its schema;

**Kind**: instance method of <code>[Parameter](#module_Sway..Parameter)</code>  
**Returns**: <code>\*</code> - The sample value  
<a name="module_Sway..Parameter+getSchema"></a>
#### parameter.getSchema() ⇒ <code>object</code>
Returns the computed JSON Schema for this parameter object.

**Kind**: instance method of <code>[Parameter](#module_Sway..Parameter)</code>  
**Returns**: <code>object</code> - The JSON Schema  
<a name="module_Sway..Parameter+getValue"></a>
#### parameter.getValue(req) ⇒ <code>ParameterValue</code>
Returns the parameter value from the request.

**Note:** Below is the list of `req` properties used *(req should be an `http.ClientRequest` or equivalent)*:

  * `body`: Used for `body` and `formData` parameters
  * `files`: Used for `formData` parameters whose `type` is `file`
  * `headers`: Used for `header` parameters
  * `query`: Used for `query` parameters
  * `url`: used for `path` parameters

For `path` parameters, we will use the operation's `regexp` property to parse out path parameters using the `url`
property.

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[Parameter](#module_Sway..Parameter)</code>  
**Returns**: <code>ParameterValue</code> - The parameter value object  
**Throws**:

- <code>Error</code> If the `in` value of the parameter's schema is not valid or if the `req` property to retrieve the
                parameter is missing.


| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | The http client request *(or equivalent)* |

<a name="module_Sway..ParameterValue"></a>
### Sway~ParameterValue
**Kind**: inner class of <code>[Sway](#module_Sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | The error(s) encountered during processing/validating the parameter value |
| parameterObject | <code>Parameter</code> | The Parameter object |
| raw | <code>\*</code> | The original parameter value *(Does not take default values into account)* |
| valid | <code>boolean</code> | Whether or not this parameter is valid based on its JSON Schema |
| value | <code>\*</code> | The processed value *(Takes default values into account and does type coercion when necessary                       and possible)*.  This can the original value in the event that processing the value is                       impossible *(missing schema type)* or `undefined` if processing the value failed *(invalid                       types, etc.)*. |

<a name="new_module_Sway..ParameterValue_new"></a>
#### new ParameterValue(parameterObject, raw)
Object representing a parameter value.

**Note:** Do not use directly.


| Param | Type | Description |
| --- | --- | --- |
| parameterObject | <code>Parameter</code> | The Parameter Object |
| raw | <code>\*</code> | The original/raw value |

<a name="module_Sway..Path"></a>
### Sway~Path
**Kind**: inner class of <code>[Sway](#module_Sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| api | <code>SwaggerApi</code> | The Swagger API object |
| definition | <code>object</code> | The path definition |
| operationObjects | <code>Array.&lt;Operation&gt;</code> | The `Operation` objects |
| parameterObjects | <code>Array.&lt;Parameter&gt;</code> | The path-level `Parameter` objects |
| path | <code>string</code> | The path string |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |
| ptr | <code>ptr</code> | The JSON Pointer to the path |
| regexp | <code>regexp</code> | The `RegExp` used to match request paths against this path |


* [~Path](#module_Sway..Path)
    * [new Path(api, path, definition, pathToDefinition)](#new_module_Sway..Path_new)
    * [.getOperation(method)](#module_Sway..Path+getOperation) ⇒ <code>Array.&lt;Operation&gt;</code>
    * [.getOperations()](#module_Sway..Path+getOperations) ⇒ <code>Array.&lt;Operation&gt;</code>
    * [.getOperationsByTag(tag)](#module_Sway..Path+getOperationsByTag) ⇒ <code>Array.&lt;Operation&gt;</code>
    * [.getParameters()](#module_Sway..Path+getParameters) ⇒ <code>Array.&lt;Parameter&gt;</code>

<a name="new_module_Sway..Path_new"></a>
#### new Path(api, path, definition, pathToDefinition)
The Path object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
                      object.


| Param | Type | Description |
| --- | --- | --- |
| api | <code>SwaggerApi</code> | The Swagger API object |
| path | <code>string</code> | The path string |
| definition | <code>object</code> | The path definition |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |

<a name="module_Sway..Path+getOperation"></a>
#### path.getOperation(method) ⇒ <code>Array.&lt;Operation&gt;</code>
Return the operation for this path and method.

**Kind**: instance method of <code>[Path](#module_Sway..Path)</code>  
**Returns**: <code>Array.&lt;Operation&gt;</code> - The Operation objects for this path and method or undefined if there is no operation for the
                       provided method.  

| Param | Type | Description |
| --- | --- | --- |
| method | <code>string</code> | The method |

<a name="module_Sway..Path+getOperations"></a>
#### path.getOperations() ⇒ <code>Array.&lt;Operation&gt;</code>
Return the operations for this path.

**Kind**: instance method of <code>[Path](#module_Sway..Path)</code>  
**Returns**: <code>Array.&lt;Operation&gt;</code> - The Operation objects for this path.  
<a name="module_Sway..Path+getOperationsByTag"></a>
#### path.getOperationsByTag(tag) ⇒ <code>Array.&lt;Operation&gt;</code>
Return the operations for this path and tag.

**Kind**: instance method of <code>[Path](#module_Sway..Path)</code>  
**Returns**: <code>Array.&lt;Operation&gt;</code> - The Operation objects for this path and tag  

| Param | Type | Description |
| --- | --- | --- |
| tag | <code>string</code> | The tag |

<a name="module_Sway..Path+getParameters"></a>
#### path.getParameters() ⇒ <code>Array.&lt;Parameter&gt;</code>
Return the parameters for this path.

**Kind**: instance method of <code>[Path](#module_Sway..Path)</code>  
**Returns**: <code>Array.&lt;Parameter&gt;</code> - The Parameter objects for this path.  
<a name="module_Sway..Response"></a>
### Sway~Response
**Kind**: inner class of <code>[Sway](#module_Sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The response definition |
| operationObject | <code>Operation</code> | The Operation object |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |
| ptr | <code>string</code> | The JSON Pointer to the response definition |
| statusCode | <code>string</code> | The status code |


* [~Response](#module_Sway..Response)
    * [new Response(operationObject, statusCode, definition, pathToDefinition)](#new_module_Sway..Response_new)
    * [.getExample([mimeType])](#module_Sway..Response+getExample) ⇒ <code>string</code>
    * [.getSample()](#module_Sway..Response+getSample) ⇒ <code>\*</code>
    * [.validateResponse(res)](#module_Sway..Response+validateResponse) ⇒ <code>ValidationResults</code>

<a name="new_module_Sway..Response_new"></a>
#### new Response(operationObject, statusCode, definition, pathToDefinition)
The Swagger Response object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
object.


| Param | Type | Description |
| --- | --- | --- |
| operationObject | <code>Operation</code> | The `Operation` object |
| statusCode | <code>string</code> | The status code |
| definition | <code>object</code> | The parameter definition |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | The path segments to the path definition |

<a name="module_Sway..Response+getExample"></a>
#### response.getExample([mimeType]) ⇒ <code>string</code>
Returns the response example for the mime-type.

**Kind**: instance method of <code>[Response](#module_Sway..Response)</code>  
**Returns**: <code>string</code> - The response example as a string or `undefined` if the response code and/or mime-type is missing  

| Param | Type | Description |
| --- | --- | --- |
| [mimeType] | <code>string</code> | The mime type |

<a name="module_Sway..Response+getSample"></a>
#### response.getSample() ⇒ <code>\*</code>
Returns a sample value.

**Kind**: instance method of <code>[Response](#module_Sway..Response)</code>  
**Returns**: <code>\*</code> - The sample value for the response, which can be undefined if the response schema is not provided  
<a name="module_Sway..Response+validateResponse"></a>
#### response.validateResponse(res) ⇒ <code>ValidationResults</code>
Validates the response.

**Kind**: instance method of <code>[Response](#module_Sway..Response)</code>  
**Returns**: <code>ValidationResults</code> - The validation results  

| Param | Type | Description |
| --- | --- | --- |
| res | <code>ServerResponseWrapper</code> | The response or response like object |

<a name="module_Sway..ServerResponseWrapper"></a>
### Sway~ServerResponseWrapper : <code>object</code>
Server response wrapper.

Since the low level `http.ServerResponse` object is not always guaranteed and even if it is, there is no public way
to gather the necessary parts of the response to perform validation, this object encapsulates the required response
information to perform response validation.

**Kind**: inner typedef of <code>[Sway](#module_Sway)</code>  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| body | <code>\*</code> |  | The response body |
| encoding | <code>string</code> |  | The encoding of the body when the body is a `Buffer` |
| headers | <code>object</code> |  | The response headers |
| statusCode | <code>number</code> &#124; <code>string</code> | <code>default</code> | The response status code |

<a name="module_Sway..SwaggerApi"></a>
### Sway~SwaggerApi
**Kind**: inner class of <code>[Sway](#module_Sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| customValidators | <code>Array.&lt;ValidatorCallback&gt;</code> | The array of custom validators |
| definition | <code>object</code> | The original Swagger definition |
| definitionRemotesResolved | <code>obejct</code> | The Swagger definition with all of its remote references resolved |
| definitionAllResolved | <code>object</code> | The Swagger definition with all of its references resolved |
| documentation | <code>string</code> | The URL to the Swagger documentation |
| pathObjects | <code>Array.&lt;Path&gt;</code> | The unique path objects |
| options | <code>object</code> | The options passed to the constructor |
| references | <code>object</code> | The reference metadata *(See [JsonRefs~ResolvedRefDetails](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..ResolvedRefDetails))* |
| version | <code>string</code> | The Swagger API version |


* [~SwaggerApi](#module_Sway..SwaggerApi)
    * [new SwaggerApi(definition, definitionRemotesResolved, definitionAllResolved, references, options)](#new_module_Sway..SwaggerApi_new)
    * [.getOperation(pathOrReq, [method])](#module_Sway..SwaggerApi+getOperation) ⇒ <code>Operation</code>
    * [.getOperations([path])](#module_Sway..SwaggerApi+getOperations) ⇒ <code>Array.&lt;Operation&gt;</code>
    * [.getOperationsByTag([tag])](#module_Sway..SwaggerApi+getOperationsByTag) ⇒ <code>Array.&lt;Operation&gt;</code>
    * [.getPath(pathOrReq)](#module_Sway..SwaggerApi+getPath) ⇒ <code>Path</code>
    * [.getPaths()](#module_Sway..SwaggerApi+getPaths) ⇒ <code>Array.&lt;Path&gt;</code>
    * [.registerValidator(validator)](#module_Sway..SwaggerApi+registerValidator)
    * [.validate()](#module_Sway..SwaggerApi+validate) ⇒ <code>ValidationResults</code>

<a name="new_module_Sway..SwaggerApi_new"></a>
#### new SwaggerApi(definition, definitionRemotesResolved, definitionAllResolved, references, options)
The Swagger API object.

**Note:** Do not use directly.

**Extra Properties:** Other than the documented properties, this object also exposes all properties of the definition
                      object.


| Param | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The original Swagger definition |
| definitionRemotesResolved | <code>obejct</code> | The Swagger definition with all of its remote references resolved |
| definitionAllResolved | <code>object</code> | The Swagger definition with all of its references resolved |
| references | <code>object</code> | The location and resolution of the resolved references in the Swagger definition |
| options | <code>object</code> | The options passed to swaggerApi.create |

<a name="module_Sway..SwaggerApi+getOperation"></a>
#### swaggerApi.getOperation(pathOrReq, [method]) ⇒ <code>Operation</code>
Returns the operation for the given path and operation.

**Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:

  * `method`
  * `url`

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[SwaggerApi](#module_Sway..SwaggerApi)</code>  
**Returns**: <code>Operation</code> - The operation for the provided path and method or undefined if there is no operation for that
                     path and method combination.  

| Param | Type | Description |
| --- | --- | --- |
| pathOrReq | <code>string</code> &#124; <code>object</code> | The Swagger path string or the http client request *(or equivalent)* |
| [method] | <code>string</code> | The Swagger operation method |

<a name="module_Sway..SwaggerApi+getOperations"></a>
#### swaggerApi.getOperations([path]) ⇒ <code>Array.&lt;Operation&gt;</code>
Returns all operations for the provided path or all operations in the API.

**Kind**: instance method of <code>[SwaggerApi](#module_Sway..SwaggerApi)</code>  
**Returns**: <code>Array.&lt;Operation&gt;</code> - All operations for the provided path or all API operations.  

| Param | Type | Description |
| --- | --- | --- |
| [path] | <code>string</code> | The Swagger path |

<a name="module_Sway..SwaggerApi+getOperationsByTag"></a>
#### swaggerApi.getOperationsByTag([tag]) ⇒ <code>Array.&lt;Operation&gt;</code>
Returns all operations for the provided tag.

**Kind**: instance method of <code>[SwaggerApi](#module_Sway..SwaggerApi)</code>  
**Returns**: <code>Array.&lt;Operation&gt;</code> - All operations for the provided tag.  

| Param | Type | Description |
| --- | --- | --- |
| [tag] | <code>string</code> | The Swagger tag |

<a name="module_Sway..SwaggerApi+getPath"></a>
#### swaggerApi.getPath(pathOrReq) ⇒ <code>Path</code>
Returns the path object for the given path or request.

**Note:** Below is the list of properties used when `reqOrPath` is an `http.ClientRequest` *(or equivalent)*:

  * `url`

*(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))*

**Kind**: instance method of <code>[SwaggerApi](#module_Sway..SwaggerApi)</code>  
**Returns**: <code>Path</code> - The corresponding Path object for the requested path or request.  

| Param | Type | Description |
| --- | --- | --- |
| pathOrReq | <code>string</code> &#124; <code>object</code> | The Swagger path string or the http client request *(or equivalent)* |

<a name="module_Sway..SwaggerApi+getPaths"></a>
#### swaggerApi.getPaths() ⇒ <code>Array.&lt;Path&gt;</code>
Returns all path objects for the Swagger API.

**Kind**: instance method of <code>[SwaggerApi](#module_Sway..SwaggerApi)</code>  
**Returns**: <code>Array.&lt;Path&gt;</code> - The Path objects  
<a name="module_Sway..SwaggerApi+registerValidator"></a>
#### swaggerApi.registerValidator(validator)
Registers a validator.

**Kind**: instance method of <code>[SwaggerApi](#module_Sway..SwaggerApi)</code>  
**Throws**:

- <code>TypeError</code> If the validator is not a function


| Param | Type | Description |
| --- | --- | --- |
| validator | <code>validatorCallback</code> | The validator |

<a name="module_Sway..SwaggerApi+validate"></a>
#### swaggerApi.validate() ⇒ <code>ValidationResults</code>
Performs validation of the Swagger API document(s).

**Kind**: instance method of <code>[SwaggerApi](#module_Sway..SwaggerApi)</code>  
**Returns**: <code>ValidationResults</code> - The validation results  
<a name="module_Sway..ValidationEntry"></a>
### Sway~ValidationEntry : <code>object</code>
Validation error/warning object.

**Kind**: inner typedef of <code>[Sway](#module_Sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| code | <code>string</code> | The code used to identify the error/warning |
| error | <code>string</code> | Whenever there is an upstream `Error` encountered, its message is here |
| errors | <code>Array.&lt;ValidationEntry&gt;</code> | The nested error(s) encountered during validation |
| lineage | <code>Array.&lt;string&gt;</code> | Contains the composition lineage for circular composition errors |
| message | <code>string</code> | The human readable description of the error/warning |
| name | <code>string</code> | The header name for header validation errors |
| path | <code>Array.&lt;string&gt;</code> | The path to the location in the document where the error/warning occurred |

<a name="module_Sway..ValidationResults"></a>
### Sway~ValidationResults : <code>object</code>
Validation results object.

**Kind**: inner typedef of <code>[Sway](#module_Sway)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| errors | <code>Array.&lt;ValidationEntry&gt;</code> | The validation errors |
| warnings | <code>Array.&lt;ValidationEntry&gt;</code> | The validation warnings |

<a name="module_Sway..ValidatorCallback"></a>
### Sway~ValidatorCallback ⇒ <code>ValidationResults</code>
Callback used for validation.

**Kind**: inner typedef of <code>[Sway](#module_Sway)</code>  
**Returns**: <code>ValidationResults</code> - The validation results.  

| Param | Type | Description |
| --- | --- | --- |
| api | <code>SwaggerApi</code> | The Swagger API object |

<a name="module_Sway.create"></a>
### Sway.create(options) ⇒ <code>Promise</code>
Creates a SwaggerApi object from its Swagger definition(s).

**Kind**: static method of <code>[Sway](#module_Sway)</code>  
**Returns**: <code>Promise</code> - The promise  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | The options for loading the definition(s) |
| options.definition | <code>object</code> &#124; <code>string</code> | The Swagger definition location or structure |
| [options.jsonRefs] | <code>object</code> | *(See [JsonRefs~JsonRefsOptions](https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..JsonRefsOptions))* |
| [options.customValidators] | <code>Array.&lt;ValidatorCallback&gt;</code> | The custom validators |

**Example**  
```js
SwaggerApi.create({definition: 'http://petstore.swagger.io/v2/swagger.yaml'})
  .then(function (api) {
    console.log('Documentation URL: ', api.documentation);
  }, function (err) {
    console.error(err.stack);
  });
```
