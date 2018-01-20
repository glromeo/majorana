import Benchmark from "benchmark";
import {Expression} from "../main/expression.js";

const html = `<!doctype html>
<html ng-app="test-app">
<head>
    <meta charset="utf-8">
    <title>JSDOM Html Page Title</title>
</head>
<body></body>
</html>`;


const jsdom = require("jsdom");
const dom = new jsdom.JSDOM(html);
const window = dom.window;
const document = window.document;

window.console = global.console;

function hackConstructor(descriptor) {
    // const type = descriptor.value;
    // if (typeof type === 'function' && type.toString().indexOf('Illegal constructor') > 0) {
    //     descriptor.value = new Proxy(descriptor.value, {
    //         construct: function(target, argumentsList, newTarget) {
    //             return Object.create(target.prototype);
    //         }
    //     });
    // }
    return descriptor;
}

Object.getOwnPropertyNames(window)
    .filter(property => !global.hasOwnProperty(property))
    .forEach(property => {
        const descriptor = hackConstructor(Object.getOwnPropertyDescriptor(window, property));
        Object.defineProperty(window, property, descriptor);
        Object.defineProperty(global, property, descriptor);
    });

Object.defineProperty(global, 'window', {
    value: new Proxy(window, {
        set(target, property, value) {
            target[property] = value;
            if (!global.hasOwnProperty(property)) {
                global[property] = value;
            }
            return true;
        },
        defineProperty(target, property, descriptor) {
            Object.defineProperty(target, property, descriptor);
            if (!global.hasOwnProperty(property)) {
                Object.defineProperty(global, property, descriptor);
            }
            return true;
        }
    })
});

global = new Proxy(global, {
    set(target, property, value) {
        target[property] = value;
        if (!window.hasOwnProperty(property)) {
            window[property] = value;
        }
        return true;
    },
    defineProperty(target, property, descriptor) {
        Object.defineProperty(target, property, descriptor);
        if (!window.hasOwnProperty(property)) {
            Object.defineProperty(window, property, descriptor);
        }
        return true;
    }
});

let angular = require("angular");

let testApp = angular.module("test-app", []).run(["$rootScope", "$parse", function ($rootScope, $parse) {

        const AsyncFunction = Object.getPrototypeOf(async () => {
        }).constructor;

        new Benchmark.Suite()

        // .add('Async/Await', {
        //     defer: true,
        //     fn: async function (deferred) {
        //         await new AsyncFunction("cc", `cc.w = {
        //         "v": 5
        //     },[
        //         cc.w.v,
        //         /* simple comment */
        //         0x10 + 10e10,
        //         6 * 6,
        //         (110-10)/await this.x,
        //         this.yyy().xxx,
        //         cc.zzz().xxx,
        //         /* multi
        //            line
        //            comment */
        //         [await cc.x, await cc.y, await cc.z].concat(1, 2, 3),
        //         { "r": cc.rnd(), 10: cc.x, ["y"]: cc.y, 30: [cc.z] }['y'],
        //         cc.a.b.c.d.e.f(1,2,3,4,5)
        //         ]
        //     `).call({
        //             x: 10,
        //             yyy() {
        //                 return this;
        //             },
        //             xxx: 'xxx'
        //         }, {
        //             x: Promise.resolve(10), y: Promise.resolve(20), z: Promise.resolve(30),
        //             rnd() {
        //                 return Promise.resolve(Math.random());
        //             },
        //             zzz() {
        //                 return this;
        //             },
        //             a: {
        //                 b: {
        //                     c: {
        //                         d: {
        //                             e: {
        //                                 f() {
        //                                     return Array.from(arguments);
        //                                 }
        //                             }
        //                         }
        //                     }
        //                 }
        //             }
        //         });
        //         deferred.resolve();
        //     }
        // })
        //
            .add('AngularJS', {
                defer: true,
                fn: function (deferred) {
                    // language=ECMAScript 6
                    let getter = $parse(`
                    [
                        {
                            "v": ${Math.random()}
                        }.v,
                        16 + 10e10,
                        6 * 6,
                        (110-10)/this.x,
                        this.yyy().xxx,
                        zzz().xxx,
                        [x, y, z].concat(1, 2, 3),
                        { "r": rnd(), 10: x, ["y"]: y, 30: [z] }['y'],
                        a.b.c.d.e.f(1,2,3,4,5)
                    ]
                `)({
                        x: 10, y: 20, z: 30,
                        rnd() {
                            return Math.random();
                        },
                        zzz() {
                            return this;
                        },
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
                    }, {
                        x: 10,
                        yyy() {
                            return this;
                        },
                        xxx: 'xxx'
                    });
                    process.nextTick(() => deferred.resolve());
                }
            })

            .add('Lexer & Parser & Interpreter (fair)', {
                defer: true,
                fn: function (deferred) {
                    new Expression(`[
                        {
                            "v": ${Math.random()}
                        }.v,
                        16 + 10e10,
                        6 * 6,
                        (110-10)/this.x,
                        this.yyy().xxx,
                        zzz().xxx,
                        [x, y, z].concat(1, 2, 3),
                        { "r": rnd(), 10: x, ["y"]: y, 30: [z] }['y'],
                        a.b.c.d.e.f(1,2,3,4,5)
                    ]`).invoke({
                        x: 10,
                        yyy() {
                            return this;
                        },
                        xxx: 'xxx'
                    }, {
                        x: 10, y: 20, z: 30,
                        rnd() {
                            return Math.random();
                        },
                        zzz() {
                            return this;
                        },
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
                    }).then(() => deferred.resolve())
                }
            })

            .add('Lexer & Parser & Interpreter', {
                defer: true,
                fn: async function (deferred) {
                    await new Expression(`w = {
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
                ]
            `).invoke({
                        x: 10,
                        yyy() {
                            return this;
                        },
                        xxx: 'xxx'
                    }, {
                        x: Promise.resolve(10), y: Promise.resolve(20), z: Promise.resolve(30),
                        rnd() {
                            return Promise.resolve(Math.random());
                        },
                        zzz() {
                            return this;
                        },
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
                    });
                    deferred.resolve();
                }
            })

            .on('cycle', function (event) {
                console.log(String(event.target))
            })

            .on('complete', function () {
                const faster = this.filter('fastest')[0];
                const slower = this.filter('slowest')[0];
                console.log('--------------------------------------------------');
                console.log(`${faster.name} by ${Math.round(100 * faster.hz / slower.hz) - 100}%`);
            })

            .run({'async': true});
    }])
;

