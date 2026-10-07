/**
 * Every change the app can make to its state, as named functions.
 *
 * Screens call these rather than editing state themselves, so a behaviour
 * such as "saving notes stamps the time and clears the draft flag" lives in
 * one place and every screen showing that record agrees.
 */
import {
  doctorAuthApi,
  type DoctorSelfProfile,
  type DoctorVerificationStatus,
  type PendingDocumentation,
  type SafetyAlert,
} from '@coracure/api';

import { isAutoStatus, type Appointment, type LiveStatus, type ManualStatus } from '../data/doctor';
import {
  emptyRecord,
  type ClinicalTemplate,
  type ConsultationRecord,
  type FollowUpPlan,
  type Medicine,
  type NoteKey,
  type RiskAssessment,
} from '../data/clinical';
import type { Clarification } from '../data/clarification';
import type { ChatMessage, ChatThread } from '../data/messaging';
import type { ReportRequest } from '../data/documents';
import type { RegistrationDraft } from '../data/registration';
import type { SubmissionOutcome } from '../data/onboarding';
import { readSession, type RestoredSession } from '../data/session';
import { clearResourceCache, seedResource } from '../data/useResource';
import { KEYS as VERIFICATION_KEYS, screenStatus } from '../data/verification';
import { ISSUE_CATEGORIES } from '../data/support';
import { fmtDate, dayOffset } from '../data/calendar';
import { getState, resetStore, setState, type AppState, type AvailabilityState, type VerificationState } from './store';
import { nextMedicineId } from './seed';

/** The wall-clock time an action happened, for "Saved 12:04 PM" stamps. */
export const nowLabel = () => {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
};

let idCounter = 0;
const uid = (prefix: string) => {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
};

/* --------------------------------- session -------------------------------- */

/** The seeded fixture doctor (Dr. Arjun Mehta), used by the specs' test harness. */
export const DEMO_MOBILE = '9876543210';

/**
 * Maps the backend's `verificationStatus` onto the app's own verification
 * state. `suspended` is absent on purpose: the backend refuses it at sign-in
 * with `ACCOUNT_NOT_ACTIVE`, so it never reaches a signed-in app. `rejected`
 * IS here: that doctor signs in to read the admin's reason and resubmit.
 */
const VERIFICATION: Record<string, VerificationState> = {
  verified: 'approved',
  under_review: 'pending',
  pending: 'notSubmitted',
  rejected: 'rejected',
};

/**
 * Lands a doctor after `POST /auth/doctor/otp/verify`.
 *
 * *** WHERE THEY LAND IS THE SERVER'S ANSWER, NOT THIS DEVICE'S. *** A new
 * doctor's account is created by this very sign-in, so `verificationStatus`
 * decides: only `pending` (nothing submitted yet, including a brand-new
 * account) goes to onboarding. Anything submitted — under review, or rejected
 * and waiting for corrections — opens the shell, where an unacknowledged status
 * lands on the Profile tab's Account Status. Sending a doctor whose papers are
 * with the reviewers back into a blank form invited a second, conflicting
 * submission. The previous build guessed from a hardcoded demo number, which
 * was right only on one phone.
 */
export const signIn = (mobile: string, verificationStatus: DoctorVerificationStatus = 'pending') => {
  const verified = verificationStatus === 'verified';
  const submitted = verificationStatus !== 'pending';
  const s = getState();

  // The same doctor signing back in keeps everything they did this session.
  if (s.session.mobile === mobile && s.onboardingCompleted && submitted) {
    setState((st) => ({ ...st, session: { stage: 'shell', mobile } }));
    return;
  }

  // A different doctor on this device starts from clean data — one account's
  // drafts, records, alerts and cached reads must never show under another's.
  if (s.session.mobile !== mobile) clearResourceCache();
  resetStore({
    session: { stage: submitted ? 'shell' : 'onboarding', mobile },
    onboardingCompleted: submitted,
    verification: { status: VERIFICATION[verificationStatus] ?? 'notSubmitted', acknowledged: verified },
  });
};

/** Lands a session read off the server, draft and all. */
const land = (mobile: string, restored: RestoredSession) => {
  signIn(mobile, restored.verificationStatus);
  // After `signIn`, never before: it calls `resetStore` for a doctor it does
  // not recognise, which would drop the draft this just fetched.
  if (restored.draft) {
    const draft = restored.draft;
    setState((s) => ({ ...s, submission: draft }));
  }
};

