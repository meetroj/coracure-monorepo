/**
 * Mock transport for the patient app.
 *
 * `MOCK_MODE` in `http.ts` routes every request here instead of over the
 * network, so the app never needs a live backend to click through — and every
 * screen has something to show instead of an empty state. Delete this file
 * and flip `MOCK_MODE` back to `false` in `http.ts` once a backend is running.
 *
 * State below (consultations, notifications, files) is a plain in-memory
 * array, mutated by the mock POST/DELETE handlers, so booking, cancelling,
 * marking a notification read etc. behave consistently across screens for the
 * lifetime of the app process. It resets on reload — there is no persistence,
 * on purpose.
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const isoIn = (ms: number) => new Date(Date.now() + ms).toISOString();

/* --------------------------------- catalogue ------------------------------- */

const services = [
  {
    id: 'svc-general',
    code: 'GENERAL',
    name: 'General Physician',
    description: 'Fever, cold, infections and everyday health concerns.',
    consultationFeeInr: 499,
    providerType: 'doctor',
    canPrescribe: true,
  },
  {
    id: 'svc-derma',
    code: 'DERMA',
    name: 'Dermatologist',
    description: 'Skin, hair and nail concerns.',
    consultationFeeInr: 699,
    providerType: 'doctor',
    canPrescribe: true,
  },
  {
    id: 'svc-psych',
    code: 'PSYCH',
    name: 'Psychologist',
    description: 'Anxiety, stress, sleep and emotional wellbeing.',
    consultationFeeInr: 899,
    providerType: 'doctor',
    canPrescribe: false,
  },
  {
    id: 'svc-pedia',
    code: 'PEDIA',
    name: 'Pediatrician',
    description: "Child health, growth and vaccination.",
    consultationFeeInr: 599,
    providerType: 'doctor',
    canPrescribe: true,
  },
  {
    id: 'svc-gyne',
    code: 'GYNE',
    name: 'Gynecologist',
    description: 'Menstrual health, pregnancy care and PCOS.',
    consultationFeeInr: 799,
    providerType: 'doctor',
    canPrescribe: true,
  },
  {
    id: 'svc-cardio',
    code: 'CARDIO',
    name: 'Cardiologist',
    description: 'Chest pain, blood pressure and heart health.',
    consultationFeeInr: 999,
    providerType: 'doctor',
    canPrescribe: true,
  },
];

const concerns = [
  { id: 'con-1', specialtyId: 'svc-general', name: 'Fever' },
  { id: 'con-2', specialtyId: 'svc-general', name: 'Cold & cough' },
  { id: 'con-3', specialtyId: 'svc-general', name: 'General checkup' },
  { id: 'con-4', specialtyId: 'svc-derma', name: 'Acne' },
  { id: 'con-5', specialtyId: 'svc-derma', name: 'Skin allergy' },
  { id: 'con-6', specialtyId: 'svc-derma', name: 'Hair fall' },
  { id: 'con-7', specialtyId: 'svc-psych', name: 'Anxiety' },
  { id: 'con-8', specialtyId: 'svc-psych', name: 'Stress' },
  { id: 'con-9', specialtyId: 'svc-psych', name: 'Sleep issues' },
  { id: 'con-10', specialtyId: 'svc-pedia', name: 'Child fever' },
  { id: 'con-11', specialtyId: 'svc-pedia', name: 'Vaccination' },
  { id: 'con-12', specialtyId: 'svc-gyne', name: 'Menstrual issues' },
  { id: 'con-13', specialtyId: 'svc-gyne', name: 'Pregnancy care' },
  { id: 'con-14', specialtyId: 'svc-cardio', name: 'Chest pain' },
  { id: 'con-15', specialtyId: 'svc-cardio', name: 'High blood pressure' },
];

const regions = [
  { id: 'reg-1', name: 'Delhi NCR', code: 'DL' },
  { id: 'reg-2', name: 'Mumbai', code: 'MH' },
  { id: 'reg-3', name: 'Bengaluru', code: 'KA' },
  { id: 'reg-4', name: 'Chennai', code: 'TN' },
  { id: 'reg-5', name: 'Hyderabad', code: 'TG' },
  { id: 'reg-6', name: 'Pune', code: 'MH' },
];

