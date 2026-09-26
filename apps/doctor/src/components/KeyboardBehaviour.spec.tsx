import React from 'react';
import { Dimensions, Keyboard, Text, TextInput } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';

import { Screen, Button } from './ui';
import { BottomSheet } from './BottomSheet';
import { Checkbox } from './Checkbox';
import { SelectField } from './form';
import { KeyboardDoneBar, DONE_BAR_ID, doneBar } from './KeyboardDoneBar';
import { ConsultationFeeScreen } from '../app/screens/profile/ProfileSettingsScreens';
import { DoctorLoginScreen } from '../app/screens/DoctorLoginScreen';

/**
 * How forms behave around the keyboard: a call to action stays at the foot of
 * the screen instead of riding up on the keys, a composer does ride up, and
 * moving from typing to a picker, tick or choice puts the keyboard away.
 */

type Listener = (e: unknown) => void;
const listeners = new Map<string, Listener[]>();

beforeEach(() => {
  listeners.clear();
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: Listener) => {
    listeners.set(event, [...(listeners.get(event) ?? []), cb]);
    return { remove: () => listeners.set(event, (listeners.get(event) ?? []).filter((x) => x !== cb)) };
  }) as never);
  jest.spyOn(Keyboard, 'dismiss');
});

const emit = (events: string[], e: unknown) => act(() => events.forEach((name) => (listeners.get(name) ?? []).forEach((cb) => cb(e))));
const keyboardUp = (height = 300) =>
  emit(['keyboardWillShow', 'keyboardDidShow'], { endCoordinates: { height, screenY: Dimensions.get('window').height - height } });
const keyboardDown = () => emit(['keyboardWillHide', 'keyboardDidHide'], { endCoordinates: { height: 0, screenY: Dimensions.get('window').height } });

/* ---------------------------- the bottom action ---------------------------- */

test('a Save button stays at the foot of the screen while typing, and is back when the keyboard closes', () => {
  render(<ConsultationFeeScreen onBack={jest.fn()} onSaved={jest.fn()} />);
  expect(screen.getByTestId('save-fee')).toBeTruthy();

  keyboardUp();
  // behind the keys, not floating on top of them
  expect(screen.queryByTestId('save-fee')).toBeNull();
  expect(screen.getByTestId('fee-input')).toBeTruthy();

  keyboardDown();
  expect(screen.getByTestId('save-fee')).toBeTruthy();
});

test('a composer in the footer rides above the keyboard, since it is what the doctor is typing in', () => {
  render(
    <Screen footer={<TextInput testID="composer" />} footerAboveKeyboard>
      <Text>Thread</Text>
    </Screen>
  );
  keyboardUp();
  expect(screen.getByTestId('composer')).toBeTruthy();
});

test('a sheet keeps its actions out of the way while typing, but not a composer sheet', () => {
  const ui = render(
    <BottomSheet visible title="Report" onClose={jest.fn()} footer={<Button testID="sheet-submit" label="Submit" onPress={jest.fn()} />}>
      <TextInput testID="sheet-field" />
    </BottomSheet>
  );
  keyboardUp();
  expect(screen.queryByTestId('sheet-submit')).toBeNull();
  keyboardDown();
  expect(screen.getByTestId('sheet-submit')).toBeTruthy();
  ui.unmount();

  render(
    <BottomSheet visible title="Chat" onClose={jest.fn()} footerAboveKeyboard footer={<TextInput testID="sheet-composer" />}>
      <Text>Messages</Text>
    </BottomSheet>
  );
  keyboardUp();
  expect(screen.getByTestId('sheet-composer')).toBeTruthy();
});

/* ------------------------ from typing to choosing ------------------------- */

test('opening a dropdown puts the keyboard away first', () => {
  render(<SelectField testID="gender" label="Gender" value="" options={['Female', 'Male']} onChange={jest.fn()} />);
  fireEvent.press(screen.getByTestId('gender'));
  expect(Keyboard.dismiss).toHaveBeenCalled();
});

test('ticking a box puts the keyboard away first', () => {
  const onToggle = jest.fn();
  render(
    <Checkbox testID="agree" checked={false} onToggle={onToggle}>
      I confirm
    </Checkbox>
  );
  fireEvent.press(screen.getByTestId('agree'));
  expect(Keyboard.dismiss).toHaveBeenCalled();
  expect(onToggle).toHaveBeenCalled();
});

test('choosing a preset amount puts the keyboard away first', () => {
  render(<ConsultationFeeScreen onBack={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.press(screen.getByTestId('fee-899'));
  expect(Keyboard.dismiss).toHaveBeenCalled();
});

/* ------------------------------ the Done key ------------------------------ */

test('number pads get a Done key on iOS, which puts the keyboard away', () => {
  expect(doneBar('number-pad')).toEqual({ inputAccessoryViewID: DONE_BAR_ID });
  expect(doneBar('default')).toEqual({});

  render(<KeyboardDoneBar />);
  fireEvent.press(screen.getByTestId('keyboard-done'));
  expect(Keyboard.dismiss).toHaveBeenCalled();
});

test('the sign-in number pad and the fee field use it', () => {
  const login = render(<DoctorLoginScreen onAuthenticated={jest.fn()} />);
  expect(screen.getByTestId('phone-input').props.inputAccessoryViewID).toBe(DONE_BAR_ID);
  login.unmount();

  render(<ConsultationFeeScreen onBack={jest.fn()} onSaved={jest.fn()} />);
  expect(screen.getByTestId('fee-input').props.inputAccessoryViewID).toBe(DONE_BAR_ID);
});
