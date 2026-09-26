# Doctor App ↔ Backend Integration Audit

**Date:** 21 Sep 2026 · **Scope:** Doctor flow only (`apps/doctor` + doctor-facing backend). The patient app is out of scope; patient-side backend code is cited only where it decides what the doctor receives.
**Repos:** frontend `coracure-monorepo` @ `e6e1c9e` · backend `coracure_backend` @ `a2e91d7`
**Method:** Static trace of every doctor screen through fixture → (intended) API client → controller → guard → DTO → service → Prisma → response. Nothing was executed against a running stack. No lint and no tests were run (see SEC-01). Findings marked **✔LV** were independently re-verified by the lead auditor; everything else was traced with file:line evidence by domain auditors.
**Rule applied:** The implemented Doctor UI is the integration contract. Backend fields with no UI consumer are reported as unused capability, not as UI defects. Patient-identity gaps are split into *accidental* vs *intentional (privacy)* and are never resolved by "just expose it".

---

## 0. Read this first — two facts that frame everything

### 0.1 The Doctor app has **zero** backend integration ✔LV
- `grep -rnE "@coracure/api|fetch\(|axios|WebSocket|XMLHttpRequest|socket\.io" apps/doctor/src` → **0 hits** (outside iOS Pods).
- Every screen reads fixtures from `apps/doctor/src/data/*.ts` (`doctor.ts`, `clinical.ts`, `followup.ts`, `clarification.ts`, `documents.ts`, `messaging.ts`, `registration.ts`, `support.ts`), either directly (most screens) or via the mock seam `data/api.ts` (only `AppointmentsScreen` uses it; `fetchSummary/NextAppointment/Workload/Earnings/Feedback/Reviews/Profile` have no callers).
- Every mutation is local state or `pop()`. The UI has no auth session, no token storage, no push stack, no video SDK, and no realtime channel.
- `libs/api` has a working HTTP transport (`http.ts`, single-flight refresh, error envelope), but **no doctor-side endpoint clients**. Its auth/profile/doctors/files/consultations/payments modules are patient-scoped (`@Roles('patient')` on the backend, so a doctor gets 403). `tokenStore.ts:36` and `config.ts:43` hardcode the patient keychain service and client name.

**Consequence:** "What works today when the two repos are put together" = **nothing end-to-end**. This audit therefore measures the gap between the UI contract (fixture types + rendered fields + intended actions) and the backend as built, which is the work integration must close.

### 0.2 Security incident found during the audit ✔LV
- **Backend `eslint.config.mjs` contained an obfuscated malware payload** (committed at HEAD `a2e91d7` and in `1e72d51`, author `Soojal2005`): a `createRequire` shim (lines 4–6) plus about 32 KB of obfuscated JS hidden after ~200 spaces of padding on line 27. It uses `spawn`, reads `process.env`, and makes Ethereum JSON-RPC calls (`eth_getBlock…`, a known blockchain-C2 pattern). It is the same payload the frontend team removed in monorepo commit `e6e1c9e`.
- ESLint executes this file on every `npm run lint` **and inside the VS Code ESLint extension**, which was running on this machine. Execution cannot be ruled out.
- **Action taken (approved by the repo owner):** payload and shim removed from the working tree (not committed). The infected copy is preserved as evidence outside the repo.
- **Also found:** the backend git `origin` URL embeds a plaintext GitHub PAT.

---

## 1. Executive Summary

| Metric | Count | Notes |
|---|---|---|
| Doctor screens inventoried | 38 screen files (plus sub-screens in onboarding/profile), 34 routes + 5 tabs | 3 unreachable: `assignPlan`, `expertCaseReview` (declared, never pushed), `ExpertInboxScreen` (never imported) |
| End-to-end doctor flows traced (A–W) | 23 | |
| Flows fully integrated | **0 / 23** | |
| Doctor-facing backend endpoints inspected | ~80 | with a Doctor-app consumer: **0** |
| UI fields mapped to a backend source | ~230 | domain tables in §3 and the appendices |
| Consolidated fix items (deduplicated) | **83** | from about 215 raw domain findings (AUTH 39, APPT 23, AVAIL/INST 48, CLIN/DOC 29, FUP/NOTIF/CHAT 46, CLAR ~30), with overlaps merged |
| — Production blockers (P0) | **14** | §12 (B-1…B-14) |
| — P1 (core doctor workflow cannot complete) | **21** | §13 F-14…F-34 (several group 2–5 domain findings) |
| — P2 | **~33** | §13, grouped |
| — P3 | **15** | §13 |
| Contract mismatches (enum / shape / type / nullability / ID) | **~40** | §5 (18 enum, 12 request-DTO, ~10 response/ID/error) |
| Business-logic divergences (FE vs BE rule) | **17** | §6 |
| Redundancies | **16** | §7 |
| Unused backend capabilities | **33** | §4 R-01…R-33 |
| Security / privacy findings | **35** (🔴 5 · 🟠 11 · 🟡 15 · 🔵 4) | §9, plus **7 decisions that need a human** (🟣) |
| Backend bugs found by code-reading (independent of the FE) | **30+** | races, stuck states, wrong data. See §3, §10 |
| Areas where the backend is genuinely ready | Clarification author/expert lifecycle, safety grading engine, video token/readiness, credentials/verification, availability diary, notification inbox API, file access control | |

**The four things that matter most:**
1. **Nothing is wired.** Integration is roughly 100% of the remaining work, not a patch list. Building the doctor `libs/api` client plus auth/session is the root dependency for everything else.
2. **Four backend defects block core doctor workflows no matter what the FE does:**
   - Instant consults never produce a first offer (INST-01 ✔LV).
   - Doctors never receive `patientId`, so the patient card, documents and intake are all unreachable (APPT-B01 ✔LV).
   - Rescheduled and free consultations can never be joined (APPT-B02 ✔LV).
   - A non-prescriber's finalise can 500 (CLIN-06).
3. **One live account-takeover path:** a doctor's OTP verify accepts any valid OTP challenge, including one issued for the attacker's own phone (AUTH-01 ✔LV).
4. **Several UI contracts carry patient identity where the backend deliberately withholds it:**
   - Full names on every list.
   - Patient initials and patient-derived IDs in the de-identified expert view.
   - Name, age and complaint on the pre-accept instant card.

   These need product/privacy decisions before wiring, not API changes.

---

## 2. Integration Health

| Area | FE ↔ BE today | Backend readiness (for the UI contract) | Main reason |
|---|---|---|---|
| Authentication | ❌ | ⚠️ | OTP flow exists; P0 challenge-binding flaw; UI ignores `verificationStatus`; no session |
| Appointments | ❌ | ⚠️ | List/detail exist; no `patientId`/intake/payment/consent for the doctor; 9 statuses vs 5 |
| Availability | ❌ | ✅/⚠️ | Diary API is solid; FE free-text dates, 12h vs 24h, Monday-first vs Sunday=0, non-UUID ids |
| Instant Consult | ❌ | ❌ | No first offer, no realtime, stuck-presence traps |
| Video Consultation | ❌ | ✅ | Token/readiness done; FE has no LiveKit/WebRTC SDK; join rule wrong |
| Clinical Notes | ❌ | ⚠️ | Notes UI read-only; observations/follow-up plan/allergies have no field; 4 conflicting completion rules |
| Prescription | ❌ | ⚠️ | FE medicine shape → 400; no PDF; no signature/amendment |
| Follow-up | ❌ | ⚠️ | Screen unreachable; no duration field; UTC day numbering; P0 extra-question hole |
| Safety | ❌ | ⚠️ | Grading is good; alerts lack patient fields/single GET; `openOnly` bug; not transactional |
| Case Clarification | ❌ | ✅ | Backend complete and assignment-scoped; FE enums/fields mismatch; expert screens unreachable |
| Notifications | ❌ | ⚠️ | Inbox API fine; 7 of 14 templates never produced; failed pushes vanish; no doctor push registration |
| Documents | ❌ | ⚠️ | Access control good; unreachable without `patientId`; no doctor upload; request-report lifecycle has no notifications |
| Profile | ❌ | ⚠️ | Single specialty, `en/hi` only, fee is admin-owned, no photo in profile, no bank model |
| Earnings | ❌ | ❌ | `/doctor/payouts` per-row only, uses **current** fee, counts refunds, no periods/batches |

---

## 3. Critical Integration Matrix

Status key: ❌ broken · 🔴 missing backend · 🟣 contract mismatch · ⚫ security/privacy · 🟡 redundant · 🔵 dead. FE paths are relative to `apps/doctor/src`; BE paths to `coracure_backend/src`.

