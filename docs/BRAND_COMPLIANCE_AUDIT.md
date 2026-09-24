# Patient app — brand compliance audit

Audited 15 September 2026 against *Guidelines – Final-CORACURE.pdf* (Brand
Guidelines 2026). Scope is `apps/patient` plus the shared `libs/ui` and
`libs/brand` it renders through. The doctor app was not audited.

This is a **design-conformance** audit. It is separate from
[PATIENT_DEMO_REVIEW.md](PATIENT_DEMO_REVIEW.md), which covers functional and
user-story acceptance.

## Verdict

The *structure* is right and the *palette application* is not.

`libs/brand` exists, all 31 screens import it, the logo artwork is genuine
vector (not redrawn), and the icon set already follows the deck's construction
rules. But the screens then hardcode a second, unrelated palette on top —
**271 off-brand colour literals across 27 files**, all of them Tailwind CSS
default values rather than CoraCure colours.

The single clearest symptom: **Paris Green `#34D499` appears exactly once in the
entire codebase** — in the token definition itself. It is never applied to
anything. The accent role the deck assigns to Paris Green is being served by
Tailwind's emerald ramp (`#A7F3D0`, `#10B981`, `#059669`) instead.

## Compliant

| Area | Status |
| --- | --- |
| Logo artwork | Vector extractions of the approved master; correct `#0E766C` / `#34D499`. Not redrawn, not recoloured, not stretched. |
| Logo configurations | Symbol, wide and white variants all present and used by context. |
| Icon construction | Monoline, `fill: none`, uniform `strokeWidth: 1.8`, `strokeLinecap`/`strokeLinejoin` `round`. Matches the deck's icon rules closely. |
| Corner geometry | Rounded throughout (`radius.card` 18, `radius.pill`). No sharp boxes beside rounded cards. |
| Gradients | Restrained. Confined to `libs/ui`; the primary button renders flat `colors.surfie`, as the deck's own button example does. |
| Colour proportion | Neutral-dominant layouts with Surfie as anchor — the deck's stated hierarchy. |

## Non-compliant

### 1. A second palette shadows the brand palette — *high*

271 instances across 27 files. Every one is a Tailwind default, not a CoraCure
colour:

| Used | Instances | Should be |
| --- | --- | --- |
| `#E5E7EB` Tailwind gray-200 | 85 | `colors.surface.line` `#E4EEEA` |
| `#F3F4F6` gray-100 | 38 | `colors.surface.mintSoft` |
| `#A7F3D0` emerald-200 | 27 | `colors.paris` `#34D499` |
| `#111827` gray-900 | 21 | `colors.ink` |
| `#DC2626` / `#991B1B` red | 23 | `colors.danger` |
| `#10B981` / `#059669` emerald | 10 | `colors.surfie` / `colors.paris` |

Worst-affected screens: `BookingFlowScreen` (26), `SearchScreen` (22),
`BookFollowUpScreen` (18), `DashboardScreen` (17), `CheckInCompleteScreen` (16).

This is the governance rule "do not introduce unrelated brand colours," broken
at scale. It is also why the app reads as a generic green SaaS product rather
than as CoraCure.

### 2. Three of the four supporting neutrals are never used — *high*

The deck specifies Ink `#191B1A`, Text Grey `#6F7774`, Soft Grey `#F2F7F5`,
White. Occurrences in the codebase: **0, 0, 0**. `libs/brand` substitutes its
own values (`ink: '#1C1C1C'`, `inkMuted: '#5A6B67'`, `surface.page: '#F7FBF9'`)
and the screens substitute Tailwind greys on top of that. Correcting the tokens
is a small, contained change.

### 3. Neither brand typeface is loaded — *high*

`typography.heading.family` and `typography.body.family` are both `undefined`,
so every screen renders in the Android system font (Roboto). Rounded and
Montserrat are both absent; there is no `android/app/src/main/assets/fonts`
directory. `libs/brand` documents the reason — only `.woff2` files were
supplied, which React Native cannot load.

**This needs `.ttf` files to fix.** Montserrat is freely available; Rounded
(Igor Stepanchenko) must come from whoever holds the licence. Once the files are
dropped in and the two `family` fields are set, nothing else changes.

### 4. Type runs about one step small throughout — *medium*

The deck's hierarchy is Display 40–56, H1 32–40, H2 22–28, Body 16–18, Label
12–14, Caption 11–12. Actual token usage across patient + ui:

| Token | px | Uses |
| --- | --- | --- |
| `sm` | 13 | 69 |
| `xs` | 11 | 65 |
| `md` | 14 | 29 |
| `lg` | 16 | 15 |

68% of all type is 11–13px, while the brand's *body* size is 16–18px. The
largest size anywhere is 32px — the floor of H1, with no Display tier at all.

Some downscaling from desktop starting points is legitimate on a phone. This is
more than downscaling: body copy is sitting at caption size. For a patient-facing
health product — where older adults are a core audience — it is an
accessibility concern as much as a brand one.

### 5. Off-palette greens in the tokens themselves — *low*

`colors.cta` `#10AA80`, `colors.ctaPressed` `#0D8F6B` and
`gradient.brand` `['#0E9C7E', '#12B981']` are not in the approved palette. The
token comments describe them as derived from "the brand gradient," but the
supplied guidelines define no gradient — the two greens are the whole colour
system. Impact is limited because the primary button already renders
`colors.surfie`; these are mostly unused.

### 6. Icon default colour — *low*

`Icon.tsx` defaults to `colors.ink`; the deck says Surfie Green is the default
icon colour. Most call sites pass a colour explicitly, so this is a one-line
default change.

## Suggested order of work

1. **Fix the tokens** (small, contained): correct the three neutrals to the
   deck's values; drop or realign `cta` / `ctaPressed` / `gradient.brand`.
2. **Codemod the 271 literals** to tokens, mapping per the table above. Largely
   mechanical; the five worst screens account for ~100 of them.
3. **Raise the type scale** so body copy lands at 16px, and add a Display tier.
   Worth pairing with an accessibility pass.
4. **Add the two typefaces** as `.ttf` — blocked on sourcing the Rounded licence.

Items 1–3 are self-contained and do not need anything from outside the repo.
