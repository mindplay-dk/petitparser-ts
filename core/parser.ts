// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

export var ABSTRACT: string = "abstract method called";

/**
 * Abstract base class of all parsers.
 *
 * @abstract
 */
export class Parser {

    /**
     * Primitive method doing the actual parsing.
     *
     * The method is overridden in concrete subclasses to implement the
     * parser specific logic. The methods takes a parse [context] and
     * returns the resulting context, which is either a [Success] or
     * [Failure] context.
     *
     * @abstract
     */
    parseOn(context: Context): Result { throw new Error(ABSTRACT) }

    /**
     * Returns the parse result of the [input].
     *
     * The implementation creates a default parse context on the input and calls
     * the internal parsing logic of the receiving parser.
     *
     * For example, [:letter().plus().parse('abc'):] results in an instance of
     * [Success], where [Result.position] is [:3:] and [Success.value] is
     * [:[a, b, c]:].
     *
     * Similarly, [:letter().plus().parse('123'):] results in an instance of
     * [Failure], where [Result.position] is [:0:] and [Failure.message] is
     * ['letter expected'].
     */
    parse(input: string): Result {
        return this.parseOn(new Context(input, 0));
    }

    /**
     * Tests if the [input] can be successfully parsed.
     *
     * For example, [:letter().plus().accept('abc'):] returns [:true:], and
     * [:letter().plus().accept('123'):] returns [:false:].
     */
    accept(input: string): boolean {
        return this.parse(input).isSuccess();
    }

    /**
     * Returns a list of all successful overlapping parses of the [input].
     *
     * For example, [:letter().plus().matches('abc de'):] results in the list
     * [:[['a', 'b', 'c'], ['b', 'c'], ['c'], ['d', 'e'], ['e']]:]. See
     * [Parser.matchesSkipping] to retrieve non-overlapping parse results.
     */
    matches(input: string): any[] {
        var list = [];
        this.and().map((each) => list.push(each)).seq(any()).or(any()).star().parse(input);
        return list;
    }

    /**
     * Returns a list of all successful non-overlapping parses of the input.
     *
     * For example, [:letter().plus().matchesSkipping('abc de'):] results in the
     * list [:[['a', 'b', 'c'], ['d', 'e']]:]. See [Parser.matches] to retrieve
     * overlapping parse results.
     */
    matchesSkipping(input: string): any[] {
        var list = [];
        this.map((each) => list.push(each)).or(any()).star().parse(input);
        return list;
    }

    /**
     * Returns new parser that accepts the receiver, if possible. The resulting
     * parser returns the result of the receiver, or [:null:] if not applicable.
     * The returned value can be provided as an optional argument [otherwise].
     *
     * For example, the parser [:letter().optional():] accepts a letter as input
     * and returns that letter. When given something else the parser succeeds as
     * well, does not consume anything and returns [:null:].
     */
    optional(otherwise?: any): Parser { return new _OptionalParser(this, otherwise) }

    /**
     * Returns a parser that accepts the receiver zero or more times. The
     * resulting parser returns a list of the parse results of the receiver.
     *
     * This is a greedy and blind implementation that tries to consume as much
     * input as possible and that does not consider what comes afterwards.
     *
     * For example, the parser [:letter().star():] accepts the empty string or
     * any sequence of letters and returns a possibly empty list of the parsed
     * letters.
     */
    star(): Parser { return this.repeat(0, 65536) }

    /**
     * Returns a parser that parses the receiver zero or more times until it
     * reaches a [limit]. This is a greedy non-blind implementation of the
     * [Parser.star] operator. The [limit] is not consumed.
     */
    starGreedy(limit: Parser): Parser { return this.repeatGreedy(limit, 0, 65536) }

    /**
     * Returns a parser that parses the receiver zero or more times until it
     * reaches a [limit]. This is a lazy non-blind implementation of the
     * [Parser.star] operator. The [limit] is not consumed.
     */
    starLazy(limit: Parser): Parser { return this.repeatLazy(limit, 0, 65536) }

