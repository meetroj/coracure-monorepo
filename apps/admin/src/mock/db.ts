import type {
  AdminNotification,
  AllocationDecision,
  AllocationPolicy,
  AssignableProvider,
  AuditEntry,
  AvailabilityRule,
  ClarificationCase,
  Complaint,
  Concern,
  ConfigValue,
  Consultation,
  ContentItem,
  CredentialQueueRow,
  DeletionRequest,
  Doctor,
  DoctorDocument,
  Expert,
  Feedback,
  GovernanceDashboard,
  LegalDocument,
  NotificationTemplate,
  Pathway,
  PendingPayout,
  PendingSummary,
  Region,
  Reliability,
  RetentionInfo,
  SafetyAlert,
  SearchConfigShape,
  Slot,
  Specialty,
} from '../api/types';

/**
 * *** THE PANEL RUNS ON FIXTURES, NOT ON THE BACKEND. ***
 *
 * This is a UI build: every screen reads and writes this in-memory store
 * instead of calling the API. Nothing here reaches the network.
 *
 * It is deliberately STATEFUL — verifying a provider really does flip their
 * status, closing an alert really does remove it from the queue — so the flows
 * can be clicked through end to end and reviewed as they will actually behave.
 * The trade-off is that everything resets on a page reload, because the store
 * lives in memory only.
 *
 * *** REPLACING IT WITH THE REAL BACKEND IS ONE FILE. *** `api/admin.ts`
 * exposes the same function names, arguments and return types either way, so
 * swapping the bodies back to `request(...)` calls is all that is needed. No
 * screen imports this module directly.
 */

/** Fake latency, so loading and disabled-while-busy states are visible. */
const LATENCY_MS = 260;

export const delay = <T>(value: T, ms = LATENCY_MS): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/** Stable ids — `Math.random` would change the data on every render. */
let sequence = 1000;
const nextId = (prefix: string) => `${prefix}-${++sequence}`;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

/* -------------------------------- catalogue ------------------------------- */

export const specialties: Specialty[] = [
  { id: 'sp-psy', name: 'Psychiatry', isActive: true, providerType: 'doctor', mayPrescribe: true },
  {
    id: 'sp-psyc',
    name: 'Psychology',
    isActive: true,
    providerType: 'non_doctor',
    mayPrescribe: false,
  },
  {
    id: 'sp-ther',
    name: 'Therapy',
    isActive: true,
    providerType: 'non_doctor',
    mayPrescribe: false,
  },
  {
    id: 'sp-coun',
    name: 'Counselling',
    isActive: true,
    providerType: 'non_doctor',
    mayPrescribe: false,
  },
  {
    id: 'sp-deadd',
    name: 'De-addiction',
    isActive: true,
    providerType: 'doctor',
    mayPrescribe: true,
  },
];

export const regions: Region[] = [
  { id: 'rg-mh', name: 'Maharashtra', isActive: true },
  { id: 'rg-dl', name: 'Delhi NCR', isActive: true },
  { id: 'rg-ka', name: 'Karnataka', isActive: true },
  { id: 'rg-tn', name: 'Tamil Nadu', isActive: true },
];

export const concerns: Concern[] = [
  {
    id: 'cn-1',
    name: 'Low mood',
    specialtyId: 'sp-psy',
    matchPhrases: ['sad', 'hopeless', 'no interest'],
    weight: 8,
    isActive: true,
  },
  {
    id: 'cn-2',
    name: 'Sleep difficulty',
    specialtyId: 'sp-psy',
    matchPhrases: ['cannot sleep', 'insomnia', 'awake at night'],
    weight: 6,
    isActive: true,
  },
  {
    id: 'cn-3',
    name: 'Panic and anxiety',
    specialtyId: 'sp-psyc',
    matchPhrases: ['panic', 'racing heart', 'anxious'],
    weight: 9,
    isActive: true,
  },
  {
    id: 'cn-4',
    name: 'Alcohol dependence',
    specialtyId: 'sp-deadd',
    matchPhrases: ['drinking', 'alcohol', 'withdrawal'],
    weight: 7,
    isActive: true,
  },
];

