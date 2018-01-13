const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

function ADD(l, r) {
    return function (ctx) {
        return l(ctx) + r(ctx);
    }
}

function MUL(l, r) {
    return function (ctx) {
        return l(ctx) * r(ctx);
    }
}

function NUM(txt) {
    return function (ctx) {
        return Number(txt);
    }
}

function CTX(txt) {
    return function (ctx) {
        return ctx[txt];
    }
}


function Add(l, r) {
    this.l = l;
    this.r = r;
    this.invoke = function (ctx) {
        return this.l.invoke(ctx) + this.r.invoke(ctx);
    }
}

function Mul(l, r) {
    this.l = l;
    this.r = r;
    this.invoke = function (ctx) {
        return this.l.invoke(ctx) * this.r.invoke(ctx);
    }
}

function Num(txt) {
    this.txt = txt;
    this.invoke = function (ctx) {
        return Number(this.txt);
    }
}

function Ctx(txt) {
    this.txt = txt;
    this.invoke = function (ctx) {
        return ctx[this.txt];
    }
}


class CAdd {
    constructor(l, r) {
        this.l = l;
        this.r = r;
    }

    eval(ctx) {
        return this.l.eval(ctx) + this.r.eval(ctx);
    }
}

class CMul {
    constructor(l, r) {
        this.l = l;
        this.r = r;
    }

    eval(ctx) {
        return this.l.eval(ctx) * this.r.eval(ctx);
    }
}

class CNum {
    constructor(txt) {
        this.txt = txt;
    }

    eval(ctx) {
        return Number(this.txt);
    }
}

class CCtx {
    constructor(txt) {
        this.txt = txt;
    }

    eval(ctx) {
        return ctx[this.txt];
    }
}


let r = 0;

suite

    .add('closure', function () {
        for (let i = 0; i < 10; i++) {
            let e = MUL(ADD(CTX('X'), NUM('10')), ADD(CTX('Y'), NUM('1000')));
            r = e({x: 1, y: e({x: r, y: i})});
        }
    })

    .add('function constructors', function () {
        try {
            for (let i = 0; i < 10; i++) {
                let e = new Mul(new Add(new Ctx('X'), new Num('10')), new Add(new Ctx('Y'), new Num('1000')));
                r = e.invoke({x: 1, y: e.invoke({x: r, y: i})});
            }
        } catch (e) {
            console.log(e);
            throw e;
        }
    })

    .add('classes', function () {
        try {
            for (let i = 0; i < 10; i++) {
                let e = new CMul(new CAdd(new CCtx('X'), new CNum('10')), new CAdd(new CCtx('Y'), new CNum('1000')));
                r = e.eval({x: 1, y: e.eval({x: r, y: i})});
            }
        } catch (e) {
            console.log(e);
            throw e;
        }
    })

    .on('cycle', function (event) {
        console.log(String(event.target))
    })

    .on('complete', function () {
        const faster = this.filter('fastest')[0];
        const slower = this.filter('slowest')[0];
        if (faster && slower) {
            console.log('--------------------------------------------------');
            console.log(`${faster.name} by ${Math.round(100 * faster.hz / slower.hz) - 100}%`)
        }
    })

    .run({'async': true});
