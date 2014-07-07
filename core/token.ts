// Copyright (c) 2013, Lukas Renggli <renggli@gmail.com>

module petitparser {
    
    /**
     * A token represents a parsed part of the input stream. The token holds
     * the parsed input, the input buffer, and the start and stop position
     * in the input buffer.
     */
    export class Token {
    
        private _value: any;
        private _buffer: string;
        private _start: number;
        private _stop: number;
    
        constructor(value: any, buffer: string, start: number, stop: number) {
            this._value = value;
            this._buffer = buffer;
            this._start = start;
            this._stop = stop;
        }
    
        // bool operator == (other) {
        // TODO be sure to catch all Token comparisons
    
        equals(other: Token): boolean {
            return other instanceof Token
                && this._value === other._value
                && this._start === other._start
                && this._stop === other._stop;
        }
    
        // TODO what about these hashcodes?
        // int get hashCode => _value.hashCode + _start.hashCode + _stop.hashCode;
    
        /**
         * Returns the parsed value.
         */
        getValue() { return this._value }
    
        /**
         * Returns the input buffer.
         */
        getBuffer(): string { return this._buffer }
    
        /**
         * Returns the start position in the input buffer.
         */
        getStart(): number { return this._start }
    
        /**
         * Returns the stop position in the input buffer.
         */
        getStop(): number { return this._stop }
    
        /**
         * Returns the length of the token.
         */
        getLength(): number { return this._stop - this._start }
    
        /**
         * Returns the line number of the token.
         */
        getLine(): number { return Token.lineAndColumnOf(this._buffer, this._start)[0] }
    
        /**
         * Returns the column number of this token.
         */
        getColumn(): number { return Token.lineAndColumnOf(this._buffer, this._start)[1] }
    
        toString(): string { return 'Token[start: ' + this._start + ', stop: ' + this._stop + ', value: ' + this._value + ']' }
    
        static _NEWLINE_PARSER: Parser =
            char('\n').or(char('\r').seq(char('\n').optional()));
    
        /**
         * Returns a parser for that detects newlines platform independently.
         */
        static newlineParser(): Parser { return Token._NEWLINE_PARSER }
    
        /**
         * Converts a [position] index in a [buffer] to a line and column tuple.
         */
        static lineAndColumnOf(buffer: string, position: number): number[] {
            var line = 1, offset = 0;
            var results = <Token[]> Token.newlineParser().token().matchesSkipping(buffer);
            for (var i = 0; i < results.length; i++) {
                var token = results[i];
                if (position < token.getStop()) {
                    return [line, position - offset + 1];
                }
                line++;
                offset = token.getStop();
            }
            return [line, position - offset + 1];
        }
    
    }
}
