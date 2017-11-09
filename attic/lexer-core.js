const NewLine = 0x000A;             // \n
const Space = 0x0020;               //
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

const LOWERCASE = 0b00100000;       // CapitalE | LOWERCASE === LetterE
const UPPERCASE = ~LOWERCASE;       // LetterE  & UPPERCASE === CapitalE

function isWhitespace(cc) {
    return cc <= 0x20 || 0x7F <= cc && cc <= 0xA0;
}

const Literals = {
    'this': true,
    'true': true,
    'false': true,
    'undefined': true,
    'null': true
}

export const Tokens = {
    Comment: 'Comment',
    Identifier: 'Identifier',
    Literal: 'Literal',
    LineComment: 'LineComment',
    Number: 'Number',
    String: 'String',
    Symbol: 'Symbol',
    This: 'This'
}

export class Lexer {

    constructor(source) {
        this.source = source;
        this.position = 0;
        this.line = 1;
        this.lineStart = -1;
        this.token = {from: 0, to: source.length};
    }

    [Symbol.iterator]() {
        return this;
    }

    get column() {
        return this.position - this.lineStart;
    }

    close(value) {
        this.position = this.source.length;
        this.done = !(this.token = null);
        return value;
    }

    skip() {
        const source = this.source;
        let cc, position = this.position;

        main: while (cc = source.charCodeAt(position)) if (cc <= 0x20 || 0x7F <= cc) {

            if (cc === NewLine) {
                this.line++;
                this.lineStart = position;
            }
            position++;

        } else {

            if (cc === Slash) {
                let cc2 = source.charCodeAt(++position);
                if (cc2 === Slash) {
                    while (cc = source.charCodeAt(++position)) if (cc === NewLine) {
                        this.line++;
                        this.lineStart = position++;
                        continue main;
                    }
                } else if (cc2 === Asterisk) {
                    while (cc = source.charCodeAt(++position)) if (Asterisk === cc && Slash === source.charCodeAt(position + 1)) {
                        position += 2;
                        continue main;
                    } else if (cc === NewLine) {
                        this.line++;
                        this.lineStart = position++;
                    }
                    throw new Error(`Comment not closed at line: ${this.line}, column: ${position - this.lineStart}.`);
                }
            }

            break;
        }

        this.token = {type: Tokens.Comment, text: source.substring(this.position, this.position = position)};
        return cc;
    }

    consume(fc) {
        if (fc === this.skip()) {
            this.position += 1;
            return this;
        }
    }

    consumeTwo(fc, sc) {
        if (fc === this.skip() && sc === this.source.charCodeAt(this.position + 1)) {
            this.position += 2;
            return this;
        }
    }

    consumeEqualityOperator(peek) {
        let cc = peek || this.skip();
        if (peek || cc === ExclamationMark || cc === EqualSign) {
            if (this.source.charCodeAt(this.position + 1) === EqualSign) {
                if (this.source.charCodeAt(this.position + 2) === EqualSign) {
                    this.position += 3;
                    return String.fromCharCode(cc, EqualSign, EqualSign);
                } else {
                    this.position += 2;
                    return String.fromCharCode(cc, EqualSign);
                }
            } else {
                this.position++;
                return String.fromCharCode(cc);
            }
        }
    }

    consumeRelationalOperator(peek) {
        let cc = peek || this.skip();
        if (peek || cc === GreaterThanSign || cc === LessThanSign) {
            const cc2 = this.source.charCodeAt(this.position + 1);
            if (cc2 === EqualSign || cc2 === cc) {
                this.position += 2;
                return String.fromCharCode(cc, cc2);
            } else {
                this.position++
                return String.fromCharCode(cc);
            }
        }
    }

    consumeLogicalOperator(peek) {
        let cc = peek || this.skip();
        if (peek || cc === Ampersand || cc === Pipe) {
            if (this.source.charCodeAt(this.position + 1) === cc) {
                this.position += 2;
                return String.fromCharCode(cc, cc);
            } else {
                this.position++
                return String.fromCharCode(cc);
            }
        }
    }

    consumeAdditiveOperator(peek) {
        let cc = peek || this.skip();
        if (peek || cc === PlusSign || cc === MinusSign) {
            this.position++
            return String.fromCharCode(cc);
        }
    }

    consumeMultiplicativeOperator(peek) {
        let cc = peek || this.skip();
        if (peek || cc === Asterisk || cc === Slash || cc === PercentSign) {
            this.position++
            return String.fromCharCode(cc);
        }
    }

    consumeUnaryOperator(peek) {
        let cc = peek || this.skip();
        if (peek || cc === PlusSign || cc === MinusSign || cc === ExclamationMark) {
            this.position++
            return String.fromCharCode(cc);
        }
    }

    consumeText(text) {

        if (!this.skip()) return false;

        let p = text.length;

        while (p--) if (this.source.charCodeAt(this.position + p) !== text.charCodeAt(this.position + p)) {
            return false
        }

        this.position += text.length;
        return text;
    }

