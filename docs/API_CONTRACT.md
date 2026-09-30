# Backend API Contract

For the frontend monorepo. The backend is the sibling repo `../coracure`
(NestJS + Fastify). This document is the integration reference; the machine
truth is the generated OpenAPI schema, and the behavioural spec is
`docs/USER_STORIES.md`.

---

## 1. Connecting

| Setting | Value |
| --- | --- |
| Base URL | `<host>/api/v1` (`API_PREFIX=api`, URI versioning, default version `1`) |
| Swagger UI | `http://localhost:3000/docs` |
| OpenAPI JSON | `http://localhost:3000/docs-json` |
| Auth | `Authorization: Bearer <accessToken>` |
| Correlation | every response carries `x-request-id`; echo it in bug reports |

### Reaching it from a device

| Target | Base URL |
| --- | --- |
| Android emulator | `http://10.0.2.2:3000/api/v1` |
| iOS simulator | `http://localhost:3000/api/v1` |
| Physical device | `http://<LAN-IP>:3000/api/v1` |

The backend already binds `HOST=0.0.0.0`, so a device on the same network can
reach it. Native has no CORS; `CORS_ORIGINS` only matters if you run
`react-native-web`.

Android blocks cleartext HTTP by default. For local development against
`http://`, the app's `network_security_config.xml` must permit it — this is a
debug-build concession, never shipped.

### Local backend

```bash
cd ../coracure
docker compose up -d postgres redis   # add livekit when you reach video
npm run db:migrate:dev && npm run db:seed
npm run start:dev
```

Set these in the backend `.env` for frontend work:

```
OTP_PROVIDER=stub
OTP_STUB_CODE=000000
```

Any mobile number then receives a challenge and `000000` always verifies. With
`OTP_PROVIDER=slide` (the current default in that file) every attempt sends a
real SMS. `STORAGE_PROVIDER` defaults to `stub`, which signs upload URLs that
go nowhere — enough to build the upload UI, not enough to store a file.

---

## 2. Authentication

### Patient

```
POST /v1/auth/patient/otp/request   { mobileNumber }
      -> { challengeId }
POST /v1/auth/patient/otp/verify    { mobileNumber, challengeId, code, pushToken?, deviceId? }
      -> { accessToken, refreshToken, expiresIn, isNewAccount }
```

**`challengeId` is required on verify.** It comes back from the request call and
`VerifyOtpDto` declares it `@IsString() @IsNotEmpty()`. With
`forbidNonWhitelisted: true` on one side and that on the other, omitting it is a
hard 400 rather than a silent default. An earlier revision of this document
showed the body as `{ mobileNumber, code }`; that was incomplete. A **resend
issues a NEW challenge**, so the client must replace the id it is holding —
verifying a fresh code against a stale challenge fails as an invalid code.

`mobileNumber` is E.164: `/^\+[1-9]\d{7,14}$/`, max 16 characters.

Sign-up and sign-in are the same call. The response to `request` is identical
whether or not the number has an account, so it cannot be used to discover who
is registered — the UI must not imply otherwise. The patient row is written on
first successful verify.

### Doctor

```
POST /v1/auth/doctor/otp/request
POST /v1/auth/doctor/otp/verify
```

There is **no doctor sign-up**. An admin creates the account first; an unknown
number is refused rather than texted a code. The verify response carries
`verificationStatus`, and the app routes on it: an unverified doctor lands on
the credential screen, not the dashboard.

### Session

```
POST /v1/auth/refresh      { refreshToken }
POST /v1/auth/sign-out
```

Token response shape:

```ts
{ accessToken: string; refreshToken: string; expiresIn: number }  // expiresIn in seconds
```

Access TTL 15 minutes, refresh TTL 30 days.

**Refresh must be single-flight.** A screen firing four parallel queries after
expiry must issue one refresh and have the other three await it. Without that,
three of the four refreshes lose the race and log the user out.

Store both tokens in `react-native-keychain`. Not AsyncStorage — it is
plaintext on disk, and this app holds clinical data.

---

## 3. The error shape

Every endpoint, every failure, returns exactly this:

```json
{
  "statusCode": 409,
  "code": "NO_PROVIDER_AVAILABLE",
  "message": "Human-facing text, may be reworded at any time",
  "details": {},
  "path": "/api/v1/me/consultations",
  "requestId": "…",
  "timestamp": "2026-09-09T…Z"
}
```

**Branch on `code`. Never parse `message`.** `code` is part of the contract and
does not change once released; `message` is free to be reworded. Log
`requestId` on every failure — it ties a screen error to a backend log line.

### Platform codes

`VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `INSUFFICIENT_PERMISSION`,
`CONFLICT`, `NOT_FOUND`, `CONFIG_MISSING`, `CONFIG_INVALID`,
`DATABASE_UNAVAILABLE`, `STORAGE_UNAVAILABLE`, `INTERNAL_ERROR`.

### Domain codes worth designing a screen for

| Code | Where | What the UI should do |
| --- | --- | --- |
| `NO_PROVIDER_AVAILABLE` | booking, instant | Not a toast. Show the soonest coverable time and offer it. |
| `SLOT_TAKEN`, `SLOT_UNAVAILABLE` | booking | Refresh the picker, explain, keep the user's other choices. |
| `CONSENT_REQUIRED` | booking | Route into the consent flow, then resume the booking. |
| `PROFILE_INCOMPLETE` | booking | Route into profile completion, then resume. |
| `DECLINE_LIMIT_REACHED` | decline provider | Hide the decline action and say why. |
| `ALREADY_PAID`, `NOT_PAYABLE` | checkout | Reconcile against the bill; do not retry blindly. |
| `NOT_REFUNDABLE` | cancel | Show the policy consequence before the action, not after. |
| `TOO_MANY_ATTEMPTS` | OTP | "Try again in N minutes", never a raw error. |
| `TOKEN_INVALID` | any | Sign out cleanly; do not loop the refresh. |
| `ACCOUNT_NOT_ACTIVE` | sign-in | Plain message; do not reveal account existence. |
| `FILE_IS_PART_OF_A_RECORD` | delete file | Disable delete on those files with the reason shown. |
| `REPORT_REQUEST_CLOSED` | upload | Refresh the request list. |
| `OFFER_CLOSED`, `OFFER_NOT_FOUND` | instant | The request moved on; re-poll status. |

Doctor-app codes: `DOCTOR_NOT_VERIFIED`, `DOCTOR_NOT_APPROVED`,
`CREDENTIALS_INCOMPLETE`, `DOCUMENTATION_OUTSTANDING` (the instant-consult
completion gate), `PRESENCE_NOT_SELF_SETTABLE`, `ONLY_DOCTORS_PRESCRIBE`,
`PRESCRIPTION_OR_ADVICE_MISSING`, `CASE_SUMMARY_MISSING` /
`CASE_SUMMARY_TOO_SHORT` / `CASE_SUMMARY_TOO_LONG`, `OVERLAPPING_AVAILABILITY`,
`INVALID_TIME_RANGE`, `DATE_IN_THE_PAST`.

---

## 4. Request gotchas

- **`forbidNonWhitelisted: true`.** An unexpected field in a body is a 400, not an ignored key. Never spread a form-state object straight into a POST — build the payload explicitly.
- **`whitelist: true`** strips unknown fields before validation, so a typo'd field name is silently absent rather than obviously wrong.
- **Query params are implicitly coerced**, so `?limit=20` as a string is fine.
- **Webhook routes** (`/v1/payments/webhook`, `/v1/video/webhook`) verify an HMAC over raw bytes. They are gateway-to-server only; the app never calls them.

---

## 5. How to read sections 6 to 9

Sections 6, 7 and 8 are the complete Swagger inventory — every route the
backend mounts — **ordered the way an app actually calls them**, not
alphabetically and not by module. Section 6 is the patient app's journey from
first launch to after-care, 7 is the doctor app's, 8 is the admin panel's.
Section 9 holds the two webhooks and the health probes, which no app calls.
Section 10 is the type dictionary every entry points at, and section 11 the
enumerations.

Conventions used in every entry:

| Notation | Meaning |
| --- | --- |
| `POST /v1/…` | Append to `<host>/api`. Full URL: `http://localhost:3000/api/v1/…` |
| `· patient` | The `@Roles` on the controller. Anything but `public` needs `Authorization: Bearer <accessToken>` |
| `· 201` | Success status. POST is 201 unless stated; GET/PATCH/PUT are 200; 204 means no body |
| `→ Shape` | The response is the named type in **section 10** |
| `Date` | Serialises as an ISO-8601 string (`"2026-09-14T09:30:00.000Z"`), never a number |
| `uuid` | A v4 UUID string; anything else is `VALIDATION_FAILED` |
| `?` on a field | Optional in a request, or nullable in a response as written |

Rules that apply to **every** entry and are not repeated:

- Unknown body fields are a 400 (`forbidNonWhitelisted`). Build payloads field by field.
- Query params are coerced from strings, so `?limit=20` is fine.
- Any endpoint can return the section-3 error shape with a platform code
  (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, …). Only
  **domain** codes worth branching on are listed per endpoint.
- Admin endpoints additionally assert a permission level inside the handler; the
  levels are named per entry in section 8. A permitted role with the wrong level
  gets `INSUFFICIENT_PERMISSION`.
- Doctor endpoints marked `· doctor†` also carry `@VerifiedDoctorsOnly()`: an
  unverified account is refused with `DOCTOR_NOT_VERIFIED` and must finish 7.2 first.

---

## 6. Patient app — every endpoint, in flow order

### 6.1 First launch, before any account exists

**`GET /v1/legal/documents`** · public · 200
```ts
// response: LegalDocumentSummary[] — the body text is deliberately omitted
[{ id: uuid; documentType: LegalDocumentType; version: string; title: string;
   isCurrent: boolean; createdAt: Date }]
```

**`GET /v1/legal/documents/:documentType`** · public · 200
`:documentType` is one of the `LegalDocumentType` values (section 11); anything
else is a 400 from the enum pipe.
```ts
// response: LegalDocument — the same, plus the full text
{ id: uuid; documentType: LegalDocumentType; version: string; title: string;
  body: string; isCurrent: boolean; createdAt: Date }
```

### 6.2 Sign in and sign up — the same two calls

**`POST /v1/auth/patient/otp/request`** · public · **200**
```ts
// request
{ mobileNumber: string }   // E.164, /^\+[1-9]\d{7,14}$/, max 16 chars
// response
{ challengeId: string }
```
The response is identical whether or not the number has an account — do not
build a UI that implies otherwise. Errors: `TOO_MANY_ATTEMPTS`, `ACCOUNT_NOT_ACTIVE`.

**`POST /v1/auth/patient/otp/verify`** · public · **200**
```ts
// request — challengeId is REQUIRED; a resend issues a NEW one, replace it
{ mobileNumber: string; challengeId: string; code: string;
  pushToken?: string;    // max 4096
  deviceId?: string }    // max 120
// response: TokenPair & { isNewAccount }
{ accessToken: string; refreshToken: string; expiresIn: number; isNewAccount: boolean }
```
`expiresIn` is **seconds** (900). The patient row is written here, on first
success. Errors: `OTP_INVALID`, `TOO_MANY_ATTEMPTS`.

**`POST /v1/auth/refresh`** · public · **200**
```ts
// request
{ refreshToken: string }
// response: TokenPair
{ accessToken: string; refreshToken: string; expiresIn: number }
```
Must be single-flight. Errors: `TOKEN_INVALID` → sign out cleanly, never loop.

**`POST /v1/auth/sign-out`** · patient, doctor, admin · **204** (no body either way)
Revokes every device at once — this is one `token_version` increment, so there
is no per-device sign-out.