| ID | Area | UI expectation | Frontend source | API | Backend source | DB | Problem | Sev | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| INT-01 | All | Screens load server data and mutations persist | `data/api.ts:26-84`, every screen | — | — | — | No client, no auth, no session. Doctor clients missing from `libs/api`; tokenStore/config patient-branded | P0 | §0.1 ✔LV |
| AUTH-01 | Auth | OTP verify signs in only the owner of the number | `DoctorLoginScreen.tsx:176,239` (stubs) | `POST /auth/doctor/otp/verify` | `identity/doctor-auth.service.ts:89-104` → `otp/slide.provider.ts:69-73` | — | Doctor is looked up by `mobileNumber`, then `otp.verify(challengeId, code)` runs with **no check that the challenge was issued to that number/purpose**. An attacker requests a patient OTP for their own phone and submits the victim doctor's number with their own challengeId+code, receiving the doctor's tokens. Same pattern in `patient-auth.service.ts:70`. Admin 2FA is bound correctly | P0 ⚫ | ✔LV |
| APPT-B01 / CLIN-01 | Appointments, Cases, Docs | Patient initials/age/gender, intake, documents, visit count per consultation | `data/doctor.ts:89-128`, `CasesScreen`, `PatientDocumentsScreen` | `GET /v1/doctor/consultations[/:id]` | `booking/booking.service.ts:51-67` (`ConsultationRecord`), `shape()` 804-822 | `consultations.patient_id` | **`patientId` is not in the response.** `GET /patients/:id/card` (initials/age/gender) and `GET /doctor/patients/:id/files` exist but can't be addressed. `intake_answers` has no doctor read path | P0 | ✔LV |
| INST-01 | Instant | Doctor receives instant requests | `InstantRequestScreen.tsx`, `AppShell.tsx:232` | `GET /me/doctor/instant-requests`, push `instant_request` | `booking/booking.service.ts:149-180` (`requestInstant`) | `instant_consultancy` | `requestInstant` creates the consultation (`awaiting_doctor`) but **never calls `offerNext`**. The only callers are decline (`instant-routing.service.ts:263`) and the sweeper re-route (:299), which only walk existing offers. **No offer is ever created, so no doctor is ever notified.** `NO_ONE_AVAILABLE` is never thrown | P0 | ✔LV |
| INST-02 | Instant | Request appears in real time with a countdown | `AppShell.tsx:232`, `messaging.ts:26` | — | no `@WebSocketGateway`/SSE anywhere (socket.io is a dependency only) | — | No realtime channel. FCM push is the only delivery, and the Doctor app has no push stack or token registration. SRS:148/:475 require realtime | P0 | grep: 0 gateways |
| APPT-B07 | Video | Doctor joins a LiveKit room | `ConsultationRoomScreen.tsx` | `POST /v1/consultations/:id/video/token` | `video/video.service.ts:405-470` | — | No LiveKit/WebRTC dependency in any `package.json`. The token could never be used | P0 | package.json |
| APPT-B02 | Video/Payments | Rescheduled or free consultations are joinable | — | `POST …/video/token` | `video/video.service.ts:433-445` `requirePaid`; `booking.service.ts:401,683` | `payments.consultation_id @unique` | Reschedule creates a new row with status `scheduled`; the payment stays on the old id → **402 NOT_PAID forever**. Fee-0 bookings have no payment row → 402 | P0 | ✔LV |
| CLIN-03 | Prescription | Save medicines `{id, name, generic, dose, route, quantity, frequency, duration, instruction}` | `data/clinical.ts:121-132`, `EPrescriptionScreen.tsx:154,273,295` | `PUT /doctor/consultations/:id/clinical-record` | `clinical/dto/clinical.dto.ts:25-55` | `clinical_records.medicines` jsonb | `id/generic/route/quantity` are not in the DTO and `instruction` ≠ `instructions`. `forbidNonWhitelisted` → **400**. Add/Edit buttons are dead in the UI | P0 | main.ts:58-61 |
| CLIN-04 | Prescription | "Preview PDF", patient receives the prescription | `EPrescriptionScreen` | — | `files/patient-files.service.ts:187-205` `storeGeneratedPdf` (no caller) | `patient_files` | No PDF generation anywhere; `prescription_ready` is never emitted | P0 | grep |
| CLIN-06 | Clinical | Non-prescriber can finalise with advice only | `CaseSummaryScreen` | `POST …/clinical-record/finalise` | `clinical/completion.ts:72-79` vs migration m15:88-99 | CHECK `clinical_records_finalised_is_complete` | Service accepts any advice field; the DB CHECK accepts only `advice_covered` → 23514 → **500** (`http-exception.filter.ts:112-118`). The Postgres failing-row DETAIL may put clinical text in logs | P0 ⚫ | |
| FUP-06 | Safety | Doctor extra questions never affect red-flag grading (FR-13.8) | (no UI yet) | `POST /doctor/consultations/:id/followup {extraQuestions}` | `followup/followup.controller.ts:114` (`as never`); `pathway.ts:143-151,199-220` | `consultations.extra_checkin_questions` | A doctor question with id `self_harm`/`feeling_unsafe` **hides the approved question** (and its `required` check). `evaluate()` still reads `answers[rule.questionId]`, so red flags grade the doctor's wording. Different option values mean the red flag never fires. Latent: no UI sends extra questions yet | P0 (latent) | ✔LV |
| AUTH-12/13 | Onboarding | Complete onboarding → doctor becomes verifiable | `onboarding/OnboardingFlow.tsx`, `data/registration.ts` | `POST /me/doctor/credentials[/upload-url]`, `PATCH /me/doctor/profile` | `doctors/verification.service.ts:167-214`, `specialty-catalogue.ts:66-70` | `doctor_documents` | UI never uploads `registration_certificate` (baseline-required), so **no doctor could reach verified**. DOB, gender, email, ID number, qualification rows and experience rows have no DTO field → 400 | P0 | |
| CLAR-S1 | Clarification | De-identified case for the expert | `CreateClarificationScreen.tsx:44,241`, `clarification.ts:52`, `ExpertInboxScreen.tsx:26,54,252`, `ExpertCaseReviewScreen.tsx:79` | `/doctor/clarification-cases`, `/doctor/expert-reviews` | `clarification/clarification.service.ts:698-718` (allow-list) | — | UI contract builds the shared case id from the **patient case ref** (a join key back to the patient) and shows **patient initials** in expert rows. The backend correctly withholds these; the UI must not be wired as drawn | P0 ⚫ | |
| INST-06 | Instant | Accept after the patient cancelled is refused cleanly | `InstantRequestScreen` | `POST …/instant-requests/:id/accept` | `instant/instant-routing.service.ts:206-254` | CHECK `consultations_cancelled_is_attributed` | Offer CAS commits `accepted`; a separate tx updates a cancelled row → CHECK violation → 500; the offer stays accepted and **the doctor stays `request_pending` forever**. Cancel doesn't close open offers | P1 | |
| INST-08 / APPT-B05 | Instant | Unpaid accepted instant expires | `InstantAcceptedScreen.tsx` | — | `instant-routing.service.ts:220` (no `holdExpiresAt`); `booking.service.ts:223-254` | `consultations.hold_expires_at` | Hold sweeper skips `NULL` holds, so the **doctor is stuck `in_consultation` forever** if the patient never pays | P1 | |
| INST-09 / APPT-B03 | Instant | Doctor becomes available again | Dashboard lock `DashboardScreen.tsx:79,102-128` | `PUT /me/doctor/presence` | `instant/presence.service.ts:109,181-197`; `booking.service.ts:832-841` | `doctors.blocked_by_consultation_id` | Instant call ends → gate shut → doctor marks no-show → `no_show` isn't documentable → **gate can never clear**, and presence is refused forever. There is no admin override | P1 | |
| INST-10 / CLIN-08 | Instant | Documentation gate enforced (FR-10.5) | — | finalise | `clinical/clinical-records.service.ts:264-273` → `presence.service.ts:192-197` | same | `clearCompletionGate(doctorId)` is unconditional, so finalising **any** consultation clears the gate held by an undocumented instant | P1 ⚫ | |
| INST-11 | Instant | After finalise the doctor can go Available | `DashboardScreen.tsx:102-128` | — | `presence.service.ts:191-197` | `doctors.presence` | Gate cleared, presence left at `completing_notes`; the FE hides the picker while in an auto state → deadlock once wired | P1 | |
| CLIN-05 | Clinical/Follow-up | Completion requires follow-up assigned | `data/clinical.ts:298-308` | `POST …/followup` | `followup/followup.service.ts:118-127` | — | FE requires follow-up **before** completion; BE refuses follow-up **until** finalised (`NOT_YET_DOCUMENTED`). The flow can never complete | P1 | |
| CLIN-02 | Clinical | Observations, follow-up plan, allergies, explicit referral yes/no | `data/clinical.ts:54-110`, `EPrescription:228` | PUT clinical-record | `clinical.dto.ts` | — | No fields; FR-11.1 makes follow-up plan and referral mandatory. The notes UI is read-only `<Text>` (`components/clinical.tsx:118-134`) | P1 | |
| APPT-B04 | Earnings | Earnings per period, historic amounts stable | `EarningsScreen.tsx`, `doctor.ts:442-541` | `GET /v1/doctor/payouts` | `payments/payments.service.ts:388-406` | `doctors.consultation_fee_inr` vs `payments.consultation_fee` | Uses the doctor's **current** fee (a fee edit rewrites history); includes refunded payments; no dates/periods/batches/aggregates; fixed limit 50 | P1 | |
| APPT-B06 | Payments | Money captured on a dead consultation is refunded/flagged | — | payment webhook | `payments.service.ts:208-245,220`; `booking.service.ts:192-221` | payments | Capture after hold expiry: payment `paid`, consultation update throws, the retry is swallowed by idempotency → **money taken, no refund, no alert** | P1 | |
| CLAR-B03 / FUP-10 | Clarification, Safety | Filter "Closed/Reviewed" | `ClarificationsScreen`, `FollowUpAlertsScreen` | `?openOnly=false` | `clarification/dto/clarification.dto.ts:118`, `followup/dto/followup.dto.ts:87`; `main.ts:81` | — | `enableImplicitConversion` + no `@Transform`, so `Boolean("false") === true`. **Closed cases and alerts can never be listed** | P1 | ✔LV |
| NOTIF-02 | Notifications | Safety notification visible in the inbox | `NotificationsScreen` | `GET /me/notifications` | `notifications/notifications.service.ts:157,170,235-254` | `notifications.status` | A failed push marks the row `failed`, and inbox/unread-count exclude `failed` → **red-flag notification vanishes from the inbox** | P1 | |
| FUP-09 | Safety | A red check-in always creates an alert | — | patient check-in (setup) | `followup/followup.service.ts:269`; `safety-alerts.service.ts:125` | `checkin_responses`, `safety_alerts` | Not transactional: an alert-write failure leaves the red day recorded with **no alert to the doctor**, and a retry → 409 ALREADY_CHECKED_IN | P1 | |
| FUP-11/12/18/19 | Safety/Follow-up | Alert card shows patient, day, triggering answers; deep link opens one alert | `data/followup.ts:77-91,243-312` | `GET /doctor/safety-alerts` | `safety-alerts.service.ts:13-26`; `followup.service.ts:356,367-372` | — | No patient fields, no `GET /safety-alerts/:id`, no doctor plan endpoint (day X of Y), history lacks id/question text/fired rules; only the current pathway version's text is fetchable | P1 | |
| AUTH-16 | Auth | Route by verification status | `app/App.tsx:39`, `AppShell.tsx:168` | verify response `verificationStatus` | `doctor-auth.service.ts` | `doctors.verification_status` | Every login routes to onboarding; the default `initialVerification='approved'` fakes approval; status-preview tabs ship to production (`ProfileRouter.tsx:35-54`) | P1 | |
| AUTH-30 | Auth | Session survives token expiry | `libs/api/src/http.ts:209,220-222` | any | `identity/auth.guard.ts:49`, `tokens.service.ts:114-125` | — | Backend returns `TOKEN_INVALID` for **expired** tokens, and the client clears the session on `TOKEN_INVALID` without trying a refresh → forced logout mid-consult when clock skew > 45 s | P1 | |
| APPT-S01 | Appointments et al. | Patient full name everywhere | `doctor.ts:90`, Cases/Notes/Rx/Room/Tasks/Earnings | — | `patients/patients.controller.ts:36-45` ("not a name"); SRS FR-9.2 | `patients.full_name` | **Intentional privacy restriction** conflicting with the UI. Human decision (§9) | 🟣 | |
| NOTIF-04 | Notifications | Push reaches the doctor device | — | only `pushToken` on OTP verify | `auth.dto.ts:37-41`; `notifications.module.ts:44` | `doctors.push_token` | No FCM in the app, no token update/rotate endpoint; log provider reports "delivered" when FCM is off | P1 | |
| NOTIF-05 | Notifications | Doctor notified: report uploaded, documentation pending, approved, document rejected, expert response, booking | `data/messaging.ts:61-112`, `documents.ts:143-197` | — | `notifications/notification-templates.ts` | — | 7 of 14 templates are never produced (`report_uploaded`, `pending_documentation`, `doctor_approved`, `document_rejected`, `prescription_ready`, `report_requested`, `consult_reminder`). Clarification `tell()` only logs (`clarification.service.ts:683-694`) | P1/P2 | grep `notify({` |
| AVAIL-07 | Availability | Leave on a day with bookings is refused (DR-07-02) | `AvailabilityScreen.tsx:390-395` | `POST /me/doctor/availability/blocked` | `scheduling/availability.service.ts:200-236` | — | Accepted silently; booked patients orphaned | P1 | |
| AVAIL-08/09 | Availability | "Offline = not bookable"; "Available Now = receives instant" | `doctor.ts:52-53` | — | `presence.service.ts:21`; `assignment.service.ts`; `scheduling.service.ts:181-206` | — | BE offline is still slot-bookable; Available Now only receives offers inside diary hours; the FE doesn't read `allowInstantConsult`. Semantics diverge | P1 🟣 | |
| AUTH-02 | Credentials | Only governance/ops admins read identity docs | — | `GET /doctor-credentials/:id/download-url` | `doctors/doctors.controller.ts:99-108` | — | `@Roles('doctor','admin')` with no `assertPermission`: finance/content admins can download doctor ID proofs | P1 ⚫ | |
| CLIN-07 | Clinical | A finalised record is immutable | — | PUT / finalise | `clinical-records.service.ts:161-196,248-251` | no trigger | `requireWritable` then an unconditional upsert (TOCTOU); no DB trigger | P1 | |
| CLIN-09 | Compliance | Clinical-record reads audited (M-21) | — | GET clinical-record | `clinical-records.service.ts:291-341` | audit_logs | Doctor/admin/patient reads are not audited | P1 ⚫ | |
| DOC-05 | Documents | Doctor learns a requested report arrived | `documents.ts:143-197` | — | `patient-files.service.ts:157-162`; `report-requests.service.ts` | — | No notification either way; polling only | P1 | |
| RR-01 | Request report | Send request for this consultation | `RequestReportScreen.tsx:54-60`; `AppShell.tsx:344-354` | `POST /doctor/report-requests` | `files/dto/files.dto.ts:100` | — | Route carries no consultation; fixture id `CON-10482` fails `IsUUID` → 400; `docType` → 400; no draft status | P1 | |

The full per-field tables (≈230 rows) live in the domain appendices (§A1–A6).

---

## 4. Reverse Integration Matrix (Backend → Frontend)

