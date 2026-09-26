/**
 * Everything derived from the store: the effective schedule, cases, the
 * worklist, counts, the live status and the signed-in doctor. Derivations are
 * memoised per state so all subscribers share one computation and one
 * reference until something changes.
 */
import {
  appointments as fixtureAppointments,
  doctor as demoDoctor,
  earningsPeriodsFor,
  minutesUntil,
  type Appointment,
  type CaseState,
  type Doctor,
  type LiveStatus,
  type PatientCase,
} from '../data/doctor';
import { emptyRecord, type ConsultationRecord, type ProfessionalType } from '../data/clinical';
import { patientAlerts, sortedAlerts, type PatientAlert } from '../data/followup';
import { notifications, type AppNotification } from '../data/messaging';
import { totalExperienceYears, type UploadedFile } from '../data/registration';
import { DEMO_NOW_MINUTES, TODAY, dayOffset, fmtDate, fmtDayMonth, fmtElapsed, minutesAgo } from '../data/calendar';
import { memoByState, memoByStateAndKey, type AlertLive, type AppState } from './store';

/* ------------------------------- the doctor ------------------------------- */

export type DoctorProfile = Doctor & {
  /** The photo uploaded at onboarding, when there is one. */
  photoFile?: UploadedFile;
  /** False until an administrator has verified the registration number. */
  registrationVerified: boolean;
};

const initialsOf = (name: string) =>
  name
    .replace(/^dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Degrees that are psychology, not medicine — no prescribing permission. */
const PSYCHOLOGY_ONLY = /psycholog/i;

const currentMonth = () => `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`;

/**
 * The signed-in doctor. The demo account is Dr. Arjun Mehta; a doctor who
 * onboarded this session sees what they submitted — their name, photo,
 * languages, degrees and experience — so the app never shows one identity on
 * the dashboard and another in the form they just filled in.
 */
export const selectDoctor = memoByState((s): DoctorProfile => {
  const sub = s.submission;
  if (!sub) return { ...demoDoctor, registrationVerified: true };
  const raw = sub.basic.fullName.trim();
  const name = /^dr\.?\s/i.test(raw) ? raw.replace(/^dr\.?\s*/i, 'Dr. ') : `Dr. ${raw}`;
  const degrees = sub.qualifications.map((q) => q.degree).filter(Boolean);
  const psychologist = degrees.length > 0 && degrees.every((d) => PSYCHOLOGY_ONLY.test(d) && !/medicine/i.test(d));
  const professionalType: ProfessionalType = psychologist ? 'psychologist' : 'psychiatrist';
  return {
    ...demoDoctor,
    name,
    initials: initialsOf(raw) || demoDoctor.initials,
    professionalType,
    speciality: psychologist ? 'Clinical Psychologist' : 'Psychiatrist',
    qualification: degrees.join(', ') || demoDoctor.qualification,
    yearsExperience: totalExperienceYears(sub.experience, currentMonth()),
    languages: sub.basic.languages.length ? sub.basic.languages : demoDoctor.languages,
    registrationNo: 'Under review',
    specialisations: [],
    bio: '',
    photoFile: sub.basic.photo ?? undefined,
    registrationVerified: s.verification.status === 'approved',
  };
});

/* ------------------------------ appointments ------------------------------ */

/** The schedule as it stands now: an ended call makes its appointment completed. */
export const selectAppointments = memoByState((s): Appointment[] =>
  fixtureAppointments.map((a) =>
    s.endedCalls[a.id] && a.state === 'confirmed' ? { ...a, state: 'completed' as const } : a
  )
);

export const selectAppointment = memoByStateAndKey((s, id): Appointment | undefined =>
  selectAppointments(s).find((a) => a.id === id)
);

/** Consultations that actually took place (or were missed), newest first. */
const selectHeld = memoByState((s) =>
  selectAppointments(s)
    .filter((a) => a.state === 'completed' || a.state === 'noShow')
    .sort((x, y) => y.dayOffset - x.dayOffset || y.minutes - x.minutes)
);

/** Opens this many minutes before the start. */
export const JOIN_WINDOW_MIN = 15;

export type JoinState =
  | { kind: 'open'; startsIn: number }
  | { kind: 'later'; opensIn: number }
  | { kind: 'upcoming' }
  | { kind: 'closed' };

/** Whether the room can be entered yet, and if not, why. */
export const joinStateFor = (a: Appointment): JoinState => {
  if (a.state === 'completed' || a.state === 'cancelled' || a.state === 'noShow') return { kind: 'closed' };
  if (a.dayOffset > 0) return { kind: 'upcoming' };
  const until = minutesUntil(a);
  if (until <= JOIN_WINDOW_MIN) return { kind: 'open', startsIn: until };
  return { kind: 'later', opensIn: until - JOIN_WINDOW_MIN };
};

/** The next appointment still to start today, on the demo clock. */
export const selectNextAppointment = memoByState((s) => {
  const a = selectAppointments(s)
    .filter((x) => x.dayOffset === 0 && x.state === 'confirmed' && x.minutes + 30 >= DEMO_NOW_MINUTES)
    .sort((x, y) => x.minutes - y.minutes)[0];
  return a ? { appointment: a, inMinutes: minutesUntil(a) } : undefined;
});

export const selectTodaySummary = memoByState((s) => {
  const today = selectAppointments(s).filter((a) => a.dayOffset === 0 && a.state !== 'cancelled');
  return {
    appointments: today.length,
    completed: today.filter((a) => a.state === 'completed').length,
    upcoming: today.filter((a) => a.state === 'confirmed').length,
  };
});

/* --------------------------------- records -------------------------------- */

const EMPTY_RECORDS = new Map<string, ConsultationRecord>();

/** The record for one consultation; an empty one when nothing is written yet. */
export const selectRecord = (s: AppState, appointmentId: string): ConsultationRecord => {
  const r = s.records[appointmentId];
  if (r) return r;
  if (!EMPTY_RECORDS.has(appointmentId)) EMPTY_RECORDS.set(appointmentId, emptyRecord(appointmentId));
  return EMPTY_RECORDS.get(appointmentId) as ConsultationRecord;
};

const docsDone = (r: ConsultationRecord) =>
  (r.notesStatus === 'saved' ? 1 : 0) + (r.rxStatus === 'finalised' ? 1 : 0) + (r.summaryStatus === 'submitted' ? 1 : 0);

/* ---------------------------------- alerts -------------------------------- */

export type AlertView = PatientAlert & { live: AlertLive };

export const selectAlerts = memoByState((s): AlertView[] =>
  sortedAlerts(patientAlerts.map((a) => ({ ...a, live: s.alerts[a.id] ?? { status: a.status, read: false } })))
);

export const selectAlert = memoByStateAndKey((s, alertId): AlertView | undefined =>
  selectAlerts(s).find((a) => a.id === alertId)
);

export const isOpenAlert = (a: AlertView) => a.live.status === 'open' || a.live.status === 'acknowledged';

export const selectAlertCounts = memoByState((s) => {
  const list = selectAlerts(s).filter(isOpenAlert);
  return {
    highPriority: list.filter((a) => a.category === 'redFlag').length,
    other: list.filter((a) => a.category !== 'redFlag').length,
    open: list.length,
    byCategory: list.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    }, {}),
  };
});

