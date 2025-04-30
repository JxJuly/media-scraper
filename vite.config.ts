import dts from 'vite-plugin-dts';

import pkg from './package.json';

import type { UserConfig } from 'vite';

const config: UserConfig = {
  build: {
    target: 'esnext',
    lib: {
      entry: {
        main: './src/index.ts',
        plugins: './src/plugins/index.ts',
      },
      formats: ['es'],
    },
    outDir: './libs',
    rollupOptions: {
      external: ['path', 'fs', 'stream/promises', ...Object.keys(pkg.dependencies)],
      output: {
        entryFileNames: '[name]/index.js',
      },
    },
    minify: false,
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.build.json',
      entryRoot: './src',
      outDir: './libs/types',
    }),
  ],
};

export default config;
