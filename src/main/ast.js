import {all, join, resolve} from "bluebird";

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
    '||': (left, right) => left || right,
};

const UNARY_OPERATORS = {
    '+': (argument) => +argument,
    '-': (argument) => -argument,
    '!': (argument) => !argument,
};

const GETTER = (object, property) => object[property];
const SETTER = (object, property, value) => object[property] = value;

const TRUE = resolve(true);
const FALSE = resolve(false);
const NULL = resolve(null);
const UNDEFINED = resolve(undefined);

export const AST = {

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
            return join(this.left.resolve(self, context), this.right.resolve(self, context), BINARY_OPERATORS[operator]);
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
        'undefined': UNDEFINED
    },

    Identifier: class {

        constructor(name) {
            this.name = name;
        }

        resolve(self, context) {
            return resolve(context[this.name]);
        }

        write(self, context, value) {
            return resolve(context[this.name] = value);
        }
    },

    Constant: class {

        constructor(type, text) {
            this.type = type;
            this.text = text;
        }

        resolve() {
            return resolve(this.type(this.text));
        }
    },

    This: {

        resolve(self) {
            return resolve(self);
        },

        write(self, context, value) {
            return resolve(self[this.name] = value);
        }
    },

    CallExpression: class {

        constructor(callee, args) {
            this.callee = callee;
            this.args = args;
        }

        resolve(self, context) {
            return this.callee.resolve(self, context).then(callee => all(this.args).then(args => {
                return callee.apply(context[$this], args);
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
                return join(this.object.resolve(self, context), this.property.resolve(self, context), GETTER);
            } else {
                return join(this.object.resolve(self, context), this.property.value, GETTER);
            }
        }

        write(self, context, value) {
            if (this.computed) {
                return join(this.object.resolve(self, context), this.property.resolve(self, context), value, SETTER);
            } else {
                return join(this.object.resolve(self, context), this.property.value, value, SETTER);
            }
        }
    },

    ArrayExpression: null,
    ObjectExpression: null
};
