import { useCallback, useMemo, useState } from 'react';

import { pathways, type Pathway } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Async,
  Button,
  Card,
  Column,
  ConfirmDialog,
  EmptyState,
  Notice,
  PageHeader,
  StatusBadge,
  Table,
  TextArea,
  may,
} from '../../ui';

/**
 * Follow-up pathways — the daily check-in question sets and the red-flag rules
 * that turn an answer into a safety alert (§37, FR-13.7).
 *
 * *** POSTING PUBLISHES A NEW VERSION. IT NEVER EDITS THE LIVE ONE. ***
 * So the editor is "duplicate the current version, change it, publish", and
 * patients already on a pathway stay on the version they started. There is
 * deliberately no in-place edit form — building one would imply the live
 * version can be changed under a patient mid-course, which it cannot.
 */
export function Pathways({ level }: { level: AdminLevel }) {
  const fetcher = useCallback(() => pathways.list(), []);
  const state = useResource<Pathway[]>(fetcher, []);
  const [editing, setEditing] = useState<Pathway | null>(null);

  const canPublish = may(level, ['clinical_governance', 'content']);

  /** Newest version of each code first — §37. */
  const ordered = useMemo(
    () => (rows: Pathway[]) =>
      [...rows].sort((a, b) => {
        if (a.code !== b.code) return a.code.localeCompare(b.code);
        return (b.version ?? 0) - (a.version ?? 0);
      }),
    [],
  );

  const columns: Column<Pathway>[] = [
    {
      key: 'code',
      header: 'Pathway',
      render: (p) => (
        <span className="cellStack">
          <strong>{p.code}</strong>
          <small>Version {p.version ?? '—'}</small>
        </span>
      ),
    },
    {
      key: 'published',
      header: 'Published',
      render: (p) => (p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '—'),
    },
    {
      key: 'live',
      header: '',
      width: '110px',
      render: (p, ) => <StatusBadge status="published" label={`v${p.version ?? '?'}`} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '200px',
      render: (p) =>
        canPublish ? (
          <span className="rowActions">
            <Button size="sm" variant="secondary" icon="plus" onClick={() => setEditing(p)}>
              New version from this
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Follow-up pathways"
        description="Check-in question sets and the red-flag rules that raise safety alerts."
      />

      <Notice tone="warning">
        Publishing creates a <strong>new version</strong>; the live one is never edited in place. A
        patient already on a pathway stays on the version they started, which is why the red-flag
        rules must fire identically for everyone on a given version.
      </Notice>

      <Async
        state={state}
        resource="pathways"
        empty={
          <EmptyState
            icon="pathway"
            title="No pathways published"
            description="Follow-up question sets are authored here before any patient can be put on one."
          />
        }
      >
        {(rows) => (
          <Table
            caption="Follow-up pathways"
            columns={columns}
            rows={ordered(rows)}
            rowKey={(p) => `${p.code}-${p.version ?? 'x'}`}
          />
        )}
      </Async>

      {editing && (
        <NewVersion
          from={editing}
          onClose={() => setEditing(null)}
          onPublished={() => {
            setEditing(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}

/**
 * Duplicate-and-publish. The current version's content is pre-loaded so the
 * admin edits a copy rather than starting from nothing.
 */
function NewVersion({
  from,
  onClose,
  onPublished,
}: {
  from: Pathway;
  onClose: () => void;
  onPublished: () => void;
}) {
  const toast = useToast();
  const [questions, setQuestions] = useState(() =>
    JSON.stringify(from.questions ?? [], null, 2),
  );
  const [rules, setRules] = useState(() => JSON.stringify(from.redFlagRules ?? [], null, 2));
  const [confirming, setConfirming] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const publish = useMutation(pathways.publish);

  const parsed = () => {
    try {
      return { questions: JSON.parse(questions), redFlagRules: JSON.parse(rules) };
    } catch {
      return null;
    }
  };

  return (
    <>
      <Card title={`New version of ${from.code}`}>
        <p className="muted">
          Starting from version {from.version ?? '—'}. Publishing makes this the version every new
          patient is put on.
        </p>

        <TextArea
          label="Questions"
          rows={10}
          value={questions}
          error={parseError}
          hint="JSON. The wording is clinical content and needs clinician sign-off."
          onChange={(e) => {
            setQuestions(e.target.value);
            setParseError(null);
          }}
        />
        <TextArea
          label="Red-flag rules"
          rows={8}
          value={rules}
          hint="JSON. These are what turn a check-in answer into a safety alert."
          onChange={(e) => {
            setRules(e.target.value);
            setParseError(null);
          }}
        />

        <div className="formActions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              // Never send text that is not valid JSON — the backend would
              // reject it and the admin would lose the edit to a toast.
              if (!parsed()) {
                setParseError('That is not valid JSON. Fix it before publishing.');
                return;
              }
              setConfirming(true);
            }}
          >
            Publish new version
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirming}
        busy={publish.busy}
        onClose={() => setConfirming(false)}
        variant="primary"
        title={`Publish a new version of ${from.code}?`}
        confirmLabel="Publish version"
        consequence={
          <>
            Every patient <strong>starting</strong> this pathway from now on gets the new version.
            Patients already on it stay on the version they began, so nothing changes under them
            mid-course.
          </>
        }
        onConfirm={async () => {
          const body = parsed();
          if (!body) return;
          try {
            await publish.mutate(from.code, body);
            toast.success('New version published.');
            onPublished();
          } catch (e) {
            toast.fromError(e);
          }
          setConfirming(false);
        }}
      />
    </>
  );
}
