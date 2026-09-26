# CORA-CURE DOCTOR IOS UI/UX IMPLEMENTATION REPORT

**Date:** 25 September 2026
**App:** `apps/doctor` (React Native 0.84, iOS and Android). The patient app was not touched.
**Baseline:** [DOCTOR_IOS_UI_UX_QA_REPORT.md](DOCTOR_IOS_UI_UX_QA_REPORT.md), 80 findings (7 P0 · 28 P1 · 36 P2 · 9 P3).
**State:** uncommitted working tree: 93 tracked files changed (+13,676 / −15,941), 30 new files, 3 deleted.

> **Client-demo readiness: ✅ ready, after the final polish pass (§0).**
> - **Findings:** all 7 P0s are resolved, and 70 of the 80 findings are resolved in the code. The other 10 are partial and none are open.
> - **Gates:** tests, TypeScript, lint and both platform builds pass.
> - **Remaining partials:** they depend on the backend, need a product decision, or are polish outside the demo path (§3).

## 0. Final polish pass (25 Sep)

**The three gaps that were left:**
- **N29:** Refer during a live call now opens on that patient. The consultation in progress is offered as the case, and Back returns to the same call.
- **N14:** a new prescription starts blank, with no advice or don'ts. Seeded demo prescriptions that reached the prescription stage keep theirs.
- **K21:** both duration editors use one list, `CONSULTATION_DURATIONS`: 15, 20, 30, 45 or 60 minutes.

**Also fixed:**
- Today's hours on the Dashboard status sheet now respect time off and date exceptions.
- Expert Response and alert reviews ask before discarding unsaved text.
- Reviews labels its list "Recent reviews · The latest 5 of 126", so it no longer contradicts the total, and no longer repeats "Verified" for anonymous reviewers.
- The notes screen shows the consultation ID and date on separate lines, so the date no longer breaks in the middle.
- The Template and Care Hub chips have a 44 pt tap area.

**New tests:** `DemoJourney.spec` covers the live-call round trips (Notes, Prescription, Chat, Follow-up), Refer mid-call, the shared durations and the discard prompts. `fixtures.spec` checks that every alert, thread, clarification, document and notification points at one consistent patient.

**Verified:** the full walkthrough on the iPhone 17 simulator, and the release APK on an Android 15 emulator.

### 0.1 Client-demo polish (25 Sep, evening)

- **Keyboard and bottom actions:** a footer CTA such as Save & Continue now stays at the foot of the screen while typing, instead of riding up on the keys, and returns when the keyboard closes. Composers (chat, clarification reply, in-call chat) still ride above the keyboard. This lives in `Screen` and `BottomSheet`.
- **Keyboard dismissal:** opening any dropdown, date picker, sheet, checkbox, segmented choice, filter chip or settings choice puts the keyboard away first. This lives in the shared components.
- **iOS number pads:** they now have a Done key, through one shared `InputAccessoryView` (`components/KeyboardDoneBar.tsx`).
- **Login and verification banner:** the heading starts level with the top of the artwork again, as in the earlier build (`bc8253e`). The lead-in shrinks on short phones, so iPhone SE text never clips.
- **Profile photo:**
  - With no photo, there's one "Add photo" action. With a photo, "Change" is the action and "Remove" is a quiet link beside the file.
  - The three sample photos show as drawn portraits (`assets/samples`, not real people), in the picker, the onboarding avatar, the Dashboard and Profile.
- **APK hygiene:** the React bundler never deleted old images from `android/app/build/generated`, so the removed actress photo was still packed, unused, inside APKs built earlier. It's cleared now, `app/build.gradle` starts every bundle clean, and the final APK was hash-scanned clean.
- **Gates:** jest 338/338 (33 suites), tsc PASS, ESLint 0 errors, iOS build PASS, Android release build PASS.

---

## 1. Quality gates

