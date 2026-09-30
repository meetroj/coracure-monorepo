# Doctor App — Integration Plan

The order we are wiring `apps/doctor` to the backend, **following the flow a
doctor actually walks**, not the order the modules happen to sit in.

- Endpoint shapes: `docs/API_CONTRACT.md` §7 (doctor app) — request and response
  for every route, in this same flow order.
- What was already broken before we started: `docs/DOCTOR_INTEGRATION_AUDIT.md`.
  That document is the *survey*; this one is the *worklist*.

**Status legend** — ✅ done and tested · 🟡 in progress · ⛔ blocked on a
decision or on missing backend · ⬜ not started.

---

## The flow we are following

```
 1  Sign in ──────────────► 2  Onboarding form ──────► 3  Verification wait
 (OTP, tokens)              (details + documents)      (status, resubmit)
        │                                                      │
        └──────────────── verified ────────────────────────────┘
                                   │
 4  Dashboard ◄── 5  Availability ─┴─ 6  Presence / Consult Now
        │
        ├─► 7  Appointments ─► 8  Patient card + documents
        │                              │
        │                              └─► 9  The call (video)
        │                                        │
        │                                        ▼
        │                              10  Write-up: notes, prescription,
        │                                  case summary, finalise
        │                                        │
        │                                        ▼
        ├─► 11  Follow-up plans, check-ins, safety alerts
        ├─► 12  Clarifications (second opinions)
        └─► 13  Earnings · Reviews · Notifications · Profile
```

A doctor cannot reach step *n+1* before *n* works, which is why this is the
order. Steps 11–13 hang off the dashboard and can be done in any order once
step 10 lands.

---

## Step-by-step

### 1. Sign in ✅

| | |
|---|---|
| Screens | `DoctorLoginScreen` |
| Endpoints | `POST /v1/auth/doctor/otp/request`, `POST /v1/auth/doctor/otp/verify`, `POST /v1/auth/refresh`, `POST /v1/auth/sign-out` |
| Client | `libs/api/src/endpoints/doctorAuth.ts` |
| Tests | 19 (`doctorAuth.spec.ts`) + 14 (`DoctorLoginScreen.spec.tsx`) |

Routing is the server's `verificationStatus`, not a number the app recognises.
`verified` → shell; `pending` / `under_review` → step 2; `rejected` /
`suspended` are refused at sign-in with `ACCOUNT_NOT_ACTIVE`.

Left open: **no session restore on cold start** — the keychain holds a valid
pair, but nothing can be shown until `GET /me/doctor/profile` is wired, so it
lands with step 2.

### 2. Onboarding form ✅

| | |
|---|---|
| Screens | `onboarding/OnboardingFlow` (Basic · Identity · Qualifications · Experience · Review) |
| Endpoints | `GET|PUT /v1/me/doctor/registration` **(new)**, `GET|PATCH /v1/me/doctor/profile`, `GET /v1/me/doctor/credentials`, `POST /v1/me/doctor/credentials/upload-url`, `POST /v1/me/doctor/credentials`, `GET /v1/doctor-credentials/:documentId/download-url` |
| Client | `libs/api/src/endpoints/doctorProfile.ts`, `apps/doctor/src/data/onboarding.ts` |
| Tests | 12 (`doctorProfile.spec.ts`) + 13 (`onboarding.spec.ts`) + 17 backend (`doctor-registration.service.spec.ts`) |

**The backend was extended for this step** (30 Sep 2026). The form collected
~15 fields with no column; they have columns now:

| Added | Where |
|---|---|
| `date_of_birth`, `gender`, `email` | new columns on `doctors` |
| ID type + number | new table `doctor_identity` — **its own table, never returned in full**, only `number_last4` |
| Degree, specialty, institution, university, year | new table `doctor_qualifications`, each row linked to the certificate that proves it |
| Position, institution, start/end month, current | new table `doctor_experience`, with a CHECK that a post cannot be both current and finished |
| The route that writes them | `GET|PUT /v1/me/doctor/registration` |

Migration `20260930000000_doctor_registration_details`. Everything is nullable
or a new table, so an already-verified doctor keeps working unchanged.

Still not a doctor-writable field: the **medical council registration number**.
That is the one claim verification exists to check, so it stays on
`PATCH /v1/admin/doctors/:doctorId`.

**How the submit runs** (`data/onboarding.ts`):

1. every document uploaded **one at a time** — the first upload flips the account
   to `under_review`, so racing them leaves an admin with a half-visible set
