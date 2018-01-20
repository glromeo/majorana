"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Interpreter = undefined;

var _operators = require("./operators.js");

var _parser = require("./parser.js");

var _ast = require("./ast.js");

const assignment = _operators.Operators.Assignment['='];

const valueOf = {
    [_ast.AST.String]: eval,
    [_ast.AST.Number]: Number
};

let Interpreter = exports.Interpreter = class Interpreter {

    constructor(parser = new _parser.Parser()) {
        this.parser = parser;
    }

    parse(expression) {
        this.ast = this.parser.parse(expression);
    }

    eval(context, self) {
        this.context = context;
        this.self = self;
        return new Promise(resolve => this[this.ast.type](this.ast, resolve));
    }

    [_ast.AST.Expression]({ expression }, callback) {
        this[expression.type](expression, callback);
    }

    [_ast.AST.AssignmentExpression]({ left, right }, callback) {
        callback.pending = 3;

        this[right.type](right, value => assignment(callback, 'value', value));

        if (left.type === _ast.AST.Identifier) {
            assignment(callback, 'member', left.name);
            assignment(callback, 'object', this.context);
        } else {
            const lm = left.member;
            if (left.computed) {
                this[lm.type](lm, member => assignment(callback, 'member', member));
            } else {
                assignment(callback, 'member', lm.name || valueOf[lm.type](lm.text));
            }
            this[left.object.type](left.object, object => assignment(callback, 'object', object));
        }
    }

    [_ast.AST.CommaExpression]({ list }, callback) {
        const pending = list.length;
        let c,
            expression = list[c = 0];

        if (pending) {
            const next = value => {
                if (value instanceof Promise) {
                    return value.then(next);
                }
                if (++c < pending) {
                    expression = list[c];
                    this[expression.type](expression, next);
                } else {
                    callback(value);
                }
            };
            this[expression.type](expression, next);
        }
    }

    [_ast.AST.TernaryExpression]({ test, consequent, alternate }, callback) {
        this[test.type](test, test => {
            if (test) {
                this[consequent.type](consequent, callback);
            } else {
                this[alternate.type](alternate, callback);
            }
        });
    }

    [_ast.AST.Identifier]({ name }, callback) {
        const value = this.context[name];
        if (value instanceof Promise) {
            return value.then(callback);
        }
        callback(value);
    }

    [_ast.AST.String]({ text }, callback) {
        callback(eval(text));
    }

    [_ast.AST.Number]({ text }, callback) {
        callback(Number(text));
    }

    [_ast.AST.CallExpression]({ callee, parameters }, callback) {

        this[callee.type](callee, (callee, self = this.self) => {
            const length = parameters.length,
                  args = new Array(length);
            let p = 0,
                parameter = parameters[p];

            if (length) {
                const next = value => {
                    if (value instanceof Promise) {
                        return value.then(next);
                    }
                    args[p] = value;
                    if (++p < length) {
                        parameter = parameters[p];
                        return this[parameter.type](parameter, next);
                    }
                    const result = callee.apply(self, args);
                    if (result instanceof Promise) {
                        return result.then(callback);
                    }
                    callback(result);
                };
                return this[parameter.type](parameter, next);
            }

            const result = callee.apply(self);
            if (result instanceof Promise) {
                return result.then(callback);
            }
            callback(result);
        });
    }

    [_ast.AST.SelfExpression](ignored, callback) {
        callback(this.self);
    }

    [_ast.AST.MemberExpression]({ object, member, computed }, callback) {
        this[object.type](object, object => {
            let value;

            if (computed) return this[member.type](member, member => {
                if ((value = object[member]) instanceof Promise) {
                    return value.then(callback);
                }
                callback(value, object);
            });

            if ((value = object[member.name || valueOf[member.type](member.text)]) instanceof Promise) {
                return value.then(callback);
            }
            callback(value, object);
        });
    }

    [_ast.AST.ArrayExpression]({ elements }, callback) {
        const length = elements.length,
              array = new Array(length);
        let p = 0,
            element = elements[p];

        if (length) {
            const next = value => {
                if (value instanceof Promise) {
                    return value.then(next);
                }
                array[p] = value;
                if (++p < length) {
                    element = elements[p];
                    return this[element.type](element, next);
                } else {
                    callback(array);
                }
            };
            return this[element.type](element, next);
        }

        callback(array);
    }

    /**
     *
     * @param key
     * @param value
     * @param computed not used
     * @param callback
     */
    [_ast.AST.Property]({ key, value, computed }, callback) {
        if (computed) {
            this[key.type](key, key => this[value.type](value, value => callback(key, value)));
        } else {
            this[value.type](value, value => callback(key.name || valueOf[key.type](key.text), value));
        }
    }

    [_ast.AST.ObjectExpression]({ properties }, callback) {
        const length = properties.length,
              object = {};
        let p = 0,
            property = properties[p];

        if (length) {
            const next = (key, value) => {
                if (key instanceof Promise) {
                    return key.then(next);
                }
                if (value instanceof Promise) {
                    return value.then(next);
                }
                object[key] = value;
                if (++p < length) {
                    property = properties[p];
                    this[property.type](property, next);
                } else {
                    callback(object);
                }
            };
            return this[property.type](property, next);
        }

        callback(object);
    }

};


const BinaryExpression = operators => function ({ left, right, operator }, callback) {
    callback.pending = 2;
    this[left.type](left, left => operators[operator](callback, 'left', left));
    this[right.type](right, right => operators[operator](callback, 'right', right));
};

const UnaryExpression = operators => function ({ prefix, operator, argument }, callback) {
    callback.pending = 1;
    this[argument.type](argument, argument => operators[operator](callback, 'argument', argument));
};

Interpreter.prototype[_ast.AST.LogicalExpression] = BinaryExpression(_operators.Operators.Logical);
Interpreter.prototype[_ast.AST.EqualityExpression] = BinaryExpression(_operators.Operators.Equality);
Interpreter.prototype[_ast.AST.RelationalExpression] = BinaryExpression(_operators.Operators.Relational);
Interpreter.prototype[_ast.AST.AdditiveExpression] = BinaryExpression(_operators.Operators.Additive);
Interpreter.prototype[_ast.AST.MultiplicativeExpression] = BinaryExpression(_operators.Operators.Multiplicative);
Interpreter.prototype[_ast.AST.UnaryExpression] = UnaryExpression(_operators.Operators.Unary);

Interpreter.prototype[_ast.AST.Literal] = function ({ value }, callback) {
    callback(value);
};
//# sourceMappingURL=interpreter.js.map