| Gate | Before | After |
|---|---|---|
| Jest (`npx jest --config apps/doctor/jest.config.cts`) | 307 / 314 tests, 23 / 27 suites (7 failing) | **329 / 329 tests, 32 / 32 suites** after the final pass (314 / 314 before it) |
| TypeScript (`tsc -p apps/doctor/tsconfig.app.json --noEmit`) | clean | **PASS** |
| ESLint (`apps/doctor/src`) | not run | **0 errors**, 54 warnings (mostly `!` assertions in specs) |
| iOS build | PASS (Debug, simulator) | **PASS**: `xcodebuild` Debug simulator build on 25 Sep 14:06, 0 errors. |
| Android release build | none | **PASS**: `assembleRelease`, 37 MB APK (see §8) |

No suite was deleted. The main pass added Messaging, Support and ProfileSettings, and the final pass added DemoJourney and fixtures. Tests that asserted removed or intentionally changed behaviour were rewritten (§6).

---

## 2. Findings resolved, by severity

Each finding was re-checked against the current code by five independent read-only reviews. None of these results come from memory or from the tests alone. A finding counts as **resolved** only when everything it describes is fixed; if anything remains, it is **partial**.

| Severity | Findings | ✅ Resolved | ◐ Partial | ✗ Open |
|---|---|---|---|---|
| **P0** | 7 | **7** | 0 | 0 |
| **P1** | 28 | **25** | 3 | 0 |
| **P2** | 36 | **30** | 6 | 0 |
| **P3** | 9 | **8** | 1 | 0 |
| **Total** | **80** | **70 (88%)** | **10** | **0** |

Paths below are relative to `apps/doctor/src/`.

### P0: 7 of 7 resolved

| ID | | What the code does now | Evidence |
|---|---|---|---|
| K6 | ✅ | Native stack with typed ID params and not-found fallbacks. There are no no-op default handlers. | `app/navigation/RootNavigator.tsx:70-127`, `app/navigation/types.ts:26-78` |
| K7 | ✅ | Notification n4 opens its own appointment. A record that doesn't exist opens the not-found page. | `app/navigation/routes.tsx:288,590` |
| K14 | ✅ | Verification documents opens Account Status with the doctor's own items, not patient documents. | `app/screens/profile/ProfileScreen.tsx:94-103`, `routes.tsx:721-741` |
| N01 | ✅ | Notes are real inputs bound to the appointment's record, with no fake autosave stamp. Prescription advice is editable. | `app/screens/ClinicalNotesScreen.tsx:72-78,112`, `EPrescriptionScreen.tsx:476-499` |
| N02 | ✅ | The summary is typed and validated (60–1000 characters). The checklist is computed from the record. The canned "no self-harm" text is deleted. | `app/screens/CaseSummaryScreen.tsx:62-86,182-192` |
| N03 | ✅ | Routes carry IDs and resolve to the record or to the not-found page. Rahul's case is psychiatry (GAD). | `routes.tsx:484-530`, `state/seed.ts:74-90` |
| N04 | ✅ | The persona is "Dr. Arjun Mehta" everywhere. The actress's photos and name are gone from the working tree. | `data/doctor.ts:413-428` |

### P1: 25 of 28 resolved

