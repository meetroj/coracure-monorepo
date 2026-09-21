/** Pages 001–036: cover, contents, Part 01 Brand, Part 02 Logo, Part 03 Colour. */
import { page, eb, head, spec, stats, numbered, lede, tick, cross, LOGO } from './lib.mjs';

/* Part divider — the recurring chapter plate. */
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

/* ═══════════════════════════ 001 · COVER ═══════════════════════════ */
page({
  tone: 'bare',
  body: `<div class="pg-cover" style="position:absolute;inset:0;background:var(--surfie)">
    <div class="dots" style="position:absolute;inset:0;color:#fff"></div>
    <div class="grain"></div>
    <div style="position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column;color:#fff">
      <div style="display:flex;justify-content:space-between">
        <div class="eb" style="color:#fff">Year of rebrand 2026</div>
        <div class="eb" style="color:#fff">Confidential</div>
      </div>
      <div style="margin:auto 0">
        <div style="font-size:132px;line-height:.9;font-weight:800;letter-spacing:-.045em;text-transform:uppercase">
          <span style="color:var(--paris)">Brand</span>
          <span style="color:transparent;-webkit-text-stroke:1.6px rgba(52,212,153,.62)">Guidelines</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div style="font-size:15px;font-weight:700;letter-spacing:.06em;line-height:1.5;text-transform:uppercase">
          A guide to working<br>with the brand
        </div>
        <div style="width:280px">${LOGO.wide('white', { cls: 'art' })}</div>
      </div>
    </div>
  </div>`,
});

/* ═══════════════════════════ 002 · CONTENTS ═══════════════════════════ */
page({
  foot: 'Contents',
  body: `<div class="in">
    ${eb('Contents')}
    <div style="display:flex;gap:80px;margin-top:96px">
      <div style="width:400px;flex:none;padding-top:76px">
        <div class="big">Index</div>
        <p class="p" style="margin-top:18px">Seven parts, seventy pages. Read in order, or jump to the section you need to apply.</p>
        <p class="p" style="margin-top:16px;font-size:10.5px;color:var(--ink-f)">
          Logo, colour and typography are transcribed from the 2026 identity master and may not be
          altered. Strategy, product and application sections are authored for Volume 01.
        </p>
      </div>
      <div style="flex:1">
        ${[
          ['01', 'Brand', '004 — 014'], ['02', 'Logo', '015 — 030'], ['03', 'Colour', '031 — 036'],
          ['04', 'Typography', '037 — 045'], ['05', 'Elements', '046 — 051'],
          ['06', 'Product', '052 — 058'], ['07', 'Applications', '059 — 069'],
        ].map(([n, t, r]) => `<div style="display:flex;align-items:baseline;gap:20px;padding:17px 0;border-bottom:1px solid var(--line)">
            <span style="font-size:16px;font-weight:700;color:var(--ink-f)">${n}</span>
            <span style="font-size:19px;font-weight:600;letter-spacing:-.015em;flex:1">${t}</span>
            <span class="eb">${r}</span>
          </div>`).join('')}
      </div>
    </div>
    <div style="position:absolute;left:60px;bottom:104px;width:46px">${LOGO.mark('surfie', { cls: 'art' })}</div>
  </div>`,
});

/* ═══════════════════════════ 003 · STATEMENT ═══════════════════════════ */
page({
  tone: 'bare', foot: 'Statement',
  body: `<div style="position:absolute;inset:14px 14px 54px;display:flex;gap:14px">
    <div style="flex:1;background:var(--surfie);color:#fff;padding:60px;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden">
      <div class="dots" style="position:absolute;inset:0;color:#fff"></div>
      <div style="position:relative">
        ${eb('Brand statement', '')}
        <div class="disp g2" style="font-size:53px;margin-top:16px">Care that<br>answers.<br><span class="lo">Every time.</span></div>
        <p class="p" style="max-width:340px;color:rgba(255,255,255,.7)">
          Coracure is the assurance that a qualified, verified doctor will answer — quickly, in
          private, and with a record the patient keeps.
        </p>
      </div>
    </div>
    <div style="width:44%;flex:none;position:relative;overflow:hidden" class="mesh-pale">
      <div class="grain"></div>
      <div style="position:absolute;inset:0;padding:52px;display:flex;flex-direction:column;justify-content:flex-end">
        <div class="q" style="color:var(--surfie)">&ldquo;The hardest part of being unwell is not knowing who to ask.&rdquo;</div>
      </div>
    </div>
  </div>`,
});

/* ═══════════════════════ PART 01 · BRAND (004–014) ═══════════════════════ */
divider('01', 'Brand', 'The idea before the identity.',
  ['The name', 'Positioning', 'Manifesto', 'Principles', 'Character', 'Territory', 'Essence', 'Audience', 'Specialities'],
  'Part 01 · Brand');

/* 005 · THE NAME */
page({
  foot: 'The name',
  body: `<div class="in">
    ${eb('01 · The name')}
    <div style="display:flex;gap:70px;margin-top:88px">
      <div style="width:360px;flex:none;padding-top:80px">
        <div class="disp">The<br>name</div>
        <p class="lede-b">Two words folded into one. <em>Cor</em>, the heart — the oldest word for care.
          <em>Cure</em>, the reason a person opens the app at all.</p>
        ${spec([['Case', 'Always lowercase'], ['Form', 'One word, never hyphenated'], ['Voice', 'A reassurance, not a claim']])}
      </div>
      <div style="flex:1;display:flex;flex-direction:column">
        <div style="font-size:108px;font-weight:800;letter-spacing:-.05em;text-align:center;line-height:1">
          <span style="color:var(--surfie)">cora</span><span style="color:var(--paris)">cure</span>
        </div>
        <div style="display:flex;border-top:1px solid var(--ink);margin:12px 40px 0;padding-top:10px">
          <div class="eb" style="flex:1;text-align:center">Cor · the heart</div>
          <div class="eb" style="flex:1;text-align:center">Cure · the answer</div>
        </div>
        <div class="grid g2" style="margin-top:64px">
          <div style="background:var(--surfie);color:#fff;padding:30px;height:186px;display:flex;flex-direction:column;justify-content:flex-end">
            ${eb('Cora')}<div style="font-size:19px;font-weight:600;line-height:1.4;margin-top:10px">The part of medicine<br>that is not clinical.</div>
          </div>
          <div style="background:var(--paris);color:var(--surfie);padding:30px;height:186px;display:flex;flex-direction:column;justify-content:flex-end">
            <div class="eb" style="color:rgba(14,118,108,.66)">Cure</div>
            <div style="font-size:19px;font-weight:600;line-height:1.4;margin-top:10px">The part a patient<br>actually came for.</div>
          </div>
        </div>
      </div>
    </div>
  </div>`,
});

