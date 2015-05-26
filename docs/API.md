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
  * [new Operation(path, method, ptr, definition, parameters)](#new_Operation_new)
  * [.getParameters()](#Operation+getParameters) ⇒ <code>[Array.&lt;Parameter&gt;](#Parameter)</code>

<a name="new_Operation_new"></a>
### new Operation(path, method, ptr, definition, parameters)
The Swagger Operation object.

<strong>Note:</strong> Do not use directly.


| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | The operation path |
| method | <code>string</code> | The operation method |
| ptr | <code>string</code> | The JSON Pointer to the operation |
| definition | <code>object</code> | The operation definition |
| parameters | <code>[Array.&lt;Parameter&gt;](#Parameter)</code> | The Swagger parameter objects |

<a name="Operation+getParameters"></a>
### operation.getParameters() ⇒ <code>[Array.&lt;Parameter&gt;](#Parameter)</code>
Returns all parameters for the operation.

**Kind**: instance method of <code>[Operation](#Operation)</code>  
**Returns**: <code>[Array.&lt;Parameter&gt;](#Parameter)</code> - All parameters for the operation.  
<a name="Parameter"></a>
## Parameter
**Kind**: global class  
<a name="new_Parameter_new"></a>
### new Parameter(ptr, definition)
The Swagger Parameter object.

<strong>Note:</strong> Do not use directly.


| Param | Type | Description |
| --- | --- | --- |
| ptr | <code>string</code> | The JSON Pointer to the parameter |
| definition | <code>object</code> | The parameter definition |

<a name="SwaggerApi"></a>
## SwaggerApi
**Kind**: global class  

* [SwaggerApi](#SwaggerApi)
  * [new SwaggerApi(definition, version, documentation, operations, options)](#new_SwaggerApi_new)
  * [.getOperation(path, method)](#SwaggerApi+getOperation) ⇒ <code>[Operation](#Operation)</code>
  * [.getOperations([path])](#SwaggerApi+getOperations) ⇒ <code>[Array.&lt;Operation&gt;](#Operation)</code>

<a name="new_SwaggerApi_new"></a>
### new SwaggerApi(definition, version, documentation, operations, options)
The Swagger API object.

<strong>Note:</strong> Do not use directly.


| Param | Type | Description |
| --- | --- | --- |
| definition | <code>object</code> | The Swagger definition |
| version | <code>string</code> | The Swagger definition version |
| documentation | <code>string</code> | The Swagger Specification documentation URL |
| operations | <code>[Array.&lt;Operation&gt;](#Operation)</code> | The Swagger operation objects |
| options | <code>object</code> | The options passed to swaggerApi.create |

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
