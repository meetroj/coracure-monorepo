import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import {
  LANGUAGE_LABELS,
  invalidate,
  messageFor,
  useCancelConsultation,
  useConsultation,
  useInstantStatus,
  useProfile,
  useServices,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Banner,
  Button,
  Card,
  ErrorState,
  Icon,
  Screen,
  Sheet,
  Skeleton,
  formatDuration,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { formatInr, serviceNameFor } from '../../lib/consultation';
import { useNavigator, useRouteParams } from '../navigation/Navigator';

/**
 * PT-13-01 — Consult Now.
 *
 * *** THE DOMINANT STATE IS "FINDING", NOT A PERSON. *** The reference makes a
 * named clinician the largest thing on the screen while the request is still
 * being routed, which reads as "here is your doctor, confirming" — the opposite
 * of what is happening. `GET /instant-status` returns
 * `{ attempts, stillSearching, accepted }` and deliberately carries NO doctor
 * ids, because "the patient does not choose, so they are not shown a list of
 * people who said no". So the screen shows the search, and there is nothing in
 * the response it could show instead even if it wanted to.
 *
 * *** RE-ROUTING IS AUTOMATIC AND THE SCREEN SAYS SO. *** A decline or a
 * timeout moves the request to the next professional with no action from the
 * patient. `attempts` going up is the proof, and it is surfaced — otherwise a
 * screen that sits on "finding…" for two minutes looks broken rather than busy.
 *
 * *** EVERY RE-ROUTE STILL RESPECTS LANGUAGE. *** Assignment never relaxes
 * preferred language, so the screen states it as a fact.
 */

const POLL_MS = 4000;

/** The pulsing search ring. Drawn, so it recolours with the tokens. */
const SearchPulse = ({ size = 132 }: { size?: number }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
            transform: [
              { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
            ],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 120 120">
          <Defs>
            <LinearGradient id="pulse" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.paris} stopOpacity="0.45" />
              <Stop offset="1" stopColor={colors.surfie} stopOpacity="0.12" />
            </LinearGradient>
          </Defs>
          <Circle cx="60" cy="60" r="56" fill="url(#pulse)" />
          <Circle cx="60" cy="60" r="40" fill={colors.surface.mint} />
        </Svg>
      </Animated.View>
      <View style={s.pulseCore}>
        <Icon name="stethoscope" size={34} color={colors.surfie} />
      </View>
    </View>
  );
};

