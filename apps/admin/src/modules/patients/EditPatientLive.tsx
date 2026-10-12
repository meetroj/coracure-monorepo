import { useCallback, useState } from 'react';

import { request } from '../../api/http';
import { patients, type PatientDetailRecord } from '../../api/patients';
import { LANGUAGE_NAMES, LIVE_GENDERS, PIN_CODE } from '../../api/livePatients';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Button, Modal, SelectField, TextField, humanise, may } from '../../ui';

/**
 * A support correction to a patient's profile (live only).
 *
 * Only what the backend's `PATCH /admin/patients/:id` accepts: name, date of
 * birth, gender, languages, region, and the address line with its PIN code. The
 * mobile number and email are the patient's proofs of identity, and every health
 * field is their own report, so none of them is offered here.
 */
export function EditPatientLive({
  patient,
  level,
  onSaved,
}: {
  patient: PatientDetailRecord;
  level: AdminLevel;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!may(level, ['operations', 'care_coordinator'])) return null;
  return (
    <>
      <Button variant="secondary" icon="edit" onClick={() => setOpen(true)}>
        Edit details
      </Button>
      {/* Mounted only while open, so every opening starts from the saved values. */}
      {open && (
        <Form
          patient={patient}
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

function Form({
  patient: p,
  onClose,
  onSaved,
}: {
  patient: PatientDetailRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const update = useMutation(patients.updateLive);
  const fetchRegions = useCallback(() => request<{ id: string; name: string }[]>('/regions'), []);
  const regions = useResource<{ id: string; name: string }[]>(fetchRegions, []);

  const [fullName, setFullName] = useState(p.fullName === 'Unnamed patient' ? '' : p.fullName);
  const [dateOfBirth, setDateOfBirth] = useState(p.dateOfBirth ?? '');
  const [gender, setGender] = useState(p.gender);
  const [languages, setLanguages] = useState<string[]>(p.languageCodes ?? []);
  const [regionId, setRegionId] = useState(p.regionId ?? '');
  const [addressLine, setAddressLine] = useState(p.profile.addressLine1);
  const [pinCode, setPinCode] = useState(p.profile.pinCode);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Enter the patient’s name.';
    if (!dateOfBirth) next.dateOfBirth = 'Enter the date of birth.';
    else if (new Date(dateOfBirth) > new Date()) next.dateOfBirth = 'The date of birth must be in the past.';
    if (languages.length === 0) next.languages = 'Choose at least one language.';
    const hasLine = addressLine.trim() !== '';
    const hasPin = pinCode.trim() !== '';
    if (hasLine !== hasPin) next.pinCode = 'The address line and the PIN code go together.';
    else if (hasPin && !PIN_CODE.test(pinCode.trim())) next.pinCode = 'Enter a six-digit PIN code that does not start with 0.';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await update.mutate(p.id, { fullName, dateOfBirth, gender, languages, regionId, addressLine, pinCode });
      toast.success('Details updated.');
      onSaved();
    } catch (e) {
      toast.fromError(e);
    }
  };

  const toggle = (code: string) =>
    setLanguages((l) => (l.includes(code) ? l.filter((x) => x !== code) : [...l, code]));

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit patient details"
      width={600}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={update.busy} onClick={submit}>
            Save changes
          </Button>
        </>
      }
    >
      <p className="muted">
        The mobile number and email are the patient’s own proof of identity, and health details are their own
        report, so neither can be changed here.
      </p>
      <div className="formGrid">
        <TextField label="Full name" required value={fullName} error={errors.fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField label="Date of birth" type="date" required value={dateOfBirth} error={errors.dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        <SelectField
          label="Gender"
          value={gender}
          options={LIVE_GENDERS.map((g) => ({ value: g, label: humanise(g) }))}
          onChange={(e) => setGender(e.target.value)}
        />
        <SelectField
          label="Region"
          value={regionId}
          disabled={regions.loading}
          options={[{ value: '', label: regions.loading ? 'Loading…' : 'Leave unchanged' }, ...(regions.data ?? []).map((r) => ({ value: r.id, label: r.name }))]}
          onChange={(e) => setRegionId(e.target.value)}
        />
      </div>

      {/* checkGroup / checkOption, as on the provider form. Not formRow: its input and label rules are for
          text fields (full width, 48px high, block labels) and pulled each checkbox off its label. */}
      <fieldset className="checkGroup">
        <legend>Languages (the first one is preferred)</legend>
        {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
          <label key={code} className="checkOption">
            <input type="checkbox" checked={languages.includes(code)} onChange={() => toggle(code)} />
            {name}
          </label>
        ))}
      </fieldset>
      {errors.languages && <p className="fieldError">{errors.languages}</p>}

      <div className="formGrid">
        <TextField label="Address line" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
        <TextField label="PIN code" inputMode="numeric" maxLength={6} value={pinCode} error={errors.pinCode} onChange={(e) => setPinCode(e.target.value)} />
      </div>
    </Modal>
  );
}
