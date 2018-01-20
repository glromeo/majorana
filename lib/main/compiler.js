"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.AST = undefined;

var _operators = require("./operators");

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const globalEval = eval;

const BinaryExpression = operators => class {

    constructor(operator, left, right) {
        this.operator = operators[operator];
        this.left = left;
        this.right = right;
    }

    eval(context) {
        return this.operator(this.left.eval(context), this.right.eval(context));
    }

};

const UnaryExpression = operators => class {

    constructor(prefix, operator, argument) {
        if (!prefix) {
            throw TypeError("unsupported operator: postfix unary");
        }
        this.operator = operators[operator];
        this.argument = argument;
    }

    eval(context) {
        return this.operator(this.argument.eval(context));
    }
};

const AST = exports.AST = {

    Expression: class {

        constructor(expression) {
            this.expression = expression;
        }

        eval(that, context) {
            return this.expression.eval(Object.create(context || null, {
                that: { value: that }
            }));
        }
    },

    AssignmentExpression: class {

        constructor(left, right) {
            this.left = left;
            this.right = right;
        }

        eval(context) {
            return this.left.write(context, this.right.eval(context));
        }
    },

    CommaExpression: class {

        constructor(expressions) {
            this.expressions = expressions;
        }

        eval(context) {
            let value;
            for (const expression of this.expressions) {
                value = expression.eval(context);
            }
            return value;
        }
    },

    TernaryExpression: class {

        constructor(test, consequent, alternate) {
            this.test = test;
            this.consequent = consequent;
            this.alternate = alternate;
        }

        async eval(context) {
            if (await this.test.eval(context)) {
                return this.consequent.eval(context);
            } else {
                return this.alternate.eval(context);
            }
        }
    },

    LogicalExpression: BinaryExpression(_operators.Operators.Logical),

    EqualityExpression: BinaryExpression(_operators.Operators.Equality),

    RelationalExpression: BinaryExpression(_operators.Operators.Relational),

    AdditiveExpression: BinaryExpression(_operators.Operators.Additive),

    MultiplicativeExpression: BinaryExpression(_operators.Operators.Multiplicative),

    UnaryExpression: UnaryExpression(_operators.Operators.Unary),

    Literals: {
        'true': { eval: () => true },
        'false': { eval: () => false },
        'null': { eval: () => null },
        'undefined': { eval: () => undefined },
        'this': { eval: context => context.that }
    },

    Identifier: class {

        constructor(text) {
            this.name = text;
        }

        eval(context) {
            return context[this.name];
        }

        async write(context, value) {
            return context[this.name] = await value;
        }

        symbol() {
            return this.name;
        }
    },

    Constant: class {

        constructor(type, text) {
            this.type = type;
            this.text = text;
        }

        eval() {
            return globalEval(this.text);
        }

        symbol() {
            return this.text;
        }
    },

    CallExpression: class {

        constructor(callee, parameters) {
            this.callee = callee;
            this.parameters = parameters;
        }

        async eval(context) {
            const callee = await this.callee.eval(context),
                  args = [];
            for (const parameter of this.parameters) {
                args.push((await parameter.eval(context)));
            }
            return callee.apply(context.that, args);
        }
    },

    MemberExpression: class {

        constructor(object, member, computed) {
            this.object = object;
            this.member = member;
            this.computed = computed;
        }

        async eval(context) {
            const object = await this.object.eval(context);
            if (this.computed) {
                return object[(await this.member.eval(context))];
            } else {
                return object[this.member.symbol()];
            }
        }

        async write(context, value) {
            const object = await this.object.eval(context);
            if (this.computed) {
                return object[(await context[(await this.member.eval(context))])] = await value;
            } else {
                return object[this.member.symbol()] = await value;
            }
        }
    },

    ArrayExpression: class {

        constructor(elements) {
            this.elements = elements;
        }

        async eval(context) {
            let v = 0,
                value = new Array(this.elements.length);
            for (const element of this.elements) {
                value[v++] = await element.eval(context);
            }
            return value;
        }
    },

    Property: class {
        constructor(key, value, computed) {
            this.key = key;
            this.value = value;
            this.computed = computed;
        }

        eval(context) {
            return this.computed ? this.value.eval(context).then(value => {
                return this.key.eval(context).then(key => {
                    return { key, value };
                });
            }) : this.value.eval(context);
        }
    },

    ObjectExpression: class {

        constructor(properties) {
            this.properties = properties;
        }

        async eval(context) {
            const value = {};
            for (const property of this.properties) if (property.computed) {
                value[(await property.key.eval(context))] = await property.value.eval(context);
            } else {
                value[property.key.symbol()] = await property.value.eval(context);
            }
            return value;
        }
    }

};
//# sourceMappingURL=compiler.js.map