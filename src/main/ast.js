export const AST = {

    AdditiveExpression: /*--------*/ Symbol("AdditiveExpression"),
    ArrayExpression: /*-----------*/ Symbol("ArrayExpression"),
    AssignmentExpression: /*------*/ Symbol("AssignmentExpression"),
    CallExpression: /*------------*/ Symbol("CallExpression"),
    CommaExpression: /*-----------*/ Symbol("CommaExpression"),
    String: /*--------------------*/ Symbol("String"),
    Number: /*--------------------*/ Symbol("Number"),
    EqualityExpression: /*--------*/ Symbol("EqualityExpression"),
    Expression: /*----------------*/ Symbol("Expression"),
    Identifier: /*----------------*/ Symbol("Identifier"),
    Literal: /*-------------------*/ Symbol("Literal"),
    LogicalExpression: /*---------*/ Symbol("LogicalExpression"),
    MemberExpression: /*----------*/ Symbol("MemberExpression"),
    MultiplicativeExpression: /*--*/ Symbol("MultiplicativeExpression"),
    ObjectExpression: /*----------*/ Symbol("ObjectExpression"),
    Property: /*------------------*/ Symbol("Property"),
    RelationalExpression: /*------*/ Symbol("RelationalExpression"),
    SelfExpression: /*------------*/ Symbol("SelfExpression"),
    TernaryExpression: /*---------*/ Symbol("TernaryExpression"),
    UnaryExpression: /*-----------*/ Symbol("UnaryExpression"),

    Literals: null
};

AST.Literals = {
    'true': {type: AST.Literal, value: true},
    'false': {type: AST.Literal, value: false},
    'null': {type: AST.Literal, value: null},
    'undefined': {type: AST.Literal, value: undefined},
    'this': {type: AST.SelfExpression}
};