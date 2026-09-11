import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import type { Consultation, Service } from '@coracure/api';
import { colors, radius, shadow, spacing, typography } from '@coracure/brand';
import { GradientFill, Icon, StatusPill, formatDuration, useCountdown } from '@coracure/ui';
import { useT } from '@coracure/i18n';


import { ProviderLine } from './ProviderLine';
import {
  STATUS_ICON,
  STATUS_LABEL_KEY,
  STATUS_TONE,
  formatWhen,
  isHolding,
  isJoinable,
  serviceNameFor,
  isProviderVisible,
} from '../lib/consultation';

/**
 * A consultation, as a card.
 *
 * `featured` is the hero treatment on the dashboard — the gradient card in the
 * design. The same component in plain form is the row in the appointments list,
 * so the two can never drift apart.
 *
 * *** THE COUNTDOWN IS NOT DECORATION. *** A `pending_payment` row IS the slot
 * hold and it expires. Showing `holdExpiresAt` ticking down is the difference
 * between a user who pays in time and one whose booking silently vanishes.
 */
export const AppointmentCard = ({
  consultation,
  services,
  featured = false,
  onPress,
  onPrimaryAction,
}: {
  consultation: Consultation;
  services: Service[] | undefined;
  featured?: boolean;
  onPress?: () => void;
  /** Pay / Join, depending on the status. Absent hides the button. */
  onPrimaryAction?: () => void;
}) => {
  const t = useT();
  const holding = isHolding(consultation);
  const holdUntil = holding && consultation.holdExpiresAt
    ? new Date(consultation.holdExpiresAt).getTime()
    : null;
  const secondsLeft = useCountdown(holdUntil);
  const expired = holdUntil !== null && secondsLeft <= 0;

  const serviceName = serviceNameFor(consultation, services);
  const joinable = isJoinable(consultation);

  const statusLabel = t(expired ? STATUS_LABEL_KEY.expired : STATUS_LABEL_KEY[consultation.status]);
  const statusTone = expired ? STATUS_TONE.expired : STATUS_TONE[consultation.status];

  const actionLabel = joinable
    ? t('consultation.joinNow')
    : holding && !expired
      ? t('consultation.payNow')
      : t('consultation.viewDetails');
  const showAction = !!onPrimaryAction && (joinable || (holding && !expired));

  const body = (
    <View style={[s.card, featured && s.featured]}>
      {featured && <GradientFill radius={radius.card * 1.2} />}

      <View style={s.head}>
        <View style={[s.icon, featured && s.iconOnBrand]}>
          <Icon
            name={STATUS_ICON[consultation.status]}
            size={19}
            color={featured ? colors.white : colors.surfie}
          />
        </View>
        <View style={s.flex}>
          <Text style={[s.eyebrow, featured && s.onBrandMuted]} numberOfLines={1}>
            {consultation.mode === 'instant'
              ? t('consultation.instant')
              : t('dashboard.nextConsultation')}
          </Text>
          <Text style={[s.title, featured && s.onBrand]} numberOfLines={2}>
            {serviceName}
          </Text>
        </View>
        {featured ? (
          <View style={s.pillOnBrand}>
            <Text style={s.pillOnBrandText}>{statusLabel}</Text>
          </View>
        ) : (
          <StatusPill label={statusLabel} tone={statusTone} />
        )}
      </View>

      {/*
        PT-11-06: upcoming items show the assigned professional. Legitimate
        here — this is a consultation already assigned to this patient, not a
        directory. Renders nothing until `doctorId` exists.
      */}
      <ProviderLine
        doctorId={isProviderVisible(consultation) ? consultation.doctorId : null}
        compact
        onBrand={featured}
      />

      <View style={s.metaRow}>
        <View style={s.meta}>
          <Icon name="clock" size={14} color={featured ? 'rgba(255,255,255,0.85)' : colors.inkFaint} />
          <Text style={[s.metaText, featured && s.onBrandMuted]} numberOfLines={1}>
            {consultation.status === 'awaiting_doctor'
              ? t('consultation.matchingClinician')
              : formatWhen(consultation.scheduledStartAt)}
          </Text>
        </View>
        <View style={s.meta}>
          <Icon name="tag" size={14} color={featured ? 'rgba(255,255,255,0.85)' : colors.inkFaint} />
          <Text style={[s.metaText, featured && s.onBrandMuted]} numberOfLines={1}>
            {consultation.referenceCode}
          </Text>
        </View>
      </View>

      {holding && !expired && (
        <View style={[s.holdBar, featured && s.holdBarOnBrand]} accessibilityLiveRegion="polite">
          <Icon name="alertTriangle" size={14} color={featured ? colors.white : colors.warn} />
          <Text style={[s.holdText, featured && s.onBrand]}>
            {t('consultation.holdTitle', { time: formatDuration(secondsLeft) })}
          </Text>
        </View>
      )}

      {expired && (
        <View style={s.holdBar}>
          <Icon name="alertCircle" size={14} color={colors.danger} />
          <Text style={[s.holdText, { color: colors.danger }]}>
            {t('consultation.holdExpiredTitle')}
          </Text>
        </View>
      )}

      {showAction && (
        <Pressable
          onPress={onPrimaryAction}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}, ${serviceName}`}
          style={({ pressed }) => [s.action, featured && s.actionOnBrand, pressed && s.pressed]}
        >
          <Text style={[s.actionText, featured && s.actionTextOnBrand]}>{actionLabel}</Text>
          <Icon name="arrowRight" size={15} color={featured ? colors.surfie : colors.white} />
        </Pressable>
      )}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${serviceName}, ${statusLabel}, ${formatWhen(consultation.scheduledStartAt)}`}
      style={({ pressed }) => pressed && s.pressed}
    >
      {body}
    </Pressable>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  featured: {
    borderRadius: radius.card * 1.2,
    borderWidth: 0,
    overflow: 'hidden',
    ...shadow.raised,
  },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnBrand: { backgroundColor: 'rgba(255,255,255,0.22)' },

  eyebrow: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: '600',
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 1,
  },
  onBrand: { color: colors.white },
  onBrandMuted: { color: 'rgba(255,255,255,0.85)' },

  pillOnBrand: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillOnBrandText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.white,
  },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  metaText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    fontWeight: '600',
  },

  holdBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warnSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  holdBarOnBrand: { backgroundColor: 'rgba(255,255,255,0.18)' },
  holdText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.warn,
    fontWeight: '700',
    lineHeight: 16,
  },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfie,
  },
  actionOnBrand: { backgroundColor: colors.white },
  actionText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.white,
  },
  actionTextOnBrand: { color: colors.surfie },
});

export default AppointmentCard;
