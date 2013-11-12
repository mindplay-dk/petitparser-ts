// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

/// <reference path="token.ts" />

/**
 * An immutable parse context.
 */
export class Context {

    private _buffer: string;
    private _position: number;

    constructor(buffer: string, position: number) {
        this._buffer = buffer;
        this._position = position;
    }

    /** The buffer we are working on. */
    getBuffer(): string { return this._buffer }

    /** The current position in the buffer. */
    getPosition(): number { return this._position }

    /** Returns [true] if this result indicates a parse success. */
    isSuccess(): boolean { return false }

    /** Returns [true] if this result indicates a parse failure. */
    isFailure(): boolean { return false }

    /** Returns a result indicating a parse success. */
    success(result: any, position?: number): Result {
        return new Success(this._buffer, this._position || position, result);
    }

    /** Returns a result indicating a parse failure. */
    failure(message: string, position?: number): Result {
        return new Failure(this._buffer, this._position || position, message);
    }

    /** Returns a human readable string of the current context */
    toString(): String { return 'Context[' +  this.toPositionString() + ']' }

    /** Returns the line:column if the input is a string, otherwise the position. */
    toPositionString(): string {
        if (typeof this._buffer === 'string') {
            var lineAndColumn = Token.lineAndColumnOf(this._buffer, this._position);
            return lineAndColumn[0] + ':' + lineAndColumn[1];
        } else {
            return this._position.toString();
        }
    }
}

/**
 * An immutable parse result.
 * @abstract
 */
export class Result extends Context {

    constructor (buffer: string, position: number) {
        super(buffer, position);
    }

    /**
     * Returns the parse result of the current context.
     * @abstract
     */
    getValue(): any { throw new Error(ABSTRACT) }

    /**
     * Returns the parse message of the current context.
     * @abstract
     */
    getMessage(): string { throw new Error(ABSTRACT) }

}

/**
 * An immutable parse result in case of a successful parse.
 */
export class Success extends Result {
    private _value: any;
    constructor(buffer: string, position: number, value: any) {
        super(buffer, position);
        this._value = value;
    }
    isSuccess(): boolean { return true }
    getValue(): any { return this._value }
    getMessage(): string { return null }
    toString(): string { return 'Success[ ' + this.toPositionString() + ']: ' + this._value }
}

/**
 * An immutable parse result in case of a failed parse.
 */
export class Failure extends Result {
    /** @protected */
    _message: string;
    constructor(buffer: string, position: number, message: string) {
        super(buffer, position);
        this._message = message;
    }
    isFailure(): boolean { return true }
    getValue(): any { throw new ParserError(new Error(), this) }
    getMessage(): string { return this._message }
    toString(): string { return 'Failure[' + this.toPositionString() + ']: ' + this._message }
}

// ParserError moved into "errors.ts"
