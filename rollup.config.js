import babel from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import path from 'path';

export default {
    input: 'src/ol-elevation-parser.ts',
    treeshake: false,
    output: [
        {
            dir: 'lib',
            format: 'es',
            sourcemap: true
        }
    ],
    plugins: [
        del({ targets: 'lib/*' }),
        typescript({
            outDir: 'lib',
            declarationMap: true,
            declarationDir: 'lib',
            outputToFilesystem: true
        }),
        babel({
            presets: [
                [
                    "@babel/preset-env",
                    {
                        targets: {
                            esmodules: true
                        }
                    }
                ]
            ],
            babelHelpers: 'bundled',
            exclude: ["node_modules/**"]
        })
    ],
    external: id => !(path.isAbsolute(id) || id.startsWith("."))
};