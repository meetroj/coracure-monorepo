/** Pages 037–070: Part 04 Type, Part 05 Elements, Part 06 Product, Part 07 Applications, colophon. */
import { page, eb, head, spec, stats, numbered, tick, cross, LOGO, SPEC } from './lib.mjs';

const divider = (n, title, standfirst, contents, foot) =>
  page({
    tone: 'dark', foot,
    body: `<div class="in col">
      ${eb(`Part ${n}`)}
      <div class="big" style="margin-top:16px">${title}</div>
      <p class="p" style="margin-top:20px;max-width:400px">${standfirst}</p>
      <div class="mt" style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px 26px;max-width:900px">
        ${contents.map((c) => `<div class="eb" style="padding:9px 0;border-top:1px solid rgba(255,255,255,.14)">${c}</div>`).join('')}
      </div>
      <div style="position:absolute;right:60px;bottom:104px;width:150px;opacity:.16">${LOGO.mark('white', { cls: 'art' })}</div>
    </div>`,
  });

/* 24px-grid line icons — 2px stroke, round caps, never filled. */
const ICON = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.2V20h13V9.2M9.8 20v-5.6h4.4V20',
  calendar: 'M4 6.5h16v14H4zM4 10.5h16M8.5 3.5v5M15.5 3.5v5',
  folder: 'M3.5 6.5h5.7l2 2.6h9.3v11.4H3.5zM3.5 6.5V4.2h5.7',
  clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17M12 7.4v5l3.4 2',
  user: 'M12 3.6a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8M4.6 20.6c0-4 3.3-6.4 7.4-6.4s7.4 2.4 7.4 6.4',
  video: 'M3.5 6.6h11v10.8h-11zM14.5 10.6l6-3.4v9.6l-6-3.4z',
  phone: 'M7.4 3.8 9.9 8l-2 2.6a12 12 0 0 0 5.5 5.5l2.6-2 4.2 2.5-.6 3a2 2 0 0 1-2.2 1.6C10.6 20.4 3.6 13.4 2.6 5.6A2 2 0 0 1 4.2 3.4z',
  heart: 'M12 20.4C6.6 16.6 3.4 13.5 3.4 9.9a4.4 4.4 0 0 1 8.6-1.4 4.4 4.4 0 0 1 8.6 1.4c0 3.6-3.2 6.7-8.6 10.5z',
  pill: 'M8.4 3.6a4.8 4.8 0 0 1 6.8 6.8l-5 5a4.8 4.8 0 1 1-6.8-6.8zM7 7l7 7',
  document: 'M6 3.5h7.5L18 8v12.5H6zM13.5 3.5V8H18M8.8 12h6.4M8.8 15.6h6.4',
  shield: 'M12 3.2 4.8 6v6c0 4.2 3 7.4 7.2 8.8 4.2-1.4 7.2-4.6 7.2-8.8V6zM8.9 11.8l2.2 2.2 4-4.2',
  wallet: 'M3.6 7.4h16.8v12.2H3.6zM3.6 7.4V4.9h12.9v2.5M16 12.6h4.4v3.6H16a1.8 1.8 0 0 1 0-3.6z',
  id: 'M3.5 5.6h17v12.8h-17zM9 12.2a2 2 0 1 0 0-4 2 2 0 0 0 0 4M6 16.4c0-1.8 1.4-2.8 3-2.8s3 1 3 2.8M14.6 10.4h3.6M14.6 13.6h3.6',
  bell: 'M12 3.4a5.6 5.6 0 0 0-5.6 5.6c0 5-2 6.6-2 6.6h15.2s-2-1.6-2-6.6A5.6 5.6 0 0 0 12 3.4M10.3 19.2a2 2 0 0 0 3.4 0',
  search: 'M11 3.8a7.2 7.2 0 1 0 0 14.4 7.2 7.2 0 0 0 0-14.4M16.2 16.2l4 4',
  chat: 'M3.6 5.4h16.8v11.2H9.2l-5.6 4.2z',
};
const icon = (n, size = 26, color = 'var(--surfie)', sw = 1.7) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${sw}" ` +
  `stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[n]}"/></svg>`;

/* ═══════════════════════ PART 04 · TYPE (037–045) ═══════════════════════ */
divider('04', 'Type', 'Two voices — one reassures, one explains.',
  ['Outfit', 'Inter', 'Pairing', 'App scale', 'Web scale', 'Hierarchy', 'Rules', 'Iconography'],
  'Part 04 · Type');

/* 038 · OUTFIT */
page({
  foot: 'Outfit',
  body: `<div class="in">
    ${eb('Primary typeface · display &amp; headings')}
    <div style="display:flex;gap:60px;margin-top:34px">
      <div style="flex:1">
        <div style="font-size:74px;font-weight:700;letter-spacing:-.04em;color:var(--surfie);line-height:1;font-family:var(--font-display)">Outfit</div>
        <div class="eb" style="margin-top:10px">A geometric display family</div>
        <div style="font-size:31px;font-weight:500;color:var(--ink-f);line-height:1.5;margin-top:26px;letter-spacing:-.01em;font-family:var(--font-display)">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>1234567890 &#8377; &amp; @ % ° ×
        </div>
      </div>
      <div style="width:330px;flex:none;padding-top:26px">
        <p class="p">Outfit carries every headline, screen title and brand statement. It gives the identity a tighter, more contemporary rhythm than the previous rounder system while keeping the tone calm and human.</p>
        ${spec([['Use', 'Headings and titles only'], ['Weights', 'Regular · Medium · Bold'],
                ['Case', 'Sentence case, except labels'], ['Never', 'Body copy, legal, tables'],
                ['Licence', 'Use with local installation']])}
      </div>
    </div>
  </div>`,
});

/* 039 · INTER */
page({
  foot: 'Inter',
  body: `<div class="in">
    ${eb('Secondary typeface · UI &amp; body')}
    <div style="display:flex;gap:60px;margin-top:34px">
      <div style="flex:1">
        <div style="font-size:74px;font-weight:700;letter-spacing:-.03em;color:var(--surfie);line-height:1;font-family:var(--font-body)">Inter</div>
        <div class="eb" style="margin-top:10px">by Rasmus Andersson</div>
        <div style="font-size:31px;font-weight:500;color:var(--ink-f);line-height:1.5;margin-top:26px;letter-spacing:-.01em;font-family:var(--font-body)">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>1234567890 &#8377; &amp; @ % ° ×
        </div>
        <div style="display:flex;gap:26px;margin-top:30px">
          ${[[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extrabold']]
            .map(([w, n]) => `<div><div style="font-size:34px;font-weight:${w};letter-spacing:-.02em;font-family:var(--font-body)">Aa</div>
              <div class="eb" style="margin-top:4px">${w} ${n}</div></div>`).join('')}
        </div>
      </div>
      <div style="width:300px;flex:none;padding-top:26px">
        <p class="p">Inter carries all interface text, body copy, labels, numerals and every clinical detail a
          patient or doctor has to read accurately.</p>
        ${spec([['Use', 'Body, UI, labels, data'], ['Product ceiling', '700 — no heavier in-app'],
                ['800', 'Print and display only'], ['Numerals', 'Lining, tabular in tables'],
                ['Never', 'Below 10 pt, in any medium']])}
      </div>
    </div>
  </div>`,
});

/* 040 · PAIRING */
page({
  foot: 'Pairing',
  body: `<div class="in">
    ${eb('Pairing')}
    <div style="display:flex;gap:70px;margin-top:44px">
      <div style="width:330px;flex:none">
        <div class="disp">One<br>reassures.<br><span class="lo">One explains.</span></div>
        <p class="lede-b">Outfit is always at least 1.6× the Inter beside it. They never sit at the same size —
          that reads as indecision.</p>
        ${spec([['Ratio', 'Outfit &ge; 1.6 × Inter'], ['Measure', '64 characters maximum'],
                ['Mixing', 'One display phrase per page']])}
      </div>
      <div style="flex:1;background:var(--white);border:1px solid var(--line);border-radius:18px;padding:44px;min-height:534px">
        ${eb('Specimen')}
        <div style="font-size:41px;font-weight:800;letter-spacing:-.032em;line-height:1.1;margin-top:16px;color:var(--surfie)">
          A healthier<br>connection.
        </div>
        <p style="font-size:13.5px;line-height:1.8;color:var(--ink-m);margin-top:22px;max-width:520px">
          Every consultation follows the same sequence: the patient describes the concern, an approved doctor
          answers, advice is finalised and a summary is written. The record stays in the patient's history
          permanently, and can be shared with anyone they choose.
        </p>
        <div style="display:flex;gap:44px;margin-top:30px;border-top:1px solid var(--line);padding-top:20px">
          ${[['Duration', '20 minutes'], ['Mode', 'Video · audio · in-person'], ['From', '&#8377;499']]
            .map(([k, v]) => `<div>${eb(k)}<div style="font-size:15px;font-weight:700;margin-top:6px">${v}</div></div>`).join('')}
        </div>
      </div>
    </div>
  </div>`,
});

