import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
  ApiError,
  DomainCode,
  LANGUAGE_LABELS,
  consultationsApi,
  intakeApi,
  invalidate,
  messageFor,
  toLocalDateKey,
  useMutation,
  useProfile,
  useServiceSlots,
  type Consultation,
  type Slot,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Banner,
  Button,
  Card,
  DayStrip,
  EmptyState,
  ErrorState,
  Icon,
  Screen,
  SectionHeader,
  Skeleton,
  StepProgress,
  TimeSlot,
  type DayOption,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { EmergencyButton } from '../../components/EmergencyGuidance';
import { formatInr, formatTime, formatWhen } from '../../lib/consultation';
import { useCareFlow } from '../flow/CareFlowProvider';
import { useNavigator } from '../navigation/Navigator';

/**
 * PT-07-01 — pick a time, not a person.
 *
 * *** THIS SCREEN IS WHERE GAP G-1 IS VISIBLE, AND IT DOES NOT HIDE IT. ***
 * There is no patient-facing slot lookup, so the times below are candidates:
 * bounded by the one real figure the backend does give (`soonestAvailableAt`
 * from search, the soonest the POOL can cover this service) and confirmed by
 * `POST /v1/me/consultations`, which is the authority. Candidate chips render
 * with a dashed edge and the screen says plainly that availability is confirmed
 * at booking. The alternative — presenting guesses as a diary — is what
 * PT-07-01 calls "guesswork corrected by a booking refusal".
 *
 * All of that lives in `@coracure/api`'s `slots.ts`. This screen only renders
 * what it is given, so closing G-1 changes nothing here.
 *
 * *** LANGUAGE IS A HARD ASSIGNMENT RULE AND THE SCREEN PROMISES IT. *** The
 * backend never relaxes preferred language to fill a slot — region it may
 * relax, language never — so this can be stated as a fact rather than a hope.
 */

const DAYS_AHEAD = 14;
/** Until the pool's real duration is known, this is the booking granularity. */
const ASSUMED_DURATION_MINUTES = 30;

type Band = 'morning' | 'afternoon' | 'evening';

