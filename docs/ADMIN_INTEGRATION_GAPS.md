# Admin Panel: Backend Integration Gap List

Written before integration starts. It compares **the admin panel as it is now** (the fixture build that follows `docs/ADMIN_PANEL_REQUIREMENTS.md`) against **the backend as it is now** (`apps/backend/coracure_backend`: controllers under `src/**/*.controller.ts`, models in `prisma/schema.prisma`).

Nothing here has been changed. This file only lists what is missing, so we can agree the order before writing integration code.

Legend
- **READY**: an endpoint exists and the data fits the screen. Integration is mostly a body swap in `api/*.ts`.
- **PARTIAL**: an endpoint exists but a field, filter, status or shape differs from the screen. Needs a mapping, a small backend change, or a decision.
- **MISSING**: the backend has no endpoint or no table. The screen cannot work live until the backend adds it.
- **FRONT**: work that is only on the admin side (no backend change).

---

## 1. Summary

Counts are approximate (rows are grouped differently in section 2); read section 2 for the truth.

| Area | READY | PARTIAL | MISSING |
| --- | --- | --- | --- |
| Sign-in, session | 1 | 1 | 0 |
| Dashboard | 0 | 1 | 0 |
| Healthcare Providers | 3 | 6 | 3 |
| Patients | 0 | 1 | 7 |
| Consultations (appointments, case records, clarifications, follow-ups) | 3 | 4 | 4 |
| Lab Services | 0 | 0 | 8 (whole module, currently hidden) |
| Analytics | 0 | 1 | 5 |
| Finances | 0 | 2 | 2 |
| Support | 3 | 2 | 3 |
| Admin (users, roles, master data, settings) | 5 | 4 | 5 |

**The five biggest blockers** (they stop whole sections from working):
1. **No admin patients API at all.** No list, search, profile, edit or suspend (this is the old gap A-1).
2. **No admin list endpoints** for consultations, payments, refunds, payouts history, follow-ups or notifications. Every list screen needs one.
3. **The whole Lab Services module does not exist** in the backend (no tables, no endpoints).
4. **No admin user management** (list, edit, activate, deactivate, change role) and **roles are a fixed enum**, not configurable.
5. **Support Tickets do not exist**. The backend has patient complaints only.

---

## 2. Screen by screen

### 2.1 Sign-in and session
| Admin screen | Backend | Status | Gap |
| --- | --- | --- | --- |
| Sign-in, 2FA, refresh, sign-out (`app/SignIn.tsx`, `api/http.ts`) | `POST /auth/admin/sign-in`, `/auth/admin/two-factor`, `/auth/refresh`, `/auth/sign-out` | READY | The real client already exists in `api/http.ts`. The fixture sign-in in `mock/auth.ts` and the "View as (demo only)" role switcher must be removed. |
| Permission levels | `AdminPermissionLevel`: super_admin, operations, clinical_governance, care_coordinator, finance, content | PARTIAL | The panel added `lab` and `analytics`. The backend enum has neither. Also the spec names (Verification Admin, Support Admin, Lab Admin, Analytics User) need a mapping decision (section 5, Q1). |

### 2.2 Dashboard
| Card group | Backend | Status | Gap |
| --- | --- | --- | --- |
| All six bands | `GET /admin/governance/dashboard` returns only consultations (completed, cancelled, no-show, awaiting documentation), safety, follow-up, complaints, clarifications | PARTIAL | Missing for the spec cards: provider counts by status, patient totals / new / returning, appointment requests / today / upcoming, lab figures, finance figures, support-ticket counts. Needs either one new summary endpoint or the list endpoints below. The 7-day chart has no source either. |

