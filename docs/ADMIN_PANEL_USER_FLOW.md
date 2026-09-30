# Admin Web Panel — User Flow

The third surface. Patient app and doctor app are React Native; this one is a
**desktop web panel** (SRS 2.3), left navigation by module, sections gated by
permission level (SRS 3.1).

Written from the shipped backend at `apps/backend/coracure_backend` — every
endpoint and every role gate below was read out of the controllers and services,
not assumed. Where the panel needs something the backend does not expose, it is
listed in §13 as a gap rather than invented here.

Read `docs/API_CONTRACT.md` first for auth, the error shape and the request
rules. They apply here unchanged.

---

## 1. Scope

The admin panel manages **both sides of the platform from one place**:

| Side | What the admin actually does |
| --- | --- |
| **Doctor side** | Creates the account (there is no doctor sign-up), reviews credentials, verifies, lists, sets region/language pools and seniority, edits the diary, suspends, reads reliability |
| **Patient side** | Never creates or edits a patient. Acts on a patient's *consultation*: overrides the assigned provider, cancels on their behalf, refunds, answers complaints, reviews deletion requests, exports their data |

That asymmetry is deliberate and enforced server-side. A patient is
self-registered by mobile OTP and owns their own profile; there is **no
`admin/patients` controller at all**. Do not build a patient CRUD screen — see
§13 gap A-1 for what actually exists instead.

---

## 2. Who signs in — the six permission levels

`AdminPermissionLevel` in `prisma/schema.prisma`:

```
super_admin  operations  clinical_governance  care_coordinator  finance  content
```

`assertPermission` (`src/common/auth.ts:52`) passes **`super_admin` for
everything**, unconditionally. Every other level must be named explicitly by the
route. A level that is not named gets `403 INSUFFICIENT_PERMISSION`.

There is no per-screen permission table in the database — the level is a single
column on `admins` and the gate lives in code. So the panel's navigation must be
built from a **client-side copy of the same map**, and every screen must still
handle a 403 from the server as the real answer.

### Navigation by level

A cell means the level reaches that section at all; the flows in §5–§12 say which
*actions* inside it are further restricted.

| Left-nav section | super | operations | clinical_gov | care_coord | finance | content |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| Dashboard (quality) | ● | ● | ● | ● | | |
| Providers | ● | ● | ● | read | | |
| Credential queue | ● | ● | ● | | | |
| Availability & allocation | ● | ● | read | ● | | |
| Consultations | ● | ● | ● | ● | | |
| Clinical governance queues | ● | ● | ● | alerts only | | |
| Case clarification tracker | ● | ● | ● | | | |
| Payments & payouts | ● | refund only | | | ● | |
| Feedback & complaints | ● | ● | ● | | | |
| Catalogue (specialties/concerns/regions) | ● | ● | ● | | | ● |
| Care Hub authoring | ● | | ● | | | ● |
| Notification templates | ● | | ● | | | ● |
| Search & crisis config | ● | | ● | | | ● |
| Follow-up pathways | ● | ● | ● | | | ● |
| Legal documents | ● | read | ● | | | ● |
| Settings (`admin/config`) | ● | ● | ● | ● | ● | ● |
| Audit log | ● | ● | ● | ● | ● | ● |
| Retention & deletion execution | ● | | | | | |
| Admin accounts | ● | | | | | |

Two rows are not a typo:

- **Settings and Audit are open to every level but filtered per row.**
  `admin/config` returns every registered key with an `editable` flag — false
  where your level does not own the setting, or where the value has a dedicated
  screen, and `managedBy` then names that screen. The audit log runs the same
  way: `readableEntityTypes` (`compliance.service.ts:401`) narrows the rows to
  the entity types your level may read, so a content editor never sees the trail
  of a clinical record. Same screen, different contents. Build the settings
  screen off the `editable`/`managedBy` flags — never off a local list.
- **`care_coordinator` is the narrow one.** SRS 2.2: it "receives and acts on
  safety and follow-up alerts and sees nothing else." Its extra reach into
  availability exists only so it can explain why an alert's patient was not
  covered.

---

## 3. Sign-in flow

Email and password, then an optional OTP. Nothing else — admins have no push
token and no device id, they read their alerts in-panel.

```
1  Admin opens the panel, unauthenticated  →  Sign-in screen (email + password)
2  POST /v1/auth/admin/sign-in  { email, password }
3a → { status: "complete", accessToken, refreshToken, expiresIn }
        store tokens, decode level, build the nav, land on Dashboard
3b → { status: "two_factor_required", mfaToken }
        →  2FA screen (6-digit code, sent by SMS through Slide)
        →  POST /v1/auth/admin/two-factor  { mfaToken, code }
        →  { accessToken, refreshToken, expiresIn }
```