/**
 * After `POST /auth/doctor/otp/verify`.
 *
 * *** THE SAME READ A COLD START MAKES. *** Before this, a fresh sign-in opened
 * onboarding blank even when the registration was on file, and only a restart
 * (which goes through `readSession`) filled it in. A verified doctor has no
 * form to fill, so they skip the read. A failed read still signs in, on the
 * status the verify returned — an empty form beats refusing the session.
 */
export const completeSignIn = async (mobile: string, verificationStatus: DoctorVerificationStatus) => {
  if (verificationStatus === 'verified') return signIn(mobile, verificationStatus);
  const restored = await readSession().catch(() => null);
  land(mobile, restored ?? { mobile, verificationStatus });
};

/**
 * Cold start, when the keychain already holds a session.
 *
 * *** THE SERVER DECIDES WHERE THEY LAND, AGAIN. *** This is the same rule as
 * `signIn` and for a stronger reason: the app was closed, so an admin may have
 * verified or suspended the account since. Reusing `signIn` rather than setting
 * the stage here is what keeps the two paths from drifting apart.
 *
 * Any failure ends on the sign-in screen. There is no partial restore: a shell
 * with no identity behind it would 401 on every request it made.
 */
export const restoreSession = async (): Promise<boolean> => {
  if (!(await doctorAuthApi.restoreSession())) {
    endSession();
    return false;
  }
  try {
    const restored = await readSession();
    if (!restored) {
      endSession();
      return false;
    }
    land(restored.mobile, restored);
    return true;
  } catch {
    endSession();
    return false;
  }
};

/**
 * Drops the UI back to sign-in. Local only — it calls nothing.
 *
 * *** THIS IS WHAT THE CLIENT'S OWN SIGN-OUT LISTENER RUNS. *** It must not
 * call `doctorAuthApi.signOut`, because that clears the session, which fires
 * the listener, which would call it again. Separating the two is what keeps a
 * revoked token from looping.
 */
export const endSession = () => {
  // Cached reads are the signed-out doctor's data; none may outlive the session.
  clearResourceCache();
  setState((s) => ({ ...s, session: { ...s.session, stage: 'login' }, activeCall: undefined }));
};

/**
 * The doctor pressing Log out.
 *
 * The local stage moves first and unconditionally: they asked to be signed out,
 * and a revoke that cannot reach the server must not leave them looking at
 * patient data. `doctorAuthApi.signOut` clears the keychain either way and
 * revokes every device when it can.
 */
export const signOut = () => {
  endSession();
  void doctorAuthApi.signOut();
};

/** Skip or finish the intro carousel; it is not shown again this session. */
export const leaveIntro = () =>
  setState((s) => ({ ...s, session: { ...s.session, stage: 'login' } }));

export const leaveOnboarding = () => setState((s) => ({ ...s, session: { ...s.session, stage: 'login' } }));

/**
 * Records a submitted registration.
 *
 * *** THE STATUS COMES FROM THE SERVER. *** `submitRegistration` in
 * `data/onboarding.ts` reads `GET /me/doctor/credentials` after the uploads,
 * and that is the account's real state — an admin may already have approved or
 * rejected part of the set while the doctor was still typing. Assuming
 * `pending` here would show "submitted, awaiting review" to somebody who has
 * already been rejected.
 *
 * The draft is still kept locally because most of it has nowhere else to live
 * (see `UNMAPPED_FIELDS`): it is what the Review and Resubmit screens read.
 */
export const submitRegistration = (draft: RegistrationDraft, outcome?: SubmissionOutcome) =>
  setState((s) => ({ ...recordSubmission(s, draft, outcome), onboardingCompleted: true, session: { ...s.session, stage: 'shell' } }));

/**
 * What a submit or resubmit leaves behind: the draft with the ids the server
 * now holds for its files (so the next resubmit does not upload them again),
 * the server's status, and the credentials cache primed with the same answer
 * — Account Status reads that cache, and an old copy there showed the
 * pre-submit state until it aged out.
 */
const recordSubmission = (s: AppState, draft: RegistrationDraft, outcome?: SubmissionOutcome): AppState => {
  if (outcome) seedResource(VERIFICATION_KEYS.credentials, outcome.progress);
  return {
    ...s,
    submission: outcome?.draft ?? draft,
    verification: {
      status: outcome ? screenStatus(outcome.progress) : 'pending',
      acknowledged: false,
      submittedAt: fmtDate(dayOffset(0)),
    },
  };
};