### 6.3 Consent, before anything can be booked

**`GET /v1/legal/consents/me/status`** · patient, doctor · 200
```ts
{ teleconsultationConsent: boolean; privacyPolicy: boolean; termsOfUse: boolean }
```
Publishing a new version flips the matching flag back to `false`. This is the
call the app makes before offering a booking.

**`POST /v1/legal/consents`** · patient, doctor · 201
```ts
// request
{ documentType: LegalDocumentType }
// response: AcceptedConsent
{ documentType: LegalDocumentType; legalDocumentId: uuid; version: string; acceptedAt: Date }
```
Accepting twice is a no-op, so a retry is not an error. The caller's IP is
recorded as legal evidence.

**`GET /v1/legal/consents/me`** · patient, doctor · 200 → `AcceptedConsent[]`

### 6.4 Profile — completing it is what activates the account

**`GET /v1/me/profile`** · patient · 200 → `OwnProfile`

**`PATCH /v1/me/profile`** · patient · 200 → `OwnProfile`
```ts
// request — every field optional, send only what changed
{ fullName?: string;            // 1–160
  dateOfBirth?: string;         // "YYYY-MM-DD"
  gender?: 'male' | 'female' | 'other' | 'undisclosed';
  preferredLanguage?: 'en' | 'hi';
  regionId?: uuid }
```
`mobileNumber` is the sign-in identifier and cannot be changed here. Supplying
both a name and a date of birth moves `status` from `pending` to `active` and
flips `isComplete`. Errors: `INVALID_DATE_OF_BIRTH`.

**`GET /v1/regions`** · patient, doctor, admin · 200 → `RegionRecord[]` (active only)
The picker behind `regionId` above.

### 6.5 Finding a service — search, never a doctor list

**`GET /v1/search/suggestions`** · patient, admin · 200
```ts
{ disclaimer: string; popular: string[] }
```
What to show before anything is typed. Recent searches live on the device —
there is no endpoint for them, on purpose.

**`POST /v1/search`** · patient, admin · **200** (a POST so the query stays out of logs)
```ts
// request
{ query: string }   // 2–400 chars
// response: SearchResponse — a union. Branch on `crisis`.
{ disclaimer: string; crisis: false; results: ServiceMatch[] }
| { disclaimer: string; crisis: true; guidance: EmergencyGuidance; results: [] }
```
When `crisis` is `true`, `results` is always empty and `guidance` is what the
screen must render **instead of** results. `disclaimer` comes back every time
and must always be shown.

**`GET /v1/search/guide`** · patient, admin · 200
```ts
{ disclaimer: string; services: GuideEntry[] }
```
For a patient who cannot describe the problem. A route, never a gate.

**`GET /v1/services`** · patient, doctor, admin · 200 → `ServiceListing[]`

**`GET /v1/concerns?specialtyId=<uuid>`** · patient, doctor, admin · 200 → `ConcernRecord[]`
`specialtyId` is optional; omitted returns the whole active taxonomy.

### 6.6 Care Hub — readable at any point

**`GET /v1/care-hub/items`** · patient, doctor · 200 → `PublicContentItem[]`
```ts
// query — all optional
{ itemType?: ContentItemType; concernId?: uuid; specialtyId?: uuid;
  verifiedOnly?: boolean; limit?: number /* 1–200 */ }
```

**`GET /v1/care-hub/items/:slug`** · patient, doctor · 200 → `PublicContentDetail`

**`GET /v1/care-hub/emergency`** · patient, doctor · 200 → `PublicContentDetail[]`
The published emergency-guidance items. Distinct from the crisis `guidance`
block on a search response, which is configuration rather than content.

### 6.7 Booking a scheduled consultation

**`POST /v1/me/consultations`** · patient · 201 → `ConsultationRecord`
```ts
// request — a SERVICE and a time. Never a provider.
{ specialtyId: uuid;
  concernId?: uuid;                           // what search mapped the query onto
  startsAt: string;                           // ISO-8601
  channel?: 'video' | 'audio';                // default 'video'
  intakeAnswers?: Record<string, unknown> }   // snapshotted onto the booking
```
Comes back `status: 'pending_payment'` with a `holdExpiresAt` — **that row is
the slot hold** and it expires. A free service is booked outright.

Errors, each with a screen behind it:

| Code | Status | `details` | What the screen does |
| --- | --- | --- | --- |
| `CONSENT_REQUIRED` | 409 | — | Route into 6.3, then resume the booking |
| `PROFILE_INCOMPLETE` | 409 | — | Route into 6.4, then resume |
| `NO_PROVIDER_AVAILABLE` | 409 | `{ soonestAvailableAt: ISO \| null, reason: 'no_provider_speaks_the_language' \| 'none_free_for_long_enough' \| 'all_declined' }` | **Not a toast.** Offer `soonestAvailableAt` |
| `SLOT_TAKEN` | 409 | — | Refresh the picker, keep the other choices |
| `SERVICE_NOT_AVAILABLE` | 409 | — | Re-fetch `/v1/services` |

**`GET /v1/me/consultations`** · patient · 200 → `ConsultationRecord[]`
```ts
// query
{ upcoming?: boolean;   // default true. true = pending_payment / scheduled / awaiting_doctor
  limit?: number }      // default 50, max 100
```

**`GET /v1/me/consultations/:consultationId`** · patient · 200 → `ConsultationRecord`

**`GET /v1/doctors/:doctorId`** · patient · 200 → `DoctorListing`
Resolves the `doctorId` on a booking to the assigned provider's profile.
Refused unless that provider is actually assigned to this patient — it is not a
directory, and there is no list form of it.

### 6.8 Checkout — the hold is running down

**`POST /v1/me/consultations/:consultationId/checkout`** · patient · 201 → `CheckoutSession`
```ts
// no request body
{ consultationId: uuid; bill: Bill; orderId: string;
  amountPaise: number; currency: string; publicKey: string }
```
Hand `orderId`, `amountPaise` and `publicKey` to the gateway SDK. Payment is
confirmed server-side by the webhook in 9.1 — **never** mark the consultation
paid from the client. Re-read the consultation, or wait for the notification.
Errors: `ALREADY_PAID`, `NOT_PAYABLE` — reconcile against the bill, never retry blindly.

**`GET /v1/me/consultations/:consultationId/bill`** · patient · 200 → `PaymentRecord`
Every component separately: fee, convenience fee, GST, total, and the refund if
there is one.

### 6.9 Consult Now — the instant path

**`POST /v1/me/consultations/instant`** · patient · 201 → `ConsultationRecord`
```ts
// request — no time, because there is no slot yet
{ specialtyId: uuid; concernId?: uuid; intakeAnswers?: Record<string, unknown> }
```
Comes back `status: 'awaiting_doctor'`, `doctorId: null`, `holdExpiresAt: null`.
Same `CONSENT_REQUIRED` / `PROFILE_INCOMPLETE` gates as 6.7.

**`GET /v1/me/consultations/:consultationId/instant-status`** · patient · 200
```ts
{ attempts: number;          // how many providers have been asked so far
  stillSearching: boolean;   // an offer is open right now
  accepted: boolean }
```
The poll behind the "finding you a doctor" screen. `OFFER_CLOSED` and
`OFFER_NOT_FOUND` mean the request moved on — re-poll rather than show an error.

### 6.10 Changing or leaving a booking

**`POST /v1/me/consultations/:consultationId/decline-provider`** · patient · 201 → `ConsultationRecord`
```ts
{ reason: string }   // required, 1–200 chars, recorded against the provider
```
Errors: `DECLINE_LIMIT_REACHED` — hide the action and say why.

**`POST /v1/me/consultations/:consultationId/reschedule`** · patient · 201 → `ConsultationRecord`
```ts
{ startsAt: string }   // ISO-8601
```
Creates a **new** consultation linked back to this one and cancels this one —
the response is the new row, so replace the id you are holding. The provider is
assigned from scratch, so the same refusals as 6.7 apply.

**`POST /v1/me/consultations/:consultationId/cancel`** · patient · 201 → `ConsultationRecord`
```ts
{ reason?: string }   // max 200
```
Errors: `NOT_CHANGEABLE`, `NOT_REFUNDABLE` — show the policy consequence
*before* the action, not after.

### 6.11 Documents

**`POST /v1/me/files/upload-url`** · patient · 201
```ts
// request
{ category: 'medical_history' | 'report' | 'photo';
  fileName: string;                  // max 255
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/heic' | 'image/webp' }
// response
{ storageKey: string; upload: { url: string; expiresInSeconds: number } }
```
Step 1 of 2. PUT the bytes to `upload.url` yourself, then confirm:

**`POST /v1/me/files`** · patient · 201 → `PatientFileRecord`
```ts
{ category: 'medical_history' | 'report' | 'photo';
  fileName: string;
  storageKey: string;          // exactly the key returned above
  consultationId?: uuid;
  reportRequestId?: uuid }     // set this to fulfil a request from 6.11
```
A key not minted for this patient reads as not-found, not forbidden. If the
confirm never happens the object is swept; a row pointing at nothing cannot happen.

**`GET /v1/me/files`** · patient · 200 → `PatientFileRecord[]`
```ts
// query
{ category?: PatientFileCategory; consultationId?: uuid }
```

**`GET /v1/me/files/:fileId/download-url`** · patient · 200
```ts
{ url: string; expiresInSeconds: number; sizeBytes: number | null }
```
`storageKey` is never returned here — a file has no permanent address.

**`DELETE /v1/me/files/:fileId`** · patient · **204**
Errors: `FILE_IS_PART_OF_A_RECORD` — disable delete on those files, reason shown.

**`GET /v1/me/files/requests/open`** · patient · 200 → `ReportRequestRecord[]`
What the provider has asked for and not yet received. On upload,
`REPORT_REQUEST_CLOSED` means refresh this list.

**`GET /v1/consultations/:consultationId/report-requests`** · patient, doctor · 200 → `ReportRequestRecord[]`
Everything asked for on one consultation and what came back, for both parties.

### 6.12 The call

**`GET /v1/consultations/:consultationId/video/readiness`** · patient, doctor · 200
```ts
// JoinReadiness
{ consultationId: uuid; serverUrl: string; joinable: boolean;
  reason?: string; message?: string; opensAt?: Date | null }
```
Poll this to drive the join button. `opensAt` is when the door unlocks.

**`POST /v1/consultations/:consultationId/video/token`** · patient, doctor · 201
```ts
// JoinTicket — no request body
{ consultationId: uuid; roomName: string; serverUrl: string; token: string;
  identity: string; expiresInSeconds: number; canPublish: boolean; canSubscribe: boolean }
```
Short-lived. Fetch it at join time; never cache it across a screen.

**`GET /v1/consultations/:consultationId/video/session`** · patient, doctor · 200 → `SessionRecord`
What happened on the call: who joined, when, for how long, and who did not turn up.

### 6.13 After the consultation

**`GET /v1/me/consultations/:consultationId/care-record`** · patient · 200 → `PatientCareView`
The prescription and advice. It exists only once the doctor has finalised
(7.6); before that it is a 404.

**`GET /v1/me/consultations/:consultationId/care-plan`** · patient · 200 → `CarePlan`
The whole after-care screen in one call: care record, follow-up plan, today's
check-in, the recommended Care Hub items, and whether emergency guidance exists.

**`GET /v1/me/consultations/:consultationId/checkin`** · patient · 200 → `TodaysCheckin`
Today's questions. Outside the window this refuses rather than returning an
empty form.

