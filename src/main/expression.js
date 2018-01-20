import {Parser} from "./parser.js";
import {Interpreter} from "./interpreter.js";

export class Expression {

    constructor(source, interpreter = new Interpreter()) {
        this.interpreter = interpreter;
        this.interpreter.parse(source);
    }

    invoke(self, context) {
        return this.interpreter.eval(context, self);
    }

    static set AST(type) {
        switch (type) {
            case 'interpreter':
                Parser.AST = Interpreter;
                break;
        }
    }
}
