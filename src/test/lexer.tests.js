import {describe, it, beforeEach} from "mocha";
import {assert, expect, use} from "chai";
import {Lexer, Tokenizer} from "../main/lexer.js";
import {Tokens} from "../main/language.js";
import chai_string from "chai-string";

use(chai_string);

describe("Lexer Tests", function () {

    let tokenizer;

    beforeEach(function () {
        tokenizer = new Tokenizer();
    });

    function gives(callback) {
        return function () {
            return callback.apply(this, tokenizer.scan(this.test.title).map(t => {
                const {line, column} = t.cursor();
                return Object.create(null, {
                    type: {enumerable: true, value: t.type},
                    text: {enumerable: true, value: t.text},
                    line: {enumerable: false, value: line},
                    column: {enumerable: false, value: column}
                });
            }));
        }
    }

    it("0 1", gives(function (zero, one) {
        assert.deepEqual(zero, {type: Tokens.Number, text: '0'});
        assert.deepEqual(one, {type: Tokens.Number, text: '1'});
        assert.equal(zero.column, 1);
        assert.equal(zero.line, 1);
        assert.equal(one.column, 3);
        assert.equal(one.line, 1);
    }));

    it("0.1", gives(function ({type, text, line, column}) {
        assert.deepEqual(type, Tokens.Number);
        assert.deepEqual(text, '0.1');
    }));

    it("tabs & newlines", function () {
        let cursor = new Tokenizer().scan("\n\tHello")[0].cursor();
        assert.equal(cursor.line, 2);
        assert.equal(cursor.column, 5);
        let cursor2 = new Tokenizer().scan("\n\n12345")[0].cursor();
        assert.equal(cursor2.line, 3);
        assert.equal(cursor2.column, 1);
        let cursor3 = new Tokenizer().scan("\t0b11111")[0].cursor();
        assert.equal(cursor3.line, 1);
        assert.equal(cursor3.column, 5);
    });

    it("1e10", gives(function (token) {
        assert.deepEqual(token, {type: Tokens.Number, text: '1e10'});
    }));

    it(".1e-2 789f6.543", gives(function (n1, n2, id, n3) {
        assert.deepEqual(n1, {type: Tokens.Number, text: '.1e-2'});
        assert.equal(n1.line, 1);
        assert.equal(n1.column, 1);
        assert.deepEqual(n2, {type: Tokens.Number, text: '789'});
        assert.deepEqual(id, {type: Tokens.Literal, text: 'f6'});
        assert.deepEqual(n3, {type: Tokens.Number, text: '.543'});
    }));

    it("0x0 0x123456789ABCDEF 0x123456789abcdef", gives(function (...tokens) {
        assert.deepEqual(tokens.map(t => {
            assert.equal(t.type, Tokens.Number);
            return t.text;
        }).join(' '), this.test.title);
    }));

    it("0777", gives(function (token) {
        assert.deepEqual(token, {type: Tokens.Number, text: '0777'});
    }));

    describe("Compiled Symbols", function () {

        it("addition", function () {

            let actual = new Lexer({"addition": ["+", "-"]}).symbols;

            /* istanbul ignore next */
            assert.equalIgnoreSpaces(actual.addition.toString(), function anonymous(c0, cp, cc /*``*/) {
                if (c0 === 43) return "+";
                if (c0 === 45) return "-";
                //# sourceURL=http://majorana/lexer/addition
            }.toString());
        });

        it("equality", function () {

            let actual = new Lexer({"equality": ["===", "!==", "!=", "=="]}).symbols;

            /* istanbul ignore next */
            assert.equalIgnoreSpaces(actual.equality.toString(), function anonymous(c0, cp, cc /*``*/) {
                let c1, c2;
                if (c0 === 61 && (c1 = cc(cp + 1)) === 61) {
                    if ((c2 = cc(cp + 2)) === 61) return "===";
                    return "==";
                }
                if (c0 === 33 && c1 === 61) {
                    if (c2 === 61) return "!==";
                    return "!=";
                }
                //# sourceURL=http://majorana/lexer/equality
            }.toString());

        });

        it("__all__", function () {

            let symbols = new Lexer({
                "equality": ["===", "!==", "!=", "=="],
                "addition": ["+", "-"],
                "negation": ["!"],
                "increment": ["++"]
            }).symbols;

            /* istanbul ignore next */
            assert.equalIgnoreSpaces(symbols.__all__.toString(), function anonymous(c0, cp, cc /*``*/) {
                let c1, c2;
                if (c0 === 61 && (c1 = cc(cp + 1)) === 61) {
                    if ((c2 = cc(cp + 2)) === 61) return "===";
                    return "==";
                }
                if (c0 === 33) {
                    if (c1 === 61) {
                        if (c2 === 61) return "!==";
                        return "!=";
                    }
                    return "!";
                }
                if (c0 === 43) {
                    if (c1 === 43) return "++";
                    return "+";
                }
                if (c0 === 45) return "-";
                //# sourceURL=http://majorana/lexer/__all__
            }.toString());
        })
    });

    describe("nextToken", function () {

        beforeEach(function () {
            tokenizer = new Tokenizer({
                "equality": ["===", "!==", "!=", "=="],
                "addition": ["+", "-"],
                "negation": ["!"],
                "access": ["."],
                "SquareBrackets": ["[", "]"],
                "Parentesis": ["(", ")"],
                "QuestionMark": ["?"],
                "Colon": [":"],
                "increment": ["++"]
            });
        });

        it("x ===\n\t1", function () {
            const tokens = tokenizer.scan(this.test.title).map(t => t.text);
            const types = tokenizer.scan(this.test.title).map(t => t.type);
            const coords = tokenizer.scan(this.test.title).map(t => t.cursor()).map(({line, column}) => [line, column]);
            assert.deepEqual(tokens, ["x", "===", "1"]);
            assert.deepEqual(types, [Tokens.Literal, Tokens.Symbol, Tokens.Number]);
            assert.deepEqual(coords, [[1, 1], [1, 3], [2, 5]]);
        });

        it("abc.def[ghi] !== 1 ? x : (y('s'))", function () {
            assert.deepEqual(tokenizer.scan(this.test.title).map(t => t.text), [
                "abc", ".", "def", "[", "ghi", "]", "!", "==", "1", "?", "x", ":", "(", "y", "(", "'s'", ")", ")"
            ]);
        });
    });
});