| ID | Backend capability | Endpoint / service | Frontend consumer | Used? | Impact | Recommendation |
|---|---|---|---|---|---|---|
| R-01 | Doctor OTP sign-in / refresh / sign-out | `auth/doctor/otp/*`, `auth/refresh`, `auth/sign-out` (`auth.controller.ts:69-187`) | DoctorLoginScreen (stub) | ❌ | No real login | Integration gap. Build a doctor auth client |
| R-02 | Self profile incl. `seniorityLevel`, `allowInstantConsult`, `isListed/isBookable`, `canPrescribe`, `bufferMinutes` | `GET/PATCH /me/doctor/profile` | none (reads fixture) | ❌ | Hypotheses "no expert status / no instant permission / no bookability" are **wrong**: the BE has them | Consume; gate the expert UI on `seniorityLevel` (UX only) |
| R-03 | Credential verification: per-document review, `rejectionReason`, required/approved/outstanding, `readyForVerification` | `GET/POST /me/doctor/credentials[/upload-url]` | none (hardcoded 60%, fake pills) | ❌ | Verification UI fake | Drive onboarding and status from it |
| R-04 | Presence with `canReceiveInstant`, `blockedByConsultationId` | `GET/PUT /me/doctor/presence` | none | ❌ | Doctor can't see why they're blocked (DR-13-03) | Consume |
| R-05 | Availability diary incl. `timeZone`, rule UUIDs, partial-day blocks, `24:00` ends | `/me/doctor/availability*` | none | ❌ | | Consume; add partial-day UI later |
| R-06 | Computed slots preview | `GET /me/doctor/slots` | none | ❌ | | Optional preview |
| R-07 | Instant request list (poll fallback), accept/decline `{rerouted}` | `/me/doctor/instant-requests*` | none | ❌ | | Consume; copy driven by `rerouted` |
| R-08 | Doctor no-show, doctor cancel | `booking.controller.ts:133,143` | none (FE has the state, no action) | ❌ | | Wire (after the no-show time-guard fix) |
| R-09 | Video readiness (`joinable`, `opensAt`, reason) & session metadata | `video.controller.ts` | none | ❌ | FE join rule is wrong | Drive Join from readiness |
| R-10 | Pending documentation with `outstanding[].code` | `GET /doctor/pending-documentation` | PendingTasks (fixture) | ❌ | FE categories don't match codes | Consume codes |
| R-11 | Clinical record GET with `canPrescribe`, `isDiagnosisProvisional`, `adviceCovered/NextFocus` | `clinical.controller.ts` | none | ❌ | FE hardcodes `canPrescribe` to psychiatrist | Consume |
| R-12 | Patient card (initials/age/gender/language) | `GET /patients/:id/card` | none | ❌ (unreachable, R-01 depends on `patientId`) | | Fix APPT-B01 first |
| R-13 | Patient files + signed download (audited) | `/doctor/patients/:id/files`, `/doctor/files/:id/download-url` | none | ❌ | | Consume after APPT-B01 |
| R-14 | Report-request cancel & list with fulfilment | `/doctor/report-requests/:id/cancel`, `/consultations/:id/report-requests` | none | ❌ | | Add a cancel button |
| R-15 | Payouts list / per consultation | `/doctor/payouts` | EarningsScreen (fixture) | ❌ | Data wrong anyway (APPT-B04) | Fix BE, then consume |
| R-16 | Follow-up pathways (structured question types), plan cancel, extra questions | `followup.controller.ts:89-129` | none | ❌ | | Consume; add an extra-questions UI only after FUP-06 |
| R-17 | Check-in history | `GET /doctor/consultations/:id/checkins` | none | ❌ | Lacks ids/labels | Extend BE, consume |
| R-18 | Safety alert ack/close metadata (who/when/closingNote) | `safety-alerts` | none | ❌ | | Display |
| R-19 | Notification unread-count, mark-read, read-all, `before` cursor | `notifications.controller.ts:38-75` | none (always-on dots) | ❌ | | Consume (`libs/api/notifications.ts` is reusable as is) |
| R-20 | Notification delivery status | `notifications.status/failureReason` | none | — | Ops-only | Keep hidden; fix NOTIF-02 |
| R-21 | Clarification draft PATCH, separate `reviewed`, `author_reply`, `clarification_request` loop, `IDENTIFIER_PRESENT` details | `clarification.controller.ts` | none | ❌ | | Consume |
| R-22 | Expert inbox & reply (assignment-scoped) | `/doctor/expert-reviews*` | ExpertInbox (orphan), ExpertCaseReview (unreachable) | ❌ | | Wire and route |
| R-23 | Care Hub shelf filters (`itemType`, `concernId`, `verifiedOnly`) | `GET /care-hub/items` | CareHub (fixture) | ❌ | `libs/api/careHub.ts` has no filters and the wrong `body` type | Extend client |
| R-24 | `recommendedContentIds` on the clinical record | PUT clinical-record | CareHub saves locally | ❌ | Note dropped | Consume |
| R-25 | Legal documents / doctor consents (`doctor_agreement`) | `legal.controller.ts:36-80` | Privacy link dead | ❌ | `doctor_agreement` is never enforced anywhere | Consume + enforce (compliance) |
| R-26 | Diary `timeZone` | availability GET | none | ❌ | Device-tz rendering risk | Show / use |
| R-27 | `cancellationReason`, `cancelledAt` | consultation record | not modelled | ❌ | Hypothesis "no cancellation reason" is **wrong** | Consume (the free text may hold health info) |
| R-28 | Instant `attemptNumber`, `offeredAt` | offers | none | — | | Fine to hide |
| R-29 | `storeGeneratedPdf` | `patient-files.service.ts:187` | — | 🔵 dead in BE | | Wire into finalise (CLIN-04) |
| R-30 | `ObjectStorage.remove` | storage | — | 🔵 dead | Soft-deleted objects never removed (DOC-07) | Sweeper |
| R-31 | Doctor branch of `billFor` | `payments.service.ts:362` | — | 🔵 unreachable (route patient-only) | | Remove or expose a doctor payment status |
| R-32 | `WRONG_APP_FOR_ACCOUNT` | `identity.errors.ts:13` | — | 🔵 never thrown | | Implement or delete |
| R-33 | Doctor-uploaded document classification (`uploaded_by_doctor_id`) | only via the uncalled `storeGeneratedPdf` | — | 🔵 | No doctor upload endpoint | Decide (DOC-06) |
| R-34 | Admin surfaces (18 admin-doctor routes, clarification assign, pathway publishing, governance) | admin controllers | n/a | — | Admin panel scope | Out of scope |

---

## 5. API Contract Mismatches

### 5.1 Endpoint missing (UI action has no backend)
Earnings periods/aggregates/payout batches/expected date · doctor reviews & rating (gap G-3; `GET /admin/feedback` is admin-only) & review tags · dashboard summary · total past consultations · patient consent read for the doctor · payment status for the doctor · bank details & bank verification · doctor change-request · doctor support tickets & FAQ · clinical templates (deferred in SRS FR-9.6) · prescription PDF / preview · case export · report-request draft · doctor file upload · clarification attachments (write & expert read) · clarification close outcome/note · follow-up duration override · single safety alert GET · doctor follow-up plan GET · safety escalate · chat (none at all) · push token update/rotate · schedule rule PATCH (edit = DELETE + POST, not atomic) · doctor-facing reliability (DR-05-03).

### 5.2 HTTP method / path
No method mismatches, because no FE calls exist. The client-shaped issues:
- `libs/api` `consultations.ts`, `payments.ts`, `doctors.ts`, `profile.ts`, `auth.ts` and `instant.ts` target patient routes (403 for a doctor). A doctor module is needed.
- `openTarget` routes drop every id: `AppShell.tsx:227-234`, `messaging.ts:26`.

### 5.3 Request DTO mismatches (all → 400 under `forbidNonWhitelisted`)
| UI payload | Backend DTO | Mismatch |
|---|---|---|
| Medicine `{id, generic, route, quantity, instruction}` | `MedicineDto {name, dose, frequency, duration, instructions?}` | 4 extra fields, 1 renamed (CLIN-03) |
| Clarification `{guidanceArea, urgency:'priority', history, question, ageLabel:'32 years', gender:'Male'}` | `CaseInputDto {briefHistory, specificDoubt, urgency: routine\|soon\|urgent, patientAge:int, patientGender: male\|female\|other\|undisclosed}` | extra field, enum, renames, types (CLAR-P03/P05) |
| Close clarification `{outcome, note}` | no body | fields dropped (CLAR-P05) |
| Leave `{dateLabel:'5 Jun', reason}` | `{date: YYYY-MM-DD, startTime?, endTime?}` | no year, `reason` not allowed (🟣 not stored by design) |
| Override `{'Fri, 24 May', '09:00 AM – 02:00 PM'}` | `{date, startTime, endTime}` HH:MM 24h | free text vs structured |
| Weekly `{day:'Monday', ranges:[{from:'09:00 AM'}], enabled, modes}` | `{windows:[{dayOfWeek 0=Sun, startTime, endTime}]}` | index shift, 12h vs 24h, `enabled`/`modes` dropped, `24:00` unrepresentable |
| Presence `'available'\|'scheduledOnly'` + hours | `{presence:'available_now'\|'scheduled_only'\|…}` | enum spelling; hours not accepted |
| Onboarding `{fullName, dob, gender, email, idType, idNumber, languages:['Marathi']}` | `UpdateOwnDoctorProfileDto {bio, languages ∈ en,hi, consultationDurationMinutes, bufferMinutes}` | 6 fields have no destination; languages limited to `en`/`hi` |
| Fee edit `{consultationFee}` | not in DTO (admin-owned) | intentional; the UI must go read-only |
| Report request `{docType, consultationId:'CON-10482', reason (required)}` | `{consultationId: UUID, title ≤160, reason? ≤2000}` | extra field, non-UUID id |
| Alert close `{action, note (optional)}` | `{closingNote}` required ≤2000 | action dropped; empty note → 400 |
| Follow-up assign `{pathway, duration, start}` | `{pathwayCode, startsOn?, extraQuestions?}` | duration has no field |
| Case summary 60–1000 chars | 3–5 non-blank lines ≤2000 | rule differs; the FE's own sample fails `CASE_SUMMARY_TOO_SHORT` |

### 5.4 Response mismatches
- **Consultation:** no `patientId`, intake, payment or consent. `consultationFeeInr` = the specialty *patient* price, not the doctor's fee.
- **Doctor profile:**
  - `specialtyId` UUID, not a name (needs a `/services` join).
  - A single specialty, where the UI expects `specialisations[]`.
  - No photo.
  - `consultationFeeInr` means the patient price, while the `doctors.consultation_fee_inr` column is the payout. **One name, two meanings.**
- **Instant offer:** `{id, consultationId, doctorId, attemptNumber, outcome, offeredAt, expiresAt}` only. The UI expects name, age, gender, concern (🟣 withheld by design), plus service and language (🔴 missing, DR-13-02).
- **Safety alert:** no patient, pathway, day or answers.
- **Check-in history:** no id, question text or fired rules.
- **Clarification view:**
  - No `updatedAt`.
  - Expert name unresolvable (`expertDoctorId` only).
  - `attachmentIds` always `[]`.
- **Payouts:** no dates, mode or payment status; the refund is not surfaced.
- **Files:** no size, by design. `category` ≠ FE `kind` (`journal` vs `medical_history`).
- **`libs/api` types wrong for the doctor's reuse:**
  - `JoinToken.expiresAt?` vs `expiresInSeconds`.
  - `PatientFile.contentType/sizeBytes/isPartOfRecord` don't exist.
  - `FileRequest.description` vs `title/reason/status/fulfilledBy`.
  - `getDownloadUrl.expiresAt?` vs `expiresInSeconds`.
  - `CareHubItem.body: string` vs an object that is absent from shelf rows.

### 5.5 Enum mismatches
| Concept | Frontend | Backend |
|---|---|---|
| Consultation status | `confirmed, upcoming, completed, cancelled, noShow` (`doctor.ts:82`) | `pending_payment, scheduled, awaiting_doctor, in_progress, awaiting_documentation, completed, cancelled, no_show, expired`. **5 BE states unrepresented**; FE `confirmed`/`upcoming` are one BE state split by time |
| Presence | `available, offline, paused, scheduledOnly, requestPending, inConsultation, completingNotes` | `available_now, offline, paused, scheduled_only, request_pending, in_consultation, completing_notes`. Same 7 concepts, different spelling |
| Consultation mode | `video, audio, inPerson` | `scheduled, instant`. **Different axes** |
| Payment | `paid, refunded, notPaid` | `created, pending, paid, failed, refunded` (partial refund → `refunded`) |
| Gender | `Male, Female` | `male, female, other, undisclosed` |
| Clarification status | `draft, posted, expertReview, clarificationNeeded, responseReceived, reviewed, closed` | `draft, posted, awaiting_response, clarification_asked, response_received, reviewed, closed` |
| Clarification urgency | `routine, priority, urgent` **and** `High/Medium/Low` | `routine, soon, urgent` |
| Clarification message type | `comment, considerations, clarification, followUp` **and** `comment, clinical, clarification, followup, inperson` | `comment, clinical_consideration, clarification_request, followup_recommendation, author_reply` |
| Safety alert type | `redFlag, amber, sideEffect, missed, due` | `red_flag, amber, medication_side_effect, missed_checkin, followup_due` (`followup_due` never raised) |
| Alert status | `…, escalated, reviewed` | `open, acknowledged, closed` (no escalated) |
| Check-in day | `stable, attention, redFlag, pending` | `green, amber, red`; missed = absent row |
| Pathway code | `depressionAnxiety` | `depression_anxiety` |
| Care Hub type | `tool, education, article, caregiver` | `self_help_tool, education_module, blog_article, caregiver_guide` (+3) |
| Document kind | `report, prescription, image, journal` | `medical_history, report, photo, prescription_pdf, clarification_attachment` |
| Report request status | `draft, open, fulfilled, cancelled` | `open, fulfilled, cancelled` |
| Verification status | `pending, rejected, approved` | 5 states (`pending, under_review, verified, rejected, suspended`) |
| Pending-task category | `summary, prescription, note, followUp` | `CASE_SUMMARY_*`, `PRESCRIPTION_OR_ADVICE_MISSING`, `ADVICE_MISSING` |
| Languages | 12 names | codes `en, hi` only |
| Error code for DTO failure | `VALIDATION_FAILED` (`libs/api/errors.ts`, API_CONTRACT) | filter emits **`BAD_REQUEST`** (`http-exception.filter.ts:99-102`) |

