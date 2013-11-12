// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

/**
 * A parser that performs a transformation with a given function on the
 * successful parse result of the delegate.
 */
export class _ActionParser extends DelegateParser {

    private _func: Function;

    constructor(parser: Parser, func: Function) {
        super(parser);
        this._func = func;
    }

    /** @override */
    parseOn(context: Context): Result {
        var result = this._delegate.parseOn(context);
        if (result.isSuccess) {
             return result.success(this._func(result.getValue()));
        } else {
            return result;
        }
    }

    /** @override */
    copy(): Parser { return new _ActionParser(this._delegate, this._func) }

    /** @override */
    match(other: any, seen?: Parser[]): boolean {
        return super.match(other, seen) && this._func === other._func;
    }

}

/**
 * A parser that silently consumes input of a parser around its delegate.
 */
export class _TrimmingParser extends DelegateParser {

    private _trimmer: Parser;

    constructor(parser: Parser, trimmer: Parser) {
        super(parser);
        this._trimmer = trimmer;
    }

    /** @override */
    parseOn(context: Context): Result {
        var current = context;
        do {
            current = this._trimmer.parseOn(current);
        } while (current.isSuccess());
        var result = this._delegate.parseOn(current);
        if (result.isFailure) {
            return result;
        }
        current = result;
        do {
            current = this._trimmer.parseOn(current);
        } while (current.isSuccess());
        return current.success(result.getValue());
    }

    /** @override */
    copy(): Parser { return new _TrimmingParser(this._delegate, this._trimmer) }

    /** @override */
    getChildren(): Parser[] { return [this._delegate, this._trimmer] }

    /** @override */
    replace(source: Parser, target: Parser): void {
        super.replace(source, target);
        if (this._trimmer === source) {
            this._trimmer = target;
        }
    }

}

/**
 * A parser that answers a substring or sublist of the range its delegate
 * parses.
 */
export class _FlattenParser extends DelegateParser {

    constructor(parser: Parser) {
        super(parser);
    }

    /** @override */
    parseOn(context: Context) :Result {
        var result = this._delegate.parseOn(context);
        if (result.isSuccess()) {
            // TODO ugly type-check
            var output = context.getBuffer()['constructor'] === String
                ? context.getBuffer().substring(context.getPosition(), result.getPosition())
                : context.getBuffer().slice(context.getPosition(), result.getPosition());
            return result.success(output);
        } else {
            return result;
        }
    }

    /** @override */
    copy(): Parser { return new _FlattenParser(this._delegate) }

}

/**
 * A parser that answers a token of the result its delegate parses.
 */
export class _TokenParser extends DelegateParser {

    constructor(parser: Parser) {
        super(parser);
    }

    /** @override */
    parseOn(context: Context): Result {
        var result = this._delegate.parseOn(context);
        if (result.isSuccess) {
            var token = new Token(result.getValue, context.getBuffer(),
            context.getPosition(), result.getPosition());
            return result.success(token);
        } else {
            return result;
        }
    }

    /** @override */
    copy(): Parser { return new _TokenParser(this._delegate) }

}