const providers: Record<string, unknown> = {
  'doc-1': {
    id: 'doc-1',
    fullName: 'Dr. Sydney Sweeney',
    qualification: 'MBBS, MD (Dermatology)',
    registrationNumber: 'MCI-114829',
    yearsOfExperience: 8,
    languages: ['en', 'hi'],
    bio: 'Focuses on acne, pigmentation and everyday skin concerns, with a plain-language approach to treatment.',
    specialtyId: 'svc-derma',
    consultationFeeInr: 699,
    consultationDurationMinutes: 20,
    seniorityLevel: 'senior',
    presence: 'online',
    allowInstantConsult: true,
    canPrescribe: true,
  },
  'doc-2': {
    id: 'doc-2',
    fullName: 'Dr. Rohan Mehta',
    qualification: 'MBBS, MD (Psychiatry)',
    registrationNumber: 'MCI-098213',
    yearsOfExperience: 11,
    languages: ['en'],
    bio: 'Works with anxiety, stress and sleep — a calm first conversation, not a diagnosis rushed to a prescription.',
    specialtyId: 'svc-psych',
    consultationFeeInr: 899,
    consultationDurationMinutes: 30,
    seniorityLevel: 'senior',
    presence: 'offline',
    allowInstantConsult: false,
    canPrescribe: false,
  },
};

/* ------------------------------ consultations ------------------------------ */

const UPCOMING_STATUSES = new Set([
  'pending_payment',
  'scheduled',
  'awaiting_doctor',
  'in_progress',
  'awaiting_documentation',
]);

let consultationSeq = 6;

const consultations: Record<string, unknown>[] = [
  {
    id: 'c-1',
    referenceCode: 'CC-1001',
    status: 'scheduled',
    mode: 'scheduled',
    specialtyId: 'svc-derma',
    concernId: 'con-4',
    doctorId: 'doc-1',
    scheduledStartAt: isoIn(DAY),
    durationMinutes: 20,
    holdExpiresAt: null,
    consultationFeeInr: 699,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: isoIn(-2 * DAY),
  },
  {
    id: 'c-2',
    referenceCode: 'CC-1002',
    status: 'awaiting_doctor',
    mode: 'scheduled',
    specialtyId: 'svc-general',
    concernId: 'con-1',
    doctorId: null,
    scheduledStartAt: isoIn(2 * DAY),
    durationMinutes: 15,
    holdExpiresAt: null,
    consultationFeeInr: 499,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: isoIn(-1 * DAY),
  },
  {
    id: 'c-3',
    referenceCode: 'CC-1003',
    status: 'completed',
    mode: 'scheduled',
    specialtyId: 'svc-psych',
    concernId: 'con-7',
    doctorId: 'doc-2',
    scheduledStartAt: isoIn(-5 * DAY),
    durationMinutes: 30,
    holdExpiresAt: null,
    consultationFeeInr: 899,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: isoIn(-6 * DAY),
  },
  {
    id: 'c-4',
    referenceCode: 'CC-1004',
    status: 'cancelled',
    mode: 'scheduled',
    specialtyId: 'svc-pedia',
    concernId: 'con-10',
    doctorId: null,
    scheduledStartAt: isoIn(-10 * DAY),
    durationMinutes: 15,
    holdExpiresAt: null,
    consultationFeeInr: 599,
    cancelledAt: isoIn(-9 * DAY),
    cancellationReason: 'Change of plans',
    createdAt: isoIn(-11 * DAY),
  },
  {
    id: 'c-5',
    referenceCode: 'CC-1005',
    status: 'pending_payment',
    mode: 'scheduled',
    specialtyId: 'svc-cardio',
    concernId: 'con-14',
    doctorId: null,
    scheduledStartAt: isoIn(DAY / 2),
    durationMinutes: 30,
    holdExpiresAt: isoIn(8 * 60_000),
    consultationFeeInr: 999,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: isoIn(-10 * 60_000),
  },
];

const findConsultation = (id: string) => consultations.find((c) => c.id === id);

const newConsultation = (specialtyId: string, mode: 'scheduled' | 'instant', overrides: Record<string, unknown> = {}) => {
  consultationSeq += 1;
  const service = services.find((s) => s.id === specialtyId);
  const c = {
    id: `c-${consultationSeq}`,
    referenceCode: `CC-${1000 + consultationSeq}`,
    status: mode === 'instant' ? 'awaiting_doctor' : 'pending_payment',
    mode,
    specialtyId,
    concernId: null,
    doctorId: null,
    scheduledStartAt: mode === 'instant' ? isoIn(0) : isoIn(DAY),
    durationMinutes: 30,
    holdExpiresAt: mode === 'instant' ? null : isoIn(10 * 60_000),
    consultationFeeInr: service?.consultationFeeInr ?? 499,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: isoIn(0),
    ...overrides,
  };
  consultations.push(c);
  return c;
};

/* ------------------------------ notifications ------------------------------ */

