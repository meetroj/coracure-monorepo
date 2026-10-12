import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Doctor } from '../../api/admin';
import {
  BLANK_FIELDS,
  LANGUAGE_HINT,
  createProvider,
  editProvider,
  fieldsOf,
  specialties,
  superSpecialtiesUnder,
  type LiveSpecialty,
  type ProviderFields,
} from '../../api/liveProviders';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Async, Button, Card, FormSkeleton, Modal, Notice, PageHeader, SelectField, TextArea, TextField, may } from '../../ui';

/**
 * Add a provider and edit one, against the backend.
 *
 * Only what `CreateDoctorDto` and `UpdateDoctorDto` take. The provider states
 * their own date of birth, ID, qualification parts and experience, and uploads
 * their own documents, in their app after signing in with the mobile number
 * given here. An admin sets what a patient sees and what the provider is paid.
 *
 * The specialty list is the backend's own (`GET /admin/specialties`), and the
 * super-specialty choices are the ones under the chosen specialty, because that
 * is the only combination the backend accepts.
 */

type Props = {
  value: ProviderFields;
  onChange: (next: ProviderFields) => void;
  all: LiveSpecialty[];
  /** A specialty is required to create; an existing provider may still have none. */
  specialtyRequired?: boolean;
};

function Fields({ value, onChange, all, specialtyRequired }: Props) {
  const set = (patch: Partial<ProviderFields>) => onChange({ ...value, ...patch });
  const active = all.filter((s) => s.isActive || s.id === value.specialtyId);
  const supers = superSpecialtiesUnder(all, value.specialtyId);

  return (
    <>
      <h3 className="subhead">Profile</h3>
      <div className="formGrid">
        <TextField label="Full name" required value={value.fullName} onChange={(e) => set({ fullName: e.target.value })} />
        <SelectField
          label="Specialty"
          required={specialtyRequired}
          value={value.specialtyId}
          // A different specialty has different super-specialties, so the old one is dropped.
          onChange={(e) => set({ specialtyId: e.target.value, superSpecialtyId: '' })}
          options={[
            { value: '', label: 'Choose a specialty' },
            ...active.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        {supers.length > 0 && (
          <SelectField
            label="Super-specialty (optional)"
            value={value.superSpecialtyId}
            onChange={(e) => set({ superSpecialtyId: e.target.value })}
            options={[{ value: '', label: 'None' }, ...supers.map((s) => ({ value: s.id, label: s.name }))]}
          />
        )}
        <TextField
          label="Qualifications, as shown to patients"
          value={value.qualification}
          hint="Names only, e.g. MBBS · MD Dermatology."
          onChange={(e) => set({ qualification: e.target.value })}
        />
        <TextField
          label="Years of experience"
          inputMode="numeric"
          value={value.yearsOfExperience}
          onChange={(e) => set({ yearsOfExperience: e.target.value })}
        />
        <TextField
          label="Languages for consultation"
          value={value.languages}
          hint={`Comma separated: ${LANGUAGE_HINT}. A provider with none set cannot be matched to anyone.`}
          onChange={(e) => set({ languages: e.target.value })}
        />
      </div>

      <h3 className="subhead">Registration</h3>
      <div className="formGrid">
        <TextField
          label="Registration number"
          value={value.registrationNumber}
          onChange={(e) => set({ registrationNumber: e.target.value })}
        />
        <TextField
          label="Registration council"
          value={value.registrationCouncil}
          hint="The council that issued the number. Optional."
          onChange={(e) => set({ registrationCouncil: e.target.value })}
        />
      </div>

      <h3 className="subhead">Consultation</h3>
      <div className="formGrid">
        <TextField
          label="Payout fee (₹)"
          inputMode="decimal"
          value={value.payoutFeeInr}
          hint="What the provider is paid. The patient is charged the specialty fee."
          onChange={(e) => set({ payoutFeeInr: e.target.value })}
        />
        <TextField
          label="Consultation length (minutes)"
          inputMode="numeric"
          value={value.consultationDurationMinutes}
          onChange={(e) => set({ consultationDurationMinutes: e.target.value })}
        />
        <TextField
          label="Buffer after each consultation (minutes)"
          inputMode="numeric"
          value={value.bufferMinutes}
          onChange={(e) => set({ bufferMinutes: e.target.value })}
        />
      </div>

      <TextArea label="Bio" rows={4} value={value.bio} onChange={(e) => set({ bio: e.target.value })} />
    </>
  );
}

const useSpecialties = () => {
  const fetcher = useCallback(() => specialties.list(), []);
  return useResource<LiveSpecialty[]>(fetcher, []);
};

/* --------------------------------- create ---------------------------------- */

export function CreateProviderLive({ level: _level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const toast = useToast();
  const list = useSpecialties();
  const [mobile, setMobile] = useState('');
  const [fields, setFields] = useState<ProviderFields>(BLANK_FIELDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const created = await createProvider(mobile, fields);
      toast.success(`${fields.fullName.trim()} was added. They can sign in with that number.`);
      navigate(`/providers/${created.id}`);
    } catch (e) {
      // A body the panel refused before sending is a plain Error; the backend's refusals are ApiErrors.
      setError(e instanceof Error ? e.message : 'Could not add this provider.');
      toast.fromError(e, 'Could not add this provider.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader back={{ to: '/providers', label: 'Back' }} title="Add provider" />
      <form onSubmit={submit} noValidate>
        <Card title="New provider">
          <Notice tone="info">
            The provider signs in with this mobile number and completes their identity, qualifications, experience
            and documents in their own app. Those then appear under Verification for review.
          </Notice>
          <Async state={list} resource="specialties" skeleton={<FormSkeleton fields={6} />}>
            {(all) => (
              <>
                <h3 className="subhead">Sign-in</h3>
                <div className="formGrid">
                  <TextField
                    label="Mobile number"
                    required
                    value={mobile}
                    hint="With country code, e.g. +919876543210. A ten digit number is taken as +91."
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
                <Fields value={fields} onChange={setFields} all={all} specialtyRequired />
              </>
            )}
          </Async>
          {error && <p className="fieldError">{error}</p>}
          <div className="formActions">
            <Button type="button" variant="ghost" onClick={() => navigate('/providers')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={list.data === null}>
              Add provider
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}

/* ---------------------------------- edit ----------------------------------- */

export function EditProviderLive({
  doctor,
  level,
  onSaved,
}: {
  doctor: Doctor;
  level: AdminLevel;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  // `PATCH /admin/doctors/:id` is operations only.
  if (!may(level, ['operations'])) return null;
  return (
    <>
      <Button variant="secondary" icon="edit" onClick={() => setOpen(true)}>
        Edit details
      </Button>
      {/* Mounted only while open, so every opening starts from the saved values. */}
      {open && (
        <EditForm
          doctor={doctor}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onSaved();
          }}
        />
      )}
    </>
  );
}

function EditForm({ doctor, onClose, onSaved }: { doctor: Doctor; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const list = useSpecialties();
  const before = useMemo(() => fieldsOf(doctor), [doctor]);
  const [fields, setFields] = useState<ProviderFields>(before);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await editProvider(doctor.id, before, fields);
      toast.success('Details updated.');
      onSaved();
    } catch (e) {
      // The form keeps everything that was typed.
      setError(e instanceof Error ? e.message : null);
      toast.fromError(e, 'Could not save these details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${doctor.fullName}`}
      width={760}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={busy} disabled={list.data === null} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <Notice tone="info">
        Date of birth, ID, qualification parts, experience and documents are the provider&apos;s own to state in their
        app. Changing the specialty, fee or length changes who can be assigned.
      </Notice>
      <Async state={list} resource="specialties" skeleton={<FormSkeleton fields={5} />}>
        {(all) => <Fields value={fields} onChange={setFields} all={all} />}
      </Async>
      {error && <p className="fieldError">{error}</p>}
    </Modal>
  );
}
