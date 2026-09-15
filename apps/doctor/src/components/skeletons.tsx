import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../theme/brand';
import { skeleton } from '../theme/skeleton';
import { Icon } from './Icon';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonRows } from './Skeleton';

/**
 * Section skeletons.
 *
 * Each one mirrors a specific component's box model — same paddings, same
 * gaps, same row height, same avatar diameter — so the swap to real content
 * moves nothing. Where a real row declares `minHeight: 86`, so does its
 * skeleton; where the real avatar is 34, so is the placeholder circle.
 *
 * They are grouped by the screen they belong to and kept next to each other
 * deliberately: when a layout changes, its skeleton is the adjacent edit.
 */

/* ------------------------------- shared bits ------------------------------ */

/** Matches the white rounded list container used across the app. */
export const SkeletonListCard = ({ children }: { children: React.ReactNode }) => (
  <View style={s.listCard}>{children}</View>
);

/** The standard card used by Dashboard / Cases / detail screens. */
export const SkeletonCard = ({
  height,
  children,
}: {
  height?: number;
  children?: React.ReactNode;
}) => <View style={[s.card, height ? { height } : null]}>{children}</View>;

/* ------------------------------ appointments ------------------------------ */

/**
 * Mirrors the appointment row: 46pt time column, hairline rule, 34pt avatar,
 * then three lines in a flexible body. `minHeight: 86` matches the real row so
 * a six-row list is exactly as tall before and after loading.
 */
export const SkeletonAppointmentRow = () => (
  <View style={s.apptRow}>
    <View style={s.apptTime}>
      <Skeleton width={34} height={12} radius={6} />
      <Skeleton width={20} height={9} radius={4} style={{ marginTop: 3 }} />
    </View>

    <View style={s.apptRule} />
    <SkeletonCircle size={34} />

    <View style={s.apptBody}>
      <View style={s.line}>
        <Skeleton width="46%" height={13} radius={6} />
        <Skeleton width={72} height={16} radius={999} style={s.pushRight} />
      </View>
      <View style={s.line}>
        <Skeleton width={64} height={10} radius={5} />
        <Skeleton width={34} height={10} radius={5} style={s.pushRight} />
      </View>
      <View style={s.lineLast}>
        <SkeletonCircle size={16} />
        <Skeleton width="38%" height={10} radius={5} />
        <Skeleton width={68} height={30} radius={radius.md} style={s.pushRight} />
      </View>
    </View>
  </View>
);

export const SkeletonAppointmentList = ({ rows = 5 }: { rows?: number }) => (
  <View style={s.apptList}>
    <SkeletonRows count={rows} divider={s.rowBorder}>
      {() => <SkeletonAppointmentRow />}
    </SkeletonRows>
  </View>
);

/* -------------------------------- dashboard ------------------------------- */

/** Identity card: 52pt avatar, greeting, name, speciality, status control. */
export const SkeletonIdentityCard = () => (
  <View style={[s.card, s.identityCard]}>
    <View style={s.identityRow}>
      <SkeletonCircle size={52} />
      <View style={s.flex}>
        <Skeleton width={84} height={10} radius={5} />
        <Skeleton width="72%" height={15} radius={7} style={{ marginTop: 6 }} />
        <Skeleton width={88} height={10} radius={5} style={{ marginTop: 5 }} />
      </View>
      <Skeleton width={104} height={30} radius={999} />
    </View>
  </View>
);

/** The horizontal summary strip. Five tiles, same width and gap as the real row. */
export const SkeletonSummaryTiles = ({ count = 5 }: { count?: number }) => (
  <View style={s.tileRow}>
    {Array.from({ length: count }, (_, i) => (
      <View key={i} style={s.tile}>
        <SkeletonCircle size={28} />
        <Skeleton width={26} height={18} radius={6} style={{ marginTop: 8 }} />
        <Skeleton width="82%" height={9} radius={4} style={{ marginTop: 6 }} />
        <Skeleton width={30} height={8} radius={4} style={{ marginTop: 4 }} />
      </View>
    ))}
  </View>
);