**`POST /v1/me/consultations/:consultationId/checkin`** · patient · 201 → `CheckinResult`
```ts
// request — keys are the question ids from TodaysCheckin
{ answers: Record<string, unknown> }
// response
{ consultationId: uuid; checkinDate: Date; day: number; ofDays: number;
  status: 'green' | 'amber' | 'red'; showEmergencyGuidance: boolean; reasons: string[] }
```
`showEmergencyGuidance: true` is the whole point of the screen — render the
guidance, do not bury it in a toast.

**`GET /v1/me/consultations/:consultationId/checkins`** · patient · 200
```ts
[{ checkinDate: Date; status: 'green' | 'amber' | 'red'; answers: unknown; submittedAt: Date }]
```

### 6.14 Feedback and complaints

**`PUT /v1/me/consultations/:consultationId/feedback`** · patient · 200 → `FeedbackRecord`
```ts
{ rating: number;      // integer 1–5
  comment?: string }   // max 2000
```
A PUT: submitting twice replaces, it does not stack.

**`GET /v1/me/consultations/:consultationId/feedback`** · patient · 200 → `FeedbackRecord`

**`POST /v1/me/complaints`** · patient · 201 → `PatientComplaintView`
```ts
{ category: 'consultation_quality' | 'doctor_conduct' | 'technical_issue' | 'payment_issue' | 'other';
  subject: string;         // max 200
  description: string;     // max 4000
  consultationId?: uuid }
```

**`GET /v1/me/complaints`** · patient · 200 → `PatientComplaintView[]`

**`GET /v1/me/complaints/:complaintId`** · patient · 200 → `PatientComplaintView`
Internal admin notes are stripped: the patient sees only `isInternal: false` messages.

**`POST /v1/me/complaints/:complaintId/reply`** · patient · 201 → `PatientComplaintView`
```ts
{ body: string }   // max 4000
```

### 6.15 Notifications

**`GET /v1/me/notifications`** · patient, doctor, admin · 200 → `NotificationRecord[]`
```ts
// query
{ unreadOnly?: boolean;  // default false
  limit?: number;        // default 30, max 100
  before?: string }      // ISO-8601 cursor, newest-first paging
```

**`GET /v1/me/notifications/unread-count`** · patient, doctor, admin · 200
```ts
{ unread: number }
```

**`POST /v1/me/notifications/:notificationId/read`** · patient, doctor, admin · **204**

**`POST /v1/me/notifications/read-all`** · patient, doctor, admin · 201
```ts
{ marked: number }
```
Copy comes from the backend and never names a diagnosis — do not build local
strings for these.

### 6.16 Data rights

**`POST /v1/me/deletion-requests`** · patient · 201 → `DeletionRequest`
```ts
{ reason?: string }   // max 2000
```
Errors: `DELETION_REQUEST_ALREADY_OPEN` — one open request at a time.

**`GET /v1/me/deletion-requests`** · patient · 200 → `DeletionRequest[]`

**`GET /v1/me/data-export`** · patient · 200 → `SubjectAccessExport`
Everything held about the caller, including a `notIncluded` map naming what is
withheld and why.
---

## 7. Doctor app — every endpoint, in flow order

There is **no doctor sign-up**. An admin creates the account first (8.3), so an
unknown number is refused rather than texted a code.

### 7.1 Sign in

**`POST /v1/auth/doctor/otp/request`** · public · **200**
```ts
// request
{ mobileNumber: string }   // E.164
// response
{ challengeId: string }
```
Errors: `ACCOUNT_NOT_FOUND` / `ACCOUNT_NOT_ACTIVE` — a number no admin has
enrolled gets no SMS.

**`POST /v1/auth/doctor/otp/verify`** · public · **200**
```ts
// request
{ mobileNumber: string; challengeId: string; code: string;
  pushToken?: string; deviceId?: string }
// response: TokenPair & { verificationStatus }
{ accessToken: string; refreshToken: string; expiresIn: number;
  verificationStatus: 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended' }
```
**The app routes on `verificationStatus`.** Anything other than `verified`
lands on the credential screen (7.2), not the dashboard. The first success also
stamps `mobile_verified_at`.

Refresh and sign-out are the shared calls in 6.2.

### 7.2 Profile and credentials — the verification gate

**`GET /v1/me/doctor/profile`** · doctor · 200 → `DoctorSelfProfile`

**`PATCH /v1/me/doctor/profile`** · doctor · 200 → `DoctorSelfProfile`
```ts
// request — a doctor may edit only these four. Name, qualification,
// registration number and fee are the admin's (8.3).
{ bio?: string;                          // max 4000
  languages?: ('en' | 'hi')[];           // max 10
  consultationDurationMinutes?: number;  // 5–180
  bufferMinutes?: number }               // 0–120
```

**`GET /v1/me/doctor/registration`** · doctor · 200 → `RegistrationView`
```ts
{ fullName: string; dateOfBirth: string | null;      // "YYYY-MM-DD"
  gender: Gender | null; email: string | null;
  identity: { idType: string; idTypeName: string | null; numberLast4: string } | null;
  qualifications: { id: uuid; degree: string; specialty: string | null;
                    institution: string; university: string; year: number;
                    documentId: uuid | null }[];
  experience: { id: uuid; position: string; institution: string;
                startMonth: string;                  // "YYYY-MM"
                endMonth: string | null; isCurrent: boolean; documentId: uuid | null }[];
  totalExperienceYears: number;   // derived, overlaps merged
  editable: boolean }             // false once verified
```
**The ID number is never returned** — only its last four digits.

**`PUT /v1/me/doctor/registration`** · doctor · 200 → `RegistrationView`
```ts
// request — every field optional, but each LIST is a REPLACE
{ fullName?: string;                        // max 160
  dateOfBirth?: string;                     // "YYYY-MM-DD"
  gender?: 'male' | 'female' | 'other' | 'undisclosed';
  email?: string;                           // unique across doctors
  identity?: { idType: 'aadhaar' | 'passport' | 'driving_licence' | 'voter_id' | 'other';
               idTypeName?: string;         // required when idType is 'other'
               idNumber: string };
  qualifications?: { degree: string; specialty?: string; institution: string;
                     university: string; year: number /* 1950..now */;
                     documentId?: uuid }[];      // max 20
  experience?: { position: string; institution: string;
                 startMonth: string;            // "YYYY-MM"
                 endMonth?: string;             // omit when isCurrent
                 isCurrent?: boolean; documentId?: uuid }[] }   // max 30
```
Sending a list replaces it whole — a resubmission is a new statement of the
same facts, and merging row by row would leave a corrected degree beside the
one an admin rejected. Omit a list to leave it untouched.

`yearsOfExperience` is **derived server-side** from the dated rows with overlaps
merged, and cannot be set. `registrationNumber` is absent on purpose: a provider
stating their own medical council number is the one claim verification exists to
check — it stays on `PATCH /v1/admin/doctors/:doctorId` (8.3).

Errors: `REGISTRATION_LOCKED` (409, the account is verified — changes go through
the Coracure team), `INVALID_EXPERIENCE_RANGE` (400, a post that is both current
and finished, or ends before it starts), `DOCTOR_ALREADY_EXISTS` (409, that email
is on another account).

**`GET /v1/me/doctor/credentials`** · doctor · 200 → `VerificationProgress`
The whole verification screen: what is required, approved, outstanding and
rejected, plus whether a registration number is still missing.

**`POST /v1/me/doctor/credentials/upload-url`** · doctor · 201
```ts
// request
{ documentType: DoctorDocumentType;
  fileName: string;                      // max 255
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/heic' | 'image/webp' }
// response
{ storageKey: string; upload: { url: string; expiresInSeconds: number } }
```

**`POST /v1/me/doctor/credentials`** · doctor · 201 → `CredentialSummary`
```ts
{ documentType: DoctorDocumentType; fileName: string; storageKey: string }
```
The **first** credential moves the account from `pending` to `under_review` —
there is no separate "submit", precisely so it cannot be forgotten.

**`GET /v1/doctor-credentials/:documentId/download-url`** · doctor, admin · 200
```ts
{ url: string; expiresInSeconds: number }
```

### 7.3 The diary — what the pool can book against

**`GET /v1/me/doctor/availability`** · doctor† · 200 → `DiaryRecord`
The weekly pattern, the leave and the date overrides, in one call.

**`PUT /v1/me/doctor/availability/weekly`** · doctor† · 200 → `DiaryRecord`
```ts
// request — REPLACES the whole pattern. Send every window, not a delta.
{ windows: [{ dayOfWeek: number;          // 0 Sunday … 6 Saturday
              startTime: string;          // "HH:MM", 24h local
              endTime: string;
              channels?: ('video' | 'audio')[] }] }   // default both, max 50 windows
```
Errors: `OVERLAPPING_AVAILABILITY`, `INVALID_TIME_RANGE`.

**`POST /v1/me/doctor/availability/blocked`** · doctor† · 201 → `AvailabilityRuleRecord`
```ts
{ date: string;                           // "YYYY-MM-DD"
  startTime?: string; endTime?: string;   // both omitted = the whole day off
  channels?: ('video' | 'audio')[] }
```
Errors: `DATE_IN_THE_PAST`, `INVALID_TIME_RANGE`.

**`POST /v1/me/doctor/availability/custom-hours`** · doctor† · 201 → `AvailabilityRuleRecord`
```ts
{ date: string; startTime: string; endTime: string; channels?: ('video' | 'audio')[] }
```
Different hours for one date. Same errors as above.

**`DELETE /v1/me/doctor/availability/:ruleId`** · doctor† · **204**
A rule that no longer applies is deleted, not deactivated.

**`GET /v1/me/doctor/slots?from=<ISO>&to=<ISO>`** · doctor† · 200
```ts
// SlotRecord[] — what the rules actually add up to, minus what is already booked
[{ startsAt: Date; endsAt: Date; durationMinutes: number }]
```
Both query params are required.

### 7.4 Presence and instant requests

**`GET /v1/me/doctor/presence`** · doctor† · 200 → `PresenceRecord`

**`PUT /v1/me/doctor/presence`** · doctor† · 200 → `PresenceRecord`
```ts
// request — the FOUR a doctor may set
{ presence: 'offline' | 'available_now' | 'paused' | 'scheduled_only' }
```
`request_pending`, `in_consultation` and `completing_notes` are set by the
platform as things happen — a provider who could set those by hand could sit in
`in_consultation` for ever and never be offered anything, which is a way of
hiding while still counting as part of the pool. Trying to set one is
`PRESENCE_NOT_SELF_SETTABLE`. Documentation
outstanding from a previous consultation blocks `available_now` with
`DOCUMENTATION_OUTSTANDING`.

**`GET /v1/me/doctor/instant-requests`** · doctor† · 200 → `OfferRecord[]`
Requests waiting on this doctor right now. Each carries `expiresAt` — show the
countdown.

**`POST /v1/me/doctor/instant-requests/:consultationId/accept`** · doctor† · 201 → `OfferRecord`
No body. Errors: `OFFER_CLOSED`, `OFFER_NOT_FOUND` — the request was
re-routed; refresh the list.

**`POST /v1/me/doctor/instant-requests/:consultationId/decline`** · doctor† · 201
```ts
{ rerouted: boolean }   // whether another provider could be offered it
```

### 7.5 The day's work

**`GET /v1/doctor/consultations`** · doctor† · 200 → `ConsultationRecord[]`
```ts
// query
{ upcoming?: boolean;   // default true
  limit?: number }      // default 50, max 100
```
The doctor's rows carry an extra `doctorContext` block the patient's do not:
risk category, how many past consultations this patient has had with this
doctor, and whether a current teleconsultation consent is on file.

