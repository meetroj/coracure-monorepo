# CoraCure Admin Panel: Updated Developer Change Requirements

Source: `CoraCure_Admin_Panel_Updated_Developer_Requirements.pdf` (pasted in full below, section numbers as in the PDF).
Scope: `apps/admin` only. The panel runs on in-memory fixtures (`src/mock/*`), so every item below is a **UI build against fixtures**; nothing here needs the backend yet.

---

# PART A. TODO (what to do, in order)

Legend: `[ ]` open, `[x]` done. Each line names the spec section it comes from (§) and where it lands.

## A0. Foundations
- [x] Add `lab` and `analytics` permission levels; relabel the existing ones to the spec role names (§88). `nav.ts`
- [x] Rebuild `nav.ts` around the spec sidebar (§2, §98): 8 groups, Services split into Consultations and Lab Services. `nav.ts`
- [x] Collapsible sidebar groups; only the active group is open by default (§2). `app/Shell.tsx`, `shell.css`
- [x] Redirect every old path to its new home so bookmarks keep working. `app/app.tsx`
- [x] Shared list/CRUD kit so ~25 spec screens are config, not copy-paste (`modules/kit/*`) and one fixture store (`mock/ops.ts`).

## A1. Dashboard (§3)
- [x] Six bands: Healthcare Providers, Patients, Consultations, Lab Services, Finances, Support, with every card from §3.
- [x] Every card links to its operational screen, filtered where the screen supports it.

## A2. Healthcare Providers (§4 to §21)
- [x] Rename People to Healthcare Providers; submenus Doctors, Specialists, Super-specialists, Paramedical Professionals, Veterinary Specialists, Verification (§4).
- [x] Doctors list: columns and five filters from §5.
- [x] Specialists / Super-specialists lists driven by the master lists, not hard-coded (§6, §7).
- [x] Paramedical and Veterinary lists with non-doctor wording (§8, §9).
- [x] Dynamic specialty master data: four lists, add / edit / activate / deactivate / reorder (§10, §90).
- [x] Provider profile with the sections of §11 to §18: basic details, identity, qualifications (+docs), registration, multiple experience entries, digital signature (preview / approve / request replacement), consultation settings (fee, days, several windows per day).
- [x] Provider account status Active / Inactive / Suspended (§19).
- [x] Verification statuses Submitted / Under Review / Changes Required / Approved / Rejected / Suspended (§20).
- [x] Verification screen by Identity, Qualifications, Registration, Experience, Signature; actions Approve / Changes Required / Reject / Suspend (§21).
- [x] Patient-facing information panel: shown vs never exposed (§97).

## A3. Patients (§22 to §30)
- [x] Patient profile tabs: Overview, Address, Consultations, Prescriptions / Care Plans, Reports & Documents, Follow-ups, Payments, Support.
- [x] No Emergency Contact anywhere (§24).
- [x] Prescription for doctor consultations, Care Plan for non-doctor (§26).

## A4. Services: Consultations (§31 to §49)
- [x] Submenus Appointments, Case Records, Clarifications, Follow-ups (§32).
- [x] Appointment statuses and the appointment workflow strip (§33).
- [x] Case Record list + detail with the seven parts of §34, label "Consulting Professional" (§35).
- [x] Doctor structure: Clinical Notes & Diagnosis, Prescription (+ auto-fetched Chief Complaint / Provisional Diagnosis, signature), auto Case Summary (§36 to §38).
- [x] Non-doctor structure: Assessment & Care Plan, Care Plan, auto Case Summary; no "Provisional Diagnosis" (§39 to §41).
- [x] Case Documents grouping (§43), Clarification thread inside the case (§44), Recommended Resources (§45), no duplicate follow-up plan (§46).
- [x] Consultation duration shown on appointment, case record and in analytics (§47).
- [x] Clarifications list: New / Awaiting Response / Responded / Closed (§48).
- [x] Follow-ups list: Active / Patient Response Pending / Provider Review Pending / Reviewed / Follow-up Consultation Recommended / Completed (§49).

