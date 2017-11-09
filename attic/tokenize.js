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

function isNewLine(cc) {
    return cc === 0x0A;
}

// Using a class instead of an inline object proved to be ~12x faster!

export function* tokenize(text) {

    const length = text.length;
    let cc;
    let expect;
    let from = 0, to;
    let line = 1;
    let lineStart = 0;

    main: while (from < length) {

        if (isWhitespace(cc = text.charCodeAt(from))) {
            do if (isNewLine(cc)) {
                line++;
                lineStart = from;
            } while (isWhitespace(cc = text.charCodeAt(++from)));
        }

        to = from + 1;

        if (expect) {

            let matches, e = 0, el = expect.length;
            do {
                matches = expect.charCodeAt(e++) === text.charCodeAt(from++);
            } while (matches && e < el && from < length);

            expect = yield matches;
            continue;
        }

        if (cc == Slash) {
            let cc2 = text.charCodeAt(to);
            if (cc2 === Slash) {
                while (cc = text.charCodeAt(++to)) if (isNewLine(cc)) break;
                expect = yield createToken(Tokens.LineComment, from, to);
                continue;
            } else if (cc2 === Asterisk) {
                while (cc = text.charCodeAt(++to)) {
                    if (isNewLine(cc)) {
                        line++;
                        lineStart = to;
                    } else if (cc === Asterisk && (text.charCodeAt(to + 1) === Slash)) {
                        expect = yield createToken(Tokens.Comment, from, to + 2);
                        continue main;
                    }
                }
                throw new Error(`Comment not closed at line: ${line}, column: ${to - lineStart}.`);
            }
        }

        if (cc == Apostrophe || cc === QuotationMark) {

            expect = yield nextString();

        } else if (cc == DigitZero) {

            let cc2 = text.charCodeAt(to);
            if (cc2 === LetterX || cc2 === CapitalX) {
                while ((cc = LOWERCASE | text.charCodeAt(++to)) && ( cc >= DigitZero && cc <= DigitNine || cc >= LetterA && cc <= LetterF )) ;
                expect = yield createToken(Tokens.Number, from, to);
            } else if (cc2 === LetterB || cc2 === CapitalB) {
                while ((cc = text.charCodeAt(++to)) && ( cc >= DigitZero && cc <= DigitOne )) ;
                expect = yield createToken(Tokens.Number, from, to);
            } else if (cc2 >= DigitZero && cc2 < DigitEight) {
                while ((cc = text.charCodeAt(++to)) && ( cc >= DigitZero && cc < DigitEight )) ;
                expect = yield createToken(Tokens.Number, from, to);
            } else {
                expect = yield createToken(Tokens.Number, from, to);
            }

        } else if (cc === FullStop) {

            let cc2 = text.charCodeAt(to);
            if (cc2 >= DigitZero && cc2 <= DigitNine) {
                ++to;
                expect = yield nextNumber();
            } else {
                expect = yield createToken(Tokens.Symbol, from, to);
            }

        } else if (cc > DigitZero && cc <= DigitNine) {

            expect = yield nextNumber();

        } else if (
            cc >= LetterA && cc <= LetterZ || cc >= CapitalA && cc <= CapitalZ
            || cc === LowLine
            || cc === DollarSign
        ) {
            expect = yield nextIdentifier();

        } else if (cc === ExclamationMark || cc === EqualSign) {

            let cc2 = text.charCodeAt(to);
            if (cc2 === EqualSign) {
                to++;
                let cc3 = text.charCodeAt(to);
                if (cc3 === EqualSign) {
                    expect = yield createToken(Tokens.LogicalOperator, from, to + 1);
                } else {
                    expect = yield createToken(Tokens.LogicalOperator, from, to);
                }
            } else {
                expect = yield createToken(Tokens.LogicalOperator, from, to);
            }

        } else if (cc === GreaterThanSign || cc === LessThanSign) {

            let cc2 = text.charCodeAt(to);
            if (cc2 === EqualSign) {
                expect = yield createToken(Tokens.LogicalOperator, from, to + 1);
            } else if (cc2 === cc) {
                expect = yield createToken(Tokens.ShiftOperator, from, to + 1);
            } else {
                expect = yield createToken(Tokens.LogicalOperator, from, to);
            }

        } else if (cc === Ampersand || cc === Pipe) {

            let cc2 = text.charCodeAt(to);
            if (cc2 === cc) {
                expect = yield createToken(Tokens.LogicalOperator, from, to + 1);
            } else {
                expect = yield createToken(Tokens.BitwiseOperator, from, to);
            }

        } else if (cc === PlusSign || cc === MinusSign || cc === Asterisk || cc === Slash || cc === PercentSign) {

            expect = yield createToken(Tokens.BinaryOperator, from, to);

        } else {

            expect = yield createToken(Tokens.Symbol, from, to);
        }
    }

    function nextString() {

        const quote = cc;
        let escape = false;

        while (cc = text.charCodeAt(to++)) if (escape) {
            // we don't really need to deal with ..it can be useful for sanitization
            // if (cc === LetterU) {
            //     let count = 4;
            //     while (count-- && (cc = LOWERCASE | text.charCodeAt(++to)) && cc >= LetterA && cc <= LetterF || cc >= DigitZero && cc <= DigitNine) ;
            // }
            if (isNewLine(cc)) {
                line++;
                lineStart = to - 1;
            }
            escape = false;
        } else if (cc === Backslash) {
            escape = true;
        } else if (cc === quote) {
            return createToken(Tokens.String, from, to);
        } else if (isNewLine(cc)) {
            break;
        }

        throw new Error(`String literal not closed at line: ${line}, column: ${to - lineStart}.`);
    }

    function nextNumber() {

        if (to == from + 1) {
            while ((cc = text.charCodeAt(++to)) && ( cc >= DigitZero && cc <= DigitNine )) ;
            if (cc !== FullStop) {
                return createToken(Tokens.Number, from, to);
            }
        }

        while ((cc = text.charCodeAt(++to)) && ( cc >= DigitZero && cc <= DigitNine )) ;

        if ((cc | LOWERCASE) !== LetterE) {
            return createToken(Tokens.Number, from, to);
        }

        if ((cc = text.charCodeAt(to + 1)) === PlusSign || cc === MinusSign) to += 1;

        while ((cc = text.charCodeAt(++to)) && ( cc >= DigitZero && cc <= DigitNine )) ;

        return createToken(Tokens.Number, from, to);
    }

    function nextIdentifier() {

        let escape = false;

        while ((cc = text.charCodeAt(++to)) && cc >= LetterA && cc <= LetterZ || cc >= CapitalA && cc <= CapitalZ || cc >= DigitZero && cc <= DigitNine || cc === LowLine || cc === DollarSign) ;

        return createToken(Tokens.Identifier, from, to);
    }

    function createToken(type, begin, end) {
        return new type(text, begin, from = end, line, end - lineStart);
    }
}

export class Token {

    constructor(source, from, to, line, column) {
        this.source = source;
        this.from = from;
        this.to = to;
        this.line = line;
        this.column = column;
    }

    get text() {
        return this.source.substring(this.from, this.to);
    }
}

export const Tokens = {

    Symbol: class extends Token {
    },

    Comment: class extends Token {
    },

    LineComment: class extends Token {
    },

    LogicalOperator: class extends Token {
    },

    BitwiseOperator: class extends Token {
    },

    ShiftOperator: class extends Token {
    },

    BinaryOperator: class extends Token {
    },

    Number: class extends Token {
    },

    Identifier: class extends Token {
    },

    String: class extends Token {
    },
}
