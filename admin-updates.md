Implement a complete, reusable and production-ready skeleton-loading system across all CoraCure products:

1. CoraCure Patient mobile app
2. CoraCure Doctor mobile app
3. CoraCure Admin web portal

Add skeleton loaders to every screen that displays data fetched asynchronously. Each skeleton must match the final screen’s actual layout, dimensions, spacing, cards, lists and information hierarchy.

Do not use one generic full-page skeleton everywhere. Build screen-specific skeleton compositions that visually resemble the real UI.

The purpose is to:

- Give immediate visual feedback
- Prevent blank screens
- Prevent layout shifts
- Make slower requests feel faster
- Preserve the final screen structure while data loads
- Keep the experience calm and professional
- Avoid showing misleading placeholder text
- Avoid blocking parts of the interface that are already usable

## Core loading rule

Use a skeleton only when the interface structure is known but its content has not loaded.

Use:

- Skeletons for initial page data
- Inline skeletons for individual cards or panels
- Row skeletons for lists and tables
- Chart skeletons for analytics
- Avatar skeletons for profile images
- Document skeletons for reports and uploaded files
- Button spinners for a user-triggered action
- Progress indicators for file upload or download
- Empty states only when loading has completed successfully and no records exist
- Error states only when a request has failed
- Refresh indicators when previously loaded content is being updated

Do not confuse:

- Loading
- Empty
- Error
- Offline
- Permission denied
- Not assigned
- No search results

Each state must have its own presentation.

## General skeleton design system

Create shared reusable skeleton primitives:

- `SkeletonBlock`
- `SkeletonText`
- `SkeletonHeading`
- `SkeletonAvatar`
- `SkeletonIcon`
- `SkeletonButton`
- `SkeletonChip`
- `SkeletonCard`
- `SkeletonListRow`
- `SkeletonTableRow`
- `SkeletonChart`
- `SkeletonDocument`
- `SkeletonImage`
- `SkeletonCalendar`
- `SkeletonMessage`
- `SkeletonForm`
- `SkeletonMetric`
- `SkeletonTimeline`

Use these primitives to build screen-specific skeleton components.

Suggested component naming:

- `DashboardSkeleton`
- `AppointmentsSkeleton`
- `AppointmentDetailSkeleton`
- `ConsultationSkeleton`
- `PatientProfileSkeleton`
- `DocumentListSkeleton`
- `FollowUpSkeleton`
- `CaseListSkeleton`
- `ChatListSkeleton`
- `ChatThreadSkeleton`
- `EarningsSkeleton`
- `AdminDashboardSkeleton`
- `AdminTableSkeleton`
- `AdminDetailSkeleton`

Do not duplicate the same skeleton markup independently across multiple screens.

## CoraCure skeleton colours

Use a calm light skeleton system that matches the existing brand.

Base background:

- White: `#FFFFFF`
- Page background: existing screen background

Skeleton base:

- Soft neutral mint-grey: `#EAF2EF`
- Alternative base: `#EDF3F1`

Skeleton highlight:

- Pale mint: `#F5FAF8`
- Soft white-mint: `#F8FCFA`

Border:

- `rgba(14, 118, 108, 0.08–0.12)`

Do not use:

- Dark grey placeholders
- High-contrast flashing shimmer
- Bright Paris Green across large skeleton surfaces
- Red or amber in skeleton loaders
- Gradients unrelated to the shimmer animation
- Heavy shadows
- Multiple skeleton colours suggesting real statuses

Skeletons represent unknown content. They must not suggest that an unknown appointment is confirmed, cancelled, urgent, paid, high-risk or completed.

## Skeleton shape and styling

Recommended skeleton primitive:

```css
.skeleton {
  position: relative;
  overflow: hidden;
  background: #eaf2ef;
  border-radius: 8px;
}

.skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.55) 50%,
    transparent 100%
  );
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}
```

Use:

- `4px–6px` radius for short text lines
- `8px–12px` radius for images, buttons and fields
- `50%` radius for avatars
- The same card radius as the final component
- The same width and height as the final content area

Do not make every skeleton a pill. Match the final element’s actual geometry.

## Animation

Use one restrained shimmer animation:

- Duration: `1.3s–1.6s`
- Timing: `ease-in-out`
- Direction: left to right
- No bouncing
- No pulsing at high contrast
- No independent animation timing for every small element
- Keep all skeletons on a screen visually synchronised