### 5.6 Nullability
- `clinical-record` GET returns 404 `RECORD_NOT_FOUND` before the first save; the UI expects an empty record.
- `ConsultationRecord.scheduledStartAt` is null for instant consults; the UI's `time` is always a string.
- `patientCard.age` is nullable; `yearsOfExperience` is nullable.
- `attachmentIds` is `[]`, not absent.

### 5.7 IDs
- The backend uses UUIDs everywhere, plus `referenceCode` `CC-XXXX-XXXX`.
- FE fixtures use `a1`, `APT-240515-0930`, `CON-10482`, `COR-12458`, `PT-10482`, `CLR-2026-0184`, `D-21-4587`, `l-<ts>`, `o-<ts>`, `r1`. The FE has **three ids per appointment** where the BE has one row.
- **No `ParseUUIDPipe` anywhere** (0 hits) and Prisma P2023 is unmapped, so a non-UUID path param gives a **500**, not a 404. This applies to every `:id` route.

### 5.8 Pagination
Conventions are inconsistent:
- consultations: `limit ≤100`, no cursor or total ("past" silently truncates)
- payouts: fixed 50
- safety alerts: `limit ≤200`, no count
- clarifications: `take:100`
- notifications: `before` cursor
- admin: limit/offset
- patient files: unbounded

No endpoint returns `total`/`hasNext`, so FE counts such as `TOTAL_CASES=52` and chip counts have no source.

### 5.9 Date / time
See §6 (timezone rule) and Appendix A3.
- The backend stores and returns UTC instants plus platform-zone wall-clock rules (`PLATFORM_TIMEZONE`, default Asia/Kolkata; no per-doctor tz).
- The FE has preformatted strings with no year and no tz handling (the only formatter is `toLocaleTimeString('en-IN')`, which uses the device zone).
- Follow-up day boundaries use **UTC**, while the prompt hour uses IST.

### 5.10 Error contract
- The envelope `{statusCode, code, message, details, path, requestId, timestamp}` matches `libs/api/errors.ts` ✅.
- Mismatches:
  - `VALIDATION_FAILED` vs `BAD_REQUEST`.
  - `DomainCode` is missing `DOCTOR_NOT_APPROVED`, `CREDENTIALS_INCOMPLETE`, `UPLOAD_NOT_RECOGNISED`, `OTP_PROVIDER_UNAVAILABLE`, `IDENTIFIER_PRESENT`, `NOT_IN_THAT_STATE`, `OFFER_CLOSED`, `DOCUMENTATION_OUTSTANDING`, `RECORD_INCOMPLETE`, `NOT_PAID`.
  - `TOO_MANY_ATTEMPTS` has no `retryAfterSeconds`.
  - CHECK violations (23514) and P2023 map to 500.

### 5.11 Authorization mismatches
- Doctor `me/doctor/*` routes skip `@VerifiedDoctorsOnly` by design; the UI doesn't gate tabs by status.
- The Rejected screen is unreachable in production: rejected/suspended doctors get 403 at sign-in, and a reopened doctor becomes `under_review`.
- `ConsultationFilesController` and `patients/:id/card` lack `@VerifiedDoctorsOnly`, so a suspended doctor keeps read access (DOC-10).
- The FE has no expert role model; the BE enforces assignment (✅).

---

## 6. Business Logic Divergence

| Business rule | Frontend logic | Backend logic | Difference | Risk |
|---|---|---|---|---|
| Can join call | `state==='confirmed'` (`AppointmentsScreen:153`, `AppointmentDetails:109`); Dashboard Join always enabled (`:230`) | own teleconsent + payment `paid` + status ∈ {scheduled, in_progress} + now ≥ start−15 min (`video.service.ts:405-470`) | FE ignores time, payment and consent | Join offered days early; 402/403/409 surprises. Use `/readiness` |
| Appointment buckets | fixture `bucket` field | status-based `upcoming=true/false` (`booking.service.ts:618-637`) | FE "today/upcoming/past" by date vs BE by status | A stale `scheduled` row stays "upcoming" and joinable forever (no sweeper) |
| Clinical completion | **two** FE rules: `missingForCompletion` (notes+output+follow-up+summary, `clinical.ts:298`) and `isClinicallyComplete` (Rx finalised + summary, `doctor.ts:231`) | `outstandingFor`: summary 3–5 lines + (medicine or any advice), advice-only for non-prescribers (`completion.ts:100-141`) + **DB CHECK** (`advice_covered` only) | 4 rules, none agree; FE needs follow-up first, BE forbids it before finalise | Deadlock (CLIN-05); 500 on finalise (CLIN-06) |
| Case summary validity | 60–1000 chars | 3–5 non-blank lines, ≤2000 | chars vs lines | FE-valid summaries rejected |
| Can prescribe | hardcoded `['psychiatrist']` (`clinical.ts:18-20`) | `Specialty.isActive && canPrescribe` → 403 `PRESCRIBING_NOT_PERMITTED` | data-driven vs hardcoded | Wrong gating as specialties change |
| Instant eligibility | `acceptsInstantRequests = status==='available'` (`doctor.ts:65`) | `available_now && allowInstantConsult && !blockedByConsultationId && diary hours free` | FE ignores permission, gate and diary | UI tells doctors they're reachable when they're not |
| Auto presence | derived from the top screen (`AppShell.tsx:210-219`); boots `'offline'` | event-driven, persisted; scheduled calls never move presence | two owners | Divergence on navigation and on restart |
| Offline semantics | "hidden from patients, no scheduled requests" (`doctor.ts:52`) | offline = still slot-bookable (`presence.service.ts:21`) | meaning differs | Doctor "offline" still gets booked (🟣 decide) |
| Status lock | picker hidden in auto states (`DashboardScreen:102-128`) | doctor may PUT from any state, incl. `in_consultation`/`request_pending` (INST-12) | FE stricter, BE too loose | FE trap after finalise; BE allows double-booking an instant |
| Countdown / timeout | fixed 24 s; at 0 calls **decline** | `expiresAt` = 45 s + 10 s sweep → `timed_out` | length and outcome differ | Timeouts recorded as declines; wrong copy |
| Schedule overlap | `validate` (`AvailabilityScreen:362-382`) | `assertNoOverlap` (`availability.service.ts:442-469`) | equivalent ✅; FE also rejects an empty enabled day | Low |
| Identifier scan (clarification) | `clarification.ts:17-35` (catches `PT-…`), submit ignores its own result | `deidentify.ts:44-68` (catches phone numbers); refuses, doesn't redact | different regexes; **neither catches names, `COR-12458`, `CON-…`, MRN/UHID, DOB, addresses** | Re-identification (CLAR-S2) |
| Expert-view projection | FE `deIdentify()` on a patient fixture | BE `expertView` allow-list | duplicate | Must bind only to the server view |
| Alert ordering | severity rank (`followup.ts:96-102`) | `createdAt asc` (`safety-alerts.service.ts:182`) | DR-16-03 wants severity + age | A red flag beyond the 200 limit can be missed |
| Follow-up review date | start + d − 1 (`followup.ts:39`) | same (`pathway.ts:252-256`) | identical ✅, but FE duration 3/14 isn't supported | Wrong review date for 3/14 |
| Total experience | merges spans (`registration.ts:159-179`) | admin-typed int | two sources | Divergent display |
| Call duration | doctor's own join→leave | overlap of both parties (`session.ts`) | different definitions; FE value discarded | None today |

---

## 7. Redundancy Report

| Duplicate | Frontend | Backend | Why it exists | Divergence risk | Recommendation |
|---|---|---|---|---|---|
| Completion rule ×4 | `clinical.ts:298`, `doctor.ts:231` | `completion.ts:100`, CHECK m15:88-99 | FE mock + BE service + DB | **Already divergent** (CLIN-06) | BE `outstanding[]` is the source of truth; align CHECK ↔ service |
| Presence ownership | AppShell nav-derived | `doctors.presence` | FE predates BE | High | Consume BE presence only |
| Duration editors ×2 | `AvailabilityScreen:256`, `ConsultationDurationScreen` | one column | Two designs | Medium | One editor, read from the profile |
| Appointment ids ×3 | `id`, `appointmentId`, `consultationId` | one row (`booking.service.ts:70-76`) | Fixture design | Medium | Use `id` + `referenceCode` |
| `nextAppointment`, `todaySummary`, `clinicalTasks` vs lists | `doctor.ts:373,381,838` vs lists | — | Fixture shortcuts; values already contradict | — | Derive from lists (no BE summary exists) |
| Alert models ×2 | `patientAlerts` (used), `followUpAlertList` (dead) | — | Iteration | — | Delete the dead one |
| Severity vocabularies ×3 | `AlertCategory`, `DayState`, `AlertSeverity` | one | Iteration | High | One adapter |
| Urgency vocabularies ×3, message types ×2, status label maps ×2 | clarification.ts, ExpertInbox | one each | Two designers | High | One adapter to BE enums |
| Expert screens ×2 / "read answer" screens ×2 | ExpertInbox vs ExpertCaseReview; ExpertClarification vs ExpertResponse | one API each | UI iteration | Medium | Pick one each |
| Expert chat thread vs clarification thread | `messaging.ts:143-153` | M-17 `messages` jsonb | Chat mock | **Privacy:** bypasses scanner and assignment | Remove, or back with M-17 |
| Notification row vs safety-alert row | shows both, unlinked | "record vs postman" (`safety-alerts.service.ts:55-60`) | Intentional | Low | Link via `alertId` |
| Fee name | `consultationFee` | `consultationFeeInr` (patient price) vs `doctors.consultation_fee_inr` (payout) | Naming | **High** (earnings bug APPT-B04) | Rename; expose payout explicitly |
| Validation codes ×2, auth codes ×2 | expects `VALIDATION_FAILED` | `BAD_REQUEST` / `VALIDATION_FAILED`; `TOKEN_INVALID` / `UNAUTHENTICATED` | Filter default | Medium | `exceptionFactory` → `VALIDATION_FAILED`; add `TOKEN_EXPIRED` |
| Weekly rules: per-rule DELETE + whole-replace PUT | — | both; PUT regenerates ids | API design | Cached ids 404 after PUT | FE uses PUT only for weekly |
| `isTreating` vs `requireParty` | — | two authz paths, different status sets | Module boundaries | Medium | Consolidate |
| History fields ×2 (notes history vs Rx history & allergies), advice sections ×2 | ClinicalNotes / EPrescription | one field set | UI iteration | Medium | Map to one set |

---

## 8. Dead / Unused Functionality

**Backend unused by the frontend:** everything in §4 (R-01…R-28). All doctor endpoints have 0 consumers.

**Frontend unused internally:**
- Six `data/api.ts` fetchers (`fetchSummary`, `fetchNextAppointment`, `fetchWorkload`, `fetchEarnings`, `fetchFeedback`, `fetchReviews`; `fetchProfile` only in `test-setup.ts`).
- `ExpertInboxScreen` (never imported).
- Routes `assignPlan` and `expertCaseReview` (never pushed).
- `followUpAlertList`, `templatesFor`, `reportsRequested`, `selfHarmThoughts`, `referralAdvised`, `recommendableResources`, `AlertSeverity`.
- About 25 no-op handlers, e.g.:
  - login footer links
  - Message/More/Copy ID
  - Earnings payout
  - Reviews report
  - PendingTasks actions
  - Room add-participant, follow-up and report
  - PatientDocs open/more
  - Help & Support actions
  - DeclinedScreen pause (`onPause={reset}`)
  - fee/duration/request-change `onSave`/`onSubmit` not passed
