# Slide — What We Can Add to Coracure

A plain list of what [Slide](https://slide.synquic.in/) can do for the
**patient**, **doctor** and **admin** sides, grouped by Slide channel.

- **Slide** (by Synquic) is one platform for OTP, SMS, WhatsApp, email, RCS,
  voice, campaigns, delivery reports and automations.
- **Used today:** OTP only (`src/identity/otp/slide.provider.ts`).
- **Researched:** 2 Oct 2026 from Slide's site, API reference and pricing page,
  read against this repo. Items marked **Unconfirmed** must be checked with
  Slide first.

---

## Fix first

1. **A live-looking API key is committed** in
   `apps/backend/coracure_backend/.env.example` (`SLIDE_API_KEY=sk_test_…`).
   Rotate it in the Slide dashboard and replace the value with a blank.
2. **Three different Slide base URLs** are in use: the code default
   (`slide.synquic.com/api`), `.env.example` (`api.slide.dev`) and Slide's
   published docs (`api.slide.cx/v1`). Confirm the right one and use it
   everywhere.

## Why this matters now

Notifications leave the platform only through the in-app inbox and push. Push
is still set to `log`, the doctor app never sends a push token, the patient app
does not exist yet, and admins have no push by design. **Today a patient cannot
be reached at all, a doctor cannot while the app is closed, and an admin cannot
unless the panel is open.** These channels fill that gap, and stay useful as a
fallback once push works.

Events that send nothing to anyone today: refunds, payouts, complaint replies,
deletion requests, account creation, and a slot hold about to expire.

---

## 1. OTP (sign-in codes) — already used

- **Patient:** sign-in code. Add "send by WhatsApp instead" if the SMS does not
  arrive.
- **Doctor:** the same.
- **Admin:** two-factor code (exists). Add the WhatsApp resend.
- **Admin dashboard:** show the sign-in code success rate, since a failed code
  means nobody can log in.

## 2. SMS

- **Patient:** booking confirmed; reminder before the consultation; "your
  doctor has joined"; daily check-in reminder and a nudge after a missed one;
  "prescription ready" with a link (never the content); "your doctor needs a
  report"; "finish payment" before a slot hold runs out.
- **Doctor:** instant request nobody answered; red-flag and amber safety
  alerts; missed check-ins.
- **Admin:** an unacknowledged red-flag alert escalated to the on-duty
  coordinator; urgent queue alerts.
- **Needs:** a registered sender ID and approved (DLT) templates in India.

## 3. WhatsApp

- **Patient:** the same messages as SMS, with richer content; a feedback request
  after a consultation; later, a reply on WhatsApp opens or updates a support
  complaint.
- **Doctor:** verification approved, rejected, or a document rejected with the
  reason; "your account was created, here is how to sign in"; clarification case
  assigned or replied to; a patient uploaded a report.
- **Admin:** an invite when an account is created; escalations and backlog
  alerts.
- **Needs:** Meta-approved templates, and the recipient's opt-in.

## 4. Email

- **Patient:** payment receipt and invoice; refund status; a reply to a
  complaint; confirmation of a data-deletion request.
- **Doctor:** verification result; daily summary of pending write-ups (these
  block going available); payout paid.
- **Admin:** an invite when another admin or a doctor is created; deletion and
  retention confirmations; a weekly backlog summary.

## 5. Fallback delivery (one send, several channels)

- Try push first, then WhatsApp, then SMS, then email, automatically.
- Used for the important events: instant requests, safety alerts, reminders.
- This is the single change that makes every item above work, because
  notifications already go through one service
  (`src/notifications/notifications.service.ts`).

## 6. Delivery reports

- Know whether each message was sent, delivered, read or failed. Today a
  notification marked "sent" may never have arrived.
- **Admin dashboard:** delivered and failed counts, and the OTP success rate.
- **Unconfirmed:** how Slide signs its webhooks. Get this from Slide's
  dashboard before trusting incoming events.

## 7. Campaigns and broadcasts

- **Admin:** announcements to all doctors (policy change, downtime) or to
  patients (Care Hub awareness), with segments.
- Later. Needs a separate marketing opt-in.

## 8. Message templates

- **Admin:** choose which approved WhatsApp, SMS or email template each
  notification uses, on the existing *Notification copy* screen.
- On these channels the wording cannot be rewritten: Meta and the SMS regulator
  approve each template. In-app wording stays freely editable. The rule that a
  notification never names a diagnosis carries over unchanged.

## 9. RCS (rich SMS cards)

- **Patient:** a reminder with Join and Reschedule buttons, where the phone
  supports it.
- Low priority.

## 10. Voice

- **Doctor:** a plain reminder call as a last resort when an instant request is
  missed (optional).
- **Patient/doctor:** audio-only consultation if video fails. **Unconfirmed**:
  depends on the open video provider decision, and no mobile SDK was found in
  Slide's docs. Evaluate only.
- Not for AI agents talking to patients about their health.

## 11. Automations (visual flows)

- **Admin/ops:** build follow-up sequences without code, for example "day 3
  check-in not done, remind, then alert the care coordinator".
- Later.

---

## Not worth adding

Instagram, Shopify, HubSpot, Meta Ads, TikTok, WooCommerce and Cal.com do not
fit a clinical product; booking uses our own scheduling. Razorpay is already
integrated directly. Doctor-patient chat over WhatsApp is possible, but clinical
content would pass through Meta, so build that chat natively.

## Things to settle before building

| Topic | Constraint |
|---|---|
| Cost | Free plan has no WhatsApp. Starter ₹6,999/mo for 2,000 WhatsApp messages; Pro ₹12,999/mo for 10,000. Per-message rates are not published, so ask Slide. |
| Speed limit | 60 requests/min on Free and Starter, 120 on Pro. A burst of reminders needs a queue. |
| WhatsApp | Every template needs Meta approval, and takes time. Start early. |
| SMS in India | Registered sender ID and approved templates are required. |
| Privacy | Keep the no-diagnosis rule in every message. Phone numbers already go to Slide for OTP; extend the same consent to new messages. Broadcasts need separate opt-in. |
| Duplicates | Store each send's message id so a retry cannot message a person twice. |

## Suggested order

1. Rotate the key and confirm the base URL.
2. OTP resend by WhatsApp: smallest change, protects sign-in.
3. Fallback delivery plus the template mapping. Start the Meta and SMS template
   approvals now, since they take longest.
4. Delivery reports, so "sent" means something.
5. The high-value messages: booking and reminders, check-ins, instant-request
   fallback, safety alerts, doctor verification, account invites, admin
   red-flag escalation, receipts.
6. Admin delivery tile, then the rest.
7. Broadcasts last, behind a consent model.
