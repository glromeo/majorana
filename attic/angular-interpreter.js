
function ASTInterpreter($filter) {
    this.$filter = $filter;
}

ASTInterpreter.prototype = {
    compile: function(ast) {
        var self = this;
        findConstantAndWatchExpressions(ast, self.$filter);
        var assignable;
        var assign;
        if ((assignable = assignableAST(ast))) {
            assign = this.recurse(assignable);
        }
        var toWatch = getInputs(ast.body);
        var inputs;
        if (toWatch) {
            inputs = [];
            forEach(toWatch, function(watch, key) {
                var input = self.recurse(watch);
                input.isPure = watch.isPure;
                watch.input = input;
                inputs.push(input);
                watch.watchId = key;
            });
        }
        var expressions = [];
        forEach(ast.body, function(expression) {
            expressions.push(self.recurse(expression.expression));
        });
        var fn = ast.body.length === 0 ? noop :
            ast.body.length === 1 ? expressions[0] :
                function(scope, locals) {
                    var lastValue;
                    forEach(expressions, function(exp) {
                        lastValue = exp(scope, locals);
                    });
                    return lastValue;
                };
        if (assign) {
            fn.assign = function(scope, value, locals) {
                return assign(scope, locals, value);
            };
        }
        if (inputs) {
            fn.inputs = inputs;
        }
        return fn;
    },

    recurse: function(ast, context, create) {
        var left, right, self = this, args;
        if (ast.input) {
            return this.inputs(ast.input, ast.watchId);
        }
        switch (ast.type) {
            case AST.Literal:
                return this.value(ast.value, context);
            case AST.UnaryExpression:
                right = this.recurse(ast.argument);
                return this['unary' + ast.operator](right, context);
            case AST.BinaryExpression:
                left = this.recurse(ast.left);
                right = this.recurse(ast.right);
                return this['binary' + ast.operator](left, right, context);
            case AST.LogicalExpression:
                left = this.recurse(ast.left);
                right = this.recurse(ast.right);
                return this['binary' + ast.operator](left, right, context);
            case AST.ConditionalExpression:
                return this['ternary?:'](
                    this.recurse(ast.test),
                    this.recurse(ast.alternate),
                    this.recurse(ast.consequent),
                    context
                );
            case AST.Identifier:
                return self.identifier(ast.name, context, create);
            case AST.MemberExpression:
                left = this.recurse(ast.object, false, !!create);
                if (!ast.computed) {
                    right = ast.property.name;
                }
                if (ast.computed) right = this.recurse(ast.property);
                return ast.computed ?
                    this.computedMember(left, right, context, create) :
                    this.nonComputedMember(left, right, context, create);
            case AST.CallExpression:
                args = [];
                forEach(ast.arguments, function(expr) {
                    args.push(self.recurse(expr));
                });
                if (ast.filter) right = this.$filter(ast.callee.name);
                if (!ast.filter) right = this.recurse(ast.callee, true);
                return ast.filter ?
                    function(scope, locals, assign, inputs) {
                        var values = [];
                        for (var i = 0; i < args.length; ++i) {
                            values.push(args[i](scope, locals, assign, inputs));
                        }
                        var value = right.apply(undefined, values, inputs);
                        return context ? {context: undefined, name: undefined, value: value} : value;
                    } :
                    function(scope, locals, assign, inputs) {
                        var rhs = right(scope, locals, assign, inputs);
                        var value;
                        if (rhs.value != null) {
                            var values = [];
                            for (var i = 0; i < args.length; ++i) {
                                values.push(args[i](scope, locals, assign, inputs));
                            }
                            value = rhs.value.apply(rhs.context, values);
                        }
                        return context ? {value: value} : value;
                    };
            case AST.AssignmentExpression:
                left = this.recurse(ast.left, true, 1);
                right = this.recurse(ast.right);
                return function(scope, locals, assign, inputs) {
                    var lhs = left(scope, locals, assign, inputs);
                    var rhs = right(scope, locals, assign, inputs);
                    lhs.context[lhs.name] = rhs;
                    return context ? {value: rhs} : rhs;
                };
            case AST.ArrayExpression:
                args = [];
                forEach(ast.elements, function(expr) {
                    args.push(self.recurse(expr));
                });
                return function(scope, locals, assign, inputs) {
                    var value = [];
                    for (var i = 0; i < args.length; ++i) {
                        value.push(args[i](scope, locals, assign, inputs));
                    }
                    return context ? {value: value} : value;
                };
            case AST.ObjectExpression:
                args = [];
                forEach(ast.properties, function(property) {
                    if (property.computed) {
                        args.push({key: self.recurse(property.key),
                            computed: true,
                            value: self.recurse(property.value)
                        });
                    } else {
                        args.push({key: property.key.type === AST.Identifier ?
                                property.key.name :
                                ('' + property.key.value),
                            computed: false,
                            value: self.recurse(property.value)
                        });
                    }
                });
                return function(scope, locals, assign, inputs) {
                    var value = {};
                    for (var i = 0; i < args.length; ++i) {
                        if (args[i].computed) {
                            value[args[i].key(scope, locals, assign, inputs)] = args[i].value(scope, locals, assign, inputs);
                        } else {
                            value[args[i].key] = args[i].value(scope, locals, assign, inputs);
                        }
                    }
                    return context ? {value: value} : value;
                };
            case AST.ThisExpression:
                return function(scope) {
                    return context ? {value: scope} : scope;
                };
            case AST.LocalsExpression:
                return function(scope, locals) {
                    return context ? {value: locals} : locals;
                };
            case AST.NGValueParameter:
                return function(scope, locals, assign) {
                    return context ? {value: assign} : assign;
                };
        }
    },

    'unary+': function(argument, context) {
        return function(scope, locals, assign, inputs) {
            var arg = argument(scope, locals, assign, inputs);
            if (isDefined(arg)) {
                arg = +arg;
            } else {
                arg = 0;
            }
            return context ? {value: arg} : arg;
        };
    },
    'unary-': function(argument, context) {
        return function(scope, locals, assign, inputs) {
            var arg = argument(scope, locals, assign, inputs);
            if (isDefined(arg)) {
                arg = -arg;
            } else {
                arg = -0;
            }
            return context ? {value: arg} : arg;
        };
    },
    'unary!': function(argument, context) {
        return function(scope, locals, assign, inputs) {
            var arg = !argument(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary+': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var lhs = left(scope, locals, assign, inputs);
            var rhs = right(scope, locals, assign, inputs);
            var arg = plusFn(lhs, rhs);
            return context ? {value: arg} : arg;
        };
    },
    'binary-': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var lhs = left(scope, locals, assign, inputs);
            var rhs = right(scope, locals, assign, inputs);
            var arg = (isDefined(lhs) ? lhs : 0) - (isDefined(rhs) ? rhs : 0);
            return context ? {value: arg} : arg;
        };
    },
    'binary*': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) * right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary/': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) / right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary%': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) % right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary===': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) === right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary!==': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) !== right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary==': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            // eslint-disable-next-line eqeqeq
            var arg = left(scope, locals, assign, inputs) == right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary!=': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            // eslint-disable-next-line eqeqeq
            var arg = left(scope, locals, assign, inputs) != right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary<': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) < right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary>': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) > right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary<=': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) <= right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary>=': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) >= right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary&&': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) && right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'binary||': function(left, right, context) {
        return function(scope, locals, assign, inputs) {
            var arg = left(scope, locals, assign, inputs) || right(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    'ternary?:': function(test, alternate, consequent, context) {
        return function(scope, locals, assign, inputs) {
            var arg = test(scope, locals, assign, inputs) ? alternate(scope, locals, assign, inputs) : consequent(scope, locals, assign, inputs);
            return context ? {value: arg} : arg;
        };
    },
    value: function(value, context) {
        return function() { return context ? {context: undefined, name: undefined, value: value} : value; };
    },
    identifier: function(name, context, create) {
        return function(scope, locals, assign, inputs) {
            var base = locals && (name in locals) ? locals : scope;
            if (create && create !== 1 && base && base[name] == null) {
                base[name] = {};
            }
            var value = base ? base[name] : undefined;
            if (context) {
                return {context: base, name: name, value: value};
            } else {
                return value;
            }
        };
    },
    computedMember: function(left, right, context, create) {
        return function(scope, locals, assign, inputs) {
            var lhs = left(scope, locals, assign, inputs);
            var rhs;
            var value;
            if (lhs != null) {
                rhs = right(scope, locals, assign, inputs);
                rhs = getStringValue(rhs);
                if (create && create !== 1) {
                    if (lhs && !(lhs[rhs])) {
                        lhs[rhs] = {};
                    }
                }
                value = lhs[rhs];
            }
            if (context) {
                return {context: lhs, name: rhs, value: value};
            } else {
                return value;
            }
        };
    },
    nonComputedMember: function(left, right, context, create) {
        return function(scope, locals, assign, inputs) {
            var lhs = left(scope, locals, assign, inputs);
            if (create && create !== 1) {
                if (lhs && lhs[right] == null) {
                    lhs[right] = {};
                }
            }
            var value = lhs != null ? lhs[right] : undefined;
            if (context) {
                return {context: lhs, name: right, value: value};
            } else {
                return value;
            }
        };
    },
    inputs: function(input, watchId) {
        return function(scope, value, locals, inputs) {
            if (inputs) return inputs[watchId];
            return input(scope, value, locals);
        };
    }
};