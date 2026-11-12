import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 20000,
    env: {
      DATABASE_URL: '',
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src'),
      '@shared-types': path.resolve(__dirname, './src/types'),
      '@shared-lib': path.resolve(__dirname, './src/lib'),
      'react': path.resolve(__dirname, './desktop/node_modules/react'),
      'react-dom': path.resolve(__dirname, './desktop/node_modules/react-dom'),
    },
  },
});
