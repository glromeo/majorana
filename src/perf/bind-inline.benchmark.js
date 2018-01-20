const Benchmark = require('benchmark');
const {assert} = require('chai');

let x = 0;

let sum = function (a, b) {
    return a + b;
};

function f(a) {
    return function (b) {
        return sum(a, b);
    }
}

new Benchmark.Suite()

    .add('Closure', function () {
        for (let n=0; n<100; n++) {
            let g = f(n);
            x = g(-n);
        }
        assert.equal(x, 0);
    })

    .add('Bind', function () {
        for (let n=0; n<100; n++) {
            let f = sum.bind(undefined, n);
            x = f(-n);
        }
        assert.equal(x, 0);
    })

    .add('Lambda', function () {
        for (let n=0; n<100; n++) {
            let f = function (b) {
                return sum(n, b);
            };
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
