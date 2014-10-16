// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

module petitparser {
    
    /**
     * Parser class for individual character classes.
     */
    class _CharacterParser extends Parser {
    
        private _matcher: _CharMatcher;
    
        private _message: string;
    
        constructor(matcher: _CharMatcher, message: string) {
            super();
            this._matcher = matcher;
            this._message = message;
        }
    
        /** @override */
        parseOn(context: Context): Result {
            var buffer = context.getBuffer();
            var position = context.getPosition();
            if (position < buffer.length && this._matcher.match(buffer.charCodeAt(position))) {
                return context.success(buffer[position], position + 1);
            }
            return context.failure(this._message);
        }
    
        /** @override */
        toString(): string { return super.toString() + '[' + this._message + ']' }
    
        /** @override */
        copy(): Parser { return new _CharacterParser(this._matcher, this._message) }
    
        /** @override */
        match(other: any, seen?: Parser[]) {
            // TODO test/review this
            return super.match(other, seen)
                && this._matcher === other._matcher
                && this._message === other._message;
        }
    
    }
    
    /** Internal method to convert an element to a character code. */
    function _toCharCode(element: any): number {
        // TODO not needed in JavaScript?
        if (element['constructor'] === Number) {
            return Math.round(element);
        }
        var value = element.toString();
        if (value.length != 1) {
            throw petitparser.error.argumentError(new Error(), value + ' is not a character');
        }
        return value.charCodeAt(0);
    }
    
    /**
     * Internal abstract character matcher class.
     * @abstract
     */
    class _CharMatcher {
        // constructor() {}
        match(value: number): boolean { throw new Error(ABSTRACT) }
    }
    
    /** Internal character matcher that negates the result. */
    class _NotCharMatcher extends _CharMatcher {
        private _matcher: _CharMatcher;
        constructor(matcher: _CharMatcher) {
            super();
            this._matcher = matcher;
        }
        match(value: number): boolean { return ! this._matcher.match(value) }
    }
    
    /** Internal character matcher for alternatives. */
    class _AltCharMatcher extends _CharMatcher {
        private _matchers: _CharMatcher[];
        constructor(matchers: _CharMatcher[]) {
            super();
            this._matchers = matchers;
        }
        match(value: number): boolean {
            for (var i = 0; i < this._matchers.length; i++) {
                if (this._matchers[i].match(value)) {
                    return true;
                }
            }
            return false;
        }
    }
    
    /** Internal character matcher that does a binary search. */
    class _BinarySearchCharMatcher extends _CharMatcher {
        private _codes: number[];
        constructor(codes: number[]) {
            super();
            this._codes = codes;
        }
        match(value: number): boolean {
            var lo = 0;
            var hi = this._codes.length - 1;
            while (lo <= hi) {
                var index = Math.floor((lo + hi) * 0.5);
                if (value < this._codes[index]) {
                    hi = index - 1;
                } else if (value > this._codes[index]) {
                    lo = index + 1;
                } else {
                    return true;
                }
            }
            return false;
        }
    }
    
    /** Returns a parser that accepts a specific character only. */
    export function char(element: any, message?: string): Parser {
        return new _CharacterParser(
            new _SingleCharMatcher(_toCharCode(element)),
            message || element + ' expected');
    }
    
    class _SingleCharMatcher extends _CharMatcher {
        private _value: number;
        constructor(value: number) {
            super();
            this._value = value;
        }
        match(value: number): boolean { return this._value === value }
    }
    
    /** Returns a parser that accepts any digit character. */
    export function digit(message?: string): Parser {
        return new _CharacterParser(
            _digitCharMatcher,
            message || 'digit expected');
    }
    
    class _DigitCharMatcher extends _CharMatcher {
        // constructor() {}
        match(value: number): boolean { return value >= 48 && value <= 57 }
    }
    
    var _digitCharMatcher: _DigitCharMatcher = new _DigitCharMatcher();
    
    /** Returns a parser that accepts any letter character. */
    export function letter(message?: string): Parser {
        return new _CharacterParser(
            _letterCharMatcher,
            message || 'letter expected');
    }
    
    class _LetterCharMatcher extends _CharMatcher {
        // constructor() {}
        match(value: number): boolean { return (value >= 65 && value <= 90) || (value >= 97 && value <= 122) }
    }
    
