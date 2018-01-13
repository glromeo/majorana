import {describe, it} from "mocha";
import {assert} from "chai";
import {Parser} from "../main/parser.js";
import {Lexer} from "../main/lexer.js";
import {AST} from "../main/ast.js";
import {Operators} from "../main/operators";

describe("Parser Tests", function () {

    beforeEach(function () {
        this.ast = new Parser().parse(this.currentTest.title);
    });

    // Assignment

    it("x = 1", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.AssignmentExpression);
        assert.instanceOf(expression.left, AST.Identifier);
        assert.instanceOf(expression.right, AST.Constant);
        assert.equal(expression.right.type, Number);
    });

    it("this[x] = '1'", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.AssignmentExpression);
        assert.instanceOf(expression.left, AST.MemberExpression);
        assert.equal(expression.left.object, AST.Literals.this);
        assert.instanceOf(expression.left.member, AST.Identifier);
        assert.equal(expression.left.member.name, 'x');
        assert.strictEqual(expression.left.member.name, expression.left.member.symbol());
        assert.instanceOf(expression.right, AST.Constant);
        assert.equal(expression.right.type, String);
    });

    // Comma

    it("x, null, true", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.CommaExpression);
        assert.instanceOf(expression.expressions[0], AST.Identifier);
        assert.strictEqual(expression.expressions[1], AST.Literals.null);
        assert.strictEqual(expression.expressions[2], AST.Literals.true);
    });

    // Unary & Ternary

    it("!x === true ? null : x + x", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.TernaryExpression);
        assert.instanceOf(expression.test, AST.EqualityExpression);
        assert.instanceOf(expression.test.left, AST.UnaryExpression);
        assert.strictEqual(expression.consequent, AST.Literals.null);
        assert.instanceOf(expression.alternate, AST.AdditiveExpression);
    });

    // Logical

    it("x && (y || z) || true", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.LogicalExpression);
        assert.instanceOf(expression.left, AST.LogicalExpression);
        assert.strictEqual(expression.right, AST.Literals.true);
        assert.instanceOf(expression.left.left, AST.Identifier);
        assert.instanceOf(expression.left.right, AST.LogicalExpression);
        assert.instanceOf(expression.left.right.left, AST.Identifier);
        assert.strictEqual(expression.left.right.left.setter, AST.Identifier.prototype.setter);
        assert.instanceOf(expression.left.right.right, AST.Identifier);
        assert.strictEqual(expression.left.right.right.setter, AST.Identifier.prototype.setter);
    });

    // Equality

    it("x == 1, y == true", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.CommaExpression);
        assert.instanceOf(expression.expressions[0], AST.EqualityExpression);
        assert.instanceOf(expression.expressions[1], AST.EqualityExpression);
    });

    // Relational

    it("x <= 1 && (y > 1)", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.LogicalExpression);
        assert.instanceOf(expression.left, AST.RelationalExpression);
        assert.strictEqual(expression.left.operator, Operators.Relational['<=']);
        assert.instanceOf(expression.right, AST.RelationalExpression);
        assert.strictEqual(expression.right.operator, Operators.Relational['>']);
    });

    // Additive & Multiplicative (these cover primary's parenthesis as well)

    it("1 + 2 * 3", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.AdditiveExpression);
        assert.instanceOf(expression.right, AST.MultiplicativeExpression);
        assert.equal(await expression.right.left.eval(), 2);
    });

    it("1 * ( 2 + 3 )", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.MultiplicativeExpression);
        assert.instanceOf(expression.right, AST.AdditiveExpression);
        assert.equal(await expression.right.left.eval(), 2);
    });

    it("1 * 2 + 3", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.AdditiveExpression);
        assert.instanceOf(expression.left, AST.MultiplicativeExpression);
        assert.equal(await expression.right.eval(), 3);
        assert.equal(await expression.left.left.eval(), 1);
    });

    // Primary

    it("x[0]", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.MemberExpression);
        assert.instanceOf(expression.member, AST.Constant);
    });

    it("['x', y][y = 2]", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.MemberExpression);
        assert.instanceOf(expression.member, AST.AssignmentExpression);
        assert.instanceOf(expression.object, AST.ArrayExpression);
        assert.instanceOf(expression.object.elements[0], AST.Constant);
        assert.strictEqual(expression.object.elements[0].type, String);
        assert.instanceOf(expression.object.elements[1], AST.Identifier);
    });

    it("{alpha: 0}[y = 2]", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.MemberExpression);
        assert.instanceOf(expression.member, AST.AssignmentExpression);
        assert.instanceOf(expression.object, AST.ObjectExpression);
        assert.instanceOf(expression.object.properties[0].key, AST.Identifier);
        assert.instanceOf(expression.object.properties[0].value, AST.Constant);
    });

    it("{alpha: 0, [y = 'y']: {}}", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.ObjectExpression);
        assert.instanceOf(expression.properties[1].key, AST.AssignmentExpression);
        assert.instanceOf(expression.properties[1].value, AST.ObjectExpression);
    });

    // Call

    it("x(y)", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.CallExpression);
        assert.instanceOf(expression.callee, AST.Identifier);
        assert.instanceOf(expression.parameters[0], AST.Identifier);
    });

    it("(x = y)(1, c('2'))", async function () {
        const {expression} = this.ast;
        assert.instanceOf(expression, AST.CallExpression);
        assert.instanceOf(expression.callee, AST.AssignmentExpression);
        assert.instanceOf(expression.parameters[0], AST.Constant);
        assert.instanceOf(expression.parameters[1], AST.CallExpression);
        assert.instanceOf(expression.parameters[1].parameters[0], AST.Constant);
    });

});