**`GET /v1/doctor/consultations/:consultationId`** · doctor† · 200 → `ConsultationRecord`

**`GET /v1/patients/:patientId/card`** · doctor · 200 → `PatientCard`
```ts
{ id: uuid; fullName: string | null; initials: string | null;
  age: number | null; gender: Gender; preferredLanguage: string }
```
Refused unless a consultation ties this doctor to this patient — that gate is
what makes naming them safe. The mobile number, date of birth and region stay
out: a name is what a consultation needs, contact details are not.

**Changed 30 Sep 2026 (DR-04).** This returned initials only, per FR-9.2. A
clinician treating somebody addresses them by name — the alternative was a
doctor reading "AS" back to a patient on a video call. Lists and safety alerts
still lead with initials.

**`GET /v1/doctor/patients/:patientId/files`** · doctor† · 200 → `PatientFileRecord[]`
```ts
// query
{ category?: PatientFileCategory; consultationId?: uuid }
```

**`GET /v1/doctor/files/:fileId/download-url`** · doctor† · 200
```ts
{ url: string; expiresInSeconds: number; sizeBytes: number | null }
```

**`POST /v1/doctor/report-requests`** · doctor† · 201 → `ReportRequestRecord`
```ts
{ consultationId: uuid;
  title: string;                                                  // max 160, the actual ask
  category: 'prescription' | 'lab' | 'history' | 'other';
  reason?: string }                                               // max 2000
```
This is what appears in the patient's 6.11 list.

**`POST /v1/doctor/report-requests/:requestId/cancel`** · doctor† · 201 → `ReportRequestRecord`

The video calls in 6.12 are shared — the same three endpoints serve both parties.

**`POST /v1/doctor/consultations/:consultationId/no-show`** · doctor† · 201 → `ConsultationRecord`
No body. Marks that the patient did not attend.

**`POST /v1/doctor/consultations/:consultationId/cancel`** · doctor† · 201 → `ConsultationRecord`
```ts
{ reason?: string }   // max 200
```

### 7.6 Writing the case up — the gate on everything else

**`GET /v1/doctor/pending-documentation`** · doctor† · 200 → `PendingDocumentation[]`
Consultations held and not written up. While this is non-empty the doctor
cannot go `available_now`.

**`PUT /v1/doctor/consultations/:consultationId/clinical-record`** · doctor† · 200 → `ClinicalRecordView`
```ts
// request — a full replace of the draft, not a patch
{ chiefComplaint: string;                    // required, max 2000
  riskCategory: 'low' | 'moderate' | 'high'; // required
  clinicalHistory?: string;                  // max 5000
  diagnosis?: string;                        // max 2000
  isDiagnosisProvisional?: boolean;
  referralNote?: string;                     // max 255
  medicines?: [{ id?: uuid; name: string; dose: string; frequency: string;
                 duration: string; instructions?: string; genericName?: string;
                 route?: string; quantity?: string }];   // max 30 lines
  adviceCovered?: string;                    // max 5000
  adviceHomePractice?: string;               // max 5000
  adviceNextFocus?: string;                  // max 5000
  adviceWarningSigns?: string;               // max 5000
  caseSummary?: string;                      // max 2000
  recommendedContentIds?: uuid[] }           // max 20, Care Hub item ids
```
Errors: `ONLY_DOCTORS_PRESCRIBE` — a non-prescribing service cannot send
`medicines`. The response's `outstanding[]` is the live checklist of what still
blocks finalising.

**`GET /v1/doctor/consultations/:consultationId/clinical-record`** · doctor† · 200 → `ClinicalRecordView`
The record so far, with `outstanding[]` and `canPrescribe`.

**`POST /v1/doctor/consultations/:consultationId/clinical-record/finalise`** · doctor† · 201 → `ClinicalRecordView`
No body. Completes the case, renders the prescription PDF and opens the
patient's care record (6.13). Errors: `CASE_SUMMARY_MISSING`,
`CASE_SUMMARY_TOO_SHORT`, `CASE_SUMMARY_TOO_LONG`,
`PRESCRIPTION_OR_ADVICE_MISSING`, `ADVICE_MISSING` — the same codes that were
already visible in `outstanding[]`, so the button should have been disabled.

### 7.7 Follow-up and safety

**`GET /v1/doctor/followup-pathways`** · doctor† · 200 → `PathwayRecord[]` (current versions only)

**`POST /v1/doctor/consultations/:consultationId/followup`** · doctor† · 201 → `FollowupPlan`
```ts
{ pathwayCode: string;        // max 60, from the list above
  startsOn?: string;          // "YYYY-MM-DD", default today
  extraQuestions?: CheckinQuestion[] }   // appended to the pathway's own
```

**`GET /v1/doctor/consultations/:consultationId/followup-plan`** · doctor† · 200 → `FollowupPlan`

**`POST /v1/doctor/consultations/:consultationId/followup/cancel`** · doctor† · 201 → `FollowupPlan`
No body. Stops the daily check-ins early.

**`GET /v1/doctor/consultations/:consultationId/checkins`** · doctor† · 200
```ts
[{ checkinDate: Date; status: 'green' | 'amber' | 'red'; answers: unknown; submittedAt: Date }]
```

**`GET /v1/doctor/safety-alerts`** · doctor† · 200 → `AlertRecord[]`
```ts
// query
{ openOnly?: boolean; alertType?: SafetyAlertType; limit?: number /* 1–200 */ }
```

**`GET /v1/doctor/safety-alerts/:alertId`** · doctor† · 200 → `AlertRecord`

**`POST /v1/doctor/safety-alerts/:alertId/acknowledge`** · doctor† · 201 → `AlertRecord`
No body. Takes responsibility for the alert.

**`POST /v1/doctor/safety-alerts/:alertId/close`** · doctor† · 201 → `AlertRecord`
```ts
{ closingNote: string }   // required, max 2000 — what was actually done
```

### 7.8 Second opinions — the clarification board

Cases are **de-identified**: the backend strips phone numbers, emails, Aadhaar
numbers, URLs and long digit strings, and refuses the write if it cannot.

**`GET /v1/doctor/clarification-cases?openOnly=<bool>`** · doctor† · 200 → `AuthorCaseView[]`

**`POST /v1/doctor/clarification-cases`** · doctor† · 201 → `AuthorCaseView`
```ts
{ title: string;                               // max 200
  topic?: string;                              // max 120
  patientAge?: number;                         // 0–120
  patientGender?: Gender;
  briefHistory: string;                        // required, max 4000
  diagnosis?: string;                          // max 2000
  currentPlan?: string;                        // max 2000
  specificDoubt: string;                       // required, max 2000
  urgency?: 'routine' | 'soon' | 'urgent';     // default 'routine'
  sourceConsultationId?: uuid }
```
Created as a `draft`. Errors: `IDENTIFIERS_PRESENT` with the offending fields
in `details`.

**`GET /v1/doctor/clarification-cases/:caseId`** · doctor† · 200 → `AuthorCaseView`

**`PATCH /v1/doctor/clarification-cases/:caseId`** · doctor† · 200 → `AuthorCaseView`
Same body as create. A draft only.

**`POST /v1/doctor/clarification-cases/:caseId/post`** · doctor† · 201 → `AuthorCaseView`
No body. Submits it for an expert; an admin then assigns one (8.9).

**`POST /v1/doctor/clarification-cases/:caseId/reply`** · doctor† · 201 → `AuthorCaseView`
```ts
{ body: string }   // max 4000 — answers the expert, or adds context
```

**`POST /v1/doctor/clarification-cases/:caseId/reviewed`** · doctor† · 201 → `AuthorCaseView`
No body. Records that the advice was read and weighed.

**`POST /v1/doctor/clarification-cases/:caseId/close`** · doctor† · 201 → `AuthorCaseView`

Expert side, for doctors whose seniority is `expert`:

**`GET /v1/doctor/expert-reviews?openOnly=<bool>`** · doctor† · 200 → `ExpertCaseView[]`
Cases shared with me. `openOnly` defaults to **true** here.

**`GET /v1/doctor/expert-reviews/:caseId`** · doctor† · 200 → `ExpertCaseView`
No `sourceConsultationId`, no author — the expert sees the case, not the patient.

**`POST /v1/doctor/expert-reviews/:caseId/reply`** · doctor† · 201 → `ExpertCaseView`
```ts
{ messageType: 'comment' | 'clinical_consideration' | 'clarification_request' | 'followup_recommendation';
  body: string }   // max 4000
```
`clarification_request` moves the case back to the author.

### 7.9 Earnings

**`GET /v1/doctor/payouts`** · doctor† · 200
```ts
// Payout[] joined to the consultation each line is for
[{ consultationFee: number; platformDeduction: number; doctorEarning: number;
   status: 'pending' | 'paid'; paidAt: Date | null }]
```

**`GET /v1/doctor/consultations/:consultationId/payout`** · doctor† · 200 → `Payout`

### 7.10 Shared with the patient app

The doctor app also uses, unchanged: `GET /v1/services`, `GET /v1/concerns`,
`GET /v1/regions` (6.4–6.5), the Care Hub (6.6), the video calls (6.12), the
notification inbox (6.15), and `GET|POST /v1/legal/consents*` (6.3) for the
doctor agreement.
---

## 8. Admin panel — every endpoint, in flow order

Every route here is `@Roles('admin')` **and** asserts a permission level in the
handler. The level is named on each entry; `super_admin` passes all of them.

### 8.1 Sign in

**`POST /v1/auth/admin/sign-in`** · public · **200**
```ts
// request
{ email: string; password: string }   // password 1–200
// response — a union, branch on `status`
{ status: 'complete'; accessToken: string; refreshToken: string; expiresIn: number }
| { status: 'two_factor_required'; mfaToken: string }
```

**`POST /v1/auth/admin/two-factor`** · public · **200**
```ts
// request
{ mfaToken: string; code: string }
// response: TokenPair
{ accessToken: string; refreshToken: string; expiresIn: number }
```

**`POST /v1/auth/admin/accounts`** · admin · `super_admin` · 201
```ts
// request
{ email: string; password: string;          // password min 12 chars
  fullName: string;                          // max 160
  permissionLevel: AdminPermissionLevel;
  is2faEnabled?: boolean }                   // default false
// response
{ id: uuid }
```
There is no admin self sign-up. Who created the account is this call's audit entry.

### 8.2 The dashboard

**`GET /v1/admin/governance/dashboard`** · `operations` | `clinical_governance` | `care_coordinator` · 200 → `QualityDashboard`
```ts
// query
{ from?: string; to?: string }   // ISO dates. Safety counts EVERY open alert
                                 // regardless of the window — an unclosed red
                                 // flag from last month is still open today.
```

**`GET /v1/admin/governance/pending-case-summaries`** · `operations` | `clinical_governance` · 200 → `QueueItem[]`
```ts
// query
{ limit?: number }   // 1–200
```

**`GET /v1/admin/governance/provider-quality`** · `operations` | `clinical_governance` · 200 → `ProviderQuality[]`

**`GET /v1/admin/governance/allocation-decisions`** · `operations` | `clinical_governance` · 200
```ts
// query
{ consultationId?: uuid; limit?: number }
// response — read out of the audit log, because that is the only place it exists
[{ consultationId: uuid; at: Date; actorType: string; basis: unknown }]
```

**`GET /v1/admin/governance/export/:kind`** · `operations` | `clinical_governance` · 200
`:kind` is `consultations` | `complaints` | `feedback` | `safety-alerts`.
Returns **`text/csv; charset=utf-8`**, not JSON. Flat rows, nothing aggregated.
Complaint bodies and message threads are deliberately excluded.

