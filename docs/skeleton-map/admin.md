# Admin portal skeleton map

The skeleton map for `apps/admin`, as required by the last section of `admin-updates.md`
("Final implementation requirement"). One row per route and per section. It was written from the
code as it stands, not from intent: every row names the component that is actually passed to
`Async` / `ListScreen` / `SkeletonGate`, and the rows with no skeleton say why.

- Kit: `apps/admin/src/ui/skeleton.tsx` (compositions), `apps/admin/src/ui/index.tsx` (`Async`,
  `ErrorState`), `apps/admin/src/ui/ui.css` (`.sk`, `.skeleton`, ...).
- Data lifecycle: `apps/admin/src/lib/useResource.ts`.
- Tests that pin the behaviour: `src/ui/skeleton.spec.tsx`, `src/lib/useResource.spec.tsx`,
  `src/modules/kit/ListScreen.spec.tsx`, `src/modules/skeletonScreens.spec.tsx`.

## 1. Rules every async screen follows

These come from the kit, so a row below only says where it differs.

| Rule | Behaviour in code |
|---|---|
| **Delay and minimum** | `useSkeletonGate`: nothing is drawn for the first **150 ms** of a request; a skeleton that is shown stays for at least **300 ms** (content never before ~450 ms for a request that took longer than 150 ms). A request that answers inside 150 ms never draws a skeleton. |
| **First load only** | `Async` shows a skeleton while `loading && (initial \|\| stale)`. A reload (after a mutation, a poll, "Retry") has `initial = false` and `stale = false`, so the rows on screen are never covered. |
| **Filter or id change** | `useResource(..., resetOn)` sets `stale` when a filter or id changes (default: every dep). The previous rows stay for the 150 ms delay, then give way to the body skeleton; a failure drops them (they belong to another filter). A paging dep (`limit`, "Show more") is left out of `resetOn`, so its rows stay and the button is `loading`. |
| **Chrome stays real** | Sidebar, top bar, page title, tabs whose labels are static, search and filter controls, known column headers and card titles are real. Only dynamic content is a skeleton. |
| **Neutral** | One mint-grey, one shimmer (`transform`, `prefers-reduced-motion` respected). No numbers, trends, currency, status badges or red/amber. Skeleton blocks are `aria-hidden`; the region is `aria-busy` with one label ("Loading patients"). |
| **Loading, empty, error, refresh are different** | Loading = skeleton. Empty (`EmptyState`) only after a successful load. Failure = `ErrorState` in place of the skeleton at once, with **Retry**; a permission failure (`INSUFFICIENT_PERMISSION`) and not-found have **no Retry**. Refresh = rows stay. |
| **Failed refresh** | If a reload fails while rows are on screen, the rows stay and `Async` adds a warning notice "Could not refresh. Showing what was loaded last." + Retry (`UsersLive` does the same). |
| **Offline** | A network failure while `navigator.onLine === false` shows "You appear to be offline" + Retry (`ErrorState`). Otherwise "Unable to load X" with the client's message + Retry. There is no persisted cache: "cached data" means the rows already in memory for the mounted screen. Requests time out after 20 s (`http.ts`), so a shimmer never runs forever. |
| **Actions** | A user-triggered action is a `Button loading` (spinner, disabled, double-submit guard via `useMutation`), never a skeleton. |
| **Polling** | `usePoll` calls `reload`, which is not a first load, so a poll never draws a skeleton. Only Safety alerts polls (45 s). |

Abbreviations used in the table: **Gate** = the 150 ms / 300 ms rule above; **ER** = `ErrorState`
+ Retry (no Retry for permission or not-found); **OFF** = the offline wording above.

## 2. Shell and cross-cutting

