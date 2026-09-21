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

## 5. Patient app endpoint inventory

Paths shown from the version segment. Full stories in `docs/USER_STORIES.md`.

**Auth** — `POST /v1/auth/patient/otp/request`, `.../verify`, `POST /v1/auth/refresh`, `POST /v1/auth/sign-out`

**Profile** — `GET|PATCH /v1/me/profile`

**Consent and legal** — `GET /v1/legal/documents`, `GET /v1/legal/documents/:documentType`, `GET /v1/legal/consents/me/status`, `POST /v1/legal/consents`, `GET /v1/legal/consents/me`

**Catalogue** — `GET /v1/services`, `GET /v1/concerns`, `GET /v1/regions`

**Search** — `POST /v1/search`, `GET /v1/search/guide`, `GET /v1/search/suggestions`

**Booking** — `GET /v1/me/consultations`, `GET /v1/me/consultations/:id`, `POST /v1/me/consultations` (service + `startsAt`), `POST /v1/me/consultations/instant`, `POST /v1/me/consultations/:id/decline-provider`, `.../reschedule`, `.../cancel`, `GET /v1/me/consultations/:id/instant-status`

**Payments** — `POST /v1/me/consultations/:id/checkout`, `GET /v1/me/consultations/:id/bill`

**Video** — `GET /v1/consultations/:id/video/readiness`, `POST /v1/consultations/:id/video/token`, `GET /v1/consultations/:id/video/session`

**Files** — `GET /v1/me/files`, `POST /v1/me/files/upload-url`, `GET /v1/me/files/:fileId/download-url`, `DELETE /v1/me/files/:fileId`, `GET /v1/me/files/requests/open`

**Clinical record** — `GET /v1/me/consultations/:id/care-record`

**Follow-up and care plan** — `GET /v1/me/consultations/:id/care-plan`, `GET|POST /v1/me/consultations/:id/checkin`, `GET /v1/me/consultations/:id/checkins`

**Care Hub** — `GET /v1/care-hub/items`, `GET /v1/care-hub/items/:slug`, `GET /v1/care-hub/emergency`

**Feedback and complaints** — `PUT|GET /v1/me/consultations/:id/feedback`, `GET|POST /v1/me/complaints`, `GET /v1/me/complaints/:id`, `POST /v1/me/complaints/:id/reply`

**Notifications** — `GET /v1/me/notifications`, `GET /v1/me/notifications/unread-count`, `POST /v1/me/notifications/:id/read`, `POST /v1/me/notifications/read-all`

**Data rights** — `POST|GET /v1/me/deletion-requests`, `GET /v1/me/data-export`

---

## 6. Gaps — endpoints the patient app needs that do not exist yet

| Gap | Blocks | Detail |
| --- | --- | --- |
| G-1 | Slot picker (PT-07-01) | No patient-facing slot lookup. `slots` exists only on `me/doctor` (a provider's own diary) and on the admin controller. The patient books a service with a freely chosen `startsAt` and learns it is uncoverable from a `NO_PROVIDER_AVAILABLE` refusal. Either design the picker around that refusal, or get `GET /v1/services/:id/slots` added first. **Decide before building the booking screen.** |
| G-4 | Intake (PT-11-03) | Specialty intake form and answers have no dedicated patient endpoint in the shipped controllers. Confirm whether they ride on the booking body. **Partly answered:** `BookScheduledDto` and `RequestInstantDto` both accept `intakeAnswers?: Record<string, unknown>`, which is snapshotted onto the booking — so the ANSWERS ride on the booking body. What is still missing is a way to read the FORM: `intakeForm` lives on the specialty record and is only exposed on the admin controller, so the patient app cannot render the questions it is expected to answer. |
| G-5 | Provider identity on a booking | `GET /me/consultations` returns `doctorId`, but there is no patient-facing endpoint that resolves it to a name — deliberately, since the patient never chooses a provider. The patient app therefore identifies a consultation by its SERVICE and reference code. Worth confirming this is intended before a screen tries to show "your doctor". |

Doctor-app gaps G-2 (`availability/remaining` is admin-scoped) and G-3 (no
provider-facing feedback read) are listed in `docs/USER_STORIES.md`.

---

## 7. Keeping this current

```bash
npx openapi-typescript http://localhost:3000/docs-json -o libs/api/src/schema.d.ts
```

Commit the result and re-run on every backend change; TypeScript then reports
what broke. Update this document only when a **rule** changes — shapes are the
schema's job, not prose's.
