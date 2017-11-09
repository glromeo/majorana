import {assert, expect} from "chai";
import {Parser} from "../lib/parser.js";

describe("Parser Tests", function () {

    it("lexer", function () {
        const parser = new Parser("abc = 1 + true - $id && ccc(02 / (2e7))");
        const out = parser.ast();
        assert.deepInclude({
            "expression": {
                "left": {"name": "abc", "type": "Identifier"},
                "right": {
                    "left": {
                        "left": {
                            "left": {"type": "Literal", "value": 1},
                            "operator": "+",
                            "right": {"type": "Literal", "value": "true"},
                            "type": "BinaryExpression"
                        },
                        "operator": "-",
                        "right": {"name": "$id", "type": "Identifier"},
                        "type": "BinaryExpression"
                    },
                    "operator": "&&",
                    "right": {
                        "arguments": [{
                            "left": {"type": "Literal", "value": 2},
                            "operator": "/",
                            "right": {"type": "Literal", "value": 20000000},
                            "type": "BinaryExpression"
                        }],
                        "callee": {"name": "e", "type": "Identifier"},
                        "filter": false,
                        "type": "CallExpression"
                    },
                    "type": "LogicalExpression"
                },
                "type": "AssignmentExpression"
            },
            "type": "Statement"
        }, out);
    });
});