    /**
     * Returns a parser that accepts the receiver one or more times. The
     * resulting parser returns a list of the parse results of the receiver.
     *
     * This is a greedy and blind implementation that tries to consume as much
     * input as possible and that does not consider what comes afterwards.
     *
     * For example, the parser [:letter().plus():] accepts any sequence of
     * letters and returns a list of the parsed letters.
     */
    plus(): Parser { return this.repeat(1, 65536) }

    /**
     * Returns a parser that parses the receiver one or more times until it
     * reaches [limit]. This is a greedy non-blind implementation of the
     * [Parser.plus] operator. The [limit] is not consumed.
     */
    plusGreedy(limit: Parser): Parser { return this.repeatGreedy(limit, 1, 65536) }

    /**
     * Returns a parser that parses the receiver zero or more times until it
     * reaches a [limit]. This is a lazy non-blind implementation of the
     * [Parser.plus] operator. The [limit] is not consumed.
     */
    plusLazy(limit: Parser): Parser { return this.repeatLazy(limit, 1, 65536) }

    /**
     * Returns a parser that accepts the receiver between [min] and [max] times.
     * The resulting parser returns a list of the parse results of the receiver.
     *
     * This is a greedy and blind implementation that tries to consume as much
     * input as possible and that does not consider what comes afterwards.
     *
     * For example, the parser [:letter().repeat(2, 4):] accepts a sequence of
     * two, three, or four letters and returns the accepted letters as a list.
     */
    repeat(min: number, max: number): Parser { return new _PossessiveRepeatingParser(this, min, max) }

    /**
     * Returns a parser that parses the receiver at least [min] and at most [max]
     * times until it reaches a [limit]. This is a greedy non-blind implementation of
     * the [Parser.repeat] operator. The [limit] is not consumed.
     */
    repeatGreedy(limit: Parser, min: number, max: number): Parser {
        return new _GreedyRepeatingParser(this, limit, min, max);
    }

    /**
     * Returns a parser that parses the receiver at least [min] and at most [max]
     * times until it reaches a [limit]. This is a lazy non-blind implementation of
     * the [Parser.repeat] operator. The [limit] is not consumed.
     */
    repeatLazy(limit: Parser, min: number, max: number): Parser {
        return new _LazyRepeatingParser(this, limit, min, max);
    }

    /**
     * Returns a parser that accepts the receiver exactly [count] times. The
     * resulting parser returns a list of the parse results of the receiver.
     *
     * For example, the parser [:letter().times(2):] accepts two letters and
     * returns a list of the two parsed letters.
     */
    times(count: number): Parser { return this.repeat(count, count) }

    /**
     * Returns a parser that accepts the receiver followed by [other]. The
     * resulting parser returns a list of the parse result of the receiver
     * followed by the parse result of [other]. Calling this method on an
     * existing sequence code not nest this sequence into a new one, but
     * instead augments the existing sequence with [other].
     *
     * For example, the parser [:letter().seq(digit()).seq(letter()):] accepts a
     * letter followed by a digit and another letter. The parse result of the
     * input string [:'a1b':] is the list [:['a', '1', 'b']:].
     */
    seq(other: Parser): Parser { return new _SequenceParser([this, other]) }

    /**
     * Convenience operator returning a parser that accepts the receiver followed
     * by [other]. See [Parser.seq] for details.
     */
    // Parser operator & (Parser other) => this.seq(other);

    /**
     * Returns a parser that accepts the receiver or [other]. The resulting
     * parser returns the parse result of the receiver, if the receiver fails
     * it returns the parse result of [other] (exclusive ordered choice).
     *
     * For example, the parser [:letter().or(digit()):] accepts a letter or a
     * digit. An example where the order matters is the following choice between
     * overlapping parsers: [:letter().or(char('a')):]. In the example the parser
     * [:char('a'):] will never be activated, because the input is always consumed
     * [:letter():]. This can be problematic if the author intended to attach a
     * production action to [:char('a'):].
     */
    or(other: Parser): Parser { return new _ChoiceParser([this, other]) }

    /**
     * Convenience operator returning a parser that accepts the receiver or
     * [other]. See [Parser.or] for details.
     */
    // Parser operator | (Parser other) => this.or(other);

    /**
     * Returns a parser (logical and-predicate) that succeeds whenever the
     * receiver does, but never consumes input.
     *
     * For example, the parser [:char('_').and().seq(identifier):] accepts
     * identifiers that start with an underscore character. Since the predicate
     * does not consume accepted input, the parser [:identifier:] is given the
     * ability to process the complete identifier.
     */
    and(): Parser { return new _AndParser(this) }