## A5. Services: Lab Services (§50 to §70)
- [x] Lab Orders list + detail: all §51 fields, §52 booking sources, §53 statuses, collection management (§66) and recollection (§67), payment & refund (§70).
- [x] Lab Partners CRUD: add / edit / activate / deactivate, service PIN codes, home collection (§58, §59).
- [x] Individual Lab Tests CRUD with CoraCure Test ID, aliases, partner mapping and partner price (§60, §61).
- [x] Lab Test Packages: belongs to one partner, add / remove tests, change price, activate (§62, §63).
- [x] Allocation Settings: First Acceptance, eligibility, timeout, max partners (§54 to §57).
- [x] Lab Reports list with the four filters (§68); privacy notice, no WhatsApp send (§69).
- [x] Prescription-based matching rule documented on the Packages screen (§64, §65).

## A6. Analytics (§71 to §77)
- [x] Six pages: Overview, Consultation, Provider, Patient, Lab, Financial, with the four filters (date range, provider category, specialty, service type).

## A7. Finances (§78 to §81)
- [x] Patient Payments (§79), Provider Payouts, not "Doctor Payments" (§80), Refunds incl. lab refunds (§81).

## A8. Support (§82 to §85)
- [x] Support Tickets: statuses, categories, priority (§83).
- [x] Feedback: Patient / Provider / Lab-service / App (§84).
- [x] Notifications: four channels and the §85 notification types.

## A9. Admin (§86 to §96)
- [x] Users: list, add, edit, activate / deactivate, assign role (§87).
- [x] Roles & Permissions: seven roles, configurable permission matrix, Lab Admin set (§88, §89).
- [x] Master Data: provider lists, lab master, other master data (§90 to §92).
- [x] Admin Settings, App Settings, Website Settings (§93 to §95).
- [x] Legal & Support content: T&C, Privacy, Refund policy, Contact Us, version info (§96).

## A10. Done criteria
- [x] `npx tsc -p apps/admin/tsconfig.app.json --noEmit` clean.
- [x] `npx vitest run --root apps/admin` green (specs updated for the new nav).
- [x] Every sidebar link from §98 opens a real screen; no placeholder.
- [x] Final sweep against Part C (mandatory requirements 68 to 115).

## Kept from before, not in the spec
Not deleted, re-homed so nothing is lost: Safety alerts (Consultations), Doctor availability (Healthcare Providers), Care Hub and Follow-up pathways (App Settings tabs), Catalogue (Master Data tab), Complaints (Support Tickets tab), Audit log / Deletion requests / Retention (Admin Settings tabs).

---

# PART B. FUNCTIONAL SPEC (from the PDF)

## 1. Purpose
The CoraCure Admin Panel should function as the central operational interface for managing: healthcare providers, provider verification, patients, consultations, case records, clarifications, follow-ups, lab services, payments and provider payouts, support, notifications, analytics, administrative users, roles and permissions, master data, application settings, website settings.

It should remain simple, organised, scalable, and consistent with the approved CoraCure Doctor/Provider App, Patient App, and Lab Module workflows.

## 2. Main Sidebar Structure
1. Dashboard
2. Healthcare Providers
3. Patients
4. Services
5. Analytics
6. Finances
7. Support
8. Admin

The sidebar should preferably use collapsible sections so that only relevant submenus are visible when expanded.

## 3. Dashboard
High-level operational overview.

**Healthcare Providers:** Total providers, Active providers, Pending verification, Changes required, Inactive providers, Suspended providers.
**Patients:** Total registered patients, New registrations, Returning patients.
**Consultations:** Appointment requests, Appointments today, Upcoming appointments, Completed consultations, Cancelled consultations, Pending clarifications, Pending follow-ups.
**Lab Services:** New lab orders, Lab allocation pending, Collection scheduled, Sample processing, Reports ready, Completed orders, Cancelled / refunded orders.
**Finances:** Patient payments, Provider payouts pending, Refunds pending, Revenue summary.
**Support:** New support tickets, Open tickets, In-progress tickets, Resolved tickets.