For users with reduced-motion enabled:

```css
@media (prefers-reduced-motion: reduce) {
  .skeleton::after {
    animation: none;
  }
}
```

When animation is disabled, show a static skeleton base.

## Timing behaviour

Avoid skeleton flicker on fast requests.

Use the following behaviour:

- Do not display a skeleton immediately for requests completing in under approximately `150ms`
- Show the skeleton if loading continues beyond `150ms–250ms`
- Once shown, keep it visible for a minimum of approximately `300ms`
- Transition from skeleton to real content with a subtle `120ms–180ms` opacity change
- Do not delay real content unnecessarily to complete an animation
- Do not show a full-page skeleton during a small background refresh
- Keep existing data visible while refreshing
- Use stale-while-revalidate behaviour where appropriate

Do not show skeletons indefinitely.

Suggested timeout handling:

- After a reasonable delay, provide a loading message or retry path
- If offline, replace the skeleton with an offline state
- If the request fails, replace the skeleton with an error state and retry button
- Never leave the user looking at an endless shimmer

## Layout-shift prevention

The skeleton must reserve the exact approximate space required by the final content.

Requirements:

- Match the expected card height
- Match avatar dimensions
- Match image aspect ratios
- Match the number of visible list rows
- Match chart height
- Match table column widths
- Match button dimensions
- Match line lengths to expected text hierarchy
- Keep the final content container mounted where possible
- Avoid replacing a small skeleton with a much taller final card
- Do not hardcode unrealistic heights that cause large jumps

Use representative text line widths:

- Primary heading line: `55%–75%`
- Secondary line: `35%–60%`
- Body line 1: `80%–95%`
- Body line 2: `60%–85%`
- Metadata line: `25%–45%`

Vary text-line widths slightly. Do not make every line identical.

## Mobile-safe behaviour

For Patient and Doctor apps:

- Respect top and bottom safe-area insets
- Keep skeletons inside the same mobile content container as the final UI
- Do not allow horizontal overflow
- Do not cover fixed bottom navigation
- Do not animate beneath the bottom navigation
- Keep touchable navigation functional when appropriate
- Preserve the final screen’s scrolling behaviour
- Keep skeleton card padding consistent with the real cards
- Do not show desktop-style dense loading layouts on mobile
- Use approximately three to five placeholder rows rather than filling the entire scroll area with dozens of items

The fixed bottom navigation should normally remain real and interactive, not become a skeleton.

The page header should remain real when its content is static. Skeletonise only dynamic header details such as:

- Patient name
- Doctor name
- Profile image
- Appointment status
- Notification count
- Availability data

Do not skeletonise:

- Back button
- Menu button
- Static page title
- Bottom navigation
- Static logo
- Static tabs, unless tabs themselves are server-configured

## PATIENT APP SKELETONS

### Patient home/dashboard

Match the final dashboard structure.

Show:

- Small greeting-line skeleton
- Profile-avatar skeleton if the avatar is remote
- Main upcoming-appointment card skeleton
- Doctor-avatar skeleton
- Doctor-name line
- Specialty line
- Appointment date and time lines
- Consultation-type chip
- Primary action button placeholder
- Care-plan summary card skeleton
- Follow-up/check-in card skeleton
- Recommended resource skeletons
- Two or three compact supporting cards

Keep section headings real if they are static.

Do not show fake appointment statuses or risk colours.

### Find a doctor

Show:

- Real search field if immediately usable
- Real filter button
- Filter-chip placeholders only if filters are server-provided
- Four doctor-card skeletons

Each doctor-card skeleton should match:

- Doctor avatar or image
- Doctor name
- Specialty
- Qualifications line
- Experience line
- Languages
- Consultation fee
- Availability line
- Two action buttons

Maintain the final doctor-card height and spacing.

### Doctor search results

Use three to five repeated doctor-card skeletons.

Do not show:

- Fake prices
- Fake ratings
- Fake availability
- Fake verified status

Only show neutral blocks in their expected positions.

### Doctor profile

Show:

- Large profile-image skeleton
- Name line
- Specialty line
- Verified-badge placeholder
- Experience metric
- Qualification lines
- Language chips
- About-doctor text lines
- Consultation-mode cards
- Fee line
- Availability-calendar skeleton
- Primary booking-button skeleton

The skeleton should follow the exact final profile layout.