export const allocationPolicy: AllocationPolicy = { mayRelaxRegion: true, maxDeclines: 2 };

/* -------------------------------- providers ------------------------------- */

export const doctors: Doctor[] = [
  {
    id: 'dr-1',
    fullName: 'Dr Ananya Rao',
    mobileNumber: '+919876543210',
    specialtyId: 'sp-psy',
    specialtyName: 'Psychiatry',
    qualification: 'MBBS, MD (Psychiatry)',
    registrationNumber: 'MH-2014-55821',
    yearsOfExperience: 11,
    languages: ['English', 'Hindi', 'Marathi'],
    regionIds: ['rg-mh'],
    verificationStatus: 'verified',
    isListed: true,
    seniority: 'expert',
    payoutFeeInr: 1200,
    consultationDurationMinutes: 30,
    bufferMinutes: 10,
    createdAt: daysAgo(420),
  },
  {
    id: 'dr-2',
    fullName: 'Dr Vikram Sethi',
    mobileNumber: '+919812345678',
    specialtyId: 'sp-deadd',
    specialtyName: 'De-addiction',
    qualification: 'MBBS, DPM',
    registrationNumber: 'DL-2016-10394',
    yearsOfExperience: 8,
    languages: ['English', 'Hindi'],
    regionIds: ['rg-dl'],
    verificationStatus: 'verified',
    isListed: true,
    seniority: 'standard',
    payoutFeeInr: 1000,
    consultationDurationMinutes: 30,
    createdAt: daysAgo(300),
  },
  {
    id: 'dr-3',
    fullName: 'Meera Krishnan',
    mobileNumber: '+919900112233',
    specialtyId: 'sp-psyc',
    specialtyName: 'Psychology',
    qualification: 'MA, MPhil (Clinical Psychology)',
    yearsOfExperience: 6,
    languages: ['English', 'Tamil'],
    regionIds: ['rg-tn'],
    verificationStatus: 'under_review',
    isListed: false,
    seniority: 'standard',
    payoutFeeInr: 900,
    consultationDurationMinutes: 45,
    createdAt: daysAgo(21),
  },
  {
    id: 'dr-4',
    fullName: 'Dr Sameer Joshi',
    mobileNumber: '+919765432109',
    specialtyId: 'sp-psy',
    specialtyName: 'Psychiatry',
    registrationNumber: 'KA-2019-88120',
    yearsOfExperience: 4,
    languages: ['English', 'Kannada'],
    regionIds: ['rg-ka'],
    verificationStatus: 'pending',
    isListed: false,
    seniority: 'standard',
    createdAt: daysAgo(6),
  },
  {
    id: 'dr-5',
    fullName: 'Rhea Dutta',
    mobileNumber: '+919123456780',
    specialtyId: 'sp-ther',
    specialtyName: 'Therapy',
    yearsOfExperience: 9,
    languages: ['English', 'Bengali'],
    regionIds: ['rg-dl'],
    verificationStatus: 'rejected',
    isListed: false,
    seniority: 'standard',
    rejectionReason: 'Registration certificate was cropped — the council number is not legible.',
    createdAt: daysAgo(48),
  },
  {
    id: 'dr-6',
    fullName: 'Dr Kabir Nair',
    mobileNumber: '+919845001122',
    specialtyId: 'sp-psy',
    specialtyName: 'Psychiatry',
    registrationNumber: 'KA-2011-40021',
    yearsOfExperience: 14,
    languages: ['English', 'Malayalam'],
    regionIds: ['rg-ka'],
    verificationStatus: 'suspended',
    isListed: false,
    seniority: 'standard',
    suspensionReason: 'Under review following a conduct complaint.',
    createdAt: daysAgo(500),
  },
];

