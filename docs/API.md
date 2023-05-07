<a name="module_sway"></a>

 sway
<p>A library that simplifies <a href="https://www.openapis.org/">OpenAPI</a> integrations.</p>


* [sway](#module_sway)
    * [.ApiDefinition](#module_sway.ApiDefinition)
        * [new ApiDefinition(definition, definitionRemotesResolved, definitionFullyResolved, references, options)](#new_module_sway.ApiDefinition_new)
        * [.getOperation(idOrPathOrReq, [method])](#module_sway.ApiDefinition+getOperation) ⇒ [<code>Operation</code>](#module_sway.Operation)
        * [.getOperations([path])](#module_sway.ApiDefinition+getOperations) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
        * [.getOperationsByTag([tag])](#module_sway.ApiDefinition+getOperationsByTag) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
        * [.getPath(pathOrReq)](#module_sway.ApiDefinition+getPath) ⇒ [<code>Path</code>](#module_sway.Path)
        * [.getPaths()](#module_sway.ApiDefinition+getPaths) ⇒ [<code>Array.&lt;Path&gt;</code>](#module_sway.Path)
        * [.registerFormat(name, validator)](#module_sway.ApiDefinition+registerFormat)
        * [.registerFormatGenerator(name, formatGenerator)](#module_sway.ApiDefinition+registerFormatGenerator)
        * [.unregisterFormat(name)](#module_sway.ApiDefinition+unregisterFormat)
        * [.unregisterFormatGenerator(name)](#module_sway.ApiDefinition+unregisterFormatGenerator)
        * [.registerValidator(validator)](#module_sway.ApiDefinition+registerValidator)
        * [.validate()](#module_sway.ApiDefinition+validate) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
    * [.Operation](#module_sway.Operation)
        * [new Operation(pathObject, method, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Operation_new)
        * [.getParameter(name, [location])](#module_sway.Operation+getParameter) ⇒ [<code>Parameter</code>](#module_sway.Parameter)
        * [.getParameters()](#module_sway.Operation+getParameters) ⇒ [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter)
        * [.getResponse([statusCode])](#module_sway.Operation+getResponse) ⇒ [<code>Response</code>](#module_sway.Response)
        * [.getResponses()](#module_sway.Operation+getResponses) ⇒ [<code>Array.&lt;Response&gt;</code>](#module_sway.Response)
        * [.getSecurity()](#module_sway.Operation+getSecurity) ⇒ <code>Array.&lt;object&gt;</code>
        * [.validateRequest(req, [options])](#module_sway.Operation+validateRequest) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
        * [.validateResponse(res, [options])](#module_sway.Operation+validateResponse) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
    * [.ParameterValue](#module_sway.ParameterValue)
        * [new ParameterValue(parameterObject, raw)](#new_module_sway.ParameterValue_new)
    * [.Parameter](#module_sway.Parameter)
        * [new Parameter(opOrPathObject, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Parameter_new)
        * [.getSample()](#module_sway.Parameter+getSample) ⇒ <code>\*</code>
        * [.getValue(req)](#module_sway.Parameter+getValue) ⇒ [<code>ParameterValue</code>](#module_sway.ParameterValue)
    * [.Path](#module_sway.Path)
        * [new Path(apiDefinition, path, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Path_new)
        * [.getOperation(idOrMethod)](#module_sway.Path+getOperation) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
        * [.getOperations()](#module_sway.Path+getOperations) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
        * [.getOperationsByTag(tag)](#module_sway.Path+getOperationsByTag) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
        * [.getParameters()](#module_sway.Path+getParameters) ⇒ [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter)
    * [.Response](#module_sway.Response)
        * [new Response(operationObject, statusCode, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Response_new)
        * [.getExample([mimeType])](#module_sway.Response+getExample) ⇒ <code>string</code>
        * [.getSample()](#module_sway.Response+getSample) ⇒ <code>\*</code>
        * [.validateResponse(res, [options])](#module_sway.Response+validateResponse) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
    * [.create(options)](#module_sway.create) ⇒ [<code>Promise.&lt;ApiDefinition&gt;</code>](#module_sway.ApiDefinition)
    * [.CreateOptions](#module_sway.CreateOptions) : <code>object</code>
    * [.DocumentValidationFunction](#module_sway.DocumentValidationFunction) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
    * [.RequestValidationFunction](#module_sway.RequestValidationFunction) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
    * [.RequestValidationOptions](#module_sway.RequestValidationOptions) : <code>object</code>
    * [.ResponseValidationFunction](#module_sway.ResponseValidationFunction) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
    * [.ResponseValidationOptions](#module_sway.ResponseValidationOptions) : <code>object</code>
    * [.ServerResponseWrapper](#module_sway.ServerResponseWrapper) : <code>object</code>
    * [.ValidationEntry](#module_sway.ValidationEntry) : <code>object</code>
    * [.ValidationResults](#module_sway.ValidationResults) : <code>object</code>

<a name="module_sway.ApiDefinition"></a>

 sway.ApiDefinition
**Kind**: static class of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| customFormats | <code>object</code> | <p>The key/value pair of custom formats <em>(The keys are the format name and the values are async functions.  See <a href="https://github.com/zaggino/z-schema#register-a-custom-format">ZSchema Custom Formats</a>)</em></p> |
| customFormatGenerators | <code>object</code> | <p>The key/value pair of custom format generators <em>(The keys are the format name and the values are functions.  See <a href="https://github.com/json-schema-faker/json-schema-faker#custom-formats">json-schema-mocker Custom Format</a>)</em></p> |
| customValidators | [<code>Array.&lt;DocumentValidationFunction&gt;</code>](#module_sway.DocumentValidationFunction) | <p>The array of custom validators</p> |
| definition | <code>object</code> | <p>The original OpenAPI definition</p> |
| definitionRemotesResolved | <code>object</code> | <p>The OpenAPI definition with only its remote references resolved <em>(This means all references to external/remote documents are replaced with its dereferenced value but all local references are left unresolved.)</em></p> |
| definitionFullyResolved | <code>object</code> | <p>The OpenAPI definition with all of its resolvable references resolved <em>(This means that all resolvable references are replaced with their dereferenced value.)</em></p> |
| documentationUrl | <code>string</code> | <p>The URL to the OpenAPI documentation</p> |
| pathObjects | [<code>Array.&lt;Path&gt;</code>](#module_sway.Path) | <p>The unique <code>Path</code> objects</p> |
| options | <code>object</code> | <p>The options passed to the constructor</p> |
| references | <code>object</code> | <p>The reference metadata <em>(See <a href="https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..ResolvedRefDetails">JsonRefs~ResolvedRefDetails</a>)</em></p> |
| version | <code>string</code> | <p>The OpenAPI version</p> |


* [.ApiDefinition](#module_sway.ApiDefinition)
    * [new ApiDefinition(definition, definitionRemotesResolved, definitionFullyResolved, references, options)](#new_module_sway.ApiDefinition_new)
    * [.getOperation(idOrPathOrReq, [method])](#module_sway.ApiDefinition+getOperation) ⇒ [<code>Operation</code>](#module_sway.Operation)
    * [.getOperations([path])](#module_sway.ApiDefinition+getOperations) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
    * [.getOperationsByTag([tag])](#module_sway.ApiDefinition+getOperationsByTag) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
    * [.getPath(pathOrReq)](#module_sway.ApiDefinition+getPath) ⇒ [<code>Path</code>](#module_sway.Path)
    * [.getPaths()](#module_sway.ApiDefinition+getPaths) ⇒ [<code>Array.&lt;Path&gt;</code>](#module_sway.Path)
    * [.registerFormat(name, validator)](#module_sway.ApiDefinition+registerFormat)
    * [.registerFormatGenerator(name, formatGenerator)](#module_sway.ApiDefinition+registerFormatGenerator)
    * [.unregisterFormat(name)](#module_sway.ApiDefinition+unregisterFormat)
    * [.unregisterFormatGenerator(name)](#module_sway.ApiDefinition+unregisterFormatGenerator)
    * [.registerValidator(validator)](#module_sway.ApiDefinition+registerValidator)
    * [.validate()](#module_sway.ApiDefinition+validate) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)

<a name="new_module_sway.ApiDefinition_new"></a>

 new ApiDefinition(definition, definitionRemotesResolved, definitionFullyResolved, references, options)
<p>The OpenAPI Definition object.</p>
<p><strong>Note:</strong> Do not use directly.</p>
<p><strong>Extra Properties:</strong> Other than the documented properties, this object also exposes all properties of the
<a href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#openapi-object">OpenAPI Object</a>.</p>


| Param | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | <p>The original OpenAPI definition</p> |
| definitionRemotesResolved | <code>object</code> | <p>The OpenAPI definition with all of its remote references resolved</p> |
| definitionFullyResolved | <code>object</code> | <p>The OpenAPI definition with all of its references resolved</p> |
| references | <code>object</code> | <p>The location and resolution of the resolved references in the OpenAPI definition</p> |
| options | <code>object</code> | <p>The options passed to ApiDefinition.create</p> |

<a name="module_sway.ApiDefinition+getOperation"></a>

 apiDefinition.getOperation(idOrPathOrReq, [method]) ⇒ [<code>Operation</code>](#module_sway.Operation)
<p>Returns the operation for the given path and operation.</p>
<p><strong>Note:</strong> Below is the list of properties used when <code>reqOrPath</code> is an <code>http.ClientRequest</code> <em>(or equivalent)</em>:</p>
<ul>
<li><code>method</code></li>
<li><code>originalUrl</code></li>
<li><code>url</code></li>
</ul>
<p><em>(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))</em></p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  
**Returns**: [<code>Operation</code>](#module_sway.Operation) - <p>The <code>Operation</code> for the provided operation id, or path and method or <code>undefined</code> if
there is no operation for that operation id, or path and method combination</p>  

| Param | Type | Description |
| --- | --- | --- |
| idOrPathOrReq | <code>string</code> \| <code>object</code> | <p>The OpenAPI operation id, path string or the http client request <em>(or equivalent)</em></p> |
| [method] | <code>string</code> | <p>The OpenAPI operation method <em>(not used when providing an operation id)</em></p> |

<a name="module_sway.ApiDefinition+getOperations"></a>

 apiDefinition.getOperations([path]) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
<p>Returns all operations for the provided path or all operations in the API.</p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  
**Returns**: [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation) - <p>All <code>Operation</code> objects for the provided path or all API operations</p>  

| Param | Type | Description |
| --- | --- | --- |
| [path] | <code>string</code> | <p>The OpenAPI path</p> |

<a name="module_sway.ApiDefinition+getOperationsByTag"></a>

 apiDefinition.getOperationsByTag([tag]) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
<p>Returns all operations for the provided tag.</p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  
**Returns**: [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation) - <p>All <code>Operation</code> objects for the provided tag</p>  

| Param | Type | Description |
| --- | --- | --- |
| [tag] | <code>string</code> | <p>The OpenAPI tag</p> |

<a name="module_sway.ApiDefinition+getPath"></a>

 apiDefinition.getPath(pathOrReq) ⇒ [<code>Path</code>](#module_sway.Path)
<p>Returns the path object for the given path or request.</p>
<p><strong>Note:</strong> Below is the list of properties used when <code>reqOrPath</code> is an <code>http.ClientRequest</code> <em>(or equivalent)</em>:</p>
<ul>
<li><code>originalUrl</code></li>
<li><code>url</code></li>
</ul>
<p><em>(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))</em></p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  
**Returns**: [<code>Path</code>](#module_sway.Path) - <p>The corresponding <code>Path</code> object for the requested path or request</p>  

| Param | Type | Description |
| --- | --- | --- |
| pathOrReq | <code>string</code> \| <code>object</code> | <p>The OpenAPI path string or the http client request <em>(or equivalent)</em></p> |

<a name="module_sway.ApiDefinition+getPaths"></a>

 apiDefinition.getPaths() ⇒ [<code>Array.&lt;Path&gt;</code>](#module_sway.Path)
<p>Returns all path objects for the OpenAPI definition.</p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  
**Returns**: [<code>Array.&lt;Path&gt;</code>](#module_sway.Path) - <p>The <code>Path</code> objects</p>  
<a name="module_sway.ApiDefinition+registerFormat"></a>

 apiDefinition.registerFormat(name, validator)
<p>Registers a custom format.</p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | <p>The name of the format</p> |
| validator | <code>function</code> | <p>The format validator <em>(See <a href="https://github.com/zaggino/z-schema#register-a-custom-format">ZSchema Custom Format</a>)</em></p> |

<a name="module_sway.ApiDefinition+registerFormatGenerator"></a>

 apiDefinition.registerFormatGenerator(name, formatGenerator)
<p>Registers a custom format generator.</p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | <p>The name of the format</p> |
| formatGenerator | <code>function</code> | <p>The format generator <em>(See <a href="https://github.com/json-schema-faker/json-schema-faker#custom-formats">json-schema-mocker Custom Format</a>)</em></p> |

<a name="module_sway.ApiDefinition+unregisterFormat"></a>

 apiDefinition.unregisterFormat(name)
<p>Unregisters a custom format.</p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | <p>The name of the format</p> |

<a name="module_sway.ApiDefinition+unregisterFormatGenerator"></a>

 apiDefinition.unregisterFormatGenerator(name)
<p>Unregisters a custom format generator.</p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | <p>The name of the format generator</p> |

<a name="module_sway.ApiDefinition+registerValidator"></a>

 apiDefinition.registerValidator(validator)
<p>Registers a custom validator.</p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  
**Throws**:

- <code>TypeError</code> <p>If the validator is not a function</p>


| Param | Type | Description |
| --- | --- | --- |
| validator | [<code>DocumentValidationFunction</code>](#module_sway.DocumentValidationFunction) | <p>The validator</p> |

<a name="module_sway.ApiDefinition+validate"></a>

 apiDefinition.validate() ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
<p>Performs validation of the OpenAPI definition.</p>

**Kind**: instance method of [<code>ApiDefinition</code>](#module_sway.ApiDefinition)  
**Returns**: [<code>ValidationResults</code>](#module_sway.ValidationResults) - <p>The validation results</p>  
<a name="module_sway.Operation"></a>

 sway.Operation
**Kind**: static class of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | <p>The operation definition <em>(The raw operation definition <strong>after</strong> remote references were resolved)</em></p> |
| definitionFullyResolved | <code>object</code> | <p>The operation definition with all of its resolvable references resolved</p> |
| method | <code>string</code> | <p>The HTTP method for this operation</p> |
| pathObject | [<code>Path</code>](#module_sway.Path) | <p>The <code>Path</code> object</p> |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | <p>The path segments to the operation definition</p> |
| parameterObjects | [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter) | <p>The <code>Parameter</code> objects</p> |
| ptr | <code>string</code> | <p>The JSON Pointer to the operation</p> |
| securityDefinitions | <code>object</code> | <p>The security definitions used by this operation</p> |


* [.Operation](#module_sway.Operation)
    * [new Operation(pathObject, method, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Operation_new)
    * [.getParameter(name, [location])](#module_sway.Operation+getParameter) ⇒ [<code>Parameter</code>](#module_sway.Parameter)
    * [.getParameters()](#module_sway.Operation+getParameters) ⇒ [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter)
    * [.getResponse([statusCode])](#module_sway.Operation+getResponse) ⇒ [<code>Response</code>](#module_sway.Response)
    * [.getResponses()](#module_sway.Operation+getResponses) ⇒ [<code>Array.&lt;Response&gt;</code>](#module_sway.Response)
    * [.getSecurity()](#module_sway.Operation+getSecurity) ⇒ <code>Array.&lt;object&gt;</code>
    * [.validateRequest(req, [options])](#module_sway.Operation+validateRequest) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
    * [.validateResponse(res, [options])](#module_sway.Operation+validateResponse) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)

<a name="new_module_sway.Operation_new"></a>

 new Operation(pathObject, method, definition, definitionFullyResolved, pathToDefinition)
<p>The OpenAPI Operation object.</p>
<p><strong>Note:</strong> Do not use directly.</p>
<p><strong>Extra Properties:</strong> Other than the documented properties, this object also exposes all properties of the
<a href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operationObject">OpenAPI Operation Object</a>.</p>


| Param | Type | Description |
| --- | --- | --- |
| pathObject | [<code>Path</code>](#module_sway.Path) | <p>The Path object</p> |
| method | <code>string</code> | <p>The operation method</p> |
| definition | <code>object</code> | <p>The operation definition <em>(The raw operation definition <strong>after</strong> remote references were resolved)</em></p> |
| definitionFullyResolved | <code>object</code> | <p>The operation definition with all of its resolvable references resolved</p> |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | <p>The path segments to the operation definition</p> |

<a name="module_sway.Operation+getParameter"></a>

 operation.getParameter(name, [location]) ⇒ [<code>Parameter</code>](#module_sway.Parameter)
<p>Returns the parameter with the provided name and location when provided.</p>

**Kind**: instance method of [<code>Operation</code>](#module_sway.Operation)  
**Returns**: [<code>Parameter</code>](#module_sway.Parameter) - <p>The <code>Parameter</code> matching the location and name combination or <code>undefined</code> if there
is no match</p>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | <p>The name of the parameter</p> |
| [location] | <code>string</code> | <p>The location <em>(<code>in</code>)</em> of the parameter <em>(Used for disambiguation)</em></p> |

<a name="module_sway.Operation+getParameters"></a>

 operation.getParameters() ⇒ [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter)
<p>Returns all parameters for the operation.</p>

**Kind**: instance method of [<code>Operation</code>](#module_sway.Operation)  
**Returns**: [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter) - <p>All <code>Parameter</code> objects for the operation</p>  
<a name="module_sway.Operation+getResponse"></a>

 operation.getResponse([statusCode]) ⇒ [<code>Response</code>](#module_sway.Response)
<p>Returns the response for the requested status code or the default response <em>(if available)</em> if none is provided.</p>

**Kind**: instance method of [<code>Operation</code>](#module_sway.Operation)  
**Returns**: [<code>Response</code>](#module_sway.Response) - <p>The <code>Response</code> or <code>undefined</code> if one cannot be found</p>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [statusCode] | <code>number</code> \| <code>string</code> | <code>&#x27;default&#x27;</code> | <p>The status code</p> |

<a name="module_sway.Operation+getResponses"></a>

 operation.getResponses() ⇒ [<code>Array.&lt;Response&gt;</code>](#module_sway.Response)
<p>Returns all responses for the operation.</p>

**Kind**: instance method of [<code>Operation</code>](#module_sway.Operation)  
**Returns**: [<code>Array.&lt;Response&gt;</code>](#module_sway.Response) - <p>All <code>Response</code> objects for the operation</p>  
<a name="module_sway.Operation+getSecurity"></a>

 operation.getSecurity() ⇒ <code>Array.&lt;object&gt;</code>
<p>Returns the composite security definitions for this operation.</p>
<p>The difference between this API and <code>this.security</code> is that <code>this.security</code> is the raw <code>security</code> value for the
operation where as this API will return the global <code>security</code> value when available and this operation's security
is undefined.</p>

**Kind**: instance method of [<code>Operation</code>](#module_sway.Operation)  
**Returns**: <code>Array.&lt;object&gt;</code> - <p>The security for this operation</p>  
<a name="module_sway.Operation+validateRequest"></a>

 operation.validateRequest(req, [options]) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
<p>Validates the request.</p>
<p><strong>Note:</strong> Below is the list of <code>req</code> properties used <em>(req should be an <code>http.ClientRequest</code> or equivalent)</em>:</p>
<ul>
<li><code>body</code>: Used for <code>body</code> and <code>formData</code> parameters</li>
<li><code>files</code>: Used for <code>formData</code> parameters whose <code>type</code> is <code>file</code></li>
<li><code>headers</code>: Used for <code>header</code> parameters and consumes</li>
<li><code>originalUrl</code>: used for <code>path</code> parameters</li>
<li><code>query</code>: Used for <code>query</code> parameters</li>
<li><code>url</code>: used for <code>path</code> parameters</li>
</ul>
<p>For <code>path</code> parameters, we will use the operation's <code>regexp</code> property to parse out path parameters using the
<code>originalUrl</code> or <code>url</code> property.</p>
<p><em>(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))</em></p>

**Kind**: instance method of [<code>Operation</code>](#module_sway.Operation)  
**Returns**: [<code>ValidationResults</code>](#module_sway.ValidationResults) - <p>The validation results</p>  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | <p>The http client request <em>(or equivalent)</em></p> |
| [options] | [<code>RequestValidationOptions</code>](#module_sway.RequestValidationOptions) | <p>The validation options</p> |

<a name="module_sway.Operation+validateResponse"></a>

 operation.validateResponse(res, [options]) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
<p>Validates the response.</p>

**Kind**: instance method of [<code>Operation</code>](#module_sway.Operation)  
**Returns**: [<code>ValidationResults</code>](#module_sway.ValidationResults) - <p>The validation results</p>  

| Param | Type | Description |
| --- | --- | --- |
| res | [<code>ServerResponseWrapper</code>](#module_sway.ServerResponseWrapper) | <p>The response or response like object</p> |
| [options] | [<code>ResponseValidationOptions</code>](#module_sway.ResponseValidationOptions) | <p>The validation options</p> |

<a name="module_sway.ParameterValue"></a>

 sway.ParameterValue
**Kind**: static class of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | <p>The error(s) encountered during processing/validating the parameter value</p> |
| parameterObject | [<code>Parameter</code>](#module_sway.Parameter) | <p>The <code>Parameter</code> object</p> |
| raw | <code>\*</code> | <p>The original parameter value <em>(Does not take default values into account)</em></p> |
| valid | <code>boolean</code> | <p>Whether or not this parameter is valid based on its JSON Schema</p> |
| value | <code>\*</code> | <p>The processed value <em>(Takes default values into account and does type coercion when necessary and possible)</em>.  This can the original value in the event that processing the value is impossible <em>(missing schema type)</em> or <code>undefined</code> if processing the value failed <em>(invalid types, etc.)</em>.</p> |

<a name="new_module_sway.ParameterValue_new"></a>

 new ParameterValue(parameterObject, raw)
<p>Object representing a parameter value.</p>
<p><strong>Note:</strong> Do not use directly.</p>


| Param | Type | Description |
| --- | --- | --- |
| parameterObject | [<code>Parameter</code>](#module_sway.Parameter) | <p>The <code>Parameter</code> object</p> |
| raw | <code>\*</code> | <p>The original/raw value</p> |

<a name="module_sway.Parameter"></a>

 sway.Parameter
**Kind**: static class of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | <p>The parameter definition <em>(The raw parameter definition <strong>after</strong> remote references were resolved)</em></p> |
| definitionFullyResolved | <code>object</code> | <p>The parameter definition with all of its resolvable references resolved</p> |
| operationObject | [<code>Operation</code>](#module_sway.Operation) | <p>The <code>Operation</code> object the parameter belongs to <em>(Can be <code>undefined</code> for path-level parameters)</em></p> |
| pathObject | [<code>Path</code>](#module_sway.Path) | <p>The <code>Path</code> object the parameter belongs to</p> |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | <p>The path segments to the parameter definition</p> |
| ptr | <code>string</code> | <p>The JSON Pointer to the parameter definition</p> |
| schema | <code>object</code> | <p>The JSON Schema for the parameter <em>(For non-body parameters, this is a computed value)</em></p> |


* [.Parameter](#module_sway.Parameter)
    * [new Parameter(opOrPathObject, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Parameter_new)
    * [.getSample()](#module_sway.Parameter+getSample) ⇒ <code>\*</code>
    * [.getValue(req)](#module_sway.Parameter+getValue) ⇒ [<code>ParameterValue</code>](#module_sway.ParameterValue)

<a name="new_module_sway.Parameter_new"></a>

 new Parameter(opOrPathObject, definition, definitionFullyResolved, pathToDefinition)
<p>The OpenAPI Parameter object.</p>
<p><strong>Note:</strong> Do not use directly.</p>
<p><strong>Extra Properties:</strong> Other than the documented properties, this object also exposes all properties of the
<a href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#parameterObject">OpenAPI Parameter Object</a>.</p>


| Param | Type | Description |
| --- | --- | --- |
| opOrPathObject | [<code>Operation</code>](#module_sway.Operation) \| [<code>Path</code>](#module_sway.Path) | <p>The <code>Operation</code> or <code>Path</code> object</p> |
| definition | <code>object</code> | <p>The parameter definition <em>(The raw parameter definition <strong>after</strong> remote references were resolved)</em></p> |
| definitionFullyResolved | <code>object</code> | <p>The parameter definition with all of its resolvable references resolved</p> |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | <p>The path segments to the parameter definition</p> |

<a name="module_sway.Parameter+getSample"></a>

 parameter.getSample() ⇒ <code>\*</code>
<p>Returns a sample value for the parameter based on its schema;</p>

**Kind**: instance method of [<code>Parameter</code>](#module_sway.Parameter)  
**Returns**: <code>\*</code> - <p>The sample value</p>  
<a name="module_sway.Parameter+getValue"></a>

 parameter.getValue(req) ⇒ [<code>ParameterValue</code>](#module_sway.ParameterValue)
<p>Returns the parameter value from the request.</p>
<p><strong>Note:</strong> Below is the list of <code>req</code> properties used <em>(req should be an <code>http.ClientRequest</code> or equivalent)</em>:</p>
<ul>
<li><code>body</code>: Used for <code>body</code> and <code>formData</code> parameters</li>
<li><code>files</code>: Used for <code>formData</code> parameters whose <code>type</code> is <code>file</code></li>
<li><code>headers</code>: Used for <code>header</code> parameters</li>
<li><code>originalUrl</code>: used for <code>path</code> parameters</li>
<li><code>query</code>: Used for <code>query</code> parameters</li>
<li><code>url</code>: used for <code>path</code> parameters</li>
</ul>
<p>For <code>path</code> parameters, we will use the operation's <code>regexp</code> property to parse out path parameters using the
<code>originalUrl</code> or <code>url</code> property.</p>
<p><em>(See: [https://nodejs.org/api/http.html#http_class_http_clientrequest](https://nodejs.org/api/http.html#http_class_http_clientrequest))</em></p>

**Kind**: instance method of [<code>Parameter</code>](#module_sway.Parameter)  
**Returns**: [<code>ParameterValue</code>](#module_sway.ParameterValue) - <p>The parameter value object</p>  
**Throws**:

- <code>Error</code> <p>If the <code>in</code> value of the parameter's schema is not valid or if the <code>req</code> property to retrieve the
parameter is missing</p>


| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | <p>The http client request <em>(or equivalent)</em></p> |

<a name="module_sway.Path"></a>

 sway.Path
**Kind**: static class of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| apiDefinition | [<code>ApiDefinition</code>](#module_sway.ApiDefinition) | <p>The <code>ApiDefinition</code> object</p> |
| definition | <code>object</code> | <p>The path definition <em>(The raw path definition <strong>after</strong> remote references were resolved)</em></p> |
| definitionFullyResolved | <code>object</code> | <p>The path definition with all of its resolvable references resolved</p> |
| operationObjects | [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation) | <p>The <code>Operation</code> objects</p> |
| parameterObjects | [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter) | <p>The path-level <code>Parameter</code> objects</p> |
| path | <code>string</code> | <p>The path string</p> |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | <p>The path segments to the path definition</p> |
| ptr | <code>ptr</code> | <p>The JSON Pointer to the path</p> |
| regexp | <code>regexp</code> | <p>The <code>RegExp</code> used to match request paths against this path</p> |


* [.Path](#module_sway.Path)
    * [new Path(apiDefinition, path, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Path_new)
    * [.getOperation(idOrMethod)](#module_sway.Path+getOperation) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
    * [.getOperations()](#module_sway.Path+getOperations) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
    * [.getOperationsByTag(tag)](#module_sway.Path+getOperationsByTag) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
    * [.getParameters()](#module_sway.Path+getParameters) ⇒ [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter)

<a name="new_module_sway.Path_new"></a>

 new Path(apiDefinition, path, definition, definitionFullyResolved, pathToDefinition)
<p>The Path object.</p>
<p><strong>Note:</strong> Do not use directly.</p>
<p><strong>Extra Properties:</strong> Other than the documented properties, this object also exposes all properties of the
<a href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#pathItemObject">OpenAPI Path Object</a>.</p>


| Param | Type | Description |
| --- | --- | --- |
| apiDefinition | [<code>ApiDefinition</code>](#module_sway.ApiDefinition) | <p>The <code>ApiDefinition</code> object</p> |
| path | <code>string</code> | <p>The path string</p> |
| definition | <code>object</code> | <p>The path definition <em>(The raw path definition <strong>after</strong> remote references were resolved)</em></p> |
| definitionFullyResolved | <code>object</code> | <p>The path definition with all of its resolvable references resolved</p> |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | <p>The path segments to the path definition</p> |

<a name="module_sway.Path+getOperation"></a>

 path.getOperation(idOrMethod) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
<p>Return the operation for this path and operation id or method.</p>

**Kind**: instance method of [<code>Path</code>](#module_sway.Path)  
**Returns**: [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation) - <p>The <code>Operation</code> objects for this path and method or <code>undefined</code> if there is no
operation for the provided method</p>  

| Param | Type | Description |
| --- | --- | --- |
| idOrMethod | <code>string</code> | <p>The operation id or method</p> |

<a name="module_sway.Path+getOperations"></a>

 path.getOperations() ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
<p>Return the operations for this path.</p>

**Kind**: instance method of [<code>Path</code>](#module_sway.Path)  
**Returns**: [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation) - <p>The <code>Operation</code> objects for this path</p>  
<a name="module_sway.Path+getOperationsByTag"></a>

 path.getOperationsByTag(tag) ⇒ [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation)
<p>Return the operations for this path and tag.</p>

**Kind**: instance method of [<code>Path</code>](#module_sway.Path)  
**Returns**: [<code>Array.&lt;Operation&gt;</code>](#module_sway.Operation) - <p>The <code>Operation</code> objects for this path and tag</p>  

| Param | Type | Description |
| --- | --- | --- |
| tag | <code>string</code> | <p>The tag</p> |

<a name="module_sway.Path+getParameters"></a>

 path.getParameters() ⇒ [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter)
<p>Return the parameters for this path.</p>

**Kind**: instance method of [<code>Path</code>](#module_sway.Path)  
**Returns**: [<code>Array.&lt;Parameter&gt;</code>](#module_sway.Parameter) - <p>The <code>Parameter</code> objects for this path</p>  
<a name="module_sway.Response"></a>

 sway.Response
**Kind**: static class of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | <p>The response definition <em>(The raw responsedefinition <strong>after</strong> remote references were resolved)</em></p> |
| definitionFullyResolved | <code>object</code> | <p>The response definition with all of its resolvable references resolved</p> |
| operationObject | [<code>Operation</code>](#module_sway.Operation) | <p>The Operation object</p> |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | <p>The path segments to the path definition</p> |
| ptr | <code>string</code> | <p>The JSON Pointer to the response definition</p> |
| statusCode | <code>string</code> | <p>The status code</p> |


* [.Response](#module_sway.Response)
    * [new Response(operationObject, statusCode, definition, definitionFullyResolved, pathToDefinition)](#new_module_sway.Response_new)
    * [.getExample([mimeType])](#module_sway.Response+getExample) ⇒ <code>string</code>
    * [.getSample()](#module_sway.Response+getSample) ⇒ <code>\*</code>
    * [.validateResponse(res, [options])](#module_sway.Response+validateResponse) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)

<a name="new_module_sway.Response_new"></a>

 new Response(operationObject, statusCode, definition, definitionFullyResolved, pathToDefinition)
<p>The OpenAPI Response object.</p>
<p><strong>Note:</strong> Do not use directly.</p>
<p><strong>Extra Properties:</strong> Other than the documented properties, this object also exposes all properties of the
<a href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#responseObject">OpenAPI Response Object</a>.</p>


| Param | Type | Description |
| --- | --- | --- |
| operationObject | [<code>Operation</code>](#module_sway.Operation) | <p>The <code>Operation</code> object</p> |
| statusCode | <code>string</code> | <p>The status code</p> |
| definition | <code>object</code> | <p>The response definition <em>(The raw response definition <strong>after</strong> remote references were resolved)</em></p> |
| definitionFullyResolved | <code>object</code> | <p>The response definition with all of its resolvable references resolved</p> |
| pathToDefinition | <code>Array.&lt;string&gt;</code> | <p>The path segments to the path definition</p> |

<a name="module_sway.Response+getExample"></a>

 response.getExample([mimeType]) ⇒ <code>string</code>
<p>Returns the response example for the mime-type.</p>

**Kind**: instance method of [<code>Response</code>](#module_sway.Response)  
**Returns**: <code>string</code> - <p>The response example as a string or <code>undefined</code> if the response code and/or mime-type is missing</p>  

| Param | Type | Description |
| --- | --- | --- |
| [mimeType] | <code>string</code> | <p>The mime type</p> |

<a name="module_sway.Response+getSample"></a>

 response.getSample() ⇒ <code>\*</code>
<p>Returns a sample value.</p>

**Kind**: instance method of [<code>Response</code>](#module_sway.Response)  
**Returns**: <code>\*</code> - <p>The sample value for the response, which can be undefined if the response schema is not provided</p>  
<a name="module_sway.Response+validateResponse"></a>

 response.validateResponse(res, [options]) ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
<p>Validates the response.</p>

**Kind**: instance method of [<code>Response</code>](#module_sway.Response)  
**Returns**: [<code>ValidationResults</code>](#module_sway.ValidationResults) - <p>The validation results</p>  

| Param | Type | Description |
| --- | --- | --- |
| res | [<code>ServerResponseWrapper</code>](#module_sway.ServerResponseWrapper) | <p>The response or response like object</p> |
| [options] | [<code>ResponseValidationOptions</code>](#module_sway.ResponseValidationOptions) | <p>The validation options</p> |

<a name="module_sway.create"></a>

 sway.create(options) ⇒ [<code>Promise.&lt;ApiDefinition&gt;</code>](#module_sway.ApiDefinition)
<p>Creates an ApiDefinition object from the provided OpenAPI definition.</p>

**Kind**: static method of [<code>sway</code>](#module_sway)  
**Returns**: [<code>Promise.&lt;ApiDefinition&gt;</code>](#module_sway.ApiDefinition) - <p>The promise</p>  

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>CreateOptions</code>](#module_sway.CreateOptions) | <p>The options for loading the definition(s)</p> |

**Example**  
```js
Sway.create({
  definition: 'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/master/examples/v3.0/petstore.yaml'
})
.then(function (apiDefinition) {
  console.log('Documentation URL: ', apiDefinition.documentationUrl);
}, function (err) {
  console.error(err.stack);
});
```
<a name="module_sway.CreateOptions"></a>

 sway.CreateOptions : <code>object</code>
<p>Options used when creating the <code>ApiDefinition</code>.</p>

**Kind**: static typedef of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> \| <code>string</code> | <p>The OpenAPI definition location or structure</p> |
| [jsonRefs] | <code>object</code> | <p><em>(See <a href="https://github.com/whitlockjc/json-refs/blob/master/docs/API.md#module_JsonRefs..JsonRefsOptions">JsonRefs~JsonRefsOptions</a>)</em></p> |
| [customFormats] | <code>object</code> | <p>The key/value pair of custom formats <em>(The keys are the format name and the values are async functions.  See <a href="https://github.com/zaggino/z-schema#register-a-custom-format">ZSchema Custom Formats</a>)</em></p> |
| [customFormatGenerators] | <code>object</code> | <p>The key/value pair of custom format generators <em>(The keys are the format name and the values are functions.  See <a href="https://github.com/json-schema-faker/json-schema-faker#custom-formats">json-schema-mocker Custom Format</a>)</em></p> |
| [customValidators] | [<code>Array.&lt;DocumentValidationFunction&gt;</code>](#module_sway.DocumentValidationFunction) | <p>The custom validators</p> |

<a name="module_sway.DocumentValidationFunction"></a>

 sway.DocumentValidationFunction ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
<p>Function used for custom validation of OpenAPI documents</p>

**Kind**: static typedef of [<code>sway</code>](#module_sway)  
**Returns**: [<code>ValidationResults</code>](#module_sway.ValidationResults) - <p>The validation results</p>  

| Param | Type | Description |
| --- | --- | --- |
| apiDefinition | [<code>ApiDefinition</code>](#module_sway.ApiDefinition) | <p>The <code>ApiDefinition</code> object</p> |

<a name="module_sway.RequestValidationFunction"></a>

 sway.RequestValidationFunction ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
<p>Request validation function.</p>

**Kind**: static typedef of [<code>sway</code>](#module_sway)  
**Returns**: [<code>ValidationResults</code>](#module_sway.ValidationResults) - <p>The validation results</p>  

| Param | Type | Description |
| --- | --- | --- |
| res | [<code>ServerResponseWrapper</code>](#module_sway.ServerResponseWrapper) | <p>The response or response like object</p> |
| def | [<code>Response</code>](#module_sway.Response) | <p>The <code>Response</code> definition <em>(useful primarily when calling <code>Operation#validateResponse</code> as <code>Response#validateResponse</code> the caller should have access to the <code>Response</code> object already.)</em></p> |

<a name="module_sway.RequestValidationOptions"></a>

 sway.RequestValidationOptions : <code>object</code>
<p>Request validation options.</p>

**Kind**: static typedef of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [strictMode] | <code>boolean</code> \| <code>object</code> | <code>false</code> | <p>Enablement of strict mode validation.  If <code>strictMode</code> is a <code>boolean</code> and is <code>true</code>, all form fields, headers and query parameters <strong>must</strong> be defined in the OpenAPI document for this operation.  If <code>strictMode</code> is an <code>object</code>, the keys correspond to the <code>in</code> property values of the <a href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#parameterObject">OpenAPI Parameter Object</a> and its value is a <code>boolean</code> that when <code>true</code> turns on strict mode validation for the request location matching the key.  Valid keys are <code>formData</code>, <code>header</code> and <code>query</code>.  <em>(<code>body</code> and <code>path</code> are not necessary since <code>body</code> strict mode is possible via its schema and <code>path</code> is <strong>always</strong> required.)</em></p> |
| [customValidators] | [<code>RequestValidationFunction</code>](#module_sway.RequestValidationFunction) |  | <p>The custom validators</p> |

<a name="module_sway.ResponseValidationFunction"></a>

 sway.ResponseValidationFunction ⇒ [<code>ValidationResults</code>](#module_sway.ValidationResults)
<p>Response validation function.</p>

**Kind**: static typedef of [<code>sway</code>](#module_sway)  
**Returns**: [<code>ValidationResults</code>](#module_sway.ValidationResults) - <p>The validation results</p>  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>object</code> | <p>The http client request <em>(or equivalent)</em></p> |
| op | [<code>Operation</code>](#module_sway.Operation) | <p>The <code>Operation</code> object for the request</p> |

<a name="module_sway.ResponseValidationOptions"></a>

 sway.ResponseValidationOptions : <code>object</code>
<p>Response validation options.</p>

**Kind**: static typedef of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [strictMode] | <code>boolean</code> \| <code>object</code> | <code>false</code> | <p>Enablement of strict mode validation.  If <code>strictMode</code> is a <code>boolean</code> and is <code>true</code>, all form fields, headers and query parameters <strong>must</strong> be defined in the OpenAPI definition for this operation.  If <code>strictMode</code> is an <code>object</code>, the keys correspond to the <code>in</code> property values of the <a href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject">OpenAPI Parameter Object</a> and its value is a <code>boolean</code> that when <code>true</code> turns on strict mode validation for the request location matching the key.  Valid keys are <code>header</code>.  <em>(<code>body</code>, <code>query</code> and <code>path</code> are not necessary since <code>body</code> strict mode is possible via its schema and <code>path</code>, <code>query</code> do not matter for responses.)</em></p> |
| [customValidators] | [<code>RequestValidationFunction</code>](#module_sway.RequestValidationFunction) |  | <p>The custom validators</p> |

<a name="module_sway.ServerResponseWrapper"></a>

 sway.ServerResponseWrapper : <code>object</code>
<p>Server response wrapper.</p>
<p>Since the low level <code>http.ServerResponse</code> object is not always guaranteed and even if it is, there is no public way
to gather the necessary parts of the response to perform validation, this object encapsulates the required response
information to perform response validation.</p>

**Kind**: static typedef of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| body | <code>\*</code> |  | <p>The response body</p> |
| [encoding] | <code>string</code> |  | <p>The encoding of the body when the body is a <code>Buffer</code></p> |
| [headers] | <code>object</code> |  | <p>The response headers</p> |
| [statusCode] | <code>number</code> \| <code>string</code> | <code>default</code> | <p>The response status code</p> |

<a name="module_sway.ValidationEntry"></a>

 sway.ValidationEntry : <code>object</code>
<p>Validation error/warning object.</p>
<p>When this object is created as a result of JSON Schema validation, this object is created by
<a href="https://github.com/zaggino/z-schema">z-schema</a> and it owns the structure so there can be extra properties not
documented below.</p>

**Kind**: static typedef of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| code | <code>string</code> | <p>The code used to identify the error/warning</p> |
| [error] | <code>string</code> | <p>Whenever there is an upstream <code>Error</code> encountered, its message is here</p> |
| [errors] | [<code>Array.&lt;ValidationEntry&gt;</code>](#module_sway.ValidationEntry) | <p>The nested error(s) encountered during validation</p> |
| [lineage] | <code>Array.&lt;string&gt;</code> | <p>Contains the composition lineage for circular composition errors</p> |
| message | <code>string</code> | <p>The human readable description of the error/warning</p> |
| [name] | <code>string</code> | <p>The header name for header validation errors</p> |
| [params] | <code>array</code> | <p>The parameters used when validation failed <em>(This is a z-schema construct and is only set for JSON Schema validation errors.)</em></p> |
| path | <code>Array.&lt;string&gt;</code> | <p>The path to the location in the document where the error/warning occurred</p> |
| [schemaId] | <code>string</code> | <p>The schema id *(This is a z-schema construct and is only set for JSON Schema validation errors and when its value is not <code>undefined</code>.)</p> |

<a name="module_sway.ValidationResults"></a>

 sway.ValidationResults : <code>object</code>
<p>Validation results object.</p>

**Kind**: static typedef of [<code>sway</code>](#module_sway)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| errors | [<code>Array.&lt;ValidationEntry&gt;</code>](#module_sway.ValidationEntry) | <p>The validation errors</p> |
| warnings | [<code>Array.&lt;ValidationEntry&gt;</code>](#module_sway.ValidationEntry) | <p>The validation warnings</p> |

