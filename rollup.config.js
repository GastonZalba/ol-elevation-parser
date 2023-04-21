import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import path from 'path';
import banner2 from 'rollup-plugin-banner2'
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const banner =
`/*!
 * ${pkg.name} - v${pkg.version}
 * ${pkg.homepage}
 * Built: ${new Date()}
*/
`;

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
        banner2(() => banner),
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