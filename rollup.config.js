import nodeResolve from 'rollup-plugin-node-resolve';
import fs from 'fs';

export default {
    input: 'src/main/index.js',
    output: {
        format: 'umd',
        name: 'Majorana',
        file: JSON.parse(fs.readFileSync('package.json', 'UTF-8')).main
    },
    plugins: [
        nodeResolve({
            module: false,
            jsnext: false,
        })
    ]
};