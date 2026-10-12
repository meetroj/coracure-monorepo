import { describe, expect, it } from 'vitest';

import { caseFrom, expertFrom } from './liveClarification';
import { alertFrom, closeAlertBody, decisionFrom, followupDetailFrom, followupFrom, patientRefOf } from './liveCare';

/** Safety alerts, follow-ups and clarification cases as the panel reads the backend's rows. No network. */

const alert = {
  id: 'a1',
  alertType: 'red_flag' as const,
  consultationId: 'k1',
  patientInitials: 'A.M.',
  patientAge: 34,
  patientGender: 'female',
  reason: 'Chest pain reported',
  state: 'open' as const,
  acknowledgedAt: null,
  acknowledgedBy: null,
  closedAt: null,
  closingNote: null,
  escalatedAt: null,
  createdAt: '2026-10-12T08:00:00.000Z',
};

describe('safety alerts', () => {
  it('shows a masked identity, never a name', () => {
    expect(patientRefOf(alert)).toBe('A.M. · 34 · F');
    expect(patientRefOf({ patientInitials: null, patientAge: null, patientGender: null })).toBeNull();
  });

  it('reads an open alert, and an acknowledged one by the admin who took it', () => {
    expect(alertFrom(alert)).toMatchObject({ id: 'a1', alertType: 'red_flag', raisedAt: '2026-10-12T08:00:00.000Z', summary: 'Chest pain reported' });
    const taken = alertFrom({
      ...alert,
      state: 'acknowledged',
      acknowledgedAt: '2026-10-12T08:10:00.000Z',
      acknowledgedBy: { type: 'admin', id: 'adm-1' },
    });
    expect(taken.acknowledgedByAdminId).toBe('adm-1');
    // A provider who took it is not an admin id.
    expect(alertFrom({ ...alert, acknowledgedBy: { type: 'doctor', id: 'd-1' } }).acknowledgedByAdminId).toBeNull();
  });

  it('keeps what was done beside why it fired once it is closed', () => {
    const closed = alertFrom({ ...alert, state: 'closed', closedAt: '2026-10-12T09:00:00.000Z', closingNote: 'Called the patient.' });
    expect(closed.summary).toBe('Chest pain reported - Called the patient.');
  });

  it('requires what was done, within the backend limit', () => {
    expect(closeAlertBody(' Called. ')).toEqual({ closingNote: 'Called.' });
    expect(() => closeAlertBody(' ')).toThrow(/what was done/);
    expect(() => closeAlertBody('x'.repeat(2001))).toThrow(/2000/);
  });
});

describe('follow-ups', () => {
  const row = {
    consultationId: 'k1',
    referenceCode: 'CC-0001',
    patient: { id: 'p1', fullName: null },
    doctor: null,
    pathway: null,
    startsOn: '2026-10-10',
    endsOn: '2026-10-24',
    followupStatus: 'active' as const,
    followupState: 'provider_review_pending' as const,
    latestCheckin: { date: '2026-10-12', status: 'amber' as const, reviewed: false },
    openAlertCount: 1,
  };

  it('names a patient, provider and pathway the backend had none for', () => {
    expect(followupFrom(row)).toMatchObject({
      id: 'k1',
      patientName: 'Unnamed patient',
      providerName: 'Not assigned',
      pathwayName: 'No pathway',
      state: 'provider_review_pending',
      openAlerts: 1,
    });
  });

  it('carries the timeline and the alerts into the detail', () => {
    const d = followupDetailFrom({ ...row, durationDays: 14, todayIsDay: 3, checkins: [], alerts: [] });
    expect(d).toMatchObject({ durationDays: 14, todayIsDay: 3, checkins: [], alerts: [] });
  });
});

describe('clarification cases', () => {
  const live = {
    id: 'cc1',
    title: 'Persistent cough',
    topic: null,
    specificDoubt: 'Is a chest X-ray warranted?',
    urgency: 'urgent',
    status: 'awaiting_response',
    panelStatus: 'awaiting' as const,
    expertDoctorId: 'd9',
    postedAt: '2026-10-11T08:00:00.000Z',
    assignedAt: '2026-10-11T09:00:00.000Z',
    closedAt: null,
    messagesTotal: 3,
    createdAt: '2026-10-11T07:00:00.000Z',
  };

  it('shows the panel status and the expert holding it, by name when the expert list has one', () => {
    const c = caseFrom(live, new Map([['d9', 'Dr Ravi Kulkarni']]));
    expect(c).toMatchObject({ status: 'awaiting', assignedExpertId: 'd9', assignedExpertName: 'Dr Ravi Kulkarni', messagesTotal: 3, question: 'Is a chest X-ray warranted?' });
    expect(caseFrom(live).assignedExpertName).toBeNull();
  });

  it('falls back to the title when the case has no topic, and is unassigned without an expert', () => {
    const c = caseFrom({ ...live, expertDoctorId: null });
    expect(c.specialtyName).toBe('Persistent cough');
    expect(c.assignedExpertId).toBeNull();
  });

  it('lists an expert with how much they already hold', () => {
    expect(expertFrom({ id: 'd9', fullName: 'Dr Ravi Kulkarni', specialtyId: 's1', openCases: 2 })).toMatchObject({ doctorId: 'd9', openCases: 2 });
  });
});

describe('allocation decisions', () => {
  const at = '2026-10-12T09:00:00.000Z';
  const names = new Map([['d1', 'Dr Asha Menon']]);

  it('reads an automatic match by the language it was made on', () => {
    const d = decisionFrom({ consultationId: 'k1', at, actorType: 'system', basis: { assignedDoctorId: 'd1', language: 'hi' } }, names);
    expect(d).toMatchObject({ doctorId: 'd1', doctorName: 'Dr Asha Menon', basis: 'Automatic: matched on language hi', overriddenByAdminId: null });
  });

  it('reads an admin override with its reason, attributed to an admin', () => {
    const d = decisionFrom({ consultationId: 'k1', at, actorType: 'admin', basis: { override: true, from: 'd2', to: 'd1', reason: 'Provider on leave' } }, names);
    expect(d).toMatchObject({ doctorId: 'd1', basis: 'Admin override', reason: 'Provider on leave', overriddenByAdminId: 'admin' });
  });

  it('says nobody was available when the match was refused, and when cover returns', () => {
    const d = decisionFrom({ consultationId: 'k1', at, actorType: 'system', basis: { refused: true, reason: 'NO_PROVIDER_AVAILABLE', soonestAvailableAt: '2026-10-13T09:00:00.000Z' } });
    expect(d.basis).toBe('No provider available');
    expect(d.doctorId).toBeNull();
    expect(d.reason).toMatch(/NO_PROVIDER_AVAILABLE. Soonest cover/);
  });

  it('reads a patient decline, naming the provider declined', () => {
    const d = decisionFrom({ consultationId: 'k1', at, actorType: 'patient', basis: { declinedDoctorId: 'd1', reason: 'Wrong language' } }, names);
    expect(d).toMatchObject({ basis: 'Declined by the patient', doctorId: 'd1', reason: 'Wrong language' });
  });

  it('survives an audit row with no metadata at all', () => {
    expect(decisionFrom({ consultationId: 'k1', at, actorType: 'system', basis: null })).toMatchObject({ basis: 'Automatic', doctorId: null });
  });
});
