import {assert, expect} from "chai";
import {Lexer, Tokens} from "../main/lexer";
import fs from "fs";

describe("Lexer Tests", function () {

    class Stopwatch {

        start() {
            this.hrtime = process.hrtime();
            return this;
        }

        stop() {
            this.hrtime = process.hrtime(this.hrtime);
            this['ms'] = this.hrtime[1] / 1000000;
            this['s'] = this.hrtime[0];
            return this;
        }
    }

    it("tokenize angular.js parse module", function () {

        const fixture = fs.readFileSync("test/lexer.fixture.js", 'utf8');
        const lexer = new Lexer(fixture);

        assert.equal(fixture.split("\n").length, 2000);

        let t = new Stopwatch().start();

        for (let token of lexer) {
            if (lexer.line >= 1000) {
                console.log("broken");
                break;
            }
        }

        const halfway = t.stop()['ms'];
        assert.isBelow(halfway, 16);
        assert.equal(lexer.line, 1000);
        assert.equal(lexer.column, 22);

        console.log("1/2 delta", ((15 - halfway) / halfway).toFixed(2));

        t.start();

        for (let token of lexer) ;

        const stop = t.stop()['ms'];
        assert.isBelow(stop, 8);
        assert.equal(lexer.line, 2068);
        assert.equal(lexer.column, 2);

        console.log("2/2 delta", ((7.5 - stop) / stop).toFixed(2));
    });

});