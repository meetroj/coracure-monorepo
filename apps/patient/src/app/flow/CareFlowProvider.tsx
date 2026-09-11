import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { EmergencyGuidance, Service, ServiceMatch } from '@coracure/api';

/**
 * The booking flow's shared state.
 *
 * The flow is: describe → recommendations → service → time → intake → payment,
 * and each step needs something the previous one produced. Passing it through
 * route params would mean the same object serialised into five different route
 * shapes, and a back-navigation would lose it.
 *
 * *** THIS IS FLOW STATE, NOT A CACHE. *** Nothing here is fetched; everything
 * is a CHOICE the patient made, or a response a screen already paid for and
 * should not pay for twice. Server data lives in `@coracure/api`'s query cache.
 *
 * *** THERE IS NO PROVIDER FIELD, DELIBERATELY. *** A patient's choices are a
 * service and a time. If a future change adds `doctorId` here, that is the
 * moment the provider directory comes back — so it does not exist.
 */

export type CareResults = {
  /** What the patient typed. Kept so the results screen can show it back. */
  query: string;
  /** FR-5.8's sentence, from the backend. Never composed in the app. */
  disclaimer: string;
  results: ServiceMatch[];
};

/** The answers from the care-match questions. Not clinical, not a diagnosis. */
export type CareMatchAnswers = Record<string, string>;

type CareFlowValue = {
  /** The last non-crisis search, so `find-care` need not re-run it. */
  results: CareResults | null;
  setResults: (next: CareResults | null) => void;

  /** Guidance from a crisis response, shown by the emergency screen. */
  crisis: EmergencyGuidance | null;
  setCrisis: (next: EmergencyGuidance | null) => void;

  /** The service being booked. Chosen by the patient, from the catalogue. */
  service: Service | null;
  setService: (next: Service | null) => void;

  /** The concern the search matched, carried onto the booking when known. */
  concernId: string | null;
  setConcernId: (next: string | null) => void;

  /** ISO start the patient picked. Confirmed by the booking call, not here. */
  startsAt: string | null;
  setStartsAt: (next: string | null) => void;

  /**
   * Set when the time picker is MOVING an existing consultation rather than
   * booking a new one. The picker then calls `POST .../reschedule` instead of
   * sending the patient on to intake and a fresh `POST /me/consultations`.
   *
   * *** ANY FRESH SERVICE CHOICE CLEARS IT. *** `setService` resets this, so a
   * patient who backs out of a reschedule and later books something new can
   * never have that new booking silently reschedule the old one. The detail
   * screen sets the service FIRST and this SECOND, in the same handler.
   */
  rescheduleOf: string | null;
  setRescheduleOf: (consultationId: string | null) => void;

  answers: CareMatchAnswers;
  setAnswer: (id: string, value: string) => void;

  /** Called on sign-out and when a booking completes. */
  reset: () => void;
};

const CareFlowContext = createContext<CareFlowValue | null>(null);

export const useCareFlow = (): CareFlowValue => {
  const ctx = useContext(CareFlowContext);
  if (!ctx) throw new Error('useCareFlow must be used inside <CareFlowProvider>');
  return ctx;
};

export const CareFlowProvider = ({ children }: { children: ReactNode }) => {
  const [results, setResults] = useState<CareResults | null>(null);
  const [crisis, setCrisis] = useState<EmergencyGuidance | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [concernId, setConcernId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [rescheduleOf, setRescheduleOf] = useState<string | null>(null);

  const selectService = useCallback((next: Service | null) => {
    setService(next);
    setRescheduleOf(null);
  }, []);
  const [answers, setAnswers] = useState<CareMatchAnswers>({});

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setCrisis(null);
    setService(null);
    setConcernId(null);
    setStartsAt(null);
    setRescheduleOf(null);
    setAnswers({});
  }, []);

  const value = useMemo<CareFlowValue>(
    () => ({
      results,
      setResults,
      crisis,
      setCrisis,
      service,
      setService: selectService,
      concernId,
      setConcernId,
      startsAt,
      setStartsAt,
      rescheduleOf,
      setRescheduleOf,
      answers,
      setAnswer,
      reset,
    }),
    [
      results,
      crisis,
      service,
      selectService,
      concernId,
      startsAt,
      rescheduleOf,
      answers,
      setAnswer,
      reset,
    ],
  );

  return <CareFlowContext.Provider value={value}>{children}</CareFlowContext.Provider>;
};
