// const Aigle = require("aigle");
const Bluebird = require("bluebird");
const Benchmark = require('benchmark');

let twenty = 20, two = 2;

function finalizer(done, value) {
    return this.then(done.bind(value));
}

function join(left, right, done) {
    return left.then(finalizer.bind(right, done))
}

function sum(x, y, z) {
    return x + y + z;
}

function x(v, i) {
    if (--this.pending) {
        this[i] = v;
    } else {
        this[i] = v;
        this.resolve(this[0] + this[1] + this[2]);
    }
}

function resolvePromiseNextTick(v) {
    return new Promise(r => {
        process.nextTick(() => r(v));
    });
}

// Unwrappd x 634,703 ops/sec ±0.55% (81 runs sampled)
// Diamonds x 648,699 ops/sec ±0.64% (81 runs sampled)
// --------------------------------------------------
// Diamonds by 2%
// .add('Bind', {
//     defer: true,
//     fn: function (deferred) {
//         new Promise(function (resolve) {
//             let o = new Array(3);
//             o.resolve = resolve;
//             o.pending = 3;
//             resolvePromiseNextTick(1).then(x.bind(o, 0));
//             resolvePromiseNextTick(2).then(x.bind(o, 1));
//             resolvePromiseNextTick(3).then(x.bind(o, 2));
//         }).then(sum => {
//             setTimeout()(() => deferred.resolve());
//         });
//     }
// })
// .add('Diamonds', {
//     defer: true,
//     fn: function (deferred) {
//         resolvePromiseNextTick(1).then(x => {
//             resolvePromiseNextTick(2).then(y => {
//                 resolvePromiseNextTick(3).then(z => {
//                     return sum(x, y, z);
//                 }).then(() => {
//                     setTimeout()(() => deferred.resolve());
//                 });
//             });
//         });
//     }
// })

function adder(i, v) {
    this[i] = v;
    if (--this.count === 0) {
        this.resolve(this[0] + this[1] + this[2]);
    }
}


const c = {
    a: resolvePromiseNextTick(20),
    b: resolvePromiseNextTick(20),
    c: resolvePromiseNextTick(2)
};

new Benchmark.Suite()

    .add('Promise', {
        defer: true,
        fn: function (deferred) {
            resolvePromiseNextTick(20).then(x => {
                resolvePromiseNextTick(20).then(y => {
                    resolvePromiseNextTick(2).then(z => {
                        return sum(x, y, z);
                    }).then(() => {
                        deferred.resolve();
                    });
                });
            });
        }
    })

    .add('Promise (2)', {
        defer: true,
        fn: function (deferred) {
            let x, y, z, count = 3;

            function release() {
                if (--count === 0) {
                    sum(x, y, z);
                    deferred.resolve();
                }
            }

            resolvePromiseNextTick(20).then(v => {
                x = v;
                release();
            });
            resolvePromiseNextTick(20).then(v => {
                y = v;
                release();
            });
            resolvePromiseNextTick(20).then(v => {
                z = v;
                release();
            });
        }
    })

    .add('Promise (3)', {
        defer: true,
        fn: function (deferred) {
            deferred.count = 3;
            resolvePromiseNextTick(20).then(adder.bind(deferred, 0));
            resolvePromiseNextTick(20).then(adder.bind(deferred, 1));
            resolvePromiseNextTick(20).then(adder.bind(deferred, 2));
        }
    })

    .add('Async/Await', {
        defer: true,
        fn: async function (deferred) {
            let x = await resolvePromiseNextTick(20);
            let y = await resolvePromiseNextTick(20);
            let z = await resolvePromiseNextTick(2);
            await resolvePromiseNextTick(sum(x, y, z));
            deferred.resolve();
        }
    })

    .add('Async/Await (no promise)', {
        defer: true,
        fn: async function (deferred) {
            let x = await twenty;
            let y = await twenty;
            let z = await two;
            await sum(x, y, z);
            deferred.resolve();
        }
    })

    .add('Async/Await (no promise at all)', {
        defer: true,
        fn: async function (deferred) {
            let x = twenty instanceof Promise ? await twenty : twenty;
            let y = twenty instanceof Promise ? await twenty : twenty;
            let z = two instanceof Promise ? await two : two;
            let s = sum(x, y, z);
            if (s instanceof Promise) {
                s = await s;
            }
            process.nextTick(function () {
                deferred.resolve();
            })
        }
    })

    .add('Async/Await (no promise at all sync)', {
        defer: false,
        fn: async function () {
            let x = twenty instanceof Promise ? await twenty : twenty;
            let y = twenty instanceof Promise ? await twenty : twenty;
            let z = two instanceof Promise ? await two : two;
            let s = sum(x, y, z);
            if (s instanceof Promise) {
                s = await s;
            }
        }
    })

    // Coroutine x 6,536 ops/sec ±2.10% (75 runs sampled)
    //
    // .add('Coroutine', {
    //     defer: true,
    //     fn: async function (deferred) {
    //         let cs = Bluebird.coroutine(function* (x, y, z) {
    //             yield resolvePromiseNextTick(x);
    //             yield resolvePromiseNextTick(y);
    //             yield resolvePromiseNextTick(z);
    //             return sum(x, y, z);
    //         });
    //         cs(10, 30, 2).then(() => {
    //                         process.nextTick(()=>deferred.resolve());

    //         });
    //     }
    // })

    .add('Bluebird', {
        defer: true,
        fn: function (deferred) {
            new Bluebird(r => process.nextTick(() => r = 20)).then(x => {
                new Bluebird(r => process.nextTick(() => r = 20)).then(y => {
                    new Bluebird(r => process.nextTick(() => r = 2)).then(z => {
                        return sum(x, y, z);
                    }).then(() => {
                        deferred.resolve();
                    });
                });
            });
        }
    })


    .add('Bluebird (Join)', {
        defer: true,
        fn: function (deferred) {
            Bluebird.join(
                new Bluebird(r => process.nextTick(() => r = 20)),
                new Bluebird(r => process.nextTick(() => r = 20)),
                new Bluebird(r => process.nextTick(() => r = 2)))
                .then(sum)
                .then(() => {
                    deferred.resolve();
                });
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