/** Next-appointment card: patient block, concern, three meta cells, two CTAs. */
export const SkeletonNextAppointment = () => (
  <View style={[s.card, s.nextCard]}>
    <View style={s.line}>
      <Skeleton width={140} height={13} radius={6} />
      <Skeleton width={78} height={22} radius={999} style={s.pushRight} />
    </View>

    <View style={s.nextPatient}>
      <SkeletonCircle size={60} />
      <View style={s.flex}>
        <Skeleton width="62%" height={15} radius={7} />
        <Skeleton width={92} height={10} radius={5} style={{ marginTop: 6 }} />
        <Skeleton width={74} height={20} radius={999} style={{ marginTop: 8 }} />
      </View>
    </View>

    <View style={s.nextConcern}>
      <Skeleton width={120} height={10} radius={5} />
      <SkeletonText lines={2} lineHeight={11} gap={6} style={{ marginTop: 7 }} />
    </View>

    <View style={s.metaRow}>
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={s.metaItem}>
          <SkeletonCircle size={26} />
          <View style={s.flex}>
            <Skeleton width="70%" height={10} radius={5} />
            <Skeleton width="52%" height={8} radius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>

    <View style={s.ctaRow}>
      <Skeleton width="48%" height={40} radius={radius.md} />
      <Skeleton width="48%" height={40} radius={radius.md} />
    </View>
  </View>
);

/** The half-width task / alert pair below the next appointment. */
export const SkeletonStatPair = () => (
  <View style={s.pairRow}>
    {Array.from({ length: 2 }, (_, i) => (
      <View key={i} style={[s.card, s.pairCard]}>
        <View style={s.line}>
          <Skeleton width="62%" height={12} radius={6} />
          <SkeletonCircle size={16} style={s.pushRight} />
        </View>
        <View style={s.pairInner}>
          <Skeleton width="46%" height={38} radius={10} />
          <Skeleton width="46%" height={38} radius={10} />
        </View>
      </View>
    ))}
  </View>
);

/* ---------------------------------- cases --------------------------------- */

/** Case card: top accent bar, avatar, id/name/meta, status, concern, footer. */
export const SkeletonCaseCard = () => (
  <View style={s.caseCard}>
    <View style={s.caseAccent} />
    <View style={s.caseInner}>
      <View style={s.caseTop}>
        <SkeletonCircle size={44} />
        <View style={s.flex}>
          <Skeleton width={78} height={9} radius={4} />
          <Skeleton width="64%" height={15} radius={7} style={{ marginTop: 5 }} />
          <Skeleton width="86%" height={10} radius={5} style={{ marginTop: 5 }} />
        </View>
        <View style={s.caseRight}>
          <Skeleton width={78} height={20} radius={999} />
          <Skeleton width={54} height={10} radius={5} style={{ marginTop: 6 }} />
        </View>
      </View>

      <View style={s.caseConcern}>
        <SkeletonCircle size={15} />
        <Skeleton width="58%" height={11} radius={5} />
        <Skeleton width={76} height={30} radius={radius.md} style={s.pushRight} />
      </View>

      <View style={s.caseFoot}>
        <Skeleton width={66} height={10} radius={5} />
        <Skeleton width={74} height={10} radius={5} />
      </View>
    </View>
  </View>
);

export const SkeletonCaseList = ({ rows = 4 }: { rows?: number }) => (
  <>
    {Array.from({ length: rows }, (_, i) => (
      <SkeletonCaseCard key={i} />
    ))}
  </>
);

/* --------------------------------- generic -------------------------------- */

/** Icon + two lines + trailing control. Covers notifications, messages, tasks. */
export const SkeletonListRow = ({
  avatar = 'circle',
  trailing = 56,
  lines = 2,
  height,
}: {
  avatar?: 'circle' | 'square' | 'none';
  trailing?: number;
  lines?: number;
  height?: number;
}) => (
  <View style={[s.genericRow, height ? { minHeight: height } : null]}>
    {avatar === 'circle' && <SkeletonCircle size={38} />}
    {avatar === 'square' && <Skeleton width={38} height={38} radius={12} />}
    <View style={s.flex}>
      <Skeleton width="58%" height={12} radius={6} />
      {lines > 1 && <Skeleton width="84%" height={10} radius={5} style={{ marginTop: 6 }} />}
      {lines > 2 && <Skeleton width={92} height={9} radius={4} style={{ marginTop: 5 }} />}
    </View>
    {trailing > 0 && <Skeleton width={trailing} height={20} radius={999} />}
  </View>
);