/* ---------------------------------- cases --------------------------------- */

export const caseStateFor = (s: AppState, a: Appointment): CaseState => {
  if (a.state === 'noShow') return 'noShow';
  const r = selectRecord(s, a.id);
  const complete = r.notesStatus === 'saved' && r.rxStatus === 'finalised' && r.summaryStatus === 'submitted';
  if (!complete) return 'pending';
  const followUpOpen = selectAlerts(s).some((al) => al.appointmentId === a.id && isOpenAlert(al));
  return followUpOpen ? 'followUp' : 'complete';
};

const toCase = (s: AppState, a: Appointment): PatientCase => {
  const r = selectRecord(s, a.id);
  return {
    id: `c-${a.id}`,
    appointmentId: a.id,
    patientId: a.patientId,
    caseId: a.consultationId,
    initials: a.initials,
    name: a.name,
    dateLabel: `${fmtDayMonth(dayOffset(a.dayOffset))} · ${a.time}`,
    dayOffset: a.dayOffset,
    minutes: a.minutes,
    age: a.age,
    gender: a.gender,
    concern: a.concern,
    state: caseStateFor(s, a),
    docsDone: a.state === 'noShow' ? 0 : docsDone(r),
    docsTotal: 3,
    prescriptionFinalised: r.rxStatus === 'finalised',
    summarySubmitted: r.summaryStatus === 'submitted',
  };
};

export const selectCases = memoByState((s): PatientCase[] => selectHeld(s).map((a) => toCase(s, a)));

export const selectCaseByAppointment = memoByStateAndKey((s, appointmentId): PatientCase | undefined =>
  selectCases(s).find((c) => c.appointmentId === appointmentId)
);

/**
 * The case a clarification can be raised on. A consultation still under way is
 * not a held case yet, so it is projected from its appointment — referring
 * mid-call then opens on this patient instead of an empty picker.
 */
export const selectReferableCase = memoByStateAndKey((s, appointmentId): PatientCase | undefined => {
  const held = selectCaseByAppointment(s, appointmentId);
  if (held) return held;
  const a = selectAppointment(s, appointmentId);
  return a && a.state !== 'cancelled' ? toCase(s, a) : undefined;
});

/* -------------------------------- worklist -------------------------------- */

