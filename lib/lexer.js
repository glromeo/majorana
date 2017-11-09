const NewLine = 0x000A; //  \n
const Space = 0x0020; //  SPACE
const ExclamationMark = 0x0021; //  !
const QuotationMark = 0x0022; //  "
const Hashtag = 0x0023; //  #
const DollarSign = 0x0024; //  $
const PercentSign = 0x0025; //  %
const Ampersand = 0x0026; //  &
const Apostrophe = 0x0027; //  '
const LeftParenthesis = 0x0028; //  (
const RightParenthesis = 0x0029; //  )
const Asterisk = 0x002A; //  *
const PlusSign = 0x002B; //  +
const Comma = 0x002C; //  ,
const MinusSign = 0x002D; //  -
const FullStop = 0x002E; //  .
const Slash = 0x002F; //  /
const DigitZero = 0x0030; //  0
const DigitOne = 0x0031; //  1
const DigitEight = 0x0039; //  8
const DigitNine = 0x0039; //  9
const Colon = 0x003A; //  :
const Semicolon = 0x003B; //  ;
const LessThanSign = 0x003C; //  <
const EqualSign = 0x003D; //  =
const GreaterThanSign = 0x003E; //  >
const QuestionMark = 0x003F; //  ?
const AtSign = 0x0040; //  @
const CapitalA = 0x0041; //  A
const CapitalB = 0x0042; //  B
const CapitalE = 0x0045; //  E
const CapitalF = 0x0046; //  F
const CapitalU = 0x0055; //  U
const CapitalX = 0x0058; //  X
const CapitalZ = 0x005A; //  Z
const LeftSquareBracket = 0x005B; //  [
const Backslash = 0x005C; //  \
const RightSquareBracket = 0x005D; //  ]
const CircumflexAccent = 0x005E; //  ^
const LowLine = 0x005F; //  _   [0101 1111] To Uppercase (e.g. 0x78 & 0x5F is 0x58 )
const GraveAccent = 0x0060; //  `
const LetterA = 0x0061; //  a
const LetterB = 0x0062; //  b
const LetterE = 0x0065; //  e
const LetterF = 0x0066; //  f
const LetterU = 0x0075; //  u
const LetterX = 0x0078; //  x
const LetterZ = 0x007A; //  z
const LeftCurlyBracket = 0x007B; //  {
const Pipe = 0x007C; //  |
const RightCurlyBracket = 0x007D; //  }
const Tilde = 0x007E; //  ~
const Delete = 0x007F; //  DEL
const NBSP = 0x00A0; //  Non breaking space

const LOWERCASE = 0b00100000;       // CapitalE | LOWERCASE = = = LetterE
const UPPERCASE = ~LOWERCASE;       // LetterE  & UPPERCASE = = = CapitalE

export const Tokens = {
    Comment: 'Comment',
    Literal: 'Literal',
    LineComment: 'LineComment',
    Number: 'Number',
    String: 'String',
    Symbol: 'Symbol',
    This: 'This',
    EoF: 'EoF'
}

export class Lexer {

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

        // if (cc === ExclamationMark || cc === EqualSign) {
        //     let cc2 = source.charCodeAt(this.cursor + 1);
        //     if (cc2 === EqualSign) {
        //         let cc3 = source.charCodeAt(this.cursor + 2);
        //         if (cc3 === EqualSign) {
        //             return this.consumeSymbol(String.fromCharCode(cc, cc2, cc3));
        //         } else {
        //             return this.consumeSymbol(String.fromCharCode(cc, cc2));
        //         }
        //     }
        //     return this.consumeSymbol(String.fromCharCode(cc));
        // }
        //
        // if (cc === GreaterThanSign || cc === LessThanSign) {
        //     let cc2 = source.charCodeAt(this.cursor + 1);
        //     if (cc2 === EqualSign || cc2 === cc) {
        //         return this.consumeSymbol(String.fromCharCode(cc, cc2));
        //     }
        //     return this.consumeSymbol(String.fromCharCode(cc));
        // }
        //
        // if (cc === Ampersand || cc === Pipe) {
        //     let cc2 = source.charCodeAt(this.cursor + 1);
        //     if (cc2 === cc) {
        //         return this.consumeSymbol(String.fromCharCode(cc, cc2));
        //     } else {
        //         return this.consumeSymbol(String.fromCharCode(cc));
        //     }
        // }

        return this.consumeSymbol(String.fromCharCode(cc));
    }

    nextNumber(cc) {
        const source = this.source;
        let cursor = this.cursor;

        if (cc !== FullStop) {
            while ((cc = source.charCodeAt(++cursor)) && ( cc >= DigitZero && cc <= DigitNine )) ;
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
        this.token = {type: Tokens.EoF, text: '<EoF>'}
        this.cursor = this.source.length;
        return this;
    }
}
