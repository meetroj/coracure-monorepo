import React from 'react';
import { doctorClarificationApi } from '@coracure/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CaseDetailScreen from './CaseDetailScreen';
import { getState } from '../../state/store';
import { selectAppointment, selectCases } from '../../state/selectors';
import { submitSummary } from '../../state/actions';

const open = (onAssignPlan = jest.fn()) => {
  const c = selectCases(getState())[0];
  render(
    <CaseDetailScreen
      patientCase={c}
      appointment={selectAppointment(getState(), c.appointmentId)!}
      onBack={jest.fn()}
      onOpenNotes={jest.fn()}
      onOpenPrescription={jest.fn()}
      onOpenSummary={jest.fn()}
      onOpenClarification={jest.fn()}
      onNewClarification={jest.fn()}
      onOpenRecommended={jest.fn()}
      onOpenDocuments={jest.fn()}
      onOpenAppointment={jest.fn()}
      onAssignPlan={onAssignPlan}
    />
  );
  return c;
};

beforeEach(() => {
  jest.spyOn(doctorClarificationApi, 'listCases').mockResolvedValue([]);
});

test('the follow-up plan waits for the case summary, then is the offered next step', async () => {
  const onAssignPlan = jest.fn();
  const c = open(onAssignPlan);
  expect(screen.getByTestId('row-followup')).toHaveTextContent(/Available once the case summary is submitted/);

  submitSummary(c.appointmentId);
  await waitFor(() => expect(screen.getByTestId('row-followup')).toHaveTextContent(/Assign plan/));
  fireEvent.press(screen.getByTestId('row-followup'));
  expect(onAssignPlan).toHaveBeenCalled();
});

test('the clarification row asks the server for this author’s cases itself', async () => {
  open();
  await waitFor(() => expect(doctorClarificationApi.listCases).toHaveBeenCalled());
});