/* 006 · POSITIONING */
page({
  foot: 'Positioning',
  body: `<div class="in">
    ${eb('02 · Positioning')}
    <div style="margin-top:78px;max-width:840px">
      <div class="disp g2" style="font-size:56px">A clinic that<br>behaves like<br><span class="lo">a person.</span></div>
      <p class="p" style="max-width:620px">The category default is a directory: search, scroll, hope. Coracure is fewer choices,
        better made. The patient is not asked to diagnose themselves before they are allowed to speak to someone.</p>
    </div>
    ${stats([
      { k: 'Category', v: 'Doctor consultation platform', n: 'Video, audio and in-person, in one record.' },
      { k: 'Posture', v: 'Calm · Verified · Warm', n: 'Clinical accuracy without clinical coldness.' },
      { k: 'Promise', v: 'A healthier connection', n: 'The tagline is the positioning. Do not rewrite it.' },
      { k: 'Proof', v: 'Approved · Answered · Recorded', n: 'Every claim on this page is testable in-product.' },
    ])}
    <div style="position:absolute;right:60px;top:150px;width:230px;opacity:.9">${LOGO.mark('twotone', { cls: 'art' })}</div>
  </div>`,
});

/* 007 · MANIFESTO */
page({
  tone: 'dark', foot: 'Manifesto',
  body: `<div class="in" style="display:flex;flex-direction:column;justify-content:center">
    ${eb('03 · Manifesto')}
    <div class="disp g2" style="font-size:50px;max-width:900px;margin-top:20px">
      Telling a stranger what is<br>wrong with your body<br><span class="lo">is an act of trust.</span>
    </div>
    <p class="p" style="max-width:560px;font-size:14px">
      Everything Coracure designs — every verification badge, every wait estimate, every prescription and
      every summary — exists to honour that moment.
    </p>
    <p class="p" style="max-width:560px;font-size:14px;margin-top:18px">
      We do not sell access to doctors. We sell the confidence that someone qualified is already listening.
      Care, made answerable.
    </p>
    <div style="position:absolute;right:60px;top:60px;bottom:84px;width:340px;overflow:hidden" class="mesh">
      <div class="grain"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
        <div style="width:150px">${LOGO.mark('paris', { cls: 'art' })}</div>
      </div>
    </div>
  </div>`,
});

/* 008 · PRINCIPLES I */
page({
  foot: 'Principles',
  body: `<div class="in">
    ${head('Nine principles', '04 · The operating ground of the brand')}
    <div style="margin-top:44px">
      ${numbered([
        { n: '01', t: 'Trust', b: 'Every doctor is approved by an administrator before a patient can ever see them.' },
        { n: '02', t: 'Clarity', b: 'Fee, duration and consultation mode are stated before booking, never after.' },
        { n: '03', t: 'Care', b: 'A symptom is not a search query. It is someone frightened at eleven at night.' },
        { n: '04', t: 'Precision', b: 'A case is complete only when advice is finalised and the summary is submitted.' },
        { n: '05', t: 'Calm', b: 'The interface never rushes, upsells or pressures a decision about health.' },
        { n: '06', t: 'Dignity', b: 'A named clinician with a registration number — never an anonymous queue.' },
      ])}
    </div>
    <div style="position:absolute;right:60px;bottom:104px;width:126px;opacity:.12">${LOGO.mark('surfie', { cls: 'art' })}</div>
  </div>`,
});

/* 009 · PRINCIPLES II */
page({
  foot: 'Principles',
  body: `<div class="in" style="display:flex;gap:70px">
    <div style="flex:1;display:flex;flex-direction:column">
      <div>
        ${numbered([
          { n: '07', t: 'Consistency', b: 'The tenth consultation feels exactly like the first.' },
          { n: '08', t: 'Restraint', b: 'We ask for nothing a clinician does not need to answer well.' },
          { n: '09', t: 'Accountability', b: 'If care falls short, the record exists and the escalation is real.' },
        ])}
      </div>
      <div class="mt" style="border-top:1px solid var(--line);padding-top:26px">
          <div class="disp" style="font-size:34px;margin:0">Answer quickly.<br>Listen fully.<br><span class="lo">Write it down.</span></div>
          <p class="p" style="margin-top:16px;max-width:400px">When a design decision is contested, the principle wins.</p>
        </div>
      </div>
      <div style="width:360px;flex:none;background:var(--surfie);color:#fff;padding:44px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden">
        <div class="dots" style="position:absolute;inset:0;color:#fff"></div>
        <div style="position:relative">${eb('The short form')}</div>
        <div style="position:relative">
          <div class="eb" style="color:var(--paris);letter-spacing:.3em">Verified · Answered · Recorded</div>
          <div style="width:76px;margin-top:26px">${LOGO.mark('paris', { cls: 'art' })}</div>
        </div>
      </div>
    </div>
  </div>`,
});

/* 010 · CHARACTER */
page({
  foot: 'Character',
  body: `<div class="in">
    ${head('Character', '05 · What we are, and what we refuse to be')}
    <div class="grid g2" style="margin-top:56px;gap:56px">
      <div>
        ${eb('We are')}
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px">
          ${['Calm', 'Verified', 'Warm', 'Precise', 'Private', 'Understated', 'Accountable', 'Human']
            .map((w) => `<span style="background:var(--sel);color:var(--surfie);font-size:15px;font-weight:600;padding:11px 20px;border-radius:999px">${w}</span>`).join('')}
        </div>
      </div>
      <div>
        ${eb('We are not')}
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px">
          ${['Loud', 'Anonymous', 'Cold', 'Rushed', 'Transactional', 'Discount-led', 'Alarmist', 'Gimmicky']
            .map((w) => `<span style="border:1px solid var(--line);color:var(--ink-f);font-size:15px;font-weight:500;padding:11px 20px;border-radius:999px;text-decoration:line-through;text-decoration-color:rgba(217,74,69,.5)">${w}</span>`).join('')}
        </div>
      </div>
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:126px;border-top:1px solid var(--line);padding-top:24px;display:flex;gap:26px;align-items:flex-start">
      <div class="q" style="flex:1;max-width:560px">A brand in healthcare earns nothing by shouting. It earns everything by being there when it said it would be.</div>
      <div style="width:118px">${LOGO.wide('surfie', { cls: 'art' })}</div>
    </div>
  </div>`,
});