What the screen must handle:

- **`INVALID_CREDENTIALS` is the answer for both a wrong password and an unknown
  address.** The service verifies against a decoy hash so the response time does
  not reveal which addresses exist (`admin-auth.service.ts`). The copy must not
  say "no such account".
- **`TOO_MANY_ATTEMPTS`** — rate limited per email address, and the limit is
  re-checked on the second leg too. Show "try again in N minutes".
- **The `mfaToken` leg can expire on its own.** The password leg happened minutes
  ago; if the account was suspended or signed out everywhere since, the second
  leg answers `TOKEN_INVALID`. Send the admin back to the password screen, not to
  a retry of the code.
- **`ACCOUNT_NOT_ACTIVE`** — a suspended admin. Plain message, no detail.
- **2FA is per account and switched by a super admin** (FR-1.10). There is no
  self-service toggle, so no 2FA setup screen in this release.

### Session

Same as the apps: access TTL 15 min, refresh TTL 30 days,
`POST /v1/auth/refresh` and `POST /v1/auth/sign-out`. Two panel rules:

- **Refresh must be single-flight.** A dashboard fires six widget queries at
  once; they must share one refresh. The apps' rule, and a panel breaks it faster.
- **Sign-out ends every session on every device** — it is one `token_version`
  increment. Say so on the button; there is no "sign out this browser".

Browser storage, not keychain. Keep the refresh token out of `localStorage` if
the deployment can give it an httpOnly cookie; if it cannot, `sessionStorage`
plus a short idle timeout is the floor. This panel reads clinical records.

### Creating another admin

```
POST /v1/auth/admin/accounts  { email, password, fullName, permissionLevel }
```

`assertPermission(actor)` with no levels listed → **super_admin only**, because
`super_admin` passes by definition and nothing else is named. There is no self
sign-up and no invite email in this release: the creator sets the password and
hands it over. Who created the account is the audit entry for this call — which
is why `admins` has no `created_by` column.

---

## 4. The flows at a glance

```
DOCTOR SIDE                           PATIENT SIDE
create account                        (patient self-registers — no admin step)
   ↓                                     ↓
doctor signs in, uploads credentials   patient books a service + time
   ↓                                     ↓
credential queue → review each doc     backend allocates a provider
   ↓                                     ↓
verify / reject                        admin may override or cancel
   ↓                                     ↓
list (make assignable)                 consultation happens
   ↓                                     ↓
regions + languages + seniority        admin reads the trail, refunds,
   ↓                                    answers complaints, honours deletion
availability, suspend, reliability
```

---

## 5. Doctor side — onboarding to listed

The single longest flow in the panel, and the one with a hard split between
**operations** (the account and the commercials) and **clinical_governance**
(the clinical decision).

### 5.1 Create the account — `operations`

```
POST /v1/admin/doctors
  { mobileNumber, fullName, specialtyId?, qualification?, registrationNumber?,
    yearsOfExperience?, languages?, payoutFeeInr?, consultationDurationMinutes?, … }
```

1. Admin fills the form. `mobileNumber` is E.164 (`/^\+[1-9]\d{7,14}$/`) and is
   the doctor's **sign-in identifier** — get it wrong and the doctor cannot sign
   in at all, because an unknown number at `POST /v1/auth/doctor/otp/request` is
   refused rather than texted a code.
2. `specialtyId` is the field that matters most: the specialty declares which of
   the two registration forms applies, which credentials are mandatory, whether a
   council registration number is required, and **whether this provider may
   prescribe** (FR-19.7). Show that consequence next to the picker.
3. On success the doctor exists with `verificationStatus: pending`,
   `isListed: false`. They can sign in; they land on the credential screen, not
   the dashboard, because the app routes on `verificationStatus`.
4. Never spread the form state into the body. `forbidNonWhitelisted: true` turns
   one stray field into a 400.

### 5.2 The credential queue — `clinical_governance` or `operations`

```
GET  /v1/admin/doctors/credential-queue
GET  /v1/admin/doctors/:doctorId/credentials
POST /v1/admin/doctors/credentials/:documentId/review  { approved, rejectionReason? }
```

1. The queue is the panel's home screen for clinical governance: every doctor
   with documents awaiting a decision.
2. Open one doctor → their document list. Types are `degree_certificate`,
   `registration_certificate`, `identity_proof`, `address_proof`,
   `experience_letter`, `profile_photo`, `signature`, `other`; each carries
   `pending | approved | rejected`.
