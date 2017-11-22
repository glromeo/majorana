import {assert, expect} from "chai";
import {Compiler} from "../lib/compiler.js";

describe("Compiler Tests", function () {

    it("simple", function () {
        const compiler = new Compiler();
        const out = compiler.compile("abc = 1 + true - $id && ccc(02 / (2e7))");
        assert.deepEqual(out.toString(), "function anonymous(abc,$id,ccc\n" +
            "/*``*/) {\n" +
            "//# sourceURL=undefined\n" +
            "return abc=1+undefined-$id&&ccc(02/2e7)\n" +
            "}");
    });
});