- `AvailabilityScreen.spec.tsx` is stale: its 4 tests target testIDs that don't exist.

**Database fields not consumed by the doctor UI:**
- `doctors.seniority_level`, `allow_instant_consult`, `is_listed`, `buffer_minutes`, `blocked_by_consultation_id`
- `consultations.cancellation_reason`, `hold_expires_at`, `intake_answers`
- `clinical_records.is_diagnosis_provisional`, `advice_covered`, `advice_next_focus`
- `safety_alerts.acknowledged_*`, `closing_note`
- `notifications.status`, `failure_reason`
- `doctor_documents.rejection_reason`

**Notification types never produced (7):** `consult_reminder`, `prescription_ready`, `report_requested`, `pending_documentation`, `report_uploaded`, `document_rejected`, `doctor_approved`. There is also no template or producer for expert response, doctor booking-confirmed or payout.

**Events with no subscriber:** `doctor.verified`, `doctor.created`, `listing_changed`, `suspended`.

**Workers with no visible consumer:**
- The retention sweeper deletes only audit logs and is disabled by default. Comments claiming it removes orphaned uploads are false (DOC-07).
- `documentation_due` only drives presence; it sends no notification.

**Obsolete or contradictory:**
- "Change password" row and FAQ f5: doctors are OTP-only.
- Room "End-to-end encrypted" claim: no E2EE is configured.
- Room "Add participant": the backend enforces 2 participants.

---

## 9. Security / Privacy Findings

### 🔴 Critical
| ID | Finding | Evidence |
|---|---|---|
| SEC-01 | Malware in backend `eslint.config.mjs` at HEAD (spawn/env/Ethereum JSON-RPC). Runs on lint and in the IDE. Neutralized in the working tree only. **Rotate every secret in `.env`, CI and the local environment; rotate the GitHub PAT embedded in the git remote URL; audit the `Soojal2005` account and CI runners; purge from history per policy.** | §0.2 ✔LV |
| AUTH-01 | OTP challenge not bound to the number, allowing doctor (and patient) account takeover | ✔LV |
| FUP-06 | Doctor extra question can silently replace an approved safety question (latent) | ✔LV |
| CLAR-S1/S2 | UI contract leaks patient-linked ids and initials into the expert view. Both identifier scanners miss names and the app's own id formats; pre-fill copies clinical-record text into shared fields | `CreateClarificationScreen.tsx:44,51-53,241,357`; `deidentify.ts:21-24,44-68` |
| CLIN-06 | Finalise 500 can write clinical text (Postgres DETAIL) to logs | `http-exception.filter.ts:61-63,112-118` |

### 🟠 High
| ID | Finding |
|---|---|
| AUTH-02 | Any admin level can download doctor identity/credential files |
| APPT-S03 | Doctor no-show has no time guard (can be marked before start); `noShowRate` counts every no-show against the doctor |
| APPT-S04 | Cancel/no-show doesn't evict the video room; the attendance row is written on a cancelled consultation |
| CLIN-07 | Finalised-record immutability TOCTOU; no DB trigger |
| CLIN-08 / INST-10 | Documentation gate bypass (FR-10.5) |
| CLIN-09 | Clinical-record reads not audited; `operations` admins read full records unaudited 🟣 |
| INST-12 | Doctor can self-set `available_now` mid-call → second instant offer |
| CLAR-S3 | Attachments promised in the UI have no scrubbing pipeline; shortcutting to patient files would violate FR-12.2 |
| CLAR-S4 | Expert learns the treating doctor's id through `messages[].authorId` |
| NOTIF-P1 | Red/amber/missed notification bodies contain the **patient's full name**: shown on the doctor's lock screen and sent to every care-coordinator, governance and super-admin (`notification-templates.ts:146-168`). On a psychiatry platform that discloses mental-health patient status 🟣 |
| AUTH-30 | Expired token → hard logout (availability of clinical sessions) |

### 🟡 Medium
- **Credentials and auth:**
  - AUTH-04: OTP request reveals account state (401 vs 403), enumeration possible.
  - AUTH-05: `confirmUpload` checks only the key prefix, so file-less credential rows can enter the admin queue.
  - AUTH-06 / all: no `ParseUUIDPipe` → 500s.
  - AUTH-03: status-preview tabs let a pending doctor tap "Approved" (UI-only; the BE still blocks).
- **Files and documents:**
  - DOC-01: `isTreating` = any non-cancelled consultation **ever**, incl. `pending_payment`, gives permanent access to all of the patient's files 🟣.
  - DOC-02: report-request audit metadata stores the title (e.g. "HIV test").
  - DOC-08: `report_requested` push body names the item on the lock screen.
  - DOC-09: signed URLs carry the patient UUID and filename in the path/disposition (proxy/CDN logs).
  - DOC-10: files and the patient card are readable by a suspended doctor.
- **Clinical:** CLIN-14: FE pre-selects risk "moderate" and the BE requires risk on every autosave, so an unassessed default gets persisted.
- **Clarification:**
  - CLAR-S5: expert replies not scanned.
  - CLAR-S6: no read audit.
  - CLAR-S8: append TOCTOU (reply racing reassign or close).
- **Follow-up:** FUP-15: acknowledge/close races overwrite the acknowledger.
- **Video:** APPT-S06: "End-to-end encrypted" claim is false.

### 🔵 Low
- AUTH-10: `verifiedByAdminId` is returned to the doctor.
- CLAR-B07: demoted experts keep assigned cases.
- APPT-S08: patient free-text `cancellationReason` is shown to the doctor.
- Chat thread matched by patient **name** (`PatientFollowUpDetailScreen.tsx:70`).

### 🟣 Decisions that need a human (do not resolve by exposing data)
1. **Patient full name to the treating doctor.** The UI shows it everywhere; SRS FR-9.2 and the backend say initials/age/gender only.
2. **Pre-accept instant card.** The UI wants name/age/gender/concern; the backend sends nothing (SRS/DR-13-02 asks for service + language).
3. **Review attribution.** "Patient R.S." initials on reviews with low volume re-identifies the patient.
4. **Patient names in safety notification copy.** Lock screen and admin fan-out.
5. **Expert identity** shown to the treating doctor, and **treating-doctor identity** leaked to the expert.
6. **Onboarding collection of the government ID number (Aadhaar), DOB, gender and email.** None is stored today; Aadhaar storage is legally restricted.
7. **Other:** "ever-treating" file access scope · `operations` admin reading clinical records and closing safety alerts · controlled drugs on e-prescription (the fixture prescribes Clonazepam; no Telemedicine Practice Guidelines check) · DSAR export scope · leave reason (the UI requires one; the schema deliberately excludes it).

**Positive controls verified:**
- Consistent 404-not-403 isolation for non-parties (consultations, clinical records, files, safety alerts, clarification author/expert).
- Doctor routes actor-scoped.
- Expert visibility bound to assignment and revoked on reassignment.
- Expert view never exposes `sourceConsultationId`.
- File reads audited.
- Content-type allow-list.
- FCM payload carries opaque ids only.
- Forbidden-term check on notification templates.

---

## 10. Data Flow Bugs (where the data disappears)

```text
Appointment list — patient initials/age
UI doctor.ts:90 → GET /v1/doctor/consultations → booking.service listFor
→ consultations (patient_id present) → shape() 804-822 DROPS patientId
→ UI has no id → GET /patients/:id/card never callable → UI would render "—"
```
```text
Join a rescheduled paid consultation
Reschedule → new row status=scheduled (booking.service.ts:401) → Payment stays on OLD id (consultation_id @unique)
→ POST /video/token → requirePaid(findUnique consultationId=NEW) → null → 402 NOT_PAID forever
(also: new row missing from earnings; cancelled original stays "paid" in payouts)
```
```text
Instant request
Patient POST instant → requestInstant creates awaiting_doctor → NO offerNext call
→ no instant_consultancy row → no push → sweeper has nothing to walk → doctor never sees it
```
```text
Prescription save
EPrescription medicines state (:154) → onFinalise() takes no args (:308) → [if wired] PUT {id,generic,route,quantity,instruction}
→ ValidationPipe forbidNonWhitelisted → 400 before the service → generic/route/quantity have no column anyway
```
```text
Non-prescriber finalise
PUT {adviceHomePractice, caseSummary 3 lines} → outstandingFor OK → POST finalise → UPDATE
→ CHECK requires advice_covered → 23514 → filter unmapped → 500 + error log with failing-row DETAIL
```
```text
Instant documentation gate after no-show
call ends (one party) → markCallEnded → documentation_due → gate=C1, presence=completing_notes
→ doctor marks no_show → C1 not DOCUMENTABLE → finalise impossible → clearCompletionGate never runs
→ PUT presence available_now → 409 DOCUMENTATION_OUTSTANDING forever
```
```text
Safety notification after a push failure
red check-in → notify → FCM rejects → settle(failed) → inboxFor/unreadCountFor exclude failed
→ doctor inbox and badge never show it (the alert queue row still exists)
```
```text
Closed cases / reviewed alerts filter
?openOnly=false → enableImplicitConversion → Boolean("false") = true → only open rows ever returned
```
```text
Earnings history
Payment.consultation_fee frozen at checkout → payoutsForDoctor reads doctors.consultation_fee_inr NOW
→ a fee change rewrites all past earnings; refunded rows still count
```
```text
Open a specific alert / case / notification
card onOpen(a) → AppShell push({name:'alertDetail'}) (no id) → detail renders the same fixture every time
(same pattern: clarification open AppShell:454, notification openTarget :227-234, patientDocs :353, requestReport :344)
```
```text
Follow-up assign
pick pathway+duration+start → onAssign() no args → AppShell onAssign={pop} → nothing
[if wired] duration has no DTO field → lost; screen itself unreachable (never pushed)
```
```text
Clarification guidance area / close outcome
Create:264 guidanceArea → forbidNonWhitelisted 400 (no column) ; ExpertResponse outcome+note → POST close has no body → 400/lost
```
```text
Red check-in when the alert write fails
checkinResponse.create OK → raiseAlertsFor throws → 500 to patient, no alert, no doctor notification
→ retry 409 ALREADY_CHECKED_IN → red day permanently without an alert
```
```text
Doctor onboarding → verifiable
UI uploads photo/ID/degree/experience (fake picker) but never registration_certificate
→ progressOf.required includes registration_certificate → readyForVerification never true → doctor never verified
```
```text
Login routing
verify → {…, verificationStatus} → App.tsx:39 ignores it → always onboarding; AppShell default 'approved' fakes access
```

---

## 11. End-to-End Flow Results

