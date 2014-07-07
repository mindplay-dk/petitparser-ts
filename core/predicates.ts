// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

module petitparser {
    
    /**
     * Returns a parser that accepts any input element.
     *
     * For example, [:any():] succeeds and consumes any given letter. It only
     * fails for an empty input.
     */
    export function any(message = 'input expected'): Parser {
        return new _AnyParser(message);
    }
    
    class _AnyParser extends Parser {
    
        private _message: string;
    
        constructor(message: string) {
            super();
            this._message = message;
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var position = context.getPosition();
            var buffer = context.getBuffer();
            return position < buffer.length
                ? context.success(buffer[position], position + 1)
                : context.failure(this._message);
        }
    
        // TODO toString in Parser?
        /** @override */
        toString(): string { return super.toString() + '[' + this._message + ']' }
    
        /** @override */
        copy(): Parser { return new _AnyParser(this._message) }
    
        /** @override */
        match(other: any, seen?: Parser[]): boolean {
            return super.match(other, seen)
                && this._message === other._message;
        }
    
    }
    
    /**
     * Returns a parser that accepts any of the [elements].
     *
     * For example, [:anyIn('ab'):] succeeds and consumes either the letter
     * [:'a':] or the letter [:'b':]. For any other input the parser fails.
     */
    export function anyIn(elements: any[], message?: string): Parser {
        return predicate(1,
            (each) => elements.indexOf(each) >= 0,
            message || 'any of ' + elements + ' expected');
    }
    
    /**
     * Returns a parser that accepts the string [element].
     *
     * For example, [:string('foo'):] succeeds and consumes the input string
     * [:'foo':]. Fails for any other input.
     */
    export function string(element: string, message?: string): Parser {
        return predicate(element.length,
            (each: string) => element === each,
            message || element + ' expected');
    }
    
    /**
     * Returns a parser that accepts the string [element] ignoring the case.
     *
     * For example, [:stringIgnoreCase('foo'):] succeeds and consumes the input
     * string [:'Foo':] or [:'FOO':]. Fails for any other input.
     */
    export function stringIgnoreCase(element: string, message?: string): Parser {
        var lowerElement = element.toLowerCase();
        return predicate(element.length,
            (each: string) => lowerElement === each.toLowerCase(),
            message || element + ' expected');
    }
    
    /**
     * A generic predicate function returning [true] or [false] for a given
     * [input] argument.
     */
    export interface Predicate {
        (input: any): boolean;
    }
    
    /**
     * Returns a parser that reads input of the specified [length], accepts
     * it if the [predicate] matches, or fails with the given [message].
     */
    export function predicate(length: number, predicate: Predicate, message: string): Parser {
        return new _PredicateParser(length, predicate, message);
    }
    
    /**
     * A parser for a literal satisfying a predicate.
     */
    class _PredicateParser extends Parser {
    
        private _length: number;
        private _predicate: Predicate;
        private _message: string;
    
        constructor(length: number, predicate: Predicate, message: string) {
            super();
            this._length = length;
            this._predicate = predicate;
            this._message = message;
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var start = context.getPosition();
            var stop = start + this._length;
            if (stop <= context.getBuffer().length) {
                // TODO fix ugly typecheck
                var result = context.getBuffer()['constructor'] === String
                    ? context.getBuffer().substring(start, stop)
                   : context.getBuffer().slice(start, stop);
                if (this._predicate(result)) {
                    return context.success(result, stop);
                }
            }
            return context.failure(this._message);
        }
    
        /** @override */
        toString(): string { return super.toString() + '[' + this._message + ']' }
    
        /** @override */
        copy(): Parser { return new _PredicateParser(this._length, this._predicate, this._message) }
    
        /** @override */
        match(other: any, seen?: Parser[]): boolean {
            return super.match(other, seen)
                && this._length === other._length
                && this._predicate === other._predicate
                && this._message === other._message;
        }
    
    }
}