### Appointment booking

Keep the booking stepper and static labels visible.

Skeletonise:

- Selected doctor information
- Availability calendar
- Date chips
- Time-slot grid
- Consultation fee summary
- Any dynamically fetched service information

Time-slot skeletons should match the real slot buttons in size and wrapping.

Do not let the skeleton imply that a slot is selected.

### Payment screen

Do not replace the entire payment screen with a skeleton if payment controls can already render.

Skeletonise only:

- Appointment summary
- Fee breakdown
- Taxes or convenience-fee values
- Coupon eligibility
- Final total

Keep secure-payment messaging and payment controls real when ready.

For a user-triggered payment action:

- Disable the submit button
- Show a button spinner
- Change the label to “Processing payment…”
- Prevent repeated submissions
- Do not show a full-page skeleton

### Upcoming appointments

Show three appointment-card skeletons matching:

- Time
- Doctor avatar
- Doctor name
- Specialty
- Consultation type
- Status position
- Join or details button

Do not render coloured status chips during loading.

### Appointment history

Show four compact history-card skeletons matching the final row layout.

Reserve space for:

- Doctor
- Date
- Consultation type
- Status
- Details action

### Appointment details and pre-consultation

Show:

- Appointment identity card
- Doctor summary
- Date/time/type placeholders
- Concern or reason block
- Intake-response lines
- Consent block
- Uploaded-document thumbnails
- Payment-summary block
- Primary join-button placeholder

The skeleton must not resemble a completed consent or successful payment state.

### Patient intake and health profile

Keep static form labels visible where possible.

Skeletonise:

- Previously saved values
- Dynamic specialty questions
- Loaded medication list
- Allergy list
- Medical-history entries
- Uploaded file previews

For new forms with no remote data, do not use a skeleton. Render empty form fields immediately.

### Care plan

Show:

- Care-plan heading and status placeholder
- Doctor information
- Treatment or instruction lines
- Medication cards
- Follow-up-date block
- Recommended-resource cards
- Safety-information block
- Check-in schedule

Do not display medication-shaped placeholders in notifications or outside authorised screens.

### Daily check-in

If the question set is loading, show:

- Progress indicator placeholder
- Question-heading line
- Two or three response-option placeholders
- Next-button placeholder

Once loaded, remove the skeleton for the entire questionnaire at once to avoid individual questions jumping.

### Follow-up history

Show:

- Seven compact day indicators
- Current-status block
- Trend-chart skeleton
- Response-history rows
- Doctor recommendation block

The loading state must remain neutral and must not use red, amber or green status colours.

### Documents and reports

Show:

- Three to five file-row skeletons
- File-type icon placeholder
- File-name line
- Upload-date line
- Source line
- Open/download action placeholder

For document thumbnails:

- Use the same aspect ratio as the final preview
- Do not show fake medical images
- Use neutral document blocks only

### Report requests

Show:

- Report-request title
- Requesting-doctor line
- Requested-item line
- Reason lines
- Date
- Status-position placeholder
- Upload-action placeholder

Do not imply fulfilled, open or cancelled status during loading.

### Prescriptions

Show:

- Prescription-header skeleton
- Doctor information
- Date and consultation ID
- Three medication-row skeletons
- Dosage, frequency and duration blocks
- Advice lines
- Download-button placeholder

Never display invented medication names.

### Chat list

Show approximately five chat-row skeletons.

Each row should contain:

- Circular avatar
- Name line
- Last-message line
- Timestamp block
- Optional unread-badge placeholder only as a neutral circle

Do not show fake message previews.

### Chat conversation

Keep the static header and back button real.

Show:

- Three incoming-message skeleton bubbles
- Two outgoing-message skeleton bubbles
- Vary bubble widths realistically
- Preserve left and right alignment
- Keep the message composer visible but disabled until the conversation is ready, if required

Do not display shimmer continuously behind an active chat after existing messages are available.

For loading older messages, show a compact loader at the top rather than replacing the entire conversation.

### Notifications

Show five notification-row skeletons with:

- Icon container
- Title line
- Short message line
- Timestamp block

Do not use diagnosis-shaped or red-alert placeholders in the notification loading state.

### Patient profile

Show:

- Avatar
- Name
- Patient ID line
- Personal-details rows
- Language chips
- Health-profile completion block
- Emergency-contact rows
- Edit-button placeholder where appropriate

