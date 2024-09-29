// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve';
//import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
//import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/bsbimaps.js',
        format: 'esm', // 'es'
        sourcemap: true
    },
    external: ['BsbiDb', 'SearchForm', 'scriptVersions', 'MapStyleTemplates', 'GisAreaTypes', 'OfflineTaxonDropBox'],
  plugins: [
    resolve({
		// pass custom options to the resolve plugin
		customResolveOptions: {
		  moduleDirectory: 'node_modules'
		}
	  }),
      commonjs(),
    // babel({
    //   exclude: 'node_modules/**', // only transpile our source code
    //   babelHelpers: 'runtime'
    // }),
    //production && terser() // minify, but only in production
  ]
};
