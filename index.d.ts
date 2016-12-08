export declare function create(options : Options) : Promise<SwaggerApi>

declare type Options = {
    defintion: Object | string,
    jsonRefs?: Object,
    customValidatiors?: ValidatorCallback[]
}

declare type ValidatorCallback = (api : SwaggerApi) => ValidationResults

declare class SwaggerApi{
    customValidators: ValidatorCallback[]
    definition: Object
    definitionRemotesResolved: Object
    definitionFullyResolved: Object
    documentationUrl: string
    pathObjects: Path[]
    options: Object
    references: Object
    version: string

    getOperation(pathOrRequest : string | Request, method ?: string): Operation
    getOperations(path ?: string): Operation[]
    getOperationsByTag(tag ?: string): Operation[]
    getPath(pathOrRequest : string | Request): Path
    getPaths(): Path[]
    registerValidator(validator: ValidatorCallback): void
    validate(): ValidationResults
}

//TODO confirm this is all any of them use
declare interface Request {
    [index: string]: any
    url: string
}


declare class Operation{
    definition: Object
    definitionFullyResolved: Object
    method: string
    pathObject: Path
    pathToDefinition: string[]
    parameterObjects: Parameter[]
    ptr: string
    securityDefinitions: Object
    
    getParameter(name : string, location ?: string) : Parameter
    getParameters() : Parameter[]
    getResponse(statusCode ?: number | string) : Response
    getResponses() : Response[]
    getSecurity() : Object//Security
    validateRequest(request : Request) : ValidationResults
    validateResponse(response : Response) : ValidationResults
}

declare type ValidationResults = {
    errors: ValidationEntry[],
    warnings: ValidationEntry[]
}

declare type ValidationEntry = {
    code: string
    error: string
    errors: ValidationEntry[] //for nested errors
    lineage: string[]
    message: string
    name: string
    params: Object[]
    path: string[]
    schemaId: string
}

declare class Response{
    definition: Object
    definitionFullyResolved: Object
    operationObject: Operation
    pathToDefinition: string[]
    ptr: string
    statusCode: string

    getExample(mimeType: string): string
    getSample(): Object
    validateResponse(response: Response): ValidationResults
}

declare class Parameter{
    definition: Object
    definitionFullyResolved: Object
    operationObject: Operation
    pathObject: Path
    pathToDefinition: string[]
    ptr: string
    schema: Object

    getSample() : Object
    getValue(request : Request): ParameterValue
}

declare class Path{
    api: SwaggerApi
    definition: Object
    definitionFullyResolved: Object
    operationObjects: Operation[]
    parameterObjects: Parameter[]
    path: string
    pathToDefinition: string[]
    ptr: string
    regexp: RegExp

    getOperation(method : string): Operation[]
    getOperations(): Operation[]
    getOperationsByTag(tag): Operation[]
    getParameters(): Parameter[]
}

declare class ParameterValue{
    error: Error
    parameterObject: Parameter
    raw: Object
    valid: boolean
    value: Object
}