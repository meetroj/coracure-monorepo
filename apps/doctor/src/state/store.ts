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
  doctor,
  initialLeave,
  initialOverrides,
  initialSchedule,
  type DaySchedule,
  type Leave,
  type ManualStatus,
  type ScheduleOverride,
} from '../data/doctor';
import { clinicalTemplates, type ClinicalTemplate, type ConsultationRecord } from '../data/clinical';
import { patientAlerts, type AlertAction, type AlertStatus } from '../data/followup';
import { messagesByThread, notifications, threads as seedThreads, type ChatMessage, type ChatThread } from '../data/messaging';
import { clarifications as seedClarifications, type Clarification } from '../data/clarification';
import { seedRequests, type ReportRequest } from '../data/documents';
import { supportIssues as seedIssues, type SupportIssue } from '../data/support';
import type { RegistrationDraft } from '../data/registration';
import { seedRecords } from './seed';

export type VerificationState = 'notSubmitted' | 'pending' | 'approved' | 'rejected';

export type AlertLive = {
  status: AlertStatus;
  read: boolean;
  action?: AlertAction;
  note?: string;
  reviewedAt?: string;
};

export type ThreadLive = ChatThread & { messages: ChatMessage[] };

export type ChangeRequest = { id: string; fields: string[]; note: string; at: string; state: 'pending' };

export type AvailabilityState = {
  schedule: DaySchedule[];
  overrides: ScheduleOverride[];
  leave: Leave[];
  durationMin: number;
  bufferMin: number;
  savedAt?: string;
};

export type AppState = {
  session: { stage: 'login' | 'onboarding' | 'shell'; mobile: string };
  onboardingCompleted: boolean;
  /** What the doctor submitted for verification, when they did it this session. */
  submission?: RegistrationDraft;
  verification: { status: VerificationState; acknowledged: boolean; submittedAt?: string };
  profile: { fee: number; changeRequests: ChangeRequest[] };
  privacy: { showOnline: boolean; analytics: boolean };
  liveStatus: ManualStatus;
  /** The consultation room currently open, if any. */
  activeCall?: { appointmentId: string; joinedAt: number };
  /** Set after a call ends until its case summary is submitted. */
  postCall?: { appointmentId: string };
  /** Consultations whose call the doctor ended this session, by appointment. */
  endedCalls: Record<string, string>;
  availability: AvailabilityState;
  records: Record<string, ConsultationRecord>;
  alerts: Record<string, AlertLive>;
  notifRead: Record<string, boolean>;
  instant: 'pending' | 'accepted' | 'declined' | 'expired';
  threads: ThreadLive[];
  clarifications: Clarification[];
  templates: ClinicalTemplate[];
  reportRequests: ReportRequest[];
  supportIssues: SupportIssue[];
  reviewReports: Record<string, string>;
};

export const initialState = (): AppState => ({
  session: { stage: 'login', mobile: '' },
  onboardingCompleted: false,
  verification: { status: 'notSubmitted', acknowledged: false },
  profile: { fee: doctor.consultationFee, changeRequests: [] },
  privacy: { showOnline: true, analytics: false },
  liveStatus: 'available',
  endedCalls: {},
  availability: {
    schedule: initialSchedule.map((d) => ({ ...d, ranges: d.ranges.map((r) => ({ ...r })) })),
    overrides: initialOverrides.map((o) => ({ ...o })),
    leave: initialLeave.map((l) => ({ ...l })),
    durationMin: doctor.consultationMinutes,
    bufferMin: 10,
  },
  records: seedRecords(),
  alerts: Object.fromEntries(
    patientAlerts.map((a) => [a.id, { status: a.status, read: a.status !== 'open' }])
  ),
  notifRead: Object.fromEntries(notifications.map((n) => [n.id, n.read])),
  instant: 'pending',
  threads: seedThreads.map((t) => ({ ...t, messages: [...(messagesByThread[t.id] ?? [])] })),
  clarifications: seedClarifications.map((c) => ({ ...c, messages: [...c.messages] })),
  templates: clinicalTemplates.map((t) => ({ ...t })),
  reportRequests: seedRequests.map((r) => ({ ...r })),
  supportIssues: seedIssues.map((i) => ({ ...i, updates: [...i.updates] })),
  reviewReports: {},
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