Dashboard cards should link directly to the corresponding operational screens.

## 4. Healthcare Providers
Rename the existing People section to Healthcare Providers: Doctors, Specialists, Super-specialists, Paramedical Professionals, Veterinary Specialists, Verification.

## 5. Doctors
The existing Doctors section should be retained.

Recommended information: Provider name, Provider ID, Profile photo, Specialty, Super-specialty where applicable, Qualifications, Registration number, Registration council, Total years of experience, Consultation languages, Consultation fee, Verification status, Account status, Availability status, Total consultations, Rating.

Recommended filters: Specialty, Super-specialty, Verification status, Account status, Availability.

## 6. Specialists
Medical specialists appear under Specialists: General Medicine, Family Medicine, Psychiatry, Paediatrics, Dermatology, Obstetrics & Gynaecology, ENT, Ophthalmology. **The specialty list should not be hard-coded.**

## 7. Super-specialists
Doctors belonging to super-specialty categories: Cardiology, Neurology, Gastroenterology, Nephrology, Endocrinology, Oncology. **The list should remain configurable.**

## 8. Paramedical Professionals
Support approved paramedical professionals including: Dietitian / Nutritionist, Physiotherapist, Psychologist, Occupational Therapist, Speech Therapist, Other approved professionals.

Their professional categories should remain configurable. Profession-appropriate workflows should be used for non-doctor healthcare professionals rather than forcing doctor-specific terminology.

## 9. Veterinary Specialists
Veterinary professionals remain a separate provider category. Veterinary specialties remain configurable.

## 10. Dynamic Specialty Management
Separate configurable master lists for: Medical Specialties, Super-specialties, Paramedical Specialties, Veterinary Specialties.

For each list Admin can: Add, Edit, Activate, Deactivate, Reorder.

Qualification entered during provider registration stays separate from CoraCure service-specialty mapping. Example: Qualification: MD Dermatology | CoraCure Specialty: Dermatology.

A newly added specialty should become available in: Provider-management screens, Provider categorisation, Patient search, Appointment matching/allocation, Analytics filters.

## 11. Provider Profile
Basic Details, Proof of Identity, Qualifications, Professional Registration, Experience, Digital Signature where applicable, Consultation Settings, Verification Status, Account Status.

## 12. Provider Basic Details
Profile photo, Full name, Date of birth, Gender, Mobile number, Email address, Languages for consultation.

## 13. Proof of Identity
Government ID type, Government ID number, Government ID document.

## 14. Qualifications
Basic Qualification, PG Specialisation, Super Specialisation, Fellowship. Documents: Degree Certificate, Registration Certificate.

## 15. Professional Registration
Registration number, Registration council, Registration certificate.

## 16. Experience
Designation, Name of Institute, Years of Experience, Experience Certificate. Multiple experience entries supported. Patient-facing profile displays only total years of experience.

## 17. Digital Signature
For doctors, Admin can: Preview signature, Approve signature, Request replacement. Signature stays private and is used only on generated prescriptions.

## 18. Consultation Settings
Consultation Fee, Consultation Days, Consultation Timings. One or more time windows per consultation day.

## 19. Provider Account Status
Active, Inactive, Suspended.

## 20. Verification
Statuses: Submitted, Under Review, Changes Required, Approved, Rejected, Suspended.

## 21. Verification Screen
- **Identity:** Government ID
- **Qualifications:** Basic Qualification, PG Specialisation, Super Specialisation, Fellowship, Degree Certificate
- **Professional Registration:** Registration details, Registration Certificate
- **Experience:** Experience entries, Experience Certificates
- **Signature:** Doctor signature where applicable

Admin actions: Approve, Changes Required, Reject, Suspend.

## 22. Patients
Each patient Admin profile contains: Overview, Address, Consultations, Prescriptions / Care Plans, Reports & Documents, Follow-ups, Payments, Support.

