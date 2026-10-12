import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http', () => ({ request: vi.fn() }));

import { request } from './http';
import {
  categoryOf,
  doctorFromLive,
  documentOf,
  isWebUrl,
  languageCodes,
  registrationFrom,
  liveDoctors,
  profilePatchBody,
  queueRowOf,
  rosterAll,
  rosterParams,
  type LiveCredential,
  type LiveProvider,
  type LiveRegistration,
} from './liveProviders';

/**
 * The panel's side of the provider contract: `AdminRosterRow`,
 * `AdminDoctorDetail`, `CredentialSummary` and the decision DTOs. The network is
 * replaced by a recorder, so these pin what is sent and how a row is read.
 */

const mocked = vi.mocked(request);

const row = (over: Partial<LiveProvider> = {}): LiveProvider => ({
  id: 'doc-1',
  fullName: 'Dr Asha Menon',
  mobileNumber: '+919876543210',
  mobileVerifiedAt: '2026-10-01T08:00:00.000Z',
  bio: null,
  languages: ['en', 'hi'],
  verificationStatus: 'under_review',
  registrationNumber: 'KMC-1234',
  registrationCouncil: 'Karnataka Medical Council',
  qualification: 'MBBS, MD',
  yearsOfExperience: 12,
  seniorityLevel: 'standard',
  specialtyId: 'sp-1',
  superSpecialtyId: null,
  providerCode: 'PRV-0007',
  changesRequestedNote: null,
  payoutFeeInr: 400,
  consultationDurationMinutes: 20,
  bufferMinutes: 5,
  isListed: false,
  photoUrl: null,
  createdAt: '2026-09-20T10:00:00.000Z',
  category: 'medical',
  specialtyName: 'General Medicine',
  superSpecialtyName: null,
  rating: 4.5,
  totalConsultations: 31,
  availability: 'available_now',
  pendingDocumentCount: 2,
  submittedAt: '2026-09-21T09:00:00.000Z',
  ...over,
});

// Braces matter: vitest runs a function returned from a hook as its cleanup, and mockReset() returns the mock.
beforeEach(() => {
  mocked.mockReset();
});

describe('categoryOf', () => {
  it('folds medical and super-specialty into Doctor, and keeps the other two', () => {
    expect(categoryOf('medical')).toBe('doctor');
    expect(categoryOf('super_specialty')).toBe('doctor');
    expect(categoryOf('paramedical')).toBe('paramedical');
    expect(categoryOf('veterinary')).toBe('veterinary');
    expect(categoryOf(null)).toBe('doctor');
  });
});

describe('doctorFromLive', () => {
  it('reads the roster row into the panel provider, with the language names', () => {
    expect(doctorFromLive(row())).toMatchObject({
      id: 'doc-1',
      providerCode: 'PRV-0007',
      category: 'doctor',
      specialtyName: 'General Medicine',
      languages: ['English', 'Hindi'],
      seniority: 'standard',
      payoutFeeInr: 400,
      availabilityStatus: 'available',
      rating: 4.5,
      totalConsultations: 31,
    });
  });

  it('calls everything but available_now Unavailable', () => {
    for (const a of ['busy', 'offline', 'paused', 'scheduled_only'] as const) {
      expect(doctorFromLive(row({ availability: a })).availabilityStatus, a).toBe('unavailable');
    }
  });

  it('maps the signature card and keeps the file for the preview link', () => {
    const d = doctorFromLive(
      row({
        signature: { status: 'pending_review', documentId: 'sig-9', uploadedAt: null, reviewedAt: null, reason: null },
      }),
    );
    expect(d.signatureStatus).toBe('submitted');
    expect(d.signatureDocumentId).toBe('sig-9');
    expect(d.registration?.hasSignature).toBe(true);
    expect(doctorFromLive(row({ signature: { status: 'not_uploaded', documentId: null, uploadedAt: null, reviewedAt: null, reason: null } })).registration?.hasSignature).toBe(false);
  });

  it('takes the rejection reason from the credentials call, which the detail does not carry', () => {
    const progress = {
      doctorId: 'doc-1',
      status: 'rejected' as const,
      rejectionReason: 'Registration number does not match the council record.',
      changesRequestedNote: null,
      registrationNumberMissing: false,
      readyForVerification: false,
      documents: [],
    };
    expect(doctorFromLive(row({ verificationStatus: 'rejected' }), progress).rejectionReason).toBe(progress.rejectionReason);
    expect(doctorFromLive(row()).rejectionReason).toBeNull();
  });

  it('shows the note the reviewer left while changes are required', () => {
    const d = doctorFromLive(row({ verificationStatus: 'changes_required', changesRequestedNote: 'Re-upload the full page.' }));
    expect(d.changesRequiredNote).toBe('Re-upload the full page.');
  });

  it('does not invent a date of birth, gender, e-mail or ID when the registration was not read', () => {
    const d = doctorFromLive(row());
    expect(d.email).toBeNull();
    expect(d.registration?.dateOfBirth).toBeUndefined();
    expect(d.registration?.gender).toBeUndefined();
    expect(d.registration?.idType).toBeUndefined();
    expect(d.registration?.experience).toBeUndefined();
    expect(d.registration?.mobileVerified).toBe(true);
  });
});

