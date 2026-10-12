import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The panel's type scale is the seven `--text-*` sizes documented at the top of
 * `styles.css`. A rule that writes its own `px` size is how one screen ends up
 * a point bigger than the next, so this fails on it. Reads the sheets as text:
 * no browser is needed to know a rule opted out of the scale.
 */

const SHEETS = ['styles.css', 'shell.css', 'ui/ui.css'];

/** The only sizes allowed to stay literal, each with the reason. */
const ALLOWED = [
  '16px', // touch inputs, so iOS does not zoom on focus
  '40px', // the signature specimen, drawn in a script face
  'clamp(30px, min(3.7vw, 6.2vh), 54px)', // the sign-in hero headline
];

const SCALE = /^var\(--text-(xs|sm|md|lg|xl|xxl|xxxl)\)( !important)?$/;

const sizes = SHEETS.flatMap((file) => {
  const css = readFileSync(join(import.meta.dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/font-size:\s*([^;]+);/g)].map((m) => ({ file, value: m[1].trim() }));
});

describe('type scale', () => {
  it('finds the declarations it is meant to police', () => {
    expect(sizes.length).toBeGreaterThan(100);
  });

  it('writes every font-size as a scale token', () => {
    const off = sizes.filter((s) => !SCALE.test(s.value) && !ALLOWED.includes(s.value));
    expect(off).toEqual([]);
  });

  it('does not use the 10px step', () => {
    expect(sizes.filter((s) => s.value.includes('xxs'))).toEqual([]);
  });
});

/**
 * The weight scale (`--weight-strong` 600, `--weight-medium` 500, `--weight-regular` 400) is the
 * same idea for boldness: 54 of the panel's 61 weights were 600 or 700, split by habit, so nothing
 * read as a heading. A rule names a role. There is no 700.
 */
const WEIGHT = /^var\(--weight-(strong|medium|regular)\)$/;

const weights = SHEETS.flatMap((file) => {
  const css = readFileSync(join(import.meta.dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/font-weight:\s*([^;]+);/g)].map((m) => ({ file, value: m[1].trim() }));
});

describe('weight scale', () => {
  it('finds the declarations it is meant to police', () => {
    expect(weights.length).toBeGreaterThan(40);
  });

  it('writes every font-weight as a weight token, never a bare number', () => {
    expect(weights.filter((w) => !WEIGHT.test(w.value))).toEqual([]);
  });

  it('keeps the three tokens at 600, 500 and 400, and nothing heavier', () => {
    const css = readFileSync(join(import.meta.dirname, 'styles.css'), 'utf8');
    expect(css).toMatch(/--weight-strong:\s*600;/);
    expect(css).toMatch(/--weight-medium:\s*500;/);
    expect(css).toMatch(/--weight-regular:\s*400;/);
  });
});
