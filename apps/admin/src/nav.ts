/**
 * The panel's information architecture, and the only copy of the
 * permission-level map.
 *
 * *** THE SERVER IS THE AUTHORITY. *** `assertPermission` in the backend
 * (`src/common/auth.ts`) is what actually decides, and `super_admin` passes
 * everything there unconditionally. This table exists so the sidebar can hide
 * what a level cannot use - it is a UX affordance, not a security boundary.
 * Every screen must still treat `INSUFFICIENT_PERMISSION` as the real answer.
 *
 * Levels come straight from `AdminPermissionLevel` in the backend's
 * `prisma/schema.prisma`. Sections and their gates are transcribed from
 * `docs/ADMIN_PANEL_USER_FLOW.md` §2, which was read out of the controllers.
 */

import type { IconName } from './ui/Icon';

export const LEVELS = [
  'super_admin',
  'operations',
  'clinical_governance',
  'care_coordinator',
  'finance',
  'content',
] as const;

export type AdminLevel = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<AdminLevel, string> = {
  super_admin: 'Super admin',
  operations: 'Operations',
  clinical_governance: 'Clinical governance',
  care_coordinator: 'Care coordinator',
  finance: 'Finance',
  content: 'Content',
};

export type Section = {
  /** URL segment under `/`. */
  path: string;
  /** Sidebar glyph, from the one icon set. */
  icon: IconName;
  label: string;
  group: 'Overview' | 'People' | 'Care' | 'Money' | 'Content' | 'Support' | 'System';
  /**
   * Levels that reach this section. `super_admin` is never listed - it passes
   * everything, the same way the backend's `assertPermission` does.
   */
  levels: readonly AdminLevel[];
  /** What this section is for, shown on the placeholder until it is built. */
  blurb: string;
  /** The endpoints it consumes, so the placeholder is a worklist not a stub. */
  endpoints: readonly string[];
  /** Flow-doc section, for the "read the spec" link. */
  spec: string;
};

