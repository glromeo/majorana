import {describe, it, beforeEach} from "mocha";
import {assert, expect} from "chai";
import {Expression} from "../main/expression.js";

describe("Expression Tests", function () {

    let context, self;

    beforeEach(function () {
        context = {"$id": "context"};
        self = {"$id": "self"};
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

    it("benchmark expression", async function () {
        assert.deepEqual(await new Expression(`w = {
                "v": 5
            },[
                w.v,
                /* simple comment */  
                0x10 + 10e10, 
                6 * 6,
                (110-10)/this.x,
                this.yyy().xxx,
                zzz().xxx,
                /* multi 
                   line
                   comment */ 
                [x, y, z].concat(1, 2, 3), 
                { "r": rnd(), x, ["y"]: y, 30: [z] }['y'],
                a.b.c.d.e.f(1,2,3,4,5)
                ]`).invoke({x: 10, yyy() { return this; }, xxx: 'xxx' }, {
            x: Promise.resolve(10), y: Promise.resolve(20), z: Promise.resolve(30),
            rnd() {
                return Promise.resolve(Math.random());
            },
            zzz() { return this; },
            a: {
                b: {
                    c: {
                        d: {
                            e: {
                                f() {
                                    return Array.from(arguments);
                                }
                            }
                        }
                    }
                }
            }
        }), [5, 100000000016, 36, 100/10, 'xxx', 'xxx', [10, 20, 30, 1, 2, 3], 20, [1, 2, 3, 4, 5]]);
    });
});