### 8.3 Providers

**`POST /v1/admin/doctors`** · `operations` · 201 → `DoctorAccount`
```ts
{ mobileNumber: string;                       // E.164, the sign-in identifier
  fullName: string;                           // max 160
  specialtyId?: uuid;
  qualification?: string;                     // max 255
  registrationNumber?: string;                // max 80
  yearsOfExperience?: number;                 // 0–70
  languages?: ('en' | 'hi')[];
  payoutFeeInr?: number;                      // 2dp
  consultationDurationMinutes?: number;       // 5–180
  bufferMinutes?: number;                     // 0–120
  bio?: string }                              // max 4000
```

**`GET /v1/admin/doctors`** · `operations` | `clinical_governance` | `care_coordinator` · 200 → `DoctorAccount[]`
```ts
// query
{ specialtyId?: uuid; language?: 'en' | 'hi'; regionId?: uuid;
  seniorityLevel?: 'standard' | 'expert';
  verificationStatus?: DoctorVerificationStatus;
  isListed?: boolean; search?: string;        // max 120
  sort?: 'experience_desc' | 'name';
  limit?: number;                             // default 20, max 100
  offset?: number }                           // default 0
```

**`GET /v1/admin/doctors/:doctorId`** · `operations` | `clinical_governance` | `care_coordinator` · 200 → `DoctorAccount`

**`PATCH /v1/admin/doctors/:doctorId`** · `operations` · 200 → `DoctorAccount`
```ts
{ fullName?; bio?; languages?; qualification?; registrationNumber?;
  yearsOfExperience?; specialtyId?; payoutFeeInr?;
  consultationDurationMinutes?; bufferMinutes?;
  allowInstantConsult?: boolean; bankVerified?: boolean }
```

**`GET /v1/admin/doctors/:doctorId/reliability`** · `operations` | `clinical_governance` · 200 → `DoctorReliability`

Verification, in the order the panel walks it:

**`GET /v1/admin/doctors/credential-queue`** · `clinical_governance` | `operations` · 200
```ts
// CredentialSummary[] with the doctor attached, oldest first
[{ id: uuid; documentType: DoctorDocumentType; fileName: string;
   reviewStatus: 'pending' | 'approved' | 'rejected'; rejectionReason: string | null;
   verifiedByAdminId: uuid | null; verifiedAt: Date | null; uploadedAt: Date;
   doctorId: uuid; doctorName: string }]
```

**`GET /v1/admin/doctors/:doctorId/credentials`** · `clinical_governance` | `operations` · 200 → `VerificationProgress`

**`POST /v1/admin/doctors/credentials/:documentId/review`** · `clinical_governance` | `operations` · 201 → `CredentialSummary`
```ts
{ approved: boolean;
  rejectionReason?: string }   // max 255, required in practice when approved is false
```
One credential at a time — there is no bulk approve.

**`POST /v1/admin/doctors/:doctorId/verify`** · `clinical_governance` · 201 → `VerificationProgress`
No body. Step 4 of 5; refused unless `readyForVerification` is true.

**`POST /v1/admin/doctors/:doctorId/reject`** · `clinical_governance` · 201 → `VerificationProgress`
```ts
{ reason: string }   // required, max 255
```

**`POST /v1/admin/doctors/:doctorId/reopen`** · `clinical_governance` · 201 → `VerificationProgress`

**`PATCH /v1/admin/doctors/:doctorId/listing`** · `operations` · 200 → `DoctorAccount`
```ts
{ isListed: boolean }
```
Step 5 of 5. Listing an unverified doctor is refused.

**`PATCH /v1/admin/doctors/:doctorId/seniority`** · `clinical_governance` · 200 → `DoctorAccount`
```ts
{ seniorityLevel: 'standard' | 'expert' }
```
`expert` is what makes a doctor assignable to a clarification case.

**`GET /v1/admin/doctors/:doctorId/regions`** · `operations` | `clinical_governance` | `care_coordinator` · 200
```ts
uuid[]   // region ids
```

**`PATCH /v1/admin/doctors/:doctorId/regions`** · `operations` · 200
```ts
// request
{ regionIds: uuid[] }   // max 100, replaces the whole set
// response
uuid[]
```

**`POST /v1/admin/doctors/:doctorId/suspend`** · `operations` · **200** → `DoctorAccount`
```ts
{ reason: string }   // required, max 255
```

**`POST /v1/admin/doctors/:doctorId/reinstate`** · `operations` · **200** → `DoctorAccount`

### 8.4 A provider's diary

**`GET /v1/admin/doctors/:doctorId/availability`** · `operations` | `care_coordinator` · 200 → `DiaryRecord`

**`PUT /v1/admin/doctors/:doctorId/availability/weekly`** · `operations` | `care_coordinator` · 200 → `DiaryRecord`
Same body as 7.3.

**`POST /v1/admin/doctors/:doctorId/availability/blocked`** · `operations` | `care_coordinator` · 201 → `AvailabilityRuleRecord`
Same body as 7.3. This is how a provider is taken out of the pool for a day.

**`POST /v1/admin/doctors/:doctorId/availability/custom-hours`** · `operations` | `care_coordinator` · 201 → `AvailabilityRuleRecord`

**`DELETE /v1/admin/doctors/:doctorId/availability/:ruleId`** · `operations` | `care_coordinator` · **204**

**`GET /v1/admin/doctors/:doctorId/slots?from=<ISO>&to=<ISO>`** · `operations` | `care_coordinator` · 200 → `SlotRecord[]`

**`GET /v1/admin/availability/remaining`** · `operations` | `care_coordinator` | `clinical_governance` · 200
```ts
// query — `at` is required
{ at: string; specialtyId?: uuid; language?: 'en' | 'hi'; regionId?: uuid }
// response
[{ doctorId: uuid; fullName: string; availableMinutes: number;
   requiredMinutes: number; assignable: boolean }]
```
Who could actually take a booking at that moment, and why the rest could not.

### 8.5 Consultations and instant routing

**`GET /v1/admin/consultations/:consultationId`** · `operations` | `care_coordinator` | `clinical_governance` · 200 → `ConsultationRecord`

**`POST /v1/admin/consultations/:consultationId/override-provider`** · `operations` | `care_coordinator` · 201 → `ConsultationRecord`
```ts
{ doctorId: uuid; reason: string }   // reason required, max 200
```
**The only endpoint anywhere that names a provider on a booking.** Errors:
`OVERRIDE_NOT_POSSIBLE`.

**`POST /v1/admin/consultations/:consultationId/cancel`** · `operations` | `care_coordinator` · 201 → `ConsultationRecord`
```ts
{ reason?: string }
```

**`GET /v1/admin/instant/consultations/:consultationId/offers`** · `operations` | `care_coordinator` | `clinical_governance` · 200 → `OfferRecord[]`
Who was asked, in what order, and what they said.

**`GET /v1/admin/consultations/:consultationId/clinical-record`** · admin · 200 → `ClinicalRecordView`
For governance review.

**`GET /v1/admin/consultations/:consultationId/video/session`** · admin · 200 → `SessionRecord`
For adjudicating a complaint or a refund.

### 8.6 Money

**`GET /v1/admin/payments/payouts/pending`** · `finance` · 200
```ts
// what the platform still owes providers
[{ consultationId: uuid; doctorId: uuid; consultationFee: number;
   platformDeduction: number; doctorEarning: number; status: 'pending' }]
```

**`POST /v1/admin/payments/:consultationId/refund`** · `finance` · 201 → `PaymentRecord`
```ts
{ amount?: number;   // 2dp, 0.01–99999999. Omitted = full refund
  reason: string }   // required, max 200
```
Errors: `NOT_REFUNDABLE`.

**`POST /v1/admin/payments/:consultationId/payout`** · `finance` · 201 → `Payout`
```ts
{ reference?: string }   // max 120 — the bank reference
```
Records that a provider was paid; it does not move money.

**`GET /v1/admin/payments/export?kind=transactions|refunds`** · `finance` · 200
`kind` defaults to `transactions`. Returns **CSV**, not JSON.

### 8.7 Catalogue

**`GET /v1/admin/specialties`** · `operations` | `content` · 200 → `SpecialtyRecord[]` (including inactive)

**`GET /v1/admin/specialties/:specialtyId`** · 200 → `SpecialtyRecord`
The only place `intakeForm` and `firstConsultForm` are exposed.

**`POST /v1/admin/specialties`** · 201 → `SpecialtyRecord`
```ts
{ code: string;                                 // /^[a-z0-9_]+$/-style slug
  name: string;                                 // max 120
  description?: string;                         // max 2000
  providerType: 'doctor' | 'non_doctor';
  canPrescribe?: boolean;                       // default false — THE prescribing gate
  consultationFeeInr: number;                   // 2dp, what the patient is charged
  intakeForm?: Record<string, unknown>;
  firstConsultForm?: Record<string, unknown>;
  requiredDocuments?: DoctorDocumentType[] }    // max 20
```

**`PATCH /v1/admin/specialties/:specialtyId`** · 200 → `SpecialtyRecord`
Same fields, all optional, plus `isActive?: boolean`.

**`GET /v1/admin/concerns`** · 200 → `ConcernRecord[]` (including disabled)

**`POST /v1/admin/concerns`** · 201 → `ConcernRecord`
```ts
{ specialtyId: uuid; code: string; name: string;
  matchPhrases?: string[];   // max 200 phrases, each max 120 — what search matches on
  matchWeight?: number }     // 1–100, default 1
```

**`PATCH /v1/admin/concerns/:concernId`** · 200 → `ConcernRecord`
Same fields optional, plus `isActive?: boolean`.

**`GET /v1/admin/regions`** · 200 → `RegionRecord[]` (including inactive)
**`POST /v1/admin/regions`** · 201 → `RegionRecord` — `{ code: string; name: string }`
**`PATCH /v1/admin/regions/:regionId`** · 200 → `RegionRecord` — `{ code?; name?; isActive? }`

**`GET /v1/admin/allocation-policy`** · 200
```ts
{ regionRelaxable: boolean;
  tieBreak: 'fewest_upcoming' | 'least_recently_assigned' | 'longest_free';
  maxPatientDeclines: number }
```

**`PATCH /v1/admin/allocation-policy`** · 200 → the same shape
```ts
{ regionRelaxable?: boolean; tieBreak?: TieBreak; maxPatientDeclines?: number }  // 0–10
```
This is the rulebook `NO_PROVIDER_AVAILABLE` and `DECLINE_LIMIT_REACHED` come out of.

### 8.8 Search configuration

**`GET /v1/admin/search/config`** · `content` | `clinical_governance` · 200
```ts
{ crisisKeywords: string[]; synonyms: Record<string, string[]>;
  popular: string[]; emergencyGuidance: EmergencyGuidance; disclaimer: string }
```

**`PATCH /v1/admin/search/crisis-keywords`** · `clinical_governance` · 200
```ts
// request
{ keywords: string[] }   // max 1000, each min 2 chars
// response
{ keywords: string[] }
```
Matched as whole phrases on word boundaries, so `die` never fires on `diet`.

**`PATCH /v1/admin/search/emergency-guidance`** · `clinical_governance` · 200 → `EmergencyGuidance`
```ts
{ title: string;                   // max 200
  message: string;                 // max 2000
  helplines: [{ name: string; number: string; available?: string }];   // 1–20
  footer?: string }                // max 500
```
Every number must be confirmed before launch: a helpline that has changed
number is worse than no helpline at all.

**`PATCH /v1/admin/search/synonyms`** · `content` | `clinical_governance` · 200
```ts
{ synonyms: Record<string, string[]> }   // request and response
```