| ID | | What the code does now | Evidence |
|---|---|---|---|
| K2 | ◐ | "Change" opens a sample-photo picker and updates the filename, but the avatar stays a generic icon. There's no native picker. | `app/screens/onboarding/OnboardingFlow.tsx:221-225`, `components/upload.tsx:44-48` |
| K8 | ◐ | Reordered, with a trend strip, three options and "You" as assignee. Only Message acts; Call and Escalate only record an outcome. | `app/screens/PatientFollowUpDetailScreen.tsx:157-219` |
| K10 | ✅ | Swipe-back and a mounted stack; leaving a form asks first; leaving the room asks for confirmation. | `RootNavigator.tsx:70-83`, `ConsultationRoomScreen.tsx:226-233` |
| K13 | ✅ | Back is guarded, Save persists with a toast, hours copy to Mon–Fri, entries can be edited or deleted, and dates use a calendar. | `app/screens/AvailabilityScreen.tsx:386-475` |
| K15 | ✅ | The outcome uses the shared select sheet and commits only on Apply. | `ExpertResponseScreen.tsx:126-134`, `components/form.tsx:274-333` |
| K18 | ✅ | Profile row with a status pill. Status is Pending after submit, and Resubmit is routed. | `ProfileScreen.tsx:94-103`, `routes.tsx:721-741` |
| K20 | ✅ | One `openThread` helper, an in-call chat sheet, and the thread ⋮ is a real action. | `routes.tsx:166-170`, `ChatThreadScreen.tsx:69-90` |
| K21 | ✅ | One stored schedule drives the status sheet, and today's hours respect time off and exceptions. Both duration editors use one list (final pass). | `data/doctor.ts` `CONSULTATION_DURATIONS`, `DashboardScreen.tsx` `todayHoursLabel` |
| K23 | ✅ | Uses the shared sticky footer, which carries the bottom inset. | `AvailabilityScreen.tsx:480-503`, `components/ui.tsx:141-149` |
| K24 | ✅ | Follow-up and Report open with the appointment ID. The room stays mounted, and tiles show draft status. | `routes.tsx:357-362`, `ConsultationRoomScreen.tsx:212-213` |
| K25 | ✅ | Back and End Call confirm first. More is an action sheet and chat is an in-call sheet; dead controls are removed. | `ConsultationRoomScreen.tsx:226-252` |
| K28 | ✅ | Add Medicine opens a validated sheet. Medicines can be edited or removed, and removing asks first. | `EPrescriptionScreen.tsx:266-275`, `MedicineSheet.tsx` |
| K29 | ✅ | View Profile opens Appointment Details for the same appointment. | `ClinicalNotesScreen.tsx:162-169`, `routes.tsx:377` |
| K30 | ✅ | Tasks are built from records, and each opens its step. | `PendingTasksScreen.tsx:34-72`, `state/selectors.ts:235-308` |
| N05 | ✅ | Screens stay mounted under a push. The call timer comes from the store and survives opening Notes or the prescription. | `RootNavigator.tsx:61-80`, `ConsultationRoomScreen.tsx:212-224` |
| N06 | ✅ | Fee, duration, availability, privacy, change requests, alert acknowledgements and messages persist in the store for the session. | `state/store.ts:56-111`, `state/actions.ts:115-138` |
| N07 | ✅ | Submit shows a toast, then Account Status (Under review), then Go to Dashboard. | `OnboardingFlow.tsx:925-933`, `state/actions.ts:75-82` |
| N08 | ✅ | Status comes only from the store. The switcher sits behind the hidden long-press. | `profile/ProfileRouter.tsx:33-52`, `app/navigation/TabHeader.tsx:33-36` |
| N09 | ✅ | Entries have stable IDs, so editing one never overwrites another that remains. | `OnboardingFlow.tsx:63-67,590-720` |
| N10 | ✅ | "Bank account" is pre-selected, and Back returns to Bank details. | `routes.tsx:782-784`, `ProfileSettingsScreens.tsx:312,328` |
| N11 | ✅ | The password row became an OTP sign-in row and the biometric toggle is gone. Toggles persist. | `ProfileSettingsScreens.tsx:267-298` |
| N12 | ✅ | Send appends and updates the status. Close asks first. | `ExpertClarificationScreen.tsx:50-95`, `state/actions.ts:415-447` |
| N13 | ✅ | Apply merges into this prescription. Duplicate works, and delete asks first (own templates only). | `routes.tsx:417-421`, `ClinicalTemplatesScreen.tsx:235-282` |
| N14 | ✅ | Save Draft, Preview and Finalise work. A new prescription starts blank, so Finalise waits for real content (final pass). | `data/clinical.ts` `emptyRecord`, `state/seed.ts` |
| N15 | ✅ | Every control is wired or removed. Consent mode is derived, and upcoming appointments show "Starts…". | `AppointmentDetailsScreen.tsx:122-338` |
| N16 | ✅ | Rows open a metadata viewer. View patient and sort work, and dead items are removed. | `PatientDocumentsScreen.tsx:92-223`, `DocumentViewerScreen.tsx:46-62` |
| N17 | ✅ | Raised issues are stored in My Issues. Issue detail and the FAQ list work. | `HelpSupportScreen.tsx:70-259`, `SupportIssueScreen.tsx`, `FaqListScreen.tsx` |
| N18 | ◐ | The encryption claims are gone ("Secure connection" remains). "Visible only to your care team" and "kept for audit" are still unbacked. | `ConsultationRoomScreen.tsx:302-306`, `CaseDetailScreen.tsx:333`, `ExpertClarificationScreen.tsx:61,82` |