export const documents: Record<string, DoctorDocument[]> = {
  'dr-3': [
    { id: 'doc-1', documentType: 'degree_certificate', status: 'approved', uploadedAt: daysAgo(20), reviewedAt: daysAgo(18) },
    { id: 'doc-2', documentType: 'identity_proof', status: 'approved', uploadedAt: daysAgo(20), reviewedAt: daysAgo(18) },
    { id: 'doc-3', documentType: 'experience_letter', status: 'pending', uploadedAt: daysAgo(4) },
    { id: 'doc-4', documentType: 'address_proof', status: 'pending', uploadedAt: daysAgo(4) },
  ],
  'dr-4': [
    { id: 'doc-5', documentType: 'degree_certificate', status: 'pending', uploadedAt: daysAgo(5) },
    { id: 'doc-6', documentType: 'registration_certificate', status: 'pending', uploadedAt: daysAgo(5) },
    { id: 'doc-7', documentType: 'identity_proof', status: 'pending', uploadedAt: daysAgo(5) },
  ],
  'dr-5': [
    {
      id: 'doc-8',
      documentType: 'registration_certificate',
      status: 'rejected',
      rejectionReason: 'The certificate is cropped — re-upload the full page.',
      uploadedAt: daysAgo(50),
      reviewedAt: daysAgo(48),
    },
  ],
  'dr-1': [
    { id: 'doc-9', documentType: 'degree_certificate', status: 'approved', uploadedAt: daysAgo(418), reviewedAt: daysAgo(416) },
    { id: 'doc-10', documentType: 'registration_certificate', status: 'approved', uploadedAt: daysAgo(418), reviewedAt: daysAgo(416) },
  ],
};

export const reliability: Record<string, Reliability> = {
  'dr-1': { acceptanceRate: 0.94, noShowRate: 0.02, caseSummaryCompletion: 0.99, consultationsCompleted: 412 },
  'dr-2': { acceptanceRate: 0.81, noShowRate: 0.06, caseSummaryCompletion: 0.88, consultationsCompleted: 268 },
  'dr-3': { acceptanceRate: null, noShowRate: null, caseSummaryCompletion: null, consultationsCompleted: 0 },
  'dr-6': { acceptanceRate: 0.62, noShowRate: 0.19, caseSummaryCompletion: 0.71, consultationsCompleted: 133 },
};

/* ------------------------------- scheduling -------------------------------- */

export const availability: Record<string, AvailabilityRule[]> = {
  'dr-1': [
    { id: 'av-1', ruleType: 'weekly', dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
    { id: 'av-2', ruleType: 'weekly', dayOfWeek: 2, startTime: '09:00', endTime: '13:00' },
    { id: 'av-3', ruleType: 'weekly', dayOfWeek: 4, startTime: '14:00', endTime: '18:00' },
    { id: 'av-4', ruleType: 'blocked', date: inDays(6).slice(0, 10) },
  ],
  'dr-2': [
    { id: 'av-5', ruleType: 'weekly', dayOfWeek: 3, startTime: '10:00', endTime: '16:00' },
    { id: 'av-6', ruleType: 'custom_hours', date: inDays(2).slice(0, 10), startTime: '08:00', endTime: '11:00' },
  ],
};

export const slotsFor = (doctorId: string): Slot[] => {
  const rules = availability[doctorId]?.filter((r) => r.ruleType === 'weekly') ?? [];
  if (rules.length === 0) return [];
  const [first] = rules;
  const startHour = Number((first.startTime ?? '09:00').slice(0, 2));
  return Array.from({ length: 6 }, (_, i) => {
    const start = new Date();
    start.setHours(startHour + Math.floor(i / 2), (i % 2) * 30, 0, 0);
    return {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 30 * 60_000).toISOString(),
      available: true,
    };
  });
};