    /**
     * Returns a parser (logical not-predicate) that succeeds whenever the
     * receiver fails, but never consumes input.
     *
     * For example, the parser [:char('_').not().seq(identifier):] accepts
     * identifiers that do not start with an underscore character. If the parser
     * [:char('_'):] accepts the input, the negation and subsequently the
     * complete parser fails. Otherwise the parser [:identifier:] is given the
     * ability to process the complete identifier.
     */
    not(message?: string): Parser { return new _NotParser(this, message) }

    /**
     * Returns a parser that consumes any input token (character), but the
     * receiver.
     *
     * For example, the parser [:letter().neg():] accepts any input but a letter.
     * The parser fails for inputs like [:'a':] or [:'Z':], but succeeds for
     * input like [:'1':], [:'_':] or [:'$':].
     */
    neg(message?: string): Parser { return this.not(message).seq(any()).pick(1) }

    /**
     * Returns a parser that discards the result of the receiver, and returns
     * a sub-string of the consumed range in the string/list being parsed.
     *
     * For example, the parser [:letter().plus().flatten():] returns [:'abc':]
     * for the input [:'abc':]. In contrast, the parser [:letter().plus():] would
     * return [:['a', 'b', 'c']:] for the same input instead.
     */
    flatten(): Parser { return new _FlattenParser(this) }

    /**
     * Returns a parser that returns a [Token]. The token carries the parsed
     * values of the receiver [Token.value], as well as the consumed range from
     * [Token.start] to [Token.stop] of the string/list being parsed.
     *
     * For example, the parser [:letter().plus().token():] returns the token
     * [:Token[start: 0, stop: 3, value: abc]:] for the input [:'abc':].
     */
    token(): Parser { return new _TokenParser(this) }

    /**
     * Returns a parser that consumes input before and after the receiver. The
     * optional argument [trimmer] is a parser that consumes the excess input. By
     * default [:whitespace():] is used.
     *
     * For example, the parser [:letter().plus().trim():] returns [:['a', 'b']:]
     * for the input [:' ab\n':] and consumes the complete input string.
     */
    trim(trimmer?: Parser): Parser {
        return new _TrimmingParser(this, trimmer || whitespace());
    }

    /**
     * Returns a parser that succeeds only if the receiver consumes the complete
     * input, otherwise return a failure with the optional [message].
     *
     * For example, the parser [:letter().end():] succeeds on the input [:'a':]
     * and fails on [:'ab':]. In contrast the parser [:letter():] alone would
     * succeed on both inputs, but not consume everything for the second input.
     */
    end(message: string = 'end of input expected'): Parser {
        return new _EndOfInputParser(this, message);
    }

    /**
     * Returns a parser that points to the receiver, but can be changed to point
     * to something else at a later point in time.
     *
     * For example, the parser [:letter().setable():] behaves exactly the same
     * as [:letter():], but it can be replaced with another parser using
     * [SetableParser.set].
     */
    setable(): _SetableParser { return new _SetableParser(this) }

    /**
     * Returns a parser that evaluates [function] as action handler on success
     * of the receiver.
     *
     * For example, the parser [:digit().map((char) => int.parse(char)):] returns
     * the number [:1:] for the (successfully parsed) input string [:'1':].
     *
     * TODO generics?
     * TODO rename this function? apply() would be more appropriate than map()
     */
    map(func: { (value: any): any } ): Parser { return new _ActionParser(this, func) }

    /**
     * Returns a parser that transform a successful parse result by returning
     * the element at [index] of a list. A negative index can be used to access
     * the elements from the back of the list.
     *
     * For example, the parser [:letter().star().pick(-1):] returns the last
     * letter parsed. For the input [:'abc':] it returns [:'c':].
     */
    pick(index: number): Parser {
        return this.map((list: any[]) =>
            list[index < 0 ? list.length + index : index]
        );
    }

