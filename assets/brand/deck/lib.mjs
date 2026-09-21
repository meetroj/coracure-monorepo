/**
 * coracure — Brand Identity & Art Direction, Volume 01
  * Framework: assets, page grammar and CSS for the deck.
 *
 * Sources of truth:
 *   - "CORACURE - BRAND GUIDELINES.pdf" (2026 rebrand) — logo, colour, typography, misuse.
 *   - apps/doctor/src/theme/brand.ts — live product tokens quoted verbatim in Parts 03/04/06.
 *
 * Structure and page grammar follow the Homingo brand deck.
 *
 *   node build.mjs      ->  coracure-brand-deck.html
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ------------------------------- assets ---------------------------------- */

const fontFace = (family, weight, style = 'normal') =>
  `@font-face{font-family:${family};font-style:${style};font-weight:${weight};font-display:block;` +
  `src:local('${family}'),local('${family}-Regular'),local('Segoe UI'),local('Arial');}`;

const FONTS = [
  fontFace('Outfit', 400),
  fontFace('Outfit', 500),
  fontFace('Outfit', 600),
  fontFace('Outfit', 700),
  fontFace('Outfit', 800),
  fontFace('Inter', 300),
  fontFace('Inter', 400),
  fontFace('Inter', 500),
  fontFace('Inter', 600),
  fontFace('Inter', 700),
  fontFace('Inter', 800),
  fontFace('Inter', 400, 'italic'),
].join('');

/* Inline SVG, with every internal id rewritten so repeated instances cannot collide. */
let uid = 0;
const svgCache = new Map();
const readSvg = (dir, name) => {
  const k = dir + '/' + name;
  if (!svgCache.has(k)) {
    svgCache.set(k, readFileSync(join(HERE, dir, name), 'utf8').replace(/^﻿/, ''));
  }
  return svgCache.get(k);
};

const inlineSvg = (dir, name, { cls = '', style = '' } = {}) => {
  let s = readSvg(dir, name);
  const n = ++uid;
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    const re = new RegExp(`(["'#])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["')])`, 'g');
    s = s.replace(re, `$1${id}_${n}$2`);
  }
  // Drop the fixed pixel box; sizing comes from CSS so the art scales cleanly.
  s = s.replace(/<svg /, `<svg preserveAspectRatio="xMidYMid meet" class="${cls}" style="${style}" `)
       .replace(/(<svg[^>]*?)\swidth="[^"]*"/, '$1')
       .replace(/(<svg[^>]*?)\sheight="[^"]*"/, '$1');
  return s;
};

const LOGO = {
  mark: (v, o) => inlineSvg('logo', `coracure-mark-${v}.svg`, o),
  stacked: (v, o) => inlineSvg('logo', `coracure-stacked-${v}.svg`, o),
  wide: (v, o) => inlineSvg('logo', `coracure-wide-${v}.svg`, o),
};
const SPEC = (n, o) => inlineSvg('specimen', `${n}.svg`, o);

/* -------------------------------- pages ---------------------------------- */

const PAGES = [];
/** @param {{foot?:string, tone?:'light'|'dark'|'bare', body:string}} p */
const page = (p) => PAGES.push(p);

/* ------------------------------- helpers --------------------------------- */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** Letterspaced micro-label, as used throughout the deck. */
const eb = (t, cls = '') => `<div class="eb ${cls}">${t}</div>`;
/** Page header: heavy title left, spaced caption right. */
const head = (title, right = '') =>
  `<div class="hd"><h1 class="ttl">${title}</h1>${right ? `<div class="eb hd-r">${right}</div>` : ''}</div>`;
