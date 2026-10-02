import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { catalogue, doctors, type Specialty } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import { Button, Card, Notice, PageHeader, SelectField, TextField } from '../../ui';
import { FileField } from './FileField';

/**
 * Create a provider account (§16), collecting the same details the doctor's
 * own registration does — the sections match the review tabs in Document
 * verification, so what is asked here is what gets reviewed there.
 *
 * The mobile number is the doctor's SIGN-IN IDENTIFIER — an unknown number at
 * `POST /auth/doctor/otp/request` is refused rather than texted a code, so a
 * typo here means the doctor cannot sign in at all. That is why it is
 * validated against the backend's own E.164 pattern before the request goes.
 *
 * UI-only build: files stay in the form and nothing is uploaded.
 */

/** Verbatim from the backend's `VerifyOtpDto` / doctor DTO. */
const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];
const ID_TYPES = ['Aadhaar', 'Passport', 'Driving licence', 'Voter ID', 'PAN'];
const LANGUAGES = [
  'English',
  'Hindi',
  'Marathi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Bengali',
  'Gujarati',
  'Punjabi',
  'Urdu',
  'Odia',
];

const PHOTO_TYPES = ['image/jpeg', 'image/png'];
const SIGNATURE_TYPES = ['image/jpeg', 'image/png'];
const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

type Experience = { designation: string; institute: string; years: string; certificate: File | null };
const blankExperience = (): Experience => ({ designation: '', institute: '', years: '', certificate: null });

type Errors = Record<string, string>;

