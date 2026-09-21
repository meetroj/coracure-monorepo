/**
 * Every destination in the patient app, and what it needs to render.
 *
 * There is no navigation library in this workspace and installing one
 * (`@react-navigation/*` plus `react-native-screens` and
 * `react-native-gesture-handler`) is three native modules and a rebuild. The
 * doctor app solved the same problem with a hand-rolled shell, so this follows
 * that precedent and adds what it was missing: a real history stack, typed
 * params, and an auth gate that cannot be bypassed.
 *
 * The route names match the paths the brief asked for, so swapping in
 * React Navigation later is a mechanical translation of this union into a
 * `ParamList`.
 */

export type RouteParams = {
  /** '/splash' — decides where to go from the persisted session. */
  splash: undefined;
  /** '/welcome' */
  welcome: undefined;
  /** '/login' */
  login: undefined;
  /** '/verify-otp' */
  'verify-otp': {
    /** E.164, as it will be sent to the backend. */
    mobileNumber: string;
    /** Shown to the user; the E.164 string is not friendly to read. */
    displayNumber: string;
    /** From the OTP request call. Required by the verify DTO. */
    challengeId: string;
  };
  /** '/profile' — first-run profile completion (FR-2.2). */
  profile: undefined;
  /** '/consent' — teleconsultation consent (FR-2.3). Gates booking. */
  consent: undefined;
  /** '/dashboard' — the authenticated home, and the tab host. */
  dashboard: undefined;
  /** '/appointments' */
  appointments: undefined;
  /** '/reports' */
  reports: undefined;
  /** '/account' — the Profile tab, distinct from first-run '/profile'. */
  account: undefined;
  /** '/notifications' */
  notifications: undefined;
  /** '/assistant' — describe the problem in your own words (PT-09-01). */
  assistant: undefined;
  /** '/care-match' — guided questions for a patient who cannot describe it. */
  'care-match': undefined;
  /** '/find-care' — symptom search that maps onto SERVICES, never providers. */
  'find-care': undefined;
  /** '/services' — the bookable catalogue (PT-06-01). */
  services: undefined;
  /** '/choose-time' — date and time, never a person (PT-07-01). */
  'choose-time': undefined;
  /** '/intake' — pre-consult intake; ALSO creates the booking. See gap G-4. */
  intake: undefined;
  /** '/checkout' — payment for a held consultation (PT-12-01). */
  checkout: { consultationId: string };
  /** '/paid' — backend-confirmed payment; the assigned professional appears here. */
  paid: { consultationId: string };
  /** '/instant' — the live matching state for a Consult Now request (PT-13-01). */
  instant: { consultationId: string };
  /** '/device-check' — pre-call camera and microphone test (PT-14-01). */
  'device-check': { consultationId: string };
  /**
   * '/emergency' — guidance (PT-09-02, PT-18-02).
   *
   * `fromSearch` distinguishes the crisis interrupt from the persistent entry
   * point: the interrupt clears the query on dismissal, the entry point returns
   * you to where you were.
   */
  emergency: { fromSearch?: boolean } | undefined;
  /** '/consultations/:id' */
  consultation: { consultationId: string };
  /** '/settings' */
  settings: undefined;
  /** '/legal/:documentType' */
  legal: {
    documentType:
      | 'privacy_policy'
      | 'terms_of_use'
      | 'teleconsultation_consent'
      // PT-11-05 shows the refund consequence from the published policy.
      | 'refund_policy';
  };
};

export type RouteName = keyof RouteParams;

export type Route<K extends RouteName = RouteName> = {
  name: K;
  params: RouteParams[K];
};

/** Routes reachable without a session. Everything else is gated. */
export const PUBLIC_ROUTES: readonly RouteName[] = [
  'splash',
  'welcome',
  'login',
  'verify-otp',
  'legal',
  // Emergency guidance must be reachable without a session. Somebody in crisis
  // should not be asked to sign in first.
  'emergency',
];

/** The four bottom-navigation destinations, in fixed order. */
export const TAB_ROUTES = ['dashboard', 'appointments', 'reports', 'account'] as const;
export type TabRoute = (typeof TAB_ROUTES)[number];

export const isTabRoute = (name: RouteName): name is TabRoute =>
  (TAB_ROUTES as readonly string[]).includes(name);
