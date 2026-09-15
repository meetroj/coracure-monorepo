import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, AppHeader, IconButton, PageTitle, StatusPill, Button, Avatar, EmptyState } from '../../components/ui';
import { useResource } from '../../data/useResource';
import { fetchAppointments, KEYS } from '../../data/api';
import { SkeletonAppointmentList, SectionError, RefreshBar } from '../../components/skeletons';
import {
  modeIcon,
  modeLabel,
  type Appointment,
  type AppointmentState,
} from '../../data/doctor';

type Bucket = 'today' | 'upcoming' | 'past';
type Filter = 'all' | 'completed' | 'cancelled' | 'noShow';

const stateMeta: Record<AppointmentState, { label: string; fg: string; bg: string }> = {
  confirmed: { label: 'Confirmed', fg: colors.surfie, bg: colors.successSoft },
  upcoming: { label: 'Upcoming', fg: colors.surfie, bg: colors.surface.selected },
  completed: { label: 'Completed', fg: colors.inkMuted, bg: '#EFF3F1' },
  cancelled: { label: 'Cancelled', fg: colors.danger, bg: colors.dangerSoft },
  noShow: { label: 'No-show', fg: colors.inkMuted, bg: '#EFF3F1' },
};

const paymentLabel = { paid: 'Paid', refunded: 'Refunded', notPaid: 'Not paid' } as const;

/* filter chip config */
/**
 * `icon` is optional: "All" is not a state, so it carries no ring at all.
 * The rest use a bare glyph — the chip draws the ring, so an already-circled
 * icon like `checkCircle` would render a circle inside a circle.
 */
const filterConfig: { key: Filter; label: string; icon?: IconName; activeColor: string; iconColor: string }[] = [
  { key: 'all',       label: 'All',                            activeColor: colors.surfie,   iconColor: colors.surfie },
  { key: 'completed', label: 'Completed', icon: 'check',       activeColor: colors.surfie,   iconColor: colors.surfie },
  { key: 'cancelled', label: 'Cancelled', icon: 'close',       activeColor: colors.danger,   iconColor: colors.danger },
  { key: 'noShow',    label: 'No-show',   icon: 'user',        activeColor: colors.inkMuted, iconColor: colors.inkMuted },
];