### Reviews and feedback

Show:

- Rating-summary skeleton
- Rating distribution bars
- Three review-row skeletons
- Reviewer avatar
- Review lines
- Date placeholder

Do not show fake star ratings as filled stars. Use neutral blocks.

## DOCTOR APP SKELETONS

### Doctor dashboard

Match the current dashboard layout.

Show:

- Doctor-avatar skeleton
- Greeting and specialty lines
- Availability-control placeholder only if availability is being fetched
- Today’s summary metric skeletons
- Next-appointment card
- Pending-clinical-task rows
- Follow-up-alert rows
- Earnings-summary block
- Feedback-summary block

Keep the page title and bottom navigation real.

Summary-card skeletons must maintain the same final heights.

Do not display fake counts.

### Appointment list

Show approximately five appointment rows matching:

- Time column
- Patient-initial/avatar block
- Patient-name line
- Age/gender line
- Consultation-type line
- Status position
- Payment position
- Action button

Do not use confirmed, completed, cancelled or no-show colours while loading.

Keep static tabs such as Today, Upcoming and Past visible and interactive when possible.

### Appointment detail and pre-consultation review

Show:

- Patient-identity card
- Patient avatar
- Patient name, age and gender
- Patient ID
- Appointment ID
- Date and time
- Consultation type
- Status position
- Presenting-concern block
- Intake-summary rows
- Uploaded-report thumbnails
- Consent block
- Past-consultation row
- Payment-information block
- Join-button placeholder

The skeleton must not imply valid consent, payment success or join eligibility.

### Instant consultation request

Do not use a skeleton for an active timed request because the response countdown is safety- and workflow-critical.

If preliminary data is loading before the request can be shown:

- Keep a small contained loading state
- Do not start the countdown until the request is fully available
- Do not show Accept or Decline until they are actionable

During acceptance:

- Disable both actions
- Show a spinner inside the selected action
- Prevent duplicate acceptance
- Preserve the countdown state according to backend rules

### Consultation room

Do not cover an active video or audio connection with a full-page skeleton.

Before the consultation connects, show:

- Video-area placeholder
- Patient-name placeholder
- Connection-state loader
- Compact patient-summary skeleton
- Presenting-concern skeleton
- Quick-clinical-action placeholders

Keep call controls visible only when functional.

Use a clear connection state such as:

- Connecting
- Reconnecting
- Connection failed

Do not use an indefinite shimmer for network connection status.

### Clinical notes and diagnosis

If loading an existing draft:

- Show patient-summary skeleton
- Field-content skeletons inside the actual form sections
- Vitals-row skeletons
- Medication/advice-summary skeleton
- Follow-up recommendation skeleton

Keep field labels visible.

For a new note with no saved data, show the empty form immediately. Do not use a skeleton.

### E-prescription

If loading a prescription draft or template:

- Patient-summary skeleton
- Three medication-card skeletons
- Advice-summary lines
- Warning-sign lines
- PDF-preview block
- Finalise-button placeholder

Do not show invented medicine names or dosages.

If only one medication is being added, use a small inline loader in that area instead of skeletonising the full prescription.

### Prescription templates

Show four template-card skeletons matching:

- Icon
- Template title
- Specialty line
- Description
- Medicine count
- Notes count
- Edit, duplicate and delete action positions

Keep the search bar and static category filters visible.

Do not show destructive buttons as active until the template record is loaded.

### Follow-up pathway assignment

Show:

- Patient-summary skeleton
- Pathway-option skeletons
- Review-date field placeholder
- Duration selector placeholders
- Care Hub recommendation block
- Save-plan button placeholder

Do not imply that a clinical pathway has already been selected.

### Follow-up alert worklist

Show:

- Alert-filter chip placeholders only if filter counts are dynamic
- Four alert-card skeletons
- Patient avatar
- Patient-name line
- Reason line
- Latest-check-in block
- Timestamp
- Acknowledge-button placeholder
- Open-button placeholder

Do not use red or amber skeleton styling.

Once data loads, apply genuine alert colours based on the response.

### Patient follow-up detail

Show:

- Patient-summary card
- Pathway label
- Day position
- Assigned-doctor line
- Latest-check-in block
- Seven-day history indicators
- Trend-chart skeleton
- Triggering-response rows
- Doctor-note field placeholder
- Recommended-action placeholders
- Bottom action bar placeholder

