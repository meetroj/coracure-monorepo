import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { CareHubItem } from '@coracure/api';

import CareHubScreen from './CareHubScreen';
import type { Resource } from '../../data/useResource';

const item = (id: string, itemType: CareHubItem['itemType'], title: string): CareHubItem => ({
  id,
  itemType,
  slug: id,
  title,
  summary: null,
  concernId: null,
  specialtyId: null,
  coverStorageKey: null,
  isVerifiedOrg: null,
  sortOrder: 0,
});

const BREATHING = item('11111111-1111-4111-8111-111111111111', 'self_help_tool', 'Guided Breathing');
const ANXIETY = item('22222222-2222-4222-8222-222222222222', 'education_module', 'Understanding Anxiety');

const lib = (over: Partial<Resource<CareHubItem[]>>): Resource<CareHubItem[]> =>
  ({ data: undefined, error: null, showSkeleton: false, isRefreshing: false, refresh: jest.fn(), retry: jest.fn(), ...over }) as Resource<CareHubItem[]>;

test('shows the published shelf by type and saves the picks', () => {
  const onSave = jest.fn();
  render(<CareHubScreen library={lib({ data: [BREATHING, ANXIETY] })} onBack={jest.fn()} onSave={onSave} />);

  expect(screen.getByText('Guided Breathing')).toBeTruthy();
  expect(screen.queryByText('Understanding Anxiety')).toBeNull();

  fireEvent.press(screen.getByTestId(`care-${BREATHING.id}`));
  fireEvent.press(screen.getByTestId('care-tab-education_module'));
  fireEvent.press(screen.getByTestId(`care-${ANXIETY.id}`));
  fireEvent.press(screen.getByTestId('save-recommendations'));

  expect(onSave).toHaveBeenCalledWith([BREATHING.id, ANXIETY.id], '');
});

test('a pick that has left the shelf is dropped on save, not sent', () => {
  const onSave = jest.fn();
  render(
    <CareHubScreen
      library={lib({ data: [BREATHING] })}
      initialSelected={[BREATHING.id, 'gone-since']}
      onBack={jest.fn()}
      onSave={onSave}
    />
  );
  fireEvent.press(screen.getByTestId('save-recommendations'));
  expect(onSave).toHaveBeenCalledWith([BREATHING.id], '');
});

test('a failed read offers retry and blocks saving', () => {
  const retry = jest.fn();
  const onSave = jest.fn();
  render(<CareHubScreen library={lib({ error: new Error('x'), retry })} initialSelected={['a']} onBack={jest.fn()} onSave={onSave} />);
  fireEvent.press(screen.getByText(/retry|try again/i));
  expect(retry).toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('save-recommendations'));
  expect(onSave).not.toHaveBeenCalled();
});

test('a finalised record cannot take new picks — they could never reach the server', () => {
  render(<CareHubScreen library={lib({ data: [BREATHING] })} initialSelected={[]} onBack={jest.fn()} onSave={jest.fn()} readOnly />);
  fireEvent.press(screen.getByTestId(`care-${BREATHING.id}`));
  expect(screen.getByText('Selected Items (0)')).toBeTruthy();
  expect(screen.queryByTestId('save-recommendations')).toBeNull();
  expect(screen.getByTestId('care-locked')).toBeTruthy();
});
