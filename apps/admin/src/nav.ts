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
 * The first six levels come straight from `AdminPermissionLevel` in the
 * backend's `prisma/schema.prisma`. `lab` and `analytics` are UI-build levels
 * for the Lab Admin and Analytics User roles in
 * `docs/ADMIN_PANEL_REQUIREMENTS.md` §88; the backend enum needs the same two
 * values before this goes live. Sections follow the §98 sidebar of that file.
 */

import type { IconName } from './ui/Icon';

export const LEVELS = [
  'super_admin',
  'operations',
  'clinical_governance',
  'care_coordinator',
  'finance',
  'content',
  'lab',
  'analytics',
] as const;

export type AdminLevel = (typeof LEVELS)[number];

/** Spec role names (§88) for the levels the backend already has. */
export const LEVEL_LABEL: Record<AdminLevel, string> = {
  super_admin: 'Super Admin',
  operations: 'Operations Admin',
  clinical_governance: 'Verification Admin',
  care_coordinator: 'Support Admin',
  finance: 'Finance Admin',
  content: 'Content Admin',
  lab: 'Lab Admin',
  analytics: 'Analytics User',
};

/**
 * *** THE SEVEN ROLES OF REQUIREMENTS §88, IN THE SPEC'S ORDER. ***
 *
 * Super Admin, Operations Admin, Verification Admin, Finance Admin, Support Admin, Lab Admin,
 * Analytics User. These are the only roles the panel OFFERS: the Users role picker, its role filter
 * and the Roles & Permissions table. `content` (Content Admin) is a backend level the spec does not
 * list; an admin who already holds it keeps working and is still labelled, but it is not a role
 * anyone can be given from here.
 */
export const SPEC_ROLES: readonly AdminLevel[] = [
  'super_admin',
  'operations',
  'clinical_governance',
  'finance',
  'care_coordinator',
  'lab',
  'analytics',
];

/** The eight sidebar groups of §2, in order. */
export const GROUPS = [
  'Dashboard',
  'Healthcare Providers',
  'Patients',
  'Services',
  'Analytics',
  'Finances',
  'Support',
  'Admin',
] as const;
export type Group = (typeof GROUPS)[number];

/** Services is split in two (§98). */
export type SubGroup = 'Consultations' | 'Lab Services';
export const SUB_GROUPS: readonly SubGroup[] = ['Consultations', 'Lab Services'];

export type Section = {
  /** URL segment under `/`. */
  path: string;
  /** Sidebar glyph, from the one icon set. */
  icon: IconName;
  label: string;
  group: Group;
  /** Only Services has these. */
  sub?: SubGroup;
  /**
   * Levels that reach this section. `super_admin` is never listed - it passes
   * everything, the same way the backend's `assertPermission` does.
   */
  levels: readonly AdminLevel[];
  /** What this section is for, shown on the placeholder until it is built. */
  blurb: string;
  /** The endpoints it consumes, so the placeholder is a worklist not a stub. */
  endpoints: readonly string[];
  /** Section of `docs/ADMIN_PANEL_REQUIREMENTS.md` that specifies it. */
  spec: string;
};

const STAFF: readonly AdminLevel[] = ['operations', 'clinical_governance', 'care_coordinator'];
const LAB: readonly AdminLevel[] = ['lab', 'operations'];
const ANALYTICS: readonly AdminLevel[] = ['analytics', 'operations', 'clinical_governance'];
const MONEY: readonly AdminLevel[] = ['finance', 'operations'];
const SUPPORT: readonly AdminLevel[] = ['care_coordinator', 'operations', 'clinical_governance'];

const sec = (
  path: string,
  icon: IconName,
  label: string,
  group: Group,
  levels: readonly AdminLevel[],
  spec: string,
  blurb: string,
  sub?: SubGroup,
): Section => ({ path, icon, label, group, sub, levels, blurb, endpoints: [], spec });

/**
 * Lab Services is built but switched off for now (hidden from the sidebar, the
 * dashboard, analytics and Master Data, and its routes are not registered).
 * Set this to `true` to bring all of it back; nothing else needs to change.
 */
export const LAB_SERVICES_ENABLED = false;

