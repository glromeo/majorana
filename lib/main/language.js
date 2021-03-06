"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
const Tokens = exports.Tokens = {
    Comment: Symbol("Comment"),
    BlockComment: Symbol("BlockComment"),
    LineComment: Symbol("LineComment"),
    Constant: Symbol("Constant"),
    Number: Symbol("Number"),
    String: Symbol("String"),
    Literal: Symbol("Literal"),
    Symbol: Symbol("Symbol")
};

const Symbols = exports.Symbols = {
    equality: ['===', '==', '!==', '!='],
    relational: ['<', '<=', '>', '>='],
    additive: ["+", "-"],
    multiplicative: ["*", "/", "%"],
    unary: ["+", "-", "!"],
    assignment: ["="]
};
//# sourceMappingURL=language.js.map