3. Review **one document at a time**. `approved: false` requires
   `rejectionReason` (max 255) — and that reason is shown verbatim to the doctor
   in their app, which then allows a re-upload. Write it as instructions to the
   doctor ("the registration certificate is cropped, re-upload the full page"),
   not as an internal note.
4. Rejecting a document does **not** reject the doctor. The account stays where
   it was; only the document flips. Keep the two actions visually separate.

### 5.3 Verify or reject the provider — `clinical_governance` only

```
POST /v1/admin/doctors/:doctorId/verify
POST /v1/admin/doctors/:doctorId/reject   { reason }
POST /v1/admin/doctors/:doctorId/reopen
```

`operations` **cannot** do this, deliberately: creating the account and passing
the clinical bar are different jobs. The panel should show the verify button as
absent for operations, not as disabled-with-a-tooltip.

- `verify` moves `verificationStatus` to `verified`. That lifts the doctor app's
  lock (`DOCTOR_NOT_VERIFIED`) without the doctor doing anything — the doctor app
  must re-read status rather than cache it.
- `reject` is terminal-looking but reversible by `reopen`, which puts the account
  back in the queue. Offer `reopen` on every rejected record so a rejection is
  never a dead end that needs a new account.
- `verificationStatus` values: `pending`, `under_review`, `verified`, `rejected`,
  `suspended`. Filter the provider list on it
  (`GET /v1/admin/doctors?verificationStatus=…&isListed=…&search=…`); `search`
  matches name, mobile number or registration number.

### 5.4 List them — `operations`

```
PATCH /v1/admin/doctors/:doctorId/listing   { isListed: true }
```

**Refused unless the doctor is already verified** (`SetListedDto`). Verification
is the clinical decision; listing is the operational one — "we want them in the
pool from today". Two gates, two levels, in that order.

Listing is what makes a provider assignable. An unlisted verified doctor sits
idle and no patient booking reaches them.

### 5.5 Pools and seniority

```
GET   /v1/admin/doctors/:doctorId/regions        # ops, clinical_gov, care_coord
PATCH /v1/admin/doctors/:doctorId/regions        # operations
PATCH /v1/admin/doctors/:doctorId/seniority      # clinical_governance
PATCH /v1/admin/doctors/:doctorId                # operations — profile, fee, duration
```

- **Regions and languages are the allocation pools** (FR-18.9). Language is never
  relaxed in assignment; region may be, by the allocation policy. So an empty
  language list is a provider nobody can be matched to — warn on save.
- **Seniority is `standard | expert`, and expert is not a role.** Granting it
  makes the doctor *eligible to be asked* for case clarification; it grants sight
  of nothing by itself. Each case is assigned individually, and that assignment is
  what reveals that one de-identified case. The confirm copy should say exactly
  that, or an admin will think they have handed over a data grant.
- `PATCH /v1/admin/doctors/:doctorId` carries the commercials: `payoutFeeInr`
  (the provider keeps all of it — FR-7.4), `consultationDurationMinutes`, buffer.
  Duration and buffer feed assignability directly (FR-10.7), so changing them
  changes who is bookable. Say so on the form.

### 5.6 Suspend and reinstate — `operations`

```
POST /v1/admin/doctors/:doctorId/suspend    { reason }
POST /v1/admin/doctors/:doctorId/reinstate
```

Suspension removes them from the pool immediately. Before confirming, the panel
should show what is already booked with them — because those consultations still
exist and each needs an override (§7.2) or a cancellation. There is no cascade
server-side; this is the admin's problem and the UI should not hide it.

### 5.7 Reliability — `operations` or `clinical_governance`

```
GET /v1/admin/doctors/:doctorId/reliability
```

Acceptance rate, no-show rate, case-summary completion (FR-18.6). Read-only, and
the same numbers roll up in the quality dashboard (§8.1). This is the screen an
admin opens before granting expert seniority or after a complaint.

---

## 6. Doctor side — the diary

```
GET    /v1/admin/doctors/:doctorId/availability                  # ops, care_coord
PUT    /v1/admin/doctors/:doctorId/availability/weekly           # replaces the pattern
POST   /v1/admin/doctors/:doctorId/availability/blocked
POST   /v1/admin/doctors/:doctorId/availability/custom-hours
DELETE /v1/admin/doctors/:doctorId/availability/:ruleId
GET    /v1/admin/doctors/:doctorId/slots
```

The doctor sets their own diary in their app (`/v1/me/doctor/availability/*`);
these are the same operations performed **on their behalf** — the phone call
case, "I'm in hospital tomorrow, take me out".

1. Open a provider → their week as they set it, plus blocks and overrides.
2. `PUT .../weekly` **replaces** the whole pattern. It is not a merge. The screen
   must load the current pattern, let the admin edit it, and send the complete
   result — a partial send silently deletes the rest of the week.
