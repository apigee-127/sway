## Classes
<dl>
<dt><a href="#Operation">Operation</a></dt>
<dd></dd>
<dt><a href="#Parameter">Parameter</a></dt>
<dd></dd>
<dt><a href="#SwaggerApi">SwaggerApi</a></dt>
<dd></dd>
</dl>
## Functions
<dl>
<dt><a href="#create">create(options, [callback])</a> ⇒ <code>Promise</code></dt>
<dd><p>Creates a SwaggerApi object from its Swagger definition(s).</p>
</dd>
</dl>
<a name="Operation"></a>
## Operation
**Kind**: global class  

* [Operation](#Operation)
  * [new Operation(api, path, method, ptr, definition)](#new_Operation_new)
  * [.getParameters()](#Operation+getParameters) ⇒ <code>[Array.&lt;Parameter&gt;](#Parameter)</code>
  * [.getResponseSchema([code])](#Operation+getResponseSchema) ⇒ <code>object</code>
  * [.getResponseSample([code])](#Operation+getResponseSample) ⇒ <code>\*</code>

<a name="new_Operation_new"></a>
### new Operation(api, path, method, ptr, definition)
The Swagger Operation object.

<strong>Note:</strong> Do not use directly.


| Param | Type | Description |
| --- | --- | --- |
| api | <code>[SwaggerApi](#SwaggerApi)</code> | The Swagger API object |
| path | <code>string</code> | The operation path |
| method | <code>string</code> | The operation method |
| ptr | <code>string</code> | The JSON Pointer to the operation |
| definition | <code>object</code> | The operation definition |

<a name="Operation+getParameters"></a>
### operation.getParameters() ⇒ <code>[Array.&lt;Parameter&gt;](#Parameter)</code>
Returns all parameters for the operation.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>[Array.&lt;Parameter&gt;](#Parameter)</code> - All parameters for the operation.  
<a name="Operation+getResponseSchema"></a>
### operation.getResponseSchema([code]) ⇒ <code>object</code>
Returns the JSON Schema for the requested code or the default response if no code is provided.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>object</code> - The JSON Schema for the response, which can be undefined if the response schema is not provided  
**Throws**:

- <code>Error</code> Thrown whenever the requested code does not exist (Throwing an error instead of returning undefined
                is required due to undefined being a valid response schema indicating a void response)


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [code] | <code>number</code> &#124; <code>string</code> | <code>default</code> | The response code |

<a name="Operation+getResponseSample"></a>
### operation.getResponseSample([code]) ⇒ <code>\*</code>
Returns a sample value based on the requested code or the default response if no code is provided.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>\*</code> - The sample value for the response, which can be undefined if the response schema is not provided  
**Throws**:

- <code>Error</code> Thrown whenever the requested code does not exist (Throwing an error instead of returning undefined
                is required due to undefined being a valid response schema indicating a void response)


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [code] | <code>number</code> &#124; <code>string</code> | <code>default</code> | The response code |

<a name="Parameter"></a>
## Parameter
**Kind**: global class  

* [Parameter](#Parameter)
  * [new Parameter(operation, ptr, definition, schema)](#new_Parameter_new)
  * [.getSchema()](#Parameter+getSchema) ⇒ <code>object</code>
  * [.getSample()](#Parameter+getSample) ⇒ <code>\*</code>

<a name="new_Parameter_new"></a>
### new Parameter(operation, ptr, definition, schema)
The Swagger Parameter object.

<strong>Note:</strong> Do not use directly.


| Param | Type | Description |
| --- | --- | --- |
| operation | <code>[Operation](#Operation)</code> | The Swagger Operation object |
| ptr | <code>string</code> | The JSON Pointer to the parameter |
| definition | <code>object</code> | The parameter definition |
| schema | <code>object</code> | The JSON Schema for the parameter |

<a name="Parameter+getSchema"></a>
### parameter.getSchema() ⇒ <code>object</code>
Returns the computed JSON Schema for this parameter object.

**Kind**: instance method of <code>[Parameter](#Parameter)</code>  
**Returns**: <code>object</code> - The JSON Schema  
<a name="Parameter+getSample"></a>
### parameter.getSample() ⇒ <code>\*</code>
Returns a sample value for the parameter based on its schema;

**Kind**: instance method of <code>[Parameter](#Parameter)</code>  
**Returns**: <code>\*</code> - The sample value  
<a name="SwaggerApi"></a>
## SwaggerApi
**Kind**: global class  

* [SwaggerApi](#SwaggerApi)
  * [new SwaggerApi(plugin, definition, options, [pluginProperties])](#new_SwaggerApi_new)
  * [.getOperation(path, method)](#SwaggerApi+getOperation) ⇒ <code>[Operation](#Operation)</code>
  * [.getOperations([path])](#SwaggerApi+getOperations) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>

<a name="new_SwaggerApi_new"></a>
### new SwaggerApi(plugin, definition, options, [pluginProperties])
The Swagger API object.

<strong>Note:</strong> Do not use directly.


| Param | Type | Description |
| --- | --- | --- |
| plugin | <code>object</code> | The Swagger version plugin |
| definition | <code>object</code> | The Swagger definition |
| options | <code>object</code> | The options passed to swaggerApi.create |
| [pluginProperties] | <code>object</code> | The extra properties to set on the SwaggerApi object |

<a name="SwaggerApi+getOperation"></a>
### swaggerApi.getOperation(path, method) ⇒ <code>[Operation](#Operation)</code>
Returns the operation for the provided path and method.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  
**Returns**: <code>[Operation](#Operation)</code> - The operation for the provided path and method or undefined if there is no operation for that
                     path and method combination.  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | The Swagger path |
| method | <code>string</code> | The Swagger operation method |

<a name="SwaggerApi+getOperations"></a>
### swaggerApi.getOperations([path]) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>
Returns all operations for the provided path or all operations in the API.

**Kind**: instance method of <code>[SwaggerApi](#SwaggerApi)</code>  
**Returns**: <code>[Array.&lt;Operation&gt;](#Operation)</code> - All operations for the provided path or all API operations.  

| Param | Type | Description |
| --- | --- | --- |
| [path] | <code>string</code> | The Swagger path |

<a name="create"></a>
## create(options, [callback]) ⇒ <code>Promise</code>
Creates a SwaggerApi object from its Swagger definition(s).

**Kind**: global function  
**Returns**: <code>Promise</code> - A promise is always returned even if you provide a callback but it is not required to be used  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | The options for loading the definition(s) |
| [options.loaderOptions] | <code>object</code> | The options to pass to path-loader |
| options.definition | <code>object</code> &#124; <code>string</code> | The Swagger definition location or structure |
| [callback] | <code>function</code> | Node.js error-first callback |

**Example**
```js
// Example using promises
SwaggerApi.create({definition: 'http://petstore.swagger.io/v2/swagger.yaml'})
  .then(function (api) {
    console.log('Documentation URL: ', api.documentation);
  }, function (err) {
    console.error(err.stack);
  });
```
**Example**
```js
// Example using callbacks
SwaggerApi.create({definition: 'http://petstore.swagger.io/v2/swagger.yaml'}, function (err, api) {
  if (err) {
    console.error(err.stack);
  } else {
    console.log('Documentation URL: ', api.documentation);
  });
```
