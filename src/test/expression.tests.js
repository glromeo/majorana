import {describe, it, beforeEach} from "mocha";
import {assert, expect} from "chai";
import {Expression} from "../main/expression.js";

describe("Expression Tests", function () {

    let context, self;

    beforeEach(function () {
        context = {};
        self = {};
    });

    it("x = 1", async function () {
        assert.equal(await new Expression(this.test.title).invoke(self, context), 1);
        assert.equal(context.x, 1);
        assert.equal(self.x, undefined);
    });

    it("this.x = y", async function () {
        context.y = "Hello world";
        assert.equal(await new Expression(this.test.title).invoke(self, context), "Hello world");
        assert.equal(context.x, undefined);
        assert.equal(self.x, "Hello world");
    });

});