export const AppointmentsScreen = ({
  onOpenDetails,
  onJoin,
}: {
  onOpenDetails: (a: Appointment) => void;
  onJoin: (a: Appointment) => void;
}) => {
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const [bucket, setBucket] = useState<Bucket>('today');
  const [filter, setFilter] = useState<Filter>('all');

  // Each bucket is its own cache entry, so switching tabs loads independently
  // and a bucket already seen comes back instantly.
  const { data, error, showSkeleton, isRefreshing, retry } = useResource(
    KEYS.appointments(bucket),
    () => fetchAppointments(bucket)
  );
  const inBucket = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      all: inBucket.length,
      completed: inBucket.filter((a) => a.state === 'completed').length,
      cancelled: inBucket.filter((a) => a.state === 'cancelled').length,
      noShow: inBucket.filter((a) => a.state === 'noShow').length,
    }),
    [inBucket]
  );

  const list = useMemo(() => {
    if (filter === 'all') return inBucket;
    return inBucket.filter((a) => a.state === filter);
  }, [inBucket, filter]);

  const countFor = (k: Filter) => (k === 'all' ? counts.all : counts[k as keyof typeof counts]);

  return (
    <Screen scroll={false}>
      {/* ── sticky white header card ── */}
      <View style={s.headerCard}>
        <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
        <PageTitle title="Appointments" subtitle="Manage your patient consultations" />

        {/* pill-style bucket tabs */}
        <View style={s.bucketRow}>
          {(['today', 'upcoming', 'past'] as Bucket[]).map((b) => (
            <Pressable
              key={b}
              testID={`bucket-${b}`}
              onPress={() => { setBucket(b); setFilter('all'); }}
              style={[s.bucketTab, bucket === b && s.bucketTabActive]}
            >
              <Text style={[s.bucketText, bucket === b && s.bucketTextActive]}>
                {b === 'today' ? 'Today' : b === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* icon filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {filterConfig.map(({ key, label, icon, activeColor, iconColor }) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                style={[s.filterChip, active && { borderColor: activeColor, backgroundColor: activeColor + '18' }]}
              >
                {icon && (
                  <View style={[s.filterIconWrap, { borderColor: iconColor }]}>
                    <Icon name={icon} size={11} color={iconColor} />
                  </View>
                )}
                <Text style={[s.filterChipText, active && { color: activeColor, fontWeight: '700' }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── scrollable list ── */}
      {showSkeleton ? (
        <ScrollView style={s.listScroll} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          <SkeletonAppointmentList rows={5} />
        </ScrollView>
      ) : error ? (
        <SectionError
          testID="appointments-error"
          message="Could not load your appointments."
          onRetry={retry}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Nothing here"
          body="No appointments match this filter."
          actionLabel="Clear filter"
          onAction={() => setFilter('all')}
        />
      ) : (
        <ScrollView style={s.listScroll} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {isRefreshing && <RefreshBar testID="appointments-refreshing" />}
          <View style={s.list}>
            {list.map((a, i) => {
              const meta = stateMeta[a.state];
              const joinable = a.state === 'confirmed';
              return (
                <Pressable
                  key={a.id}
                  testID={`appt-${a.id}`}
                  onPress={() => onOpenDetails(a)}
                  style={[s.row, i < list.length - 1 && s.rowBorder]}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.name}, ${a.time}`}
                >
                  <View style={s.timeCol}>
                    <Text style={[typeStyles.body, s.timeText]}>{a.time.split(' ')[0]}</Text>
                    <Text style={[typeStyles.body, s.timeMeridiem]}>{a.time.split(' ')[1]}</Text>
                  </View>

                  <View style={s.rowRule} />

                  <Avatar initials={a.initials} size={34} />

                  <View style={s.rowBody}>
                    <View style={[s.line, narrow && s.lineStacked]}>
                      <Text style={[typeStyles.body, s.name]}>{a.name}</Text>
                      <View style={[s.badge, { backgroundColor: meta.bg }, narrow && s.badgeStacked]}>
                        <View style={[s.badgeDot, { backgroundColor: meta.fg }]} />
                        <Text style={[typeStyles.body, s.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                      </View>
                    </View>

                    <View style={s.line}>
                      <Text style={[typeStyles.body, s.meta]}>{a.gender} • {a.age}</Text>
                      <Text style={[typeStyles.body, s.payment,
                        a.payment === 'refunded' && { color: colors.inkFaint },
                        a.payment === 'notPaid' && { color: colors.danger },
                      ]}>
                        {paymentLabel[a.payment]}
                      </Text>
                    </View>

                    <View style={s.lineLast}>
                      <Icon name={modeIcon[a.mode]} size={16} color={colors.surfie} />
                      <Text style={[typeStyles.body, s.modeText]}>{modeLabel[a.mode]}</Text>
                      <Pressable
                        testID={`action-${a.id}`}
                        onPress={() => (joinable ? onJoin(a) : onOpenDetails(a))}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        style={[s.action, joinable ? s.actionJoin : s.actionDetails]}
                        accessibilityRole="button"
                        accessibilityLabel={`${joinable ? 'Join' : 'Details'} — ${a.name}`}
                      >
                        <Text style={[typeStyles.body, joinable ? s.actionJoinText : s.actionDetailsText]}>
                          {joinable ? 'Join' : 'Details'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  /* sticky white header */
  headerCard: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },

  /* pill bucket tabs */
  bucketRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface.page,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  bucketTab: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.pill,
  },
  bucketTabActive: { backgroundColor: colors.surfie },
  bucketText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm, fontWeight: '600', color: colors.inkMuted,
  },
  bucketTextActive: { color: colors.white },

  /* icon filter chips */
  filterRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing.sm + 2, paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  filterIconWrap: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  filterChipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted,
  },

  /* list */
  listScroll: { flex: 1 },
  listContent: { paddingBottom: spacing.xxxl },
  list: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.sm, paddingVertical: spacing.md,
    minHeight: 86,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  timeCol: { width: 46, paddingTop: 2 },
  timeText: { ...typeStyles.caption, color: colors.ink },
  timeMeridiem: { ...typeStyles.caption, color: colors.inkFaint },
  rowRule: { width: 1, alignSelf: 'stretch', backgroundColor: colors.surface.line, marginRight: 2 },

  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lineStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 3 },
  lineLast: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },

  name: { ...typeStyles.name, flexShrink: 1, color: colors.ink },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2,
    marginLeft: 'auto',
  },
  badgeStacked: { marginLeft: 0 },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { ...typeStyles.status },

  meta: { ...typeStyles.caption, color: colors.inkMuted },
  payment: { ...typeStyles.caption, marginLeft: 'auto', color: colors.inkMuted },
  modeText: { ...typeStyles.status, flex: 1, minWidth: 0, color: colors.inkMuted },

  action: {
    minWidth: 68, height: 30, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionJoin: { backgroundColor: colors.surfie },
  actionJoinText: { ...typeStyles.caption, color: colors.white },
  actionDetails: { borderWidth: 1.5, borderColor: colors.surfie, backgroundColor: colors.white },
  actionDetailsText: { ...typeStyles.caption, color: colors.surfie },
});

export default AppointmentsScreen;
