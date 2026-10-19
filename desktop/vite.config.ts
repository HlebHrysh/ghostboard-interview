import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  // Relative base path is MANDATORY for Electron file:// protocol asset loading
  base: './',

  // Source root containing index.html and renderer source code
  root: path.resolve(import.meta.dirname, 'src'),

  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@shared': path.resolve(import.meta.dirname, '../src'),
      '@shared-types': path.resolve(import.meta.dirname, '../src/types'),
      '@shared-lib': path.resolve(import.meta.dirname, '../src/lib'),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        headers: {
          origin: 'http://localhost:3001',
          referer: 'http://localhost:3001',
        },
      },
    },
    fs: {
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, '..'),
      ],
    },
  },

  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'src', 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
});
