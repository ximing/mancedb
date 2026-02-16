import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import postcss from 'rollup-plugin-postcss';

/**
 * Creates a rollup configuration for a package
 * @param {Object} options
 * @param {string} options.input - The entry point file
 * @param {string} options.packageDir - The package directory
 * @param {Object} [options.external] - External dependencies
 * @returns {Array} Rollup configuration
 */
export function createRollupConfig({ input, packageDir, external = [] }) {
  // Dependencies that should be bundled instead of external
  const bundledDeps = ['tslib', 'reflect-metadata'];
  
  // Filter out bundled dependencies from external
  const externalFilter = (id) => {
    // Check if this is a bundled dependency by checking various path patterns
    if (bundledDeps.some(dep => {
      return id === dep || 
             id.startsWith(dep + '/') ||
             id.includes('/node_modules/' + dep) ||
             id.includes('/node_modules/.pnpm/' + dep + '@');
    })) {
      return false;
    }
    if (external.some(ext => typeof ext === 'string' ? id === ext : ext.test(id))) {
      return true;
    }
    // Mark other node_modules as external, but not if it's a bundled dep
    return /node_modules/.test(id);
  };

  return [
    {
      input,
      output: [
        {
          file: `${packageDir}/dist/index.js`,
          format: 'cjs',
          sourcemap: true,
          exports: 'named',
        },
        {
          file: `${packageDir}/dist/index.mjs`,
          format: 'esm',
          sourcemap: true,
          exports: 'named',
        },
      ],
      external: externalFilter,
      plugins: [
        nodeResolve({
          preferBuiltins: false,
        }),
        commonjs({
          transformMixedEsModules: true,
        }),
        postcss({
          extract: true,
          minimize: true,
          sourceMap: true,
        }),
        typescript({
          tsconfig: `${packageDir}/tsconfig.json`,
          declaration: true,
          declarationDir: `${packageDir}/dist/types`,
          importHelpers: true,
        }),
      ],
    },
    {
      input: `${packageDir}/dist/types/index.d.ts`,
      output: [{ file: `${packageDir}/dist/index.d.ts`, format: 'esm' }],
      external: [/\.css$/, /\.scss$/, /\.sass$/, /\.less$/, /\.styl$/],
      plugins: [dts()],
    },
  ];
}