2. `PATCH /me/doctor/profile` with the languages (a matching input)
3. `PUT /me/doctor/registration` with the details **and the document ids**, so a
   qualification row points at its own certificate
4. `GET /me/doctor/credentials` read back — where the account stands is the
   server's answer, not a local guess

The documents go first because the detail rows reference them. A file with no
bytes is refused rather than reported as uploaded; a failure stops there and
names the file.

**The picker is real**: `react-native-image-picker` was already a dependency, so
camera and photo library work with no new native module. PDFs still cannot be
*selected* — that needs a document picker — but the backend accepts images, so
photographing a certificate is a complete submission.

### 3. Verification wait ✅

| | |
|---|---|
| Screens | `profile/AccountStatusScreens`, `ProfileRouter`, `AccountStatusRoute`, `ResubmitRoute` |
| Endpoints | `GET /v1/me/doctor/credentials` |
| Client | `apps/doctor/src/data/verification.ts` |
| Tests | 13 (`verification.spec.ts`) |

**The screen used to invent its rejection reasons.** `verificationItems` built
the rows from the local draft and hardcoded two issues — every rejected doctor
was shown "Name mismatch" and "Document unclear" whatever an admin had actually
typed, while the real reason sat unread in `doctor_documents.rejection_reason`.
Now the DESCRIPTION comes from the draft (the doctor's own name and degrees, a
label) and the STATE and REASON come from the server.

Also fixed: the hero card showed **"60% Complete"** from
`status === 'pending' ? 60 : ...` — a number with nothing behind it, which moved
when nothing about the account had. Replaced with the three-step sequence
(Submitted → Under review → Approved), each step something that actually
happened. This is what `AccountStatusBanner.spec` had been failing on.

Rules encoded, each with a test:

- a rejection **outranks** an approved document in the same section, so a
  resubmission cannot go out still missing the fix
- a section is `verified` only when **every** document in it is approved
- a document the server still wants reads **"Not yet uploaded"**, not "under
  review" — otherwise a doctor waits on an admin who is waiting on them
- `registrationNumberMissing` gets its own row: the one thing a doctor cannot
  fix themselves, and without it the screen shows four green rows and a stalled
  account
- one rejected document puts the whole submission back on the doctor even while
  the ACCOUNT is still `under_review`
- **Resubmit** now flags the sections from the admin's real list, not a guess

### 4. Dashboard ✅ · 7. Appointments 🟡 (data layer done)

| | |
|---|---|
| Screens | `DashboardScreen` (+ every screen reading `selectAppointments`) |
| Endpoints | `GET /doctor/consultations` (upcoming **and** past), `GET /doctor/pending-documentation`, `GET /doctor/safety-alerts?openOnly=true`, `GET /me/notifications/unread-count` |
| Client | `libs/api/src/endpoints/doctorConsultations.ts`, `apps/doctor/src/data/appointments.ts` |
| Tests | 6 (`doctorConsultations.spec.ts`) + 17 (`appointments.spec.ts`) |

**Steps 4 and 7 share one data layer, deliberately.** The dashboard's tiles and
the list they open now read the same `state.appointments`, so a tile saying
"3 today" cannot open a list of 2 — an invariant the screen's own comment
already claimed but fixtures were quietly providing.

`state.appointments` starts **empty and is never seeded with fixtures**. Falling
back to sample patients while a request is in flight would put invented names on
a clinical screen for as long as the network took; `useResource` covers the gap
with a skeleton. The spec harness seeds it explicitly.

Mapping decisions, each with a test:

- **upcoming and past are two calls, not one filter.** The backend's `upcoming`
  means "still holding time", so a consultation held this morning is in the PAST
  list the moment it ends. Asking only for upcoming shows a doctor an empty day
  at 6pm with three write-ups outstanding.
- `pending_payment` stays **on the diary** — the slot IS held, and hiding it
  double-books the doctor when it settles
- `awaiting_documentation` reads as **completed**: it happened; what is
  outstanding is the write-up, which has its own queue
- an **instant** request has no `scheduledStartAt` until someone accepts, so the
  created time stands in — the moment the patient asked
- `not_applicable` payment shows as **refunded**, the only one of the three the
  card can say honestly about a cancelled booking
- `referenceCode`, not the UUID, is the case id a doctor quotes

`pendingDocumentation` renders as a **blocker, not a badge**: the backend refuses
`available_now` with `DOCUMENTATION_OUTSTANDING` while it is non-empty, so the
dashboard says why before the doctor presses it.

Still open for step 7: the appointments LIST screen has its own filters and
buckets to re-point, and `GET /concerns` needs loading so a card shows the
concern name rather than "General consultation".

