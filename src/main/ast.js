import {Operators} from "./operators";

const AsyncFunction = Object.getPrototypeOf(async function () {
}).constructor;

const globalEval = eval;

const BinaryExpression = (operators) => class {

    constructor(operator, left, right) {
        this.operator = operators[operator];
        this.left = left;
        this.right = right;
    }

    eval(self, context) {
        return this.operator(
            this.left.eval(self, context),
            this.right.eval(self, context)
        );
    }

};

const UnaryExpression = (operators) => class {

    constructor(prefix, operator, argument) {
        if (!prefix) {
            throw TypeError("unsupported operator: postfix unary");
        }
        this.operator = operators[operator];
        this.argument = argument;
    }

    eval(self, context) {
        return this.operator(this.argument.eval(self, context));
    }
};

export const AST = {

    Expression: class {

        constructor(expression) {
            this.expression = expression;
        }

        eval(self, context) {
            return this.expression.eval(self, context);
        }
    },

    AssignmentExpression: class {

        constructor(left, right) {
            this.left = left;
            this.right = right;
        }

        eval(self, context) {
            return this.left.write(self, context, this.right.eval(self, context));
        }
    },

    CommaExpression: class {

        constructor(expressions) {
            this.expressions = expressions;
        }

        eval(self, context) {
            let value;
            for (const expression of this.expressions) {
                value = expression.eval(self, context);
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

        async eval(self, context) {
            if (await this.test.eval(self, context)) {
                return this.consequent.eval(self, context);
            } else {
                return this.alternate.eval(self, context);
            }
        }
    },

    LogicalExpression: BinaryExpression(Operators.Logical),

    EqualityExpression: BinaryExpression(Operators.Equality),

    RelationalExpression: BinaryExpression(Operators.Relational),

    AdditiveExpression: BinaryExpression(Operators.Additive),

    MultiplicativeExpression: BinaryExpression(Operators.Multiplicative),

    UnaryExpression: UnaryExpression(Operators.Unary),

    Literals: {
        'true': {eval: () => true},
        'false': {eval: () => false},
        'null': {eval: () => null},
        'undefined': {eval: () => undefined},
        'this': {eval: self => self}
    },

    Identifier: class {

        constructor(text) {
            this.name = text;
        }

        eval(self, context) {
            return context[this.name];
        }

        async write(self, context, value) {
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

        async eval(self, context) {
            const callee = await this.callee.eval(self, context), args = [];
            for (const parameter of this.parameters) {
                args.push(await parameter.eval(self, context));
            }
            return callee.apply(self, args);
        }
    },

    MemberExpression: class {

        constructor(object, member, computed) {
            this.object = object;
            this.member = member;
            this.computed = computed;
        }

        async eval(self, context) {
            const object = await this.object.eval(self, context);
            if (this.computed) {
                return object[context[this.member.symbol()]];
            } else {
                return object[this.member.symbol()];
            }
        }

        async write(self, context, value) {
            const object = await this.object.eval(self, context);
            if (this.computed) {
                return object[context[this.member.symbol()]] = await value;
            } else {
                return object[this.member.symbol()] = await value;
            }
        }
    },

    ArrayExpression: class {

        constructor(elements) {
            this.elements = elements;
        }

        async eval(self, context) {
            let v = 0, value = new Array(this.elements.length);
            for (const element of this.elements) {
                value[v++] = await element.eval(self, context);
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

        eval(self, context) {
            return this.computed ? this.value.eval(self, context).then(value => {
                return this.key.eval(self, context).then(key => {
                    return {key, value};
                });
            }) : this.value.eval(self, context);
        }
    },

    ObjectExpression: class {

        constructor(properties) {
            this.properties = properties;
        }

        async eval(self, context) {
            const value = {};
            for (const property of this.properties) if (property.computed) {
                value[await property.key.eval(self, context)] = await property.value.eval(self, context);
            } else {
                value[property.key.symbol()] = await property.value.eval(self, context);
            }
            return value;
        }
    }
};