| Flow | Result | Chain (FE entry → API → BE → DB/worker → response → FE) |
|---|---|---|
| A. Doctor Login | ❌ | `DoctorLoginScreen` stub (L176/239) → [`/auth/doctor/otp/request|verify` exist ✅, P0 binding flaw] → tokens + `verificationStatus` → ignored (App.tsx:39); no keychain/session; logout never calls sign-out |
| B. Dashboard | ❌ | direct fixtures → no summary/next/earnings/rating endpoint; next derivable from list; presence not wired; counts contradict fixtures |
| C. Appointment List | ❌ | `useResource` mock → `GET /doctor/consultations` ✅ scoped → no patientId, 9↔5 statuses, `mode` axis differs, ≤100 no cursor, unpaid holds included |
| D. Appointment Detail | ❌ | `detailFor` fixture → detail endpoint ✅ → intake/consent/history/payment/documents/visit count unreachable; hardcoded "15 May 2024", "Accepted", "Starts in 15 min" |
| E. Accept Instant | ❌ | no entry path with an id → [BE never creates an offer — INST-01] → accept CAS ✅ but post-accept traps (INST-06/08) |
| F. Decline Instant | ❌ | same entry blocker → decline non-CAS → FE ignores `rerouted` |
| G. Instant Timeout | ❌ FE / ⚠️ BE | sweeper correct once offers exist; FE 24 s and treats timeout as decline |
| H. Doctor Availability (presence) | ❌ | local state → `PUT /me/doctor/presence` ✅ → enum map, offline semantics differ, gate/permission invisible, completing_notes trap |
| I. Weekly Schedule | ❌ | fake save (`setTimeout`) → `PUT …/availability/weekly` ✅ → day index / 12h / `24:00` / enabled / modes lost |
| J. Date-Specific Availability | ❌ | free-text dates without a year → `POST blocked/custom-hours` ✅ → reason not storable 🟣, non-UUID delete → 500, no booking-collision refusal |
| K. Join Consultation | ❌ | wrong FE join rule, no SDK → readiness/token ✅ → 402 for rescheduled/free; doctor teleconsent never captured in the doctor app |
| L. Complete Consultation | ❌ | End → CallLog discarded → room_finished webhook → `awaiting_documentation` → FE never finalises; notification never sent |
| M. Clinical Notes | ❌ | read-only UI → PUT exists; missing observations/follow-up plan/allergies; risk required every save |
| N. Prescription | ❌ | dead add/edit → 400 shape → no PDF, no signature/amendment, no `prescription_ready` |
| O. Case Summary | ❌ | fake input → chars vs lines → finalise can 500 → follow-up deadlock |
| P. Follow-up Pathway | ❌ | screen unreachable, payload dropped → no duration field → assign requires finalised → no doctor GET plan |
| Q. Safety Alert | ❌ | fixtures → list ✅ scoped but no patient fields, no single GET, `openOnly` bug → ack/close ✅ racy → not transactional upstream |
| R. Case Clarification | ❌ | fixtures, ids dropped → 13 BE endpoints ready ✅ → enum/field mismatches → expert screens unreachable → notifications log-only |
| S. Notifications | ❌ | fixtures → inbox API ✅ → 7 of 14 producers missing, failed rows hidden, no doctor push stack |
| T. Documents | ❌ | route has no patient → endpoints ✅ but unaddressable (no patientId) → no doctor upload, no PDFs |
| U. Doctor Profile | ❌ | fixture → `/me/doctor/profile` ✅ → specialty id not name, single specialty, `en/hi`, no photo, fee semantics |
| V. Credentials / Verification | ❌ | fake picker, 60% hardcoded → credentials API complete ✅ → registration_certificate never uploaded; Rejected unreachable |
| W. Earnings | ❌ | fixture → `/doctor/payouts` → current-fee bug, refunds counted, no periods/batches/dates |

**Result: 0 ✅ · 1 ⚠️ (G, backend side only) · 22 ❌.**

---

## 12. Production Blockers

| # | Blocker | Why it blocks | Flow | FE impact | BE impact | Evidence | Required fix |
|---|---|---|---|---|---|---|---|
| B-1 | SEC-01 malware + leaked PAT | Compromised dev/CI trust boundary | All | Don't lint either repo until confirmed clean | Commit the neutralized config; rotate secrets | §0.2 | Commit clean config, rotate secrets/PAT, audit contributor/CI, history purge |
| B-2 | AUTH-01 OTP not bound | Account takeover | A | none | `doctor-auth.service.ts:89-104`, `patient-auth.service.ts:70` | ✔LV | Bind challenge → (number, purpose) server-side; compare on verify |
| B-3 | INT-01 no doctor client/session | Nothing can integrate | All | Build doctor `libs/api` module, session provider, keychain config | — | §0.1 | Shared |
| B-4 | APPT-B01 no `patientId` | Patient card, docs, intake, history unreachable | C, D, M, T, cases | — | Add `patientId` (+card fields) to the doctor `ConsultationRecord`; intake read for the treating doctor | ✔LV | BE (after decision 🟣1 on name) |
| B-5 | INST-01 no first offer | Instant consults can't reach doctors | E–G | — | Call `offerNext` after `requestInstant`; handle null → NO_ONE_AVAILABLE | ✔LV | BE |
| B-6 | INST-02 no delivery channel | Doctor can't learn of requests | E | Push stack + poll fallback | Gateway or push + poll contract; token rotate endpoint | grep | Shared |
| B-7 | APPT-B07 no video SDK | Consultations impossible | K | LiveKit RN + WebRTC | — | package.json | FE |
| B-8 | APPT-B02 reschedule/free → 402 | Paid rescheduled consults can't be joined | K | — | Move/follow the payment; skip `requirePaid` for fee 0 | ✔LV | BE |
| B-9 | CLIN-03 medicine shape 400 | Prescriptions can't be saved | N | Map/strip fields | Decide generic/route/quantity schema | DTO | Shared + product |
| B-10 | CLIN-04 no prescription PDF | Patient never receives the prescription (FR-9.5/14.2) | N | — | Generate on finalise; call `storeGeneratedPdf`; emit `prescription_ready` | grep | BE |
| B-11 | CLIN-06 finalise 500 | Non-prescribers can't complete | L, O | — | Align CHECK and service; map 23514 → 409; scrub log DETAIL | m15:88-99 | BE |
| B-12 | AUTH-12 registration_certificate never uploaded | No doctor can become verified via the app | V | Drive uploads from `required[]` | Decide non-doctor baseline (AUTH-36) | `specialty-catalogue.ts:66-70` | FE + BE |
| B-13 | CLAR-S1 patient-linked ids/initials in expert UI | Would breach the de-identification guarantee on wiring | R | Use BE uuid; neutral avatars; bind only to the expert view | — | CreateClarification:44; ExpertInbox:252 | FE |
| B-14 | FUP-06 extra-question override | Safety grading can be silently disabled | P, Q | Don't ship an extra-questions UI before the fix | Validate `extraQuestions`, reject id collisions, grade only approved ids | ✔LV | BE |

---

## 13. Recommended Fix Order

Ordered by dependency and production impact. Owner: FE = frontend, BE = backend, INT = integration/shared.

