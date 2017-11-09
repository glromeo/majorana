import {assert, expect} from "chai";
import {Compiler} from "../lib/compiler.js";

describe("Compiler Tests", function () {

    it("simple", function () {
        const compiler = new Compiler();
        const out = compiler.compile("abc = 1 + true - $id && ccc(02 / (2e7))");
        assert.deepEqual(out, 'abc=1+true-$id&&ccc(02(2e7))');
    });
});