export const SECTIONS: readonly Section[] = [
  {
    path: 'dashboard',
    icon: 'dashboard',
    label: 'Dashboard',
    group: 'Overview',
    levels: ['operations', 'clinical_governance', 'care_coordinator'],
    blurb:
      'The quality dashboard (FR-18.6). Every tile links into the queue behind it.',
    endpoints: ['GET /admin/governance/dashboard'],
    spec: '§8.1'
  },
  {
    path: 'providers',
    icon: 'providers',
    label: 'Doctors',
    group: 'People',
    levels: ['operations', 'clinical_governance', 'care_coordinator'],
    blurb:
      'Create the account, edit the profile and commercials, set region pools, suspend. Creating is operations; verifying is not.',
    endpoints: [
      'GET /admin/doctors?verificationStatus=&isListed=&search=',
      'POST /admin/doctors',
      'GET|PATCH /admin/doctors/:doctorId',
      'PATCH /admin/doctors/:doctorId/listing',
      'GET|PATCH /admin/doctors/:doctorId/regions',
      'PATCH /admin/doctors/:doctorId/seniority',
      'POST /admin/doctors/:doctorId/suspend',
      'POST /admin/doctors/:doctorId/reinstate',
      'GET /admin/doctors/:doctorId/reliability',
    ],
    spec: '§5'
  },
  {
    path: 'credentials',
    icon: 'credentials',
    label: 'Document verification',
    group: 'People',
    levels: ['operations', 'clinical_governance'],
    blurb:
      'Review each document, then verify or reject the provider. Verify is clinical_governance only.',
    endpoints: [
      'GET /admin/doctors/credential-queue',
      'GET /admin/doctors/:doctorId/credentials',
      'POST /admin/doctors/credentials/:documentId/review',
      'POST /admin/doctors/:doctorId/verify | /reject | /reopen',
    ],
    spec: '§5.2–5.3'
  },
  {
    path: 'patients',
    icon: 'users',
    label: 'Patients',
    group: 'People',
    levels: ['operations', 'clinical_governance', 'care_coordinator'],
    blurb:
      'Find a patient, see their consultations, follow-up plans, reports and any complaints in one place.',
    endpoints: ['GET /admin/patients', 'GET /admin/patients/:patientId'],
    spec: '§7'
  },
  {
    path: 'consultations',
    icon: 'consultations',
    label: 'Consultations',
    group: 'Care',
    levels: ['operations', 'care_coordinator', 'clinical_governance'],
    blurb:
      'BLOCKED by gap A-2 - there is no admin list endpoint, only fetch-by-id. Reach consultations from the queues until it lands.',
    endpoints: [
      'GET /admin/consultations/:consultationId',
      'POST /admin/consultations/:consultationId/override-provider',
      'POST /admin/consultations/:consultationId/cancel',
      'GET /admin/instant/consultations/:consultationId/offers',
      'GET /admin/consultations/:consultationId/video/session',
      'GET /admin/consultations/:consultationId/care-record',
    ],
    spec: '§7'
  },
  {
    path: 'safety-alerts',
    icon: 'alert',
    label: 'Safety alerts',
    group: 'Care',
    levels: ['care_coordinator', 'clinical_governance', 'operations'],
    blurb:
      'Acknowledge takes responsibility; close records what was done. Two steps, never one button.',
    endpoints: [
      'GET /admin/safety-alerts',
      'POST /admin/safety-alerts/:alertId/acknowledge',
      'POST /admin/safety-alerts/:alertId/close',
    ],
    spec: '§8.3'
  },
  {
    path: 'case-summaries',
    icon: 'clipboard',
    label: 'Case summaries',
    group: 'Care',
    levels: ['operations', 'clinical_governance', 'care_coordinator'],
    blurb: 'Every case summary, written automatically after each consultation. Filter by status and open the consultation behind it.',
    endpoints: ['GET /admin/governance/pending-case-summaries'],
    spec: '§8.2'
  },
  {
    path: 'case-review',
    icon: 'clarify',
    label: 'Clarification & allocation',
    group: 'Care',
    levels: ['clinical_governance', 'operations'],
    blurb:
      'Expert clarification cases and the allocation decisions behind each assignment, in one place.',
    endpoints: [
      'GET /admin/clarification-cases',
      'POST /admin/clarification-cases/:caseId/assign',
      'GET /admin/governance/allocation-decisions',
    ],
    spec: '§8.4–8.5'
  },
  {
    path: 'availability',
    icon: 'calendar',
    label: 'Doctor availability',
    group: 'Care',
    levels: ['operations', 'care_coordinator', 'clinical_governance'],
    blurb:
      "Edit a provider's diary on their behalf, and answer who is assignable for a service, language, region and time.",
    endpoints: [
      'GET /admin/doctors/:doctorId/availability',
      'PUT /admin/doctors/:doctorId/availability/weekly  (REPLACES the pattern)',
      'POST /admin/doctors/:doctorId/availability/blocked | /custom-hours',
      'DELETE /admin/doctors/:doctorId/availability/:ruleId',
      'GET /admin/doctors/:doctorId/slots',
      'GET /admin/availability/remaining',
    ],
    spec: '§6'
  },
  {
    path: 'payments',
    icon: 'payments',
    label: 'Payments & payouts',
    group: 'Money',
    levels: ['finance', 'operations'],
    blurb:
      'Never recompute a total - the bill is frozen at checkout. Payouts are RECORDED, not paid.',
    endpoints: [
      'GET /admin/payments/payouts/pending',
      'POST /admin/payments/:consultationId/refund   (finance + operations)',
      'POST /admin/payments/:consultationId/payout',
      'GET /admin/payments/export?kind=transactions|refunds',
    ],
    spec: '§9'
  },
  {
    path: 'catalogue',
    icon: 'catalogue',
    label: 'Catalogue',
    group: 'Content',
    levels: ['content', 'operations', 'clinical_governance'],
    blurb:
      'Specialties, concerns, regions, allocation policy. A specialty decides prescribing eligibility.',
    endpoints: [
      'GET|POST /admin/specialties · PATCH /admin/specialties/:id',
      'GET|POST /admin/concerns · PATCH /admin/concerns/:id',
      'GET|POST /admin/regions · PATCH /admin/regions/:id',
      'GET /admin/allocation-policy · PATCH (operations only)',
    ],
    spec: '§10.1'
  },
  {
    path: 'care-hub',
    icon: 'content',
    label: 'Care Hub',
    group: 'Content',
    levels: ['content', 'clinical_governance'],
    blurb:
      'draft → submit → in review → publish. Publish is clinical_governance ONLY.',
    endpoints: [
      'GET|POST /admin/care-hub/items',
      'GET|PATCH /admin/care-hub/items/:id',
      'POST /admin/care-hub/items/:id/submit | /publish | /archive',
    ],
    spec: '§10.2'
  },
  {
    path: 'notifications',
    icon: 'bell',
    label: 'Notifications',
    group: 'Content',
    levels: ['content', 'clinical_governance'],
    blurb:
      'Notification wording, a manual send to doctors or patients, and what was sent.',
    endpoints: [
      'GET /admin/notification-templates',
      'GET|PATCH /admin/notification-templates/:code',
      'POST /admin/notification-templates/:code/reset',
    ],
    spec: '§10.3'
  },
  {
    path: 'pathways',
    icon: 'pathway',
    label: 'Follow-up pathways',
    group: 'Content',
    levels: ['clinical_governance', 'content', 'operations'],
    blurb:
      'POST publishes a NEW version and never edits the live one. No in-place edit form.',
    endpoints: [
      'GET /admin/followup-pathways',
      'POST /admin/followup-pathways/:code',
    ],
    spec: '§10.5'
  },
  {
    path: 'complaints',
    icon: 'note',
    label: 'Complaints & feedback',
    group: 'Support',
    levels: ['operations', 'clinical_governance'],
    blurb:
      'A reply is either to the patient or to the file. That toggle must be unmissable.',
    endpoints: [
      'GET /admin/feedback',
      'GET /admin/complaints',
      'GET /admin/complaints/:complaintId',
      'POST /admin/complaints/:complaintId/assign | /reply | /close',
    ],
    spec: '§11'
  },
  {
    path: 'settings',
    icon: 'settings',
    label: 'Settings',
    group: 'System',
    levels: ['operations', 'clinical_governance', 'care_coordinator', 'finance', 'content'],
    blurb:
      'Platform values, plus legal documents, the audit log, deletion requests, retention and admin accounts as tabs.',
    endpoints: ['GET /admin/config', 'PUT /admin/config/:key'],
    spec: '§10.7'
  },
];

