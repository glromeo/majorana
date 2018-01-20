import {describe, it} from "mocha";
import {assert} from "chai";
import {Parser} from "../main/parser";
import {AST} from "../main/ast";
import {Operators} from "../main/operators";

describe("Parser Tests", function () {

    beforeEach(function () {
        this.ast = new Parser().parse(this.currentTest.title);
    });

    // Assignment

    it("x = 1", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.AssignmentExpression);
        assert.equal(expression.left.type, AST.Identifier);
        assert.equal(expression.right.type, AST.Number);
    });

    it("this[x] = '1'", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.AssignmentExpression);
        assert.equal(expression.left.type, AST.MemberExpression);
        assert.equal(expression.left.object, AST.Literals.this);
        assert.equal(expression.left.member.type, AST.Identifier);
        assert.equal(expression.left.member.name, 'x');
        assert.equal(expression.right.type, AST.String);
    });

    // Comma

    it("x, null, true", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.CommaExpression);
        assert.equal(expression.list[0].type, AST.Identifier);
        assert.strictEqual(expression.list[1], AST.Literals.null);
        assert.strictEqual(expression.list[2], AST.Literals.true);
    });

    // Unary & Ternary

    it("!x === true ? null : x + x", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.TernaryExpression);
        assert.equal(expression.test.type, AST.EqualityExpression);
        assert.equal(expression.test.left.type, AST.UnaryExpression);
        assert.strictEqual(expression.consequent, AST.Literals.null);
        assert.equal(expression.alternate.type, AST.AdditiveExpression);
    });

    // Logical

    it("x && (y || z) || true", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.LogicalExpression);
        assert.equal(expression.left.type, AST.LogicalExpression);
        assert.strictEqual(expression.right, AST.Literals.true);
        assert.equal(expression.left.left.type, AST.Identifier);
        assert.equal(expression.left.right.type, AST.LogicalExpression);
        assert.equal(expression.left.right.left.type, AST.Identifier);
        assert.equal(expression.left.right.right.type, AST.Identifier);
    });

    // Equality

    it("x == 1, y == true", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.CommaExpression);
        assert.equal(expression.list[0].type, AST.EqualityExpression);
        assert.equal(expression.list[1].type, AST.EqualityExpression);
    });

    // Relational

    it("x <= 1 && (y > 1)", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.LogicalExpression);
        assert.equal(expression.left.type, AST.RelationalExpression);
        assert.strictEqual(expression.left.operator, '<=');
        assert.equal(expression.right.type, AST.RelationalExpression);
        assert.strictEqual(expression.right.operator, '>');
    });

    // Additive & Multiplicative (these cover primary's parenthesis as well)

    it("1 + 2 * 3", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.AdditiveExpression);
        assert.equal(expression.right.type, AST.MultiplicativeExpression);
        assert.equal(expression.right.left.text, '2');
    });

    it("1 * ( 2 + 3 )", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.MultiplicativeExpression);
        assert.equal(expression.right.type, AST.AdditiveExpression);
        assert.equal(await expression.right.left.text, '2');
    });

    it("1 * 2 + 3", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.AdditiveExpression);
        assert.equal(expression.left.type, AST.MultiplicativeExpression);
        assert.equal(await expression.right.text, '3');
        assert.equal(await expression.left.left.text, '1');
    });

    // Primary

    it("x[0]", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.MemberExpression);
        assert.equal(expression.member.type, AST.Number);
    });

    it("['x', y][y = 2]", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.MemberExpression);
        assert.equal(expression.member.type, AST.AssignmentExpression);
        assert.equal(expression.object.type, AST.ArrayExpression);
        assert.equal(expression.object.elements[0].type, AST.String);
        assert.equal(expression.object.elements[1].type, AST.Identifier);
    });

    it("{alpha: 0}[y = 2]", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.MemberExpression);
        assert.equal(expression.member.type, AST.AssignmentExpression);
        assert.equal(expression.object.type, AST.ObjectExpression);
        assert.equal(expression.object.properties[0].key.type, AST.Identifier);
        assert.equal(expression.object.properties[0].value.type, AST.Number);
    });

    it("{alpha: 0, [y = 'y']: {}}", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.ObjectExpression);
        assert.equal(expression.properties[1].key.type, AST.AssignmentExpression);
        assert.equal(expression.properties[1].value.type, AST.ObjectExpression);
    });

    // Call

    it("x(y)", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.CallExpression);
        assert.equal(expression.callee.type, AST.Identifier);
        assert.equal(expression.parameters[0].type, AST.Identifier);
    });

    it("(x = y)(1, c('2'))", async function () {
        const {expression} = this.ast;
        assert.equal(expression.type, AST.CallExpression);
        assert.equal(expression.callee.type, AST.AssignmentExpression);
        assert.equal(expression.parameters[0].type, AST.Number);
        assert.equal(expression.parameters[1].type, AST.CallExpression);
        assert.equal(expression.parameters[1].parameters[0].type, AST.String);
    });

});