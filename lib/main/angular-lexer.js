'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
const ESCAPE = exports.ESCAPE = {
    'n': '\n',
    'f': '\f',
    'r': '\r',
    't': '\t',
    'v': '\v',
    '\'': '\'',
    '"': '"'
};

const OPERATORS = exports.OPERATORS = {
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

const LITERALS = exports.LITERALS = new Map([['true', true], ['false', false], ['null', null], ['undefined', undefined]]);

/**
 * @constructor
 */
var Lexer = exports.Lexer = function Lexer(options) {
    this.options = options;
};

Lexer.prototype = {
    constructor: Lexer,

    lex: function (text) {
        this.text = text;
        this.index = 0;
        this.tokens = [];

        while (this.index < this.text.length) {
            var ch = this.text.charAt(this.index);
            if (ch === '"' || ch === '\'') {
                this.readString(ch);
            } else if (this.isNumber(ch) || ch === '.' && this.isNumber(this.peek())) {
                this.readNumber();
            } else if (this.isIdentifierStart(this.peekMultichar())) {
                this.readIdent();
            } else if (this.is(ch, '(){}[].,;:?')) {
                this.tokens.push({ index: this.index, text: ch });
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
                    var token = op3 ? ch3 : op2 ? ch2 : ch;
                    this.tokens.push({ index: this.index, text: token, operator: true });
                    this.index += token.length;
                } else {
                    this.throwError('Unexpected next character ', this.index, this.index + 1);
                }
            }
        }
        return this.tokens;
    },

    is: function (ch, chars) {
        return chars.indexOf(ch) !== -1;
    },

    peek: function (i) {
        var num = i || 1;
        return this.index + num < this.text.length ? this.text.charAt(this.index + num) : false;
    },

    isNumber: function (ch) {
        return '0' <= ch && ch <= '9' && typeof ch === 'string';
    },

    isWhitespace: function (ch) {
        // IE treats non-breaking space as \u00A0
        return ch === ' ' || ch === '\r' || ch === '\t' || ch === '\n' || ch === '\v' || ch === '\u00A0';
    },

    isIdentifierStart: function (ch) {
        return this.options.isIdentifierStart ? this.options.isIdentifierStart(ch, this.codePointAt(ch)) : this.isValidIdentifierStart(ch);
    },

    isValidIdentifierStart: function (ch) {
        return 'a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || '_' === ch || ch === '$';
    },

    isIdentifierContinue: function (ch) {
        return this.options.isIdentifierContinue ? this.options.isIdentifierContinue(ch, this.codePointAt(ch)) : this.isValidIdentifierContinue(ch);
    },

    isValidIdentifierContinue: function (ch, cp) {
        return this.isValidIdentifierStart(ch, cp) || this.isNumber(ch);
    },

    codePointAt: function (ch) {
        if (ch.length === 1) return ch.charCodeAt(0);
        // eslint-disable-next-line no-bitwise
        return (ch.charCodeAt(0) << 10) + ch.charCodeAt(1) - 0x35FDC00;
    },

    peekMultichar: function () {
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
    },

    isExpOperator: function (ch) {
        return ch === '-' || ch === '+' || this.isNumber(ch);
    },

    throwError: function (error, start, end) {
        end = end || this.index;
        var colStr = isDefined(start) ? 's ' + start + '-' + this.index + ' [' + this.text.substring(start, end) + ']' : ' ' + end;
        throw new Error('lexerr', 'Lexer Error: {0} at column{1} in expression [{2}].', error, colStr, this.text);
    },

    readNumber: function () {
        var number = '';
        var start = this.index;
        while (this.index < this.text.length) {
            var ch = lowercase(this.text.charAt(this.index));
            if (ch === '.' || this.isNumber(ch)) {
                number += ch;
            } else {
                var peekCh = this.peek();
                if (ch === 'e' && this.isExpOperator(peekCh)) {
                    number += ch;
                } else if (this.isExpOperator(ch) && peekCh && this.isNumber(peekCh) && number.charAt(number.length - 1) === 'e') {
                    number += ch;
                } else if (this.isExpOperator(ch) && (!peekCh || !this.isNumber(peekCh)) && number.charAt(number.length - 1) === 'e') {
                    this.throwError('Invalid exponent');
                } else {
                    break;
                }
            }
            this.index++;
        }
        this.tokens.push({
            index: start,
            text: number,
            constant: true,
            value: Number(number)
        });
    },

    readIdent: function () {
        var start = this.index;
        this.index += this.peekMultichar().length;
        while (this.index < this.text.length) {
            var ch = this.peekMultichar();
            if (!this.isIdentifierContinue(ch)) {
                break;
            }
            this.index += ch.length;
        }
        this.tokens.push({
            index: start,
            text: this.text.slice(start, this.index),
            identifier: true
        });
    },

    readString: function (quote) {
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
                        this.throwError('Invalid unicode escape [\\u' + hex + ']');
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
                this.tokens.push({
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
        this.throwError('Unterminated quote', start);
    }
};
//# sourceMappingURL=angular-lexer.js.map