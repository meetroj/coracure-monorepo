import { useState } from 'react';

import { doctors, type Doctor } from '../../api/admin';
import { useMutation } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Button, Modal, SelectField, TextField, may } from '../../ui';

/**
 * Edit what a doctor entered at registration, on their behalf (operations only,
 * like the rest of `PATCH /admin/doctors/:id`).
 *
 * Not editable here: the sign-in mobile number (a typo would lock the doctor out
 * — create a new account instead), the government ID number (only its last four
 * characters are ever held), and the uploaded documents (the doctor re-uploads).
 */
const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];
const ID_TYPES = ['Aadhaar', 'Passport', 'Driving licence', 'Voter ID', 'PAN'];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Entry = { designation: string; institution: string; years: string };

export function EditDoctor({
  doctor,
  level,
  onSaved,
}: {
  doctor: Doctor;
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

function Form({
  doctor,
  onClose,
  onSaved,
}: {
  doctor: Doctor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const r = doctor.registration;
  const update = useMutation(doctors.update);

  const [fullName, setFullName] = useState(doctor.fullName);
  const [dateOfBirth, setDob] = useState(r?.dateOfBirth ?? '');
  const [gender, setGender] = useState(r?.gender ?? '');
  const [email, setEmail] = useState(doctor.email ?? '');
  const [languages, setLanguages] = useState((doctor.languages ?? []).join(', '));
  const [idType, setIdType] = useState(r?.idType ?? '');
  const [abhaId, setAbha] = useState(r?.abhaId ?? '');
  const [basic, setBasic] = useState(r?.basicQualification ?? '');
  const [pg, setPg] = useState(r?.pgSpecialisation ?? '');
  const [superSpec, setSuper] = useState(r?.superSpecialisation ?? '');
  const [fellowship, setFellowship] = useState(r?.fellowship ?? '');
  const [registrationNumber, setRegNo] = useState(doctor.registrationNumber ?? '');
  const [entries, setEntries] = useState<Entry[]>(
    (r?.experience ?? []).map((x) => ({ designation: x.designation, institution: x.institution, years: String(x.years) })),
  );
  const [error, setError] = useState<string | null>(null);

  const setEntry = (i: number, patch: Partial<Entry>) =>
    setEntries((cur) => cur.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    if (fullName.trim().length < 2) return setError('Enter the doctor’s full name.');
    if (email && !EMAIL.test(email.trim())) return setError('Enter a valid email address.');
    if (!basic.trim()) return setError('The basic qualification is required.');
    for (const [i, x] of entries.entries()) {
      if (!x.designation.trim() || !x.institution.trim() || x.years === '' || Number.isNaN(Number(x.years)))
        return setError(`Experience ${i + 1}: fill in the designation, institute and years.`);
    }
    setError(null);

    const experience = entries.map((x) => ({
      designation: x.designation.trim(),
      institution: x.institution.trim(),
      years: Number(x.years),
    }));
    try {
      // Built field by field — form state is never spread into the body (§55).
      await update.mutate(doctor.id, {
        fullName: fullName.trim(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
        registrationNumber: registrationNumber.trim() || null,
        qualification: [basic, pg, superSpec, fellowship].map((x) => x.trim()).filter(Boolean).join(' · '),
        yearsOfExperience: experience.reduce((n, x) => n + x.years, 0),
        registration: {
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          idType: idType || null,
          abhaId: abhaId.trim() || null,
          basicQualification: basic.trim(),
          pgSpecialisation: pg.trim() || null,
          superSpecialisation: superSpec.trim() || null,
          fellowship: fellowship.trim() || null,
          experience,
        },
      });
      toast.success('Details updated.');
      onSaved();
    } catch (e) {
      // The form keeps everything that was typed.
      toast.fromError(e, 'Could not save these details.');
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
          <Button variant="primary" loading={update.busy} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <h3 className="subhead">Basic details</h3>
      <div className="formGrid">
        <TextField label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField label="Date of birth" type="date" value={dateOfBirth} onChange={(e) => setDob(e.target.value)} />
        <SelectField
          label="Gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          options={[{ value: '', label: 'Not set' }, ...GENDERS.map((g) => ({ value: g, label: g }))]}
        />
        <TextField label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Languages for consultation"
          value={languages}
          hint="Comma separated. A doctor with none set cannot be matched to anyone."
          onChange={(e) => setLanguages(e.target.value)}
        />
        <TextField label="Mobile number" value={doctor.mobileNumber ?? ''} disabled hint="The sign-in identifier — not editable here." onChange={() => undefined} />
      </div>

      <h3 className="subhead">Proof of identity</h3>
      <div className="formGrid">
        <SelectField
          label="Government ID type"
          value={idType}
          onChange={(e) => setIdType(e.target.value)}
          options={[{ value: '', label: 'Not set' }, ...ID_TYPES.map((t) => ({ value: t, label: t }))]}
        />
        <TextField
          label="Government ID number"
          value={r?.idNumberLast4 ? `•••• ${r.idNumberLast4}` : ''}
          disabled
          hint="Only the last four characters are held, so it cannot be edited."
          onChange={() => undefined}
        />
        <TextField label="ABHA ID / address (optional)" value={abhaId} onChange={(e) => setAbha(e.target.value)} />
      </div>

      <h3 className="subhead">Professional qualifications</h3>
      <div className="formGrid">
        <TextField label="Basic qualification" required value={basic} onChange={(e) => setBasic(e.target.value)} />
        <TextField label="PG specialisation (optional)" value={pg} onChange={(e) => setPg(e.target.value)} />
        <TextField label="Super specialisation (optional)" value={superSpec} onChange={(e) => setSuper(e.target.value)} />
        <TextField label="Fellowship (optional)" value={fellowship} onChange={(e) => setFellowship(e.target.value)} />
        <TextField label="Registration number" value={registrationNumber} onChange={(e) => setRegNo(e.target.value)} />
      </div>

      <h3 className="subhead">Experience</h3>
      {entries.length === 0 && <p className="muted">No experience entries.</p>}
      {entries.map((x, i) => (
        <div className="expEntry" key={i}>
          <div className="formGrid">
            <TextField label="Designation" value={x.designation} onChange={(e) => setEntry(i, { designation: e.target.value })} />
            <TextField label="Name of institute" value={x.institution} onChange={(e) => setEntry(i, { institution: e.target.value })} />
            <TextField label="Years" inputMode="numeric" value={x.years} onChange={(e) => setEntry(i, { years: e.target.value })} />
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEntries((cur) => cur.filter((_, j) => j !== i))}>
            Remove this experience
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        icon="plus"
        onClick={() => setEntries((cur) => [...cur, { designation: '', institution: '', years: '' }])}
      >
        Add another experience
      </Button>

      {error && <p className="fieldError">{error}</p>}
    </Modal>
  );
}