## 23. Patient Overview
Name, Mobile, Email, DOB, Age, Gender, Account status.

## 24. Patient Address
Location, PIN Code, Address. **Emergency Contact should not be included.**

## 25. Patient Consultations
Upcoming consultations, Previous consultations, Consulting professional, Specialty/service, Consultation date, Appointment status.

## 26. Prescriptions / Care Plans
Prescription for doctor consultations. Care Plan for approved non-doctor consultations.

## 27. Patient Reports & Documents
Lab reports, Medical reports, Previous prescriptions where available, Clinical documents, Other consultation-related files.

## 28. Patient Follow-ups
Active follow-up, Patient responses, Provider review, Follow-up recommendation, Follow-up status.

## 29. Patient Payments
Consultation payments, Lab payments, Refunds, Payment status, Transaction reference.

## 30. Patient Support
Support tickets, Feedback.

## 31. Services
Services contain Consultations and Lab Services.

## 32. Consultations
Appointments, Case Records, Clarifications, Follow-ups. These are operational Admin submenus. Detailed doctor / non-doctor clinical documentation headings belong inside an individual Case Record, not in the sidebar.

## 33. Appointments
Statuses: Requested, Allocated, Accepted, Upcoming, In Progress, Completed, Cancelled, Rescheduled.

Workflow: Patient request -> relevant provider category/specialty -> available providers identified -> eligible providers notified -> provider accepts -> appointment allocated -> patient receives confirmation.

## 34. Case Records
A Case Record is the complete record associated with one consultation / appointment. It includes: Case Overview, Consultation Documentation, Prescription or Care Plan, Case Summary, Case Documents, Clarification Thread where applicable, Recommended Resources where applicable.

## 35. Case Overview
Patient, Consulting Professional, Provider category, Specialty / professional category, Consultation date/time, Consultation duration, Appointment status. Use the provider-neutral label **Consulting Professional** instead of Treating Doctor on shared screens.

## 36. Doctor Consultation Documentation
**Clinical Notes & Diagnosis:** Chief Complaint, Brief Clinical History, Observations, Provisional Diagnosis.

## 37. Doctor Prescription
**Prescription:** Medications, Advice & Instructions, Warning Signs, History of Allergies.
The generated prescription also contains Chief Complaint and Provisional Diagnosis as auto-fetched fields, plus the approved doctor signature. Chief Complaint and Provisional Diagnosis are not entered again on the Prescription screen.

## 38. Doctor Case Summary
**Case Summary - Auto-generated**, from: Chief Complaint, Relevant history, Observations, Provisional Diagnosis, Key treatment/advice.

## 39. Non-Doctor Consultation Documentation
**Assessment & Care Plan:** Presenting Concern, Relevant History, Assessment / Observations. Do not use doctor-specific terminology such as Provisional Diagnosis.

## 40. Non-Doctor Care Plan
**Care Plan:** Recommendations / Interventions, Precautions & Warning Signs. Do not add separate common fields for Recommended Actions, Exercises / Activities, Advice & Instructions, or Relevant Medical Considerations.

## 41. Non-Doctor Case Summary
**Case Summary - Auto-generated**, from: Presenting Concern, Relevant History, Assessment / Observations, Care Plan.

## 42. Doctor vs Non-Doctor Case Structure
- **Doctors:** Clinical Notes & Diagnosis (Chief Complaint, Brief Clinical History, Observations, Provisional Diagnosis); Prescription (Medications, Advice & Instructions, Warning Signs, History of Allergies); Case Summary - Auto-generated.
- **Non-Doctors:** Assessment & Care Plan (Presenting Concern, Relevant History, Assessment / Observations); Care Plan (Recommendations / Interventions, Precautions & Warning Signs); Case Summary - Auto-generated.