### 5. Availability 🟡 (data layer done, screen not wired)

| | |
|---|---|
| Screens | `AvailabilityScreen` |
| Endpoints | `GET /me/doctor/availability`, `PUT /me/doctor/availability/weekly`, `POST .../blocked`, `POST .../custom-hours`, `DELETE .../:ruleId`, `GET /me/doctor/slots` |
| Client | `libs/api/src/endpoints/doctorAvailability.ts`, `apps/doctor/src/data/availability.ts` |
| Tests | 9 (`doctorAvailability.spec.ts`) + 11 (`availability.spec.ts`) |

The weekly PUT **replaces the whole pattern** — send every window, never a
delta, or the days you leave out are deleted. A disabled day is therefore an
*absence*, not a flag: that is how it is switched off.

`enabled` is **derived**, not stored. There is no such column on the backend —
the absence of rules IS the answer — so a stored flag would drift from it.

A bug the tests caught before it shipped: `clockToMinutes` parses only the
screen's `01:00 PM` and returns `NaN` for anything else. Feeding it the API's
`13:00` produced `NaN:NaN` and would have **wiped a doctor's whole week on
save**. There are two clocks here and now two parsers.

`inPerson` is filtered out of `channels` — out of scope for this release, and
the API refuses it.

Left to wire: the screen's save button, the blocked-day and custom-hours
actions, and the `OVERLAPPING_AVAILABILITY` / `INVALID_TIME_RANGE` /
`DATE_IN_THE_PAST` refusals, each of which needs to point at the day it means.

### 6. Presence and Consult Now 🟡 (data layer done, screen not wired)

| | |
|---|---|
| Screens | `TabHeader` status control, instant-request sheet |
| Endpoints | `GET|PUT /me/doctor/presence`, `GET /me/doctor/instant-requests`, `POST .../accept`, `POST .../decline` |
| Client | `libs/api/src/endpoints/doctorPresence.ts`, `apps/doctor/src/data/presence.ts` |
| Tests | 10 (`presence.spec.ts`) |

**A contract correction:** this document said only three presences were
self-settable. `offline` is one too — `SELF_SETTABLE` in
`presence.service.ts` lists four. A doctor who cannot go offline has no way to
stop being offered work, so that mistake would have shipped a dead button.
`API_CONTRACT.md` §7.4 and §11 are fixed.

The two models line up exactly, but the names differ (`scheduledOnly` vs
`scheduled_only`), so there is a table rather than a cast — a mismatch here is a
silent 400 on the control a doctor touches most.

- **The blocker is explained before the press.** Going available with a write-up
  outstanding is a `DOCUMENTATION_OUTSTANDING` 400, and
  `blockedByConsultationId` is already on the presence record — so the screen
  says which consultation is holding them instead of letting them discover it
  from a failure. `allowInstantConsult: false` is the other one, and it is an
  admin permission, not something they can fix.
- **An expired offer is filtered by the clock, not by `outcome`.** It stays in
  the list until the sweep clears it; a live button over a 00:00 countdown just
  409s with `OFFER_CLOSED`.

### 7. Appointments ✅ (list) · detail actions ⬜

| | |
|---|---|
| Screens | `AppointmentsScreen` |
| Endpoints | `GET /doctor/consultations`, `GET /concerns`, `POST .../no-show`, `POST .../cancel` |

**One request for the whole day, filtered in memory.** The list used to fetch
per bucket. The three buckets are three views of the same rows — the backend has
no "today" list — so three calls meant three chances for the dashboard's count
and this list to disagree. They now read the same array.

`GET /concerns` loads with the day: a consultation carries a `concernId` and no
name, so without it every card read "General consultation".

**Deleted:** `fetchAppointments` and `KEYS.appointments` in `data/api.ts`, plus
their seeding in `test-setup`. Dead once the list stopped asking the mock seam.
What is left in that file is `fetchReviews`, which has nowhere to go —
`GET /v1/admin/feedback` is admin-scoped (audit gap G-3).

Left: the detail screen's no-show and cancel actions. Both clients are written
and exported; the buttons still change local state only.

### 8. Patient card and documents 🟡 (client done, screens not wired)

| | |
|---|---|
| Screens | `PatientDocumentsScreen`, `DocumentViewerScreen`, request sheet |
| Endpoints | `GET /patients/:id/card`, `GET /doctor/patients/:id/files`, `GET /doctor/files/:id/download-url`, `POST /doctor/report-requests`, `POST .../cancel`, `GET /consultations/:id/report-requests` |
| Client | `libs/api/src/endpoints/doctorFiles.ts` |
| Tests | 7 (`doctorFiles.spec.ts`) + 2 contract shapes |

