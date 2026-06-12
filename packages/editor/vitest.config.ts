import { defineConfig } from 'vitest/config';
import path from 'node:path';

const srcDir = path.resolve(__dirname, 'src');

export default defineConfig({
  resolve: {
    alias: {
      'react-i18next': path.resolve(srcDir, 'shims/react-i18next.ts'),
      '@': srcDir,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