const stated = (over: Partial<LiveRegistration> = {}): LiveRegistration => ({
  dateOfBirth: '1988-04-09',
  gender: 'female',
  email: 'asha@example.test',
  identity: { idType: 'aadhaar', idTypeName: null, numberLast4: '4321', abhaId: '14-1111-2222-3333' },
  qualifications: { basicQualification: 'MBBS', pgSpecialisation: 'MD Medicine', superSpecialisation: null, fellowship: 'Diabetes' },
  experience: [{ designation: 'Consultant', institution: 'City Hospital', years: 6.5 }],
  signatureDocumentId: 'sig-1',
  ...over,
});

describe('the registration the provider stated', () => {
  it('fills the Basic details, Identity, Qualifications and Experience cards', () => {
    const d = doctorFromLive(row(), null, stated());
    expect(d.email).toBe('asha@example.test');
    expect(d.registration).toMatchObject({
      loaded: true,
      dateOfBirth: '1988-04-09',
      gender: 'Female',
      idType: 'Aadhaar',
      idNumberLast4: '4321',
      abhaId: '14-1111-2222-3333',
      basicQualification: 'MBBS',
      pgSpecialisation: 'MD Medicine',
      superSpecialisation: null,
      fellowship: 'Diabetes',
      experience: [{ designation: 'Consultant', institution: 'City Hospital', years: 6.5 }],
      mobileVerified: true,
    });
  });

  it('names the document when the ID type is other, and says Prefer not to say for undisclosed', () => {
    const r = registrationFrom(
      stated({ gender: 'undisclosed', identity: { idType: 'other', idTypeName: 'Ration card', numberLast4: '0042', abhaId: null } }),
      row(),
    );
    expect(r.idType).toBe('Ration card');
    expect(r.gender).toBe('Prefer not to say');
  });

  it('leaves identity and qualifications empty for a provider who has not filled them in', () => {
    const r = registrationFrom(stated({ identity: null, qualifications: null, experience: [], dateOfBirth: null, gender: null }), row());
    expect(r).toMatchObject({ idType: null, idNumberLast4: null, basicQualification: null, experience: [], dateOfBirth: null, gender: null });
    expect(r.loaded).toBe(true);
  });

  it('is not marked loaded when the call was refused, so the card can say why', () => {
    expect(doctorFromLive(row(), null, null).registration?.loaded).toBeUndefined();
  });
});

describe('the profile photo', () => {
  const link = 'https://files.example/photo.jpg?sig=1';

  it('is the signed link the backend sends once a photo is approved, on the list and the worklist', () => {
    expect(doctorFromLive(row({ photoUrl: link })).photoUrl).toBe(link);
    expect(doctorFromLive(row({ photoUrl: link })).registration?.hasPhoto).toBe(true);
    expect(queueRowOf(row({ photoUrl: link })).photoUrl).toBe(link);
  });

  it('is absent until an admin approves one', () => {
    expect(doctorFromLive(row()).photoUrl).toBeNull();
    expect(doctorFromLive(row()).registration?.hasPhoto).toBe(false);
  });

  it('is dropped if it is not a web address, because it ends up in an image src', () => {
    expect(doctorFromLive(row({ photoUrl: 'javascript:alert(1)' })).photoUrl).toBeNull();
  });
});