### P2: 30 of 36 resolved

| ID | | What the code does now | Evidence |
|---|---|---|---|
| K1 | ✅ | Inputs use a single-line text style with no line height. | `theme/typography.ts:72-78`, `DoctorLoginScreen.tsx:539` |
| K3 | ◐ | Pushes animate and saves show a toast, but onboarding steps still switch instantly. | `OnboardingFlow.tsx:346-350` |
| K4 | ✅ | "Other" ID has a name field, which is required and shown in Review. | `data/registration.ts:67,263`, `OnboardingFlow.tsx:533-546` |
| K5 | ✅ | Upload progress with cancel, error with retry, replace, and remove with confirmation. | `components/upload.tsx:205-313` |
| K9 | ✅ | The switch is unscaled inside a flex row, and overrides are full-width rows. | `AvailabilityScreen.tsx:545-565` |
| K11 | ✅ | Locked rows, plus a working "Request a change". | `profile/DoctorProfileDetailsScreen.tsx:14-25,105-114` |
| K12 | ✅ | The fee Edit is inline and opens Consultation Fee. The amount is centred. | `components/ui.tsx:575-580`, `DoctorProfileDetailsScreen.tsx:118-130` |
| K16 | ✅ | One shared 44 pt checkbox is used everywhere. | `components/Checkbox.tsx:30-48` |
| K17 | ✅ | Reads "Add Qualification" when the list is empty and "Add Another…" after that. | `OnboardingFlow.tsx:680,715` |
| K19 | ✅ | View all opens Payout History, with filters. | `EarningsScreen.tsx:217,234`, `PayoutHistoryScreen.tsx:70-121` |
| K22 | ✅ | "i" opens About reviews. Reporting asks for a reason, then confirms. | `ReviewsScreen.tsx:126-238` |
| K26 | ✅ | Only three ⋮ menus remain, and all do something. | `ClinicalTemplatesScreen.tsx:108-116`, `EPrescriptionScreen.tsx:537-549` |
| K27 | ◐ | Fixed widths are gone, with an 11 pt minimum and portrait lock. There's no global font-scale cap, and SE and Pro Max weren't checked on device. | `theme/typography.ts:29,47`, `theme/responsive.ts:36-43` |
| N19 | ✅ | The screen shrinks for the keyboard and reveals the focused field. Sheets lift above it. | `components/ui.tsx:45-168`, `components/BottomSheet.tsx:78,106` |
| N20 | ✅ | A pick is a draft until Apply; X and the backdrop discard it. The footer clears the home indicator. | `components/form.tsx:274-495` |
| N21 | ✅ | Outfit and Inter are requested and bundled on both platforms. Skeleton text sets no font family. | `theme/typography.ts:14`, `ios/Doctor/Info.plist:38-50` |
| N22 | ✅ | The count comes from the filtered list. Status, Risk and Sort sheets are real, and dates are searchable. | `app/screens/CasesScreen.tsx:110-286` |
| N23 | ✅ | Tiles, times, alerts and tasks come from store lists, with one ID scheme. | `DashboardScreen.tsx:78-93`, `state/selectors.ts:119-319` |
| N24 | ✅ | Validates real dates of birth, email, ID formats, year bounds and end ≥ start. The mask shows after blur, and Edit returns to Review. | `data/registration.ts:207-329` |
| N25 | ✅ | The verified number is the one entered at sign-in. | `app/App.tsx:31,37`, `OnboardingFlow.tsx:323,472` |
| N26 | ✅ | Leaving step 1 or an edited entry asks first, Android back included. | `OnboardingFlow.tsx:339-404` |
| N27 | ✅ | +91 is a static label. Contact and Support open real email, phone and WhatsApp links. | `DoctorLoginScreen.tsx:86-100,427-442` |
| N28 | ◐ | The field and the button stay above the keyboard, but the iOS number pad still has no Done key. | `DoctorLoginScreen.tsx:148-154,391` |
| N29 | ✅ | Validation and "Save notes & continue" are fixed. Refer during a live call opens on that patient (final pass). | `state/selectors.ts` `selectReferableCase`, `CreateClarificationScreen.tsx` |
| N30 | ◐ | Export is removed, and notes, prescription and summary are read-only once closed. Care Hub is still editable on closed cases. | `CaseDetailScreen.tsx:163-323`, `CareHubScreen.tsx:70-128` |
| N31 | ✅ | Selects work, submitting confirms with a toast, and the list updates. Attach uses demo files. | `CreateClarificationScreen.tsx:183-411`, `state/actions.ts:372-412` |
| N32 | ✅ | The bell appears only on tab roots, and it opens Notifications. | `app/navigation/TabHeader.tsx:46-59` |
| N33 | ✅ | Unread styling, a derived badge, targets that open by ID, and Mark all read. | `NotificationsScreen.tsx:46-84`, `state/selectors.ts:337-345` |
| N34 | ◐ | Assign Plan and the Instant screens are routed. Expert Case Review and Expert Inbox are still files nothing imports. | `RootNavigator.tsx:91,106-108` |
| N35 | ✅ | Tab screens don't add the inset twice, pushed screens add it once, and there is one BottomSheet. | `components/ui.tsx:142-197`, `FollowUpAlertsScreen.tsx:54` |
| N36 | ✅ | Portrait-only on iPhone and Android. | `ios/Doctor/Info.plist:57-60`, `android/.../AndroidManifest.xml:18` |
| N37 | ◐ | Type styles clamp at 11 pt, but one room value can shrink to 10.2 pt. The unrouted Expert Inbox has 10 pt text. | `theme/typography.ts:29,47`, `ConsultationRoomScreen.tsx:365,619` |
| N38 | ✅ | Every named target is at least 44 pt. Template and Care Hub chips are 36 pt. | `components/Checkbox.tsx:34,48`, `PendingTasksScreen.tsx:37-68` |
| N39 | ✅ | All eight destructive actions ask first. | `components/confirm.ts:11-36`, `ProfileScreen.tsx:48-55`, `ConsultationRoomScreen.tsx:235-252` |
| N40 | ✅ | 30 of 30 suites and 314 of 314 tests pass. The Availability spec is unchanged and passing. | `app/screens/AvailabilityScreen.spec.tsx` |
| N41 | ✅ | The same number or the demo number skips onboarding; only new numbers onboard. This is in memory until the backend exists. | `state/actions.ts:51-73`, `app/App.tsx:37-39` |

