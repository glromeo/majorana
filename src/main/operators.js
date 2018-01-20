export const Operators = {

    Assignment: {
        '=': undefined
    },

    Logical: {
        '&&': (l, r) => l && r,
        '||': (l, r) => l || r,
    },

    Equality: {
        '==': (l, r) => l == r,
        '===': (l, r) => l === r,
        '!=': (l, r) => l != r,
        '!==': (l, r) => l !== r,
    },

    Relational: {
        '<': (l, r) => l < r,
        '<=': (l, r) => l <= r,
        '>': (l, r) => l > r,
        '>=': (l, r) => l >= r,
    },

    Additive: {
        '+': (l, r) => l + r,
        '-': (l, r) => l - r,
    },

    Multiplicative: {
        '*': (l, r) => l * r,
        '/': (l, r) => l / r,
        '%': (l, r) => l % r,
    },

    Unary: {
        '+': (arg) => +arg,
        '-': (arg) => -arg,
        '!': (arg) => !arg,
    }
};
