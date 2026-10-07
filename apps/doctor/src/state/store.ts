/**
 * The app store.
 *
 * One module-level state object, read through `useStore(selector)` and changed
 * only through the named actions in `actions.ts`. It holds everything a doctor
 * can change during a session — account, settings, availability, clinical
 * records, alert and thread state — so an edit survives leaving the screen and
 * every other screen reads the same value.
 *
 * There is no backend yet, so nothing is persisted past the app process.
 */
import { useCallback, useRef, useSyncExternalStore } from 'react';

import {
  type Appointment,
  doctor,
  type DaySchedule,
  type Leave,
  type ManualStatus,
  type ScheduleOverride,
} from '../data/doctor';
import type { ClinicalTemplate, ConsultationRecord } from '../data/clinical';
import type { DoctorSelfProfile, PendingDocumentation, SafetyAlert } from '@coracure/api';
import type { ChatMessage, ChatThread } from '../data/messaging';
import type { Clarification } from '../data/clarification';
import { patientDocs, seedRequests, type PatientDoc, type ReportRequest } from '../data/documents';
import type { SupportIssue } from '../data/support';
import type { RegistrationDraft } from '../data/registration';
import { seedRecords } from './seed';

export type VerificationState = 'notSubmitted' | 'pending' | 'approved' | 'rejected';

export type ThreadLive = ChatThread & { messages: ChatMessage[] };

export type ChangeRequest = { id: string; fields: string[]; note: string; at: string; state: 'pending' };

/**
 * The week before the diary answers: every day present, all of them off.
 *
 * Not `[]` — the screen renders one row per day whatever is loaded, so the
 * shape has to be the full week. Not seeded with sample hours either: the
 * same reasoning as `appointments` below applies, a placeholder schedule a
 * doctor never set is worse than a blank one while the real diary loads.
 */
const EMPTY_WEEK: DaySchedule[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
  (day) => ({ day, short: day.slice(0, 3), enabled: false, ranges: [], modes: ['video'] })
);

export type AvailabilityState = {
  schedule: DaySchedule[];
  overrides: ScheduleOverride[];
  leave: Leave[];
  durationMin: number;
  bufferMin: number;
  savedAt?: string;
};

export type AppState = {
  /**
   * `restoring` is the cold-start stage: the keychain may hold a session, and
   * until the server has answered there is nothing honest to show. Only
   * `main.tsx` sets it, so a spec rendering `App` starts where it always did.
   */
  session: { stage: 'restoring' | 'intro' | 'login' | 'onboarding' | 'shell'; mobile: string };
  /**
   * The doctor's consultations, as loaded from the backend.
   *
   * *** EMPTY UNTIL THE SERVER ANSWERS, NEVER SEEDED WITH FIXTURES. *** Every
   * count on the dashboard and every list it opens read this one array, so they
   * cannot disagree. Falling back to sample patients while a request is in
   * flight would put invented names on a clinical screen for as long as the
   * network took; the loading contract in `useResource` covers that gap with a
   * skeleton instead. The spec harness seeds it explicitly.
   */
  appointments: Appointment[];
  /** Held consultations with no write-up. Non-empty blocks going available. */
  pendingDocumentation: PendingDocumentation[];
  /** Open or acknowledged follow-up safety alerts, as the server has them. */
  openAlerts: SafetyAlert[];
  /** The notification badge, as the server counts it. */
  unreadCount: number;
  /**
   * The signed-in doctor as the backend has them — name, registration number,
   * fee, photo and, decisively, `canPrescribe`. Null until it loads; until
   * then `selectDoctor` falls back to the local profile.
   */
  selfProfile: DoctorSelfProfile | null;
  onboardingCompleted: boolean;
  /** What the doctor submitted for verification, when they did it this session. */
  submission?: RegistrationDraft;
  verification: { status: VerificationState; acknowledged: boolean; submittedAt?: string };
  profile: { fee: number; changeRequests: ChangeRequest[] };
  privacy: { showOnline: boolean; analytics: boolean };
  liveStatus: ManualStatus;
  /** From the presence record. Non-null means `available_now` is refused until this write-up is done. */
  presenceBlockedByConsultationId: string | null;
  /** An admin permission; a doctor cannot grant it to themselves. */
  allowInstantConsult: boolean;
  /** The consultation room currently open, if any. */
  activeCall?: { appointmentId: string; joinedAt: number };
  /** Set after a call ends until its case summary is submitted. */
  postCall?: { appointmentId: string };
  /** Consultations whose call the doctor ended this session, by appointment. */
  endedCalls: Record<string, string>;
  availability: AvailabilityState;
  records: Record<string, ConsultationRecord>;
  instant: 'pending' | 'accepted' | 'declined' | 'expired';
  threads: ThreadLive[];
  clarifications: Clarification[];
  templates: ClinicalTemplate[];
  reportRequests: ReportRequest[];
  documents: PatientDoc[];
  supportIssues: SupportIssue[];
};

