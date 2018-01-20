import {describe, it} from "mocha";
import {assert} from "chai";
import {Parser} from "../main/parser.js";
import {Lexer} from "../main/lexer.js";
import {Expression} from "../main";

describe("Parser and AST Tests", function () {

    beforeEach(function () {
        try {
            this.expression = new Expression(this.currentTest.title);
        } catch (e) {
            assert.equal(e.message, "Unexpected input: `errors`, at line: 1, column: 8.");
        }
    });

    describe("constants", function () {
        it("1 + 1", async function () {
            assert.equal(await this.expression.invoke(), 2)
        });
        it("two + this.one", async function () {
            assert.equal(await this.expression.invoke({one: 1}, {two: 2}), 3)
        });
        it("this.one + twice(1 + 1)", async function () {
            assert.equal(await this.expression.invoke({one: 1}, {
                twice(x) {
                    return x + 2;
                }
            }), 5)
        });
        it("this.one + twice('1')", async function () {
            assert.equal(await this.expression.invoke({one: 1, two: Promise.resolve(2)}, {
                async twice(x) {
                    return Number(x) * await this.two;
                }
            }), 3)
        });
    });

    describe("object", function () {

        it("{}", async function () {
            let node = this.expression;
            assert.deepEqual(await node.invoke(null, {}), {});
            assert.notStrictEqual(await node.invoke(), await node.invoke());
        });
        it("{p:true}", async function () {
            let node = this.expression;
            assert.deepEqual(await node.invoke(), {p: true});
        });
        it("{p:true, p:false}", async function () {
            let node = this.expression;
            assert.deepEqual(await node.invoke(), {p: false});
        });
        it("{[x]:y}", async function () {
            let node = this.expression;
            let promise = new Promise(resolve => setTimeout(() => resolve('Q'), 10));
            assert.deepEqual(await node.invoke(null, {x: 'P', y: promise}), {P: 'Q'});
        });
        it("{2:2}[one+this.one]", async function () {
            let node = this.expression;
            assert.equal(await node.invoke({one: 1}, {one: 1}), 2);
        });

        it("syntax errors", function () {
            let p = new Parser(), parse = p.parse.bind(p);
            Lexer.debug = true;
            assert.throws(() => parse("{[x}"), "Expected ] but was }, at line: 1, column: 4.");
            assert.throws(() => parse("{[x,y]}"), "Expected ] but was ,");
            assert.throws(() => parse("{[z],}"), "Expected : but was ,");
        });
    });

    describe("parseArray", function () {
        it("[]", async function () {
            let node = this.expression;
            assert.deepEqual(await node.invoke(), []);
            assert.notStrictEqual(await node.invoke(), await node.invoke());
        });
        it("[1]", async function () {
            let node = this.expression;
            assert.deepEqual(await node.invoke(), [1]);
        });
        it("[,,].length", async function () {
            let node = this.expression;
            assert.equal(await node.invoke(), 3);
        });
        it("[true,'false',x(), !!this]", async function () {
            let node = this.expression;
            assert.deepEqual(await node.invoke(null, {
                x: Promise.resolve(function () {
                    return this;
                })
            }), [true, 'false', null, false]);
        });
    });

});