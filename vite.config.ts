import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath, URL } from 'node:url'
import { componentTaggerPlugin } from "./src/visual-edits/component-tagger-plugin.js";

// Minimal plugin to log build-time and dev-time errors to console
const logErrorsPlugin = () => ({
  name: "log-errors-plugin",
  // Inject a small client-side script that mirrors Vite overlay errors to console
  transformIndexHtml() {
    return {
      tags: [
        {
          tag: "script",
          injectTo: "head",
          children: `(() => {
            try {
              const logOverlay = () => {
                const el = document.querySelector('vite-error-overlay');
                if (!el) return;
                const root = (el.shadowRoot || el);
                let text = '';
                try { text = root.textContent || ''; } catch (_) {}
                if (text && text.trim()) {
                  const msg = text.trim();
                  // Use console.error to surface clearly in DevTools
                  console.error('[Vite Overlay]', msg);
                  // Also mirror to parent iframe with structured payload
                  try {
                    if (window.parent && window.parent !== window) {
                      window.parent.postMessage({
                        type: 'ERROR_CAPTURED',
                        error: {
                          message: msg,
                          stack: undefined,
                          filename: undefined,
                          lineno: undefined,
                          colno: undefined,
                          source: 'vite.overlay',
                        },
                        timestamp: Date.now(),
                      }, '*');
                    }
                  } catch (_) {}
                }
              };

              const obs = new MutationObserver(() => logOverlay());
              obs.observe(document.documentElement, { childList: true, subtree: true });

              window.addEventListener('DOMContentLoaded', logOverlay);
              // Attempt immediately as overlay may already exist
              logOverlay();
            } catch (e) {
              console.warn('[Vite Overlay logger failed]', e);
            }
          })();`
        }
      ]
    };
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // Exclude server tests - they should be run separately with Node environment
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/server/**',
      '**/*.config.*',
    ],
    // Increase memory limit for tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
        'server/',
      ],
    },
  },
  plugins: [react(), logErrorsPlugin(), mode === 'development' && componentTaggerPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: "::",
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'esbuild', // Use esbuild for faster, less memory-intensive minification
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['recharts'],
    exclude: ['crypto'],
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
}))
// Orchids restart: 1766982667828
