import { useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { doctors, type Doctor } from '../../api/admin';
import { useResource } from '../../lib/useResource';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Column,
  EmptyState,
  PermissionGate,
  SearchField,
  SelectField,
  Tabs,
  StatusBadge,
  Table,
} from '../../ui';

/**
 * The provider list (§15).
 *
 * Search and both filters live in the URL (§59, §62), so Back restores them,
 * a refresh keeps them, and a filtered view can be pasted to another admin.
 * Every parameter is one the backend actually accepts — `AdminDoctorQueryDto`
 * takes `verificationStatus`, `isListed` and `search` and nothing else.
 */

const STATUSES = [
  { value: '', label: 'Any verification status' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

const LISTED = [
  { value: '', label: 'Listed or not' },
  { value: 'true', label: 'Listed' },
  { value: 'false', label: 'Not listed' },
];

export function ProvidersList({ level }: { level: AdminLevel }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const search = params.get('search') ?? '';
  const status = params.get('verificationStatus') ?? '';
  const isListed = params.get('isListed') ?? '';

  /** Writes one filter into the URL, dropping it entirely when cleared. */
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // `replace` so tweaking a filter does not stack history entries (§60).
    setParams(next, { replace: true });
  };

  const fetcher = useCallback(
    () => doctors.list({ search, verificationStatus: status, isListed }),
    [search, status, isListed],
  );
  const state = useResource<Doctor[]>(fetcher, [search, status, isListed]);

  const filtered = Boolean(search || status || isListed);

  const columns: Column<Doctor>[] = [
    {
      key: 'name',
      header: 'Doctor',
      render: (d) => (
        <span className="cellStack">
          <strong>{d.fullName}</strong>
          <small>{d.specialtyName ?? d.qualification ?? '—'}</small>
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Mobile',
      render: (d) => (
        <span className="cellStack">
          <span>{d.mobileNumber ?? '—'}</span>
          <small>{d.registrationNumber ? `Reg ${d.registrationNumber}` : 'No reg. number'}</small>
        </span>
      ),
    },
    {
      key: 'verification',
      header: 'Verification',
      render: (d) => <StatusBadge status={d.verificationStatus} />,
    },
    {
      key: 'listing',
      header: 'Listing',
      render: (d) =>
        d.isListed ? <StatusBadge status="listed" /> : <StatusBadge status="unlisted" />,
    },
    {
      key: 'seniority',
      header: 'Seniority',
      render: (d) => (d.seniority ? <StatusBadge status={d.seniority} /> : <span className="muted">—</span>),
    },
    {
      key: 'languages',
      header: 'Languages',
      render: (d) =>
        d.languages?.length ? d.languages.join(', ') : <span className="muted">None set</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '110px',
      render: (d) => (
        <span className="rowActions">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/providers/${d.id}`)}>
            View
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      {/* The title is in the top bar, so the action shares the tab row. */}
      <div className="tabsRow">
        <Tabs
          tabs={STATUSES.map((o) => ({ id: o.value, label: o.value ? o.label : 'All' }))}
          active={status}
          onChange={(id) => setParam('verificationStatus', id)}
        />
        <PermissionGate level={level} allow={['operations']}>
          <Link to="/providers/new" className="tabsRow__action">
            <Button variant="primary" icon="plus">
              Add doctor
            </Button>
          </Link>
        </PermissionGate>
      </div>

      <div className="filterBar">
        <SearchField
          value={search}
          onSearch={(next) => setParam('search', next)}
          placeholder="Name, mobile or registration number"
        />
        <SelectField
          label="Listing"
          options={LISTED}
          value={isListed}
          onChange={(e) => setParam('isListed', e.target.value)}
        />
        {filtered && (
          <Button variant="ghost" icon="close" onClick={() => setParams({}, { replace: true })}>
            Clear
          </Button>
        )}
      </div>

      <Async
        state={state}
        resource="providers"
        empty={
          <EmptyState
            icon="providers"
            title={filtered ? 'No providers match these filters' : 'No providers yet'}
            description={
              filtered
                ? 'Try a wider verification status, or clear the search.'
                : 'Doctors are created here — there is no self sign-up for a doctor.'
            }
            action={
              filtered ? (
                <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
      >
        {(rows) => (
          <Table
            caption="Doctors"
            columns={columns}
            rows={rows}
            rowKey={(d) => d.id}
            onRowClick={(d) => navigate(`/providers/${d.id}`)}
            hideChevron
          />
        )}
      </Async>
    </>
  );
}
