import React from 'react';
import { doctorClarificationApi } from '@coracure/api';
import type { AuthorCaseView } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import { confirm } from '../../components/confirm';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

import ClarificationsScreen from './ClarificationsScreen';
import CreateClarificationScreen from './CreateClarificationScreen';
import ExpertClarificationScreen from './ExpertClarificationScreen';
import ExpertResponseScreen from './ExpertResponseScreen';
import { getState, initialState } from '../../state/store';
import { DECISION_PREFIX, KEYS, closeCase, recordDecision, saveCase, toCaseInput } from '../../data/clarifications';
import { peekResource, seedResource } from '../../data/useResource';

const clar = (id: string) => getState().clarifications.find((c) => c.id === id)!;

/** The backend's answer for a case, as the author sees it. */
const view = (over: Partial<AuthorCaseView> = {}): AuthorCaseView => ({
  id: 'cl2',
  title: 'Insomnia with panic symptoms',
  topic: 'Treatment plan review',
  patientAge: 28,
  patientGender: 'female',
  briefHistory: 'Panic episodes for two months.',
  diagnosis: 'Panic disorder, provisional',
  currentPlan: 'Escitalopram 10 mg once daily',
  specificDoubt: 'Is a short course of a sleep aid reasonable alongside the SSRI?',
  urgency: 'soon',
  status: 'awaiting_response',
  assignedAt: '2026-05-14T10:00:00.000Z',
  messages: [],
  attachmentIds: [],
  createdAt: '2026-05-13T10:00:00.000Z',
  sourceConsultationId: null,
  expertDoctorId: 'e1e1e1e1-0000-4000-8000-000000000000',
  postedAt: '2026-05-13T11:00:00.000Z',
  closedAt: null,
  ...over,
});

/* --------------------------------- the list --------------------------------- */

test('filters narrow the list and every row opens its own thread', () => {
  const onOpen = jest.fn();
  render(<ClarificationsScreen onOpen={onOpen} onNewQuery={jest.fn()} />);
  fireEvent.press(screen.getByTestId('clarification-filter-responseReceived'));
  expect(screen.getByTestId('clarification-cl3')).toBeTruthy();
  expect(screen.queryByTestId('clarification-cl1')).toBeNull();
  fireEvent.press(screen.getByTestId('clarification-cl3'));
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'cl3' }));
});

/* ---------------------------------- create ---------------------------------- */

const create = (over: Partial<React.ComponentProps<typeof CreateClarificationScreen>> = {}) => {
  const props = { onCancel: jest.fn(), onSubmit: jest.fn(), onSaveDraft: jest.fn(), ...over };
  return { props, ...render(<CreateClarificationScreen {...props} />) };
};

test('a case is chosen first, and its details come from that consultation', () => {
  create();
  expect(screen.getByTestId('continue')).toBeDisabled();
  fireEvent.press(screen.getByTestId('select-case-a2'));
  expect(screen.getByText('Anita Patel')).toBeTruthy();
  expect(screen.getByText('Private')).toBeTruthy();
});

test('each step gates the next, and the question must say something', () => {
  create({ initialAppointmentId: 'a2' });
  fireEvent.changeText(screen.getByTestId('title'), 'Drowsiness after a dose increase');
  fireEvent.changeText(screen.getByTestId('history'), 'Daytime drowsiness since sertraline was increased last week.');
  fireEvent.changeText(screen.getByTestId('diagnosis'), 'Depression, on treatment');
  fireEvent.press(screen.getByTestId('continue'));

  fireEvent.changeText(screen.getByTestId('question'), 'Why?');
  expect(screen.getByTestId('continue')).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('question'), 'Should the dose go back down, or change the timing?');
  fireEvent.press(screen.getByTestId('continue'));

  // the shared review never carries the patient's name
  expect(screen.getAllByText('Review & Share').length).toBeGreaterThan(0);
  expect(screen.queryByText('Anita Patel')).toBeNull();
});

