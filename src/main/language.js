export const Tokens = {
    Comment:        Symbol("Comment"),
    BlockComment:   Symbol("BlockComment"),
    LineComment:    Symbol("LineComment"),
    Constant:       Symbol("Constant"),
    Number:         Symbol("Number"),
    String:         Symbol("String"),
    Literal:        Symbol("Literal"),
    Symbol:         Symbol("Symbol")
};

export const Symbols = {
    equality: ['===', '==', '!==', '!='],
    relational: ['<', '<=', '>', '>='],
    additive: ["+", "-"],
    multiplicative: ["*", "/", "%"],
    unary: ["+", "-", "!"],
    assignment: ["="]
};
