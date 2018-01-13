// const Aigle = require("aigle");
const Bluebird = require("bluebird");
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite()

let c = 0;

suite

    // .add('Barebone', {
    //     defer: false,
    //     fn: function (deferred) {
    //         let a = Math.random();
    //         let b = Math.random();
    //         c = ((a, b) => a + b)(a, b);
    //     }
    // })

    .add('Baseline', {
        defer: true,
        fn: function (deferred) {
            let a = Math.random();
            let b = Math.random();
            c = ((a, b) => a + b)(a, b);
            deferred.resolve();
        }
    })

    // .add('Promise', {
    //     defer: true,
    //     fn: function (deferred) {
    //         let a = Math.random();
    //         let b = Math.random();
    //         Promise.all([a, b]).then(([a, b]) => {
    //             c = a + b;
    //             deferred.resolve();
    //         });
    //     }
    // })

    .add('Bluebird', {
        defer: true,
        fn: function (deferred) {
            let a = Math.random();
            let b = Math.random();
            Bluebird.all([a, b]).then(([a, b]) => {
                c = a + b;
                deferred.resolve();
            });
        }
    })

    .add('Bluebird (Join)', {
        defer: true,
        fn: function (deferred) {
            let a = Math.random();
            let b = Math.random();
            Bluebird.join(a, b, (a, b) => {
                c = a + b;
                deferred.resolve();
            });
        }
    })
    //
    // .add('Aigle', {
    //     defer: true,
    //     fn: function (deferred) {
    //         let a = Math.random();
    //         let b = Math.random();
    //         Aigle.resolve([a, b]).all().then(([a, b]) => {
    //             c = a + b;
    //             deferred.resolve();
    //         });
    //     }
    // })

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
