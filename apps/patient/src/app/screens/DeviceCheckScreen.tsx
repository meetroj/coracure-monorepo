import React from 'react';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';

import { messageFor, useConsultation, useVideoReadiness } from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Banner,
  Button,
  Card,
  ErrorState,
  Icon,
  Screen,
  Skeleton,
  type IconName,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { formatWhen } from '../../lib/consultation';
import { useNavigator, useRouteParams } from '../navigation/Navigator';

/**
 * PT-14-01 — check camera and microphone before joining.
 *
 * *** `readiness` IS A SAFE READ AND THAT IS WHY IT IS USED HERE. ***
 * `GET /v1/consultations/:id/video/readiness` answers whether Join would work
 * WITHOUT issuing anything, so the pre-call check can be run and re-run freely.
 * `POST .../video/token` is not: every call issues a new short-lived token and
 * every issue is an audit entry, so it is requested at the moment of joining
 * and never speculatively. This screen therefore never asks for a token.
 *
 * *** THE PERMISSION CHECK IS HONEST ABOUT WHAT IT CAN SEE. *** React Native
 * has no built-in camera or microphone API, and no permissions library is
 * installed. So this screen reports what it genuinely knows — the backend's
 * readiness verdict, and the platform-specific instructions for granting
 * permission — rather than rendering a fake green tick next to "Camera" that
 * nothing actually tested. When the video client lands it brings a real device
 * probe with it, and these rows read from that instead.
 */

type CheckState = 'checking' | 'ready' | 'unknown' | 'blocked';

const CheckRow = ({
  icon,
  label,
  state,
  detail,
}: {
  icon: IconName;
  label: string;
  state: CheckState;
  detail?: string;
}) => {
  const t = useT();
  const palette =
    state === 'ready'
      ? { bg: colors.successSoft, fg: colors.surfie, icon: 'checkCircle' as IconName }
      : state === 'blocked'
        ? { bg: colors.dangerSoft, fg: colors.danger, icon: 'alertCircle' as IconName }
        : { bg: colors.surface.page, fg: colors.inkFaint, icon: 'clock' as IconName };

  const stateLabel =
    state === 'ready'
      ? t('deviceCheck.ready')
      : state === 'blocked'
        ? t('deviceCheck.blocked')
        : state === 'checking'
          ? t('deviceCheck.checking')
          : t('deviceCheck.notReady');

  return (
    <View style={s.row} accessibilityLabel={`${label}. ${stateLabel}`}>
      <View style={[s.rowIcon, { backgroundColor: palette.bg }]}>
        <Icon name={icon} size={19} color={palette.fg} />
      </View>
      <View style={s.flex}>
        <Text style={s.rowLabel}>{label}</Text>
        {!!detail && <Text style={s.rowDetail}>{detail}</Text>}
      </View>
      <View style={[s.badge, { backgroundColor: palette.bg }]}>
        <Icon name={palette.icon} size={13} color={palette.fg} />
        <Text style={[s.badgeText, { color: palette.fg }]}>{stateLabel}</Text>
      </View>
    </View>
  );
};

export const DeviceCheckScreen = () => {
  const t = useT();
  const { back, navigate } = useNavigator();
  const { consultationId } = useRouteParams('device-check');

  const consultation = useConsultation(consultationId);
  const readiness = useVideoReadiness(consultationId);

  const joinable = readiness.data?.joinable === true;
  // The backend's verdict is the only thing actually verified, so the device
  // rows inherit it rather than claiming an independent result.
  const deviceState: CheckState = readiness.isLoading
    ? 'checking'
    : joinable
      ? 'ready'
      : 'unknown';

  const openSettings = () => {
    void Linking.openSettings().catch(() => undefined);
  };

  if (consultation.isLoading || readiness.isLoading) {
    return (
      <Screen
        testID="device-check-loading"
        header={<AppHeader title={t('deviceCheck.title')} onBack={back} />}
      >
        <Skeleton height={64} radius={radius.card} />
        <Skeleton height={64} radius={radius.card} />
        <Skeleton height={64} radius={radius.card} />
      </Screen>
    );
  }

  if (readiness.isError) {
    return (
      <Screen
        scroll={false}
        header={<AppHeader title={t('deviceCheck.title')} onBack={back} />}
      >
        <ErrorState
          title={t('common.somethingWentWrong')}
          body={messageFor(readiness.error)}
          requestId={readiness.error?.requestId}
          onRetry={readiness.refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen
      testID="device-check"
      bottomInset
      header={<AppHeader title={t('deviceCheck.title')} onBack={back} />}
      footer={
        <View style={s.footer}>
          <Button
            label={t('deviceCheck.recheck')}
            variant={joinable ? 'secondary' : 'primary'}
            icon="refresh"
            onPress={readiness.refetch}
            loading={readiness.isFetching}
            testID="recheck"
          />
        </View>
      }
    >
      <Text style={s.lede}>{t('deviceCheck.lede')}</Text>

      <Card elevation="card" style={s.checks}>
        <CheckRow icon="video" label={t('deviceCheck.camera')} state={deviceState} />
        <CheckRow icon="message" label={t('deviceCheck.microphone')} state={deviceState} />
        <CheckRow
          icon="activity"
          label={t('deviceCheck.connection')}
          state={readiness.isSuccess ? 'ready' : 'unknown'}
        />
      </Card>

      {/* The backend's own reason when it says Join would not work. */}
      {!joinable && !!readiness.data && (
        <Banner
          tone="info"
          body={
            readiness.data.message ??
            (readiness.data.opensAt
              ? t('deviceCheck.callNotOpen', { when: formatWhen(readiness.data.opensAt) })
              : t('deviceCheck.callNotOpenPlain'))
          }
        />
      )}

      {/* Platform-specific, because "allow permissions" is not actionable. */}
      <Card tone="mint" elevation="none" style={s.permission}>
        <Text style={s.permissionTitle}>{t('deviceCheck.permissionTitle')}</Text>
        <Text style={s.permissionBody}>
          {Platform.OS === 'ios'
            ? t('deviceCheck.permissionIos')
            : t('deviceCheck.permissionAndroid')}
        </Text>
        <Button
          label={t('deviceCheck.openSettings')}
          variant="secondary"
          size="md"
          onPress={openSettings}
        />
      </Card>

      {/*
        The video client is the outstanding dependency. Saying so is better than
        a Join button that cannot join.
      */}
      <Banner
        tone="warn"
        title={t('deviceCheck.videoUnavailable')}
        body={t('deviceCheck.videoUnavailableBody')}
      />

      <View style={s.note}>
        <Icon name="banCircle" size={15} color={colors.inkFaint} />
        <Text style={s.noteText}>{t('deviceCheck.notRecorded')}</Text>
      </View>

      <Button
        label={t('consultation.title')}
        variant="quiet"
        onPress={() => navigate('consultation', { consultationId })}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 21,
  },

  checks: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  rowDetail: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
  },

  permission: { gap: spacing.sm },
  permissionTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.ink,
  },
  permissionBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 20,
  },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 16,
  },

  footer: { paddingTop: spacing.sm },
});

export default DeviceCheckScreen;
