import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, Icon } from '@coracure/ui';
import FlowHeader from '../components/FlowHeader';
import { SERVICES } from '../data/doctors';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChooseService'>;

/**
 * "Choose a Service" — the entry to booking when the patient taps View All
 * rather than a service tile on the home screen. Tapping a service goes
 * straight to the doctor list filtered by it: picking the service IS the
 * decision, so there is no separate confirm step.
 */
export const ChooseServiceScreen = () => {
  const navigation = useNavigation<Nav>();

  return (
    <Screen contentStyle={s.content}>
      <FlowHeader />

      <Text style={s.title} accessibilityRole="header">Choose a Service</Text>
      <Text style={s.lede}>Select the type of care you are looking for today.</Text>

      <View style={s.list}>
        {SERVICES.map((service) => (
          <Pressable
            key={service.id}
            style={s.card}
            onPress={() => navigation.navigate('FindDoctor', { serviceName: service.name })}
            accessibilityRole="button"
            accessibilityLabel={service.name}
          >
            <View style={s.iconCircle}>
              <Icon name={service.icon} size={22} color={colors.surfie} />
            </View>
            <View style={s.cardText}>
              <Text style={s.cardTitle}>{service.name}</Text>
              <Text style={s.cardSub}>{service.description}</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.inkFaint} />
          </Pressable>
        ))}
      </View>

      <View style={s.secureRow}>
        <Icon name="shieldCheck" size={14} color={colors.surfie} />
        <Text style={s.secureText}>Secure. Private. Confidential.</Text>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.md,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    ...shadow.card,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 3 },
  cardTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  cardSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  secureText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
});

export default ChooseServiceScreen;
