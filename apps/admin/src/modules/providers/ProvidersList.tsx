import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { doctors as fixtureDoctors } from '../../mock/db';
import { doctors } from '../../api/admin';
import { LIVE } from '../../api/live';
import type { RosterCategory } from '../../api/liveProviders';
import { useResource } from '../../lib/useResource';
import { useMasterNames, type MasterList } from '../../mock/ops/master';
import type { Doctor, ProviderCategory } from '../../api/types';
import type { AdminLevel } from '../../nav';
import { Button, ErrorState, PermissionGate, StatusBadge, TableSkeleton, skeletonColumns, type Column } from '../../ui';
import { ListScreen, type ListFilter } from '../kit/ListScreen';
import {
  ACCOUNT_OPTIONS,
  AVAILABILITY_OPTIONS,
  VERIFICATION_OPTIONS,
  accountOf,
  inr,
  ProviderAvatar,
} from './provider';

/**
 * The provider lists (requirements §4-§9): Doctors, Specialists,
 * Super-specialists, Paramedical Professionals and Veterinary Specialists.
 *
 * *** THE SPECIALTY LISTS ARE NOT HARD-CODED. *** Specialists and
 * Super-specialists are whoever's specialty is in the active Master Data list,
 * and the Specialty filter offers that list - so a specialty added in Master
 * Data shows up here with no code change (§6, §7, §10).
 *
 * Filters live in the URL, so Back restores them and a filtered view can be
 * pasted to another admin.
 */

type Mode = 'doctors' | 'specialists' | 'super' | 'paramedical' | 'veterinary';

type Config = {
  title: string;
  category: ProviderCategory;
  /** The master list the Specialty filter reads. */
  list: MasterList;
  /** Column and filter wording; non-doctor providers do not get doctor terms (§8). */
  specialtyLabel: string;
  /** Only providers whose specialty (or super-specialty) is in the active list. */
  within?: 'specialty' | 'super';
  /** The backend categories this tab is, when live. */
  roster: RosterCategory[];
};

const CONFIG: Record<Mode, Config> = {
  doctors: {
    title: 'Doctors',
    category: 'doctor',
    list: 'medical',
    specialtyLabel: 'Specialty',
    roster: ['medical', 'super_specialty'],
  },
  specialists: {
    title: 'Specialists',
    category: 'doctor',
    list: 'medical',
    specialtyLabel: 'Specialty',
    within: 'specialty',
    roster: ['medical'],
  },
  super: {
    title: 'Super-specialists',
    category: 'doctor',
    list: 'super',
    specialtyLabel: 'Super-specialty',
    within: 'super',
    roster: ['super_specialty'],
  },
  paramedical: {
    title: 'Paramedical Professionals',
    category: 'paramedical',
    list: 'paramedical',
    specialtyLabel: 'Profession',
    roster: ['paramedical'],
  },
  veterinary: {
    title: 'Veterinary Specialists',
    category: 'veterinary',
    list: 'veterinary',
    specialtyLabel: 'Veterinary specialty',
    roster: ['veterinary'],
  },
};

const opts = (names: string[]) => names.map((n) => ({ value: n, label: n }));

export const providerList = (mode: Mode) =>
  function ProviderListScreen({ level }: { level: AdminLevel }) {
    return <ProvidersList level={level} mode={mode} />;
  };

/**
 * Live: the roster comes from the backend by category, so the tabs are the
 * backend's own four. The Specialty filter offers the names the loaded
 * providers actually carry. Fixtures: the master lists decide, as before.
 */
export function ProvidersList({ level, mode = 'doctors' }: { level: AdminLevel; mode?: Mode }) {
  return LIVE ? <LiveProviders level={level} mode={mode} /> : <FixtureProviders level={level} mode={mode} />;
}

function LiveProviders({ level, mode }: { level: AdminLevel; mode: Mode }) {
  const cfg = CONFIG[mode];
  const fetcher = useCallback(() => doctors.list({ categories: cfg.roster }), [cfg]);
  const state = useResource<Doctor[]>(fetcher, [mode]);
  // The filters are built from the loaded rows, so they cannot sit behind `Async`
  // as one block: the list screen stays mounted and only its body is the skeleton.
  if (state.error && !state.data)
    return <ErrorState error={state.error} onRetry={state.reload} resource={cfg.title.toLowerCase()} />;
  const rows = state.data ?? [];
  const key = (d: Doctor) => (cfg.within === 'super' ? (d.superSpecialtyName ?? d.specialtyName) : d.specialtyName);
  const distinct = (pick: (d: Doctor) => string | null | undefined) =>
    [...new Set(rows.map(pick).filter((n): n is string => Boolean(n)))].sort();
  return (
    <ProviderListView
      level={level}
      mode={mode}
      rows={rows}
      loading={state.data === null}
      specialtyOptions={opts(distinct(key))}
      superOptions={opts(distinct((d) => d.superSpecialtyName))}
      specialtyOf={key}
    />
  );
}