### P0 — system cannot operate / security / data corruption
| Fix ID | Problem | Owner | Dependency | Required change | Validation test |
|---|---|---|---|---|---|
| F-01 | SEC-01 malware + PAT | Shared (lead) | — | Commit the clean `eslint.config.mjs`; rotate `.env`/CI/cloud secrets and the GitHub PAT; remove the PAT from the remote URL; review `Soojal2005` commits and CI; history purge per policy; add a CI check for long lines/obfuscation in config files | Config scan passes; old PAT revoked |
| F-02 | AUTH-01 | BE | — | Store challenge→(E.164, purpose, expiry) server-side or issue a signed challenge token; compare on verify; apply to patient too | IT-AUTH-02 |
| F-03 | INT-01 doctor client & session | FE/INT | F-02 | `libs/api` doctor module (auth, me/doctor/*, consultations, presence, instant, availability, clinical, files, follow-up, safety, clarification, notifications, payouts); parameterise keychain/client name; session provider; generate types from `/docs-json` | Typecheck against the generated schema |
| F-04 | APPT-B01 `patientId` | BE (+🟣1) | privacy decision | Add `patientId` + card fields + intake for the treating doctor | IT-APPT-02 |
| F-05 | INST-01 first offer | BE | — | `offerNext` on create; NO_ONE_AVAILABLE path | IT-INST-01 |
| F-06 | INST-02 delivery | INT | F-03 | Push (RN Firebase) + `PUT /me/device {pushToken}` + poll `instant-requests` while `available_now` (or a socket gateway) | IT-INST-02 |
| F-07 | APPT-B02 payment follow | BE | — | Move/copy the payment on reschedule or have `requirePaid` follow `rescheduledFromConsultationId`; fee-0 path; earnings follow | IT-VID-03 |
| F-08 | CLIN-06 | BE | — | Migration aligning the CHECK with `hasAdvicePlan`; map 23514/P2023; redact DETAIL in logs | IT-CLIN-03 |
| F-09 | FUP-06 | BE | — | `z.array(questionSchema).max(10)` at assign; reject colliding ids; grade approved ids only | IT-FUP-04 |
| F-10 | CLAR-S1 | FE | F-03 | BE uuid only; drop initials; expert screens bound to `/doctor/expert-reviews` | IT-CLAR-04 |
| F-11 | APPT-B07 video SDK | FE | F-03, F-07 | LiveKit RN; Join driven by `/readiness`; handle 402/403/409 and DUPLICATE_IDENTITY | IT-VID-01/02 |
| F-12 | CLIN-03/04 prescription | INT + product | decision on fields | Medicine schema decision; FE mapper; PDF on finalise | IT-CLIN-01, IT-CLIN-07 |
| F-13 | AUTH-12/13/16 onboarding & routing | FE + BE + product | F-03 | Uploads from `required[]` incl. registration_certificate; route on `verificationStatus`; remove the `'approved'` default and preview tabs; decide onboarding fields (🟣6) | IT-AUTH-03/05 |

### P1 — core doctor workflow cannot complete
| Fix ID | Problem | Owner | Dependency | Required change | Validation |
|---|---|---|---|---|---|
| F-14 | Gate family: INST-09/10/11, CLIN-08, APPT-B03 | BE | — | `clearCompletionGate(doctorId, consultationId)` as a CAS; clear on no_show/cancel; restore presence after clear; admin override; only shut when both parties attended | IT-INST-06/07 |
| F-15 | INST-06/07 accept races | BE | F-05 | One tx: offer CAS + `where status=awaiting_doctor`; cancel closes offers and frees the doctor | IT-INST-04 |
| F-16 | INST-08 / APPT-B05 instant hold | BE | — | `holdExpiresAt` on accept; free the doctor on expiry | IT-INST-05 |
| F-17 | CLIN-05 follow-up ordering + CLIN-02 missing note fields | BE + product + FE | — | Allow assign before finalise, or drop from the FE gate; add observations/follow-up plan/allergies/referral-advised; enforce FR-11.1 | IT-CLIN-05 |
| F-18 | Completion rule unification | FE | F-08 | FE renders BE `outstanding[]`; summary rule = 3–5 lines | IT-CLIN-04 |
| F-19 | `openOnly` Transform (CLAR-B03, FUP-10) | BE | — | `@Transform` like `notification.dto.ts:18` | IT-CLAR-08, IT-FUP-05 |
| F-20 | NOTIF-02 failed rows hidden | BE | — | Keep failed rows in inbox/badge; push retry via a queue | IT-NOTIF-03 |
| F-21 | FUP-09 check-in/alert atomicity | BE | — | `$transaction` + announce after commit, or repair sweep | IT-FUP-06 |
| F-22 | Safety alert/record read model (FUP-11/12/18/19) | BE (+🟣 for identity fields) | F-04 | Patient display fields, pathway, day; `GET /safety-alerts/:id`; history ids/labels from the pinned version/fired rules; `GET …/followup` | IT-FUP-02/07 |
| F-23 | APPT-B04 earnings | BE | — | Frozen fee; exclude/flag refunds; dates/mode/status; period aggregates in PLATFORM_TIMEZONE; pagination | IT-EARN-01/02 |
| F-24 | APPT-B06 capture-after-expiry | BE | — | Conditional update; auto-refund or admin queue | IT-PAY-01 |
| F-25 | AUTH-30 expiry vs revoke | BE or FE | F-03 | `TOKEN_EXPIRED` code, or one refresh attempt on `TOKEN_INVALID` | IT-AUTH-09 |
| F-26 | AUTH-02 credential download perms | BE | — | `assertPermission(clinical_governance, operations)` | IT-AUTH-10 |
| F-27 | CLIN-07 immutability, CLIN-09 read audit | BE | — | Conditional update + DB trigger; audit reads | IT-CLIN-06 |
| F-28 | Enum adapters (all of §5.5) | FE | F-03 | One mapping module per domain; exhaustive switch tests | IT-ENUM-01 |
| F-29 | Instant timing (INST-03/04/28) | FE + BE | F-05 | Countdown from `expiresAt`; don't decline on 0; align config schemas (15-600 vs 10-300) | IT-INST-03 |
| F-30 | AVAIL-07 leave vs bookings; AVAIL-08/09 semantics | BE + product | — | Refuse overlapping blocks naming the bookings; decide offline/paused/diary semantics, then fix copy | IT-AVAIL-04 |
| F-31 | Wire every screen (ids through routes; `onSave`/`onSubmit`; remove hardcoded pills/counts/"Available now"/60%; mis-route "Verification documents" → patientDocs) | FE | F-03 | Per §8 no-op list | Screen integration specs |
| F-32 | Notifications producers (NOTIF-05) + clarification notifications | BE | — | report_uploaded, pending_documentation, doctor_approved, document_rejected, clarification assign/reply; content-free copy | IT-NOTIF-01 |
| F-33 | DOC-05 + RR-01 report-request flow | INT | F-04 | Pass consultation context; notifications; decide draft | IT-DOC-03 |
| F-34 | Clarification contract (CLAR-P03/P05) | FE + BE/product | F-03 | Align enums/lengths/types; decide guidanceArea and close outcome/note columns | IT-CLAR-06 |

### P2 — major feature partially broken
Items F-35…F-67, grouped:
- **Availability FE:**
  - YYYY-MM-DD pickers, 24h conversion, Sunday=0, server UUIDs, `24:00`.
  - One duration/buffer editor.
  - Buffer snapshot for existing bookings (AVAIL-02/04/05/06, T4).
- **Instant BE:**
  - Presence PUT state guard (INST-12).
  - Conditional `moveTo` (INST-13).
  - CAS `close()` (INST-14).
  - Instant consults counted in booked intervals (AVAIL-13).
  - Offline on logout (INST-18).
  - Outbox for `documentation_due` (INST-20).
- **Video/booking BE:**
  - No-show time guard (APPT-S03).
  - Room eviction on cancel (APPT-S04).
  - Stale-scheduled sweeper or join upper bound.
  - Doctor-visible payment status.
- **Clarification BE:** append CAS (S8), scan expert replies (S5), read audit (S6), `updatedAt` in views, strip `authorId` for the expert (S4).
- **Follow-up BE:**
  - Duration override (FUP-03).
  - IST day boundaries (FUP-08).
  - Partial unique index + advisory lock for the missed sweep (FUP-25).
  - Severity ordering + count endpoint (FUP-13).
  - ack/close CAS (FUP-15).
- **Documents BE:**
  - Cancel/fulfil CAS (DOC-03).
  - Delete-after-fulfil consistency (DOC-04).
  - Orphan/soft-delete object sweeper (DOC-07).
  - `@VerifiedDoctorsOnly` on files and card (DOC-10).
  - Doctor upload decision (DOC-06).
- **Cross-cutting BE:**
  - `ParseUUIDPipe` everywhere + P2023 → 404.
  - `VALIDATION_FAILED` via `exceptionFactory`.
  - Missing codes in `DomainCode`.
  - `retryAfterSeconds` on 429.
- **Profile:**
  - Fee read-only + copy fix + payout exposure (AUTH-17).
  - Language codes (AUTH-18).
  - Specialty name via `/services` (AUTH-19).
  - Derive professionalType from `canPrescribe` (AUTH-20).
  - Sign-out call (AUTH-11).
  - Enforce `doctor_agreement` (AUTH-34).
- **Care Hub:** filters and `body` type in `libs/api`; recommendation note column; partial recommend endpoint (CHAT-05).
- **Reviews:** G-3 doctor feedback read, anonymised per 🟣3 (APPT-B10).

### P3 — non-critical mismatch / UX / unused
- Remove "Change password" and FAQ f5.
- Remove the E2EE claim and Add participant.
- Delete dead helpers/fixtures and `ExpertInboxScreen` (or route to it).
- Fix Cases chip labels.
- Fix the stale `AvailabilityScreen.spec.tsx`.
- Fixture drift (Dr. Mehta, count contradictions).
- Make `PRESENCE_NOT_SELF_SETTABLE` reachable.
- Implement or delete `WRONG_APP_FOR_ACCOUNT`.
- Include `reviewed` in governance counts.
- Reject `author_reply` from the expert DTO (CLAR-B05).
- Re-check seniority on read (CLAR-B07).
- Chat: remove or specify a module (CHAT-01 🟣).
- Doctor-facing reliability endpoint (DR-05-03).
- Fix `nx.json defaultBase: master`.
- Update stale CLAUDE.md (backend path `../coracure` → `../coracure_backend`; libs exist now).

---

## 14. Integration Test Plan

"Result" is **Not run** for every case: no stack was started, per audit scope. Cases marked *(fails today)* are expected to fail against the current code.

| Test ID | Scenario | Preconditions | Action | Expected backend | Expected frontend | Result |
|---|---|---|---|---|---|---|
| IT-AUTH-01 | Doctor OTP happy path | Admin-created doctor, `OTP_PROVIDER=stub` | request → verify `000000` | 200 tokens, `expiresIn:900`, `verificationStatus` | Routes by status; tokens in keychain | Not run |
| IT-AUTH-02 | Challenge swap (P0) | Attacker phone A, doctor B | Patient OTP for A; doctor verify with B's number + A's challenge/code | 401 INVALID_CREDENTIALS | Error shown | Not run *(fails today)* |
| IT-AUTH-03 | Status routing | Doctors pending / under_review / verified | Sign in | — | verified → Dashboard; others → status/credentials; no forced re-onboarding | Not run |
| IT-AUTH-04 | Sign-out | Signed-in doctor | Logout | 204; `token_version`+1; push token null; old refresh → 401 | Keychain cleared | Not run |
| IT-AUTH-05 | Credential upload drives readiness | Pending doctor | upload-url(registration_certificate) → PUT → confirm | `under_review`; `readyForVerification` only when all required are approved | Progress derived from `required/approved` | Not run |
| IT-AUTH-06 | Rejected document | Admin rejects identity_proof | GET credentials | `rejected[]` + `rejectionReason` | "Changes required" with reason + re-upload | Not run |
| IT-AUTH-07 | Languages contract | — | PATCH `['Marathi']`, then `['en']` | 400, then 200 | Labels mapped; only supported codes offered | Not run |
| IT-AUTH-08 | Fee not self-editable | — | PATCH `{consultationFeeInr}` | 400 | Fee read-only → Request changes | Not run |
| IT-AUTH-09 | Expiry with skew | Access expired, refresh valid, clock +2 min | GET profile | one refresh, retry 200 | No sign-out | Not run *(fails today)* |
| IT-AUTH-10 | Admin least privilege | `finance` admin | GET `doctor-credentials/:id/download-url` | 403 | — | Not run *(fails today)* |
| IT-AUTH-11 | Validation envelope | — | POST otp/request `{mobileNumber:'98765'}` | 400 `VALIDATION_FAILED` + details | Inline error | Not run *(fails today: BAD_REQUEST)* |
| IT-AUTHZ-01 | Unverified doctor on clinical routes | Pending doctor | GET `/doctor/consultations` | 403 DOCTOR_NOT_APPROVED | Status screen | Not run |
| IT-AUTHZ-02 | Cross-doctor isolation | Doctors A, B | B GETs A's consultation / record / files / alert / clarification | 404 each | — | Not run |
| IT-AUTHZ-03 | Patient token on doctor routes | Patient | any `/doctor/*` | 403 | — | Not run |
| IT-APPT-01 | List scoping & buckets | Rows in several states | `upcoming=true|false` | Own rows only; pending_payment included in upcoming | Mapped to Today/Upcoming/Past via PLATFORM_TIMEZONE | Not run |
| IT-APPT-02 | Patient identity reachable | After F-04 | list → card | `patientId` present; card initials/age/gender, never fullName | Renders initials | Not run *(fails today)* |
| IT-APPT-03 | Doctor cancel / no-show | Scheduled consultation | cancel; no-show before start | cancelled; no-show refused before start+grace | State updates | Not run *(no-show guard fails today)* |
| IT-VID-01 | Join window | Paid scheduled consultation | readiness at start−16 / −14 min | TOO_EARLY with `opensAt`, then joinable | Join enabled per readiness | Not run |
| IT-VID-02 | Join refusals | Unpaid / cancelled / no teleconsent | token | 402 / 409 / 403 codes | Specific messages | Not run |
| IT-VID-03 | Rescheduled & free join | Paid → rescheduled; fee-0 booking | readiness on the new id | joinable | Join works | Not run *(fails today)* |
| IT-VID-04 | Cancel during call | Token issued, patient cancels | join webhook | no in_progress; room evicted | Call ends gracefully | Not run *(fails today)* |
| IT-PAY-01 | Capture after hold expiry | Hold expired by sweeper | capture webhook | stays expired; refund/flag; 2xx no loop | — | Not run *(fails today)* |
| IT-INST-01 | First offer | available_now, permitted, in-hours doctor | Patient requests instant | offer attempt 1 within 1 s; push queued | Request screen with countdown | Not run *(fails today)* |
| IT-INST-02 | Delivery fallback | App foregrounded, push off | Poll `instant-requests` | returns the open offer | Screen opens with consultationId | Not run |
| IT-INST-03 | Timeout | Window 45 s | No answer | `timed_out` ~55 s; doctor back to available_now; attempt 2 to the next doctor | FE countdown from `expiresAt`; no decline call | Not run |
| IT-INST-04 | Accept after cancel | Offer pending, patient cancels | Accept | 409 REQUEST_CLOSED; doctor available_now | Toast; back to dashboard | Not run *(fails today: 500)* |
| IT-INST-05 | Unpaid accepted | Accept, patient never pays | wait hold | consultation expired; doctor available_now | Status updates | Not run *(fails today)* |
| IT-INST-06 | No-show gate | Instant call, doctor alone, no-show | PUT available_now | 200 | Picker usable | Not run *(fails today)* |
| IT-INST-07 | Gate bypass | Gate held by instant C1 | finalise scheduled C2 | gate still C1 | Still locked, names C1 | Not run *(fails today)* |
| IT-INST-08 | Double accept / accept+decline | Same doctor, parallel | Promise.all | exactly one outcome | Single navigation | Not run |
| IT-INST-09 | Available mid-call | in_consultation | PUT available_now | refused | Picker disabled | Not run *(fails today)* |
| IT-AVAIL-01 | Weekly round-trip | — | PUT Mon 09:00–13:00, Mon 22:00–24:00 | stored with dayOfWeek=1; GET returns `24:00` | Renders 9 AM–1 PM and 10 PM–12 AM Monday | Not run |
| IT-AVAIL-02 | Leave | — | POST blocked `{date}`; DELETE by server uuid | 201; 204 | Chip persists after reload | Not run |
| IT-AVAIL-03 | Non-UUID delete | — | DELETE `/availability/l-123` | 404 (not 500) | — | Not run *(fails today)* |
| IT-AVAIL-04 | Leave over bookings | Booking at 10:30 | Block 10:00–12:00 | 409 naming the booking | Warning | Not run *(fails today)* |
| IT-TZ-01 | Bucket boundary | Consultation 2026-09-21T19:00Z (00:30 IST on 22nd) | List on 21 Sep IST | — | Shows in Upcoming, not Today | Not run |
| IT-TZ-02 | Slot tz | Device tz Asia/Dubai | GET slots for a 09:00 IST rule | UTC instant 03:30Z | Label shows diary tz, not device tz | Not run |
| IT-TZ-03 | Follow-up day boundary | Plan started today | Check-in at 01:30 IST | counted for the IST day | Day number correct | Not run *(fails today)* |
| IT-TZ-04 | DST | `PLATFORM_TIMEZONE=America/New_York` | weekly Sun 01:00–04:00 on 2026-03-08 | correct offsets, no dup/loss | — | Not run |
| IT-CLIN-01 | Medicine shape | Treating doctor, in_progress | PUT FE-shaped medicines | 200 after F-12 (400 today) | Saved list reloads | Not run *(fails today)* |
| IT-CLIN-02 | Scope of practice | Psychologist | PUT with medicines | 403 PRESCRIBING_NOT_PERMITTED | Rx section hidden via BE `canPrescribe` | Not run |
| IT-CLIN-03 | Non-prescriber finalise | Advice home-practice only + 3-line summary | finalise | 200 (500 today) | Completed | Not run *(fails today)* |
| IT-CLIN-04 | Summary rule | 1-line 300-char summary | finalise | 409 RECORD_INCOMPLETE `CASE_SUMMARY_TOO_SHORT` | Inline error from `outstanding[]` | Not run |
| IT-CLIN-05 | Follow-up ordering | Record not finalised | assign follow-up | per F-17 decision | Checklist consistent | Not run *(deadlock today)* |
| IT-CLIN-06 | Immutability race | — | PUT ∥ finalise | content = finalised content | — | Not run *(fails today)* |
| IT-CLIN-07 | Prescription PDF | Finalised with medicines | GET patient files (doctor) | `prescription_pdf` listed | Preview opens | Not run *(fails today)* |
| IT-FUP-01 | Assign plan | Finalised consultation | POST followup `depression_anxiety` | plan with `endsOn`; GET checkins empty | Plan visible on case | Not run |
| IT-FUP-02 | Red check-in reaches the doctor | Patient submits `self_harm:'fleeting'` (setup) | Doctor GET alerts / inbox | one red_flag alert; inbox row with `alertId` | Alert card opens that alert | Not run |
| IT-FUP-03 | Multi-category | self_harm + feeling_unsafe + side_effects (setup) | Doctor GET alerts | 2 red_flag + 1 medication_side_effect | 3 cards | Not run |
| IT-FUP-04 | Extra-question collision (P0) | — | assign with `extraQuestions:[{id:'self_harm'}]` | 400 | — | Not run *(fails today)* |
| IT-FUP-05 | Alert lifecycle | Open alert | close before ack; ack; close empty; close with note; `?openOnly=false` | 409; ack; 400; closed; listed | Reviewed filter shows it | Not run *(openOnly fails today)* |
| IT-FUP-06 | Atomicity | Inject failure in `safetyAlert.create` | Patient submits red (setup) | guidance returned; alert exists after repair/retry | Doctor sees alert | Not run *(fails today)* |
| IT-FUP-07 | Missed sweep dedupe | startsOn today−3, no check-ins | sweep ×2 in parallel | exactly one missed_checkin alert | One card | Not run |
| IT-CLAR-01 | Create + post | Verified doctor | POST case (BE enums) → post | draft → posted | List shows Posted | Not run |
| IT-CLAR-02 | De-id refusal | — | briefHistory with `98765 43210`; with `COR-12458` | 400 IDENTIFIER_PRESENT `{field,kind}`; (after fix) also refused | Field highlighted | Not run |
| IT-CLAR-03 | Unassigned expert | Expert B not assigned | GET `/doctor/expert-reviews/:id` | 404 | — | Not run |
| IT-CLAR-04 | Expert payload allow-list | Assigned expert | GET expert view | no `sourceConsultationId`, `treatingDoctorId` (after S4: no author id in messages) | No initials/patient ref rendered | Not run |
| IT-CLAR-05 | Reassignment revokes | E1 → E2 | E1 GET/reply | 404; E2 200 | — | Not run |
| IT-CLAR-06 | Enum contract | — | urgency `soon`, messageType `clinical_consideration`; legacy `priority` | 201; 400 | Adapter maps | Not run |
| IT-CLAR-07 | State machine | — | clarification_request → author reply → reviewed from awaiting_response | clarification_asked → awaiting_response → 409 NOT_IN_THAT_STATE | Buttons status-aware | Not run |
| IT-CLAR-08 | Closed history | Closed cases exist | `?openOnly=false` | closed rows returned | History tab populated | Not run *(fails today)* |
| IT-NOTIF-01 | Doctor inbox & read | Rows exist | list, unread-count, read, read-all, other user's id | 200s; 204; 404 | Badge = unread-count | Not run |
| IT-NOTIF-02 | Deep link | red_flag_alert row | tap | `deepLinkData.alertId` | Opens that alert | Not run |
| IT-NOTIF-03 | Push failure visibility | Push mock rejects | GET inbox | row listed, unread +1 | Shown | Not run *(fails today)* |
| IT-NOTIF-04 | Copy privacy | Any doctor template | render | no diagnosis term; (🟣) no full name | — | Not run |
| IT-DOC-01 | Treating doctor files | After F-04 | list + download-url | 200 + audit read row; URL TTL 300 s | Opens preview | Not run |
| IT-DOC-02 | Non-treating doctor | Doctor B | list/download P's files | 404, no leak | — | Not run |
| IT-DOC-03 | Report request round-trip | Open consultation | POST request (real uuid) → patient uploads (setup) | fulfilled; `report_uploaded` queued (after F-32) | Request shows fulfilled + file | Not run *(notification fails today)* |
| IT-DOC-04 | Cancel ∥ fulfil | Open request | parallel | never cancelled→fulfilled | — | Not run |
| IT-EARN-01 | Fee stability | Paid at fee 500, fee changed to 800 | GET payouts | 500 | Correct history | Not run *(fails today)* |
| IT-EARN-02 | Refund excluded | Refunded consultation | GET payouts | excluded/flagged | Not counted | Not run *(fails today)* |
| IT-PROF-01 | Profile round-trip | Verified doctor | GET profile; PATCH duration 45 | specialty via `/services`; 200 | Renders name, specialty, languages; duration persists | Not run |
| IT-ENUM-01 | Enum adapters exhaustive | — | Unit test mapping every BE value | — | No unmapped value renders "undefined" | Not run |

---

## 15. Final "Integration GO / NO-GO"

```text
CORE INTEGRATION:            0 / 23 flows fully integrated   (1 partial, backend side only)
BLOCKERS (P0):               14
HIGH-RISK GAPS (P1):         21
CONTRACT MISMATCHES:         ~40
REDUNDANCIES:                16
UNUSED BACKEND CAPABILITIES: 33
SECURITY / PRIVACY ISSUES:   35  (🔴5 🟠11 🟡15 🔵4) + 7 human decisions
TEST COVERAGE:               0 cross-repo integration tests exist; 73 specified in §14 (0 run).
                             Doctor FE unit specs exist but test fixtures only (AvailabilityScreen.spec stale).
```

**Verdict: NO-GO.** This is not a patch list. The Doctor app has not started integration.

**What must be true before the integration can be called production-ready:**
1. **Incident closed.** SEC-01: clean config committed, secrets and PAT rotated, contributor/CI reviewed.
2. **Auth hardened.** AUTH-01 fixed. Doctor auth, session, keychain and token-expiry behaviour (AUTH-30) working end to end.
3. **Doctor client exists** (`libs/api` doctor module generated from `/docs-json`), and **every screen reads the server and persists mutations**, with ids carried through routes and all no-op handlers either wired or removed.
4. **The four backend workflow blockers are fixed:**
   - first instant offer (INST-01) plus a delivery channel (INST-02)
   - `patientId` for the doctor (APPT-B01)
   - payment-follow on reschedule/free (APPT-B02)
   - finalise CHECK alignment (CLIN-06)
5. **Clinical core works:** editable notes with FR-11.1 fields, an agreed medicine schema, prescription PDF, one completion rule (the backend's `outstanding[]`), and a non-deadlocking follow-up order.
6. **Video works:** LiveKit SDK in the doctor app, Join driven by `/readiness`.
7. **State traps removed:** gate CAS/clear/restore, the instant hold, the accept-after-cancel race.
8. **Privacy decisions 🟣1–7 are made and recorded,** and the UI adjusted accordingly, in particular the clarification expert view (CLAR-S1) and patient names in lists and notifications.
9. **Safety pipeline is trustworthy:** FUP-06 fixed, check-in↔alert atomicity, failed-push visibility, the `openOnly` fix, and alert read-model fields.
10. **The P0 and P1 rows in §14 pass** against a running stack (backend on `OTP_PROVIDER=stub`, LiveKit dev server, push mock).

---

## Appendices — domain evidence

Each appendix row carries file:line evidence in both repos. The domain audits are summarised here; IDs are referenced throughout the report.

- **A1 Auth / Onboarding / Profile / Credentials / Settings / Support (AUTH-01…39).**
  - Login stubs: `DoctorLoginScreen.tsx:176,239`, dead footer `:429,441,499,509,513`.
  - Onboarding hardcoded mobile `OnboardingFlow.tsx:215`, `now='2026-09'` `:220`, fake picker `:53-58`.
  - Status screens hardcoded 60% `AccountStatusScreens.tsx:237-239`; preview tabs `ProfileRouter.tsx:35-54`.
  - Hardcoded bank values `ProfileSettingsScreens.tsx:284-297`; save handlers not passed `AppShell.tsx:247-253`; `patientDocs` mis-route `AppShell.tsx:473`.
  - BE: `auth.controller.ts:69-187`, `doctor-auth.service.ts:44-57,89-104`, `doctors.controller.ts:17-130`, `doctor-registry.service.ts:79-85,256-266,678-735`, `verification.service.ts:124-264`, `doctor.dto.ts:53,215-246`, `http-exception.filter.ts:15-37,99-102`, `libs/api/src/http.ts:209,220-222`, `tokenStore.ts:36`, `config.ts:43`.
- **A2 Appointments / Dashboard / Video / Completion / Tasks / Earnings / Reviews (APPT-B01…B14, S01…S09).**
  - FE fixtures `doctor.ts:82-202,373-541,696-851`; join rule `AppointmentsScreen:153`, `AppointmentDetails:109,347-366`; CallLog discarded `ConsultationRoomScreen:155-164` → `AppShell.tsx:283`; blank apptDetails fallback `AppShell.tsx:234,255`.
  - BE: `booking.service.ts:51-67,149-254,504-613,618-651,691-842`, `video.service.ts:23,284-470,510,561`, `payments.service.ts:24-33,114,192-245,330,362,388-406`, `booking.adapters.ts:42-66,101-113,144-205`, `livekit/livekit.yaml:57,61`, `notification-templates.ts:96,112,171`.
- **A3 Availability / Presence / Instant / Timezone (AVAIL-01…20, INST-01…28).**
  - FE `AvailabilityScreen.tsx:13-27,256-257,315,336-402,557`, `StatusSheet.tsx:39-41,93-129`, `doctor.ts:15-65,317-325,864-963`, `AppShell.tsx:210-219,232,356-366`, `InstantAcceptedScreen:145-172`, `InstantDeclinedScreen:58-65`.
  - BE: `instant-routing.service.ts:23-35,75-307,319-361,402`, `presence.service.ts:21,95-131,156-226`, `availability.service.ts:107-109,166-236,296-469`, `scheduling.service.ts:181-206`, `instant.module.ts:45`, `local-time.ts:97-101`, `env.validation.ts:210-214`, `m13 migration:64-66`.
- **A4 Clinical / Prescription / Case Summary / Documents / Request Report (CLIN-01…14, DOC-01…12).**
  - FE `clinical.ts:15-20,35,54-132,159-174,205-310`, `components/clinical.tsx:118-134`, `EPrescriptionScreen.tsx:136,154,228,273,295-308,357`, `CaseSummaryScreen.tsx:30-69`, `CasesScreen.tsx:22-45`, `documents.ts:11-206`, `RequestReportScreen.tsx:53-60,142`, `AppShell.tsx:291-354,445`.
  - BE: `clinical.dto.ts:25-155`, `completion.ts:48-141`, `clinical-records.service.ts:85-90,161-341,392-426`, `m15 migration:88-99`, `patient-files.service.ts:44-53,108,126-287`, `report-requests.service.ts:11-20,68,97,125-161`, `files.controller.ts:123-175`, `object-storage.ts:21-24,88`, `compliance.service.ts:~251`, `subject-access.service.ts:133-187`.
- **A5 Follow-up / Safety / Notifications / Care Hub / Chat (FUP-01…28, NOTIF-01…13, CHAT-01…06).**
  - FE `followup.ts:12-312`, `messaging.ts:26,49-212`, `FollowUpAlertsScreen:169,202`, `PatientFollowUpDetailScreen:43,70,164`, `AssignFollowUpPlanScreen:47-48,164,220`, `AppShell.tsx:227-234,273,321-339,414`.
  - BE: `pathway.ts:19-101,130-256`, `default-pathways.ts:3-271`, `followup.controller.ts:89-229`, `followup.service.ts:118-155,257-372,398,483-493`, `safety-alerts.service.ts:13-60,125-303`, `checkin-sweeper.service.ts:14-242`, `notifications.service.ts:27-37,157-254,338-342`, `notifications.module.ts:44`, `notification-templates.ts:88-185`, `content.service.ts:451-467`, `m16 migration:86-88,187`.
- **A6 Case Clarification (CLAR-P01…P06, S1…S10, B03/B05/B07, D1…D5, R1…R6).**
  - FE `clarification.ts:17-249`, `CreateClarificationScreen.tsx:44-53,87,107,180-296,353-359`, `ExpertInboxScreen.tsx:21-107,161-176,252-265,355-364`, `ExpertCaseReviewScreen.tsx:21-23,50,79-170`, `ExpertClarificationScreen.tsx:22-75,94-284`, `ExpertResponseScreen.tsx:52-153`, `AppShell.tsx:229,274,383-399,451-457`.
  - BE: `clarification.controller.ts:24-217`, `clarification.service.ts:63-90,140-728`, `thread.ts:21-130`, `deidentify.ts:21-68`, `clarification.dto.ts:26-119`, `schema.prisma:1399-1480`, m17 migration, `m10 migration:85-93`.

**Specification ↔ UI discrepancies (recorded, UI kept as the contract unless decided otherwise):**
- FR-9.2: patient initials only vs the UI's full name.
- FR-9.6: templates deferred vs the UI's full template manager.
- FR-11.1: follow-up plan and referral mandatory vs the backend's rule.
- FR-12.2: scrubbed attachment copies vs no pipeline.
- SRS:148/475: realtime instant delivery vs none.
- DR-13-02: service + language on the request card vs neither.
- DR-16-01: follow-up duration vs a fixed 7 days.
- DR-16-03: severity ordering vs age ordering.
- DR-07-02: refuse leave over bookings vs accepted.
- DR-05-01: doctor-entered credentials vs admin-only fields.
