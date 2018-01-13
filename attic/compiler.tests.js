import {assert, expect} from "chai";
import {Compiler} from "../main/compiler.js";

describe("Compiler Tests", function () {

    describe("general behaviour of compiled expressions", function () {

        it("an expression is a function", function () {
            let expression = Compiler.compile("1");
            expect(expression).to.be.a('function');
        });

        it("it can be bound", function () {
            let expression = Compiler.compile("this");
            let expected = ["Hello world!"];
            let bound = expression.bind(expected);
            assert.isTrue(bound.name.startsWith("bound "));
            assert.strictEqual(bound(), expected);
            assert.deepEqual(bound(), ["Hello world!"]);
        });

        it("global variables in the expressions are parameters of the function", function () {
            let expression = Compiler.compile("1 + x");
            assert.equal(expression.length, 1);
            expression = Compiler.compile("x + y");
            assert.equal(expression.length, 2);
            expression = Compiler.compile("x + y").bind({});
            assert.equal(expression.length, 2);
        });

    });

    it("expression referencing this", function () {
        const e = Compiler.compile("this");
        expect(e).to.be.a('function');
        expect(e.parameters).to.be.a('set');
        assert.equal(e.parameters.size, 0);
        assert.equal(e.sourceURL, 'expression?id=0');
    });

    it("expression referencing unbound", function () {
        const e = Compiler.compile("unbound");
        expect(e.parameters).to.be.a('set');
        assert.equal(e.parameters.size, 1);
        assert.isTrue(e.parameters.has('unbound'));
        assert.equal(e.sourceURL, 'expression?id=1');
    });

    it("expression referencing this.alpha", function () {
        const watch = new Set();
        const e = Compiler.compile("this.alpha", "anything", watch);
        assert.equal(e.parameters.size, 0);
        let expected = [ 'this', 'this.alpha' ];
        for (const actual of watch) {
            assert.equal(actual, expected.shift())
        }
    });

    it("expression referencing this.alpha.beta.gamma and delta.epsilon", function () {
        const watch = new Set();
        const e = Compiler.compile("this.alpha.beta['gamma'] + delta.epsilon", "anything", watch);
        assert.equal(e.parameters.size, 1);
        let expected = [ 'this', 'this.alpha', 'this.alpha.beta', 'this.alpha.beta.gamma', 'delta', 'delta.epsilon' ];
        for (const actual of watch) {
            assert.equal(actual, expected.shift())
        }
    });

    it("expression referencing this.alpha.beta.gamma and this.alpha.epsilon", function () {
        const watch = new Set();
        const e = Compiler.compile("this.alpha[beta].gamma + this.alpha.epsilon", "anything", watch);
        assert.equal(e.parameters.size, 0);
        let expected = [ 'this', 'this.alpha', 'this.alpha.beta', 'this.alpha.beta.gamma', 'this.alpha.epsilon' ];
        for (const actual of watch) {
            assert.equal(actual, expected.shift())
        }
    });
});