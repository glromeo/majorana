import {CharCode} from "./charcodes";
import {Symbols, Tokens} from "./language";

const {
    NewLine, Tab, Space, QuotationMark, DollarSign, Apostrophe, Asterisk, PlusSign, MinusSign, FullStop, Slash,
    DigitZero, DigitOne, DigitEight, DigitNine, CapitalA, CapitalB, CapitalE, CapitalF, CapitalX, CapitalZ,
    Backslash, LowLine, LetterA, LetterB, LetterE, LetterF, LetterX, LetterZ, Tilde, NBSP
} = CharCode;

const defaultSymbols = compileSymbols(Symbols);

/**
 *
 */
export class Lexer {

    constructor() {
        this.source = typeof arguments[0] === "string" ? arguments[0] : '';
        this.charCodeAt = String.prototype.charCodeAt.bind(this.source);
        this.position = 0;
        this.peek = this.advance();
        this.symbols = arguments[1] || arguments[0] || defaultSymbols;
        if (!this.symbols.__all__) {
            this.symbols = compileSymbols(this.symbols);
        }
        this.cache = new Map();
    }

    scan(source = this.source) {
        this.source = source;
        this.charCodeAt = String.prototype.charCodeAt.bind(source);
        this.position = 0;
        this.peek = this.advance();
        return this;
    }

    [Symbol.iterator]() {
        const lexer = this;
        return {
            value: undefined,
            done: false,
            next() {
                this.done = !(this.value = lexer.nextToken());
                return this;
            }
        };
    }

    static cursor(source, end) {
        let cc, position = 0, line = 1, column = 1;
        while (position < end && (cc = source.charCodeAt(position++))) if (cc === NewLine) {
            line++;
            column = 1;
        } else if (cc === Tab) {
            column += 4;
        } else {
            column++;
        }
        return {line, column};
    }

    cursor() {
        return Lexer.cursor(this.source, this.position);
    }

    error(message, position = this.position) {

        let out = message;

        if (Lexer.debug) out = "Given: `" + this.source + "` " + out;

        const {line, column} = Lexer.cursor(this.source, position);
        out += ", at line: " + line + ", column: " + column + ".";

        const error = new Error(out);
        error.stack = error.stack.split("\n").filter((line, index) => index > 1).join("\n");
        throw error;
    }

    /**
     * Consumes all whitespaces and comments. Stops at the first character of a valid token.
     *
     * @returns {Number} the first non whitespace non comment charcode
     */
    advance(offset = 0) {

        const charCodeAt = this.charCodeAt;
        let cc, position = this.position + offset;

        while ((cc = charCodeAt(position)) <= Space || cc === Slash || Tilde < cc && cc < NBSP) {

            if (cc === Slash) if ((cc = charCodeAt(position + 1)) === Slash) {

                position++;

                while ((cc = charCodeAt(++position)) && cc !== NewLine) /* ... */;

                continue;

            } else if (cc === Asterisk) {

                position++;

                while (cc = charCodeAt(++position)) if (Asterisk === cc && Slash === charCodeAt(position + 1)) {
                    position += 2;
                    break;
                }

                if (cc) continue; else this.error('Comment not closed', position);

            } else {
                this.position = position;
                return this.peek = Slash;
            }

            position++;
        }

        this.position = position;
        return this.peek = cc;
    }

    nextToken() {

        let cc = this.peek || this.advance();
        if (!cc) {
            return this.close();
        }

        if (cc === DigitZero) {
            return this.nextNumber();
        }

        if (cc > DigitZero && cc <= DigitNine) {
            return this.nextDecimal();
        }

        if (cc === LowLine || cc === DollarSign || cc >= LetterA && cc <= LetterZ || cc >= CapitalA && cc <= CapitalZ) {
            return this.nextLiteral();
        }

        if (cc === Apostrophe || cc === QuotationMark) {
            return this.nextString(cc);
        }

        if (cc === FullStop) {
            let cc2 = this.charCodeAt(this.position + 1);
            if (cc2 >= DigitZero && cc2 <= DigitNine) {
                return this.nextDecimal(FullStop);
            }
        }

        return this.nextSymbol(cc) || this.error(`Unexpected character: ${JSON.stringify(String.fromCharCode(cc))}`);
    }

