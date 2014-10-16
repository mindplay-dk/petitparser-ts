// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

module petitparser {

    /**
     * A parser that repeatedly parses a sequence of parsers.
     * @abstract
     */
    export class _RepeatingParser extends DelegateParser {
    
        /** @protected */
        _min: number;
        /** @protected */
        _max: number;
    
        constructor(parser: Parser, min: number, max: number) {
            super(parser);
            this._min = min;
            this._max = max;
        }
    
        /** @override */
        toString(): string { return super.toString() + '[' + this._min + '..' + this._max + ']' }
    
        /** @override */
        match(other: any, seen?: Parser[]): boolean {
            return super.match(other, seen)
                && this._min == other._min
                && this._max == other._max;
        }
    
    }
    
    export class _PossessiveRepeatingParser extends _RepeatingParser {
    
        constructor(parser: Parser, min: number, max: number) {
            super(parser, min, max);
        }
    
        /** @override */ 
        parseOn(context: Context): Result {
            var current = context;
            var elements = [];
            while (elements.length < this._min) {
                var result = this._delegate.parseOn(current);
                if (result.isFailure()) {
                    return result;
                }
                elements.push(result.getValue());
                current = result;
            }
            while (elements.length < this._max) {
                var result = this._delegate.parseOn(current);
                if (result.isFailure()) {
                    return current.success(elements);
                }
                elements.push(result.getValue());
                current = result;
            }
            return current.success(elements);
        }
    
        /** @override */
        copy(): Parser { return new _PossessiveRepeatingParser(this._delegate, this._min, this._max) }
    
    }
    
    /**
     * An abstract parser that repeatedly parses between 'min' and 'max' instances of
     * my delegate and that requires the input to be completed with a specified parser
     * 'limit'. Subclasses provide repeating behavior as typically seen in regular
     * expression implementations (non-blind).
     * @abstract
     */
    export class _LimitedRepeatingParser extends _RepeatingParser {
    
        /** @protected */
        _limit: Parser;
    
        constructor(parser: Parser, limit: Parser, min: number, max: number) {
            super(parser, min, max);
            this._limit = limit;
        }
    
        /** @override */
        getChildren(): Parser[] { return  [this._delegate, this._limit] }
    
        /** @override */ 
        replace(source: Parser, target: Parser): void {
            super.replace(source, target);
            if (this._limit === source) {
                this._limit = target;
            }
        }
    
      /** @override */ 
        match(other: any, seen?: Parser[]): boolean {
            return super.match(other, seen) && this._limit.match(other._limit);
        }
    
    }
    
    /**
     * A greedy repeating parser, commonly seen in regular expression implementations. It
     * aggressively consumes as much input as possible and then backtracks to meet the
     * 'limit' condition.
     */
    export class _GreedyRepeatingParser extends _LimitedRepeatingParser {
    
        constructor(parser: Parser, limit: Parser, min: number, max: number) {
            super(parser, limit, min, max);
        }
    
        /** @override */ 
        parseOn(context: Context): Result {
            var current = context;
            var elements = [];
            while (elements.length < this._min) {
                var result = this._delegate.parseOn(current);
                if (result.isFailure()) {
                    return result;
                }
                elements.push(result.getValue());
                current = result;
            }
            var contexts: Context[] = [current];
            while (elements.length < this._max) {
                var result = this._delegate.parseOn(current);
                if (result.isFailure()) {
                    break;
                }
                elements.push(result.getValue());
                contexts.push(result);
                current = result;
            }
            while (true) {
                var limit = this._limit.parseOn(contexts[contexts.length-1]);
                if (limit.isSuccess()) {
                    return contexts[contexts.length-1].success(elements);
                }
                if (elements.length === 0) {
                    return limit;
                }
                contexts.pop();
                elements.pop();
                if (contexts.length === 0) {
                    return limit;
                }
            }
        }
    
        /** @override */
        copy(): Parser { return new _GreedyRepeatingParser(this._delegate, this._limit, this._min, this._max) }
    
    }
    
    /**
     * A lazy repeating parser, commonly seen in regular expression implementations. It
     * limits its consumption to meet the 'limit' condition as early as possible.
     */
    export class _LazyRepeatingParser extends _LimitedRepeatingParser {
    
        constructor(parser: Parser, limit: Parser, min: number, max: number) {
            super(parser, limit, min, max);
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var current = context;
            var elements = [];
            while (elements.length < this._min) {
                var result = this._delegate.parseOn(current);
                if (result.isFailure()) {
                    return result;
                }
                elements.push(result.getValue());
                current = result;
            }
            while (true) {
                var limit = this._limit.parseOn(current);
                if (limit.isSuccess()) {
                    return current.success(elements);
                } else {
                    if (elements.length >= this._max) {
                        return limit;
                    }
                    var result = this._delegate.parseOn(current);
                    if (result.isFailure()) {
                        return limit;
                    }
                    elements.push(result.getValue());
                    current = result;
                }
            }
        }
    
        /** @override */
        copy(): Parser { return new _LazyRepeatingParser(this._delegate, this._limit, this._min, this._max) }
    
    }

}