    /**
     * Returns a parser that transforms a successful parse result by returning
     * the permuted elements at [indexes] of a list. Negative indexes can be
     * used to access the elements from the back of the list.
     *
     * For example, the parser [:letter().star().permute([0, -1]):] returns the
     * first and last letter parsed. For the input [:'abc':] it returns
     * [:['a', 'c']:].
     */
    permute(indexes: number[]): Parser;
    permute(...indexes: number[]): Parser;
    permute(_: any): Parser {
        var indexes: number[];

        if ((_ instanceof Array)) {
            indexes = <number[]> _;
        } else {
            indexes = [];
            for (var i=0; i<arguments.length; i++) {
                indexes.push(arguments[i]);
            }
        }

        return this.map((list: any[]) =>
            indexes.map((index: number) =>
                list[index < 0 ? list.length + index : index]));
    }

    /**
     * Returns a parser that consumes the receiver one or more times separated
     * by the [separator] parser. The resulting parser returns a flat list of
     * the parse results of the receiver interleaved with the parse result of the
     * separator parser.
     *
     * If the optional argument [includeSeparators] is set to [:false:], then the
     * separators are not included in the parse result. If the optional argument
     * [optionalSeparatorAtEnd] is set to [:true:] the parser also accepts an
     * optional separator at the end.
     *
     * For example, the parser [:digit().separatedBy(char('-')):] returns a parser
     * that consumes input like [:'1-2-3':] and returns a list of the elements and
     * separators: [:['1', '-', '2', '-', '3']:].
     */
    separatedBy(separator: Parser, includeSeparators = true, optionalSeparatorAtEnd = false) {
        var repeater = new _SequenceParser([separator, this]).star();
        var parser = new _SequenceParser(optionalSeparatorAtEnd
            ? [this, repeater, separator.optional(separator)]
            : [this, repeater]);
        return parser.map((list: any[]) => {
            var result = [];
            result.push(list[0]);
            for (var tuple in list[1]) {
                if (includeSeparators) {
                    result.push(tuple[0]);
                }
                result.push(tuple[1]);
            }
            if (includeSeparators && optionalSeparatorAtEnd && (list[2] === separator)) {
                result.push(list[2]);
            }
            return result;
        });
    }

    /**
     * Returns a shallow copy of the receiver.
     *
     * @abstract
     */
    copy(): Parser { throw new Error(ABSTRACT) }

    /**
     * Recusively tests for the equality of two parsers.
     *
     * The code can automatically deals with recursive parsers and parsers that
     * refer to other parsers. This code is supposed to be overridden by parsers
     * that add other state.
     */
    match(other: Parser, seen?: Parser[]): boolean {
        if (!seen) {
            seen = [];
        }
        if (this === other || seen.indexOf(this) >= 0) {
            return true;
        }
        seen.push(this);
        // TODO fix this after the TypeScript team corrects #155
        // https://typescript.codeplex.com/workitem/155
        return this['constructor'] === other['constructor'] && this._matchChildren(other, seen);
    }

    _matchChildren(other: Parser, seen?: Parser[]): boolean {
        var thisChildren = this.getChildren(), otherChildren = other.getChildren();
        if (thisChildren.length != otherChildren.length) {
            return false;
        }
        for (var i = 0; i < thisChildren.length; i++) {
            if (! thisChildren[i].match(otherChildren[i], seen)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns a list of directly referenced parsers.
     *
     * For example, [:letter().children:] returns the empty collection [:[]:],
     * because the letter parser is a primitive or leaf parser that does not
     * depend or call any other parser.
     *
     * In contrast, [:letter().or(digit()).children:] returns a collection
     * containing both the [:letter():] and [:digit():] parser.
     */
    getChildren(): Parser[] { return [] }

    /**
     * Changes the receiver by replacing [source] with [target]. Does nothing
     * if [source] does not exist in [Parser.children].
     *
     * The following example creates a letter parser and then defines a parser
     * called [:example:] that accepts one or more letters. Eventually the parser
     * [:example:] is modified by replacing the [:letter:] parser with a new
     * parser that accepts a digit. The resulting [:example:] parser accepts one
     * or more digits.
     *
     *     var letter = letter();
     *     var example = letter.plus();
     *     example.replace(letter, digit());
     */
    replace(source: Parser, target: Parser) {
        // no children, nothing to do
    }

    toString(): string { return this['constructor'].name; }

}
