/**
 * Every change the app can make to its state, as named functions.
 *
 * Screens call these rather than editing state themselves, so a behaviour
 * such as "saving notes stamps the time and clears the draft flag" lives in
 * one place and every screen showing that record agrees.
 */
import { appointmentById, type ManualStatus } from '../data/doctor';
import {
  emptyRecord,
  type ConsultationRecord,
  type FollowUpPlan,
  type Medicine,
  type NoteKey,
  type RiskAssessment,
} from '../data/clinical';
import type { AlertAction } from '../data/followup';
import type { ClarificationDraft, ClarificationMessage } from '../data/clarification';
import type { ReportRequest } from '../data/documents';
import type { RegistrationDraft } from '../data/registration';
import { ISSUE_CATEGORIES } from '../data/support';
import { patientById } from '../data/patients';
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

/**
 * The demo account: a verified, onboarded doctor (Dr. Arjun Mehta). Signing in
 * with this number goes straight to the Dashboard; any other number behaves
 * as a new account an administrator has just created, which completes
 * onboarding first. A backend answers the same question from the account.
 */
export const DEMO_MOBILE = '9876543210';

export const signIn = (mobile: string) => {
  const s = getState();
  // the same doctor signing back in keeps everything they did this session
  if (s.session.mobile === mobile && s.onboardingCompleted) {
    setState((st) => ({ ...st, session: { stage: 'shell', mobile } }));
    return;
  }
  // a different doctor on this device starts from clean data
  if (mobile === DEMO_MOBILE) {
    resetStore({
      session: { stage: 'shell', mobile },
      onboardingCompleted: true,
      verification: { status: 'approved', acknowledged: true },
    });
    return;
  }
  resetStore({ session: { stage: 'onboarding', mobile } });
};

export const signOut = () =>
  setState((s) => ({ ...s, session: { ...s.session, stage: 'login' }, activeCall: undefined }));

export const leaveOnboarding = () => setState((s) => ({ ...s, session: { ...s.session, stage: 'login' } }));