/* 011 · TERRITORY */
page({
  foot: 'Territory',
  body: `<div class="in">
    ${head('We move the category onto better ground', '06 · Territory')}
    <p class="p" style="margin-top:14px;max-width:620px">The shift is always the same: from transaction to relationship, from access to accountability.</p>
    <div style="margin-top:40px">
      <div style="display:flex;gap:26px;padding-bottom:10px">
        <div class="eb" style="flex:1">Not</div><div class="eb" style="width:34px"></div><div class="eb" style="flex:1">But</div>
      </div>
      ${[
        ['Online doctor directory', 'A register of approved clinicians'],
        ['Cheap and instant', 'Fair, private and dependable'],
        ['Teleconsultation', 'Continuity of care'],
        ['Ticket raised', 'A case, seen through'],
        ['Customer support', 'Someone qualified answers'],
        ['Health marketplace', 'A relationship with a doctor'],
      ].map(([a, b]) => `<div style="display:flex;gap:26px;align-items:center;padding:15px 0;border-top:1px solid var(--line)">
          <div style="flex:1;font-size:15px;color:var(--ink-f);text-decoration:line-through;text-decoration-color:rgba(217,74,69,.45)">${a}</div>
          <div style="width:34px;text-align:center;color:var(--paris);font-size:15px">&rarr;</div>
          <div style="flex:1;font-size:15px;font-weight:600;color:var(--surfie)">${b}</div>
        </div>`).join('')}
    </div>
  </div>`,
});

/* 012 · ESSENCE */
page({
  tone: 'dark', foot: 'Essence',
  body: `<div class="in">
    ${eb('07 · Essence')}
    <div style="display:flex;gap:60px;margin-top:36px">
      <div style="flex:1;display:flex;flex-wrap:wrap;align-content:center;gap:14px 26px;max-width:760px">
        ${[['Trusted', 1], ['Quietly clinical', 0], ['Verified', 1], ['Warm', 1], ['Private by default', 0],
          ['Unhurried', 1], ['Precise', 1], ['Everyday medicine', 0], ['Dependable', 1], ['Human scale', 0],
          ['Accountable', 1], ['Understated', 1]]
          .map(([w, big]) => big
            ? `<span style="font-size:34px;font-weight:800;letter-spacing:-.03em;text-transform:uppercase;color:#fff">${w}</span>`
            : `<span style="font-size:16px;font-weight:500;color:var(--paris);font-style:italic">${w}</span>`).join('')}
      </div>
      <div style="width:300px;flex:none;padding-top:40px">
        <div class="q" style="color:var(--paris)">Each word is a room in the same clinic.</div>
        <p class="p" style="margin-top:18px">Together they set the temperature — quiet, exact, hospitable. If a piece of work cannot be
          described with a word on this page, it is off-brand.</p>
      </div>
    </div>
  </div>`,
});

