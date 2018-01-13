import {describe, it} from "mocha";
import {assert} from "chai";
import {Parser} from "../main/parser.js";
import {Lexer} from "../main/lexer.js";
import {AST} from "../main/ast.js";

Lexer.stripAnsi = true;

describe("Parser and AST Tests", function () {

    it("x = 1", async function () {
        assert.deepEqual(new Parser().parse(this.test.title), {
            "expression": {
                "target": {
                    "text": "x"
                },
                "value": {
                    "text": "1",
                    "type": Number
                }
            }
        });
    });

    it("this[x] = 1", function () {
        assert.deepEqual(new Parser().parse(this.test.title), {
            "expression": {
                "target": {
                    "computed": true,
                    "object": AST.Literals['this'],
                    "property": {
                        "expression": {
                            "text": "x"
                        }
                    }
                },
                "value": {
                    "text": "1",
                    "type": Number
                }
            }
        });
    });

    beforeEach(function () {
        try {
            this.ast = new Parser().parse(this.currentTest.title).expression;
        } catch (e) {
            assert.equal(e.message, "Unexpected input: `errors`, at line: 1, column: 8.");
        }
    });

    describe("parseObject", function () {

        it("{}", async function () {
            let node = this.ast;
            assert.notOwnProperty(node, 'initializer');
            assert.notOwnProperty(node, 'values');
            assert.deepEqual(await node.resolve(null, {}), {});
            assert.notStrictEqual(await node.resolve(), await node.resolve());
        });
        it("{p:true}", async function () {
            let node = this.ast;
            assert.isTrue(node.hasOwnProperty('initializer'));
            assert.deepEqual(await node.resolve(), {p: true});
        });
        it("{p:true, p:false}", async function () {
            let node = this.ast;
            assert.deepEqual(await node.resolve(), {p: false});
        });
        it("{[x]:y}", async function () {
            let node = this.ast;
            let promise = new Promise(resolve => setTimeout(() => resolve('Q'), 10));
            assert.deepEqual(await node.resolve(null, {x: 'P', y: promise}), {P: 'Q'});
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
            let node = this.ast;
            assert.deepEqual(await node.resolve(), []);
            assert.notStrictEqual(await node.resolve(), await node.resolve());
        });
        it("[1]", async function () {
            let node = this.ast;
            assert.deepEqual(await node.resolve(), [1]);
        });
        it("[1,,3].length", async function () {
            let node = this.ast;
            assert.deepEqual(await node.resolve(), [1]);
        });
        it("[true,'false',x(), !!this]", async function () {
            let node = this.ast;
            assert.deepEqual(await node.resolve(null, {
                x: Promise.resolve(function () {
                    return this;
                })
            }), [true, '\'false\'', null, false]);
        });
    });

});