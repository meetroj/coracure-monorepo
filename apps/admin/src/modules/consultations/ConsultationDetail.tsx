import { useCallback, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  consultations,
  scheduling,
  type AssignableProvider,
  type AuditEntry,
  type Consultation,
} from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  Column,
  ConfirmDialog,
  DefinitionList,
  EmptyState,
  Modal,
  Notice,
  PageHeader,
  PermissionGate,
  StatusBadge,
  Table,
  TextArea,
  humanise,
  may,
} from '../../ui';

/**
 * One consultation (§24): Overview, Assignment, Evidence, Audit.
 *
 * Each evidence source is gated separately, because the backend gates them
 * separately — finance can read the video session (a refund argument is
 * usually "the call never connected") but not the clinical record.
 */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'assignment', label: 'Assignment' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'audit', label: 'Audit' },
];

export function ConsultationDetail({ level }: { level: AdminLevel }) {
  const { consultationId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';

  const fetcher = useCallback(() => consultations.get(consultationId), [consultationId]);
  const state = useResource<Consultation>(fetcher, [consultationId]);

  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  return (
    <Async state={state} resource="this consultation">
      {(c) => (
        <>
          <PageHeader
            title={c.referenceCode ?? `Consultation ${c.id.slice(0, 8)}`}
            back={{ to: '/consultations', label: 'Consultations' }}
            crumbs={[{ label: 'Consultations', to: '/consultations' }, { label: 'Detail' }]}
            description={
              <span className="row">
                <StatusBadge status={c.status} />
                {c.mode && <StatusBadge status={c.mode} tone="neutral" label={humanise(c.mode)} />}
              </span>
            }
          />

          {c.status === 'pending_payment' && (
            <Notice tone="warning">
              A <strong>pending payment is the slot hold</strong>, and it expires. Refresh before
              acting — this may already have become <code>expired</code>.
            </Notice>
          )}
          {c.status === 'awaiting_documentation' && (
            <Notice tone="warning">
              The consultation happened and the provider has not written it up. It is in the
              pending-summaries queue.
            </Notice>
          )}

          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={t.id === tab}
                className={`tabs__tab ${t.id === tab ? 'isActive' : ''}`.trim()}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && <Overview c={c} />}
          {tab === 'assignment' && (
            <Assignment c={c} level={level} onChanged={state.reload} />
          )}
          {tab === 'evidence' && <Evidence c={c} level={level} />}
          {tab === 'audit' && <AuditTab consultationId={c.id} />}
        </>
      )}
    </Async>
  );
}

function Overview({ c }: { c: Consultation }) {
  return (
    <Card title="Consultation">
      <DefinitionList
        items={[
          { label: 'Reference', value: c.referenceCode },
          { label: 'Status', value: <StatusBadge status={c.status} /> },
          { label: 'Service', value: c.serviceName },
          {
            label: 'Starts at',
            value: c.startsAt ? new Date(c.startsAt).toLocaleString() : null,
          },
          { label: 'Language', value: c.language },
          { label: 'Provider', value: c.doctorName ?? c.doctorId },
        ]}
      />
    </Card>
  );
}

/* ------------------------------- assignment -------------------------------- */