    nextNumber() {

        const charCodeAt = this.charCodeAt;
        let cc, position = this.position, cc2 = charCodeAt(++position);

        if (cc2 === LetterX || cc2 === CapitalX) {
            while ((cc = charCodeAt(++position)) && (
                cc >= DigitZero && cc <= DigitNine || cc >= LetterA && cc <= LetterF || cc >= CapitalA && cc <= CapitalF
            )) /* ... */;
        } else if (cc2 === LetterB || cc2 === CapitalB) {
            while ((cc = charCodeAt(++position)) && (
                cc >= DigitZero && cc <= DigitOne
            )) /* ... */;
        } else if (cc2 >= DigitZero && cc2 < DigitEight) {
            while ((cc = charCodeAt(++position)) && (
                cc >= DigitZero && cc < DigitEight
            )) /* ... */;
        } else {
            return this.nextDecimal();
        }

        return this.provideToken(Tokens.Number, position);
    }

    nextDecimal(cc) {
        let position = this.position;

        if (cc !== FullStop) {
            while ((cc = this.charCodeAt(++position)) && (cc >= DigitZero && cc <= DigitNine)) /* ignored */;
        }

        if (cc === FullStop) {
            while ((cc = this.charCodeAt(++position)) && (cc >= DigitZero && cc <= DigitNine)) ;
        }

        if (cc === LetterE || cc === CapitalE) {
            if ((cc = this.charCodeAt(position + 1)) === PlusSign || cc === MinusSign) position++;

            while ((cc = this.charCodeAt(++position)) && (cc >= DigitZero && cc <= DigitNine)) ;
        }

        return this.provideToken(Tokens.Number, position);
    }

    nextLiteral() {
        const source = this.source;
        let cc, position = this.position;

        while ((cc = source.charCodeAt(++position)) && (
            cc >= LetterA && cc <= LetterZ || cc >= CapitalA && cc <= CapitalZ ||
            cc >= DigitZero && cc <= DigitNine ||
            cc === LowLine || cc === DollarSign
        )) ;

        return this.provideLiteral(position);
    }

    nextString(quote) {
        const charCodeAt = this.charCodeAt;
        let cc, position = this.position, escape = false;

        while (cc = charCodeAt(++position)) if (escape) {
            escape = false;
        } else if (cc === Backslash) {
            escape = true;
        } else if (cc === quote) {
            return this.provideToken(Tokens.String, position + 1);
        } else if (cc === NewLine) {
            break;
        }

        this.error('String literal not closed', position);
    }

    nextSymbol(cc) {
        const text = this.symbols.__all__(cc, this.position, this.charCodeAt);
        if (text) {
            let token = this.cache.get(text);
            if (!token) {
                this.cache.set(text, token = {type: Tokens.Symbol, text: text});
            }
            this.peek = this.advance(text.length);
            return token;
        }
    }

    provideLiteral(to) {
        const text = this.source.substring(this.position, to);
        let token = this.cache.get(text);
        if (!token) {
            this.cache.set(text, token = {type: Tokens.Literal, text: text});
        }
        this.peek = this.advance(text.length);
        return token;
    }

    provideToken(type, to) {
        const text = this.source.substring(this.position, to);
        this.peek = this.advance(text.length);
        return {type: type, text: text};
    }

    consume(cc) {
        if (cc === this.peek) {
            this.peek = this.advance(1);
            return true;
        }
    }

    expect(cc) {
        if (cc === this.peek) {
            this.peek = this.advance(1);
        } else {
            let expected = String.fromCharCode(cc);
            let actual = this.source.charAt(this.position);
            this.error(`Expected ${ expected } but was ${ actual }`);
        }
    }

    consumeTwo(cc) {
        if (cc === this.peek && cc === this.source.charCodeAt(this.position + 1)) {
            this.peek = this.advance(2);
            return true;
        }
    }

    consumeThree(cc) {
        if (cc === this.peek && cc === this.source.charCodeAt(this.position + 1) && cc === this.source.charCodeAt(this.position + 2)) {
            this.peek = this.advance(3);
            return true;
        }
    }