export function ProviderCreate({ level: _level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const toast = useToast();

  // Basic details
  const [photo, setPhoto] = useState<File | null>(null);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  // Proof of identity
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [abhaId, setAbhaId] = useState('');
  // Professional qualifications
  const [specialtyId, setSpecialtyId] = useState('');
  const [basicQualification, setBasic] = useState('');
  const [pgSpecialisation, setPg] = useState('');
  const [superSpecialisation, setSuper] = useState('');
  const [fellowship, setFellowship] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [degreeCertificate, setDegree] = useState<File | null>(null);
  const [registrationCertificate, setRegCert] = useState<File | null>(null);
  // Experience
  const [experience, setExperience] = useState<Experience[]>([blankExperience()]);
  // Digital signature
  const [signature, setSignature] = useState<File | null>(null);
  // Commercials
  const [payoutFeeInr, setPayout] = useState('');
  const [duration, setDuration] = useState('');

  const [errors, setErrors] = useState<Errors>({});

  const specialtyFetcher = useCallback(() => catalogue.specialties(), []);
  const specialties = useResource<Specialty[]>(specialtyFetcher, []);
  const create = useMutation(doctors.create);
  const selected = specialties.data?.find((s) => s.id === specialtyId);

  const setEntry = (i: number, patch: Partial<Experience>) =>
    setExperience((cur) => cur.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const validate = (): Errors => {
    const e: Errors = {};
    const need = (key: string, ok: boolean, message: string) => {
      if (!ok) e[key] = message;
    };
    need('fullName', fullName.trim().length >= 2, 'Enter the doctor’s full name.');
    need('dateOfBirth', Boolean(dateOfBirth), 'Enter the date of birth.');
    need('gender', Boolean(gender), 'Choose a gender.');
    need('mobileNumber', E164.test(mobileNumber.trim()), 'Use international format, e.g. +919876543210.');
    need('email', EMAIL.test(email.trim()), 'Enter a valid email address.');
    need('languages', languages.length > 0, 'Choose at least one language.');
    need('idType', Boolean(idType), 'Choose a government ID type.');
    need('idNumber', idNumber.trim().length >= 4, 'Enter the government ID number.');
    need('idDocument', Boolean(idDocument), 'Upload the government ID document.');
    need('basicQualification', basicQualification.trim().length > 0, 'Enter the basic qualification.');
    need('degreeCertificate', Boolean(degreeCertificate), 'Upload the degree certificate.');
    need('registrationCertificate', Boolean(registrationCertificate), 'Upload the registration certificate.');
    experience.forEach((x, i) => {
      need(`exp${i}designation`, x.designation.trim().length > 0, 'Enter the designation.');
      need(`exp${i}institute`, x.institute.trim().length > 0, 'Enter the institute.');
      need(`exp${i}years`, x.years !== '' && Number(x.years) >= 0 && !Number.isNaN(Number(x.years)), 'Enter the years.');
      need(`exp${i}certificate`, Boolean(x.certificate), 'Upload the experience certificate.');
    });
    if (payoutFeeInr && Number.isNaN(Number(payoutFeeInr))) e.payoutFeeInr = 'Enter an amount in rupees.';
    if (duration && Number.isNaN(Number(duration))) e.duration = 'Enter a number of minutes.';
    return e;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.fromError(new Error('Some details are missing.'), 'Some details are missing — see the fields marked below.');
      return;
    }

    const entries = experience.map((x) => ({
      designation: x.designation.trim(),
      institution: x.institute.trim(),
      years: Number(x.years),
    }));

    try {
      // Built field by field — form state is never spread into the body (§55).
      const created = await create.mutate({
        mobileNumber: mobileNumber.trim(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        dateOfBirth,
        gender,
        languages,
        hasPhoto: Boolean(photo),
        idType,
        idNumber: idNumber.trim(),
        abhaId: abhaId.trim() || null,
        ...(specialtyId ? { specialtyId } : {}),
        basicQualification: basicQualification.trim(),
        pgSpecialisation: pgSpecialisation.trim() || null,
        superSpecialisation: superSpecialisation.trim() || null,
        fellowship: fellowship.trim() || null,
        ...(registrationNumber.trim() ? { registrationNumber: registrationNumber.trim() } : {}),
        experience: entries,
        hasSignature: Boolean(signature),
        ...(payoutFeeInr ? { payoutFeeInr: Number(payoutFeeInr) } : {}),
        ...(duration ? { consultationDurationMinutes: Number(duration) } : {}),
        // The documents that will wait in Document verification.
        documents: [
          'identity_proof',
          'degree_certificate',
          'registration_certificate',
          ...entries.map(() => 'experience_letter'),
          ...(signature ? ['prescription_signature'] : []),
        ],
      });
      toast.success(`${created.fullName} created. They are pending verification.`);
      navigate(`/providers/${created.id}`);
    } catch (e) {
      // The form keeps everything the admin typed (§50).
      toast.fromError(e, 'Could not create this doctor.');
    }
  };

  const total = experience.reduce((sum, x) => sum + (Number(x.years) || 0), 0);

  return (
    <>
      <PageHeader
        title="Add a doctor"
        description="The account is created pending verification and unlisted. The details below are what Document verification reviews."
      />

      <form onSubmit={submit} noValidate>
        <Card title="Basic details">
          <Notice tone="warning">
            The mobile number is the doctor’s sign-in identifier. If it is wrong they cannot sign
            in at all — an unknown number is refused rather than sent a code.
          </Notice>

          <FileField
            label="Profile photo (optional)"
            types={PHOTO_TYPES}
            maxMb={2}
            file={photo}
            onChange={setPhoto}
            hint="One image only, JPG or PNG."
          />

          <div className="formGrid">
            <TextField label="Full name" required value={fullName} error={errors.fullName} onChange={(e) => setFullName(e.target.value)} />
            <TextField label="Date of birth" required type="date" value={dateOfBirth} error={errors.dateOfBirth} onChange={(e) => setDob(e.target.value)} />
            <SelectField
              label="Gender"
              value={gender}
              error={errors.gender}
              onChange={(e) => setGender(e.target.value)}
              options={[{ value: '', label: 'Choose…' }, ...GENDERS.map((g) => ({ value: g, label: g }))]}
            />
            <TextField
              label="Mobile number"
              required
              inputMode="tel"
              autoComplete="off"
              placeholder="+919876543210"
              hint="International format. Verified by OTP when the doctor first signs in."
              value={mobileNumber}
              error={errors.mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
            />
            <TextField
              label="Email address"
              required
              type="email"
              autoComplete="off"
              hint="Verified by a link the doctor receives."
              value={email}
              error={errors.email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <fieldset className="checkGroup">
            <legend>
              Languages for consultation <span className="req">*</span>
            </legend>
            {LANGUAGES.map((l) => (
              <label key={l} className="checkOption">
                <input
                  type="checkbox"
                  checked={languages.includes(l)}
                  onChange={(e) =>
                    setLanguages((cur) => (e.target.checked ? [...cur, l] : cur.filter((x) => x !== l)))
                  }
                />
                {l}
              </label>
            ))}
          </fieldset>
          {errors.languages ? (
            <p className="fieldError">{errors.languages}</p>
          ) : (
            <p className="fieldHint">
              Language is never relaxed in assignment, so a doctor with none set cannot be matched
              to anyone.
            </p>
          )}
        </Card>

        <Card title="Proof of identity">
          <div className="formGrid">
            <SelectField
              label="Government ID type"
              value={idType}
              error={errors.idType}
              onChange={(e) => setIdType(e.target.value)}
              options={[{ value: '', label: 'Choose…' }, ...ID_TYPES.map((t) => ({ value: t, label: t }))]}
            />
            <TextField label="Government ID number" required autoComplete="off" value={idNumber} error={errors.idNumber} onChange={(e) => setIdNumber(e.target.value)} />
            <TextField
              label="ABHA ID / ABHA address (optional)"
              value={abhaId}
              hint="Does not block registration."
              onChange={(e) => setAbhaId(e.target.value)}
            />
          </div>
          <FileField
            label="Government ID document"
            required
            types={DOC_TYPES}
            maxMb={5}
            file={idDocument}
            error={errors.idDocument}
            onChange={setIdDocument}
            hint="PDF, JPG or PNG. Private — used only for verification."
          />
        </Card>

        <Card title="Professional qualifications">
          <div className="formGrid">
            <SelectField
              label="Specialty"
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              options={[
                { value: '', label: specialties.loading ? 'Loading…' : 'Not set' },
                ...(specialties.data ?? []).map((s) => ({ value: s.id, label: s.name })),
              ]}
              hint={
                selected ? (
                  <>
                    Decides{' '}
                    <strong>
                      whether this doctor may prescribe
                      {selected.mayPrescribe === false ? ' — this one may not' : ''}
                    </strong>
                    .
                  </>
                ) : (
                  'Decides which registration form applies and whether the doctor may prescribe.'
                )
              }
            />
            <TextField
              label="Registration number"
              value={registrationNumber}
              hint="Required by some specialties — the specialty decides."
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />
            <TextField
              label="Basic qualification"
              required
              placeholder="e.g. MBBS / BDS / B.Sc. Veterinary / BPT"
              value={basicQualification}
              error={errors.basicQualification}
              onChange={(e) => setBasic(e.target.value)}
            />
            <TextField
              label="PG specialisation (optional)"
              placeholder="e.g. MD Dermatology / MPT Orthopaedics"
              value={pgSpecialisation}
              onChange={(e) => setPg(e.target.value)}
            />
            <TextField
              label="Super specialisation (optional)"
              placeholder="e.g. DM Endocrinology"
              value={superSpecialisation}
              onChange={(e) => setSuper(e.target.value)}
            />
            <TextField
              label="Fellowship (optional)"
              placeholder="e.g. Fellowship in Diabetology"
              value={fellowship}
              onChange={(e) => setFellowship(e.target.value)}
            />
          </div>

          <div className="formGrid">
            <FileField
              label="Degree certificate"
              required
              types={DOC_TYPES}
              maxMb={5}
              file={degreeCertificate}
              error={errors.degreeCertificate}
              onChange={setDegree}
            />
            <FileField
              label="Registration certificate"
              required
              types={DOC_TYPES}
              maxMb={5}
              file={registrationCertificate}
              error={errors.registrationCertificate}
              onChange={setRegCert}
            />
          </div>
          <p className="fieldHint">
            Patients see only{' '}
            <strong>
              {[basicQualification, pgSpecialisation, superSpecialisation, fellowship]
                .map((x) => x.trim())
                .filter(Boolean)
                .join(' · ') || 'the qualification names entered above'}
            </strong>
            . The certificates stay private and are used only for verification.
          </p>
        </Card>

        <Card title="Experience">
          {experience.map((x, i) => (
            <div className="expEntry" key={i}>
              <div className="formGrid">
                <TextField
                  label="Designation"
                  required
                  value={x.designation}
                  error={errors[`exp${i}designation`]}
                  onChange={(e) => setEntry(i, { designation: e.target.value })}
                />
                <TextField
                  label="Name of institute"
                  required
                  value={x.institute}
                  error={errors[`exp${i}institute`]}
                  onChange={(e) => setEntry(i, { institute: e.target.value })}
                />
                <TextField
                  label="Years of experience"
                  required
                  inputMode="numeric"
                  value={x.years}
                  error={errors[`exp${i}years`]}
                  onChange={(e) => setEntry(i, { years: e.target.value })}
                />
              </div>
              <FileField
                label="Experience certificate"
                required
                types={DOC_TYPES}
                maxMb={5}
                file={x.certificate}
                error={errors[`exp${i}certificate`]}
                onChange={(f) => setEntry(i, { certificate: f })}
              />
              {experience.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setExperience((cur) => cur.filter((_, j) => j !== i))}
                >
                  Remove this experience
                </Button>
              )}
            </div>
          ))}

          <div className="formActions">
            <Button type="button" variant="secondary" icon="plus" onClick={() => setExperience((c) => [...c, blankExperience()])}>
              Add another experience
            </Button>
          </div>
          <p className="fieldHint">
            Patients see only <strong>{total} {total === 1 ? 'Year' : 'Years'} of Experience</strong> — never the
            institution, designation or certificates.
          </p>
        </Card>

        <Card title="Digital signature">
          <FileField
            label="Upload signature for prescription (optional)"
            types={SIGNATURE_TYPES}
            maxMb={2}
            file={signature}
            onChange={setSignature}
            hint="JPG or PNG; a transparent-background PNG is preferred. Kept private and placed automatically on this doctor's prescriptions once approved."
          />
        </Card>

        <Card title="Commercials">
          <div className="formGrid">
            <TextField
              label="Consultation fee (₹)"
              inputMode="numeric"
              value={payoutFeeInr}
              error={errors.payoutFeeInr}
              hint="The doctor keeps all of it. The platform's revenue is the convenience fee."
              onChange={(e) => setPayout(e.target.value)}
            />
            <TextField
              label="Consultation duration (minutes)"
              inputMode="numeric"
              value={duration}
              error={errors.duration}
              hint="Feeds assignability — duration plus buffer decides who is bookable for a slot."
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </Card>

        <div className="formActions">
          <Button variant="ghost" type="button" onClick={() => navigate('/providers')}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={create.busy}>
            Create doctor
          </Button>
        </div>
      </form>
    </>
  );
}