- **A download link is fetched per tap, never at list time.** Minting one per
  row would have them expiring while the doctor scrolls.
- **The doctor never receives a storage key** — every file is a short-lived
  signed URL, so a document has no address that still works tomorrow.
- A request carries the **actual ask AND the bucket**: "Lab" alone does not tell
  a patient which test.

### 9. The call ⬜

`GET /v1/consultations/:id/video/readiness`, `POST .../video/token`,
`GET .../video/session`. Needs the LiveKit SDK — a dependency decision.

### 10. Write-up ⬜

`GET|PUT /v1/doctor/consultations/:id/clinical-record`,
`POST .../clinical-record/finalise`, `GET /v1/doctor/pending-documentation`.
The response's `outstanding[]` is the live checklist; the finalise button should
be disabled from it rather than discovering the same codes as a 409.

### 11. Follow-up and safety ⬜

`GET /v1/doctor/followup-pathways`, `POST /v1/doctor/consultations/:id/followup`,
`.../followup/cancel`, `.../checkins`, `.../followup-plan`,
`GET /v1/doctor/safety-alerts`, `.../:alertId`, `.../acknowledge`, `.../close`.

### 12. Clarifications ⬜

`/v1/doctor/clarification-cases` (list, create, get, patch, post, reply,
reviewed, close) and `/v1/doctor/expert-reviews` (list, get, reply). The backend
de-identifies and **refuses** a case carrying identifiers.

### 13. Earnings, reviews, notifications, profile ⬜

`GET /v1/doctor/payouts`, `GET /v1/doctor/consultations/:id/payout`,
`GET|POST /v1/me/notifications*`, `GET|PATCH /v1/me/doctor/profile`.
⛔ **Reviews have no doctor-facing endpoint** — `GET /v1/admin/feedback` is
admin-only (audit gap G-3). The screen has no data source.

---

## What "integrated" means at each step

Every step ships all six, or it is not done:

1. **The call** — through `libs/api`, never `fetch` in a screen.
2. **Loading** — a real busy state; the step does not advance on the press.
3. **Failure** — `messageFor(error)` inline where the action was, branching on
   `error.code` and never on `message`.
4. **The domain refusals that step can actually produce**, each with a designed
   screen (they are listed per endpoint in `API_CONTRACT.md` §7).
5. **In-flight safety** — double-submit guard, and no state set after unmount.
6. **Tests** — the edge cases above, not the happy path.

---

## Decisions log

| # | Question | Decision | Consequence |
|---|---|---|---|
| D-1 | Which HTTP client for the doctor app? | `libs/api/src/http.ts` (single-flight refresh, keychain), not the older `client.ts` the patient screens use | Doctor endpoints are namespaced (`doctorAuthApi`, `doctorProfileApi`) so they cannot collide with the patient functions of the same name |
| D-2 | Where does a signed-in doctor land? | The server's `verificationStatus` | The hardcoded demo number is gone from sign-in routing |
| D-3 | The form collects ~15 fields with no backend column | First **wire what exists, flag the rest**; then **add the columns to the backend** | `UNMAPPED_FIELDS` is down to one entry (the registration number, admin-only). Migration `20260930000000_doctor_registration_details` |
| D-4 | 12 consultation languages vs the API's 2 | **Restrict the picker to English and Hindi** | Language is a matching input; a doctor cannot claim one the assignment engine cannot route on |
| D-4 | The doctor app shows patient names; the backend returned initials only (FR-9.2) | **Add the name to doctor-facing responses** | `PatientCard.fullName`, `ConsultationRecord.patient` (doctor/admin reads only — absent on the patient's own), `AlertRecord.patientName`. A Consult Now **offer** deliberately stays on initials: a doctor who has been offered a request has not accepted it and is not treating anybody yet |
| D-5 | Native file picker | `react-native-image-picker` was **already installed** — used it | Camera and library work with no new dependency. A PDF cannot be *picked* (needs a document picker); the backend accepts images, so a photographed certificate is a complete submission. iOS needs `pod install` |

---

## Known-failing tests we did not cause

Six, all pre-dating this work and unrelated to integration (verified by stashing
our changes and re-running): missing `photo-remove` and `clarification-thread`
elements, a `% Complete` string a spec forbids, cardiology fixtures that should
have been removed, and one load-dependent flake in `Navigation.spec`.
