import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';

const stub = (name: string) => ({ __esModule: true, default: () => <Text>SCREEN:{name}</Text> });
jest.mock('../screens/DashboardScreen', () => stub('Home'));
jest.mock('../screens/AppointmentsScreen', () => stub('Appointments'));
jest.mock('../screens/CarePlanScreen', () => stub('CarePlan'));
jest.mock('../screens/AIAssistantScreen', () => stub('AIAssistant'));
jest.mock('../screens/ProfileScreen', () => stub('Profile'));

import { MainTabs } from './MainTabs';
import { PatientTabBar } from '../components/PatientTabBar';

const withNav = (node: React.ReactNode, navigation: any, params?: any) => (
  <NavigationContext.Provider value={navigation}>
    <NavigationRouteContext.Provider value={{ key: 'main-tabs', name: 'MainTabs', params }}>
      {node}
    </NavigationRouteContext.Provider>
  </NavigationContext.Provider>
);

const nav = () => ({ navigate: jest.fn(), setParams: jest.fn(), goBack: jest.fn(), addListener: () => () => {}, isFocused: () => true });

test('the active tab is stored in route params, so it survives the unmount a push causes', () => {
  const navigation = nav();
  const r = render(withNav(<MainTabs />, navigation));
  expect(r.getByText(/SCREEN:/).props.children.join('')).toBe('SCREEN:Home');

  fireEvent.press(r.getByLabelText('Care Plan'));
  expect(navigation.setParams).toHaveBeenCalledWith({ tab: 'CarePlan' });

  // What the navigator does on push + back: unmount MainTabs, remount from params.
  r.unmount();
  const back = render(withNav(<MainTabs />, nav(), { tab: 'CarePlan' }));
  expect(back.getByText(/SCREEN:/).props.children.join('')).toBe('SCREEN:CarePlan');
});

test('the stand-alone tab bar switches the MainTabs tab instead of pushing a copy', () => {
  const navigation = nav();
  const r = render(withNav(<PatientTabBar />, navigation));
  fireEvent.press(r.getByLabelText('Profile'));
  expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', { tab: 'Profile' });
});