/** Label / value rows on a hairline grid. */
const spec = (rows, cls = '') =>
  `<dl class="spec ${cls}">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
/** Footer strip metric blocks. */
const stats = (items, cls = '') =>
  `<div class="stats ${cls}">${items
    .map((i) => `<div class="stat${i.hl ? ' hl' : ''}">${eb(i.k)}<div class="stat-v">${i.v}</div>${
      i.n ? `<div class="stat-n">${i.n}</div>` : ''}</div>`)
    .join('')}</div>`;
/** Numbered principle / step rows. */
const numbered = (items) =>
  `<div class="nums">${items
    .map((i) => `<div class="num"><span class="num-i">${i.n}</span><div><div class="num-t">${i.t}</div>` +
      `<div class="num-b">${i.b}</div></div></div>`)
    .join('')}</div>`;
/** Left editorial column: eyebrow, two-line display, standfirst. */
const lede = (kicker, display, body, extra = '') =>
  `<div class="lede">${kicker ? eb(kicker) : ''}<div class="disp">${display}</div>` +
  `${body ? `<p class="lede-b">${body}</p>` : ''}${extra}</div>`;

const tick = '<span class="mk ok">&#10003;</span>';
const cross = '<span class="mk no">&#10005;</span>';

/* --------------------------------- CSS ----------------------------------- */

const CSS = `
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --surfie:#0E766C;      /* Surfie Green  · PANTONE 328 C  — brand */
  --paris:#34D499;       /* Paris Green   · PANTONE 3385 C — brand */
  --ink:#1C1C1C; --ink-m:#5A6B67; --ink-f:#8A9995;
  --paper:#F7FBF9; --mint:#EFFDF8; --sel:#E7F7F0; --line:#E4EEEA; --white:#fff;
  --near:#1A1A18;        /* mono ground, per the identity master */
  --font-display:"Outfit","Segoe UI",sans-serif;
  --font-body:"Inter","Segoe UI",sans-serif;
  --pad:60px;
}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{background:#5c6b66;font-family:var(--font-body);color:var(--ink);
  font-feature-settings:"kern" 1;text-rendering:geometricPrecision}

.pg{position:relative;width:1440px;height:810px;overflow:hidden;background:var(--paper);
  page-break-after:always;break-after:page;margin:0 auto}
.pg:last-child{page-break-after:auto;break-after:auto}
.pg.dark{background:var(--surfie);color:var(--white)}
/* the footer band needs to separate from a Surfie ground without introducing a flat black */
.pg.dark .foot{background:rgba(4,42,38,.34);border-top:1px solid rgba(255,255,255,.16)}
.pg.green{background:var(--surfie);color:var(--white)}
.in{position:absolute;inset:0;padding:var(--pad) var(--pad) 84px}

/* ------ page furniture ------ */
.foot{position:absolute;left:0;right:0;bottom:0;height:40px;background:var(--surfie);
  display:flex;align-items:center;padding:0 22px;color:rgba(255,255,255,.72)}
.foot .fm{width:13px;height:13px;opacity:.85;display:block}
.foot .fl{flex:1;text-align:center;font-size:7.5px;letter-spacing:.34em;font-weight:600}
.foot .fn{font-size:7.5px;letter-spacing:.26em;font-weight:600;width:60px;text-align:right}
.foot .fs{width:60px}

.eb{font-size:8.5px;letter-spacing:.26em;text-transform:uppercase;font-weight:600;color:var(--ink-f)}
.dark .eb,.green .eb{color:rgba(255,255,255,.55)}
.hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
.ttl{font-size:23px;font-weight:800;letter-spacing:-.005em;text-transform:uppercase;font-family:var(--font-display)}
.hd-r{padding-top:4px}

/* ------ editorial ------ */
.lede{max-width:392px}
.disp{font-size:47px;line-height:1.02;font-weight:800;letter-spacing:-.028em;text-transform:uppercase;margin:14px 0 18px;font-family:var(--font-display)}
.disp .lo{color:var(--ink-f)}
.dark .disp .lo,.green .disp .lo{color:rgba(255,255,255,.42)}
.disp.g2 .lo{color:var(--paris)}
.lede-b{font-size:12.5px;line-height:1.72;color:var(--ink-m);max-width:360px}
.dark .lede-b,.green .lede-b{color:rgba(255,255,255,.66)}
.big{font-size:76px;line-height:.96;font-weight:800;letter-spacing:-.035em;text-transform:uppercase;font-family:var(--font-display)}
.p{font-size:12.5px;line-height:1.72;color:var(--ink-m)}
.dark .p,.green .p{color:rgba(255,255,255,.66)}
.q{font-size:19px;line-height:1.5;font-weight:600;letter-spacing:-.01em}

/* ------ spec list ------ */
.spec{margin-top:26px}
.spec>div{display:flex;gap:18px;padding:9px 0;border-top:1px solid var(--line);font-size:11px}
.dark .spec>div,.green .spec>div{border-color:rgba(255,255,255,.14)}
.spec>div:last-child{border-bottom:1px solid var(--line)}
.dark .spec>div:last-child,.green .spec>div:last-child{border-color:rgba(255,255,255,.14)}
.spec dt{width:118px;flex:none;font-weight:600}
.spec dd{color:var(--ink-m)}
.dark .spec dd,.green .spec dd{color:rgba(255,255,255,.62)}
.spec.wide dt{width:170px}

