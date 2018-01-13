// const Aigle = require("aigle");
const Bluebird = require("bluebird");
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite()

let c = 0, twenty = 20, two = 2;

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

suite

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
//             Promise.resolve(1).then(x.bind(o, 0));
//             Promise.resolve(2).then(x.bind(o, 1));
//             Promise.resolve(3).then(x.bind(o, 2));
//         }).then(sum => {
//             setTimeout()(() => deferred.resolve());
//         });
//     }
// })
// .add('Diamonds', {
//     defer: true,
//     fn: function (deferred) {
//         Promise.resolve(1).then(x => {
//             Promise.resolve(2).then(y => {
//                 Promise.resolve(3).then(z => {
//                     return sum(x, y, z);
//                 }).then(() => {
//                     setTimeout()(() => deferred.resolve());
//                 });
//             });
//         });
//     }
// })

// .add('Baseline', {
//     defer: true,
//     fn: function (deferred) {
//         let a = Math.random();
//         let b = Math.random();
//         c = ((a, b) => a + b)(a, b);
//         deferred.resolve();
//     }
// })

    .add('Promise', {
        defer: true,
        fn: function (deferred) {
            Promise.resolve(20).then(x => {
                Promise.resolve(20).then(y => {
                    Promise.resolve(2).then(z => {
                        return sum(x, y, z);
                    }).then(() => {
                        setTimeout(() => deferred.resolve());
                        // deferred.resolve();
                    });
                });
            });
        }
    })

    .add('Async/Await', {
        defer: true,
        fn: async function (deferred) {
            let x = await Promise.resolve(20);
            let y = await Promise.resolve(20);
            let z = await Promise.resolve(2);
            await Promise.resolve(sum(x, y, z));
            setTimeout(() => deferred.resolve());
            // deferred.resolve();
        }
    })

    .add('Async/Await (no promise)', {
        defer: true,
        fn: async function (deferred) {
            let x = await twenty;
            let y = await twenty;
            let z = await two;
            await Promise.resolve(sum(x, y, z));
            setTimeout(() => deferred.resolve());
            // deferred.resolve();
        }
    })

    // Coroutine x 6,536 ops/sec ±2.10% (75 runs sampled)
    //
    // .add('Coroutine', {
    //     defer: true,
    //     fn: async function (deferred) {
    //         let cs = Bluebird.coroutine(function* (x, y, z) {
    //             yield Promise.resolve(x);
    //             yield Promise.resolve(y);
    //             yield Promise.resolve(z);
    //             return sum(x, y, z);
    //         });
    //         cs(10, 30, 2).then(() => {
    //             deferred.resolve();
    //         });
    //     }
    // })

    .add('Bluebird', {
        defer: true,
        fn: function (deferred) {
            Bluebird.resolve(20).then(x => {
                Bluebird.resolve(20).then(y => {
                    Bluebird.resolve(2).then(z => {
                        return sum(x, y, z);
                    }).then(() => {
                        setTimeout(() => deferred.resolve());
                        // deferred.resolve();
                    });
                });
            });
        }
    })

    .add('Bluebird (Join)', {
        defer: true,
        fn: function (deferred) {
            Bluebird.join(Bluebird.resolve(20), Bluebird.resolve(20), Bluebird.resolve(2))
                .then(sum)
                .then(() => {
                    setTimeout(() => deferred.resolve());
                    // deferred.resolve();
                });
        }
    })

    .on('cycle', function (event) {
        console.log(String(event.target))
    })

    .on('complete', function () {
        const faster = this.filter('fastest')[0]
        const slower = this.filter('slowest')[0]
        console.log('--------------------------------------------------')
        console.log(`${faster.name} by ${Math.round(100 * faster.hz / slower.hz) - 100}%`)
    })

    .run({'async': true});