/**
 * The doctor's day, as the backend has it.
 *
 * `pendingDocumentation` is kept beside the appointments because it is the one
 * thing that BLOCKS going available — the backend refuses the presence change
 * with `DOCUMENTATION_OUTSTANDING` while it is non-empty, so the app has to be
 * able to say why before the doctor presses it.
 */
export const setDoctorDay = (day: {
  appointments: Appointment[];
  pendingDocumentation: PendingDocumentation[];
  openAlerts: SafetyAlert[];
  unreadNotifications: number;
}) =>
  setState((s) => ({
    ...s,
    appointments: day.appointments,
    pendingDocumentation: day.pendingDocumentation,
    openAlerts: day.openAlerts,
    unreadCount: day.unreadNotifications,
  }));

/**
 * The doctor's own profile from the backend. The fee and consultation length
 * are mirrored into the settings the profile screens edit, so both read the
 * server's value.
 */
export const setSelfProfile = (p: DoctorSelfProfile) =>
  setState((s) => ({
    ...s,
    selfProfile: p,
    profile: { ...s.profile, fee: p.consultationFeeInr ?? s.profile.fee },
    availability: {
      ...s.availability,
      durationMin: p.consultationDurationMinutes ?? s.availability.durationMin,
      bufferMin: p.bufferMinutes ?? s.availability.bufferMin,
    },
  }));

/** The inbox badge, zeroed the moment every notification is marked read — not on the next poll. */
export const clearUnreadCount = () => setState((s) => (s.unreadCount === 0 ? s : { ...s, unreadCount: 0 }));

/** The bell's count as the server has it, or one fewer after a row is read. Never below zero. */
export const setUnreadCount = (count: number) =>
  setState((s) => (s.unreadCount === Math.max(0, count) ? s : { ...s, unreadCount: Math.max(0, count) }));

/** A no-show or cancel answer patched onto the one card it changed, everywhere that card is read. */
export const patchAppointment = (appointmentId: string, patch: Partial<Appointment>) =>
  setState((s) => ({
    ...s,
    appointments: s.appointments.map((a) => (a.id === appointmentId ? { ...a, ...patch } : a)),
  }));

/* ------------------------------- verification ----------------------------- */

/**
 * Demo tools only. In production the transition comes from the admin review;
 * here a hidden long-press on the logo stands in for it (see DemoTools).
 */
export const setVerification = (status: VerificationState) =>
  setState((s) => ({
    ...s,
    verification: {
      ...s.verification,
      status,
      acknowledged: false,
      submittedAt: s.verification.submittedAt ?? fmtDate(dayOffset(0)),
    },
  }));

/** The doctor has seen their account status and continued into the app. */
export const acknowledgeApproval = () =>
  setState((s) => ({ ...s, verification: { ...s.verification, acknowledged: true } }));

/** Resubmitting replaces the submission; where the account now stands is the server's answer. */
export const resubmitVerification = (draft: RegistrationDraft, outcome?: SubmissionOutcome) =>
  setState((s) => recordSubmission(s, draft, outcome));

/* --------------------------------- profile -------------------------------- */

export const setConsultationFee = (fee: number) =>
  setState((s) => ({ ...s, profile: { ...s.profile, fee } }));

export const setConsultationDuration = (minutes: number) =>
  setState((s) => ({ ...s, availability: { ...s.availability, durationMin: minutes } }));

export const addChangeRequest = (fields: string[], note: string) =>
  setState((s) => ({
    ...s,
    profile: {
      ...s.profile,
      changeRequests: [{ id: uid('cr'), fields, note, at: fmtDate(dayOffset(0)), state: 'pending' }, ...s.profile.changeRequests],
    },
  }));

export const setPrivacy = (patch: Partial<AppState['privacy']>) =>
  setState((s) => ({ ...s, privacy: { ...s.privacy, ...patch } }));

/* ------------------------------- availability ----------------------------- */

export const setLiveStatus = (status: ManualStatus) => setState((s) => ({ ...s, liveStatus: status }));

/**
 * The presence record, as the server has it.
 *
 * An auto status (`inConsultation`, `completingNotes`, …) is left alone here —
 * `selectLiveStatus` already derives those from this device's own call state,
 * which outranks a presence poll that can lag a call by a few seconds. The
 * blocker and permission fields are never local, so they always sync.
 */
export const setPresenceRecord = (record: {
  liveStatus: LiveStatus;
  blockedByConsultationId: string | null;
  allowInstantConsult: boolean;
}) =>
  setState((s) => ({
    ...s,
    liveStatus: isAutoStatus(record.liveStatus) ? s.liveStatus : record.liveStatus,
    presenceBlockedByConsultationId: record.blockedByConsultationId,
    allowInstantConsult: record.allowInstantConsult,
  }));

