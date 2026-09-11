import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useAssignedProvider } from '@coracure/api';
import { colors, spacing, typography } from '@coracure/brand';
import { Avatar, Icon, Skeleton } from '@coracure/ui';
import { useT } from '@coracure/i18n';

/**
 * The assigned professional, in one line, for a consultation row.
 *
 * PT-11-06 wants upcoming items to show the assigned professional, and this is
 * legitimate everywhere it appears — an appointment list is a record of people
 * already assigned to this patient, not a directory of people to pick from.
 * `GET /doctors/:doctorId` is refused with a 404 to any patient not being
 * treated by that provider, so the endpoint could not serve a directory even if
 * a screen tried.
 *
 * *** IT RENDERS NOTHING BEFORE ASSIGNMENT. *** `doctorId` is null until the
 * backend assigns, and the hook stays disabled until then — so this never says
 * "to be confirmed" next to a name-shaped gap, and never fires a request it has
 * no id for.
 *
 * The name is deliberately NOT a link. Tapping it would be the first step back
 * towards a profile the patient can browse; the consultation itself is the
 * destination.
 */
export const ProviderLine = ({
  doctorId,
  compact,
  onBrand,
}: {
  doctorId: string | null;
  compact?: boolean;
  /** Inverts the palette for the gradient dashboard card. */
  onBrand?: boolean;
}) => {
  const t = useT();
  const provider = useAssignedProvider(doctorId);

  if (!doctorId) return null;

  if (provider.isLoading) {
    return (
      <View style={s.row}>
        <Skeleton width={compact ? 22 : 28} height={compact ? 22 : 28} radius={14} />
        <Skeleton width={120} height={12} />
      </View>
    );
  }

  // A failed lookup is not worth an error state on a list row — the row is
  // still useful without the name, so it simply falls back to the label.
  if (provider.isError || !provider.data) {
    return (
      <View style={s.row}>
        <Icon
          name="stethoscope"
          size={compact ? 14 : 16}
          color={onBrand ? 'rgba(255,255,255,0.85)' : colors.inkFaint}
        />
        <Text style={[s.fallback, onBrand && s.onBrandMuted]} numberOfLines={1}>
          {t('provider.assignedGeneric')}
        </Text>
      </View>
    );
  }

  const p = provider.data;

  return (
    <View
      style={s.row}
      accessibilityLabel={`${t('provider.sectionTitle')}: ${p.fullName}${
        p.qualification ? `, ${p.qualification}` : ''
      }`}
    >
      <Avatar
        initials={initialsOf(p.fullName)}
        size={compact ? 24 : 30}
        tone={onBrand ? 'light' : 'brand'}
      />
      <View style={s.flex}>
        <Text style={[s.name, compact && s.nameCompact, onBrand && s.onBrand]} numberOfLines={1}>
          {p.fullName}
        </Text>
        {!compact && !!p.qualification && (
          <Text style={[s.qualification, onBrand && s.onBrandMuted]} numberOfLines={1}>
            {p.qualification}
          </Text>
        )}
      </View>
    </View>
  );
};

/** Local copy — `profileApi.initialsOf` is for the patient's own name. */
const initialsOf = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.ink,
  },
  nameCompact: { fontSize: typography.size.xs },
  qualification: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    marginTop: 1,
  },
  fallback: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: '600',
  },
  onBrand: { color: colors.white },
  onBrandMuted: { color: 'rgba(255,255,255,0.85)' },
});

export default ProviderLine;
