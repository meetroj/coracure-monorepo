import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

import type { Appointment, PatientCase } from '../data/doctor';
import type { ChatThread } from '../data/messaging';

/** Every destination that can sit above a tab. */
export type RouteName =
  | 'reviews'
  | 'alerts'
  | 'tasks'
  | 'earnings'
  | 'apptDetails'
  | 'caseDetail'
  | 'availability'
  | 'room'
  | 'clinicalNotes'
  | 'prescription'
  | 'templates'
  | 'caseSummary'
  | 'instantRequest'
  | 'instantAccepted'
  | 'instantDeclined'
  | 'assignPlan'
  | 'careHub'
  | 'alertDetail'
  | 'requestReport'
  | 'patientDocs'
  | 'notifications'
  | 'chatList'
  | 'chatThread'
  | 'createClarification'
  | 'expertClarification'
  | 'expertCaseReview'
  | 'expertResponse'
  | 'profileDetails'
  | 'helpSupport'
  | 'consultationFee'
  | 'consultationDuration'
  | 'bankDetails'
  | 'privacy'
  | 'requestChanges';

export type Route = {
  name: RouteName;
  appt?: Appointment;
  thread?: ChatThread;
  /**
   * Set when the detail was opened from the Cases tab. It carries the
   * completion state (DR-11-01), which decides whether the screen is a
   * read-only review or still has work outstanding.
   */
  patientCase?: PatientCase;
};

/** Routes that hide the tab bar and own the whole viewport. */
export const FULL_SCREEN: RouteName[] = [
  'reviews',
  'earnings',
  'apptDetails',
  'caseDetail',
  'availability',
  'room',
  'clinicalNotes',
  'prescription',
  'templates',
  'caseSummary',
  'instantRequest',
  'instantAccepted',
  'instantDeclined',
  'assignPlan',
  'careHub',
  'alertDetail',
  'requestReport',
  'patientDocs',
  'notifications',
  'chatList',
  'chatThread',
  'createClarification',
  'expertClarification',
  'expertCaseReview',
  'expertResponse',
  'profileDetails',
  'helpSupport',
  'consultationFee',
  'consultationDuration',
  'bankDetails',
  'privacy',
  'requestChanges',
];

/**
 * A real navigation stack.
 *
 * Previously the shell held a single `overlay` slot, so every back button
 * collapsed straight to the tab root: open A from B and "back" dropped you on
 * the Dashboard instead of B. A stack makes back mean "the screen I came
 * from", however deep the trail.
 *
 * Android's hardware back is wired to the same `pop`, so it walks the trail
 * instead of closing the app. It only lets the OS exit when the stack is empty
 * and the doctor is on a tab root: which is the one place exiting is correct.
 *
 * iOS has no hardware back, so the header back buttons call the same `pop`.
 * That keeps both platforms on identical logic; edge-swipe would need a native
 * navigator and is not wired here.
 */
export const useNavStack = () => {
  const [stack, setStack] = useState<Route[]>([]);
  // read inside the BackHandler subscription without re-subscribing per push
  const ref = useRef<Route[]>(stack);
  ref.current = stack;

  const push = useCallback((route: Route) => setStack((s) => [...s, route]), []);

  const pop = useCallback(() => {
    setStack((s) => (s.length > 0 ? s.slice(0, -1) : s));
  }, []);

  /** Drops the whole trail: used when switching tabs. */
  const reset = useCallback(() => setStack([]), []);

  /**
   * Replaces the top entry. For step-to-step moves inside one flow, so "back"
   * returns to whatever opened the flow rather than retracing every step.
   */
  const replace = useCallback(
    (route: Route) => setStack((s) => (s.length === 0 ? [route] : [...s.slice(0, -1), route])),
    []
  );

  /** Unwinds to a named route if it is already open, otherwise pushes it. */
  const popTo = useCallback((name: RouteName) => {
    setStack((s) => {
      const idx = s.map((r) => r.name).lastIndexOf(name);
      return idx >= 0 ? s.slice(0, idx + 1) : [...s, { name }];
    });
  }, []);

  useEffect(() => {
    // iOS has no hardware back button and no `hardwareBackPress` event, so
    // subscribing there buys nothing and risks a stub that cannot be removed.
    // Header back buttons call the same `pop`, so behaviour is identical.
    if (Platform.OS !== 'android') return;

    const onBack = () => {
      if (ref.current.length > 0) {
        setStack((s) => s.slice(0, -1));
        // handled: do NOT let Android close the app
        return true;
      }
      // nothing stacked: let the OS decide (exit from a tab root)
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub?.remove?.();
  }, []);

  const top = stack.length > 0 ? stack[stack.length - 1] : null;
  const isFullScreen = !!top && FULL_SCREEN.includes(top.name);

  return { stack, top, isFullScreen, push, pop, reset, replace, popTo };
};
