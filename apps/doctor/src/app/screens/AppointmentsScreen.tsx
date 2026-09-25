import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, PageTitle, Avatar, EmptyState } from '../../components/ui';
import { TabHeader } from '../navigation/TabHeader';
import { useResource } from '../../data/useResource';
import { fetchAppointments, KEYS } from '../../data/api';
import { SkeletonAppointmentList, SectionError, RefreshBar } from '../../components/skeletons';
import { useStore } from '../../state/store';
import { joinStateFor, selectAppointments } from '../../state/selectors';
import { modeIcon, modeLabel, type Appointment, type AppointmentState } from '../../data/doctor';

type Bucket = 'today' | 'upcoming' | 'past';
type Filter = 'all' | 'completed' | 'cancelled' | 'noShow';

const stateMeta: Record<AppointmentState, { label: string; fg: string; bg: string }> = {
  confirmed: { label: 'Confirmed', fg: colors.surfie, bg: colors.successSoft },
  upcoming: { label: 'Upcoming', fg: colors.surfie, bg: colors.surface.selected },
  completed: { label: 'Completed', fg: colors.inkMuted, bg: '#EFF3F1' },
  cancelled: { label: 'Cancelled', fg: colors.danger, bg: colors.dangerSoft },
  noShow: { label: 'No-show', fg: colors.warn, bg: colors.warnSoft },
};

const paymentLabel = { paid: 'Paid', refunded: 'Refunded', notPaid: 'Not paid' } as const;

/** "All" is not a state, so it carries no glyph. */
const FILTERS: { key: Filter; label: string; icon?: IconName; tint: string }[] = [
  { key: 'all', label: 'All', tint: colors.surfie },
  { key: 'completed', label: 'Completed', icon: 'check', tint: colors.surfie },
  { key: 'cancelled', label: 'Cancelled', icon: 'close', tint: colors.danger },
  { key: 'noShow', label: 'No-show', icon: 'alertCircle', tint: colors.warn },
];

