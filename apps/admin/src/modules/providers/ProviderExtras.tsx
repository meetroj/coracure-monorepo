import { useState } from 'react';

import { doctors, type Doctor } from '../../api/admin';
import { LIVE } from '../../api/live';
import { isWebUrl } from '../../api/liveProviders';
import { useMutation } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Button, Card, ConfirmDialog, DefinitionList, Modal, Notice, StatusBadge, may } from '../../ui';
import { inr } from './provider';

/**
 * Provider-profile panes that the spec adds (requirements §14-§18, §97):
 * the digital signature, the consultation schedule and what a patient sees.
 */

/* -------------------------------- signature -------------------------------- */

const SIGNATURE_LABEL: Record<NonNullable<Doctor['signatureStatus']>, string> = {
  not_submitted: 'Not submitted',
  submitted: 'Awaiting approval',
  approved: 'Approved',
  replacement_requested: 'Replacement requested',
};

/**
 * §17: preview, approve, request replacement - doctors only. The image is
 * private and only ever placed on a generated prescription.
 */
export function SignaturePane({
  doctor,
  level,
  onChanged,
}: {
  doctor: Doctor;
  level: AdminLevel;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [previewing, setPreviewing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const set = useMutation(doctors.setSignature);
  const status = doctor.signatureStatus ?? (doctor.registration?.hasSignature ? 'submitted' : 'not_submitted');
  // Approving is clinical governance or operations; asking for a replacement is clinical governance only.
  const canAct = may(level, ['clinical_governance', 'operations']) && status !== 'not_submitted';
  const canReplace = may(level, ['clinical_governance']) && status !== 'not_submitted';

  const run = async (next: 'approved' | 'replacement_requested', ok: string, reason?: string) => {
    try {
      await set.mutate(doctor.id, next, reason);
      toast.success(ok);
      onChanged();
    } catch (e) {
      toast.fromError(e);
    }
  };

  /** Live: the signed link in its own tab (opened first so a pop-up blocker allows it). */
  const preview = async () => {
    if (!LIVE || !doctor.signatureDocumentId) {
      setPreviewing(true);
      return;
    }
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    try {
      const { url } = await doctors.downloadUrl(doctor.signatureDocumentId);
      if (!isWebUrl(url)) throw new Error('The backend returned a link that is not a web address.');
      if (tab) tab.location.href = url;
    } catch (e) {
      tab?.close();
      toast.fromError(e);
    }
  };

  return (
    <Card title="Digital signature">
      <Notice>
        Private. The signature is placed only on prescriptions this doctor generates, and only once
        it is approved. It is never shown to patients elsewhere.
      </Notice>
      <DefinitionList
        items={[
          {
            label: 'Status',
            value: (
              <StatusBadge
                status={status}
                tone={status === 'approved' ? 'positive' : status === 'replacement_requested' ? 'warning' : 'neutral'}
                label={SIGNATURE_LABEL[status]}
              />
            ),
          },
        ]}
      />
      <div className="formActions">
        <Button variant="secondary" icon="eye" disabled={status === 'not_submitted'} onClick={preview}>
          Preview signature
        </Button>
        {canReplace && (
          <Button variant="secondary" onClick={() => setReplacing(true)}>
            Request replacement
          </Button>
        )}
        {canAct && (
          <>
            <Button
              variant="success"
              icon="check"
              loading={set.busy}
              disabled={status === 'approved'}
              onClick={() => run('approved', 'Signature approved.')}
            >
              Approve signature
            </Button>
          </>
        )}
      </div>

      <Modal open={previewing} onClose={() => setPreviewing(false)} title="Signature preview" width={520}>
        {/* Fixtures only: a live build opens the signed link in a tab. */}
        <div className="sigPreview" aria-label="Signature preview">
          <span>{doctor.fullName.replace(/^Dr\.?\s+/i, '')}</span>
        </div>
        <p className="muted">Shown on a plain page exactly as it will sit on a prescription.</p>
      </Modal>

      <ConfirmDialog
        open={replacing}
        busy={set.busy}
        onClose={() => setReplacing(false)}
        variant="primary"
        title="Request a replacement signature?"
        confirmLabel="Request replacement"
        consequence="The doctor is asked to upload a clearer signature. Until then their prescriptions go out without one."
        reason={{ label: 'What is wrong with it', hint: 'Shown to the doctor word for word.', maxLength: 255 }}
        onConfirm={async (reason) => {
          await run('replacement_requested', 'Replacement requested.', reason);
          setReplacing(false);
        }}
      />
    </Card>
  );
}

/* ------------------------- consultation settings --------------------------- */

/** §18: fee, days and one or more time windows per day. */
export function ScheduleCard({ doctor }: { doctor: Doctor }) {
  const rows = doctor.schedule ?? [];
  return (
    <Card title="Consultation days and timings">
      <DefinitionList
        items={[
          { label: 'Consultation fee', value: inr(doctor.consultationFeeInr ?? doctor.payoutFeeInr) },
          { label: 'Consultation days', value: rows.length ? rows.map((r) => r.day).join(', ') : null },
        ]}
      />
      {rows.length === 0 ? (
        <p className="muted">No consultation days set. The provider sets these from their own app.</p>
      ) : (
        <ul className="windows">
          {rows.map((r) => (
            <li key={r.day}>
              <strong>{r.day}</strong>
              <span>
                {r.windows.map((w) => (
                  <span key={w} className="chip">
                    {w}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------------------- patient-facing info -------------------------- */

const SHOWN = ['Provider name', 'Profile photo', 'Specialty / professional category', 'Qualification names', 'Total years of experience', 'Consultation languages', 'Consultation fee', 'Availability'];
const HIDDEN = ['Government ID', 'Degree certificates', 'Registration certificates', 'Institution-wise experience', 'Experience certificates', 'DOB', 'Personal mobile', 'Personal email', 'Internal verification information'];

/** §97: what patients may see of a provider, and what is never exposed. */
export function PatientFacingCard() {
  return (
    <Card title="What patients see">
      <div className="formGrid">
        <div>
          <h3 className="subhead">Visible to patients</h3>
          <ul className="plainList">
            {SHOWN.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="subhead">Never exposed</h3>
          <ul className="plainList plainList--no">
            {HIDDEN.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
