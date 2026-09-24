# Patient demo APK review - 14 September 2026

This build is a patient-only, offline UI demonstration. The Android entry point explicitly selects demo data and the app displays a demo banner. It does not perform real OTP delivery, payment collection, file upload, or video consultations. The doctor application has not been built or changed.

## Demo walkthrough

1. Open CoraCure Patient Demo and tap Quick Demo Login on the welcome screen.
2. Explore Home, Appointments, Care Plan, Care Hub, and Profile.
3. Open Book Appointment; choose a service, date and time, review intake and the sample itemized bill, then confirm the simulated booking.
4. Open Appointments to review, reschedule, or cancel the sample booking.
5. Show Reports, Notifications, Daily Check-In, self-help content, and the consultation preview.

The demonstration uses sample records. Some screens still contain static illustrative content. Demo changes are in-memory and may reset on restart.

## Fixes made during this build

- Fixed TypeScript errors: missing API type exports, duplicate style properties, unsupported icon names, and missing button accessibility props.
- Fixed the Android launch path accessing browser-only window.location.
- Restored authentication loading and dashboard routing after demo sign-in; removed the 100 ms secure-storage race.
- Corrected native keychain platform detection and added Android hardware back handling.
- Removed the screen-development toolbar from Android and labelled the offline demonstration.
- Fixed profile updates, selected appointment identity, rescheduling creating extra appointments, and cancellation changing a different appointment in the demo adapter.
- Corrected booking, reschedule and follow-up date/time handling, including minutes, AM/PM, and local-to-UTC conversion.
- Removed duplicate bottom navigation on nested Care Hub and Profile screens.
- Required an explicit consent checkbox selection.
- Updated Android SDK/Kotlin configuration and Hermes compiler location for installed React Native 0.84.1.

## User-story acceptance limits

Screen rendering is not full user-story acceptance. The repository requires real endpoints, ownership/error states, and flow tests before a story can be marked done.

| Story group | Demonstration available | Still required for production acceptance |
| --- | --- | --- |
| PT-02, PT-04: identity/profile | Welcome, login, OTP/profile forms, explicit demo login | Real OTP challenges, wrong-role refusal, refresh/expiry, ownership and sign-out-everywhere verification |
| PT-03, PT-21: consent/data rights | Consent and policy screens | Versioned server consent, complete deletion/export lifecycle |
| PT-06, PT-07, PT-09: services/search | Service selection and search screens | Live catalogue, coverable slots, server concern/crisis mapping |
| PT-11, PT-12: booking/payment | Sample booking, intake, bill, reschedule/cancel UI | Real slot hold and expiry, provider refusal/decline rules, gateway payment confirmation, refunds |
| PT-13, PT-14: instant/video | Consultation/device-check previews | Provider matching, native camera/microphone checks, LiveKit call SDK and reconnection |
| PT-10, PT-15: documents/records | Sample reports, prescription and care records | Native document picker/upload/download, signed URLs, ownership and finalized records |
| PT-16, PT-18: follow-up/care | Check-in, care plan, self-help screens | Server-authored risk outcomes and escalation; complete content and recommendation persistence |
| PT-08, PT-19: notifications/support | Sample inbox, feedback/support screens | Push delivery, server feedback and complaint tracking |
| SH-01..04 | Basic navigation/rendering and error components | Live failure handling, offline persistence, full accessibility and language audit |

## Verification

- Patient TypeScript check passed.
- 33 Jest tests passed: native rendering of 26 screens, startup/demo login, and date/booking regressions.
- 27 patient routes opened at a 390 x 844 browser viewport with no JavaScript page errors; screenshots are in artifacts/ui/patient-audit.
- No Android device was connected during this review. Physical installation, native keyboard layout, and device launch are not yet verified.

Build/signature details will be recorded with the final APK artifact.
