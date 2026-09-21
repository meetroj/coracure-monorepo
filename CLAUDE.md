# Coracure Frontend Monorepo

React Native apps for the Coracure doctor consultation platform. Two store
listings, one backend.

## What this repo is

- **Nx 23** workspace, `apps/patient` and `apps/doctor`.
- **Bare React Native 0.84** (not Expo), React 19, TypeScript 6.
- Metro for the apps, Vite/Vitest and Jest both present at the root.
- Run with `npm run patient:start` / `patient:android` / `patient:ios`, same for `doctor`.

## Current state — read before assuming

- `apps/doctor` has real work: `AppShell`, screens for dashboard, appointments, availability, cases, login and profile, plus `src/components/ui.tsx` (~19 primitives), `src/theme/brand.ts` (brand tokens) and `src/data/doctor.ts` (types + mock data).
- `apps/patient` is **still the Nx starter template** — `App.tsx` is the generated "Welcome Patient 👋" page. Nothing real yet.
- **There is no shared library.** No `libs/`, no `packages/`, and `tsconfig.base.json` has `"paths": {}`. The "shared" UI currently lives inside the doctor app and is imported by relative path.
- No navigation, data-fetching, secure-storage or HTTP dependency is installed yet.

When work starts on the patient app, the primitives and brand tokens should be
extracted into `libs/` first and consumed by both apps. `apps/doctor/src/theme/brand.ts`
already carries a note saying it is written to be lifted verbatim into `libs/brand`.
Do not fork a second copy into `apps/patient`.

## The backend

Lives in the sibling repo `../coracure` (NestJS + Fastify + Prisma + Postgres).
To read a contract that the generated types do not answer, add it to the session:

```
/add-dir ../coracure
```

Run it locally before doing any integration work:

```bash
cd ../coracure
docker compose up -d postgres redis
npm run db:migrate:dev && npm run db:seed
npm run start:dev
```

- API base: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/docs` — OpenAPI JSON: `http://localhost:3000/docs-json`
- For local frontend work set `OTP_PROVIDER=stub` and `OTP_STUB_CODE=000000` in the backend `.env`, otherwise every sign-in sends a real SMS.

## Documents

- `docs/PROJECT_CONTEXT.md` — decisions taken outside the code, the open ones, and the build order. **Read this first when picking up work.**
- `docs/API_CONTRACT.md` — base URLs, auth, the error catalogue, endpoint inventory.
- `docs/USER_STORIES.md` — module-by-module stories with the endpoints each consumes.

## Rules that come from the backend, not from taste

These are enforced server-side. A screen that ignores one will fail in
production even if it works against a mock.

- **The patient never picks a provider.** They pick a service and a time; the backend assigns. Never build a browsable, filterable doctor list in the patient app.
- **Branch on `error.code`, never on `error.message`.** `code` is contract and frozen; `message` is reworded freely.
- **Never spread a form object into a request body.** The backend runs `forbidNonWhitelisted: true` — one unexpected field is a hard 400.
- **Refresh-on-401 must be single-flight.** Access TTL is 15 minutes; four parallel queries on a screen must not fire four refreshes.
- **`NO_PROVIDER_AVAILABLE` is a designed outcome, not an error toast.** It carries the soonest time the pool can cover, and the booking screen is built around it.
- **A `pending_payment` consultation IS the slot hold** and it expires. Show the countdown; handle expiry.
- **Tokens go in secure storage** (`react-native-keychain`), never AsyncStorage. This app holds clinical data.
- **No notification copy may name a diagnosis.** Copy comes from the backend; do not hardcode it.

## Types

Generate from the running backend rather than hand-writing them:

```bash
npx openapi-typescript http://localhost:3000/docs-json -o libs/api/src/schema.d.ts
```

Commit the output. Re-run whenever the backend changes; the compiler then tells
you what broke.

## Known repo issues to fix when convenient

- `nx.json` has `"defaultBase": "master"` but the only branch is `main`, so `nx affected` compares against nothing.
- `tsconfig.base.json` sets `"strict": false`. Turn it on for new libraries at least.
- The root `README.md` is the untouched Nx template.