export const saveAvailability = (next: Omit<AvailabilityState, 'savedAt'>) =>
  setState((s) => ({ ...s, availability: { ...next, savedAt: nowLabel() } }));

/** Loads the diary from the server. Unlike `saveAvailability`, nothing was just saved, so `savedAt` is left alone. */
export const loadAvailability = (next: Omit<AvailabilityState, 'savedAt'>) =>
  setState((s) => ({ ...s, availability: { ...next, savedAt: s.availability.savedAt } }));

/* ---------------------------------- calls --------------------------------- */

export const startCall = (appointmentId: string) =>
  setState((s) =>
    s.activeCall?.appointmentId === appointmentId
      ? s
      : { ...s, activeCall: { appointmentId, joinedAt: Date.now() } }
  );

/** Leaving the room without ending clears the live call only. */
export const leaveCall = () => setState((s) => (s.activeCall ? { ...s, activeCall: undefined } : s));

/** Ending a call completes the appointment, keeps how long it ran, and opens its write-up. */
export const endCall = (appointmentId: string, durationSeconds?: number) =>
  setState((s) => ({
    ...s,
    activeCall: undefined,
    postCall: { appointmentId },
    endedCalls: { ...s.endedCalls, [appointmentId]: nowLabel() },
    records:
      durationSeconds === undefined
        ? s.records
        : { ...s.records, [appointmentId]: { ...(s.records[appointmentId] ?? emptyRecord(appointmentId)), durationSeconds } },
  }));

/* ------------------------------ clinical record --------------------------- */

const withRecord = (appointmentId: string, change: (r: ConsultationRecord) => ConsultationRecord) =>
  setState((s) => {
    const current = s.records[appointmentId] ?? emptyRecord(appointmentId);
    return { ...s, records: { ...s.records, [appointmentId]: change(current) } };
  });

/** The backend's copy of the write-up, laid over the local record once on first open. */
export const hydrateClinicalRecord = (appointmentId: string, patch: Partial<ConsultationRecord>) =>
  withRecord(appointmentId, (r) => ({ ...r, ...patch }));

export const recordFor = (appointmentId: string) =>
  getState().records[appointmentId] ?? emptyRecord(appointmentId);

export const updateNote = (appointmentId: string, key: NoteKey, value: string) =>
  withRecord(appointmentId, (r) => ({
    ...r,
    notes: { ...r.notes, [key]: value },
    // editing a saved note re-opens it as a draft until saved again; no
    // `notesSavedAt` stamp — nothing reached the server
    notesStatus: 'draft',
  }));

export const setRisk = (appointmentId: string, patch: Partial<RiskAssessment>) =>
  withRecord(appointmentId, (r) => ({
    ...r,
    risk: { ...r.risk, ...patch },
    notesStatus: 'draft',
  }));

export const saveNotes = (appointmentId: string) =>
  withRecord(appointmentId, (r) => ({ ...r, notesStatus: 'saved', notesSavedAt: nowLabel() }));

export const setAllergies = (appointmentId: string, value: string) =>
  withRecord(appointmentId, (r) => ({ ...r, allergies: value, rxSavedAt: nowLabel() }));

export const addMedicine = (appointmentId: string, m: Omit<Medicine, 'id'>) =>
  withRecord(appointmentId, (r) => ({
    ...r,
    medicines: [...r.medicines, { ...m, id: nextMedicineId() }],
    rxStatus: 'draft',
    rxSavedAt: nowLabel(),
  }));

export const updateMedicine = (appointmentId: string, m: Medicine) =>
  withRecord(appointmentId, (r) => ({
    ...r,
    medicines: r.medicines.map((x) => (x.id === m.id ? m : x)),
    rxStatus: 'draft',
    rxSavedAt: nowLabel(),
  }));

export const removeMedicine = (appointmentId: string, medicineId: string) =>
  withRecord(appointmentId, (r) => ({
    ...r,
    medicines: r.medicines.filter((x) => x.id !== medicineId),
    rxStatus: 'draft',
    rxSavedAt: nowLabel(),
  }));

export const setAdvice = (appointmentId: string, advice: string[]) =>
  withRecord(appointmentId, (r) => ({ ...r, advice, rxStatus: 'draft', rxSavedAt: nowLabel() }));

