You are working on the CORACURE ADMIN PANEL.

Your task is to build/refine the complete CoraCure Admin Web Panel into a polished, production-ready desktop web application.

IMPORTANT:
DO NOT break, remove, rewrite, or unnecessarily refactor existing working functionality.
DO NOT replace working backend logic with fake/mock logic if real APIs already exist.
DO NOT change API contracts.
DO NOT change authentication behavior.
DO NOT change permission rules.
DO NOT introduce random UI patterns.
DO NOT create screens that the backend does not support unless they are clearly marked as unavailable/gap states.
DO NOT leave buttons decorative or non-functional.
EVERY visible interactive element must either perform its intended action or clearly be disabled with a meaningful reason.
EVERY route must work.
EVERY button must work.
EVERY form must validate correctly.
EVERY navigation item must lead to the correct screen.
NO dead ends.
NO broken back buttons.
NO layout overflow.
NO console errors.
NO TypeScript errors.
NO broken imports.
NO missing icons.
NO placeholder lorem ipsum.
NO accidental gradients.
NO random colors.
NO inconsistent spacing.
NO duplicated components when reusable components should be created.
NO unnecessary changes outside the Admin Panel.

==================================================
1. SOURCE OF TRUTH
==================================================

Use the following uploaded documents as the source of truth:

1. Admin_Web_Panel_User_Flow.docx
2. Guidelines - Final-CORACURE(1).pdf

The Admin Web Panel document describes the actual backend-supported flows, endpoints, permission levels, authentication, session behavior, doctor/provider workflows, consultations, governance, payments, content, compliance, settings, audit logging, and known backend gaps.

The CoraCure brand guideline defines the visual language.

Do not invent functionality that conflicts with those documents.

The admin panel is a DESKTOP WEB PANEL.

The panel uses LEFT NAVIGATION BY MODULE.

Sections and actions must be gated according to the admin permission level.

The six permission levels are:

- super_admin
- operations
- clinical_governance
- care_coordinator
- finance
- content

super_admin has access to everything.

All other permission levels must only see the modules/actions explicitly allowed for their role.

The server remains the final authority.

If an API responds with 403 INSUFFICIENT_PERMISSION, handle it gracefully even if the client-side navigation already hides that action.

==================================================
2. FIRST STEP — INSPECT THE EXISTING PROJECT
==================================================

Before changing anything:

1. Inspect the entire existing frontend structure.
2. Identify:
   - framework
   - routing system
   - component system
   - styling system
   - existing design tokens
   - API client
   - authentication handling
   - state management
   - reusable components
   - existing pages
   - existing layouts
   - existing icons
   - existing error handling
3. Inspect existing backend/API integration.
4. Identify which screens are already implemented.
5. Identify which screens are partially implemented.
6. Identify broken screens.
7. Identify routes.
8. Identify API endpoints already connected.
9. Identify existing reusable components.
10. Reuse existing architecture wherever possible.

DO NOT rewrite the whole project just to make the UI look different.

Preserve existing business logic.

If something already works, keep it working.

Only improve the implementation where required.

==================================================
3. BRAND DIRECTION — CORACURE
==================================================

The visual system must feel:

- healthcare
- trustworthy
- human
- calm
- modern
- professional
- connected
- clean
- approachable
- premium but not luxurious
- clinical without looking cold

The brand guidelines emphasize:

HUMAN BEFORE CLINICAL
SIMPLE BEFORE DECORATIVE
CONNECTED, NOT CROWDED
DIGITAL FIRST

The UI must follow those principles.

Do not make the admin panel look like a generic SaaS dashboard.

It should clearly feel like CORACURE.

==================================================
4. COLOR SYSTEM
==================================================

Use the official CoraCure palette.

Primary dark brand green:

Sufi Green
#0E7C73

Accent green:

Paris Green
#54D499

Use supporting neutrals:

Black
#121212

Text Grey
#677774

Soft Grey
#F2F7F5

White
#FFFFFF

Use green as the brand anchor.

Use Paris Green for selected states, subtle highlights, active indicators, positive states, and important accents.

Do NOT introduce random blues, purples, oranges, pinks, gradients, or unrelated colors.

For destructive actions, use an appropriate restrained danger red only where required.

For warnings, use a restrained amber only where semantically necessary.

The majority of the interface should remain neutral.

Recommended visual hierarchy:

White / soft grey = main surfaces
Sufi Green = primary brand / primary actions
Paris Green = accents / highlights
Dark = primary text
Text Grey = secondary text

Do not overuse green.

==================================================
5. TYPOGRAPHY
==================================================

Follow the CoraCure typography system.

Use:

ROUNDED
for:
- large page titles
- hero-style headings
- major section headings
- important empty-state headings

MONTSERRAT
for:
- body copy
- navigation
- labels
- forms
- buttons
- tables
- metadata
- filters
- system information