Do not make the skeleton look like a safety concern has been resolved.

### Care Hub recommendation

Show:

- Static page title
- Filter-chip skeletons if data-driven
- Tab structure
- Six resource-card skeletons
- Icon
- Title
- Description lines
- Selection-position circle
- Selected-items row placeholder
- Note-field placeholder
- Save-button placeholder

Do not show resources as selected while loading.

### Cases list

Show four case-row or case-card skeletons matching:

- Case ID
- Patient or de-identified-case label
- Date
- Specialty/category
- Documentation status position
- Action

Keep static filters visible.

### De-identified clarification case

If loading a draft:

- Section labels remain visible
- Skeletonise saved field values
- Attachment rows
- Urgency position
- Draft status
- Save and post action placeholders

For a new clarification case, render the empty form immediately.

Do not show any patient identifier in skeleton labels.

### Clarification thread

Show:

- Case-summary skeleton
- Status timeline placeholders
- Three discussion-message skeletons
- Expert avatar or initials placeholder
- Timestamp positions
- Reply-field placeholder

Differentiate treating-doctor and expert message alignment without displaying fake content.

### Expert case worklist

Show:

- Filter placeholders
- Four assigned-case skeletons
- De-identified title line
- Age/gender line
- Specialty/category
- Urgency position
- Status position
- Open action

Do not expose or simulate patient identifiers.

### Expert response screen

Show:

- De-identified-case summary
- History lines
- Current-plan lines
- Specific-doubt block
- Attachment placeholders
- Response-form saved content if loading a draft
- Action-button placeholders

### Documents

Show:

- Patient-summary skeleton
- Search/filter controls if dynamic
- Four document rows
- File icon
- Document title
- File type
- Upload date
- Consultation context
- View/download action

### Report requests

Show:

- Patient summary
- Request type
- Reason
- Consultation ID
- Raised date
- Status position
- Uploaded document area
- Cancel action position

### Earnings

Show:

- Earnings-total metric
- Daily, weekly and monthly tab content
- Chart skeleton
- Transaction rows
- Consultation ID
- Date
- Gross amount position
- Platform deduction position
- Doctor earning position
- Payout-status position

Use neutral skeletons. Do not display fake currency values.

### Doctor profile

Show:

- Profile image
- Name and specialty
- Verification status position
- Profile-completion block
- Qualifications
- Languages
- Clinic information
- Consultation fees
- Availability summary
- Reviews
- Edit-action positions

Do not show an approved or rejected verification state while loading.

### Doctor registration and verification

Do not show skeletons for completely new form fields.

Use skeletons only when:

- Restoring saved application data
- Loading dropdown options
- Loading uploaded-document metadata
- Loading saved qualifications
- Loading experience records
- Loading verification status

Dropdown option loading should appear inside the dropdown panel rather than skeletonising the entire screen.

File upload should use progress states, not shimmer skeletons.

## ADMIN PORTAL SKELETONS

The Admin portal uses wider desktop layouts, data tables, metrics, filters and side navigation.

Keep the following real whenever static:

- Sidebar
- Logo
- Main navigation
- Page title
- Breadcrumbs
- Static tabs
- Search fields
- Filter controls
- Column headers, when already known

Skeletonise only the dynamic content.

### Admin dashboard

Show:

- Four to six metric-card skeletons
- Main chart skeleton
- Secondary-chart skeleton
- Recent activity rows
- Pending verification rows
- Alert summary
- Appointment summary
- Payment summary

Metric skeletons should contain:

- Small label line
- Large value block
- Compact change-indicator position
- Optional icon placeholder

Do not show fake trends or percentages.

### Admin data tables

Build a reusable table skeleton.

Match:

- Actual column count
- Actual column widths
- Row height
- Avatar placement
- Chip/status placement
- Action-menu position
- Checkbox position
- Pagination area

Show approximately:

- Five rows for short tables
- Eight to ten rows for full-page tables

Do not use one full-width block for every table cell. Match the expected content type.

Examples:

- Avatar columns use circular skeletons
- ID columns use short text blocks
- Name columns use medium text blocks
- Email columns use longer text blocks
- Status columns use compact neutral pills
- Date columns use medium blocks
- Action columns use circular or square menu placeholders

Keep table headers visible unless column configuration itself is loading.

### Doctor verification queue

Show:

