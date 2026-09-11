import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './app/App';

/**
 * Browser entry point for the preview.
 *
 * The native entry (`main.tsx`) registers with `AppRegistry` because Metro
 * boots that way. On web there is a DOM node to mount into, so this is a plain
 * React root — the app component itself is identical.
 *
 * See `vite.config.mts` for what does and does not work in the preview.
 */
const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
