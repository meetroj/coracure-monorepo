# Patient app takeover review — 11 September 2026

## Scope and evidence

Reviewed the supplied agent transcript, three screenshot strips, current patient source, shared libraries, project decisions, and relevant sibling backend controllers. Existing uncommitted work was preserved. This is a source and automated-check review, not a completed rendered visual audit or a live backend end-to-end certification.

## Current architecture

- Nx workspace with separate patient and doctor React Native apps; React Native Web and Vite provide a patient browser preview.
- Patient uses shared brand, UI, API, and i18n libraries. Doctor still has separate primitives and tokens.
- Custom typed navigation stack, session provider, care-flow context, query cache, and centralized HTTP client with refresh and keychain storage.
- Patient screens cover onboarding, home, care search, matching, services, time selection, intake, checkout, payment status, instant consultation, appointments, consultation detail, reports, account, and settings.
- Backend is the sibling NestJS repository `../coracure`.

## Findings

1. **Responsive preview uses conflicting widths.** `apps/patient/index.html` caps the app at 430px, while `libs/ui/src/layout.tsx` uses window width to select compact/tablet spacing. Desktop preview can therefore apply wide-screen padding inside a phone frame. The shared wide layout is a centered column capped at 520px, not a desktop multi-column layout.
2. **Visual fidelity remains incomplete.** Welcome uses a custom SVG illustration instead of the reference photograph, additional stacked feature cards, Skip in the header, and progress dots below the CTA. Brand heading/body font families are undefined, so typography uses platform defaults. These are visible implementation differences, not a pixel comparison.
3. **Patient tests are not all passing.** The review invocation passed 23/24 tests; the first care recommendation test timed out after 20 seconds. The transcript reports earlier cold-run failures too. Root cause is unconfirmed; increasing the timeout alone would not establish correctness.
4. **Checkout handling needs attention.** Current `CheckoutScreen.tsx` calls checkout and opens `paymentUrl` when provided, contrary to comments and PROJECT_CONTEXT saying checkout is never called. Without a usable URL/SDK it enters failure after checkout has already frozen the bill. Also, the effect treating every status other than pending_payment/expired as settled should be reviewed against cancelled and other non-paid states.
5. **Backend-dependent gaps remain.** The patient slots adapter offers candidate times rather than confirmed availability. Intake form fetching does not call a backend endpoint. Video device readiness is displayed, but a working video client is absent. Backend controllers inspected still expose provider/admin slots and admin specialty intake data.
6. **Some screenshot flows intentionally differ from product rules.** Existing decisions prohibit a browsable doctor directory: patients select a service/time and the backend assigns a provider. Do not silently implement screenshot doctor selection without resolving this product/API difference.
7. **Documentation is stale.** CLAUDE.md still describes the patient app as a starter with no shared libraries. PROJECT_CONTEXT is more recent but its checkout statements no longer match code.

## Checks run

- `npm.cmd run patient:web:build`: passed; 357 modules, approximately 729 kB main JS before gzip. Vite warned about the large bundle.
- `node node_modules/typescript/bin/tsc --noEmit -p apps/patient/tsconfig.app.json`: passed.
- `node node_modules/jest/bin/jest.js --config apps/patient/jest.config.cts --runInBand --json --outputFile=patient-audit-tests.json`: 2 suites passed, 1 failed; 23 tests passed, 1 timeout; approximately 60 seconds. Output is in the workspace JSON file.

## Next work

Investigate the flow-test timeout; correct checkout status handling with regression coverage; reconcile preview container and viewport measurements; then render and inspect every supplied screen at 320, 375, 390, 430, 768, 1024, and 1440px. Use explicit test fixtures for visual review, separately from real-backend verification. Verify safe areas and keyboard behavior on native devices as well. Full screenshot fidelity and responsive behavior are not yet verified.