test('submitting needs the identifier confirmation, then asks who should review it', async () => {
  jest.spyOn(doctorClarificationApi, 'listExperts').mockResolvedValue([{ id: 'e1e1e1e1-0000-4000-8000-000000000000', fullName: 'Dr Vikram Sethi', specialty: 'Psychiatry' }]);
  const { props } = create({ initialAppointmentId: 'a2' });
  fireEvent.changeText(screen.getByTestId('title'), 'Drowsiness after a dose increase');
  fireEvent.changeText(screen.getByTestId('history'), 'Daytime drowsiness since the dose was increased.');
  fireEvent.changeText(screen.getByTestId('diagnosis'), 'Depression, on treatment');
  fireEvent.press(screen.getByTestId('continue'));
  fireEvent.changeText(screen.getByTestId('question'), 'Should the dose go back down, or change the timing?');
  fireEvent.press(screen.getByTestId('continue'));

  expect(screen.getByTestId('submit')).toBeDisabled();
  fireEvent.press(screen.getByTestId('confirm'));

  fireEvent.press(screen.getByTestId('submit'));
  // nothing is sent until an expert is chosen (or left to CoraCure)
  expect(props.onSubmit).not.toHaveBeenCalled();
  fireEvent.press(await screen.findByTestId('expert-e1e1e1e1-0000-4000-8000-000000000000'));
  fireEvent.press(screen.getByTestId('expert-confirm'));
  expect(props.onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      appointmentId: 'a2',
      title: 'Drowsiness after a dose increase',
      expertDoctorId: 'e1e1e1e1-0000-4000-8000-000000000000',
    }),
  );
});

test('what is sent is the backend’s shape: an age in years, its urgency word, and no fixture consultation id', () => {
  jest.spyOn(doctorClarificationApi, 'listExperts').mockResolvedValue([{ id: 'e1e1e1e1-0000-4000-8000-000000000000', fullName: 'Dr Vikram Sethi', specialty: 'Psychiatry' }]);
  const { props } = create({ initialAppointmentId: 'a2' });
  fireEvent.changeText(screen.getByTestId('age'), '34');
  fireEvent.changeText(screen.getByTestId('title'), 'Drowsiness');
  fireEvent.changeText(screen.getByTestId('history'), 'Daytime drowsiness since the dose was increased.');
  fireEvent.changeText(screen.getByTestId('diagnosis'), 'Depression');
  fireEvent.press(screen.getByTestId('continue'));
  fireEvent.changeText(screen.getByTestId('question'), 'Should the dose go back down, or change the timing?');
  fireEvent.press(screen.getByTestId('urgency-priority'));
  fireEvent.press(screen.getByTestId('continue'));
  fireEvent.press(screen.getByTestId('confirm'));
  fireEvent.press(screen.getByTestId('submit'));
  fireEvent.press(screen.getByTestId('expert-confirm'));

  const input = toCaseInput(props.onSubmit.mock.calls[0][0]);
  expect(input).toMatchObject({ patientAge: 34, patientGender: 'female', urgency: 'soon', specificDoubt: expect.any(String) });
  // 'a2' is a fixture id, not a consultation the backend knows
  expect(input).not.toHaveProperty('sourceConsultationId');
});

test('an identifier typed into the case blocks sharing until it is removed', () => {
  create({ initialAppointmentId: 'a2' });
  fireEvent.changeText(screen.getByTestId('history'), 'Patient PT-10459 reports drowsiness.');
  fireEvent.changeText(screen.getByTestId('title'), 'Drowsiness');
  fireEvent.changeText(screen.getByTestId('diagnosis'), 'Depression');
  fireEvent.press(screen.getByTestId('continue'));
  fireEvent.changeText(screen.getByTestId('question'), 'Should the dose go back down?');
  fireEvent.press(screen.getByTestId('continue'));
  fireEvent.press(screen.getByTestId('confirm'));
  expect(screen.getByTestId('submit')).toBeDisabled();
});

