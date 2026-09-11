import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
  messageFor,
  useBill,
  useConsultation,
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
  SectionHeader,
  Skeleton,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { AssignedProviderCard } from '../../components/AssignedProviderCard';
import { formatInr, formatWhen, serviceNameFor } from '../../lib/consultation';
import { useNavigator, useRouteParams } from '../navigation/Navigator';

/**
 * PT-11-01 — payment is confirmed, so the assigned professional becomes
 * visible.
 *
 * *** THIS IS THE FIRST SCREEN IN THE WHOLE PATIENT FLOW THAT NAMES A
 * PROFESSIONAL, AND THAT IS THE POINT. *** Everything before it — search,
 * recommendations, the catalogue, the time picker, checkout — is about a
 * SERVICE and a TIME. The story says the profile becomes visible on payment,
 * and this screen is where "on payment" happens.
 *
 * The heading is "Your assigned professional", not "Your doctor" and certainly
 * not anything implying a choice. The note underneath says who did the
 * assigning and on what basis, so the patient understands the relationship they
 * are in: they picked care, we picked the person.
 *
 * *** IT IS ONLY REACHED FROM A BACKEND-CONFIRMED PAYMENT. *** Checkout routes
 * here after `checkSettlement` sees the consultation leave `pending_payment` —
 * which only a verified gateway webhook does. If someone lands here with a
 * consultation still holding, the screen says so rather than claiming success.
 */
export const PaymentSuccessScreen = () => {
  const t = useT();
  const { replace } = useNavigator();
  const { consultationId } = useRouteParams('paid');

  const consultation = useConsultation(consultationId);
  const bill = useBill(consultationId);
  const services = useServices();

  const c = consultation.data;

  if (consultation.isLoading) {
    return (
      <Screen testID="paid-loading" header={<AppHeader title={t('checkout.title')} />}>
        <Skeleton height={120} radius={radius.card} />
        <Skeleton height={160} radius={radius.card} />
      </Screen>
    );
  }

  if (consultation.isError || !c) {
    return (
      <Screen scroll={false} header={<AppHeader title={t('checkout.title')} />}>
        <ErrorState
          title={t('consultation.loadError')}
          body={messageFor(consultation.error)}
          requestId={consultation.error?.requestId}
          onRetry={consultation.refetch}
        />
      </Screen>
    );
  }

  // Defensive: never claim success for a row the backend still has holding.
  const settled = c.status !== 'pending_payment' && c.status !== 'expired';

  return (
    <Screen
      testID="paid"
      bottomInset
      header={<AppHeader title={settled ? t('paid.title') : t('checkout.confirming')} />}
      footer={
        <View style={s.footer}>
          <Button
            label={t('paid.viewAppointment')}
            trailingArrow
            onPress={() => replace('consultation', { consultationId })}
            testID="view-appointment"
          />
          <Button
            label={t('paid.viewDetails')}
            variant="quiet"
            onPress={() => replace('appointments')}
          />
        </View>
      }
    >
      {!settled ? (
        <Banner
          tone="warn"
          title={t('checkout.confirming')}
          body={t('checkout.confirmingBody')}
          actionLabel={t('checkout.checkAgain')}
          onAction={consultation.refetch}
        />
      ) : (
        <View style={s.hero}>
          <View style={s.tick}>
            <Icon name="checkCircle" size={34} color={colors.white} filled />
          </View>
          <Text style={s.title} accessibilityRole="header">
            {t('paid.title')}
          </Text>
          <Text style={s.body}>{t('paid.body')}</Text>
        </View>
      )}

      {/* --------------------- the assigned professional -------------------- */}
      {settled && (
        <AssignedProviderCard consultation={c} onChanged={consultation.refetch} />
      )}

      {/* ---------------------------- the booking --------------------------- */}
      <Card elevation="card" style={s.summary}>
        <Row
          icon="stethoscope"
          label={t('paid.service')}
          value={serviceNameFor(c, services.data)}
        />
        <Row icon="calendar" label={t('paid.when')} value={formatWhen(c.scheduledStartAt)} />
        <Row icon="tag" label={t('consultation.referenceLabel')} value={c.referenceCode} />
        <Row
          icon="wallet"
          label={t('paid.paidAmount')}
          value={formatInr(bill.data?.totalInr ?? c.consultationFeeInr)}
        />
      </Card>

      {/* ------------------------------ the bill ---------------------------- */}
      {!!bill.data?.lines?.length && (
        <View style={s.block}>
          <SectionHeader title={t('consultation.yourBill')} subtitle={t('consultation.yourBillSub')} />
          <Card elevation="card" style={s.bill}>
            {bill.data.lines.map((line) => (
              <View key={line.label} style={s.billLine}>
                <Text style={s.billLabel}>{line.label}</Text>
                <Text style={s.billAmount}>{formatInr(line.amountInr)}</Text>
              </View>
            ))}
            <View style={[s.billLine, s.billTotal]}>
              <Text style={s.billTotalLabel}>{t('consultation.total')}</Text>
              <Text style={s.billTotalAmount}>{formatInr(bill.data.totalInr)}</Text>
            </View>
          </Card>
        </View>
      )}

      {/* ---------------------------- what's next --------------------------- */}
      <View style={s.block}>
        <SectionHeader title={t('paid.nextSteps')} />
        <Card elevation="none" tone="mint" style={s.steps}>
          <Step icon="bell" text={t('paid.step1')} />
          <Step icon="video" text={t('paid.step2')} />
          <Step icon="calendar" text={t('paid.step3')} />
        </Card>
      </View>

      <View style={s.note}>
        <Icon name="banCircle" size={15} color={colors.inkFaint} />
        <Text style={s.noteText}>{t('paid.notRecorded')}</Text>
      </View>
    </Screen>
  );
};

const Row = ({
  icon,
  label,
  value,
}: {
  icon: 'stethoscope' | 'calendar' | 'tag' | 'wallet';
  label: string;
  value: string;
}) => (
  <View style={s.row} accessibilityLabel={`${label}: ${value}`}>
    <Icon name={icon} size={16} color={colors.inkFaint} />
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={s.rowValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const Step = ({ icon, text }: { icon: 'bell' | 'video' | 'calendar'; text: string }) => (
  <View style={s.step}>
    <View style={s.stepIcon}>
      <Icon name={icon} size={16} color={colors.surfie} />
    </View>
    <Text style={s.stepText}>{text}</Text>
  </View>
);

const s = StyleSheet.create({
  block: { gap: spacing.md },

  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  tick: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cta,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  body: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 330,
  },

  summary: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  rowValue: {
    flexShrink: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.ink,
  },

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

  steps: { gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
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
    lineHeight: 16,
  },

  footer: { gap: spacing.xs, paddingTop: spacing.sm },
});

export default PaymentSuccessScreen;
