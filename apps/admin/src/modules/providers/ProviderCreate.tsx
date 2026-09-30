import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { catalogue, doctors, type Specialty } from '../../api/admin';
import { useMutation, useResource } from '../../lib/useResource';
import { useToast } from '../../lib/toast';
import type { AdminLevel } from '../../nav';
import {
  Button,
  Card,
  Notice,
  PageHeader,
  SelectField,
  TextField,
} from '../../ui';

/**
 * Create a provider account (§16).
 *
 * The mobile number is the doctor's SIGN-IN IDENTIFIER — an unknown number at
 * `POST /auth/doctor/otp/request` is refused rather than texted a code, so a
 * typo here means the doctor cannot sign in at all. That is why it is
 * validated against the backend's own E.164 pattern before the request goes.
 */

/** Verbatim from the backend's `VerifyOtpDto` / doctor DTO. */
const E164 = /^\+[1-9]\d{7,14}$/;

type Errors = Partial<Record<'mobileNumber' | 'fullName' | 'yearsOfExperience' | 'payoutFeeInr' | 'consultationDurationMinutes', string>>;

export function ProviderCreate({ level }: { level: AdminLevel }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [mobileNumber, setMobileNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [qualification, setQualification] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [yearsOfExperience, setYears] = useState('');
  const [languages, setLanguages] = useState('');
  const [payoutFeeInr, setPayout] = useState('');
  const [duration, setDuration] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const specialtyFetcher = useCallback(() => catalogue.specialties(), []);
  const specialties = useResource<Specialty[]>(specialtyFetcher, []);

  const create = useMutation(doctors.create);

  const selected = specialties.data?.find((s) => s.id === specialtyId);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!E164.test(mobileNumber.trim()))
      next.mobileNumber = 'Use international format, e.g. +919876543210.';
    if (fullName.trim().length < 2) next.fullName = 'Enter the provider’s full name.';
    if (yearsOfExperience && Number.isNaN(Number(yearsOfExperience)))
      next.yearsOfExperience = 'Enter a number of years.';
    if (payoutFeeInr && Number.isNaN(Number(payoutFeeInr)))
      next.payoutFeeInr = 'Enter an amount in rupees.';
    if (duration && Number.isNaN(Number(duration)))
      next.consultationDurationMinutes = 'Enter a number of minutes.';
    return next;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      // Built field by field — form state is never spread into the body (§55).
      const created = await create.mutate({
        mobileNumber: mobileNumber.trim(),
        fullName: fullName.trim(),
        ...(specialtyId ? { specialtyId } : {}),
        ...(qualification.trim() ? { qualification: qualification.trim() } : {}),
        ...(registrationNumber.trim() ? { registrationNumber: registrationNumber.trim() } : {}),
        ...(yearsOfExperience ? { yearsOfExperience: Number(yearsOfExperience) } : {}),
        ...(languages.trim()
          ? { languages: languages.split(',').map((l) => l.trim()).filter(Boolean) }
          : {}),
        ...(payoutFeeInr ? { payoutFeeInr: Number(payoutFeeInr) } : {}),
        ...(duration ? { consultationDurationMinutes: Number(duration) } : {}),
      });
      toast.success(`${created.fullName} created. They are pending verification.`);
      navigate(`/providers/${created.id}`);
    } catch (e) {
      // The form keeps everything the admin typed (§50).
      toast.fromError(e, 'Could not create this provider.');
    }
  };

  return (
    <>
      <PageHeader
        title="Add a provider"
        back={{ to: '/providers', label: 'Providers' }}
        crumbs={[{ label: 'Providers', to: '/providers' }, { label: 'Add a provider' }]}
        description="The account is created pending verification and unlisted. The doctor can sign in immediately and will land on their credential screen."
      />

      <form onSubmit={submit} noValidate>
        <Card title="Identity">
          <Notice tone="warning">
            The mobile number is the provider’s sign-in identifier. If it is wrong they cannot sign
            in at all — an unknown number is refused rather than sent a code.
          </Notice>

          <div className="formGrid">
            <TextField
              label="Mobile number"
              required
              inputMode="tel"
              autoComplete="off"
              placeholder="+919876543210"
              hint="International format, including the country code."
              value={mobileNumber}
              error={errors.mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
            />
            <TextField
              label="Full name"
              required
              value={fullName}
              error={errors.fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
        </Card>

        <Card title="Practice">
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
                    Decides which credentials are mandatory and{' '}
                    <strong>
                      whether this provider may prescribe
                      {selected.mayPrescribe === false ? ' — this one may not' : ''}
                    </strong>
                    .
                  </>
                ) : (
                  'Decides which registration form applies and whether the provider may prescribe.'
                )
              }
            />
            <TextField
              label="Qualification"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
            />
            <TextField
              label="Registration number"
              value={registrationNumber}
              hint="Required by some specialties — the specialty decides."
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />
            <TextField
              label="Years of experience"
              inputMode="numeric"
              value={yearsOfExperience}
              error={errors.yearsOfExperience}
              onChange={(e) => setYears(e.target.value)}
            />
            <TextField
              label="Languages"
              value={languages}
              hint="Comma separated. Language is never relaxed in assignment, so a provider with none set cannot be matched to anyone."
              onChange={(e) => setLanguages(e.target.value)}
            />
          </div>
        </Card>

        <Card title="Commercials">
          <div className="formGrid">
            <TextField
              label="Consultation fee (₹)"
              inputMode="numeric"
              value={payoutFeeInr}
              error={errors.payoutFeeInr}
              hint="The provider keeps all of it. The platform's revenue is the convenience fee."
              onChange={(e) => setPayout(e.target.value)}
            />
            <TextField
              label="Consultation duration (minutes)"
              inputMode="numeric"
              value={duration}
              error={errors.consultationDurationMinutes}
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
            Create provider
          </Button>
        </div>
      </form>
    </>
  );
}
