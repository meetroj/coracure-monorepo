import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
  DomainCode,
  invalidate,
  legalApi,
  messageFor,
  useBill,
  useQuery,
  useCancelConsultation,
  useConsultation,
  useServices,
  useVideoReadiness,
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
  SectionHeader,
  Sheet,
  Skeleton,
  StatusPill,
  TextField,
  formatDuration,
  useCountdown,
} from '@coracure/ui';

import {
  STATUS_LABEL_KEY,
  STATUS_TONE,
  formatDateLong,
  formatInr,
  formatWhen,
  isHolding,
  isJoinable,
  serviceNameFor,
} from '../../lib/consultation';
import { AssignedProviderCard } from '../../components/AssignedProviderCard';
import { useCareFlow } from '../flow/CareFlowProvider';
import { useNavigator, useRouteParams } from '../navigation/Navigator';
import { useT } from '@coracure/i18n';

/**
 * One consultation.
 *
 * Two behaviours here are the contract, not decoration:
 *
 * - **The hold countdown.** A `pending_payment` row IS the slot hold. When
 *   `holdExpiresAt` passes, the booking is gone — so the countdown is shown,
 *   and the moment it reaches zero the screen stops offering payment and
 *   explains what happened instead.
 * - **The cancellation consequence comes BEFORE the action.** `NOT_REFUNDABLE`
 *   is a refusal the user should never be surprised by, so the policy note sits
 *   in the confirmation sheet rather than arriving as an error afterwards.
 */
