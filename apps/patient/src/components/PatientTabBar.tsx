import React, { createContext, useContext } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius } from '@coracure/brand';
import { Icon } from '@coracure/ui';

export type TabKey = 'Home' | 'Appointments' | 'CarePlan' | 'CareHub' | 'Profile';
export const ParentTabBarContext = createContext(false);

export const PatientTabBar = ({ activeTab = 'CarePlan' }: { activeTab?: TabKey }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const parentHasTabBar = useContext(ParentTabBarContext);
  if (parentHasTabBar) return null;

  const handleTabPress = (tab: TabKey) => {
    switch (tab) {
      case 'Home':
        navigation.navigate('MainTabs');
        break;
      case 'Appointments':
        navigation.navigate('Appointments');
        break;
      case 'CarePlan':
        navigation.navigate('CarePlan');
        break;
      case 'CareHub':
        navigation.navigate('CareHub');
        break;
      case 'Profile':
        navigation.navigate('Profile');
        break;
    }
  };

  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) + 6 }]}>
      {/* Tab 1: Home */}
      <Pressable
        onPress={() => handleTabPress('Home')}
        style={s.tabItem}
        accessibilityRole="button"
        accessibilityLabel="Home"
      >
        <View style={[s.tabIconWrap, activeTab === 'Home' && s.tabIconWrapActive]}>
          <Icon name="home" size={20} color={activeTab === 'Home' ? colors.surfie : colors.inkFaint} />
        </View>
        <Text style={[s.tabLabel, activeTab === 'Home' && s.tabLabelActive]}>Home</Text>
      </Pressable>

      {/* Tab 2: Appointments */}
      <Pressable
        onPress={() => handleTabPress('Appointments')}
        style={s.tabItem}
        accessibilityRole="button"
        accessibilityLabel="Appointments"
      >
        <View style={[s.tabIconWrap, activeTab === 'Appointments' && s.tabIconWrapActive]}>
          <Icon name="calendar" size={20} color={activeTab === 'Appointments' ? colors.surfie : colors.inkFaint} />
        </View>
        <Text style={[s.tabLabel, activeTab === 'Appointments' && s.tabLabelActive]}>Appointments</Text>
      </Pressable>

      {/* Tab 3: Care Plan (Center Circular Elevated Pill) */}
      <Pressable
        onPress={() => handleTabPress('CarePlan')}
        style={s.centerTabItem}
        accessibilityRole="button"
        accessibilityLabel="Care Plan"
      >
        <View style={[s.centerButton, activeTab === 'CarePlan' && s.centerButtonActive]}>
          <Icon name="shieldCheck" size={24} color={colors.white} />
        </View>
        <Text style={[s.centerTabLabel, activeTab === 'CarePlan' && s.tabLabelActive]}>Care Plan</Text>
      </Pressable>

      {/* Tab 4: Care Hub */}
      <Pressable
        onPress={() => handleTabPress('CareHub')}
        style={s.tabItem}
        accessibilityRole="button"
        accessibilityLabel="Care Hub"
      >
        <View style={[s.tabIconWrap, activeTab === 'CareHub' && s.tabIconWrapActive]}>
          <Icon name="heart" size={20} color={activeTab === 'CareHub' ? colors.surfie : colors.inkFaint} />
        </View>
        <Text style={[s.tabLabel, activeTab === 'CareHub' && s.tabLabelActive]}>Care Hub</Text>
      </Pressable>

      {/* Tab 5: Profile */}
      <Pressable
        onPress={() => handleTabPress('Profile')}
        style={s.tabItem}
        accessibilityRole="button"
        accessibilityLabel="Profile"
      >
        <View style={[s.tabIconWrap, activeTab === 'Profile' && s.tabIconWrapActive]}>
          <Icon name="user" size={20} color={activeTab === 'Profile' ? colors.surfie : colors.inkFaint} />
        </View>
        <Text style={[s.tabLabel, activeTab === 'Profile' && s.tabLabelActive]}>Profile</Text>
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: '#EEF8F5',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkFaint,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  centerTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.surfie,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: colors.white,
  },
  centerButtonActive: {
    backgroundColor: '#0A5C54',
  },
  centerTabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkFaint,
    marginTop: 2,
  },
});

export default PatientTabBar;