test('unsaved work is reported to the route, and a draft can be saved', () => {
  const onDirtyChange = jest.fn();
  const { props } = create({ initialAppointmentId: 'a2', onDirtyChange });
  fireEvent.changeText(screen.getByTestId('title'), 'Draft title');
  expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  fireEvent.press(screen.getByTestId('save-draft'));
  expect(props.onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ title: 'Draft title' }));
});

/* ---------------------------------- thread ---------------------------------- */

const REPLY = 'Panic episodes happen mostly at night, about twice a week.';

test('a reply needs content, goes to the server, and hands the case back to the expert', async () => {
  jest.spyOn(doctorClarificationApi, 'replyToCase').mockResolvedValue(
    view({
      status: 'awaiting_response',
      messages: [
        { authorId: 'me', authorRole: 'treating_doctor', messageType: 'author_reply', body: 'Q', at: '2026-05-13T11:00:00.000Z' },
        { authorId: 'e1', authorRole: 'expert', messageType: 'clarification_request', body: 'How many weeks?', at: '2026-05-14T10:00:00.000Z' },
        { authorId: 'me', authorRole: 'treating_doctor', messageType: 'author_reply', body: REPLY, at: '2026-05-14T11:00:00.000Z' },
      ],
    })
  );
  render(<ExpertClarificationScreen clarification={clar('cl2')} onBack={jest.fn()} onRecordDecision={jest.fn()} />);
  expect(screen.getByTestId('send-reply')).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('reply-input'), REPLY);
  fireEvent.press(screen.getByTestId('send-reply'));

  await waitFor(() => expect(clar('cl2').status).toBe('expertReview'));
  expect(doctorClarificationApi.replyToCase).toHaveBeenCalledWith('cl2', REPLY);
  expect(clar('cl2').messages.at(-1)).toMatchObject({ author: 'me', body: REPLY });
  // the expert's name is never sent to the author, so the thread does not invent one
  expect(screen.getAllByText('Expert').length).toBeGreaterThan(0);
});

test('a reply the server refuses for an identifier stays in the box, with where it was found', async () => {
  jest.spyOn(doctorClarificationApi, 'replyToCase').mockRejectedValue(
    new ApiError({
      statusCode: 400,
      code: 'IDENTIFIER_PRESENT',
      message: 'This case appears to contain a phone number.',
      details: { found: [{ field: 'reply', kind: 'phone' }] },
    })
  );
  const toastSpy = jest.spyOn(require('../../components/Toast').toast, 'show');
  render(<ExpertClarificationScreen clarification={clar('cl2')} onBack={jest.fn()} onRecordDecision={jest.fn()} />);
  fireEvent.changeText(screen.getByTestId('reply-input'), 'Call her on 98765 43210');
  fireEvent.press(screen.getByTestId('send-reply'));

  await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.stringMatching(/Check your reply\./), 'error'));
  expect(screen.getByTestId('reply-input').props.value).toBe('Call her on 98765 43210');
  expect(clar('cl2').status).toBe('clarificationNeeded');
});

test('a case still waiting for a reviewer cannot be replied to yet, and says why', () => {
  require('../../state/actions').upsertClarification({ ...clar('cl1'), status: 'posted' });
  render(<ExpertClarificationScreen clarification={clar('cl1')} onBack={jest.fn()} onRecordDecision={jest.fn()} />);
  expect(screen.getByTestId('awaiting-assignment')).toBeTruthy();
  expect(screen.queryByTestId('reply-input')).toBeNull();
});

test('closing a thread asks first, closes it on the server, and keeps it for audit', async () => {
  jest.spyOn(doctorClarificationApi, 'closeCase').mockResolvedValue(
    view({
      id: 'cl3',
      status: 'closed',
      closedAt: '2026-05-15T09:00:00.000Z',
      messages: [{ authorId: 'me', authorRole: 'treating_doctor', messageType: 'author_reply', body: 'Q', at: '2026-05-13T11:00:00.000Z' }],
    })
  );
  render(<ExpertClarificationScreen clarification={clar('cl3')} onBack={jest.fn()} onRecordDecision={jest.fn()} />);
  fireEvent.press(screen.getByTestId('close-thread'));
  expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Close this thread?' }));
  await waitFor(() => expect(clar('cl3').status).toBe('closed'));
  expect(doctorClarificationApi.closeCase).toHaveBeenCalledWith('cl3');
  expect(clar('cl3').messages.length).toBeGreaterThan(0);
});

