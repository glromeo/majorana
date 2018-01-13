import {describe, it, beforeEach} from "mocha";
import {assert, expect} from "chai";
import {Interpreter} from "../main/interpreter.js";

describe("Interpreter Tests", function () {

    let context, self;

    beforeEach(function () {
        context = {};
        self = {};
    });

    it("x = 1", async function () {
        assert.equal(await new Interpreter(this.test.title).eval(context, self), 1);
        assert.equal(context.x, 1);
    });

});