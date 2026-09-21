/**
 * coracure — Brand Identity & Art Direction, Volume 01
 * Emits a self-contained 70-page, 1440x810 landscape deck.
 *
 *   node build.mjs   ->  coracure-brand-deck.html
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES, CSS, LOGO } from './lib.mjs';
import './pages-a.mjs';
import './pages-b.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const footMark = LOGO.mark('white', { cls: 'fm' });

const render = (p, i) => {
  const n = String(i + 1).padStart(3, '0');
  const tone = p.tone === 'dark' ? ' dark' : p.tone === 'green' ? ' green' : '';
  const foot = p.foot
    ? `<div class="foot"><div class="fs">${footMark}</div>` +
      `<div class="fl">${p.foot.toUpperCase()}</div><div class="fn">${n}</div></div>`
    : '';
  return `<section class="pg${tone}">${p.body}${foot}</section>`;
};

const html = `<meta charset="utf-8">
<title>coracure — Brand Guidelines</title>
<style>${CSS}
@page{size:1440px 810px;margin:0}
@media screen{body{padding:32px 0;display:flex;flex-direction:column;gap:26px}}
@media print{body{padding:0;background:#fff;gap:0}}
</style>
${PAGES.map(render).join('\n')}
`;

if (PAGES.length !== 70) {
  console.warn(`! expected 70 pages, generated ${PAGES.length}`);
}
writeFileSync(join(HERE, 'coracure-brand-deck.html'), html);
console.log(`ok — ${PAGES.length} pages, ${(html.length / 1024 / 1024).toFixed(2)} MB`);