    var _letterCharMatcher: _LetterCharMatcher = new _LetterCharMatcher();
    
    /** Returns a parser that accepts any lowercase character. */
    export function lowercase(message?: string): Parser {
        return new _CharacterParser(
            _lowercaseCharMatcher,
            message || 'lowercase letter expected');
    }
    
    class _LowercaseCharMatcher extends _CharMatcher {
        // constructor() {}
        match(value: number): boolean { return value >= 97 && value <= 122 }
    }
    
    var _lowercaseCharMatcher: _LowercaseCharMatcher = new _LowercaseCharMatcher();
    
    /** Returns a parser that accepts the given character class pattern. */
    export function pattern(element: string, message?: string): Parser {
        if (_pattern === null) {
            var single = some().map((each) =>
                new _SingleCharMatcher(_toCharCode(each))
            );
            var multiple = some().seq(char('-')).seq(some()).map((each) =>
                new _RangeCharMatcher(_toCharCode(each[0]), _toCharCode(each[2]))
            );
            var positive = multiple.or(single).plus().map((each) =>
                each.length === 1 ? each[0] : new _AltCharMatcher(each)
            );
            _pattern = char('^').optional().seq(positive).map((each) =>
                each[0] === null ? each[1] : new _NotCharMatcher(each[1])
            );
        }
        return new _CharacterParser(
            _pattern.parse(element).getValue(),
            message != null ? message : '[$element] expected');
    }
    
    var _pattern: Parser;
    
    /** Returns a parser that accepts any character in the range between [start] and [stop]. */
    export function range(start: string, stop: string, message?: string): Parser;
    export function range(start: number, stop: number, message?: string): Parser;
    export function range(start: any, stop: any, message?: string): Parser {
        return new _CharacterParser(
            new _RangeCharMatcher(_toCharCode(start), _toCharCode(stop)),
            message || start + '..' + stop + ' expected');
    }
    
    class _RangeCharMatcher extends _CharMatcher {
        private _start: number;
        private _stop: number;
        constructor(start: number, stop: number) {
            super();
            this._start = start;
            this._stop = stop;
        }
        match(value: number): boolean { return value >= this._start && value <= this._stop }
    }
    
    /** Returns a parser that accepts any uppercase character. */
    export function uppercase(message?: string): Parser {
        return new _CharacterParser(
            _uppercaseCharMatcher,
            message || 'uppercase letter expected');
    }
    
    class _UppercaseCharMatcher extends _CharMatcher {
        // constructor() {}
        match(value: number): boolean { return value >= 65 && value <= 90 }
    }
    
    // TODO private
    var _uppercaseCharMatcher: _UppercaseCharMatcher = new _UppercaseCharMatcher();
    
    /** Returns a parser that accepts any whitespace character. */
    export function whitespace(message?: string): Parser {
        return new _CharacterParser(
            _whitespaceCharMatcher,
            message || 'whitespace expected');
    }
    
    class _WhitespaceCharMatcher extends _CharMatcher {
        // constructor() {}
        match(value: number): boolean {
            if (value < 256) {
                return value == 0x09 || value == 0x0A || value == 0x0B || value == 0x0C
                || value == 0x0D || value == 0x20 || value == 0x85 || value == 0xA0;
            } else {
                return value == 0x1680 || value == 0x180E || value == 0x2000 || value == 0x2001
                    || value == 0x2002 || value == 0x2003 || value == 0x2004 || value == 0x2005
                    || value == 0x2006 || value == 0x2007 || value == 0x2008 || value == 0x2009
                    || value == 0x200A || value == 0x2028 || value == 0x2029 || value == 0x202F
                    || value == 0x205F || value == 0x3000 || value == 0xFEFF;
            }
        }
    }
    
    var _whitespaceCharMatcher: _WhitespaceCharMatcher = new _WhitespaceCharMatcher();
    
    /** Returns a parser that accepts any word character. */
    export function word(message?: string): Parser {
        return new _CharacterParser(
            _wordCharMatcher,
            message || 'letter or digit expected');
    }
    
    class _WordCharMatcher extends _CharMatcher {
        // constructor() {}
        match(value: number): boolean {
            return (65 <= value && value <= 90) || (97 <= value && value <= 122)
                || (48 <= value && value <= 57) || (value == 95);
        }
    }
    
    var _wordCharMatcher: _WordCharMatcher = new _WordCharMatcher();
}
