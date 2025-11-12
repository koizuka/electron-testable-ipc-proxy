import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

export default [
  // ES Modules
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.es.js',
      format: 'es',
    },
    plugins: [
      typescript({
        exclude: ['**/*.test.ts', '**/*.spec.ts'],
        compilerOptions: {
          declarationDir: './dist',
        },
      }),
    ],
  },

  // UMD
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'electronTestableipcProxy',
      indent: false,
    },
    plugins: [
      typescript({
        exclude: ['**/*.test.ts', '**/*.spec.ts'],
        declaration: false,
      }),
      terser(),
    ],
  },
]

