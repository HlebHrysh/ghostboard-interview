import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 20000,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, './desktop/node_modules/react'),
      'react-dom': path.resolve(__dirname, './desktop/node_modules/react-dom'),
    },
  },
});
