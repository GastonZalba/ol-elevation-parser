import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
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

const globals = (id) => {
    const globals = {
        'axios': 'axios'
    };

    if (/ol(\\|\/)/.test(id)) {
        return id.replace(/\//g, '.').replace('.js', '');
    } else if (id in globals) {
        return globals[id];
    }

    return id;
};

export default function (commandOptions) {
    return {
        input: 'src/ol-elevation-parser.ts',
        output: [
            {
                dir: 'dist',
                format: 'umd',
                name: 'ElevationParser',
                globals: globals,
                sourcemap: true
            }
        ],
        plugins: [
            banner2(() => banner),
            del({ targets: 'dist/*' }),
            typescript(
                {
                    outDir: 'dist',
                    declarationDir: 'dist',
                    outputToFilesystem: true
                }
            ),
            resolve(),
            commandOptions.dev && serve({
                open: false,
                verbose: true,
                contentBase: ['', 'examples'],
                historyApiFallback: '/basic.html',
                host: 'localhost',
                port: 3005,
                // execute function after server has begun listening
                onListening: function (server) {
                    const address = server.address()
                    // by using a bound function, we can access options as `this`
                    const protocol = this.https ? 'https' : 'http'
                    console.log(`Server listening at ${protocol}://localhost:${address.port}/`)
                }
            }),
            commandOptions.dev && livereload({
                watch: ['dist'],
                delay: 500
            })
        ],
        external: id => {
            return /(^ol(\\|\/)|axios)/.test(id)
        }
    }
}