3. `blocked` takes them out for a day or a window; `custom-hours` overrides one
   date's hours. `DELETE .../:ruleId` removes a single rule.
4. `GET .../slots` is the check: what this provider is *actually* offering after
   all the rules compose. Show it beside the editor, not on another screen.
5. Errors to design for: `OVERLAPPING_AVAILABILITY`, `INVALID_TIME_RANGE`,
   `DATE_IN_THE_PAST`. All three are ordinary mistakes on this screen — inline
   field errors, not toasts.

### Assignability — the allocation check

```
GET /v1/admin/availability/remaining?serviceId=&language=&regionId=&at=
        # operations, care_coordinator, clinical_governance
```

FR-10.7 and FR-18.9. Answers "who is assignable for this service, language,
region and time, and how much unbroken duration do they have left". A provider
whose remaining window is shorter than the consultation plus its buffer is **not
assignable even though they look free at the start time** — which is the question
an admin is always really asking when a patient says nobody was available.

This is the screen the override flow (§7.2) launches from. Build it as a real
screen, not a modal: it is the panel's answer to `NO_PROVIDER_AVAILABLE`.

---

## 7. Patient side — consultations

The patient never appears as a record to edit. They appear as the owner of a
consultation.

### 7.1 Open one consultation — `operations`, `care_coordinator`, `clinical_governance`

```
GET /v1/admin/consultations/:consultationId
```

`ConsultationStatus`: `pending_payment`, `scheduled`, `awaiting_doctor`,
`in_progress`, `awaiting_documentation`, `completed`, `cancelled`, `no_show`,
`expired`.

Two of those drive the screen:

- **`pending_payment` IS a slot hold, and it expires.** Show the countdown; a
  refresh after expiry finds `expired`, not `pending_payment`.
- **`awaiting_documentation`** means the consult happened and the doctor has not
  written it up. That is the queue in §8.2, and it is what
  `DOCUMENTATION_OUTSTANDING` blocks in the doctor app.

There is **no admin consultation list endpoint** — only fetch-by-id. See gap
A-2; today the panel reaches consultations through the governance and support
queues, or by reference code typed into a lookup box.

### 7.2 Override the assigned provider — `operations`, `care_coordinator`

```
POST /v1/admin/consultations/:consultationId/override-provider   { doctorId, reason }
```

1. Something is wrong with the assignment — provider suspended, patient declined
   the maximum number of times, a complaint.
2. Admin opens `GET /v1/admin/availability/remaining` for that consultation's
   service, language, region and time (§6) and picks a provider who is actually
   assignable with enough remaining duration.
3. Override, **with a reason**. The reason is recorded and surfaces in
   `GET /v1/admin/governance/allocation-decisions` (FR-18.9) — the record of who
   was assigned and on what basis. Make the reason field first-class, not an
   afterthought: it is the audit answer.
4. Do not offer a free-text doctor id. Drive this from the assignability list, or
   the override recreates the coverage problem it was meant to fix.

### 7.3 Cancel on the patient's behalf — `operations`, `care_coordinator`

```
POST /v1/admin/consultations/:consultationId/cancel   { reason }
```

Show the refund consequence **before** the action, not after. `NOT_REFUNDABLE`
arriving afterwards is a support ticket. A cancellation that should return money
is two steps: cancel here, then refund in §9.

### 7.4 The evidence trail

For adjudicating a complaint or a refund:

```
GET /v1/admin/instant/consultations/:consultationId/offers   # ops, care_coord, clinical_gov
GET /v1/admin/consultations/:consultationId/video/session    # ops, clinical_gov, finance
GET /v1/admin/consultations/:consultationId/care-record      # clinical_gov, operations
GET /v1/admin/compliance/audit/consultation/:consultationId  # ops, clinical_gov
```

- **offers** — for an instant consult: who was asked, in what order, and what they
  said. This is how "nobody picked up" gets answered.
- **video/session** — the session record. `finance` reaches this one because a
  refund argument is usually "the call never connected".
- **care-record** — the clinical record. `clinical_governance` and `operations`
  only, and reading it is itself audited.
- **audit/consultation/:id** — the full trail for that consultation.

Put all four behind one "Evidence" tab on the consultation screen, each gated by
level. A complaint reviewer should not have to hunt.

---

## 8. Clinical governance queues

### 8.1 Quality dashboard — `operations`, `clinical_governance`, `care_coordinator`

```
GET /v1/admin/governance/dashboard
```

