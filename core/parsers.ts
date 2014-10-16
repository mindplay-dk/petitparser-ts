// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

module petitparser {
    
    /**
     * Returns a parser that consumes nothing and succeeds.
     *
     * For example, [:char('a').or(epsilon()):] is equivalent to
     * [:char('a').optional():].
     */
    export function epsilon(result?: any): Parser { return new _EpsilonParser(result) }
    
    class _EpsilonParser extends Parser {
    
        private _result: any;
    
        constructor(result?: any) {
            super();
            this._result = result;
        }
    
        /** @override */
        parseOn(context: Context): Result { return context.success(this._result) }
    
        /** @override */
        copy(): Parser { return new _EpsilonParser(this._result) }
    
        /** @override */
        match(other: any, seen?: Parser[]): boolean {
            return super.match(other, seen) && this._result == other._result;
        }
    }
    
    /**
     * Returns a parser that consumes nothing and fails.
     *
     * For example, [:failure():] always fails, no matter what input it is given.
     */
    export function failure(message = 'unable to parse'): Parser {
        return new _FailureParser(message);
    }
    
    class _FailureParser extends Parser {
    
        private _message: string;
    
        constructor(message: string) {
            super();
            this._message = message;
        }
    
        /** @override */
        parseOn(context: Context): Result { return context.failure(this._message) }
    
        /** @override */
        toString(): string { return super.toString() + '[' + this._message + ']' }
        // TODO there is no super.toString()
    
        /** @override */
        copy(): Parser { return new _FailureParser(this._message) }
    
        /** @override */
        match(other: any, seen?: Parser[]): boolean {
            return super.match(other, seen) && this._message == other._message;
        }
    
    }
    
    /**
     * Returns a parser that is not defined, but that can be set at a later
     * point in time.
     *
     * For example, the following code sets up a parser that points to itself
     * and that accepts a sequence of a's ended with the letter b.
     *
     *     var p = undefined();
     *     p.set(char('a').seq(p).or(char('b')));
     */
    export function undefined_(message = 'undefined parser'): SetableParser {
        return failure(message).setable();
    }
    
    /**
     * Interface of a parser that can be redefined using [SetableParser.set].
     * @abstract
     */
    export class SetableParser extends DelegateParser {
    
        constructor(parser: Parser) {
            super(parser);
        }
    
        // TODO constructor
        // _SetableParser(parser) : super(parser);
    
        set(parser: Parser): void { return this.replace(this.getChildren()[0], parser) }
    
        copy(): Parser { return new SetableParser(this._delegate) }
    
    }
}