export const setDonts = (appointmentId: string, donts: string[]) =>
  withRecord(appointmentId, (r) => ({ ...r, donts, rxStatus: 'draft', rxSavedAt: nowLabel() }));

export const saveRxDraft = (appointmentId: string) =>
  withRecord(appointmentId, (r) => ({ ...r, rxSavedAt: nowLabel() }));

export const finaliseRx = (appointmentId: string) =>
  withRecord(appointmentId, (r) => ({ ...r, rxStatus: 'finalised', rxFinalisedAt: nowLabel() }));

/** Merges a template's medicines and advice into the draft, skipping duplicates. */
export const applyTemplate = (appointmentId: string, templateId: string) => {
  const tpl = getState().templates.find((t) => t.id === templateId);
  if (!tpl) return;
  withRecord(appointmentId, (r) => {
    const names = new Set(r.medicines.map((m) => m.name.toLowerCase()));
    const meds = tpl.content.meds
      .filter((m) => !names.has(m.name.toLowerCase()))
      .map((m) => ({ ...m, id: nextMedicineId() }));
    const advice = [...r.advice, ...tpl.content.advice.filter((a) => !r.advice.includes(a))];
    const donts = [...r.donts, ...tpl.content.donts.filter((d) => !r.donts.includes(d))];
    return { ...r, medicines: [...r.medicines, ...meds], advice, donts, rxStatus: 'draft', rxSavedAt: nowLabel() };
  });
};

export const setSummary = (appointmentId: string, summary: string) =>
  withRecord(appointmentId, (r) => ({ ...r, summary, summaryStatus: 'draft' }));

export const submitSummary = (appointmentId: string) =>
  setState((s) => {
    const r = s.records[appointmentId] ?? emptyRecord(appointmentId);
    return {
      ...s,
      records: { ...s.records, [appointmentId]: { ...r, summaryStatus: 'submitted', summarySubmittedAt: nowLabel() } },
      postCall: s.postCall?.appointmentId === appointmentId ? undefined : s.postCall,
    };
  });

/** `undefined` clears it — the plan was stopped. */
export const assignPlan = (appointmentId: string, plan: FollowUpPlan | undefined) =>
  withRecord(appointmentId, (r) => ({ ...r, plan }));

export const setRecommendations = (appointmentId: string, ids: string[], note: string) =>
  withRecord(appointmentId, (r) => ({ ...r, recommendations: { ids, note } }));

export const setInstant = (value: AppState['instant']) => setState((s) => ({ ...s, instant: value }));

/* --------------------------------- threads -------------------------------- */

/**
 * The patient thread for a consultation, creating one when none exists yet.
 *
 * Keyed by the patient's id: there is one conversation per patient, and that
 * id is how the server addresses it (`/doctor/chat-threads/:patientId`). A new
 * one exists only here until its first message creates the server's row.
 */
export const threadForAppointment = (appointmentId: string): string | undefined => {
  const s = getState();
  const a = s.appointments.find((x) => x.id === appointmentId);
  if (!a) return undefined;
  const existing = s.threads.find((t) => t.kind === 'patient' && t.patientId === a.patientId);
  if (existing) return existing.id;
  setState((st) => ({
    ...st,
    threads: [
      ...st.threads,
      {
        id: a.patientId,
        kind: 'patient',
        initials: a.initials,
        name: a.name,
        context: a.consultationId,
        patientId: a.patientId,
        appointmentId: a.id,
        lastMessage: '',
        at: '',
        unread: 0,
        internalOnly: false,
        messages: [],
      },
    ],
  }));
  return a.patientId;
};

/**
 * The server's conversations over the store's. Messages already loaded for one
 * are kept, and so is a thread opened but not yet written in — the server has
 * no row for it until its first message.
 */
export const setChatThreads = (list: ChatThread[]) =>
  setState((s) => {
    const held = new Map(s.threads.map((t) => [t.id, t]));
    return {
      ...s,
      threads: [
        ...list.map((t) => ({ ...t, messages: held.get(t.id)?.messages ?? [] })),
        ...s.threads.filter((t) => !list.some((x) => x.id === t.id)),
      ],
    };
  });

/**
 * Server messages into a thread, by id — a poll, an earlier page and a sent
 * message all land the same way. With nothing new the state is left untouched:
 * the poll runs every few seconds and must not re-render the thread for it.
 */
