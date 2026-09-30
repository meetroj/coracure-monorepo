import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';

import { applyBrandTheme } from './brand-css';
// The component kit's styles. `styles.css` is linked from index.html and owns
// page chrome; this one travels with the kit in `src/ui`.
import './ui/ui.css';
import './shell.css';
import App from './app/app';

// The brand tokens become CSS custom properties before the first paint, so
// `styles.css` never holds a hex and never drifts from `libs/brand`.
applyBrandTheme();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
