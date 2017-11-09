import * as esprima from "esprima";

const GLOBAL = Symbol('GLOBAL');
const BODY = Symbol('BODY');
const ASSIGN = Symbol('ASSIGN');

export class Parser {

    parse(expression) {

        const ast = esprima.parseScript(/*'(' +*/ expression/* + ')'*/, {loc: true}), scope = Object.create(null);

        scope[GLOBAL] = scope;
        scope[BODY] = scope;

        try {
            this.visit(ast.body[0], scope);
        } catch (e) {
            if (e.path) {
                e.message += ", while parsing: " + expression
                e.message += "\n============================================================";
                e.message += "\n" + JSON.stringify(ast, (k, v) => k !== "loc" && v || undefined, 2);
                e.message += "\n------------------------------------------------------------";
                e.path.reverse().forEach(node => {
                    let start = node.loc && node.loc.start || {};
                    e.message += "\nin " + node.type + " at line: " + start.line + ", column: " + start.column;
                });
            }
            e.message += "\n============================================================";
            throw e;
        }

        const globals = [];
        for (const key of Object.keys(scope)) {
            if (!scope[key]) {
                globals.push(key);
            }
        }

        return {ast, globals};
    }

    visit(node, scope, init) {
        try {
            const method = node.type;
            this[method](node, scope, init);
        } catch (e) {
            if (node) {
                if (e.path) {
                    e.path.push(node);
                } else {
                    e.path = [node];
                }
            }
            throw e;
        }
    }

    EmptyStatement() {
    }

    BlockStatement(node, scope, init) {

        const blockScope = Object.create(scope);

        node.body.forEach(item => this.visit(item, blockScope, init));

        this.copyGlobals(blockScope, scope);
    }

    copyGlobals(block, scope) {
        for (let key of Object.keys(block)) {
            if (!block[key]) scope[key] = (scope[key] || false);
        }
    }

    Identifier(node, scope, init) {
        if (init === 'var') {
            scope[BODY][node.name] = true;
        } else if (init === '=') {
            scope[node.name] === undefined && (scope[GLOBAL][node.name] = init || false);
        } else {
            scope[node.name] = scope[node.name] || init || false;
        }
    }

    ExpressionStatement(node, scope) {
        this.visit(node.expression, scope);
    }

    BinaryExpression(node, scope) {
        this.visit(node.left, scope);
        this.visit(node.right, scope);
    }

    AssignmentExpression(node, scope) {
        this.visit(node.left, scope, '=');
        this.visit(node.right, scope);
    }

    FunctionExpression(node, scope) {

        const functionScope = Object.create(scope);
        functionScope[BODY] = functionScope;

        node.id && this.visit(node.id, scope[BODY], true);

        for (const param of node.params) {
            this.visit(param, functionScope, true);
        }

        this.visit(node.body, functionScope);

        this.copyGlobals(functionScope, scope);
    }

    VariableDeclaration(node, scope) {
        node.declarations.forEach(item => this.visit(item, scope, node.kind));
    }

    VariableDeclarator(node, scope, kind) {
        this.visit(node.id, scope, kind);
        node.init && this.visit(node.init, scope);
    }

    ReturnStatement(node, scope) {
        this.visit(node.argument, scope);
    }

    ArrayExpression(node, scope, init) {
        node.elements.forEach(e => e && this.visit(e, scope, init));
    }

    ObjectExpression(node, scope) {
        node.properties.forEach(p => this.visit(p, scope, true));
    }

    Property(node, scope, init) {
        this.visit(node.key, scope, init);
        this.visit(node.value, scope);
    }

    MemberExpression(node, scope) {
        this.visit(node.object, scope);
        node.computed && this.visit(node.property, scope);
    }

    ConditionalExpression(node, scope) {
        this.visit(node.test, scope);
        node.consequent && this.visit(node.consequent, scope);
        node.alternate && this.visit(node.alternate, scope);
    }

    CallExpression(node, scope) {
        this.visit(node.callee, scope);
        node.arguments.forEach(a => this.visit(a, scope));
    }