export const assignable: AssignableProvider[] = [
  {
    doctorId: 'dr-1',
    fullName: 'Dr Ananya Rao',
    remainingMinutes: 90,
    languages: ['English', 'Hindi', 'Marathi'],
    regionIds: ['rg-mh'],
    assignable: true,
  },
  {
    doctorId: 'dr-2',
    fullName: 'Dr Vikram Sethi',
    remainingMinutes: 25,
    languages: ['English', 'Hindi'],
    regionIds: ['rg-dl'],
    assignable: false,
    reason: 'Remaining window is shorter than the consultation plus its buffer.',
  },
  {
    doctorId: 'dr-6',
    fullName: 'Dr Kabir Nair',
    remainingMinutes: 0,
    languages: ['English', 'Malayalam'],
    regionIds: ['rg-ka'],
    assignable: false,
    reason: 'Provider is suspended.',
  },
];

/* ------------------------------ consultations ------------------------------ */

export const consultations: Consultation[] = [
  {
    id: 'cs-1001',
    referenceCode: 'CC-2026-01001',
    status: 'awaiting_documentation',
    mode: 'scheduled',
    startsAt: hoursAgo(30),
    serviceId: 'sp-psy',
    serviceName: 'Psychiatry',
    doctorId: 'dr-1',
    doctorName: 'Dr Ananya Rao',
    language: 'Hindi',
    regionId: 'rg-mh',
    createdAt: daysAgo(3),
  },
  {
    id: 'cs-1002',
    referenceCode: 'CC-2026-01002',
    status: 'pending_payment',
    mode: 'scheduled',
    startsAt: inDays(1),
    serviceId: 'sp-psyc',
    serviceName: 'Psychology',
    doctorId: 'dr-3',
    doctorName: 'Meera Krishnan',
    language: 'English',
    regionId: 'rg-tn',
    createdAt: hoursAgo(1),
  },
  {
    id: 'cs-1003',
    referenceCode: 'CC-2026-01003',
    status: 'completed',
    mode: 'instant',
    startsAt: daysAgo(2),
    serviceId: 'sp-deadd',
    serviceName: 'De-addiction',
    doctorId: 'dr-2',
    doctorName: 'Dr Vikram Sethi',
    language: 'Hindi',
    regionId: 'rg-dl',
    createdAt: daysAgo(2),
  },
];

/* -------------------------------- governance ------------------------------- */

export const dashboard: GovernanceDashboard = {
  completedCases: 1284,
  pendingSummaries: 7,
  redFlags: 2,
  followUpAlerts: 5,
  complaints: 3,
};

export const pendingSummaries: PendingSummary[] = [
  { consultationId: 'cs-1001', doctorId: 'dr-1', doctorName: 'Dr Ananya Rao', completedAt: hoursAgo(30), status: 'awaiting_documentation' },
  { consultationId: 'cs-0994', doctorId: 'dr-2', doctorName: 'Dr Vikram Sethi', completedAt: hoursAgo(76), status: 'awaiting_documentation' },
  { consultationId: 'cs-0981', doctorId: 'dr-6', doctorName: 'Dr Kabir Nair', completedAt: hoursAgo(122), status: 'awaiting_documentation' },
];

export const safetyAlerts: SafetyAlert[] = [
  {
    id: 'al-1',
    alertType: 'red_flag',
    consultationId: 'cs-1003',
    raisedAt: hoursAgo(3),
    summary: 'Check-in answer indicated thoughts of self-harm.',
  },
  {
    id: 'al-2',
    alertType: 'missed_checkin',
    consultationId: 'cs-1001',
    raisedAt: hoursAgo(20),
    acknowledgedAt: hoursAgo(18),
    summary: 'Three consecutive daily check-ins missed.',
  },
  {
    id: 'al-3',
    alertType: 'medication_side_effect',
    consultationId: 'cs-1003',
    raisedAt: hoursAgo(44),
    summary: 'Patient reported severe drowsiness after a dose change.',
  },
  {
    id: 'al-4',
    alertType: 'followup_due',
    consultationId: 'cs-0994',
    raisedAt: hoursAgo(60),
    acknowledgedAt: hoursAgo(58),
    closedAt: hoursAgo(50),
    summary: 'Two-week follow-up window reached.',
  },
];

