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

### 8. Patient card and documents ✅

| | |
|---|---|
| Screens | `PatientDocumentsScreen`, `DocumentViewerScreen`, request sheet, `AppointmentDetailsScreen`'s upload tile |
| Endpoints | `GET /patients/:id/card`, `GET /doctor/patients/:id/files`, `GET /doctor/files/:id/download-url`, `POST /doctor/report-requests`, `POST .../cancel`, `GET /consultations/:id/report-requests`, `POST /doctor/patients/:id/files/upload-url`, `POST /doctor/patients/:id/files` |
| Client | `libs/api/src/endpoints/doctorFiles.ts`, `libs/api/src/upload.ts` |
| Tests | 11 (`doctorFiles.spec.ts`) + 2 contract shapes + backend: 6 new in `patient-files.service.spec.ts` |

- **A download link is fetched per tap, never at list time.** Minting one per
  row would have them expiring while the doctor scrolls.
- **The doctor never receives a storage key** — every file is a short-lived
  signed URL, so a document has no address that still works tomorrow.
- A request carries the **actual ask AND the bucket**: "Lab" alone does not tell
  a patient which test.
- **Added 1 Oct 2026: a doctor-upload route.** The backend had no endpoint for
  a doctor to upload on a patient's behalf — only list/download/report-request
  existed, and the only write path (`storeGeneratedPdf`) was for the
  platform's own generated prescription PDF. Added
  `POST doctor/patients/:patientId/files/upload-url` + a confirm pair,
  reusing the patient's own signed-URL handshake but always anchored to a
  consultation the doctor treats (`CONSULTATION_NOT_FOUND` otherwise, even for
  another doctor's booking with the same patient) — never held against the
  patient's general record, which stays theirs to add to. The PUT-to-signed-URL
  mechanics (`react-native-blob-util` for a `file://` URI, since OkHttp
  refuses that scheme) were already written once for credential uploads and
  are now shared from `libs/api/src/upload.ts` rather than duplicated.

### 9. The call ⬜

`GET /v1/consultations/:id/video/readiness`, `POST .../video/token`,
`GET .../video/session`. Needs the LiveKit SDK — a dependency decision.

### 10. Write-up ✅

| | |
|---|---|
| Screens | `ClinicalNotesScreen`, `EPrescriptionScreen`, `CaseSummaryScreen` |
| Endpoints | `GET|PUT /v1/doctor/consultations/:id/clinical-record`, `POST .../clinical-record/finalise` |
| Client | `libs/api/src/endpoints/doctorClinicalRecord.ts`, `apps/doctor/src/data/clinicalRecord.ts` |
| Tests | 3 (`doctorClinicalRecord.spec.ts`) + 7 (`clinicalRecord.spec.ts`) + `ClinicalFlow.spec.tsx` |

- **Every save sends the whole record.** The PUT is a full replace: saving from
  the prescription screen still carries the notes. A save before the chief
  complaint and risk category exist is refused locally, in words, rather than
  sent as a request the server would 400.
- **One lock, at the end.** The backend has a single `finalisedAt`. "Finalise
  prescription" saves; only submitting the case summary calls `finalise` —
  locking earlier would refuse the summary with `RECORD_FINALISED`.
- **The case summary is counted in lines (3–5), not characters.** The drafted
  summary is now one point per line; it used to be one paragraph, which the
  backend would always have refused as too short. When finalise is refused
  (`RECORD_INCOMPLETE`), the server's own `outstanding[]` reasons are shown.
- Shapes that do not line up: `observations` has no field and rides inside
  `clinicalHistory` under its own heading; advice/don'ts go out as
  `adviceCovered`/`adviceWarningSigns`, one item per line; a local medicine id
  (`med_001`) is never sent. `adviceHomePractice`/`adviceNextFocus` and the
  allergies box have no screen field / no backend field respectively.

### 11. Follow-up and safety ✅

`GET /v1/doctor/followup-pathways`, `POST /v1/doctor/consultations/:id/followup`,
`.../followup/cancel`, `.../checkins`, `.../followup-plan`,
`GET /v1/doctor/safety-alerts`, `.../:alertId`, `.../acknowledge`, `.../close`.

- The workflow is the backend's two steps — acknowledge, then close with a
  note. The old four-way action picker and per-question answer breakdown had no
  backend data and are gone.
- A plan's length comes from its pathway; there is no separate duration input.
- **Keyed by `Appointment.id`.** `Appointment.consultationId` is the human
  reference code (`CC-10482`) and must never reach a URL — an early version of
  this step sent it, and every assign would have 404'd.

### 12. Clarifications ✅ (author side)

| | |
|---|---|
| Screens | `ClarificationsScreen`, `CreateClarificationScreen`, `ExpertClarificationScreen`, `ExpertResponseScreen` |
| Endpoints | `/v1/doctor/clarification-cases` (list, create, patch, post, reply, reviewed, close); `/v1/doctor/expert-reviews` client only |
| Client | `libs/api/src/endpoints/doctorClarification.ts`, `apps/doctor/src/data/clarifications.ts` |
| Tests | 3 (`doctorClarification.spec.ts`) + `ClarificationFlow.spec.tsx` + the mid-call referral in `DemoJourney.spec.tsx` |

- **The author never picks the expert.** Posting puts the case in an
  administrator's queue; the admin assigns. The "Select Doctor" panel is gone,
  the button is "Post to expert panel", and a posted case waiting for a
  reviewer says so instead of offering a reply box nobody will answer.
- **The reviewer's name is never sent to the author**, so the thread reads
  "Expert".
- **Identifiers are refused, not redacted** (`IDENTIFIER_PRESENT`). The local
  scan now uses the server's own patterns so the doctor is warned first; a
  refusal names the field it was found in.
- No attachments exist in either direction — the upload buttons on the case
  and the thread are removed rather than left to drop files silently.
- No decision field exists: a recorded decision is posted on the thread
  (`Decision recorded: …`, visible to the expert) before marking reviewed, and
  read back from it.
- Age is sent as years (the backend's integer), not a band.
- **Reviewer side (added 1 Oct 2026).** `ExpertInbox` (`GET /doctor/expert-reviews`)
  and `ExpertReview` (`GET .../:caseId`, `POST .../:caseId/reply`) are routed
  from the Clarifications tab — the entry shows only when
  `GET /me/doctor/profile` says `seniorityLevel: 'expert'`, since only experts
  are ever assigned. Both screens were unrouted prototypes: the inbox's
  hard-coded sample cases (including cardiology and diabetes cases, outside
  this app's scope) and its patient initials are gone — the expert's view has
  no patient identifiers at all. The review screen now shows the discussion so
  far, so an expert sees the doctor's answer to their own question. Its four
  response types map to `comment`, `clinical_consideration`,
  `clarification_request` and `followup_recommendation`; the prototype's
  "In-person review" type had no backend value and was dropped. Tests:
  `ExpertReviewFlow.spec.tsx`.
- Done (1 Oct 2026): a `clarificationCase` notification now opens the case —
  the author's thread when the row carries a `consultationId` (only the
  treating doctor's does), the expert review otherwise. See "Gap close-out".

### 13. Earnings, reviews, notifications, profile ⬜

`GET /v1/doctor/payouts`, `GET /v1/doctor/consultations/:id/payout`,
`GET|POST /v1/me/notifications*`, `GET|PATCH /v1/me/doctor/profile`.
⛔ **Reviews have no doctor-facing endpoint** — `GET /v1/admin/feedback` is
admin-only (audit gap G-3). The screen has no data source.

### Gap close-out (1 Oct 2026)

Items found by the whole-app scan after steps 8–12:

- **Care Hub** — `GET /care-hub/items` through `doctorCareHubApi.listItems`
  (`data/followup.ts` `useCareHubItems`). Tools = `self_help_tool`, Modules =
  `education_module`. Published only, so no locked cards. The condition
  filter is gone: there is no doctor-readable concern list to label
  `concernId`. A pick no longer on the shelf is dropped on save, so the
  write-up does not trip `CONTENT_NOT_RECOMMENDABLE`. The note to the patient
  has no backend field and stays on the device.
- **Prescription PDF** — once the record is finalised, the preview lists
  `prescription_pdf` for the consultation and opens it via
  `GET /doctor/files/:id/download-url`. The draft layout stays as the preview.
- **Notification deep links** — `safety_alert` → alert, `instantRequest` →
  instant offer, `clarificationCase` → thread or expert review,
  `consultation` → appointment. Unknown shapes fall back to the consultation,
  or only mark the notification read. AlertDetail and Clarification wait for
  their list instead of showing "not found" on a cold open.
- **Stop follow-up plan** — `POST /doctor/consultations/:id/followup/cancel`,
  behind a confirm, on the assign-plan screen while the plan is `active`.
- **Signature** — `/me/doctor/registration` `signatureDocumentId` →
  `GET /doctor-credentials/:id/download-url`. Shown in Profile Details and on
  the prescription preview. ⛔ The server-rendered PDF does not carry a
  signature; that is a backend change.

### Whole-app audit fixes (2 Oct 2026)

Every screen was traced button by button. Fixed: case-summary deadlock (the
follow-up plan is now optional and offered after submit — the server only
accepts it once the record is finalised); doctor upload 400 (`upload-url`
takes only category/fileName/contentType); stale cache overwriting newer
notes and clarifications; the fake 11:45 clock; fixture patients, documents,
clarifications, chats and support tickets no longer shown to real doctors;
verification status (latest document per type wins; no demo registration;
under-review lands on Account Status); cache cleared on sign-out; instant
offers (server-trusted, polled every 15s while Available); notification and
bell badge; real call duration (`GET /consultations/:id/video/session`);
doctor-owned clinical templates (`/doctor/clinical-templates`, migration
`20261002000000_clinical_templates` — apply with `npm run db:migrate:dev`).

Still local, no backend: support/FAQ, bank account details, privacy toggles,
profile change requests, reviews, Care Hub note to patient, the doctor's own
allergies note on the prescription. Not doable yet: push token (no push
library), video. Patient chat left this list on 5 Oct — see below.

### Backend pull (5 Oct 2026)

`synquic/main` merged into the backend checkout. What it gave the doctor app,
and what was done with each:

| Now in the backend | In the app |
|---|---|
| **Patient chat** — `/v1/doctor/chat-threads` (list, messages, send, attachment upload + open, read) | ✅ `libs/api/src/endpoints/doctorChat.ts`, `apps/doctor/src/data/chat.ts`; Messages, the thread, in-call chat, "Message patient" on a real consultation, and the `chat_message` notification all use it |
| **12 consultation languages** (`common/languages.ts`), was `en`/`hi` | ✅ one catalogue, `doctorProfileApi.LANGUAGE_NAMES`; onboarding and profile offer all 12 |
| **Patient-reported health** on `GET /doctor/consultations/:id` (`doctorContext.patientHealth`: allergies, conditions, medications, blood group, height, weight) | ✅ shown after the intake answers on the appointment, labelled patient-reported |
| `InstantOffer.languages`, `PatientCard.languages`, `ConsultationRecord.cancelledByParty` | ✅ typed; an instant offer lists every language the patient consults in |
| `PUT /v1/me/device` — register or refresh the push token after sign-in | ⛔ needs an FCM library and Firebase project files; none installed |
| Paging: `after` on `GET /doctor/consultations`, `beforeId` on notifications, `GET …/clarification-cases/:id/messages?beforeSeq=` | ⬜ not wired — every list still reads its first page (50, or 100 for the day) |
| `PATIENT_DID_NOT_ATTEND` on finalise, `UPLOAD_INCOMPLETE` / `FILE_TOO_LARGE` / `FILE_ALREADY_CONFIRMED` on a file confirm | ✅ no change needed — each surfaces through `messageFor` with the server's sentence |

Chat, as built:

- **A thread is the patient.** One conversation per doctor–patient pair; every
  route takes `:patientId`, so a real thread's id IS the patient's id. The
  server's row is created by the first message — a thread opened from an
  appointment exists only on the device until then.
- **Sent means the server has it.** The composer clears on send and the text
  comes back if the send is refused. Nothing is shown as sent that was not.
- **Polled, not pushed.** There is no socket and no push library, so the list
  (and the Messages badge) is re-read every 30 s on the tabs, and an open
  thread every 8 s. A thread covered by another screen stops polling, so
  nothing is marked read unseen.
- **An attachment has no address.** It is uploaded through a signed URL and
  opened through a link minted on the tap, the same as a patient document.
- **Names.** The chat list sends initials, age and gender only. Where one of
  the patient's consultations is loaded, its name and reference code are shown.

Still missing server-side after this pull — nothing to integrate against:
doctor support tickets and FAQ (`/me/complaints` and `/support/contact` are
`@Roles('patient')`), doctor-readable reviews (`GET /admin/feedback` is still
admin-only, gap G-3), bank account details (only an admin `bankVerified` flag),
privacy toggles, profile change requests, a Care Hub note to the patient, an
allergies field on the clinical record, and the signature on the rendered
prescription PDF.

**Two fields the app reads that this backend does not send.** `libs/api`'s
contract check fails on both: `PatientCard.fullName` (the upstream merge kept
"initials, not a name" on `GET /patients/:id/card`) and
`SafetyAlert.patientName` (never on `AlertRecord`). The screens fall back to
initials, so nothing breaks — but decision D-4 (the doctor sees names) only
holds on the consultation list, where `patient.fullName` survived. Restoring
the other two is a backend change and a privacy decision, not an app one.

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
| D-4 | 12 consultation languages vs the API's 2 | ~~Restrict the picker to English and Hindi~~ **Superseded 5 Oct 2026: the API has 12, the picker offers the API's list** | Language is a matching input; a doctor cannot claim one the assignment engine cannot route on, so the options are read from the one catalogue (`LANGUAGE_NAMES`) |
| D-4 | The doctor app shows patient names; the backend returned initials only (FR-9.2) | **Add the name to doctor-facing responses** | `PatientCard.fullName`, `ConsultationRecord.patient` (doctor/admin reads only — absent on the patient's own), `AlertRecord.patientName`. A Consult Now **offer** deliberately stays on initials: a doctor who has been offered a request has not accepted it and is not treating anybody yet |
| D-5 | Native file picker | `react-native-image-picker` was **already installed** — used it | Camera and library work with no new dependency. A PDF cannot be *picked* (needs a document picker); the backend accepts images, so a photographed certificate is a complete submission. iOS needs `pod install` |

---

## Checking types

**`tsc -p apps/doctor/tsconfig.json` checks nothing.** That file has
`"files": []` and `"include": []` and only references the real configs, so it
exits 0 whatever is broken. Use:

```bash
npx tsc -p apps/doctor/tsconfig.app.json --noEmit    # app sources
npx tsc -p apps/doctor/tsconfig.spec.json --noEmit   # specs
```

As of 1 Oct 2026 the app config has one error, in
`components/AppointmentActions.tsx` — an orphan file nothing imports, which
imports a constant (`RESCHEDULE_CUTOFF_HOURS`) that does not exist. The spec
config has ~30 older errors (renders missing required props, an SVG module
declaration); Jest compiles with Babel and does not typecheck, so they run.

## Known-failing tests we did not cause

Six, all pre-dating this work and unrelated to integration (verified by stashing
our changes and re-running): missing `photo-remove` and `clarification-thread`
elements, a `% Complete` string a spec forbids, cardiology fixtures that should
have been removed, and one load-dependent flake in `Navigation.spec`.
