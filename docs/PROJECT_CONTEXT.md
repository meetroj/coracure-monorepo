# Project Context and Decisions

Living record of what was decided outside the code, and why. Read this after
`CLAUDE.md` when picking up work in this repo. Update it when a decision
changes — a decision recorded once and then quietly reversed is worse than none.

Last updated: 10 September 2026.

---

## 1. Repository layout

Two separate git repos, siblings on disk:

```
New folder (3)\          # the user's projects folder
├── coracure\            # backend  — NestJS, Fastify, Prisma, Postgres
└── coracure-ui\         # frontend — this repo, Nx + React Native
```

Deliberately **not** a single repo and **not** nested. They release on different
cycles, have different toolchains, and nesting would put RN `node_modules`
inside the backend's lint and TypeScript scope.

`../coracure` is therefore a stable relative path from here. Use
`/add-dir ../coracure` in a Claude Code session to read backend source when the
generated types do not answer a contract question.

**Known risk, accepted:** the parent folder name contains spaces and
parentheses. Metro, Gradle and Watchman all have known failures on Windows
paths like this. If a build fails with a path or "cannot find module" error
that makes no sense, **move both repos to a path without spaces before
debugging anything else** — for example `C:\Users\lnc\Projects\`. Nothing
inside either repo hardcodes an absolute path, so the move is safe.

---

## 2. State of this repo when work started

Established by reading the code on 9 September 2026, at commit `56e4b1b`.

- Nx 23 workspace, **bare React Native 0.84** (not Expo), React 19, TypeScript 6.
- `apps/doctor` — substantial: `AppShell`, screens for dashboard, appointments, availability, cases, login and profile; `src/components/ui.tsx` (~19 primitives, 635 lines); `src/theme/brand.ts` (brand tokens from the 2026 guidelines); `src/data/doctor.ts` (domain types and mock data).
- `apps/patient` — **still the Nx starter template.** `App.tsx` is the generated "Welcome Patient 👋" page.
- **No shared library exists.** No `libs/`, no `packages/`, `tsconfig.base.json` has `"paths": {}`.
- No navigation, data-fetching, HTTP or secure-storage dependency installed.
- Everything is mock data. Nothing talks to the backend yet.

---

## 3. RESOLVED — the shared library exists

**Done.** `libs/` now holds four libraries, and the patient app is built on them:

| Library | Alias | What is in it |
| --- | --- | --- |
| `libs/brand` | `@coracure/brand` | The 2026 brand tokens, plus `gradient`, `shadow.raised`/`floating` and `breakpoint`. |
| `libs/ui` | `@coracure/ui` | `Icon` (58 icons), `Screen`, `Button`, `Card`, form controls (`OTPInput`, `PhoneField`, `DateOfBirthField`, `ChoiceGroup`), `Skeleton`/`Empty`/`Error` states, `Sheet`, `Accordion`, `BrandBackground`. |
| `libs/api` | `@coracure/api` | The HTTP client with single-flight refresh, the keychain token store, the typed error catalogue, every patient endpoint, and a small query cache with typed hooks. |
| `libs/i18n` | `@coracure/i18n` | English key set, partial Hindi, `I18nProvider` / `useT()`. |

Aliases are in `tsconfig.base.json` and resolve through `withNxMetro`; a
production Android bundle has been built to prove it.

**`apps/doctor` was NOT touched** — the work was scoped to the patient app. It
still carries its own `src/theme/brand.ts`, `src/components/ui.tsx`,
`src/components/Icon.tsx` and `src/test/svg-mock.js`. The tokens in
`libs/brand` are that `brand.ts` lifted verbatim plus additions, so repointing
the doctor app is a one-line re-export per file whenever its owner is ready.
**Until that happens the two copies can drift** — this is the one piece of
technical debt this work knowingly left, and it should be closed soon.

`libs/ui/testing/svg-mock.js` is the shared home for the Jest SVG mock that both
apps need (the Nx one is broken: it assigns `.ReactComponent` onto a string).

## 3b. Former open decision — extracting the shared library

The plan is to build the patient app **on shared UI and components**. Those
components exist but are not shared: they live in `apps/doctor/src/`.
`brand.ts` carries a note saying it was written to be lifted verbatim into
`libs/brand`, so the intent was always extraction.

**Recommended, not yet done:**

1. `npx nx g @nx/react:lib brand` and `npx nx g @nx/react:lib ui`.
2. Move `apps/doctor/src/theme/brand.ts` → `libs/brand`, `apps/doctor/src/components/ui.tsx` and `Icon.tsx` → `libs/ui`.
3. Add the path aliases to `tsconfig.base.json` (currently `{}`).
4. Repoint the doctor app's imports; confirm its tests still pass.
5. Patient screens then import from `@coracure/ui` and `@coracure/brand` from the first screen onward.

**Why it must happen before the first patient screen:** building patient
against relative imports into `apps/doctor`, or against a copy, produces two
diverging component sets within a week. That divergence is exactly what a
monorepo exists to prevent.

**Why it is still open:** the extraction edits the doctor app's imports, and
another engineer may have active work there. Confirm ownership before starting.

---

## 4. Build order for the patient app

Story IDs refer to `docs/USER_STORIES.md`, which is already sequenced by
dependency.

1. ~~**PT-02** auth~~ — **done.** API client, single-flight refresh (pinned by `libs/api/src/http.spec.ts`) and keychain storage all work.
2. ~~**PT-04** profile~~ — **done.** Note it collects `dateOfBirth`, not age: the backend derives age on every read and never stores it.
3. ~~**PT-03** consent~~ — **done.** The copy and version come from `GET /legal/documents/teleconsultation_consent`; nothing is hardcoded.
4. ~~**PT-09** search~~ — **done** as "Find the Right Care". The crisis interrupt, the FR-5.8 disclaimer and the helpline list are all server-supplied; the app runs no keyword list of its own. Pinned by `FindCareScreen.spec.tsx`.
5. **PT-11 + PT-12** booking and payment — booking is **done** and designed around the `NO_PROVIDER_AVAILABLE` refusal (the G-1 decision, taken and recorded in `BookConsultationScreen.tsx`). **Payment is NOT done**: `GET /bill` is rendered, but `POST /checkout` is deliberately never called because there is no gateway SDK to hand its result to, and calling it would freeze a bill that could not then be settled. **The payment gateway SDK is the next dependency to resolve.**
6. **PT-14** video — `GET /video/readiness` is wired and shown (it is a safe read that issues nothing). Joining needs the LiveKit client SDK, which is not installed. Then **PT-15/PT-16** records, check-ins and care plan.

Integration is built against the real local backend from step 1. Mock adapters
"to be swapped later" are where integration bugs hide.

---

## 5. Gaps in the backend that affect this app

Full list in `docs/USER_STORIES.md` section 3; the two that touch the patient
app are repeated here because they change what gets built.

- **G-1 — no patient-facing slot lookup. DECIDED: built around the refusal.** The booking screen offers candidate times, labelled as candidates, and treats `NO_PROVIDER_AVAILABLE` as a designed outcome — it reads the soonest coverable time out of `error.details` and offers it as a one-tap alternative. A real `GET /v1/services/:id/slots` would still be better and the screen would simplify to consume it. Original note follows.
- **G-1 (original) — no patient-facing slot lookup.** `slots` exists only on `me/doctor` (a provider's own diary) and on the admin controller. The patient books a service with a freely chosen `startsAt`, and an uncoverable time comes back as `NO_PROVIDER_AVAILABLE` carrying the soonest time the pool can cover. Either design the picker around that refusal, or get `GET /v1/services/:id/slots` added to the backend first. **Decide before building the booking screen, not during it.**
- **G-4 — intake: half answered.** The ANSWERS ride on the booking body (`BookScheduledDto.intakeAnswers`, snapshotted onto the consultation). The FORM does not: `intakeForm` sits on the specialty record and is exposed only on the admin controller, so the patient app cannot render the questions. `bookConsultation()` already accepts `intakeAnswers` so the client half is ready. Original note follows.
- **G-4 (original) — intake has no dedicated endpoint.** The specialty intake form and its answers are not exposed in the shipped controllers. Confirm whether they ride on the booking body.

---

## 6. Product rules that constrain the UI

These come from SRS 1.2 and the module plan 1.3, and are enforced server-side.
They are not style preferences.

- **The patient never chooses a provider.** They choose a service and a time; the backend assigns. There is deliberately no browsable provider directory — it was built and then removed in module plan v1.3. Do not rebuild it. **But the ASSIGNED provider is visible:** `GET /v1/doctors/:doctorId` is patient-scoped (FR-4.3) and returns the profile of the one treating you — refused with a 404, not a 403, to anyone else. The patient app shows it on the consultation screen after assignment, and nowhere else.
- **Language is never relaxed** in assignment; region may be, by admin policy.
- **A patient may decline an assigned provider a configured number of times**, with a reason, then no more.
- **No notification may name a diagnosis.**
- **The consultation is not recorded**, and the call UI should say so.
- **Consent is required before the first consultation** and re-prompts on a new version.

---

## 7. Where the authoritative documents live

| What | Where |
| --- | --- |
| Standing rules for every session here | `CLAUDE.md` (loads automatically) |
| API contract, error catalogue, endpoints | `docs/API_CONTRACT.md` |
| Module-by-module stories with endpoints | `docs/USER_STORIES.md` |
| Backend module plan, ownership, build order | `../coracure/docs/MODULES 1.md` |
| Requirements | `../coracure/docs/SRS 1.md` |
| Database design | `../coracure/db/schema.dbml` |
| Live API reference | `http://localhost:3000/docs` while the backend runs |

The generated OpenAPI schema is the machine truth for shapes. This document and
`CLAUDE.md` carry the rules that a schema cannot express.
