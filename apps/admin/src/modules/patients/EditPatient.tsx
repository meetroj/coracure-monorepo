import { useState } from 'react';

import { patients, type PatientDetailRecord } from '../../api/patients';
import { useMutation } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Button, Modal, SelectField, TextField, may } from '../../ui';

/**
 * Correct a patient's profile on their behalf (operations only). The mobile number is
 * the patient's sign-in identifier, so it is shown but not editable here; consents, files,
 * consultations and every other record are theirs and are not touched.
 */
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function EditPatient({
  patient,
  level,
  onSaved,
}: {
  patient: PatientDetailRecord;
  level: AdminLevel;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!may(level, ['operations'])) return null;
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
  const update = useMutation(patients.update);
  const h = p.profile.health;

  const [fullName, setFullName] = useState(p.fullName);
  const [dateOfBirth, setDob] = useState(p.dateOfBirth ?? '');
  const [gender, setGender] = useState(p.gender);
  const [email, setEmail] = useState(p.profile.email);
  const [languages, setLanguages] = useState(p.profile.languages.join(', '));
  const [addressLine1, setLine1] = useState(p.profile.addressLine1);
  const [addressLine2, setLine2] = useState(p.profile.addressLine2 ?? '');
  const [city, setCity] = useState(p.profile.city);
  const [district, setDistrict] = useState(p.profile.district ?? '');
  const [state, setState] = useState(p.profile.state);
  const [pinCode, setPin] = useState(p.profile.pinCode);
  const [country, setCountry] = useState(p.profile.country);
  const [bloodGroup, setBlood] = useState(h?.bloodGroup ?? '');
  const [heightCm, setHeight] = useState(h?.heightCm ? String(h.heightCm) : '');
  const [weightKg, setWeight] = useState(h?.weightKg ? String(h.weightKg) : '');
  const [allergies, setAllergies] = useState(h?.allergies ?? '');
  const [chronic, setChronic] = useState(h?.chronicConditions ?? '');
  const [medications, setMeds] = useState(h?.regularMedications ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (fullName.trim().length < 2) return setError('Enter the patient’s full name.');
    if (!dateOfBirth) return setError('Enter the date of birth.');
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address.');
    if (!languages.split(',').some((l) => l.trim())) return setError('Enter at least one language.');
    if (![addressLine1, city, state, pinCode, country].every((x) => x.trim()))
      return setError('Address line 1, city, state, PIN code and country are required.');
    for (const [label, v] of [['Height', heightCm], ['Weight', weightKg]] as const)
      if (v && Number.isNaN(Number(v))) return setError(`${label} must be a number.`);
    setError(null);

    const anyHealth = [bloodGroup, heightCm, weightKg, allergies, chronic, medications].some((x) => x.trim());
    try {
      await update.mutate(p.id, {
        fullName: fullName.trim(),
        dateOfBirth,
        gender,
        email: email.trim().toLowerCase(),
        languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || null,
        city: city.trim(),
        district: district.trim() || null,
        state: state.trim(),
        pinCode: pinCode.trim(),
        country: country.trim(),
        health: anyHealth
          ? {
              bloodGroup: bloodGroup.trim() || null,
              heightCm: heightCm ? Number(heightCm) : null,
              weightKg: weightKg ? Number(weightKg) : null,
              allergies: allergies.trim() || null,
              chronicConditions: chronic.trim() || null,
              regularMedications: medications.trim() || null,
            }
          : null,
      });
      toast.success('Details updated.');
      onSaved();
    } catch (e) {
      toast.fromError(e, 'Could not save these details.');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${p.fullName}`}
      width={760}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={update.busy} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <h3 className="subhead">Basic details</h3>
      <div className="formGrid">
        <TextField label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField label="Date of birth" required type="date" value={dateOfBirth} onChange={(e) => setDob(e.target.value)} />
        <SelectField
          label="Gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          options={GENDERS.map((g) => ({ value: g, label: g }))}
        />
        <TextField label="Mobile number" value={p.mobileNumber} disabled hint="The sign-in identifier - not editable here." onChange={() => undefined} />
        <TextField label="Email address" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Preferred language(s)"
          required
          value={languages}
          hint="Comma separated. The first is matched on when a doctor is assigned."
          onChange={(e) => setLanguages(e.target.value)}
        />
      </div>

      <h3 className="subhead">Contact details</h3>
      <div className="formGrid">
        <TextField label="Address line 1" required value={addressLine1} onChange={(e) => setLine1(e.target.value)} />
        <TextField label="Address line 2 (optional)" value={addressLine2} onChange={(e) => setLine2(e.target.value)} />
        <TextField label="City" required value={city} onChange={(e) => setCity(e.target.value)} />
        <TextField label="District (optional)" value={district} onChange={(e) => setDistrict(e.target.value)} />
        <TextField label="State" required value={state} onChange={(e) => setState(e.target.value)} />
        <TextField label="PIN code" required inputMode="numeric" value={pinCode} onChange={(e) => setPin(e.target.value)} />
        <TextField label="Country" required value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>

      <h3 className="subhead">Health profile (optional)</h3>
      <div className="formGrid">
        <TextField label="Blood group" value={bloodGroup} onChange={(e) => setBlood(e.target.value)} />
        <TextField label="Height (cm)" inputMode="numeric" value={heightCm} onChange={(e) => setHeight(e.target.value)} />
        <TextField label="Weight (kg)" inputMode="numeric" value={weightKg} onChange={(e) => setWeight(e.target.value)} />
        <TextField label="Allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
        <TextField label="Chronic conditions" value={chronic} onChange={(e) => setChronic(e.target.value)} />
        <TextField label="Regular medications" value={medications} onChange={(e) => setMeds(e.target.value)} />
      </div>

      {error && <p className="fieldError">{error}</p>}
    </Modal>
  );
}