export const InstantConsultScreen = () => {
  const t = useT();
  const { back, replace } = useNavigator();
  const { consultationId } = useRouteParams('instant');

  const consultation = useConsultation(consultationId);
  const services = useServices();
  const profile = useProfile();
  const cancel = useCancelConsultation();

  const [elapsed, setElapsed] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);

  const c = consultation.data;
  // Only poll while the request is genuinely outstanding.
  const isRouting = !!c && (c.status === 'awaiting_doctor' || c.status === 'pending_payment');
  const status = useInstantStatus(consultationId, isRouting);

  const language =
    profile.data?.preferredLanguage === 'hi' ? LANGUAGE_LABELS.hi : LANGUAGE_LABELS.en;
  const serviceName = serviceNameFor(c ?? ({} as never), services.data);

  // The waiting timer. Local, because the request has no start time on the wire
  // beyond `createdAt` — which is the right anchor when it is available.
  useEffect(() => {
    if (!isRouting) return;
    const started = c?.createdAt ? new Date(c.createdAt).getTime() : Date.now();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRouting, c?.createdAt]);

  // Poll the routing status.
  useEffect(() => {
    if (!isRouting) return;
    const id = setInterval(() => {
      void status.refetch();
      void consultation.refetch();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [isRouting, status, consultation]);

  // Accepted — somebody took it. Move on to the consultation.
  useEffect(() => {
    if (status.data?.accepted || (c && c.status === 'scheduled')) {
      invalidate(['consultations']);
      replace('consultation', { consultationId });
    }
  }, [status.data?.accepted, c, consultationId, replace]);

  const attempts = status.data?.attempts ?? 0;
  /** `stillSearching` false with nothing accepted means the pool is exhausted. */
  const exhausted = useMemo(
    () => !!status.data && !status.data.stillSearching && !status.data.accepted && attempts > 0,
    [status.data, attempts],
  );

  const doCancel = async () => {
    try {
      await cancel.mutate({ consultationId });
      setCancelOpen(false);
      replace('dashboard');
    } catch {
      // Rendered from `cancel.error` inside the sheet.
    }
  };

  if (consultation.isLoading) {
    return (
      <Screen testID="instant-loading" header={<AppHeader title={t('instant.title')} onBack={back} />}>
        <Skeleton height={160} radius={radius.card} />
        <Skeleton height={90} radius={radius.card} />
      </Screen>
    );
  }

  if (consultation.isError || !c) {
    return (
      <Screen scroll={false} header={<AppHeader title={t('instant.title')} onBack={back} />}>
        <ErrorState
          title={t('consultation.loadError')}
          body={messageFor(consultation.error)}
          requestId={consultation.error?.requestId}
          onRetry={consultation.refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen
      testID="instant"
      bottomInset
      header={<AppHeader title={t('instant.title')} onBack={back} />}
      footer={
        <Button
          label={t('instant.cancel')}
          variant="secondary"
          onPress={() => setCancelOpen(true)}
          disabled={cancel.isPending}
          testID="cancel-instant"
        />
      }
    >
      {/* ---------------------- what is being requested --------------------- */}
      <Card elevation="card" style={s.service}>
        <View style={s.serviceRow}>
          <View style={s.flex}>
            <Text style={s.serviceEyebrow}>{t('instant.requesting')}</Text>
            <Text style={s.serviceName} numberOfLines={2}>
              {serviceName}
            </Text>
          </View>
          <Text style={s.fee}>{formatInr(c.consultationFeeInr)}</Text>
        </View>
      </Card>

      {/* ------------------------- the matching state ----------------------- */}
      <View style={s.stage} accessibilityLiveRegion="polite">
        <SearchPulse />

        <Text style={s.finding} accessibilityRole="header">
          {exhausted ? t('instant.noneAvailable') : t('instant.finding')}
        </Text>

        {!exhausted && (
          <>
            <Text style={s.timer} accessibilityLabel={t('instant.waitingFor', { time: formatDuration(elapsed) })}>
              {formatDuration(elapsed)}
            </Text>

            {/*
              `attempts` is the automatic re-routing made visible. Without it a
              screen sitting on "finding…" looks stalled rather than working.
            */}
            {attempts > 0 && (
              <Text style={s.attempts}>
                {attempts === 1
                  ? t('instant.attemptsOne')
                  : t('instant.attempts', { count: attempts })}
              </Text>
            )}
          </>
        )}
      </View>

      {/* --------------------------- the guarantees ------------------------- */}
      <Card tone="mint" elevation="none" style={s.facts}>
        <View style={s.fact}>
          <Icon name="language" size={17} color={colors.surfie} />
          <Text style={s.factText}>{t('instant.languageFact', { language })}</Text>
        </View>
        <View style={s.fact}>
          <Icon name="refresh" size={17} color={colors.surfie} />
          <Text style={s.factText}>{t('instant.autoReroute')}</Text>
        </View>
        <View style={s.fact}>
          <Icon name="shieldCheck" size={17} color={colors.surfie} />
          <Text style={s.factText}>{t('instant.noChoiceFact')}</Text>
        </View>
      </Card>

      {exhausted && (
        <Banner
          tone="warn"
          title={t('instant.noneAvailable')}
          body={t('instant.noneAvailableBody')}
          actionLabel={t('chooseTime.title')}
          onAction={() => replace('choose-time')}
        />
      )}

      {status.isError && !exhausted && (
        <Banner
          tone="warn"
          body={t('instant.statusUnavailable')}
          actionLabel={t('common.retry')}
          onAction={status.refetch}
        />
      )}

      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title={t('instant.cancelTitle')}>
        <Text style={s.sheetBody}>{t('instant.cancelBody')}</Text>
        {!!cancel.error && <Banner tone="danger" body={messageFor(cancel.error)} />}
        <View style={s.sheetActions}>
          <Button
            label={t('instant.cancelConfirm')}
            variant="danger"
            onPress={doCancel}
            loading={cancel.isPending}
            testID="confirm-cancel-instant"
          />
          <Button
            label={t('instant.keepWaiting')}
            variant="quiet"
            onPress={() => setCancelOpen(false)}
          />
        </View>
      </Sheet>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  service: { gap: spacing.sm },
  serviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  serviceEyebrow: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: '600',
  },
  serviceName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 1,
  },
  fee: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.surfie,
  },

  stage: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  pulseCore: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finding: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginTop: spacing.lg,
  },
  timer: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '800',
    color: colors.surfie,
    letterSpacing: 1,
  },
  attempts: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    textAlign: 'center',
  },

  facts: { gap: spacing.md },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  factText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
  },

  sheetBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 22,
  },
  sheetActions: { gap: spacing.sm, marginTop: spacing.lg },
});

export default InstantConsultScreen;
