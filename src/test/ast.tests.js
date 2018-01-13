import {describe, it} from "mocha";
import {assert} from "chai";
import {Parser} from "../main/parser.js";
import {Lexer} from "../main/lexer.js";

describe("Parser and AST Tests", function () {

    beforeEach(function () {
        try {
            this.expression = new Parser().parse(this.currentTest.title).expression;
        } catch (e) {
            assert.equal(e.message, "Unexpected input: `errors`, at line: 1, column: 8.");
        }
    });

    describe("constants", function () {
        it("1 + 1", async function () {
            assert.equal(await this.expression.eval(), 2)
        });
        it("two + this.one", async function () {
            assert.equal(await this.expression.eval({one: 1},{two: 2}), 3)
        });
        it("this.one + twice(1 + 1)", async function () {
            assert.equal(await this.expression.eval({one: 1}, {
                twice(x) {
                    return x + 2;
                }
            }), 5)
        });
        it("this.one + twice('1')", async function () {
            assert.equal(await this.expression.eval({one: 1, two: Promise.resolve(2)}, {
                async twice(x) {
                    return Number(x) * await this.two;
                }
            }), 3)
        });
    });

    describe("object", function () {

        it("{}", async function () {
            let node = this.expression;
            assert.deepEqual(await node.eval(null, {}), {});
            assert.notStrictEqual(await node.eval(), await node.eval());
        });
        it("{p:true}", async function () {
            let node = this.expression;
            assert.deepEqual(await node.eval(), {p: true});
        });
        it("{p:true, p:false}", async function () {
            let node = this.expression;
            assert.deepEqual(await node.eval(), {p: false});
        });
        it("{[x]:y}", async function () {
            let node = this.expression;
            let promise = new Promise(resolve => setTimeout(() => resolve('Q'), 10));
            assert.deepEqual(await node.eval(null, {x: 'P', y: promise}), {P: 'Q'});
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
            assert.deepEqual(await node.eval(), []);
            assert.notStrictEqual(await node.eval(), await node.eval());
        });
        it("[1]", async function () {
            let node = this.expression;
            assert.deepEqual(await node.eval(), [1]);
        });
        it("[,,].length", async function () {
            let node = this.expression;
            assert.equal(await node.eval(), 3);
        });
        it("[true,'false',x(), !!this]", async function () {
            let node = this.expression;
            assert.deepEqual(await node.eval(null, {
                x: Promise.resolve(function () {
                    return this;
                })
            }), [true, 'false', null, false]);
        });
    });

});