    expect(text) {
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

    /**
     *  NOTE: UPPERCASE & NaN === 0 which fixes the termination case leaving the while before &&
     */
    next(cc) {
        const source = this.source;

        if (cc === undefined) {
            cc = this.skip();
            if (!cc) return this.close(this);
        }

        if (cc >= DigitZero && cc <= DigitNine) {
            return this.consumeNumber();
        }

        if (cc === LowLine || cc === DollarSign || cc >= LetterA && cc <= LetterZ || cc >= CapitalA && cc <= CapitalZ) {
            const text = this.consumeLiteral();
            this.token = {type: Tokens.Literal, text: text, identifier: !Literals[text], line, column};
            return this;
        }

        if (cc === Apostrophe || cc === QuotationMark) {
            this.token = {type: Tokens.String, text: this.consumeString(cc), line, column};
            return this;
        }

        if (cc === ExclamationMark || cc === EqualSign) {
            this.token = {type: Tokens.Symbol, text: this.consumeEqualityOperator(cc), line, column};
            return this;
        }

        if (cc === GreaterThanSign || cc === LessThanSign) {
            this.token = {type: Tokens.Symbol, text: this.consumeRelationalOperator(cc), line, column};
            return this;
        }

        if (cc === Ampersand || cc === Pipe) {
            this.token = {type: Tokens.Symbol, text: this.consumeRelationalOperator(cc), line, column};
            return this;
        }

        if (cc === PlusSign || cc === MinusSign || cc === Asterisk || cc === PercentSign) {
            this.token = {type: Tokens.Symbol, text: this.consumeRelationalOperator(cc), line, column};
            return this;
        }

        if (cc === FullStop) {
            let cc2 = source.charCodeAt(this.position + 1);
            if (cc2 >= DigitZero && cc2 <= DigitNine) {
                this.token = {type: Tokens.Number, text: this.consumeDecimal(cc), line, column};
                return this;
            }
        }

        this.token = {type: Tokens.Symbol, text: String.fromCharCode(cc), line, column};
        this.position++;
        return this;
    }

    consumeNumber() {

        const source = this.source;
        let position = this.position, next = source.charCodeAt(++position);

        if (next === LetterX || next === CapitalX) {

            while ((next = source.charCodeAt(++position) | LOWERCASE) && ( next >= DigitZero && next <= DigitNine || next >= LetterA && next <= LetterF )) ;

        } else if (next === LetterB || next === CapitalB) {

            while ((next = source.charCodeAt(++position)) && ( next >= DigitZero && next <= DigitOne )) ;

        } else if (next >= DigitZero && next < DigitEight) {

            while ((next = source.charCodeAt(++position)) && ( next >= DigitZero && next < DigitEight )) ;

        } else return this.consumeDecimal(cc, cc2);

        this.token = {
            type: Tokens.Number,
            text: source.substring(this.position, this.position = position),
            line: this.line,
            column: this.column
        };
        return this;
    }

    consumeDecimal(cc) {

        const source = this.source;
        let position = this.position, cc = source.charCodeAt(++position);

        if (!cc) {
            while ((cc = source.charCodeAt(++to)) && ( cc >= DigitZero && cc <= DigitNine )) ;
            if (cc !== FullStop) {
                return source.substring(from, this.position = to);
            }
        }

        while ((cc = source.charCodeAt(++to)) && ( cc >= DigitZero && cc <= DigitNine )) ;

        if ((cc | LOWERCASE) !== LetterE) {
            return source.substring(from, this.position = to);
        }

        if ((cc = source.charCodeAt(to + 1)) === PlusSign || cc === MinusSign) to++;

        while ((cc = source.charCodeAt(++to)) && ( cc >= DigitZero && cc <= DigitNine )) ;

        this.token = {
            type: Tokens.Number,
            text: source.substring(this.position, this.position = position),
            line,
            column
        };
        return this;
    }

    consumeString(quote, from = this.position, to = from) {

        const source = this.source;
        let cc, escape = false;

        while (cc = source.charCodeAt(++to)) if (escape) {
            // we don't really need to deal with this...it can be useful for sanitization
            // if (cc === LetterU) {
            //     let count = 4;
            //     while (count-- && (cc = LOWERCASE | source.charCodeAt(++to)) && cc >= LetterA && cc <= LetterF || cc >= DigitZero && cc <= DigitNine) ;
            // }
            if (cc === NewLine) {
                this.line++;
                this.lineStart = to;
            }
            escape = false;
        } else if (cc === Backslash) {
            escape = true;
        } else if (cc === quote) {
            return source.substring(from, this.position = to + 1);
        } else if (cc === NewLine) {
            break;
        }

        throw new Error(`String literal not closed at line: ${this.line}, column: ${to - this.lineStart}.`);
    }

    consumeLiteral(cc, from = this.position, to = from) {

        const source = this.source;

        while ((cc = source.charCodeAt(++to)) && cc >= LetterA && cc <= LetterZ || cc >= CapitalA && cc <= CapitalZ || cc >= DigitZero && cc <= DigitNine || cc === LowLine || cc === DollarSign) ;

        return source.substring(from, this.position = to);
    }

    get value() {
        return this.token;
    }

    get text() {
        return this.token ? this.token.text : undefined;
    }
}

export const Chars = {
    NewLine,
    Space,
    ExclamationMark,
    QuotationMark,
    Hashtag,
    DollarSign,
    PercentSign,
    Ampersand,
    Apostrophe,
    LeftParenthesis,
    RightParenthesis,
    Asterisk,
    PlusSign,
    Comma,
    MinusSign,
    FullStop,
    Slash,
    DigitZero,
    DigitOne,
    DigitEight,
    DigitNine,
    Colon,
    Semicolon,
    LessThanSign,
    EqualSign,
    GreaterThanSign,
    QuestionMark,
    AtSign,
    CapitalA,
    CapitalB,
    CapitalE,
    CapitalF,
    CapitalU,
    CapitalX,
    CapitalZ,
    LeftSquareBracket,
    Backslash,
    RightSquareBracket,
    CircumflexAccent,
    LowLine,
    GraveAccent,
    LetterA,
    LetterB,
    LetterE,
    LetterF,
    LetterU,
    LetterX,
    LetterZ,
    LeftCurlyBracket,
    Pipe,
    RightCurlyBracket,
    Tilde
}