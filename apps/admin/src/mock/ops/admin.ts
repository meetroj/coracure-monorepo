import { LEVELS, SECTIONS, canSee, type AdminLevel } from '../../nav';
import { createStore, daysAgo, hoursAgo } from '../../modules/kit/store';

/** Admin users, roles and the settings pages (requirements §86-§96). */

/* ---------------------------------- users ---------------------------------- */

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: AdminLevel;
  active: boolean;
  lastLogin: string | null;
};

export const adminUsers = createStore<AdminUser>([
  { id: 'au-1', name: 'Meet Rojivadiya', email: 'synquic@gmail.com', mobile: '+91 98200 11001', role: 'super_admin', active: true, lastLogin: hoursAgo(1) },
  { id: 'au-2', name: 'Nisha Rao', email: 'nisha.rao@coracure.example', mobile: '+91 98200 11002', role: 'operations', active: true, lastLogin: hoursAgo(5) },
  { id: 'au-3', name: 'Dr Alok Verma', email: 'alok.verma@coracure.example', mobile: '+91 98200 11003', role: 'clinical_governance', active: true, lastLogin: daysAgo(1) },
  { id: 'au-4', name: 'Farid Shaikh', email: 'farid.shaikh@coracure.example', mobile: '+91 98200 11004', role: 'finance', active: true, lastLogin: daysAgo(2) },
  { id: 'au-5', name: 'Pooja Nambiar', email: 'pooja.nambiar@coracure.example', mobile: '+91 98200 11005', role: 'care_coordinator', active: true, lastLogin: hoursAgo(9) },
  { id: 'au-6', name: 'Rahul Menon', email: 'rahul.menon@coracure.example', mobile: '+91 98200 11006', role: 'lab', active: true, lastLogin: daysAgo(3) },
  { id: 'au-7', name: 'Zoya Khan', email: 'zoya.khan@coracure.example', mobile: '+91 98200 11007', role: 'analytics', active: false, lastLogin: daysAgo(40) },
]);

/* ---------------------------------- roles ---------------------------------- */

/**
 * What each role may open (§88, §89). Seeded from `nav.ts` so the matrix starts
 * as the real gating; edits here are configuration state for the UI build.
 *
 * ponytail: the sidebar still gates on `nav.ts`. Wire this matrix into
 * `canSee` when the backend stores per-role permissions.
 */
export type RoleRow = { id: AdminLevel; permissions: string[] };

export const roles = createStore<RoleRow>(
  LEVELS.map((l) => ({
    id: l,
    permissions: SECTIONS.filter((s) => canSee(l, s)).map((s) => s.path),
  })),
);

/* -------------------------------- settings --------------------------------- */

export type SettingsDoc = { id: string; values: Record<string, string | boolean | string[]> };

/** One record per settings page, so a page saves and reloads as a unit. */
export const settingsDocs = createStore<SettingsDoc>([
  {
    id: 'business-rules',
    values: { cancellationWindowHours: '24', maxRescheduleCount: '2', slotHoldMinutes: '15', followUpWindowDays: '14', allowInstantConsultation: true },
  },
  {
    id: 'provider-fees',
    values: { commissionPercent: '20', patientPlatformFeeInr: '49', minConsultationFeeInr: '300', maxConsultationFeeInr: '5000', payoutCycleDays: '7' },
  },
  {
    id: 'service-availability',
    values: { consultations: true, labServices: true, veterinary: true, paramedical: true, homeCollection: true },
  },
  {
    id: 'notification-config',
    values: { push: true, sms: true, email: true, inApp: true, reminderLeadMinutes: '60', quietHoursStart: '22:00', quietHoursEnd: '07:00' },
  },
  {
    id: 'app-languages',
    values: { languages: ['English', 'Hindi', 'Marathi', 'Tamil'], defaultLanguage: 'English' },
  },
  {
    id: 'app-features',
    values: { instantBooking: true, labBooking: true, careHub: true, familyProfiles: false, chatWithProvider: true },
  },
  {
    id: 'app-content',
    values: { homeBannerTitle: 'Care that comes to you', homeBannerBody: 'Talk to a verified professional in minutes.', supportHours: '9 am to 9 pm, every day' },
  },
  {
    id: 'app-labels',
    values: { bookCta: 'Book a consultation', labCta: 'Book a lab test', providerLabel: 'Consulting Professional' },
  },
  {
    id: 'app-general',
    values: { minAppVersionAndroid: '1.4.0', minAppVersionIos: '1.4.0', maintenanceMode: false, maintenanceMessage: 'We are updating CoraCure. Back shortly.' },
  },
  {
    id: 'website-content',
    values: { heroTitle: 'Trusted care, wherever you are', heroSubtitle: 'Doctors, specialists and lab tests from one place.', aboutText: 'CoraCure connects patients with verified healthcare professionals.' },
  },
  {
    id: 'website-contact',
    values: { supportEmail: 'support@coracure.example', supportPhone: '+91 22 4000 0000', address: 'CoraCure Health Pvt Ltd, Mumbai, India', hours: 'Mon to Sat, 9 am to 7 pm' },
  },
  {
    id: 'website-services',
    values: { consultationsBlurb: 'Video and audio consultations with verified professionals.', labBlurb: 'Home sample collection and reports in the app.', petBlurb: 'Care for companion animals from veterinary specialists.' },
  },
  {
    id: 'website-links',
    values: { playStore: 'https://play.google.com/store/apps/details?id=com.coracure.patient', appStore: 'https://apps.apple.com/app/coracure', providerSignUp: 'https://coracure.example/providers', twitter: '', instagram: '' },
  },
  {
    id: 'legal',
    values: {
      termsVersion: 'v2.1', termsUpdated: '2026-08-14',
      privacyVersion: 'v1.4', privacyUpdated: '2026-07-02',
      refundVersion: 'v1.2', refundUpdated: '2026-08-01',
      contactVersion: 'v1.0', contactUpdated: '2026-06-10',
    },
  },
]);

export const settingsDoc = (docs: SettingsDoc[], id: string): SettingsDoc['values'] =>
  docs.find((d) => d.id === id)?.values ?? {};