export const ConsultationDetailScreen = () => {
  const { back, navigate } = useNavigator();
  const { consultationId } = useRouteParams('consultation');
  const t = useT();

  const consultation = useConsultation(consultationId);
  const services = useServices();
  const flow = useCareFlow();
  const cancel = useCancelConsultation();

  const c0 = consultation.data;
  // Both are plain reads. `readiness` issues nothing, so it is safe to ask for
  // as soon as the consultation is one that could have a call; the bill is only
  // meaningful once there is something to pay.
  const readiness = useVideoReadiness(
    consultationId,
    !!c0 && ['scheduled', 'awaiting_doctor', 'in_progress'].includes(c0.status),
  );
  const bill = useBill(consultationId, !!c0 && c0.status === 'pending_payment');

  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reason, setReason] = useState('');

  /**
   * Hands this consultation's SERVICE to the time picker.
   *
   * `rebook` is a new booking of the same service (a lapsed hold); `reschedule`
   * moves this one. The order matters: `setService` clears any reschedule mode,
   * so the mode is set after it.
   */
  const pickTime = (mode: 'reschedule' | 'rebook') => {
    const current = consultation.data;
    if (!current) return;
    const service = services.data?.find((x) => x.id === current.specialtyId) ?? null;
    flow.setService(service);
    flow.setStartsAt(null);
    if (mode === 'reschedule') flow.setRescheduleOf(current.id);
    navigate(service ? 'choose-time' : 'services');
  };

  /**
   * PT-11-05: the refund consequence, shown BEFORE the action.
   *
   * *** THE POLICY IS THE BACKEND'S, NOT THIS SCREEN'S. *** It is a published
   * legal document, versioned like consent, so the app fetches it rather than
   * encoding a rule that would go stale the first time finance changed it.
   * Only fetched when the sheet opens — a policy nobody is about to act on is
   * not worth a request.
   */
  const refundPolicy = useQuery(
    ['legal', 'document', 'refund_policy'],
    () => legalApi.getLegalDocument('refund_policy'),
    { enabled: cancelOpen, staleTime: 10 * 60_000 },
  );



  const c = consultation.data;
  const holdUntil = c && isHolding(c) && c.holdExpiresAt ? new Date(c.holdExpiresAt).getTime() : null;
  const secondsLeft = useCountdown(holdUntil);
  const holdExpired = holdUntil !== null && secondsLeft <= 0;

  const doCancel = async () => {
    try {
      await cancel.mutate({
        consultationId,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setCancelOpen(false);
      void consultation.refetch();
    } catch {
      // Rendered from `cancel.error` inside the sheet.
    }
  };

  if (consultation.isLoading) {
    return (
      <Screen testID="consultation-loading" header={<AppHeader title={t('consultation.title')} onBack={back} />}>
        <Skeleton height={120} radius={radius.card} />
        <Skeleton height={180} radius={radius.card} />
      </Screen>
    );
  }

  if (consultation.isError || !c) {
    return (
      <Screen scroll={false} header={<AppHeader title={t('consultation.title')} onBack={back} />}>
        <ErrorState
          title={t('consultation.loadError')}
          body={messageFor(consultation.error)}
          requestId={consultation.error?.requestId}
          onRetry={consultation.refetch}
        />
      </Screen>
    );
  }

  const serviceName = serviceNameFor(c, services.data);
  const canCancel = ['pending_payment', 'scheduled', 'awaiting_doctor'].includes(c.status);
  const joinable = isJoinable(c);

  return (
    <Screen
      testID="consultation"
      bottomInset
      header={<AppHeader title={t('consultation.title')} onBack={back} />}
      footer={
        joinable ? (
          <View style={s.footer}>
            <Button
              label={
                readiness.isFetching ? t('consultation.checking') : t('consultation.checkJoin')
              }
              icon="video"
              onPress={readiness.refetch}
              loading={readiness.isFetching}
              testID="check-join"
              accessibilityHint={t('consultation.checkJoinHint')}
            />
          </View>
        ) : undefined
      }
    >
      {/* ------------------------------ summary -------------------------- */}
      <Card elevation="raised" style={s.summary}>
        <View style={s.summaryHead}>
          <View style={s.flex}>
            <Text style={s.eyebrow}>
              {c.mode === 'instant' ? t('consultation.instant') : t('consultation.scheduled')}
            </Text>
            <Text style={s.title} accessibilityRole="header">
              {serviceName}
            </Text>
          </View>
          <StatusPill
            label={t(holdExpired ? STATUS_LABEL_KEY.expired : STATUS_LABEL_KEY[c.status])}
            tone={holdExpired ? STATUS_TONE.expired : STATUS_TONE[c.status]}
          />
        </View>

        <View style={s.facts}>
          <Fact
            icon="calendar"
            label={t('consultation.when')}
            value={formatDateLong(c.scheduledStartAt)}
          />
          <Fact
            icon="clock"
            label={t('consultation.time')}
            value={
              c.status === 'awaiting_doctor'
                ? t('consultation.matchingClinician')
                : formatWhen(c.scheduledStartAt)
            }
          />
          <Fact icon="tag" label={t('consultation.referenceLabel')} value={c.referenceCode} />
          <Fact icon="wallet" label={t('consultation.fee')} value={formatInr(c.consultationFeeInr)} />
        </View>
      </Card>

      {/* ------------------------------- hold ---------------------------- */}
      {isHolding(c) && !holdExpired && (
        <Banner
          tone="warn"
          title={t('consultation.holdTitle', { time: formatDuration(secondsLeft) })}
          body={t('consultation.holdBody')}
        />
      )}
      {holdExpired && (
        <Banner
          tone="danger"
          title={t('consultation.holdExpiredTitle')}
          body={t('consultation.holdExpiredBody')}
          actionLabel={t('consultation.bookAgain')}
          onAction={() => pickTime('rebook')}
        />
      )}

      {c.status === 'cancelled' && (
        <Banner
          tone="info"
          title={t('consultation.cancelledTitle')}
          body={
            c.cancellationReason
              ? t('consultation.cancelledReason', { reason: c.cancellationReason })
              : t('consultation.cancelledPlain')
          }
        />
      )}

      {/* ------------------------------- bill ---------------------------- */}
      {isHolding(c) && !holdExpired && (
        <View style={s.block}>
          <SectionHeader
            title={t('consultation.yourBill')}
            subtitle={t('consultation.yourBillSub')}
          />
          <Card elevation="card" style={s.bill}>
            {bill.isLoading && <Skeleton height={60} />}
            {bill.isError && (
              <Text style={s.billFallback}>
                {t('consultation.billFallback', { fee: formatInr(c.consultationFeeInr) })}
              </Text>
            )}
            {bill.data?.lines?.map((line) => (
              <View key={line.label} style={s.billLine}>
                <Text style={s.billLabel}>{line.label}</Text>
                <Text style={s.billAmount}>{formatInr(line.amountInr)}</Text>
              </View>
            ))}
            {!!bill.data && (
              <View style={[s.billLine, s.billTotal]}>
                <Text style={s.billTotalLabel}>{t('consultation.total')}</Text>
                <Text style={s.billTotalAmount}>{formatInr(bill.data.totalInr)}</Text>
              </View>
            )}
            {/*
              Checkout is deliberately NOT offered here. `POST /checkout` freezes
              the bill and returns gateway parameters, and the consultation is
              only paid by a verified gateway webhook — so calling it without a
              payment SDK to hand the result to would leave a frozen bill and no
              way to settle it. The gateway SDK is the outstanding dependency;
              see the note in `libs/api/src/endpoints/payments.ts`.
            */}
            <View style={s.billNote}>
              <Icon name="info" size={14} color={colors.inkFaint} />
              <Text style={s.billNoteText}>{t('consultation.paymentNote')}</Text>
            </View>
          </Card>
        </View>
      )}

      {/* --------------------------- call readiness ---------------------- */}
      {readiness.isSuccess && !!readiness.data && (
        <Card
          tone={readiness.data.joinable ? 'mint' : 'default'}
          elevation="card"
          style={s.readiness}
        >
          <View style={s.readinessHead}>
            <View style={[s.readinessIcon, readiness.data.joinable && s.readinessIconOn]}>
              <Icon
                name={readiness.data.joinable ? 'video' : 'clock'}
                size={18}
                color={readiness.data.joinable ? colors.white : colors.inkMuted}
              />
            </View>
            <View style={s.flex}>
              <Text style={s.readinessTitle}>
                {readiness.data.joinable
                  ? t('consultation.readyToJoin')
                  : t('consultation.notOpenYet')}
              </Text>
              <Text style={s.readinessBody}>
                {readiness.data.joinable
                  ? t('consultation.readyToJoinBody')
                  : (readiness.data.message ??
                    (readiness.data.opensAt
                      ? t('consultation.opensAt', { when: formatWhen(readiness.data.opensAt) })
                      : t('consultation.notOpenPlain')))}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/*
        The assigned professional (FR-4.3, PT-11-01) — named only once the
        booking is PAID. A held booking already has a `doctorId`; the card gates
        on `isProviderVisible`, not on the id existing.
      */}
      <AssignedProviderCard consultation={c} onChanged={consultation.refetch} />

      {/* ---------------------------- what's next ------------------------ */}
      <View style={s.block}>
        <SectionHeader title={t('consultation.whatNext')} />
        <Card elevation="card" style={s.steps}>
          <Step
            done={c.status !== 'pending_payment'}
            icon="wallet"
            title={t('consultation.step1')}
            body={t('consultation.step1Body')}
          />
          <Step
            done={!!c.doctorId}
            icon="stethoscope"
            title={t('consultation.step2')}
            body={t('consultation.step2Body')}
          />
          <Step
            done={c.status === 'completed'}
            icon="video"
            title={t('consultation.step3')}
            body={t('consultation.step3Body')}
            last
          />
        </Card>
      </View>

      {/* ------------------------------ privacy -------------------------- */}
      <View style={s.privacy}>
        <Icon name="banCircle" size={15} color={colors.inkFaint} />
        <Text style={s.privacyText}>{t('consultation.privacyNote')}</Text>
      </View>

      {canCancel && (
        <>
          <Button
            label={t('consultation.reschedule')}
            variant="secondary"
            icon="calendar"
            onPress={() => setRescheduleOpen(true)}
            testID="open-reschedule"
          />
          <Button
            label={t('consultation.cancelAction')}
            variant="quiet"
            onPress={() => setCancelOpen(true)}
            testID="open-cancel"
          />
        </>
      )}

      <Sheet
        visible={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title={t('consultation.rescheduleTitle')}
      >
        <Text style={s.sheetBody}>{t('consultation.rescheduleBody')}</Text>
        <View style={s.sheetActions}>
          <Button
            label={t('consultation.rescheduleConfirm')}
            // The service has to be known to hand it to the picker.
            disabled={!services.data}
            onPress={() => {
              setRescheduleOpen(false);
              // One time picker for booking and moving. In reschedule mode it
              // calls `POST .../reschedule` rather than creating a booking.
              pickTime('reschedule');
            }}
            testID="confirm-reschedule"
          />
          <Button
            label={t('consultation.keepIt')}
            variant="quiet"
            onPress={() => setRescheduleOpen(false)}
          />
        </View>
      </Sheet>

      <Sheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t('consultation.cancelTitle')}
      >
        <Text style={s.sheetBody}>
          {c.status === 'pending_payment'
            ? t('consultation.cancelHoldBody')
            : t('consultation.cancelPaidBody')}
        </Text>

        {/*
          PT-11-05: the refund consequence under the CURRENT policy, stated
          before the action rather than arriving as a `NOT_REFUNDABLE` error
          afterwards. Nothing about the policy is computed here — the published
          document is shown, because a rule encoded in the app is a rule that
          goes stale the first time finance changes it.
        */}
        <View style={s.policy}>
          <Text style={s.policyHeading}>{t('consultation.refundHeading')}</Text>
          {c.status === 'pending_payment' ? (
            <Text style={s.policyBody}>{t('consultation.refundHold')}</Text>
          ) : refundPolicy.isLoading ? (
            <Text style={s.policyBody}>{t('consultation.refundLoading')}</Text>
          ) : refundPolicy.isError || !refundPolicy.data ? (
            <Text style={s.policyBody}>{t('consultation.refundUnavailable')}</Text>
          ) : (
            <Text style={s.policyBody} numberOfLines={8}>
              {refundPolicy.data.body}
            </Text>
          )}
          <Button
            label={t('consultation.readPolicy')}
            variant="quiet"
            size="sm"
            onPress={() => {
              setCancelOpen(false);
              navigate('legal', { documentType: 'refund_policy' });
            }}
          />
        </View>

        <TextField
          label={t('consultation.cancelReason')}
          value={reason}
          onChangeText={setReason}
          placeholder={t('consultation.cancelReasonPlaceholder')}
          maxLength={200}
          multiline
          containerStyle={s.sheetField}
        />

        {!!cancel.error && (
          <Banner
            tone="danger"
            body={
              cancel.error.code === DomainCode.NOT_REFUNDABLE
                ? t('consultation.notRefundable')
                : messageFor(cancel.error)
            }
          />
        )}

        <View style={s.sheetActions}>
          <Button
            label={t('consultation.cancelAction')}
            variant="danger"
            onPress={doCancel}
            loading={cancel.isPending}
            testID="confirm-cancel"
          />
          <Button label={t('consultation.keepIt')} variant="quiet" onPress={() => setCancelOpen(false)} />
        </View>
      </Sheet>
    </Screen>
  );
};

const Fact = ({
  icon,
  label,
  value,
}: {
  icon: 'calendar' | 'clock' | 'tag' | 'wallet';
  label: string;
  value: string;
}) => (
  <View style={s.fact}>
    <Icon name={icon} size={15} color={colors.inkFaint} />
    <View style={s.flex}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={s.factValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

const Step = ({
  done,
  icon,
  title,
  body,
  last,
}: {
  done: boolean;
  icon: 'wallet' | 'stethoscope' | 'video';
  title: string;
  body: string;
  last?: boolean;
}) => (
  <View style={[s.step, !last && s.stepBorder]}>
    <View style={[s.stepIcon, done && s.stepIconDone]}>
      <Icon name={done ? 'check' : icon} size={16} color={done ? colors.white : colors.surfie} />
    </View>
    <View style={s.flex}>
      <Text style={s.stepTitle}>{title}</Text>
      <Text style={s.stepBody}>{body}</Text>
    </View>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: spacing.md },

  summary: { gap: spacing.lg, marginTop: spacing.sm },
  summaryHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  eyebrow: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: '600',
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 1,
  },

  facts: { gap: spacing.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  factLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  factValue: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    fontWeight: '700',
  },

  steps: { paddingVertical: 0 },
  step: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconDone: { backgroundColor: colors.surfie },
  stepTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  stepBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
    marginTop: 2,
  },

  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  privacyText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 16,
  },

  sheetBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 22,
  },
  sheetField: { marginTop: spacing.lg },
  sheetActions: { gap: spacing.sm, marginTop: spacing.lg },

  bill: { gap: spacing.sm },
  billLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  billAmount: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
    fontWeight: '600',
  },
  billTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  billTotalLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    fontWeight: '800',
  },
  billTotalAmount: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    color: colors.surfie,
    fontWeight: '800',
  },
  billFallback: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
  },
  billNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.xs },
  billNoteText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 16,
  },

  readiness: { gap: spacing.md },
  readinessHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  readinessIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessIconOn: { backgroundColor: colors.surfie },
  readinessTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.ink,
  },
  readinessBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
    marginTop: 2,
  },

  policy: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.mintSoft,
    borderWidth: 1,
    borderColor: colors.surface.line,
    gap: 6,
  },
  policyHeading: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '800',
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  policyBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
  },

  footer: { gap: spacing.sm, paddingTop: spacing.sm },
});

export default ConsultationDetailScreen;
