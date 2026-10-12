import { LIVE } from '../../api/live';
import type { AdminLevel } from '../../nav';
import { BackendSettings } from '../kit/BackendSettings';
import { AuditLog } from '../compliance/AuditLog';
import { DeletionRequests } from '../compliance/DeletionRequests';
import { Retention } from '../compliance/Retention';
import { CareHub } from '../content/CareHub';
import { LegalDocuments } from '../content/LegalDocuments';
import { Pathways } from '../content/Pathways';
import { SettingsForm, type SettingGroup } from '../kit/SettingsForm';
import { TabHub } from '../kit/TabHub';
import { Settings } from '../Settings';
import { may } from '../../ui';

/**
 * Admin Settings, App Settings and Website Settings (requirements §93-§96).
 * Each is a hub of tabs; the value pages are one shared `SettingsForm`, and the
 * pre-existing screens (platform config, audit log, Care Hub, pathways, legal
 * documents) live in the tab that matches them.
 */

/* ------------------------------- admin settings ----------------------------- */

const ADMIN_GROUPS: SettingGroup[] = [
  {
    id: 'business-rules',
    title: 'Platform business rules',
    description: 'Rules the platform applies to every booking.',
    fields: [
      { key: 'cancellationWindowHours', label: 'Free cancellation window (hours)', type: 'number' },
      { key: 'maxRescheduleCount', label: 'Reschedules allowed per appointment', type: 'number' },
      { key: 'slotHoldMinutes', label: 'Slot hold while payment is pending (minutes)', type: 'number', hint: 'A pending payment is the slot hold, and it expires.' },
      { key: 'followUpWindowDays', label: 'Follow-up window (days)', type: 'number' },
      { key: 'allowInstantConsultation', label: 'Allow instant consultations', type: 'bool' },
    ],
  },
  {
    id: 'provider-fees',
    title: 'Provider fee rules',
    description: 'Commission and the fee range a provider may set.',
    fields: [
      { key: 'commissionPercent', label: 'Platform commission (%)', type: 'number' },
      { key: 'patientPlatformFeeInr', label: 'Patient platform fee (₹)', type: 'number' },
      { key: 'minConsultationFeeInr', label: 'Minimum consultation fee (₹)', type: 'number' },
      { key: 'maxConsultationFeeInr', label: 'Maximum consultation fee (₹)', type: 'number' },
      { key: 'payoutCycleDays', label: 'Payout cycle (days)', type: 'number' },
    ],
  },
  {
    id: 'service-availability',
    title: 'Service availability',
    description: 'Switch a whole service off, for example during maintenance.',
    fields: [
      { key: 'consultations', label: 'Consultations', type: 'bool' },
      { key: 'labServices', label: 'Lab services', type: 'bool' },
      { key: 'homeCollection', label: 'Home sample collection', type: 'bool' },
      { key: 'paramedical', label: 'Paramedical professionals', type: 'bool' },
      { key: 'veterinary', label: 'Veterinary specialists', type: 'bool' },
    ],
  },
  {
    id: 'notification-config',
    title: 'Notification configuration',
    description: 'Channels and timing. The wording of each notification is under Support, Notifications.',
    fields: [
      { key: 'push', label: 'Push notifications', type: 'bool' },
      { key: 'sms', label: 'SMS', type: 'bool' },
      { key: 'email', label: 'Email', type: 'bool' },
      { key: 'inApp', label: 'In-app notifications', type: 'bool' },
      { key: 'reminderLeadMinutes', label: 'Appointment reminder lead time (minutes)', type: 'number' },
      { key: 'quietHoursStart', label: 'Quiet hours start', type: 'time' },
      { key: 'quietHoursEnd', label: 'Quiet hours end', type: 'time' },
    ],
  },
];

const AdminRules = ({ level }: { level: AdminLevel }) =>
  LIVE ? (
    <BackendSettings groups={['business_rules', 'service_availability']} />
  ) : (
    <SettingsForm groups={ADMIN_GROUPS} canEdit={may(level, ['operations', 'finance'])} />
  );

export function AdminSettings({ level }: { level: AdminLevel }) {
  return (
    <TabHub
      title="Admin Settings"
      level={level}
      tabs={[
        { id: 'rules', label: 'Business rules', Component: AdminRules, levels: ['operations', 'finance', 'clinical_governance'], live: true },
        { id: 'general', label: 'General', Component: Settings, levels: ['operations', 'clinical_governance', 'care_coordinator', 'finance', 'content'], live: true },
        { id: 'audit', label: 'Audit log', Component: AuditLog, levels: ['operations', 'clinical_governance', 'care_coordinator', 'finance', 'content'], live: true },
        { id: 'deletion-requests', label: 'Deletion requests', Component: DeletionRequests, levels: ['operations'], live: true },
        { id: 'retention', label: 'Retention & data rights', Component: Retention, levels: [], live: true },
      ]}
    />
  );
}

/* -------------------------------- app settings ------------------------------ */

