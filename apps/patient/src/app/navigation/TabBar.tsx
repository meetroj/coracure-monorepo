import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import { useT, type TranslationKey } from '@coracure/i18n';

import { TAB_ROUTES, type TabRoute } from './routes';

/**
 * Bottom navigation.
 *
 * Every item navigates — there is nothing here that only looks tappable. The
 * four destinations are the ones the backend actually supports for a patient:
 * their consultations, their files, and their own profile.
 */
const TABS: { key: TabRoute; labelKey: TranslationKey; icon: IconName }[] = [
  { key: 'dashboard', labelKey: 'tabs.home', icon: 'home' },
  { key: 'appointments', labelKey: 'tabs.appointments', icon: 'calendar' },
  { key: 'reports', labelKey: 'tabs.reports', icon: 'document' },
  { key: 'account', labelKey: 'tabs.profile', icon: 'user' },
];

export const TAB_BAR_BASE_HEIGHT = 64;

export const TabBar = ({
  active,
  onChange,
  profileBadge,
}: {
  active: TabRoute;
  onChange: (key: TabRoute) => void;
  profileBadge?: boolean;
}) => {
  // Android 15 draws edge-to-edge, so the gesture/nav bar overlaps the app
  // unless we pad by the real inset. A fixed value cannot be correct across
  // gesture-bar and 3-button devices.
  const insets = useSafeAreaInsets();
  const t = useT();

  return (
    <View
      style={[s.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.sm }]}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const on = active === tab.key;
        const label = t(tab.labelKey);
        return (
          <Pressable
            key={tab.key}
            testID={`tab-${tab.key}`}
            onPress={() => onChange(tab.key)}
            style={s.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
          >
            <View style={[s.iconWrap, on && s.iconWrapActive]}>
              <Icon
                name={tab.icon}
                size={22}
                color={on ? colors.surfie : colors.inkFaint}
                filled={on}
              />
              {tab.key === 'account' && profileBadge && <View style={s.badge} />}
            </View>
            <Text style={[s.label, on && s.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export { TAB_ROUTES };

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' },
  iconWrap: { paddingHorizontal: spacing.lg, paddingVertical: 5, borderRadius: radius.pill },
  iconWrapActive: { backgroundColor: colors.surface.selected },
  badge: {
    position: 'absolute',
    top: 3,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.paris,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  label: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkFaint,
  },
  labelActive: { color: colors.surfie, fontWeight: '700' },
});