Typography must have a clear hierarchy.

Avoid:
- excessive font sizes
- excessive font weights
- all-caps everywhere
- decorative typography
- inconsistent font sizes

Recommended hierarchy:

Page title:
Rounded / large / strong

Section heading:
Rounded / medium-large

Body:
Montserrat Regular

Labels:
Montserrat Medium

Buttons:
Montserrat Bold

Metadata:
Montserrat Regular / smaller size

==================================================
6. OVERALL ADMIN PANEL LAYOUT
==================================================

Create a professional desktop admin shell.

Structure:

------------------------------------------------
| LEFT SIDEBAR | TOP HEADER                    |
|              |-------------------------------|
|              | PAGE CONTENT                  |
|              |                               |
|              |                               |
------------------------------------------------

SIDEBAR:

- CoraCure logo
- primary navigation
- grouped modules where appropriate
- active route indicator
- permission-aware navigation
- subtle separators
- user/admin section at bottom
- sign-out action

Sidebar should NOT feel heavy.

Use generous spacing.

Do not make every navigation item look like a button.

Active item:
- subtle Sufi Green / Paris Green treatment
- rounded container
- clear visual state

Inactive:
- neutral
- clean
- readable

Avoid excessive borders.

==================================================
7. TOP HEADER
==================================================

The top header should include:

- current page title
- optional breadcrumb
- search where appropriate
- notifications
- admin profile/avatar
- admin name
- permission level
- profile dropdown

Keep the header compact.

Do not create a huge header.

The content area should receive most of the visual space.

==================================================
8. RESPONSIVE BEHAVIOR
==================================================

The primary target is desktop.

Still ensure:

- tablet does not break
- browser zoom does not destroy layout
- tables can horizontally scroll when required
- long text does not overflow
- modals remain inside viewport
- forms do not overflow
- sidebar does not overlap content
- buttons never get cut off

Do not force a mobile UI that destroys the desktop admin experience.

==================================================
9. AUTHENTICATION
==================================================

Implement the actual admin authentication flow.

Initial screen:

EMAIL + PASSWORD

POST:

/v1/auth/admin/sign-in

Payload:

{
  email,
  password
}

Possible successful responses:

status: "complete"

or:

status: "two_factor_required"

If complete:

- store access token
- securely handle refresh token
- decode permission level
- build navigation
- redirect to appropriate dashboard

If two_factor_required:

show the 2FA screen.

2FA:

6-digit code.

POST:

/v1/auth/admin/two-factor

Payload:

{
  mfaToken,
  code
}

Do NOT create a self-service 2FA setup screen.

==================================================
10. AUTH ERROR HANDLING
==================================================

INVALID_CREDENTIALS:

Never say:

"No account exists"

or:

"Email does not exist"

Use a neutral message such as:

"Email or password is incorrect."

TOO_MANY_ATTEMPTS:

Show:

"Too many attempts. Try again in N minutes."

ACCOUNT_NOT_ACTIVE:

Show a simple inactive/suspended message without exposing unnecessary details.

TOKEN_INVALID during 2FA:

Return the admin to the password screen.

Do NOT leave them stuck on the OTP page.

==================================================
11. SESSION MANAGEMENT
==================================================

Access token TTL:

15 minutes

Refresh token TTL:

30 days

Refresh endpoint:

/v1/auth/refresh

Sign out:

/v1/auth/sign-out

IMPORTANT:

Refresh on 401 must be SINGLE-FLIGHT.

If six API requests fail simultaneously:

DO NOT trigger six refresh calls.

Trigger ONE refresh request.

Queue/retry the pending requests after successful refresh.

If refresh fails:

clear session
clear protected state
redirect to login

Do not create infinite refresh loops.

Do not repeatedly redirect.

==================================================
12. SIGN OUT
==================================================

Sign-out must actually call the backend sign-out endpoint.

The UI should clearly communicate that sign-out ends the session on every device.

Do not label it:

"Sign out this browser"

because that is not how the backend works.

After successful sign-out:

- clear auth state
- clear protected cached data
- redirect to login
- prevent back-navigation into authenticated pages

If the user presses browser Back after logout:

they must NOT regain access to the protected dashboard.

==================================================
13. PERMISSION SYSTEM
==================================================

Create ONE central permission configuration.

Do not duplicate role logic across 30 components.

Permission levels:

super_admin
operations
clinical_governance
care_coordinator
finance
content

Build:

ROLE → NAVIGATION → ACTIONS

centrally.

The client-side role map controls visibility.

The server still controls actual access.

If the backend returns:

403 INSUFFICIENT_PERMISSION

show a proper permission state.

Do not crash.

Do not show a blank screen.

Do not expose the forbidden data.

==================================================
14. DASHBOARD
==================================================

Create a polished quality/governance dashboard where applicable.

