const Benchmark = require('benchmark');
const {assert} = require('chai');

const suite = new Benchmark.Suite()

let x = 0;

let bf = function (b) {
    return this + b;
};

suite

    .add('Closure', function () {
        for (let n=0; n<100; n++) {
            function f(a) {
                f = function (b) {
                    return a + b;
                }
            }
            f(n);
            x = f(-n);
        }
        assert.equal(x, 0);
    })

    .add('Bind', function () {
        for (let n=0; n<100; n++) {
            let f = bf.bind(n);
            x = f(-n);
        }
        assert.equal(x, 0);
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
    .run({'async': true})