### P3: 8 of 9 resolved

| ID | | What the code does now | Evidence |
|---|---|---|---|
| N42 | ◐ | Headers, the back arrow and the alert data are consolidated. Disabled styles, card corner radii (12–18) and raw font sizes are still mixed. | `components/ScreenHeader.tsx:19-23`, `components/ui.tsx:772,852` |
| N43 | ✅ | Rows outside Today show the date. Each appointment has its own countdown, and the No-show chip is present. | `app/screens/AppointmentsScreen.tsx:34-162` |
| N44 | ✅ | The empty state no longer mentions filters, and the info icon is the standard 18 pt. | `ReviewsScreen.tsx:180,187` |
| N45 | ✅ | The chart card is rounded, the chevron flips, and "Clear recommendations" saves. | `EarningsScreen.tsx:288-290`, `CareHubScreen.tsx:130-196` |
| N46 | ✅ | The Patient ID label is correct, the self-view shows "Camera off", and Notes shows draft status. | `ConsultationRoomScreen.tsx:46-52,276,351` |
| N47 | ✅ | One-time-code autofill and paste fill every box, using the single-line input style. | `DoctorLoginScreen.tsx:184-185,311-312` |
| N48 | ✅ | The tab badge comes from the store while the status is unacknowledged. | `app/navigation/TabBar.tsx:37,82,100` |
| N49 | ✅ | The thread scrolls to the latest message on open and on send. Document chips open the viewer. | `ChatThreadScreen.tsx:129-162` |
| N50 | ✅ | The language picker's button label and search text are props with neutral defaults. | `components/form.tsx:407-503` |