| Screen | API / data | Initial skeleton | Partial / refresh | Empty | Error | Offline | Min display | Stays interactive | Hidden until loaded |
|---|---|---|---|---|---|---|---|---|---|
| Shell: sidebar, top bar, account menu | Session in memory (`hydrateSession`); nav from `nav.ts` | None: no request | n/a | n/a | n/a | n/a | n/a | Everything | n/a |
| Header notification bell (count) | `GET /me/notifications/unread-count` (fixture: `inbox.unreadCount`) | None by design: the badge is simply absent until a count exists (a placeholder badge would read as "unread") | Reloads on `inboxChanged`; count stays | No badge at 0 | Silent: no badge | Silent | n/a | Bell, menu | Count badge |
| Header bell dropdown | `GET /me/notifications?limit=100`, fetched when opened | `ListSkeleton` (3 rows, no trailing pill) inside the popover, via `useSkeletonGate`; no "all caught up" flash on the way in | Reload keeps rows | "You are all caught up." (only after load) | "Could not load notifications. Retry" (inline) | Same inline error | Gate | Popover shell, "View all", close | Rows, "Mark all read" |
| `/inbox` Notifications page | `inbox.list()` = `GET /me/notifications?limit=100` | `Async`: `SkeletonBlock` (group label) + `ListSkeleton` (6 rows, no avatar, no pill). Unread tab label has no count until loaded | `inboxChanged` reload keeps rows; "Show more" is client-side | "Nothing here yet" / "You are all caught up" | ER | OFF; failed refresh keeps rows + notice | Gate | Back link, tabs | Rows, Mark all read, unread count |
| `*` Not found, no-access, `NotConnected`, `SectionPlaceholder` | None | None: static | n/a | They are the empty/blocked state | n/a | n/a | n/a | Everything | n/a |
| Sign in | `POST` on submit | None: static form; submit button shows "Signing in..." and is disabled | n/a | n/a | Inline form error | Inline form error | n/a | Form | n/a |

## 3. Sidebar sections (`nav.ts` SECTIONS, in sidebar order)

"Fixture" is the in-memory mock (`mock/db.ts`, 260 ms fake latency) used in dev and tests;
"Live" is the real backend (a production build, or dev with `VITE_API_URL`). In a live build a
section not named in `app.tsx` `LIVE_SECTIONS` renders `NotConnected` (static, no request).

### Dashboard and providers

| Screen | API / data | Initial skeleton | Partial / refresh | Empty | Error | Offline | Min display | Stays interactive | Hidden until loaded |
|---|---|---|---|---|---|---|---|---|---|
| `/dashboard` (live) | `GET /admin/dashboard/summary` + `GET /admin/governance/dashboard` + two `GET /admin/followups?state=...` (the last three are optional and fall back to `null`) | `Async` (whole body under the greeting): per band a real `.dsection` heading + `MetricGridSkeleton` sized to the cards this level can reach (`BAND_SHAPE`), then `TrendSkeleton` (total block over `ChartSkeleton` bars, and the status split) when the level reaches Appointments | No polling; a reload keeps cards | "Nothing on the dashboard for your role" (no reachable band) | ER (replaces the bands) | OFF | Gate | Greeting, "Add provider", "Send notification" | Every card, the trend, the video-health notice |
| `/dashboard` (fixture) | Cards from local stores (synchronous); `dashboardOverview.get()` for trend and activity | Cards are real at once (no skeleton: no request). Trend: `TrendSkeleton`; recent activity: `CardSkeleton` + `ListSkeleton` (5 rows). Two `Async` on one state | n/a | "Nothing yet" inside Recent activity | ER per `Async` | OFF | Gate | Cards (links), actions | Trend, activity rows |
| `/providers` Doctors, `/specialists`, `/super-specialists`, `/paramedical`, `/veterinary` (live) | `GET /admin/doctors` by roster category (`doctors.list`) | `ListScreen loading`: search and filters real, body `TableSkeleton` (8 rows): person, mobile, stack, stack, amount, status, with the real headers (Provider, Mobile, Specialty/Profession, Experience, Payout fee, Availability). Filter options built from rows are empty until loaded | Filtering is client-side: no request. Reload never used | "No <list> yet" / "Nothing matches these filters" | `ErrorState` replaces the screen (rows never loaded) | OFF | Gate | Search, filters, "Add provider" | Rows, derived specialty options |
| same (fixture) | `mock/db` + Master Data lists, synchronous | None: no request | n/a | as above | n/a | n/a | n/a | all | n/a |
| `/verification` (live) | `doctors.queue()` = roster `GET /admin/doctors` with document counts | `ListScreen loading`: the six status tabs are real **without counts**, search real; `TableSkeleton` (8 rows): person, status, status, date, button, real headers | Client-side tabs and search | "No providers yet" | `ErrorState` replaces the screen | OFF | Gate | Tabs, search | Counts, rows, "Review" buttons |
| same (fixture) | synchronous | None | n/a | as above | n/a | n/a | n/a | all | n/a |
| `/availability` Doctor availability | `GET /admin/specialties`, `GET /admin/regions` (select options) and `GET /admin/availability/remaining` once a date is picked | Selects are `disabled` with "Loading..." while their options load (a select cannot hold a skeleton). The answer: `Async` + `TableSkeleton` (5 rows, headers Doctor / Unbroken time left / Assignable) | Re-query on any input change: `stale` rows for 150 ms, then the skeleton | Before a date: "Pick a date and time" (not an answer). After: "Nobody is assignable at that time" (a real answer, only after load) | ER | OFF | Gate | All inputs | Result rows |