### 2.3 Healthcare Providers
| Admin screen | Backend | Status | Gap |
| --- | --- | --- | --- |
| Doctors list | `GET /admin/doctors` (filters: verificationStatus, isListed, search, language, region, seniority, sort) | PARTIAL | Missing filters: specialty, super-specialty, account status, availability. Missing fields on the row: provider ID code (`PRV-0001`), registration **council**, **rating**, total consultations (only on `/reliability`), availability status (only `presence`). No pagination parameters seen. |
| Specialists, Super-specialists, Paramedical, Veterinary | `Specialty.providerType` is only `doctor` or `non_doctor` | MISSING | There is no medical / super / paramedical / veterinary category and **no veterinary at all**. Super-specialty is free text on the doctor (`superSpecialisation`), not a list. |
| Specialty master data (add, edit, activate, deactivate, reorder) | `GET/POST /admin/specialties`, `PATCH /admin/specialties/:id`, same for concerns and regions | PARTIAL | Add, edit and activate / deactivate exist. **No reorder** (no sort column). No separate super-specialty list. |
| Provider profile: basic, identity, qualifications, experience, registration number | `GET /admin/doctors/:id` | READY | Fields exist (DOB, gender, email, languages, ID type and number, basic / PG / super / fellowship, `DoctorExperience` with a certificate link). Confirm the response masks the ID number. |
| Registration council | none | MISSING | No column. |
| Digital signature: preview, approve, request replacement | document type `signature`, `POST /admin/doctors/credentials/:documentId/review`, `GET /doctor-credentials/:id/download-url` | PARTIAL | Approve = approve the document, request replacement = reject with a reason. There is no separate signature status. Preview uses the signed download URL (needs real storage, old gap A-5). |
| Consultation settings (fee, days, time windows) | `consultationFeeInr` on doctor; `GET/PUT /admin/doctors/:id/availability...` | READY | Multiple windows per day are supported by the weekly rules. |
| Account status Active / Inactive / Suspended | `isListed` plus `verificationStatus = suspended` | PARTIAL | The panel derives it. There is no real account-status field. |
| Verification statuses | pending, under_review, verified, rejected, suspended | PARTIAL | **No "Changes Required"** status and no endpoint for it. The panel added it. |
| Verification actions | `verify`, `reject`, `reopen`, `suspend`, `reinstate` | PARTIAL | Approve = verify, Reject, Suspend exist. **Suspend is operations-only**; the spec wants the verification admin to suspend too. |
| Verification list (all providers by status) | `GET /admin/doctors/credential-queue` | PARTIAL | The queue returns only providers with documents waiting. The panel now lists every provider in six statuses, so it needs `GET /admin/doctors?verificationStatus=` plus a pending-document count and submitted date per provider. |
| Create provider | `POST /admin/doctors` | READY | Check the DTO against `ProviderCreate` (field names, document list). |
| Doctor availability | `GET/PUT/POST/DELETE /admin/doctors/:id/availability...`, `/slots`, `/availability/remaining` | READY | |

### 2.4 Patients
| Admin screen | Backend | Status | Gap |
| --- | --- | --- | --- |
| Patient list, search, filters | none | MISSING | No `admin/patients` controller. |
| Patient profile (overview, address) | none | MISSING | Also a shape difference: backend has `addressLine`, `pinCode`, `regionId`, lat / long, but no separate city, district or state. The panel shows those. |
| Edit patient, suspend | none | MISSING | |
| Consultations tab | none | MISSING | No "consultations of patient X" for admin. |
| Prescriptions / Care Plans | `GET /admin/consultations/:id/clinical-record` | PARTIAL | Works per consultation only; needs the patient to consultation list first. |
| Reports & documents | files module is patient and doctor only | MISSING | No admin read of patient files. |
| Follow-ups tab | none per patient | MISSING | |
| Payments tab | none | MISSING | |
| Support tab | `GET /admin/complaints` | MISSING | No filter by patient. |

### 2.5 Services: Consultations
| Admin screen | Backend | Status | Gap |
| --- | --- | --- | --- |
| Appointments list | none (only `GET /admin/consultations/:id`) | MISSING | Needs `GET /admin/consultations?status=&from=&to=&doctorId=&search=` (old gap A-2). |
| Appointment detail, override provider, cancel, offers, video session | `GET .../:id`, `POST .../override-provider`, `POST .../cancel`, `GET /admin/instant/consultations/:id/offers`, `GET .../video/session` | READY | |
| Appointment statuses (8 in the spec) | 9 backend statuses | PARTIAL | Requested = pending_payment, Allocated = awaiting_doctor, Upcoming / Accepted = scheduled (**backend cannot tell them apart**), Rescheduled = has `rescheduledFromConsultationId`. The panel guesses Accepted / Upcoming / Rescheduled from the id; that must go. |
| Admin reschedule | none | MISSING | Cancel and rebook only (old gap A-3). |
| Consultation duration (start and end) | `durationMinutes` (planned) only | MISSING | No actual start or end time is recorded, so §47 and the duration analytics have no data. |
| Case Record, doctor structure | `GET /admin/consultations/:id/clinical-record` (chief complaint, history, diagnosis plus provisional flag, medicines, advice x4, case summary, recommended content) | PARTIAL | **No Observations field.** **No History of Allergies** (it lives on the patient). Diagnosis is one field. |
| Case Record, non-doctor structure | same table | MISSING | No Presenting Concern, Assessment, Recommendations / Interventions, Precautions fields. Today the same advice fields are reused. |
| Case Summary "auto-generated" | `caseSummary` column; `GET /admin/governance/pending-case-summaries` | PARTIAL | The backend queue lists only pending summaries. There is no "all summaries" list and no generated / failed state. |
| Case Documents | `PatientFile.consultationId` | MISSING | No admin endpoint. The grouping (imaging, discharge, referral and so on) is not a backend category either (`PatientFileCategory`). |
| Clarification thread inside a case | `ClarificationCase` | PARTIAL | The backend clarification is a **doctor asking an expert**, de-identified. It is not an admin-to-provider thread on a case. The panel's new Clarifications screen shows patient names and case references, which the backend deliberately does not. See Q4. |
| Clarifications list and expert assignment | `GET /admin/clarification-cases`, `GET .../experts`, `POST .../assign`, `POST .../close` | READY | Statuses differ (draft, posted, awaiting_response, response_received, clarification_asked, reviewed, closed vs New / Awaiting / Responded / Closed): needs a mapping. |
| Follow-ups list | none | MISSING | Only `followupStatus` per consultation (none, active, completed, cancelled). The spec's six statuses (patient response pending, provider review pending, reviewed, consultation recommended) are not modelled. |
| Safety alerts | `GET /admin/safety-alerts`, `acknowledge`, `close` | READY | |
| Allocation decisions | `GET /admin/governance/allocation-decisions` | READY | |
| Chat window on appointment detail | none for admin | MISSING | Chat is patient and doctor only. Remove the button or add a read-only endpoint (privacy decision). |