export const mergeThreadMessages = (threadId: string, incoming: ChatMessage[]) =>
  setState((s) => {
    const t = s.threads.find((x) => x.id === threadId);
    if (!t || incoming.every((m) => t.messages.some((x) => x.id === m.id))) return s;
    const byId = new Map([...t.messages, ...incoming].map((m) => [m.id, m]));
    // ISO timestamps, so text order is time order
    const messages = [...byId.values()].sort((x, y) => (x.createdAt ?? '').localeCompare(y.createdAt ?? ''));
    const last = messages[messages.length - 1];
    return {
      ...s,
      threads: s.threads.map((x) =>
        x.id === threadId ? { ...x, messages, lastMessage: last.body || last.file || '', at: last.at } : x
      ),
    };
  });

export const sendMessage = (threadId: string, body: string, file?: string) =>
  setState((s) => ({
    ...s,
    threads: s.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            messages: [...t.messages, { id: uid('msg'), from: 'me', body, at: nowLabel(), file }],
            lastMessage: body || (file ? `Sent ${file}` : ''),
            at: nowLabel(),
          }
        : t
    ),
  }));

export const markThreadRead = (threadId: string) =>
  setState((s) =>
    s.threads.some((t) => t.id === threadId && t.unread > 0)
      ? { ...s, threads: s.threads.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)) }
      : s
  );

/* ------------------------------ clarifications ---------------------------- */

/**
 * The author's cases, as the backend has them — replaces the list wholesale,
 * and points each source consultation's record at its case so Refer reopens
 * the existing thread.
 */
export const setClarifications = (list: Clarification[]) =>
  setState((s) => {
    const records = { ...s.records };
    // newest first: the first case seen for a consultation is the one Refer opens
    [...list].reverse().forEach((c) => {
      if (c.appointmentId) records[c.appointmentId] = { ...(records[c.appointmentId] ?? emptyRecord(c.appointmentId)), clarificationId: c.id };
    });
    return { ...s, clarifications: list, records };
  });

/**
 * One case the backend just answered with, in place or at the top. When it was
 * raised from a consultation, that consultation's record points at it, so Refer
 * reopens this thread rather than starting another.
 */
export const upsertClarification = (c: Clarification, replaces?: string) =>
  setState((s) => {
    const at = s.clarifications.findIndex((x) => x.id === c.id || (replaces !== undefined && x.id === replaces));
    const clarifications = at === -1 ? [c, ...s.clarifications] : s.clarifications.map((x, i) => (i === at ? c : x));
    const records = c.appointmentId
      ? { ...s.records, [c.appointmentId]: { ...(s.records[c.appointmentId] ?? emptyRecord(c.appointmentId)), clarificationId: c.id } }
      : s.records;
    return { ...s, clarifications, records };
  });

/* -------------------------------- templates ------------------------------- */

/** The doctor's templates as the server has them. The data layer calls this after every load and change. */
export const setTemplates = (templates: ClinicalTemplate[]) => setState((s) => ({ ...s, templates }));

/* -------------------------------- documents ------------------------------- */

export const addReportRequest = (req: Omit<ReportRequest, 'id'>) => {
  const id = uid('rq');
  setState((s) => ({ ...s, reportRequests: [{ ...req, id }, ...s.reportRequests] }));
  return id;
};

export const cancelReportRequest = (id: string) =>
  setState((s) => ({
    ...s,
    reportRequests: s.reportRequests.map((r) => (r.id === id && r.status !== 'fulfilled' ? { ...r, status: 'cancelled' } : r)),
  }));

/* --------------------------------- support -------------------------------- */

export const raiseIssue = (category: string, title: string, description: string) => {
  const id = uid('si');
  const cat = ISSUE_CATEGORIES.find((c) => c.key === category) ?? ISSUE_CATEGORIES[3];
  const today = fmtDate(dayOffset(0));
  setState((s) => ({
    ...s,
    supportIssues: [
      {
        id,
        ref: `ISS-${78422 + s.supportIssues.length}`,
        title,
        category: cat.key,
        description,
        dateLabel: today,
        state: 'open',
        icon: cat.icon,
        // nothing is sent — no doctor support endpoint exists — so the note says where it really is
        updates: [{ at: today, body: 'Saved on this device only. It has not been sent — email support and quote this reference.' }],
      },
      ...s.supportIssues,
    ],
  }));
  return id;
};

/* ---------------------------------- demo ---------------------------------- */

/** Restores the demo data while keeping the doctor signed in and onboarded. */
export const resetDemoData = () => {
  const { session, onboardingCompleted, submission, verification } = getState();
  resetStore({ session, onboardingCompleted, submission, verification });
};