export const SkeletonRowList = ({
  rows = 5,
  ...row
}: { rows?: number } & React.ComponentProps<typeof SkeletonListRow>) => (
  <View style={s.listCard}>
    <SkeletonRows count={rows} divider={s.rowBorder}>
      {() => <SkeletonListRow {...row} />}
    </SkeletonRows>
  </View>
);

/** Horizontally scrolling filter chips. */
export const SkeletonChips = ({ count = 4 }: { count?: number }) => (
  <View style={s.chipRow}>
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} width={i === 0 ? 62 : 86} height={32} radius={999} />
    ))}
  </View>
);

/** Bar chart placeholder — reserves the plot height so nothing jumps. */
export const SkeletonChart = ({ bars = 6, height = 150 }: { bars?: number; height?: number }) => (
  <View style={[s.card, s.chartCard]}>
    <View style={s.line}>
      <Skeleton width={132} height={14} radius={7} />
      <Skeleton width={72} height={28} radius={999} style={s.pushRight} />
    </View>
    <View style={[s.plot, { height }]}>
      {Array.from({ length: bars }, (_, i) => (
        <Skeleton
          key={i}
          width={30}
          height={Math.round(height * [0.3, 0.55, 0.82, 0.46, 0.28, 0.6][i % 6])}
          radius={radius.sm}
        />
      ))}
    </View>
    <View style={s.xAxis}>
      {Array.from({ length: bars }, (_, i) => (
        <Skeleton key={i} width={28} height={9} radius={4} />
      ))}
    </View>
  </View>
);

/* ------------------------------- error state ------------------------------ */

/**
 * Replaces a skeleton the moment a section fails. Occupies roughly the same
 * band so the page does not collapse, and always offers the way out.
 */
export const SectionError = ({
  message = 'Could not load this section.',
  onRetry,
  testID,
}: {
  message?: string;
  onRetry: () => void;
  testID?: string;
}) => (
  <View testID={testID} style={s.error}>
    <Icon name="alertCircle" size={18} color={colors.danger} />
    <Text style={s.errorText}>{message}</Text>
    <Pressable
      testID={testID ? `${testID}-retry` : undefined}
      onPress={onRetry}
      hitSlop={8}
      style={s.retry}
      accessibilityRole="button"
      accessibilityLabel="Retry"
    >
      <Text style={s.retryText}>Retry</Text>
    </Pressable>
  </View>
);

/** The quiet indicator shown while cached content refreshes behind itself. */
export const RefreshBar = ({ testID }: { testID?: string }) => (
  <View testID={testID} style={s.refresh}>
    <Skeleton width={14} height={14} radius={7} />
    <Text style={s.refreshText}>Refreshing…</Text>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lineLast: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  pushRight: { marginLeft: 'auto' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },

  listCard: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
  },

  /* appointments */
  apptList: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
  },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: 86,
  },
  apptTime: { width: 46, paddingTop: 2 },
  apptRule: { width: 1, alignSelf: 'stretch', backgroundColor: colors.surface.line, marginRight: 2 },
  apptBody: { flex: 1, minWidth: 0, gap: 3 },

  /* dashboard */
  identityCard: { padding: spacing.md },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tileRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  tile: {
    width: 104,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  nextCard: { padding: spacing.md },
  nextPatient: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  nextConcern: { marginTop: spacing.md },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  pairRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md },
  pairCard: { flex: 1, marginHorizontal: 0, marginTop: 0, padding: spacing.md },
  pairInner: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },

  /* cases */
  caseCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
  },
  caseAccent: { height: 4, backgroundColor: skeleton.base },
  caseInner: { padding: spacing.md },
  caseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  caseRight: { alignItems: 'flex-end' },
  caseConcern: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  caseFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },

  /* generic */
  genericRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },

  /* chart */
  chartCard: { padding: spacing.lg },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },

  /* error + refresh */
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
  },
  errorText: { flex: 1, fontSize: 12.5, color: colors.danger },
  retry: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: colors.danger },

  refresh: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  refreshText: { fontSize: 11, color: colors.inkMuted },
});
