export const Operators = {

    Assignment: {
        '=': (setter, value) => setter(value)
    },

    Logical: {
        '&&': async (left, right) => await left && await right,
        '||': async (left, right) => await left || await right
    },

    Equality: {
        '==': async (left, right) => await left == await right,
        '===': async (left, right) => await left === await right,
        '!=': async (left, right) => await left != await right,
        '!==': async (left, right) => await left !== await right
    },

    Relational: {
        '<': async (left, right) => await left < await right,
        '<=': async (left, right) => await left <= await right,
        '>': async (left, right) => await left > await right,
        '>=': async (left, right) => await left >= await right
    },

    Additive: {
        '+': async (left, right) => await left + await right,
        '-': async (left, right) => await left - await right
    },

    Multiplicative: {
        '*': async (left, right) => await left * await right,
        '/': async (left, right) => await left / await right,
        '%': async (left, right) => await left % await right
    },

    Unary: {
        '+': async (argument) => +await argument,
        '-': async (argument) => -await argument,
        '!': async (argument) => !await argument
    }
};
