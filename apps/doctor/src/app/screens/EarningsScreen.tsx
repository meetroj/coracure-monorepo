import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { useResponsive } from '../../theme/responsive';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useStore } from '../../state/store';
import { selectEarnings } from '../../state/selectors';
import { payoutHistory, inr, type EarningsPeriod, type EarningsPeriodKey, type PayoutRecord } from '../../data/doctor';
import { fmtDate, TODAY } from '../../data/calendar';
import { PAYOUT_META, PayoutRow, PayoutSheet } from './PayoutHistoryScreen';

/** Earnings & Payout — opened from the Dashboard earnings card, Profile or a payout notification. */

const CHART_HEIGHT = 130;
const RECENT = 3;

const COMPARE_LABEL: Record<EarningsPeriodKey, string> = {
  daily: 'vs yesterday',
  weekly: 'vs last week',
  monthly: 'vs last month',
};

const signed = (n: number, fmt: (v: number) => string) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt(Math.abs(n))}`;

/* ---------------------------------- chart --------------------------------- */

const ActivityChart = ({ period }: { period: EarningsPeriod }) => {
  const ticks: number[] = [];
  for (let v = period.axisMax; v >= 0; v -= period.axisStep) ticks.push(v);
  const tickLabel = (v: number) => (v === 0 ? '0' : v < 1000 ? String(v) : `${Math.round(v / 100) / 10}K`);
  const empty = period.total === 0;

  return (
    <View style={s.chartCard}>
      <View style={s.chartHead}>
        <Text style={s.chartTitle}>Earnings Overview</Text>
        <View style={s.chartTotal}>
          <Text style={s.chartTotalLabel}>Total Earnings</Text>
          <Text style={s.chartTotalValue}>{inr(period.total)}</Text>
        </View>
      </View>
      <View style={s.chartBody}>
        <View style={s.axis}>
          {ticks.map((t) => (
            <Text key={t} style={s.axisLabel}>
              {tickLabel(t)}
            </Text>
          ))}
        </View>
        <View style={s.plotWrap}>
          <View style={s.grid} pointerEvents="none">
            {ticks.map((t) => (
              <View key={t} style={s.gridLine} />
            ))}
          </View>
          <View style={s.plot}>
            {period.bars.map((b) => {
              const on = !empty && b.label === period.highlight;
              const h = Math.max(2, (b.value / period.axisMax) * CHART_HEIGHT);
              return (
                <View key={b.label} style={s.barCol}>
                  <View style={[s.chartBar, { height: h }, on && s.barOn]} />
                  {/* siblings of the bar, not children — a 22px parent wraps "₹28,450" one digit per line */}
                  {on && (
                    <>
                      <View style={[s.barTooltip, { bottom: h + 14 }]}>
                        <Text style={s.barTooltipText} numberOfLines={1}>
                          {inr(b.value)}
                        </Text>
                      </View>
                      <View style={[s.barDot, { bottom: h - 6 }]} />
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
      <View style={s.xAxis}>
        {period.bars.map((b) => (
          <Text key={b.label} style={[s.xLabel, !empty && b.label === period.highlight && s.xLabelOn]} numberOfLines={1}>
            {b.label}
          </Text>
        ))}
      </View>
      {empty && <Text style={s.chartEmpty}>No completed, paid consultations in this period yet.</Text>}
    </View>
  );
};

/* --------------------------------- screen --------------------------------- */

export const EarningsScreen = ({ onBack, onViewAllHistory }: { onBack: () => void; onViewAllHistory: () => void }) => {
  const periods = useStore(selectEarnings);
  const [periodKey, setPeriodKey] = useState<EarningsPeriodKey>('monthly');
  const [open, setOpen] = useState<PayoutRecord | undefined>();
  const period = periods[periodKey];
  // on the narrowest phones a two-up stat card leaves no room for its value
  const { stackPairs } = useResponsive();

  const rate = period.consultations > 0 ? Math.round(period.total / period.consultations) : 0;
  const prevRate =
    period.previousTotal !== undefined && period.previousConsultations
      ? Math.round(period.previousTotal / period.previousConsultations)
      : undefined;
  const consultDelta =
    period.previousConsultations !== undefined ? period.consultations - period.previousConsultations : undefined;

  // this month's earnings accrue until the 5th of next month
  const accrued = periods.monthly.total;
  const nextSettle = fmtDate(new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 5));
  const latest = payoutHistory[0];
  const total = (state: PayoutRecord['state']) => payoutHistory.filter((p) => p.state === state).reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payoutHistory.filter((p) => p.state === 'Paid').length;

  return (
    <Screen testID="earnings" header={<ScreenHeader onBack={onBack} title="Earnings & Payout" subtitle="Track your earnings and payouts." />}>
      {/* period selector */}
      <View style={s.segment} accessibilityRole="tablist">
        {(Object.keys(periods) as EarningsPeriodKey[]).map((k) => {
          const on = k === periodKey;
          return (
            <Pressable
              key={k}
              testID={`period-${k}`}
              onPress={() => setPeriodKey(k)}
              style={[s.segItem, on && s.segItemOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.segText, on && s.segTextOn]}>{periods[k].tab}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.rangePill}>
        <Icon name="calendar" size={13} color={colors.surfie} />
        <Text style={s.rangePillText}>{period.rangeLabel}</Text>
      </View>

      {/* stat grid */}
      <View style={[s.statGrid, stackPairs && s.statGridStacked]}>
        <View style={[s.stat, stackPairs && s.statStacked]}>
          <View style={s.statIcon}>
            <Icon name="checklist" size={16} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.statLabel}>Completed Consultations</Text>
            <Text style={s.statValue}>{period.consultations}</Text>
            {consultDelta !== undefined && (
              <Text style={s.statDelta}>
                {signed(consultDelta, String)} {COMPARE_LABEL[periodKey]}
              </Text>
            )}
          </View>
        </View>

        <View style={[s.stat, stackPairs && s.statStacked]}>
          <View style={s.statIcon}>
            <Icon name="tag" size={16} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.statLabel}>Earnings per Consultation</Text>
            <Text style={s.statValue}>{inr(rate)}</Text>
            {prevRate !== undefined && period.consultations > 0 && (
              <Text style={s.statDelta}>
                {signed(rate - prevRate, inr)} {COMPARE_LABEL[periodKey]}
              </Text>
            )}
          </View>
        </View>

        <View style={[s.stat, stackPairs && s.statStacked]}>
          <View style={s.statIcon}>
            <Icon name="wallet" size={16} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.statLabel}>Estimated Payout</Text>
            <Text testID="estimated-payout" style={s.statValue}>
              {inr(accrued)}
            </Text>
            <Text style={s.statSub}>This month so far · due {nextSettle}</Text>
          </View>
        </View>

        <View style={[s.stat, stackPairs && s.statStacked]}>
          <View style={s.statIcon}>
            <Icon name="trendUp" size={16} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.statLabel}>Latest Payout</Text>
            <Text style={[s.statValue, { color: PAYOUT_META[latest.state].fg }]}>{latest.state}</Text>
            <Text style={s.statSub}>{latest.forLabel.replace('Payout for ', '')}</Text>
          </View>
        </View>
      </View>

      <ActivityChart period={period} />

      {/* payout status */}
      <Text style={s.sectionTitle}>Payout Status</Text>
      <View style={[s.statusRow, stackPairs && s.statusRowStacked]}>
        {(
          [
            ['Pending', accrued + total('Pending'), 'Accruing'],
            ['Processed', total('Processed'), 'In transit'],
            ['Paid', total('Paid'), `${paidCount} payouts`],
          ] as const
        ).map(([state, amount, sub]) => {
          const meta = PAYOUT_META[state];
          return (
            <View key={state} testID={`status-${state}`} style={[s.statusBox, { backgroundColor: meta.bg }]}>
              <Icon name={meta.icon} size={15} color={meta.fg} />
              <View style={s.flex}>
                <Text style={[s.statusLabel, { color: meta.fg }]}>{state}</Text>
                <Text style={[s.statusValue, { color: meta.fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {inr(amount)}
                </Text>
                <Text style={[s.statusSub, { color: meta.fg }]}>{sub}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* recent payouts */}
      <View style={s.listHead}>
        <Text style={[s.sectionTitle, s.sectionTitleInline]}>Recent Payouts</Text>
        <Pressable testID="view-all-payouts" onPress={onViewAllHistory} hitSlop={8} style={s.viewAll} accessibilityRole="button">
          <Text style={s.viewAllText}>View all ({payoutHistory.length})</Text>
          <Icon name="chevronRight" size={14} color={colors.surfie} />
        </Pressable>
      </View>
      <View style={s.list}>
        {payoutHistory.slice(0, RECENT).map((p, i) => (
          <PayoutRow key={p.id} p={p} last={i === RECENT - 1} onPress={() => setOpen(p)} />
        ))}
      </View>

      <PayoutSheet payout={open} onClose={() => setOpen(undefined)} />
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },

  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    padding: 4,
  },
  segItem: { flex: 1, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, alignItems: 'center' },
  segItemOn: { backgroundColor: colors.surfie },
  segText: { ...typeStyles.status, color: colors.inkMuted },
  segTextOn: { color: colors.white, fontWeight: fontWeight.semibold },
  rangePill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginHorizontal: spacing.lg, marginTop: spacing.sm },
  rangePillText: { ...typeStyles.caption, color: colors.inkMuted },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md },
  statGridStacked: { flexDirection: 'column', flexWrap: 'nowrap' },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  statStacked: { flexBasis: 'auto' },
  statIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { ...typeStyles.caption, color: colors.inkMuted },
  statValue: { ...typeStyles.metricSmall, color: colors.ink, marginTop: 2 },
  statDelta: { ...typeStyles.caption, color: colors.surfie, marginTop: 2 },
  statSub: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },

  chartCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  chartHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  chartTitle: { ...typeStyles.sectionTitle, color: colors.ink },
  chartTotal: { alignItems: 'flex-end' },
  chartTotalLabel: { ...typeStyles.caption, color: colors.inkMuted },
  chartTotalValue: { ...typeStyles.metricSmall, color: colors.surfie, marginTop: 1 },
  chartBody: { flexDirection: 'row', marginTop: spacing.xxl, gap: spacing.sm },
  axis: { height: CHART_HEIGHT, justifyContent: 'space-between' },
  axisLabel: { ...typeStyles.caption, fontSize: 11, lineHeight: 12, color: colors.inkFaint, textAlign: 'right', minWidth: 26 },
  plotWrap: { flex: 1, height: CHART_HEIGHT },
  grid: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  gridLine: { height: 1, backgroundColor: colors.surface.line },
  plot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: 22, backgroundColor: colors.paris, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barOn: { backgroundColor: colors.surfie },
  barDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.surfie },
  barTooltip: { position: 'absolute', backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  barTooltipText: { ...typeStyles.status, color: colors.white },
  xAxis: { flexDirection: 'row', marginTop: spacing.sm, paddingLeft: 34 },
  xLabel: { ...typeStyles.caption, fontSize: 11, flex: 1, textAlign: 'center', color: colors.inkMuted },
  xLabelOn: { color: colors.surfie, fontWeight: fontWeight.semibold },
  chartEmpty: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.sm },

  sectionTitle: { ...typeStyles.sectionTitle, color: colors.ink, marginHorizontal: spacing.lg, marginTop: spacing.xxl, marginBottom: spacing.sm },
  sectionTitleInline: { flex: 1, marginHorizontal: 0, marginTop: 0, marginBottom: 0 },

  statusRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  statusRowStacked: { flexDirection: 'column' },
  statusBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, borderRadius: radius.md, padding: spacing.sm + 2 },
  statusLabel: { ...typeStyles.caption },
  statusValue: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold, fontVariant: ['tabular-nums'] },
  statusSub: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, opacity: 0.85 },

  listHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.xxl, marginBottom: spacing.sm },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 36 },
  viewAllText: { ...typeStyles.button, color: colors.surfie },
  list: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },
});

export default EarningsScreen;