/**
 * The tabs inside Settings (`/settings/:tab`). They were sidebar sections of
 * their own; each keeps its own permission levels, so an admin sees only the
 * tabs their level may use, exactly as the sidebar used to hide them.
 */
export type SettingsTab = Omit<Section, 'group'>;

export const SETTINGS_TABS: readonly SettingsTab[] = [
  {
    path: 'general',
    icon: 'settings',
    label: 'General',
    levels: ['operations', 'clinical_governance', 'care_coordinator', 'finance', 'content'],
    blurb:
      'Values the platform reads at runtime, rendered from the response - `editable` and `managedBy` decide the form, not a local list.',
    endpoints: ['GET /admin/config', 'PUT /admin/config/:key'],
    spec: '§10.7'
  },
  {
    path: 'legal',
    icon: 'legal',
    label: 'Legal documents',
    levels: ['content', 'clinical_governance', 'operations'],
    blurb:
      'Publishing a new consent version re-prompts every patient. The most disruptive button in the panel.',
    endpoints: [
      'POST /admin/legal/documents',
      'GET /admin/legal/documents/:documentType/versions',
    ],
    spec: '§10.6'
  },
  {
    path: 'audit',
    icon: 'audit',
    label: 'Audit log',
    levels: ['operations', 'clinical_governance', 'care_coordinator', 'finance', 'content'],
    blurb:
      'Rows are filtered to what your level may read - say so. Searching the log is itself audited.',
    endpoints: [
      'GET /admin/compliance/audit',
      'GET /admin/compliance/audit/export',
      'GET /admin/compliance/audit/consultation/:consultationId',
    ],
    spec: '§12.1'
  },
  {
    path: 'deletion-requests',
    icon: 'trash',
    label: 'Deletion requests',
    levels: ['operations'],
    blurb:
      'Operations reviews. super_admin alone executes - a separate queue, never the same screen.',
    endpoints: [
      'GET /admin/deletion-requests',
      'POST /admin/deletion-requests/:id/review',
      'POST /admin/compliance/deletion-requests/:requestId/execute   (super_admin)',
    ],
    spec: '§12.2'
  },
  {
    path: 'retention',
    icon: 'shieldCheck',
    label: 'Retention & data rights',
    levels: [],
    blurb:
      'super_admin only. `retention/apply` is destructive - typed confirmation, and show the window first.',
    endpoints: [
      'GET /admin/compliance/retention',
      'POST /admin/compliance/retention/apply',
      'GET /admin/compliance/patients/:patientId/data-export',
    ],
    spec: '§12.3'
  },
  {
    path: 'admin-accounts',
    icon: 'users',
    label: 'Admin accounts',
    levels: [],
    blurb:
      'BLOCKED by gap A-4 - only POST exists. No list, no edit, no 2FA toggle, so a super admin cannot see the other admins.',
    endpoints: ['POST /auth/admin/accounts'],
    spec: '§3'
  },
];

export const GROUPS = ['Overview', 'People', 'Care', 'Money', 'Content', 'Support', 'System'] as const;

/** `super_admin` passes everything, exactly as the backend does. */
export const canSee = (level: AdminLevel, section: Pick<Section, 'levels'>): boolean =>
  level === 'super_admin' || section.levels.includes(level);

export const sectionsFor = (level: AdminLevel): Section[] =>
  SECTIONS.filter((s) => canSee(level, s));

/** Where a level lands after sign-in - its first visible section. */
export const landingFor = (level: AdminLevel): string =>
  sectionsFor(level)[0]?.path ?? 'no-access';

/** The Settings tabs this level may open, in order. */
export const settingsTabsFor = (level: AdminLevel): SettingsTab[] =>
  SETTINGS_TABS.filter((t) => canSee(level, t));