**`PATCH /v1/admin/search/popular-searches`** · `content` · 200
```ts
{ popular: string[] }   // max 50. Request and response.
```

**`PATCH /v1/admin/search/disclaimer`** · `content` | `clinical_governance` · 200
```ts
{ disclaimer: string }   // max 600. Request and response.
```

### 8.9 Care Hub authoring

**`GET /v1/admin/care-hub/items`** · `content` | `clinical_governance` · 200 → `AdminContentItem[]`
```ts
// query
{ itemType?: ContentItemType; reviewStatus?: ContentReviewStatus }
```

**`GET /v1/admin/care-hub/items/:id`** · 200 → `AdminContentItem`

**`POST /v1/admin/care-hub/items`** · 201 → `AdminContentItem`
```ts
{ itemType: ContentItemType;
  slug: string;                       // kebab-case, max 160, unique
  title: string;                      // max 200
  summary?: string;                   // max 400
  body: Record<string, unknown>;      // structured document
  concernId?: uuid; specialtyId?: uuid;
  coverStorageKey?: string;           // max 1024
  isVerifiedOrg?: boolean;
  sortOrder?: number }                // −32768…32767
```

**`PATCH /v1/admin/care-hub/items/:id`** · 200 → `AdminContentItem`
**`POST /v1/admin/care-hub/items/:id/submit`** · 201 → `AdminContentItem` (draft → `in_clinical_review`)
**`POST /v1/admin/care-hub/items/:id/publish`** · `clinical_governance` · 201 → `AdminContentItem`
**`POST /v1/admin/care-hub/items/:id/archive`** · 201 → `AdminContentItem`
Clinical sign-off is a separate permission from authoring, on purpose.

### 8.10 Follow-up pathways and the safety queue

**`GET /v1/admin/followup-pathways`** · `clinical_governance` · 200 → `PathwayRecord[]` (every version, newest first)

**`POST /v1/admin/followup-pathways/:code`** · `clinical_governance` · 201 → `PathwayRecord`
`:code` matches `/^[a-z0-9_]{2,60}$/`.
```ts
{ name: string;             // max 120
  durationDays: number;     // 1–365
  questions: CheckinQuestion[];   // 1–20, see section 10
  redFlagRules: RedFlagRule[] }
```
Publishing writes a **new version**; running plans keep the version they started on.

**`GET /v1/admin/safety-alerts`** · `clinical_governance` | `operations` · 200 → `AlertRecord[]`
```ts
// query
{ openOnly?: boolean; alertType?: SafetyAlertType; limit?: number }
```

**`GET /v1/admin/safety-alerts/:alertId`** · 200 → `AlertRecord`
**`POST /v1/admin/safety-alerts/:alertId/acknowledge`** · 201 → `AlertRecord`
**`POST /v1/admin/safety-alerts/:alertId/close`** · 201 → `AlertRecord` — `{ closingNote: string }`

### 8.11 Complaints and feedback

**`GET /v1/admin/complaints`** · `care_coordinator` | `operations` · 200 → `AdminComplaintView[]`
```ts
// query
{ status?: ComplaintStatus; category?: ComplaintCategory;
  unassignedOnly?: boolean; limit?: number /* 1–200 */ }
```

**`GET /v1/admin/complaints/:complaintId`** · 200 → `AdminComplaintView`
The **full** thread, internal notes included.

**`POST /v1/admin/complaints/:complaintId/assign`** · 201 → `AdminComplaintView`
```ts
{ assignToAdminId: uuid }
```

**`POST /v1/admin/complaints/:complaintId/reply`** · 201 → `AdminComplaintView`
```ts
{ body: string;               // max 4000
  isInternal?: boolean }      // default false. true = a note on the file the patient never sees
```

**`POST /v1/admin/complaints/:complaintId/close`** · 201 → `AdminComplaintView`
```ts
{ outcome: 'resolved' | 'rejected';
  resolutionNote: string }    // required, max 4000
```

**`GET /v1/admin/feedback`** · `clinical_governance` | `operations` · 200 → `FeedbackSummary[]`
```ts
// query
{ doctorId?: uuid; maxRating?: number /* 1–5 */; limit?: number }
```
`maxRating` is how the low-rating review queue is built.

### 8.12 Clarification cases — assigning an expert

**`GET /v1/admin/clarification-cases`** · admin · 200 → `AuthorCaseView[]`
Posted and unassigned, urgent first then longest waiting. This is the queue.

**`GET /v1/admin/clarification-cases/experts?excludeDoctorId=<uuid>`** · admin · 200
```ts
// EligibleExpert[] — verified doctors at `expert` seniority, with what each already holds
[{ id: uuid; fullName: string; specialtyId: uuid | null; openCases: number }]
```
`excludeDoctorId` is optional; pass the case's author so they cannot be asked to
review their own case. Being on this list grants no visibility of anything —
only an assignment does.

**`POST /v1/admin/clarification-cases/:caseId/assign`** · admin · 201 → `AuthorCaseView`
```ts
{ expertDoctorId: uuid }
```
The assignment is the **only** thing that grants visibility. Re-assigning moves
the case; the previous expert loses sight of it at once.

**`POST /v1/admin/clarification-cases/:caseId/close`** · admin · 201 → `AuthorCaseView`
No body.

### 8.13 Legal and erasure

**`POST /v1/admin/legal/documents`** · `super_admin` · 201 → `LegalDocument`
```ts
{ documentType: LegalDocumentType;
  version: string;      // client-set, e.g. "1.0" or "2026-08", max 20
  title: string;        // max 200
  body: string }
```
A published version is **never** edited — a change is a new row, so a consent
can always show exactly what was agreed. Publishing flips every patient's
consent status for that type back to false (6.3).

**`GET /v1/admin/legal/documents/:documentType/versions`** · 200 → `LegalDocumentSummary[]`

**`GET /v1/admin/deletion-requests?status=<DeletionStatus>`** · `operations` · 200 → `DeletionRequest[]`

**`POST /v1/admin/deletion-requests/:id/review`** · `operations` · 201 → `DeletionRequest`
```ts
{ status: 'in_review' | 'approved' | 'rejected';
  note?: string }   // max 2000
```
`approved` **authorises** the erasure; it does not delete anything.

**`POST /v1/admin/compliance/deletion-requests/:requestId/execute`** · `super_admin` · 201
```ts
{ requestId: uuid;
  outcome: { deleted: Record<string, number>;      // table → rows removed
             retained: Record<string, string>;     // table → why it had to stay
             failure?: string } }
```
This is the call that actually erases.

**`GET /v1/admin/compliance/patients/:patientId/data-export`** · `super_admin` · 200 → `SubjectAccessExport`

### 8.14 The audit trail

**`GET /v1/admin/compliance/audit`** · `super_admin` · 200 → `AuditEntryView[]`
```ts
// query — every field optional
{ actorType?: string; actorId?: string; entityType?: string; entityId?: string;
  consultationId?: string; action?: AuditAction;
  from?: string; to?: string;    // ISO
  limit?: number }               // 1–1000
```

**`GET /v1/admin/compliance/audit/export`** · `super_admin` · 200
Same query. Returns **CSV**.

**`GET /v1/admin/compliance/audit/consultation/:consultationId`** · `super_admin` · 200 → `AuditEntryView[]`
Everything that ever touched one consultation, in order.

**`GET /v1/admin/compliance/retention`** · `super_admin` · 200
```ts
{ retentionDays: number }
```

**`POST /v1/admin/compliance/retention/apply`** · `super_admin` · 201
```ts
{ deleted: number }
```

### 8.15 Notification copy

**`GET /v1/admin/notification-templates`** · `content` | `clinical_governance` · 200 → `TemplateRecord[]`
**`GET /v1/admin/notification-templates/:code`** · 200 → `TemplateRecord`

**`PATCH /v1/admin/notification-templates/:code`** · 200 → `TemplateRecord`
```ts
{ title: string;   // 1–200
  body: string }   // 1–2000
```
Checked against the forbidden-terms list: **no copy may name a diagnosis**.
Placeholders not declared on the template are rejected.

**`POST /v1/admin/notification-templates/:code/reset`** · 201 → `TemplateRecord`
Puts a template back to the wording that shipped.

### 8.16 Platform configuration

**`GET /v1/admin/config`** · admin · 200 → `ConfigEntry[]`
Every configurable value, and whether **this** admin may change it.

**`PUT /v1/admin/config/:key`** · admin · 200 → `ConfigEntry`
```ts
{ value: unknown }
```
The shape is checked against the schema the owning module registered — a number
for a fee percentage, a boolean for a switch, an array for a keyword list.
Errors: `CONFIG_INVALID`, `CONFIG_MISSING`.

---

## 9. Not called by any app

**`POST /v1/payments/webhook`** · public · **200** — gateway to server only.
Verifies an HMAC over the exact raw bytes (`x-razorpay-signature`). This, not
the client, is what marks a consultation paid. Returns `{ handled: boolean }`.

**`POST /v1/video/webhook`** · public · **200** — LiveKit to server only. Signed
over a hash of the raw body. Writes the join/leave records behind `SessionRecord`.
Returns `{ handled: boolean }`.

**`GET /v1/health`** · public · 200 — liveness, checks no dependency.
```ts
{ status: 'ok'; uptimeSeconds: number; timestamp: string }
```

**`GET /v1/health/ready`** · public · 200 — readiness; 503 `DATABASE_UNAVAILABLE` if the database does not answer.
```ts
{ status: 'ok'; database: 'up'; timestamp: string }
```
---

## 10. Response shapes

Every `→ Shape` in sections 6 to 9 resolves here. `Date` is an ISO-8601 string
on the wire. These are the backend's own interfaces, so regenerating
`schema.d.ts` (section 13) is what keeps them honest.

### Identity and profile

```ts
interface TokenPair { accessToken: string; refreshToken: string; expiresIn: number /* seconds */ }

interface OwnProfile {
  id: uuid; fullName: string | null;
  dateOfBirth: string | null;   // "YYYY-MM-DD"
  age: number | null;           // derived on every read, never stored
  gender: Gender; preferredLanguage: string;
  regionId: uuid | null; mobileNumber: string;
  status: 'pending' | 'active' | 'suspended' | 'deleted';
  isComplete: boolean;          // false until both name and date of birth are set
}

interface PatientCard { id: uuid; initials: string | null; age: number | null;
                        gender: Gender; preferredLanguage: string }
```

### Catalogue

```ts
interface ServiceListing { id: uuid; code: string; name: string; description: string | null;
                           consultationFeeInr: number; providerType: 'doctor' | 'non_doctor';
                           canPrescribe: boolean }

interface SpecialtyRecord extends ServiceListing {
  intakeForm: unknown | null; firstConsultForm: unknown | null;
  requiredDocuments: DoctorDocumentType[]; isActive: boolean; createdAt: Date;
}

interface ConcernRecord { id: uuid; specialtyId: uuid; code: string; name: string;
                          matchPhrases: string[]; matchWeight: number; isActive: boolean }

interface RegionRecord { id: uuid; code: string; name: string; isActive: boolean }
```

### Search

```ts
interface ServiceMatch extends ServiceListing {
  concerns: { id: uuid; code: string; name: string }[];
  reason: string;                        // why this service came back
  soonestAvailableAt: Date | null;       // null = nothing inside the horizon
  matchedBy: 'mapping' | 'assistant';
}

interface GuideEntry extends ServiceListing {
  concerns: { id: uuid; code: string; name: string }[];
  soonestAvailableAt: Date | null;
}

interface EmergencyGuidance {
  title: string; message: string;
  helplines: { name: string; number: string; available?: string }[];
  footer?: string;
}
```