Dashboard information can include:

- completed cases
- pending summaries
- red flags
- follow-up alerts
- complaints
- doctor reliability

Every dashboard tile that represents a queue MUST be clickable.

Do NOT create decorative statistic cards that do nothing.

Example:

Pending summaries
→ opens Pending Case Summaries

Safety alerts
→ opens Safety Alerts

Complaints
→ opens Feedback / Complaints

Doctor reliability
→ opens relevant provider/reliability view

Use clear cards with restrained styling.

==================================================
15. PROVIDERS / DOCTORS
==================================================

Provider management must support the documented flow.

Provider list:

- name
- specialty
- mobile
- registration number
- verification status
- listing status
- region
- languages
- seniority
- actions

Search must support:

name
mobile number
registration number

Verification statuses:

pending
under_review
verified
rejected
suspended

Filters should work.

Pagination should work if backend supports it.

Do not fake pagination if API does not support it.

==================================================
16. CREATE DOCTOR
==================================================

Create doctor form.

Fields can include:

mobileNumber
fullName
specialty
qualification
registrationNumber
yearsOfExperience
languages
payoutFeeInr
consultationDurationMinutes
buffer
other backend-supported fields

Mobile must follow E.164.

Do NOT blindly spread the entire form object into the request body.

Construct the API payload explicitly.

On success:

verificationStatus = pending

isListed = false

Doctor should land in the credential workflow.

==================================================
17. CREDENTIAL QUEUE
==================================================

Credential types:

degree_certificate
registration_certificate
identity_proof
address_proof
experience_letter
profile_photo
signature
other

Statuses:

pending
approved
rejected

Credential review:

Approve

Reject

If rejecting:

rejectionReason is REQUIRED.

Maximum:

255 characters.

The rejection reason is shown directly to the doctor.

Therefore the UI must clearly tell the admin:

"This message will be shown to the doctor."

Do not treat rejection reason as an internal note.

Keep Approve and Reject visually separate.

==================================================
18. DOCTOR VERIFICATION
==================================================

Clinical governance controls:

Verify
Reject
Reopen

Operations must NOT see the Verify action if they do not have permission.

Do not show:

disabled Verify button + tooltip

Instead:

hide the action entirely.

Rejected doctors must have a Reopen action.

==================================================
19. DOCTOR LISTING
==================================================

Listing is separate from verification.

A doctor must be verified before listing.

Use:

PATCH /v1/admin/doctors/:doctorId/listing

Do not allow listing before verification.

Clearly communicate:

Verification = clinical decision

Listing = operational decision

==================================================
20. DOCTOR PROFILE
==================================================

Provider detail page should include sections/tabs:

Overview
Credentials
Availability
Regions & Languages
Seniority
Commercials
Reliability

Reliability includes:

Acceptance rate
No-show rate
Case-summary completion

Keep read-only data visually distinct from editable data.

==================================================
21. AVAILABILITY
==================================================

Doctor availability editor must support:

weekly availability
blocked dates/windows
custom hours
slots

Weekly update replaces the whole pattern.

Therefore:

ALWAYS load the current weekly pattern first.

When saving:

send the COMPLETE weekly pattern.

Never send only changed fields if the API replaces the entire pattern.

Show actual resulting slots beside the editor.

Errors:

OVERLAPPING_AVAILABILITY
INVALID_TIME_RANGE
DATE_IN_THE_PAST

must appear as INLINE FIELD ERRORS.

Do not rely only on toast notifications.

==================================================
22. ALLOCATION / ASSIGNABILITY
==================================================

Create a dedicated assignability screen.

It should answer:

Who is assignable for:

- service
- language
- region
- time

and:

How much unbroken duration remains?

Do NOT build this as a simple modal.

It must be a real screen.

Provider selection must come from the assignability list.

Do NOT allow free-text doctor ID entry.

==================================================
23. CONSULTATIONS
==================================================

Consultation statuses:

pending_payment
scheduled
awaiting_doctor
in_progress
awaiting_documentation
completed
cancelled
no_show
expired

Consultation lookup is currently by ID/reference because the backend does not expose the required list endpoint.

Do NOT fake a patient-management table.

Patient data should remain consultation-centric.

==================================================
24. CONSULTATION DETAIL
==================================================

Use tabs:

Overview
Assignment
Evidence
Payment
Audit

Evidence may include:

offers
video/session
care-record
audit/consultation/:id

Each evidence source must respect permission.

Do not expose clinical records to unauthorized roles.

==================================================
25. PROVIDER OVERRIDE
==================================================

Flow:

1. Load assignability.
2. Show eligible providers.
3. Admin selects provider.
4. Admin provides reason.
5. Submit override.

Reason is REQUIRED.

Do not default the reason.

Do not use a free-text doctor ID.

