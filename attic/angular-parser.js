export var AST = function AST(lexer, options) {
    this.lexer = lexer;
    this.options = options || lexer.options;
};

AST.Program = 'Program';
AST.ExpressionStatement = 'ExpressionStatement';
AST.AssignmentExpression = 'AssignmentExpression';
AST.ConditionalExpression = 'ConditionalExpression';
AST.LogicalExpression = 'LogicalExpression';
AST.BinaryExpression = 'BinaryExpression';
AST.UnaryExpression = 'UnaryExpression';
AST.CallExpression = 'CallExpression';
AST.MemberExpression = 'MemberExpression';
AST.Identifier = 'Identifier';
AST.Literal = 'Literal';
AST.ArrayExpression = 'ArrayExpression';
AST.Property = 'Property';
AST.ObjectExpression = 'ObjectExpression';
AST.ThisExpression = 'ThisExpression';
AST.LocalsExpression = 'LocalsExpression';

// Internal use only
AST.NGValueParameter = 'NGValueParameter';

AST.prototype = {
    ast: function(text) {
        this.text = text;
        this.tokens = this.lexer.lex(text);

        var value = this.program();

        if (this.tokens.length !== 0) {
            this.throwError('is an unexpected token', this.tokens[0]);
        }

        return value;
    },

    program: function() {
        var body = [];
        while (true) {
            if (this.tokens.length > 0 && !this.peek('}', ')', ';', ']'))
                body.push(this.expressionStatement());
            if (!this.expect(';')) {
                return { type: AST.Program, body: body};
            }
        }
    },

    expressionStatement: function() {
        return { type: AST.ExpressionStatement, expression: this.filterChain() };
    },

    filterChain: function() {
        var left = this.expression();
        while (this.expect('|')) {
            left = this.filter(left);
        }
        return left;
    },

    expression: function() {
        return this.assignment();
    },

    assignment: function() {
        var result = this.ternary();
        if (this.expect('=')) {
            if (!isAssignable(result)) {
                throw new Error('lval', 'Trying to assign a value to a non l-value');
            }

            result = { type: AST.AssignmentExpression, left: result, right: this.assignment(), operator: '='};
        }
        return result;
    },

    ternary: function() {
        var test = this.logicalOR();
        var alternate;
        var consequent;
        if (this.expect('?')) {
            alternate = this.expression();
            if (this.consume(':')) {
                consequent = this.expression();
                return { type: AST.ConditionalExpression, test: test, alternate: alternate, consequent: consequent};
            }
        }
        return test;
    },

    logicalOR: function() {
        var left = this.logicalAND();
        while (this.expect('||')) {
            left = { type: AST.LogicalExpression, operator: '||', left: left, right: this.logicalAND() };
        }
        return left;
    },

    logicalAND: function() {
        var left = this.equality();
        while (this.expect('&&')) {
            left = { type: AST.LogicalExpression, operator: '&&', left: left, right: this.equality()};
        }
        return left;
    },

    equality: function() {
        var left = this.relational();
        var token;
        while ((token = this.expect('==','!=','===','!=='))) {
            left = { type: AST.BinaryExpression, operator: token.text, left: left, right: this.relational() };
        }
        return left;
    },

    relational: function() {
        var left = this.additive();
        var token;
        while ((token = this.expect('<', '>', '<=', '>='))) {
            left = { type: AST.BinaryExpression, operator: token.text, left: left, right: this.additive() };
        }
        return left;
    },

    additive: function() {
        var left = this.multiplicative();
        var token;
        while ((token = this.expect('+','-'))) {
            left = { type: AST.BinaryExpression, operator: token.text, left: left, right: this.multiplicative() };
        }
        return left;
    },

    multiplicative: function() {
        var left = this.unary();
        var token;
        while ((token = this.expect('*','/','%'))) {
            left = { type: AST.BinaryExpression, operator: token.text, left: left, right: this.unary() };
        }
        return left;
    },

    unary: function() {
        var token;
        if ((token = this.expect('+', '-', '!'))) {
            return { type: AST.UnaryExpression, operator: token.text, prefix: true, argument: this.unary() };
        } else {
            return this.primary();
        }
    },

    primary: function() {
        var primary;
        if (this.expect('(')) {
            primary = this.filterChain();
            this.consume(')');
        } else if (this.expect('[')) {
            primary = this.arrayDeclaration();
        } else if (this.expect('{')) {
            primary = this.object();
        } else if (Object.hasOwnProperty(this.selfReferential, this.peek().text)) {
            primary = copy(this.selfReferential[this.consume().text]);
        } else if (Object.hasOwnProperty(this.options.literals, this.peek().text)) {
            primary = { type: AST.Literal, value: this.options.literals[this.consume().text]};
        } else if (this.peek().identifier) {
            primary = this.identifier();
        } else if (this.peek().constant) {
            primary = this.constant();
        } else {
            this.throwError('not a primary expression', this.peek());
        }

        var next;
        while ((next = this.expect('(', '[', '.'))) {
            if (next.text === '(') {
                primary = {type: AST.CallExpression, callee: primary, arguments: this.parseArguments() };
                this.consume(')');
            } else if (next.text === '[') {
                primary = { type: AST.MemberExpression, object: primary, property: this.expression(), computed: true };
                this.consume(']');
            } else if (next.text === '.') {
                primary = { type: AST.MemberExpression, object: primary, property: this.identifier(), computed: false };
            } else {
                this.throwError('IMPOSSIBLE');
            }
        }
        return primary;
    },

    filter: function(baseExpression) {
        var args = [baseExpression];
        var result = {type: AST.CallExpression, callee: this.identifier(), arguments: args, filter: true};

        while (this.expect(':')) {
            args.push(this.expression());
        }

        return result;
    },

    parseArguments: function() {
        var args = [];
        if (this.peekToken().text !== ')') {
            do {
                args.push(this.filterChain());
            } while (this.expect(','));
        }
        return args;
    },

    identifier: function() {
        var token = this.consume();
        if (!token.identifier) {
            this.throwError('is not a valid identifier', token);
        }
        return { type: AST.Identifier, name: token.text };
    },

    constant: function() {
        // TODO check that it is a constant
        return { type: AST.Literal, value: this.consume().value };
    },

    arrayDeclaration: function() {
        var elements = [];
        if (this.peekToken().text !== ']') {
            do {
                if (this.peek(']')) {
                    // Support trailing commas per ES5.1.
                    break;
                }
                elements.push(this.expression());
            } while (this.expect(','));
        }
        this.consume(']');

        return { type: AST.ArrayExpression, elements: elements };
    },

    object: function() {
        var properties = [], property;
        if (this.peekToken().text !== '}') {
            do {
                if (this.peek('}')) {
                    // Support trailing commas per ES5.1.
                    break;
                }
                property = {type: AST.Property, kind: 'init'};
                if (this.peek().constant) {
                    property.key = this.constant();
                    property.computed = false;
                    this.consume(':');
                    property.value = this.expression();
                } else if (this.peek().identifier) {
                    property.key = this.identifier();
                    property.computed = false;
                    if (this.peek(':')) {
                        this.consume(':');
                        property.value = this.expression();
                    } else {
                        property.value = property.key;
                    }
                } else if (this.peek('[')) {
                    this.consume('[');
                    property.key = this.expression();
                    this.consume(']');
                    property.computed = true;
                    this.consume(':');
                    property.value = this.expression();
                } else {
                    this.throwError('invalid key', this.peek());
                }
                properties.push(property);
            } while (this.expect(','));
        }
        this.consume('}');

        return {type: AST.ObjectExpression, properties: properties };
    },

    throwError: function(msg, token) {
        throw new Error('syntax',
            'Syntax Error: Token \'{0}\' {1} at column {2} of the expression [{3}] starting at [{4}].',
            token.text, msg, (token.index + 1), this.text, this.text.substring(token.index));
    },

    consume: function(e1) {
        if (this.tokens.length === 0) {
            throw new Error('ueoe', 'Unexpected end of expression: {0}', this.text);
        }

        var token = this.expect(e1);
        if (!token) {
            this.throwError('is unexpected, expecting [' + e1 + ']', this.peek());
        }
        return token;
    },

    peekToken: function() {
        if (this.tokens.length === 0) {
            throw new Error('ueoe', 'Unexpected end of expression: {0}', this.text);
        }
        return this.tokens[0];
    },

    peek: function(e1, e2, e3, e4) {
        return this.peekAhead(0, e1, e2, e3, e4);
    },

    peekAhead: function(i, e1, e2, e3, e4) {
        if (this.tokens.length > i) {
            var token = this.tokens[i];
            var t = token.text;
            if (t === e1 || t === e2 || t === e3 || t === e4 ||
                (!e1 && !e2 && !e3 && !e4)) {
                return token;
            }
        }
        return false;
    },

    expect: function(e1, e2, e3, e4) {
        var token = this.peek(e1, e2, e3, e4);
        if (token) {
            this.tokens.shift();
            return token;
        }
        return false;
    },

    selfReferential: {
        'this': {type: AST.ThisExpression },
        '$locals': {type: AST.LocalsExpression }
    }
};
