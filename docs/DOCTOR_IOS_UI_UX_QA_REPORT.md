# Cora-Cure Doctor iOS — UI/UX QA Audit Report

| | |
|---|---|
| **App** | `apps/doctor` — bare React Native 0.84, Nx monorepo |
| **Build** | Debug build, Metro bundle `apps/doctor/src/main` |
| **Device** | iPhone 17 Simulator, iOS 26.5 |
| **Date** | 24 Sep 2026 |
| **Scope** | Doctor app frontend only: UI, UX, navigation, interaction, iOS behaviour. Backend, APIs and Android are out of scope. |
| **Status** | **Audit only. No application code was changed.** Implementation starts after this report is reviewed. |

How to read this: §1 is the verdict. §3 lists the ten root causes behind most findings; fixing those first removes whole classes of bugs. §4 and §5 are the finding tables. §10 lists the decisions needed from you before implementation. §11 is the proposed build order.

---

## 1. Executive summary

**Verdict: not client-demo ready.** The visual language is coherent and many screens look finished. But a client tapping through the core doctor journey will hit blank screens, buttons that do nothing, clinical fields that can't be typed into, and records from the wrong patient.

```text
Screens inspected:        53 screens/states + 10 sheets/modals (40 screen files, ~28.7k lines read in full)
Navigation flows:         34 stack routes + 5 tabs, ~80 entry→destination edges traced
Known issues (yours):     30 — all 30 reproduced on device or traced to a code root cause
New issues discovered:    50
P0:                       7   (3 known + 4 new)
P1:                       28  (14 known + 14 new)
P2:                       36  (13 known + 23 new)
P3:                       9   (0 known + 9 new)
Fixed:                    0   (audit only, as requested)
Remaining:                80
```

### The five problems that matter most

1. **Clinical documentation can't be written.** Clinical Notes fields are read-only text styled as inputs, with character counters and a fake "Autosaved" stamp. Tapping the Case Summary box inserts a canned summary; tapping again clears it. That canned text says "No self-harm ideation elicited" for a patient whose follow-up alert reports self-harm thoughts. (N01, N02)
2. **Patient context is mixed.** Rahul Sharma's psychiatry case shows a cardiology record ("Stable Angina", Ecosprin/Atorvastatin/Metoprolol, "ECG normal"). Every follow-up alert opens Rahul's red-flag detail. Every clarification opens the same thread. Profile → *Verification documents* opens a patient's documents. (N03, K14 — confirmed on device)
3. **Navigation is a hand-built stack that only mounts the top screen.** One notification leads to a blank screen with no way out. Screens lose their state whenever you go back, the live call restarts when you open notes, and iOS swipe-back doesn't exist. About 95 distinct controls do nothing or the wrong thing. (K6, K7, K10, N05)
4. **The signed-in doctor used a real actress's name and photo.** Meanwhile the rest of the fixtures treat "Dr. Arjun Mehta" as the signed-in doctor. (N04)
5. **Saves don't save.** Fee, duration, availability, privacy toggles and acknowledgements are local state and vanish on back. Availability lives in four disconnected places that contradict each other: the Dashboard defaults to "Offline" while Profile says "Available now". (N06, K21)

### What already works well

- A consistent brand palette, card system and iconography across most screens.
- Onboarding step gating: *Save & Continue* only enables when the step is complete.
- The Appointments tab has real loading, skeleton, error and retry states. It is the only screen that does.
- The doctor status sheet works and stages its changes correctly. The chat list and threads work, and sending appends messages. Care Hub selection and saving work.
- Most filters, chips and search fields work, and tab switching works.
- The type-check is clean, and 307 of 314 existing tests pass.

---

## 2. Scope, method and evidence

**Method**

1. Read all 40 screen files, the shared components, theme, typography and mock data in full (~28.7k lines). Mapped every route, callback and handler.
2. Reproduced your 9 screenshots against the code.
3. Verified key behaviour on the running simulator through the Metro/Hermes debugger. Controls were pressed via their existing `testID` or accessibility label, the same as a tap, and no project files were modified.
4. Ran an automated scan on 26 screens for pressable controls that have **no press handler at all**. Controls wired to an empty function (`() => undefined`) can't be seen at runtime, so those come from the code audit.
5. Recorded a baseline: `jest` gives **307/314 passing, 7 failing before any change**; `tsc --noEmit` is clean. See Appendix C.

**Limits**