### Patients

| Screen | API / data | Initial skeleton | Partial / refresh | Empty | Error | Offline | Min display | Stays interactive | Hidden until loaded |
|---|---|---|---|---|---|---|---|---|---|
| `/patients` | Live `GET /admin/patients` (query: search, status, limit); fixture `patients.list` | Search and filter bar real. `Async` + `TableSkeleton` (8 rows, chevron, footer line): person, text, text, text, amount, date, status, real headers | Filter change: old rows 150 ms then the body skeleton, filters keep their values. "Show more": rows stay, button `loading`, no skeleton | "No patients match these filters" / "No patients yet" | ER | OFF | Gate | Search, filters, Clear | Rows, "Showing x of y", Show more |
| `/patients/:patientId` | Live `GET /admin/patients/:id`; fixture `patients.get` | `Async`: `PageHeaderSkeleton` (title + description + 2 actions) + the **real tab bar** (static labels, selected tab kept) + Overview cards (`DefinitionListSkeleton` 8, health card) or a card for other tabs | Reload after Edit / account change keeps data | "Patient not found" with a way back (own screen) | ER (not-found handled separately) | OFF | Gate | Tab bar, back | Name, facts, Edit details, status actions, panes |
| Patient detail > Consultations tab (live) | `GET /admin/patients/:id/consultations?limit=100&sort=newest` | `Async` + `TableSkeleton` (4 rows, chevron), real headers | Reload keeps rows | "No consultations yet" | ER inside the tab | OFF | Gate | Tabs | Rows |
| Patient detail > Overview, Address, Prescriptions, Files, Follow-up, Payments, Support, Consents tabs | Read from the loaded record and synchronous fixture stores | None: no request of their own | n/a | per tab | n/a | n/a | n/a | all | n/a |

### Services

