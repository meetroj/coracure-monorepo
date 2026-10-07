import React from 'react';
import { doctorClinicalRecordApi, doctorTemplatesApi } from '@coracure/api';
import type { ClinicalTemplateRecord } from '@coracure/api';
import { ApiError } from '@coracure/api/errors';
import { act, render, fireEvent, screen, waitFor } from '@testing-library/react-native';

import ClinicalTemplatesScreen from './ClinicalTemplatesScreen';
import EPrescriptionScreen from './EPrescriptionScreen';
import { getState } from '../../state/store';
import { selectAppointment } from '../../state/selectors';
import { addMedicine, setAdvice } from '../../state/actions';
import { __resetResourceCache } from '../../data/useResource';

const noop = () => undefined;

const row = (over: Partial<ClinicalTemplateRecord> = {}): ClinicalTemplateRecord => ({
  id: 'srv-1',
  name: 'Sleep hygiene',
  description: 'Basics',
  kind: 'advice',
  specialty: 'Psychiatry',
  content: { meds: [], advice: ['Same bedtime daily', 'No screens in bed'], donts: ['No caffeine after noon'] },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

/** The screen as a fresh install sees it: nothing cached, nothing in the store. */
const cold = () => {
  __resetResourceCache();
  require('../../state/actions').setTemplates([]);
};

describe('templates from the server', () => {
  beforeEach(cold);

  test('lists what the API returns, counted from the content', async () => {
    jest.spyOn(doctorTemplatesApi, 'list').mockResolvedValue([row()]);
    render(<ClinicalTemplatesScreen onBack={noop} onApply={noop} professionalType="psychiatrist" />);

    expect(await screen.findByText('Sleep hygiene')).toBeTruthy();
    expect(screen.getByText('2 advice items')).toBeTruthy();
    expect(screen.getByText('1 warning sign')).toBeTruthy();
    expect(screen.queryByText('Anxiety Initial Care')).toBeNull();
  });

  test('a doctor with none sees an honest empty state', async () => {
    jest.spyOn(doctorTemplatesApi, 'list').mockResolvedValue([]);
    render(<ClinicalTemplatesScreen onBack={noop} onApply={noop} professionalType="psychiatrist" />);
    expect(await screen.findByText('No templates yet')).toBeTruthy();
  });

  test('a failed load shows the error with a retry that loads again', async () => {
    const list = jest
      .spyOn(doctorTemplatesApi, 'list')
      .mockRejectedValueOnce(new ApiError({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'boom' }))
      .mockResolvedValue([row()]);
    render(<ClinicalTemplatesScreen onBack={noop} onApply={noop} professionalType="psychiatrist" />);

    fireEvent.press(await screen.findByTestId('templates-error-retry'));
    expect(await screen.findByText('Sleep hygiene')).toBeTruthy();
    expect(list).toHaveBeenCalledTimes(2);
  });

  test('duplicate and delete call the API, and the list follows', async () => {
    jest.spyOn(doctorTemplatesApi, 'list').mockResolvedValue([row()]);
    const create = jest
      .spyOn(doctorTemplatesApi, 'create')
      .mockResolvedValue(row({ id: 'srv-2', name: 'Sleep hygiene (Copy)' }));
    const remove = jest.spyOn(doctorTemplatesApi, 'remove').mockResolvedValue(undefined);
    render(<ClinicalTemplatesScreen onBack={noop} onApply={noop} professionalType="psychiatrist" />);

    await screen.findByText('Sleep hygiene');
    fireEvent.press(screen.getByTestId('template-menu-srv-1'));
    fireEvent.press(screen.getByTestId('sheet-action-duplicate'));
    expect(await screen.findByText('Sleep hygiene (Copy)')).toBeTruthy();
    expect(create).toHaveBeenCalledWith({
      name: 'Sleep hygiene (Copy)',
      description: 'Basics',
      kind: 'advice',
      specialty: 'Psychiatry',
      content: { meds: [], advice: ['Same bedtime daily', 'No screens in bed'], donts: ['No caffeine after noon'] },
    });

    await act(async () => {}); // let the in-flight guard release
    fireEvent.press(screen.getByTestId('template-menu-srv-1'));
    fireEvent.press(screen.getByTestId('sheet-action-delete'));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('srv-1'));
    await waitFor(() => expect(screen.queryByTestId('template-srv-1')).toBeNull());
    expect(remove).toHaveBeenCalledWith('srv-1');
    expect(screen.getByTestId('template-srv-2')).toBeTruthy();
  });

  test('a failed delete keeps the template on screen', async () => {
    jest.spyOn(doctorTemplatesApi, 'list').mockResolvedValue([row()]);
    jest
      .spyOn(doctorTemplatesApi, 'remove')
      .mockRejectedValue(new ApiError({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND', message: 'gone' }));
    render(<ClinicalTemplatesScreen onBack={noop} onApply={noop} professionalType="psychiatrist" />);

    await screen.findByText('Sleep hygiene');
    fireEvent.press(screen.getByTestId('template-menu-srv-1'));
    fireEvent.press(screen.getByTestId('sheet-action-delete'));
    await waitFor(() => expect(doctorTemplatesApi.remove).toHaveBeenCalled());
    expect(screen.getByTestId('template-srv-1')).toBeTruthy();
  });
});

describe('save the prescription as a template', () => {
  beforeEach(() => {
    jest
      .spyOn(doctorClinicalRecordApi, 'getClinicalRecord')
      .mockRejectedValue(new ApiError({ statusCode: 404, code: 'RECORD_NOT_FOUND', message: 'No record yet.' }));
  });

  const open = () =>
    render(
      <EPrescriptionScreen
        appointment={selectAppointment(getState(), 'a1')!}
        onBack={noop}
        professionalType="psychiatrist"
        onFinalised={noop}
        onLoadTemplate={noop}
        onPreview={noop}
        onRecommendResources={noop}
        onOpenNotes={noop}
      />
    );

  test('POSTs the draft’s medicines, advice and warning signs under the typed name', async () => {
    addMedicine('a1', {
      name: 'Sertraline 50mg',
      generic: 'Sertraline',
      dose: '1 tablet',
      frequency: 'Once daily',
      duration: '4 weeks',
      route: '',
      quantity: '',
      instruction: 'After food',
    });
    setAdvice('a1', ['Walk daily']);
    const create = jest.spyOn(doctorTemplatesApi, 'create').mockResolvedValue(row({ id: 'srv-9', name: 'My plan', kind: 'medication' }));
    open();

    fireEvent.press(screen.getByTestId('save-as-template'));
    fireEvent.changeText(screen.getByTestId('template-name'), '  My plan ');
    fireEvent.press(screen.getByTestId('save-template-confirm'));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0]).toEqual({
      name: 'My plan',
      description: '',
      kind: 'medication',
      specialty: 'Psychiatry',
      content: {
        meds: [
          {
            name: 'Sertraline 50mg',
            dose: '1 tablet',
            frequency: 'Once daily',
            duration: '4 weeks',
            instructions: 'After food',
            genericName: 'Sertraline',
          },
        ],
        advice: ['Walk daily'],
        donts: [],
      },
    });
    await waitFor(() => expect(getState().templates.some((t) => t.id === 'srv-9')).toBe(true));
  });

  test('an empty prescription is not saved', () => {
    const create = jest.spyOn(doctorTemplatesApi, 'create');
    open();
    fireEvent.press(screen.getByTestId('save-as-template'));
    expect(screen.queryByTestId('template-name')).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});
