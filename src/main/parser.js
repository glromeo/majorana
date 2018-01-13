import {Lexer} from "./lexer"
import {CharCode} from "./charcodes";
import {Tokens} from "./language";
import {AST} from "./ast";
import {Operators} from "./operators";

const {
    Ampersand, LeftParenthesis, RightParenthesis, Comma, FullStop, Colon, EqualSign, QuestionMark, LeftSquareBracket,
    RightSquareBracket, LeftCurlyBracket, Pipe, RightCurlyBracket
} = CharCode;

const defaultSymbols = Object.entries(Operators).reduce((symbols, [name, group]) => {
    symbols[name] = Object.keys(group);
    return symbols;
}, {});

export class ParserError extends Error {
    constructor(lexer, message) {
        super(message);
        this.token = lexer.token;
    }
}

export class Parser {

    constructor(operatorSymbols) {
        if (operatorSymbols) {
            const allSymbols = {};
            for (const [name, symbols] of Object.entries(operatorSymbols)) allSymbols[name] = symbols;
            for (const [name, symbols] of Object.entries(defaultSymbols)) allSymbols[name] = symbols;
            this.operatorSymbols = Lexer.compileSymbols(allSymbols);
        } else {
            this.operatorSymbols = Parser.defaultSymbols || (
                Parser.defaultSymbols = Lexer.compileSymbols(defaultSymbols)
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
        } else if (lexer.peek === FullStop) {
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