const ALL_SECTIONS: readonly Section[] = [
  sec('dashboard', 'dashboard', 'Dashboard', 'Dashboard', LEVELS.filter((l) => l !== 'super_admin'), '§3',
    'Providers, patients, consultations, lab, finances and support at a glance. Every card opens the queue behind it.'),

  sec('providers', 'providers', 'Doctors', 'Healthcare Providers', STAFF, '§5',
    'Every doctor, with specialty, registration, fee, verification, account status and rating.'),
  sec('specialists', 'providers', 'Specialists', 'Healthcare Providers', STAFF, '§6',
    'Doctors in a medical specialty. The specialty list comes from Master Data, not from code.'),
  sec('super-specialists', 'providers', 'Super-specialists', 'Healthcare Providers', STAFF, '§7',
    'Doctors in a super-specialty. The list is configurable in Master Data.'),
  sec('paramedical', 'providers', 'Paramedical Professionals', 'Healthcare Providers', STAFF, '§8',
    'Dietitians, physiotherapists, psychologists, therapists and other approved professionals.'),
  sec('veterinary', 'providers', 'Veterinary Specialists', 'Healthcare Providers', STAFF, '§9',
    'Veterinary professionals, a separate provider category with its own specialties.'),
  sec('verification', 'credentials', 'Verification', 'Healthcare Providers', ['operations', 'clinical_governance'], '§20, §21',
    'Review identity, qualifications, registration, experience and signature, then approve, request changes, reject or suspend.'),
  sec('availability', 'calendar', 'Doctor availability', 'Healthcare Providers', STAFF, '§18',
    "Edit a provider's diary on their behalf, and answer who is assignable for a service, language, region and time."),

  sec('patients', 'users', 'Patients', 'Patients', STAFF, '§22',
    'Find a patient: overview, address, consultations, prescriptions and care plans, reports, follow-ups, payments and support.'),

  sec('appointments', 'consultations', 'Appointments', 'Services', STAFF, '§33',
    'Every appointment request and its status, from requested to completed.', 'Consultations'),
  sec('case-records', 'clipboard', 'Case Records', 'Services', STAFF, '§34',
    'The complete record of each consultation: overview, documentation, prescription or care plan, summary and documents.', 'Consultations'),
  sec('clarifications', 'clarify', 'Clarifications', 'Services', ['clinical_governance', 'operations'], '§48',
    'Clarification threads and the experts they are assigned to.', 'Consultations'),
  sec('follow-ups', 'pathway', 'Follow-ups', 'Services', STAFF, '§49',
    'The dedicated follow-up workflow: patient response, provider review and recommendation.', 'Consultations'),
  sec('safety-alerts', 'alert', 'Safety alerts', 'Services', STAFF, '§8.3',
    'Acknowledge takes responsibility; close records what was done. Two steps, never one button.', 'Consultations'),

  sec('lab-orders', 'lab', 'Lab Orders', 'Services', LAB, '§51', 'Every lab order, its collection and its report.', 'Lab Services'),
  sec('lab-partners', 'lab', 'Lab Partners', 'Services', LAB, '§58', 'Add, edit, activate and deactivate partners and the PIN codes they serve.', 'Lab Services'),
  sec('lab-tests', 'lab', 'Individual Lab Tests', 'Services', LAB, '§60', 'The CoraCure test master, with aliases, prices and partner mapping.', 'Lab Services'),
  sec('lab-packages', 'lab', 'Lab Test Packages', 'Services', LAB, '§62', 'Predefined test batteries, each offered by one partner at a set price.', 'Lab Services'),
  sec('lab-allocation', 'settings', 'Allocation Settings', 'Services', LAB, '§57', 'PIN code and first acceptance: eligibility and acceptance rules.', 'Lab Services'),
  sec('lab-reports', 'note', 'Reports', 'Services', LAB, '§68', 'Lab reports by status. Files are only reachable from authenticated CoraCure systems.', 'Lab Services'),

  sec('analytics', 'chart', 'Overview', 'Analytics', ANALYTICS, '§72', 'Patients, providers, consultations, lab services and financial activity.'),
  sec('analytics-consultations', 'chart', 'Consultation Analytics', 'Analytics', ANALYTICS, '§73', 'Volume, acceptance, repeat, follow-up completion and duration.'),
  sec('analytics-providers', 'chart', 'Provider Analytics', 'Analytics', ANALYTICS, '§74', 'Offered, accepted, completed, response time, ratings and complaints.'),
  sec('analytics-patients', 'chart', 'Patient Analytics', 'Analytics', ANALYTICS, '§75', 'Registrations, age, gender, location and specialty utilisation.'),
  sec('analytics-lab', 'chart', 'Lab Analytics', 'Analytics', ['analytics', 'lab', 'operations'], '§76', 'Orders, tests, packages, partners, location, collection and reports.'),
  sec('analytics-financial', 'chart', 'Financial Analytics', 'Analytics', ['analytics', 'finance', 'operations'], '§77', 'Gross value, commission, fees, payouts, refunds and revenue trend.'),

  sec('patient-payments', 'payments', 'Patient Payments', 'Finances', MONEY, '§79', 'Consultation and lab payments, status and transaction reference.'),
  sec('provider-payouts', 'payments', 'Provider Payouts', 'Finances', MONEY, '§80',
    'Never recompute a total - the bill is frozen at checkout. Payouts are RECORDED, not paid.'),
  sec('refunds', 'payments', 'Refunds', 'Finances', MONEY, '§81', 'Consultation and lab refunds in one list.'),

  sec('support-tickets', 'note', 'Support Tickets', 'Support', SUPPORT, '§83', 'Tickets by status, category and priority, plus patient complaints.'),
  sec('feedback', 'note', 'Feedback', 'Support', SUPPORT, '§84', 'Patient, provider, lab-service and app feedback.'),
  sec('notifications', 'bell', 'Notifications', 'Support', ['content', 'clinical_governance', 'operations', 'care_coordinator'], '§85',
    'Notification wording, a manual send to doctors or patients, and what was sent.'),

  sec('users', 'users', 'Users', 'Admin', [], '§87', 'Admin users, their role and status. Super Admin only.'),
  sec('roles', 'shieldCheck', 'Roles & Permissions', 'Admin', [], '§88', 'Seven roles and what each may open. Super Admin only.'),
  sec('master-data', 'catalogue', 'Master Data', 'Admin', ['operations', 'content', 'clinical_governance', 'lab'], '§90',
    'Specialties, lab master data and the other lists the platform reads.'),
  sec('admin-settings', 'settings', 'Admin Settings', 'Admin', ['operations', 'clinical_governance', 'care_coordinator', 'finance', 'content'], '§93',
    'Platform rules and fee values, plus the audit log, deletion requests and retention.'),
  sec('app-settings', 'content', 'App Settings', 'Admin', ['content', 'operations', 'clinical_governance'], '§94',
    'App languages, feature controls, content, labels, the Care Hub and follow-up pathways.'),
  sec('website-settings', 'globe', 'Website Settings', 'Admin', ['content', 'operations'], '§95',
    'Public website content, contact information, links and the legal documents.'),
];

