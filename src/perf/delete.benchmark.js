const Benchmark = require('benchmark');

const suite = new Benchmark.Suite()

let o = {
    p: new Date()
};

function restore() {
    o.p = new Date();
}

suite

    .add('delete', function () {
        delete o.p;
        o.p || restore();
    })

    .add('set null', function () {
        o.p = null;
        o.p || restore();
    })

    .add('set undefined', function () {
        o.p = undefined;
        o.p || restore();
    })

    .add('set false', function () {
        o.p = false;
        o.p || restore();
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
