'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.AST = undefined;

var _bluebird = require('bluebird');

const BINARY_OPERATORS = {
    '+': (left, right) => left + right,
    '-': (left, right) => left - right,
    '*': (left, right) => left * right,
    '/': (left, right) => left / right,
    '%': (left, right) => left % right,
    '<': (left, right) => left < right,
    '<=': (left, right) => left <= right,
    '>': (left, right) => left > right,
    '>=': (left, right) => left >= right,
    '&&': (left, right) => left && right,
    '||': (left, right) => left || right
};

const UNARY_OPERATORS = {
    '+': argument => +argument,
    '-': argument => -argument,
    '!': argument => !argument
};

const GETTER = (object, property) => object[property];
const SETTER = (object, property, value) => object[property] = value;

const TRUE = (0, _bluebird.resolve)(true);
const FALSE = (0, _bluebird.resolve)(false);
const NULL = (0, _bluebird.resolve)(null);
const UNDEFINED = (0, _bluebird.resolve)(undefined);

const promisesCache = new WeakMap();

const AST = exports.AST = {

    Expression: class {

        constructor(expression) {
            this.expression = expression;
        }

        resolve(self, context) {
            return this.expression.resolve(self, context);
        }
    },

    AssignmentExpression: class {

        constructor(target, value) {
            this.target = target;
            this.value = value;
        }

        resolve(self, context) {
            return this.value.resolve(self, context).then(value => this.target.write(self, context, value));
        }
    },

    CommaExpression: class {

        constructor(expressions) {
            this.expressions = expressions;
        }

        resolve(self, context) {
            return (0, _bluebird.all)(this.expressions.map(e => e.resolve(self, context))).then(this.last);
        }

        last(expressions) {
            return expressions[expressions.length - 1];
        }
    },

    TernaryExpression: class {

        constructor(test, consequent, alternate) {
            this.test = test;
            this.consequent = consequent;
            this.alternate = alternate;
        }

        resolve(self, context) {
            return this.test.resolve(self, context).then(test => {
                if (test) {
                    return this.consequent.resolve(self, context);
                } else {
                    return this.alternate.resolve(self, context);
                }
            });
        }
    },

    BinaryExpression: class {

        constructor(operator, left, right) {
            this.operator = operator;
            this.left = left;
            this.right = right;
        }

        resolve(self, context) {
            return (0, _bluebird.join)(this.left.resolve(self, context), this.right.resolve(self, context), BINARY_OPERATORS[operator]);
        }
    },

    UnaryExpression: class {

        constructor(prefix, argument) {
            if (!prefix) {
                throw TypeError("unsupported operator: postfix unary");
            }
            this.argument = argument;
        }

        resolve(self, context) {
            return this.argument.resolve(self, context).then(UNARY_OPERATORS[operator]);
        }
    },

    Literals: {
        'true': TRUE,
        'false': FALSE,
        'null': NULL,
        'undefined': UNDEFINED,
        'this': {
            resolve(self) {
                return promisesCache.get(self) || promisesCache.set(self, (0, _bluebird.resolve)(self)).get(self);
            }
        }
    },

    Identifier: class {

        constructor(text) {
            this.text = text;
        }

        resolve(self, context) {
            return (0, _bluebird.resolve)(context[this.text]);
        }

        write(self, context, value) {
            return (0, _bluebird.resolve)(context[this.text] = value);
        }
    },

    Constant: class {

        constructor(type, text) {
            this.type = type;
            this.text = text;
        }

        resolve() {
            return (0, _bluebird.resolve)(this.type(this.text));
        }
    },

    CallExpression: class {

        constructor(callee, args) {
            this.callee = callee;
            this.args = args;
        }

        resolve(self, context) {
            return this.callee.resolve(self, context).then(callee => (0, _bluebird.all)(this.args).then(args => {
                return callee.apply(self, args);
            }));
        }
    },

    MemberExpression: class {

        constructor(object, property, computed) {
            this.object = object;
            this.property = property;
            this.computed = computed;
        }

        resolve(self, context) {
            if (this.computed) {
                return (0, _bluebird.join)(this.object.resolve(self, context), this.property.resolve(self, context), GETTER);
            } else {
                return (0, _bluebird.join)(this.object.resolve(self, context), this.property.text, GETTER);
            }
        }

        write(self, context, value) {
            if (this.computed) {
                return (0, _bluebird.join)(this.object.resolve(self, context), this.property.resolve(self, context), value, SETTER);
            } else {
                return (0, _bluebird.join)(this.object.resolve(self, context), this.property.text, value, SETTER);
            }
        }
    },

    ArrayExpression: class {

        constructor(elements) {
            this.elements = elements;
        }

        resolve(self, context) {
            return (0, _bluebird.all)(this.elements.map(e => e.resolve(self, context)));
        }
    },

    Property: class {
        constructor(key, value, computed) {
            this.key = key;
            this.value = value;
            this.computed = computed;
        }
    },

    ObjectExpression: class {

        constructor(properties) {
            if (!properties.length) {
                return;
            }
            let p = 0,
                property,
                parameters = new Map();
            let initializer = "";
            for (property of properties) {
                if (property.computed) {
                    parameters.set("pk" + p, property.key);
                    parameters.set("pv" + p, property.value);
                    initializer += ",\n\t[pk" + p + "]: pv" + p;
                } else {
                    parameters.set("pv" + p, property.value);
                    initializer += ",\n\t" + property.key.text + ": pv" + p;
                }
                ++p;
            }
            this.initializer = new Function(...parameters.keys(), "return {" + initializer.substring(1) + "\n};");
            this.parameters = parameters.values();
        }

        resolve(self, context) {
            return (0, _bluebird.all)(this.parameters.map(v => v.resolve(self, context))).then(this.initializer);
        }

        initializer() {
            return {};
        }
    }
};
//# sourceMappingURL=ast.js.map