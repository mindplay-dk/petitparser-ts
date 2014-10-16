// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

module petitparser {
    
    /**
     * Returns a lazy iterable over all parsers reachable from a [root]. Do
     * not modify the grammar while iterating over it, otherwise you might
     * get unexpected results.
     */
    function allParser(root: Parser): IterableBase<Parser> {
        return new _ParserIterable(root);
    }
    
    interface IterableBase<T> {
        forEach: (T) => void;
    }
    
    interface Iterator<T> {
        current: T;
        moveNext: () => boolean;
    }
    
    class _ParserIterable implements IterableBase<Parser> {
        private _root: Parser;
        constructor (root: Parser) {
            this._root = root;
        }
        getIterator(): Iterator<Parser> { return new _ParserIterator(this._root) }
        forEach(fn: (Parser) => void) {
            var it = this.getIterator();
            while (it.moveNext()) {
                fn(it.current);
            }
        }
    }
    
    class _ParserIterator implements Iterator<Parser> {
        private _todo: Parser[];
        private _done: Parser[];
        current: Parser;
        constructor(root: Parser) {
            this._todo = [root];
            this._done = [];
        }
        moveNext(): boolean {
            do {
                if (this._todo.length === 0) {
                    this.current = null;
                    return false;
                }
                this.current = this._todo.pop();
            } while (this._done.indexOf(this.current) >= 0);
            this._done.push(this.current);
            var children = this.current.getChildren();
            for (var i = 0; i < children.length; i++) {
                this._todo.push(children[i]);
            }
            return true;
        }
    }
    
    /**
     * Transforms all parsers reachable from [root] with the given [function].
     * The identity function returns a copy of the the incoming parser.
     *
     * The implementation first creates a copy of each parser reachable in the
     * input grammar; then the resulting grammar is iteratively transfered and
     * all old parsers are replaced with the transformed ones until we end up
     * with a completely new grammar.
     */
    function transformParser(root: Parser, func: (parser: Parser) => Parser): Parser {
        // TODO we don't have a Map type in JS/TS
        var mapping = new Map<number,Parser>();
        allParser(root).forEach((parser: Parser) => {
            mapping[parser._id] = func(parser.copy());
        });
        while (true) {
            var changed = false;
            allParser(mapping[root._id]).forEach((parser: Parser) => {
                parser.getChildren().forEach((source: Parser) => {
                    if (mapping.has(source._id)) {
                        parser.replace(source, mapping[source._id]);
                        changed = true;
                    }
                });
            });
            if (!changed) {
                return mapping[root._id];
            }
        }
    }
    
    /**
     * Removes all setable parsers reachable from [root] in-place.
     */
    function removeSetables(root: Parser): Parser {
        allParser(root).forEach((parent: Parser) => {
            parent.getChildren().forEach((source: Parser) => {
                var target = _removeSetable(source);
                if (source !== target) {
                    parent.replace(source, target);
                }
            });
        });
        return _removeSetable(root);
    }
    
    function _removeSetable(parser: Parser): Parser {
        while (parser instanceof SetableParser) {
            parser = parser.getChildren()[0];
        }
        return parser;
    }
    
    /**
     * Removes duplicated parsers reachable from [root] in-place.
     */
    function removeDuplicates(root: Parser): Parser {
        var uniques = new Set();
        allParser(root).forEach((parent: Parser) => {
            parent.getChildren().forEach((source: Parser) => {
                var target = uniques.firstWhere((each) => {
                    return source != each && source.match(each);
                }, /* orElse: */ () => null);
                if (target === null) {
                    uniques.add(source); // TODO
                } else {
                    parent.replace(source, target);
                }
            });
        });
        return root;
    }
    
    /**
     * Adds debug handlers to each parser reachable from [root].
     */
    function debug(root: Parser): Parser {
        var level = 0;
        return transformParser(root, (parser: Parser) => {
            return new _ContinuationParser(parser, (context, continuation) => {
                // TODO
                print(_repeat(level, '  ') + parser);
                level++;
                var result = continuation(context);
                level--;
                print(_repeat(level, '  ') + result);
                return result;
            });
        });
    }
    
    function _repeat(count: number, value: string): string {
        var result = '';
        for (var i = 0; i < count; i++) {
            result += value;
        }
        return result;
    }
    
    /**
     * Adds progress handlers to each parser reachable from [root].
     */
    function progress(root: Parser): Parser {
        return transformParser(root, (parser: Parser) => {
            return new _ContinuationParser(parser, (context: Context, continuation: Function) => {
                print(_repeat(context.getPosition(), '*') + parser);
                return continuation(context);
            });
        });
    }
    
    /**
     * Adds profiling handlers to each parser reachable from [root].
     */
    function profile(root: Parser): Parser {
        var count = new Map();
        var watch = new Map();
        var parsers: Parser[] = [];
        return new _ContinuationParser(transformParser(root, (parser: Parser) => {
            parsers.push(parser);
            return new _ContinuationParser(parser, (context: Context, continuation: Function) => {
                count[parser]++;
                watch[parser].start();
                var result = continuation(context);
                watch[parser].stop();
                return result;
            });
        }), (context: Context, continuation: Function) => {
            parsers.forEach((parser: Parser) => {
                count[parser] = 0;
                watch[parser] = new Stopwatch();
            });
            var result = continuation(context);
            parsers.forEach((parser: Parser) => {
                print(count[parser] + "\t" + watch[parser].elapsedMicroseconds + "\t" + parser);
            });
            return result;
        });
    }
    
    interface _ContinuationHandler {
        (context: Context, continuation: Function): Result;
    }
    
    class _ContinuationParser extends DelegateParser {
    
        private _handler: _ContinuationHandler;
    
        constructor(parser: Parser, handler: _ContinuationHandler) {
            super(parser);
            this._handler = handler;
        }
    
        /** @override */
        parseOn(context: Context): Result {
            return this._handler(context, (result) => this._delegate.parseOn(result));
        }
    
        /** @override */
        copy(): Parser { return new _ContinuationParser(this._delegate, this._handler) }
    
    }
}
