import {defineSupportCode} from "cucumber";
import {assert} from "chai";
import {Lexer} from "../src/main/lexer";
import {Tokens} from "../src/main/language";

defineSupportCode(function ({Given, When, Then}) {

    Given('the string {string}', function (text) {
        assert.isDefined(text);
        this.text = text;
    });

    Given('two lines {string} and {string}', function (line1, line2) {
        this.text = line1 + '\n' + line2;
    });

    When('tokenized', function () {
        this.tokens = Lexer.tokenize(this.text);
        this.currentToken = 0;
        assert.isDefined(this.tokens);
    });

    Then(/^I get (\d+) token of type (\S+)$/, function (expected, typeName) {
        assert.equal(this.tokens.length, expected);
        assert.equal(this.tokens[this.currentToken].type, Tokens[typeName]);
    });

    Then('I get {int} tokens', function (expected) {
        assert.equal(this.tokens.length, expected);
    });

    Then('token text is {string}', function (expected) {
        const actual = this.tokens[this.currentToken].text;
        assert.equal(actual, expected);
    });

    Then('token int value is {int}', function (expected) {
        assert.equal(Number(this.tokens[this.currentToken].text), expected);
    });

    Then(/(\S+) token text is '([^']+)'/, function (order, expected) {

        if (order === 'first') {
            this.currentToken = 0;
        } else if (order === 'next') {
            this.currentToken++;
        } else if (order) {
            this.currentToken = parseInt(order) - 1;
        }

        assert.equal(this.tokens[this.currentToken].text, expected);
    });

    Then(/(\S+) token int value is (\S+)/, function (order, expected) {

        if (order === 'first') {
            this.currentToken = 0;
        } else if (order === 'next') {
            this.currentToken++;
        } else if (order) {
            this.currentToken = parseInt(order) - 1;
        }

        assert.equal(parseInt(this.tokens[this.currentToken].text), expected);
    });

    Then(/(\S+) token type is (\S+)/, function (order, expected) {

        if (order === 'first') {
            this.currentToken = 0;
        } else if (order === 'next') {
            this.currentToken++;
        } else if (order) {
            this.currentToken = parseInt(order) - 1;
        }

        assert.equal(this.tokens[this.currentToken].type, Tokens[expected]);
    });

    When('I use a lexer', function () {
        this.currentLexer = new Lexer(this.text);
    });

    Then('I consume one char code {string}', function (what) {
        assert.equal(what.length, 1);
        assert.isTrue(!!this.currentLexer.consume(what.charCodeAt(0)));
    });

    Then('I consume two char codes {string}', function (what) {
        assert.equal(what.length, 2);
        assert.isTrue(!!this.currentLexer.consumeTwo(
            what.charCodeAt(0),
            what.charCodeAt(1)
        ));
    });

    Then('I consume three char codes {string}', function (what) {
        assert.equal(what.length, 3);
        assert.isTrue(!!this.currentLexer.consumeThree(
            what.charCodeAt(0),
            what.charCodeAt(1),
            what.charCodeAt(2)
        ));
    });

})