## 43. Case Documents
Documents or information uploaded before, during, or after the consultation and tied to that appointment/case are grouped under Case Documents: Any Previous History, Medication History, Medical Reports, Patient Reports & Documents, Laboratory reports, Imaging, Previous prescriptions, Discharge summaries, Referral documents, Clinical photographs, Other uploaded consultation-related documents.

These are not separate main clinical-documentation headings. Use "Patient Reports & Documents" instead of "Patient Documents".

## 44. Clarification Thread within Case Record
- Keep the Clarification Thread linked to the Case Record where applicable.
- Accessible from the Case Detail screen.
- Also a separate operational list under Services -> Consultations -> Clarifications.

## 45. Recommended Resources
Keep within the Case Record where applicable. Content may vary by provider type.

## 46. Follow-up within Case Details
Do not create a duplicate standalone Follow-up Plan inside the Case Record. Follow-up is managed through Services -> Consultations -> Follow-ups.

## 47. Consultation Duration
Stored when consultation begins and ends. Shown in: Appointment Details, Case Records, Consultation Analytics.

## 48. Clarifications
Statuses: New, Awaiting Response, Responded, Closed. The thread stays linked to the relevant Case Record.

## 49. Follow-ups
Statuses: Active, Patient Response Pending, Provider Review Pending, Reviewed, Follow-up Consultation Recommended, Completed. Follow-up remains a dedicated consultation workflow.

## 50. Lab Services
Lab Orders, Lab Partners, Individual Lab Tests, Lab Test Packages, Allocation Settings, Reports.

## 51. Lab Orders
CoraCure Lab Order ID, Patient name, Patient ID, Order date/time, Booking source, Selected individual tests, Package selected where applicable, Total test battery, Collection address, PIN code, Preferred collection window, Allocated Lab Partner, Collection status, Report status, Payment status, Refund status where applicable.

## 52. Lab Booking Source
Doctor-advised tests, Prescription upload, Self-selected individual tests, Lab Test Package.

## 53. Lab Order Status
Payment Pending, Payment Successful, Lab Allocation Pending, Lab Confirmed, Collection Scheduled, Sample Collected, Sample Processing, Report Ready, Completed, Cancellation Requested, Refund Initiated, Refunded.

## 54. Lab Allocation Method
**PIN Code + First Acceptance Model.**
Flow: Patient selects tests/package -> confirms address and PIN code -> system identifies eligible Lab Partners -> payment completed -> request sent to eligible Lab Partners -> first eligible Lab Partner to accept receives the order -> remaining requests automatically close -> patient receives confirmation.

## 55. Lab Eligibility
Partner is active; services the patient's PIN code; home collection available for that PIN code; can perform the required test/package; can fulfil the complete required test battery.

## 56. First Acceptance Rule
Send the request to eligible Lab Partners after successful payment. The first eligible partner to accept receives the booking. Once accepted, lock the order to that partner. Automatically close pending requests to other partners. Duplicate allocation must not occur.

## 57. Allocation Settings
- **Allocation Method:** First Acceptance
- **Eligibility Settings:** PIN-code serviceability, Complete test-battery availability, Home-collection availability
- **Acceptance Settings:** Partner response/acceptance timeout, Maximum eligible partners notified, if required

## 58. Lab Partners
Admin can Add, Edit, Activate, Deactivate. Fields: Lab Partner Name, Lab Partner ID, Contact details, Service cities, Service PIN codes, Home collection availability, Individual tests available, Packages available, Partner-specific pricing where required, Active / Inactive.

## 59. Lab Partner Serviceability
Service PIN codes, Home Collection Yes / No, Active / Inactive serviceability.

## 60. Individual Lab Tests
Admin can Add, Edit, Activate, Deactivate, Map test to Lab Partners. Fields: CoraCure Test ID, Test Name, Search aliases / alternate names, Customer-facing price, Lab Partner mapping, Partner-specific test code where required, Partner-specific price where required, Expected turnaround time where required, Active / Inactive.