const isLab = (s: Section) => s.sub === 'Lab Services' || s.path === 'analytics-lab';

export const SECTIONS: readonly Section[] = ALL_SECTIONS.filter((s) => LAB_SERVICES_ENABLED || !isLab(s));

/**
 * The tabs inside Admin Settings (`/admin-settings/:tab`). Each keeps its own
 * permission levels, so an admin sees only the tabs their level may use.
 */
export type SettingsTab = Omit<Section, 'group' | 'sub'>;

const tab = (
  path: string,
  icon: IconName,
  label: string,
  levels: readonly AdminLevel[],
  spec: string,
  blurb: string,
): SettingsTab => ({ path, icon, label, levels, blurb, endpoints: [], spec });

export const SETTINGS_TABS: readonly SettingsTab[] = [
  tab('general', 'settings', 'General', ['operations', 'clinical_governance', 'care_coordinator', 'finance', 'content'], '§93',
    'Values the platform reads at runtime, rendered from the response - `editable` and `managedBy` decide the form, not a local list.'),
  tab('audit', 'audit', 'Audit log', ['operations', 'clinical_governance', 'care_coordinator', 'finance', 'content'], '§12.1',
    'Rows are filtered to what your level may read - say so. Searching the log is itself audited.'),
  tab('deletion-requests', 'trash', 'Deletion requests', ['operations'], '§12.2',
    'Operations reviews. super_admin alone executes - a separate queue, never the same screen.'),
  tab('retention', 'shieldCheck', 'Retention & data rights', [], '§12.3',
    'super_admin only. `retention/apply` is destructive - typed confirmation, and show the window first.'),
];

/** `super_admin` passes everything, exactly as the backend does. */
export const canSee = (level: AdminLevel, section: Pick<Section, 'levels'>): boolean =>
  level === 'super_admin' || section.levels.includes(level);

export const sectionsFor = (level: AdminLevel): Section[] =>
  SECTIONS.filter((s) => canSee(level, s));

/** Where a level lands after sign-in - its first visible section. */
export const landingFor = (level: AdminLevel): string =>
  sectionsFor(level)[0]?.path ?? 'no-access';

/** The Admin Settings tabs this level may open, in order. */
export const settingsTabsFor = (level: AdminLevel): SettingsTab[] =>
  SETTINGS_TABS.filter((t) => canSee(level, t));