const notifications = [
  {
    id: 'n-1',
    templateCode: 'DOCTOR_ASSIGNED',
    title: 'A doctor has been assigned',
    body: 'Dr. Aisha Verma will see you for your Dermatologist consultation.',
    deepLinkData: null,
    consultationId: 'c-1',
    status: 'sent',
    createdAt: isoIn(-1 * HOUR),
    readAt: null as string | null,
  },
  {
    id: 'n-2',
    templateCode: 'APPOINTMENT_REMINDER',
    title: 'Upcoming appointment tomorrow',
    body: 'Your consultation is scheduled for tomorrow. Make sure you have a quiet, well-lit space ready.',
    deepLinkData: null,
    consultationId: 'c-1',
    status: 'sent',
    createdAt: isoIn(-3 * HOUR),
    readAt: isoIn(-2 * HOUR),
  },
  {
    id: 'n-3',
    templateCode: 'PAYMENT_RECEIVED',
    title: 'Payment received',
    body: 'We have received your payment for consultation CC-1003.',
    deepLinkData: null,
    consultationId: 'c-3',
    status: 'sent',
    createdAt: isoIn(-6 * DAY),
    readAt: isoIn(-6 * DAY),
  },
  {
    id: 'n-4',
    templateCode: 'FILE_REQUEST',
    title: 'A report has been requested',
    body: 'Please upload your recent lab reports before your consultation.',
    deepLinkData: null,
    consultationId: 'c-2',
    status: 'sent',
    createdAt: isoIn(-1 * DAY),
    readAt: null as string | null,
  },
  {
    id: 'n-5',
    templateCode: 'GENERAL',
    title: 'Welcome to Coracure',
    body: "Book a consultation any time — we'll match you with the right professional.",
    deepLinkData: null,
    consultationId: null,
    status: 'sent',
    createdAt: isoIn(-3 * DAY),
    readAt: isoIn(-3 * DAY),
  },
];

/* ---------------------------------- files ----------------------------------- */

const files = [
  {
    id: 'f-1',
    fileName: 'Blood_Test_Report.pdf',
    contentType: 'application/pdf',
    sizeBytes: 245_000,
    isPartOfRecord: true,
    consultationId: 'c-3',
    createdAt: isoIn(-5 * DAY),
  },
  {
    id: 'f-2',
    fileName: 'Prescription_GeneralPhysician.pdf',
    contentType: 'application/pdf',
    sizeBytes: 82_000,
    isPartOfRecord: false,
    consultationId: null,
    createdAt: isoIn(-2 * DAY),
  },
];

const fileRequests = [
  {
    id: 'fr-1',
    consultationId: 'c-2',
    description: 'Please upload your recent lab reports before the consultation.',
    createdAt: isoIn(-1 * DAY),
  },
];

/* ---------------------------------- profile --------------------------------- */

const profile = {
  id: 'mock-patient-1',
  fullName: 'Demo Patient',
  dateOfBirth: '1990-01-01',
  age: 35,
  gender: 'undisclosed',
  preferredLanguage: 'en',
  regionId: 'reg-1',
  mobileNumber: '+910000000000',
  status: 'active',
  isComplete: true,
};

/* -------------------------------- search / care ------------------------------ */

const asGuideEntry = (s: (typeof services)[number]) => ({
  ...s,
  concerns: concerns.filter((c) => c.specialtyId === s.id),
  soonestAvailableAt: isoIn(2 * HOUR),
});

const searchServices = (query: string) => {
  const q = query.trim().toLowerCase();
  const matches = !q
    ? services
    : services.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          concerns.some((c) => c.specialtyId === s.id && c.name.toLowerCase().includes(q)),
      );
  const list = matches.length ? matches : services.slice(0, 3);
  return list.map((s) => ({
    ...s,
    concerns: concerns.filter((c) => c.specialtyId === s.id),
    reason: q ? `Matched to: ${q}` : 'Popular with other patients',
    soonestAvailableAt: isoIn(2 * HOUR),
    matchedBy: 'mapping' as const,
  }));
};

/* ---------------------------------- routing ---------------------------------- */

type Query = Record<string, unknown> | undefined;
type Responder = (path: string, body: unknown, query: Query) => unknown;

const idFromPath = (path: string, index: number): string => path.split('/')[index] ?? 'mock-id';

