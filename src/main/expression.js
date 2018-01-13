import {Parser} from "./parser";

export class Expression {

    constructor(source, parser = new Parser()) {
        this.ast = parser.parse(source);
    }

    invoke(self, context) {
        return this.ast.eval(self, context);
    }
}