| Screen | API / data | Initial skeleton | Partial / refresh | Empty | Error | Offline | Min display | Stays interactive | Hidden until loaded |
|---|---|---|---|---|---|---|---|---|---|
| `/appointments` hub | Tabs are static | `TabHub`: page header and tab bar real; only the active tab panel loads | Tab change swaps the panel | n/a | per tab | per tab | Gate per tab | Tab bar | n/a |
| Appointments tab (list) | Live `GET /admin/consultations`; fixture `consultationsList.list` | Filter bar real (search, status, mode, professional, quick range, dates). `Async` + `TableSkeleton` (10 rows, chevron, footer): id, name, name, text, date, stack, status, id, status, real headers | Filter change as Patients; "Show more" keeps rows, button `loading`. "Consulting Professional" options come from the response (just "Any" until loaded) | "No consultations match these filters" / "No consultations yet" | ER | OFF | Gate | Search, filters, Clear | Rows, count line |
| Allocation decisions tab | `governance.allocationDecisions()` (fixture only; `NotConnected` live) | `Async` + `TableSkeleton` (8 rows), headers Decided / Consultation / Assigned to / Basis | Reload keeps rows | "No allocation decisions recorded" | ER | OFF | Gate | Tab bar, notice | Rows |
| `/appointments/:consultationId` | Live `GET /admin/consultations/:id` (+ patient, doctor, services lookups); fixture `consultations.get` | `Async`: `OverviewSkeleton` = `PageHeaderSkeleton` + key-facts card (4 facts) + Consultation and Schedule cards (`DefinitionListSkeleton`) + Billing card for finance and operations | Reload keeps page | n/a (not-found is ER) | ER; not-found has no Retry | OFF | Gate | Header back (Shell) | Title, status, key facts, buttons |
| Appointment detail > Billing card | `payments.bill(id)` (live: derived from the consultation record) | Card title real; `DefinitionListSkeleton` (7) inside it | Reload keeps | n/a | ER inside the card | OFF | Gate | Rest of the page | Figures |
| Appointment detail > Chat window (fixture) | `consultations.chat(id)` | Modal shell, title, close real; `ListSkeleton` (4 rows) inside | n/a | "No messages were exchanged on this case." | ER inside the modal | OFF | Gate | Close | Messages |
| Appointment detail > Case summary window (fixture) | `summaries.list()` then `summaries.get(id)` | Modal real; `CaseSummaryDetail` embedded skeleton (see below) | n/a | see below | ER inside the modal | OFF | Gate | Close | Content |
| `/case-records` hub | Tabs static | `TabHub` as above | n/a | n/a | per tab | per tab | per tab | Tab bar | n/a |
| Case records tab | `caseRecords()` fixture store (synchronous). Not live: `NotConnected` | None: no request | n/a | "No case records yet" | n/a | n/a | n/a | all | n/a |
| Case summaries tab | `summaries.list()` (fixture) | Filter bar real. `Async`: `SkeletonBlock` (count line) + `TableSkeleton` (8 rows, chevron): stack, name, text, text, date, date, status. Doctor filter options appear once rows exist | Client-side filters | "No case summaries yet" / "No case summaries match these filters" | ER | OFF | Gate | Search, filters, Clear | Rows, count |
| `/case-records/:caseId` | `findCaseRecord` fixture store (synchronous). `NotConnected` live | None: no request | n/a | "Case record not found" with a way back | n/a | n/a | n/a | all | n/a |
| `/case-records/summary/:summaryId` | `summaries.get(id)` | `Async`: `PageHeaderSkeleton` (or one block when embedded) + `TabsSkeleton` (6; two labels depend on the prescriber) + `DetailSkeleton` (no identity, 3 cards) | `regenerate` updates in place (`setData`) | per tab text | ER | OFF | Gate | Shell back | Header, status, tab labels, panes |
| `/clarifications` hub | Tabs static | `TabHub` | n/a | n/a | per tab | per tab | per tab | Tab bar | n/a |
| Clarification threads tab | `clarifications` fixture store | None: no request | n/a | per list | n/a | n/a | n/a | all | n/a |
| Expert assignment tab | `clarification.list()` (+ `clarification.experts()` in the Assign window) | `Async` + `TableSkeleton` (6 rows: stack, date, name, status, button). Assign window: shell real, `TableSkeleton` (4 rows) inside | Close / assign reload keeps rows | "No clarification cases" / "No experts available" | ER | OFF | Gate | Notice, tab bar | Rows, Assign / Close buttons |
| `/follow-ups` | `followUps` fixture store | None: no request | n/a | per list | n/a | n/a | n/a | all | n/a |
| `/safety-alerts` | `safety.list()` (fixture; live is `NotConnected`), polled every 45 s | `Async` + `TableSkeleton` (6 rows: stack, date, id, status, button), headers Alert / Raised / Consultation / Handling | Poll and acknowledge/close reload with `initial = false`: **no skeleton, rows stay**; a failed poll keeps rows and shows the "Could not refresh" notice | "No safety alerts" | ER | OFF; a failed poll says so | Gate (first load only) | Notice, tab, acknowledge on rows already shown | Rows |
| Lab Services (6 routes + Lab analytics) | Fixture stores; switched off by `LAB_SERVICES_ENABLED = false` (not in `SECTIONS`, not routed) | None: no request | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