describe('queueRowOf and documentOf', () => {
  it('makes a worklist row with the document count and the first submission', () => {
    expect(queueRowOf(row())).toEqual({
      doctorId: 'doc-1',
      fullName: 'Dr Asha Menon',
      specialtyName: 'General Medicine',
      category: 'doctor',
      verificationStatus: 'under_review',
      pendingDocuments: 2,
      submittedAt: '2026-09-21T09:00:00.000Z',
      photoUrl: null,
    });
  });

  it('reads a credential, with the file name where the fixtures had a file id', () => {
    const c: LiveCredential = {
      id: 'cred-1',
      documentType: 'degree_certificate',
      fileName: 'mbbs.pdf',
      reviewStatus: 'rejected',
      rejectionReason: 'Cropped.',
      verifiedAt: '2026-10-02T10:00:00.000Z',
      uploadedAt: '2026-09-21T09:00:00.000Z',
    };
    expect(documentOf(c)).toEqual({
      id: 'cred-1',
      documentType: 'degree_certificate',
      status: 'rejected',
      fileId: 'mbbs.pdf',
      rejectionReason: 'Cropped.',
      uploadedAt: '2026-09-21T09:00:00.000Z',
      reviewedAt: '2026-10-02T10:00:00.000Z',
    });
  });
});

describe('rosterParams', () => {
  it('asks for the backend page ceiling, ordered by name, one category at a time', () => {
    expect(rosterParams({}, 'paramedical', 100)).toEqual({
      limit: 100,
      offset: 100,
      sort: 'name',
      category: 'paramedical',
      verificationStatus: undefined,
      isListed: undefined,
      search: undefined,
    });
  });

  it('passes a status, a listing flag and a trimmed search, and drops anything else', () => {
    const p = rosterParams({ verificationStatus: 'verified', isListed: 'false', search: '  asha ' }, undefined, 0);
    expect(p).toMatchObject({ verificationStatus: 'verified', isListed: 'false', search: 'asha', category: undefined });
    expect(rosterParams({ isListed: 'maybe' }, undefined, 0).isListed).toBeUndefined();
  });
});