==================================================
26. CANCELLATION
==================================================

Cancellation must require reason.

Before confirming cancellation:

show refund consequence.

If a refund is required:

Cancellation
→ Refund

Do not silently combine unrelated actions.

==================================================
27. GOVERNANCE DASHBOARD
==================================================

Quality dashboard:

Completed cases
Pending summaries
Red flags
Follow-up alerts
Complaints
Doctor reliability

Every card must navigate somewhere meaningful.

No decorative dashboard metrics.

==================================================
28. PENDING CASE SUMMARIES
==================================================

Show:

doctor
consultation
age
status
relevant timing

Sort oldest first.

The important metric is ageing, not just count.

==================================================
29. SAFETY ALERTS
==================================================

Alert types:

red_flag
amber
missed_checkin
medication_side_effect
followup_due

Actions:

Acknowledge

Close

Do NOT combine them into one button.

Acknowledge assigns responsibility.

Close requires:

whatWasDone

This screen should poll where appropriate instead of requiring manual refresh.

==================================================
30. CASE CLARIFICATION
==================================================

Cases are de-identified.

Never display re-identifying information.

Flow:

Open case
→ select appropriate expert
→ assign expert
→ close case

Expert seniority alone does not grant access.

Assignment grants access to that specific case.

==================================================
31. PAYMENTS
==================================================

Payment statuses:

created
pending
paid
failed
refunded

Payments screen:

- pending payouts
- refunds
- transaction/export functionality where supported

Important:

DO NOT label payout button:

"Pay"

Use:

"Record payout"

because the backend records a manually completed transfer.

==================================================
32. REFUNDS
==================================================

Refund requires:

amount
reason

Show frozen invoice figures.

Do NOT recalculate stored invoice totals in frontend.

Disable submit button while request is being processed.

Prevent double clicks.

Handle:

ALREADY_PAID
NOT_PAYABLE
NOT_REFUNDABLE

with clear messages.

==================================================
33. CONTENT / CATALOGUE
==================================================

Build:

Specialties
Concerns
Regions
Allocation Policy

Specialty:

- intake form
- prescription template
- registration form
- prescription eligibility information

Concern:

- match phrases
- weight

Region:

- region information
- provider assignment relationship

Allocation policy:

Operations can edit.

Language must never be relaxed.

Region may be relaxed depending on policy.

Show this invariant in the UI.

==================================================
34. CARE HUB
==================================================

States:

draft
in_review
published
archived

Flow:

Create/Edit
→ Submit
→ Review
→ Publish
→ Archive

Content admin can create/edit/submit.

Clinical governance controls publishing.

Content admin must NOT see Publish.

Do not simply disable it.

Hide unauthorized actions.

==================================================
35. NOTIFICATION TEMPLATES
==================================================

Show current notification wording.

Support:

view
edit
save
reset

Important product rule:

Notifications must NOT name a diagnosis.

Display this rule clearly beside the editor.

Reset restores shipped wording.

==================================================
36. SEARCH + CRISIS CONFIG
==================================================

Sections:

Crisis Keywords
Emergency Guidance
Synonyms
Popular Searches
Disclaimer

Crisis keyword list must NOT be allowed to save empty.

Clinical governance controls safety-critical configuration.

==================================================
37. FOLLOW-UP PATHWAYS
==================================================

Do NOT edit the live version directly.

Use:

duplicate current version
→ modify
→ publish new version

Show version history.

Newest version first.

==================================================
38. LEGAL DOCUMENTS
==================================================

Document types:

teleconsultation_consent
privacy_policy
terms_of_use
refund_policy
reconsult_policy
doctor_agreement

Use versioned publishing.

When publishing a new teleconsultation consent version:

confirmation must clearly explain that patients may be prompted again before their next consultation.

==================================================
39. SETTINGS
==================================================

Settings are dynamic.

Load:

GET /v1/admin/config

Render based on backend response.

Each setting includes:

purpose
expected shape
editable
managedBy

DO NOT hardcode settings locally.

If managedBy exists:

do not show another editor for that value.

Use the dedicated screen.

History should link to the audit log filtered to that setting.

==================================================
40. FEEDBACK + COMPLAINTS
==================================================

Complaint statuses:

open
in_progress
resolved
rejected

Categories:

consultation_quality
doctor_conduct
technical_issue
payment_issue
other

Flow:

Open
→ Assign
→ In Progress
→ Reply
→ Close

Assign should be the first action.

Replies have TWO audiences:

1. Patient-visible reply
2. Internal note

Make this distinction extremely obvious.

Never allow an internal note to accidentally become patient-visible.

Resolved and Rejected must remain separate actions.

Both require outcome notes.

==================================================
41. AUDIT LOG
==================================================

Audit actions:

create
read
update
delete
export
login
verify
webhook

Filters:

actor
entity
entity type
consultation
action
date range