const GUIDANCE = { authorId: 'e1', authorRole: 'expert', messageType: 'clinical_consideration', body: 'Hold the dose.', at: '2026-05-14T10:00:00.000Z' } as const;
const DECISION = `${DECISION_PREFIX}Guidance adopted — Held at 5 mg`;
const reviewed = view({ id: 'cl3', status: 'reviewed', messages: [GUIDANCE] });
const decided = {
  ...reviewed,
  messages: [...reviewed.messages, { authorId: 'me', authorRole: 'treating_doctor', messageType: 'author_reply', body: DECISION, at: '2026-05-15T09:00:00.000Z' } as const],
};

test('the case is marked reviewed first, then the decision is posted on the thread — and reads back as the outcome', async () => {
  // Reviewed first: a reply to a case the expert asked a question on is taken as the answer, and /reviewed is then refused.
  jest.spyOn(doctorClarificationApi, 'markCaseReviewed').mockResolvedValue(reviewed);
  jest.spyOn(doctorClarificationApi, 'replyToCase').mockResolvedValue(decided);
  const close = jest.spyOn(doctorClarificationApi, 'closeCase');

  await recordDecision(clar('cl3'), 'Guidance adopted', 'Held at 5 mg', false);

  expect(doctorClarificationApi.markCaseReviewed).toHaveBeenCalledWith('cl3');
  expect(doctorClarificationApi.replyToCase).toHaveBeenCalledWith('cl3', DECISION);
  expect((doctorClarificationApi.markCaseReviewed as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
    (doctorClarificationApi.replyToCase as jest.Mock).mock.invocationCallOrder[0]
  );
  expect(close).not.toHaveBeenCalled();
  expect(clar('cl3')).toMatchObject({
    status: 'reviewed',
    outcome: expect.objectContaining({ value: 'Guidance adopted', note: 'Held at 5 mg' }),
    guidance: expect.objectContaining({ body: 'Hold the dose.' }),
  });
});

test('a decision needs the confirmation and an outcome', () => {
  const onDecide = jest.fn();
  render(<ExpertResponseScreen clarification={clar('cl3')} onBack={jest.fn()} onDecide={onDecide} />);
  expect(screen.getByTestId('keep-open')).toBeDisabled();
  fireEvent.press(screen.getByTestId('outcome'));
  const option = screen.getAllByTestId(/^outcome-/).find((n) => !/sheet|done|search|clear/.test(n.props.testID))!;
  fireEvent.press(option);
  fireEvent.press(screen.getByTestId('outcome-done'));
  fireEvent.press(screen.getByTestId('confirm'));
  fireEvent.press(screen.getByTestId('keep-open'));
  expect(onDecide).toHaveBeenCalledWith(expect.any(String), '', false);
});

const unavailable = () => new ApiError({ statusCode: 503, code: 'SERVICE_UNAVAILABLE', message: 'Try again.' });

test('a retry after the close failed does not post the decision a second time', async () => {
  jest.spyOn(doctorClarificationApi, 'markCaseReviewed').mockResolvedValue(reviewed);
  jest.spyOn(doctorClarificationApi, 'replyToCase').mockResolvedValue(decided);
  jest
    .spyOn(doctorClarificationApi, 'closeCase')
    .mockRejectedValueOnce(unavailable())
    .mockResolvedValueOnce({ ...decided, status: 'closed', closedAt: '2026-05-15T09:01:00.000Z' });

  await expect(recordDecision(clar('cl3'), 'Guidance adopted', 'Held at 5 mg', true)).rejects.toThrow();
  // the route passes the store's row again, which now carries the decision
  await recordDecision(clar('cl3'), 'Guidance adopted', 'Held at 5 mg', true);

  expect(doctorClarificationApi.markCaseReviewed).toHaveBeenCalledTimes(1);
  expect(doctorClarificationApi.replyToCase).toHaveBeenCalledTimes(1);
  expect(clar('cl3').status).toBe('closed');
});

test('a post that fails after the create is retried on the same case, not a second draft', async () => {
  const id = 'c0c0c0c0-0000-4000-8000-000000000001';
  jest.spyOn(doctorClarificationApi, 'createCase').mockResolvedValue(view({ id, status: 'draft' }));
  jest.spyOn(doctorClarificationApi, 'updateDraft').mockResolvedValue(view({ id, status: 'draft' }));
  jest
    .spyOn(doctorClarificationApi, 'postCase')
    .mockRejectedValueOnce(unavailable())
    .mockResolvedValueOnce(view({ id, status: 'posted' }));
  const draft = {
    caseId: '', appointmentId: 'a2', patientName: '', patientId: '', consultationId: '', title: 'Drowsiness', age: 34, ageLabel: '34 years',
    gender: 'Female', history: 'Drowsy since the dose went up.', provisionalDiagnosis: 'Depression', currentPlan: 'Sertraline', question: 'Lower the dose?',
    guidanceArea: 'Medication adjustment', urgency: 'routine', speciality: 'Psychiatry', files: [],
  } as const;
  let saved: string | undefined;

  await expect(saveCase({ ...draft, files: [] }, true, saved, (s) => (saved = s))).rejects.toThrow();
  // the draft is already in the list, and the route now holds its id
  expect(saved).toBe(id);
  expect(clar(id).status).toBe('draft');

  await saveCase({ ...draft, files: [] }, true, saved, (s) => (saved = s));
  expect(doctorClarificationApi.createCase).toHaveBeenCalledTimes(1);
  expect(doctorClarificationApi.updateDraft).toHaveBeenCalledWith(id, expect.anything());
  expect(clar(id).status).toBe('posted');
});

test('a change lands in the cached list too, so the list remounting does not lay the old one over it', async () => {
  seedResource(KEYS.list, [view({ id: 'cl3', status: 'response_received' })]);
  jest.spyOn(doctorClarificationApi, 'closeCase').mockResolvedValue(view({ id: 'cl3', status: 'closed' }));
  await closeCase(clar('cl3'));
  expect(peekResource<AuthorCaseView[]>(KEYS.list)?.map((v) => v.status)).toEqual(['closed']);
  expect(peekResource<AuthorCaseView>(KEYS.one('cl3'))?.status).toBe('closed');
});

test('a draft has no Close thread — the backend closes only a case that has started', () => {
  require('../../state/actions').upsertClarification({ ...clar('cl1'), status: 'draft' });
  render(<ExpertClarificationScreen clarification={clar('cl1')} onBack={jest.fn()} onRecordDecision={jest.fn()} />);
  expect(screen.queryByTestId('close-thread')).toBeNull();
});

test('a list that will not load says so and offers a retry', () => {
  const onRetry = jest.fn();
  render(<ClarificationsScreen onOpen={jest.fn()} onNewQuery={jest.fn()} error={new Error('offline')} onRetry={onRetry} />);
  fireEvent.press(screen.getByTestId('clarifications-error-retry'));
  expect(onRetry).toHaveBeenCalled();
});

test('the title is capped at what the backend takes', () => {
  create({ initialAppointmentId: 'a2' });
  fireEvent.changeText(screen.getByTestId('title'), 'x'.repeat(250));
  expect(screen.getByTestId('title').props.value).toHaveLength(200);
});

test('the app ships with no sample cases, conversations or support tickets', () => {
  const s = initialState();
  expect(s.clarifications).toEqual([]);
  expect(s.threads).toEqual([]);
  expect(s.supportIssues).toEqual([]);
});