FR-18.6: completed cases, pending summaries, red flags, follow-up alerts,
complaints, doctor reliability. The landing screen for those three levels. Every
tile should be a link into the queue behind it — a dashboard whose numbers do not
open anything is a screenshot.

### 8.2 Pending case summaries — `operations`, `clinical_governance`, `care_coordinator`

```
GET /v1/admin/governance/pending-case-summaries
```

FR-18.5: consultations held but not written up. Ageing matters more than count
here — sort oldest first and show the doctor, because the follow-up is a phone
call to a person. The doctor app blocks on the same condition
(`CASE_SUMMARY_MISSING`, `DOCUMENTATION_OUTSTANDING`).

### 8.3 Safety alerts — `care_coordinator`, `clinical_governance`, `operations`

```
GET  /v1/admin/safety-alerts
POST /v1/admin/safety-alerts/:alertId/acknowledge
POST /v1/admin/safety-alerts/:alertId/close      { whatWasDone }
```

FR-18.5. Types: `red_flag`, `amber`, `missed_checkin`, `medication_side_effect`,
`followup_due` — raised by the follow-up check-in rules, not by a human.

The two-step is the point: **acknowledge takes responsibility** (your admin id
goes on the row), **close records what was done**. Do not collapse them into one
button. This is `care_coordinator`'s whole job, so it is that level's landing
screen and it should poll rather than wait for a page refresh.

### 8.4 Case clarification tracker — `clinical_governance`, `operations`

```
GET  /v1/admin/clarification-cases
GET  /v1/admin/clarification-cases/experts
POST /v1/admin/clarification-cases/:caseId/assign   { doctorId }
POST /v1/admin/clarification-cases/:caseId/close
```

1. A treating doctor posts a de-identified case for a second opinion.
2. Admin opens the tracker, reads the case, calls `experts` for the doctors
   holding `seniority: expert` in the right specialty.
3. Assign **one** expert. That assignment is what grants sight of that one case —
   expert seniority alone reveals nothing (§5.5).
4. Close it when the thread is done.

The panel must not display re-identifying data on this screen even if a payload
happens to carry it. De-identification is the module's whole premise.

### 8.5 Allocation decisions — `operations`, `clinical_governance`

```
GET /v1/admin/governance/allocation-decisions
GET /v1/admin/governance/export/:kind
```

FR-18.9: who was assigned and on what basis, including every override reason from
§7.2. Export is the same data as a sheet (FR-18.4).

---

## 9. Payments, refunds and payouts — `finance`

```
GET  /v1/admin/payments/payouts/pending                               # finance
POST /v1/admin/payments/:consultationId/refund   { amount, reason }   # finance, operations
POST /v1/admin/payments/:consultationId/payout                        # finance
GET  /v1/admin/payments/export?kind=transactions|refunds              # finance
```

`PaymentStatus`: `created`, `pending`, `paid`, `failed`, `refunded`.

### Refund — the only flow with two levels

`operations` shares this one because a cancellation and its refund are the same
support conversation. Everything else in payments is `finance` alone.

1. Open the consultation's bill. The stored figures are frozen —
   `consultationFee`, `convenienceFeePct`, `convenienceFee`, `gstPct`,
   `gstAmount` were all written at checkout. **Never recompute a total in the
   panel**; a rounded figure that gets recalculated stops matching the invoice the
   patient holds.
2. Refund with an amount and a reason. The admin id is recorded
   (`refundInitiatedByAdminId`) — refunds are raised from the panel only
   (FR-7.7), and the status is visible to the patient in their app.
3. Idempotency is server-side (`gatewayRefundId` is unique), but the button must
   still disable on submit — the failure mode to avoid is the admin clicking twice
   and reading two different error messages.
4. `ALREADY_PAID` / `NOT_PAYABLE` / `NOT_REFUNDABLE`: reconcile against the bill
   and show why. Never retry blindly.

### Payout

**Payouts are paid manually by the client this release** (SRS 2.4). So
`POST …/payout` does not move money — it *records that a transfer was made*.
`payouts/pending` is the worklist: what the platform still owes. Label the button
"Record payout", never "Pay". The provider keeps 100% of the consultation fee;
the platform's revenue is the convenience fee.

---

## 10. Content, catalogue and copy

Everything in this block exists so the client can change the product **without an
app release** (SRS 4.19, FR-18.7).

### 10.1 Catalogue — specialties, concerns, regions, policy

```
GET|POST   /v1/admin/specialties            # read: content, ops, clinical_gov
PATCH      /v1/admin/specialties/:id        # write: content, clinical_gov
GET|POST   /v1/admin/concerns               # content, clinical_gov
PATCH      /v1/admin/concerns/:id           # content, clinical_gov
GET|POST   /v1/admin/regions                # content, operations
PATCH      /v1/admin/regions/:id            # content, operations
GET        /v1/admin/allocation-policy      # operations, clinical_gov
PATCH      /v1/admin/allocation-policy      # operations only
```

