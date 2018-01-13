"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Expression = undefined;

var _parser = require("./parser.js");

let Expression = exports.Expression = class Expression {

    constructor(source, parser = new _parser.Parser()) {
        this.ast = parser.parse(source);
    }

    async invoke(self, context) {
        return this.ast.resolve(self, context);
    }
};
//# sourceMappingURL=expression.js.map