export const submitRegistration = (draft: RegistrationDraft) =>
  setState((s) => ({
    ...s,
    onboardingCompleted: true,
    submission: draft,
    verification: { status: 'pending', acknowledged: false, submittedAt: fmtDate(dayOffset(0)) },
    session: { ...s.session, stage: 'shell' },
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

/** Resubmitting replaces the submission and puts the account back under review. */
export const resubmitVerification = (draft: RegistrationDraft) =>
  setState((s) => ({
    ...s,
    submission: draft,
    verification: { status: 'pending', acknowledged: false, submittedAt: fmtDate(dayOffset(0)) },
  }));

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

export const saveAvailability = (next: Omit<AvailabilityState, 'savedAt'>) =>
  setState((s) => ({ ...s, availability: { ...next, savedAt: nowLabel() } }));

/* ---------------------------------- calls --------------------------------- */

export const startCall = (appointmentId: string) =>
  setState((s) =>
    s.activeCall?.appointmentId === appointmentId
      ? s
      : { ...s, activeCall: { appointmentId, joinedAt: Date.now() } }
  );

/** Leaving the room without ending clears the live call only. */
export const leaveCall = () => setState((s) => (s.activeCall ? { ...s, activeCall: undefined } : s));

/** Ending a call completes the appointment and opens its write-up. */
export const endCall = (appointmentId: string) =>
  setState((s) => ({
    ...s,
    activeCall: undefined,
    postCall: { appointmentId },
    endedCalls: { ...s.endedCalls, [appointmentId]: nowLabel() },
  }));

/* ------------------------------ clinical record --------------------------- */

const withRecord = (appointmentId: string, change: (r: ConsultationRecord) => ConsultationRecord) =>
  setState((s) => {
    const current = s.records[appointmentId] ?? emptyRecord(appointmentId);
    return { ...s, records: { ...s.records, [appointmentId]: change(current) } };
  });

export const recordFor = (appointmentId: string) =>
  getState().records[appointmentId] ?? emptyRecord(appointmentId);

export const updateNote = (appointmentId: string, key: NoteKey, value: string) =>
  withRecord(appointmentId, (r) => ({
    ...r,
    notes: { ...r.notes, [key]: value },
    // editing a saved note re-opens it as a draft until saved again
    notesStatus: 'draft',
    notesSavedAt: nowLabel(),
  }));

export const setRisk = (appointmentId: string, patch: Partial<RiskAssessment>) =>
  withRecord(appointmentId, (r) => ({
    ...r,
    risk: { ...r.risk, ...patch },
    notesStatus: 'draft',
    notesSavedAt: nowLabel(),
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

export const assignPlan = (appointmentId: string, plan: FollowUpPlan) =>
  withRecord(appointmentId, (r) => ({ ...r, plan }));

export const setRecommendations = (appointmentId: string, ids: string[], note: string) =>
  withRecord(appointmentId, (r) => ({ ...r, recommendations: { ids, note } }));

/* ---------------------------------- alerts -------------------------------- */

const withAlert = (alertId: string, change: (a: AppState['alerts'][string]) => AppState['alerts'][string]) =>
  setState((s) => {
    const current = s.alerts[alertId] ?? { status: 'open' as const, read: false };
    return { ...s, alerts: { ...s.alerts, [alertId]: change(current) } };
  });

export const markAlertRead = (alertId: string) =>
  setState((s) => (s.alerts[alertId]?.read ? s : { ...s, alerts: { ...s.alerts, [alertId]: { ...(s.alerts[alertId] ?? { status: 'open' }), read: true } } }));

export const acknowledgeAlert = (alertId: string) =>
  withAlert(alertId, (a) => ({ ...a, read: true, status: a.status === 'open' ? 'acknowledged' : a.status }));

export const reviewAlert = (alertId: string, action: AlertAction, note: string) =>
  withAlert(alertId, (a) => ({
    ...a,
    read: true,
    status: action === 'urgentReview' ? 'escalated' : 'reviewed',
    action,
    note,
    reviewedAt: nowLabel(),
  }));

/* ------------------------------ notifications ----------------------------- */

export const markNotificationRead = (id: string) =>
  setState((s) => (s.notifRead[id] ? s : { ...s, notifRead: { ...s.notifRead, [id]: true } }));

export const markAllNotificationsRead = () =>
  setState((s) => ({ ...s, notifRead: Object.fromEntries(Object.keys(s.notifRead).map((k) => [k, true])) }));

export const setInstant = (value: AppState['instant']) =>
  setState((s) => ({
    ...s,
    instant: value,
    notifRead: value === 'pending' ? s.notifRead : { ...s.notifRead, n6: true },
  }));

/* --------------------------------- threads -------------------------------- */

/** The patient thread for a consultation, creating one when none exists yet. */
export const threadForAppointment = (appointmentId: string): string | undefined => {
  const s = getState();
  const a = appointmentById(appointmentId);
  if (!a) return undefined;
  const existing = s.threads.find((t) => t.kind === 'patient' && t.patientId === a.patientId);
  if (existing) return existing.id;
  const pt = patientById(a.patientId);
  if (!pt) return undefined;
  const id = `th-${a.id}`;
  setState((st) => ({
    ...st,
    threads: [
      ...st.threads,
      {
        id,
        kind: 'patient',
        initials: pt.initials,
        name: pt.name,
        context: a.consultationId,
        patientId: pt.id,
        appointmentId: a.id,
        lastMessage: '',
        at: '',
        unread: 0,
        internalOnly: false,
        messages: [],
      },
    ],
  }));
  return id;
};

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

const ICON_BY_AREA: Record<string, 'brain' | 'moon' | 'inPerson' | 'heart'> = {
  'Treatment plan review': 'brain',
  'Diagnostic clarification': 'inPerson',
  'Medication adjustment': 'heart',
  'Risk assessment': 'brain',
  'Referral advice': 'inPerson',
};

/** Saves a new clarification as a draft or posts it. Returns its id. */
export const saveClarification = (draft: ClarificationDraft, post: boolean, existingId?: string): string => {
  const id = existingId ?? uid('cl');
  const count = getState().clarifications.length;
  const caseId = existingId
    ? getState().clarifications.find((c) => c.id === existingId)?.caseId ?? draft.caseId
    : `CLR-2026-${String(192 + count).padStart(4, '0')}`;
  const at = `Today, ${nowLabel()}`;
  const record = {
    id,
    caseId,
    appointmentId: draft.appointmentId,
    title: draft.title,
    blurb: draft.question.slice(0, 120),
    icon: ICON_BY_AREA[draft.guidanceArea] ?? 'brain',
    urgency: draft.urgency,
    status: post ? ('posted' as const) : ('draft' as const),
    lastActivity: at,
    shared: {
      ageLabel: draft.ageLabel,
      gender: draft.gender,
      provisionalDiagnosis: draft.provisionalDiagnosis,
      history: draft.history,
      currentPlan: draft.currentPlan,
      question: draft.question,
      guidanceArea: draft.guidanceArea,
      files: draft.files,
    },
    expertId: 'ex1',
    messages: post ? [{ id: uid('m'), author: 'me', body: draft.question, at }] : [],
  };
  setState((s) => ({
    ...s,
    clarifications: existingId
      ? s.clarifications.map((c) => (c.id === existingId ? { ...c, ...record } : c))
      : [record, ...s.clarifications],
    records: {
      ...s.records,
      [draft.appointmentId]: { ...(s.records[draft.appointmentId] ?? emptyRecord(draft.appointmentId)), clarificationId: id },
    },
  }));
  return id;
};

export const replyToClarification = (id: string, body: string, file?: string) =>
  setState((s) => ({
    ...s,
    clarifications: s.clarifications.map((c) =>
      c.id === id
        ? {
            ...c,
            messages: [...c.messages, { id: uid('m'), author: 'me', body, at: `Today, ${nowLabel()}`, file } as ClarificationMessage],
            // answering the expert's question hands the case back to them
            status: c.status === 'clarificationNeeded' ? 'expertReview' : c.status,
            lastActivity: `Today, ${nowLabel()}`,
          }
        : c
    ),
  }));

export const recordOutcome = (id: string, value: string, note: string) =>
  setState((s) => ({
    ...s,
    clarifications: s.clarifications.map((c) =>
      c.id === id
        ? { ...c, status: 'reviewed', outcome: { value, note, at: `Today, ${nowLabel()}` }, lastActivity: `Today, ${nowLabel()}` }
        : c
    ),
  }));

export const closeClarification = (id: string) =>
  setState((s) => ({
    ...s,
    clarifications: s.clarifications.map((c) =>
      c.id === id ? { ...c, status: 'closed', lastActivity: `Today, ${nowLabel()}` } : c
    ),
  }));

/* -------------------------------- templates ------------------------------- */

export const duplicateTemplate = (templateId: string) =>
  setState((s) => {
    const i = s.templates.findIndex((t) => t.id === templateId);
    if (i === -1) return s;
    const src = s.templates[i];
    const copy = { ...src, id: uid('tpl'), name: `${src.name} (Copy)`, mine: true };
    return { ...s, templates: [...s.templates.slice(0, i + 1), copy, ...s.templates.slice(i + 1)] };
  });

export const deleteTemplate = (templateId: string) =>
  setState((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== templateId) }));

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
        updates: [{ at: today, body: 'We have received your request and will reply within 24 hours.' }],
      },
      ...s.supportIssues,
    ],
  }));
  return id;
};

/* --------------------------------- reviews -------------------------------- */

export const reportReview = (reviewId: string, reason: string) =>
  setState((s) => ({ ...s, reviewReports: { ...s.reviewReports, [reviewId]: reason } }));

/* ---------------------------------- demo ---------------------------------- */

/** Restores the demo data while keeping the doctor signed in and onboarded. */
export const resetDemoData = () => {
  const { session, onboardingCompleted, submission, verification } = getState();
  resetStore({ session, onboardingCompleted, submission, verification });
};