- **A specialty carries its intake form and prescription template** and declares
  which registration form it uses (FR-19.2, FR-19.4, FR-19.7). Adding one is an
  admin action with no code change. This is also the **only** place the intake
  form is exposed — the patient app cannot read it (gap G-4 in
  `docs/API_CONTRACT.md`), so an intake form authored here does not yet reach a
  patient. Flag that on the screen until G-4 closes.
- **A concern carries match phrases and a weight** (FR-5.7) — the
  symptom-to-specialty mapping the patient's search runs on.
- **A region is a row, not an enum** (FR-19.8), and providers are put into it from
  §5.5.
- **The allocation policy is `operations` alone to write.** It decides whether
  region may be relaxed; language never is. Show that invariant on the form so
  nobody looks for a language toggle.

### 10.2 Care Hub authoring — `content` + `clinical_governance`

```
GET   /v1/admin/care-hub/items          GET   /v1/admin/care-hub/items/:id
POST  /v1/admin/care-hub/items          PATCH /v1/admin/care-hub/items/:id
POST  /v1/admin/care-hub/items/:id/submit     # content, clinical_gov
POST  /v1/admin/care-hub/items/:id/publish    # clinical_governance ONLY
POST  /v1/admin/care-hub/items/:id/archive    # content, clinical_gov
```

```
draft ──create/edit──▶ draft ──submit──▶ in review ──publish──▶ published ──archive──▶ archived
                                              │
                                              └── (sent back, edited, resubmitted)
```

**Publish is `clinical_governance` only.** A content editor writes and submits;
only clinical governance signs it off, because this is patient-facing clinical
content requiring clinician sign-off (SRS §8). The panel must model that as two
people — a `content` admin never sees a publish button, and `items/:id` carries
the review trail so the editor can see what happened.

### 10.3 Notification copy — `content`, `clinical_governance`

```
GET   /v1/admin/notification-templates
GET   /v1/admin/notification-templates/:code
PATCH /v1/admin/notification-templates/:code
POST  /v1/admin/notification-templates/:code/reset
```

FR-16.3. Every notification the platform sends, with its current wording. Both
apps take their copy from here and hardcode none of it.

**The hard rule the editor must enforce: no notification may name a diagnosis.**
That is a product invariant, not a preference. Put it on the screen next to the
field. `reset` restores the wording that shipped — keep it, because a
well-meaning edit to a clinical notification is the likeliest mistake here.

### 10.4 Search and crisis config

```
GET   /v1/admin/search/config              # content, clinical_gov
PATCH /v1/admin/search/crisis-keywords     # clinical_governance ONLY
PATCH /v1/admin/search/emergency-guidance  # clinical_governance ONLY
PATCH /v1/admin/search/synonyms            # content, clinical_gov
PATCH /v1/admin/search/popular-searches    # content ONLY
PATCH /v1/admin/search/disclaimer          # content, clinical_gov
```

FR-5.6, FR-5.7, FR-5.8. The two `clinical_governance`-only rows are the safety
ones: **the crisis keyword list and what a patient in crisis is shown**. The
patient app runs no keyword list of its own — it renders what this returns. An
empty save here silently disables the crisis interrupt, so the form must refuse to
save an empty list rather than trusting the admin.

### 10.5 Follow-up pathways

```
GET  /v1/admin/followup-pathways         # clinical_gov, content, operations
POST /v1/admin/followup-pathways/:code   # clinical_gov, content — publishes a NEW version
```

FR-13.7. Question sets and red-flag rules. **`POST` publishes a new version; it
never edits the live one** — `GET` returns every version, newest first. So the
editor is "duplicate the current version, change it, publish", and in-flight
patients stay on the version they started. Do not build an in-place edit form.

Red-flag rules here are what turn a daily check-in answer into a safety alert in
§8.3. The two are the same feature seen from both ends.

### 10.6 Legal documents

```
POST /v1/admin/legal/documents                          # content, clinical_gov
GET  /v1/admin/legal/documents/:documentType/versions   # content, clinical_gov, operations
```

Types: `teleconsultation_consent`, `privacy_policy`, `terms_of_use`,
`refund_policy`, `reconsult_policy`, `doctor_agreement`. Versioned, same as
pathways — publishing a new version of the teleconsultation consent **re-prompts
every patient** before their next consultation. Say that in the confirm dialog;
it is the most disruptive button in the panel.

### 10.7 Settings — every level, filtered

