// const Aigle = require("aigle");
const Bluebird = require("bluebird");
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

let c = 0;

class Clazz {
    constructor(n1, n3, n5, n7, n9, n11, n13, n15, n17, n19) {
        this.p0 = n1;
        this.p2 = n3;
        this.p4 = n5;
        this.p6 = n7;
        this.p8 = n9;
        this.p10 = n11;
        this.p12 = n13;
        this.p14 = n15;
        this.p16 = n17;
        this.p18 = n19;
    }
}

function F(n1, n3, n5, n7, n9, n11, n13, n15, n17, n19) {
    this.p0 = n1;
    this.p2 = n3;
    this.p4 = n5;
    this.p6 = n7;
    this.p8 = n9;
    this.p10 = n11;
    this.p12 = n13;
    this.p14 = n15;
    this.p16 = n17;
    this.p18 = n19;
}

let F0 = function () {

};

suite

    .add('{}', function () {
        for (let i = 0; i < 1000; i++) {
            let obj = {
                p0: i + 1,
                p2: i + 3,
                p4: i + 5,
                p6: i + 7,
                p8: i + 9,
                p10: i + 11,
                p12: i + 13,
                p14: i + 15,
                p16: i + 17,
                p18: i + 19,
            };

            obj.p0 = obj.p18;
            obj.p18 = obj.p8 + obj.p9;
        }
    })

    .add('create', function () {
        for (let i = 0; i < 1000; i++) {
            let obj = Object.create(F0);

            obj.p0 = i + 1;
            obj.p2 = i + 3;
            obj.p4 = i + 5;
            obj.p6 = i + 7;
            obj.p8 = i + 9;
            obj.p10 = i + 11;
            obj.p12 = i + 13;
            obj.p14 = i + 15;
            obj.p16 = i + 17;
            obj.p18 = i + 1;

            obj.p0 = obj.p18;
            obj.p18 = obj.p8 + obj.p9;
        }
    })

    .add('Function', function () {
        for (let i = 0; i < 1000; i++) {
            let obj = new F(
                i + 1,
                i + 3,
                i + 5,
                i + 7,
                i + 9,
                i + 11,
                i + 13,
                i + 15,
                i + 17,
                i + 19,
            );
            obj.p0 = obj.p18;
            obj.p18 = obj.p8 + obj.p9;
        }
    })

    .add('Class', function () {
        for (let i = 0; i < 1000; i++) {
            let obj = new F(
                i + 1,
                i + 3,
                i + 5,
                i + 7,
                i + 9,
                i + 11,
                i + 13,
                i + 15,
                i + 17,
                i + 19,
            );
            obj.p0 = obj.p18;
            obj.p18 = obj.p8 + obj.p9;
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
