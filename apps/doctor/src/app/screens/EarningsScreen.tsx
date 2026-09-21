import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { useResponsive } from '../../theme/responsive';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/ui';
import {
  earningsPeriods,
  nextPayout,
  payoutHistory,
  inr,
  type EarningsPeriod,
  type EarningsPeriodKey,
  type PayoutState,
} from '../../data/doctor';

/** Earnings & Payout — opened from the Dashboard earnings card or Profile. */

const CHART_HEIGHT = 130;

const pct = (now: number, before?: number) =>
  before && before > 0 ? Math.round(((now - before) / before) * 100) : undefined;

/* ---------------------------------- chart --------------------------------- */

const ActivityChart = ({ period }: { period: EarningsPeriod }) => {
  const ticks: number[] = [];
  for (let v = period.axisMax; v >= 0; v -= period.axisStep) ticks.push(v);

  const tickLabel = (v: number) => (v === 0 ? '0' : `${Math.round(v / 1000)}K`);

  return (
    <View style={s.chartCard}>
      <View style={s.chartHead}>
        <Text style={[typeStyles.body, s.chartTitle]}>Earnings Overview</Text>
        <View style={s.chartTotal}>
          <Text style={[typeStyles.body, s.chartTotalLabel]}>Total Earnings</Text>
          <Text style={[typeStyles.body, s.chartTotalValue]}>{inr(period.total)}</Text>
        </View>
      </View>
      <View style={s.chartBody}>
        {/* y axis */}
        <View style={s.axis}>
          {ticks.map((t) => (
            <Text key={t} style={[typeStyles.body, s.axisLabel]}>
              {tickLabel(t)}
            </Text>
          ))}
        </View>

        <View style={s.plotWrap}>
          {/* gridlines sit behind the bars, one per tick */}
          <View style={s.grid} pointerEvents="none">
            {ticks.map((t) => (
              <View key={t} style={s.gridLine} />
            ))}
          </View>

          <View style={s.plot}>
            {period.bars.map((b) => {
              const on = b.label === period.highlight;
              const h = Math.max(2, (b.value / period.axisMax) * CHART_HEIGHT);
              return (
                <View key={b.label} style={s.barCol}>
                  <View style={[s.chartBar, { height: h }, on && s.barOn]} />
                  {/* Tooltip and dot are siblings of the bar, not children of it — the
                      bar is only 26px wide, and an absolutely-positioned child sized
                      against that narrow a parent wraps "₹28,450" one digit per line. */}
                  {on && (
                    <>
                      <View style={[s.barTooltip, { bottom: h + 14 }]}>
                        <Text style={[typeStyles.body, s.barTooltipText]} numberOfLines={1}>{inr(b.value)}</Text>
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
          <Text
            key={b.label}
            style={[typeStyles.body, [s.xLabel, b.label === period.highlight && s.xLabelOn]]}
          >
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

/* ------------------------------ payout status ------------------------------ */

/**
 * Icons read as a sequence: not started (hourglass) -> in transit (clock) ->
 * settled (tick). Used by both the status boxes and the history rows so one
 * state never wears two different marks.
 */
const STATUS_META: Record<PayoutState, { icon: IconName; fg: string; bg: string }> = {
  Pending: { icon: 'hourglass', fg: colors.warn, bg: colors.warnSoft },
  Processed: { icon: 'clock', fg: '#3E6DB5', bg: colors.task.blueBg },
  Paid: { icon: 'checkCircle', fg: colors.surfie, bg: colors.successSoft },
};

/* --------------------------------- screen --------------------------------- */

export const EarningsScreen = ({
  onBack,
  onOpenPayout = () => undefined,
  onViewAllHistory = () => undefined,
}: {
  onBack: () => void;
  onOpenPayout?: () => void;
  onViewAllHistory?: () => void;
}) => {
  const [periodKey, setPeriodKey] = useState<EarningsPeriodKey>('monthly');
  const period = earningsPeriods[periodKey];
  // On the narrowest phones a two-up stat card leaves no room for its value —
  // stack to one column rather than starving the total.
  const { stackPairs } = useResponsive();

  const consultDelta = pct(period.consultations, period.previousConsultations);
  const rate = period.consultations > 0 ? Math.round(period.total / period.consultations) : 0;
  const previousRate =
    period.previousTotal && period.previousConsultations
      ? Math.round(period.previousTotal / period.previousConsultations)
      : undefined;

  const paidTotal = payoutHistory.filter((p) => p.state === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  const processedTotal = payoutHistory.filter((p) => p.state === 'Processed').reduce((sum, p) => sum + p.amount, 0);

  return (
    <View style={s.root}>
      <Screen bottomInset contentStyle={s.content}>
        <View style={s.bar}>
          <Pressable
            testID="back"
            onPress={onBack}
            hitSlop={8}
            style={s.barBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={19} color={colors.ink} />
          </Pressable>
          <View style={s.barLogo}>
            <LogoWide width={100} height={25} />
          </View>
          <Pressable hitSlop={8} style={s.barBtn} accessibilityRole="button" accessibilityLabel="Notifications">
            <Icon name="bell" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={s.titleWrap}>
          <Text style={[typeStyles.body, s.title]}>Earnings &amp; Payout</Text>
          <Text style={[typeStyles.body, s.subtitle]}>Track your earnings and manage payouts</Text>
        </View>

        {/* ------------------------------ period selector --------------------------- */}
        <View style={s.segment}>
          {(Object.keys(earningsPeriods) as EarningsPeriodKey[]).map((k) => {
            const on = k === periodKey;
            return (
              <Pressable
                key={k}
                testID={`period-${k}`}
                onPress={() => setPeriodKey(k)}
                style={[s.segItem, on && s.segItemOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[typeStyles.body, [s.segText, on && s.segTextOn]]}>{earningsPeriods[k].tab}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={s.rangePill}>
          <Icon name="calendar" size={13} color={colors.surfie} />
          <Text style={[typeStyles.body, s.rangePillText]}>{period.rangeLabel}</Text>
        </View>

        {/* -------------------------------- stat grid ------------------------------ */}
        <View style={[s.statGrid, stackPairs && s.statGridStacked]}>
          <View style={[s.stat, stackPairs && s.statStacked]}>
            <View style={s.statIcon}>
              <Icon name="checklist" size={16} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.statLabel]}>Completed Consultations</Text>
              <Text style={[typeStyles.body, s.statValue]}>{period.consultations}</Text>
              {consultDelta !== undefined && (
                <Text style={[typeStyles.body, s.statDelta]}>+{consultDelta}% vs last month</Text>
              )}
            </View>
          </View>

          <View style={[s.stat, stackPairs && s.statStacked]}>
            <View style={s.statIcon}>
              <Icon name="tag" size={16} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.statLabel]}>Earnings per Consultation</Text>
              <Text style={[typeStyles.body, s.statValue]}>{inr(rate)}</Text>
              {previousRate !== undefined && (
                <Text style={[typeStyles.body, s.statDelta]}>+{inr(rate - previousRate)} vs last month</Text>
              )}
            </View>
          </View>

          <View style={[s.stat, stackPairs && s.statStacked]}>
            <View style={s.statIcon}>
              <Icon name="wallet" size={16} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.statLabel]}>Estimated Payout</Text>
              <Text style={[typeStyles.body, s.statValue]}>{inr(nextPayout.amount)}</Text>
              <Text style={[typeStyles.body, s.statSub]}>Includes all earnings</Text>
            </View>
          </View>

          <Pressable testID="next-payout" onPress={onOpenPayout} style={[s.stat, stackPairs && s.statStacked]}>
            <View style={s.statIcon}>
              <Icon name="trendUp" size={16} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.statLabel]}>Payout Status</Text>
              <Text style={[typeStyles.body, [s.statValue, s.statValueWarn]]}>{nextPayout.state}</Text>
              <Text style={[typeStyles.body, s.statSub]}>{nextPayout.expectedLabel}</Text>
            </View>
          </Pressable>
        </View>

        <ActivityChart period={period} />

        {/* ------------------------------- payout status ---------------------------- */}
        <View style={s.listHead}>
          <Text style={[typeStyles.body, s.sectionTitle]}>Payout Status</Text>
        </View>
        <View style={s.statusRow}>
          <View style={[s.statusBox, { backgroundColor: STATUS_META.Pending.bg }]}>
            <Icon name={STATUS_META.Pending.icon} size={15} color={STATUS_META.Pending.fg} />
            <View style={s.flex}>
              <Text style={[typeStyles.body, [s.statusLabel, { color: STATUS_META.Pending.fg }]]}>Pending</Text>
              <Text style={[typeStyles.body, [s.statusValue, { color: STATUS_META.Pending.fg }]]}>
                {inr(nextPayout.amount)}
              </Text>
            </View>
          </View>
          <View style={[s.statusBox, { backgroundColor: STATUS_META.Processed.bg }]}>
            <Icon name={STATUS_META.Processed.icon} size={15} color={STATUS_META.Processed.fg} />
            <View style={s.flex}>
              <Text style={[typeStyles.body, [s.statusLabel, { color: STATUS_META.Processed.fg }]]}>Processed</Text>
              <Text style={[typeStyles.body, [s.statusValue, { color: STATUS_META.Processed.fg }]]}>
                {inr(processedTotal)}
              </Text>
            </View>
          </View>
          <View style={[s.statusBox, { backgroundColor: STATUS_META.Paid.bg }]}>
            <Icon name={STATUS_META.Paid.icon} size={15} color={STATUS_META.Paid.fg} filled />
            <View style={s.flex}>
              <Text style={[typeStyles.body, [s.statusLabel, { color: STATUS_META.Paid.fg }]]}>Paid</Text>
              <Text style={[typeStyles.body, [s.statusValue, { color: STATUS_META.Paid.fg }]]}>
                {inr(paidTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* ------------------------------ payout history ---------------------------- */}
        <View style={s.listHead}>
          <Text style={[typeStyles.body, s.sectionTitle]}>Payout History</Text>
          <Pressable onPress={onViewAllHistory} hitSlop={8} style={s.viewAll} accessibilityRole="button">
            <Text style={[typeStyles.body, s.viewAllText]}>View All</Text>
            <Icon name="chevronRight" size={14} color={colors.surfie} />
          </Pressable>
        </View>

        <View style={s.list}>
          {payoutHistory.map((p, i) => {
            const meta = STATUS_META[p.state];
            return (
              <View key={p.id} testID={`payout-${p.id}`} style={[s.historyRow, i < payoutHistory.length - 1 && s.historyDivider]}>
                <View style={[s.historyIcon, { backgroundColor: meta.bg }]}>
                  <Icon name={meta.icon} size={15} color={meta.fg} />
                </View>
                <View style={s.flex}>
                  <Text style={[typeStyles.body, s.historyDate]}>{p.dateLabel}</Text>
                  <Text style={[typeStyles.body, s.historyFor]}>{p.forLabel}</Text>
                </View>
                <View style={s.historyRight}>
                  <Text style={[typeStyles.body, s.historyAmount]}>{inr(p.amount)}</Text>
                  <View style={[s.historyPill, { backgroundColor: meta.bg }]}>
                    <Text style={[typeStyles.body, s.historyPillText, { color: meta.fg }]}>{p.state}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </Screen>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xl },

  /* header */
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  barBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLogo: { flex: 1, alignItems: 'center' },

  titleWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { ...typeStyles.pageTitle, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 3 },

  /* period selector */
  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    padding: 4,
  },
  segItem: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.pill, alignItems: 'center' },
  segItemOn: { backgroundColor: colors.surfie },
  segText: { ...typeStyles.status, color: colors.inkMuted },
  segTextOn: { color: colors.white, fontWeight: fontWeight.semibold },
  rangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  rangePillText: { ...typeStyles.caption, color: colors.inkMuted },

  /* stat grid */
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
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
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statLabel: { ...typeStyles.label, color: colors.inkMuted },
  statValue: { ...typeStyles.metricSmall, color: colors.ink, marginTop: 2 },
  statValueWarn: { color: colors.warn },
  statDelta: { ...typeStyles.caption, color: colors.surfie, marginTop: 2 },
  statSub: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 2 },

  /* chart */
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  chartHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  chartTitle: { ...typeStyles.sectionTitle, color: colors.ink },
  chartTotal: { alignItems: 'flex-end' },
  chartTotalLabel: { ...typeStyles.caption, color: colors.inkMuted },
  chartTotalValue: { ...typeStyles.metricSmall, color: colors.surfie, marginTop: 1 },

  chartBody: { flexDirection: 'row', marginTop: spacing.xxl, gap: spacing.sm },
  axis: { height: CHART_HEIGHT, justifyContent: 'space-between', paddingBottom: 0 },
  axisLabel: { ...typeStyles.label, color: colors.inkFaint, textAlign: 'right', minWidth: 22, marginTop: -5 },
  plotWrap: { flex: 1, height: CHART_HEIGHT },
  grid: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  gridLine: { height: 1, backgroundColor: colors.surface.line },
  plot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  // `chartBar`, not `bar` — the top navigation bar above already owns that
  // name, and the duplicate key meant this one silently replaced it.
  chartBar: {
    width: 26,
    backgroundColor: colors.paris,
    alignItems: 'center',
  },
  barOn: { backgroundColor: colors.surfie },
  barDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.surfie,
  },
  // Pill-shaped, like a small button — not a plain tooltip box.
  barTooltip: {
    position: 'absolute',
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  barTooltipText: { ...typeStyles.status, color: colors.white },
  xAxis: { flexDirection: 'row', marginTop: spacing.sm, paddingLeft: 30 },
  xLabel: { ...typeStyles.label, flex: 1, textAlign: 'center', color: colors.inkMuted },
  xLabelOn: { color: colors.surfie, fontWeight: fontWeight.semibold },

  /* section titles shared by payout status + history */
  sectionTitle: { ...typeStyles.sectionTitle, flex: 1, color: colors.ink },

  /* payout status */
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm },
  statusBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  statusLabel: { ...typeStyles.caption },
  statusValue: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold },

  /* payout history */
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { ...typeStyles.button, color: colors.surfie },
  list: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  historyDivider: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  historyIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  historyDate: { ...typeStyles.caption, color: colors.inkFaint },
  historyFor: { ...typeStyles.bodySmall, color: colors.ink, marginTop: 1 },
  historyRight: { alignItems: 'flex-end', gap: 3 },
  historyAmount: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold, color: colors.surfie },
  historyPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  historyPillText: { ...typeStyles.caption },
});

export default EarningsScreen;