describe('rosterAll', () => {
  it('pages until it has every row', async () => {
    const page = (ids: string[], total: number) => ({ items: ids.map((id) => row({ id })), total, limit: 100, offset: 0 });
    mocked.mockResolvedValueOnce(page(['a', 'b'], 3)).mockResolvedValueOnce(page(['c'], 3));
    const rows = await rosterAll({});
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it('fetches each category and de-duplicates a provider that appears twice', async () => {
    const one = (id: string) => ({ items: [row({ id })], total: 1, limit: 100, offset: 0 });
    mocked.mockResolvedValueOnce(one('a')).mockResolvedValueOnce(one('a'));
    const rows = await rosterAll({ categories: ['medical', 'super_specialty'] });
    expect(rows).toHaveLength(1);
    const cats = mocked.mock.calls.map((c) => (c[1] as { query: { category: string } }).query.category);
    expect(cats.sort()).toEqual(['medical', 'super_specialty']);
  });

  it('stops on an empty page instead of looping', async () => {
    mocked.mockResolvedValue({ items: [], total: 5, limit: 100, offset: 0 });
    expect(await rosterAll({})).toEqual([]);
    expect(mocked).toHaveBeenCalledTimes(1);
  });
});

describe('liveDoctors.get', () => {
  const detail = row({ signature: { status: 'not_uploaded', documentId: null, uploadedAt: null, reviewedAt: null, reason: null } });
  const refused = (statusCode: number) => Object.assign(new Error('no'), { statusCode });

  it('reads the detail, the credentials and the registration together', async () => {
    mocked.mockImplementation(async (path: string) => {
      if (path.endsWith('/credentials')) return { doctorId: 'doc-1', status: 'rejected', rejectionReason: 'Blurred.', changesRequestedNote: null, registrationNumberMissing: false, readyForVerification: false, documents: [] };
      if (path.endsWith('/registration')) return stated();
      return detail;
    });
    const d = await liveDoctors.get('doc-1');
    expect(d.rejectionReason).toBe('Blurred.');
    expect(d.registration?.idNumberLast4).toBe('4321');
    expect(mocked.mock.calls.map((c) => c[0]).sort()).toEqual([
      '/admin/doctors/doc-1',
      '/admin/doctors/doc-1/credentials',
      '/admin/doctors/doc-1/registration',
    ]);
  });

  it('still opens when a role may not read the registration, or the backend has no such route yet', async () => {
    for (const status of [403, 404]) {
      mocked.mockImplementation(async (path: string) => {
        if (path.endsWith('/registration') || path.endsWith('/credentials')) throw refused(status);
        return detail;
      });
      const d = await liveDoctors.get('doc-1');
      expect(d.fullName, String(status)).toBe('Dr Asha Menon');
      expect(d.registration?.loaded).toBeUndefined();
    }
  });

  it('does not hide a real failure of the detail itself', async () => {
    mocked.mockImplementation(async (path: string) => {
      if (path === '/admin/doctors/doc-1') throw refused(500);
      return null;
    });
    await expect(liveDoctors.get('doc-1')).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('decision bodies', () => {
  beforeEach(() => {
    mocked.mockResolvedValue(undefined);
  });

  const last = () => mocked.mock.calls.at(-1) as [string, { method?: string; body?: unknown }];

  it('approves a credential with nothing else, and rejects with a trimmed reason', async () => {
    await liveDoctors.reviewCredential('cred-1', true, 'ignored');
    expect(last()).toEqual(['/admin/doctors/credentials/cred-1/review', { method: 'POST', body: { approved: true } }]);
    await liveDoctors.reviewCredential('cred-1', false, '  Cropped. ');
    expect(last()[1].body).toEqual({ approved: false, rejectionReason: 'Cropped.' });
  });

  it('sends exactly the one field each decision DTO takes', async () => {
    await liveDoctors.reject('d 1', ' no ');
    expect(last()).toEqual(['/admin/doctors/d%201/reject', { method: 'POST', body: { reason: 'no' } }]);
    await liveDoctors.requestChanges('d1', ' fix it ');
    expect(last()).toEqual(['/admin/doctors/d1/request-changes', { method: 'POST', body: { note: 'fix it' } }]);
    await liveDoctors.suspend('d1', ' away ');
    expect(last()).toEqual(['/admin/doctors/d1/suspend', { method: 'POST', body: { reason: 'away' } }]);
    await liveDoctors.setListing('d1', true);
    expect(last()).toEqual(['/admin/doctors/d1/listing', { method: 'PATCH', body: { isListed: true } }]);
    await liveDoctors.setSeniority('d1', 'expert');
    expect(last()).toEqual(['/admin/doctors/d1/seniority', { method: 'PATCH', body: { seniorityLevel: 'expert' } }]);
  });

  it('approves a signature bare, and asks for a replacement with a reason', async () => {
    await liveDoctors.setSignature('d1', 'approved');
    expect(last()).toEqual(['/admin/doctors/d1/signature/approve', { method: 'POST', body: {} }]);
    await liveDoctors.setSignature('d1', 'replacement_requested', ' too faint ');
    expect(last()).toEqual([
      '/admin/doctors/d1/signature/request-replacement',
      { method: 'POST', body: { reason: 'too faint' } },
    ]);
  });
});

describe('profilePatchBody', () => {
  it('sends only the fields given, and never an empty or non-numeric one', () => {
    expect(profilePatchBody({ payoutFeeInr: 500 })).toEqual({ payoutFeeInr: 500 });
    expect(profilePatchBody({ payoutFeeInr: Number.NaN, consultationDurationMinutes: 25 })).toEqual({
      consultationDurationMinutes: 25,
    });
    expect(profilePatchBody({})).toEqual({});
  });

  it('turns language names back into the codes the backend validates', () => {
    expect(profilePatchBody({ languages: ['English', 'hindi', 'ta'] })).toEqual({ languages: ['en', 'hi', 'ta'] });
  });

  it('refuses a language the platform does not have rather than sending a 400', () => {
    expect(() => profilePatchBody({ languages: ['English', 'Klingon'] })).toThrow(/Klingon/);
  });
});

describe('languageCodes', () => {
  it('accepts names or codes in any case, drops blanks and repeats', () => {
    expect(languageCodes('English, HI, , hindi, Hinglish')).toEqual({ codes: ['en', 'hi', 'hinglish'], unknown: [] });
  });

  it('lists what it could not read', () => {
    expect(languageCodes('Tamil, Elvish')).toEqual({ codes: ['ta'], unknown: ['Elvish'] });
  });
});

describe('isWebUrl', () => {
  it('opens only http and https links', () => {
    expect(isWebUrl('https://files.example/c?sig=1')).toBe(true);
    expect(isWebUrl('http://localhost:9000/c')).toBe(true);
    expect(isWebUrl('javascript:alert(1)')).toBe(false);
    expect(isWebUrl('data:text/html,hi')).toBe(false);
    expect(isWebUrl('')).toBe(false);
  });
});