The UI must clearly state:

"Showing records your role is permitted to read."

Do NOT imply that the displayed log is globally complete for every role.

Searching the audit log is itself audited.

Make that visible.

==================================================
42. DELETION REQUESTS
==================================================

Flow:

requested
→ in_review
→ approved
→ execute
→ executed

Rejected and failed are separate states.

Operations reviews.

super_admin executes.

Do NOT combine approval and destruction into one screen/action.

For destructive execution:

require typed confirmation.

==================================================
43. RETENTION
==================================================

Retention is super_admin only.

Before execution show:

current retention window
what is in scope
what will happen

Execution must require typed confirmation.

Do not make destructive actions one-click.

==================================================
44. ADMIN ACCOUNTS
==================================================

Current backend limitation:

There is an endpoint to create admin accounts, but no complete list/edit/suspend/password reset management endpoint.

DO NOT fake functionality.

If the screen cannot fully operate because the backend lacks the required endpoint:

show a clean "Not available in current backend" state or hide the screen depending on the final agreed navigation.

Do not create fake CRUD.

==================================================
45. PATIENT MANAGEMENT
==================================================

DO NOT create a generic Patients CRUD module.

The backend explicitly does not expose an admin/patients controller.

Patients are accessed through:

consultations
complaints
deletion requests
super_admin data export

Do not fake a patient list from consultation data.

==================================================
46. GAP HANDLING
==================================================

The user flow document contains backend gaps.

When backend support does not exist:

DO NOT invent an API.

DO NOT silently simulate success.

DO NOT use fake local persistence.

Show an honest unavailable state if necessary.

Use clear copy:

"This action is not available in the current backend."

Only implement it when the backend actually supports it.

==================================================
47. TABLE DESIGN
==================================================

Tables should be:

clean
spacious
readable
aligned
sortable where supported
filterable where supported
responsive within desktop constraints

Avoid overly dense enterprise tables.

Use:

- 14–15px body text
- clear row height
- subtle separators
- status pills
- compact action menus

Do not cram 10 actions into every row.

Use a kebab/action menu where appropriate.

==================================================
48. STATUS BADGES
==================================================

Create one reusable StatusBadge component.

Examples:

verified
approved
published
completed
paid

positive green treatment.

Pending/in-review:

soft neutral/green treatment.

Warning:

amber.

Rejected/cancelled/failed:

restrained red.

Do not create a different badge style on every page.

==================================================
49. BUTTON SYSTEM
==================================================

Create reusable button variants:

Primary
Secondary
Ghost
Danger
Success
Icon

Primary:

Sufi Green.

Hover:

slightly darker green.

Disabled:

clear muted state.

Loading:

show spinner + prevent double submission.

Every mutation button must have:

idle
loading
success/error

states where appropriate.

Never allow multiple submissions from repeated clicks.

==================================================
50. FORMS
==================================================

Every form needs:

- labels
- proper input types
- validation
- required states
- inline errors
- loading state
- success state
- API error handling
- dirty state where appropriate
- confirmation before destructive operations

Never rely only on placeholder text.

Never clear the form after a failed submission.

Do not lose user-entered data because of an API error.

==================================================
51. MODALS
==================================================

Use modals only where they make sense.

Do NOT use huge modal forms for complex workflows.

Complex flows should use full pages.

Modal requirements:

- centered
- max width
- correct z-index
- no background scroll
- ESC support where appropriate
- close button
- clicking outside behavior where safe
- focus management
- no overflow outside viewport

Destructive modals must have:

title
description
consequence
required confirmation/reason
Cancel
Confirm

==================================================
52. TOASTS
==================================================

Use toasts for:

successful saves
successful lightweight actions
non-blocking notifications

Do NOT use toast as the only validation mechanism.

For field-level errors:

show inline.

For serious API errors:

show contextual error state + request ID if available.

==================================================
53. ERROR HANDLING
==================================================

CRITICAL:

Branch on:

error.code

NOT:

error.message

The backend error code is the stable contract.

Never build logic like:

if (error.message.includes("permission"))

Instead:

if (error.code === "INSUFFICIENT_PERMISSION")

Handle every API failure gracefully.

No white screen.

No uncaught exceptions.

No React error overlay in production.

==================================================
54. REQUEST ID
==================================================

Every backend response may contain:

x-request-id

When an error occurs:

capture the request ID.

Show it in the detailed error state or expandable support information.

Example:

"Something went wrong. Please try again."

"Request ID: ABC123"

This helps connect frontend failures to backend logs.

==================================================
55. API REQUEST PAYLOADS
==================================================

NEVER do:

api.patch(url, formState)

when the backend expects a strict DTO.

Instead construct:

const payload = {
  fieldA: form.fieldA,
  fieldB: form.fieldB,
  ...
}

This prevents unknown fields from causing 400 errors.