function FixtureProviders({ level, mode }: { level: AdminLevel; mode: Mode }) {
  const cfg = CONFIG[mode];
  const masterNames = useMasterNames(cfg.list);
  const supers = useMasterNames('super');

  const all: Doctor[] = fixtureDoctors.filter((d) => (d.category ?? 'doctor') === cfg.category);
  const rows = all.filter((d) =>
    cfg.within === 'specialty'
      ? masterNames.includes(d.specialtyName ?? '')
      : cfg.within === 'super'
        ? Boolean(d.superSpecialtyName) && masterNames.includes(d.superSpecialtyName ?? '')
        : true,
  );

  // The list the admin maintains, plus anything a provider already carries that is not in it.
  const specialtyOptions = opts([
    ...new Set([...masterNames, ...(cfg.within ? [] : all.map((d) => d.specialtyName ?? '').filter(Boolean))]),
  ]);

  return (
    <ProviderListView
      level={level}
      mode={mode}
      rows={rows}
      specialtyOptions={specialtyOptions}
      superOptions={opts(supers)}
      specialtyOf={(d) => (cfg.within === 'super' ? d.superSpecialtyName : d.specialtyName)}
    />
  );
}

function ProviderListView({
  level,
  mode,
  rows,
  specialtyOptions,
  superOptions,
  specialtyOf,
  loading = false,
}: {
  level: AdminLevel;
  mode: Mode;
  rows: Doctor[];
  /** The roster is still on its way (live only): the body is a skeleton. */
  loading?: boolean;
  specialtyOptions: { value: string; label: string }[];
  superOptions: { value: string; label: string }[];
  /** What the Specialty filter compares against. */
  specialtyOf: (d: Doctor) => string | null | undefined;
}) {
  const navigate = useNavigate();
  const cfg = CONFIG[mode];

  const filters: ListFilter<Doctor>[] = [
    {
      key: 'specialty',
      label: cfg.within === 'super' ? 'Super-specialty' : cfg.specialtyLabel,
      options: specialtyOptions,
      test: (d, v) => specialtyOf(d) === v,
    },
    ...(mode === 'doctors'
      ? [
          {
            key: 'super',
            label: 'Super-specialty',
            options: superOptions,
            test: (d: Doctor, v: string) => d.superSpecialtyName === v,
          },
        ]
      : []),
    { key: 'verification', label: 'Verification status', options: VERIFICATION_OPTIONS, test: (d, v) => d.verificationStatus === v },
    { key: 'account', label: 'Account status', options: ACCOUNT_OPTIONS, test: (d, v) => accountOf(d) === v },
    { key: 'availability', label: 'Availability', options: AVAILABILITY_OPTIONS, test: (d, v) => (d.availabilityStatus ?? 'unavailable') === v },
  ];

  // Related facts share a cell, so the table fits the page without a sideways scroll.
  // Registration, verification / account and consultations / rating are on the provider's own page, not here.
  const columns: Column<Doctor>[] = [
    {
      key: 'provider',
      header: 'Provider',
      render: (d) => (
        <span className="provCell">
          <ProviderAvatar name={d.fullName} photoUrl={d.photoUrl} />
          <span className="cellStack">
            <strong>{d.fullName}</strong>
            <small>{d.providerCode ?? d.id}</small>
          </span>
        </span>
      ),
    },
    { key: 'mobile', header: 'Mobile', render: (d) => d.mobileNumber ?? '-' },
    {
      key: 'specialty',
      header: cfg.specialtyLabel,
      render: (d) => (
        <span className="cellStack">
          <span>{d.specialtyName ?? '-'}</span>
          {d.superSpecialtyName && <small>{d.superSpecialtyName}</small>}
          <small>{d.qualification ?? 'No qualifications'}</small>
        </span>
      ),
    },
    {
      key: 'experience',
      header: 'Experience',
      render: (d) => (
        <span className="cellStack">
          <span>{d.yearsOfExperience != null ? `${d.yearsOfExperience} yrs` : '-'}</span>
          <small>{d.languages?.join(', ') || 'No languages set'}</small>
        </span>
      ),
    },
    // Live rows carry what the provider is PAID; the patient's fee is the specialty's.
    { key: 'fee', header: LIVE ? 'Payout fee' : 'Fee', render: (d) => inr(d.consultationFeeInr ?? d.payoutFeeInr) },
    {
      key: 'availability',
      header: 'Availability',
      render: (d) => (
        <StatusBadge
          status={d.availabilityStatus ?? 'unavailable'}
          tone={d.availabilityStatus === 'available' ? 'positive' : 'neutral'}
        />
      ),
    },
  ];

  return (
    <ListScreen
      caption={cfg.title}
      rows={rows}
      columns={columns}
      rowKey={(d) => d.id}
      onOpen={(d) => navigate(`/providers/${d.id}`)}
      search={(d) => `${d.fullName} ${d.providerCode ?? ''} ${d.mobileNumber ?? ''} ${d.registrationNumber ?? ''}`}
      searchPlaceholder="Name, provider ID, mobile or registration number"
      filters={filters}
      emptyIcon="providers"
      empty={{ title: `No ${cfg.title.toLowerCase()} yet`, description: 'Providers are created here - there is no self sign-up.' }}
      loading={loading}
      skeleton={
        <TableSkeleton
          columns={skeletonColumns(columns, {
            provider: 'person',
            mobile: 'id',
            specialty: 'stack',
            experience: 'stack',
            fee: 'amount',
            availability: 'status',
          })}
        />
      }
      actions={
        <PermissionGate level={level} allow={['operations']}>
          <Link to="/providers/new">
            <Button variant="primary" icon="plus">
              Add provider
            </Button>
          </Link>
        </PermissionGate>
      }
    />
  );
}