export const clarificationCases: ClarificationCase[] = [
  {
    id: 'cl-1',
    specialtyName: 'Psychiatry',
    status: 'open',
    postedAt: daysAgo(2),
    question:
      'Adult patient, six weeks on an SSRI with partial response and persistent early-morning waking. Augment or switch?',
  },
  {
    id: 'cl-2',
    specialtyName: 'De-addiction',
    status: 'in_progress',
    postedAt: daysAgo(6),
    assignedExpertId: 'dr-1',
    assignedExpertName: 'Dr Ananya Rao',
    question: 'Outpatient withdrawal management where the patient declines inpatient admission.',
  },
];

export const experts: Expert[] = [
  { doctorId: 'dr-1', fullName: 'Dr Ananya Rao', specialtyName: 'Psychiatry' },
];

export const allocationDecisions: AllocationDecision[] = [
  {
    consultationId: 'cs-1001',
    doctorId: 'dr-1',
    doctorName: 'Dr Ananya Rao',
    decidedAt: daysAgo(3),
    basis: 'Language and region match, earliest coverable slot',
  },
  {
    consultationId: 'cs-1003',
    doctorId: 'dr-2',
    doctorName: 'Dr Vikram Sethi',
    decidedAt: daysAgo(2),
    overriddenByAdminId: 'ad-1',
    reason: 'Originally assigned provider was suspended mid-booking.',
  },
];

/* --------------------------------- payments -------------------------------- */

export const pendingPayouts: PendingPayout[] = [
  { consultationId: 'cs-1003', doctorId: 'dr-2', doctorName: 'Dr Vikram Sethi', amountInr: 1000, completedAt: daysAgo(2) },
  { consultationId: 'cs-0994', doctorId: 'dr-1', doctorName: 'Dr Ananya Rao', amountInr: 1200, completedAt: daysAgo(4) },
];

/* --------------------------------- support --------------------------------- */

export const complaints: Complaint[] = [
  {
    id: 'cp-1',
    category: 'technical_issue',
    status: 'open',
    subject: 'Video call would not connect',
    consultationId: 'cs-1003',
    raisedAt: daysAgo(1),
    messages: [
      {
        id: 'm-1',
        body: 'The call never connected and I was charged for the consultation.',
        authorType: 'patient',
        visibleToPatient: true,
        createdAt: daysAgo(1),
      },
    ],
  },
  {
    id: 'cp-2',
    category: 'doctor_conduct',
    status: 'in_progress',
    subject: 'Provider ended the consultation early',
    consultationId: 'cs-0994',
    raisedAt: daysAgo(5),
    assignedAdminId: 'ad-1',
    messages: [
      {
        id: 'm-2',
        body: 'The session ended after about eight minutes with no explanation.',
        authorType: 'patient',
        visibleToPatient: true,
        createdAt: daysAgo(5),
      },
      {
        id: 'm-3',
        body: 'Checked the video session record — the provider disconnected at 08:12 and did not rejoin.',
        authorType: 'admin',
        visibleToPatient: false,
        createdAt: daysAgo(4),
      },
      {
        id: 'm-4',
        body: 'Thank you for reporting this. We are reviewing the session and will come back to you within two working days.',
        authorType: 'admin',
        visibleToPatient: true,
        createdAt: daysAgo(4),
      },
    ],
  },
  {
    id: 'cp-3',
    category: 'payment_issue',
    status: 'resolved',
    subject: 'Charged twice for one booking',
    raisedAt: daysAgo(12),
    assignedAdminId: 'ad-1',
    messages: [],
  },
];

