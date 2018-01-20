import {Operators} from "./operators.js";
import {Parser} from "./parser.js";
import {AST} from "./ast.js";

const valueOf = {
    [AST.String]: eval,
    [AST.Number]: Number
};

export class Interpreter {

    constructor(parser = new Parser()) {
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

    [AST.Expression]({expression}, callback) {
        this[expression.type](expression, callback);
    }

    [AST.AssignmentExpression]({left, right}, callback) {
        this[right.type](right, right => {
            if (left.type === AST.Identifier) {
                callback(this.context[left.name] = right);
            } else {
                this[left.object.type](left.object, object => {
                    const member = left.member;
                    if (left.computed) {
                        this[member.type](member, member => callback(object[member] = right));
                    } else {
                        callback(object[member.name] = right);
                    }
                });
            }
        });
    }


    [AST.CommaExpression]({list}, callback) {
        const pending = list.length;
        let p, expression = list[p = 0];
        const next = value => {
            if (++p < pending) {
                expression = list[p];
                this[expression.type](expression, next);
            } else {
                callback(value);
            }
        };
        this[expression.type](expression, next);
    }

    [AST.TernaryExpression]({test, consequent, alternate}, callback) {
        this[test.type](test, test => {
            if (test) {
                this[consequent.type](consequent, callback);
            } else {
                this[alternate.type](alternate, callback);
            }
        });
    }

    [AST.Identifier]({name}, callback) {
        const value = this.context[name];
        if (value instanceof Promise) {
            value.then(callback);
        } else {
            callback(value);
        }
    }

    [AST.String]({text}, callback) {
        callback(eval(text));
    }

    [AST.Number]({text}, callback) {
        callback(Number(text));
    }

    [AST.CallExpression]({callee, parameters}, callback) {
        const pending = parameters.length;
        if (pending) {
            const args = new Array(pending);
            let p = 0, parameter = parameters[p];
            const next = value => {
                args[p] = value;
                if (++p < pending) {
                    parameter = parameters[p];
                    this[parameter.type](parameter, next);
                } else {
                    this[callee.type](callee, (callee, self = this.self) => {
                        let result;
                        if ((result = callee.call(self, ...args)) && result.then) {
                            result.then(callback);
                        } else {
                            callback(result);
                        }
                    });
                }
            };
            this[parameter.type](parameter, next);
        } else {
            this[callee.type](callee, (callee, self = this.self) => {
                let result;
                if ((result = callee.call(self)) && result.then) {
                    result.then(callback);
                } else {
                    callback(result);
                }
            });
        }
    }

    [AST.SelfExpression](ignored, callback) {
        callback(this.self);
    }

    [AST.MemberExpression]({object, member, computed}, callback) {
        this[object.type](object, object => {
            let value;
            if (computed) {
                this[member.type](member, member => {
                    if ((value = object[member]) instanceof Promise) {
                        value.then(callback)
                    } else {
                        callback(value, object);
                    }
                });
            } else {
                if ((value = object[member.name || valueOf[member.type](member.text)]) instanceof Promise) {
                    value.then(callback);
                } else {
                    callback(value, object)
                }
            }
        });
    }

    [AST.ArrayExpression]({elements}, callback) {
        const pending = elements.length;
        if (pending) {
            const array = new Array(pending);
            let p = 0, element = elements[p];
            const next = value => {
                array[p] = value;
                if (++p < pending) {
                    element = elements[p];
                    return this[element.type](element, next);
                } else {
                    callback(array);
                }
            };
            this[element.type](element, next);
        } else {
            callback([]);
        }
    }

    /**
     *
     * @param key
     * @param value
     * @param computed not used
     * @param callback
     */
    [AST.Property]({key, value, computed}, callback) {
        this[value.type](value, value => {
            if (computed) {
                this[key.type](key, key => callback(key, value));
            } else {
                return callback(key.name || valueOf[key.type](key.text), value);
            }
        });
    }

    [AST.ObjectExpression]({properties}, callback) {
        const pending = properties.length;
        const object = {};
        if (pending) {
            let p = 0, property = properties[p];
            const next = (key, value) => {
                object[key] = value;
                if (++p < pending) {
                    property = properties[p];
                    this[property.type](property, next);
                } else {
                    callback(object);
                }
            };
            this[property.type](property, next);
        } else {
            callback(object);
        }
    }
}

const BinaryExpression = (operators) => function ({left, right, operator}, callback) {
    this[right.type](right, right => {
        this[left.type](left, left => callback(operators[operator](left, right)));
    });
};


const UnaryExpression = (operators) => function ({prefix, operator, argument}, callback) {
    this[argument.type](argument, argument => callback(operators[operator](argument)));
};

Interpreter.prototype[AST.LogicalExpression] = BinaryExpression(Operators.Logical);
Interpreter.prototype[AST.EqualityExpression] = BinaryExpression(Operators.Equality);
Interpreter.prototype[AST.RelationalExpression] = BinaryExpression(Operators.Relational);
Interpreter.prototype[AST.AdditiveExpression] = BinaryExpression(Operators.Additive);
Interpreter.prototype[AST.MultiplicativeExpression] = BinaryExpression(Operators.Multiplicative);
Interpreter.prototype[AST.UnaryExpression] = UnaryExpression(Operators.Unary);

Interpreter.prototype[AST.Literal] = function ({value}, callback) {
    callback(value);
};