export const initialState = (): AppState => ({
  session: { stage: 'intro', mobile: '' },
  appointments: [],
  pendingDocumentation: [],
  openAlerts: [],
  unreadCount: 0,
  selfProfile: null,
  onboardingCompleted: false,
  verification: { status: 'notSubmitted', acknowledged: false },
  profile: { fee: doctor.consultationFee, changeRequests: [] },
  privacy: { showOnline: true, analytics: false },
  liveStatus: 'available',
  presenceBlockedByConsultationId: null,
  allowInstantConsult: true,
  endedCalls: {},
  availability: {
    schedule: EMPTY_WEEK.map((d) => ({ ...d, ranges: [], modes: [...d.modes] })),
    overrides: [],
    leave: [],
    durationMin: doctor.consultationMinutes,
    bufferMin: 10,
  },
  records: seedRecords(),
  instant: 'pending',
  // Never seeded with sample patients, cases or tickets — the same rule as
  // `appointments`. A real doctor must not see invented ones; the spec harness
  // seeds them (test/fixtures.ts).
  threads: [],
  clarifications: [],
  templates: [],
  reportRequests: seedRequests.map((r) => ({ ...r })),
  documents: patientDocs.map((d) => ({ ...d })),
  supportIssues: [],
});

let state: AppState = initialState();
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const getState = () => state;

export const setState = (update: (s: AppState) => AppState) => {
  const next = update(state);
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
};

/** Test seam, and what signing in as a different doctor does to the device. */
export const resetStore = (over: Partial<AppState> = {}) => {
  state = { ...initialState(), ...over };
  listeners.forEach((l) => l());
};

const shallowEqual = (a: unknown, b: unknown) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

/**
 * Subscribe to a slice of the store. The selector may return a new object or
 * array; it only re-renders when that result changes shallowly.
 */
export function useStore<T>(selector: (s: AppState) => T): T {
  const cache = useRef<{ value: T } | null>(null);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSnapshot = useCallback(() => {
    // Always re-run: the selector may close over props (an id) that changed
    // while the store did not.
    const value = selectorRef.current(state);
    const current = cache.current;
    if (current && shallowEqual(current.value, value)) return current.value;
    cache.current = { value };
    return value;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Memoise a derived value per store state, so every subscriber shares one
 * computation and receives the same reference until the state changes.
 */
export const memoByState = <T,>(fn: (s: AppState) => T) => {
  let lastState: AppState | null = null;
  let lastValue: T;
  return (s: AppState): T => {
    if (s !== lastState) {
      lastState = s;
      lastValue = fn(s);
    }
    return lastValue;
  };
};

/** Memoise a derived value per (state, key) — for per-entity selectors. */
export const memoByStateAndKey = <T,>(fn: (s: AppState, key: string) => T) => {
  let lastState: AppState | null = null;
  const values = new Map<string, T>();
  return (s: AppState, key: string): T => {
    if (s !== lastState) {
      lastState = s;
      values.clear();
    }
    if (!values.has(key)) values.set(key, fn(s, key));
    return values.get(key) as T;
  };
};