- Doctor avatar
- Doctor name
- Specialty
- Registration number position
- Submitted date
- Document-count position
- Verification-stage position
- Review action

Do not show approved, rejected or pending colours during loading.

### Doctor verification detail

Show:

- Doctor profile-summary skeleton
- Basic-detail rows
- Identity-document cards
- Qualification cards
- Experience cards
- Employment-proof rows
- Verification timeline
- Review-note area
- Approve/reject action positions

Do not enable approval or rejection until all necessary data and documents have loaded successfully.

If a specific document is still loading, show a local document-preview skeleton rather than blocking the entire page.

### Patient management

Show:

- Patient avatar or initials
- Patient ID
- Name
- Registration date
- Appointment count position
- Account-status position
- View action

Do not display health information unnecessarily in list skeletons.

### Appointment management

Show:

- Appointment ID
- Patient
- Doctor
- Date and time
- Consultation type
- Booking status position
- Payment status position
- Action

### Consultation and case management

Show:

- Case or consultation ID
- Assigned clinician
- Patient/de-identified label
- Date
- Current stage
- Documentation status
- Action

### Instant-consult monitoring

Show:

- Request ID
- Request time
- Patient position
- Routed-doctor position
- Response-time position
- Current-state position

Do not display fake live countdown values.

If live data is reconnecting, retain the last available state and display a small reconnecting indicator.

### Follow-up and safety-alert administration

Show:

- Alert ID
- Assigned doctor
- Patient ID position
- Alert category position
- Triggered time
- Action state
- Audit status

Loading skeletons must not use red or amber.

### Clarification-case administration

Show:

- Case ID
- Treating doctor
- Assigned expert
- Submitted date
- Status position
- Last activity
- Action

### Document management

Show:

- Document icon
- File name
- File type
- Source
- Patient/consultation reference position
- Uploaded date
- Scan or validation status position
- Action

### Payment and transaction management

Show:

- Transaction ID
- Appointment ID
- Patient position
- Doctor position
- Gross amount position
- Fees position
- Tax position
- Doctor earning position
- Gateway-status position
- Transaction date
- Action

Do not display invented currency values.

### Payout management

Show:

- Doctor
- Payout period
- Consultation count position
- Payable amount position
- Payout state position
- Processed date
- Action

### Content and Care Hub management

Show:

- Content-thumbnail skeleton
- Title
- Category
- Specialty
- Publication status position
- Updated date
- Author
- Action

### Reports and analytics

Show:

- Metric cards
- Filter bar
- Date-range position
- Main chart
- Legend positions
- Secondary charts
- Table rows

Charts must have screen-specific skeletons:

- Bar chart: neutral vertical bars of varied heights
- Line chart: muted chart-area block with axis placeholders
- Donut chart: neutral circular ring
- Trend cards: value block plus small chart area

Do not animate individual bars separately.

### Audit logs

Show:

- Timestamp
- User or actor
- Role
- Action
- Resource ID
- Result position
- Details action

### Admin detail drawers and modals

When a detail drawer is loading:

- Keep the drawer shell, title and close button real
- Show skeletons only inside the content area
- Do not skeletonise the entire background page
- Prevent layout changes when content appears
- Keep the close action functional
- Use local error and retry states

## Partial and background loading

When a screen already has data:

- Do not replace it with a full skeleton during refresh
- Keep current data visible
- Show a small refresh indicator
- Dim only the component being refreshed if necessary
- Replace only newly requested areas with local skeletons
- Preserve scroll position
- Preserve entered form data
- Preserve expanded accordion state
- Preserve selected filters
- Preserve tab position

Examples:

- Loading the next page of appointments: show two row skeletons at the bottom
- Loading older chat messages: show a compact top loader
- Loading more documents: show document-row skeletons below current files
- Refreshing a chart: keep its dimensions and show a local chart overlay
- Switching tabs: skeletonise only the tab panel

## Pagination and infinite scrolling

For infinite lists:

- Render two or three new skeleton rows at the bottom
- Do not clear existing rows
- Avoid triggering repeated requests
- Stop skeletons when no more data exists
- Provide a retry state if the next page fails

For numbered pagination:

- Keep table headers and pagination controls stable
- Skeletonise only the table body
- Preserve the selected page indicator

## Forms and user-triggered actions

Do not use page skeletons for:

