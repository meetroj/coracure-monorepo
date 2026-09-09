import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Screen, AppHeader, IconButton, PageTitle, StatusPill, Button, Avatar, EmptyState } from '../../components/ui';
import {
  appointments,
  modeIcon,
  modeLabel,
  type Appointment,
  type AppointmentState,
} from '../../data/doctor';

type Bucket = 'today' | 'upcoming' | 'past';
type Filter = 'all' | 'completed' | 'cancelled' | 'noShow';

const stateMeta: Record<AppointmentState, { label: string; tone: 'success' | 'neutral' | 'danger' | 'brand' }> = {
  confirmed: { label: 'Confirmed', tone: 'success' },
  upcoming: { label: 'Upcoming', tone: 'brand' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  noShow: { label: 'No-show', tone: 'neutral' },
};

const paymentLabel = { paid: 'Paid', refunded: 'Refunded', notPaid: 'Not paid' } as const;

export const AppointmentsScreen = ({
  onOpenDetails,
  onJoin,
}: {
  onOpenDetails: (a: Appointment) => void;
  onJoin: (a: Appointment) => void;
}) => {
  const [bucket, setBucket] = useState<Bucket>('today');
  const [filter, setFilter] = useState<Filter>('all');

  const inBucket = useMemo(() => appointments.filter((a) => a.bucket === bucket), [bucket]);

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

  return (
    <Screen>
      <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
      <PageTitle title="Appointments" subtitle="Manage your patient consultations" />

      {/* segmented buckets */}
      <View style={s.tabs}>
        {(['today', 'upcoming', 'past'] as Bucket[]).map((b) => (
          <Pressable
            key={b}
            testID={`bucket-${b}`}
            onPress={() => {
              setBucket(b);
              setFilter('all');
            }}
            style={[s.tab, bucket === b && s.tabActive]}
          >
            <Text style={[s.tabText, bucket === b && s.tabTextActive]}>
              {b === 'today' ? 'Today' : b === 'upcoming' ? 'Upcoming' : 'Past'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* status filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {([
          ['all', `All (${counts.all})`],
          ['completed', `Completed (${counts.completed})`],
          ['cancelled', `Cancelled (${counts.cancelled})`],
          ['noShow', `No-show (${counts.noShow})`],
        ] as [Filter, string][]).map(([key, label]) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={s.filterItem}>
            <View
              style={[
                s.filterDot,
                key === 'cancelled' && { backgroundColor: colors.danger },
                key === 'noShow' && { backgroundColor: colors.inkFaint },
                key === 'completed' && { backgroundColor: colors.paris },
              ]}
            />
            <Text style={[s.filterText, filter === key && s.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* date banner */}
      <View style={s.dateBar}>
        <Icon name="calendar" size={17} color={colors.surfie} />
        <Text style={s.dateText}>Wednesday, 15 May</Text>
        <Text style={s.dateCount}>{list.length} visits</Text>
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Nothing here"
          body="No appointments match this filter."
          actionLabel="Clear filter"
          onAction={() => setFilter('all')}
        />
      ) : (
        <View style={s.list}>
          {list.map((a, i) => {
            const meta = stateMeta[a.state];
            const joinable = a.state === 'confirmed';
            return (
              <View key={a.id} style={[s.row, i < list.length - 1 && s.rowBorder]}>
                <View style={s.timeCol}>
                  <Text style={s.timeText}>{a.time.split(' ')[0]}</Text>
                  <Text style={s.timeMeridiem}>{a.time.split(' ')[1]}</Text>
                </View>

                <Avatar initials={a.initials} size={40} />

                <View style={s.rowBody}>
                  <Text style={s.name}>{a.name}</Text>
                  <Text style={s.meta}>
                    {a.gender} · {a.age} years
                  </Text>
                  <View style={s.modeRow}>
                    <Icon name={modeIcon[a.mode]} size={13} color={colors.inkMuted} />
                    <Text style={s.modeText}>{modeLabel[a.mode]}</Text>
                  </View>
                </View>

                <View style={s.rowRight}>
                  <StatusPill label={meta.label} tone={meta.tone} />
                  <Text
                    style={[
                      s.payment,
                      a.payment === 'refunded' && { color: colors.inkFaint },
                      a.payment === 'notPaid' && { color: colors.danger },
                    ]}
                  >
                    {paymentLabel[a.payment]}
                  </Text>
                  {joinable ? (
                    <Button label="Join" size="sm" onPress={() => onJoin(a)} style={s.actionBtn} />
                  ) : (
                    <Button
                      label="Details"
                      size="sm"
                      variant="secondary"
                      onPress={() => onOpenDetails(a)}
                      style={s.actionBtn}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  tab: { paddingVertical: spacing.md, marginRight: spacing.xxl },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.surfie },
  tabText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.lg,
    color: colors.inkMuted,
    fontWeight: '600',
  },
  tabTextActive: { color: colors.surfie, fontWeight: '700' },

  filterRow: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  filterItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfie },
  filterText: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },
  filterTextActive: { color: colors.ink, fontWeight: '700' },

  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.selected,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.surfie,
  },
  dateCount: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.surfie },

  list: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  timeCol: { width: 52 },
  timeText: { fontFamily: typography.heading.family, fontSize: typography.size.md, fontWeight: '700', color: colors.ink },
  timeMeridiem: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkFaint },
  rowBody: { flex: 1 },
  name: { fontFamily: typography.heading.family, fontSize: typography.size.md, fontWeight: '700', color: colors.ink },
  meta: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  modeText: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkMuted },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  payment: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkMuted },
  actionBtn: { minWidth: 84, marginTop: 2 },
});

export default AppointmentsScreen;
