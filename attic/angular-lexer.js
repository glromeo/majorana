export const ESCAPE = {
    'n': '\n',
    'f': '\f',
    'r': '\r',
    't': '\t',
    'v': '\v',
    '\'': '\'',
    '"': '"'
};

export const OPERATORS = {
    '+': true,
    '-': true,
    '*': true,
    '/': true,
    '%': true,
    '===': true,
    '!==': true,
    '==': true,
    '!=': true,
    '<': true,
    '>': true,
    '<=': true,
    '>=': true,
    '&&': true,
    '||': true,
    '!': true,
    '=': true,
    '|': true
};

export const LITERALS = new Map([
    ['true', true],
    ['false', false],
    ['null', null],
    ['undefined', undefined]
]);

/**
 *
 */
export class Lexer {

    constructor(options = {}) {

        this.options = options;

        const isIdentifierStart = this.options.isIdentifierStart;
        if (isIdentifierStart) {
            this.isIdentifierStart = function (ch) {
                return isIdentifierStart(ch, this.codePointAt(ch))
            }
        } else {
            this.isIdentifierStart = this.isValidIdentifierStart;
        }

        const isIdentifierContinue = this.options.isIdentifierContinue;
        if (isIdentifierContinue) {
            this.isIdentifierContinue = function (ch) {
                return isIdentifierContinue(ch, this.codePointAt(ch))
            }
        } else {
            this.isIdentifierContinue = this.isValidIdentifierContinue;
        }
    }

    tokenize(text) {

        this.text = text;
        this.index = 0;

        this.appendToken = token => {
            this.next = this.last = token;
            this.appendToken = token => {
                this.last = this.last.next = token;
            }
        }

        while (this.index < this.text.length) {
            var ch = this.text.charAt(this.index);
            if (ch === '"' || ch === '\'') {
                this.readString(ch);
            } else if (this.isNumber(ch) || ch === '.' && this.isNumber(this.peek())) {
                this.readNumber();
            } else if (this.isIdentifierStart(this.peekMultichar())) {
                this.readIdentifier();
            } else if (this.is(ch, '(){}[].,;:?')) {
                this.appendToken({index: this.index, text: ch});
                this.index++;
            } else if (this.isWhitespace(ch)) {
                this.index++;
            } else {
                var ch2 = ch + this.peek();
                var ch3 = ch2 + this.peek(2);
                var op1 = OPERATORS[ch];
                var op2 = OPERATORS[ch2];
                var op3 = OPERATORS[ch3];
                if (op1 || op2 || op3) {
                    var token = op3 ? ch3 : (op2 ? ch2 : ch);
                    this.appendToken({index: this.index, text: token, operator: true});
                    this.index += token.length;
                } else {
                    this.appendToken({index: this.index, text: token});
                    this.index += token.length;
                }
            }
        }

        return this;
    }

    [Symbol.iterator]() {
        return {
            value: this,
            next() {
                this.done = !(this.value = this.value.next);
                return this;
            }
        }
    }

    is(ch, chars) {
        return chars.indexOf(ch) !== -1;
    }

    peek(i) {
        var num = i || 1;
        return (this.index + num < this.text.length) ? this.text.charAt(this.index + num) : false;
    }

    isNumber(ch) {
        return ('0' <= ch && ch <= '9') && typeof ch === 'string';
    }

    isWhitespace(ch) {
        return (ch === ' ' || ch === '\r' || ch === '\t' || ch === '\n' || ch === '\v' || ch === '\u00A0');
    }

    isValidIdentifierStart(ch) {
        return ('a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || '_' === ch || ch === '$');
    }

    isValidIdentifierContinue(ch, cp) {
        return this.isValidIdentifierStart(ch, cp) || this.isNumber(ch);
    }

    codePointAt(ch) {
        if (ch.length === 1) return ch.charCodeAt(0);
        return (ch.charCodeAt(0) << 10) + ch.charCodeAt(1) - 0x35FDC00;
    }

    peekMultichar() {
        var ch = this.text.charAt(this.index);
        var peek = this.peek();
        if (!peek) {
            return ch;
        }
        var cp1 = ch.charCodeAt(0);
        var cp2 = peek.charCodeAt(0);
        if (cp1 >= 0xD800 && cp1 <= 0xDBFF && cp2 >= 0xDC00 && cp2 <= 0xDFFF) {
            return ch + peek;
        }
        return ch;
    }

    isExpOperator(ch) {
        return (ch === '-' || ch === '+' || this.isNumber(ch));
    }

    readNumber() {
        var number = '';
        var start = this.index;
        while (this.index < this.text.length) {
            var ch = this.text.charAt(this.index);
            if (ch) {
                ch = ch.toLowerCase();
            }
            if (ch === '.' || this.isNumber(ch)) {
                number += ch;
            } else {
                var peekCh = this.peek();
                if (ch === 'e' && this.isExpOperator(peekCh)) {
                    number += ch;
                } else if (this.isExpOperator(ch) &&
                    peekCh && this.isNumber(peekCh) &&
                    number.charAt(number.length - 1) === 'e') {
                    number += ch;
                } else if (this.isExpOperator(ch) &&
                    (!peekCh || !this.isNumber(peekCh)) &&
                    number.charAt(number.length - 1) === 'e') {
                    throw new Error('Invalid exponent', this);
                } else {
                    break;
                }
            }
            this.index++;
        }
        this.appendToken({
            index: start,
            text: number,
            constant: true,
            value: Number(number)
        });
    }

    readIdentifier() {
        var start = this.index;
        this.index += this.peekMultichar().length;
        while (this.index < this.text.length) {
            var ch = this.peekMultichar();
            if (!this.isIdentifierContinue(ch)) {
                break;
            }
            this.index += ch.length;
        }
        this.appendToken({
            index: start,
            text: this.text.slice(start, this.index),
            identifier: true
        });
    }

    readString(quote) {
        var start = this.index;
        this.index++;
        var string = '';
        var rawString = quote;
        var escape = false;
        while (this.index < this.text.length) {
            var ch = this.text.charAt(this.index);
            rawString += ch;
            if (escape) {
                if (ch === 'u') {
                    var hex = this.text.substring(this.index + 1, this.index + 5);
                    if (!hex.match(/[\da-f]{4}/i)) {
                        throw new Error('Invalid unicode escape [\\u' + hex + ']', this);
                    }
                    this.index += 4;
                    string += String.fromCharCode(parseInt(hex, 16));
                } else {
                    var rep = ESCAPE[ch];
                    string = string + (rep || ch);
                }
                escape = false;
            } else if (ch === '\\') {
                escape = true;
            } else if (ch === quote) {
                this.index++;
                this.appendToken({
                    index: start,
                    text: rawString,
                    constant: true,
                    value: string
                });
                return;
            } else {
                string += ch;
            }
            this.index++;
        }
        // throw new Error('Unterminated quote', this);
        this.appendToken({
            index: start,
            text: rawString,
            constant: true,
            value: string
        });
    }
}