```
GET /v1/admin/config
PUT /v1/admin/config/:key   { value }
```

FR-7.5, FR-13.7, FR-16.3. Only values a module registered. Each key returns what
it is for, the shape expected, whether **your** level may edit it, and — where it
has a dedicated screen — `managedBy` naming that screen instead.

Render straight from the response. Do not add a key the panel knows about locally,
and do not offer an editor for a `managedBy` value: two ways to change one value
is how the two drift apart, and the specialised screen validates things this one
cannot. A write is refused unless the key is registered, your level owns it, and
the value is the right shape. The audit entry, with before and after, **is** the
configuration history — there is no versions table, so the settings screen's
"history" link goes to the audit log filtered to that key.

---

## 11. Feedback and complaints — `operations`, `clinical_governance`

```
GET  /v1/admin/feedback                                 # FR-18.8 review
GET  /v1/admin/complaints                               # the queue
GET  /v1/admin/complaints/:complaintId                  # one, with the FULL thread
POST /v1/admin/complaints/:complaintId/assign
POST /v1/admin/complaints/:complaintId/reply   { body, visibleToPatient }
POST /v1/admin/complaints/:complaintId/close   { outcome, … }
```

`ComplaintStatus`: `open`, `in_progress`, `resolved`, `rejected`.
`ComplaintCategory`: `consultation_quality`, `doctor_conduct`, `technical_issue`,
`payment_issue`, `other`.

```
open ──assign──▶ in_progress ──reply(×n)──▶ ──close──▶ resolved
                                                  └──▶ rejected
```

1. **Assign is "pick it up"** — it puts your admin id on the ticket so two admins
   do not both answer. Make it the first action on an `open` ticket.
2. **Reply has two audiences.** A reply to the patient reaches their app; a reply
   to the file does not. The admin view shows the FULL thread; the patient sees
   only what was shared with them. That distinction must be unmissable in the
   composer — a toggle with two clear labels, and the internal note styled
   differently in the thread. Getting it wrong sends an internal remark about a
   doctor to a patient.
3. **`resolved` and `rejected` are both terminal and they are different.** "We
   looked and disagreed" is not "we fixed it", and the patient is owed the
   distinction. Two separate buttons, each demanding an outcome note.
4. A complaint about a consultation should link straight to §7.4's evidence tab.
   A doctor-conduct complaint should link to §5.7's reliability.

---

## 12. Compliance and data rights

### 12.1 Audit log — every level, row-filtered

```
GET /v1/admin/compliance/audit?actorType=&actorId=&entityType=&entityId=&consultationId=&action=&from=&to=&limit=
GET /v1/admin/compliance/audit/export        # same search, as a file
GET /v1/admin/compliance/audit/consultation/:consultationId   # ops, clinical_gov
```

`AuditAction`: `create`, `read`, `update`, `delete`, `export`, `login`, `verify`,
`webhook`. `limit` caps at 1000 (default 200).

Two things the screen must be honest about:

- **The rows you see depend on your level.** `readableEntityTypes` narrows the
  entity types per level; `super_admin` sees everything. So the screen must say
  "filtered to what your role may read" rather than implying it is the whole log.
  Otherwise an admin concludes an event did not happen.
- **Searching the log is itself audited.** Reading who saw what is a privileged
  act. Tell the admin that on the screen — it changes how the feature is used,
  which is the point.

### 12.2 Deletion requests — a deliberate two-level, two-step flow

```
GET  /v1/admin/deletion-requests                               # operations
POST /v1/admin/deletion-requests/:id/review   { decision, … }  # operations
POST /v1/admin/compliance/deletion-requests/:requestId/execute # super_admin ONLY
```

```
requested ──▶ in_review ──review──▶ approved ──execute──▶ executed
                              └──▶ rejected                └──▶ failed
```

A patient raises the request in their app. `operations` **reviews** it;
`super_admin` alone **executes** it. Approval and destruction are two decisions by
two people, and the panel must not put them on one screen — an `approved` request
should appear in a separate super-admin queue. `failed` is a real state; show it
with a retry.

### 12.3 Subject access and retention — `super_admin` only

```
GET  /v1/admin/compliance/patients/:patientId/data-export
GET  /v1/admin/compliance/retention
POST /v1/admin/compliance/retention/apply
```

The one place the panel addresses a patient by id rather than through a
consultation — and it is export-only, gated to `super_admin`, and audited as an
`export` action.

`retention/apply` runs the retention sweep by hand. A scheduled system run does
the same thing routinely; the manual button exists for the case where it did not.
It is destructive and `super_admin`-only — make it a typed confirmation, and show
`GET /retention` (the current retention window and what is in scope) on the same
screen first.

