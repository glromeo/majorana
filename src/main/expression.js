import {Parser} from "./parser";
import {Interpreter} from "./interpreter";

export class Expression {

    constructor(source, parser = new Parser()) {
        this.ast = parser.parse(source);
    }

    invoke(self, context) {
        return this.ast.eval(self, context);
    }

    static set AST(type) {
        switch (type) {
            case 'interpreter':
                Parser.AST = Interpreter;
                break;
            case 'interpreter2':
                Parser.AST = Interpreter2;
                break;
        }
    }
}
