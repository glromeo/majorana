import {assert, expect} from "chai";
import {Parser} from "../main/parser.js";

describe("Parser Tests", function () {

    it("lexer", function () {
        const parser = new Parser("abc = 1 + true - $id && ccc(02 / (2e7))");
        const out = parser.ast();
        assert.deepInclude(out, {
            "expression": {
                "left": {
                    "left": {
                        "name": "abc",
                        "type": "Identifier"
                    },
                    "operator": "=",
                    "right": {
                        "left": {
                            "left": {
                                "text": "1",
                                "type": "Number"
                            },
                            "operator": "+",
                            "right": {
                                "type": "Literal",
                                "value": "true"
                            },
                            "type": "BinaryExpression"
                        },
                        "operator": "-",
                        "right": {
                            "name": "$id",
                            "type": "Identifier"
                        },
                        "type": "BinaryExpression"
                    },
                    "type": "BinaryExpression"
                },
                "operator": "&&",
                "right": {
                    "args": [
                        {
                            "left": {
                                "text": "02",
                                "type": "Number"
                            },
                            "operator": "/",
                            "right": {
                                "text": "2e7",
                                "type": "Number"
                            },
                            "type": "BinaryExpression"
                        }
                    ],
                    "callee": {
                        "name": "ccc",
                        "type": "Identifier"
                    },
                    "type": "CallExpression"
                },
                "type": "LogicalExpression"
            }
        });
    });

    it("simple object", function () {

        const parser = new Parser("{\n" +
            "'k-a': 'class-a', 'k-b': 'class-b', 'k-c': 'class-c'\n" +
            "}[classValue]");
        const out = parser.ast();
        assert.isOk(out);
    });
});