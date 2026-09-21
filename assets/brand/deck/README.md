# coracure — Brand Identity & Art Direction, Volume 01

A 70-page, 1440×810 landscape brand deck, modelled on the structure and page grammar of the
Homingo brand deck and populated with Coracure's identity.

## Regenerate

```sh
node build.mjs        # -> coracure-brand-deck.html  (self-contained, fonts embedded)
```

Then print to PDF:

```sh
chrome --headless=new --no-pdf-header-footer --run-all-compositor-stages-before-draw \
  --print-to-pdf=coracure-brand-deck.pdf file:///<abs-path>/coracure-brand-deck.html
```

## Layout

| File | Role |
|---|---|
| `lib.mjs` | Page grammar, CSS system, asset inlining |
| `pages-a.mjs` | 001–036 — cover, contents, Brand, Logo, Colour |
| `pages-b.mjs` | 037–070 — Type, Elements, Product, Applications, colophon |
| `build.mjs` | Renders the page list into one HTML file |
| `logo/` | The 15 lockups with the opaque background rect stripped (transparent knockouts) |
| `specimen/` | Outfit and Inter specimens, extracted as vector from the identity master |
| `fonts/` | Local display + body type families, installed and applied at build time |

## Sources

- **Identity master** — `CORACURE - BRAND GUIDELINES.pdf` (2026 rebrand, confidential).
  Logo lockups, colourways, the two greens, the two typefaces and the misuse rules are
  transcribed from it and must not be altered here.
- **Product tokens** — `apps/doctor/src/theme/brand.ts`. Parts 03, 04 and 06 quote its real
  values (palette chrome, spacing, radius, type sizes), so the deck and the apps cannot drift.

Strategy (Part 01), elements (Part 05) and applications (Part 07) are authored for Volume 01 —
they are not in the identity master.

## Note on the heading typeface

The deck uses **Outfit** for headings and **Inter** for interface and body text. These are the working
system fonts for the deck and should be installed locally wherever the brand is applied. The previous
rounded/monserrat language has been replaced to keep the deck aligned with the product direction.
