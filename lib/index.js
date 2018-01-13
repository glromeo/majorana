(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.Majorana = {})));
}(this, (function (exports) { 'use strict';

function cc(ch) {
    return ch.charCodeAt(0);
}

const CharCode = {
    Tab: /*-----------------*/ cc('\t'),
    NewLine: /*-------------*/ cc('\n'),
    Space: /*---------------*/ cc(' '),
    ExclamationMark: /*-----*/ cc('!'),
    QuotationMark: /*-------*/ cc('"'),
    Hashtag: /*-------------*/ cc('#'),
    DollarSign: /*----------*/ cc('$'),
    PercentSign: /*---------*/ cc('%'),
    Ampersand: /*-----------*/ cc('&'),
    Apostrophe: /*----------*/ cc('\''),
    LeftParenthesis: /*-----*/ cc('('),
    RightParenthesis: /*----*/ cc(')'),
    Asterisk: /*------------*/ cc('*'),
    PlusSign: /*------------*/ cc('+'),
    Comma: /*---------------*/ cc(','),
    MinusSign: /*-----------*/ cc('-'),
    FullStop: /*------------*/ cc('.'),
    Slash: /*---------------*/ cc('/'),
    DigitZero: /*-----------*/ cc('0'),
    DigitOne: /*------------*/ cc('1'),
    DigitTwo: /*------------*/ cc('2'),
    DigitThree: /*----------*/ cc('3'),
    DigitFour: /*-----------*/ cc('4'),
    DigitFive: /*-----------*/ cc('5'),
    DigitSix: /*------------*/ cc('6'),
    DigitSeven: /*----------*/ cc('7'),
    DigitEight: /*----------*/ cc('8'),
    DigitNine: /*-----------*/ cc('9'),
    Colon: /*---------------*/ cc(':'),
    Semicolon: /*-----------*/ cc(';'),
    LessThanSign: /*--------*/ cc('<'),
    EqualSign: /*-----------*/ cc('='),
    GreaterThanSign: /*-----*/ cc('>'),
    QuestionMark: /*--------*/ cc('?'),
    AtSign: /*--------------*/ cc('@'),
    CapitalA: /*------------*/ cc('A'),
    CapitalB: /*------------*/ cc('B'),
    CapitalE: /*------------*/ cc('E'),
    CapitalF: /*------------*/ cc('F'),
    CapitalT: /*------------*/ cc('T'),
    CapitalU: /*------------*/ cc('U'),
    CapitalX: /*------------*/ cc('X'),
    CapitalZ: /*------------*/ cc('Z'),
    LeftSquareBracket: /*---*/ cc('['),
    Backslash: /*-----------*/ cc('\\'),
    RightSquareBracket: /*--*/ cc(']'),
    CircumflexAccent: /*----*/ cc('^'),
    LowLine: /*-------------*/ cc('_'),
    GraveAccent: /*---------*/ cc('`'),
    LetterA: /*-------------*/ cc('a'),
    LetterB: /*-------------*/ cc('b'),
    LetterE: /*-------------*/ cc('e'),
    LetterF: /*-------------*/ cc('f'),
    LetterT: /*-------------*/ cc('t'),
    LetterU: /*-------------*/ cc('u'),
    LetterX: /*-------------*/ cc('x'),
    LetterZ: /*-------------*/ cc('z'),
    LeftCurlyBracket: /*----*/ cc('{'),
    Pipe: /*----------------*/ cc('|'),
    RightCurlyBracket: /*---*/ cc('}'),
    Tilde: /*---------------*/ cc('~'),
    Delete: /*--------------*/ 0x007F,
    NBSP: /*----------------*/ 0x00A0
};

const Tokens = {
    Comment:        Symbol("Comment"),
    BlockComment:   Symbol("BlockComment"),
    LineComment:    Symbol("LineComment"),
    Constant:       Symbol("Constant"),
    Number:         Symbol("Number"),
    String:         Symbol("String"),
    Literal:        Symbol("Literal"),
    Symbol:         Symbol("Symbol"),
    This:           Symbol("This")
};

const Symbols = {
    equality: ['===', '==', '!==', '!='],
    relational: ['<', '<=', '>', '>='],
    additive: ["+", "-"],
    multiplicative: ["*", "/", "%"],
    unary: ["+", "-", "!"],
    assignment: ["="]
};

const {
    NewLine, Tab, Space, QuotationMark, DollarSign, Apostrophe, Asterisk, PlusSign, MinusSign, FullStop, Slash,
    DigitZero, DigitOne, DigitEight, DigitNine, CapitalA, CapitalB, CapitalE, CapitalF, CapitalX, CapitalZ,
    Backslash, LowLine, LetterA, LetterB, LetterE, LetterF, LetterX, LetterZ, Tilde, NBSP
} = CharCode;

const defaultSymbols = compileSymbols(Symbols);

/**
 *
 */
class Lexer {

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

const Operators = {

    Assignment: {
        '=': (setter, value) => setter(value)
    },

    Logical: {
        '&&': async (left, right) => await left && await right,
        '||': async (left, right) => await left || await right
    },

    Equality: {
        '==': async (left, right) => await left == await right,
        '===': async (left, right) => await left === await right,
        '!=': async (left, right) => await left != await right,
        '!==': async (left, right) => await left !== await right
    },

    Relational: {
        '<': async (left, right) => await left < await right,
        '<=': async (left, right) => await left <= await right,
        '>': async (left, right) => await left > await right,
        '>=': async (left, right) => await left >= await right
    },

    Additive: {
        '+': async (left, right) => await left + await right,
        '-': async (left, right) => await left - await right
    },

    Multiplicative: {
        '*': async (left, right) => await left * await right,
        '/': async (left, right) => await left / await right,
        '%': async (left, right) => await left % await right
    },

    Unary: {
        '+': async (argument) => +await argument,
        '-': async (argument) => -await argument,
        '!': async (argument) => !await argument
    }
};

const AsyncFunction = Object.getPrototypeOf(async function () {
}).constructor;

const globalEval = eval;

const BinaryExpression = (operators) => class {

    constructor(operator, left, right) {
        this.operator = operators[operator];
        this.left = left;
        this.right = right;
    }

    eval(self, context) {
        return this.operator(
            this.left.eval(self, context),
            this.right.eval(self, context)
        );
    }

};

const UnaryExpression = (operators) => class {

    constructor(prefix, operator, argument) {
        if (!prefix) {
            throw TypeError("unsupported operator: postfix unary");
        }
        this.operator = operators[operator];
        this.argument = argument;
    }

    eval(self, context) {
        return this.operator(this.argument.eval(self, context));
    }
};

const AST = {

    Expression: class {

        constructor(expression) {
            this.expression = expression;
        }

        eval(self, context) {
            return this.expression.eval(self, context);
        }
    },

    AssignmentExpression: class {

        constructor(left, right) {
            this.left = left;
            this.right = right;
        }

        eval(self, context) {
            return this.left.write(self, context, this.right.eval(self, context));
        }
    },

    CommaExpression: class {

        constructor(expressions) {
            this.expressions = expressions;
        }

        eval(self, context) {
            let value;
            for (const expression of this.expressions) {
                value = expression.eval(self, context);
            }
            return value;
        }
    },

    TernaryExpression: class {

        constructor(test, consequent, alternate) {
            this.test = test;
            this.consequent = consequent;
            this.alternate = alternate;
        }

        async eval(self, context) {
            if (await this.test.eval(self, context)) {
                return this.consequent.eval(self, context);
            } else {
                return this.alternate.eval(self, context);
            }
        }
    },

    LogicalExpression: BinaryExpression(Operators.Logical),

    EqualityExpression: BinaryExpression(Operators.Equality),

    RelationalExpression: BinaryExpression(Operators.Relational),

    AdditiveExpression: BinaryExpression(Operators.Additive),

    MultiplicativeExpression: BinaryExpression(Operators.Multiplicative),

    UnaryExpression: UnaryExpression(Operators.Unary),

    Literals: {
        'true': {eval: () => true},
        'false': {eval: () => false},
        'null': {eval: () => null},
        'undefined': {eval: () => undefined},
        'this': {eval: self => self}
    },

    Identifier: class {

        constructor(text) {
            this.name = text;
        }

        eval(self, context) {
            return context[this.name];
        }

        async write(self, context, value) {
            return context[this.name] = await value;
        }

        symbol() {
            return this.name;
        }
    },

    Constant: class {

        constructor(type, text) {
            this.type = type;
            this.text = text;
        }

        eval() {
            return globalEval(this.text);
        }

        symbol() {
            return this.text;
        }
    },

    CallExpression: class {

        constructor(callee, parameters) {
            this.callee = callee;
            this.parameters = parameters;
        }

        async eval(self, context) {
            const callee = await this.callee.eval(self, context), args = [];
            for (const parameter of this.parameters) {
                args.push(await parameter.eval(self, context));
            }
            return callee.apply(self, args);
        }
    },

    MemberExpression: class {

        constructor(object, member, computed) {
            this.object = object;
            this.member = member;
            this.computed = computed;
        }

        async eval(self, context) {
            const object = await this.object.eval(self, context);
            if (this.computed) {
                return object[context[this.member.symbol()]];
            } else {
                return object[this.member.symbol()];
            }
        }

        async write(self, context, value) {
            const object = await this.object.eval(self, context);
            if (this.computed) {
                return object[context[this.member.symbol()]] = await value;
            } else {
                return object[this.member.symbol()] = await value;
            }
        }
    },

    ArrayExpression: class {

        constructor(elements) {
            this.elements = elements;
        }

        async eval(self, context) {
            let v = 0, value = new Array(this.elements.length);
            for (const element of this.elements) {
                value[v++] = await element.eval(self, context);
            }
            return value;
        }
    },

    Property: class {
        constructor(key, value, computed) {
            this.key = key;
            this.value = value;
            this.computed = computed;
        }

        eval(self, context) {
            return this.computed ? this.value.eval(self, context).then(value => {
                return this.key.eval(self, context).then(key => {
                    return {key, value};
                });
            }) : this.value.eval(self, context);
        }
    },

    ObjectExpression: class {

        constructor(properties) {
            this.properties = properties;
        }

        async eval(self, context) {
            const value = {};
            for (const property of this.properties) if (property.computed) {
                value[await property.key.eval(self, context)] = await property.value.eval(self, context);
            } else {
                value[property.key.symbol()] = await property.value.eval(self, context);
            }
            return value;
        }
    }
};

const {
    Ampersand, LeftParenthesis, RightParenthesis, Comma, FullStop: FullStop$1, Colon, EqualSign, QuestionMark, LeftSquareBracket,
    RightSquareBracket, LeftCurlyBracket, Pipe, RightCurlyBracket
} = CharCode;

const defaultSymbols$1 = Object.entries(Operators).reduce((symbols, [name, group]) => {
    symbols[name] = Object.keys(group);
    return symbols;
}, {});

class ParserError extends Error {
    constructor(lexer, message) {
        super(message);
        this.token = lexer.token;
    }
}

class Parser {

    constructor(operatorSymbols) {
        if (operatorSymbols) {
            const allSymbols = {};
            for (const [name, symbols] of Object.entries(operatorSymbols)) allSymbols[name] = symbols;
            for (const [name, symbols] of Object.entries(defaultSymbols$1)) allSymbols[name] = symbols;
            this.operatorSymbols = Lexer.compileSymbols(allSymbols);
        } else {
            this.operatorSymbols = Parser.defaultSymbols || (
                Parser.defaultSymbols = Lexer.compileSymbols(defaultSymbols$1)
            );
        }
    }

    parse(text) {
        const lexer = new Lexer(text, this.operatorSymbols);
        const ast = new AST.Expression(this.parseExpression(lexer));
        if (lexer.done) {
            lexer.error("Unexpected input: " + lexer.debug(20));
        }
        return ast;
    }

    parseExpression(lexer) {
        return this.parseComma(lexer);
    }

    parseComma(lexer) {
        let assignment = this.parseAssignment(lexer);
        if (lexer.peek === Comma) {
            const expressions = [assignment];
            do {
                lexer.advance(1);
                expressions.push(this.parseTernary(lexer));
            } while (lexer.peek === Comma);
            return new AST.CommaExpression(expressions);
        }
        return assignment;
    }

    parseAssignment(lexer) {
        const ternary = this.parseTernary(lexer);
        if (lexer.peek === EqualSign) {
            lexer.advance(1);
            const right = this.parseAssignment(lexer);
            if (ternary.write) {
                return new AST.AssignmentExpression(ternary, right);
            } else {
                throw new ParserError(lexer, `Trying to assign to a non l-value: '${ternary}'`);
            }
        } else {
            return ternary;
        }
    }

    parseTernary(lexer) {
        const test = this.parseLogicalOR(lexer);
        if (lexer.peek === QuestionMark) {
            lexer.advance(1);
            const consequent = this.parseExpression(lexer);
            lexer.expect(Colon);
            const alternate = this.parseExpression(lexer);
            return new AST.TernaryExpression(test, consequent, alternate);
        }
        return test;
    }

    parseLogicalOR(lexer) {
        let left = this.parseLogicalAND(lexer);
        while (lexer.peek === Pipe && lexer.consumeTwo(Pipe)) {
            left = new AST.LogicalExpression('||', left, this.parseLogicalAND(lexer));
        }
        return left;
    }

    parseLogicalAND(lexer) {
        let left = this.parseEquality(lexer);
        while (lexer.peek === Ampersand && lexer.consumeTwo(Ampersand)) {
            left = new AST.LogicalExpression('&&', left, this.parseEquality(lexer));
        }
        return left;
    }

    parseEquality(lexer) {
        let left = this.parseRelational(lexer), operator;
        while (operator = lexer.consumeSymbol('Equality')) {
            left = new AST.EqualityExpression(operator, left, this.parseRelational(lexer));
        }
        return left;
    }

    parseRelational(lexer) {
        let left = this.parseAdditive(lexer), operator;
        while (operator = lexer.consumeSymbol('Relational')) {
            left = new AST.RelationalExpression(operator, left, this.parseAdditive(lexer));
        }
        return left;
    }

    parseAdditive(lexer) {
        let left = this.parseMultiplicative(lexer), operator;
        while (operator = lexer.consumeSymbol('Additive')) {
            left = new AST.AdditiveExpression(operator, left, this.parseMultiplicative(lexer));
        }
        return left;
    }

    parseMultiplicative(lexer) {
        let left = this.parseUnary(lexer), operator;
        while (operator = lexer.consumeSymbol('Multiplicative')) {
            left = new AST.MultiplicativeExpression(operator, left, this.parseUnary(lexer));
        }
        return left;
    }

    parseUnary(lexer) {
        let operator = lexer.consumeSymbol('Unary');
        if (operator) {
            return new AST.UnaryExpression(true, operator, this.parseUnary(lexer));
        }
        return this.parsePrimary(lexer);
    }

    parsePrimary(lexer) {

        let primary;

        if (lexer.peek === LeftParenthesis) {
            lexer.advance(1);
            primary = this.parseExpression(lexer);
            lexer.expect(RightParenthesis);
        } else if (lexer.peek === LeftSquareBracket) {
            lexer.advance(1);
            primary = this.parseArray(lexer);
            lexer.expect(RightSquareBracket);
        } else if (lexer.peek === LeftCurlyBracket) {
            lexer.advance(1);
            primary = this.parseObject(lexer);
            lexer.expect(RightCurlyBracket);
        } else {
            const token = lexer.nextToken();
            switch (token.type) {
                case Tokens.Literal:
                    primary = AST.Literals[token.text] || new AST.Identifier(token.text);
                    break;
                case Tokens.String:
                    primary = new AST.Constant(String, token.text);
                    break;
                case Tokens.Number:
                    primary = new AST.Constant(Number, token.text);
                    break;
                default: {
                    throw new ParserError(lexer, `Not a primary expression: ${this.token.text}`);
                }
            }
        }

        do if (lexer.peek === LeftParenthesis) {
            lexer.advance(1);
            primary = new AST.CallExpression(primary, this.parseArguments(lexer));
            lexer.expect(RightParenthesis);
        } else if (lexer.peek === LeftSquareBracket) {
            lexer.advance(1);
            primary = new AST.MemberExpression(primary, this.parseExpression(lexer), true);
            lexer.expect(RightSquareBracket);
        } else if (lexer.peek === FullStop$1) {
            lexer.advance(1);
            primary = new AST.MemberExpression(primary, this.parseIdentifier(lexer), false);
        } else {
            return primary;
        } while (true);
    }

    parseArguments(lexer) {
        let args = [];
        if (lexer.peek && lexer.peek !== RightParenthesis) do {
            if (lexer.peek === Comma || lexer.peek === RightParenthesis) {
                args.push(AST.Literals.undefined);
                continue;
            }
            args.push(this.parseAssignment(lexer));
        } while (lexer.consume(Comma));
        return args;
    }

    parseIdentifier(lexer) {
        const token = lexer.nextLiteral();
        if (token.type !== Tokens.Literal || AST.Literals[token.text]) {
            throw new ParserError(lexer, `Expected <identifier> but found ${ this.token.text }`);
        }
        return new AST.Identifier(token.text, true);
    }

    parseArray(lexer) {
        let elements = [];
        if (lexer.peek && lexer.peek !== RightSquareBracket) do {
            if (lexer.peek === Comma || lexer.peek === RightSquareBracket) {
                elements.push(AST.Literals.undefined);
                continue;
            }
            elements.push(this.parseAssignment(lexer));
        } while (lexer.consume(Comma));
        return new AST.ArrayExpression(elements);
    }

    /**
     *
     * @param {Lexer} lexer
     * @return {*}
     */
    parseObject(lexer) {

        let properties = [], key, value, computed;

        if (lexer.peek && lexer.peek !== RightCurlyBracket) do {

            if (lexer.peek === Comma || lexer.peek === RightCurlyBracket) {
                continue;
            }

            if (lexer.consume(LeftSquareBracket)) {
                computed = true;
                key = this.parseAssignment(lexer);
                lexer.expect(RightSquareBracket);
                lexer.expect(Colon);
                value = this.parseAssignment(lexer);
            } else {
                computed = false;
                let token = lexer.nextToken();
                switch (token.type) {
                    case Tokens.Number:
                        key = new AST.Constant(Number, token.text);
                        lexer.expect(Colon);
                        value = this.parseAssignment(lexer);
                        break;
                    case Tokens.String:
                        key = new AST.Constant(String, token.text);
                        lexer.expect(Colon);
                        value = this.parseAssignment(lexer);
                        break;
                    case Tokens.Literal:
                        key = new AST.Identifier(token.text);
                        if (lexer.consume(Colon)) {
                            value = this.parseAssignment(lexer);
                        } else {
                            value = key;
                        }
                        break;
                    default:
                        throw new ParserError(lexer, `Invalid key: '${token.text}'`);
                }
            }

            properties.push(new AST.Property(key, value, computed));

        } while (lexer.consume(Comma));

        return new AST.ObjectExpression(properties);
    }
}

class Expression {

    constructor(source, parser = new Parser()) {
        this.ast = parser.parse(source);
    }

    invoke(self, context) {
        return this.ast.eval(self, context);
    }
}

exports.Lexer = Lexer;
exports.Parser = Parser;
exports.Expression = Expression;

Object.defineProperty(exports, '__esModule', { value: true });

})));
