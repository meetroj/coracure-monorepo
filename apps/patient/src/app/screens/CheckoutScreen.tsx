import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';

import {
  DomainCode,
  PAYMENT_METHODS,
  invalidate,
  messageFor,
  paymentsApi,
  useBill,
  useConsultation,
  useMutation,
  type PaymentMethod,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Banner,
  Button,
  Card,
  CountdownTimer,
  ErrorState,
  Icon,
  Screen,
  SectionHeader,
  Skeleton,
  StepProgress,
  formatDuration,
  useCountdown,
  type IconName,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { formatInr } from '../../lib/consultation';
import { useCareFlow } from '../flow/CareFlowProvider';
import { useNavigator, useRouteParams } from '../navigation/Navigator';

/**
 * PT-12-01 and PT-12-02 — pay for a consultation, and see the bill in full.
 *
 * *** THE CLIENT NEVER DECIDES THAT PAYMENT SUCCEEDED. *** PT-12-01: "success
 * is confirmed by the backend, never by the client alone." The gateway
 * returning to the app means the gateway is done with the user; it does not
 * mean money moved. So after checkout this screen enters a `confirming` state
 * and re-reads the consultation until the backend moves it out of
 * `pending_payment` — which only a verified webhook does.
 *
 * *** THE HOLD IS THE BOOKING. *** A `pending_payment` row IS the slot hold.
 * The countdown is not decoration: when it reaches zero the slot is gone, and
 * the screen has to stop offering a Pay button and explain that nobody
 * cancelled anything — the window simply ran out.
 *
 * *** THE GATEWAY SDK IS NOT INSTALLED, AND THIS DOES NOT PRETEND OTHERWISE. ***
 * `POST /checkout` freezes the bill and returns what the gateway SDK needs.
 * Calling it with nothing to hand the result to would leave a frozen bill that
 * could never be settled, so the button is honest about the missing dependency
 * instead. Everything around it — the bill, the hold, the countdown, the expiry
 * path, the confirmation poll — is real and works.
 */

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

type Phase = 'choosing' | 'opening' | 'confirming' | 'settled' | 'failed' | 'expired';

const METHOD_ICON: Record<PaymentMethod, IconName> = {
  upi: 'phone',
  card: 'wallet',
  netbanking: 'idCard',
  wallet: 'tag',
};

export const CheckoutScreen = () => {
  const t = useT();
  const { back, replace, navigate } = useNavigator();
  const { consultationId } = useRouteParams('checkout');
  const flow = useCareFlow();

  const consultation = useConsultation(consultationId);
  const bill = useBill(consultationId);

  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [phase, setPhase] = useState<Phase>('choosing');
  const [polls, setPolls] = useState(0);

  const c = consultation.data;
  const holdUntil = c?.holdExpiresAt ? new Date(c.holdExpiresAt).getTime() : null;
  const secondsLeft = useCountdown(holdUntil);

  /** The only source of truth for "did it settle". */
  const confirm = useMutation<void, boolean>(async () => {
    const state = await paymentsApi.checkSettlement(consultationId);
    if (state.settled === true) {
      invalidate(['consultations']);
      invalidate(['consultation']);
      return true;
    }
    // Still `pending_payment`, or the sweep released it. Either way not settled.
    if (state.holdExpired === true) setPhase('expired');
    return false;
  });

  // Poll while confirming. Bounded — an unbounded poll on a webhook that never
  // lands is a battery drain and a screen the user cannot leave.
  useEffect(() => {
    if (phase !== 'confirming') return;
    if (polls >= MAX_POLLS) return;
    const id = setTimeout(async () => {
      const settled = await confirm.mutate().catch(() => false);
      if (settled) setPhase('settled');
      else setPolls((n) => n + 1);
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [phase, polls, confirm]);

  // If the consultation is already past pending_payment when we arrive, it is
  // paid — do not show a checkout for a booking that is done.
  useEffect(() => {
    if (c && c.status !== 'pending_payment' && c.status !== 'expired' && phase === 'choosing') {
      setPhase('settled');
    }
    if (c?.status === 'expired' && phase !== 'expired') setPhase('expired');
  }, [c, phase]);

  const onHoldExpired = useCallback(() => {
    setPhase('expired');
    void consultation.refetch();
  }, [consultation]);

  const pay = useMutation<void, void>(async () => {
    setPhase('opening');
    const session = await paymentsApi.openCheckout(consultationId);
    // Some gateways return a URL rather than an SDK payload. If one does, the
    // OS browser can carry the payment even without the SDK.
    const url = typeof session.paymentUrl === 'string' ? session.paymentUrl : null;
    if (url && (await Linking.canOpenURL(url))) {
      await Linking.openURL(url);
      setPhase('confirming');
      setPolls(0);
      return;
    }
    // No URL and no SDK: the bill is now frozen, so the honest thing is to say
    // the payment could not be opened and let them retry once a gateway exists.
    setPhase('failed');
  });

  /* ------------------------------- rendering ------------------------------ */

  if (consultation.isLoading) {
    return (
      <Screen testID="checkout-loading" header={<AppHeader title={t('checkout.title')} onBack={back} />}>
        <Skeleton height={72} radius={radius.card} />
        <Skeleton height={180} radius={radius.card} />
      </Screen>
    );
  }

  if (consultation.isError || !c) {
    return (
      <Screen scroll={false} header={<AppHeader title={t('checkout.title')} onBack={back} />}>
        <ErrorState
          title={t('consultation.loadError')}
          body={messageFor(consultation.error)}
          requestId={consultation.error?.requestId}
          onRetry={consultation.refetch}
        />
      </Screen>
    );
  }

  const total = bill.data?.totalInr ?? c.consultationFeeInr ?? 0;

  /*
   * Settled is its own SCREEN, not a panel here: PT-11-01 says the assigned
   * professional becomes visible on payment, and that belongs on a screen that
   * can introduce them properly rather than in the footer of a checkout.
   */
  if (phase === 'settled') {
    return (
      <Screen
        testID="checkout-settled"
        bottomInset
        header={<AppHeader title={t('checkout.title')} onBack={back} />}
        footer={
          <Button
            label={t('checkout.viewConsultation')}
            trailingArrow
            onPress={() => {
              flow.reset();
              replace('paid', { consultationId });
            }}
            testID="view-consultation"
          />
        }
      >
        <View style={s.result}>
          <View style={[s.resultIcon, s.resultIconOk]}>
            <Icon name="checkCircle" size={30} color={colors.white} filled />
          </View>
          <Text style={s.resultTitle} accessibilityRole="header">
            {t('checkout.paidTitle')}
          </Text>
          <Text style={s.resultBody}>{t('checkout.paidBody')}</Text>
        </View>
      </Screen>
    );
  }

  /* ------------------------------- expired -------------------------------- */
  if (phase === 'expired') {
    return (
      <Screen
        testID="checkout-expired"
        bottomInset
        header={<AppHeader title={t('checkout.title')} onBack={back} />}
        footer={
          <Button
            label={t('checkout.chooseNewTime')}
            trailingArrow
            onPress={() => {
              flow.setStartsAt(null);
              replace('choose-time');
            }}
            testID="choose-new-time"
          />
        }
      >
        <View style={s.result}>
          <View style={[s.resultIcon, s.resultIconWarn]}>
            <Icon name="alertTriangle" size={30} color={colors.white} filled />
          </View>
          <Text style={s.resultTitle} accessibilityRole="header">
            {t('checkout.expiredTitle')}
          </Text>
          <Text style={s.resultBody}>{t('checkout.expiredBody')}</Text>
        </View>
      </Screen>
    );
  }

  /* ------------------------------ confirming ------------------------------ */
  if (phase === 'confirming') {
    return (
      <Screen
        testID="checkout-confirming"
        bottomInset
        header={<AppHeader title={t('checkout.title')} />}
        footer={
          <Button
            label={t('checkout.checkAgain')}
            variant="secondary"
            loading={confirm.isPending}
            onPress={() => {
              setPolls(0);
              void confirm.mutate().then((settled) => settled && setPhase('settled'));
            }}
            testID="check-again"
          />
        }
      >
        <View style={s.result}>
          <View style={[s.resultIcon, s.resultIconBrand]}>
            <Icon name="clock" size={30} color={colors.white} />
          </View>
          <Text style={s.resultTitle} accessibilityRole="header">
            {t('checkout.confirming')}
          </Text>
          <Text style={s.resultBody}>
            {polls >= MAX_POLLS ? t('checkout.stillConfirming') : t('checkout.confirmingBody')}
          </Text>
          {holdUntil !== null && secondsLeft > 0 && (
            <CountdownTimer
              until={holdUntil}
              onExpire={onHoldExpired}
              label={t('checkout.holdRemaining', { time: formatDuration(secondsLeft) })}
            />
          )}
        </View>
      </Screen>
    );
  }

  /* ------------------------------- choosing ------------------------------- */
  return (
    <Screen
      testID="checkout"
      bottomInset
      header={<AppHeader title={t('checkout.title')} onBack={back} />}
      footer={
        <View style={s.footer}>
          <Button
            label={
              pay.isPending || phase === 'opening'
                ? t('checkout.opening')
                : t('checkout.payNow', { amount: formatInr(total) })
            }
            onPress={() => pay.mutate()}
            loading={pay.isPending || phase === 'opening'}
            disabled={pay.isPending || secondsLeft <= 0}
            trailingArrow
            testID="pay-now"
          />
          <Text style={s.securityNote}>{t('checkout.securityNote')}</Text>
        </View>
      }
    >
      <StepProgress step={4} total={4} label={t('careMatch.stepOf', { step: 4, total: 4 })} />

      {/* --------------------------- the hold ------------------------------ */}
      {holdUntil !== null && (
        <Card tone="warn" elevation="none" style={s.hold}>
          <CountdownTimer
            until={holdUntil}
            onExpire={onHoldExpired}
            label={t('checkout.holdRemaining', { time: formatDuration(secondsLeft) })}
          />
          <Text style={s.holdBody}>{t('checkout.holdExplainer')}</Text>
        </Card>
      )}

      {/* ----------------------------- the bill ---------------------------- */}
      <View style={s.block}>
        <SectionHeader title={t('consultation.yourBill')} subtitle={t('consultation.yourBillSub')} />
        <Card elevation="card" style={s.bill}>
          {bill.isLoading && <Skeleton height={64} />}
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
        </Card>
      </View>

      {/* ---------------------------- the method --------------------------- */}
      <View style={s.block}>
        <SectionHeader title={t('checkout.method')} />
        <View style={s.methods} accessibilityRole="radiogroup">
          {PAYMENT_METHODS.map((m) => {
            const on = m === method;
            return (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${t(`checkout.${m}`)}. ${t(`checkout.${m}Sub`)}`}
                style={({ pressed }) => [s.method, on && s.methodOn, pressed && s.pressed]}
              >
                <View style={[s.methodIcon, on && s.methodIconOn]}>
                  <Icon name={METHOD_ICON[m]} size={19} color={on ? colors.white : colors.surfie} />
                </View>
                <View style={s.flex}>
                  <Text style={s.methodName}>{t(`checkout.${m}`)}</Text>
                  <Text style={s.methodSub}>{t(`checkout.${m}Sub`)}</Text>
                </View>
                {on && <Icon name="checkCircle" size={20} color={colors.surfie} filled />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ---------------------------- failures ----------------------------- */}
      {phase === 'failed' && !pay.error && (
        <Banner
          tone="warn"
          title={t('checkout.gatewayMissing')}
          body={t('checkout.gatewayMissingBody')}
          onDismiss={() => setPhase('choosing')}
        />
      )}

      {!!pay.error && (
        <Banner
          tone={pay.error.isNetwork ? 'warn' : 'danger'}
          title={t('checkout.failedTitle')}
          body={
            pay.error.code === DomainCode.ALREADY_PAID
              ? t('checkout.alreadyPaid')
              : pay.error.code === DomainCode.NOT_PAYABLE
                ? t('checkout.notPayable')
                : messageFor(pay.error, t('checkout.failedBody'))
          }
          actionLabel={
            pay.error.code === DomainCode.ALREADY_PAID ? t('checkout.checkAgain') : t('checkout.retry')
          }
          onAction={() => {
            if (pay.error?.code === DomainCode.ALREADY_PAID) {
              void confirm.mutate().then((settled) => settled && setPhase('settled'));
            } else {
              pay.reset();
              setPhase('choosing');
            }
          }}
        />
      )}

      <Pressable
        onPress={() => navigate('consultation', { consultationId })}
        accessibilityRole="button"
        style={s.laterLink}
      >
        <Text style={s.laterText}>{t('checkout.viewConsultation')}</Text>
        <Icon name="chevronRight" size={15} color={colors.surfie} />
      </Pressable>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  block: { gap: spacing.md },

  hold: { gap: spacing.sm },
  holdBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
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
  billFallback: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
  },

  methods: { gap: spacing.sm },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
  },
  methodOn: { borderColor: colors.surfie, backgroundColor: colors.surface.mint },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconOn: { backgroundColor: colors.surfie },
  methodName: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  methodSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    marginTop: 1,
  },

  result: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  resultIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconOk: { backgroundColor: colors.surfie },
  resultIconWarn: { backgroundColor: colors.warn },
  resultIconBrand: { backgroundColor: colors.paris },
  resultTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  resultBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
  },

  laterLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: spacing.sm },
  laterText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },

  footer: { gap: spacing.sm, paddingTop: spacing.sm },
  securityNote: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    textAlign: 'center',
  },
});

export default CheckoutScreen;