/* ------ stat strip ------ */
.stats{position:absolute;left:var(--pad);right:var(--pad);bottom:82px;display:grid;
  grid-template-columns:repeat(4,1fr);gap:26px}
.stats.c3{grid-template-columns:repeat(3,1fr)}
.stats.c5{grid-template-columns:repeat(5,1fr)}
.stat-v{font-size:16px;font-weight:700;margin-top:8px;letter-spacing:-.01em}
.stat-n{font-size:10.5px;line-height:1.6;color:var(--ink-f);margin-top:4px}
.dark .stat-n,.green .stat-n{color:rgba(255,255,255,.5)}
.stat.hl{background:var(--surfie);color:#fff;padding:20px 22px;margin:-20px -22px}
.stat.hl .eb{color:rgba(255,255,255,.55)}
.stat.hl .stat-n{color:rgba(255,255,255,.62)}

/* ------ numbered lists ------ */
.nums{display:grid;gap:0}
.num{display:flex;gap:20px;padding:13px 0;border-top:1px solid var(--line)}
.dark .num{border-color:rgba(255,255,255,.14)}
.num-i{font-size:9px;letter-spacing:.2em;font-weight:700;color:var(--paris);width:26px;flex:none;padding-top:3px}
.num-t{font-size:14px;font-weight:700;letter-spacing:-.01em}
.num-b{font-size:11px;line-height:1.65;color:var(--ink-m);margin-top:3px}
.dark .num-b{color:rgba(255,255,255,.6)}

/* ------ marks ------ */
.mk{font-size:12px;font-weight:700;line-height:1}
.ok{color:var(--surfie)} .no{color:#D94A45}
.dark .ok{color:var(--paris)}

/* ------ generic layout ------ */
.row{display:flex;gap:26px}
.grid{display:grid;gap:26px}
.g2{grid-template-columns:repeat(2,1fr)} .g3{grid-template-columns:repeat(3,1fr)}
.g4{grid-template-columns:repeat(4,1fr)} .g5{grid-template-columns:repeat(5,1fr)}
.g6{grid-template-columns:repeat(6,1fr)} .g8{grid-template-columns:repeat(8,1fr)}
.card{background:var(--white);border:1px solid var(--line);border-radius:18px}
.pad24{padding:24px}
.center{display:flex;align-items:center;justify-content:center}
.col{display:flex;flex-direction:column}
.mt{margin-top:auto}

/* ------ brand textures ------ */
.dots{background-image:radial-gradient(currentColor 1.15px,transparent 1.15px);
  background-size:19px 19px;opacity:.10}
.mesh{background:
  radial-gradient(58% 74% at 22% 24%,rgba(52,212,153,.55),transparent 62%),
  radial-gradient(50% 62% at 82% 16%,rgba(255,255,255,.55),transparent 60%),
  radial-gradient(70% 80% at 72% 88%,rgba(14,118,108,.85),transparent 66%),
  linear-gradient(150deg,#0E766C 0%,#149183 46%,#34D499 100%)}
.mesh-pale{background:
  radial-gradient(60% 70% at 20% 20%,rgba(52,212,153,.34),transparent 64%),
  radial-gradient(60% 70% at 84% 78%,rgba(14,118,108,.20),transparent 62%),
  linear-gradient(150deg,#EFFDF8,#E7F7F0 60%,#D8F2E7)}
.mesh-deep{background:
  radial-gradient(56% 70% at 24% 22%,rgba(14,118,108,.92),transparent 64%),
  radial-gradient(60% 70% at 80% 84%,rgba(52,212,153,.30),transparent 62%),
  linear-gradient(150deg,#0B4F4A,#0E766C 70%,#12645C)}
.grain{position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.22;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>")}

/* ------ logo art sizing ------ */
.art{display:block;width:100%;height:auto}
.hold{display:flex;align-items:center;justify-content:center}
`;

export { PAGES, page, esc, eb, head, spec, stats, numbered, lede, tick, cross, LOGO, SPEC, CSS, inlineSvg };
