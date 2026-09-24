import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';

import DashboardScreen from '../screens/DashboardScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import CarePlanScreen from '../screens/CarePlanScreen';
import CareHubScreen from '../screens/CareHubScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { ParentTabBarContext } from '../components/PatientTabBar';

export type MainTabKey = 'Home' | 'Appointments' | 'CarePlan' | 'CareHub' | 'Profile';

export const MainTabs = () => {
  const [activeTab, setActiveTab] = useState<MainTabKey>('Home');
  const insets = useSafeAreaInsets();

  return (
    <View style={s.container}>
      <View style={s.content}>
        <ParentTabBarContext.Provider value={true}>
        {activeTab === 'Home' && <DashboardScreen />}
        {activeTab === 'Appointments' && <AppointmentsScreen />}
        {activeTab === 'CarePlan' && <CarePlanScreen />}
        {activeTab === 'CareHub' && <CareHubScreen />}
        {activeTab === 'Profile' && <ProfileScreen />}
        </ParentTabBarContext.Provider>
      </View>

      {/* 5-Tab Bar matching Figma */}
      <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) + 6 }]}>
        {/* Tab 1: Home */}
        <Pressable
          onPress={() => setActiveTab('Home')}
          style={s.tabItem}
          accessibilityLabel="Home"
        >
          <View style={[s.tabIconWrap, activeTab === 'Home' && s.tabIconWrapActive]}>
            <Icon name="home" size={20} color={activeTab === 'Home' ? colors.surfie : colors.inkFaint} />
          </View>
          <Text style={[s.tabLabel, activeTab === 'Home' && s.tabLabelActive]}>Home</Text>
        </Pressable>

        {/* Tab 2: Appointments */}
        <Pressable
          onPress={() => setActiveTab('Appointments')}
          style={s.tabItem}
          accessibilityLabel="Appointments"
        >
          <View style={[s.tabIconWrap, activeTab === 'Appointments' && s.tabIconWrapActive]}>
            <Icon name="calendar" size={20} color={activeTab === 'Appointments' ? colors.surfie : colors.inkFaint} />
          </View>
          <Text style={[s.tabLabel, activeTab === 'Appointments' && s.tabLabelActive]}>Appointments</Text>
        </Pressable>

        {/* Tab 3: Care Plan (Center Circular Elevated Button) */}
        <Pressable
          onPress={() => setActiveTab('CarePlan')}
          style={s.centerTabItem}
          accessibilityLabel="Care Plan"
        >
          <View style={[s.centerButton, activeTab === 'CarePlan' && s.centerButtonActive]}>
            <Icon name="shieldCheck" size={24} color={colors.white} />
          </View>
          <Text style={[s.centerTabLabel, activeTab === 'CarePlan' && s.tabLabelActive]}>Care Plan</Text>
        </Pressable>

        {/* Tab 4: Care Hub */}
        <Pressable
          onPress={() => setActiveTab('CareHub')}
          style={s.tabItem}
          accessibilityLabel="Care Hub"
        >
          <View style={[s.tabIconWrap, activeTab === 'CareHub' && s.tabIconWrapActive]}>
            <Icon name="heart" size={20} color={activeTab === 'CareHub' ? colors.surfie : colors.inkFaint} />
          </View>
          <Text style={[s.tabLabel, activeTab === 'CareHub' && s.tabLabelActive]}>Care Hub</Text>
        </Pressable>

        {/* Tab 5: Profile */}
        <Pressable
          onPress={() => setActiveTab('Profile')}
          style={s.tabItem}
          accessibilityLabel="Profile"
        >
          <View style={[s.tabIconWrap, activeTab === 'Profile' && s.tabIconWrapActive]}>
            <Icon name="user" size={20} color={activeTab === 'Profile' ? colors.surfie : colors.inkFaint} />
          </View>
          <Text style={[s.tabLabel, activeTab === 'Profile' && s.tabLabelActive]}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingHorizontal: spacing.xs,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tabIconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tabIconWrapActive: {
    backgroundColor: colors.surface.selected,
  },
  tabLabel: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  centerTabItem: {
    flex: 1,
    alignItems: 'center',
    marginTop: -20,
    gap: 2,
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.surfie,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 3,
    borderColor: colors.white,
  },
  centerButtonActive: {
    backgroundColor: '#0A5B53',
    transform: [{ scale: 1.05 }],
  },
  centerTabLabel: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default MainTabs;
