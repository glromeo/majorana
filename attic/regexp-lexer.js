const regexp = new RegExp([
    /*  1 */ '([\n])',
    /*  2 */ '(\\/(?=\\/)[^\\n]+)',
    /*  3 */ '(\\/(?=\\*)(?:\\*(?!\\/)|[^\\*])+\\*\\/)',
    /*  4 */ '("(?:[^"\\\\]|\\\\.)*")',
    /*  5 */ "('(?:[^'\\\\]|\\\\.)*')",
    /*  6 */ '(0[xX][0-9a-fA-F]+)',
    /*  7 */ '(0[bB][0-1]+)',
    /*  8 */ '(0[0-7]+)',
    /*  9 */ '([0-9]+(?:\\.[0-9]+)?(?:e[+\-]?[0-9]+)?)',
    /* 10 */ '(\\.[0-9]+(?:e[+\-]?[0-9]+)?)',
    /* 11 */ '(null|undefined|true|false)',
    /* 12 */ '([a-zA-Z_$][0-9a-zA-Z_$]+)',
    /* 13 */ '(!==|===|!=|==)',
    /* 14 */ '((?:\\|\\|)|(?:\\&\\&))',
    /* 15 */ '(\\<\\<|\\>\\>|\\<\\=|\\>\\=|<|>)',
    /* 16 */ '(\\+|\\-|\\*|\\/|\\%)',
    /* 17 */ '(.)'
].join('|'), 'g');

export const Tokens = {
    BlockComment: 'Comment',
    Literal: 'Literal',
    Comment: 'Comment',
    Number: 'Number',
    String: 'String',
    Symbol: 'Symbol',
    This: 'This',
    EoF: 'EoF'
}

export class Lexer {

    constructor(source) {
        this.position = 0;
        this.line = 1;
        this.lineStart = -1;
        this.value = this.head = {};

        let lexer = this;

        let result;
        while (result = regexp.exec(source)) {

            this.position = result.index;

            if (result[1]) {
                lexer.line++;
                lexer.lineStart = result.index;
            } else if (result[4]) {
                lexer.consumeToken(Tokens.String, result[4]);
            } else if (result[5]) {
                lexer.consumeToken(Tokens.String, result[5]);
            } else if (result[6]) {
                lexer.consumeToken(Tokens.Number, result[6]);
            } else if (result[7]) {
                lexer.consumeToken(Tokens.Number, result[7]);
            } else if (result[8]) {
                lexer.consumeToken(Tokens.Number, result[8]);
            } else if (result[9]) {
                lexer.consumeToken(Tokens.Number, result[9]);
            } else if (result[10]) {
                lexer.consumeToken(Tokens.Number, result[10]);
            } else if (result[11]) {
                lexer.consumeToken(Tokens.Literal, result[11]);
            } else if (result[12]) {
                lexer.consumeToken(Tokens.Literal, result[12]);
            } else if (result[13]) {
                lexer.consumeToken(Tokens.Symbol, result[13]);
            } else if (result[14]) {
                lexer.consumeToken(Tokens.Symbol, result[14]);
            } else if (result[15]) {
                lexer.consumeToken(Tokens.Symbol, result[15]);
            } else if (result[16]) {
                lexer.consumeToken(Tokens.Symbol, result[16]);
            } else {

            }
        }

        this.value = this.head;
    }

    [Symbol.iterator]() {
        this.value = this.head;
        return this;
    }

    get token() {
        return this.value;
    }

    next() {
        if (this.value) {
            this.done = !(this.value = this.value.next);
        }
        return this;
    }

    consumeToken(type, text) {
        this.value = this.value.next = {
            text: text,
            type: type,
            line: this.line,
            column: this.position - this.lineStart
        };
        Object.defineProperty(this.token, 'next', {writable: true, value: null});
        return this;
    }

    get column() {
        return this.position - this.lineStart;
    }

    consumeText(text) {
        if (this.token.text === text) {

            return true;
        }
    }

    expectText(text) {
        if (!this.consumeText(text)) {
            throw new Error(`Expected ${
                JSON.stringify(text)
                } but was '${
                JSON.stringify(this.source.substring(this.position, from + 1))
                }' at line: ${this.line}, column: ${this.column}.`
            );
        }
        return this;
    }
}