### 2.4b Lab Services (hidden in the panel)
| Admin screen | Backend | Status |
| --- | --- | --- |
| Lab Orders, Lab Partners, Individual Lab Tests (CoraCure Test ID), Lab Test Packages, Allocation Settings, Lab Reports, collection and recollection, PIN serviceability, prescription-based matching, lab payments and refunds | No models, no endpoints. The `Payment` model is consultation-only. | MISSING (all eight) |

The only reusable piece is `GET /pincode/:code` (region lookup). The whole module (schema, first-acceptance allocation, partner portal or API, payments) is a backend project of its own. The panel keeps it behind `LAB_SERVICES_ENABLED = false`.

### 2.5 Analytics
| Admin screen | Backend | Status | Gap |
| --- | --- | --- | --- |
| Provider Analytics | `GET /admin/governance/provider-quality` | PARTIAL | Acceptance, no-show, summary completion and completed count. Missing: offered, response time, ratings, complaints per provider. |
| Overview, Consultation, Patient, Lab, Financial | none | MISSING | There is no analytics endpoint. `GET /admin/governance/export/:kind` returns CSV for consultations, complaints, feedback and safety-alerts only. Age, gender and location distribution, repeat patients, duration, revenue trend and so on all need new endpoints. |
| Filters (date range, category, specialty, service type) | none | MISSING | |

