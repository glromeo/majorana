import {Operators} from "./operators.js";
import {Parser} from "./parser.js";
import {AST} from "./ast.js";

const assignment = Operators.Assignment['='];

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
        callback.pending = 3;

        this[right.type](right, value => assignment(callback, 'value', value));

        if (left.type === AST.Identifier) {
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

    [AST.CommaExpression]({list}, callback) {
        const pending = list.length;
        let c, expression = list[c = 0];

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
            return value.then(callback);
        }
        callback(value);
    }

    [AST.String]({text}, callback) {
        callback(eval(text));
    }

    [AST.Number]({text}, callback) {
        callback(Number(text));
    }

    [AST.CallExpression]({callee, parameters}, callback) {

        this[callee.type](callee, (callee, self = this.self) => {
            const length = parameters.length, args = new Array(length);
            let p = 0, parameter = parameters[p];

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

    [AST.SelfExpression](ignored, callback) {
        callback(this.self);
    }

    [AST.MemberExpression]({object, member, computed}, callback) {
        this[object.type](object, object => {
            let value;

            if (computed) return this[member.type](member, member => {
                if ((value = object[member]) instanceof Promise) {
                    return value.then(callback)
                }
                callback(value, object);
            });

            if ((value = object[member.name || valueOf[member.type](member.text)]) instanceof Promise) {
                return value.then(callback);
            }
            callback(value, object)
        });
    }

    [AST.ArrayExpression]({elements}, callback) {
        const length = elements.length, array = new Array(length);
        let p = 0, element = elements[p];

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
    [AST.Property]({key, value, computed}, callback) {
        if (computed) {
            this[key.type](key, key => this[value.type](value, value => callback(key, value)));
        } else {
            this[value.type](value, value => callback(key.name || valueOf[key.type](key.text), value));
        }
    }

    [AST.ObjectExpression]({properties}, callback) {
        const length = properties.length, object = {};
        let p = 0, property = properties[p];

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

}


const BinaryExpression = (operators) => function ({left, right, operator}, callback) {
    callback.pending = 2;
    this[left.type](left, left => operators[operator](callback, 'left', left));
    this[right.type](right, right => operators[operator](callback, 'right', right));
};


const UnaryExpression = (operators) => function ({prefix, operator, argument}, callback) {
    callback.pending = 1;
    this[argument.type](argument, argument => operators[operator](callback, 'argument', argument));
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