export type TaskCategory = 'summary' | 'prescription' | 'note' | 'followUp';

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  summary: 'Summaries',
  prescription: 'Prescriptions',
  note: 'Notes',
  followUp: 'Follow-ups',
};

export const TASK_TITLE: Record<TaskCategory, string> = {
  summary: 'Pending Case Summary',
  prescription: 'Prescription Draft',
  note: 'Incomplete Notes',
  followUp: 'Unread Follow-up Response',
};

export type ClinicalTask = {
  id: string;
  category: TaskCategory;
  title: string;
  patientId: string;
  patient: string;
  appointmentId: string;
  alertId?: string;
  caseId: string;
  specialty: string;
  /** Minutes the task has been waiting, on the demo clock. */
  pendingMinutes: number;
  pendingFor: string;
  openedOn: string;
};

/**
 * What the doctor still owes, oldest first. Each completed consultation
 * contributes its next unfinished step; each follow-up response the doctor
 * has not read yet is a task of its own.
 */
export const selectTasks = memoByState((s): ClinicalTask[] => {
  const tasks: ClinicalTask[] = [];
  selectAppointments(s)
    .filter((a) => a.state === 'completed')
    .forEach((a) => {
      const r = selectRecord(s, a.id);
      const category: TaskCategory | null =
        r.notesStatus !== 'saved'
          ? 'note'
          : r.rxStatus !== 'finalised'
            ? 'prescription'
            : r.summaryStatus !== 'submitted'
              ? 'summary'
              : null;
      if (!category) return;
      // the task opens when the consultation ends
      const pending = Math.max(1, minutesAgo(a.dayOffset, a.minutes + 30));
      tasks.push({
        id: `t-${a.id}`,
        category,
        title: TASK_TITLE[category],
        patientId: a.patientId,
        patient: a.name,
        appointmentId: a.id,
        caseId: a.consultationId,
        specialty: 'Psychiatry Consultation',
        pendingMinutes: pending,
        pendingFor: fmtElapsed(pending),
        openedOn: fmtDayMonth(dayOffset(a.dayOffset)),
      });
    });
  selectAlerts(s)
    .filter((al) => !al.live.read && al.responses.length > 0)
    .forEach((al) => {
      const a = fixtureAppointments.find((x) => x.id === al.appointmentId);
      if (!a) return;
      tasks.push({
        id: `t-${al.id}`,
        category: 'followUp',
        title: TASK_TITLE.followUp,
        patientId: al.patientId,
        patient: a.name,
        appointmentId: a.id,
        alertId: al.id,
        caseId: a.consultationId,
        specialty: 'Follow-up check-in',
        pendingMinutes: al.receivedMinutesAgo,
        pendingFor: fmtElapsed(al.receivedMinutesAgo),
        openedOn: 'Today',
      });
    });
  return tasks.sort((x, y) => y.pendingMinutes - x.pendingMinutes);
});

export const selectTaskCounts = memoByState((s) => {
  const tasks = selectTasks(s);
  return {
    total: tasks.length,
    summary: tasks.filter((t) => t.category === 'summary').length,
    prescription: tasks.filter((t) => t.category === 'prescription').length,
    note: tasks.filter((t) => t.category === 'note').length,
    followUp: tasks.filter((t) => t.category === 'followUp').length,
  };
});

/* ------------------------------- live status ------------------------------ */

/**
 * The status the doctor is shown: system states (in a call, completing notes)
 * override the manual pick, because being mid-call is a fact, not a
 * preference.
 */
export const selectLiveStatus = (s: AppState): LiveStatus => {
  if (s.activeCall) return 'inConsultation';
  if (s.postCall && selectRecord(s, s.postCall.appointmentId).summaryStatus !== 'submitted') return 'completingNotes';
  return s.liveStatus;
};

/* ------------------------------ notifications ----------------------------- */

/** An instant request only reaches a doctor who is Available Now. */
export const selectNotifications = memoByState((s): (AppNotification & { read: boolean })[] =>
  notifications
    .filter((n) => n.kind !== 'instantRequest' || (selectLiveStatus(s) === 'available' && s.instant === 'pending'))
    .map((n) => ({ ...n, read: !!s.notifRead[n.id] }))
);

export const selectUnreadNotificationCount = memoByState(
  (s) => selectNotifications(s).filter((n) => !n.read).length
);

export const selectUnreadMessageCount = memoByState((s) => s.threads.reduce((sum, t) => sum + t.unread, 0));

/* -------------------------------- earnings -------------------------------- */

/**
 * Earnings from consultations already held. They were booked at the fee in
 * force then, so a fee changed today moves future bookings only — never money
 * already earned.
 */
const HELD_EARNINGS = earningsPeriodsFor(demoDoctor.consultationFee);
export const selectEarnings = (_s: AppState) => HELD_EARNINGS;

export const todayDateLabel = () => fmtDate(TODAY);
