import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';

import { messageFor, useEmergencyGuidance, type CareHubItem, type EmergencyGuidance } from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import { Banner, Button, Icon, Sheet, Skeleton } from '@coracure/ui';
import { useT } from '@coracure/i18n';

/**
 * Emergency guidance (FR-5.6, FR-15.7, SRS 6.3).
 *
 * *** EVERY NUMBER ON THIS SCREEN COMES FROM THE BACKEND. *** The helplines are
 * clinically approved content that the client confirms before launch and can
 * change without an app release. A helpline that has changed number is worse
 * than no helpline at all, so this component renders what the server sends and
 * never a list of its own. When the server sends nothing, the fallback points
 * at local emergency services — a statement that cannot go stale — and offers
 * no numbers at all.
 *
 * The backend has TWO shapes for the same idea and both are handled:
 *
 * - `guidance` — the structured `EmergencyGuidance` carried on a CRISIS SEARCH
 *   response (`POST /search` with `crisis: true`). It has the helplines, so it
 *   is preferred whenever present.
 * - `GET /care-hub/emergency` — published content items, prose rather than
 *   structured helplines. This is the persistent entry point, reachable any
 *   time from any major screen.
 *
 * Dismissal is explicit. There is no scrim tap-to-close and no back-gesture
 * dismissal on the crisis path: somebody who has just typed that they want to
 * hurt themselves should not lose this screen by brushing the edge of it.
 */

/** Digits and the few separators a dialler accepts. Nothing else is dialled. */
const telHref = (raw: string): string | null => {
  const cleaned = raw.replace(/[^\d+*#]/g, '');
  return cleaned.length >= 3 ? `tel:${cleaned}` : null;
};

const Helpline = ({ name, number, available }: { name: string; number: string; available?: string }) => {
  const t = useT();
  const href = telHref(number);
  return (
    <Pressable
      onPress={() => {
        if (href) void Linking.openURL(href).catch(() => undefined);
      }}
      disabled={!href}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${t('emergency.callNumber', { number })}${
        available ? `. ${t('emergency.available', { when: available })}` : ''
      }`}
      style={({ pressed }) => [s.helpline, pressed && s.pressed]}
    >
      <View style={s.helplineIcon}>
        <Icon name="phone" size={19} color={colors.white} filled />
      </View>
      <View style={s.flex}>
        <Text style={s.helplineName}>{name}</Text>
        <Text style={s.helplineNumber}>{number}</Text>
        {!!available && (
          <Text style={s.helplineAvailable}>{t('emergency.available', { when: available })}</Text>
        )}
      </View>
      <Icon name="chevronRight" size={18} color={colors.danger} />
    </Pressable>
  );
};

/** The body, shared by the sheet and the full-screen crisis interrupt. */
export const EmergencyGuidanceBody = ({
  guidance,
  items,
  loading,
  error,
  onRetry,
}: {
  guidance?: EmergencyGuidance | null;
  items?: CareHubItem[] | null;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) => {
  const t = useT();

  if (loading) {
    return (
      <View style={s.body}>
        <Skeleton height={20} width="70%" />
        <Skeleton height={14} />
        <Skeleton height={64} radius={radius.card} />
        <Skeleton height={64} radius={radius.card} />
      </View>
    );
  }

  const hasStructured = !!guidance?.helplines?.length;
  const hasItems = !!items?.length;

  return (
    <View style={s.body}>
      {hasStructured && (
        <>
          <Text style={s.title} accessibilityRole="header">
            {guidance!.title}
          </Text>
          <Text style={s.message}>{guidance!.message}</Text>
          <View style={s.helplines}>
            {guidance!.helplines.map((h) => (
              <Helpline key={`${h.name}-${h.number}`} {...h} />
            ))}
          </View>
          {!!guidance!.footer && <Text style={s.footer}>{guidance!.footer}</Text>}
        </>
      )}

      {!hasStructured && hasItems && (
        <>
          {items!.map((item) => (
            <View key={item.id} style={s.item}>
              <Text style={s.title} accessibilityRole="header">
                {item.title}
              </Text>
              {!!item.summary && <Text style={s.message}>{item.summary}</Text>}
              {!!item.body && <Text style={s.message}>{item.body}</Text>}
            </View>
          ))}
        </>
      )}

      {/*
        Nothing published, or the read failed. No invented numbers — the
        fallback is the one instruction that is true everywhere and never goes
        out of date.
      */}
      {!hasStructured && !hasItems && (
        <>
          <Text style={s.title} accessibilityRole="header">
            {t('emergency.title')}
          </Text>
          <Text style={s.message}>{t('emergency.fallbackBody')}</Text>
          {!!error && (
            <Banner
              tone="warn"
              body={messageFor(error, t('common.genericErrorBody'))}
              actionLabel={onRetry ? t('common.retry') : undefined}
              onAction={onRetry}
            />
          )}
        </>
      )}

      <View style={s.note}>
        <Icon name="info" size={14} color={colors.inkFaint} />
        <Text style={s.noteText}>{t('emergency.notEmergencyService')}</Text>
      </View>
    </View>
  );
};

/**
 * The persistent entry point: a small button that opens the guidance.
 *
 * Present on every major patient screen, which is what SRS 6.3 means by
 * "persistently reachable" — not one link buried in settings.
 */
export const EmergencyButton = ({ onPress }: { onPress: () => void }) => {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('emergency.action')}
      accessibilityHint={t('emergency.actionHint')}
      style={({ pressed }) => [s.fab, pressed && s.pressed]}
      hitSlop={8}
    >
      <Icon name="alertTriangle" size={15} color={colors.danger} />
      <Text style={s.fabText}>{t('emergency.action')}</Text>
    </Pressable>
  );
};

/** The sheet form, used by the persistent button. */
export const EmergencySheet = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const t = useT();
  // Only fetched when the sheet is actually opened — this is a rarely-used
  // screen and there is no reason to hit the API on every app launch.
  const guidance = useEmergencyGuidance(visible);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('emergency.title')} maxHeightRatio={0.8}>
      <EmergencyGuidanceBody
        items={guidance.data}
        loading={guidance.isLoading}
        error={guidance.error}
        onRetry={guidance.refetch}
      />
      <Button label={t('common.close')} variant="secondary" onPress={onClose} />
    </Sheet>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },

  body: { gap: spacing.md, paddingBottom: spacing.md },
  item: { gap: spacing.sm },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.ink,
  },
  message: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 23,
  },
  footer: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 20,
  },

  helplines: { gap: spacing.sm },
  helpline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 64,
    borderRadius: radius.card,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F6D5D3',
  },
  helplineIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineName: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  helplineNumber: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.danger,
    marginTop: 1,
  },
  helplineAvailable: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  noteText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 16,
  },

  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F6D5D3',
  },
  fabText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '800',
    color: colors.danger,
  },
});

export default EmergencySheet;
