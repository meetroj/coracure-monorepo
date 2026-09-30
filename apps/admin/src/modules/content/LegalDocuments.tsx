import { useCallback, useState } from 'react';

import { legal, type LegalDocument } from '../../api/admin';
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
  SelectField,
  Table,
  TextArea,
  humanise,
  may,
} from '../../ui';

/**
 * Legal documents (§38).
 *
 * Versioned, like pathways. One of them is different from the rest:
 * publishing a new **teleconsultation consent** re-prompts every patient
 * before their next consultation, so its confirmation says so explicitly. It
 * is the most disruptive button in the panel.
 */

const TYPES = [
  { value: 'teleconsultation_consent', label: 'Teleconsultation consent' },
  { value: 'privacy_policy', label: 'Privacy policy' },
  { value: 'terms_of_use', label: 'Terms of use' },
  { value: 'refund_policy', label: 'Refund policy' },
  { value: 'reconsult_policy', label: 'Reconsult policy' },
  { value: 'doctor_agreement', label: 'Doctor agreement' },
];

export function LegalDocuments({ level }: { level: AdminLevel }) {
  const [documentType, setDocumentType] = useState(TYPES[0].value);
  const [drafting, setDrafting] = useState(false);

  const fetcher = useCallback(() => legal.versions(documentType), [documentType]);
  const state = useResource<LegalDocument[]>(fetcher, [documentType]);

  const canPublish = may(level, ['content', 'clinical_governance']);

  const columns: Column<LegalDocument>[] = [
    { key: 'version', header: 'Version', render: (d) => <strong>{d.version ?? '—'}</strong> },
    {
      key: 'published',
      header: 'Published',
      render: (d) => (d.publishedAt ? new Date(d.publishedAt).toLocaleString() : '—'),
    },
    {
      key: 'preview',
      header: 'Opening',
      render: (d) => <span className="clamp">{d.body?.slice(0, 120) ?? '—'}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Legal documents"
        description="Consent, policies and agreements. Every change is a new version — nothing is edited in place."
        actions={
          canPublish && (
            <Button variant="primary" icon="plus" onClick={() => setDrafting(true)}>
              Publish new version
            </Button>
          )
        }
      />

      <Card title="Document">
        <SelectField
          label="Type"
          value={documentType}
          options={TYPES}
          onChange={(e) => setDocumentType(e.target.value)}
          className="narrowField"
        />
      </Card>

      {documentType === 'teleconsultation_consent' && (
        <Notice tone="warning">
          Publishing a new version of this document <strong>re-prompts every patient</strong> for
          consent before their next consultation.
        </Notice>
      )}

      <Card title="Version history">
        <Async
          state={state}
          resource="versions"
          empty={
            <EmptyState
              icon="legal"
              title="No versions published"
              description="This document type has never been published."
            />
          }
        >
          {(rows) => (
            <Table
              caption="Versions"
              columns={columns}
              rows={rows}
              rowKey={(d) => String(d.version ?? d.publishedAt ?? Math.random())}
            />
          )}
        </Async>
      </Card>

      {drafting && (
        <Draft
          documentType={documentType}
          onClose={() => setDrafting(false)}
          onPublished={() => {
            setDrafting(false);
            state.reload();
          }}
        />
      )}
    </>
  );
}

function Draft({
  documentType,
  onClose,
  onPublished,
}: {
  documentType: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const publish = useMutation(legal.publish);

  const isConsent = documentType === 'teleconsultation_consent';

  return (
    <>
      <Card title={`New version — ${humanise(documentType)}`}>
        <TextArea
          label="Document text"
          required
          rows={14}
          value={body}
          hint="Supplied by the client's legal advisor. The apps render this verbatim."
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="formActions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!body.trim()}
            onClick={() => setConfirming(true)}
          >
            Publish
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirming}
        busy={publish.busy}
        onClose={() => setConfirming(false)}
        variant={isConsent ? 'danger' : 'primary'}
        title={`Publish a new ${humanise(documentType).toLowerCase()}?`}
        confirmLabel="Publish version"
        consequence={
          isConsent ? (
            <>
              <strong>Every patient will be asked to consent again</strong> before their next
              consultation, including patients with a booking already made. Only publish a new
              consent version when the wording has genuinely changed.
            </>
          ) : (
            <>This becomes the version both apps show from now on. Earlier versions stay on record.</>
          )
        }
        typeToConfirm={isConsent ? 'RE-PROMPT ALL PATIENTS' : undefined}
        onConfirm={async () => {
          try {
            await publish.mutate({ documentType, body: body.trim() });
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
