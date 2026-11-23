import terser from '@rollup/plugin-terser'

// TypeScript is compiled by `tsc -p tsconfig.build.json` into ./build first
// (declarations go directly to ./dist); rollup only bundles the emitted JS.
const input = 'build/index.js'

export default [
  // ES Modules
  {
    input,
    output: {
      file: 'dist/index.es.mjs',
      format: 'es',
    },
  },

  // UMD
  {
    input,
    output: {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'electronTestableipcProxy',
      indent: false,
    },
    plugins: [
      terser(),
    ],
  },
]
