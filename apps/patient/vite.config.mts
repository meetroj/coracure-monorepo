/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const workspace = resolve(here, '../..');

/**
 * A browser preview of the patient app, for looking at screens without an
 * emulator.
 *
 * *** THIS IS A PREVIEW, NOT A TARGET WE SHIP. *** The product is two native
 * store listings; `react-native-web` is here so a designer or a reviewer can
 * open a URL. Things that go through a native module do not work in it, and the
 * app is written to degrade rather than crash when they are missing:
 *
 * - **Secure storage.** `react-native-keychain` has no web implementation, so
 *   `tokenStore` catches the failure and holds the session in memory for the
 *   tab's lifetime. Sign-in works; it just does not survive a refresh.
 * - **Camera, microphone and dialling.** The device check reports what the
 *   backend says and nothing more, which is what it does on device too.
 *
 * Metro still owns the native builds. Nothing here changes them.
 */

/**
 * `.svg` imports.
 *
 * Metro handles these with `react-native-svg-transformer`, which has no Vite
 * equivalent installed. Rather than add a dependency for a preview, this reads
 * the file and emits a component that drops the markup into a `div` — on web
 * that is exactly what an inline SVG is, and it keeps the real brand assets
 * rather than substituting a placeholder.
 */
const svgAsComponent = (): Plugin => ({
  name: 'coracure:svg-as-component',
  enforce: 'pre',
  transform(_code, id) {
    const file = id.split('?')[0]!;
    if (!file.endsWith('.svg')) return null;

    // The brand assets are saved with a BOM, which breaks the parse.
    const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    // Let the wrapper decide the size, the way the RN component props do.
    const sized = raw.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block"');

    return {
      code: `import React from 'react';
const RAW = ${JSON.stringify(sized)};
export default function SvgAsset({ width, height, style }) {
  return React.createElement('div', {
    style: { width, height, display: 'inline-block', flexShrink: 0, ...style },
    dangerouslySetInnerHTML: { __html: RAW },
  });
}`,
      map: null,
    };
  },
});

export default defineConfig({
  root: here,
  cacheDir: resolve(workspace, 'node_modules/.vite/patient'),
  plugins: [svgAsComponent(), react()],

  resolve: {
    // `.web.tsx` wins over `.tsx`, which is how react-native-web projects let a
    // file opt out of a native-only implementation.
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: [
      // The whole point: React Native's primitives, rendered to the DOM.
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: /^react-native-svg$/, replacement: 'react-native-svg-web' },
      // The workspace libraries, matching tsconfig.base.json.
      { find: '@coracure/brand', replacement: resolve(workspace, 'libs/brand/src/index.ts') },
      { find: '@coracure/ui', replacement: resolve(workspace, 'libs/ui/src/index.ts') },
      { find: '@coracure/api', replacement: resolve(workspace, 'libs/api/src/index.ts') },
      { find: '@coracure/i18n', replacement: resolve(workspace, 'libs/i18n/src/index.tsx') },
    ],
  },

  define: {
    // React Native's dev flag, which several modules read at import time.
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis',
    // The API base URL. Override with CORACURE_API_URL when pointing the
    // preview at something other than a local backend.
    'process.env.CORACURE_API_URL': JSON.stringify(
      process.env.CORACURE_API_URL ?? 'http://localhost:3000/api/v1',
    ),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },

  optimizeDeps: {
    /**
     * Pre-bundled, because they are CommonJS and need the interop wrapper.
     * `react-native-web` in particular depends on `@react-native/normalize-colors`,
     * which it imports as a default export — leaving that un-optimised throws
     * "does not provide an export named 'default'" at runtime.
     */
    include: ['react', 'react-dom', 'react-native-web', 'react-native-svg-web'],

    /**
     * *** NOT pre-bundled. ***
     *
     * Dependency optimisation resolves imports before `resolve.alias` and
     * `resolve.extensions` apply, so it follows these into
     * `react-native/Libraries/...` — raw Flow source the bundler cannot parse
     * ("Flow is not supported"). Excluding them sends the packages through the
     * normal transform pipeline, where the alias to `react-native-web` and the
     * `.web.js` extension preference both work.
     *
     * This is why `vite build` passes while the dev server did not: the build
     * does not pre-bundle.
     */
    exclude: ['react-native', 'react-native-safe-area-context', 'react-native-keychain'],
  },

  server: {
    port: 4200,
    // `true` binds every interface, so a phone on the same Wi-Fi can open the
    // preview at http://<your-LAN-IP>:4200 — useful for looking at it on a real
    // screen without a build.
    host: true,
    open: true,
  },

  build: {
    outDir: resolve(workspace, 'dist/apps/patient-web'),
    emptyOutDir: true,
  },
});