/* 041 · APP TYPE SCALE */
page({
  foot: 'App type scale',
  body: `<div class="in">
    ${head('Type scale — mobile app', 'iOS &amp; Android · 4 pt baseline grid · Inter')}
    <div style="margin-top:40px">
      <div style="display:flex;gap:20px;padding-bottom:10px;border-bottom:1px solid var(--line)">
        ${[['Specimen', '400px'], ['Token', '1fr'], ['Size / line', '1fr'], ['Weight / track', '1fr'], ['Use', '1.4fr']]
          .map(([h, w]) => `<div class="eb" style="${w.endsWith('px') ? `width:${w}` : `flex:${w.replace('fr', '')}`}">${h}</div>`).join('')}
      </div>
      ${[['How can we help?', 'app/display', '28 / 34', '700 · &minus;2%', 'Hero, onboarding', 28, 700],
         ['Book a consultation', 'app/h1', '24 / 30', '700 · &minus;1.5%', 'Screen title', 24, 700],
         ['Today&rsquo;s appointments', 'app/h2', '20 / 26', '700 · &minus;1%', 'Section, card title', 20, 700],
         ['Dr. Arjun Mehta', 'app/subhead', '16 / 22', '600 · 0', 'List row title', 16, 600],
         ['Cardiologist · MBBS, MD · 8 yrs', 'app/body', '14 / 21', '400 · 0', 'Body, descriptions', 14, 400],
         ['From &#8377;499 · 20 min', 'app/caption', '13 / 18', '400 · 0', 'Meta, helper, fee', 13, 400],
         ['Start consultation', 'app/button', '16 / 22', '700 · +1%', 'All buttons', 16, 700],
         ['AVAILABLE NOW', 'app/label', '11 / 14', '700 · +16%', 'Pills, tabs, status', 11, 700]]
        .map(([s, t, z, w, u, px, fw]) => `<div style="display:flex;gap:20px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)">
          <div style="width:400px;font-size:${px}px;font-weight:${fw};letter-spacing:${t === 'app/label' ? '.16em' : '-.015em'}">${s}</div>
          <div style="flex:1;font-size:11px;color:var(--ink-m)">${t}</div>
          <div style="flex:1;font-size:11px;color:var(--ink-m)">${z}</div>
          <div style="flex:1;font-size:11px;color:var(--ink-m)">${w}</div>
          <div style="flex:1.4;font-size:11px;color:var(--ink-m)">${u}</div>
        </div>`).join('')}
    </div>
    ${stats([
      { k: 'Baseline', v: '4 pt grid', n: 'All line-heights are multiples of 4.' },
      { k: 'Min body', v: '14 pt', hl: true, n: 'Clinical copy is never smaller — accessibility floor.' },
      { k: 'Touch target', v: '44 × 44 pt', n: 'Including icon-only controls.' },
      { k: 'Dynamic type', v: 'Scales to 200%', n: 'Layouts reflow; nothing truncates.' },
    ])}
  </div>`,
});

/* 042 · WEB TYPE SCALE */
page({
  foot: 'Web type scale',
  body: `<div class="in">
    ${head('Type scale — website', 'Desktop 1440 · 8 px baseline · Outfit + Inter')}
    <div style="margin-top:36px">
      <div style="display:flex;gap:20px;padding-bottom:10px;border-bottom:1px solid var(--line)">
        ${[['Specimen', '440px'], ['Token', '1'], ['Size / line', '1'], ['Weight / track', '1.2'], ['Use', '1.2']]
          .map(([h, w]) => `<div class="eb" style="${w.endsWith('px') ? `width:${w}` : `flex:${w}`}">${h}</div>`).join('')}
      </div>
      ${[['A healthier connection', 'web/display', '72 / 78', 'Outfit 700 · &minus;3%', 'Hero headline', 46, 800],
         ['Talk to a doctor', 'web/h1', '48 / 54', 'Outfit 700 · &minus;2.5%', 'Page title', 33, 800],
         ['How it works', 'web/h2', '32 / 40', '700 · &minus;1.5%', 'Section heading', 24, 700],
         ['Approved clinicians', 'web/h3', '22 / 30', '700 · &minus;1%', 'Card, sub-section', 18, 700],
         ['Every doctor is verified before a patient can book', 'web/body', '17 / 28', '400 · 0', 'Paragraphs', 15, 400],
         ['Terms apply · consultations from &#8377;499', 'web/small', '14 / 22', '400 · 0', 'Legal, meta', 12.5, 400],
         ['Find a doctor', 'web/button', '16 / 24', '700 · +1%', 'CTAs', 14, 700],
         ['SPECIALITIES', 'web/nav', '11 / 16', '700 · +20%', 'Nav, eyebrows, labels', 11, 700]]
        .map(([s, t, z, w, u, px, fw]) => `<div style="display:flex;gap:20px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
          <div style="width:440px;font-size:${px}px;font-weight:${fw};letter-spacing:${t === 'web/nav' ? '.2em' : '-.02em'};color:${px > 30 ? 'var(--surfie)' : 'var(--ink)'}">${s}</div>
          <div style="flex:1;font-size:11px;color:var(--ink-m)">${t}</div>
          <div style="flex:1;font-size:11px;color:var(--ink-m)">${z}</div>
          <div style="flex:1.2;font-size:11px;color:var(--ink-m)">${w}</div>
          <div style="flex:1.2;font-size:11px;color:var(--ink-m)">${u}</div>
        </div>`).join('')}
    </div>
    ${stats([
      { k: 'Grid', v: '12 col · 1440', n: '96 px gutters, 80 px margins.' },
      { k: 'Measure', v: '64 ch max', n: 'Longer lines break the calm.' },
      { k: 'Breakpoints', v: '1440 · 1024 · 768 · 390', n: 'Display drops to 48 px below 768.' },
      { k: 'Display use', v: 'Hero only', n: 'One display block per page, never in nav or UI.' },
    ])}
  </div>`,
});

/* 043 · HIERARCHY */
page({
  foot: 'Hierarchy',
  body: `<div class="in">
    ${eb('Hierarchy in use')}
    <div style="display:flex;gap:70px;margin-top:44px">
      <div style="width:320px;flex:none">
        <div class="disp">Reading<br>order.</div>
        <p class="lede-b">01 Label orients · 02 Display reassures · 03 Body explains · 04 Meta supports. Never more than
          one voice at a time.</p>
        <p class="p" style="margin-top:16px;font-size:11.5px">If a layout needs a ninth size, the hierarchy is wrong — not the scale.</p>
      </div>
      <div style="flex:1;background:var(--white);border:1px solid var(--line);border-radius:18px;padding:40px;position:relative">
        ${[1, 2, 3, 4].map((n, i) => `<div style="position:absolute;left:-16px;top:${[54, 92, 186, 268][i]}px;font-size:9px;font-weight:700;color:var(--paris)">0${n}</div>`).join('')}
        <div class="eb" style="color:var(--surfie)">Cardiology · video consultation</div>
        <div style="font-size:34px;font-weight:800;letter-spacing:-.03em;line-height:1.12;margin-top:14px;color:var(--surfie)">
          A doctor who has<br>seen this before.
        </div>
        <div style="font-size:15px;font-weight:600;color:var(--ink);margin-top:16px">Twenty minutes, one clinician, one record.</div>
        <p style="font-size:13px;line-height:1.8;color:var(--ink-m);margin-top:14px;max-width:480px">
          Every consultation ends with finalised advice and a written summary. Until both exist the case is not
          complete, and Coracure will not mark it as such.
        </p>
        <div style="display:flex;gap:40px;margin-top:26px;border-top:1px solid var(--line);padding-top:18px">
          ${[['Duration', '20 minutes'], ['Doctor', 'Approved &amp; verified'], ['From', '&#8377;499']]
            .map(([k, v]) => `<div>${eb(k)}<div style="font-size:14px;font-weight:700;margin-top:5px">${v}</div></div>`).join('')}
          <div style="margin-left:auto;background:var(--surfie);color:#fff;font-size:13px;font-weight:700;padding:12px 24px;border-radius:999px">Book now</div>
        </div>
      </div>
    </div>
  </div>`,
});