### Booking

```ts
interface ConsultationRecord {
  id: uuid;
  referenceCode: string;          // human-quotable, how the patient identifies it
  patientId: uuid;
  status: ConsultationStatus;
  mode: 'scheduled' | 'instant';
  channel: 'video' | 'audio';
  specialtyId: uuid;
  concernId: uuid | null;
  doctorId: uuid | null;          // null while an instant request is still searching
  scheduledStartAt: Date | null;
  durationMinutes: number;
  holdExpiresAt: Date | null;     // set on pending_payment — THE hold, show the countdown
  consultationFeeInr: number | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  intakeAnswers: Record<string, unknown> | null;
  paymentStatus: 'unpaid' | 'paid' | 'not_applicable';
  patient?: {                     // ONLY when a doctor or admin is asking;
    id: uuid;                     // absent on the patient's own read
    fullName: string | null;
    initials: string | null;
    age: number | null;
    gender: Gender;
    preferredLanguage: string;
  };
  doctorContext?: {               // present ONLY on the doctor app's reads
    riskCategory: 'low' | 'moderate' | 'high' | null;
    totalPastConsultationsWithDoctor: number;
    hasCurrentTeleconsultationConsent: boolean;
  };
}
```

### Money

```ts
interface Bill { consultationFee: number; convenienceFeePct: number; convenienceFee: number;
                 subtotal: number; gstPct: number; gstAmount: number; totalPayable: number }

interface PaymentRecord {
  consultationId: uuid;
  status: 'created' | 'pending' | 'paid' | 'failed' | 'refunded';
  bill: Bill; paymentMethod: string | null; paidAt: Date | null; failureReason: string | null;
  refund: { amount: number; reason: string | null; refundedAt: Date | null } | null;
}

interface CheckoutSession { consultationId: uuid; bill: Bill; orderId: string;
                            amountPaise: number; currency: string; publicKey: string }

interface Payout { consultationFee: number; platformDeduction: number; doctorEarning: number;
                   status: 'pending' | 'paid'; paidAt: Date | null }
```

### Files

```ts
interface PatientFileRecord { id: uuid; category: PatientFileCategory; fileName: string;
                              consultationId: uuid | null; reportRequestId: uuid | null;
                              uploadedByDoctorId: uuid | null;   // null = the patient uploaded it
                              createdAt: Date }

interface ReportRequestRecord {
  id: uuid; consultationId: uuid; title: string;
  category: 'prescription' | 'lab' | 'history' | 'other';
  reason: string | null; status: 'open' | 'fulfilled' | 'cancelled'; createdAt: Date;
  fulfilledBy: { id: uuid; fileName: string; createdAt: Date }[];
}
```

### Video

```ts
interface JoinReadiness { consultationId: uuid; serverUrl: string; joinable: boolean;
                          reason?: string; message?: string; opensAt?: Date | null }

interface JoinTicket { consultationId: uuid; roomName: string; serverUrl: string; token: string;
                       identity: string; expiresInSeconds: number;
                       canPublish: boolean; canSubscribe: boolean }

interface SessionRecord {
  consultationId: uuid;
  startedAt: Date | null; endedAt: Date | null; durationSeconds: number;
  patient: PartyAttendance; doctor: PartyAttendance;
  noShowParty: 'patient' | 'doctor' | null;
  connections: { party: 'patient' | 'doctor'; joinedAt: Date;
                 leftAt: Date | null; disconnectReason: string | null }[];
}

interface PartyAttendance { attended: boolean; connections: number;
                            firstJoinedAt: Date | null; lastLeftAt: Date | null;
                            connectedSeconds: number; stillConnected: boolean }
```

### Clinical

```ts
interface Medicine { id: uuid; name: string; dose: string; frequency: string; duration: string;
                     instructions?: string | null; genericName?: string | null;
                     route?: string | null; quantity?: string | null }

interface Advice { covered: string | null; homePractice: string | null;
                   nextFocus: string | null; warningSigns: string | null }

// What the DOCTOR sees while writing it up
interface ClinicalRecordView {
  consultationId: uuid; chiefComplaint: string; clinicalHistory: string | null;
  diagnosis: string | null; isDiagnosisProvisional: boolean;
  riskCategory: 'low' | 'moderate' | 'high';
  referralNote: string | null; referralAdvised: boolean;
  medicines: Medicine[]; advice: Advice;
  caseSummary: string | null; recommendedContentIds: uuid[];
  finalisedAt: Date | null; canPrescribe: boolean;
  outstanding: { code: 'CASE_SUMMARY_MISSING' | 'CASE_SUMMARY_TOO_SHORT' | 'CASE_SUMMARY_TOO_LONG'
                     | 'PRESCRIPTION_OR_ADVICE_MISSING' | 'ADVICE_MISSING';
                 message: string }[];
  updatedAt: Date;
}

// What the PATIENT sees after finalise — no case summary, no risk category
interface PatientCareView {
  consultationId: uuid; diagnosis: string | null; isDiagnosisProvisional: boolean;
  medicines: Medicine[]; advice: Advice; referralNote: string | null;
  recommendedContentIds: uuid[]; issuedAt: Date;
}

interface PendingDocumentation { consultationId: uuid; referenceCode: string;
                                 scheduledStartAt: Date | null; status: ConsultationStatus;
                                 startedAt: Date | null; outstanding: Outstanding[] }
```

### Follow-up

```ts
interface CarePlan {                       // the whole after-care screen, one call
  consultationId: uuid;
  care: PatientCareView | null;            // null until the doctor finalises
  followup: FollowupPlan;
  today: TodaysCheckin | null;             // null outside the check-in window
  recommended: ContentSummary[];
  emergencyGuidanceAvailable: boolean;
}

interface FollowupPlan { consultationId: uuid;
                         status: 'none' | 'active' | 'completed' | 'cancelled';
                         pathway: { code: string; name: string; version: number } | null;
                         startsOn: Date | null; endsOn: Date | null;
                         durationDays: number | null; todayIsDay: number | null;
                         extraQuestions: CheckinQuestion[] }

interface TodaysCheckin { consultationId: uuid; checkinDate: Date; day: number; ofDays: number;
                          submitted: boolean;
                          questions: (CheckinQuestion & { addedByDoctor: boolean })[] }

interface CheckinResult { consultationId: uuid; checkinDate: Date; day: number; ofDays: number;
                          status: 'green' | 'amber' | 'red';
                          showEmergencyGuidance: boolean; reasons: string[] }

interface CheckinQuestion { id: string;                       // /^[a-z0-9_]+$/, keys the answer
                            text: string;                     // max 300
                            type: 'single_choice' | 'scale' | 'yes_no' | 'text';
                            options?: { value: string; label: string;
                                        flag?: 'amber' }[];   // max 10. No 'red' here, ever
                            required?: boolean }

interface RedFlagRule { questionId: string; whenAnswerIn: string[];   // 1–10 values
                        category: RedFlagCategory;
                        reason: string }   // max 255, plain words, NEVER a diagnosis

interface PathwayRecord { id: uuid; code: string; name: string; version: number;
                          durationDays: number; questions: CheckinQuestion[];
                          redFlagRules: RedFlagRule[]; isCurrent: boolean; createdAt: Date }

interface AlertRecord {
  id: uuid; alertType: SafetyAlertType; consultationId: uuid;
  patientId: uuid; patientInitials: string | null; patientName: string | null;
  patientAge: number | null; patientGender: Gender;
  checkinResponseId: uuid | null; reason: string | null;
  state: 'open' | 'acknowledged' | 'closed';
  acknowledgedAt: Date | null;
  acknowledgedBy: { type: 'admin' | 'doctor'; id: uuid } | null;
  closedAt: Date | null; closingNote: string | null; createdAt: Date;
}
```

### Care Hub

```ts
interface PublicContentItem { id: uuid; itemType: ContentItemType; slug: string; title: string;
                              summary: string | null; concernId: uuid | null;
                              specialtyId: uuid | null; coverStorageKey: string | null;
                              isVerifiedOrg: boolean | null; sortOrder: number }

interface PublicContentDetail extends PublicContentItem { body: unknown }

interface AdminContentItem extends PublicContentDetail {
  reviewStatus: ContentReviewStatus; reviewedByAdminId: uuid | null;
  reviewedAt: Date | null; createdAt: Date; updatedAt: Date;
}

interface ContentSummary { id: uuid; slug: string; itemType: string;
                           title: string; summary: string | null }
```

### Support

```ts
interface FeedbackRecord { consultationId: uuid; rating: number | null; comment: string | null }

interface ComplaintMessage { authorId: string; authorRole: 'patient' | 'admin';
                             body: string; isInternal: boolean; at: string /* ISO */ }

interface PatientComplaintView {
  id: uuid; referenceCode: string; category: ComplaintCategory;
  subject: string; description: string; status: ComplaintStatus;
  consultationId: uuid | null;
  messages: ComplaintMessage[];        // internal notes stripped for the patient
  resolvedAt: Date | null; resolutionNote: string | null;
  createdAt: Date; updatedAt: Date;
}

interface AdminComplaintView extends PatientComplaintView { patientId: uuid;
                                                            assignedToAdminId: uuid | null }

interface FeedbackSummary { consultationId: uuid; referenceCode: string; doctorId: uuid | null;
                            rating: number; comment: string | null; consultedAt: Date | null }
```

### Notifications

```ts
interface NotificationRecord { id: string; templateCode: string; title: string; body: string;
                               deepLinkData: unknown; consultationId: uuid | null;
                               status: 'queued' | 'sent' | 'failed';
                               createdAt: Date; readAt: Date | null }

interface TemplateRecord { code: string; title: string; body: string; description: string;
                           audience: ('patient' | 'doctor' | 'admin')[];
                           placeholders: string[]; isDefault: boolean }
```

### Providers

```ts
interface DoctorListing {            // what a PATIENT may see of their assigned provider
  id: uuid; fullName: string; qualification: string | null; registrationNumber: string | null;
  yearsOfExperience: number | null; languages: string[]; bio: string | null;
  specialtyId: uuid | null; consultationFeeInr: number | null; consultationDurationMinutes: number;
  seniorityLevel: 'standard' | 'expert'; presence: DoctorPresence;
  allowInstantConsult: boolean; bankVerified: boolean; photoUrl: string | null;
  canPrescribe: boolean;
}

interface DoctorSelfProfile extends DoctorListing {   // what the DOCTOR sees of themselves
  mobileNumber: string; verificationStatus: DoctorVerificationStatus;
  isListed: boolean; bufferMinutes: number; isBookable: boolean;
}

interface DoctorAccount {            // what an ADMIN sees — everything
  id: uuid; fullName: string; mobileNumber: string; mobileVerifiedAt: Date | null;
  bio: string | null; languages: string[]; verificationStatus: DoctorVerificationStatus;
  registrationNumber: string | null; qualification: string | null; yearsOfExperience: number | null;
  verifiedByAdminId: uuid | null; verifiedAt: Date | null;
  seniorityLevel: 'standard' | 'expert'; specialtyId: uuid | null; payoutFeeInr: number;
  consultationDurationMinutes: number; bufferMinutes: number;
  isListed: boolean; allowInstantConsult: boolean; bankVerified: boolean;
  presence: DoctorPresence;
  isBlockedByCompletionGate: boolean;   // documentation outstanding
  photoUrl: string | null; createdAt: Date;
}

interface DoctorReliability { acceptanceRate: number | null; noShowRate: number | null;
                              caseSummaryCompletion: number | null; consultationsCompleted: number }

interface CredentialSummary { id: uuid; documentType: DoctorDocumentType; fileName: string;
                              reviewStatus: 'pending' | 'approved' | 'rejected';
                              rejectionReason: string | null; verifiedByAdminId: uuid | null;
                              verifiedAt: Date | null; uploadedAt: Date }

interface VerificationProgress {
  doctorId: uuid; status: DoctorVerificationStatus;
  required: DoctorDocumentType[]; approved: DoctorDocumentType[];
  outstanding: DoctorDocumentType[]; rejected: DoctorDocumentType[];
  registrationNumberRequired: boolean; registrationNumberMissing: boolean;
  readyForVerification: boolean;           // what gates POST /verify
  documents: CredentialSummary[];
}

interface PresenceRecord { doctorId: uuid; presence: DoctorPresence; canReceiveInstant: boolean;
                           blockedByConsultationId: uuid | null; allowInstantConsult: boolean }

interface OfferRecord {
  id: uuid; consultationId: uuid; patientId: uuid;
  patientInitials: string | null; patientAge: number | null; patientGender: Gender;
  specialtyName: string; concernName: string | null; preferredLanguage: string;
  paymentStatus: 'unpaid' | 'paid' | 'not_applicable';
  doctorId: uuid; attemptNumber: number;
  outcome: 'pending' | 'accepted' | 'declined' | 'timed_out' | 'superseded';
  offeredAt: Date; expiresAt: Date;
}
```