const APP_GROUPS: SettingGroup[] = [
  {
    id: 'app-languages',
    title: 'Available application languages',
    fields: [
      { key: 'languages', label: 'Languages offered in the apps', type: 'tags' },
      { key: 'defaultLanguage', label: 'Default language', type: 'text' },
    ],
  },
  {
    id: 'app-features',
    title: 'App feature controls',
    fields: [
      { key: 'instantBooking', label: 'Instant booking', type: 'bool' },
      { key: 'labBooking', label: 'Lab test booking', type: 'bool' },
      { key: 'careHub', label: 'Care Hub', type: 'bool' },
      { key: 'chatWithProvider', label: 'Chat with provider', type: 'bool' },
      { key: 'familyProfiles', label: 'Family profiles', type: 'bool' },
    ],
  },
  {
    id: 'app-content',
    title: 'Content configuration',
    fields: [
      { key: 'homeBannerTitle', label: 'Home banner title' },
      { key: 'homeBannerBody', label: 'Home banner text', type: 'textarea' },
      { key: 'supportHours', label: 'Support hours' },
    ],
  },
  {
    id: 'app-labels',
    title: 'Patient-facing labels',
    description: 'Wording the patient app shows. Light and dark mode are the patient\'s own choice and are not managed here.',
    fields: [
      { key: 'bookCta', label: 'Book consultation button' },
      { key: 'labCta', label: 'Book lab test button' },
      { key: 'providerLabel', label: 'Provider label on shared screens', hint: 'Use Consulting Professional, not Treating Doctor.' },
    ],
  },
  {
    id: 'app-general',
    title: 'General app configuration',
    fields: [
      { key: 'minAppVersionAndroid', label: 'Minimum Android version' },
      { key: 'minAppVersionIos', label: 'Minimum iOS version' },
      { key: 'maintenanceMode', label: 'Maintenance mode', type: 'bool' },
      { key: 'maintenanceMessage', label: 'Maintenance message', type: 'textarea' },
    ],
  },
];

const AppValues = ({ level }: { level: AdminLevel }) =>
  LIVE ? <BackendSettings groups={['app_settings']} /> : <SettingsForm groups={APP_GROUPS} canEdit={may(level, ['content', 'operations'])} />;

export function AppSettings({ level }: { level: AdminLevel }) {
  return (
    <TabHub
      title="App Settings"
      level={level}
      tabs={[
        { id: 'app', label: 'App configuration', Component: AppValues, live: true },
        // Care Hub is not wired yet (cover images need the signed-upload flow), so a live build says so.
        { id: 'care-hub', label: 'Care Hub', Component: CareHub, levels: ['content', 'clinical_governance'] },
        { id: 'pathways', label: 'Follow-up pathways', Component: Pathways, levels: ['clinical_governance', 'content', 'operations'], live: true },
      ]}
    />
  );
}

/* ------------------------------- website settings --------------------------- */

const WEB_GROUPS: SettingGroup[] = [
  {
    id: 'website-content',
    title: 'Website content',
    fields: [
      { key: 'heroTitle', label: 'Hero title' },
      { key: 'heroSubtitle', label: 'Hero subtitle' },
      { key: 'aboutText', label: 'About text', type: 'textarea' },
    ],
  },
  {
    id: 'website-contact',
    title: 'Contact information',
    description: 'Also the Contact Us details of the legal and support content.',
    fields: [
      { key: 'supportEmail', label: 'Support email' },
      { key: 'supportPhone', label: 'Support phone' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'hours', label: 'Support hours' },
    ],
  },
  {
    id: 'website-services',
    title: 'Service information',
    fields: [
      { key: 'consultationsBlurb', label: 'Consultations', type: 'textarea' },
      { key: 'labBlurb', label: 'Lab services', type: 'textarea' },
      { key: 'petBlurb', label: 'Veterinary care', type: 'textarea' },
    ],
  },
  {
    id: 'website-links',
    title: 'Public links',
    fields: [
      { key: 'playStore', label: 'Google Play link', type: 'url' },
      { key: 'appStore', label: 'App Store link', type: 'url' },
      { key: 'providerSignUp', label: 'Provider sign-up link', type: 'url' },
      { key: 'twitter', label: 'X (Twitter)', type: 'url' },
      { key: 'instagram', label: 'Instagram', type: 'url' },
    ],
  },
];

const LEGAL_GROUPS: SettingGroup[] = [
  {
    id: 'legal',
    title: 'Document versions',
    description: 'The version and last-updated date shown for each document. Publishing the text itself is done in the document editor above.',
    fields: [
      { key: 'termsVersion', label: 'Terms & Conditions version' },
      { key: 'termsUpdated', label: 'Terms & Conditions last updated' },
      { key: 'privacyVersion', label: 'Privacy Policy version' },
      { key: 'privacyUpdated', label: 'Privacy Policy last updated' },
      { key: 'refundVersion', label: 'Refund Policy version' },
      { key: 'refundUpdated', label: 'Refund Policy last updated' },
      { key: 'contactVersion', label: 'Contact Us version' },
      { key: 'contactUpdated', label: 'Contact Us last updated' },
    ],
  },
];

const WebValues = ({ level }: { level: AdminLevel }) =>
  LIVE ? <BackendSettings groups={['website_settings']} /> : <SettingsForm groups={WEB_GROUPS} canEdit={may(level, ['content', 'operations'])} />;

function Legal({ level }: { level: AdminLevel }) {
  return (
    <div className="stack">
      <LegalDocuments level={level} />
      {/* The version and date are the document's own in a live build, so there is nothing to type twice. */}
      {!LIVE && <SettingsForm groups={LEGAL_GROUPS} canEdit={may(level, ['content', 'operations'])} />}
    </div>
  );
}

export function WebsiteSettings({ level }: { level: AdminLevel }) {
  return (
    <TabHub
      title="Website Settings"
      level={level}
      tabs={[
        { id: 'website', label: 'Website', Component: WebValues, live: true },
        { id: 'legal', label: 'Legal & Support content', Component: Legal, levels: ['content', 'clinical_governance', 'operations'], live: true },
      ]}
    />
  );
}