==================================================
56. LOADING STATES
==================================================

Every async screen needs:

initial loading
empty state
success state
error state

Do NOT show a blank screen while loading.

Use subtle skeletons where appropriate.

Do not animate excessively.

==================================================
57. EMPTY STATES
==================================================

Every list needs a proper empty state.

Example:

"No pending credentials"

"No complaints found"

"No safety alerts"

"No providers match your filters"

Empty states should include:

icon
title
short explanation
optional action

Do not use giant illustrations.

==================================================
58. SEARCH
==================================================

Search inputs must actually connect to the supported query parameters.

Do not make fake search boxes.

Search behavior:

- debounce where appropriate
- preserve query
- show clear button
- handle empty query
- preserve filters
- handle loading
- handle no results

==================================================
59. FILTERS
==================================================

Filters must work with backend-supported parameters.

Do not create frontend-only filters that imply server filtering unless the data is actually available.

Make filter state URL-aware where appropriate.

Example:

?status=verified&search=abc

Back navigation should preserve useful filter state.

==================================================
60. ROUTING
==================================================

Create clean routes.

Every route must:

- render correctly
- have proper loading state
- handle missing data
- handle unauthorized state
- handle not found
- preserve browser navigation

Browser Back must work naturally.

Do NOT manually override browser history unless necessary.

Do not push duplicate history entries for the same screen.

If a modal is route-based, Back should close the modal before leaving the page.

==================================================
61. BACK BUTTON
==================================================

This is extremely important.

Every detail screen should have:

← Back

But do NOT blindly do:

navigate(-1)

if that can result in leaving the application.

Prefer a meaningful parent route.

Example:

Providers
→ Provider Details
→ Credentials

Back from Credentials:

Provider Details

Back from Provider Details:

Providers

If the user entered the page directly:

go to the correct parent module rather than sending them outside the app.

Never produce a blank route.

==================================================
62. URL STATE
==================================================

Where appropriate preserve:

search
filters
pagination
selected tab

Refreshing the page should not destroy important navigation state.

==================================================
63. ICONOGRAPHY
==================================================

Use one consistent icon system.

Icons must be:

- outline
- rounded
- simple
- lightweight

Do not mix random icon styles.

Avoid excessive icons.

Icons should support understanding, not decorate every sentence.

==================================================
64. BRAND PATTERN
==================================================

Use the CoraCure dotted pattern subtly.

Pattern rules:

- low contrast
- never behind important text
- never interfere with forms
- never become decorative noise
- use approved green/white versions
- keep scale consistent

Do not randomly rotate or distort the pattern.

==================================================
65. CARDS
==================================================

Cards should have:

- subtle radius
- minimal border/shadow
- clean whitespace

Avoid:

- giant floating cards everywhere
- excessive shadows
- glassmorphism
- gradients
- excessive borders

The admin panel should feel connected, not crowded.

==================================================
66. SPACING
==================================================

Use a consistent spacing scale.

Do not manually invent different margins on every component.

Suggested:

4
8
12
16
20
24
32
40
48

Use:

24–32px page padding
20–24px card padding
16px common form spacing

Keep alignment consistent.

==================================================
67. GRID ALIGNMENT
==================================================

All major screens should use a consistent content grid.

Page title aligns with content.

Tables align with page header.

Filters align with table.

Cards align with one another.

Buttons align consistently.

No random left offsets.

No components floating by arbitrary margins.

Avoid excessive empty space.

Avoid overcrowding.

==================================================
68. DASHBOARD CARD ALIGNMENT
==================================================

All metric cards must:

- have equal height
- align vertically
- have consistent padding
- use consistent icon placement
- have consistent number typography
- have consistent label hierarchy

Do not allow one card to become taller because of slightly longer text.

==================================================
69. TABLE ACTION ALIGNMENT
==================================================

Action columns should remain aligned.

Never let action buttons jump because of text length.

Use:

View
Edit
More

or an action menu.

==================================================
70. ACCESSIBILITY
==================================================

Implement:

- keyboard navigation
- visible focus states
- proper labels
- semantic buttons
- semantic inputs
- aria labels where required
- sufficient contrast
- no icon-only buttons without labels/tooltips

Do not use divs as buttons.

==================================================
71. PERFORMANCE
==================================================

Do not introduce unnecessary rerenders.

Avoid fetching the same data repeatedly.

Use caching where appropriate.

Do not fire duplicate API calls on mount.

Do not recreate large objects unnecessarily.

Lazy load heavy screens if the existing architecture supports it.

Do not sacrifice correctness for micro-optimizations.

==================================================
72. DATA FETCHING
==================================================

Every screen should have a predictable lifecycle:

mount
→ fetch
→ loading
→ success/error
→ mutation
→ refetch/update

Do not manually duplicate fetch logic across components.