const routes: { method: string; pattern: RegExp; respond: Responder }[] = [
  { method: 'POST', pattern: /^\/auth\/patient\/otp\/request$/, respond: () => ({ challengeId: 'mock-challenge' }) },
  {
    method: 'POST',
    pattern: /^\/auth\/patient\/otp\/verify$/,
    respond: () => ({ accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresIn: 3600, isNewAccount: false }),
  },
  {
    method: 'POST',
    pattern: /^\/auth\/refresh$/,
    respond: () => ({ accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresIn: 3600 }),
  },
  { method: 'POST', pattern: /^\/auth\/sign-out$/, respond: () => undefined },

  { method: 'GET', pattern: /^\/me\/profile$/, respond: () => profile },
  { method: 'PATCH', pattern: /^\/me\/profile$/, respond: (_p, body) => Object.assign(profile, body as object) },

  { method: 'GET', pattern: /^\/services$/, respond: () => services },
  { method: 'GET', pattern: /^\/concerns$/, respond: (_p, _b, query) => {
    const specialtyId = query?.specialtyId as string | undefined;
    return specialtyId ? concerns.filter((c) => c.specialtyId === specialtyId) : concerns;
  } },
  { method: 'GET', pattern: /^\/regions$/, respond: () => regions },

  { method: 'GET', pattern: /^\/doctors\/[^/]+$/, respond: (p) => providers[idFromPath(p, 2)] ?? providers['doc-1'] },

  {
    method: 'GET',
    pattern: /^\/me\/consultations$/,
    respond: (_p, _b, query) => {
      const upcoming = query?.upcoming;
      if (upcoming === undefined) return consultations;
      const wantUpcoming = upcoming === true || upcoming === 'true';
      const filtered = consultations.filter((c) =>
        wantUpcoming ? UPCOMING_STATUSES.has(c.status as string) : !UPCOMING_STATUSES.has(c.status as string),
      );
      // Soonest first for upcoming (what a patient cares about next), most
      // recent first for past — the same ordering a real backend would return,
      // so a freshly-created test booking doesn't randomly jump to the top.
      const byDate = (c: Record<string, unknown>) =>
        new Date((c.scheduledStartAt as string) ?? (c.createdAt as string)).getTime();
      return [...filtered].sort((a, b) => (wantUpcoming ? byDate(a) - byDate(b) : byDate(b) - byDate(a)));
    },
  },
  {
    method: 'GET',
    pattern: /^\/me\/consultations\/[^/]+$/,
    respond: (p) => findConsultation(idFromPath(p, 2)) ?? newConsultation('svc-general', 'scheduled', { id: idFromPath(p, 2) }),
  },
  {
    method: 'POST',
    pattern: /^\/me\/consultations$/,
    respond: (_p, body) => newConsultation((body as { specialtyId?: string })?.specialtyId ?? 'svc-general', 'scheduled'),
  },
  {
    method: 'POST',
    pattern: /^\/me\/consultations\/instant$/,
    respond: (_p, body) => newConsultation((body as { specialtyId?: string })?.specialtyId ?? 'svc-general', 'instant', { doctorId: 'doc-1' }),
  },
  {
    method: 'GET',
    pattern: /^\/me\/consultations\/[^/]+\/instant-status$/,
    respond: () => ({ attempts: 1, stillSearching: false, accepted: true }),
  },
  {
    method: 'POST',
    pattern: /^\/me\/consultations\/[^/]+\/cancel$/,
    respond: (p, body) => {
      const c = findConsultation(idFromPath(p, 2));
      if (!c) return newConsultation('svc-general', 'scheduled', { status: 'cancelled' });
      c.status = 'cancelled';
      c.cancelledAt = isoIn(0);
      c.cancellationReason = (body as { reason?: string })?.reason ?? null;
      return c;
    },
  },
  {
    method: 'POST',
    pattern: /^\/me\/consultations\/[^/]+\/reschedule$/,
    respond: (p, body) => {
      const c = findConsultation(idFromPath(p, 2));
      const startsAt = (body as { startsAt?: string })?.startsAt ?? isoIn(DAY);
      if (!c) return newConsultation('svc-general', 'scheduled', { scheduledStartAt: startsAt });
      c.scheduledStartAt = startsAt;
      c.status = 'pending_payment';
      c.holdExpiresAt = isoIn(10 * 60_000);
      return c;
    },
  },
  {
    method: 'POST',
    pattern: /^\/me\/consultations\/[^/]+\/decline-provider$/,
    respond: (p) => {
      const c = findConsultation(idFromPath(p, 2));
      if (c) c.doctorId = null;
      return c ?? newConsultation('svc-general', 'scheduled');
    },
  },
  {
    method: 'GET',
    pattern: /^\/me\/consultations\/[^/]+\/bill$/,
    respond: (p) => {
      const c = findConsultation(idFromPath(p, 2));
      const fee = (c?.consultationFeeInr as number) ?? 499;
      return {
        consultationId: idFromPath(p, 2),
        totalInr: fee,
        lines: [{ label: 'Consultation fee', amountInr: fee }],
      };
    },
  },
  { method: 'POST', pattern: /^\/me\/consultations\/[^/]+\/checkout$/, respond: () => ({}) },

  {
    method: 'GET',
    pattern: /^\/consultations\/[^/]+\/video\/readiness$/,
    respond: () => ({ joinable: false, message: 'Video is not available while running without a backend.', opensAt: null }),
  },

  {
    method: 'GET',
    pattern: /^\/legal\/documents\/[^/]+$/,
    respond: (p) => {
      const documentType = p.split('/').pop();
      return { documentType, version: 'mock', title: documentType, body: 'Placeholder legal text — running without a backend.' };
    },
  },
  { method: 'GET', pattern: /^\/legal\/consents\/me\/status$/, respond: () => ({ teleconsultationConsent: true, privacyPolicy: true, termsOfUse: true }) },
  { method: 'POST', pattern: /^\/legal\/consents$/, respond: () => ({}) },

  { method: 'POST', pattern: /^\/me\/deletion-requests$/, respond: () => ({}) },

  { method: 'GET', pattern: /^\/me\/files$/, respond: () => files },
  { method: 'GET', pattern: /^\/me\/files\/requests\/open$/, respond: () => fileRequests },
  { method: 'GET', pattern: /^\/me\/files\/[^/]+\/download-url$/, respond: () => ({ url: 'https://example.com/mock-file.pdf' }) },
  {
    method: 'DELETE',
    pattern: /^\/me\/files\/[^/]+$/,
    respond: (p) => {
      const i = files.findIndex((f) => f.id === idFromPath(p, 2));
      if (i >= 0) files.splice(i, 1);
      return undefined;
    },
  },

  { method: 'GET', pattern: /^\/me\/notifications$/, respond: () => notifications },
  { method: 'GET', pattern: /^\/me\/notifications\/unread-count$/, respond: () => ({ unread: notifications.filter((n) => n.readAt === null).length }) },
  {
    method: 'POST',
    pattern: /^\/me\/notifications\/[^/]+\/read$/,
    respond: (p) => {
      const n = notifications.find((x) => x.id === idFromPath(p, 2));
      if (n) n.readAt = isoIn(0);
      return undefined;
    },
  },
  {
    method: 'POST',
    pattern: /^\/me\/notifications\/read-all$/,
    respond: () => {
      const marked = notifications.filter((n) => n.readAt === null).length;
      notifications.forEach((n) => (n.readAt = n.readAt ?? isoIn(0)));
      return { marked };
    },
  },

  { method: 'GET', pattern: /^\/care-hub\/emergency$/, respond: () => [
    {
      id: 'ch-1',
      slug: 'emergency-guidance',
      title: 'If this is a medical emergency',
      summary: 'Call your local emergency number or go to the nearest emergency room immediately.',
      body: 'This app is not equipped to handle emergencies. For a life-threatening situation, call 112 (India) or your local emergency number right away.',
      itemType: 'emergency',
    },
  ] },
  { method: 'GET', pattern: /^\/care-hub\/items$/, respond: () => [] },

  { method: 'POST', pattern: /^\/search$/, respond: (_p, body) => ({
    disclaimer: 'This suggests which service to consult — it does not diagnose or decide treatment.',
    crisis: false,
    results: searchServices((body as { query?: string })?.query ?? ''),
  }) },
  { method: 'GET', pattern: /^\/search\/guide$/, respond: () => ({
    disclaimer: 'This suggests which service to consult — it does not diagnose or decide treatment.',
    services: services.map(asGuideEntry),
  }) },
  { method: 'GET', pattern: /^\/search\/suggestions$/, respond: () => ({
    disclaimer: 'This suggests which service to consult — it does not diagnose or decide treatment.',
    popular: ['Fever and cold', 'Skin rash or acne', 'Anxiety or stress', 'Child vaccination', 'Period problems', 'Chest pain'],
  }) },
];

/**
 * Falls through to an empty success rather than throwing, so an endpoint
 * nobody has added a mock for yet still resolves instead of hanging.
 */
export const mockRequest = (method: string, path: string, body: unknown, query?: Query): unknown => {
  const match = routes.find((r) => r.method === method && r.pattern.test(path));
  if (match) return match.respond(path, body, query);
  return method === 'GET' ? {} : undefined;
};