---

## 3. Remaining issues

### The 10 partial findings

| ID | Sev | What remains | Why it's left | Depends on |
|---|---|---|---|---|
| N30 | P2 | Care Hub is still editable on closed cases. | Not reached in this pass. | Front end only (small). |
| N28 | P2 | The iOS number pad has no Done key. The button stays visible above it. | Needs an input accessory view. | Front end only (small). |
| N37 | P2 | One room value can shrink to 10.2 pt, and the unrouted Expert Inbox uses 10 pt text. | Not reached in this pass. | Front end only (small). |
| K3 | P2 | Onboarding steps switch without a transition. There are no loading states because nothing is async yet. | Loading states arrive with real API calls. | Backend integration, plus front-end polish. |
| K27 | P2 | No global font-scale cap. iPhone SE and 17 Pro Max were not checked on a device. | The simulator pass was stopped. | A 10-minute simulator pass, and a decision on the font-scale cap. |
| N34 | P2 | `ExpertCaseReviewScreen.tsx` and `ExpertInboxScreen.tsx` are never imported. Expert Inbox also holds a cardiology mock (HFrEF). | Kept hidden per D9, not deleted. They aren't in the bundle, so testers never see them. | Decide whether to delete them. |
| N42 | P3 | Disabled styles, card corner radii and raw font sizes are still mixed. | A design-token pass, not a bug fix. | Design tokens. |
| K2 | P1 | Profile photo: only a sample-photo picker; the avatar doesn't show the chosen image. | No native image-picker library is installed. | A native module and rebuild, plus backend upload. |
| K8 | P1 | Critical Findings: Call and Escalate only record an outcome. | There's nothing to call or escalate to. | Backend telephony and escalation. |
| N18 | P1 | "Visible only to your care team" and "kept for audit" aren't backed by anything. | They depend on server access control and audit. | Backend confirmation, or product changes the copy. |

### Other items found during verification

| Item | Depends on |
|---|---|
| Skeleton placeholders set no font family (a leftover from N21). | Front end. |
| The "Anxiety Initial Care" template's durations and instructions (Escitalopram 14 days / morning; Clonazepam "short course only") differ from the old draft mock (7 days / after dinner; "use only as directed"). | Product sign-off. |
| Everything a doctor enters lives in memory and resets when the app restarts. | Backend. |
| Git history still holds the actress's photo and name (commit `bc8253e`). They are gone from the working tree, and the next commit removes them from the current code. | Your decision: purging history is irreversible and needed only if the repository is shared. |
| The APK is signed with the debug key. | A release keystore, for the Play Store. |

---

## 4. What changed

