import {Lexer, Tokens} from "./lexer.js"

const NewLine = 0x000A;             //  \n
const Space = 0x0020;               //  SPACE
const ExclamationMark = 0x0021;     //  !
const QuotationMark = 0x0022;       //  "
const Hashtag = 0x0023;             //  #
const DollarSign = 0x0024;          //  $
const PercentSign = 0x0025;         //  %
const Ampersand = 0x0026;           //  &
const Apostrophe = 0x0027;          //  '
const LeftParenthesis = 0x0028;     //  (
const RightParenthesis = 0x0029;    //  )
const Asterisk = 0x002A;            //  *
const PlusSign = 0x002B;            //  +
const Comma = 0x002C;               //  ,
const MinusSign = 0x002D;           //  -
const FullStop = 0x002E;            //  .
const Slash = 0x002F;               //  /
const DigitZero = 0x0030;           //  0
const DigitOne = 0x0031;            //  1
const DigitEight = 0x0039;          //  8
const DigitNine = 0x0039;           //  9
const Colon = 0x003A;               //  :
const Semicolon = 0x003B;           //  ;
const LessThanSign = 0x003C;        //  <
const EqualSign = 0x003D;           //  =
const GreaterThanSign = 0x003E;     //  >
const QuestionMark = 0x003F;        //  ?
const AtSign = 0x0040;              //  @
const CapitalA = 0x0041;            //  A
const CapitalB = 0x0042;            //  B
const CapitalE = 0x0045;            //  E
const CapitalF = 0x0046;            //  F
const CapitalU = 0x0055;            //  U
const CapitalX = 0x0058;            //  X
const CapitalZ = 0x005A;            //  Z
const LeftSquareBracket = 0x005B;   //  [
const Backslash = 0x005C;           //  \
const RightSquareBracket = 0x005D;  //  ]
const CircumflexAccent = 0x005E;    //  ^
const LowLine = 0x005F;             //  _   [0101 1111] To Uppercase (e.g. 0x78 & 0x5F = 0x58 )
const GraveAccent = 0x0060;         //  `
const LetterA = 0x0061;             //  a
const LetterB = 0x0062;             //  b
const LetterE = 0x0065;             //  e
const LetterF = 0x0066;             //  f
const LetterU = 0x0075;             //  u
const LetterX = 0x0078;             //  x
const LetterZ = 0x007A;             //  z
const LeftCurlyBracket = 0x007B;    //  {
const Pipe = 0x007C;                //  |
const RightCurlyBracket = 0x007D;   //  }
const Tilde = 0x007E;               //  ~
const Delete = 0x007F;              //  DEL
const NBSP = 0x00A0;                //  Non breaking space

const LOWERCASE = 0b00100000;       // CapitalE | LOWERCASE === LetterE
const UPPERCASE = ~LOWERCASE;       // LetterE  & UPPERCASE === CapitalE

const Literals = {
    'this': true,
    'true': true,
    'false': true,
    'undefined': true,
    'null': true
}

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
}

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
        var ast = this.expressionStatement();
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
                this.cursor++
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
            this.cursor++
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
            this.cursor++
            return String.fromCharCode(cc);
        }
    }

    unary() {
        let operator = this.consumeUnaryOperator()
        if (operator) {
            const argument = this.unary();
            const prefix = true;
            return {type: AST.UnaryExpression, operator: operator, prefix: true, argument: this.unary()};
        }
        return this.primary();
    }

    consumeUnaryOperator() {
        let cc = this.advance();
        if (cc === PlusSign || cc === MinusSign || cc === ExclamationMark) {
            this.cursor++
            return String.fromCharCode(cc);
        }
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
            this.expect(RightSquareBracket);
        } else if (cc === LeftCurlyBracket) {
            this.cursor++;
            primary = this.object();
            this.expect(RightCurlyBracket);
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
                primary = {type: AST.MemberExpression, object: primary, property: this.identifier(), computed: false};
                continue;
            default:
                return primary;
        } while (true);
    }

    filter(token, baseExpression) {
        var args = [baseExpression];
        var result = {type: AST.CallExpression, callee: this.identifier(), args: args, filter: true};

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

    identifier() {
        const token = this.nextLiteral().token;
        if (token.type !== Tokens.Literal || Literals[token.text]) {
            throw new ParseError(this, `Expected <identifier> but found ${ this.token.text }`);
        }
        return {type: AST.Identifier, name: token.text}
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

            let token = this.next();

            property = {type: AST.Property, kind: 'init'};

            if (token.type === Tokens.Literal) {
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