function Assignment({
  c,
  level,
  onChanged,
}: {
  c: Consultation;
  level: AdminLevel;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<AssignableProvider | null>(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const override = useMutation(consultations.override);
  const cancel = useMutation(consultations.cancel);

  const canAct = may(level, ['operations', 'care_coordinator']);

  // The candidate list comes from the assignability endpoint — never a free
  // text doctor id (§25), which would recreate the coverage problem.
  const fetcher = useCallback(
    () =>
      scheduling.remaining({
        serviceId: c.serviceId ?? undefined,
        language: c.language ?? undefined,
        regionId: c.regionId ?? undefined,
        at: c.startsAt ?? undefined,
      }),
    [c.serviceId, c.language, c.regionId, c.startsAt],
  );
  const candidates = useResource<AssignableProvider[]>(fetcher, [c.id], picking);

  const columns: Column<AssignableProvider>[] = [
    { key: 'name', header: 'Provider', render: (p) => p.fullName },
    {
      key: 'remaining',
      header: 'Unbroken time left',
      render: (p) => (p.remainingMinutes != null ? `${p.remainingMinutes} min` : '—'),
    },
    {
      key: 'pick',
      header: '',
      align: 'end',
      width: '110px',
      render: (p) => (
        <Button
          size="sm"
          variant={p.assignable === false ? 'ghost' : 'secondary'}
          disabled={p.assignable === false}
          onClick={() => {
            setChosen(p);
            setPicking(false);
          }}
        >
          Choose
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card title="Assigned provider">
        <DefinitionList
          items={[
            { label: 'Provider', value: c.doctorName ?? c.doctorId },
            { label: 'Language', value: c.language },
            {
              label: 'Starts at',
              value: c.startsAt ? new Date(c.startsAt).toLocaleString() : null,
            },
          ]}
        />

        <PermissionGate level={level} allow={['operations', 'care_coordinator']}>
          <div className="formActions">
            <Button variant="danger" onClick={() => setCancelling(true)}>
              Cancel consultation
            </Button>
            <Button variant="secondary" icon="route" onClick={() => setPicking(true)}>
              Override provider
            </Button>
          </div>
        </PermissionGate>
      </Card>

      {chosen && canAct && (
        <Card title={`Override to ${chosen.fullName}`}>
          <Notice tone="warning">
            The reason is recorded and appears in allocation decisions. It is the audit answer for
            why this assignment was changed — it is not paperwork.
          </Notice>
          <TextArea
            label="Reason for the override"
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="formActions">
            <Button variant="ghost" onClick={() => setChosen(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={override.busy}
              disabled={reason.trim().length === 0}
              onClick={async () => {
                try {
                  await override.mutate(c.id, chosen.doctorId, reason.trim());
                  toast.success(`Reassigned to ${chosen.fullName}.`);
                  setChosen(null);
                  setReason('');
                  onChanged();
                } catch (e) {
                  toast.fromError(e);
                }
              }}
            >
              Confirm override
            </Button>
          </div>
        </Card>
      )}

      <Modal
        open={picking}
        onClose={() => setPicking(false)}
        title="Choose a provider"
        width={640}
      >
        <p className="muted">
          Only providers assignable for this consultation’s service, language, region and time.
        </p>
        <Async
          state={candidates}
          resource="assignable providers"
          skeletonRows={3}
          empty={
            <EmptyState
              icon="alert"
              title="Nobody else is assignable"
              description="No provider has an unbroken window long enough at this time."
            />
          }
        >
          {(rows) => (
            <Table columns={columns} rows={rows} rowKey={(p) => p.doctorId} caption="Candidates" />
          )}
        </Async>
      </Modal>

      <ConfirmDialog
        open={cancelling}
        busy={cancel.busy}
        onClose={() => setCancelling(false)}
        title="Cancel this consultation?"
        confirmLabel="Cancel consultation"
        consequence={
          <>
            The patient is told it is cancelled.{' '}
            <strong>This does not issue a refund</strong> — if money should go back, raise it in
            Payments afterwards. Cancelling something already paid for without refunding is the
            usual cause of a complaint.
          </>
        }
        reason={{ label: 'Reason', maxLength: 255 }}
        onConfirm={async (r) => {
          try {
            await cancel.mutate(c.id, r);
            toast.success('Consultation cancelled.');
            onChanged();
          } catch (e) {
            toast.fromError(e);
          }
          setCancelling(false);
        }}
      />
    </>
  );
}

/* -------------------------------- evidence --------------------------------- */

function Evidence({ c, level }: { c: Consultation; level: AdminLevel }) {
  return (
    <>
      <Notice tone="info">
        Reading a clinical record is itself audited. Only open what you need for the question you
        are answering.
      </Notice>

      <EvidencePane
        title="Instant offers"
        description="Who was asked, in what order, and what they said. This is how “nobody picked up” gets answered."
        allowed={may(level, ['operations', 'care_coordinator', 'clinical_governance'])}
        load={() => consultations.offers(c.id)}
        id={`offers-${c.id}`}
      />
      <EvidencePane
        title="Video session"
        description="The session record, for adjudicating a complaint or a refund."
        allowed={may(level, ['operations', 'clinical_governance', 'finance'])}
        load={() => consultations.videoSession(c.id)}
        id={`video-${c.id}`}
      />
      <EvidencePane
        title="Care record"
        description="The clinical record. Clinical governance and operations only."
        allowed={may(level, ['clinical_governance', 'operations'])}
        load={() => consultations.careRecord(c.id)}
        id={`care-${c.id}`}
      />
    </>
  );
}

/**
 * Each pane loads only when opened — a clinical record is not fetched (and so
 * not audited against this admin) just because they landed on the tab.
 */
function EvidencePane({
  title,
  description,
  allowed,
  load,
  id,
}: {
  title: string;
  description: string;
  allowed: boolean;
  load: () => Promise<unknown>;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const fetcher = useCallback(() => load(), [load]);
  const state = useResource<unknown>(fetcher, [id], open);

  if (!allowed) {
    return (
      <Card title={title}>
        <p className="muted">Your admin role does not include this evidence source.</p>
      </Card>
    );
  }

  return (
    <Card
      title={title}
      actions={
        <Button variant="secondary" size="sm" icon="eye" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Open'}
        </Button>
      }
    >
      <p className="muted">{description}</p>
      {open && (
        <Async state={state} resource={title.toLowerCase()} skeletonRows={2}>
          {(data) => <pre className="jsonDump">{JSON.stringify(data, null, 2)}</pre>}
        </Async>
      )}
    </Card>
  );
}

function AuditTab({ consultationId }: { consultationId: string }) {
  const fetcher = useCallback(() => consultations.auditTrail(consultationId), [consultationId]);
  const state = useResource<AuditEntry[]>(fetcher, [consultationId]);

  const columns: Column<AuditEntry>[] = [
    {
      key: 'at',
      header: 'When',
      render: (e) => {
        const at = e.at ?? e.createdAt;
        return at ? new Date(at).toLocaleString() : '—';
      },
    },
    { key: 'actor', header: 'Actor', render: (e) => e.actorType ?? '—' },
    { key: 'action', header: 'Action', render: (e) => (e.action ? humanise(e.action) : '—') },
    { key: 'entity', header: 'Entity', render: (e) => e.entityType ?? '—' },
  ];

  return (
    <Card title="Audit trail">
      <Async
        state={state}
        resource="the audit trail"
        empty={<EmptyState icon="audit" title="No audit entries for this consultation" />}
      >
        {(rows) => (
          <Table
            caption="Audit trail"
            columns={columns}
            rows={rows}
            rowKey={(e, ) => e.id ?? `${e.at}-${e.action}`}
          />
        )}
      </Async>
    </Card>
  );
}
