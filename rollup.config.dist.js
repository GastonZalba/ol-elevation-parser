import pkg from './package.json';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

let globals = {
    'ol': 'ol',
    'ol/source': 'ol.source',
    'ol/layer': 'ol.layer',
    'ol/View': 'ol.View',
    'ol/layer/VectorTile': 'ol.layer.VectorTile',
    'ol/Feature': 'ol.Feature',
    'ol/geom/LineString': 'ol.geom.LineString',
    'ol/geom/Point': 'ol.geom.Point',
    'ol/geom/Geometry': 'ol.geom.Geometry',
    'ol/layer/Vector': 'ol.layer.Vector',
    'ol/layer/VectorTile': 'ol.layer.VectorTile',
    'ol/source/Vector': 'ol.source.Vector',
    'ol/source/TileWMS': 'ol.source.TileWMS',
    'ol/source/TileImage': 'ol.source.TileImage',
    'ol/source/XYZ': 'ol.source.XYZ',    
    'ol/util': 'ol.util',    
    'ol/tilegrid': 'ol.tilegrid',
    'ol/tilegrid/TileGrid': 'ol.tilegrid.TileGrid',
    'ol/control/Control': 'ol.control.Control',
    'ol/extent': 'ol.extent',
    'ol/TileState': 'ol.TileState',
    'ol/coordinate': 'ol.coordinate',

    'axios': 'axios',
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
            },
            !commandOptions.dev && {
                file: pkg.browser,
                format: 'umd',
                plugins: [terser()],
                name: 'ElevationParser',
                globals: globals,
                sourcemap: true
            }
        ],
        plugins: [
            del({ targets: 'dist/*' }),
            typescript(
                {
                    outDir: 'dist',
                    declarationDir: 'dist',
                    outputToFilesystem: true
                }
            ),
            resolve(),
            babel({
                babelrc: false,
                plugins: ["@babel/plugin-transform-runtime"],
                babelHelpers: 'runtime',
                exclude: 'node_modules/**',
                presets: [
                    [
                        '@babel/preset-env',
                        {
                            targets: {
                                browsers: [
                                    "Chrome >= 52",
                                    "FireFox >= 44",
                                    "Safari >= 7",
                                    "Explorer 11",
                                    "last 4 Edge versions"
                                ]
                            }
                        }
                    ]
                ]
            }),        
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