### Scheduling

```ts
interface AvailabilityRuleRecord { id: uuid; dayOfWeek: number | null; date: string | null;
                                   startTime: string | null; endTime: string | null;
                                   channels: ('video' | 'audio')[] }

interface DiaryRecord { doctorId: uuid; timeZone: string;
                        consultationDurationMinutes: number; bufferMinutes: number;
                        weekly: AvailabilityRuleRecord[];
                        blocked: AvailabilityRuleRecord[];
                        customHours: AvailabilityRuleRecord[] }

interface SlotRecord { startsAt: Date; endsAt: Date; durationMinutes: number }

interface RemainingAvailability { doctorId: uuid; availableMinutes: number;
                                  requiredMinutes: number; assignable: boolean }
```

### Clarification

```ts
interface CaseMessage { authorId: string; authorRole: 'treating_doctor' | 'expert';
                        messageType: 'comment' | 'clinical_consideration' | 'clarification_request'
                                   | 'followup_recommendation' | 'author_reply';
                        body: string; at: string /* ISO */ }

interface ExpertCaseView {          // what the EXPERT sees — de-identified
  id: uuid; title: string; topic: string | null;
  patientAge: number | null; patientGender: Gender | null;
  briefHistory: string; diagnosis: string | null; currentPlan: string | null;
  specificDoubt: string; urgency: 'routine' | 'soon' | 'urgent';
  status: ClarificationStatus; assignedAt: Date | null;
  messages: CaseMessage[]; attachmentIds: uuid[]; createdAt: Date;
}

interface AuthorCaseView extends ExpertCaseView {    // what the AUTHOR additionally sees
  sourceConsultationId: uuid | null; expertDoctorId: uuid | null;
  postedAt: Date | null; closedAt: Date | null;
}

interface EligibleExpert { id: uuid; fullName: string; specialtyId: uuid | null; openCases: number }
```

### Legal and compliance

```ts
interface AcceptedConsent { documentType: LegalDocumentType; legalDocumentId: uuid;
                            version: string; acceptedAt: Date }

interface DeletionRequest { id: uuid; patientId: uuid; status: DeletionStatus;
                            reason: string | null; reviewedByAdminId: uuid | null;
                            reviewedAt: Date | null; reviewNote: string | null;
                            executionOutcome: unknown | null; executedAt: Date | null;
                            createdAt: Date }

interface SubjectAccessExport {
  generatedAt: Date;
  subject: { patientId: uuid; mobileNumber: string; fullName: string | null;
             dateOfBirth: Date | null; gender: string; preferredLanguage: string;
             accountCreated: Date };
  consents: unknown[]; consultations: unknown[]; clinicalRecords: unknown[];
  payments: unknown[]; files: unknown[];
  followUp: { plans: unknown[]; checkins: unknown[] };
  complaints: unknown[]; notifications: unknown[];
  notIncluded: Record<string, string>;     // what is withheld, and why
}

interface AuditEntryView { id: string; actorType: string; actorId: string | null;
                           action: AuditAction; entityType: string; entityId: string;
                           consultationId: string | null; metadata: unknown;
                           ipAddress: string | null; createdAt: Date }
```

### Governance and configuration

```ts
interface QualityDashboard {
  from: Date | null; to: Date;
  consultations: { completed: number; cancelled: number; noShow: number;
                   awaitingDocumentation: number };
  safety: { openRedFlags: number; openAmber: number; openMissedCheckins: number; openTotal: number };
  followUp: { active: number; completed: number; checkinsSubmitted: number };
  complaints: { open: number; inProgress: number; resolved: number; rejected: number };
  clarifications: { awaitingAssignment: number; withAnExpert: number; closed: number };
}

interface QueueItem { consultationId: uuid; referenceCode: string; doctorId: uuid | null;
                      patientId: uuid; since: Date; detail?: string }

interface ProviderQuality { doctorId: uuid; fullName: string; acceptanceRate: number | null;
                            noShowRate: number | null; caseSummaryCompletion: number | null;
                            consultationsCompleted: number }

interface ConfigEntry { key: string; description: string | null; value: unknown;
                        editable: boolean;            // by THIS admin's permission level
                        managedBy: string | null; updatedAt: Date | null }
```

---

## 11. Enumerations

Frozen contract. Branch on these; do not parse display text.

| Enum | Values |
| --- | --- |
| `Gender` | `male`, `female`, `other`, `undisclosed` |
| `AccountStatus` | `pending`, `active`, `suspended`, `deleted` |
| `AdminPermissionLevel` | `super_admin`, `operations`, `clinical_governance`, `care_coordinator`, `finance`, `content` |
| `ConsultationStatus` | `pending_payment`, `scheduled`, `awaiting_doctor`, `in_progress`, `awaiting_documentation`, `completed`, `cancelled`, `no_show`, `expired` |
| `ConsultationMode` | `scheduled`, `instant` |
| `ConsultationChannel` | `video`, `audio` |
| `PaymentStatus` (on `PaymentRecord`) | `created`, `pending`, `paid`, `failed`, `refunded` |
| `PaymentStatus` (on `ConsultationRecord`) | `unpaid`, `paid`, `not_applicable` |
| `DoctorVerificationStatus` | `pending`, `under_review`, `verified`, `rejected`, `suspended` |
| `DoctorSeniority` | `standard`, `expert` |
| `DoctorPresence` | `offline`, `available_now`, `request_pending`, `in_consultation`, `completing_notes`, `paused`, `scheduled_only` (a doctor may set `offline`, `available_now`, `paused`, `scheduled_only`; the other three are the platform's) |
| `DoctorDocumentType` | `degree_certificate`, `registration_certificate`, `identity_proof`, `address_proof`, `experience_letter`, `profile_photo`, `signature`, `other` |
| `DocumentReviewStatus` | `pending`, `approved`, `rejected` |
| `PatientFileCategory` | `medical_history`, `report`, `photo`, `prescription_pdf`, `clarification_attachment` (only the first three are uploadable) |
| `ReportRequestStatus` | `open`, `fulfilled`, `cancelled` |
| `ReportRequestCategory` | `prescription`, `lab`, `history`, `other` |
| `RiskCategory` | `low`, `moderate`, `high` |
| `FollowupStatus` | `none`, `active`, `completed`, `cancelled` |
| `CheckinStatus` | `green`, `amber`, `red` |
| `SafetyAlertType` | `red_flag`, `amber`, `missed_checkin`, `medication_side_effect`, `followup_due` |
| `ComplaintStatus` | `open`, `in_progress`, `resolved`, `rejected` |
| `ComplaintCategory` | `consultation_quality`, `doctor_conduct`, `technical_issue`, `payment_issue`, `other` |
| `ContentItemType` | `self_help_tool`, `education_module`, `blog_article`, `caregiver_guide`, `emergency_guidance` |
| `ContentReviewStatus` | `draft`, `in_clinical_review`, `published`, `archived` |
| `ClarificationStatus` | `draft`, `posted`, `awaiting_response`, `response_received`, `clarification_asked`, `reviewed`, `closed` |
| `ClarificationUrgency` | `routine`, `soon`, `urgent` |
| `InstantConsultancyOutcome` | `pending`, `accepted`, `declined`, `timed_out`, `superseded` |
| `NotificationStatus` | `queued`, `sent`, `failed` |
| `LegalDocumentType` | `teleconsultation_consent`, `privacy_policy`, `terms_of_use`, `refund_policy`, `reconsult_policy`, `doctor_agreement` |
| `DeletionStatus` | `requested`, `in_review`, `approved`, `rejected`, `executed`, `failed` |
| `AuditAction` | `create`, `read`, `update`, `delete`, `export`, `login`, `verify`, `webhook` |
| `AvailabilityRuleType` | `weekly`, `blocked`, `custom_hours` |
| `ProviderType` | `doctor`, `non_doctor` |
| `TieBreak` | `fewest_upcoming`, `least_recently_assigned`, `longest_free` |
| Languages | `en`, `hi` |
| Upload content types | `application/pdf`, `image/jpeg`, `image/png`, `image/heic`, `image/webp` |
---

## 12. Gaps — what a screen needs that the inventory above does not have

| Gap | Blocks | Detail |
| --- | --- | --- |
| G-1 | Slot picker (PT-07-01) | No patient-facing slot lookup. `slots` exists only on `me/doctor` (a provider's own diary, 7.3) and on the admin controller (8.4). The patient books a service with a freely chosen `startsAt` and learns it is uncoverable from a `NO_PROVIDER_AVAILABLE` refusal. Either design the picker around that refusal, or get `GET /v1/services/:id/slots` added first. **Decide before building the booking screen.** |
| G-4 | Intake (PT-11-03) | The ANSWERS ride on the booking body — `BookScheduledDto` and `RequestInstantDto` both accept `intakeAnswers?: Record<string, unknown>` (6.7, 6.9), snapshotted onto the consultation. What is missing is a way to read the FORM: `intakeForm` lives on the specialty record and is exposed only on `GET /v1/admin/specialties/:id` (8.7), so the patient app cannot render the questions it is expected to answer. |

G-5 is **closed**: `GET /v1/doctors/:doctorId` (6.7) resolves the `doctorId` on
a booking to the assigned provider's `DoctorListing`, refused unless that
provider is assigned to the caller. There is still no list or search form of it,
which is the rule the gap was really about.

Doctor-app gaps G-2 (`availability/remaining` is admin-scoped — see 8.4) and
G-3 (no provider-facing feedback read; `GET /v1/admin/feedback` in 8.11 is
admin-only) are listed in `docs/USER_STORIES.md`.

---

## 13. Keeping this current

```bash
npx openapi-typescript http://localhost:3000/docs-json -o libs/api/src/schema.d.ts
```

Commit the result and re-run on every backend change; TypeScript then reports
what broke.

Sections 6 to 11 were written from the controllers and services in
`apps/backend/coracure_backend/src` — 217 routes across 23 controllers. The
handlers carry `@ApiOperation` but no `@ApiResponse` types, so the generated
OpenAPI document describes the **requests** accurately and leaves the
**responses** empty: section 10 is where the response contract actually lives
until those decorators exist. Regenerate `schema.d.ts` for request shapes;
re-read section 10 against the service return types when a module changes.
