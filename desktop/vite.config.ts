import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
export default defineConfig(() => {
  const backendPort = process.env.BACKEND_PORT || process.env.NEXT_PORT || process.env.PORT || '3000';
  const backendTarget = process.env.VITE_API_URL || `http://localhost:${backendPort}`;

  return {
      // Relative base path is MANDATORY for Tauri webview asset loading
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
            target: backendTarget,
            changeOrigin: true,
            headers: {
              origin: backendTarget,
              referer: backendTarget,
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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@tauri-apps')) {
              return 'vendor-tauri';
            }
          }
        },
      },
    },
  },
};
});