## 61. CoraCure Test ID
Every investigation has a unique internal CoraCure Test ID. Example: `LAB-001 | HbA1c | Aliases: HbA1c, HBA1C, Glycated Haemoglobin`. Supports patient test search, prescription extraction, Lab Partner mapping, package matching, analytics.

## 62. Lab Test Packages
Each package belongs to a specific Lab Partner. Required fields: Lab Partner, Package Name, Included Tests, Total Number of Tests, Package Price, Active / Inactive.

## 63. Package Management
Add Package, Edit Package, Add tests to Package, Remove tests from Package, Change Package Price, Activate Package, Deactivate Package. A Package is a predefined battery of tests offered by a Lab Partner at a set price.

## 64. Prescription-Based Test Matching
1. Retrieve or upload the prescription.
2. Identify only explicitly advised laboratory investigations.
3. Map investigations to CoraCure Test IDs.
4. Compare the advised test battery with active Lab Partner packages.
5. If an appropriate package contains the required tests, it may be used.
6. If required investigations are not completely covered, remaining tests may be added individually where applicable.
7. Patient reviews and confirms the final test selection.

## 65. Package Matching Rule
Use only tests explicitly advised in the doctor's prescription. Do not add tests on the basis of Diagnosis, Symptoms, Age, Sex, AI assumptions.

## 66. Collection Management
Preferred collection window, Confirmed collection date, Confirmed collection time, Collection status, Sample collected date/time, Rescheduled collection, Recollection where applicable.
Statuses: Collection Pending, Collection Scheduled, Sample Collected, Collection Rescheduled, Collection Failed, Recollection Required, Recollection Scheduled, Recollection Completed.

## 67. Recollection
Reason for recollection, Lab Partner, Original collection date, New collection date, New collection time, Recollection status.

## 68. Lab Reports
Patient, Lab Order ID, Lab Partner, Test/package, Sample collection date, Report status, Report date, Report file, Turnaround time where available. Filters: Pending, Processing, Report Ready, Completed.

## 69. Prescription and Lab Report Privacy
Prescriptions and Lab Reports remain accessible only through authenticated CoraCure systems. Do not provide functionality to send actual Prescriptions or Lab Reports through WhatsApp. Notifications may only tell the patient the report is ready; the file stays within the CoraCure Patient App or authenticated CoraCure web access.

## 70. Lab Payment and Refund Information
Customer amount, Payment status, Transaction reference, Payment date/time, Refund status where applicable. Lab-related refunds also appear under Finances -> Refunds.

## 71. Analytics
Overview, Consultation Analytics, Provider Analytics, Patient Analytics, Lab Analytics, Financial Analytics. Filters: Date range, Provider category, Specialty, Service type.

## 72. Analytics Overview
Patients, Providers, Consultations, Lab Services, Financial activity.

## 73. Consultation Analytics
Total appointments, Completed consultations, Cancelled consultations, Appointment acceptance rate, Repeat consultations, Follow-up completion, Specialty-wise volume, Provider-category volume, Average consultation duration, Median consultation duration.

## 74. Provider Analytics
Appointments offered, Appointments accepted, Consultations completed, Acceptance rate, Cancellation rate, Average response time, Follow-ups reviewed, Ratings, Complaints.

## 75. Patient Analytics
Total registered patients, New patients, Returning patients, Age distribution, Gender distribution, Location distribution, Specialty utilisation, Repeat consultations.

## 76. Lab Analytics
- Orders: Total, Completed, Cancelled, Refunded
- Tests & Packages: Individual tests ordered, Packages ordered, Most frequently booked tests, Most frequently booked packages
- Lab Partners: Partner-wise order volume, Partner acceptance rate
- Location: Orders by PIN code / location
- Collection: Collection completion rate, Recollection rate
- Reports: Reports completed, Average report turnaround time

## 77. Financial Analytics
Gross consultation value, Platform commission, Patient platform fee, Provider payouts, Diagnostic revenue, Refunds, Payment failures, Monthly revenue trends.

## 78. Finances
Patient Payments, Provider Payouts, Refunds.