export const feedback: Feedback[] = [
  { id: 'fb-1', consultationId: 'cs-1003', rating: 5, comment: 'Felt genuinely listened to.', submittedAt: daysAgo(2) },
  { id: 'fb-2', consultationId: 'cs-0994', rating: 2, comment: 'Session felt rushed.', submittedAt: daysAgo(4) },
  { id: 'fb-3', consultationId: 'cs-0981', rating: 4, submittedAt: daysAgo(7) },
];

/* --------------------------------- content --------------------------------- */

export const contentItems: ContentItem[] = [
  { id: 'ci-1', slug: 'sleep-hygiene', title: 'Building a sleep routine', status: 'published', category: 'Self-help', updatedAt: daysAgo(30) },
  { id: 'ci-2', slug: 'panic-grounding', title: 'Grounding techniques for panic', status: 'in_review', category: 'Self-help', updatedAt: daysAgo(2) },
  { id: 'ci-3', title: 'Supporting a family member in recovery', status: 'draft', category: 'Caregiver guide', updatedAt: hoursAgo(5) },
  { id: 'ci-4', slug: 'ngo-directory', title: 'NGO and helpline directory', status: 'published', category: 'Directory', updatedAt: daysAgo(90) },
];

export const templates: NotificationTemplate[] = [
  { code: 'consultation_booked', channel: 'push', title: 'Your appointment is confirmed', body: 'Your appointment is confirmed for {{time}}.', isCustomised: false },
  { code: 'consultation_reminder', channel: 'push', title: 'Appointment reminder', body: 'Your appointment starts in 30 minutes.', isCustomised: false },
  { code: 'provider_assigned', channel: 'push', title: 'A provider has been assigned', body: 'A provider has been assigned to your appointment.', isCustomised: true },
  { code: 'checkin_due', channel: 'push', title: 'Daily check-in', body: 'Your daily check-in is ready.', isCustomised: false },
  { code: 'refund_issued', channel: 'push', title: 'Refund issued', body: 'A refund of {{amount}} has been issued to your original payment method.', isCustomised: false },
];

export const searchConfiguration: SearchConfigShape = {
  crisisKeywords: ['suicide', 'kill myself', 'end my life', 'self harm', 'overdose'],
  popularSearches: ['anxiety', 'cannot sleep', 'panic attacks', 'stress at work'],
  disclaimer:
    'This assistant helps you find the right kind of care. It does not diagnose, assess severity or provide treatment advice.',
};

export const pathways: Pathway[] = [
  { code: 'depression-followup', version: 3, publishedAt: daysAgo(40), questions: [], redFlagRules: [] },
  { code: 'depression-followup', version: 2, publishedAt: daysAgo(160), questions: [], redFlagRules: [] },
  { code: 'deaddiction-followup', version: 1, publishedAt: daysAgo(200), questions: [], redFlagRules: [] },
];

export const legalDocuments: Record<string, LegalDocument[]> = {
  teleconsultation_consent: [
    { documentType: 'teleconsultation_consent', version: '3.0', publishedAt: daysAgo(60), body: 'I consent to a teleconsultation…' },
    { documentType: 'teleconsultation_consent', version: '2.1', publishedAt: daysAgo(240), body: 'I consent to a teleconsultation…' },
  ],
  privacy_policy: [
    { documentType: 'privacy_policy', version: '2.0', publishedAt: daysAgo(90), body: 'This policy explains what we collect…' },
  ],
};

/* -------------------------------- platform --------------------------------- */