    consumeText(text) {

        if (!this.advance()) return false;

        let p = text.length;

        while (p--) if (this.source.charCodeAt(this.position + p) !== text.charCodeAt(p)) {
            return false
        }

        this.peek = this.advance(text.length);
        return text;
    }

    consumeSymbol(name = '__all__') {
        let text, consume;
        if (consume = this.symbols[name]) {
            if (text = consume(this.peek, this.position, this.charCodeAt)) {
                this.peek = this.advance(text.length);
                return text;
            }
        } else {
            throw new Error("No lexer symbols for '" + name + "'");
        }
    }

    expectText(text) {
        if (!this.consumeText(text)) {
            this.error(`Expected ${
                JSON.stringify(text)
                } but was ${
                JSON.stringify(this.source.substring(this.position, from + 1))
                }`
            );
        }
    }

    debug(length) {
        let from = this.position, to = Math.min(from + length, this.source.length);
        let substring = "`" + this.source.slice(from, length) + "`";
        return to < this.source.length ? substring + "..." : substring;
    }

    get done() {
        return this.position < this.source.length;
    }

    close() {
        this.position = this.source.length;
        this.peek = this.advance();
    }
}

/**
 *
 */
export class Tokenizer extends Lexer {

    scan(source) {
        return Array.from(super.scan(source));
    }

    nextSymbol(cc) {
        const from = this.position;
        let symbol = super.nextSymbol(cc);
        return symbol && Object.create(symbol, {
            position: {enumerable: false, value: from},
            cursor: {enumerable: false, value: Lexer.cursor.bind(null, this.source, from)}
        });
    }

    provideLiteral(to) {
        const from = this.position;
        return Object.create(super.provideLiteral(to), {
            position: {enumerable: false, value: from},
            cursor: {enumerable: false, value: Lexer.cursor.bind(null, this.source, from)}
        });
    }

    provideToken(type, to) {
        const from = this.position;
        return Object.create(super.provideToken(type, to), {
            position: {enumerable: false, value: from},
            cursor: {enumerable: false, value: Lexer.cursor.bind(null, this.source, from)}
        });
    }
}

Lexer.compileSymbols = compileSymbols;

/**
 *
 * @param definitions
 * @return {*}
 */
function compileSymbols(definitions) {

    const symbols = {};

    let __all__ = [['__all__', Array.prototype.concat(...Object.values(definitions))]];

    for (const [key, value] of Object.entries(definitions).concat(__all__)) {

        const ast = new Map();

        for (const text of value) {
            let t = ast, cc, c = 0;
            while (cc = text.charCodeAt(c++)) {
                if (!t.has(cc)) {
                    t.set(cc, new Map());
                }
                t = t.get(cc);
            }
            t.symbol = text;
        }

        const vars = ["c0"];
        vars.get = function (index) {
            return this[index] || "(" + (this[index] = "c" + index) + " = cc(cp + " + index + "))";
        };

        symbols[key] = new Function("c0", "cp", "cc",
            `${generateBody(ast, vars)}//# sourceURL=http://majorana/lexer/${key}`
        );
    }

    return symbols;
}

function generateBody(ast, vars, tab = '\t', index = 0) {

    let statement = '';

    for (let [cc, node] of ast) {
        let next = index + 1;
        let condition = vars.get(index) + " === " + cc;
        while (node.size === 1 && !node.hasOwnProperty('symbol')) {
            [cc, node] = node.entries().next().value;
            condition += " && " + vars.get(next++) + " === " + cc;
        }
        if (node.size > 1 || node.size === 1 && node.hasOwnProperty('symbol')) {
            statement += tab + "if (" + condition + ") {\n" + generateBody(node, vars, tab + '  ', next) + tab + "}\n";
        } else {
            statement += tab + "if (" + condition + ") " + generateBody(node, vars, '', next);
        }
    }

    if (ast.hasOwnProperty('symbol')) {
        statement += tab + "return " + JSON.stringify(ast.symbol) + ";\n";
    }

    if (index === 0) {
        if (vars.length > 1) {
            vars.shift();
            return tab + "let " + vars.join(", ") + ";\n" + statement;
        }
    }

    return statement;
}