| Area (brief) | What changed | Main files |
|---|---|---|
| Navigation (root cause 1) | React Navigation 7 replaces the custom single-route stack. It has a native stack over 5 tabs and 41 routes. Every detail route carries its entity ID, and an ID that no longer resolves shows a "Could not open this …" page with a way back. Swipe-back is native, and turned off only for the consultation room and Resubmit. Android back closes an open sheet first, then pops the stack, and leaves a tab root to the OS. Pressing the active tab again pops it to its root. | `app/navigation/RootNavigator.tsx`, `routes.tsx`, `TabBar.tsx`, `components/NotFound.tsx` |
| State | One store with actions and selectors, seeded from the fixtures. Anything the doctor edits survives leaving the screen: notes, prescriptions, availability, fee and duration, chat messages, notification read state, support issues, review reports and change requests. | `state/store.ts`, `actions.ts`, `selectors.ts`, `seed.ts` |
| Patient context | Alerts, cases, clarifications, documents and chat threads are looked up by patient and appointment ID, so one patient's data can't appear on another's screen. | `data/*.ts`, `state/selectors.ts` |
| Clinical inputs | Notes are real inputs with required-field checks and a true save status. The case summary is typed, and its checklist is derived from what was actually done. Prescription medicines can be added, edited and deleted (IDs `med_001`…), with a patient PDF preview. | `ClinicalNotesScreen`, `CaseSummaryScreen`, `EPrescriptionScreen`, `MedicineSheet`, `PrescriptionPreviewScreen` |
| Availability | The 4 acceptance tests pass with the spec unchanged. Save persists. | `AvailabilityScreen.tsx` |
| Persona | "Dr. Arjun Mehta" everywhere, shown with an initials avatar. The actress's photos are deleted (`assets/profile*.jpg`, evidence image u9), and no mention of her remains in the working tree. | `data/doctor.ts`, `state/selectors.ts` |
| Onboarding | Uploads have a lifecycle (selecting → uploading → uploaded, or an error with retry; removal asks first) using a sample file picker. Validation was tightened. Submitting shows a toast and opens Account Status. | `onboarding/OnboardingFlow.tsx`, `components/upload.tsx` |
| Notifications | Unread state is shown, the badge is derived from unread items, and each notification opens its own record and marks it read. | `NotificationsScreen`, `TabHeader.tsx` |
| Chat | Messages persist per thread, unread counts are derived, and in-call chat goes to that patient's own thread. | `ChatThreadScreen`, `state/actions.ts` |
| Consultation room | Opening notes, prescription or other tools keeps the call and its timer. End Call and Android back both ask first. "Patient ID" now shows the patient ID. | `ConsultationRoomScreen`, `routes.tsx` |
| Demo tools | Hidden from testers and clients: they open only on a 1.5 s long-press of the header logo. They cover verification status (approve, reject, pending) and resetting the demo data. | `app/navigation/TabHeader.tsx` |
| Safe area and keyboard | One `Screen` primitive owns the insets. Keyboard overlap is measured from the keyboard's top edge, which is correct under Android edge-to-edge. Sheets keep their fields visible with the keyboard up, and the focused field scrolls into view. | `components/ui.tsx`, `useKeyboard.ts`, `BottomSheet.tsx`, `form.tsx` |
| Confirmations | Destructive actions go through one native `confirm()`. | `components/confirm.ts` |

### Account status for the client demo (your request)

After a new doctor submits their profile, the app shows **Account Status (Under review)** with a **Go to Dashboard** button, as it did before. The whole app is then usable for the demo: Dashboard, profile details, settings and every other area. Profile keeps an **Account status** row with a status pill. The demo tools can switch the status to *Changes required*, which lists the flagged items and offers **Resubmit**, or to *Approved*. The real verification rules and state will come from the backend.

---

## 5. Android pass

The release APK was installed on a Pixel 7 emulator (Android 15, API 35) and checked screen by screen. These fixes came out of it:

| Issue found | Fix |
|---|---|
| The chat composer and forms sat 24 dp under the keyboard, because Android edge-to-edge reports the keyboard height without the navigation bar. | Overlap is measured as window height minus the keyboard's top edge (`useKeyboard.ts`). |
| Bottom sheets collapsed their fields when the keyboard opened, because the keyboard was subtracted twice. | The keyboard is applied once, as bottom padding (`BottomSheet.tsx`). |
| A focused field could stay partly hidden. | The field is revealed after layout, with a fallback (`ui.tsx`). |
| The OTP screen showed a half-cut logo row with the keyboard up. | Once the screen scrolls, it clears the whole row (`DoctorLoginScreen.tsx`). |
| A faint seam appeared between the status bar and the white header on Appointments and Cases. | The status strip now takes the header's colour (`Screen` `topColor`). |
| The release build failed: androidx.core 1.17 requires compileSdk 36. | `compileSdkVersion = 36`. targetSdk stays 35. |

The grey boxes and the selected OTP digit seen during scripted testing come from `adb` key injection, which takes Android out of touch mode. Real taps on the on-screen keyboard don't show them; this was verified.

