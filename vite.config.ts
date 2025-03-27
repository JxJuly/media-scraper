import dts from 'vite-plugin-dts';

import pkg from './package.json';

import type { UserConfig } from 'vite';

const config: UserConfig = {
  build: {
    target: 'esnext',
    lib: {
      entry: './src/index.ts',
      formats: ['cjs', 'es'],
      fileName: 'scraper',
    },
    outDir: './libs',
    rollupOptions: {
      external: ['path', 'fs', ...Object.keys(pkg.dependencies)],
    },
    minify: false,
  },
  plugins: [dts()],
};

export default config;
