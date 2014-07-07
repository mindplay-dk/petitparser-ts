// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

module petitparser {
    
    /**
     * A parser that delegates to another one. Normally users do not need to
     * directly use a delegate parser.
     */
    export class DelegateParser extends Parser {
    
        /** @protected */
        _delegate: Parser;
    
        constructor(delegate: Parser) {
            super();
            this._delegate = delegate;
        }
    
        /** @override */
        parseOn(context: Context): Result {
            return this._delegate.parseOn(context);
        }
    
        /** @override */
        getChildren(): Parser[] { return [this._delegate] }
    
        /** @override */
        replace(source: Parser, target: Parser): void {
            super.replace(source, target);
            if (this._delegate === source) {
                this._delegate = target;
            }
        }
    
        /** @override */
        copy(): Parser { return new DelegateParser(this._delegate) }
    
        toString(): string { return 'DelegateParser'; }
    
    }
    
    /**
     * A parser that succeeds only at the end of the input.
     */
    class _EndOfInputParser extends DelegateParser {
    
        private _message: string;
    
        constructor(parser: Parser, message: string) {
            super(parser);
            this._message = message;
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var result = this._delegate.parseOn(context);
            if (result.isFailure() || result.getPosition() === result.getBuffer().length) {
                return result;
            }
            return result.failure(this._message, result.getPosition());
        }
    
        /** @override */
        toString(): string { return super.toString() + '[' + this._message + ']' }
    
        /** @override */
        copy(): Parser { return new _EndOfInputParser(this._delegate, this._message) }
    
        /** @override */
        match(other: any, seen?: Parser[]): boolean {
            return super.match(other, seen) && this._message === other._message;
        }
    
    }
    
    /**
     * The and-predicate, a parser that succeeds whenever its delegate does, but
     * does not consume the input stream [Parr 1994, 1995].
     */
    class _AndParser extends DelegateParser {
    
        constructor(parser: Parser) {
            super(parser);
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var result = this._delegate.parseOn(context);
            if (result.isSuccess()) {
                return context.success(result.getValue);
            } else {
                return result;
            }
        }
    
        /** @override */
        copy(): Parser { return new _AndParser(this._delegate) }
    
    }
    
    /**
     * The not-predicate, a parser that succeeds whenever its delegate does not,
     * but consumes no input [Parr 1994, 1995].
     */
    class _NotParser extends DelegateParser {
    
        private _message: string;
    
        constructor(parser: Parser, message: string) {
            super(parser);
            this._message = message;
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var result = this._delegate.parseOn(context);
            if (result.isFailure()) {
                return context.success(null);
            } else {
                return context.failure(this._message);
            }
        }
    
        /** @override */
        toString(): string { return super.toString() + '[' + this._message + ']' }
    
        /** @override */
        copy(): Parser { return new _NotParser(this._delegate, this._message) }
    
        /** @override */
        match(other: any, seen?: Parser[]): boolean {
            return super.match(other, seen) && this._message === other._message;
        }
    
    }
    
    /**
     * A parser that optionally parsers its delegate, or answers nil.
     */
    export class _OptionalParser extends DelegateParser {
    
        private _otherwise: any;
    
        constructor(parser: Parser, otherwise: any) {
            super(parser);
            this._otherwise = otherwise;
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var result = this._delegate.parseOn(context);
            if (result.isSuccess()) {
                return result;
            } else {
                return context.success(this._otherwise);
            }
        }
    
        /** @override */
        copy(): Parser { return new _OptionalParser(this._delegate, this._otherwise) }
    
        /** @override */
        match(other: any, seen?: Parser[]): boolean {
            return super.match(other, seen) && this._otherwise === other._otherwise;
        }
    
    }
    
    /**
     * Abstract parser that parses a list of things in some way.
     * @abstract
     */
    export class ListParser extends Parser {
    
        /** @protected */
        _parsers: Parser[];
    
        constructor(parsers: Parser[]) {
            super();
            this._parsers = parsers;
        }
    
        /** @override */
        getChildren(): Parser[] { return this._parsers }
    
        /** @override */
        replace(source: Parser, target: Parser): void {
            super.replace(source, target);
            for (var i = 0; i < this._parsers.length; i++) {
                if (this._parsers[i] === source) {
                    this._parsers[i] = target;
                }
            }
        }
    
    }
    
    /**
     * A parser that uses the first parser that succeeds.
     */
    export class _ChoiceParser extends ListParser {
    
        constructor(parsers: Parser[]) {
            var copy: Parser[] = [];
            for (var i = 0; i < parsers.length; i++) {
                copy.push(parsers[i]);
            }
            super(copy);
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var result;
            for (var i = 0; i < this._parsers.length; i++) {
                result = this._parsers[i].parseOn(context);
                if (result.isSuccess()) {
                    return result;
                }
            }
            return result;
        }
    
        /** @override */
        or(other: Parser): Parser {
            var parsers: Parser[] = [];
            for (var i = 0; i < this._parsers.length; i++) {
                parsers.push(this._parsers[i]);
            }
            parsers.push(other);
            return new _ChoiceParser(parsers);
        }
    
        /** @override */
        copy(): Parser { return new _ChoiceParser(this._parsers) }
    
    }
    
    /**
     * A parser that parses a sequence of parsers.
     */
    export class _SequenceParser extends ListParser {
    
        constructor(parsers: Parser[]) {
            var copy: Parser[] = [];
            for (var i = 0; i < parsers.length; i++) {
                copy.push(parsers[i]);
            }
            super(copy);
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var current = context;
            var elements = [];
            for (var i = 0; i < this._parsers.length; i++) {
                var result = this._parsers[i].parseOn(current);
                if (result.isFailure()) {
                    return result;
                }
                elements[i] = result.getValue();
                current = result;
            }
            return current.success(elements);
        }
    
        /** @override */
        seq(other: Parser): Parser {
            var parsers: Parser[] = [];
            for (var i = 0; i < this._parsers.length; i++) {
                parsers.push(this._parsers[i]);
            }
            parsers.push(other);
            return new _SequenceParser(parsers);
        }
    
        /** @override */
        copy(): Parser { return new _SequenceParser(this._parsers) }
    
    }
}
