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
    ],
    external: id => !(path.isAbsolute(id) || id.startsWith("."))
};