/* 044 · TYPE RULES */
page({
  foot: 'Type rules',
  body: `<div class="in">
    ${head('Typographic rules', 'Six habits that hold the system together')}
    <div class="grid g2" style="margin-top:44px;gap:26px 56px">
      ${[['Left aligned', 'All body copy ranges left, ragged right.', 'Justified text', 'Creates rivers and uneven colour.'],
         ['Sentence case', 'Headlines and buttons in sentence case.', 'ALL CAPS BODY', 'Caps only for 11 px labels.'],
         ['Tight display', '&minus;2% to &minus;3% above 28 px.', 'L o o s e   d i s p l a y', 'Never letterspace large text.'],
         ['One accent per screen', 'A single display or Paris moment.', 'Accents everywhere', 'Competing emphasis reads as noise.'],
         ['Numbers stay tabular', 'Fees, doses and times align in columns.', 'Proportional in tables', 'Clinical data must never jitter.'],
         ['Full speciality names', '&ldquo;General physician&rdquo;, in full.', 'GP / Derm / Gynae', 'Abbreviations exclude the anxious.']]
        .map(([ot, ob, xt, xb]) => `<div style="display:flex;gap:22px">
          <div style="flex:1;display:flex;gap:11px">${tick}<div>
            <div style="font-size:13px;font-weight:700">${ot}</div>
            <div style="font-size:10.5px;line-height:1.6;color:var(--ink-m);margin-top:4px">${ob}</div></div></div>
          <div style="flex:1;display:flex;gap:11px">${cross}<div>
            <div style="font-size:13px;font-weight:700;color:var(--ink-f)">${xt}</div>
            <div style="font-size:10.5px;line-height:1.6;color:var(--ink-f);margin-top:4px">${xb}</div></div></div>
        </div>`).join('')}
    </div>
  </div>`,
});

/* 045 · ICONOGRAPHY */
page({
  foot: 'Iconography',
  body: `<div class="in">
    ${head('Iconography', '24 px grid · 1.7 px stroke · round caps · never filled')}
    <div class="grid g8" style="margin-top:52px;gap:26px 22px">
      ${Object.keys(ICON).map((n) => `<div style="text-align:center">
        <div class="center" style="height:114px;background:var(--white);border:1px solid var(--line);border-radius:14px">${icon(n, 30)}</div>
        <div class="eb" style="margin-top:10px">${n}</div>
      </div>`).join('')}
    </div>
    ${stats([
      { k: 'Stroke', v: '1.7 px at 24', n: 'Scales with the icon; never re-weighted by hand.' },
      { k: 'Colour', v: 'Surfie or ink', n: 'Paris only on a Surfie ground, never on white.' },
      { k: 'Fill', v: 'Never', n: 'One exception: the heart, when it marks a saved doctor.' },
      { k: 'Metaphor', v: 'Literal', n: 'A clinical product is not the place for clever icons.' },
    ])}
  </div>`,
});

/* ═══════════════════════ PART 05 · ELEMENTS (046–051) ═══════════════════════ */
divider('05', 'Elements', 'Lattice and the tooth of the paper.',
  ['Graphic elements', 'The lattice', 'Application', 'Grain'],
  'Part 05 · Elements');

