import type { VerificationProgress } from '@coracure/api';

import { itemsFromProgress, screenStatus } from './verification';
import { demoRegistration } from './registration';

/**
 * The account-status screen, driven by the server.
 *
 * What is pinned here is the thing the old screen got wrong: it invented the
 * rejection reasons. Every rejected doctor was shown "Name mismatch" and
 * "Document unclear" whatever an admin had actually written, so the real reason
 * never reached the person who had to act on it.
 */

const draft = demoRegistration('9876543210');

const doc = (over: Partial<VerificationProgress['documents'][number]>) =>
  ({
    id: 'doc-1',
    documentType: 'identity_proof',
    fileName: 'aadhaar.pdf',
    reviewStatus: 'pending',
    rejectionReason: null,
    verifiedByAdminId: null,
    verifiedAt: null,
    uploadedAt: '2026-05-15T00:00:00.000Z',
    ...over,
  }) as VerificationProgress['documents'][number];

const progress = (over: Partial<VerificationProgress> = {}): VerificationProgress =>
  ({
    doctorId: 'd-1',
    status: 'under_review',
    required: [],
    approved: [],
    outstanding: [],
    rejected: [],
    registrationNumberRequired: true,
    registrationNumberMissing: false,
    readyForVerification: false,
    documents: [],
    ...over,
  }) as VerificationProgress;

const byKey = (items: ReturnType<typeof itemsFromProgress>, key: string) =>
  items.find((i) => i.key === key)!;

/* ------------------------------ the real reason --------------------------- */

test("shows the admin's own rejection reason, not a canned one", () => {
  const items = itemsFromProgress(
    progress({
      documents: [
        doc({
          documentType: 'degree_certificate',
          reviewStatus: 'rejected',
          rejectionReason: 'The MD certificate is a photo of a photocopy — send the original.',
        }),
      ],
    }),
    draft,
  );

  const row = byKey(items, 'qualifications');
  expect(row.state).toBe('issue');
  expect(row.issueLabel).toBe('The MD certificate is a photo of a photocopy — send the original.');
  // The two fixtures the old screen always showed.
  expect(items.map((i) => i.issueLabel)).not.toContain('Name mismatch');
  expect(items.map((i) => i.issueLabel)).not.toContain('Document unclear');
});

test('falls back to a plain label when an admin rejected without typing a reason', () => {
  const items = itemsFromProgress(
    progress({
      documents: [doc({ reviewStatus: 'rejected', rejectionReason: null })],
    }),
    draft,
  );

  expect(byKey(items, 'identity').issueLabel).toBe('Needs correction');
});

test('a rejection outranks an approved document in the same section', () => {
  const items = itemsFromProgress(
    progress({
      documents: [
        doc({ id: 'a', documentType: 'degree_certificate', reviewStatus: 'approved' }),
        doc({
          id: 'b',
          documentType: 'degree_certificate',
          reviewStatus: 'rejected',
          rejectionReason: 'The DNB certificate is unreadable.',
        }),
      ],
    }),
    draft,
  );

  // Burying the rejection under its approved sibling is how a resubmission
  // goes out still missing the fix.
  expect(byKey(items, 'qualifications')).toMatchObject({
    state: 'issue',
    issueLabel: 'The DNB certificate is unreadable.',
  });
});

/* -------------------------------- the states ------------------------------ */

test('a section is verified only when every document in it is approved', () => {
  const items = itemsFromProgress(
    progress({
      documents: [
        doc({ id: 'a', documentType: 'degree_certificate', reviewStatus: 'approved' }),
        doc({ id: 'b', documentType: 'degree_certificate', reviewStatus: 'pending' }),
      ],
    }),
    draft,
  );

  expect(byKey(items, 'qualifications').state).toBe('underReview');
});

test('a document the server still wants reads as not uploaded, not as under review', () => {
  const items = itemsFromProgress(progress({ outstanding: ['experience_letter'] }), draft);

  // "Under review" on something that was never received leaves a doctor
  // waiting on an admin who is waiting on them.
  expect(byKey(items, 'experience')).toMatchObject({
    state: 'issue',
    issueLabel: 'Not yet uploaded',
  });
});

test('surfaces the registration number the doctor cannot add themselves', () => {
  const items = itemsFromProgress(progress({ registrationNumberMissing: true }), draft);

  // Without this the screen shows four green rows and a stalled account.
  expect(byKey(items, 'registration-number')).toMatchObject({
    state: 'issue',
    issueLabel: 'With the Coracure team',
  });
});

test('leaves the number off once an admin has set it', () => {
  const items = itemsFromProgress(progress({ registrationNumberMissing: false }), draft);

  expect(items.find((i) => i.key === 'registration-number')).toBeUndefined();
  expect(items).toHaveLength(4);
});

/* ------------------------------ without a draft --------------------------- */

test('still describes each section for a doctor signing in on a new device', () => {
  const items = itemsFromProgress(progress({ outstanding: ['profile_photo'] }));

  // No local draft: the rows must still say what is outstanding rather than
  // rendering four blank lines.
  expect(items).toHaveLength(4);
  items.forEach((i) => expect(i.body.length).toBeGreaterThan(0));
  expect(byKey(items, 'basic').state).toBe('issue');
});

/* -------------------------------- the status ------------------------------ */

test.each([
  ['verified', 'approved'],
  ['rejected', 'rejected'],
  ['under_review', 'pending'],
  ['pending', 'pending'],
])('maps the account status %s onto %s', (status, expected) => {
  expect(screenStatus(progress({ status: status as never }))).toBe(expected);
});

test('one rejected document puts the whole submission back on the doctor', () => {
  const p = progress({
    status: 'under_review',
    documents: [doc({ reviewStatus: 'rejected', rejectionReason: 'Blurred.' })],
  });

  // The ACCOUNT is still under review, but there is something to fix, and the
  // screen that says "we are reviewing it" would stall the doctor indefinitely.
  expect(screenStatus(p)).toBe('rejected');
});