### Analytics

| Screen | API / data | Initial skeleton | Partial / refresh | Empty | Error | Offline | Min display | Stays interactive | Hidden until loaded |
|---|---|---|---|---|---|---|---|---|---|
| `/analytics`, `/analytics-consultations`, `/analytics-providers`, `/analytics-patients`, `/analytics-financial` | Derived synchronously from fixture stores, scaled by the URL filters. No endpoint is called. `NotConnected` live | **None, deliberately**: nothing loads asynchronously, so a skeleton would be dead code. When these call the analytics endpoints, use `MetricGridSkeleton` + `ChartSkeleton` (bars / line / donut) from the kit, keeping the filter bar real | n/a | n/a | n/a | n/a | n/a | all | n/a |

### Finances and support

| Screen | API / data | Initial skeleton | Partial / refresh | Empty | Error | Offline | Min display | Stays interactive | Hidden until loaded |
|---|---|---|---|---|---|---|---|---|---|
| `/patient-payments`, `/provider-payouts`, `/refunds` | Fixture stores (`mock/ops/money`), synchronous. `NotConnected` live | None: no request. When wired, `ListScreen loading` + `TableSkeleton` (the live providers screen is the pattern) | n/a | per list | n/a | n/a | n/a | all | n/a |
| `/support-tickets` hub | Tabs static | `TabHub` | n/a | n/a | per tab | per tab | per tab | Tab bar | n/a |
| Tickets tab | `tickets` fixture store | None: no request | n/a | per list | n/a | n/a | n/a | all | n/a |
| Patient complaints tab | `support.complaints({status})` | Status filter real. `Async` + `TableSkeleton` (6 rows: stack, status, date, status, button) | Status change: stale rows 150 ms then skeleton | "No complaints" / "No complaints with that status" | ER | OFF | Gate | Filter | Rows |
| `/support-tickets/:complaintId` | `support.complaint(id)` | `Async`: `PageHeaderSkeleton` (description + 3 actions) + Complaint card (`DefinitionListSkeleton` 4) + Thread card | Reply / assign / resolve reload keeps page | n/a | ER; not-found no Retry | OFF | Gate | Shell back | Title, status, Pick up / Resolve / Reject, thread, composer |
| `/feedback` | `feedbackItems` fixture store | None: no request | n/a | per list | n/a | n/a | n/a | all | n/a |
| `/notifications` page | Tabs static (`Tabs` in the page) | Header and tab bar real; the active tab loads | Tab change swaps the panel | n/a | per tab | per tab | per tab | Tab bar | n/a |
| Notifications > Templates | `notificationTemplates.list()` | Notice, audience filter and search real. `Async` + `TableSkeleton` (8 rows: stack, text, status, button) | Reset / edit reload keeps rows | "No templates registered" / "No templates match" | ER | OFF | Gate | Filters | Rows, Edit / Reset |
| Notifications > Send | `manualNotifications.recipients(audience)` | Form is static and real. Recipient list: `SkeletonGate` + `ListSkeleton` (3 rows) so "No one matches." is never shown for an audience that has not loaded. "Send" stays disabled (`valid` needs the audience) | Audience change: stale 150 ms then skeleton | "No one matches." (after load) | Inline "Could not load doctors. Retry" | OFF | Gate | Whole form | Match list, recipient count |
| Notifications > History | `manualNotifications.history(query)` | Filter bar real. `Async` + `TableSkeleton` (8 rows, chevron) | Filter change as Patients | "No notifications match" | ER | OFF | Gate | Filters | Rows |

