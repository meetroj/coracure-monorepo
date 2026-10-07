import React from 'react';
import { doctorClarificationApi, doctorProfileApi } from '@coracure/api';
import type { ExpertCaseView } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

import ExpertInboxScreen from './ExpertInboxScreen';
import ExpertCaseReviewScreen from './ExpertCaseReviewScreen';
import { useExpertReviews } from '../../data/clarifications';
import { renderShell, tap } from '../../test/app';

/** A case as the assigned expert gets it — no patient, no consultation, no treating doctor's name. */
const review = (over: Partial<ExpertCaseView> = {}): ExpertCaseView => ({
  id: 'a1b2c3d4-0000-4000-8000-000000000000',
  title: 'Mood instability after an SSRI increase',
  topic: 'Medication adjustment',
  patientAge: 35,
  patientGender: 'female',
  briefHistory: 'Four weeks of low mood; sertraline increased to 50 mg eight days ago.',
  diagnosis: 'Moderate depressive episode, provisional',
  currentPlan: 'Sertraline 50 mg once daily',
  specificDoubt: 'Hold the dose, or step back given the mood swings?',
  urgency: 'urgent',
  status: 'awaiting_response',
  assignedAt: new Date().toISOString(),
  messages: [],
  attachmentIds: [],
  createdAt: new Date().toISOString(),
  ...over,
});

const ROUTINE = review({ id: 'b2c3d4e5-0000-4000-8000-000000000000', title: 'Sleep and anxiety', urgency: 'routine' });

const Inbox = ({ onOpen = jest.fn() }: { onOpen?: (id: string) => void }) => {
  const reviews = useExpertReviews();
  return <ExpertInboxScreen reviews={reviews} onBack={jest.fn()} onOpen={onOpen} />;
};

/* ---------------------------------- inbox ---------------------------------- */

test('the inbox lists the cases assigned to me, and opening one passes its id', async () => {
  jest.spyOn(doctorClarificationApi, 'listReviews').mockResolvedValue([review(), ROUTINE]);
  const onOpen = jest.fn();
  render(<Inbox onOpen={onOpen} />);
  await waitFor(() => screen.getByText('Mood instability after an SSRI increase'));
  expect(screen.getAllByText('Awaiting your response')).toHaveLength(2);

  fireEvent.press(screen.getByTestId(`inbox-case-${review().id}`));
  expect(onOpen).toHaveBeenCalledWith(review().id);
});

test('the inbox filters by urgency', async () => {
  jest.spyOn(doctorClarificationApi, 'listReviews').mockResolvedValue([review(), ROUTINE]);
  render(<Inbox />);
  await waitFor(() => screen.getByText('Sleep and anxiety'));
  fireEvent.press(screen.getByTestId('inbox-filter-urgent'));
  expect(screen.queryByText('Sleep and anxiety')).toBeNull();
  expect(screen.getByText('Mood instability after an SSRI increase')).toBeTruthy();
});

test('no case assigned says so, rather than showing sample cases', async () => {
  jest.spyOn(doctorClarificationApi, 'listReviews').mockResolvedValue([]);
  render(<Inbox />);
  await waitFor(() => screen.getByText('No cases assigned'));
});

test('a failed load offers a retry', async () => {
  jest
    .spyOn(doctorClarificationApi, 'listReviews')
    .mockRejectedValueOnce(new ApiError({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'x' }))
    .mockResolvedValueOnce([review()]);
  render(<Inbox />);
  await waitFor(() => screen.getByTestId('inbox-error'));
  fireEvent.press(screen.getByTestId('inbox-error-retry'));
  await waitFor(() => screen.getByText('Mood instability after an SSRI increase'));
});

/* ------------------------------- case review ------------------------------- */

test('the case shows the shared context and the discussion, never naming the treating doctor', async () => {
  jest.spyOn(doctorClarificationApi, 'getReview').mockResolvedValue(
    review({
      status: 'clarification_asked',
      messages: [
        { authorId: 'e1', authorRole: 'expert', messageType: 'clarification_request', body: 'How many weeks at 50 mg?', at: new Date().toISOString() },
        { authorId: 't1', authorRole: 'treating_doctor', messageType: 'author_reply', body: 'Eight days.', at: new Date().toISOString() },
      ],
    })
  );
  render(<ExpertCaseReviewScreen caseId={review().id} onBack={jest.fn()} />);
  await waitFor(() => screen.getByText('Hold the dose, or step back given the mood swings?'));
  expect(screen.getByText('Eight days.')).toBeTruthy();
  expect(screen.getByText(/^Treating doctor/)).toBeTruthy();
  expect(screen.getByTestId('waiting-on-doctor')).toBeTruthy();
});

