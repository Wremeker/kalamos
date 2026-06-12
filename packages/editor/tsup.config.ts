import { defineConfig } from 'tsup';
import path from 'node:path';

const srcDir = path.resolve(__dirname, 'src');

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    styles: 'src/styles.css',
  },
  format: ['esm'],
  dts: { entry: { index: 'src/index.ts' } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  esbuildOptions(options) {
    options.alias = {
      ...(options.alias ?? {}),
      'react-i18next': path.resolve(srcDir, 'shims/react-i18next.ts'),
      '@': srcDir,
    };
  },
});