### Admin

| Screen | API / data | Initial skeleton | Partial / refresh | Empty | Error | Offline | Min display | Stays interactive | Hidden until loaded |
|---|---|---|---|---|---|---|---|---|---|
| `/users` (live) | `GET /admin/accounts?limit=100` (`accounts.list`) | `ListScreen loading`: Active / Inactive tabs (no counts), search, role filter and **Add User** real and usable; `TableSkeleton` (6 rows: name, email, text, status, status, date, button) | Activate / deactivate / 2FA / edit reload keeps rows; failed reload shows a "Could not refresh" notice + Retry | "No admin users" | `ErrorState` replaces the list (403 for non-super-admin has no Retry) | OFF | Gate | Tabs, search, filter, Add User | Rows, row buttons |
| `/users` (fixture) | `adminUsers` store, synchronous | None: no request | n/a | per list | n/a | n/a | n/a | all | n/a |
| `/roles` | `roles` fixture store | None: no request. `NotConnected` live | n/a | n/a | n/a | n/a | n/a | all | n/a |
| `/master-data` hub (`?view=`) | Tabs static | `TabHub` | n/a | n/a | per tab | per tab | per tab | Tab bar | n/a |
| Master data > Provider / Other | `masterStore` fixture, synchronous | None: no request | n/a | "Nothing in this list yet" | n/a | n/a | n/a | all | n/a |
| Master data > Service catalogue | Page tabs static; `catalogue.specialties()`, `.concerns()`, `.regions()`, `.allocationPolicy()` | Per tab: card title real, `Async` + `TableSkeleton` (5 rows) with the real headers (Specialty / Registration form / May prescribe / Status; Concern / Match phrases / Weight; Region / Status). Policy: `CardSkeleton` | "Add" then reload keeps rows | "No specialties yet" / "No concerns configured" / "No regions configured" | ER inside the card | OFF | Gate | Tab bar, "Add" forms | Rows, policy checkbox |
| `/admin-settings` hub (`?tab=`) | Tabs static (filtered by level) | `TabHub` | n/a | n/a | per tab | per tab | per tab | Tab bar | n/a |
| Admin settings > Business rules | `settingsDocs` fixture store | None: no request | n/a | n/a | n/a | n/a | n/a | all | n/a |
| Admin settings > General | `config.list()` | `Async`: three `CardSkeleton` (label + one field each) | Save reloads, rows stay | "No configurable settings" | ER | OFF | Gate | Notice | Setting values and Save |
| Admin settings > Audit log | `compliance.audit(filters)` (limit 200) | Filter bar real. `Async` + `TableSkeleton` (10 rows: date 190 px, stack, status, stack) | Filter change as Patients | "No matching entries" (explains level-narrowed rows) | ER; 403 no Retry | OFF | Gate | Filters, Export link | Rows |
| Admin settings > Deletion requests | `compliance.deletionRequests()` | Notice real. `Async`: the three card titles are real (Awaiting review / Approved - awaiting execution / Closed), each with a 2-row `TableSkeleton`. No Approve / Execute is rendered until loaded | Review / execute reload keeps rows | "No deletion requests" | ER | OFF | Gate | Notice | Rows and decision buttons |
| Admin settings > Retention | `compliance.retention()` | Notice real. `Async`: "Current window" (`DefinitionListSkeleton` 3) and "Run the sweep" cards. "Apply retention" is not rendered until the scope is known | Apply reloads, data stays | n/a | ER | OFF | Gate | Notice | Window, in-scope count, Apply |
| `/app-settings` hub | Tabs static | `TabHub` | n/a | n/a | per tab | per tab | per tab | Tab bar | n/a |
| App settings > App configuration | `settingsDocs` fixture store | None: no request | n/a | n/a | n/a | n/a | n/a | all | n/a |
| App settings > Care Hub library | `careHub.items()` | Toolbar (search, type, status, concern, sort, Cards / Table, New item) real. `Async`: `CardGridSkeleton` (6 cards) for Cards, `TableSkeleton` (6 rows, thumbnail + stack + status + date + button) for Table, following the chosen view | Filters are client-side; save / publish reload keeps items | "No Care Hub items yet" / "No items match" | ER | OFF | Gate | Toolbar, view toggle, New item | Cards / rows and per-item actions |
| App settings > Care Hub editor (`?edit=<id>`) | `careHub.item(id)` | Title "Edit Care Hub item" and **Back to library** real; form: `.chEditor` with `FormSkeleton` (Basics), cover and content cards, preview card. Save is not rendered until loaded. `?edit=new` has no load | n/a | n/a | ER | OFF | Gate | Back to library | Form values, Save |
| App settings > Follow-up pathways | `pathways.list()` | Notice real. `Async` + `TableSkeleton` (4 rows: stack, date, status, button) | Publish reloads, rows stay | "No pathways published" | ER | OFF | Gate | Notice | Rows, "New version from this" |
| `/website-settings` hub | Tabs static | `TabHub` | n/a | n/a | per tab | per tab | per tab | Tab bar | n/a |
| Website settings > Website | `settingsDocs` fixture store | None: no request | n/a | n/a | n/a | n/a | n/a | all | n/a |
| Website settings > Legal & support content | `legal.versions(documentType)`; the value form is a fixture store | Document type select real. "Version history" card title real; `Async` + `TableSkeleton` (4 rows: id, date, text) | Type change: stale 150 ms then skeleton; publish reloads | "No versions published" | ER | OFF | Gate | Type select, Publish new version | Version rows, next version number |