- Saving a form
- Updating a profile
- Submitting clinical notes
- Accepting an appointment
- Marking an alert reviewed
- Approving a doctor
- Cancelling a request
- Sending a chat message
- Finalising a prescription

Use:

- Button spinner
- Disabled state
- Clear action label
- Inline success or error feedback
- Optimistic UI only where safe
- Protection against duplicate submission

Clinical and financial actions must not appear complete before the backend confirms success.

## Upload states

For uploads, use a dedicated progress component:

- File name
- File type
- File size
- Progress bar
- Percentage where useful
- Cancel or retry action
- Uploading, processing, uploaded or failed state

Do not replace upload progress with a shimmer skeleton.

For document processing after upload:

- Keep the file row visible
- Show “Processing”
- Do not mark the report request fulfilled until the valid file record exists

## Error replacement

Every skeleton must have a defined failure state.

On failure:

- Stop shimmer
- Replace the affected skeleton with a local error panel
- Use concise wording
- Provide Retry
- Preserve unaffected content
- Do not reload the entire application unless necessary

Example:

- “We couldn’t load this section.”
- “Try again”

For permission errors:

- Do not show Retry if retrying cannot resolve the problem
- Show an authorised access message

For offline state:

- Retain cached data where available
- Show an offline banner
- Provide Retry after connectivity returns

## Accessibility

Skeleton loaders must be accessible.

Requirements:

- Mark the loading region with `aria-busy="true"`
- Remove `aria-busy` when complete
- Use a concise accessible label such as “Loading appointments”
- Skeleton shapes must use `aria-hidden="true"`
- Do not let screen readers announce each skeleton block
- Do not allow skeleton components to receive keyboard focus
- Do not place clickable actions inside skeletons
- Maintain colour contrast for surrounding text
- Respect reduced-motion preferences
- Do not announce loading repeatedly during minor background updates

Suggested structure:

```html
<section aria-busy="true" aria-label="Loading appointments">
  <div class="appointment-skeleton" aria-hidden="true">
    <!-- skeleton shapes -->
  </div>
</section>
```

Use visually hidden live-region messages only for significant state changes.

## Performance requirements

Skeletons must remain lightweight.

- Use CSS rather than animated GIFs or videos
- Avoid large SVG filters
- Avoid separate animation timers for every block
- Reuse components
- Avoid excessive DOM nodes
- Limit placeholder rows
- Memoise repeated skeleton components where appropriate
- Do not trigger layout recalculation on every animation frame
- Use transform-based shimmer
- Lazy-load data and assets appropriately
- Cancel obsolete requests when users navigate away
- Prevent race conditions when filters change rapidly

## Testing requirements

Test every relevant screen under:

- Fast connection
- Slow 3G
- Offline mode
- Request timeout
- API failure
- Partial API failure
- Empty response
- Cached response
- Pagination
- Background refresh
- Route changes during loading
- Back navigation
- Different mobile widths
- Tablet
- Desktop admin resolutions
- Browser zoom
- Reduced motion
- Screen reader
- Keyboard navigation

Verify:

1. No blank screens appear during normal loading.
2. Skeletons match the final component dimensions.
3. No significant layout shift occurs when content loads.
4. Navigation remains stable.
5. No skeleton covers a usable action unnecessarily.
6. No fake clinical, payment or safety information appears.
7. No skeleton suggests an unconfirmed status.
8. Error states replace failed skeletons.
9. Empty states appear only after loading completes.
10. Refreshing does not erase existing content.
11. Skeletons stop when leaving a screen.
12. No shimmer continues behind loaded content.
13. Safe areas are respected.
14. No skeleton extends under fixed navigation.
15. Admin tables retain their column alignment.
16. Forms do not lose entered values.
17. Loading states remain accessible.
18. Reduced-motion behaviour works correctly.
19. Skeletons do not create performance problems.
20. Patient, Doctor and Admin skeletons use one consistent CoraCure design system.

## Final implementation requirement

Create a skeleton map for every route in the Patient app, Doctor app and Admin portal.

For each route, document:

- Screen name
- API/data dependency
- Initial-loading skeleton
- Partial-loading skeleton
- Refresh behaviour
- Empty state
- Error state
- Offline behaviour
- Minimum skeleton display delay
- Components that must remain interactive
- Components that must remain hidden until authorised data loads

Do not consider the skeleton implementation complete until every asynchronous screen has a defined loading, loaded, empty, error and refresh state.