## 79. Patient Payments
Patient, Service, Consultation/Lab reference, Amount, Payment status, Transaction reference, Payment date/time, Refund status. Filters: Payment status, Service type, Date range.

## 80. Provider Payouts
Use **Provider Payouts**, not Doctor Payments. Applies to Doctors, Paramedical Professionals, Veterinary professionals. Display: Provider, Service / consultation reference, Gross amount, Platform commission, Net payout, Payout status, Settlement date.

## 81. Refunds
Patient, Transaction reference, Service, Refund amount, Refund reason, Request date, Refund status, Completion date.

## 82. Support
Support Tickets, Feedback, Notifications.

## 83. Support Tickets
- Statuses: New, Open, In Progress, Awaiting User Response, Resolved, Closed
- Categories: Patient, Provider, Lab, Payment, Technical, Other
- Priority: Low, Medium, High, Urgent

## 84. Feedback
Patient Feedback, Provider Feedback, Lab-service Feedback, App Feedback.

## 85. Notifications
Channels: Push notifications, SMS, Email, In-app notifications.
Types: Provider registration confirmation, Provider verification update, Appointment confirmation, Appointment reminder, Consultation reminder, Follow-up reminder, Lab report available, Payment confirmation, Refund update, Support-ticket update, Platform announcement.

## 86. Admin
Users, Roles & Permissions, Master Data, Admin Settings, App Settings, Website Settings.

## 87. Users
Display: Name, Email, Mobile, Role, Status, Last login. Actions: Add User, Edit User, Activate, Deactivate, Assign/change role.

## 88. Roles & Permissions
Super Admin, Operations Admin, Verification Admin, Finance Admin, Support Admin, Lab Admin, Analytics User. Permissions remain configurable.

## 89. Lab Admin Permissions
Lab Orders, Lab Partners, Individual Lab Tests, Lab Test Packages, Allocation Settings, Reports.

## 90. Master Data: Provider Master Data
Medical Specialties, Super-specialties, Paramedical Specialties, Veterinary Specialties. Actions: Add, Edit, Activate, Deactivate, Reorder.

## 91. Lab Master Data
CoraCure Individual Test master, Test aliases, Lab Partner mappings, Package definitions, Package-test composition, Service PIN codes where applicable. Day-to-day management happens under Lab Partners, Individual Lab Tests and Lab Test Packages.

## 92. Other Master Data
Languages, Consultation types, Support-ticket categories, Notification templates, Other configurable platform categories.

## 93. Admin Settings
Platform business rules, Provider fee rules, Service availability, Notification configuration, General operational settings.

## 94. App Settings
Available application languages, App feature controls, Content configuration, Patient-facing labels where configurable, General app configuration. Individual patient Light/Dark Mode preferences do not require Admin management.

## 95. Website Settings
Website content, Contact information, Service information, Public links, Other configurable public content.

## 96. Legal & Support Content
Terms & Conditions, Privacy Policy, Refund Policy, Contact Us details, Last updated/version information where applicable.

## 97. Patient-Facing Provider Information
**Visible to patients:** Provider name, Profile photo, Specialty / professional category, Qualification names, Total years of experience, Consultation languages, Consultation fee, Availability.
**Never expose:** Government ID, Degree certificates, Registration certificates, Institution-wise experience, Experience certificates, DOB, Personal mobile, Personal email, Internal verification information.

## 98. Final Recommended Sidebar
```
DASHBOARD            Dashboard
HEALTHCARE PROVIDERS Doctors · Specialists · Super-specialists · Paramedical Professionals · Veterinary Specialists · Verification
PATIENTS             Patients
SERVICES
  Consultations      Appointments · Case Records · Clarifications · Follow-ups
  Lab Services       Lab Orders · Lab Partners · Individual Lab Tests · Lab Test Packages · Allocation Settings · Reports
ANALYTICS            Overview · Consultation Analytics · Provider Analytics · Patient Analytics · Lab Analytics · Financial Analytics
FINANCES             Patient Payments · Provider Payouts · Refunds
SUPPORT              Support Tickets · Feedback · Notifications
ADMIN                Users · Roles & Permissions · Master Data · Admin Settings · App Settings · Website Settings
```