export const AppointmentsScreen = ({
  onOpenDetails,
  onJoin,
}: {
  onOpenDetails: (appointmentId: string) => void;
  onJoin: (appointmentId: string) => void;
}) => {
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const [bucket, setBucket] = useState<Bucket>('today');
  const [filter, setFilter] = useState<Filter>('all');
  const live = useStore(selectAppointments);

  // Each bucket is its own cache entry, so switching loads independently and a
  // bucket already seen comes back instantly.
  const { data, error, showSkeleton, isRefreshing, retry } = useResource(KEYS.appointments(bucket), () =>
    fetchAppointments(bucket)
  );
  // the fetched list, with any state this session has changed (an ended call)
  const inBucket = useMemo(() => (data ?? []).map((a) => live.find((x) => x.id === a.id) ?? a), [data, live]);

  const counts = useMemo(
    () => ({
      all: inBucket.length,
      completed: inBucket.filter((a) => a.state === 'completed').length,
      cancelled: inBucket.filter((a) => a.state === 'cancelled').length,
      noShow: inBucket.filter((a) => a.state === 'noShow').length,
    }),
    [inBucket]
  );

  const list = useMemo(
    () => (filter === 'all' ? inBucket : inBucket.filter((a) => a.state === filter)),
    [inBucket, filter]
  );
  // offer only the state filters this bucket can actually contain
  const filters = FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0 || f.key === filter);

  const canJoin = (a: Appointment) => joinStateFor(a).kind === 'open';

  return (
    <Screen scroll={false} testID="appointments" topColor={colors.white}>
      <View style={s.headerCard}>
        <TabHeader />
        <PageTitle title="Appointments" subtitle="Manage your patient consultations" />

        <View style={s.bucketRow}>
          {(['today', 'upcoming', 'past'] as Bucket[]).map((b) => (
            <Pressable
              key={b}
              testID={`bucket-${b}`}
              onPress={() => {
                setBucket(b);
                setFilter('all');
              }}
              style={[s.bucketTab, bucket === b && s.bucketTabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: bucket === b }}
            >
              <Text style={[s.bucketText, bucket === b && s.bucketTextActive]}>
                {b === 'today' ? 'Today' : b === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {filters.map(({ key, label, icon, tint }) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                testID={`filter-${key}`}
                onPress={() => setFilter(key)}
                style={[s.filterChip, active && { borderColor: tint, backgroundColor: `${tint}18` }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label}, ${counts[key]}`}
              >
                {icon && <Icon name={icon} size={12} color={tint} />}
                <Text style={[s.filterChipText, active && { color: tint, fontWeight: fontWeight.semibold }]}>
                  {label} · {counts[key]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {showSkeleton ? (
        <ScrollView style={s.listScroll} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          <SkeletonAppointmentList rows={5} />
        </ScrollView>
      ) : error ? (
        <SectionError testID="appointments-error" message="Could not load your appointments." onRetry={retry} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={filter === 'all' ? 'No appointments' : 'Nothing here'}
          body={filter === 'all' ? 'Nothing is booked for this period.' : 'No appointments match this filter.'}
          actionLabel={filter === 'all' ? undefined : 'Show all'}
          onAction={filter === 'all' ? undefined : () => setFilter('all')}
        />
      ) : (
        <ScrollView style={s.listScroll} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {isRefreshing && <RefreshBar testID="appointments-refreshing" />}
          <View style={s.list}>
            {list.map((a, i) => {
              const meta = stateMeta[a.state];
              const join = canJoin(a);
              const [clock, meridiem] = a.time.split(' ');
              return (
                <Pressable
                  key={a.id}
                  testID={`appt-${a.id}`}
                  onPress={() => onOpenDetails(a.id)}
                  style={({ pressed }) => [s.row, i < list.length - 1 && s.rowBorder, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.name}, ${bucket === 'today' ? '' : `${a.dayLabel}, `}${a.time}, ${meta.label}`}
                >
                  <View style={s.timeCol}>
                    {bucket !== 'today' && (
                      <Text style={s.dayText} numberOfLines={2}>
                        {a.dayLabel}
                      </Text>
                    )}
                    <Text style={s.timeText}>{clock}</Text>
                    <Text style={s.timeMeridiem}>{meridiem}</Text>
                  </View>

                  <View style={s.rowRule} />
                  <Avatar initials={a.initials} size={36} />

                  <View style={s.rowBody}>
                    <View style={[s.line, narrow && s.lineStacked]}>
                      <Text style={s.name} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <View style={[s.badge, { backgroundColor: meta.bg }, narrow && s.badgeStacked]}>
                        <View style={[s.badgeDot, { backgroundColor: meta.fg }]} />
                        <Text style={[s.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                      </View>
                    </View>

                    <View style={s.line}>
                      <Text style={s.meta}>
                        {a.gender} · {a.age}
                      </Text>
                      <Text
                        style={[
                          s.payment,
                          a.payment === 'refunded' && { color: colors.inkFaint },
                          a.payment === 'notPaid' && { color: colors.danger },
                        ]}
                      >
                        {paymentLabel[a.payment]}
                      </Text>
                    </View>

                    <View style={s.lineLast}>
                      <Icon name={modeIcon[a.mode]} size={16} color={colors.surfie} />
                      <Text style={s.modeText} numberOfLines={1}>
                        {modeLabel[a.mode]}
                      </Text>
                      <Pressable
                        testID={`action-${a.id}`}
                        onPress={() => (join ? onJoin(a.id) : onOpenDetails(a.id))}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={({ pressed }) => [s.action, join ? s.actionJoin : s.actionDetails, pressed && s.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`${join ? 'Join' : 'Details'} — ${a.name}`}
                      >
                        <Text style={join ? s.actionJoinText : s.actionDetailsText}>{join ? 'Join' : 'Details'}</Text>
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
  pressed: { opacity: 0.75 },
  headerCard: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.surface.line },

  bucketRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface.page,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  bucketTab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: radius.pill },
  bucketTabActive: { backgroundColor: colors.surfie },
  bucketText: { ...typeStyles.label, fontWeight: fontWeight.semibold, color: colors.inkMuted },
  bucketTextActive: { color: colors.white },

  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  filterChipText: { ...typeStyles.caption, color: colors.inkMuted },

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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md, minHeight: 86 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  timeCol: { width: 52, paddingTop: 2 },
  dayText: {
    ...typeStyles.caption,
    fontSize: 11,
    lineHeight: 14,
    color: colors.surfie,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  timeText: { ...typeStyles.caption, color: colors.ink, fontWeight: fontWeight.semibold },
  timeMeridiem: { ...typeStyles.caption, color: colors.inkFaint },
  rowRule: { width: 1, alignSelf: 'stretch', backgroundColor: colors.surface.line, marginRight: 2 },

  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lineStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 3 },
  lineLast: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },

  name: { ...typeStyles.name, flexShrink: 1, color: colors.ink },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  badgeStacked: { marginLeft: 0 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { ...typeStyles.status },

  meta: { ...typeStyles.caption, color: colors.inkMuted },
  payment: { ...typeStyles.caption, marginLeft: 'auto', color: colors.inkMuted },
  modeText: { ...typeStyles.status, flex: 1, minWidth: 0, color: colors.inkMuted },

  action: {
    minWidth: 72,
    minHeight: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionJoin: { backgroundColor: colors.surfie },
  actionJoinText: { ...typeStyles.buttonSmall, color: colors.white },
  actionDetails: { borderWidth: 1.5, borderColor: colors.surfie, backgroundColor: colors.white },
  actionDetailsText: { ...typeStyles.buttonSmall, color: colors.surfie },
});

export default AppointmentsScreen;