export const configValues: ConfigValue[] = [
  { key: 'payments.convenience_fee_pct', value: 8, description: 'Percentage added to the provider fee as the platform’s revenue.', editable: true, shape: 'number' },
  { key: 'payments.gst_pct', value: 18, description: 'GST rate applied to the convenience fee.', editable: true, shape: 'number' },
  { key: 'booking.slot_hold_minutes', value: 15, description: 'How long a pending payment holds the slot before it expires.', editable: true, shape: 'number' },
  { key: 'allocation.max_declines', value: 2, description: 'How many times a patient may decline an assigned provider.', editable: false, managedBy: 'allocation-policy', shape: 'number' },
  { key: 'search.crisis_keywords', value: ['…'], description: 'The crisis keyword list.', editable: false, managedBy: 'search-config', shape: 'string[]' },
  { key: 'notifications.booking_confirmed', value: 'Your appointment is confirmed…', description: 'Copy for the booking confirmation.', editable: false, managedBy: 'notification-templates', shape: 'string' },
];

export const auditEntries: AuditEntry[] = [
  { id: 'au-1', at: hoursAgo(1), actorType: 'admin', actorId: 'ad-000001', action: 'verify', entityType: 'doctor', entityId: 'dr-2' },
  { id: 'au-2', at: hoursAgo(3), actorType: 'admin', actorId: 'ad-000001', action: 'update', entityType: 'app_config', entityId: 'payments.convenience_fee_pct' },
  { id: 'au-3', at: hoursAgo(9), actorType: 'doctor', actorId: 'dr-1', action: 'create', entityType: 'clinical_record', entityId: 'cs-1003', consultationId: 'cs-1003' },
  { id: 'au-4', at: hoursAgo(26), actorType: 'system', action: 'webhook', entityType: 'payment', entityId: 'cs-1003' },
  { id: 'au-5', at: hoursAgo(30), actorType: 'patient', actorId: 'pt-77', action: 'login', entityType: 'patient', entityId: 'pt-77' },
  { id: 'au-6', at: daysAgo(2), actorType: 'admin', actorId: 'ad-000001', action: 'export', entityType: 'audit_log' },
];

export const deletionRequests: DeletionRequest[] = [
  { id: 'dr-req-1', patientId: 'pt-901234', status: 'requested', requestedAt: daysAgo(2) },
  { id: 'dr-req-2', patientId: 'pt-774455', status: 'approved', requestedAt: daysAgo(9), reviewedAt: daysAgo(7), reviewNote: 'Identity confirmed; no open consultation.' },
  { id: 'dr-req-3', patientId: 'pt-551200', status: 'executed', requestedAt: daysAgo(40), reviewedAt: daysAgo(38) },
  { id: 'dr-req-4', patientId: 'pt-330099', status: 'rejected', requestedAt: daysAgo(30), reviewedAt: daysAgo(28), reviewNote: 'An active complaint is still being investigated.' },
];

export const retention: RetentionInfo = {
  retentionDays: 2555,
  inScope: 148,
  description: 'Consultation records, clinical notes and uploaded files past the retention window.',
};

export const notifications: AdminNotification[] = [
  { id: 'nt-1', title: 'New red-flag alert', body: 'A check-in answer has raised a red flag.', createdAt: hoursAgo(3) },
  { id: 'nt-2', title: 'Credential queue', body: 'Two providers are waiting on document review.', createdAt: hoursAgo(20) },
  { id: 'nt-3', title: 'Payout run due', body: 'Two payouts are outstanding.', createdAt: daysAgo(2), readAt: daysAgo(1) },
];

/* --------------------------- derived / helpers ----------------------------- */

export const credentialQueue = (): CredentialQueueRow[] =>
  doctors
    .filter((d) => (documents[d.id] ?? []).some((doc) => doc.status === 'pending'))
    .map((d) => ({
      doctorId: d.id,
      fullName: d.fullName,
      specialtyName: d.specialtyName ?? null,
      verificationStatus: d.verificationStatus,
      pendingDocuments: (documents[d.id] ?? []).filter((doc) => doc.status === 'pending').length,
      submittedAt: (documents[d.id] ?? []).find((doc) => doc.status === 'pending')?.uploadedAt ?? null,
    }));

export const findDoctor = (id: string): Doctor | undefined => doctors.find((d) => d.id === id);

export const newId = nextId;