Create reusable API hooks/services if the current architecture supports them.

==================================================
73. MUTATION SAFETY
==================================================

Every destructive mutation must:

1. Explain consequence.
2. Require confirmation.
3. Require reason where backend expects reason.
4. Disable submit while processing.
5. Handle success.
6. Handle failure.
7. Keep user context after failure.
8. Refresh affected data after success.
9. Update UI immediately only when safe.

==================================================
74. DELETE / DESTRUCTIVE ACTIONS
==================================================

Use special visual treatment for:

Delete
Suspend
Reject
Cancel
Execute retention
Execute deletion

Never use the same visual emphasis as a normal Save action.

==================================================
75. NOTIFICATION SYSTEM
==================================================

Create a consistent notification/toast system.

Success:

"Provider verified successfully."

Error:

"Unable to verify provider."

Permission:

"You do not have permission to perform this action."

Never expose raw backend stack traces.

==================================================
76. 403 HANDLING
==================================================

If API returns:

INSUFFICIENT_PERMISSION

do not crash.

Show:

"You don't have permission to perform this action."

If page-level:

show proper unauthorized state.

If action-level:

hide action when possible.

Server remains authoritative.

==================================================
77. 404 HANDLING
==================================================

If a resource no longer exists:

show:

"Provider not found"

or appropriate resource-specific message.

Provide:

Back to Providers

Do not leave the admin on a broken blank screen.

==================================================
78. NETWORK FAILURE
==================================================

If network fails:

show useful retry state.

Example:

"Unable to load providers."

[Retry]

Do not automatically spam retry requests.

==================================================
79. DATA REFRESH
==================================================

After mutation:

update/refetch the affected resource.

Example:

Verify provider
→ update verification status
→ provider list updates

Do not require the user to manually refresh the browser.

==================================================
80. DO NOT BREAK EXISTING WORK
==================================================

Before modifying a component:

understand its dependencies.

Before changing a shared component:

find all usages.

Before changing routing:

check all route references.

Before changing API client:

check every consumer.

Before changing auth:

test login, refresh, logout, 401, 403, and protected routes.

DO NOT make a local fix that breaks another screen.

==================================================
81. NO HARDCODED FAKE SUCCESS
==================================================

Never do:

setTimeout(() => {
  setSuccess(true)
}, 1000)

to pretend an API succeeded.

Success must come from actual API response.

If the backend is unavailable:

show a proper unavailable/error state.

==================================================
82. NO MOCK DATA IN PRODUCTION UI
==================================================

If mock data already exists for development, clearly isolate it.

Do not accidentally ship fake doctors, fake payments, fake complaints, fake consultations, or fake audit records as if they were real.

==================================================
83. DATA PRIVACY
==================================================

This panel reads clinical records.

Never display more information than the role is allowed to see.

Never expose patient information in:

- URLs unnecessarily
- logs
- console
- error messages
- client-side debug output

Do not show re-identifying data in de-identified case clarification.

==================================================
84. CONSOLE CLEANUP
==================================================

Before finishing:

remove:

console.log
debugger
temporary alerts
development placeholders
fake TODO buttons

unless a logging mechanism is intentionally part of the application.

No uncaught promise errors.

No React warnings.

No missing key warnings.

No invalid DOM nesting.

==================================================
85. VISUAL QA
==================================================

After implementation, inspect every major screen.

Check:

- alignment
- spacing
- typography
- colors
- button states
- hover states
- focus states
- loading
- empty
- error
- permission
- responsive behavior
- scrolling
- sticky elements
- modals
- tables
- forms
- long text
- pagination
- navigation
- back button

Fix visual inconsistencies.

==================================================
86. FUNCTIONAL QA
==================================================

Test at minimum:

LOGIN
2FA
WRONG PASSWORD
RATE LIMIT
SUSPENDED ACCOUNT
TOKEN EXPIRY
TOKEN REFRESH
LOGOUT
BACK AFTER LOGOUT
403
404
NETWORK ERROR

PROVIDERS
CREATE
SEARCH
FILTER
DETAIL
CREDENTIALS
APPROVE
REJECT
VERIFY
REOPEN
LIST
SUSPEND
REINSTATE
REGIONS
LANGUAGES
SENIORITY
RELIABILITY

AVAILABILITY
WEEKLY
BLOCK
CUSTOM HOURS
INVALID TIME
OVERLAP

CONSULTATION
LOOKUP
EVIDENCE
OVERRIDE
CANCEL

GOVERNANCE
DASHBOARD
SUMMARIES
SAFETY ALERTS
ACKNOWLEDGE
CLOSE
CLARIFICATION

PAYMENTS
REFUND
PAYOUT
EXPORT

CONTENT
CATALOGUE
CARE HUB
NOTIFICATIONS
SEARCH CONFIG
FOLLOW-UP
LEGAL