/* 047 · GRAPHIC ELEMENTS */
page({
  foot: 'Elements',
  body: `<div class="in">
    ${head('Graphic elements', 'Four parts · nothing else is permitted')}
    <div class="grid g4" style="margin-top:52px">
      ${[['The mark', 'The whole identity in one form.', `<div style="width:78px">${LOGO.mark('twotone', { cls: 'art' })}</div>`],
         ['The heart detail', 'Extracted from the mark, never used as an independent element.', `<div style="width:120px;overflow:hidden;height:120px"><div style="width:250px;margin:-64px 0 0 -64px">${LOGO.mark('twotone', { cls: 'art' })}</div></div>`],
         ['The lattice', 'Dot field. Covers, empty states, tints.', `<div style="width:110px;height:110px;position:relative"><div class="dots" style="position:absolute;inset:0;color:var(--surfie);opacity:.55"></div></div>`],
         ['The hairline', 'Divides without decorating. 1 px.', `<div style="width:110px;display:flex;flex-direction:column;gap:15px">${Array(4).fill('<div style="height:1px;background:var(--line)"></div>').join('')}</div>`]]
        .map(([t, b, art]) => `<div>
          <div class="center" style="height:262px;background:var(--white);border:1px solid var(--line);border-radius:18px">${art}</div>
          <div class="eb" style="margin-top:14px;color:var(--surfie)">${t}</div>
          <p class="p" style="font-size:10.5px;margin-top:6px">${b}</p>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;border-top:1px solid var(--line);padding-top:20px">
      <p class="p" style="font-size:11.5px">There is no sixth element. Illustration, mascots, stock iconography, decorative fills and isolated heart marks are all outside the system.</p>
    </div>
  </div>`,
});

/* 048 · THE LATTICE */
page({
  foot: 'The lattice',
  body: `<div class="in">
    ${eb('The lattice')}
    <div style="display:flex;gap:70px;margin-top:44px">
      <div style="width:330px;flex:none">
        <div class="disp">Texture at<br>the edge of<br><span class="lo">visibility.</span></div>
        <p class="lede-b">The dot lattice from the identity master is the brand's only pattern. It gives a surface material
          quality without asking to be looked at.</p>
        ${spec([['Grid', '19 px, square'], ['Dot', '1.15 px radius'], ['Max opacity', '12%'],
                ['Per surface', 'One field only'], ['Layer', 'Always behind content']])}
      </div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
        ${[['On Surfie', 'background:var(--surfie)', '#fff', .1], ['On white', 'background:var(--white);border:1px solid var(--line)', 'var(--surfie)', .16],
           ['On mint', 'background:var(--mint)', 'var(--surfie)', .2], ['On deep mesh', '', '#fff', .14],
           ['On Paris', 'background:var(--paris)', 'var(--surfie)', .22], ['On mesh', '', '#fff', .14]]
          .map(([t, bg, c, o], i) => `<div>
            <div class="${i === 3 ? 'mesh-deep' : i === 5 ? 'mesh' : ''}" style="${bg};height:150px;border-radius:14px;position:relative;overflow:hidden">
              <div class="dots" style="position:absolute;inset:0;color:${c};opacity:${o}"></div>
            </div>
            <div class="eb" style="margin-top:10px">${t}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`,
});

/* 049 · PATTERN IN APPLICATION */
page({
  foot: 'Lattice applied',
  body: `<div class="in">
    ${head('Where the lattice goes', 'Six surfaces · one field each')}
    <div class="grid g3" style="margin-top:48px;gap:22px">
      ${[['Covers &amp; decks', 'Lattice at 10% on Surfie', 'background:var(--surfie)', '#fff', .1],
         ['App empty state', 'Lattice at 16% on mint', 'background:var(--mint)', 'var(--surfie)', .16],
         ['Prescription header', 'Lattice at 8%, white ground', 'background:var(--white);border:1px solid var(--line)', 'var(--surfie)', .12],
         ['Appointment card', 'Lattice behind the fee block', 'background:var(--sel)', 'var(--surfie)', .18],
         ['Clinic signage', 'Lattice on frosted vinyl', '', '#fff', .14],
         ['Social', 'Lattice on mesh, never on photography', '', '#fff', .14]]
        .map(([t, n, bg, c, o], i) => `<div>
          <div class="${i === 4 ? 'mesh-deep' : i === 5 ? 'mesh' : ''}" style="${bg};height:158px;border-radius:16px;position:relative;overflow:hidden">
            <div class="dots" style="position:absolute;inset:0;color:${c};opacity:${o}"></div>
          </div>
          <div style="font-size:13px;font-weight:700;margin-top:12px">${t}</div>
          <p class="p" style="font-size:10.5px;margin-top:4px">${n}</p>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;display:flex;gap:16px;align-items:center;background:var(--sel);padding:18px 22px">
      ${cross}<div style="font-size:12px;color:var(--surfie);font-weight:500">Never lay the lattice over a photograph, over body copy, or over a second pattern.</div>
    </div>
  </div>`,
});

/* 050 · THE GRADIENT */
page({
  foot: 'Gradient',
  body: `<div class="in">
    ${head('The gradient', 'Surfie to Paris · always grained · never flat')}
    <div class="grid g3" style="margin-top:48px">
      ${[['Primary mesh', 'mesh', 'Covers, app splash, hero surfaces.'],
         ['Deep mesh', 'mesh-deep', 'Part dividers, dark campaign, reversed lockups.'],
         ['Pale mesh', 'mesh-pale', 'Light surfaces, poster grounds, packaging.']]
        .map(([t, c, n]) => `<div>
          <div class="${c}" style="height:344px;border-radius:18px;position:relative;overflow:hidden">
            <div class="grain"></div>
          </div>
          <div class="eb" style="margin-top:14px;color:var(--surfie)">${t}</div>
          <p class="p" style="font-size:11px;margin-top:6px">${n}</p>
        </div>`).join('')}
    </div>
    ${stats([
      { k: 'Direction', v: '150°', n: 'Deepest green top-left, Paris falling to the lower right.' },
      { k: 'Stops', v: 'Two greens only', n: 'White may lift a highlight; no third hue enters the ramp.' },
      { k: 'Banding', v: 'Grain fixes it', n: 'Never dither, never posterise, never add a third stop.' },
      { k: 'Type on mesh', v: 'White only', n: 'And only over the darkest third of the field.' },
    ])}
  </div>`,
});

/* 051 · GRAIN */
page({
  tone: 'dark', foot: 'Grain',
  body: `<div class="in">
    ${eb('Grain &amp; texture')}
    <div style="display:flex;gap:70px;margin-top:44px">
      <div style="width:330px;flex:none">
        <div class="disp g2">Nothing in<br>this system<br><span class="lo">is flat.</span></div>
        <p class="lede-b">Every gradient and every dark ground carries a fine monochrome grain. It stops the greens from
          looking synthetic and gives print and screen a common material.</p>
        ${spec([['Type', 'Fractal noise, monochrome'], ['Opacity', '16% light · 22% dark'],
                ['Blend', 'Multiply on light · Overlay on dark'], ['Scale', '160 px tile, never scaled up']])}
      </div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:20px">
        ${[['Mesh · no grain', 'mesh', 0], ['Mesh · grained', 'mesh', 1],
           ['Paris · no grain', '', 0], ['Paris · grained', '', 1]]
          .map(([t, c, g], i) => `<div>
            <div class="${c}" style="${i > 1 ? 'background:var(--paris);' : ''}height:172px;border-radius:14px;position:relative;overflow:hidden">
              ${g ? '<div class="grain"></div>' : ''}
            </div>
            <div class="eb" style="margin-top:10px;${g ? 'color:var(--paris)' : ''}">${t} ${g ? '&#10003;' : ''}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`,
});

/* ═══════════════════════ PART 06 · PRODUCT (052–058) ═══════════════════════ */
divider('06', 'Product', "The apps are the brand's most-used surface.",
  ['Patient home', 'Booking', 'The doctor', 'Availability', 'Components', 'Website', 'Safe areas'],
  'Part 06 · Product');

/* Phone frame helper. */
const phone = (inner, { w = 268, h = 546 } = {}) => `
  <div style="width:${w}px;height:${h}px;background:var(--paper);border:8px solid var(--near);border-radius:34px;
    overflow:hidden;position:relative;flex:none;box-shadow:0 18px 40px rgba(14,118,108,.10)">
    <div style="height:26px;background:var(--paper);display:flex;align-items:center;justify-content:space-between;padding:0 16px">
      <span style="font-size:8px;font-weight:700">9:41</span>
      <span style="font-size:8px;font-weight:700;letter-spacing:.08em">&#9679;&#9679;&#9679;</span>
    </div>
    ${inner}
  </div>`;

const pill = (label, bg, fg) =>
  `<span style="background:${bg};color:${fg};font-size:7.5px;font-weight:700;letter-spacing:.13em;
    text-transform:uppercase;padding:4px 9px;border-radius:999px;white-space:nowrap">${label}</span>`;

/* 053 · PATIENT HOME */
page({
  foot: 'App · patient home',
  body: `<div class="in">
    ${eb('Product · 01')}
    <div style="display:flex;gap:56px;margin-top:34px">
      <div style="width:330px;flex:none;padding-top:20px">
        <div class="disp">The home<br>screen.</div>
        <p class="lede-b">Everything a patient needs within one thumb's reach — the concern, the speciality, and the
          doctor they saw last time.</p>
        ${spec([['Priority', 'Rebook before browse'], ['Specialities', '2 × 3, never scrolled'],
                ['Trust', 'Shown at the point of choice'], ['Ground', 'Page tint · white cards · Surfie action']])}
      </div>
      <div style="flex:1;display:flex;gap:34px;align-items:flex-start">
        ${phone(`
          <div style="padding:12px 14px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="width:74px">${LOGO.wide('surfie', { cls: 'art' })}</div>
              ${icon('bell', 15, 'var(--ink-m)')}
            </div>
            <div style="background:var(--mint);border-radius:16px;padding:13px;margin-top:12px;position:relative;overflow:hidden">
              <div class="dots" style="position:absolute;inset:0;color:var(--surfie);opacity:.14"></div>
              <div style="position:relative">
                <div style="font-size:14px;font-weight:700;color:var(--surfie);letter-spacing:-.02em">How can we help?</div>
                <div style="background:#fff;border:1px solid var(--line);border-radius:11px;padding:8px 10px;margin-top:9px;display:flex;gap:7px;align-items:center">
                  ${icon('search', 12, 'var(--ink-f)')}
                  <span style="font-size:9px;color:var(--ink-f)">Describe your concern</span>
                </div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:15px">
              <span style="font-size:10.5px;font-weight:700">Specialities</span>
              <span style="font-size:8px;color:var(--surfie);font-weight:600">See all</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px">
              ${[['heart', 'Cardiology'], ['user', 'Physician'], ['pill', 'Dermatology'],
                 ['shield', 'Paediatrics'], ['document', 'Reports'], ['chat', 'More']]
                .map(([ic, l]) => `<div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:9px 7px;text-align:center">
                  ${icon(ic, 15)}<div style="font-size:7.5px;font-weight:600;margin-top:5px">${l}</div></div>`).join('')}
            </div>
            <div style="font-size:10.5px;font-weight:700;margin-top:15px">See again</div>
            <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px;margin-top:8px;display:flex;gap:9px;align-items:center">
              <div style="width:30px;height:30px;border-radius:50%;background:var(--sel);color:var(--surfie);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center">AM</div>
              <div style="flex:1">
                <div style="font-size:9.5px;font-weight:700">Dr. Arjun Mehta</div>
                <div style="font-size:7.5px;color:var(--ink-m)">Cardiologist · &#8377;499</div>
              </div>
              ${pill('Available', 'var(--sel)', 'var(--surfie)')}
            </div>
          </div>
          <div style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);display:flex;padding:8px 0 14px">
            ${[['home', 'Home', 1], ['calendar', 'Visits', 0], ['document', 'Records', 0], ['user', 'You', 0]]
              .map(([ic, l, on]) => `<div style="flex:1;text-align:center">
                ${icon(ic, 15, on ? 'var(--surfie)' : 'var(--ink-f)')}
                <div style="font-size:6.5px;font-weight:${on ? 700 : 500};color:${on ? 'var(--surfie)' : 'var(--ink-f)'};margin-top:3px">${l}</div></div>`).join('')}
          </div>`)}
        <div style="flex:1;padding-top:10px">
          ${numbered([
            { n: '01', t: 'The concern comes first', b: 'A search field that asks for symptoms in plain words, never for a speciality the patient must guess.' },
            { n: '02', t: 'Six specialities, no scroll', b: 'A 2 × 3 grid holds the common cases. Everything else lives behind “More”.' },
            { n: '03', t: 'The last doctor is the first card', b: 'Continuity is the product. Rebooking is one tap and never buried in history.' },
            { n: '04', t: 'Nothing enters the safe area', b: 'No content sits under the status bar or the gesture bar, on any screen, on either app.' },
          ])}
        </div>
      </div>
    </div>
  </div>`,
});

/* 054 · BOOKING */
page({
  foot: 'App · booking',
  body: `<div class="in">
    ${eb('Product · 02')}
    <div style="display:flex;gap:56px;margin-top:34px">
      <div style="width:310px;flex:none;padding-top:20px">
        <div class="disp">Booking in<br>three steps.</div>
        <p class="lede-b">Describe it. Choose the doctor. Confirm. Nothing is asked twice, and nothing is asked before it
          is needed.</p>
        ${spec([['Account', 'Not required to browse'], ['Decisions', 'One per screen'],
                ['Fee', 'Stated before confirmation'], ['Cancellation', 'Stated on the same screen']])}
      </div>
      <div style="flex:1;display:flex;gap:26px">
        ${[['01', 'Talk to a doctor today', 'No account required to browse.', `
            <div style="background:var(--mint);border-radius:14px;padding:14px;position:relative;overflow:hidden">
              <div class="dots" style="position:absolute;inset:0;color:var(--surfie);opacity:.14"></div>
              <div style="position:relative;font-size:15px;font-weight:800;color:var(--surfie);letter-spacing:-.025em;line-height:1.2">Talk to a doctor today</div>
              <div style="position:relative;font-size:8.5px;color:var(--ink-m);margin-top:7px;line-height:1.6">Approved clinicians. Video, audio or in person.</div>
            </div>
            <div style="background:var(--surfie);color:#fff;text-align:center;font-size:9.5px;font-weight:700;padding:11px;border-radius:999px;margin-top:12px">Get started</div>`],
           ['02', 'Who should see you?', 'One decision per screen.', `
            ${[['AM', 'Dr. Arjun Mehta', 'Cardiologist · 8 yrs', 'Available', 'var(--sel)', 'var(--surfie)'],
               ['PN', 'Dr. Priya Nair', 'Physician · 12 yrs', 'In 20 min', '#FDF4E5', '#E0972B'],
               ['RS', 'Dr. Rohit Shah', 'Dermatologist · 6 yrs', 'Scheduled', '#EFF3F1', 'var(--ink-m)']]
              .map(([i, n, s, st, bg, fg]) => `<div style="background:#fff;border:1px solid var(--line);border-radius:13px;padding:9px;display:flex;gap:8px;align-items:center;margin-bottom:8px">
                <div style="width:27px;height:27px;border-radius:50%;background:var(--sel);color:var(--surfie);font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center">${i}</div>
                <div style="flex:1"><div style="font-size:9px;font-weight:700">${n}</div>
                  <div style="font-size:7px;color:var(--ink-m)">${s}</div></div>
                ${pill(st, bg, fg)}</div>`).join('')}`],
           ['03', 'Confirmed, with a record', 'Confirmation and record on one screen.', `
            <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;text-align:center">
              <div style="width:34px;margin:0 auto">${LOGO.mark('twotone', { cls: 'art' })}</div>
              <div style="font-size:11px;font-weight:700;margin-top:10px;color:var(--surfie)">Consultation confirmed</div>
              <div style="font-size:8px;color:var(--ink-m);margin-top:5px">Today · 6:40 pm · Video</div>
              <div style="border-top:1px solid var(--line);margin-top:11px;padding-top:9px;display:flex;justify-content:space-between">
                <span style="font-size:8px;color:var(--ink-m)">Dr. Arjun Mehta</span>
                <span style="font-size:8px;font-weight:700">&#8377;499</span>
              </div>
            </div>
            <div style="margin-top:10px;display:flex;gap:6px;justify-content:center">${pill('Paid', 'var(--sel)', 'var(--surfie)')}${pill('Record kept', 'var(--sel)', 'var(--surfie)')}</div>`]]
          .map(([n, t, sub, art]) => `<div style="flex:1">
            <div style="background:var(--paper);border:1px solid var(--line);border-radius:20px;padding:16px;min-height:268px">${art}</div>
            <div class="eb" style="margin-top:14px;color:var(--paris)">${n}</div>
            <div style="font-size:13px;font-weight:700;margin-top:6px">${t}</div>
            <p class="p" style="font-size:10.5px;margin-top:4px">${sub}</p>
          </div>`).join('')}
      </div>
    </div>
  </div>`,
});

/* 055 · THE DOCTOR */
page({
  foot: 'App · the doctor',
  body: `<div class="in">
    ${head('Named, verified, numbered', 'Product · 03 · The screen where trust is won or lost')}
    <div style="display:flex;gap:44px;margin-top:34px">
      <div style="flex:1">
        <p class="p" style="max-width:520px">Every doctor has a photograph, a real name, a speciality and a medical registration
          number. Approval, experience and fee are shown before booking — never discovered afterwards.</p>
        <div style="margin-top:26px">
          ${numbered([
            { n: '01', t: 'Approved, not self-registered', b: 'An administrator creates and approves every clinician. There is no doctor sign-up flow, by design.' },
            { n: '02', t: 'Five checks, shown as one badge', b: 'Identity, registration, documents, an in-person check and bank verification.' },
            { n: '03', t: 'Scope stated up front', b: 'What the consultation includes, and what it cannot — no discovery through the invoice.' },
          ])}
        </div>
        <div class="grid g5" style="margin-top:26px;gap:12px">
          ${[['id', 'Identity'], ['document', 'Registration'], ['folder', 'Documents'], ['user', 'In person'], ['wallet', 'Bank']]
            .map(([ic, l]) => `<div style="background:var(--sel);border-radius:12px;padding:12px 10px;text-align:center">
              ${icon(ic, 17)}<div style="font-size:8.5px;font-weight:700;color:var(--surfie);margin-top:6px">${l}</div>
              <div style="font-size:7px;color:var(--surfie);opacity:.7;margin-top:2px">Verified</div></div>`).join('')}
        </div>
      </div>
      ${phone(`
        <div style="padding:12px 14px">
          <div style="display:flex;gap:10px;align-items:center">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--sel);color:var(--surfie);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">AM</div>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:700;letter-spacing:-.02em">Dr. Arjun Mehta</div>
              <div style="font-size:8px;color:var(--ink-m);margin-top:2px">Cardiologist · MBBS, MD</div>
              <div style="font-size:7px;color:var(--ink-f);margin-top:2px">MCI 12-45892</div>
            </div>
          </div>
          <div style="display:flex;gap:5px;margin-top:10px;flex-wrap:wrap">
            ${pill('Verified doctor', 'var(--sel)', 'var(--surfie)')}${pill('Available now', 'var(--sel)', 'var(--surfie)')}
          </div>
          <div style="display:flex;gap:7px;margin-top:12px">
            ${[['8 yrs', 'Experience'], ['&#8377;499', 'Consultation'], ['20 min', 'Duration']]
              .map(([v, l]) => `<div style="flex:1;background:#fff;border:1px solid var(--line);border-radius:11px;padding:9px 7px;text-align:center">
                <div style="font-size:10px;font-weight:700">${v}</div>
                <div style="font-size:6.5px;color:var(--ink-f);margin-top:2px;letter-spacing:.06em;text-transform:uppercase">${l}</div></div>`).join('')}
          </div>
          <div style="font-size:9.5px;font-weight:700;margin-top:13px">Specialisations</div>
          <div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap">
            ${['Cardiology', 'Internal medicine'].map((s) => pill(s, '#EFF3F1', 'var(--ink-m)')).join('')}
          </div>
          <div style="font-size:9.5px;font-weight:700;margin-top:13px">Consultation modes</div>
          <div style="display:flex;gap:7px;margin-top:6px">
            ${[['video', 'Video'], ['phone', 'Audio'], ['user', 'In person']]
              .map(([ic, l]) => `<div style="flex:1;background:#fff;border:1px solid var(--line);border-radius:11px;padding:8px;text-align:center">
                ${icon(ic, 13)}<div style="font-size:7px;font-weight:600;margin-top:4px">${l}</div></div>`).join('')}
          </div>
        </div>
        <div style="position:absolute;left:12px;right:12px;bottom:16px">
          <div style="background:var(--surfie);color:#fff;text-align:center;font-size:10px;font-weight:700;padding:12px;border-radius:999px">Start consultation · &#8377;499</div>
        </div>`, { h: 500 })}
    </div>
  </div>`,
});

/* 056 · AVAILABILITY */
page({
  foot: 'App · availability',
  body: `<div class="in">
    ${eb('Product · 04')}
    <div style="display:flex;gap:56px;margin-top:34px">
      <div style="width:330px;flex:none;padding-top:16px">
        <div class="disp">Say when<br>you can<br><span class="lo">answer.</span></div>
        <p class="lede-b">Seven live statuses, four chosen by the doctor and three set by the system. A doctor with
          outstanding notes never receives a new instant request.</p>
      </div>
      <div style="flex:1">
        <div class="grid g2" style="gap:34px">
          <div>
            ${eb('Doctor-controlled')}
            <div style="margin-top:14px">
              ${[['Available now', 'var(--sel)', 'var(--surfie)', 'Accepts instant consultation requests.'],
                 ['Scheduled only', '#EFF3F1', 'var(--ink-m)', 'Booked slots honoured; no instant requests.'],
                 ['Paused', '#FDF4E5', '#E0972B', 'A short break. Existing bookings stand.'],
                 ['Offline', '#EFF3F1', 'var(--ink-m)', 'Not visible to patients for instant care.']]
                .map(([l, bg, fg, n]) => `<div style="display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-top:1px solid var(--line)">
                  <div style="width:110px;flex:none">${pill(l, bg, fg)}</div>
                  <div style="font-size:10.5px;color:var(--ink-m);line-height:1.6">${n}</div></div>`).join('')}
            </div>
          </div>
          <div>
            ${eb('System-controlled')}
            <div style="margin-top:14px">
              ${[['Request pending', '#FDF4E5', '#E0972B', 'A patient is waiting for the doctor to accept.'],
                 ['In consultation', 'var(--sel)', 'var(--surfie)', 'Live. No second request can arrive.'],
                 ['Completing notes', '#FDF4E5', '#E0972B', 'Advice or summary outstanding — instant requests blocked.']]
                .map(([l, bg, fg, n]) => `<div style="display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-top:1px solid var(--line)">
                  <div style="width:110px;flex:none">${pill(l, bg, fg)}</div>
                  <div style="font-size:10.5px;color:var(--ink-m);line-height:1.6">${n}</div></div>`).join('')}
            </div>
            <div style="background:var(--sel);border-radius:14px;padding:16px;margin-top:22px">
              <div class="eb" style="color:var(--surfie)">The rule</div>
              <div style="font-size:12px;font-weight:600;color:var(--surfie);margin-top:8px;line-height:1.55">
                A case is clinically complete only when advice is finalised <em>and</em> the summary is submitted.
                The product will not mark it complete on either alone.
              </div>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:26px;margin-top:26px;border-top:1px solid var(--line);padding-top:18px">
          ${[['Appointment states', 'Confirmed · Upcoming · Completed · Cancelled · No-show'],
             ['Case states', 'Complete · Pending · Follow-up · No-show']]
            .map(([k, v]) => `<div style="flex:1">${eb(k)}<div style="font-size:11.5px;font-weight:600;margin-top:7px;color:var(--ink-m)">${v}</div></div>`).join('')}
        </div>
      </div>
    </div>
  </div>`,
});

/* 057 · COMPONENTS */
page({
  foot: 'Components',
  body: `<div class="in">
    ${head('Interface components', 'Radius 8 / 12 / 14 / 18 · pills 999 · one shadow')}
    <div class="grid g4" style="margin-top:44px;gap:34px">
      <div>
        ${eb('Buttons')}
        <div style="display:flex;flex-direction:column;gap:9px;margin-top:14px">
          ${[['Start consultation', 'background:var(--surfie);color:#fff'],
             ['Reschedule', 'background:transparent;color:var(--surfie);border:1.5px solid var(--surfie)'],
             ['Not now', 'background:transparent;color:var(--surfie)'],
             ['Cancel consultation', 'background:#D94A45;color:#fff'],
             ['Disabled', 'background:#EFF3F1;color:var(--ink-f)']]
            .map(([l, s]) => `<div style="${s};text-align:center;font-size:11px;font-weight:700;padding:11px;border-radius:999px">${l}</div>`).join('')}
        </div>
      </div>
      <div>
        ${eb('Inputs')}
        <div style="display:flex;flex-direction:column;gap:9px;margin-top:14px">
          <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 12px;display:flex;gap:8px;align-items:center">
            ${icon('search', 13, 'var(--ink-f)')}<span style="font-size:10.5px;color:var(--ink-f)">Describe your concern</span></div>
          <div style="background:#fff;border:1px solid #D5E4DF;border-radius:14px;padding:10px 12px;font-size:10.5px;color:var(--ink-f)">Date of birth</div>
          <div style="background:#fff;border:1.5px solid var(--surfie);border-radius:14px;padding:10px 12px;font-size:10.5px">12 Mar 1991</div>
          <div style="background:#fff;border:1.5px solid #D94A45;border-radius:14px;padding:10px 12px;font-size:10.5px;color:#D94A45">Required field</div>
        </div>
      </div>
      <div>
        ${eb('Status')}
        <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:14px">
          ${[['Available now', 'var(--sel)', 'var(--surfie)'], ['Confirmed', 'var(--sel)', 'var(--surfie)'],
             ['Request pending', '#FDF4E5', '#E0972B'], ['Completing notes', '#FDF4E5', '#E0972B'],
             ['Completed', '#EFF3F1', 'var(--ink-m)'], ['Cancelled', '#FDECEB', '#D94A45'],
             ['No-show', '#FDECEB', '#D94A45'], ['Follow-up', '#FDF4E5', '#E0972B'],
             ['&#8377;499', '#EFF3F1', 'var(--ink-m)'], ['20 min', '#EFF3F1', 'var(--ink-m)']]
            .map(([l, bg, fg]) => pill(l, bg, fg)).join('')}
        </div>
        <div style="margin-top:20px">${eb('Progress')}
          <div style="height:6px;background:var(--line);border-radius:999px;margin-top:12px;overflow:hidden">
            <div style="width:64%;height:100%;background:var(--paris)"></div></div>
          <div style="font-size:9.5px;color:var(--ink-m);margin-top:7px">3 of 5 documents approved</div>
        </div>
      </div>
      <div>
        ${eb('Cards')}
        <div style="display:flex;flex-direction:column;gap:9px;margin-top:14px">
          ${[['AM', 'Dr. Arjun Mehta', 'Cardiologist · &#8377;499 · 20 min'],
             ['PN', 'Dr. Priya Nair', 'Physician · &#8377;399 · 15 min'],
             ['RS', 'Dr. Rohit Shah', 'Dermatologist · &#8377;599 · 20 min']]
            .map(([i, n, s]) => `<div style="background:#fff;border:1px solid var(--line);border-radius:18px;padding:12px;display:flex;gap:10px;align-items:center;box-shadow:0 2px 10px rgba(14,118,108,.06)">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--sel);color:var(--surfie);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${i}</div>
              <div style="flex:1"><div style="font-size:11px;font-weight:700">${n}</div>
                <div style="font-size:9px;color:var(--ink-m);margin-top:1px">${s}</div></div>
              <span style="color:var(--ink-f);font-size:12px">&rsaquo;</span></div>`).join('')}
        </div>
      </div>
    </div>
    ${stats([
      { k: 'Spacing', v: '4 · 8 · 12 · 16 · 20 · 24 · 32', n: 'An 8 px system with a 4 px half-step.' },
      { k: 'Radius', v: '8 / 12 / 14 / 18 / 999', n: 'Cards 18, inputs 14, pills fully round.' },
      { k: 'Elevation', v: 'One shadow', n: 'Surfie at 6%, y-offset 2, radius 10. Nothing heavier exists.' },
      { k: 'Safe area', v: 'Never rendered into', n: 'No content under the status bar or gesture bar, on any screen.' },
    ])}
  </div>`,
});

/* 058 · WEBSITE */
page({
  foot: 'Website',
  body: `<div class="in">
    ${head('Website system', '12 columns · 1440 max · Outfit hero, Inter everything else')}
    <div style="margin-top:34px;background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;height:398px;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;gap:34px;padding:16px 28px;border-bottom:1px solid var(--line)">
        <div style="width:120px">${LOGO.wide('twotone', { cls: 'art' })}</div>
        <div style="display:flex;gap:26px;flex:1">
          ${['Specialities', 'How it works', 'Pricing', 'For doctors'].map((n) =>
            `<span style="font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-m)">${n}</span>`).join('')}
        </div>
        <div style="background:var(--surfie);color:#fff;font-size:10px;font-weight:700;padding:9px 20px;border-radius:999px">Book now</div>
      </div>
      <div style="flex:1;display:flex">
        <div style="flex:1;padding:44px 28px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:46px;font-weight:800;letter-spacing:-.035em;line-height:1.04;color:var(--surfie)">A healthier<br>connection.</div>
          <p style="font-size:13px;line-height:1.7;color:var(--ink-m);margin-top:18px;max-width:400px">
            Approved doctors for everyday medicine — video, audio or in person, with a record you keep.</p>
          <div style="display:flex;gap:11px;margin-top:22px">
            <div style="background:var(--surfie);color:#fff;font-size:11px;font-weight:700;padding:11px 24px;border-radius:999px">Find a doctor</div>
            <div style="border:1.5px solid var(--surfie);color:var(--surfie);font-size:11px;font-weight:700;padding:11px 24px;border-radius:999px">How it works</div>
          </div>
        </div>
        <div style="width:42%;position:relative;overflow:hidden" class="mesh">
          <div class="grain"></div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
            <div style="width:110px">${LOGO.mark('white', { cls: 'art' })}</div>
          </div>
        </div>
      </div>
    </div>
    ${stats([
      { k: 'Grid', v: '12 col · 1440 max', n: '96 px gutters, 80 px margins.' },
      { k: 'Hero', v: 'Outfit, left-aligned', n: 'Mesh or photography right — never behind the headline.' },
      { k: 'Navigation', v: 'Four items maximum', n: 'One action, always Surfie.' },
      { k: 'Rule', v: 'Two typefaces, one accent', n: 'No carousel, no autoplay, no countdown.' },
    ])}
  </div>`,
});

/* ═══════════════════ PART 07 · APPLICATIONS (059–069) ═══════════════════ */
divider('07', 'Applications', 'Where the brand meets the patient and the door.',
  ['Photography', 'Apparel', 'Uniform', 'Collateral', 'Credentials', 'Clinic spaces', 'Signage',
   'Out-of-home', 'Campaign', 'Social'],
  'Part 07 · Applications');

/* 060 · PHOTOGRAPHY */
page({
  foot: 'Photography',
  body: `<div class="in">
    ${head('Real people. Real rooms. Ordinary light.', 'Photography direction')}
    <div class="grid g3" style="margin-top:40px;gap:20px">
      ${[['Consultation · unposed', 'mesh-deep'], ['Hands · care', 'mesh'], ['Waiting · daylight', 'mesh-pale'],
         ['Detail · instruments', 'mesh'], ['Home · recovery', 'mesh-pale'], ['Clinician · at work', 'mesh-deep']]
        .map(([t, c]) => `<div>
          <div class="${c}" style="height:186px;border-radius:14px;position:relative;overflow:hidden">
            <div class="grain"></div>
            <div style="position:absolute;left:12px;bottom:11px;font-size:8px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.85)">${t}</div>
          </div></div>`).join('')}
    </div>
    ${stats([
      { k: 'Always', v: 'Natural daylight', n: 'Mid-consultation, not posed. Rooms that look lived in.' },
      { k: 'Never', v: 'Stock smiles to camera', n: 'No harsh flash, no empty show-clinics, no stethoscope props.' },
      { k: 'Grade', v: 'Warm neutral', n: 'Greens held true, shadows lifted. No filters.' },
      { k: 'Consent', v: 'Always documented', n: 'No patient likeness is ever used without written consent.' },
    ])}
  </div>`,
});

/* 061 · APPAREL */
page({
  foot: 'Apparel',
  body: `<div class="in">
    ${head('Apparel &amp; uniform', 'Surfie for clinicians · white for front of house')}
    <div class="grid g3" style="margin-top:44px">
      ${[['Scrubs', 'Surfie cotton blend. Mark embroidered left chest at 26 mm; nothing on the back.', 'background:var(--surfie)', 'paris', 74],
         ['Coat', 'White, unbleached. Wide lockup at 34 mm, left chest, one colour thread.', 'background:var(--white);border:1px solid var(--line)', 'twotone', 158],
         ['Kit', 'Lanyard, badge holder, tote. One mark per object — never repeated.', 'background:var(--mint)', 'surfie', 74]]
        .map(([t, b, bg, v, w]) => `<div>
          <div style="${bg};height:268px;border-radius:18px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
            <div class="dots" style="position:absolute;inset:0;color:${v === 'paris' ? '#fff' : 'var(--surfie)'};opacity:.1"></div>
            <div style="width:${w}px;position:relative">${w > 100 ? LOGO.wide(v, { cls: 'art' }) : LOGO.mark(v, { cls: 'art' })}</div>
          </div>
          <div style="font-size:15px;font-weight:700;margin-top:16px">${t}</div>
          <p class="p" style="font-size:11px;margin-top:7px">${b}</p>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;border-top:1px solid var(--line);padding-top:20px">
      <p class="p" style="font-size:11.5px">The brand's most-seen surface is a person. Kit is issued at approval and replaced every twelve months
        so the identity never appears worn out.</p>
    </div>
  </div>`,
});

/* 062 · UNIFORM SPEC */
page({
  foot: 'Uniform',
  body: `<div class="in">
    <div style="display:flex;gap:70px;margin-top:36px">
      <div style="width:360px;flex:none">
        ${eb('Uniform specification')}
        <div class="disp" style="font-size:41px">The brand's<br>most-seen<br>surface is<br><span class="lo">a person.</span></div>
        ${spec([['Garment', 'Cotton blend, no synthetics'], ['Mark', 'Left chest, 26 mm, embroidered'],
                ['Surfie', 'Clinicians and nursing staff'], ['White', 'Reception and coordination'],
                ['Badge', 'Always worn, always visible'], ['Never', 'Slogans, sponsor logos, discounts']], 'wide')}
      </div>
      <div style="flex:1;display:flex;gap:22px;align-items:stretch">
        ${[['Clinical', 'background:var(--surfie)', 'paris', ''], ['Front of house', 'background:#fff;border:1px solid var(--line)', 'twotone', ''],
           ['Field', '', 'white', 'mesh-deep']]
          .map(([t, bg, v, cls]) => `<div style="flex:1;display:flex;flex-direction:column">
            <div class="${cls}" style="${bg};flex:1;border-radius:18px;display:flex;align-items:center;justify-content:center">
              <div style="width:64px">${LOGO.mark(v, { cls: 'art' })}</div></div>
            <div class="eb" style="margin-top:14px">${t}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`,
});

/* 063 · COLLATERAL */
page({
  foot: 'Collateral',
  body: `<div class="in">
    ${head('Collateral &amp; stationery', 'Paper is the first material a patient touches')}
    <div style="display:flex;gap:44px;margin-top:44px">
      <div style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:20px">
        ${[['Card · front', 'background:var(--surfie)', 'paris', 'mark'],
           ['Card · back', 'background:var(--white);border:1px solid var(--line)', 'twotone', 'wide'],
           ['Letterhead', 'background:var(--white);border:1px solid var(--line)', 'twotone', 'wide'],
           ['Prescription', 'background:var(--paper);border:1px solid var(--line)', 'surfie', 'stacked']]
          .map(([t, bg, v, l]) => `<div>
            <div style="${bg};height:132px;border-radius:12px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
              <div class="dots" style="position:absolute;inset:0;color:${v === 'paris' ? '#fff' : 'var(--surfie)'};opacity:.1"></div>
              <div style="width:${l === 'mark' ? '46px' : l === 'stacked' ? '68px' : '112px'};position:relative">${LOGO[l](v, { cls: 'art' })}</div>
            </div>
            <div class="eb" style="margin-top:11px">${t}</div>
          </div>`).join('')}
      </div>
      <div style="width:330px;flex:none">
        ${spec([['Card', '88 × 55 mm, 600 gsm duplex'], ['Stock', 'Uncoated white, Surfie core'],
                ['Print', '2 PMS — 328 C and 3385 C'], ['Finish', 'Blind deboss on the mark'],
                ['Letterhead', 'A4, 120 gsm, 24 mm margin'], ['Prescription', 'A5, pre-numbered, tamper-evident'],
                ['Never', 'CMYK builds of the two greens']], 'wide')}
        <p class="p" style="font-size:11px;margin-top:22px">The mark is debossed, never printed. Texture does the work colour would otherwise have to.</p>
      </div>
    </div>
  </div>`,
});

/* 064 · CREDENTIALS */
page({
  foot: 'Credentials',
  body: `<div class="in">
    ${eb('Identification')}
    <div style="display:flex;gap:56px;margin-top:40px">
      <div style="width:320px;flex:none">
        <div class="disp">What a<br>patient<br>checks in<br><span class="lo">three seconds.</span></div>
        <p class="lede-b">For in-person consultations the badge is the whole brand. It must be verifiable at the door,
          without the app.</p>
      </div>
      <div style="flex:1;display:flex;gap:26px;align-items:flex-start">
        <div style="width:330px;flex:none;background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden">
          <div style="background:var(--surfie);padding:14px;position:relative;overflow:hidden">
            <div class="dots" style="position:absolute;inset:0;color:#fff;opacity:.12"></div>
            <div style="width:134px;position:relative">${LOGO.wide('white', { cls: 'art' })}</div>
          </div>
          <div style="padding:16px">
            <div style="width:68px;height:68px;border-radius:50%;background:var(--sel);color:var(--surfie);font-size:21px;font-weight:700;display:flex;align-items:center;justify-content:center">AM</div>
            <div style="font-size:15px;font-weight:700;margin-top:12px;letter-spacing:-.02em">Dr. Arjun Mehta</div>
            <div style="font-size:10.5px;color:var(--ink-m);margin-top:3px">Cardiologist · MBBS, MD</div>
            <div style="border-top:1px solid var(--line);margin-top:12px;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
              <div><div class="eb">Registration</div><div style="font-size:10.5px;font-weight:600;margin-top:3px">MCI 12-45892</div></div>
              <div style="width:48px;height:48px;background:var(--near);border-radius:5px"></div>
            </div>
          </div>
        </div>
        <div style="flex:1;padding-top:6px">
          ${numbered([
            { n: '01', t: 'Front', b: 'Photograph, full name, speciality, registration number and a QR that resolves to the public profile.' },
            { n: '02', t: 'Back', b: 'Support number, approval date and the guarantee statement, in Inter 8 pt minimum.' },
            { n: '03', t: 'Standard', b: 'Verifiable in under three seconds, at the door, by someone who has never used the app.' },
            { n: '04', t: 'Withdrawal', b: 'A badge is surrendered the moment approval lapses. There is no grace period.' },
          ])}
        </div>
      </div>
    </div>
    ${stats([
      { k: 'Card', v: '86 × 54 mm', n: 'ISO ID-1, 760 micron, matte laminate.' },
      { k: 'Photograph', v: 'Updated every 2 years', n: 'Plain ground, daylight, no uniform in frame.' },
      { k: 'QR', v: 'Resolves to the profile', n: 'Public verification page — no personal data in the code itself.' },
      { k: 'Never', v: 'A badge without approval', n: 'The credential follows the check, never the other way round.' },
    ])}
  </div>`,
});

/* 065 · CLINIC SPACES */
page({
  tone: 'bare', foot: 'Clinic spaces',
  body: `<div style="position:absolute;inset:14px 14px 54px;display:flex;gap:14px">
    <div class="mesh-pale" style="flex:1;position:relative;overflow:hidden">
      <div class="grain"></div>
      <div style="position:absolute;inset:0;padding:52px;display:flex;flex-direction:column;justify-content:space-between">
        ${eb('Clinic &amp; partner spaces')}
        <div>
          <div class="disp" style="color:var(--surfie);font-size:41px">It should feel<br>like the calmest<br>room in the<br><span style="color:var(--paris)">building.</span></div>
          <p class="p" style="max-width:400px">Partner clinics carry Coracure at the reception wall and on the consultation door — nowhere else.
            The space belongs to the clinician; the brand is the assurance around it.</p>
        </div>
        <div style="width:190px">${LOGO.wide('surfie', { cls: 'art' })}</div>
      </div>
    </div>
    <div style="width:38%;flex:none;display:flex;flex-direction:column;gap:14px">
      ${[['Reception wall', 'background:var(--surfie)', 'paris', 'stacked'],
         ['Consultation door', 'background:#fff;border:1px solid var(--line)', 'twotone', 'wide'],
         ['Waiting area', '', 'white', 'mark']]
        .map(([t, bg, v, l], i) => `<div class="${i === 2 ? 'mesh-deep' : ''}" style="${bg};flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
          <div class="dots" style="position:absolute;inset:0;color:${v === 'twotone' ? 'var(--surfie)' : '#fff'};opacity:.1"></div>
          <div style="width:${l === 'mark' ? '58px' : l === 'stacked' ? '104px' : '150px'};position:relative">${LOGO[l](v, { cls: 'art' })}</div>
          <div class="eb" style="position:absolute;left:16px;bottom:12px;color:${v === 'twotone' ? 'var(--ink-f)' : 'rgba(255,255,255,.6)'}">${t}</div>
        </div>`).join('')}
    </div>
  </div>`,
});

/* 066 · SIGNAGE */
page({
  foot: 'Signage',
  body: `<div class="in">
    ${eb('Signage &amp; storefront')}
    <div style="display:flex;gap:56px;margin-top:44px">
      <div style="width:320px;flex:none">
        <div class="disp">Frosted<br>white,<br><span class="lo">eye height.</span></div>
        <p class="lede-b">Coracure signage is quiet by instruction. A clinic that shouts reads as a clinic that needs to.</p>
        ${spec([['Window', 'Frosted vinyl at 85% opacity'], ['Wordmark', '400 mm, centred on the door axis'],
                ['Fascia', 'Halo-lit Surfie letters on white'], ['Never', 'Internally lit boxes'],
                ['Icon strip', 'Four specialities maximum']])}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:22px">
        <div class="mesh-deep" style="border-radius:18px;height:210px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
          <div style="position:absolute;inset:0;background:radial-gradient(60% 90% at 50% 50%,rgba(52,212,153,.24),transparent 70%)"></div>
          <div style="width:280px;position:relative">${LOGO.wide('white', { cls: 'art' })}</div>
          <div class="eb" style="position:absolute;left:20px;bottom:14px;color:rgba(255,255,255,.55)">Fascia · halo-lit</div>
        </div>
        <div style="background:#fff;border:1px solid var(--line);border-radius:18px;height:190px;display:flex;align-items:center;justify-content:center;gap:44px;position:relative">
          <div style="width:150px;opacity:.55">${LOGO.wide('surfie', { cls: 'art' })}</div>
          <div style="display:flex;gap:24px;opacity:.55">
            ${['heart', 'user', 'pill', 'shield'].map((n) => icon(n, 26)).join('')}
          </div>
          <div class="eb" style="position:absolute;left:20px;bottom:14px">Window · frosted vinyl 85%</div>
        </div>
      </div>
    </div>
  </div>`,
});

/* 067 · OUT-OF-HOME I */
page({
  foot: 'Out-of-home I',
  body: `<div class="in">
    ${head('Out-of-home', 'One line · one image · one mark')}
    <div class="grid g3" style="margin-top:44px">
      ${[['Shelter · 6 sheet', 'mesh-pale', 'var(--surfie)', 'A doctor,<br>tonight.', 'Outfit headline, pale ground, room below the fold.'],
         ['Column · wrapped', 'mesh', '#fff', 'A healthier<br>connection.', 'The core line — used where dwell time is longest.'],
         ['Metro · lightbox', 'mesh-deep', '#fff', 'Approved<br>doctors only.', 'Proof-led. Transit and digital only.']]
        .map(([t, c, fg, line, n]) => `<div>
          <div class="${c}" style="height:352px;border-radius:16px;position:relative;overflow:hidden;padding:30px;display:flex;flex-direction:column">
            <div class="grain"></div>
            <div style="position:relative;font-size:27px;font-weight:800;letter-spacing:-.03em;line-height:1.12;color:${fg}">${line}</div>
            <div style="position:relative;margin-top:auto;width:${fg === '#fff' ? '124px' : '124px'}">${LOGO.wide(fg === '#fff' ? 'white' : 'surfie', { cls: 'art' })}</div>
          </div>
          <div class="eb" style="margin-top:14px;color:var(--surfie)">${t}</div>
          <p class="p" style="font-size:10.5px;margin-top:6px">${n}</p>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;border-top:1px solid var(--line);padding-top:20px">
      <p class="p" style="font-size:11.5px">One line, one image, one mark. Never a price, a discount or a claim about outcomes in the same field as
        a brand line.</p>
    </div>
  </div>`,
});

/* 068 · OUT-OF-HOME II */
page({
  foot: 'Out-of-home II',
  body: `<div class="in">
    ${eb('Headline discipline')}
    <div style="display:flex;gap:56px;margin-top:40px">
      <div style="width:330px;flex:none">
        <div class="disp">Six words.<br>No more.</div>
        <p class="lede-b">The mark sits top-left at one-eighth of the panel height. Banners work in pairs — one light,
          one Surfie.</p>
        ${spec([['Headline', 'Six words maximum'], ['Mark', 'Top-left, 1/8 panel height'],
                ['Pairs', 'One pale, one Surfie'], ['The heart', 'May be cropped oversized here, and only here'],
                ['Never', 'A discount beside a brand line']])}
      </div>
      <div style="flex:1;display:flex;gap:22px">
        ${[['mesh-pale', 'var(--surfie)', 'surfie', 'Care that<br>answers.'],
           ['', '#fff', 'white', 'A healthier<br>connection.']]
          .map(([c, fg, v, line], i) => `<div style="flex:1;${i ? 'background:var(--surfie);' : ''}border-radius:16px;position:relative;overflow:hidden;padding:26px;display:flex;flex-direction:column;min-height:330px" class="${c}">
            <div class="grain"></div>
            ${i ? `<div style="position:absolute;right:-70px;bottom:-70px;width:250px;opacity:.22">${LOGO.mark('paris', { cls: 'art' })}</div>` : ''}
            <div style="position:relative;width:96px">${LOGO.wide(v, { cls: 'art' })}</div>
            <div style="position:relative;margin-top:auto;font-size:31px;font-weight:800;letter-spacing:-.032em;line-height:1.1;color:${fg}">${line}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`,
});

/* 069 · CAMPAIGN & SOCIAL */
page({
  foot: 'Campaign',
  body: `<div class="in">
    ${head('Campaign &amp; social', 'Approved lines · a feed that reads as one publication')}
    <div style="display:flex;gap:56px;margin-top:40px">
      <div style="flex:1">
        ${eb('Approved campaign lines')}
        <div style="margin-top:16px">
          ${['A healthier connection.', 'Care that answers.', 'A doctor, tonight.',
             'Approved doctors. Everyday medicine.', 'The record stays yours.', 'Ask sooner.']
            .map((l) => `<div style="padding:12px 0;border-top:1px solid var(--line);font-size:17px;font-weight:600;letter-spacing:-.02em;color:var(--surfie)">${l}</div>`).join('')}
        </div>
        <p class="p" style="margin-top:20px;font-size:11.5px">Never stacked with a second line. Never an exclamation mark. Never beside a discount, a countdown or
          a claim about a cure.</p>
      </div>
      <div style="width:400px;flex:none">
        ${eb('The feed')}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px">
          ${[['mesh', 'white'], ['s', ''], ['p', ''], ['', 'twotone'], ['mesh-deep', 'paris'], ['mesh-deep', ''],
             ['mesh-pale', 'surfie'], ['', 'twotone'], ['mesh', 'white']]
            .map(([c, v]) => `<div class="${c.startsWith('mesh') ? c : ''}" style="${c === 's' ? 'background:var(--surfie);' : c === 'p' ? 'background:var(--paris);' : c ? '' : 'background:#fff;border:1px solid var(--line);'}aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
              ${c.startsWith('mesh') ? '<div class="grain"></div>' : ''}
              <div class="dots" style="position:absolute;inset:0;color:#fff;opacity:.08"></div>
              ${v ? `<div style="width:44%;position:relative">${LOGO.mark(v, { cls: 'art' })}</div>` : ''}
            </div>`).join('')}
        </div>
        <p class="p" style="margin-top:16px;font-size:11px">One mark per post, never two. Three consecutive posts never share a ground colour.</p>
      </div>
    </div>
  </div>`,
});

/* ═══════════════════════════ 070 · COLOPHON ═══════════════════════════ */
page({
  tone: 'bare',
  body: `<div style="position:absolute;inset:0;background:var(--surfie)">
    <div class="dots" style="position:absolute;inset:0;color:#fff"></div>
    <div class="grain"></div>
    <div style="position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column;color:#fff">
      <div style="width:300px">${LOGO.wide('white', { cls: 'art' })}</div>
      <div style="margin:auto 0">
        <div style="font-size:66px;font-weight:800;letter-spacing:-.035em;line-height:1.05">
          A healthier<br><span style="color:var(--paris)">connection.</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid rgba(255,255,255,.2);padding-top:24px">
        <div>
          <div class="eb" style="color:rgba(255,255,255,.6)">Brand identity &amp; art direction · Volume 01 · MMXXVI</div>
          <div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:10px;line-height:1.8">
            Identity master: &ldquo;CORACURE — BRAND GUIDELINES&rdquo;, 2026 rebrand · Confidential.<br>
            Logo design: Karan Mehta. Product tokens: apps/doctor/src/theme/brand.ts.
          </div>
        </div>
        <div class="eb" style="color:rgba(255,255,255,.6)">Confidential</div>
      </div>
    </div>
  </div>`,
});
