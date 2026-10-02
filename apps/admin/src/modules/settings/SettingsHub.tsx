import { useNavigate, useParams } from 'react-router-dom';
import type { ComponentType } from 'react';

import { canSee, settingsTabsFor, SETTINGS_TABS, type AdminLevel } from '../../nav';
import { EmptyState, PageHeader, Tabs } from '../../ui';
import { Settings } from '../Settings';
import { LegalDocuments } from '../content/LegalDocuments';
import { AuditLog } from '../compliance/AuditLog';
import { DeletionRequests } from '../compliance/DeletionRequests';
import { Retention } from '../compliance/Retention';
import { AdminAccounts } from '../AdminAccounts';

/**
 * Settings, with the platform housekeeping that used to be sidebar sections of
 * their own as tabs: legal documents, the audit log, deletion requests,
 * retention and admin accounts.
 *
 * The tab lives in the URL (`/settings/audit`), so refresh, Back and a pasted
 * link keep it. Each tab keeps the permission levels it had as a section; the
 * bar lists only what this level may open, and a typed URL for another tab gets
 * the same "not available" answer the sidebar guard gave.
 */
const TAB_SCREENS: Record<string, ComponentType<{ level: AdminLevel }>> = {
  general: Settings,
  legal: LegalDocuments,
  audit: AuditLog,
  'deletion-requests': DeletionRequests,
  retention: Retention,
  'admin-accounts': AdminAccounts,
};

export function SettingsHub({ level }: { level: AdminLevel }) {
  const { tab = 'general' } = useParams();
  const navigate = useNavigate();
  const allowed = settingsTabsFor(level);
  const meta = SETTINGS_TABS.find((t) => t.path === tab);
  const Screen = TAB_SCREENS[tab];

  return (
    <>
      <PageHeader title="Settings" description="Platform values, legal documents, the audit log and account administration." />
      <Tabs
        tabs={allowed.map((t) => ({ id: t.path, label: t.label }))}
        active={tab}
        onChange={(id) => navigate(`/settings/${id}`)}
      />
      {!meta || !Screen ? (
        <EmptyState icon="search" title="That settings tab does not exist" description="Pick one from the tabs above." />
      ) : !canSee(level, meta) ? (
        <EmptyState icon="lock" title="You do not have permission to view this tab" description="Your admin role does not include it. A super admin can change your permission level." />
      ) : (
        <Screen level={level} />
      )}
    </>
  );
}
