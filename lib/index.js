(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.Majorana = {})));
}(this, (function (exports) { 'use strict';

const NewLine = 0x000A;              //  \n
const Space = 0x0020;                //
const ExclamationMark = 0x0021;      //  !
const QuotationMark = 0x0022;        //  "
const DollarSign = 0x0024;           //  $
const Ampersand = 0x0026;            //  &
const Apostrophe = 0x0027;           //  '
const Asterisk = 0x002A;             //  *
const PlusSign = 0x002B;             //  +
const MinusSign = 0x002D;            //  -
const FullStop = 0x002E;             //  .
const Slash = 0x002F;                //  /
const DigitZero = 0x0030;            //  0
const DigitOne = 0x0031;             //  1
const DigitEight = 0x0039;           //  8
const DigitNine = 0x0039;            //  9
const LessThanSign = 0x003C;         //  <
const EqualSign = 0x003D;            //  =
const GreaterThanSign = 0x003E;      //  >
const CapitalA = 0x0041;             //  A
const CapitalB = 0x0042;             //  B
const CapitalE = 0x0045;             //  E
const CapitalX = 0x0058;             //  X
const CapitalZ = 0x005A;             //  Z
const Backslash = 0x005C;            //  \
const LowLine = 0x005F;              //  _   [0101 1111] To Uppercase (e.g. 0x78 & 0x5F is 0x58 )
const LetterA = 0x0061;              //  a
const LetterB = 0x0062;              //  b
const LetterE = 0x0065;              //  e
const LetterF = 0x0066;              //  f
const LetterX = 0x0078;              //  x
const LetterZ = 0x007A;              //  z
const Pipe = 0x007C;                 //  |
const Tilde = 0x007E;                //  ~
const NBSP = 0x00A0;                 //  Non breaking space

const LOWERCASE = 0b00100000;        //  CapitalE | LOWERCASE = = = LetterE
const Tokens = {
    EoF:            0b00000000,
    Comment:        0b00000100,
    BlockComment:   0b00000101,
    LineComment:    0b00000110,
    Constant:       0b00001000,
    Number:         0b00001001,
    String:         0b00001010,
    Literal:        0b00010000,
    Symbol:         0b00010001,
    This:           0b00010010
};

class Lexer {

    constructor(source, options) {
        this.source = source;
        this.cursor = 0;
        this.line = 1;
        this.lineStart = -1;
    }

    [Symbol.iterator]() {
        return this;
    }

    static tokenize(text) {
        let tokens = [];
        for (let token of new Lexer(text)) {
            tokens.push(token);
        }
        return tokens;
    }

    get value() {
        return this.token;
    }

    get column() {
        return this.cursor - this.lineStart;
    }

    /**
     * Consumes all whitespaces and comments. Stops at the first character of a valid token.
     *
     * @returns {Number} the first non whitespace non comment charcode
     */
    advance() {

        var cc;

        while ((cc = this.source.charCodeAt(this.cursor)) <= Space || cc === Slash || Tilde < cc && cc < NBSP) {

            if (cc === Slash) if ((cc = this.source.charCodeAt(this.cursor + 1)) === Slash) {

                this.cursor++;

                do if ((cc = this.source.charCodeAt(++this.cursor)) === NewLine) {
                    this.line++;
                    this.lineStart = this.cursor;
                    break;
                } while (cc);

                continue;

            } else if (cc === Asterisk) {

                this.cursor++;

                while (cc = this.source.charCodeAt(++this.cursor)) if (cc === NewLine) {
                    this.line++;
                    this.lineStart = this.cursor;
                } else if (Asterisk === cc && Slash === this.source.charCodeAt(this.cursor + 1)) {
                    this.cursor += 2;
                    break;
                }
                if (cc) {
                    continue;
                }
                throw new Error(`Comment not closed at line: ${this.line}, column: ${this.cursor - this.lineStart}.`);

            } else {

                return Slash;
            }

            if (cc === NewLine) {
                this.line++;
                this.lineStart = this.cursor++;
            } else {
                this.cursor++;
            }
        }

        return cc;
    }

    next() {
        let cc = this.advance();
        if (!cc) {
            return this.close();
        }

        const source = this.source;

        if (cc === DigitZero) {
            let cursor = this.cursor + 1, cc2 = source.charCodeAt(cursor);
            if (cc2 === LetterX || cc2 === CapitalX) {
                while ((cc = source.charCodeAt(++cursor) | LOWERCASE) && ( cc >= DigitZero && cc <= DigitNine || cc >= LetterA && cc <= LetterF )) ;
            } else if (cc2 === LetterB || cc2 === CapitalB) {
                while ((cc = source.charCodeAt(++cursor)) && ( cc >= DigitZero && cc <= DigitOne )) ;
            } else if (cc2 >= DigitZero && cc2 < DigitEight) {
                while ((cc = source.charCodeAt(++cursor)) && ( cc >= DigitZero && cc < DigitEight )) ;
            } else {
                return this.nextNumber();
            }
            return this.consumeNumber(source.substring(this.cursor, cursor));
        }

        if (cc > DigitZero && cc <= DigitNine) {
            return this.nextNumber();
        }

        if (cc === LowLine || cc === DollarSign || cc >= LetterA && cc <= LetterZ || cc >= CapitalA && cc <= CapitalZ) {
            return this.nextLiteral();
        }

        if (cc === Apostrophe || cc === QuotationMark) {
            return this.nextString(cc);
        }

        if (cc === FullStop) {
            let cc2 = source.charCodeAt(this.cursor + 1);
            if (cc2 >= DigitZero && cc2 <= DigitNine) {
                return this.nextNumber(cc);
            }
            // return this.consumeSymbol(String.fromCharCode(cc));
        }

        if (cc === ExclamationMark || cc === EqualSign) {
            let cc2 = source.charCodeAt(this.cursor + 1);
            if (cc2 === EqualSign) {
                let cc3 = source.charCodeAt(this.cursor + 2);
                if (cc3 === EqualSign) {
                    return this.consumeSymbol(String.fromCharCode(cc, cc2, cc3));
                } else {
                    return this.consumeSymbol(String.fromCharCode(cc, cc2));
                }
            }
            return this.consumeSymbol(String.fromCharCode(cc));
        }

        if (cc === GreaterThanSign || cc === LessThanSign) {
            let cc2 = source.charCodeAt(this.cursor + 1);
            if (cc2 === EqualSign || cc2 === cc) {
                return this.consumeSymbol(String.fromCharCode(cc, cc2));
            }
            return this.consumeSymbol(String.fromCharCode(cc));
        }

        if (cc === Ampersand || cc === Pipe) {
            let cc2 = source.charCodeAt(this.cursor + 1);
            if (cc2 === cc) {
                return this.consumeSymbol(String.fromCharCode(cc, cc2));
            } else {
                return this.consumeSymbol(String.fromCharCode(cc));
            }
        }

        return this.consumeSymbol(String.fromCharCode(cc));
    }

    nextNumber(cc) {
        const source = this.source;
        let cursor = this.cursor;

        if (cc !== FullStop) {
            while ((cc = source.charCodeAt(++cursor)) && ( cc >= DigitZero && cc <= DigitNine )) /* ignored */;
        }

        if (cc === FullStop) {
            while ((cc = source.charCodeAt(++cursor)) && ( cc >= DigitZero && cc <= DigitNine )) ;
        }

        if (cc === LetterE || cc === CapitalE) {
            if ((cc = source.charCodeAt(cursor + 1)) === PlusSign || cc === MinusSign) cursor++;

            while ((cc = source.charCodeAt(++cursor)) && ( cc >= DigitZero && cc <= DigitNine )) ;
        }

        return this.consumeNumber(source.substring(this.cursor, cursor));
    }

    nextLiteral() {
        const source = this.source;
        let cc, cursor = this.cursor;

        while ((cc = source.charCodeAt(++cursor)) && (
            cc >= LetterA && cc <= LetterZ || cc >= CapitalA && cc <= CapitalZ ||
            cc >= DigitZero && cc <= DigitNine ||
            cc === LowLine || cc === DollarSign
        )) ;

        return this.consumeLiteral(source.substring(this.cursor, cursor));
    }

    nextString(quote) {
        const source = this.source;
        let cc, cursor = this.cursor, escape = false;

        while (cc = source.charCodeAt(++cursor)) if (escape) {
            if (cc === NewLine) {
                this.line++;
                this.lineStart = cursor;
            }
            escape = false;
        } else if (cc === Backslash) {
            escape = true;
        } else if (cc === quote) {
            return this.consumeString(source.substring(this.cursor, cursor + 1));
        } else if (cc === NewLine) {
            break;
        }

        throw new Error(`String literal not closed at line: ${this.line}, column: ${cursor - this.lineStart}.`);
    }

    consumeToken(type, text) {
        this.token = {
            text: text,
            type: type,
            line: this.line,
            column: this.cursor - this.lineStart
        };
        this.cursor += text.length;
        return this;
    }

    consumeNumber(text) {
        this.token = {
            text: text,
            type: Tokens.Number,
            line: this.line,
            column: this.cursor - this.lineStart
        };
        this.cursor += text.length;
        return this;
    }

    consumeLiteral(text) {
        this.token = {
            text: text,
            type: Tokens.Literal,
            line: this.line,
            column: this.cursor - this.lineStart
        };
        this.cursor += text.length;
        return this;
    }

    consumeString(text) {
        this.token = {
            text: text,
            type: Tokens.String,
            line: this.line,
            column: this.cursor - this.lineStart
        };
        this.cursor += text.length;
        return this;
    }

    consumeSymbol(text) {
        this.token = {
            text: text,
            type: Tokens.Symbol,
            line: this.line,
            column: this.cursor - this.lineStart
        };
        this.cursor += text.length;
        return this;
    }

    consume(cc) {
        if (cc === this.advance()) {
            this.cursor++;
            return this;
        }
    }

    expect(cc) {
        if (cc === this.advance()) {
            this.cursor++;
            return this;
        } else {
            throw new Error(`Expected ${
                String.fromCharCode(cc)
                } but was '${
                this.source.charAt(this.cursor)
                }' at line: ${this.line}, column: ${this.column}.`
            );
        }
    }

    consumeTwo(fc, sc) {
        if (fc === this.advance() && sc === this.source.charCodeAt(this.cursor + 1)) {
            this.cursor += 2;
            return this;
        }
    }

    consumeThree(fc, sc, tc) {
        if (fc === this.advance() && sc === this.source.charCodeAt(this.cursor + 1) && tc === this.source.charCodeAt(this.cursor + 2)) {
            this.cursor += 3;
            return this;
        }
    }

    consumeText(text) {

        if (!this.advance()) return false;

        let p = text.length;

        while (p--) if (this.source.charCodeAt(this.cursor + p) !== text.charCodeAt(this.cursor + p)) {
            return false
        }

        this.cursor += text.length;
        return text;
    }

    expectText(text) {
        if (!this.consumeText(text)) {
            throw new Error(`Expected ${
                JSON.stringify(text)
                } but was '${
                JSON.stringify(this.source.substring(this.cursor, from + 1))
                }' at line: ${this.line}, column: ${this.column}.`
            );
        }
        return this;
    }

    close() {
        this.done = true;
        this.token = {type: Tokens.EoF, text: '<EoF>'};
        this.cursor = this.source.length;
        return this;
    }
}

const ExclamationMark$1 = 0x0021;     //  !
const PercentSign$1 = 0x0025;         //  %
const Ampersand$1 = 0x0026;           //  &
const LeftParenthesis$1 = 0x0028;     //  (
const RightParenthesis$1 = 0x0029;    //  )
const Asterisk$1 = 0x002A;            //  *
const PlusSign$1 = 0x002B;            //  +
const Comma$1 = 0x002C;               //  ,
const MinusSign$1 = 0x002D;           //  -
const FullStop$1 = 0x002E;            //  .
const Slash$1 = 0x002F;               //  /
const Colon$1 = 0x003A;               //  :
const LessThanSign$1 = 0x003C;        //  <
const EqualSign$1 = 0x003D;           //  =
const GreaterThanSign$1 = 0x003E;     //  >
const QuestionMark$1 = 0x003F;        //  ?
const LeftSquareBracket$1 = 0x005B;   //  [
const RightSquareBracket$1 = 0x005D;  //  ]
const LeftCurlyBracket$1 = 0x007B;    //  {
const Pipe$1 = 0x007C;                //  |
const RightCurlyBracket$1 = 0x007D;   //  }
const Literals = {
    'this': true,
    'true': true,
    'false': true,
    'undefined': true,
    'null': true
};

/**
 *
 */
class ParseError extends Error {
    constructor(parser, message) {
        super(message);
        this.token = parser.token;
    }
}

const AST = {
    ExpressionStatement: 'ExpressionStatement',
    AssignmentExpression: 'AssignmentExpression',
    ConditionalExpression: 'ConditionalExpression',
    LogicalExpression: 'LogicalExpression',
    BinaryExpression: 'BinaryExpression',
    UnaryExpression: 'UnaryExpression',
    CallExpression: 'CallExpression',
    MemberExpression: 'MemberExpression',
    Identifier: 'Identifier',
    Literal: 'Literal',
    Number: 'Number',
    String: 'String',
    ArrayExpression: 'ArrayExpression',
    Property: 'Property',
    ObjectExpression: 'ObjectExpression'
};

/**
 *
 */
class Parser extends Lexer {

    constructor(text) {
        super(text);
    }

    static parse(text) {
        return new Parser(text).ast();
    }

    ast() {
        const ast = this.expressionStatement();
        if (this.cursor < this.source.length) {
            throw new ParseError(this, `Unexpected input: ${
                this.source.substring(this.cursor, Math.min(this.cursor + 10, this.source.length))
                }... at line: ${
                this.line
                }, column: ${
                this.column
                }`);
        }
        return ast;
    }

    expressionStatement() {
        return {type: AST.ExpressionStatement, expression: this.filterChain()};
    }

    filterChain() {
        let expression = this.expression();
        while (this.consume(Pipe$1)) {
            expression = this.filter(expression);
        }
        return expression;
    }

    expression() {
        return this.assignment();
    }

    assignment() {
        let result = this.ternary();
        if (this.consume(EqualSign$1)) {
            if (result.type !== Identifier && result.type !== MemberExpression) {
                throw new ParseError(this, `Trying to assign a value to a non l-value: '${result}'`);
            }
            result = {type: AST.AssignmentExpression, left: result, right: this.assignment()};
        }
        return result;
    }

    ternary() {
        const test = this.logicalOR();
        if (this.consume(QuestionMark$1)) {
            const alternate = this.expression();
            if (this.expect(Colon$1)) {
                const consequent = this.expression();
                return {type: AST.ConditionalExpression, test: test, alternate: alternate, consequent: consequent};
            }
        }
        return test;
    }

    logicalOR() {
        let left = this.logicalAND();
        while (this.consumeTwo(Pipe$1, Pipe$1)) {
            left = {type: AST.LogicalExpression, operator: '||', left: left, right: this.logicalAND()};
        }
        return left;
    }

    logicalAND() {
        let left = this.equality();
        while (this.consumeTwo(Ampersand$1, Ampersand$1)) {
            left = {type: AST.LogicalExpression, operator: '&&', left: left, right: this.equality()};
        }
        return left;
    }

    equality() {
        let left = this.relational(), operator;
        while (operator = this.consumeEqualityOperator()) {
            left = {type: AST.BinaryExpression, operator: operator, left: left, right: this.relational()};
        }
        return left;
    }

    consumeEqualityOperator() {
        let cc = this.advance();
        if (cc === ExclamationMark$1 || cc === EqualSign$1) {
            if (this.source.charCodeAt(this.cursor + 1) === EqualSign$1) {
                if (this.source.charCodeAt(this.cursor + 2) === EqualSign$1) {
                    this.cursor += 3;
                    return String.fromCharCode(cc, EqualSign$1, EqualSign$1);
                } else {
                    this.cursor += 2;
                    return String.fromCharCode(cc, EqualSign$1);
                }
            } else {
                this.cursor++;
                return String.fromCharCode(cc);
            }
        }
    }

    relational() {
        let left = this.additive(), operator;
        while (operator = this.consumeRelationalOperator()) {
            const right = this.additive();
            left = {type: AST.BinaryExpression, operator: operator, left: left, right: this.additive()};
        }
        return left;
    }

    consumeRelationalOperator() {
        let cc = this.advance();
        if (cc === GreaterThanSign$1 || cc === LessThanSign$1) {
            const cc2 = this.source.charCodeAt(this.cursor + 1);
            if (cc2 === EqualSign$1 || cc2 === cc) {
                this.cursor += 2;
                return String.fromCharCode(cc, cc2);
            } else {
                this.cursor++;
                return String.fromCharCode(cc);
            }
        }
    }

    additive() {
        let left = this.multiplicative(), operator;
        while (operator = this.consumeAdditiveOperator()) {
            left = {type: AST.BinaryExpression, operator: operator, left: left, right: this.multiplicative()};
        }
        return left;
    }

    consumeAdditiveOperator() {
        let cc = this.advance();
        if (cc === PlusSign$1 || cc === MinusSign$1) {
            this.cursor++;
            return String.fromCharCode(cc);
        }
    }

    multiplicative() {
        let left = this.unary(), operator;
        while (operator = this.consumeMultiplicativeOperator()) {
            left = {type: AST.BinaryExpression, operator: operator, left: left, right: this.unary()};
        }
        return left;
    }

    consumeMultiplicativeOperator() {
        let cc = this.advance();
        if (cc === Asterisk$1 || cc === Slash$1 || cc === PercentSign$1) {
            this.cursor++;
            return String.fromCharCode(cc);
        }
    }

    unary() {
        let operator = this.consumeUnaryOperator();
        if (operator) {
            const argument = this.unary();
            return {type: AST.UnaryExpression, operator: operator, prefix: true, argument: this.unary()};
        }
        return this.primary();
    }

    consumeUnaryOperator() {
        let cc = this.advance();
        if (cc === PlusSign$1 || cc === MinusSign$1 || cc === ExclamationMark$1) {
            this.cursor++;
            return String.fromCharCode(cc);
        }
    }

    primary() {

        let primary, cc = this.advance();

        if (cc === LeftParenthesis$1) {
            this.cursor++;
            primary = this.filterChain();
            this.expect(RightParenthesis$1);
        } else if (cc === LeftSquareBracket$1) {
            this.cursor++;
            primary = this.arrayDeclaration();
        } else if (cc === LeftCurlyBracket$1) {
            this.cursor++;
            primary = this.object();
        } else {
            const token = this.next().token;
            switch (token.type) {
                case Tokens.Literal:
                    if (!Literals[token.text]) {
                        primary = {type: AST.Identifier, name: token.text};
                    } else {
                        primary = {type: AST.Literal, value: token.text};
                    }
                    break;
                case Tokens.String:
                    primary = {type: AST.String, value: token.text};
                    break;
                case Tokens.Number:
                    primary = {type: AST.Number, text: token.text};
                    break;
                default: {
                    throw new ParseError(this, `Not a primary expression: ${this.token.text}`);
                }
            }
        }

        do switch (cc = this.advance()) {
            case LeftParenthesis$1:
                this.cursor++;
                primary = {type: AST.CallExpression, callee: primary, args: this.parseArguments()};
                this.expect(RightParenthesis$1);
                continue;
            case LeftSquareBracket$1:
                this.cursor++;
                primary = {type: AST.MemberExpression, object: primary, property: this.expression(), computed: true};
                this.expect(RightSquareBracket$1);
                continue;
            case FullStop$1:
                this.cursor++;
                primary = {type: AST.MemberExpression, object: primary, property: this.identifier(), computed: false};
                continue;
            default:
                return primary;
        } while (true);
    }

    filter(token, baseExpression) {
        const args = [baseExpression];
        const result = {type: AST.CallExpression, callee: this.identifier(), args: args, filter: true};

        while (this.consume(Colon$1)) {
            args.push(this.expression());
        }
        return result;
    }

    parseArguments() {
        let cc, args = [];
        if ((cc = this.advance()) && cc !== RightParenthesis$1) do {
            args.push(this.filterChain());
        } while (this.consume(Comma$1));
        return args;
    }

    identifier() {
        const token = this.nextLiteral().token;
        if (token.type !== Tokens.Literal || Literals[token.text]) {
            throw new ParseError(this, `Expected <identifier> but found ${ this.token.text }`);
        }
        return {type: AST.Identifier, name: token.text}
    }

    arrayDeclaration() {
        let cc, elements = [];
        if ((cc = this.advance()) && cc !== RightSquareBracket$1) do {
            elements.push(this.expression());
        } while (this.consume(Comma$1));
        this.expect(RightSquareBracket$1);
        return {type: AST.ArrayExpression, elements: elements};
    }

    object() {
        let cc, properties = [], property;

        if ((cc = this.advance()) && cc !== RightCurlyBracket$1) do {

            let token = this.next().token;

            property = {type: AST.Property, kind: 'init'};

            if (token.type & Tokens.Constant) {
                property.key = {type: AST.Literal, text: token.text};
                property.computed = false;
                this.expect(Colon$1);
                property.value = this.expression();
            } else if (token.type & Tokens.Literal) {
                property.computed = false;
                if (Literals[token.text]) {
                    property.key = {type: AST.Literal, text: token.text};
                    this.expect(Colon$1);
                    property.value = this.expression();
                } else {
                    property.key = {type: AST.Identifier, name: token.text};
                    if (this.consume(Colon$1)) {
                        property.value = this.expression();
                    } else {
                        property.value = property.key;
                    }
                }
            } else if (token.text === '[') {
                property.computed = true;
                property.key = this.expression();
                this.expect(RightSquareBracket$1);
                this.expect(Colon$1);
                property.value = this.expression();
            } else {
                throw new ParseError(this, `Invalid key: '${this.token.text}'`);
            }

            properties.push(property);

        } while (this.consume(Comma$1));

        this.expect(RightCurlyBracket$1);

        return {type: AST.ObjectExpression, properties: properties};
    }
}

const ArrayExpression = 'ArrayExpression';
const AssignmentExpression = 'AssignmentExpression';
const BinaryExpression = 'BinaryExpression';
const CallExpression = 'CallExpression';
const ConditionalExpression = 'ConditionalExpression';
const ExpressionStatement = 'ExpressionStatement';
const Identifier$1 = 'Identifier';
const Literal = 'Literal';
const Number = 'Number';
const String$1 = 'String';
const LogicalExpression = 'LogicalExpression';
const MemberExpression$1 = 'MemberExpression';
const ObjectExpression = 'ObjectExpression';
const Property = 'Property';
const UnaryExpression = 'UnaryExpression';

class Compiler {

    compile(source) {

        this.parameters = new Set();

        const ast = new Parser(source).ast();
        const code = this[ast.type](ast);

        return {
            ast,
            code,
            parameters: Array.from(this.parameters)
        };
    }

    [ExpressionStatement]({expression}) {
        return this[expression.type](expression);
    }

    [AssignmentExpression]({left, right}) {
        return this[left.type](left) + '=' + this[right.type](right);
    }

    [ConditionalExpression]({test, alternate, consequent}) {
        return this[test.type](test) + '?' + this[alternate.type](alternate) + ":" + this[consequent.type](consequent);
    }

    [LogicalExpression]({operator, left, right}) {
        return this[left.type](left) + operator + this[right.type](right);
    }

    [BinaryExpression]({operator, left, right}) {
        try {
            return this[left.type](left) + operator + this[right.type](right);
        } catch (e) {
            console.error(operator, left, right);
        }
    }

    [UnaryExpression]({operator, argument, prefix}) {
        argument = this[argument.type](argument);
        if (prefix) {
            return operator + argument;
        } else {
            return argument + operator;
        }
    }

    [CallExpression]({callee, args, filter}) {
        args = args.map(arg => this[arg.type](arg));
        if (!filter) {
            return this[callee.type](callee) + '(' + args + ')';
        }
    }

    [MemberExpression$1]({object, property, computed}) {
        property = this[property.type](property);
        if (computed) {
            return this[object.type](object) + '[' + property + ']';
        } else {
            return this[object.type](object) + '.' + property;
        }
    }

    [Identifier$1]({name}) {
        this.parameters.add(name);
        return name;
    }

    [Literal]({text}) {
        return text;
    }

    [Number]({text}) {
        return text;
    }

    [String$1]({text}) {
        return text;
    }

    [ArrayExpression]({elements}) {
        elements = elements.map(e => this[e.type](e));
        return '[' + elements + ']';
    }

    [Property]({key, value, computed}) {
        key = this[key.type](key);
        value = this[value.type](value);
        if (computed) {
            return '[' + key + ']:' + value;
        } else {
            return key + ':' + value;
        }
    }

    [ObjectExpression]({properties}) {
        properties = properties.map(p => this[p.type](p));
        return '{' + properties + '}';
    }
}

exports.Lexer = Lexer;
exports.Parser = Parser;
exports.Compiler = Compiler;

Object.defineProperty(exports, '__esModule', { value: true });

})));