const bandOf = (iso: string): Band => {
  const h = new Date(iso).getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export const ChooseTimeScreen = () => {
  const t = useT();
  const { back, navigate, replace } = useNavigator();
  const flow = useCareFlow();
  const profile = useProfile();

  const [dayIndex, setDayIndex] = useState(0);

  /**
   * Consult Now (PT-13-01), from the same screen.
   *
   * A patient looking at times is exactly the person who might decide they
   * cannot wait, so the alternative belongs here rather than behind a separate
   * entry. It creates the request and hands off to the matching screen — the
   * patient never sees, or picks, who is being asked.
   */
  const instant = useMutation<void, Consultation>(() =>
    intakeApi.submitIntakeWithInstant({
      specialtyId: flow.service!.id,
      ...(flow.concernId ? { concernId: flow.concernId } : {}),
      answers: {},
    }),
  );

  const startInstant = async () => {
    if (!flow.service) return;
    try {
      const created = await instant.mutate();
      invalidate(['consultations']);
      navigate('instant', { consultationId: created.id });
    } catch (e) {
      const err = ApiError.of(e);
      if (err?.code === DomainCode.CONSENT_REQUIRED) navigate('consent');
      else if (err?.code === DomainCode.PROFILE_INCOMPLETE) navigate('profile');
      // Anything else renders from `instant.error` below.
    }
  };

  /**
   * Reschedule mode (PT-11-05). Present only when the detail screen put an
   * existing consultation into the flow. It MOVES that booking — it never
   * creates a second one alongside it.
   */
  const reschedule = useMutation<string, Consultation>((startsAt) =>
    consultationsApi.rescheduleConsultation(flow.rescheduleOf!, startsAt),
  );

  const days: DayOption[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return { date: d, ...(i === 0 ? { label: t('booking.today') } : {}) };
    });
  }, [t]);

  const activeDate = toLocalDateKey(days[dayIndex]!.date);
  const slots = useServiceSlots(flow.service?.id ?? null, activeDate, ASSUMED_DURATION_MINUTES);

  const language =
    profile.data?.preferredLanguage === 'hi' ? LANGUAGE_LABELS.hi : LANGUAGE_LABELS.en;

  const grouped = useMemo(() => {
    const out: Record<Band, Slot[]> = { morning: [], afternoon: [], evening: [] };
    (slots.data?.slots ?? []).forEach((slot) => out[bandOf(slot.startsAt)].push(slot));
    return out;
  }, [slots.data]);

  const hasAny = (slots.data?.slots.length ?? 0) > 0;

  // A service is required to be here at all. Reaching this without one means a
  // stale stack, so send them to pick one rather than rendering an empty shell.
  if (!flow.service) {
    return (
      <Screen scroll={false} header={<AppHeader title={t('chooseTime.title')} onBack={back} />}>
        <EmptyState
          icon="stethoscope"
          title={t('services.chooseTitle')}
          body={t('services.chooseSubtitle')}
          actionLabel={t('services.chooseTitle')}
          onAction={() => navigate('services')}
        />
      </Screen>
    );
  }

  const proceed = async () => {
    if (!flow.startsAt) return;

    if (flow.rescheduleOf) {
      try {
        const moved = await reschedule.mutate(flow.startsAt);
        invalidate(['consultations']);
        invalidate(['consultation']);
        flow.setRescheduleOf(null);
        flow.setStartsAt(null);
        // The backend returns the NEW consultation. If it needs paying for,
        // the hold starts now and checkout owns the countdown.
        if (moved.status === 'pending_payment') {
          replace('checkout', { consultationId: moved.id });
        } else {
          replace('consultation', { consultationId: moved.id });
        }
      } catch (e) {
        const err = ApiError.of(e);
        if (
          err?.code === DomainCode.SLOT_TAKEN ||
          err?.code === DomainCode.SLOT_UNAVAILABLE ||
          err?.code === DomainCode.NO_PROVIDER_AVAILABLE
        ) {
          flow.setStartsAt(null);
        }
        // Rendered from `reschedule.error` below.
      }
      return;
    }

    // Intake comes BEFORE booking: `intakeAnswers` travels in the create call
    // and there is no endpoint to attach them afterwards. See gap G-4.
    navigate('intake');
  };

  return (
    <Screen
      testID="choose-time"
      bottomInset
      header={
        <AppHeader
          title={t('chooseTime.title')}
          onBack={back}
          right={<EmergencyButton onPress={() => navigate('emergency')} />}
        />
      }
      footer={
        <View style={s.footer}>
          {!!flow.startsAt && (
            <Text style={s.selected}>
              {t('chooseTime.selected', { when: formatWhen(flow.startsAt) })}
            </Text>
          )}
          <Button
            label={flow.rescheduleOf ? t('chooseTime.rescheduleConfirm') : t('chooseTime.confirm')}
            onPress={proceed}
            trailingArrow
            loading={reschedule.isPending}
            disabled={!flow.startsAt || instant.isPending || reschedule.isPending}
            testID="confirm-time"
          />
          {/* Consult Now is a NEW request — it has no place in moving an old one. */}
          {!flow.rescheduleOf && (
            <Button
              label={t('chooseTime.consultNow')}
              variant="quiet"
              icon="video"
              onPress={startInstant}
              loading={instant.isPending}
              disabled={instant.isPending}
              testID="consult-now"
            />
          )}
        </View>
      }
    >
      {flow.rescheduleOf ? (
        <Banner
          tone="info"
          icon="calendar"
          title={t('chooseTime.reschedulingTitle')}
          body={t('chooseTime.reschedulingBody')}
        />
      ) : (
        <StepProgress step={2} total={4} label={t('careMatch.stepOf', { step: 2, total: 4 })} />
      )}

      {/* --------------------------- what is booked --------------------------- */}
      <Card elevation="card" style={s.service}>
        <View style={s.serviceRow}>
          <View style={s.flex}>
            <Text style={s.serviceName} numberOfLines={2}>
              {flow.service.name}
            </Text>
            <Text style={s.serviceMeta}>
              {t('chooseTime.duration', { minutes: ASSUMED_DURATION_MINUTES })}
            </Text>
          </View>
          <Text style={s.fee}>{formatInr(flow.service.consultationFeeInr)}</Text>
        </View>

        {/* The promise the flow is built on. */}
        <View style={s.promise}>
          <Icon name="language" size={17} color={colors.surfie} />
          <View style={s.flex}>
            <Text style={s.promiseText}>{t('chooseTime.matchPromise', { language })}</Text>
            <Text style={s.promiseSub}>{t('chooseTime.languageNeverRelaxed')}</Text>
          </View>
        </View>
      </Card>

      {/* ------------------------------- days -------------------------------- */}
      <DayStrip
        days={days}
        selectedIndex={dayIndex}
        onSelect={(i) => {
          setDayIndex(i);
          flow.setStartsAt(null);
        }}
      />

      {/* ------------------------------- times ------------------------------- */}
      {slots.isLoading && (
        <View style={s.block}>
          <Skeleton width="40%" height={14} />
          <View style={s.slotWrap}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} width={92} height={48} radius={radius.md} />
            ))}
          </View>
        </View>
      )}

      {slots.isError && !hasAny && (
        <ErrorState
          compact
          title={t('common.somethingWentWrong')}
          body={messageFor(slots.error)}
          onRetry={slots.refetch}
        />
      )}

      {slots.isSuccess && !hasAny && (
        <Card tone="mint" elevation="none">
          <EmptyState
            compact
            icon="clock"
            title={t('chooseTime.noTimes')}
            body={t('chooseTime.noTimesBody')}
          />
        </Card>
      )}

      {hasAny &&
        (['morning', 'afternoon', 'evening'] as const).map((band) =>
          grouped[band].length === 0 ? null : (
            <View key={band} style={s.block}>
              <SectionHeader title={t(`chooseTime.${band}`)} />
              <View style={s.slotWrap}>
                {grouped[band].map((slot) => (
                  <TimeSlot
                    key={slot.startsAt}
                    label={formatTime(new Date(slot.startsAt))}
                    selected={flow.startsAt === slot.startsAt}
                    estimated={slot.source === 'candidate'}
                    onPress={() => flow.setStartsAt(slot.startsAt)}
                    accessibilityHint={
                      slot.source === 'candidate' ? t('chooseTime.estimatedNote') : undefined
                    }
                  />
                ))}
              </View>
            </View>
          ),
        )}

      {/* ------------------- the honest note about G-1 ----------------------- */}
      {slots.data?.isEstimated && hasAny && (
        <View style={s.note}>
          <Icon name="info" size={15} color={colors.inkFaint} />
          <View style={s.flex}>
            <Text style={s.noteText}>{t('chooseTime.estimatedNote')}</Text>
            {!!slots.data.soonestAvailableAt && (
              <Text style={s.noteStrong}>
                {t('chooseTime.soonestKnown', {
                  when: formatWhen(slots.data.soonestAvailableAt),
                })}
              </Text>
            )}
          </View>
        </View>
      )}

      {!!reschedule.error && (
        <Banner
          tone={reschedule.error.isNetwork ? 'warn' : 'danger'}
          title={
            reschedule.error.code === DomainCode.NO_PROVIDER_AVAILABLE
              ? t('chooseTime.noProviderTitle')
              : undefined
          }
          body={
            reschedule.error.code === DomainCode.SLOT_TAKEN ||
            reschedule.error.code === DomainCode.SLOT_UNAVAILABLE
              ? t('chooseTime.slotTaken')
              : messageFor(reschedule.error, t('booking.bookingFailed'))
          }
          onDismiss={reschedule.reset}
        />
      )}

      {!!instant.error && (
        <Banner
          tone={instant.error.isNetwork ? 'warn' : 'danger'}
          body={messageFor(instant.error, t('booking.bookingFailed'))}
          onDismiss={instant.reset}
        />
      )}

      <Banner tone="info" body={t('findCare.neverPicksDoctor')} icon="shieldCheck" />
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: spacing.md },

  service: { gap: spacing.md },
  serviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  serviceName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.ink,
  },
  serviceMeta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
  },
  fee: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.surfie,
  },

  promise: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.mint,
  },
  promiseText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 19,
  },
  promiseSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 2,
  },

  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 17,
  },
  noteStrong: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '700',
    marginTop: 3,
  },

  footer: { gap: spacing.sm, paddingTop: spacing.sm },
  selected: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default ChooseTimeScreen;