---

# PART C. MANDATORY DEVELOPMENT REQUIREMENTS (§99, items 68 to 115)

68. Do not hard-code healthcare-provider specialties.
69. Maintain separate configurable lists for Specialists, Super-specialists, Paramedical Professionals, and Veterinary specialties.
70. Allow Admin to add, edit, activate, deactivate, and reorder specialties.
71. Keep provider qualifications separate from CoraCure service-specialty mapping.
72. Support doctor and non-doctor provider profiles.
73. Doctor consultations: Clinical Notes & Diagnosis = Chief Complaint, Brief Clinical History, Observations, Provisional Diagnosis.
74. Doctor consultations: Prescription = Medications, Advice & Instructions, Warning Signs, History of Allergies.
75. Chief Complaint and Provisional Diagnosis are auto-fetched into the generated doctor prescription.
76. Non-doctor consultations: Assessment & Care Plan = Presenting Concern, Relevant History, Assessment / Observations.
77. Non-doctor consultations: Care Plan = Recommendations / Interventions, Precautions & Warning Signs.
78. Case Summary - Auto-generated for both doctor and non-doctor consultations.
79. Case Records hold the complete consultation record.
80. Any Previous History, Medication History, Medical Reports and Patient Reports & Documents sit under the supporting documents of the Case Record, not as main clinical headings.
81. Group uploaded reports, imaging, previous prescriptions, discharge summaries, referral documents, clinical photographs and similar under Case Documents.
82. Use Consulting Professional as the provider-neutral term on shared screens.
83. Keep Clarification Thread linked to the associated Case Record where applicable.
84. Keep Recommended Resources within the Case Record where applicable.
85. Do not duplicate Follow-up Plan inside Case Details when follow-up is handled through the dedicated Follow-up workflow.
86. Record consultation duration.
87. Keep provider verification documents private.
88. Display only approved patient-facing provider information.
89. Admin can add/edit/activate/deactivate Lab Partners.
90. Admin can configure Lab Partner PIN-code serviceability.
91. Admin can add/edit/activate/deactivate Individual Lab Tests.
92. Every individual lab test has a CoraCure Test ID.
93. Admin can map tests to Lab Partners.
94. Admin can add/edit/activate/deactivate Lab Test Packages.
95. Each Lab Test Package belongs to a Lab Partner.
96. Each Lab Test Package contains a defined battery of included tests.
97. Package information stays limited to Lab Partner, Package Name, Included Tests, Number of Tests, Price, and Active/Inactive.
98. Admin can add/remove tests from a package.
99. Prescription-derived investigations map to the CoraCure Individual Test master.
100. Package matching uses only investigations explicitly advised in the prescription.
101. Lab allocation uses PIN-code eligibility plus first acceptance.
102. The first eligible Lab Partner to accept receives the allocation.
103. Once allocated, outstanding requests to other Lab Partners close automatically.
104. Collection Management stays within the Lab Order.
105. Recollection stays within Collection Management.
106. Lab Reports and prescriptions stay securely accessible through authenticated CoraCure systems.
107. No functionality to send actual Lab Reports or prescriptions through WhatsApp.
108. Lab-related refunds integrate with Finances -> Refunds.
109. Operational Lab Analytics: partner, test, package, location, collection, report indicators.
110. Use Provider Payouts rather than Doctor Payments.
111. Configurable Support Tickets, Feedback, and Notifications.
112. Admin Users with role-based permissions.
113. Configurable Master Data for relevant platform categories.
114. Terms & Conditions, Privacy Policy, Refund Policy, and Contact Us maintained through appropriate settings.
115. Admin Panel stays consistent with the Doctor/Provider App, Patient App, and Lab Module workflows and terminology.
