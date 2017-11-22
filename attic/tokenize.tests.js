import {assert, expect} from "chai";
import {tokenize, Tokens} from "./tokenize.js";
import fs from "fs";

describe("Tokens Tests", function () {

    it("strings", function () {
        assert.equal(tokenize("'sample'").next().value.text, "'sample'");
        assert.equal(tokenize('\'sample\'').next().value.text, "'sample'");
        assert.equal(tokenize('"sample"').next().value.text, '"sample"');
        assert.equal(tokenize('"s\\u0061mple"').next().value.text, '"s\\u0061mple"');
    });

    it("binary", function () {
        assert.equal(tokenize("0b0").next().value.text, "0b0");
        assert.equal(tokenize("0b1").next().value.text, "0b1");
        assert.equal(tokenize("0b1010").next().value.text, "0b1010");
        assert.equal(tokenize("0b1000000000000000").next().value.text, "0b1000000000000000");
    });

    it("numbers", function () {

        assert.equal(tokenize("0").next().value.text, "0");
        assert.equal(tokenize("\n.1").next().value.text, ".1");
        assert.equal(tokenize("\n123.456abc").next().value.text, "123.456");
        assert.equal(tokenize("0x123ABCz").next().value.text, "0x123ABC");
        assert.equal(tokenize("0123+").next().value.text, "0123");

        const text = "\n 0x0123456789abcDEFX123.25\"12'3\"'\\u44FF23'";
        const lexer = tokenize(text);
        let nextToken = lexer.next().value;
        assert.include(nextToken, {
            "from": 2,
            "to": 20
        });
        assert.equal(nextToken.text, "0x0123456789abcDEF");
        nextToken = lexer.next().value;
        assert.equal(nextToken.text, "X123");
        nextToken = lexer.next().value;
        assert.equal(nextToken.text, ".25");
        nextToken = lexer.next().value;
        assert.equal(nextToken.text, '"12\'3"');
    });

    it("identifiers", function () {

        const identifierToken = tokenize("identifier").next().value;
        assert.isTrue(identifierToken instanceof Tokens.Identifier);
        assert.equal(identifierToken.from, 0);
        assert.equal(identifierToken.to, 10);
        assert.equal(identifierToken.text, "identifier");

        let lexer = tokenize("$name n4m3");

        const firstToken = lexer.next().value;
        assert.isTrue(firstToken instanceof Tokens.Identifier);
        assert.equal(firstToken.from, 0);
        assert.equal(firstToken.to, 5);
        assert.equal(firstToken.text, "$name");

        const secondToken = lexer.next().value;
        assert.isTrue(secondToken instanceof Tokens.Identifier);
        assert.equal(secondToken.from, 6);
        assert.equal(secondToken.to, 10);
        assert.equal(secondToken.text, "n4m3");

        lexer = tokenize("123id");
        assert.equal(lexer.next().value.text, "123");
        assert.equal(lexer.next().value.text, "id");

        lexer = tokenize("__123__");
        assert.equal(lexer.next().value.text, "__123__");

        lexer = tokenize("[[$123]]");
        lexer.next().value;
        lexer.next().value;
        assert.equal(lexer.next().value.text, "$123");
    });

    it("operators", function () {

        let generator = tokenize("1 + 1");
        generator.next("1");
        let sym = generator.next().value;
        assert.isTrue(sym instanceof Tokens.BinaryOperator);
        assert.equal(sym.text, "+");

        generator = tokenize("identifier && identifier");
        generator.next("identifier");
        sym = generator.next().value;
        assert.isTrue(sym instanceof Tokens.LogicalOperator);
        assert.equal(sym.text, "&&");

        generator = tokenize("identifier >> 1");
        generator.next("identifier");
        sym = generator.next().value;
        assert.isTrue(sym instanceof Tokens.ShiftOperator);
        assert.equal(sym.text, ">>");

        generator = tokenize("identifier !== x");
        generator.next("identifier")
        sym = generator.next().value;
        assert.isTrue(sym instanceof Tokens.LogicalOperator);
        assert.equal(sym.text, "!==");
    });

});