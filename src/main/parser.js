import {Lexer} from "./lexer.js";
import {CharCode} from "./charcodes.js";
import {Tokens} from "./language.js";
import {AST} from "./ast.js";
import {Operators} from "./operators.js";

const {
    Ampersand, LeftParenthesis, RightParenthesis, Comma, FullStop, Colon, EqualSign, QuestionMark, LeftSquareBracket,
    RightSquareBracket, LeftCurlyBracket, Pipe, RightCurlyBracket, ExclamationMark, LessThanSign, GreaterThanSign,
    PlusSign, MinusSign, PercentSign, Asterisk, Slash
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
        const ast = {type: AST.Expression, expression: this.expression(lexer)};
        if (lexer.done) {
            lexer.error("Unexpected input: " + lexer.debug(20));
        }
        return ast;
    }

    expression(lexer) {
        return this.comma(lexer);
    }

    comma(lexer) {
        let last = this.assignment(lexer);
        if (lexer.peek === Comma) {
            const list = [last];
            do {
                lexer.advance(1);
                list.push(this.ternary(lexer));
            } while (lexer.peek === Comma);
            return {type: AST.CommaExpression, list};
        }
        return last;
    }

    assignment(lexer) {
        const left = this.ternary(lexer);
        if (lexer.peek === EqualSign) {
            lexer.advance(1);
            const right = this.assignment(lexer);
            if (left.type === AST.Identifier || left.type === AST.MemberExpression) {
                return {type: AST.AssignmentExpression, left, right};
            } else {
                throw new ParserError(lexer, `Trying to assign to a non l-value: '${left}'`);
            }
        } else {
            return left;
        }
    }

    ternary(lexer) {
        const test = this.logicalOR(lexer);
        if (lexer.peek === QuestionMark) {
            lexer.advance(1);
            const consequent = this.expression(lexer);
            lexer.expect(Colon);
            const alternate = this.expression(lexer);
            return {type: AST.TernaryExpression, test, consequent, alternate};
        }
        return test;
    }

    logicalOR(lexer) {
        let left = this.logicalAND(lexer);
        while (lexer.peek === Pipe && lexer.consumeTwo(Pipe)) {
            left = {type: AST.LogicalExpression, operator: '||', left, right: this.logicalAND(lexer)};
        }
        return left;
    }

    logicalAND(lexer) {
        let left = this.equality(lexer);
        while (lexer.peek === Ampersand && lexer.consumeTwo(Ampersand)) {
            left = {type: AST.LogicalExpression, operator: '&&', left, right: this.equality(lexer)};
        }
        return left;
    }

    equality(lexer) {
        let left = this.relational(lexer), operator;
        while ((lexer.peek === EqualSign || lexer.peek === ExclamationMark) && (operator = lexer.consumeSymbol('Equality'))) {
            left = {type: AST.EqualityExpression, operator, left, right: this.relational(lexer)};
        }
        return left;
    }

    relational(lexer) {
        let left = this.additive(lexer), operator;
        while ((lexer.peek === LessThanSign || lexer.peek === GreaterThanSign) && (operator = lexer.consumeSymbol('Relational'))) {
            left = {type: AST.RelationalExpression, operator, left, right: this.additive(lexer)};
        }
        return left;
    }

    additive(lexer) {
        let left = this.multiplicative(lexer), operator;
        while ((lexer.peek === PlusSign || lexer.peek === MinusSign) && (operator = lexer.consumeSymbol('Additive'))) {
            left = {type: AST.AdditiveExpression, operator, left, right: this.multiplicative(lexer)};
        }
        return left;
    }

    multiplicative(lexer) {
        let left = this.unary(lexer), operator;
        while ((lexer.peek === Asterisk || lexer.peek === Slash || lexer.peek === PercentSign) && (operator = lexer.consumeSymbol('Multiplicative'))) {
            left = {type: AST.MultiplicativeExpression, operator, left, right: this.unary(lexer)};
        }
        return left;
    }

    unary(lexer) {
        let operator;
        if ((lexer.peek === PlusSign || lexer.peek === MinusSign || lexer.peek === ExclamationMark) && (operator = lexer.consumeSymbol('Unary'))) {
            return {type: AST.UnaryExpression, prefix: true, operator, argument: this.unary(lexer)};
        }
        return this.primary(lexer);
    }

    primary(lexer) {

        let primary;

        if (lexer.peek === LeftParenthesis) {
            lexer.advance(1);
            primary = this.expression(lexer);
            lexer.expect(RightParenthesis);
        } else if (lexer.peek === LeftSquareBracket) {
            lexer.advance(1);
            primary = this.array(lexer);
            lexer.expect(RightSquareBracket);
        } else if (lexer.peek === LeftCurlyBracket) {
            lexer.advance(1);
            primary = this.object(lexer);
            lexer.expect(RightCurlyBracket);
        } else {
            const token = lexer.nextToken();
            switch (token.type) {
                case Tokens.Literal:
                    primary = AST.Literals[token.text] || {type: AST.Identifier, name: token.text};
                    break;
                case Tokens.String:
                    primary = {type: AST.String, text: token.text};
                    break;
                case Tokens.Number:
                    primary = {type: AST.Number, text: token.text};
                    break;
                default: {
                    throw new ParserError(lexer, `Not a primary expression: ${this.token.text}`);
                }
            }
        }

        do if (lexer.peek === LeftParenthesis) {
            lexer.advance(1);
            primary = {type: AST.CallExpression, callee: primary, parameters: this.arguments(lexer)};
            lexer.expect(RightParenthesis);
        } else if (lexer.peek === LeftSquareBracket) {
            lexer.advance(1);
            primary = {type: AST.MemberExpression, object: primary, member: this.expression(lexer), computed: true};
            lexer.expect(RightSquareBracket);
        } else if (lexer.peek === FullStop) {
            lexer.advance(1);
            primary = {type: AST.MemberExpression, object: primary, member: this.identifier(lexer), computed: false};
        } else {
            return primary;
        } while (true);
    }

    arguments(lexer) {
        let args = [];
        if (lexer.peek && lexer.peek !== RightParenthesis) do {
            if (lexer.peek === Comma || lexer.peek === RightParenthesis) {
                args.push(AST.Literals.undefined);
                continue;
            }
            args.push(this.assignment(lexer));
        } while (lexer.consume(Comma));
        return args;
    }

    identifier(lexer) {
        const token = lexer.nextLiteral();
        if (token.type !== Tokens.Literal || AST.Literals[token.text]) {
            throw new ParserError(lexer, `Expected <identifier> but found ${ this.token.text }`);
        }
        return {type: AST.Identifier, name: token.text, local: true};
    }

    array(lexer) {
        let elements = [];
        if (lexer.peek && lexer.peek !== RightSquareBracket) do {
            if (lexer.peek === Comma || lexer.peek === RightSquareBracket) {
                elements.push(AST.Literals.undefined);
                continue;
            }
            elements.push(this.assignment(lexer));
        } while (lexer.consume(Comma));
        return {type: AST.ArrayExpression, elements};
    }

    /**
     *
     * @param {Lexer} lexer
     * @return {*}
     */
    object(lexer) {

        let properties = [], key, value, computed;

        if (lexer.peek && lexer.peek !== RightCurlyBracket) do {

            if (lexer.peek === Comma || lexer.peek === RightCurlyBracket) {
                continue;
            }

            if (lexer.consume(LeftSquareBracket)) {
                computed = true;
                key = this.assignment(lexer);
                lexer.expect(RightSquareBracket);
                lexer.expect(Colon);
                value = this.assignment(lexer);
            } else {
                computed = false;
                let token = lexer.nextToken();
                switch (token.type) {
                    case Tokens.Number:
                        key = {type: AST.Number, text: token.text};
                        lexer.expect(Colon);
                        value = this.assignment(lexer);
                        break;
                    case Tokens.String:
                        key = {type: AST.String, text: token.text};
                        lexer.expect(Colon);
                        value = this.assignment(lexer);
                        break;
                    case Tokens.Literal:
                        key = {type: AST.Identifier, name: token.text};
                        if (lexer.consume(Colon)) {
                            value = this.assignment(lexer);
                        } else {
                            value = key;
                        }
                        break;
                    default:
                        throw new ParserError(lexer, `Invalid key: '${token.text}'`);
                }
            }

            properties.push({type: AST.Property, key, value, computed});

        } while (lexer.consume(Comma));

        return {type: AST.ObjectExpression, properties};
    }
}
