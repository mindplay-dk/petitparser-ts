// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

module petitparser {

    interface ParserMap<TParser> {
        [index: string]: TParser
    }
    
    /**
     * Helper to compose complex grammars from various primitive parsers.
     *
     * To create a new composite grammar subclass [CompositeParser]. Override
     * the method [initialize] and for every production call [def] giving the
     * production a name. The start production must be named 'start'. To refer
     * to other produtions (forward and backward) use [ref].
     *
     * Consider the following example to parse a list of numbers:
     *
     *     class NumberListGrammar extends CompositeParser {
     *       void initialize() {
     *         def('start', ref('list').end());
     *         def('list', ref('element').separatedBy(char(','),
     *           includeSeparators: false));
     *         def('element', digit().plus().flatten());
     *       }
     *     }
     *
     * You might want to create future subclasses of your composite grammar
     * to redefine the grammar or attach custom actions. In such a subclass
     * override the method [initialize] again and call super. Then use
     * [redef] to redefine an existing production, and [action] to attach an
     * action to an existing production.
     *
     * Consider the following example that attaches a production action and
     * converts the digits to actual numbers:
     *
     *     class NumberListParser extends NumberListGrammar {
     *       void initialize() {
     *         action('element', (value) => int.parse(value));
     *       }
     *     }
     *
     * @abstract
     */
    export class CompositeParser extends DelegateParser {
    
        private _completed: boolean = false;
        private _defined: ParserMap<Parser> = {};
        private _undefined: ParserMap<SetableParser> = {};
    
        constructor() {
            super(failure('Uninitalized production: start'));
            this.initialize();
            this._complete();
        }
    
        /**
         * Initializes the composite grammar.
         */
        initialize(): void { throw new Error(ABSTRACT) }
    
        /**
         * Internal method to complete the grammar.
         */
        _complete(): void {
            this._delegate = this.ref('start');
            for (var name in this._undefined) {
                if (this._defined[name] === undefined) {
                    throw petitparser.error.undefinedProduction(new Error(), name);
                }
                var parser = this._undefined[name];
                parser.set(this._defined[name]);
            }
            this._undefined = {};
            this._completed = true;
            // TODO this._delegate = removeSetables(this.ref('start'));
        }
    
        /**
         * Returns a reference to a production with a [name].
         *
         * This method works during initialization and after completion of the
         * initialization. During the initialization it returns delegate parsers
         * that are eventually replaced by the real parsers. Afterwards it
         * returns the defined parser (mostly useful for testing).
         */
        ref(name: string): Parser {
            if (this._completed) {
                if (this._defined[name] !== undefined) {
                    return this._defined[name];
                } else {
                    throw petitparser.error.undefinedProduction(new Error(), name);
                }
            } else {
                if (!this._undefined[name]) {
                    this._undefined[name] = failure('Uninitalized production: ' + name).setable();
                }
                return this._undefined[name];
            }
        }
    
        /**
         * Convenience operator returning a reference to a production with
         * a [name]. See [CompositeParser.ref] for details.
         */
        // Parser operator [](String name) => ref(name);
    
        /**
         * Defines a production with a [name] and a [parser]. Only call this method
         * from [initialize].
         *
         * The following example defines a list production that consumes
         * several elements separated by a comma.
         *
         *     def('list', ref('element').separatedBy(char(',')));
         */
        def(name: string, parser: Parser): void {
            if (this._completed) {
                throw petitparser.error.completedParser(new Error());
            } else if (this._defined[name] !== undefined) {
                throw petitparser.error.redefinedProduction(new Error(), name);
            } else {
                this._defined[name] = parser;
            }
        }
    
        /**
         * Redefinies an existing production with a [name] and a [replacement]
         * parser or function producing a new parser. The code raises an
         * [UndefinedProductionError] if [name] is an undefined production. Only call
         * this method from [initialize].
         *
         * The following example redefines the previously defined list production
         * by making it optional:
         *
         *     redef('list', (parser) => parser.optional());
         */
        redef(name: string, replacement: Parser);
        redef(name: string, replacement: (parser: Parser) => Parser);
        redef(name: string, replacement: any): void {
            if (this._completed) {
                throw petitparser.error.completedParser(new Error());
            } else if (this._defined[name] === undefined) {
                throw petitparser.error.undefinedProduction(new Error(), name);
            } else {
                this._defined[name] = replacement instanceof Parser
                    ? replacement
                    : replacement(this._defined[name]);
            }
        }
    
        /**
         * Attaches an action [function] to an existing production [name]. The code
         * raises an [UndefinedProductionError] if [name] is an undefined production.
         * Only call this method from [initialize].
         *
         * The following example attaches an action returning the size of list of
         * the previously defined list production:
         *
         *     action('list', (list) => list.length);
         */
        action(name: string, func: (parser: Parser) => any): void {
            this.redef(name, (parser: Parser) => parser.map(func));
        }
    
    }
}
