import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

import {
  ApiError,
  DomainCode,
  intakeApi,
  invalidate,
  messageFor,
  useIntakeForm,
  useMutation,
  type Consultation,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Banner,
  Button,
  Card,
  Icon,
  Screen,
  Skeleton,
  StepProgress,
  TextField,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { clearDraft, draftKeys, useDraft } from '../../lib/drafts';
import {
  IntakeQuestionField,
  cleanAnswers,
  isAnswered,
  requiredMissing,
  type IntakeAnswers,
} from '../../components/IntakeQuestionField';
import { formatInr, formatWhen } from '../../lib/consultation';
import { useCareFlow } from '../flow/CareFlowProvider';
import { useNavigator } from '../navigation/Navigator';

/**
 * PT-11-03 — the pre-consult intake.
 *
 * *** THIS SCREEN IS ALSO WHERE THE BOOKING IS CREATED, AND THAT IS FORCED. ***
 * `intakeAnswers` travels in the body of `POST /v1/me/consultations`; there is
 * no route that attaches answers to an existing consultation. So intake has to
 * be collected BEFORE the consultation exists, not after payment as the
 * reference flow shows. Gap G-4 in `endpoints/intake.ts` has the detail.
 *
 * *** THE SPECIALTY'S OWN QUESTIONS ARE NOT AVAILABLE. *** `intakeForm` is a
 * column on the specialty, exposed only on the admin controller. Rather than
 * invent a patient endpoint, the screen renders the one question that genuinely
 * reaches the professional today — free text — and says so. Inventing clinical
 * triage questions here would be worse than asking none: they would look
 * authoritative and be nobody's.
 *
 * SH-03: the answer is a draft, so a failed booking or a backgrounded app does
 * not lose what the patient wrote. It is cleared only once the booking succeeds.
 */
export const IntakeScreen = () => {
  const t = useT();
  const { back, navigate, replace } = useNavigator();
  const flow = useCareFlow();

  const specialtyId = flow.service?.id ?? null;
  const form = useIntakeForm(specialtyId);
  const draftKey = draftKeys.intake(specialtyId ?? 'none');
  // SH-03: every answer is a draft until the booking succeeds.
  const [answers, setAnswers] = useDraft<IntakeAnswers>(draftKey, {});
  // Validation shows only after a first attempt — no errors while typing.
  const [showErrors, setShowErrors] = useState(false);

  const book = useMutation<{ skip: boolean }, Consultation>(({ skip }) => {
    if (!flow.service || !flow.startsAt) {
      throw new ApiError({
        statusCode: 0,
        code: 'VALIDATION_FAILED',
        message: 'A service and a time are required.',
      });
    }
    return intakeApi.submitIntakeWithBooking({
      specialtyId: flow.service.id,
      startsAt: flow.startsAt,
      ...(flow.concernId ? { concernId: flow.concernId } : {}),
      answers: skip ? {} : cleanAnswers(answers),
    });
  });

  const submit = async (skip: boolean) => {
    // Required questions block continuing — but skipping intake entirely is
    // always allowed, because an unanswered form must never stop somebody
    // getting care.
    if (!skip && form.data && requiredMissing(form.data.questions, answers).length > 0) {
      setShowErrors(true);
      return;
    }
    try {
      const consultation = await book.mutate({ skip });
      // Only now is it safe to drop what they wrote.
      clearDraft(draftKey);
      invalidate(['consultations']);

      // A free service is confirmed outright — there is nothing to pay, so
      // checkout would be a dead screen.
      if (consultation.status === 'pending_payment') {
        replace('checkout', { consultationId: consultation.id });
      } else {
        replace('consultation', { consultationId: consultation.id });
      }
    } catch (e) {
      const err = ApiError.of(e);
      // The two "you are not ready yet" refusals route rather than display.
      if (err?.code === DomainCode.CONSENT_REQUIRED) navigate('consent');
      else if (err?.code === DomainCode.PROFILE_INCOMPLETE) navigate('profile');
      // NO_PROVIDER_AVAILABLE and SLOT_TAKEN belong to the time picker, so send
      // the patient back there with the refusal in hand rather than stranding
      // them on a form that cannot fix it.
      else if (
        err?.code === DomainCode.NO_PROVIDER_AVAILABLE ||
        err?.code === DomainCode.SLOT_TAKEN ||
        err?.code === DomainCode.SLOT_UNAVAILABLE
      ) {
        flow.setStartsAt(null);
      }
    }
  };

  const bookingError = book.error;
  const soonest = useMemo(() => {
    if (bookingError?.code !== DomainCode.NO_PROVIDER_AVAILABLE) return null;
    const d = bookingError.details as Record<string, unknown> | null;
    const raw =
      d?.['soonestAvailableAt'] ?? d?.['soonestAt'] ?? d?.['nextAvailableAt'] ?? d?.['availableFrom'];
    return typeof raw === 'string' && !Number.isNaN(new Date(raw).getTime()) ? raw : null;
  }, [bookingError]);

  if (!flow.service || !flow.startsAt) {
    return (
      <Screen scroll={false} header={<AppHeader title={t('intake.title')} onBack={back} />}>
        <Banner
          tone="warn"
          body={t('chooseTime.pickAnother')}
          actionLabel={t('chooseTime.title')}
          onAction={() => navigate('choose-time')}
        />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        testID="intake"
        bottomInset
        header={<AppHeader title={t('intake.title')} onBack={back} />}
        footer={
          <View style={s.footer}>
            <Button
              label={t('intake.continue')}
              onPress={() => submit(false)}
              trailingArrow
              loading={book.isPending}
              disabled={book.isPending}
              testID="intake-continue"
            />
            <Button
              label={t('intake.skipAndContinue')}
              variant="quiet"
              onPress={() => submit(true)}
              disabled={book.isPending}
              testID="intake-skip"
            />
          </View>
        }
      >
        <StepProgress step={3} total={4} label={t('careMatch.stepOf', { step: 3, total: 4 })} />

        {/* ------------------------ what is being booked ---------------------- */}
        <Card elevation="card" style={s.summary}>
          <Text style={s.summaryName}>{flow.service.name}</Text>
          <View style={s.summaryRow}>
            <Icon name="clock" size={15} color={colors.inkFaint} />
            <Text style={s.summaryMeta}>{formatWhen(flow.startsAt)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Icon name="wallet" size={15} color={colors.inkFaint} />
            <Text style={s.summaryMeta}>{formatInr(flow.service.consultationFeeInr)}</Text>
          </View>
        </Card>

        <Text style={s.lede}>{t('intake.lede')}</Text>

        {/* --------------------------- booking refusals ----------------------- */}
        {!!soonest && (
          <Card tone="mint" elevation="card" style={s.refusal}>
            <Text style={s.refusalTitle}>{t('chooseTime.noProviderTitle')}</Text>
            <Text style={s.refusalBody}>
              {t('chooseTime.noProviderWithSoonest', { when: formatWhen(soonest) })}
            </Text>
            <Button
              label={t('chooseTime.bookSoonest', { when: formatWhen(soonest) })}
              size="md"
              onPress={() => {
                flow.setStartsAt(soonest);
                book.reset();
              }}
            />
            <Button
              label={t('chooseTime.pickAnother')}
              variant="quiet"
              onPress={() => navigate('choose-time')}
            />
          </Card>
        )}

        {!!bookingError && !soonest && (
          <Banner
            tone={bookingError.isNetwork ? 'warn' : 'danger'}
            body={
              bookingError.code === DomainCode.SLOT_TAKEN ||
              bookingError.code === DomainCode.SLOT_UNAVAILABLE
                ? t('chooseTime.slotTaken')
                : messageFor(bookingError, t('booking.bookingFailed'))
            }
            actionLabel={t('chooseTime.pickAnother')}
            onAction={() => navigate('choose-time')}
            onDismiss={book.reset}
          />
        )}

        {/* ------------------------------- the form --------------------------- */}
        {form.isLoading ? (
          <View style={s.block}>
            <Skeleton width="45%" height={14} />
            <Skeleton height={120} radius={radius.input} />
          </View>
        ) : (
          <>
            {(form.data?.questions.length ?? 0) > 1 && (
              <Text style={s.progressText} accessibilityLiveRegion="polite">
                {t('intake.progress', {
                  answered: (form.data?.questions ?? []).filter((q) => isAnswered(answers[q.id]))
                    .length,
                  total: form.data?.questions.length ?? 0,
                })}
              </Text>
            )}

            {/*
              Rendered from the form description, not hardcoded. Backend labels
              are shown verbatim; only the app's own fallback question (while G-4
              is open) takes localised copy.
            */}
            {form.data?.questions.map((q) => {
              const fallback =
                !form.data?.formAvailable && q.id === intakeApi.FREE_TEXT_QUESTION.id;
              return (
                <IntakeQuestionField
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={(next) => setAnswers({ ...answers, [q.id]: next })}
                  showErrors={showErrors}
                  editable={!book.isPending}
                  {...(fallback
                    ? {
                        labelOverride: t('intake.freeTextLabel'),
                        placeholder: t('intake.freeTextPlaceholder'),
                        hint: t('intake.optionalNote'),
                      }
                    : {})}
                />
              );
            })}

            {/* PT-11-03 attachments need a document picker this build lacks. */}
            <View style={s.note}>
              <Icon name="upload" size={15} color={colors.inkFaint} />
              <Text style={s.noteText}>{t('intake.attachmentsUnavailable')}</Text>
            </View>

            {/* Honest about G-4 rather than implying these are the real questions. */}
            {form.data && !form.data.formAvailable && (
              <View style={s.note}>
                <Icon name="info" size={15} color={colors.inkFaint} />
                <Text style={s.noteText}>{t('intake.genericFormNote')}</Text>
              </View>
            )}
          </>
        )}

        <View style={s.note}>
          <Icon name="lock" size={15} color={colors.inkFaint} />
          <Text style={s.noteText}>{t('intake.privacy')}</Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: spacing.sm },
  field: { marginTop: spacing.xs },
  progressText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: '700',
  },

  summary: { gap: 6 },
  summaryName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.ink,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryMeta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    fontWeight: '600',
  },

  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 21,
  },

  refusal: { gap: spacing.md },
  refusalTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.ink,
  },
  refusalBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
  },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 17,
  },

  footer: { gap: spacing.xs, paddingTop: spacing.sm },
});

export default IntakeScreen;
