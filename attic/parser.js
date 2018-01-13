import {Lexer} from "./lexer.js"
import {Tokens} from "./tokens.js";
import {CharCode} from "./charcodes.js";

const {
    ExclamationMark, PercentSign, Ampersand, LeftParenthesis, RightParenthesis, Asterisk, PlusSign, Comma, MinusSign,
    FullStop, Slash, Colon, LessThanSign, EqualSign, GreaterThanSign, QuestionMark, LeftSquareBracket,
    RightSquareBracket, LeftCurlyBracket, Pipe, RightCurlyBracket
} = CharCode;

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

export const AST = {
    ArrayExpression: 'ArrayExpression',
    AssignmentExpression: 'AssignmentExpression',
    AwaitExpression: 'AwaitExpression',
    BinaryExpression: 'BinaryExpression',
    CallExpression: 'CallExpression',
    ConditionalExpression: 'ConditionalExpression',
    ExpressionStatement: 'ExpressionStatement',
    Identifier: 'Identifier',
    Literal: 'Literal',
    This: 'This',
    LogicalExpression: 'LogicalExpression',
    MemberExpression: 'MemberExpression',
    Number: 'Number',
    ObjectExpression: 'ObjectExpression',
    Property: 'Property',
    String: 'String',
    UnaryExpression: 'UnaryExpression'
};

/**
 *
 */
