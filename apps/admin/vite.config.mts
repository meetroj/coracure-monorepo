/// <reference types='vitest' />
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

// Dev only. A deployed API sends no CORS header for http://localhost:4201, so a dev page cannot call it
// directly. Set DEV_API_PROXY (e.g. https://api.coracure.in) in .env.local and VITE_API_URL=/api/v1, and the
// dev server forwards /api/v1 to it: the browser only ever talks to localhost. Unset, nothing changes.
const devApiProxy = loadEnv('development', import.meta.dirname, '').DEV_API_PROXY;

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/admin',
  server:{
    port: 4201,
    host: 'localhost',
    ...(devApiProxy
      ? { proxy: { '/api/v1': { target: devApiProxy, changeOrigin: true, secure: true } } }
      : {}),
  },
  preview:{
    port: 4301,
    host: 'localhost',
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // libs/brand imports react-native for a helper this web app never calls; see the shim.
  resolve: {
    alias: { 'react-native': fileURLToPath(new URL('./src/shims/react-native.ts', import.meta.url)) },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/admin',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'admin',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    setupFiles: ['./vitest.setup.ts'],
    // A 450ms skeleton floor under every async screen, on 24 parallel workers: 5s was the margin.
    testTimeout: 15000,
    coverage: {
      reportsDirectory: '../../coverage/apps/admin',
      provider: 'v8' as const,
    }
  },
}));
