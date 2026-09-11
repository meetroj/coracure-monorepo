import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import type { Service } from '@coracure/api';
import { colors, radius, shadow, spacing, typography } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { formatInr } from '../lib/consultation';

/**
 * A bookable service.
 *
 * The catalogue is configuration — a new service goes live from the admin panel
 * with no app release — so the icon cannot be a per-service asset. It is
 * matched from the service's own name and code against a small keyword table,
 * and anything unrecognised gets the stethoscope. A new specialty therefore
 * always renders correctly, just generically, until a keyword is added here.
 */
const ICON_KEYWORDS: [RegExp, IconName][] = [
  [/cardio|heart/i, 'heart'],
  [/neuro|brain|psych|mental/i, 'brain'],
  [/dent|tooth|oral/i, 'tooth'],
  [/ortho|bone|joint|spine|physio/i, 'bone'],
  [/derma|skin/i, 'sparkle'],
  [/ophthal|eye|vision/i, 'eye'],
  [/paed|pedia|child/i, 'user'],
  [/gyn|obstet|women|matern/i, 'heartPulse'],
  [/nutri|diet|wellness/i, 'activity'],
  [/pharm|medic|prescri/i, 'pill'],
  [/general|family|physician|gp/i, 'stethoscope'],
];

export const iconForService = (service: Pick<Service, 'name' | 'code'>): IconName => {
  const haystack = `${service.name} ${service.code}`;
  for (const [pattern, icon] of ICON_KEYWORDS) {
    if (pattern.test(haystack)) return icon;
  }
  return 'stethoscope';
};

/** The compact tile used in the dashboard's horizontal "Explore services" rail. */
export const ServiceTile = ({
  service,
  onPress,
}: {
  service: Service;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${service.name}, ${formatInr(service.consultationFeeInr)}`}
    accessibilityHint="Opens booking for this service"
    style={({ pressed }) => [s.tile, pressed && s.pressed]}
  >
    <View style={s.tileIcon}>
      <Icon name={iconForService(service)} size={22} color={colors.surfie} />
    </View>
    <Text style={s.tileName} numberOfLines={2}>
      {service.name}
    </Text>
    <Text style={s.tileFee}>{formatInr(service.consultationFeeInr)}</Text>
  </Pressable>
);

/** The full-width row used in the booking picker, where the detail matters. */
export const ServiceRow = ({
  service,
  selected,
  onPress,
}: {
  service: Service;
  selected?: boolean;
  onPress?: () => void;
}) => {
  const t = useT();
  return (
  <Pressable
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ checked: !!selected }}
    accessibilityLabel={`${service.name}, ${formatInr(service.consultationFeeInr)}${
      service.canPrescribe ? `, ${t('services.canPrescribe')}` : ''
    }`}
    style={({ pressed }) => [s.row, selected && s.rowSelected, pressed && s.pressed]}
  >
    <View style={[s.rowIcon, selected && s.rowIconSelected]}>
      <Icon name={iconForService(service)} size={20} color={colors.surfie} />
    </View>
    <View style={s.flex}>
      <Text style={s.rowName} numberOfLines={1}>
        {service.name}
      </Text>
      {!!service.description && (
        <Text style={s.rowDesc} numberOfLines={2}>
          {service.description}
        </Text>
      )}
      {service.canPrescribe && (
        <View style={s.prescribe}>
          <Icon name="prescription" size={11} color={colors.surfie} />
          <Text style={s.prescribeText}>{t('services.canPrescribe')}</Text>
        </View>
      )}
    </View>
    <View style={s.rowRight}>
      <Text style={s.rowFee}>{formatInr(service.consultationFeeInr)}</Text>
      {selected ? (
        <Icon name="checkCircle" size={20} color={colors.surfie} filled />
      ) : (
        <Icon name="chevronRight" size={18} color={colors.inkFaint} />
      )}
    </View>
  </Pressable>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },

  tile: {
    width: 108,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    gap: spacing.sm,
    ...shadow.card,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 17,
  },
  tileFee: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '700',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surface.line,
  },
  rowSelected: { borderColor: colors.surfie, backgroundColor: colors.surface.mint },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconSelected: { backgroundColor: colors.white },
  rowName: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.ink,
  },
  rowDesc: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  prescribe: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  prescribeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.surfie,
    fontWeight: '700',
  },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowFee: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.ink,
  },
});

export default ServiceTile;