COMPLAINTS
ASSIGN
PATIENT REPLY
INTERNAL NOTE
RESOLVE
REJECT

COMPLIANCE
AUDIT
DELETION
RETENTION

SETTINGS
DYNAMIC CONFIG

==================================================
87. FINAL BUILD VALIDATION
==================================================

Before saying the work is complete:

Run the project.

Run the existing tests.

Run lint.

Run type checking.

Run production build.

Fix all errors.

Fix all warnings that are caused by your changes.

Verify every route.

Verify every import.

Verify every API call.

Verify every button.

Verify every form.

Verify every navigation item.

Verify browser Back.

Verify browser Refresh.

Verify direct URL access.

Verify logout.

Verify expired sessions.

Verify permissions.

Verify loading states.

Verify empty states.

Verify errors.

Verify responsive behavior.

==================================================
88. DESIGN QUALITY BAR
==================================================

The final result should look like a real production healthcare administration platform.

NOT:

a generic template
a random dashboard
a Dribbble concept
a landing page
a huge card-based UI
a glassmorphism dashboard
a colorful SaaS template

Instead:

clean
calm
clinical
human
professional
structured
spacious
efficient
brand-consistent

The interface should make an admin feel:

"I can understand where I am."
"I know what I can do."
"I know what will happen when I click this."
"I can recover if something goes wrong."

==================================================
89. IMPORTANT BRAND RULES
==================================================

Do NOT:

- use excessive gradients
- use neon colors
- use excessive shadows
- use random illustrations
- use unrelated stock imagery inside the admin UI
- use multiple visual styles
- distort the CoraCure logo
- rotate the logo
- add outlines to the logo
- add shadows to the logo
- change brand colors
- stretch the logo
- crowd the interface
- put decorative elements behind critical data
- make every section a floating card

Use the approved CoraCure logo correctly.

==================================================
90. FINAL ARCHITECTURE RULE
==================================================

Keep the code maintainable.

Create reusable components for:

AdminLayout
Sidebar
Header
PageHeader
Breadcrumbs
Button
Input
Select
DatePicker
Modal
Drawer
Table
Pagination
StatusBadge
EmptyState
ErrorState
LoadingState
ConfirmDialog
Toast
PermissionGate
RoleGuard
ProtectedRoute

Create reusable hooks/services for:

authentication
permissions
API requests
refresh handling
notifications
navigation

Do not duplicate logic.

==================================================
91. CENTRAL ROLE MAP
==================================================

Create ONE central configuration such as:

roleNavigation.ts

and/or

permissions.ts

It should define:

role
→ accessible modules
→ accessible actions

The UI reads from this.

The backend remains authoritative.

==================================================
92. FINAL REQUIREMENT — NOTHING SHOULD BREAK
==================================================

This is the most important instruction.

When implementing new UI:

DO NOT break existing functionality.

When changing styling:

DO NOT change business logic.

When changing routing:

DO NOT break API state.

When changing components:

DO NOT break other screens.

When fixing one bug:

DO NOT introduce another.

Before finishing, compare the application against the existing implementation and ensure all previously working flows still work.

If something is uncertain:

inspect the existing code first.

Do not guess.

If backend support is missing:

do not invent it.

If an existing implementation is correct:

keep it.

If a visual implementation is poor:

improve only the UI layer while preserving behavior.

==================================================
93. FINAL DELIVERABLE
==================================================

Deliver a complete, polished, production-ready CoraCure Admin Panel.

The final UI must have:

✓ Correct CoraCure branding
✓ Correct typography
✓ Correct colors
✓ Consistent spacing
✓ Correct sidebar
✓ Correct header
✓ Permission-aware navigation
✓ Working authentication
✓ Working 2FA
✓ Working session refresh
✓ Working logout
✓ Working provider management
✓ Working credential workflow
✓ Working verification workflow
✓ Working availability
✓ Working allocation
✓ Working consultation flows supported by backend
✓ Working governance
✓ Working safety alerts
✓ Working complaints
✓ Working payments
✓ Working content management
✓ Working settings
✓ Working audit
✓ Working compliance
✓ Proper loading states
✓ Proper empty states
✓ Proper error states
✓ Proper permission states
✓ Proper confirmation dialogs
✓ Proper inline validation
✓ Proper back navigation
✓ No broken routes
✓ No dead buttons
✓ No fake API success
✓ No console errors
✓ No TypeScript errors
✓ No build errors
✓ No accidental backend changes
✓ No broken existing functionality

MOST IMPORTANT:

DO NOT STOP AFTER MAKING THE UI LOOK GOOD.

FUNCTIONALITY AND VISUAL QUALITY ARE EQUALLY IMPORTANT.

BUILD IT → TEST IT → FIND BUGS → FIX THEM → TEST AGAIN → THEN FINALIZE.