### 2.6 Finances
| Admin screen | Backend | Status | Gap |
| --- | --- | --- | --- |
| Patient Payments | none for admin (`me/payments` is the patient's) | MISSING | Needs an admin list with status, service type and date filters. |
| Provider Payouts | `GET /admin/payments/payouts/pending`, `POST /admin/payments/:consultationId/payout` | PARTIAL | Pending and record-as-paid exist. **No history of paid payouts.** The spec's **platform commission and net payout** do not exist: the backend pays the doctor the full consultation fee ("deduction is always zero"); the platform earns a convenience fee from the patient. Business decision, Q5. |
| Refunds | `POST /admin/payments/:consultationId/refund` | MISSING (list) | Refund is a single immediate action stored on `Payment`. There is no refunds list, no request, initiated, completed workflow, no rejection. Lab refunds do not exist. |
| Export | `GET /admin/payments/export` appears in `ADMIN_PANEL_USER_FLOW.md` | MISSING | Not in the controller code. |

### 2.7 Support
| Admin screen | Backend | Status | Gap |
| --- | --- | --- | --- |
| Support Tickets (statuses, categories, priority) | none | MISSING | Only `Complaint` (open, in_progress, resolved, rejected; categories consultation_quality, doctor_conduct, technical_issue, payment_issue, other). No priority, no "awaiting user response", cannot be raised by a provider or lab. Decide: extend Complaint or add Tickets (Q6). |
| Complaints | `GET /admin/complaints`, detail, `assign`, `reply`, `close` | READY | |
| Feedback | `GET /admin/feedback` | PARTIAL | Patient post-consultation feedback only. Provider, lab-service and app feedback do not exist. |
| Notification templates | `GET/PATCH /admin/notification-templates`, `POST .../:code/reset` | READY | Check that the template codes cover the spec's eleven types. |
| Manual send and delivery history | none | MISSING | The panel has a Send notification screen and History; the backend has no admin send and no delivery listing (old gap A-6). |
| Channel configuration (push, SMS, email, in-app) | none | MISSING | |
| Header bell and inbox | `GET /me/notifications`, `unread-count`, `read`, `read-all` (admin allowed) | READY | |

### 2.8 Admin
| Admin screen | Backend | Status | Gap |
| --- | --- | --- | --- |
| Users: list, edit, activate, deactivate, change role | only `POST /auth/admin/accounts` and `PATCH /auth/admin/accounts/:id/two-factor` | MISSING | The `Admin` table already has status and level, so the schema is ready; endpoints are not (old gap A-4). |
| Roles & Permissions (configurable matrix) | none | MISSING | Permissions are hard-coded `assertPermission(...)` calls. A configurable matrix needs a permissions table and a rewrite of every guard. Today it is a fixed six-value enum. |
| Master data: specialties, concerns, regions | catalogue endpoints | PARTIAL | See 2.3. |
| Master data: languages, consultation types, ticket categories, document types | none | MISSING | Languages are a code enum (`LANGUAGES`). Document types are a Postgres enum, partly per specialty (`requiredDocuments`). |
| Admin Settings: business rules, fee rules, service availability, notification configuration | `GET /admin/config`, `PUT /admin/config/:key` | PARTIAL | Only registered keys can be set: `booking.slot_hold_minutes`, `booking.hold_minutes`, `booking.consult_reminder_lead_minutes`, `booking.unattended_grace_minutes`, `payments.convenience_fee_pct`, `payments.gst_pct`, `instant.acceptance_window_seconds`, `followup.*`, `compliance.*`, `notifications.*`, `search.*`, `support.contact`. The panel's invented keys (cancellation window, reschedule limit, commission %, payout cycle, service availability switches, provider fee range) have no backend key. |
| Audit log | `GET /admin/compliance/audit` (+ export, per consultation) | READY | |
| Deletion requests | `GET /admin/deletion-requests`, `POST .../:id/review`, `POST /admin/compliance/deletion-requests/:id/execute` | READY | |
| Retention and data export | `GET /admin/compliance/retention`, `POST .../retention/apply`, `GET .../patients/:id/data-export` | READY | |
| App Settings: languages, feature switches, content, labels, maintenance | none | MISSING | Needs config keys (or a settings document) and the apps reading them. |
| Care Hub | `GET/POST/PATCH /admin/care-hub/items`, `submit`, `publish`, `archive` | PARTIAL | Shape differs: panel has a cover image as a data URL, a YouTube URL, helplines, website, structured body blocks. Backend has `coverStorageKey` (needs an upload step), a JSON `body`, no video column (can go in the body JSON). Confirm the body block schema matches. |
| Follow-up pathways | `GET /admin/followup-pathways`, `POST .../:code` | READY | |
| Website Settings (content, contact, links) | `support.contact` config only | MISSING | No public website config. Contact details could use `support.contact`; the rest has no home. |
| Legal documents | `POST /admin/legal/documents`, `GET .../:type/versions` | PARTIAL | Types: teleconsultation_consent, privacy_policy, terms_of_use, refund_policy, reconsult_policy, doctor_agreement. No "Contact Us" document type. |
| Search and crisis config (hidden in panel) | `GET /admin/search/config`, `PATCH` x5 | READY | Currently hidden by request. |

---

## 3. Backend work the panel needs (grouped, with a suggested priority)

**P0: unblocks core operations**
1. `GET /admin/consultations` with filters and paging, and each row carrying patient name, provider, specialty, status, scheduled time, payment status.
2. Admin patients: `GET /admin/patients` (search, status, paging), `GET /admin/patients/:id` (profile, address, consultations, follow-ups, files metadata, payments, complaints), `PATCH` (edit, suspend).
3. Admin user management: `GET /admin/accounts`, `PATCH /admin/accounts/:id` (name, level, status), `POST .../deactivate|activate`.
4. Provider fields and filters: registration council, rating, total consultations, availability, provider code, specialty / super-specialty / account-status filters on `GET /admin/doctors`; a **Changes Required** verification state and endpoint; let the verification level suspend.
5. Dashboard summary endpoint covering the spec cards that exist today (providers, patients, appointments, finance, complaints).
6. Record actual consultation start and end times.

**P1: spec screens that need new data**
7. Finance lists: admin payments list, payouts history, refunds list with a request, initiated, completed workflow (and rejection).
8. Follow-up list endpoint and the spec's six follow-up statuses.
9. Case record: observations, allergy history, a non-doctor structure (presenting concern, assessment, recommendations, precautions); an admin read of case documents; an "all case summaries" list.
10. Support Tickets (or an extended Complaint with priority, provider and lab requesters, "awaiting user response"); provider, lab and app feedback.
11. Notifications: admin manual send, delivery history, channel switches.
12. Analytics endpoints (overview, consultation, provider, patient, financial) with the four filters.
13. Provider categories (medical, super, paramedical, veterinary) and a specialty sort order for reordering.

**P2: configurable platform**
14. Configurable roles and permissions (table plus guard rewrite), and role names agreed with the spec.
15. App Settings and Website Settings storage (config keys or a settings document), plus the apps reading them.
16. Registered config keys for the business rules the panel shows (or remove the fields).
17. Master lists for languages, consultation types, ticket categories.

**P3: separate project**
18. Lab Services module (schema, endpoints, allocation, collection, reports, payments, refunds, analytics).

---

## 4. Work that is only on the admin side

- Replace the fixtures with `request()` calls, one `api/*.ts` file at a time (`api/admin.ts` keeps the same function names, so screens do not change). Remove `mock/auth.ts` sign-in and the "View as" switcher.
- Generate types from the running backend: `npx openapi-typescript http://localhost:3000/docs-json -o libs/api/src/schema.d.ts` (rule from `CLAUDE.md`). Branch on `error.code`, never on `message`. Never spread a form object into a request body (the backend rejects unknown fields).
- Remove or rework things the backend contradicts:
  - **Clarifications**: stop showing patient names and case references (the backend de-identifies on purpose). My new Clarifications and Case Record thread screens break this today.
  - **Accepted / Upcoming / Rescheduled** appointment statuses guessed from the id.
  - **Roles & Permissions matrix**: do not present editable permissions the backend will not honour.
  - **Admin chat button** on the appointment detail.
  - **Business rules form keys** that have no backend key.
- Keep `Verification` working against the real list (status filter plus pending counts).
- Pagination: add paging to the list screens once the endpoints define it (today the filters run in the browser).
- Rate and idle handling: `api/http.ts` already does single-flight refresh and a 30 minute idle sign-out; keep it.
- Update the specs that assert fixture data (`Patients.spec`, `Consultations.spec`, `Dashboard.spec`, and the all-sections smoke test) as each screen goes live.

---

## 5. Decisions needed before integration

1. **Role names.** Map the spec roles onto the backend enum? Suggested: Operations Admin = operations, Verification Admin = clinical_governance, Support Admin = care_coordinator, Finance Admin = finance, Content = content, plus new `lab` and `analytics` (or leave those two out until they have screens).
2. **Veterinary and paramedical.** Add a provider category to `Specialty`, or keep `doctor` / `non_doctor` and drop veterinary for now?
3. **Patients.** Build the admin patients controller (recommended), or keep admin consultation-centric and remove the Patients section?
4. **Clarifications.** The backend flow is doctor to expert and de-identified. Is the spec's admin-to-provider thread a new feature, or should the panel show the existing expert flow only?
5. **Commission.** The spec shows platform commission and net payout on provider payouts. The backend pays the full fee and earns a patient-side convenience fee. Which model is real?
6. **Tickets.** Extend Complaint, or add a separate Tickets table (needed for provider and lab requesters)?
7. **Lab Services.** Out of scope until the backend module is planned? (It is hidden now.)
8. **Roles matrix.** Is a configurable permission matrix required now, or is the fixed enum enough for launch?
9. **App and Website Settings.** Who consumes them (patient app, doctor app, a website)? Without a consumer these are just stored values.

---

## 6. Suggested integration order

1. **Foundation:** real sign-in, generated types, remove the demo switcher, wire `VITE_API_URL`, one API file at a time behind the existing facade.
2. **Already READY (no backend work):** providers (create, detail, verify, reject, suspend, regions, seniority, availability), credential review, safety alerts, clarification assignment, allocation decisions, complaints, notification templates, care hub (after shape check), pathways, legal documents, config, audit, deletion requests, retention, notification bell.
3. **After P0 backend items:** appointments, patients, users, dashboard, provider list fields.
4. **After P1:** finances, follow-ups, case record structures, support tickets, manual notifications, analytics.
5. **Later:** roles matrix, app and website settings, lab services.

---

## 7. Master list: in the UI, not in the backend

One flat list of everything the admin panel shows or does that the backend cannot serve today.

**Whole sections**
1. Patients: list, search, filters, profile, address, edit, suspend (no admin patients API).
2. Lab Services (hidden): orders, partners, individual tests, packages, allocation settings, reports, collection, recollection, PIN serviceability, lab payments, lab refunds, lab analytics, lab master data.
3. Support Tickets, with priority and the "Awaiting User Response" status.
4. Analytics: overview, consultation, patient, financial (no endpoints) and the date, category, specialty and service filters.
5. Users: list, add, edit, activate, deactivate, change role.
6. Roles & Permissions: configurable matrix.
7. Website Settings: website content, links, service information.
8. App Settings: languages, feature switches, content, labels, maintenance mode.

**Lists with no list endpoint**
9. Appointments list and its filters.
10. Patient Payments list.
11. Provider payouts history (only pending exists).
12. Refunds list.
13. Follow-ups list.
14. Notification delivery history.
15. All case summaries (backend lists only pending ones).
16. Dashboard cards: provider counts, patient counts, appointment counts, finance, support, and the 7-day chart.

**Provider data and workflow**
17. "Changes Required" verification status and its action.
18. Verification admin allowed to suspend (backend: operations only).
19. Registration council.
20. Rating and total consultations on the provider list.
21. Provider ID code (PRV-0001).
22. Availability status on the list; specialty, super-specialty, account status and availability filters.
23. Provider categories: medical, super-specialty, paramedical, veterinary (backend has only doctor and non-doctor).
24. Veterinary providers and veterinary specialties.
25. Super-specialty as a managed list (it is free text).
26. Reordering specialties.
27. Separate signature status (preview, approve, request replacement).
28. Account status as its own field.

**Consultation and case data**
29. Appointment statuses Accepted, Upcoming and Rescheduled (backend cannot tell them apart).
30. Consultation duration, actual start and end.
31. Admin reschedule.
32. Observations field.
33. History of Allergies on the prescription.
34. Non-doctor case structure: Presenting Concern, Assessment, Recommendations / Interventions, Precautions & Warning Signs.
35. Case Documents grouped by type (imaging, discharge, referral, photographs and so on) and admin access to them.
36. Clarification thread between the admin desk and the provider on a case, with patient names (the backend's clarification is doctor to expert and de-identified).
37. Follow-up statuses: patient response pending, provider review pending, reviewed, follow-up consultation recommended.
38. Admin chat window on an appointment.
39. Patient reports and documents, follow-ups, payments and support tabs on a patient.

**Money**
40. Platform commission and net payout on provider payouts.
41. Refund workflow: requested, initiated, completed, rejected.
42. Admin export of payments.

**Support and notifications**
43. Provider feedback, lab-service feedback, app feedback.
44. Tickets raised by providers and labs.
45. Manual send of a notification to doctors or patients.
46. Channel switches: push, SMS, email, in-app.
47. Notification types beyond the existing templates, if a code is missing (check the eleven in the spec).

**Settings and master data**
48. Business-rule fields with no config key: free cancellation window, reschedules allowed, follow-up window, instant switch, payout cycle, provider fee range, commission %, patient platform fee.
49. Service availability switches (consultations, lab, home collection, paramedical, veterinary).
50. Master lists: languages, consultation types, ticket categories (provider document types are fixed).
51. Contact Us as a legal document type.
52. Roles named Lab Admin, Analytics User, and the spec names for the other roles.

**Care Hub shape**
53. Cover image as an uploaded file (backend wants a storage key), YouTube link field, helplines and website fields.

---

## 8. Re-check against the new backend (HEAD `d102eae`, 8 Oct)

The backend gained 26 commits since section 2 was written. Numbers refer to the master list in section 7.

### Closed (the endpoint now exists)
| # | Gap | What the backend now has |
| --- | --- | --- |
| 9 | Appointments list | `GET /admin/consultations`: filters `status` (repeatable), `mode`, `specialtyId`, `doctorId`, `patientId`, `from`, `to`, `search`; `sort`, `limit` (max 100), `offset`; answers `{ items, total, limit, offset }`. A row carries `paymentStatus`, `refundStatus`, planned duration and actual `startedAt` / `endedAt`. Operations, care_coordinator, clinical_governance. |
| 30 | Actual consultation start and end | `startedAt` and `endedAt` on the consultation (migration `consultation_actual_times`). |
| 1 | Patients: list, search, profile, suspend | `GET /admin/patients` (status, region, search, registered range, sort, paging), `GET /admin/patients/:id`, `POST .../suspend`, `POST .../reinstate`. Opening a patient is audited. |
| 5 | Users | `GET /admin/accounts`, `GET /:id`, `PATCH /:id` (name, level), `POST /:id/deactivate`, `POST /:id/activate`. Super admin only. "Inactive" in the panel = `suspended` here. |
| 16 | Dashboard cards | `GET /admin/dashboard/summary`: providers (total, by status, listed, available now, documents awaiting), patients (total, by status, new 7 / 30 days, returning), appointments (by status, today, upcoming, last 7 days), support (open complaints, in progress, open safety alerts), finance (collected today / 30 days, refunded, refunds due, payouts pending). Sections are filtered by level. |
| 18 | Verification admin may suspend | Suspend and reinstate now allow operations and clinical_governance. |
| 20 (part) | Doctor list total and paging | `GET /admin/doctors` answers `{ items, total, limit, offset }`. |
| 42 | Payments export | `GET /admin/payments/export` (CSV, finance only). It existed before; section 2.6 wrongly called it missing. |
| 12 (part) | Money owed back | `GET /admin/payments/refund-queue` lists refunds the platform owes. |

### Still open after the new code
| # | Gap | Note |
| --- | --- | --- |
| 1 (rest) | Edit a patient; per-patient payments, files, follow-ups and complaints; city, district, state | The detail has identity, region, address line, PIN and an activity summary only, and **no health data by design**. A patient's consultations can come from `GET /admin/consultations?patientId=`. |
| 2 | Lab Services | Nothing added. |
| 3, 43, 44 | Support Tickets, provider / lab / app feedback | Nothing added. Only `GET /doctor/feedback` (a provider reads their own). |
| 4, 14, 45, 46 | Analytics endpoints, delivery history, manual send, channel switches | Nothing added. |
| 6, 52 | Configurable roles and permissions; `lab`, `analytics` levels | Still the fixed six-value enum. |
| 7, 8, 48-51 | Website and App Settings, new config keys, master lists for languages / types / categories, Contact Us document | Nothing added. |
| 10 | Patient Payments list | No admin list. Only the refund queue, the capture review queue and the CSV export. |
| 11 | Provider payouts history | Still only `payouts/pending` and record-as-paid. |
| 12 (rest), 41 | Refund workflow and a full refunds list | Only the "owed back" queue. No requested, initiated, completed, rejected states. |
| 13, 37 | Follow-ups list and the six follow-up statuses | Nothing added. |
| 15 | All case summaries | Still pending ones only. |
| 17 | "Changes Required" verification status | Nothing added. |
| 19-25, 28 | Registration council, rating, provider code, availability, account-status / super-specialty filters, provider categories, veterinary, super-specialty list | The doctor filters are verification, listing, specialty, language, region, seniority, search. None of the spec's extra fields were added. |
| 26 | Reorder specialties | Nothing added. |
| 27 | Separate signature status | Nothing added. |
| 29 | Accepted / Upcoming / Rescheduled | Still derivable only by guessing. |
| 31 | Admin reschedule | Nothing added. |
| 32-36, 38, 39 | Case record: observations, allergies, non-doctor structure, case documents, admin thread, chat, patient tabs | Nothing added. |
| 40 | Commission and net payout | Still no commission. New: `patientFeeInr` and `consultationFeeInr` per consultation, so the platform's earning is a patient-side fee. Decision Q5 stands. |
| 47 | Notification types | New admin-audience template `payment_needs_review`; the other spec types still need checking. |
| 53 | Care Hub shape | Unchanged. |

### New in the backend with no screen in the panel yet
1. **Payment capture review**: `GET /admin/payments/captures/needing-review`, `POST .../captures/:gatewayPaymentId/resolve`, `POST /admin/payments/:consultationId/reconcile`. Needs a Finances screen (finance and operations).
2. **Refund queue** (above): a Finances screen, and the dashboard "Refunds pending" card should read it.
3. **Broadcast offers**: instant requests are now sent to every eligible provider at once and unanswered paid requests go to an admin. `GET /admin/instant/consultations/:id/offers` returns one row per provider. The Appointments detail should show it.
4. **Patient-chosen provider**: `providerChosenByPatient` on the consultation. The Appointments detail and the allocation decisions view should show it.
5. **Provider super-specialisation** is now sent to the patient app; the panel already shows it.

### What this does to the integration order
Appointments, Patients (list and detail), Users, Dashboard and verification-suspend can now be integrated for real. Provider list fields, Finances lists, follow-ups, case-record structures, tickets, analytics and settings are still waiting on the backend.

## 9. Providers and Verification: wired on 12 Oct 2026

Healthcare Providers (Doctors, Specialists, Super-specialists, Paramedical, Veterinary), the provider detail and the Verification review now read the backend (`api/liveProviders.ts`, `api/liveProviders.spec.ts`). The header inbox reads `/me/notifications*`.

### What the admin view still does not carry (shown as empty, never invented)
| Field | Where it shows | Backend situation |
|---|---|---|
| Date of birth, gender | Verification → Basic details | Not on `AdminDoctorDetail`. |
| Government ID type, number, ABHA ID | Verification → Identity | Collected at registration (`RegistrationIdentityDto`) but not returned to the admin. |
| E-mail address | Basic details | A provider has no e-mail on the account. |
| Experience entries (designation, institution, years) | Verification → Experience | Only the total `yearsOfExperience` exists. |
| Qualification broken into basic / PG / super / fellowship | Verification → Qualifications | One `qualification` string. |
| Suspension reason | Provider Profile banner | `POST …/suspend` takes a reason but no read returns it. |
| Weekly availability, regions per provider | Availability tab | Endpoints exist (`GET/PATCH …/regions`); the editors are not wired yet. |
| Editing profile details, adding a provider | Edit / Add provider | `PATCH /admin/doctors/:id` and `POST /admin/doctors` exist; forms not wired yet. |

### Decisions the panel made
- **Fee column is the payout fee**, labelled so. The patient's fee is the specialty's.
- **Tabs follow the backend's four categories**: Specialists = `medical`, Super-specialists = `super_specialty`, Doctors = both.
- **Listing is operations only** and **request-replacement of a signature is clinical governance only**, matching the controllers; the buttons are hidden for other levels.
- **Availability** has five backend values; the panel's filter shows Available (`available_now`) and Unavailable (everything else).
- **Languages** are stored as ISO codes; the panel shows names and accepts names or codes.

### Profile photos (12 Oct 2026)
A profile photo is not a credential, so nobody reviews it. The backend approves it the moment it is uploaded (`DoctorVerificationService.confirmUpload`), never counts it as awaiting review, and still shows one that was pending from before (`photoUrlOf` shows any photo that was not rejected). The panel has no review row for it: it shows as the avatar on the provider lists, the Verification worklist and the provider page. The link is a short-lived signed URL; an expired one falls back to initials. The admin Dashboard has no provider rows, so it shows no photos.

### Providers: the rest, wired later on 12 Oct 2026
Supersedes the "does not carry" table above for everything marked wired.

| Piece | Now | Where |
|---|---|---|
| Date of birth, gender, e-mail, ID type + last four, ABHA, qualification parts, experience entries | **Wired.** New backend route `GET /admin/doctors/:id/registration` (clinical governance + operations, audited read) returns the provider's own registration view. | backend `admin-doctors.controller.ts`, `doctor-registration.service.ts` `getForAdmin`; panel `liveProviders.ts` `registrationFrom` |
| Add provider | **Wired**, to the fields `CreateDoctorDto` takes. Identity, qualifications, experience and documents are the provider's own, in their app. | `ProviderFormsLive.tsx` `CreateProviderLive` |
| Edit details | **Wired**, to the fields `UpdateDoctorDto` takes, only what changed. | `ProviderFormsLive.tsx` `EditProviderLive` |
| Availability tab (weekly pattern, blocks, custom hours, slot preview) | **Wired.** | `liveScheduling.ts` |
| Availability section (coverage lookup) | **Wired.** | `liveScheduling.ts` `remaining` |
| Service regions | **Wired** (`GET/PATCH /admin/doctors/:id/regions`). | `ProviderDetail.tsx` `ServiceRegions` |

Still open:
- **Suspension reason** is not returned by any read.
- **Admin cannot edit** date of birth, ID, qualification parts or experience: the backend lets only the provider save those (`PUT /me/doctor/registration`), and locks them once verified.
- **Weekly windows lose their channel** (video/audio) when the pattern is replaced from the panel, because the editor does not carry it; the backend defaults to both.
- **The new registration route is not deployed.** Until it is, the panel opens the provider without those cards filled and says so.

## 10. Every remaining section, wired on 12 Oct 2026

Every sidebar section that is not Lab Services now reads the backend in a live build. The Care Hub tab is the one tab that still says "Not connected".

| Section | Screen | Backend | Notes |
|---|---|---|---|
| Finances | Patient Payments, Provider Payouts, Refunds | `/admin/payments`, `/admin/payments/payouts`, `/admin/refunds` | No `processing` payout state and no manual "mark refund completed": the gateway answers synchronously. Initiating a refund really sends it. |
| Support | Tickets, Patient complaints, Feedback | `/admin/tickets`, `/admin/complaints`, `/admin/feedback`, `/admin/feedback/app` | Ticket statuses are the backend's five, with no `new`; a category is a free word. Consultation feedback has the reference and the provider id, not names. |
| Notifications | Templates, Send, History | `/admin/notification-templates`, `/admin/notifications/broadcasts` | A broadcast takes no deep link. History lists what was sent from the panel; automatic notifications are per-recipient deliveries. |
| Clarifications | Cases, Expert assignment | `/admin/clarification-cases` | An admin sees the case and who holds it, never the conversation. |
| Follow-ups | List and detail | `/admin/followups` | Read-only: the backend gives an admin no way to move one. |
| Safety alerts | Queue, acknowledge, close | `/admin/safety-alerts` | The identity is masked (initials, age, sex). |
| Case Records | List, detail, summaries | `/admin/consultations`, `.../clinical-record`, `.../documents`, `/admin/governance/case-summaries` | Read-only and audited. The summary is written by the provider; there is no "regenerate". |
| Analytics | Overview, Consultations, Providers, Patients, Financial | `/admin/analytics/*` | Counted by the backend; each report carries its definitions. No lab report. |
| Admin | Roles & Permissions | `GET /admin/roles` | Read-only on purpose: guards are fixed in code. |
| Admin | Master Data | `/admin/master-data`, `/admin/specialties`, `/admin/concerns`, `/admin/regions`, `/admin/allocation-policy` | Only ticket categories and lab test categories are editable lists; the rest are platform-defined. |
| Settings | Admin, App, Website | `/admin/settings/:group`, `/admin/config`, `/admin/compliance/*`, `/admin/deletion-requests`, `/admin/legal/*`, `/admin/followup-pathways` | The form is drawn from the field list the backend sends. |
| Appointments | Allocation decisions | `/admin/governance/allocation-decisions` | Read from the audit trail; the basis is decoded from which keys are present. |

Still open:
- **Care Hub** (App Settings tab): cover images need the signed-upload flow, and concern/specialty are ids on the backend.
- **Appointment actions** (override provider, cancel, reschedule) have routes (`/admin/consultations/:id/override-provider`, `/cancel`, `/reschedule`) and are not on the appointment page, which is by that page's own design.
- **Provider and patient names on consultation feedback** are not returned.

### Analytics, laid out as the spec has it (12 Oct 2026)
Pages 71-77, one filter bar (date range with custom dates, provider category, specialty, service type), each page in the spec's order. A rate arrives from the backend as a fraction and a share as a percent; each has its own formatter.

| Spec figure | Source | State |
|---|---|---|
| Appointment acceptance rate | accepted / offered, totalled from the provider quality table | Exact when the table holds every provider, otherwise labelled "top N" |
| Follow-up completion | `governance/dashboard` follow-up plans completed / (active + completed) | Role-limited (403 shown as such) |
| Repeat consultations, returning patients | patients report (`returningPatientConsultations`, `repeatPatients`) | Counted |
| Cancellation rate (provider) | provider-initiated cancellations / appointments, from the consultations report | Counted |
| Patient platform fee | financial report `convenienceFees` | Counted |
| Payment failures | `GET /admin/payments?status=failed` total in the window | Count only; no amount |
| Monthly revenue trends | financial report, last 12 months, `granularity=month` | Counted |
| Diagnostic revenue, all of Lab Analytics | `GET /admin/analytics/lab` | Shown when Lab Services is on; "switched off" otherwise |
| **Average response time (providers)** | not measured by the backend | Shown as "Not reported" |
| **Follow-ups reviewed (providers)** | check-ins submitted are counted, reviews per provider are not | "Not reported" |
| **Individual tests / packages ordered (lab totals)** | only the ten most frequent are returned | "Not reported" |
| **Partner acceptance rate, collection completion rate, orders by PIN code (lab)** | not in the lab report | "Not reported" |