    ForStatement(node, scope) {
        const forScope = Object.create(scope);
        node.init && this.visit(node.init, forScope);
        node.test && this.visit(node.test, forScope);
        node.update && this.visit(node.update, forScope);
        node.body && this.visit(node.body, forScope);
        this.copyGlobals(forScope, scope);
    }

    ForInStatement(node, scope) {
        const forScope = Object.create(scope);
        this.visit(node.left, forScope, true);
        this.visit(node.right, forScope);
        node.body && this.visit(node.body, forScope);
        this.copyGlobals(forScope, scope);
    }

    UpdateExpression(node, scope) {
        this.visit(node.argument, scope);
    }

    ClassExpression(node, scope) {
        this.visit(node.id, scope, true);
        node.superClass && this.visit(node.superClass, scope);
        this.visit(node.body, scope, true);
    }

    WhileStatement(node, scope) {
        this.visit(node.test, scope);
        this.visit(node.body, scope);
    }

    UnaryExpression(node, scope) {
        this.visit(node.argument, scope);
    }

    LabeledStatement(node, scope) {
        this.visit(node.label, scope, 'var');
        this.visit(node.body, scope);
    }

    SwitchStatement(node, scope) {
        this.visit(node.discriminant, scope);
        node.cases.forEach(c => c && this.visit(c, scope));
    }

    SwitchCase(node, scope) {
        node.test && this.visit(node.test, scope);
        node.consequent.forEach(c => c && this.visit(c, scope));
    }

    BreakStatement(node, scope) {
        node.label && this.visit(node.label, scope);
    }

    TryStatement(node, scope) {
        this.visit(node.block, scope);
        node.handler && this.visit(node.handler, scope);
        node.finalizer && this.visit(node.finalizer, scope);
    }

    CatchClause(node, scope) {
        this.visit(node.param, scope, true);
        this.visit(node.body, scope);
    }

    SequenceExpression(node, scope) {
        node.expressions.forEach(e => this.visit(e, scope));
    }
}

Parser.prototype.ArrayPattern = Parser.prototype.ArrayExpression;
Parser.prototype.AssignmentPattern = Parser.prototype.AssignmentExpression;
Parser.prototype.ClassBody = Parser.prototype.BlockStatement;
Parser.prototype.ClassDeclaration = Parser.prototype.ClassExpression;
Parser.prototype.DoWhileStatement = Parser.prototype.WhileStatement;
Parser.prototype.ForOfStatement = Parser.prototype.ForInStatement;
Parser.prototype.IfStatement = Parser.prototype.ConditionalExpression;
Parser.prototype.LogicalExpression = Parser.prototype.BinaryExpression;
Parser.prototype.MethodDefinition = Parser.prototype.Property;
Parser.prototype.NewExpression = Parser.prototype.CallExpression;
Parser.prototype.ObjectPattern = Parser.prototype.ObjectExpression;

Parser.prototype.ArrowFunctionExpression = Parser.prototype.FunctionExpression;
Parser.prototype.FunctionDeclaration = Parser.prototype.FunctionExpression;
Parser.prototype.AwaitExpression = Parser.prototype.UnaryExpression;
Parser.prototype.ThrowStatement = Parser.prototype.UnaryExpression;
Parser.prototype.YieldExpression = Parser.prototype.UnaryExpression;
Parser.prototype.ContinueStatement = Parser.prototype.EmptyStatement;
Parser.prototype.DebuggerStatement = Parser.prototype.EmptyStatement;
Parser.prototype.Literal = Parser.prototype.EmptyStatement;
Parser.prototype.Super = Parser.prototype.EmptyStatement;
Parser.prototype.ThisExpression = Parser.prototype.EmptyStatement;

export const parser = new Parser();

export function parseExpression(expression) {
    const parsed = parser.parse(expression);
    return {
        ast: parsed.ast,
        globals: parsed.globals
    }
}

export function parseAsyncExpression(expression) {
    return parseExpression("async function wrapper() {" + expression + "; }");
}