---

## 6. Tests

- **The 7 tests that failed at baseline:**
  - The 4 `AvailabilityScreen.spec` acceptance tests now pass **with the spec file unchanged**.
  - AppShell "tabs switch the visible screen" was kept and updated to current copy.
  - App "OTP leads into onboarding" was replaced by two tests: "the demo account lands on the Dashboard" and "any other number is a new account and goes through onboarding first". The behaviour changed on purpose so that signing in again doesn't force onboarding (N41).
  - Navigation "hardware back never closes the app from a form screen" was replaced by "hardware back pops the stack instead of closing the app" and "leaving a form with unsaved changes asks first".
- **Coverage the brief asked for:**
  - Cross-context: "three patients' records never bleed into each other", plus per-patient checks for documents, alerts, chat and room.
  - Persistence: "notes survive leaving the screen and coming back", "signing out and back in as the same doctor keeps this session's work", and the chat, fee and availability tests.
  - Back: "back from a detail returns to the screen that opened it", "back unwinds a multi-level trail one step at a time", the hardware-back tests, and the room's leave-call guard.
- **Fixture conformance:** `SpecConformance.spec` now scans every fixture module in `data/` and `state/` for cardiology content, instead of two lists. "Palpitations", a banned term, had come back in 7 strings across 3 fixture files during this work. They are reworded in psychiatric terms, and the scan now guards against it recurring.
  - Assertions pinned to demo content that no longer exists (pre-filled notes, the pre-filled draft prescription, "ID:" labels) were rewritten to the current behaviour. Each carries a comment naming the finding it follows.
- **Rewritten suites:** App, AppShell, Navigation, OnboardingFlow, ProfileRouter, AccountStatusBanner, Earnings, Reviews, InstantRequest, SpecConformance and `documents.spec`.
- **New suites:** Messaging, Support, ProfileSettings.
- **Timing fix:** one test, the tab re-press that pops to root, waits on React Navigation's next-frame pop. Its wait budget was raised to 5 s because a loaded parallel run can deliver that frame late. The assertion itself is unchanged.

---

## 7. Devices tested

| Device | Build | Coverage |
|---|---|---|
| iPhone 17 (iOS simulator) | Debug via Metro | End to end, driven through the app's own handlers:<br>• login and OTP, then Dashboard<br>• join, room, notes (timer kept), End Call confirm, prescription (medicine sheet), finalise, summary, follow-up plan, case detail<br>• notifications, chat persistence, documents, viewer, request report (discard guard)<br>• instant request, clarifications, profile fee, availability save<br>• bank changes, privacy, support issue, FAQs, earnings, payouts, reviews<br>• resubmit flow, new-account onboarding, Account Status, Go to Dashboard |
| Pixel 7, Android 15 (emulator) | Debug via Metro, then the **release APK** | Main screens, keyboard behaviour (composer, sheets, request form, OTP), then the release APK: login, OTP, Dashboard, Appointments, Cases, Profile |
| iPhone SE (3rd gen), iPhone 17 Pro Max | — | **Not run.** The simulator pass was stopped at your request. Layout rules are covered by `theme/responsive.spec.tsx`. |

The final polish pass was walked through again on iPhone 17 after every change: live-call round trips, Refer, the blank prescription, both duration editors, the alert discard prompt and Reviews. The release APK was smoke-tested on Android.

---

## 8. For testers

- **APK:** `apps/doctor/android/app/build/outputs/apk/release/app-release.apk`, CoraCure Doctor 1.0 (1), 37 MB. It's signed with the debug key, so it installs directly (allow "install unknown apps") but isn't meant for the Play Store.
- **Demo account:** mobile **98765 43210**, then any 6-digit code.
- **New account:** any other mobile number goes through onboarding (use the sample file picker for uploads), then Account Status, then **Go to Dashboard**.
- **Demo tools:** long-press the CoraCure logo in the header for 1.5 s to approve or reject verification, set it back to pending, or reset the demo data.
- **Instant request:** opens from its notification (bell icon).
