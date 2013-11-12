/**
 * Base class for Error types
 * @abstract
 */
export class ErrorType {
    constructor(error: Error) {
        error.name = this['constructor'].name;
        error.message = this.toString() || error.message || error.name;
        error['type'] = this;

        return error;
    }

    /** @abstract */
    toString(): string { return null }
}

/**
 * Error raised when somebody tries to modify a [CompositeParser] outside
 * the [CompositeParser.initialize] method.
 */
export class CompletedParserError extends ErrorType {
    constructor(error: Error) {
        return super(error);
    }
    toString(): string { return 'Completed parser' }
}

/**
 * Error raised when an undefined production is accessed.
 */
export class UndefinedProductionError extends ErrorType {
    name: string;
    constructor(error: Error, name: string) {
        this.name = name;
        return super(error);
    }
    toString(): string { return 'Undefined production: ' + this.name }
}

/**
 * Error raised when a production is accidentally redefined.
 */
export class RedefinedProductionError extends ErrorType {
    name: string;
    constructor(error: Error, name: string) {
        this.name = name;
        return super(error);
    }
    toString(): string { return 'Redefined production: ' + this.name }
}

/**
 * Error raised when an invalid argument is passed.
 */
export class ArgumentError extends ErrorType {
    constructor(error: Error) {
        return super(error);
    }
    toString(): string { return 'Completed parser' }
}

/**
 * An exception raised in case of a parse error.
 */
export class ParserError extends ErrorType {
    private _failure: Failure;
    constructor(error: Error, failure: Failure) {
        this._failure = failure;
        return super(error);
    }
    toString(): string { return this._failure._message + ' at ' + this._failure.toPositionString() }
}
