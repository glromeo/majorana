"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
function binary(symbol) {
    return new Function("callback", "field", "value", `{
        callback[field] = value;
        if (--callback.pending === 0) {
            callback(callback.left ${symbol} callback.right);
        }
    }`);
}

const Operators = exports.Operators = {

    Assignment: {
        '=': function (callback, index, value) {
            callback[index] = value;
            if (--callback.pending === 0) {
                callback(callback.object[callback.member] = callback.value);
            }
        }
    },

    Logical: {
        '&&': binary('&&'),
        '||': binary('||')
    },

    Equality: {
        '==': binary('=='),
        '===': binary('==='),
        '!=': binary('!='),
        '!==': binary('!==')
    },

    Relational: {
        '<': binary('<'),
        '<=': binary('<='),
        '>': binary('>'),
        '>=': binary('>=')
    },

    Additive: {
        '+': binary('+'),
        '-': binary('-')
    },

    Multiplicative: {
        '*': binary('*'),
        '/': binary('/'),
        '%': binary('%')
    },

    Unary: {
        '+': function (callback, argument) {
            callback(+argument);
        },
        '-': function (callback, argument) {
            callback(-argument);
        },
        '!': function (callback, argument) {
            callback(!argument);
        }
    }
};
//# sourceMappingURL=operators.js.map