- iPhone 17 only. Small-screen (iPhone SE) and large-text issues are derived from the code, not from a device.
- No VoiceOver pass.
- Unreachable screens (§5, N34) were skimmed, not exhaustively audited.
- **Finding 23:** the Dashboard's status sheet was checked on device and is inside the safe area (evidence d6). The unsafe control is Availability's **Save & Publish Schedule** (your screenshot #8). If you meant a different button, tell me.

**Evidence** is in `docs/qa-evidence/doctor-ios-2026-09-24/`. Files `u1`–`u9` are your screenshots; `d1`–`d6` are device captures from this audit. See Appendix D.

---

## 3. Root causes: fix these first

Most of the 80 findings trace back to ten structural causes. Fixing a root cause fixes every finding listed against it.

| # | Root cause | Where | Findings it drives |
|---|---|---|---|
| **RC1** | **Hand-built navigation stack.** `useNavStack` keeps a list of `{name}` routes and `AppShell` renders **only the top one**. Routes have no typed parameters (IDs are dropped). There are no transitions and no iOS swipe-back. Switching tabs discards the trail. | [navigation.ts:108](../apps/doctor/src/app/navigation.ts#L108), [AppShell.tsx:239](../apps/doctor/src/app/AppShell.tsx#L239) | K3 K6 K7 K10 K14 K20 K24 K30 N03 N05 N34 |
| **RC2** | **Silent no-op handlers.** 38 handler props default to `() => undefined`. The shell never overrides 24 of them, and it wires 7 more to `noop`. Wherever that happens, the control renders, reacts to touch and does nothing. | e.g. [AppShell.tsx:224](../apps/doctor/src/app/AppShell.tsx#L224), [PendingTasksScreen.tsx:110](../apps/doctor/src/app/screens/PendingTasksScreen.tsx#L110) | K7 K11 K19 K22 K24 K25 K29 K30 N12–N17 N32 |
| **RC3** | **Detail fixtures are not keyed by ID.** The follow-up detail, clarification thread, patient documents, report request and follow-up plan each use one hard-coded patient. Case `c1` carries a cardiology record. | [followup.ts:296](../apps/doctor/src/data/followup.ts#L296), [ExpertClarificationScreen.tsx:22](../apps/doctor/src/app/screens/ExpertClarificationScreen.tsx#L22), [doctor.ts:259](../apps/doctor/src/data/doctor.ts#L259) | N03 K8 K14 N23 |
| **RC4** | **Placeholder inputs presented as real.** `FieldValue` is text dressed as an input. The Case Summary box is a toggle. The Expert Response "dropdown" cycles on each tap. `pick()` returns the same stub file every time. | [clinical.tsx:113](../apps/doctor/src/components/clinical.tsx#L113), [CaseSummaryScreen.tsx:179](../apps/doctor/src/app/screens/CaseSummaryScreen.tsx#L179), [ExpertResponseScreen.tsx:105](../apps/doctor/src/app/screens/ExpertResponseScreen.tsx#L105), [OnboardingFlow.tsx:54](../apps/doctor/src/app/screens/onboarding/OnboardingFlow.tsx#L54) | N01 N02 K15 K2 K5 |
| **RC5** | **Everything is component-local state.** Nothing survives leaving a screen: settings, the availability schedule, acknowledgements, sent messages, drafts. | All settings screens, [AvailabilityScreen.tsx:253](../apps/doctor/src/app/screens/AvailabilityScreen.tsx#L253) | N06 K21 K13 |
| **RC6** | **Text inputs inherit a fixed `lineHeight`.** `typeStyles.input` and `typeStyles.body` set `lineHeight`, and iOS draws single-line `TextInput` text below the box's centre. | [typography/index.ts:54](../libs/typography/src/index.ts#L54) | K1 K12 N47, status-sheet hour fields |
| **RC7** | **Safe area and keyboard are handled per screen.** `Screen` pads the bottom only when asked, but 32 routes hide the tab bar. Sheets use fixed bottom padding. No keyboard insets on the shared scroll view. | [ui.tsx:38](../apps/doctor/src/components/ui.tsx#L38), [form.tsx:132](../apps/doctor/src/components/form.tsx#L132) | K23 N19 N20 N35 |
| **RC8** | **No shared header, action menu, confirmation or toast components.** Each screen hand-rolls its header, often with a decorative bell. There's no way to confirm a destructive action or show success. | 5 header variants | N32 K26 N39 K3 |
| **RC9** | **Typography config doesn't match the bundled fonts.** Code requests `Rounded` / `Montserrat`, but the app bundles Inter / Outfit. Screens override font sizes down to 7.5pt. | [typography/index.ts:12](../libs/typography/src/index.ts#L12), `ios/Doctor/Info.plist` UIAppFonts | N21 N37 |
| **RC10** | **Two doctor personas, one of them a real person.** | [doctor.ts:354](../apps/doctor/src/data/doctor.ts#L354) + fixtures naming "Dr. Arjun Mehta" | N04 |

---

## 4. Known findings (your 30)

Validation key: **Device ✓** reproduced on the simulator during this audit · **#n** your screenshot · **Code ✓** traced to the exact code path.

| ID | Finding | Screen | Root cause | Sev | Fixed | Validation |
|---|---|---|---|---|---|---|
| K1 | Login input text misaligned | Login (phone and OTP) | The phone `TextInput` inherits `typeStyles.input` (`lineHeight: 21`), so iOS draws the digits ~3pt below "+91". Same in the OTP boxes. [DoctorLoginScreen.tsx:451](../apps/doctor/src/app/screens/DoctorLoginScreen.tsx#L451) (RC6) | P2 | No | #1 · Code ✓ |
| K2 | "Change" doesn't work on profile creation | Onboarding › Basic Details (photo) | `pick()` returns the identical stub `profile-photo.jpg`, the avatar never renders the chosen image, and no image picker is installed. So "Change" produces no visible change. [OnboardingFlow.tsx:286](../apps/doctor/src/app/screens/onboarding/OnboardingFlow.tsx#L286) | P1 | No | Code ✓ |
| K3 | No transition/loading state between steps | Onboarding, all stack pushes, saves | Screens swap instantly (RC1). Only Appointments uses the loading hook. Save and submit actions have no pending or success feedback: *Submit for Verification*, *Submit Summary*, *Save fee*, *Send request*, *Submit to Expert*, … | P2 | No | Code ✓ |
| K4 | "Other government ID" needs a name field | Onboarding › Proof of Identity | `ID_TYPES` includes "Other government ID", but `IdentityProof` has no name field, the step always renders the same inputs, and `isStepComplete` never asks for one. [registration.ts:18](../apps/doctor/src/data/registration.ts#L18) | P2 | No | #2 · Code ✓ |
| K5 | No cancel/remove for other document uploads | Onboarding › Add Qualification / Experience (the shared upload field) | The upload field has no uploading or cancel state. "Remove" is a **⋮ icon that deletes instantly**, and "Replace" re-picks the same stub. The add-entry sub-forms have no Cancel button; the footer's `secondary` slot is unused. [form.tsx:810](../apps/doctor/src/components/form.tsx#L810) | P2 | No | Code ✓ |
| K6 | Navigation misconfiguration | Global | RC1 and RC2: only the top route is mounted, routes drop IDs, required-param routes render nothing, 31 handler props are wired to nothing, the Profile documents row is mis-mapped, and 6 screens are orphaned. | **P0** | No | Device ✓ d1 d3 d4 |
| K7 | Notifications on Profile not working | Profile › Notifications (row and bell) | The row opens the inbox, but **"Appointment confirmed → View" pushes `apptDetails` without an appointment**, and the screen renders nothing: no header, no back button, no tab bar. You have to force-quit. [AppShell.tsx:234](../apps/doctor/src/app/AppShell.tsx#L234), [AppShell.tsx:255](../apps/doctor/src/app/AppShell.tsx#L255). The row subtitle promises settings ("Manage what you are notified about") but opens the inbox. | **P0** | No | Device ✓ d1 |
| K8 | Critical Findings page has too much cognitive load | Patient Follow-up Detail (red flag) | The self-harm answers come **third**, after identity and a 7-day grid. The red-flag status is a 9.5pt pill. Day tiles are tappable but do nothing, and the answer rows show chevrons but are dead. "Recommended Action" has **one** option ("Advise Follow-up Booking"). There's no *call patient* or *escalate* action. The primary button is "Save & Mark as Reviewed". "Assigned To" shows another doctor. [PatientFollowUpDetailScreen.tsx:110](../apps/doctor/src/app/screens/PatientFollowUpDetailScreen.tsx#L110), [followup.ts:292](../apps/doctor/src/data/followup.ts#L292) | P1 | No | Device ✓ d3 |
| K9 | Availability schedule misaligned | Availability › Weekly schedule | The switch is scaled with `transform` but keeps its 51pt layout width in a 44pt column, so the toggle overlaps the "Not available" box. The ⋮ uses a magic `paddingTop: 10`. Override cards are a fixed 150pt, so "02:00 / PM" wraps. The Duration and Buffer values sit on different baselines. [AvailabilityScreen.tsx:788](../apps/doctor/src/app/screens/AvailabilityScreen.tsx#L788) | P2 | No | #8 · Code ✓ |
| K10 | Back navigation unreliable | Global | No iOS edge-swipe, and returning remounts the previous screen with fresh state. **Availability's back arrow has no handler.** The Consultation Room's "back" is its logo. Sub-form back silently discards. Bank → Request change uses `replace`, so back skips Bank. | P1 | No | Device ✓ · Code ✓ |
| K11 | Unused "Professional Details" button | Profile › Profile Details › Professional Details | Specialties, Qualification, Registration and Experience rows show chevrons, but AppShell passes `onOpen={noop}` and no destinations exist; these fields are admin-locked. [AppShell.tsx:401](../apps/doctor/src/app/AppShell.tsx#L401) | P2 | No | #9 · Code ✓ |
| K12 | Consultation fee "Edit" misaligned | Profile Details › Consultation Fee; Consultation fee screen | In compact rows the shared list row puts its right-hand element **under** the subtitle, and the Button stretches to full width. The Edit button also does nothing (`onOpen` is a no-op). On the fee screen, "₹" and the amount input share a 31pt `lineHeight`, so the digits sit ~4pt lower. [ui.tsx:385](../apps/doctor/src/components/ui.tsx#L385), [ProfileSettingsScreens.tsx:518](../apps/doctor/src/app/screens/profile/ProfileSettingsScreens.tsx#L518) | P2 | No | #9 · Device ✓ d5 |
| K13 | Availability buttons broken | Availability | Back and bell have no handler. **Save pops immediately**, so "Schedule Saved!" is never seen and every change is lost. "Copy last week" actually copies **Monday** to weekdays. "Copy to other days" silently skips weekends. There's no per-slot remove. "Clear day" leaves the day on with zero slots. Override cards select but can't be edited or deleted. Leave and override dates are unvalidated free text in sheets the keyboard covers. The time picker opens on a **stale time** because its state is initialised once. The 4 failing tests in `AvailabilityScreen.spec.tsx` describe the intended add/edit/remove and validation. | P1 | No | Device ✓ · Code ✓ |
| K14 | Verified Documents opens Patient Past History | Profile › Verification documents | `documents` is mapped to `push({ name: 'patientDocs' })`, which is the patient documents screen (Rahul Sharma). No doctor verification-documents screen exists. [AppShell.tsx:473](../apps/doctor/src/app/AppShell.tsx#L473) | **P0** | No | Device ✓ d4 |
| K15 | "Your Decision" dropdown misbehaves | Expert Response | The Outcome field is a placeholder: each tap **silently cycles to the next option** ("a picker replaces this later"). No menu, no option list, no cancel. [ExpertResponseScreen.tsx:105](../apps/doctor/src/app/screens/ExpertResponseScreen.tsx#L105) | P1 | No | Code ✓ |
| K16 | Checkbox implementation | Onboarding, Expert Response, Create Clarification, Request Changes | Three different checkbox implementations with different size, radius and glyph (the compact one uses a filled circle-check inside a square). Hit area equals the label height (~20pt for one line). No pressed feedback. State wiring itself is correct. [form.tsx:860](../apps/doctor/src/components/form.tsx#L860), [compact.tsx:207](../apps/doctor/src/components/compact.tsx#L207) | P2 | No | Code ✓ |
| K17 | "Add Another Experience" shown initially | Onboarding › Experience **and** Qualifications | Labels are hard-coded. Your screenshot #3 shows "Add Another Qualification" with zero entries, directly under "No qualifications added yet". [OnboardingFlow.tsx:526](../apps/doctor/src/app/screens/onboarding/OnboardingFlow.tsx#L526), [:675](../apps/doctor/src/app/screens/onboarding/OnboardingFlow.tsx#L675) | P2 | No | #3 · Code ✓ |
| K18 | Account Status not accessible | Profile | Status screens show only while unapproved or unacknowledged; once acknowledged, nothing leads back. After onboarding the doctor is **instantly "Approved"** (`initialVerification='approved'`). Contact Admin and Resubmit are no-ops. On the Approved screen, **"Get Support → Contact Support" calls `onAcknowledge` and jumps to the Dashboard**. [ProfileRouter.tsx:41](../apps/doctor/src/app/screens/profile/ProfileRouter.tsx#L41), [AccountStatusScreens.tsx:365](../apps/doctor/src/app/screens/profile/AccountStatusScreens.tsx#L365) | P1 | No | Code ✓ |
| K19 | Payout History "View All" | Earnings | "View All" is never wired, and all 3 payout records are already shown, so there's no longer history to reveal. The "Payout Status" card is pressable but does nothing. [EarningsScreen.tsx:281](../apps/doctor/src/app/screens/EarningsScreen.tsx#L281) | P2 | No | Code ✓ |
| K20 | Chat button inconsistent | Dashboard, Clarifications, Notifications, Appointment Details, Consultation Room, Follow-up Detail | The header message icons (Dashboard, Clarifications, Notifications) open Messages ✓. Follow-up Detail opens the right thread ✓. **Appointment Details message has no handler ✗, the Room "Chat" has no handler ✗**, and chat attach and ⋮ are dead. Each screen has its own optional callback and there's no shared "open chat for this patient" action. | P1 | No | Device ✓ · Code ✓ |
| K21 | Availability / scheduling UX unclear | Dashboard status, Status sheet, Profile, Availability | **Four unsynchronised sources of truth.** (1) Live status defaults to Offline. (2) The status sheet's "Available hours" are free text and **discarded on Save** (only the status key is saved, [StatusSheet.tsx:129](../apps/doctor/src/components/StatusSheet.tsx#L129)). (3) The Profile card is hard-coded "Available now". (4) The Availability schedule and its Duration duplicate the Profile › Consultation duration screen, and neither persists. The status label "Schedule Appointments" reads like a button, not a state. | P1 | No | Device ✓ d6 · Code ✓ |
| K22 | Reviews "i" button not working | Reviews & Feedback | `onInfo` is never wired, and "Report concern" is dead too. The icon is 28pt against 18–22pt everywhere else. [ReviewsScreen.tsx:179](../apps/doctor/src/app/screens/ReviewsScreen.tsx#L179) | P2 | No | Code ✓ |
| K23 | Schedule button outside the safe area | Availability › Save & Publish Schedule | Availability builds its own root and its scroll padding assumes a tab bar ("the tab bar below already absorbs insets.bottom"). It is a full-screen route with **no** tab bar, so the button ends ~17pt inside the 34pt home-indicator zone. [AvailabilityScreen.tsx:421](../apps/doctor/src/app/screens/AvailabilityScreen.tsx#L421). The Dashboard status sheet was checked and is safe (d6). | P1 | No | #8 · Device ✓ d6 |
| K24 | Quick Clinical Actions partially broken | Consultation Room | The shell handles only `note` and `rx`; **"Assign Follow-up" and "Request Report" do nothing**, although both screens exist. Opening Notes or Rx **unmounts the call**, so the timer restarts on return. The "draft saved" banner is set just before the room unmounts, so it's never seen. Labels are 9.5pt. [AppShell.tsx:284](../apps/doctor/src/app/AppShell.tsx#L284) | P1 | No | Code ✓ |
| K25 | Consultation Room controls (Add user, options, chat) | Consultation Room | Add participant, the header ⋮, the bottom "More" and "Chat" all fall back to no-op defaults; the shell never passes them. Switch camera is `() => undefined`. Back is the logo, with no confirmation. End Call has no confirmation. [ConsultationRoomScreen.tsx:120](../apps/doctor/src/app/screens/ConsultationRoomScreen.tsx#L120) | P1 | No | Code ✓ |
| K26 | Three-dot menus with no purpose | Cases, Pending Tasks, Templates, Appointment Details, Room, Follow-up Detail, Expert Response, Chat thread, Patient Documents, medicine card, upload field | Only Availability's ⋮ has a working menu. Every other ⋮ is dead, or does a different job than its icon suggests (upload remove, medicine "edit"). Templates show a ⋮ **and** inline Edit/Duplicate/Delete. | P2 | No | #4 #5 #6 · Device ✓ scan |
| K27 | Multiple screens not responsive | Global | Fixed widths tuned to ~400pt: Templates' 136pt action column truncates titles, the Availability day column is 44pt, override cards are 150pt, the Pending Tasks right rail is 106pt, and the status pill caps at 112pt. The Login banner uses a fixed `marginTop: 74` inside a clipped 40%-height box, so text clips on SE-size phones. Literal font sizes go down to 7.5pt. No Dynamic Type limits on fixed-height rows. Landscape is enabled on iPhone. | P2 | No | #5 · Code ✓ |
| K28 | Add Medicine does nothing | E-Prescription | The "Add Medicine" control **has no `onPress` at all**, and no medicine form exists. The card's ⋮ "edit" is `() => undefined`. Delete has no confirmation. [EPrescriptionScreen.tsx:272](../apps/doctor/src/app/screens/EPrescriptionScreen.tsx#L272) | P1 | No | #7 · Device ✓ scan |
| K29 | "View Profile" on the Diagnosis page | Clinical Notes & Diagnosis | "View Profile" uses the no-op default and the shell never wires it. The natural destination is Appointment Details for the same appointment (patient, intake, documents, history). [ClinicalNotesScreen.tsx:125](../apps/doctor/src/app/screens/ClinicalNotesScreen.tsx#L125) | P1 | No | Code ✓ |
| K30 | Pending Task Worklist not working | Pending Tasks | The shell passes only `onBack`, so **all 18 "Open" buttons** fall back to no-ops. The bell is a no-op and the 18 ⋮ have no handler. Tasks carry a `caseId` but no link to an appointment (only t1 resolves), so even a wired Open has nowhere to go yet. [AppShell.tsx:416](../apps/doctor/src/app/AppShell.tsx#L416) | P1 | No | #6 · Device ✓ scan |

### 4.1 Fix direction for each known finding

- **K1:** Add a single-line input text style (`inputSingle`: no `lineHeight`, explicit height, `paddingVertical: 0`) in `libs/typography`. Use it for every single-line input: login phone and OTP, form text and date fields, fee, the status-sheet hours, and search fields.
- **K2:** Decision D3. Either add `react-native-image-picker` (as the UGC app already does) with a Take photo / Choose / Remove action sheet, or keep a demo stub that visibly changes the photo. Either way, render the chosen image in the avatar.
- **K3:** Get push transitions from D1. Add a `Toast`, add a `loading` state on async buttons, and show a "Submitted — under review" success screen after onboarding.
- **K4:** Add an `idTypeName` field to the draft. Show "Name of ID" when "Other government ID" is selected, require it in `isStepComplete`, and show it on Review.
- **K5:** Give the upload field four states: empty → uploading (progress + Cancel) → uploaded (Replace + trash icon with confirm) → error (Retry). Add a "Cancel" secondary button to the add-entry editors, with a discard confirmation when there are unsaved changes.
- **K6:** Decision D1 (native stack with typed params). Also render a "Not available" fallback with a back button instead of nothing (see K7). Remove the no-op defaults (RC2).
- **K7:** Resolve `appointmentId` to an appointment. Add the not-found fallback. Either rename the Profile row (drop the "Manage…" subtitle) or build Notification Preferences (D5).
- **K8:** Restructure top to bottom:
  1. What happened: alert banner with severity, time and the patient's words.
  2. Why it matters: the triggering answers.
  3. What to do: *Call patient now* as the primary for red flags, *Message*, *Escalate / share crisis resources*, *Book urgent follow-up*.
  4. Document and mark reviewed, as a secondary action, with the disclaimer "Reviewing does not close the safety concern".

  Move the 7-day history below as a compact trend strip. Make the day tiles non-interactive.
- **K9:** Use a 56pt day column with an unscaled centred switch. Put the ⋮ in the first slot row using `alignItems: center`. Set a minimum width on override cards and keep the time on one line. Give setting labels a fixed line count so the values align.
- **K10:** D1 provides swipe-back and native back. Wire Availability back with an unsaved-changes prompt. Add an explicit back arrow in the Room with a "Leave consultation?" confirmation. Use push, not replace, for Request Changes.
- **K11:** Recommended: make locked rows read-only (no chevron). Add one "Request a change" action that opens Request Changes with that field pre-selected.
- **K12:** Make the fee row a normal chevron row that opens Consultation fee, and remove the stretched button. Apply the K1 input style to the amount field.
- **K13:** Rebuild against the existing `AvailabilityScreen.spec.tsx` acceptance tests:
  - wired back (with unsaved-changes prompt) and bell;
  - Save that shows success, then returns with the data kept (RC5);
  - correct labels: "Copy Monday to weekdays", or a real copy-from-last-week;
  - per-slot remove;
  - edit and delete for overrides and leave;
  - date and time pickers instead of free text;
  - a time picker re-initialised on open;
  - keyboard-aware sheets.
- **K14:** Add an `accountStatus` / `verificationDocs` route showing the doctor's own verification items, reusing the status screen's item list. It is shared with K18.
- **K15:** Replace it with the shared dropdown field and fix that sheet's commit/cancel behaviour (N20).
- **K16:** One `Checkbox` component: 44pt row, `hitSlop`, pressed state, one glyph, `accessibilityRole="checkbox"`. Replace all three variants.
- **K17:** Use "Add Qualification" or "Add Experience" when the list is empty, and "Add Another …" after that. Optionally open the editor directly for the first entry.
- **K18:** Add a Profile row "Account status" with a status pill that opens the status screen (with back). After submission, land in *Pending*, with a clearly labelled demo way to approve (D4). Point Contact Support at Help & Support instead of `onAcknowledge`.
- **K19:** Decision D7. Recommended: a Payout History list screen with monthly groups and status filters, plus more fixture months. Make the Payout Status card non-pressable or open the payout detail.
- **K20:** One shell action, `openChat({ consultationId })`: resolve the thread, then push the chat thread. Use it at every entry point. In the Room, open chat as a sheet so the call stays mounted.
- **K21:** One availability store holding live status, weekly schedule, overrides, leave, duration and buffer. Dashboard and Profile read from it. Rename the status to "Scheduled only". The sheet shows today's hours from the weekly schedule with an "Edit schedule" link, not free text. Remove the duplicate duration editor (keep one).
- **K22:** An info sheet explaining how reviews work: verified patients only, anonymised, and the report policy. Size the icon to 22pt with `hitSlop`. Wire "Report concern" to a reason sheet with a confirmation.
- **K23:** Make Save a sticky footer with `paddingBottom: insets.bottom + 12` like the other screens. Derive `Screen`'s bottom inset from whether the tab bar is visible (RC7).
- **K24:** Wire `followUp` to Assign Follow-up Plan and `report` to Request Report, both carrying the appointment. Open clinical tools as modals over a mounted call (D1). Minimum label size 11pt.
- **K25:** Decision D6 on "Add participant" (recommended: remove, since it's not in scope). "More" becomes an action sheet: patient details, request report, assign follow-up, report a technical issue. "Chat" becomes an in-call chat sheet. Hide "Switch camera" until the video SDK is in. Add a back arrow and confirmations for leaving and ending the call.
- **K26:** Remove every dead ⋮. Keep a ⋮ only where it opens a real menu: Templates (move Edit/Duplicate/Delete into it, which also fixes the truncation), Availability, and the medicine card (Edit/Remove). The upload field uses a trash icon.
- **K27:** Fix the shared components first: layouts based on the content width, minimum 11pt text, a shared Text wrapper with `maxFontSizeMultiplier`, and a portrait lock. Verify on iPhone SE (3rd gen), iPhone 17 and iPhone 17 Pro Max simulators.
- **K28:** An Add/Edit Medicine sheet with name (searchable), generic, dose, frequency (select), duration, route, quantity and instruction. Validate, then append on Save. The card menu offers Edit / Remove (with confirm).
- **K29:** Wire it to `push({ name: 'apptDetails', appt })`, which keeps the appointment context.
- **K30:** Add an `appointmentId` to each task (t2–t5 map to a2–a5; add fixtures for the rest). Route by category: summary → Case Summary, prescription → E-Prescription, note → Clinical Notes, follow-up → the alert detail or the chat thread. Mark the task done on completion. D1 keeps the list's scroll position on return.

---

## 5. New findings (50)

### P0 — must fix before any client demo

| ID | Screen | Issue | User impact | Root cause | Fix |
|---|---|---|---|---|---|
| N01 | Clinical Notes & Diagnosis (also E-Prescription) | All six note fields (Chief complaint … Follow-up plan) are **read-only text styled as inputs**, with counters. "Autosaved hh:mm" is stamped when the screen opens. E-Prescription's Presenting Complaint, Advice and Don'ts are also static. | The doctor can't document a consultation, and the app claims an autosave that doesn't happen. | `FieldValue` placeholder ("no text input primitive yet", now outdated) [clinical.tsx:113](../apps/doctor/src/components/clinical.tsx#L113); [ClinicalNotesScreen.tsx:85](../apps/doctor/src/app/screens/ClinicalNotesScreen.tsx#L85) (RC4) | Multiline inputs bound to a per-consultation draft store. Show "Saved" only after a real local save. Editable advice list. |
| N02 | Case Summary | Tapping the box **inserts a canned summary**; tapping again clears it, and nothing can be typed. The canned text says **"No self-harm ideation elicited"** for Rahul, whose alert reports self-harm thoughts. The completion checklist is hard-coded "Done", including a follow-up plan that can't be assigned anywhere. | Fake clinical documentation that contradicts a safety flag. | [CaseSummaryScreen.tsx:30](../apps/doctor/src/app/screens/CaseSummaryScreen.tsx#L30), [:37](../apps/doctor/src/app/screens/CaseSummaryScreen.tsx#L37), [:179](../apps/doctor/src/app/screens/CaseSummaryScreen.tsx#L179) (RC4) | A real input with 60–1000 character validation. A checklist computed from the actual consultation state. Delete the canned text. |
| N03 | Case Detail, Follow-up Alerts, Clarifications, Patient Documents, Request Report, Assign Plan | **Wrong patient or wrong specialty:** (a) Rahul's psychiatry case D-01 shows *Stable Angina*, cardiac drugs and "ECG normal", "Created by Dr. Arjun Mehta" (d2). It also pre-fills Create Clarification. (b) **Every** follow-up alert opens Rahul's red-flag detail; tapping Neha Pillai's alert shows Rahul (d3). (c) Every clarification opens the same "D-23" thread. (d) Request Report, Patient Documents and Assign Follow-up always show Rahul. (e) Case Detail's Follow-up and Clarification rows open those fixed screens for any case. | A clinician acting on the wrong patient's data. This is the brief's own P0 definition. | RC1 (routes carry no IDs) + RC3 (fixtures not keyed by ID). [AppShell.tsx:336](../apps/doctor/src/app/AppShell.tsx#L336), [:414](../apps/doctor/src/app/AppShell.tsx#L414), [:454](../apps/doctor/src/app/AppShell.tsx#L454); [doctor.ts:259](../apps/doctor/src/data/doctor.ts#L259) | Every detail route carries its entity ID. Key fixtures by ID. Replace the c1 content with psychiatry content matching the notes (GAD). |
| N04 | Profile, Dashboard, fixtures | The signed-in psychiatrist carries **a real actress's name and photo** (#9). Fixtures elsewhere name **"Dr. Arjun Mehta"** as the signed-in doctor: Assigned To, Requested by, Reviewed by, Created by, and "Dr. Mehta" in a review. Patients are reused as doctors in the expert thread (Dr. Neha Pillai, Dr. Arjun Kapoor). | Real-person likeness in a client demo (legal and reputational risk). The doctor's identity contradicts itself between screens. | [doctor.ts:354](../apps/doctor/src/data/doctor.ts#L354), `assets/profile-avatar.jpg`; [followup.ts:305](../apps/doctor/src/data/followup.ts#L305), [clarification.ts:189](../apps/doctor/src/data/clarification.ts#L189), [documents.ts:107](../apps/doctor/src/data/documents.ts#L107) (RC10) | Decision D2. One fictional persona; every "me" reference derived from `doctor`. Rename the doctors in the expert thread. |

### P1 — core workflow broken or misleading

| ID | Screen | Issue | User impact | Root cause | Fix |
|---|---|---|---|---|---|
| N05 | Global | **State is lost on every back.** Only the top route is mounted, so filters, search, scroll, acknowledged alerts and drafts reset. Opening Notes, Prescription or View details from the Room **unmounts the call**: the timer restarts at 00:00:00. Tab switches discard the stack. | The app feels broken, and a real call would drop. | RC1 | D1 (native stack keeps screens mounted) |
| N06 | Profile settings, Availability, alerts, chat | **Edits don't persist.** Save fee and Save duration discard the value (the shell never wires `onSave`). Availability Save, privacy toggles, change requests, status-sheet hours, alert acknowledgements and sent messages are all lost on back. Profile keeps showing the old values. | "I changed my fee and nothing happened." | RC5; [AppShell.tsx:247](../apps/doctor/src/app/AppShell.tsx#L247) | An app store (context + reducer) for persona, settings, availability and statuses. |
| N07 | Onboarding → Shell | *Submit for Verification* shows no submitting or success state. The doctor lands **already "Approved"**. | Contradicts "submitted for verification", and the Pending/Rejected states are never reached naturally. | [AppShell.tsx:168](../apps/doctor/src/app/AppShell.tsx#L168) | Success screen, then Pending. Demo approve control (D4). |
| N08 | Account Status | The **Approved / Pending / Rejected tabs are a preview control** shown to the doctor; they flip the account's verification state on screen. | Fake functionality presented as real. | [ProfileRouter.tsx:35](../apps/doctor/src/app/screens/profile/ProfileRouter.tsx#L35), [AccountStatusScreens.tsx:26](../apps/doctor/src/app/screens/profile/AccountStatusScreens.tsx#L26) | D4: hide behind a demo flag or a hidden gesture. |
| N09 | Onboarding › Qualifications / Experience | **Data-loss bug.** Entry IDs are `count + 1`. After removing an entry, a new entry reuses a surviving entry's ID, the editor title says "Edit Qualification", and Save **overwrites the surviving entry**. | Silently loses entered credentials. | [OnboardingFlow.tsx:60](../apps/doctor/src/app/screens/onboarding/OnboardingFlow.tsx#L60), [:529](../apps/doctor/src/app/screens/onboarding/OnboardingFlow.tsx#L529), [:678](../apps/doctor/src/app/screens/onboarding/OnboardingFlow.tsx#L678) | Unique IDs from a counter ref or timestamp. |
| N10 | Bank details | "Request a change" opens Request Changes, which has **no bank option**. It uses `replace`, so Back skips Bank details. | A bank change can't be requested. | [ProfileSettingsScreens.tsx:366](../apps/doctor/src/app/screens/profile/ProfileSettingsScreens.tsx#L366), [AppShell.tsx:250](../apps/doctor/src/app/AppShell.tsx#L250) | Add a "Bank account" option, pre-selected. Push instead of replace. |
| N11 | Privacy & security | The app is OTP-only, yet shows "Change password — last changed 3 months ago". Tapping it **navigates back**. The Biometric toggle has no effect. | Misleading security settings. | [ProfileSettingsScreens.tsx:334](../apps/doctor/src/app/screens/profile/ProfileSettingsScreens.tsx#L334) | Remove the password row (show "Sign-in: OTP to +91 …"). Hide biometric until implemented. |
| N12 | Clarification thread | **"Send" closes the screen and the reply is dropped.** Mark Reviewed and Close exit with no feedback or status change. Attach is dead. | The core expert-discussion action appears to fail. | [AppShell.tsx:389](../apps/doctor/src/app/AppShell.tsx#L389) | Append the message locally. Confirmation toast. Update status in the list. |
| N13 | Clinical Templates | Tapping a template "applies" it by **going back with nothing applied**. Edit, "+" (create) and Sort do nothing. Delete is instant. | Fake functionality in a prominent flow. | [AppShell.tsx:313](../apps/doctor/src/app/AppShell.tsx#L313), [ClinicalTemplatesScreen.tsx:184](../apps/doctor/src/app/screens/ClinicalTemplatesScreen.tsx#L184) | Apply merges the template's medicines and advice into the prescription draft. Hide Edit and Create until an editor exists (or build a minimal one). Confirm Delete. |
| N14 | E-Prescription | **Save Draft and Preview PDF do nothing.** Finalise has no confirmation and no validation (0 medicines passes). | The doctor can't save work or preview the patient document. | [EPrescriptionScreen.tsx:131](../apps/doctor/src/app/screens/EPrescriptionScreen.tsx#L131) | Save Draft to the store with a toast. A preview screen. A Finalise confirm that requires at least one medicine or advice item. |
| N15 | Appointment Details | Seven controls do nothing: message, ⋮, copy ID, document tiles, "View all 3", "View history", the past-consultation card. Consent always says "Video" even for audio and in-person. Upcoming appointments say **"Consultation closed"**. | The pre-call screen is mostly dead ends. Wrong status copy. | [AppointmentDetailsScreen.tsx:84](../apps/doctor/src/app/screens/AppointmentDetailsScreen.tsx#L84), [:299](../apps/doctor/src/app/screens/AppointmentDetailsScreen.tsx#L299), [:358](../apps/doctor/src/app/screens/AppointmentDetailsScreen.tsx#L358) | Wire each or hide it. Derive the consent mode. Show "Starts {date, time}" for upcoming. |
| N16 | Patient Documents | **No document can be opened** ("View" is a no-op). ⋮, View Patient, Sort, the access-log icon and the notice rows are dead. | The documents module can't be used. | [AppShell.tsx:353](../apps/doctor/src/app/AppShell.tsx#L353), [PatientDocumentsScreen.tsx:123](../apps/doctor/src/app/screens/PatientDocumentsScreen.tsx#L123) | A document viewer (metadata plus placeholder preview). Wire or hide the rest. |
| N17 | Help & Support | **"Raise an Issue"** (the primary button), "View all FAQs", "View all" issues, the issue rows and the bell do nothing. | Support is unreachable. | [HelpSupportScreen.tsx:38](../apps/doctor/src/app/screens/HelpSupportScreen.tsx#L38) | A raise-issue form sheet that adds to My Issues. An issue detail screen. The full FAQ list. |
| N18 | Consultation Room, Case Detail, Patient Documents | **Security claims shown without verification:** "End-to-end encrypted" and "Connected · Secure" (on a placeholder video), "Records encrypted", "Documents are encrypted, access-controlled and audit logged". | If the backend (for example LiveKit without E2EE) doesn't do this, it's a **P0 misrepresentation**. | Copy only | Confirm with the backend team, or soften to "Secure connection" (D11). |

### P2 — secondary features, states and consistency

| ID | Screen | Issue | Root cause | Fix |
|---|---|---|---|---|
| N19 | Login, Availability sheets, Status sheet, Appointment Details, E-Prescription, Care Hub, Request Changes | The keyboard covers inputs and buttons. Onboarding stacks three separate keyboard compensations, which leaves extra blank space. | RC7: no keyboard insets on the shared scroll view; sheets aren't keyboard-aware | `automaticallyAdjustKeyboardInsets` on the shared scroll view; a keyboard-aware shared bottom sheet |
| N20 | Every dropdown (shared option sheet) | Tapping an option commits immediately, "Apply" only closes, and X or the backdrop keep the change. The footer has 8pt bottom padding, so **Apply sits in the home-indicator zone** (#2). | [form.tsx:105](../apps/doctor/src/components/form.tsx#L105), [:132](../apps/doctor/src/components/form.tsx#L132) | Hold the selection until Apply; Close discards it; pad by `insets.bottom` |
| N21 | Global | **Brand fonts aren't applied.** The code requests *Rounded* / *Montserrat*, but the iOS bundle registers only Inter and Outfit, so the whole app renders in SF Pro. | RC9 | Decision D8 |
| N22 | Cases | "52 Cases" is hard-coded (6 exist) and ignores filters. The **"Status" and "Risk Level" chips are single hard-coded filters** (Follow-up Needed / Pending) that look like pickers. Sort and ⋮ are dead. Every patient shows a green "online" dot. The search placeholder mentions date, but date isn't searched. (#4) | [CasesScreen.tsx:41](../apps/doctor/src/app/screens/CasesScreen.tsx#L41), [:101](../apps/doctor/src/app/screens/CasesScreen.tsx#L101) | A derived count; Status and Risk picker sheets; a sort sheet; remove ⋮ and the online dots |
| N23 | Dashboard, lists | Numbers and IDs disagree. Dashboard shows 18 appointments and 12 completed; the list has 6 today. The next-appointment card says 10:00 AM for a 09:00 AM appointment. Alert chips say "Red Flags 4"; the list has 1. The tasks card says 2/3; the worklist has 6/5. One patient has four IDs: COR-12458, CON-10482, CC-1284, D-01. | [doctor.ts:373](../apps/doctor/src/data/doctor.ts#L373), [:838](../apps/doctor/src/data/doctor.ts#L838), [followup.ts:162](../apps/doctor/src/data/followup.ts#L162) | Derive counts from the lists; one ID scheme per entity |
| N24 | Onboarding | Weak validation: partial dates of birth pass, email isn't validated, ID numbers have no format check, year of passing is unbounded, end month can precede start month, and "Saved as ••••" shows while typing. From Review, **Edit sends you through every later step** before you get back. | [registration.ts:193](../apps/doctor/src/data/registration.ts#L193) | Validators with inline errors; "Save & return to review" |
| N25 | Onboarding › Basic | The **"Verified" mobile number is a hard-coded demo number** (+91 98765 43210), not the one entered at login. | [App.tsx:42](../apps/doctor/src/app/App.tsx#L42) | Pass the login number through |
| N26 | Onboarding | Back on step 1 returns to sign-in and **discards the whole draft**. The editor's back arrow discards an entry with no prompt. | [OnboardingFlow.tsx:242](../apps/doctor/src/app/screens/onboarding/OnboardingFlow.tsx#L242) | Confirm when there are unsaved changes |
| N27 | Login | Dead controls: the country picker (it has a chevron), "Contact administrator" (both steps), "Privacy Policy", "Support". | [DoctorLoginScreen.tsx:441](../apps/doctor/src/app/screens/DoctorLoginScreen.tsx#L441), [:499](../apps/doctor/src/app/screens/DoctorLoginScreen.tsx#L499), [:509](../apps/doctor/src/app/screens/DoctorLoginScreen.tsx#L509) | A static "+91" (no chevron) or a country sheet; wire the links |
| N28 | Login | The number pad covers the bottom of the input and the **Get verification code** button (#1), and the number pad has no return key. | The scroll view never moves the focused field into view | Keep the field and the button above the keyboard |
| N29 | Clinical Notes | "Refer for Clarification" only toggles its own highlight; nothing is created. "Save Notes" navigates to E-Prescription, which the label doesn't say. Required fields aren't validated. | [ClinicalNotesScreen.tsx:103](../apps/doctor/src/app/screens/ClinicalNotesScreen.tsx#L103) | Open Create Clarification pre-filled; label it "Save & continue" |
| N30 | Case Detail | Export does nothing. Audit Trail shows a chevron with no destination. Completed cases open fully editable modules, although DR-11-01 requires them to be read-only. | [CaseDetailScreen.tsx:182](../apps/doctor/src/app/screens/CaseDetailScreen.tsx#L182), [:257](../apps/doctor/src/app/screens/CaseDetailScreen.tsx#L257) | Share sheet or hide Export; remove the chevron; read-only mode |
| N31 | Create Clarification | The Age, Gender, Current plan and Guidance area selects and "Upload files" do nothing. The preview avatar is hard-coded "RS". Submit and Save Draft return with no confirmation and the list never changes. | [CreateClarificationScreen.tsx:204](../apps/doctor/src/app/screens/CreateClarificationScreen.tsx#L204), [:275](../apps/doctor/src/app/screens/CreateClarificationScreen.tsx#L275) | Real selects; upload states; toast and list insert |
| N32 | 15+ screens | **Decorative bells with no handler:** Appointments, Cases, Availability, Earnings, Help, Templates, Care Hub, Case Summary, Profile Details, Follow-up Alerts, Account Status ×3, Assign Plan, and Notifications itself. | RC8 | A shared header whose bell opens Notifications; no bell on sub-screens |
| N33 | Notifications | Unread state isn't shown. The badge dot is always on in every header. The screen shows its own dead bell. Notification targets ignore their IDs. | [NotificationsScreen.tsx:43](../apps/doctor/src/app/screens/NotificationsScreen.tsx#L43) | Read/unread styling; a derived badge; IDs in routes |
| N34 | — | **Unreachable screens:** Assign Follow-up Plan, Expert Case Review, Instant Request / Accepted / Declined, and Expert Inbox (never imported). Case Summary claims "Follow-up plan assigned" although that screen can't be reached. | Routes never pushed | Decision D9: wire them or remove them |
| N35 | Global | Safe-area defaults: `Screen` pads the bottom only when asked, so full-screen routes without a footer end inside the indicator zone (Notifications, Help). Availability's sheets use a fixed 32pt. Follow-up Alerts adds the bottom inset **above** a visible tab bar (double padding). | RC7 | Inset derived from whether the tab bar is visible; a shared sheet |
| N36 | Global | The iPhone build allows landscape, but every layout is portrait-only. | `UISupportedInterfaceOrientations` in Info.plist | Portrait lock on iPhone |
| N37 | Pending Tasks, Room, Templates, Follow-up Detail, Appointment/Case Detail, onboarding steps | Text sizes of 7.5–10.5pt, below the iOS readable minimum (#6). | Literal `fontSize` overrides | Minimum 11pt through the shared type styles only |
| N38 | Cases, Pending Tasks, Templates, checkboxes, leave chips, uploads | Touch targets under 44pt: Cases ⋮ ~27pt, task ⋮ ~31pt, the "Open" button ~28pt tall, checkbox rows ~20pt, the leave ✕ ~30pt. | Per-screen sizing | A 44pt minimum via `hitSlop` and padding in the shared components |
| N39 | Profile, Room, E-Prescription, Templates, Onboarding, Availability | Destructive actions with no confirmation: Log out, End Call, delete medicine, delete template, remove qualification or experience, remove upload, clear day, remove leave. | RC8 | A `ConfirmDialog` component |
| N40 | Tests | **7 tests fail before any change.** Four in `AvailabilityScreen.spec` expect add/edit/remove and validation the screen no longer has. App, AppShell and Navigation specs reference copy and test IDs that no longer exist. | Tests have drifted from the UI | Realign in Phase 0; use the Availability spec as the K13 acceptance tests |
| N41 | Login → Onboarding | **Every sign-in** (including after Log out) forces the full 4-step onboarding again with an empty draft. Log out has no confirmation. | [App.tsx:39](../apps/doctor/src/app/App.tsx#L39) | Decision D10 |

### P3 — polish

| ID | Screen | Issue | Fix |
|---|---|---|---|
| N42 | Global | Design-system drift: 5 header implementations; 3 back affordances (arrow, chevron, logo); 4 disabled-button styles (fade, grey fill, …); card corner radii of 0, 14, 16 and 18; raw font sizes that bypass the type styles; two alert datasets (`followUpAlertList` in `doctor.ts` is unused). | Consolidate in Phase 4 |
| N43 | Appointments | Upcoming rows show a time but no date. "Starts in 15 min" is the same for every appointment. There's no No-show filter chip. | Show the date; compute the countdown; add the chip |
| N44 | Reviews | The empty-state copy mentions filters that don't exist. The info icon is oversized. | Fix the copy and size |
| N45 | Earnings, Care Hub | The earnings chart card has square corners. Care Hub's "View more" chevron never flips, and you can't save an empty selection (so recommendations can't be cleared). | Style fixes; allow saving an empty selection |
| N46 | Consultation Room | "Patient ID" shows the consultation ID. Stopping video doesn't show in the self-view. The "Note saved as a draft" banner is never visible. | Fix the label; reflect the video state |
| N47 | Login (OTP) | No iOS one-time-code autofill (`textContentType="oneTimeCode"`), and the digits sit low (RC6). | Add autofill; single-line input style |
| N48 | Tab bar | The `profileBadge` prop is passed but ignored, so the pending-verification badge never shows. | Render the badge |
| N49 | Chat thread | Doesn't scroll to the latest message. Attachment chips aren't tappable. | `scrollToEnd` on open and on send |
| N50 | Language multi-select | Hard-codes "Add language" and "Search languages", which will be wrong if the component is reused. | Take the labels as props |

---

## 6. Navigation audit

### Tabs

| Tab | Destination | Status |
|---|---|---|
| Dashboard | Dashboard | ✅ The bell, message icon, cards and next-appointment actions work. ⚠️ The Pending Tasks and Follow-up Alerts children render inside this tab. |
| Appointments | Appointments | ✅ Real loading, skeleton and error states. ⚠️ Dead bell. |
| Cases | Cases | ⚠️ Mislabeled filter chips, hard-coded count, dead ⋮, Sort and bell. |
| Clarifications | Case Clarifications | ✅ Filters, New Query, bell, messages. ✗ Every row opens the same thread. |
| Profile | Account Status (first visit) → Profile | ✗ Account Status can't be reached again after acknowledging. |

Switching tabs **resets the stack and remounts the tab** (state lost), and the landing tab is decided once, at launch.

### Stack routes (34)

| Route | Entry points | Destination | Back behaviour | Status |
|---|---|---|---|---|
| `reviews` | Dashboard feedback card | Reviews & Feedback | Header back → Dashboard | ⚠️ info and report dead |
| `alerts` | Dashboard alerts card | Follow-up Alerts (in tab) | Back → Dashboard | ⚠️ opening ignores which alert |
| `tasks` | Dashboard tasks card | Pending Tasks (in tab) | Back → Dashboard | ✗ every "Open" dead |
| `earnings` | Dashboard card, Profile row, notification n5 | Earnings & Payout | Back → origin | ⚠️ View All dead |
| `apptDetails` | Appointments row, next-appointment card, Room "View details", **notification n4** | Appointment Details | Back → origin | ✗ **n4 → blank screen with no exit** |
| `caseDetail` | Cases row | Case Detail | Back → Cases (list resets) | ✗ c1 shows cardiology data |
| `availability` | Profile row | Availability | ✗ **Back arrow dead**; only Save exits | ✗ |
| `room` | Appointments Join, Details Join, Dashboard Join | Consultation Room | "Back" is a tap on the logo | ⚠️ 5 dead controls; unmounts when a child opens |
| `clinicalNotes` | Room quick action, Room End (replaces the room), Case Detail row | Clinical Notes | Back → origin | ✗ fields not editable |
| `prescription` | Notes Save, Room quick action, Case Detail row | E-Prescription | Back → origin | ✗ Add Medicine dead |
| `templates` | Prescription › Load from Template | Clinical Templates | Back → Prescription | ✗ Apply applies nothing |
| `caseSummary` | Prescription Finalise, Notes link, Case Detail row | Case Summary | Back → origin; Submit → tab root | ✗ fake input |
| `careHub` | Prescription, Case Detail row | Care Hub | Back / Save → origin | ✅ |
| `alertDetail` | Follow-up Alerts (any alert), notification n1, Case Detail row | Patient Follow-up Detail | Back → origin | ✗ always Rahul |
| `requestReport` | Appointment Details › Request document | Request a Report | Back / Close → origin; Send replaces the screen with Patient Documents | ⚠️ always Rahul |
| `patientDocs` | notification n2, **Profile › Verification documents**, Request Report Send | Patient Documents | Back → origin | ✗ wrong route from Profile |
| `notifications` | Dashboard, Clarifications and Profile bells; Profile row | Notifications | Back → origin | ⚠️ n4 dead end |
| `chatList` | Dashboard, Clarifications and Notifications message icons | Messages | Back → origin | ✅ |
| `chatThread` | Chat list row, Follow-up Detail message icon | Chat thread | Back → origin | ✅ (⋮ and attach dead) |
| `createClarification` | Clarifications "New Query" | Create Clarification | Cancel / Back → Clarifications | ⚠️ dead selects; no confirmation |
| `expertClarification` | Clarifications row, Case Detail row | Clarification thread | Back → origin; **Send → back** | ✗ same thread for every item |
| `expertResponse` | notification n3 | Expert Response | Back → Notifications | ✗ cycling dropdown |
| `profileDetails` | Profile row | Doctor Profile | Back → Profile | ⚠️ rows and Edit dead |
| `helpSupport` | Profile row | Help & Support | Back → Profile | ✗ Raise an Issue dead |
| `consultationFee` | Profile row (the Profile Details "Edit" is dead) | Consultation fee | Back / Save → Profile | ⚠️ doesn't persist |
| `consultationDuration` | Profile row | Consultation duration | Back / Save → Profile | ⚠️ doesn't persist |
| `bankDetails` | Profile row | Bank details | Back → Profile | ✗ Request change goes to the wrong form |
| `privacy` | Profile row | Privacy and security | Back → Profile | ✗ "Change password" goes back |
| `requestChanges` | Profile button; Bank (replace) | Request changes | Back → Profile (skips Bank) | ⚠️ |
| `assignPlan` | **none** | Assign Follow-up Plan | — | ✗ orphan |
| `expertCaseReview` | **none** | Expert Case Review | — | ✗ orphan |
| `instantRequest` / `instantAccepted` / `instantDeclined` | **none** (no notification targets them) | Instant consult flow | — | ✗ orphan |

Account Status is not a route. It is rendered inside the Profile tab and only while the doctor is unapproved or unacknowledged.

---

## 7. Interaction audit

```text
Interactive element sites in source:   373 (≈600 rendered, counting list rows)
Dead or wrong-action controls:         ≈95 distinct controls (≈170 on-screen instances, counting list repeats)
  – no press handler at all:           ≈48 (runtime scan on 26 screens + code)
  – wired to an empty function:        ≈35 (24 no-op defaults the shell never overrides + 7 `noop` wirings + 4 inline `() => undefined`)
  – wrong action:                      ≈10 (Change password → back, Contact Support → Dashboard, Send → exits, Apply → back, …)
Partial (acts, but loses state or gives no feedback):   ≈25 (Save fee/duration, Availability Save, photo Change, upload Replace, Acknowledge, Mark reviewed, status hours, …)
Unclear or unnecessary:                ≈30 (dead ⋮, decorative bells, duplicate cam/video toggles, fake refresh icon)
```

The per-screen inventory is in Appendix B.

---

## 8. Visual QA summary

- **Alignment:** Every single-line input sits low (RC6): login, fee, the status-sheet hours, OTP. Availability toggles overlap their neighbours (K9). The fee Edit button stretches full width (K12).
- **Spacing:** Mostly consistent 8pt rhythm. Screens that override the shared components drift (Availability, the Room, Follow-up Detail).
- **Typography:** The brand fonts aren't loaded (N21). There are 7.5–10.5pt labels (N37), and many screens use raw sizes instead of the shared type styles.
- **Hierarchy:** Critical Findings is inverted (K8). The Clinical Notes risk section is collapsed by default although it's required. Pending Tasks' summary numbers are small relative to its 18 cards.
- **Safe areas:** The top is correct everywhere. The bottom fails in two places: Availability Save (K23) and the dropdown sheet (N20). A few screens end inside the indicator zone (N35).
- **Responsive:** Fixed-width columns and cards (K27); Template titles are truncated (#5); the Login banner clips on SE-size phones; there's no Dynamic Type limit; landscape isn't locked.
- **Component consistency:** 5 header variants, 3 checkboxes, 3 back affordances and 4 disabled styles (N42).
- **Iconography:** Consistent stroke icon set. But ⋮ is used for "remove" and for "edit", and a green "online" dot appears on every patient.

---

## 9. Production-quality checklist (current state)

✅ met · ⚠️ partial · ❌ not met

**Navigation:** ❌ every core route works (a blank screen, 6 orphans) · ⚠️ back navigation (works on most screens; Availability is dead and there's no swipe) · ❌ no wrong destinations · ❌ no dead ends · ⚠️ tabs (switching works; state is lost) · ⚠️ modals dismiss (X doesn't cancel a dropdown selection)

**Interaction:** ❌ important buttons work · ❌ important icons work · ⚠️ forms submit (onboarding ✅; Notes and Summary ❌) · ⚠️ dropdowns (form dropdowns ✅; Expert Response and the compact dropdowns ❌) · ✅ checkbox state (⚠️ hit areas) · ⚠️ toggles (switch but don't persist) · ❌ add/edit/delete (medicine, override, template)

**Visual:** ⚠️ no clipping · ❌ no overlap (Availability toggles; the Templates "+" button covers a Delete) · ⚠️ spacing · ❌ typography · ⚠️ button alignment · ⚠️ icon alignment

**iOS:** ⚠️ safe areas · ❌ bottom controls above the home indicator (2 places) · ✅ top controls below the Dynamic Island · ❌ keyboard doesn't hide content · ✅ scrolling · ⚠️ touch targets

**UX:** ❌ loading states (Appointments only) · ⚠️ empty states (lists have them) · ❌ error states (Appointments only) · ❌ success feedback · ⚠️ disabled states (inconsistent) · ⚠️ clear primary actions · ❌ no unnecessary controls · ❌ no unexplained icons

**Clinical UX:** ❌ critical information easy to scan · ⚠️ important actions obvious · ⚠️ high-severity states clear · ❌ patient context never mixed

---

## 10. Decisions needed before implementation

| # | Decision | Recommendation | Why it matters |
|---|---|---|---|
| **D1** | Navigation architecture | **Adopt React Navigation native-stack** (`@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`, one pod install). Per-tab stacks, typed route params, modal presentation for sheets and wizards. Keep the existing screen components and map their callbacks to navigation in a thin adapter. | One change fixes swipe-back, transitions, state loss, the call unmounting and ID-less routes (K3 K6 K10 N05). The alternative, hardening the custom stack, means re-implementing keep-alive, gestures and animations by hand. |
| **D2** | Doctor persona | Replace the actress's name and photo with a fictional persona. **Suggest "Dr. Arjun Mehta"** (already used by 6 fixtures) with an initials avatar or a licensed illustrated one. | Removes real-person likeness; makes the identity consistent. |
| **D3** | Photo and document pickers | Add `react-native-image-picker` plus a document picker now (needs usage strings in Info.plist and a pod install), **or** keep stubs that visibly change and show upload progress. | K2, K5 and N31 depend on this. |
| **D4** | Verification demo | Land in *Pending* after submission. Keep the Approved/Pending/Rejected switcher only behind a hidden demo gesture. | Realistic flow without exposing a fake control (N07, N08). |
| **D5** | Profile › "Notifications" row | Rename it to the inbox (drop "Manage…"), **or** build a Notification Preferences screen. | K7 |
| **D6** | Room "Add participant" | **Remove** unless the product confirms invite scope. | K25; the brief says not to invent features. |
| **D7** | Payout "View All" | **Build a Payout History screen** with more fixture months. | K19 |
| **D8** | Brand fonts | Bundle the licensed *Rounded* and *Montserrat* files (confirm the Rounded licence), **or** point the typography at the bundled Outfit and Inter. | N21; affects every screen. |
| **D9** | Orphaned screens | Wire Assign Follow-up (from the Room quick action and Case Summary). Hide Instant Request, Expert Inbox and Case Review for this demo unless they're wanted. | N34, K24 |
| **D10** | Onboarding on every login | Remember completion so a returning doctor goes straight to the Dashboard. Keep a demo "reset" option. | N41 |
| **D11** | Security copy | Confirm E2EE and encryption with the backend team; until then use "Secure connection". | N18 |

---

## 11. Proposed implementation plan

Order is by dependency: foundations first, so fixes don't get redone. Each phase ends with jest green, `tsc` clean and a simulator pass.

| Phase | Size | Scope | Resolves |
|---|---|---|---|
| **0 — Foundations** | L | Navigation (D1) with typed params. Shared `ScreenHeader`, `BottomSheet` (insets + keyboard), `ActionMenu`, `ConfirmDialog`, `Toast`, `Checkbox`. The `inputSingle` style. A keyboard-aware `Screen` whose bottom inset follows the tab bar. An app store for persona, settings, availability, clinical drafts, and alert and thread status. Fixture cleanup: IDs, persona (D2), c1 content, derived counts. Realign the 7 failing tests. | K1 K3 K6 K10 K16 K23 N05 N06 N19 N20 N23 N35 N40, and unblocks the rest |
| **1 — P0 and wrong context** | M | Editable clinical notes and a real case summary. ID-driven alert, clarification, document, report and plan screens. The blank-screen fallback and notification IDs. The verification-documents / Account Status route. | N01 N02 N03 N04 K7 K14 K18 N07 N08 |
| **2 — Consultation and clinical flows** | L | Add/Edit Medicine, room quick actions and controls, View Profile, the Pending Tasks worklist, the Expert Response dropdown, the Critical Findings redesign, unified chat entry, template Apply, clarification Send, the E-Prescription draft and preview, the Appointment Details and Patient Documents controls, Case Detail and Create Clarification. | K8 K15 K20 K24 K25 K28 K29 K30 N12–N16 N29–N31 N34 |
| **3 — Profile, availability and onboarding** | M | The photo picker (D3). The Other-ID field and upload states. Qualification and experience labels and IDs. Validation. The Availability rebuild against its spec and the unified availability model. The fee row, locked profile rows, Payout History, the Reviews info sheet, bank/privacy fixes, Help & Support, the Cases list and the Login controls. | K2 K4 K5 K9 K11 K12 K13 K17 K19 K21 K22 N09 N10 N11 N17 N22 N24–N28 |
| **4 — Polish** | M | Remove dead ⋮ and bells. Typography minimums and fonts (D8). Touch targets. Portrait lock. Responsive fixes. Destructive confirmations. Security copy. Consolidate the design system. | K26 K27 N18 N21 N32 N33 N36–N39 N41–N50 |
| **5 — Regression and demo pass** | S | The full brief §35 walkthrough on iPhone SE (3rd gen), iPhone 17 and iPhone 17 Pro Max simulators. Before/after screenshots. Final report update. | — |

**Quick wins** (small, high visibility; can go first if you want early demo relief):

- Guard the blank screen (K7).
- Fix the Verification documents route (K14).
- Availability back button and safe area (K13 part, K23).
- Qualification and experience button labels (K17).
- Other-ID name field (K4).
- Onboarding ID collision (N09).
- Wire View Profile (K29).
- Wire the room's quick actions (K24).
- Replace the c1 cardiology fixture (N03a).
- Remove the dead ⋮ menus (K26).

---

## Appendix A — Screen inventory (53 screens/states + 10 sheets)

**Auth and onboarding (9):** Login – phone · Login – OTP · Basic Details · Proof of Identity · Qualifications · Add/Edit Qualification · Experience · Add/Edit Experience · Review & Submit
**Tabs (5):** Dashboard · Appointments · Cases · Clarifications · Profile
**Account status (3):** Approved · Pending · Rejected
**Profile (9):** Doctor Profile details · Consultation fee · Consultation duration · Bank details · Privacy & security · Request changes · Help & Support · Availability · Earnings & Payout
**From Dashboard (4):** Pending Tasks · Follow-up Alerts · Patient Follow-up Detail (Critical Findings) · Reviews & Feedback
**Consultation and clinical (8):** Appointment Details · Consultation Room · Clinical Notes & Diagnosis · E-Prescription · Clinical Templates · Case Summary · Care Hub · Assign Follow-up Plan *(unreachable)*
**Cases and documents (3):** Case Detail · Patient Documents · Request a Report
**Clarifications (5):** Create Clarification (3 steps) · Clarification thread · Expert Response · Expert Case Review *(unreachable)* · Expert Inbox *(never imported)*
**Messaging (3):** Notifications · Messages · Chat thread
**Instant consult (3, unreachable):** Instant Request · Accepted · Declined
**System (1):** Error boundary fallback
**Sheets and modals (10):** Doctor Status · dropdown option sheet · inline select menu · date picker · availability time picker · availability day menu · duration/buffer selector · Add Leave · Add Override · support topic sheet

## Appendix B — Dead / wrong-action control inventory

"No handler" means the pressable has no `onPress` at all (runtime scan or code). "No-op / wrong" means it's wired to an empty function or to the wrong action.

| Screen | No handler | No-op / wrong action |
|---|---|---|
| Login | country picker · Contact administrator ×2 · Privacy Policy · Support | — |
| Onboarding | — | photo Change / Replace (same stub, no visible change) · upload ⋮ (removes instantly) |
| Account Status | bell ×3 · verification item rows · "Review status" row | Contact Admin · Resubmit · Contact Support → Dashboard |
| Doctor Profile details | bell · Consultation Fee row | Specialties / Qualification / Registration / Experience rows · fee Edit |
| Availability | **Back** · bell | override card selection (no effect) · "Copy last week" (copies Monday) |
| Earnings | bell | View All · Payout Status card |
| Reviews | — | info (i) · Report concern |
| Help & Support | bell | Raise an Issue · View all FAQs · View all · issue rows |
| Privacy & security | — | Change password → back · Biometric (no effect) |
| Bank details | — | Request a change → form without a bank option |
| Pending Tasks | 18 × ⋮ | 18 × Open · bell |
| Follow-up Alerts | bell | Open / chevron (ignores which alert) |
| Follow-up Detail | ⋮ · 3 answer rows | day tiles (no effect) |
| Appointments | bell | — |
| Appointment Details | View all 3 · past-consultation card | message · ⋮ · copy ID · document tiles · View history |
| Consultation Room | — | Add participant · ⋮ · More · Chat · Switch camera · Assign Follow-up · Request Report |
| Clinical Notes | — | View Profile · Refer for Clarification (toggle only) · 6 fields (not editable) |
| E-Prescription | **Add Medicine** | medicine ⋮ (edit) · Save Draft · Preview PDF · Load from Template (applies nothing) |
| Clinical Templates | ⋮ · Sort · bell | Edit · "+" (create) · card tap (applies nothing) |
| Case Summary | — | bell · copy ID · summary box (canned text) |
| Cases | bell · Sort · 6 × ⋮ | Status and Risk Level chips (mislabeled) |
| Case Detail | — | Export · Audit Trail chevron |
| Patient Documents | access log · View Patient · Sort · 4 × ⋮ | View · notice rows |
| Request a Report | Change consultation | — |
| Care Hub | bell | — |
| Create Clarification | Age · Gender · Current plan · Guidance area · Upload files | Save Draft / Submit (no confirmation) |
| Clarification thread | attach | **Send → exits and drops the message** · Mark Reviewed / Close (no feedback) |
| Expert Response | ⋮ · Shared case · attachments | Outcome (cycles on tap) |
| Chat thread | ⋮ · attach | — |
| Notifications | its own bell | **"Appointment confirmed → View" → blank screen** |
| Assign Follow-up Plan *(unreachable)* | bell · start date | View consultation |

## Appendix C — Test and type-check baseline (before any change)

- `npx jest --config apps/doctor/jest.config.cts`: **27 suites, 23 passed, 4 failed · 314 tests, 307 passed, 7 failed.**
  - `AvailabilityScreen.spec.tsx` (4): "time off can be added, edited and removed", "schedule exceptions can be added and existing entries edited", "weekly hours are editable and invalid ranges block saving", "invalid dates stay in the editor without adding leave". These describe a tabbed Availability with add/edit/remove and validation that the current screen doesn't have.
  - `App.spec.tsx`: "OTP leads into onboarding, not straight into the shell" (can't find "Basic Details").
  - `AppShell.spec.tsx`: "tabs switch the visible screen" (expects the Cases subtitle "Manage consultation records").
  - `Navigation.spec.tsx`: "hardware back never closes the app from a form screen" (expects test ID `quick-clarify`).
- `tsc -p apps/doctor/tsconfig.app.json --noEmit`: **clean.**
- The eslint, jest, babel and metro configs were scanned before running anything (given the earlier injected-payload incident in this repo); nothing suspicious was found.

## Appendix D — Evidence index (`docs/qa-evidence/doctor-ios-2026-09-24/`)

| File | Shows | Findings |
|---|---|---|
| `u1-login-keyboard.jpg` | Typed number sits lower than "+91"; the keyboard hides the button | K1 N28 |
| `u2-id-type-sheet.jpg` | ID type sheet with "Other government ID"; Apply in the home-indicator zone | K4 N20 |
| `u3-qualifications-empty.jpg` | "Add Another Qualification" with zero entries | K17 |
| `u4-cases.jpg` | Dead ⋮; "52 Cases"; Status / Risk Level chips; online dots | K26 N22 |
| `u5-templates.jpg` | ⋮ plus inline actions; truncated titles; the "+" button over a Delete | K26 K27 N13 |
| `u6-pending-tasks.jpg` | Open buttons; ⋮; 7.5–9pt labels | K30 K26 N37 |
| `u7-e-prescription.jpg` | Add Medicine; non-editable Presenting Complaint; Save Draft | K28 N01 N14 |
| `u8-availability.jpg` | Toggle overlap; Save button in the indicator zone; dead back and bell | K9 K13 K23 |
| `u9-doctor-profile.jpg` | Dead professional rows; stretched pills; real-person photo | K11 K12 N04 |
| `d1-blank-screen-after-notification.jpg` | Notifications › "Appointment confirmed" › View → blank, no exit | K7 K6 |
| `d2-case-c1-cardiology-record.jpg` | A psychiatry patient's case showing Stable Angina and cardiac meds | N03 N04 |
| `d3-neha-alert-opens-rahul.jpg` | Neha Pillai's alert opens Rahul Sharma's red-flag detail | N03 K8 |
| `d4-verification-docs-opens-patient-docs.jpg` | Profile › Verification documents → Patient Documents | K14 |
| `d5-fee-input-baseline.jpg` | "₹" and amount on different baselines | K12 |
| `d6-status-sheet-safe-area-ok.jpg` | Dashboard status sheet: safe area OK; free-text hours | K21 K23 |
