import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http', () => ({ request: vi.fn(), getSession: vi.fn() }));

import { getSession, request } from './http';
import {
  adminIdFromToken,
  appFeedbackFrom,
  closeBody,
  complaintFrom,
  consultationFeedbackFrom,
  feedback,
  messageFrom,
  replyBody,
  ticketDetailFrom,
  ticketFrom,
  ticketNoteBody,
  tickets,
} from './liveSupport';

/** `AdminTicketRow`, `AdminComplaintView`, `FeedbackSummary`, `AppFeedbackRow`: what is sent and how a row is read. */

const mocked = vi.mocked(request);
beforeEach(() => {
  mocked.mockReset();
  vi.mocked(getSession).mockReset();
});

const jwt = (claims: Record<string, unknown>) => ['x', btoa(JSON.stringify(claims)).replace(/=+$/, ''), 'y'].join('.');

describe('adminIdFromToken', () => {
  it('reads the sub of an admin token, and nothing from any other kind', () => {
    expect(adminIdFromToken(jwt({ typ: 'admin', sub: 'adm-1' }))).toBe('adm-1');
    expect(adminIdFromToken(jwt({ typ: 'patient', sub: 'p-1' }))).toBeNull();
    expect(adminIdFromToken('not-a-token')).toBeNull();
  });
});

describe('message and complaint mapping', () => {
  it('turns an internal note into a message the patient is not shown', () => {
    expect(
      messageFrom({
        seq: 3,
        authorId: 'a',
        authorRole: 'admin',
        body: 'Spoke to the provider.',
        isInternal: true,
        at: '2026-10-12T10:00:00.000Z',
      }),
    ).toEqual({
      id: '3',
      body: 'Spoke to the provider.',
      authorType: 'admin',
      visibleToPatient: false,
      createdAt: '2026-10-12T10:00:00.000Z',
    });
  });

  it('reads a complaint with its owner, text and outcome', () => {
    const c = complaintFrom({
      id: 'c1',
      referenceCode: 'CP-0001',
      category: 'doctor_conduct',
      subject: 'Rude',
      description: 'The doctor was rude.',
      status: 'in_progress',
      consultationId: 'k1',
      messages: [],
      resolutionNote: null,
      createdAt: '2026-10-10T08:00:00.000Z',
      patientId: 'p1',
      assignedToAdminId: 'adm-1',
    });
    expect(c).toMatchObject({
      id: 'c1',
      raisedAt: '2026-10-10T08:00:00.000Z',
      assignedAdminId: 'adm-1',
      patientId: 'p1',
      description: 'The doctor was rude.',
    });
  });
});

describe('request bodies', () => {
  it('replies with the isInternal flag the DTO takes, the opposite of "shared"', () => {
    expect(replyBody(' Hello ', true)).toEqual({ body: 'Hello', isInternal: false });
    expect(replyBody('Note', false)).toEqual({ body: 'Note', isInternal: true });
    expect(() => replyBody('  ', true)).toThrow(/message/);
    expect(() => replyBody('x'.repeat(4001), true)).toThrow(/4000/);
  });

  it('closes a complaint with an outcome and a note, both required', () => {
    expect(closeBody('rejected', ' Not upheld. ')).toEqual({ outcome: 'rejected', resolutionNote: 'Not upheld.' });
    expect(() => closeBody('resolved', ' ')).toThrow(/note/);
  });

  it('resolves and closes a ticket with a note', () => {
    expect(ticketNoteBody(' Done. ')).toEqual({ note: 'Done.' });
    expect(() => ticketNoteBody('')).toThrow(/note/);
  });
});

