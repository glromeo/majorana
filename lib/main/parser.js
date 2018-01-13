"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Parser = exports.ParserError = undefined;

var _lexer = require("./lexer.js");

var _charcodes = require("./charcodes.js");

var _language = require("./language.js");

var _ast = require("./ast.js");

const {
    Ampersand, LeftParenthesis, RightParenthesis, Comma, FullStop, Colon, EqualSign, QuestionMark, LeftSquareBracket,
    RightSquareBracket, LeftCurlyBracket, Pipe, RightCurlyBracket
} = _charcodes.CharCode;

const defaultSymbols = _lexer.Lexer.compileSymbols(_language.Symbols);

let ParserError = exports.ParserError = class ParserError extends Error {
    constructor(lexer, message) {
        super(message);
        this.token = lexer.token;
    }
};
let Parser = exports.Parser = class Parser {

    constructor(lexerSymbols) {
        if (lexerSymbols) {
            this.lexerSymbols = _lexer.Lexer.compileSymbols(Object.assign({}, defaultSymbols, lexerSymbols));
        } else {
            this.lexerSymbols = defaultSymbols;
        }
    }

    parse(text) {
        const lexer = new _lexer.Lexer(text, this.lexerSymbols);
        const ast = this.parseExpression(lexer);
        if (lexer.done) {
            const input = lexer.source.substring(lexer.position, Math.min(lexer.position + 10, lexer.source.length));
            const line = lexer.line;
            const column = lexer.column;
            throw new ParserError(lexer, `Unexpected input: ${input}... at line: ${line}, column: ${column}`);
        }
        return ast;
    }

    parseExpression(lexer) {
        return new _ast.AST.Expression(this.parseComma(lexer));
    }

    parseComma(lexer) {
        let assignment = this.parseAssignment(lexer);
        if (lexer.consume(Comma)) {
            const expressions = [assignment];
            do {
                expressions.push(this.parseTernary(lexer));
            } while (lexer.consume(Comma));
            return new _ast.AST.CommaExpression(expressions);
        }
        return assignment;
    }

    parseAssignment(lexer) {
        const ternary = this.parseTernary(lexer);
        if (lexer.consume(EqualSign)) {
            const right = this.parseAssignment(lexer);
            if (ternary.write) {
                return new _ast.AST.AssignmentExpression(ternary, right);
            } else {
                throw new ParserError(lexer, `Trying to assign to a non l-value: '${ternary}'`);
            }
        } else {
            return ternary;
        }
    }

    parseTernary(lexer) {
        const test = this.parseLogicalOR(lexer);
        if (lexer.consume(QuestionMark)) {
            const consequent = this.parseExpression(lexer);
            lexer.expect(Colon);
            const alternate = this.parseExpression(lexer);
            return new _ast.AST.TernaryExpression({ test: test, consequent: consequent, alternate: alternate });
        }
        return test;
    }

    parseLogicalOR(lexer) {
        let left = this.parseLogicalAND(lexer),
            operator;
        while (operator = lexer.consumeTwo(Pipe)) {
            left = new _ast.AST.BinaryExpression(operator, left, this.parseLogicalAND(lexer));
        }
        return left;
    }

    parseLogicalAND(lexer) {
        let left = this.parseEquality(lexer),
            operator;
        while (operator = lexer.consumeTwo(Ampersand)) {
            left = new _ast.AST.BinaryExpression(operator, left, this.parseEquality(lexer));
        }
        return left;
    }

    parseEquality(lexer) {
        let left = this.parseRelational(lexer),
            operator;
        while (operator = lexer.consumeSymbol('equality')) {
            left = new _ast.AST.BinaryExpression(operator, left, this.parseRelational(lexer));
        }
        return left;
    }

    parseRelational(lexer) {
        let left = this.parseAdditive(lexer),
            operator;
        while (operator = lexer.consumeSymbol('relational')) {
            left = new _ast.AST.BinaryExpression(operator, left, this.parseAdditive(lexer));
        }
        return left;
    }

    parseAdditive(lexer) {
        let left = this.parseMultiplicative(lexer),
            operator;
        while (operator = lexer.consumeSymbol('additive')) {
            left = new _ast.AST.BinaryExpression(operator, left, this.parseMultiplicative(lexer));
        }
        return left;
    }

    parseMultiplicative(lexer) {
        let left = this.parseUnary(lexer),
            operator;
        while (operator = lexer.consumeSymbol('multiplicative')) {
            left = new _ast.AST.BinaryExpression(operator, left, this.parseUnary(lexer));
        }
        return left;
    }

    parseUnary(lexer) {
        let operator = lexer.consumeSymbol('unary');
        if (operator) {
            return new _ast.AST.UnaryExpression(operator, true, this.parseUnary(lexer));
        }
        return this.parsePrimary(lexer);
    }

    parsePrimary(lexer) {

        let primary;

        if (lexer.consume(LeftParenthesis)) {
            primary = this.parseExpression(lexer);
            lexer.expect(RightParenthesis);
        } else if (lexer.consume(LeftSquareBracket)) {
            primary = this.parseArray(lexer);
            lexer.expect(RightSquareBracket);
        } else if (lexer.consume(LeftCurlyBracket)) {
            primary = this.parseObject(lexer);
            lexer.expect(RightCurlyBracket);
        } else {
            const token = lexer.nextToken();
            switch (token.type) {
                case _language.Tokens.Literal:
                    primary = _ast.AST.Literals[token.text] || new _ast.AST.Identifier(token.text);
                    break;
                case _language.Tokens.String:
                    primary = new _ast.AST.Constant(String, token.text);
                    break;
                case _language.Tokens.Number:
                    primary = new _ast.AST.Constant(Number, token.text);
                    break;
                default:
                    {
                        throw new ParserError(lexer, `Not a primary expression: ${this.token.text}`);
                    }
            }
        }

        do if (lexer.consume(LeftParenthesis)) {
            primary = new _ast.AST.CallExpression(primary, this.parseArguments(lexer));
            lexer.expect(RightParenthesis);
        } else if (lexer.consume(LeftSquareBracket)) {
            primary = new _ast.AST.MemberExpression(primary, this.parseExpression(lexer), true);
            lexer.expect(RightSquareBracket);
        } else if (lexer.consume(FullStop)) {
            primary = new _ast.AST.MemberExpression(primary, this.parseIdentifier(lexer), false);
        } else {
            return primary;
        } while (true);
    }

    parseArguments(lexer) {
        let cc,
            args = [];
        if ((cc = lexer.advance()) && cc !== RightParenthesis) do {
            args.push(this.parseExpression(lexer));
        } while (lexer.consume(Comma));
        return args;
    }

    parseIdentifier(lexer) {
        const token = lexer.nextLiteral();
        if (token.type !== _language.Tokens.Literal || _ast.AST.Literals[token.text]) {
            throw new ParserError(lexer, `Expected <identifier> but found ${this.token.text}`);
        }
        return new _ast.AST.Identifier(token.text, true);
    }

    parseArray(lexer) {
        let cc,
            elements = [];
        if ((cc = lexer.advance()) && cc !== RightSquareBracket) do {
            elements.push(this.parseAssignment(lexer));
        } while (lexer.consume(Comma));
        return new _ast.AST.ArrayExpression(elements);
    }

    /**
     *
     * @param {Lexer} lexer
     * @return {*}
     */
    parseObject(lexer) {

        let cc,
            properties = [],
            key,
            value,
            computed;

        if ((cc = lexer.advance()) && cc !== RightCurlyBracket) do {

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
                    case _language.Tokens.Number:
                        key = new _ast.AST.Constant(Number, token.text);
                        lexer.expect(Colon);
                        value = this.parseAssignment(lexer);
                        break;
                    case _language.Tokens.String:
                        key = new _ast.AST.Constant(String, token.text);
                        lexer.expect(Colon);
                        value = this.parseAssignment(lexer);
                        break;
                    case _language.Tokens.Literal:
                        key = new _ast.AST.Identifier(token.text);
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

            properties.push(new _ast.AST.Property(key, value, computed));
        } while (lexer.consume(Comma));

        return new _ast.AST.ObjectExpression(properties);
    }
};
//# sourceMappingURL=parser.js.map