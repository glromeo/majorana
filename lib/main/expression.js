"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Expression = undefined;

var _parser = require("./parser.js");

var _interpreter = require("./interpreter.js");

let Expression = exports.Expression = class Expression {

    constructor(source, interpreter = new _interpreter.Interpreter()) {
        this.interpreter = interpreter;
        this.interpreter.parse(source);
    }

    invoke(self, context) {
        return this.interpreter.eval(context, self);
    }

    static set AST(type) {
        switch (type) {
            case 'interpreter':
                _parser.Parser.AST = _interpreter.Interpreter;
                break;
        }
    }
};
//# sourceMappingURL=expression.js.map