describe('tickets', () => {
  const row = {
    id: 't1',
    referenceCode: 'TK-0007',
    requester: { type: 'provider' as const, id: 'd1', name: 'Dr Asha Menon' },
    category: 'technical',
    priority: 'high' as const,
    status: 'open' as const,
    subject: 'Cannot upload',
    consultationId: null,
    assignee: null,
    messageCount: 2,
    resolvedAt: null,
    closedAt: null,
    createdAt: '2026-10-11T08:00:00.000Z',
    updatedAt: '2026-10-11T09:00:00.000Z',
  };

  it('reads a row, keeping Unassigned as null and naming a requester without a name', () => {
    expect(ticketFrom(row)).toMatchObject({
      code: 'TK-0007',
      requesterType: 'provider',
      requesterName: 'Dr Asha Menon',
      assignee: null,
    });
    expect(ticketFrom({ ...row, requester: { type: 'lab', id: null, name: null } }).requesterName).toBe('Unnamed');
  });

  it('reads the full thread with internal notes marked', () => {
    const d = ticketDetailFrom({
      ...row,
      description: 'It fails.',
      resolutionNote: null,
      messages: [
        { seq: 0, authorId: 'd1', authorRole: 'provider', body: 'It fails.', isInternal: false, at: '2026-10-11T08:00:00.000Z' },
        { seq: 1, authorId: 'a1', authorRole: 'admin', body: 'Checking logs.', isInternal: true, at: '2026-10-11T08:30:00.000Z' },
      ],
    });
    expect(d.messages.map((m) => [m.by, m.internal])).toEqual([
      ['Requester', false],
      ['Support', true],
    ]);
  });

  it('assigns to the signed-in admin, and refuses when there is no admin token', async () => {
    mocked.mockResolvedValue(undefined);
    vi.mocked(getSession).mockReturnValue({ accessToken: jwt({ typ: 'admin', sub: 'adm-9' }) } as never);
    await tickets.assignToMe('t1');
    expect(mocked).toHaveBeenCalledWith('/admin/tickets/t1/assign', {
      method: 'POST',
      body: { assignToAdminId: 'adm-9' },
    });

    vi.mocked(getSession).mockReturnValue(null);
    await expect(tickets.assignToMe('t1')).rejects.toThrow(/Sign in again/);
  });

  it('sends exactly one field for a priority change', async () => {
    mocked.mockResolvedValue(undefined);
    await tickets.setPriority('t1', 'urgent');
    expect(mocked).toHaveBeenCalledWith('/admin/tickets/t1/priority', { method: 'POST', body: { priority: 'urgent' } });
  });
});

describe('feedback', () => {
  it('names the consultation a rating is about, and keeps no patient name it was never given', () => {
    expect(
      consultationFeedbackFrom({
        consultationId: 'k1',
        referenceCode: 'CC-0001',
        doctorId: 'd1',
        rating: 4,
        comment: null,
        consultedAt: '2026-10-09T10:00:00.000Z',
      }),
    ).toEqual({
      id: 'k1',
      from: 'Patient',
      about: 'CC-0001',
      to: '/appointments/k1',
      rating: 4,
      comment: '',
      at: '2026-10-09T10:00:00.000Z',
    });
  });

  it('reads app feedback with an author, or says what kind of person wrote it', () => {
    const f = appFeedbackFrom({
      id: 'f1',
      kind: 'provider_experience',
      rating: 3,
      comment: 'Slow',
      author: { type: 'provider', id: null, name: null },
      createdAt: '2026-10-08T00:00:00.000Z',
    });
    expect(f).toMatchObject({ from: 'A provider', about: 'The provider experience', rating: 3 });
  });

  it('asks app feedback by kind, and averages what it read', async () => {
    mocked.mockResolvedValue({
      items: [
        { id: 'a', kind: 'app', rating: 5, comment: null, author: { type: 'patient', id: 'p', name: 'Aarav' }, createdAt: '2026-10-08T00:00:00.000Z' },
        { id: 'b', kind: 'app', rating: 4, comment: null, author: { type: 'patient', id: 'q', name: 'Sneha' }, createdAt: '2026-10-08T00:00:00.000Z' },
      ],
      total: 2,
      limit: 100,
      offset: 0,
    });
    const page = await feedback.list('provider');
    expect(page.average).toBe(4.5);
    expect((mocked.mock.calls[0][1] as { query: Record<string, unknown> }).query.kind).toBe('provider_experience');
  });
});
