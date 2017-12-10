import nodeResolve from 'rollup-plugin-node-resolve';

export default {
    entry: 'src/main/index.js',
    format: 'umd',
    moduleName: 'Majorana',
    dest: 'lib/index.js',

    plugins: [
        nodeResolve({
            module: false,
            jsnext: false,
        })
    ]
};