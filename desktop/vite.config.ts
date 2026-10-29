import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import http from 'node:http';

/**
 * Dev-only /api proxy that auto-detects the running Next.js backend (3000 or 3001, or the
 * port from env) and re-detects it whenever the current target stops answering.
 * Never targets https://ghostboard.ai. Replies 502 {"error":"BACKEND_OFFLINE"} when nothing runs.
 */
function localBackendProxy(candidates: string[]): Plugin {
  let current: string | null = null;

  const probe = (base: string) =>
    new Promise<boolean>((resolve) => {
      const req = http.get(`${base}/api/health`, { timeout: 700 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });

  const resolveTarget = async (): Promise<string | null> => {
    if (current) return current;
    for (const c of candidates) {
      if (await probe(c)) {
        current = c;
        return c;
      }
    }
    return null;
  };

  return {
    name: 'ghostboard-local-backend-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const fail = () => {
          if (res.headersSent) {
            res.end();
            return;
          }
          res.statusCode = 502;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'BACKEND_OFFLINE' }));
        };
        const target = await resolveTarget();
        if (!target) return fail();

        const u = new URL(target);
        const proxyReq = http.request(
          {
            hostname: u.hostname,
            port: u.port,
            path: req.originalUrl || `/api${req.url}`,
            method: req.method,
            headers: { ...req.headers, host: u.host, origin: target, referer: target },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );
        proxyReq.on('error', () => {
          current = null; // force re-detection on the next request
          fail();
        });
        req.pipe(proxyReq);
      });
    },
  };
}
export default defineConfig(() => {
  const envPort = process.env.BACKEND_PORT || process.env.NEXT_PORT || process.env.PORT;
  const explicit = process.env.VITE_API_URL && !process.env.VITE_API_URL.includes('ghostboard.ai')
    ? [process.env.VITE_API_URL.replace(/\/+$/, '')]
    : [];
  const backendCandidates = Array.from(new Set([
    ...explicit,
    ...(envPort ? [`http://localhost:${envPort}`] : []),
    'http://localhost:3000',
    'http://localhost:3001',
  ]));

  return {
      // Relative base path is MANDATORY for Tauri webview asset loading
      base: './',

      // Source root containing index.html and renderer source code
      root: path.resolve(import.meta.dirname, 'src'),

      plugins: [
        react(),
        tailwindcss(),
        localBackendProxy(backendCandidates),
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



