import {
  applyUpload,
  cancelRequest,
  isValidFileRecord,
  buildFulfilmentNotification,
  fulfilmentNotice,
  patientRequestNotice,
  newRequest,
  visibleDocs,
  patientDocs,
  type FileRecord,
} from './documents';

const file = (over: Partial<FileRecord> = {}): FileRecord => ({
  id: 'f1',
  requestId: 'rq-new',
  bytes: 1024,
  committed: true,
  ...over,
});

/* --------------------------- DOC-DOC-02 lifecycle -------------------------- */

test('a sent request starts Open and carries its provenance', () => {
  const r = newRequest();
  expect(r.status).toBe('open');
  expect(r.requestedBy).toBe('Dr. Arjun Mehta');
  expect(r.requestedOn).toBe('15 May 2024');
  expect(r.consultationId).toBe('CON-10482');
  expect(r.itemName).toBeTruthy();
  expect(r.reason).toBeTruthy();
});

test('the raising doctor may cancel an open request', () => {
  expect(cancelRequest(newRequest()).status).toBe('cancelled');
  // a fulfilled request is terminal and cannot be cancelled
  const done = applyUpload(newRequest(), file());
  expect(cancelRequest(done).status).toBe('fulfilled');
});

/* ------------------ DOC-DOC-03: fulfilment acceptance criteria ------------- */

test('status becomes fulfilled only once a valid file record exists', () => {
  const req = newRequest();

  // no upload at all
  expect(req.status).toBe('open');
  // an uncommitted (still-uploading) record does not complete anything
  expect(applyUpload(req, file({ committed: false })).status).toBe('open');
  // a zero-byte record is not a valid file
  expect(applyUpload(req, file({ bytes: 0 })).status).toBe('open');
  // a record belonging to a different request must not complete this one
  expect(applyUpload(req, file({ requestId: 'rq-other' })).status).toBe('open');

  const done = applyUpload(req, file());
  expect(done.status).toBe('fulfilled');
  expect(done.fileIds).toEqual(['f1']);
});

test('duplicate uploads do not create misleading completion states', () => {
  const once = applyUpload(newRequest(), file());
  const twice = applyUpload(once, file());

  // re-applying the same record is idempotent: no second completion
  expect(twice).toBe(once);
  expect(twice.fileIds).toHaveLength(1);

  // a genuinely different file still records, without duplicating status
  const withSecond = applyUpload(once, file({ id: 'f2' }));
  expect(withSecond.status).toBe('fulfilled');
  expect(withSecond.fileIds).toEqual(['f1', 'f2']);
});

test('a cancelled request is never revived by a late upload', () => {
  const cancelled = cancelRequest(newRequest());
  expect(applyUpload(cancelled, file()).status).toBe('cancelled');
});

test('notifications never name a diagnosis or the clinical reason', () => {
  const req = newRequest();
  const n = buildFulfilmentNotification(req, file(), 'Rahul Sharma', 'Sleep Tracking Report');

  expect(n).not.toBeNull();
  expect(n!.body).toBe('Rahul Sharma uploaded Sleep Tracking Report. Open CoraCure to review it.');
  // the request's reason text must not leak into the notification
  expect(n!.body).not.toContain('medication history');
  [/diagnos/i, /depress/i, /anxiet/i, /psychiat/i].forEach((re) => {
    expect(n!.body).not.toMatch(re);
    expect(patientRequestNotice('Dr. Arjun Mehta')).not.toMatch(re);
  });
});

test('opening a notification routes to the authorised request and document', () => {
  const req = newRequest();
  const n = buildFulfilmentNotification(req, file(), 'Rahul Sharma', 'Sleep Tracking Report')!;
  expect(n.requestId).toBe(req.id);
  expect(n.docId).toBe('f1');
});

test('no notification is raised when the upload did not fulfil the request', () => {
  const req = newRequest();
  expect(buildFulfilmentNotification(req, file({ bytes: 0 }), 'Rahul Sharma', 'X')).toBeNull();
  expect(
    buildFulfilmentNotification(cancelRequest(req), file(), 'Rahul Sharma', 'X')
  ).toBeNull();
});

test('fulfilment copy names the document, not the condition', () => {
  expect(fulfilmentNotice('Rahul Sharma', 'Lab Report')).toBe(
    'Rahul Sharma uploaded Lab Report. Open CoraCure to review it.'
  );
});

test('isValidFileRecord guards all three conditions', () => {
  expect(isValidFileRecord(file(), 'rq-new')).toBe(true);
  expect(isValidFileRecord(file({ committed: false }), 'rq-new')).toBe(false);
  expect(isValidFileRecord(file({ bytes: 0 }), 'rq-new')).toBe(false);
  expect(isValidFileRecord(file(), 'rq-other')).toBe(false);
});

/* ---------------------------- DOC-DOC-01 access --------------------------- */

test('only files inside the assigned care relationship are visible', () => {
  const withForeign = [...patientDocs, { ...patientDocs[0], id: 'x1', assigned: false }];
  const shown = visibleDocs(withForeign);
  expect(shown.every((d) => d.assigned)).toBe(true);
  expect(shown.find((d) => d.id === 'x1')).toBeUndefined();
});
