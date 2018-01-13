import {Parser} from "./parser";

/**
 * AsyncFunction is a constructor for asynchronous functions (same as new Function(...)).
 *
 * Similar to: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
 */
const AsyncFunction = Object.getPrototypeOf(async () => (void 0)).constructor;

const uniqueExpressionID = (function* () {
    let index = 0;
    while (true) yield `expression?id=${index++}`;
})();

function expressionMixin(BaseFunction) {

    return class extends BaseFunction {

        constructor(parameters, code, sourceURL = uniqueExpressionID.next().value) {

            const block = `//# sourceURL=${ sourceURL }\nreturn ${code}`;
            if (parameters.size) {
                super(...Array.from(parameters),  block);
            } else {
                super(block);
            }
            this.sourceURL = sourceURL;
            this.parameters = parameters;
        }

        bind(target) {
            const bound = super.bind(target);
            bound.sourceURL = this.sourceURL;
            bound.parameters = this.parameters;
            return bound;
        }

        toString() {
            return `function (${this.parameters.join(', ')}) { //# sourceURL=${this.sourceURL} ... }`;
        }
    }
}

export const Expression = expressionMixin(Function);
export const AsyncExpression = expressionMixin(AsyncFunction);

export class Compiler {

    static compile(source, sourceURL, watch) {
        const {code, parameters, isAsync} = new Compiler().compile(source, watch);
        if (isAsync) {
            return new AsyncExpression(parameters, code, sourceURL);
        } else {
            return new Expression(parameters, code, sourceURL);
        }
    }

    constructor() {
        this.parameters = new Set();
        this.hasAwait = false;
    }

    compile(source, watch) {
        const ast = new Parser(source).ast();
        if (watch) {
            this.watch = watch;
        }
        return {
            code: this[ast.type](ast),
            parameters: this.parameters,
            isAsync: this.hasAwait
        };
    }

    ['ExpressionStatement']({expression}) {
        return this[expression.type](expression);
    }

    ['AssignmentExpression']({left, right}) {
        return this[left.type](left) + '=' + this[right.type](right);
    }

    ['AwaitExpression']({async}) {
        this.hasAwait = true;
        return '(await ' + this[async.type](async) + ')';
    }

    ['ConditionalExpression']({test, alternate, consequent}) {
        return this[test.type](test) + '?' + this[alternate.type](alternate) + ":" + this[consequent.type](consequent);
    }

    ['LogicalExpression']({operator, left, right}) {
        return this[left.type](left) + operator + this[right.type](right);
    }

    ['BinaryExpression']({operator, left, right}) {
        return this[left.type](left) + operator + this[right.type](right);
    }

    ['UnaryExpression']({operator, argument, prefix}) {
        argument = this[argument.type](argument);
        if (prefix) {
            return operator + argument;
        } else {
            return argument + operator;
        }
    }

    ['CallExpression']({callee, args, filter}) {
        args = args.map(arg => this[arg.type](arg));
        if (!filter) {
            return this[callee.type](callee) + '(' + args + ')';
        }
    }

    ['MemberExpression']({object, property, computed}) {
        if (computed) {
            let lhs = this[object.type](object);
            let rhs = this[property.type](property);
            const result = lhs + '[' + rhs + ']';
            if (this.watch) {
                this.watch.add(lhs + '.' + (property.type === 'Literal' ? property.text : eval(property.value)));
            }
            return result;
        } else {
            const result = this[object.type](object) + '.' + this[property.type](property);
            if (this.watch) {
                this.watch.add(result);
            }
            return result;
        }
    }

    ['Identifier']({name, local}) {
        if (!local) {
            if (this.watch) {
                this.watch.add(name);
            }
            this.parameters.add(name);
        }
        return name;
    }

    ['Literal']({text}) {
        return text;
    }

    ['This']() {
        if (this.watch) {
            this.watch.add('this');
        }
        return 'this';
    }

    ['Number']({text}) {
        return text;
    }

    ['String']({value}) {
        return value;
    }

    ['ArrayExpression']({elements}) {
        elements = elements.map(e => this[e.type](e));
        return '[' + elements + ']';
    }

    ['Property']({key, value, computed}) {
        key = this[key.type](key);
        value = this[value.type](value);
        if (computed) {
            return '[' + key + ']:' + value;
        } else {
            return key + ':' + value;
        }
    }

    ['ObjectExpression']({properties}) {
        properties = properties.map(p => this[p.type](p));
        return '{' + properties + '}';
    }
}
