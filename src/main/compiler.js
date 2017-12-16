import {Parser} from "./parser";

const ArrayExpression = 'ArrayExpression';
const AssignmentExpression = 'AssignmentExpression';
const BinaryExpression = 'BinaryExpression';
const CallExpression = 'CallExpression';
const ConditionalExpression = 'ConditionalExpression';
const ExpressionStatement = 'ExpressionStatement';
const Identifier = 'Identifier';
const Literal = 'Literal';
const Number = 'Number';
const String = 'String';
const LogicalExpression = 'LogicalExpression';
const MemberExpression = 'MemberExpression';
const ObjectExpression = 'ObjectExpression';
const Property = 'Property';
const UnaryExpression = 'UnaryExpression';

export class Compiler {

    compile(source) {

        this.parameters = new Set();

        const ast = new Parser(source).ast();
        const code = this[ast.type](ast);

        return {
            ast,
            code,
            parameters: Array.from(this.parameters)
        };
    }

    [ExpressionStatement]({expression}) {
        return this[expression.type](expression);
    }

    [AssignmentExpression]({left, right}) {
        return this[left.type](left) + '=' + this[right.type](right);
    }

    [ConditionalExpression]({test, alternate, consequent}) {
        return this[test.type](test) + '?' + this[alternate.type](alternate) + ":" + this[consequent.type](consequent);
    }

    [LogicalExpression]({operator, left, right}) {
        return this[left.type](left) + operator + this[right.type](right);
    }

    [BinaryExpression]({operator, left, right}) {
        try {
            return this[left.type](left) + operator + this[right.type](right);
        } catch (e) {
            console.error(operator, left, right);
        }
    }

    [UnaryExpression]({operator, argument, prefix}) {
        argument = this[argument.type](argument);
        if (prefix) {
            return operator + argument;
        } else {
            return argument + operator;
        }
    }

    [CallExpression]({callee, args, filter}) {
        args = args.map(arg => this[arg.type](arg));
        if (!filter) {
            return this[callee.type](callee) + '(' + args + ')';
        }
    }

    [MemberExpression]({object, property, computed}) {
        property = this[property.type](property);
        if (computed) {
            return this[object.type](object) + '[' + property + ']';
        } else {
            return this[object.type](object) + '.' + property;
        }
    }

    [Identifier]({name}) {
        this.parameters.add(name);
        return name;
    }

    [Literal]({text}) {
        return text;
    }

    [Number]({text}) {
        return text;
    }

    [String]({text}) {
        return text;
    }

    [ArrayExpression]({elements}) {
        elements = elements.map(e => this[e.type](e));
        return '[' + elements + ']';
    }

    [Property]({key, value, computed}) {
        key = this[key.type](key);
        value = this[value.type](value);
        if (computed) {
            return '[' + key + ']:' + value;
        } else {
            return key + ':' + value;
        }
    }

    [ObjectExpression]({properties}) {
        properties = properties.map(p => this[p.type](p));
        return '{' + properties + '}';
    }
}