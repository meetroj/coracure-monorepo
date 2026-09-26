import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, FilterChip, EmptyState, Note } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { BottomSheet } from '../../components/BottomSheet';
import { SummaryRow } from '../../components/compact';
import { payoutHistory, payoutNote, inr, type PayoutRecord, type PayoutState } from '../../data/doctor';

/**
 * Icons read as a sequence: not started (hourglass) → in transit (clock) →
 * settled (tick). Shared by the status boxes and every history row so one
 * state never wears two different marks.
 */
export const PAYOUT_META: Record<PayoutState, { icon: IconName; fg: string; bg: string }> = {
  Pending: { icon: 'hourglass', fg: colors.warn, bg: colors.warnSoft },
  Processed: { icon: 'clock', fg: colors.task.blueFg, bg: colors.task.blueBg },
  Paid: { icon: 'checkCircle', fg: colors.surfie, bg: colors.successSoft },
};

/** One payout line; opens its detail. */
export const PayoutRow = ({ p, last, onPress }: { p: PayoutRecord; last: boolean; onPress: () => void }) => {
  const meta = PAYOUT_META[p.state];
  return (
    <Pressable
      testID={`payout-${p.id}`}
      onPress={onPress}
      style={({ pressed }) => [s.row, !last && s.rowRule, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${p.forLabel}, ${inr(p.amount)}, ${p.state}`}
    >
      <View style={[s.rowIcon, { backgroundColor: meta.bg }]}>
        <Icon name={meta.icon} size={15} color={meta.fg} />
      </View>
      <View style={s.flex}>
        <Text style={s.rowFor}>{p.forLabel}</Text>
        <Text style={s.rowDate}>
          {p.state === 'Paid' ? 'Paid' : p.state === 'Processed' ? 'Processed' : 'Due'} {p.dateLabel}
        </Text>
      </View>
      <View style={s.rowRight}>
        <Text style={s.rowAmount}>{inr(p.amount)}</Text>
        <View style={[s.rowPill, { backgroundColor: meta.bg }]}>
          <Text style={[s.rowPillText, { color: meta.fg }]}>{p.state}</Text>
        </View>
      </View>
    </Pressable>
  );
};

/** What a single payout settled, and the reference to quote to support. */
export const PayoutSheet = ({ payout, onClose }: { payout?: PayoutRecord; onClose: () => void }) => (
  <BottomSheet visible={!!payout} title={payout?.forLabel} subtitle={payout ? inr(payout.amount) : undefined} onClose={onClose} testID="payout-sheet">
    {payout && (
      <View style={s.sheetBox}>
        <SummaryRow label="Status" value={payout.state} />
        <SummaryRow label={payout.state === 'Pending' ? 'Due on' : 'Settled on'} value={payout.dateLabel} />
        <SummaryRow label="Consultations" value={String(payout.consultations)} />
        <SummaryRow label="Platform deduction" value={inr(0)} />
        <SummaryRow label="Reference" value={payout.reference} last />
      </View>
    )}
    <Text style={s.sheetNote}>{payoutNote} Quote the reference if you contact support about this payout.</Text>
  </BottomSheet>
);

const FILTERS: ('All' | PayoutState)[] = ['All', 'Paid', 'Processed', 'Pending'];

/** Payout History — every payout, newest first, filterable by state. */
export const PayoutHistoryScreen = ({ onBack }: { onBack: () => void }) => {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [open, setOpen] = useState<PayoutRecord | undefined>();

  const list = useMemo(() => (filter === 'All' ? payoutHistory : payoutHistory.filter((p) => p.state === filter)), [filter]);
  const years = useMemo(() => {
    const out: { year: string; rows: PayoutRecord[] }[] = [];
    list.forEach((p) => {
      const year = p.dateLabel.slice(-4);
      const g = out.find((x) => x.year === year);
      if (g) g.rows.push(p);
      else out.push({ year, rows: [p] });
    });
    return out;
  }, [list]);
  const shown = FILTERS.filter((f) => f === 'All' || payoutHistory.some((p) => p.state === f));

  return (
    <Screen testID="payout-history" header={<ScreenHeader onBack={onBack} title="Payout History" subtitle="Monthly payouts, most recent first." />}>
      <View style={s.chips}>
        {shown.map((f) => (
          <FilterChip key={f} testID={`payout-filter-${f}`} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      {years.length === 0 ? (
        <EmptyState icon="wallet" title="No payouts" body="Nothing matches this filter." />
      ) : (
        years.map((g) => (
          <View key={g.year}>
            <Text style={s.year}>{g.year}</Text>
            <View style={s.list}>
              {g.rows.map((p, i) => (
                <PayoutRow key={p.id} p={p} last={i === g.rows.length - 1} onPress={() => setOpen(p)} />
              ))}
            </View>
          </View>
        ))
      )}

      <Note icon="info">{payoutNote}</Note>
      <PayoutSheet payout={open} onClose={() => setOpen(undefined)} />
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  year: { ...typeStyles.label, color: colors.inkMuted, marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  list: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, minHeight: 64 },
  rowRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowFor: { ...typeStyles.bodySmall, color: colors.ink, fontWeight: fontWeight.medium },
  rowDate: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  rowRight: { alignItems: 'flex-end', gap: 3 },
  rowAmount: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold, color: colors.surfie, fontVariant: ['tabular-nums'] },
  rowPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  rowPillText: { ...typeStyles.caption },

  sheetBox: { backgroundColor: colors.surface.mintSoft, borderRadius: radius.md, paddingHorizontal: spacing.md },
  sheetNote: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.md },
});

export default PayoutHistoryScreen;
