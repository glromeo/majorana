const Benchmark = require('benchmark');

let s = "";

function t(n) {
    s = this.toString() + n;
}

let o = { m(n) { s = this.toString() + n; } };

let b = t.bind(o);

new Benchmark.Suite()

    .add('Method', function () {
        for (let n=0; n<1000; n++) try {
            o.m(n++);
        } catch(e) {
            throw e;
        }
    })

    .add('Method Inline', function () {
        for (let n=0; n<1000; n++) try {
            ({ m(n) { s = this.toString() + n; } }).m(n++);
        } catch(e) {
            throw e;
        }
    })

    .add('Call', function () {
        for (let n=0; n<1000; n++) try {
            t.call(o, n++);
        } catch(e) {
            throw e;
        }
    })

    .add('Call Inline', function () {
        for (let n=0; n<1000; n++) try {
            (function t(n) {
                s = this.toString() + n;
            }).call(o, n++);
        } catch(e) {
            throw e;
        }
    })

    .add('Bind', function () {
        for (let n=0; n<1000; n++) try {
            b(n++);
        } catch(e) {
            throw e;
        }
    })

    .add('Bind Inline', function () {
        for (let n=0; n<1000; n++) try {
            (t.bind(o))(n++);
        } catch(e) {
            throw e;
        }
    })

    .on('cycle', function (event) {
        console.log(String(event.target))
    })
    .on('complete', function () {
        const faster = this.filter('fastest')[0];
        const slower = this.filter('slowest')[0];
        console.log('--------------------------------------------------');
        console.log(`${faster.name} by ${Math.round(100 * faster.hz / slower.hz) - 100}%`)
    })
    .run({'async': true});