## 4. Detail routes under a section (`app.tsx` CHILDREN)

| Screen | API / data | Initial skeleton | Partial / refresh | Empty | Error | Offline | Min display | Stays interactive | Hidden until loaded |
|---|---|---|---|---|---|---|---|---|---|
| `/providers/new` | Live: `GET /admin/specialties` (`CreateProviderLive`); fixture: `catalogue.specialties()` | Live: card, notice and buttons real; `FormSkeleton` (6) for the fields; "Add provider" disabled until specialties load. Fixture: the Specialty select is `disabled` with "Loading..." | n/a | n/a | ER inside the card (live) | OFF | Gate | Cancel | Fields (live), Submit |
| `/providers/:doctorId` | Live `GET /admin/doctors/:id`; fixture `doctors.get` | `Async`: `PageHeaderSkeleton` (description + 2 actions) + `TabsSkeleton` (6; the tab set depends on the provider's category, so labels are neutral) + two `CardSkeleton` with `DefinitionListSkeleton` | Reload after any action keeps the page | n/a | ER; not-found has no Retry | OFF | Gate | Shell back | Name, badges, actions, tab labels, panes |
| Provider detail > Availability tab | `GET /admin/doctors/:id/availability` and `.../slots?date=` | `DiarySkeleton`: real "Weekly pattern" title, 7 day rows (`weekDays`), "Resulting slots" card. Slots: date field real, `slotList` of 6 time blocks | Date change: stale 150 ms then skeleton | "No slots on this date" | ER | OFF | Gate | Tabs | Weekly form, Save, exceptions, slot list |
| Provider detail > Reliability tab | `GET /admin/doctors/:id/reliability` | `Async`: "Reliability" card + `DefinitionListSkeleton` (4) | n/a | n/a | ER | OFF | Gate | Tabs | Rates |
| Provider detail > Regions tab (live) | `GET /admin/regions` + `GET /admin/doctors/:id/regions` | `Async`: "Service regions" card + 4 checkbox-line blocks | Save reloads | "No regions have been set up in Master data yet." | ER | OFF | Gate | Tabs | Region checkboxes, Save |
| Provider detail > Profile, Consultation settings, Digital signature, Regions & languages | Read from the loaded doctor | None: no request of their own (signature "View" is an action: `Button loading`) | n/a | n/a | n/a | n/a | n/a | all | n/a |
| `/verification/:doctorId` | `GET /admin/doctors/:id` + `GET /admin/doctors/:id/credentials` | `Async`: `PageHeaderSkeleton` (3 actions) + `TabsSkeleton` (5) + "Declared by the doctor" card + "Documents" card (`DocumentTableSkeleton`: Document / Status / actions). Once the doctor is in, the documents card has its own `Async` skeleton | `onReviewed` reloads both, rows stay | "No documents uploaded yet" | ER per request; documents ER is local to its card, with Retry | OFF | Gate (each request) | Tabs, Suspend, Back | **Approve, Changes required, Reject, Reopen stay disabled until the document list is on screen** (`locked`); a failed document load keeps them disabled. Per-document Approve / Reject appear only with the rows |

## 5. Not async (no skeleton, with the reason)

| Where | Reason |
|---|---|
| `ListScreen` users backed by stores: Case records, Clarification threads, Follow-ups, Finance (3), Lab (6), Support tickets, Feedback, Users (fixture), Provider lists (fixture) | The rows are read from `useStore` / fixtures with no promise, so there is no moment to cover. Wiring a live source later means passing `loading` to `ListScreen`, as the live providers, verification and users lists do |
| `SettingsForm` pages (Business rules, App configuration, Website, legal versions) | Values live in the in-memory `settingsDocs` store |
| `RecordForm`, `ConfirmDialog`, `EditDoctor`, `EditPatient`, `EditPatientLive`, `PatientAccount`, `ProviderExtras`, `SignIn` | Static forms; every call is user-triggered (`Button loading`, disabled while busy). `EditPatientLive` disables its Region select with "Loading..." while the region list loads |
| `Roles`, `MasterData` Provider / Other lists, `Analytics` | Synchronous fixture state; analytics is also `NotConnected` live |
| `SearchConfig` (`content/SearchConfig.tsx`) | Not routed by any hub today, but wired (`Async` + three `CardSkeleton`) so it is ready when it is |

## 6. Gaps and open items

- **No browser pass.** The skeletons were checked by unit tests (structure, timing, neutrality,
  accessibility labels), not by eye. Spacing was matched to the real markup by reusing the real
  classes (`.table`, `.dcards` / `.dcard`, `.card`, `.defList`, `.tabs`, `.chGrid`, `.weekDays`,
  `.keyFacts`) and adding the region-gap correction in `ui.css`; confirm visually that nothing
  shifts, and on tablet / zoom.
- **No persisted offline cache.** Offline keeps only what the mounted screen already holds. There is
  no cross-navigation cache and no "back online" auto-retry; Retry is manual.
- **No refresh indicator.** A refetch over rows is silent (by design for the safety-alert poll). If a
  visible "refreshing" cue is wanted for user-triggered reloads, add an `aria-busy` + dim option to
  `Async` rather than a skeleton.
- **Skeleton column kinds are per screen.** `skeletonColumns(columns, kinds)` derives headers,
  widths and alignment from the screen's own `Column[]`, but the cell shape (`person`, `stack`,
  `status`, ...) is chosen by hand and could drift if a column's content type changes.
- **Dashboard band shape is duplicated** (`BAND_SHAPE` in `Dashboard.tsx`): it must be kept in step
  with `bandsFromSummary` in `api/liveDashboard.ts` or the live skeleton reserves the wrong number
  of cards.
- **Sections not live yet** show `NotConnected`, which is a static state with no skeleton: the live
  wiring for each (Appointments > Allocation decisions, Case summaries, Safety alerts, Finance,
  Support, Settings hubs, Care Hub, Pathways, Notifications) should pass the same `skeleton=` it has
  today.