---

## 13. Gaps — what the panel needs that the backend does not have yet

Follows the `G-n` convention of `docs/API_CONTRACT.md`; `A-n` for admin.

| # | Blocks | Detail |
| --- | --- | --- |
| **A-1** | Any patient-management screen | There is no `admin/patients` controller. The panel cannot list patients, search them, open a profile, or suspend an account. Patient reach is: one consultation by id, complaints, deletion requests, and a `super_admin` data export by patient id. **Decide before drawing the nav**: either accept a consultation-centric design (which matches the least-privilege model and is what the API supports today), or get a patient admin controller added. Do not fake it with a list built from consultations. |
| **A-2** | FR-18.3 appointment management | `GET /v1/admin/consultations/:id` exists; **there is no list or filter**. FR-18.3 asks for management of scheduled and instant consults, cancellations, no-shows and rescheduling, and there is no queue to manage them from. Nearest substitutes: `governance/allocation-decisions` and `governance/pending-case-summaries`. Needs `GET /v1/admin/consultations?status=&from=&to=&doctorId=` before the section is buildable. |
| **A-3** | FR-18.3 rescheduling | An admin can override the provider and cancel, but there is **no admin reschedule**. `POST /v1/doctor/consultations/:id/reschedule` is the doctor's own. Confirm whether admin-side rescheduling is in scope; today the answer is cancel-and-rebook, which means a refund and a new payment. |
| **A-4** | Admin account management | `POST /v1/auth/admin/accounts` creates one. There is **no list, no edit, no suspend, no password reset, and no 2FA toggle** — although FR-1.10 says a super admin switches 2FA per account. A super admin cannot currently see who the other admins are. Needed for an "Admin accounts" screen to exist at all. |
| **A-5** | Credential queue completeness | `GET /credential-queue` and per-doctor credentials exist, but the document **file** is reached through the files module's signed-URL flow; with `STORAGE_PROVIDER=stub` those URLs go nowhere. The review screen can be built against the metadata, but it cannot be tested end to end until real storage is configured. |
| **A-6** | Notification delivery visibility | `NotificationStatus` is `queued`, `sent`, `failed`, but there is no admin endpoint that lists deliveries. The panel can edit copy and cannot see whether it arrived. |

---

## 14. Rules that apply to every screen

Same list as the apps, because it is the same backend.

- **Branch on `error.code`, never on `error.message`.** `code` is frozen contract;
  `message` is reworded freely.
- **Never spread a form object into a request body.** `forbidNonWhitelisted: true`
  makes one unexpected field a hard 400. Build every payload explicitly. This
  bites harder in a panel, where forms are wide and often partially edited.
- **`whitelist: true` strips unknown fields before validation**, so a typo'd field
  name is silently absent rather than obviously wrong. A PATCH that "did nothing"
  is usually this.
- **Refresh on 401 must be single-flight.** A dashboard fires many queries at
  once; they must share one refresh.
- **`INSUFFICIENT_PERMISSION` is a normal response, not a bug.** Every screen
  handles it as "your role does not have this", and the nav should have hidden the
  action already. Two layers, and the server is the authority.
- **Log `requestId` on every failure.** It ties a panel error to a backend log
  line, and every response carries `x-request-id`.
- **Every mutating action is audited with the actor's admin id.** That is why
  several actions demand a reason — the reason field is the audit answer, not
  paperwork. Never default or pre-fill one.
- **Reasons shown to a doctor or a patient are user-facing copy.** Credential
  rejection reasons and complaint replies are read verbatim by the person
  affected. The composer should say so.

---

## 15. Suggested build order

Dependency order, matching where the backend is actually complete.

1. **Sign-in, 2FA, session, nav shell.** Build the level→nav map once, centrally.
2. **Providers + credential queue + verify/list.** No blockers except A-5's
   storage, and nothing else in the platform works until doctors exist.
3. **Availability and the assignability screen.** Complete server-side, and it is
   what makes every allocation question answerable.
4. **Governance dashboard, safety alerts, pending summaries.** Complete, and
   `care_coordinator` has no other screen.
5. **Complaints and feedback.** Complete. Get the patient-visible vs internal
   reply distinction right before anything else ships in this section.
6. **Payments: payouts, refunds, export.** Complete. Remember payouts are
   recorded, not paid.
7. **Content, catalogue, notification templates, search config, pathways, legal.**
   Complete, and the highest-value section for the client — it is what removes the
   need for an app release.
8. **Compliance: audit, deletion review/execute, retention.** Complete.
9. **Consultations section** — last, and only after A-2 lands. Until then, reach
   consultations by id from the queues.
