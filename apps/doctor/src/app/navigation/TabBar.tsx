import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { useStore } from '../../state/store';

/** Fixed order, used everywhere in the doctor app. */
export const TABS: { route: string; key: string; label: string; icon: IconName }[] = [
  { route: 'DashboardTab', key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { route: 'AppointmentsTab', key: 'appointments', label: 'Appointments', icon: 'calendar' },
  { route: 'CasesTab', key: 'cases', label: 'Cases', icon: 'folder' },
  { route: 'ClarificationsTab', key: 'clarifications', label: 'Clarifications', icon: 'message' },
  { route: 'ProfileTab', key: 'profile', label: 'Profile', icon: 'user' },
];

/** Row height excluding the safe-area inset. */
const TAB_ROW_H = 62;
const INACTIVE = '#6F7F8D';

/**
 * Bottom navigation with a sliding mint selection background.
 *
 * Profile carries a dot while there is an account status the doctor has not yet
 * seen — a new submission, a rejection or an approval.
 */
export const TabBar = ({ state, navigation }: BottomTabBarProps) => {
  // Android draws edge-to-edge, so the gesture/nav bar overlaps the app unless
  // the bar pads by the real inset.
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const accountNeedsAttention = useStore((s) => !s.verification.acknowledged);

  const index = state.index;
  const tabWidth = barWidth > 0 ? barWidth / TABS.length : 0;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (tabWidth === 0) return;
    const to = index * tabWidth;
    if (reduceMotion) {
      slide.setValue(to);
      return;
    }
    Animated.timing(slide, {
      toValue: to,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, tabWidth, reduceMotion, slide]);

  return (
    <View
      style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      <View style={s.tabRow}>
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[s.highlight, { width: tabWidth, transform: [{ translateX: slide }] }]}
          >
            <View style={s.highlightFill} />
          </Animated.View>
        )}

        {state.routes.map((route, i) => {
          const tab = TABS.find((t) => t.route === route.name);
          if (!tab) return null;
          const on = index === i;
          const badge = tab.key === 'profile' && accountNeedsAttention;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${tab.key}`}
              onPress={() => {
                // the nested stack hears this event too: a second tap on the
                // active tab returns it to its root
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!on && !event.defaultPrevented) navigation.navigate(route.name as never);
              }}
              style={s.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={badge ? `${tab.label}, needs attention` : tab.label}
            >
              <View>
                <Icon name={tab.icon} size={21} color={on ? colors.surfie : INACTIVE} />
                {badge && <View testID="profile-badge" style={s.badge} />}
              </View>
              <Text style={[s.tabLabel, on && s.tabLabelActive]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    shadowColor: '#0E766C',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  tabRow: { flexDirection: 'row', height: TAB_ROW_H, overflow: 'hidden' },
  highlight: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  highlightFill: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surface.mint },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { ...typeStyles.navigation, color: INACTIVE, textAlign: 'center' },
  tabLabelActive: { color: colors.surfie, fontWeight: fontWeight.semibold },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.warn,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
});

export default TabBar;
