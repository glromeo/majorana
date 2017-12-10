import {assert, expect} from "chai";
import {Lexer, Tokens} from "../main/lexer.js";

describe("Lexer Tests", function () {

    function tokenize(implementation) {
        return function () {
            const tokens = Lexer.tokenize(this.test.title).map(t => Object.create({
                type: t.type,
                text: t.text,
            }, {
                line: {value: t.line},
                column: {value: t.column}
            }));
            return implementation.call(this, tokens);
        };
    }

    it("0 1", tokenize(function ([zero, one]) {
        assert.deepEqual(zero, {type: Tokens.Number, text: '0'});
        assert.deepEqual(one, {type: Tokens.Number, text: '1'});
        assert.equal(one.column, 3);
    }));

    it("\n\t0.1", tokenize(function ([{type, text, line, column}]) {
        assert.deepEqual(type, Tokens.Number);
        assert.deepEqual(text, '0.1');
        assert.deepEqual(line, 2);
        assert.deepEqual(column, 2);
    }));

    it("1e10", tokenize(function ([token]) {
        assert.deepEqual(token, {type: Tokens.Number, text: '1e10'});
    }));

    it(".1e-2 789f6.543", tokenize(function ([n1, n2, id, n3]) {
        assert.deepEqual(n1, {type: Tokens.Number, text: '.1e-2'});
        assert.deepEqual(n2, {type: Tokens.Number, text: '789'});
        assert.deepEqual(id, {type: Tokens.Literal, text: 'f6'});
        assert.deepEqual(n3, {type: Tokens.Number, text: '.543'});
    }));

    it("0x0 0x123456789ABCDEF 0x123456789abcdef", tokenize(function (tokens) {
        assert.deepEqual(tokens.map(t => {
            assert.equal(t.type, Tokens.Number);
            return t.text;
        }).join(' '), this.test.title);
    }));

    it("0777", tokenize(function ([token]) {
        assert.deepEqual(token, {type: Tokens.Number, text: '0777'});
    }));


});