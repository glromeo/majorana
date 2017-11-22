import {assert, expect} from "chai";

describe("RegExp tests", function () {

    const regexp = new RegExp([
        '(\\/(?=\\/)[^\\n]+)',
        '(\\/(?=\\*)(\\*(?!\\/)|[^\\*])+\\*\\/)',
        '("(?:(?:\\\\\\.)|[^"])+\\")',
        "('(?:(?:\\\\\\.)|[^'])+\\')",
        '(0[xX][0-9a-fA-F]+)',
        '(0[bB][0-1]+)',
        '(0[0-7]+)',
        '([0-9]+(?:\\.[0-9]+)?(?:e[+\-]?[0-9]+)?)',
        '(\\.[0-9]+(?:e[+\-]?[0-9]+)?)',
        '(null|undefined|true|false)',
        '([a-zA-Z_$][0-9a-zA-Z_$]+)',
        '(!==|===|!=|==)',
        '(\\<\\<|\\>\\>|\\<\\=|\\>\\=|<|>)',
        '(\\+|\\-|\\*|\\/|\\%)'
    ].join('|'), 'g');

    let tester = function (fns) {
        regexp[Symbol.replace](this.test.title,
            function (match,
                      space, // '(\\s+)',
                      lineComment, // '(\\/(?=\\/)[^\\n]+)',
                      comment, // '(\\/(?=\\*)(\\*(?!\\/)|[^\\*])+\\*\\/)',
                      quoteString, // '("(?:(?:\\\\\\.)|[^"])+\\")',
                      doubleString, // "('(?:(?:\\\\\\.)|[^'])+\\')",
                      hexNumber, // '(0[xX][0-9a-fA-F]+)',
                      binaryNumber, // '(0[bB][0-1]+)',
                      octalNumber, // '(0[0-7]+)',
                      decimal, // '([0-9]+(?:\\.[0-9]+)?(?:e[+\-]?[0-9]+)?)',
                      fractional, // '(\\.[0-9]+(?:e[+\-]?[0-9]+)?)',
                      literal, // '(null|undefined|true|false)',
                      identifier, // '([a-zA-Z_$][0-9a-zA-Z_$]+)',
                      equality, // '(!==|===|!=|==)',
                      relational, // '(\\<\\<|\\>\\>|\\<\\=|\\>\\=|<|>)',
                      operator, // '(\\+|\\-|\\*|\\/|\\%)'
                      offset,
                      full) {
                console.log("match", JSON.stringify(match));
                console.log("offset", offset);
                fns.shift().apply(this, arguments);
                if (offset + match.length === full.length) {
                    assert.isTrue(fns.length === 0);
                }
            });
    };

    it(" //xxx\n /* y */ //\
       xyz", function () {
        tester.call(this, [
            function () {
                assert.equal(arguments[0], arguments[1]);
                assert.equal(arguments[16], 1);
            },
            function () {
                assert.equal(arguments[0], arguments[2]);
                assert.equal(arguments[16], 8);
            },
            function () {
                assert.equal(arguments[0], arguments[1]);
                assert.equal(arguments[16], 16);
            }
        ]);
    });

    it("1+a", function () {
        tester.call(this, [
            function (match,
                      space, // '(\\s+)',
                      lineComment, // '(\\/(?=\\/)[^\\n]+)',
                      comment, // '(\\/(?=\\*)(\\*(?!\\/)|[^\\*])+\\*\\/)',
                      quoteString, // '("(?:(?:\\\\\\.)|[^"])+\\")',
                      doubleString, // "('(?:(?:\\\\\\.)|[^'])+\\')",
                      hexNumber, // '(0[xX][0-9a-fA-F]+)',
                      binaryNumber, // '(0[bB][0-1]+)',
                      octalNumber, // '(0[0-7]+)',
                      decimal, // '([0-9]+(?:\\.[0-9]+)?(?:e[+\-]?[0-9]+)?)',
                      fractional, // '(\\.[0-9]+(?:e[+\-]?[0-9]+)?)',
                      literal, // '(null|undefined|true|false)',
                      identifier, // '([a-zA-Z_$][0-9a-zA-Z_$]+)',
                      equality, // '(!==|===|!=|==)',
                      relational, // '(\\<\\<|\\>\\>|\\<\\=|\\>\\=|<|>)',
                      operator, // '(\\+|\\-|\\*|\\/|\\%)'
                      offset,
                      full) {
                assert.equal(match, decimal);
                assert.equal(offset, 0);
            },
            function (match,
                      space, // '(\\s+)',
                      lineComment, // '(\\/(?=\\/)[^\\n]+)',
                      comment, // '(\\/(?=\\*)(\\*(?!\\/)|[^\\*])+\\*\\/)',
                      quoteString, // '("(?:(?:\\\\\\.)|[^"])+\\")',
                      doubleString, // "('(?:(?:\\\\\\.)|[^'])+\\')",
                      hexNumber, // '(0[xX][0-9a-fA-F]+)',
                      binaryNumber, // '(0[bB][0-1]+)',
                      octalNumber, // '(0[0-7]+)',
                      decimal, // '([0-9]+(?:\\.[0-9]+)?(?:e[+\-]?[0-9]+)?)',
                      fractional, // '(\\.[0-9]+(?:e[+\-]?[0-9]+)?)',
                      literal, // '(null|undefined|true|false)',
                      identifier, // '([a-zA-Z_$][0-9a-zA-Z_$]+)',
                      equality, // '(!==|===|!=|==)',
                      relational, // '(\\<\\<|\\>\\>|\\<\\=|\\>\\=|<|>)',
                      operator, // '(\\+|\\-|\\*|\\/|\\%)'
                      offset,
                      full) {
                assert.equal(match, operator);
                assert.equal(offset, 1);
            },
            function (match,
                      space, // '(\\s+)',
                      lineComment, // '(\\/(?=\\/)[^\\n]+)',
                      comment, // '(\\/(?=\\*)(\\*(?!\\/)|[^\\*])+\\*\\/)',
                      quoteString, // '("(?:(?:\\\\\\.)|[^"])+\\")',
                      doubleString, // "('(?:(?:\\\\\\.)|[^'])+\\')",
                      hexNumber, // '(0[xX][0-9a-fA-F]+)',
                      binaryNumber, // '(0[bB][0-1]+)',
                      octalNumber, // '(0[0-7]+)',
                      decimal, // '([0-9]+(?:\\.[0-9]+)?(?:e[+\-]?[0-9]+)?)',
                      fractional, // '(\\.[0-9]+(?:e[+\-]?[0-9]+)?)',
                      literal, // '(null|undefined|true|false)',
                      identifier, // '([a-zA-Z_$][0-9a-zA-Z_$]+)',
                      equality, // '(!==|===|!=|==)',
                      relational, // '(\\<\\<|\\>\\>|\\<\\=|\\>\\=|<|>)',
                      operator, // '(\\+|\\-|\\*|\\/|\\%)'
                      offset,
                      full) {
                assert.equal(match, identifier);
                assert.equal(offset, 2);
            }
        ]);
    });
});