/* 013 · AUDIENCE */
page({
  foot: 'Audience',
  body: `<div class="in">
    ${head('Who we serve', '08 · Two sides, one standard of care')}
    <div class="grid g3" style="margin-top:52px">
      ${[
        { k: 'Primary', t: 'The unwell adult', b: '25–55, urban, phone-first. Wants an answer tonight, not an appointment next week. Returns for the same doctor.', m: '64% of consultations' },
        { k: 'Secondary', t: 'The family carer', b: 'Books on behalf of a parent or child. Needs the record, the prescription and the summary to be shareable.', m: '24% of consultations' },
        { k: 'Supply side', t: 'The doctor', b: 'Admin-approved, never self-registered. Coracure must be the platform they are proud to have their registration number on.', m: 'The brand they practise under' },
      ].map((c) => `<div class="card pad24" style="display:flex;flex-direction:column;min-height:290px">
          ${eb(c.k)}
          <div style="font-size:22px;font-weight:700;letter-spacing:-.02em;margin-top:14px">${c.t}</div>
          <p class="p" style="margin-top:12px;font-size:11.5px">${c.b}</p>
          <div class="mt" style="border-top:1px solid var(--line);padding-top:12px;margin-top:20px">
            <div class="eb" style="color:var(--surfie)">${c.m}</div>
          </div>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;background:var(--sel);padding:20px 24px;display:flex;gap:16px;align-items:center">
      <span class="mk ok">&#10003;</span>
      <div style="font-size:12.5px;color:var(--surfie);font-weight:500">A doctor never browses patients, and a patient never sees an unapproved doctor. The product enforces it; the brand promises it.</div>
    </div>
  </div>`,
});

/* 014 · SPECIALITIES */
page({
  foot: 'Specialities',
  body: `<div class="in">
    ${head('Care categories', '09 · Nine specialities, one standard of care')}
    <div class="grid g5" style="margin-top:52px;gap:18px">
      ${['General physician', 'Cardiology', 'Dermatology', 'Paediatrics', 'Gynaecology',
         'Orthopaedics', 'Psychiatry', 'Nutrition', 'Internal medicine', 'More']
        .map((s, i) => `<div style="${i === 9 ? 'background:var(--surfie);color:#fff' : 'background:var(--white);border:1px solid var(--line)'};border-radius:18px;height:118px;padding:18px;display:flex;flex-direction:column;justify-content:flex-end">
            <div style="font-size:13px;font-weight:600;line-height:1.35;letter-spacing:-.01em">${s}</div>
          </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;display:flex;gap:40px;border-top:1px solid var(--line);padding-top:22px">
      <p class="p" style="flex:1;max-width:480px">Specialities are named in full and in sentence case. Never abbreviate a speciality, and never
        invent one that no approved doctor on the platform actually holds.</p>
      <div style="width:150px">${LOGO.wide('twotone', { cls: 'art' })}</div>
    </div>
  </div>`,
});

/* ═══════════════════════ PART 02 · LOGO (015–030) ═══════════════════════ */
divider('02', 'Logo', 'The sign, and every form it may take.',
  ['Primary', 'Construction', 'Exclusion zone', 'The mark', 'Lockups', 'App icon', 'Colourways', 'Correct use',
   'Incorrect use', 'Responsive', 'Co-branding', 'Sub-marks'],
  'Part 02 · Logo');

/* 016 · PRIMARY LOGO */
page({
  foot: 'Primary logo',
  body: `<div class="in">
    ${eb('Primary logotype')}
    <div style="height:392px;display:flex;align-items:center;justify-content:center;margin-top:12px">
      <div style="width:620px">${LOGO.wide('twotone', { cls: 'art' })}</div>
    </div>
    <div style="display:flex;gap:60px;border-top:1px solid var(--line);padding-top:26px">
      <div style="flex:1;max-width:330px">
        <div style="font-size:15px;font-weight:700">The wide lockup</div>
        <p class="p" style="margin-top:10px;font-size:11.5px">Mark left, wordmark and tagline right. The default in every medium where width allows.</p>
      </div>
      <div style="flex:1;max-width:330px">
        <div style="font-size:15px;font-weight:700">Construction</div>
        <p class="p" style="margin-top:10px;font-size:11.5px">Outfit, lowercase, drawn artwork. The wordmark is never live text and never re-typed.</p>
      </div>
      <div style="flex:1;max-width:330px">
        <div style="font-size:15px;font-weight:700">Formats</div>
        <p class="p" style="margin-top:10px;font-size:11.5px">SVG · EPS · PNG. Two-tone, Surfie, black, white and Paris-on-Surfie masters only.</p>
      </div>
    </div>
  </div>`,
});

/* 017 · CONSTRUCTION */
page({
  foot: 'Construction',
  body: `<div class="in">
    ${eb('Construction')}
    <div style="display:flex;gap:70px;margin-top:56px">
      <div style="width:340px;flex:none;padding-top:40px">
        <div class="disp">Drawn on<br>a circle.</div>
        <p class="lede-b">The mark is a speech bubble, a rotated square and a heart resolved into one form — never three
          elements assembled side by side.</p>
        ${spec([['Field', '26 × 26 units'], ['Bubble', 'Ø 24 units, tail at 225°'], ['Diamond', '17 units, 45° rotation'],
                ['Knockout', '2 units, constant'], ['Heart', 'Seated on the diamond axis']])}
      </div>
      <div style="flex:1;position:relative;background:var(--white);border:1px solid var(--line);border-radius:18px;overflow:hidden">
        <div style="position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:26px 26px;opacity:.85"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
          <div style="position:relative;width:280px;height:280px">
            <div style="position:absolute;inset:0">${LOGO.mark('twotone', { cls: 'art' })}</div>
            <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--paris);opacity:.8"></div>
            <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:var(--paris);opacity:.8"></div>
            <div style="position:absolute;inset:0;border:1px solid rgba(52,212,153,.8);border-radius:50%"></div>
            <div style="position:absolute;inset:14%;border:1px solid rgba(52,212,153,.55);transform:rotate(45deg)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`,
});

/* 018 · EXCLUSION ZONE */
page({
  foot: 'Exclusion zone',
  body: `<div class="in">
    ${eb('Exclusion zone')}
    <div style="display:flex;gap:70px;margin-top:56px">
      <div style="width:340px;flex:none;padding-top:40px">
        <div class="disp">Give it<br>air.</div>
        <p class="lede-b">X equals the height of the mark's heart, applied on all four sides. No type, image, rule or
          page edge may enter this field.</p>
        ${spec([['Clear space', '1X on all sides'], ['Measured from', 'Lockup bounding box'], ['When in doubt', 'Give it more']])}
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center">
        <div style="position:relative;padding:74px">
          <div style="position:absolute;inset:0;border:1px dashed rgba(14,118,108,.42)"></div>
          <div style="position:absolute;inset:74px;border:1px solid rgba(52,212,153,.7)"></div>
          ${['top:0;left:50%;transform:translateX(-50%);width:1px;height:74px',
             'bottom:0;left:50%;transform:translateX(-50%);width:1px;height:74px',
             'left:0;top:50%;transform:translateY(-50%);height:1px;width:74px',
             'right:0;top:50%;transform:translateY(-50%);height:1px;width:74px']
            .map((s) => `<div style="position:absolute;${s};background:var(--paris)"></div>`).join('')}
          ${['top:26px;left:50%;transform:translateX(-50%)', 'bottom:26px;left:50%;transform:translateX(-50%)',
             'left:26px;top:50%;transform:translateY(-50%)', 'right:26px;top:50%;transform:translateY(-50%)']
            .map((s) => `<div style="position:absolute;${s};font-size:11px;font-weight:700;color:var(--surfie);background:var(--paper);padding:2px 5px">X</div>`).join('')}
          <div style="width:420px">${LOGO.wide('twotone', { cls: 'art' })}</div>
        </div>
      </div>
    </div>
  </div>`,
});

/* 019 · MINIMUM SIZE */
page({
  foot: 'Minimum size',
  body: `<div class="in">
    ${head('Minimum size', 'Where the lockup stops and the mark begins')}
    <div style="display:flex;align-items:flex-end;gap:56px;margin-top:78px;height:330px">
      ${[['60 mm +', 300], ['40 mm', 210], ['22 mm · floor', 128], ['12 mm', 74]]
        .map(([l, w], i) => `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:14px">
            <div style="width:${w}px">${LOGO.wide('twotone', { cls: 'art' })}</div>
            <div class="eb" style="${i === 2 ? 'color:var(--surfie)' : ''}">${l}</div>
          </div>`).join('')}
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:14px">
        <div style="width:34px">${LOGO.mark('twotone', { cls: 'art' })}</div>
        <div class="eb">32 px · favicon</div>
      </div>
    </div>
    ${stats([
      { k: 'Print floor', v: '22 mm wide', n: 'Below this the knockout closes and the heart fills in. Switch to the mark.' },
      { k: 'Screen floor', v: '96 px wide', n: 'Never scale the wide lockup below its floor.' },
      { k: 'Mark floor', v: '20 px', n: 'The mark alone holds down to 20 px; below that, do not place a logo.' },
      { k: 'Tagline', v: 'Drops below 40 mm', n: 'Under 40 mm the tagline is illegible — use the wordmark alone.' },
    ])}
  </div>`,
});

/* 020 · LOCKUPS */
page({
  foot: 'Lockups',
  body: `<div class="in">
    ${head('Logo lockups', 'Three approved builds · nothing outside this set')}
    <div class="grid g3" style="margin-top:56px">
      ${[['01 · Mark', 'mark', 140, 'Avatars, app icon, favicon, patterns and any surface under 22 mm.'],
         ['02 · Stacked', 'stacked', 200, 'Square and vertical formats: social profiles, covers, signage.'],
         ['03 · Wide', 'wide', 290, 'The primary. Headers, documents, email, uniform and collateral.']]
        .map(([t, v, w, d]) => `<div>
          <div class="card center" style="height:342px;padding:36px">
            <div style="width:${w}px">${LOGO[v]('twotone', { cls: 'art' })}</div>
          </div>
          <div class="eb" style="margin-top:16px;color:var(--surfie)">${t}</div>
          <p class="p" style="margin-top:8px;font-size:11px">${d}</p>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;border-top:1px solid var(--line);padding-top:20px">
      <p class="p" style="font-size:11.5px">The tagline belongs to the stacked and wide lockups only. It is never set beside the mark on its
        own, never re-typed, and never translated.</p>
    </div>
  </div>`,
});

/* 021 · THE MARK */
page({
  foot: 'The mark',
  body: `<div class="in">
    ${eb('The mark')}
    <div style="display:flex;gap:70px;margin-top:48px">
      <div style="width:340px;flex:none;padding-top:30px">
        <div class="disp">A heart<br>inside a<br><span class="lo">sentence.</span></div>
        <p class="lede-b">Speech bubble, diamond and heart resolved into one form. It reads as a conversation before it
          reads as anything else — which is the whole proposition.</p>
      </div>
      <div style="flex:1">
        <div class="card center" style="height:300px">
          <div style="width:210px">${LOGO.mark('twotone', { cls: 'art' })}</div>
        </div>
        <div class="grid g3" style="margin-top:26px">
          ${[['Reads as', 'Conversation', 'The bubble and its tail — someone is answering.'],
             ['Reads as', 'Care', 'The heart, held at the centre and never on the outside.'],
             ['Reads as', 'Protection', 'The diamond knockout, enclosing without caging.']]
            .map(([k, t, b]) => `<div style="border-top:1px solid var(--line);padding-top:14px">
              ${eb(k)}<div style="font-size:16px;font-weight:700;margin-top:8px">${t}</div>
              <p class="p" style="font-size:11px;margin-top:6px">${b}</p></div>`).join('')}
        </div>
      </div>
    </div>
  </div>`,
});

/* 022 · APP ICON */
page({
  foot: 'App icon',
  body: `<div class="in">
    ${head('App icon', 'Five approved builds · the smallest surface the brand owns')}
    <div class="grid g5" style="margin-top:52px">
      ${[['Primary · Surfie', 'background:var(--surfie)', 'paris', 'Default on both stores'],
         ['Reversed', 'background:var(--white);border:1px solid var(--line)', 'twotone', 'Light-mode alternate'],
         ['Paris', 'background:var(--paris)', 'surfie', 'Campaign and seasonal'],
         ['Deep mesh', '', 'white', 'Dark-mode system icon'],
         ['Mesh', '', 'white', 'Launch and feature moments']]
        .map(([t, bg, v, n], i) => `<div>
          <div class="${i === 3 ? 'mesh-deep' : i === 4 ? 'mesh' : ''}" style="${bg};border-radius:22%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
            ${i >= 3 ? '<div class="grain"></div>' : ''}
            <div style="width:52%;position:relative">${LOGO.mark(v, { cls: 'art' })}</div>
          </div>
          <div class="eb" style="margin-top:14px">${t}</div>
          <p class="p" style="font-size:10.5px;margin-top:5px">${n}</p>
        </div>`).join('')}
    </div>
    <div style="margin-top:34px;border-top:1px solid var(--line);padding-top:20px">
      ${eb('Reduction ladder')}
      <div style="display:flex;align-items:flex-end;gap:34px;margin-top:16px">
        ${[124, 92, 64, 44, 28].map((s) => `<div style="text-align:center">
          <div style="width:${s}px;height:${s}px;background:var(--surfie);border-radius:22%;display:flex;align-items:center;justify-content:center">
            <div style="width:52%">${LOGO.mark('paris', { cls: 'art' })}</div></div>
          <div class="eb" style="margin-top:8px">${s} px</div>
        </div>`).join('')}
        <p class="p" style="font-size:10.5px;max-width:290px;margin-left:auto">Below 28 px the tile is dropped and the mark
          stands alone — the corner radius closes the knockout before the artwork does.</p>
      </div>
    </div>
    ${stats([
      { k: 'Grid', v: 'Symbol at 52%', n: 'Corner radius 22% of tile width — matches iOS and Android masks.' },
      { k: 'Contrast', v: 'Never green on green', n: 'Surfie pairs with Paris or white only; Paris pairs with Surfie.' },
      { k: 'Reduction', v: 'Holds to 28 px', n: 'Below that, the mark alone without a tile.' },
      { k: 'Never', v: 'No wordmark in the tile', n: 'The wordmark is illegible at icon scale. Mark only.' },
    ], 'c4')}
  </div>`,
});

/* 023 · COLOURWAYS */
page({
  foot: 'Colourways',
  body: `<div class="in">
    ${head('Colourways', 'Five permitted · everything else is misuse')}
    <div class="grid g5" style="margin-top:56px">
      ${[['Two-tone on white', 'background:var(--white);border:1px solid var(--line)', 'twotone', 'Default · documents, web'],
         ['Surfie on white', 'background:var(--white);border:1px solid var(--line)', 'surfie', 'One-colour brand print'],
         ['Paris on Surfie', 'background:var(--surfie)', 'paris', 'Covers · signage · apparel'],
         ['White on dark', 'background:var(--near)', 'white', 'Reversed · dark UI'],
         ['Black', 'background:var(--white);border:1px solid var(--line)', 'black', 'Engraving · one-colour']]
        .map(([t, bg, v, n]) => `<div>
          <div style="${bg};height:308px;display:flex;align-items:center;justify-content:center;padding:30px">
            <div style="width:96px">${LOGO.mark(v, { cls: 'art' })}</div>
          </div>
          <div class="eb" style="margin-top:14px;color:var(--surfie)">${t}</div>
          <p class="p" style="font-size:10.5px;margin-top:5px">${n}</p>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;border-top:1px solid var(--line);padding-top:20px;display:flex;gap:16px;align-items:center">
      ${cross}<p class="p" style="font-size:11.5px">The two greens are never swapped inside the mark. Paris is the heart; Surfie is the bubble. Reversing that
        reverses the meaning.</p>
    </div>
  </div>`,
});

/* 024 · CORRECT USE */
page({
  foot: 'Correct use',
  body: `<div class="in">
    ${head('Correct use', 'Six placements that always work')}
    <div class="grid g3" style="margin-top:48px;gap:22px">
      ${[['Two-tone on paper', 'background:var(--white);border:1px solid var(--line)', 'wide', 'twotone'],
         ['Paris on Surfie', 'background:var(--surfie)', 'wide', 'paris'],
         ['White on deep mesh', '', 'wide', 'white'],
         ['Mark on mint tint', 'background:var(--mint)', 'mark', 'twotone'],
         ['Surfie on white', 'background:var(--white);border:1px solid var(--line)', 'stacked', 'surfie'],
         ['White on mesh', '', 'stacked', 'white']]
        .map(([t, bg, l, v], i) => `<div>
          <div class="${i === 2 ? 'mesh-deep' : i === 5 ? 'mesh' : ''}" style="${bg};height:206px;display:flex;align-items:center;justify-content:center;padding:26px;position:relative;overflow:hidden">
            ${i === 2 || i === 5 ? '<div class="grain"></div>' : ''}
            <div style="width:${l === 'mark' ? '68px' : l === 'stacked' ? '112px' : '178px'};position:relative">${LOGO[l](v, { cls: 'art' })}</div>
            <div style="position:absolute;top:10px;right:12px">${tick}</div>
          </div>
          <div class="eb" style="margin-top:11px">${t}</div>
        </div>`).join('')}
    </div>
  </div>`,
});

/* 025 · ON PHOTOGRAPHY */
page({
  tone: 'bare', foot: 'On photography',
  body: `<div style="position:absolute;inset:0" class="mesh-deep">
    <div class="grain"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,50,47,.72),transparent 62%)"></div>
    <div style="position:absolute;inset:0;padding:60px 60px 84px;display:flex;flex-direction:column;color:#fff">
      ${eb('Logo on photography', '')}
      <div class="disp g2" style="margin-top:auto;max-width:560px">Solid white,<br>calmest<br><span class="lo">quadrant.</span></div>
      <p class="p" style="max-width:480px;color:rgba(255,255,255,.72)">
        On imagery the logo is always solid white, never two-tone, placed in the quietest area of the frame, at a minimum
        contrast ratio of 4.5:1 against the pixels beneath it.
      </p>
      <div style="position:absolute;right:60px;top:60px;width:210px">${LOGO.wide('white', { cls: 'art' })}</div>
    </div>
  </div>`,
});

/* 026 · INCORRECT USE I — transcribed from the identity master */
page({
  foot: 'Incorrect use I',
  body: `<div class="in">
    ${head('Incorrect use — I', 'Colour, form and proportion')}
    <div class="grid g4" style="margin-top:52px;gap:26px">
      ${[["Don't swap the colours", 'filter:hue-rotate(0deg)', 'swap'],
         ["Don't change the colours", 'filter:hue-rotate(160deg) saturate(2.4)', ''],
         ["Don't use shadows", 'filter:drop-shadow(0 6px 12px rgba(0,0,0,.55))', ''],
         ["Don't add an outline", '', 'outline'],
         ["Don't flip the logo", 'transform:scaleX(-1)', ''],
         ["Don't add a contour", '', 'contour'],
         ["Don't stretch", 'transform:scaleX(1.42) scaleY(.78)', ''],
         ["Don't rotate", 'transform:rotate(24deg)', '']]
        .map(([t, css, kind]) => `<div>
          <div style="background:var(--white);border:1px solid var(--line);height:206px;display:flex;align-items:center;justify-content:center;position:relative;border-radius:18px;overflow:hidden">
            <div style="position:absolute;top:10px;right:12px;z-index:2">${cross}</div>
            <div style="width:92px;${css}${kind === 'contour' ? ';border:6px solid var(--paris);border-radius:50%;padding:8px;aspect-ratio:1;display:flex;align-items:center' : ''}">
              ${kind === 'swap' ? LOGO.mark('twotone', { cls: 'art', style: 'filter:invert(1) hue-rotate(180deg) saturate(1.6)' })
                : kind === 'outline' ? LOGO.mark('twotone', { cls: 'art', style: 'filter:drop-shadow(0 0 0 #000) drop-shadow(2px 0 0 #000) drop-shadow(-2px 0 0 #000) drop-shadow(0 2px 0 #000) drop-shadow(0 -2px 0 #000)' })
                : LOGO.mark('twotone', { cls: 'art' })}
            </div>
          </div>
          <div class="eb" style="margin-top:12px;color:#D94A45">${t}</div>
        </div>`).join('')}
    </div>
  </div>`,
});

/* 027 · INCORRECT USE II */
page({
  foot: 'Incorrect use II',
  body: `<div class="in">
    ${head('Incorrect use — II', 'Contrast, containment and contamination')}
    <div class="grid g4" style="margin-top:52px;gap:26px">
      ${[["Never green on green", 'background:#149183', 'surfie', ''],
         ["Never on a busy photo", 'background:repeating-linear-gradient(48deg,#7d8f88 0 9px,#4c5b56 9px 18px)', 'twotone', ''],
         ["Never below 4.5:1", 'background:var(--paris)', 'white', ''],
         ["Never in a box it did not ask for", 'background:var(--white);border:1px solid var(--line)', 'twotone', 'box'],
         ["Never re-typed", 'background:var(--white);border:1px solid var(--line)', '', 'retype'],
         ["Never a third colour", 'background:var(--white);border:1px solid var(--line)', 'twotone', 'third'],
         ["Never as a pattern of itself", 'background:var(--white);border:1px solid var(--line)', 'twotone', 'tile'],
         ["Never partially cropped", 'background:var(--white);border:1px solid var(--line)', 'twotone', 'crop']]
        .map(([t, bg, v, kind]) => `<div>
          <div style="${bg};height:206px;display:flex;align-items:center;justify-content:center;position:relative;border-radius:18px;overflow:hidden">
            <div style="position:absolute;top:10px;right:12px;z-index:2">${cross}</div>
            ${kind === 'retype'
              ? `<div style="font-family:var(--font-display);font-size:27px;font-weight:800;color:var(--surfie);letter-spacing:-.02em">coracure</div>`
              : kind === 'tile'
              ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:130px">${Array(9).fill(0).map(() => `<div>${LOGO.mark('twotone', { cls: 'art' })}</div>`).join('')}</div>`
              : kind === 'crop'
              ? `<div style="width:150px;margin-left:-70px">${LOGO.mark('twotone', { cls: 'art' })}</div>`
              : kind === 'box'
              ? `<div style="background:var(--surfie);padding:14px;border-radius:6px;width:118px">${LOGO.mark('twotone', { cls: 'art' })}</div>`
              : kind === 'third'
              ? `<div style="width:92px">${LOGO.mark('twotone', { cls: 'art', style: 'filter:hue-rotate(228deg) saturate(2.2)' })}</div>`
              : `<div style="width:92px">${LOGO.mark(v, { cls: 'art' })}</div>`}
          </div>
          <div class="eb" style="margin-top:12px;color:#D94A45">${t}</div>
        </div>`).join('')}
    </div>
  </div>`,
});

/* 028 · RESPONSIVE */
page({
  foot: 'Responsive',
  body: `<div class="in">
    ${head('Responsive system', 'One identity · many scales · always legible')}
    <div style="margin-top:44px">
      <div style="display:flex;gap:26px;padding-bottom:11px;border-bottom:1px solid var(--line)">
        ${['Context', 'Asset', 'Minimum', 'Clear space', 'Colourway'].map((h, i) =>
          `<div class="eb" style="${i === 0 ? 'width:230px' : 'flex:1'}">${h}</div>`).join('')}
      </div>
      ${[['Website header', 'Wide lockup', '140 px', '1X', 'Two-tone on white'],
         ['Mobile app icon', 'Mark, Paris on Surfie', '180 px', 'Built into grid', 'Paris on Surfie'],
         ['Patient app header', 'Wide lockup', '112 px', '1X', 'Surfie on mint'],
         ['Prescription PDF', 'Stacked, one colour', '28 mm', '1.5X', 'Surfie'],
         ['Clinic signage', 'Stacked, reversed', '400 mm', '2X', 'White on Surfie'],
         ['Coat embroidery', 'Mark only', '26 mm', '1.5X', 'One-colour thread']]
        .map(([a, b, c, d, e]) => `<div style="display:flex;gap:26px;padding:13px 0;border-bottom:1px solid var(--line);font-size:12px">
          <div style="width:230px;font-weight:600">${a}</div>
          <div style="flex:1;color:var(--ink-m)">${b}</div><div style="flex:1;color:var(--ink-m)">${c}</div>
          <div style="flex:1;color:var(--ink-m)">${d}</div><div style="flex:1;color:var(--ink-m)">${e}</div>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:112px;display:flex;align-items:flex-end;gap:40px">
      ${[220, 150, 96, 44].map((w, i) => `<div style="width:${w}px">${i < 3 ? LOGO.wide('twotone', { cls: 'art' }) : LOGO.mark('twotone', { cls: 'art' })}</div>`).join('')}
    </div>
  </div>`,
});

/* 029 · CO-BRANDING */
page({
  foot: 'Co-branding',
  body: `<div class="in">
    ${eb('Co-branding')}
    <div style="display:flex;gap:70px;margin-top:56px">
      <div style="width:340px;flex:none;padding-top:30px">
        <div class="disp">Standing<br>beside a<br><span class="lo">partner.</span></div>
        <p class="lede-b">Hospitals, diagnostic labs and insurers appear beside Coracure — never inside the mark, and
          never sharing its colours.</p>
        ${spec([['Order', 'Coracure first, always'], ['Divider', '1 px · 40% opacity'], ['Clear space', '1X each side of the rule'],
                ['Height', 'Partner mark matches cap height'], ['Never', 'A partner logo in brand green']])}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:26px;justify-content:center">
        ${[['var(--white)', 'twotone', 'var(--line)', 'var(--ink-f)'],
           ['var(--surfie)', 'white', 'rgba(255,255,255,.4)', 'rgba(255,255,255,.75)']]
          .map(([bg, v, rule, fg]) => `<div style="background:${bg};border:1px solid var(--line);height:180px;display:flex;align-items:center;justify-content:center;gap:36px">
            <div style="width:190px">${LOGO.wide(v, { cls: 'art' })}</div>
            <div style="width:1px;height:52px;background:${rule}"></div>
            <div style="font-size:15px;font-weight:600;letter-spacing:.16em;color:${fg}">PARTNER MARK</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`,
});

/* 030 · SUB-MARKS */
page({
  foot: 'Sub-marks',
  body: `<div class="in">
    ${head('Sub-marks &amp; badges', 'Functional, never ornamental')}
    <div class="grid g4" style="margin-top:52px">
      ${[['Verified doctor', 'Applied only to a clinician an administrator has approved.', 'var(--surfie)', '#fff'],
         ['Answered', 'Consultation opened within the stated wait window.', 'var(--paris)', 'var(--surfie)'],
         ['Records kept', 'Prescription and summary stored in the patient\'s history.', 'var(--sel)', 'var(--surfie)'],
         ['Coracure Care', 'The membership tier. This is the only badge permitted in outline.', 'transparent', 'var(--surfie)']]
        .map(([t, b, bg, fg], i) => `<div>
          <div class="center" style="height:242px;background:${bg};${i === 3 ? 'border:1.5px solid var(--surfie)' : ''};border-radius:18px">
            <div style="text-align:center;color:${fg}">
              <div style="width:34px;margin:0 auto 10px">${LOGO.mark(i === 0 ? 'white' : i === 1 ? 'surfie' : 'surfie', { cls: 'art' })}</div>
              <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">${t}</div>
            </div>
          </div>
          <p class="p" style="font-size:11px;margin-top:12px">${b}</p>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;border-top:1px solid var(--line);padding-top:20px">
      <p class="p" style="font-size:11.5px">A badge is a statement of fact the product can prove. If the system cannot verify it, the badge does
        not exist. Badges are never used decoratively, and never in marketing without the underlying check.</p>
    </div>
  </div>`,
});

/* ═══════════════════════ PART 03 · COLOUR (031–036) ═══════════════════════ */
divider('03', 'Colour', 'Two greens, held in strict proportion.',
  ['The palette', 'Neutrals', 'Tints', 'Proportion', 'Contrast', 'Combinations'],
  'Part 03 · Colour');

/* 032 · THE PALETTE */
page({
  foot: 'Palette',
  body: `<div class="in">
    ${head('The palette', 'Two brand greens · one family · no foreign hue')}
    <div style="display:flex;gap:26px;margin-top:44px;height:470px">
      ${[['Surfie Green', '#0E766C', 'R14 G118 B108', 'C84 M18 Y53 K33', 'PANTONE 328 C', '#fff',
          'Primary. Headers, actions, the bubble in the mark, every dark ground.'],
         ['Paris Green', '#34D499', 'R52 G212 B153', 'C73 M0 Y65 K0', 'PANTONE 3385 C', 'var(--surfie)',
          'Accent. The heart in the mark, active states, one moment per surface.']]
        .map(([n, hex, rgb, cmyk, pms, fg, use]) => `<div style="flex:1;background:${hex};color:${fg};padding:30px;display:flex;flex-direction:column">
          <div style="font-size:26px;font-weight:800;letter-spacing:-.02em">${n}</div>
          <div style="font-size:15px;font-weight:600;opacity:.8;margin-top:4px">${hex}</div>
          <div class="mt" style="display:grid;gap:0">
            ${[rgb, cmyk, pms].map((v) => `<div style="font-size:12px;padding:9px 0;border-top:1px solid rgba(255,255,255,.22);opacity:.9">${v}</div>`).join('')}
          </div>
          <p style="font-size:11px;line-height:1.6;opacity:.78;margin-top:18px">${use}</p>
        </div>`).join('')}
      <div style="width:300px;flex:none;display:flex;flex-direction:column;gap:1px">
        <div class="eb" style="margin-bottom:11px">Document neutrals · not brand colours</div>
        ${[['Near black', '#1A1A18', 'Mono lockups only'],
           ['Ink', '#1C1C1C', 'Body copy, headings'],
           ['Ink muted', '#5A6B67', 'Secondary copy'],
           ['Page', '#F7FBF9', 'App and document ground'],
           ['Mint', '#EFFDF8', 'Hero tint, banners'],
           ['Selected', '#E7F7F0', 'Chips, success soft'],
           ['Line', '#E4EEEA', 'Hairlines, dividers'],
           ['White', '#FFFFFF', 'Cards, reversed marks']]
          .map(([n, hex, u]) => `<div style="display:flex;align-items:center;gap:14px;padding:8px 0;border-bottom:1px solid var(--line)">
            <div style="width:28px;height:28px;background:${hex};border:1px solid var(--line);flex:none;border-radius:6px"></div>
            <div style="flex:1"><div style="font-size:11.5px;font-weight:600">${n}</div>
              <div style="font-size:10px;color:var(--ink-f)">${u}</div></div>
            <div style="font-size:10px;color:var(--ink-f);font-weight:600">${hex}</div>
          </div>`).join('')}
      </div>
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:110px">
      <p class="p" style="font-size:11px">Only Surfie and Paris are brand colours. Everything in the third column is interface chrome, quoted from
        <span style="font-weight:600;color:var(--surfie)">apps/doctor/src/theme/brand.ts</span>. Neither list may be extended with a new hue.</p>
    </div>
  </div>`,
});

/* 033 · TINTS */
page({
  foot: 'Tints',
  body: `<div class="in">
    ${eb('Extended range')}
    <div style="display:flex;gap:70px;margin-top:48px">
      <div style="width:330px;flex:none;padding-top:26px">
        <div class="disp">Tints,<br>not new<br><span class="lo">colours.</span></div>
        <p class="lede-b">The palette extends only by tinting the two greens toward white. No new hue family is ever
          introduced, in any medium, for any reason.</p>
        ${spec([['Steps', '90 · 70 · 50 · 30 · 10%'], ['Use', 'Charts, states, depth'], ['Never', 'A new hue family']])}
      </div>
      <div style="flex:1">
        ${[['Surfie ramp', '#0E766C'], ['Paris ramp', '#34D499']].map(([n, base]) => `
          <div style="margin-bottom:30px">
            ${eb(n)}
            <div style="display:flex;gap:4px;margin-top:12px">
              ${[100, 90, 70, 50, 30, 10].map((s) => `<div style="flex:1">
                <div style="height:78px;background:${base};opacity:${s / 100};border-radius:6px"></div>
                <div style="font-size:9.5px;color:var(--ink-f);margin-top:6px;letter-spacing:.1em;font-weight:600">${s * 10}</div>
              </div>`).join('')}
            </div>
          </div>`).join('')}
        <div style="border-top:1px solid var(--line);padding-top:20px">
          ${eb('Functional states · interface only')}
          <div class="grid g4" style="margin-top:14px;gap:14px">
            ${[['Success', '#0E766C'], ['Warning', '#E0972B'], ['Error', '#D94A45'], ['Neutral', '#5A6B67']]
              .map(([n, h]) => `<div style="display:flex;align-items:center;gap:10px">
                <div style="width:20px;height:20px;background:${h};border-radius:5px"></div>
                <div style="font-size:11px"><span style="font-weight:600">${n}</span>
                  <span style="color:var(--ink-f)"> · ${h}</span></div></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`,
});

/* 034 · PROPORTION */
page({
  foot: 'Proportion',
  body: `<div class="in">
    ${head('Calm is a quantity', 'Proportion')}
    <div style="display:flex;height:352px;margin-top:52px;gap:2px">
      ${[['Page', 46, '#F7FBF9', 'var(--ink)'], ['White', 24, '#FFFFFF', 'var(--ink)'],
         ['Mint', 14, '#EFFDF8', 'var(--ink)'], ['Surfie', 13, '#0E766C', '#fff'], ['Paris', 3, '#34D499', 'var(--surfie)']]
        .map(([n, pct, bg, fg]) => `<div style="flex:${pct};background:${bg};${bg === '#FFFFFF' || bg === '#F7FBF9' ? 'border:1px solid var(--line);' : ''}display:flex;align-items:flex-end;padding:12px">
          <div style="color:${fg}">
            <div style="font-size:9px;letter-spacing:.2em;font-weight:700;text-transform:uppercase;opacity:.7">${n}</div>
            <div style="font-size:17px;font-weight:700;margin-top:2px">${pct}%</div>
          </div></div>`).join('')}
    </div>
    ${stats([
      { k: 'Light dominates', v: 'Roughly 70%', n: 'Most of any composition is page or white. Medicine should feel like a clean, bright room.' },
      { k: 'Surfie anchors', v: 'One block', n: 'Deep green appears in one confident area — never scattered across a layout.' },
      { k: 'Paris punctuates', v: 'Three percent', n: 'Findable, never loud. One Paris moment per screen or surface.' },
      { k: 'Never', v: 'Green on green', n: 'Two greens never touch without white, mint or a knockout between them.' },
    ])}
  </div>`,
});

/* 035 · CONTRAST */
page({
  foot: 'Contrast',
  body: `<div class="in">
    ${head('Contrast &amp; access', 'WCAG 2.2 AA minimum · legibility is not a preference')}
    <div class="grid g4" style="margin-top:52px">
      ${[['Ink on page', '#F7FBF9', '#1C1C1C', '15.9:1', 'AAA', 1],
         ['White on Surfie', '#0E766C', '#FFFFFF', '5.2:1', 'AA', 1],
         ['Surfie on mint', '#EFFDF8', '#0E766C', '4.6:1', 'AA', 1],
         ['White on Paris', '#34D499', '#FFFFFF', '1.7:1', 'Fail', 0]]
        .map(([t, bg, fg, r, g, ok]) => `<div>
          <div style="background:${bg};color:${fg};height:266px;border-radius:18px;display:flex;align-items:center;justify-content:center;position:relative;${bg === '#F7FBF9' || bg === '#EFFDF8' ? 'border:1px solid var(--line);' : ''}">
            <div style="font-size:25px;font-weight:700;letter-spacing:-.02em;text-align:center;line-height:1.25">${t.split(' on ')[0]}<br><span style="font-weight:400;opacity:.75">on ${t.split(' on ')[1]}</span></div>
            <div style="position:absolute;top:10px;right:12px">${ok ? tick : cross}</div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:12px">
            <div class="eb">Ratio ${r}</div>
            <div class="eb" style="color:${ok ? 'var(--surfie)' : '#D94A45'}">${g}</div>
          </div>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;background:var(--sel);padding:20px 24px;display:flex;gap:16px;align-items:center">
      ${cross}<div style="font-size:12.5px;color:var(--surfie);font-weight:500">Paris Green never carries text. It is a surface, a fill and an accent — never a foreground colour for
        copy, and never a button label.</div>
    </div>
  </div>`,
});

/* 036 · COMBINATIONS */
page({
  foot: 'Combinations',
  body: `<div class="in">
    ${head('Colour combinations', 'Approved above · never below')}
    <div class="grid g4" style="margin-top:44px;gap:22px">
      ${[['Surfie on white', 'var(--white)', 'var(--surfie)', 1, 'border:1px solid var(--line)'],
         ['White on Surfie', 'var(--surfie)', '#fff', 1, ''],
         ['Surfie on mint', 'var(--mint)', 'var(--surfie)', 1, ''],
         ['Paris on Surfie', 'var(--surfie)', 'var(--paris)', 1, ''],
         ['Paris on white', 'var(--white)', 'var(--paris)', 0, 'border:1px solid var(--line)'],
         ['White on Paris', 'var(--paris)', '#fff', 0, ''],
         ['Surfie on Paris', 'var(--paris)', 'var(--surfie)', 0, ''],
         ['Mint on white', 'var(--white)', 'var(--mint)', 0, 'border:1px solid var(--line)']]
        .map(([t, bg, fg, ok, extra]) => `<div>
          <div style="background:${bg};color:${fg};${extra};height:172px;border-radius:14px;display:flex;align-items:center;justify-content:center;position:relative">
            <div style="font-size:23px;font-weight:700;letter-spacing:-.02em">Aa</div>
            <div style="position:absolute;top:9px;right:11px">${ok ? tick : cross}</div>
          </div>
          <div class="eb" style="margin-top:11px;color:${ok ? 'var(--ink-f)' : '#D94A45'}">${t}</div>
        </div>`).join('')}
    </div>
    <div style="position:absolute;left:60px;right:60px;bottom:118px;border-top:1px solid var(--line);padding-top:20px">
      <p class="p" style="font-size:11.5px">The four below fail contrast, invert the mark's logic, or produce a tint with no contrast against its
        ground. None may be used for type, controls or logos — in any medium.</p>
    </div>
  </div>`,
});