test('guidance needs text and the confirmation; asking a question back sends a clarification request', async () => {
  jest.spyOn(doctorClarificationApi, 'getReview').mockResolvedValue(review());
  jest.spyOn(doctorClarificationApi, 'replyAsExpert').mockResolvedValue(review({ status: 'clarification_asked' }));
  render(<ExpertCaseReviewScreen caseId={review().id} onBack={jest.fn()} />);
  await waitFor(() => screen.getByTestId('guidance'));

  expect(screen.getByTestId('submit')).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('guidance'), 'Any change in sleep since the increase?');
  expect(screen.getByTestId('submit')).toBeDisabled();
  fireEvent.press(screen.getByTestId('type-clarification'));
  fireEvent.press(screen.getByTestId('confirm'));
  fireEvent.press(screen.getByTestId('submit'));

  await waitFor(() =>
    expect(doctorClarificationApi.replyAsExpert).toHaveBeenCalledWith(review().id, {
      messageType: 'clarification_request',
      body: 'Any change in sleep since the increase?',
    })
  );
  // the case is read again, so its status is the server's
  await waitFor(() => expect(doctorClarificationApi.getReview).toHaveBeenCalledTimes(2));
});

test('a refused reply keeps what was written', async () => {
  jest.spyOn(doctorClarificationApi, 'getReview').mockResolvedValue(review());
  jest
    .spyOn(doctorClarificationApi, 'replyAsExpert')
    .mockRejectedValue(new ApiError({ statusCode: 409, code: 'NOT_IN_THAT_STATE', message: 'This case is closed.' }));
  render(<ExpertCaseReviewScreen caseId={review().id} onBack={jest.fn()} />);
  await waitFor(() => screen.getByTestId('guidance'));
  fireEvent.changeText(screen.getByTestId('guidance'), 'Hold the dose for two more weeks.');
  fireEvent.press(screen.getByTestId('confirm'));
  fireEvent.press(screen.getByTestId('submit'));
  await waitFor(() => expect(doctorClarificationApi.replyAsExpert).toHaveBeenCalled());
  expect(screen.getByTestId('guidance').props.value).toBe('Hold the dose for two more weeks.');
});

test('a case the treating doctor has reviewed is read-only', async () => {
  jest.spyOn(doctorClarificationApi, 'getReview').mockResolvedValue(review({ status: 'reviewed' }));
  render(<ExpertCaseReviewScreen caseId={review().id} onBack={jest.fn()} />);
  await waitFor(() => screen.getByTestId('review-readonly'));
  expect(screen.queryByTestId('guidance')).toBeNull();
  expect(screen.queryByTestId('submit')).toBeNull();
});

/* ------------------------------- the way in -------------------------------- */

test('only a doctor the backend counts as an expert gets the inbox, and it opens on real cases', async () => {
  jest.spyOn(doctorProfileApi, 'getProfile').mockResolvedValue({ seniorityLevel: 'expert' } as never);
  jest.spyOn(doctorClarificationApi, 'listReviews').mockResolvedValue([review()]);
  renderShell();
  fireEvent.press(screen.getByTestId('tab-clarifications'));
  await waitFor(() => screen.getByTestId('open-expert-inbox'));
  tap('open-expert-inbox');
  await waitFor(() => screen.getByText('Mood instability after an SSRI increase'));
});

test('a standard doctor never sees the inbox', async () => {
  jest.spyOn(doctorProfileApi, 'getProfile').mockResolvedValue({ seniorityLevel: 'standard' } as never);
  renderShell();
  fireEvent.press(screen.getByTestId('tab-clarifications'));
  await waitFor(() => expect(doctorProfileApi.getProfile).toHaveBeenCalled());
  expect(screen.queryByTestId('open-expert-inbox')).toBeNull();
});