export class Parser extends Lexer {

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
        while (this.consume(Pipe)) {
            expression = this.filter(expression);
        }
        return expression;
    }

    expression() {
        return this.assignment();
    }

    assignment() {
        let result = this.ternary();
        if (this.consume(EqualSign)) {
            if (result.type !== Identifier && result.type !== MemberExpression) {
                throw new ParseError(this, `Trying to assign a value to a non l-value: '${result}'`);
            }
            result = {type: AST.AssignmentExpression, left: result, right: this.assignment()};
        }
        return result;
    }

    ternary() {
        const test = this.logicalOR();
        if (this.consume(QuestionMark)) {
            const alternate = this.expression();
            if (this.expect(Colon)) {
                const consequent = this.expression();
                return {type: AST.ConditionalExpression, test: test, alternate: alternate, consequent: consequent};
            }
        }
        return test;
    }

    logicalOR() {
        let left = this.logicalAND();
        while (this.consumeTwo(Pipe, Pipe)) {
            left = {type: AST.LogicalExpression, operator: '||', left: left, right: this.logicalAND()};
        }
        return left;
    }

    logicalAND() {
        let left = this.equality();
        while (this.consumeTwo(Ampersand, Ampersand)) {
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
        if (cc === ExclamationMark || cc === EqualSign) {
            if (this.source.charCodeAt(this.cursor + 1) === EqualSign) {
                if (this.source.charCodeAt(this.cursor + 2) === EqualSign) {
                    this.cursor += 3;
                    return String.fromCharCode(cc, EqualSign, EqualSign);
                } else {
                    this.cursor += 2;
                    return String.fromCharCode(cc, EqualSign);
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
        if (cc === GreaterThanSign || cc === LessThanSign) {
            const cc2 = this.source.charCodeAt(this.cursor + 1);
            if (cc2 === EqualSign || cc2 === cc) {
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
        if (cc === PlusSign || cc === MinusSign) {
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
        if (cc === Asterisk || cc === Slash || cc === PercentSign) {
            this.cursor++;
            return String.fromCharCode(cc);
        }
    }

    unary() {
        let operator = this.consumeUnaryOperator();
        if (operator) {
            const argument = this.unary();
            const prefix = true;
            return {type: AST.UnaryExpression, operator: operator, prefix: true, argument: this.unary()};
        }
        return this.await();
    }

    consumeUnaryOperator() {
        let cc = this.advance();
        if (cc === PlusSign || cc === MinusSign || cc === ExclamationMark) {
            this.cursor++;
            return String.fromCharCode(cc);
        }
    }

    await() {
        if (this.consumeText('await')) {
            return {type: AST.AwaitExpression, async: this.primary()};
        }
        return this.primary();
    }

    primary() {

        let primary, cc = this.advance();

        if (cc === LeftParenthesis) {
            this.cursor++;
            primary = this.filterChain();
            this.expect(RightParenthesis);
        } else if (cc === LeftSquareBracket) {
            this.cursor++;
            primary = this.arrayDeclaration();
        } else if (cc === LeftCurlyBracket) {
            this.cursor++;
            primary = this.object();
        } else {
            const token = this.next().token;
            switch (token.type) {
                case Tokens.Literal:
                    if (Literals[token.text]) {
                        primary = {type: AST.Literal, text: token.text};
                    } else {
                        primary = {type: AST.Identifier, name: token.text};
                    }
                    break;
                case Tokens.String:
                    primary = {type: AST.String, value: token.text};
                    break;
                case Tokens.Number:
                    primary = {type: AST.Number, text: token.text};
                    break;
                case Tokens.This:
                    primary = {type: AST.This};
                    break;
                default: {
                    throw new ParseError(this, `Not a primary expression: ${this.token.text}`);
                }
            }
        }

        do switch (cc = this.advance()) {
            case LeftParenthesis:
                this.cursor++;
                primary = {type: AST.CallExpression, callee: primary, args: this.parseArguments()};
                this.expect(RightParenthesis);
                continue;
            case LeftSquareBracket:
                this.cursor++;
                primary = {type: AST.MemberExpression, object: primary, property: this.expression(), computed: true};
                this.expect(RightSquareBracket);
                continue;
            case FullStop:
                this.cursor++;
                primary = {
                    type: AST.MemberExpression,
                    object: primary,
                    property: this.identifier(true),
                    computed: false
                };
                continue;
            default:
                return primary;
        } while (true);
    }

    filter(token, baseExpression) {
        const args = [baseExpression];
        const result = {type: AST.CallExpression, callee: this.identifier(), args: args, filter: true};

        while (this.consume(Colon)) {
            args.push(this.expression());
        }
        return result;
    }

    parseArguments() {
        let cc, args = [];
        if ((cc = this.advance()) && cc !== RightParenthesis) do {
            args.push(this.filterChain());
        } while (this.consume(Comma));
        return args;
    }

    identifier(local) {
        const token = this.nextLiteral().token;
        if (token.type !== Tokens.Literal || Literals[token.text]) {
            throw new ParseError(this, `Expected <identifier> but found ${ this.token.text }`);
        }
        return {type: AST.Identifier, name: token.text, local: local}
    }

    arrayDeclaration() {
        let cc, elements = [];
        if ((cc = this.advance()) && cc !== RightSquareBracket) do {
            elements.push(this.expression());
        } while (this.consume(Comma));
        this.expect(RightSquareBracket);
        return {type: AST.ArrayExpression, elements: elements};
    }

    object() {
        let cc, properties = [], property;

        if ((cc = this.advance()) && cc !== RightCurlyBracket) do {

            let token = this.next().token;

            property = {type: AST.Property, kind: 'init'};

            if (token.type & Tokens.Constant) {
                property.key = {type: AST.Literal, text: token.text};
                property.computed = false;
                this.expect(Colon);
                property.value = this.expression();
            } else if (token.type & Tokens.Literal) {
                property.computed = false;
                if (Literals[token.text]) {
                    property.key = {type: AST.Literal, text: token.text};
                    this.expect(Colon);
                    property.value = this.expression();
                } else {
                    property.key = {type: AST.Identifier, name: token.text};
                    if (this.consume(Colon)) {
                        property.value = this.expression();
                    } else {
                        property.value = property.key;
                    }
                }
            } else if (token.text === '[') {
                property.computed = true;
                property.key = this.expression();
                this.expect(RightSquareBracket);
                this.expect(Colon);
                property.value = this.expression();
            } else {
                throw new ParseError(this, `Invalid key: '${this.token.text}'`);
            }

            properties.push(property);

        } while (this.consume(Comma));

        this.expect(RightCurlyBracket);

        return {type: AST.ObjectExpression, properties: properties};
    }
}
