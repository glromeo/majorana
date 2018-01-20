import {tokenize} from "../../attic/tokenize.js";
import {Lexer as AngularLexer} from "../../attic/angular-lexer.js";
import {Lexer as RegexpLexer} from "../../attic/regexp-lexer.js";
import {Lexer} from "../main/lexer.js";

// --require ../../.register.js

const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const fs = require('fs');
const sample = fs.readFileSync("../test/lexer.fixture.js", 'utf8');

console.log('-------------------------------------------------------');

const l = new Lexer();
for (let token of l.scan(sample)) {
    console.log(x = token.text);
}

let x;

suite

    .add('Lexer', function () {
        for (let token of l.scan(sample)) {
            console.log(x = token.text);
        }
    })

    .add('tokenize()', function () {
        for (let token of tokenize(sample)) {
            x = token.text;
        }
    })

    .add('RegexpLexer', function () {
        for (let token of new RegexpLexer(sample)) {
            x = token.text;
        }
    })

    .add('AngularLexer', function () {
        for (let token of new AngularLexer().tokenize(sample)) {
            x = token.text;
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
    .run({'async': true})
