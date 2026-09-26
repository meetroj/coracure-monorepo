import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, Card, Avatar, Button, SectionHeader, StatusPill } from '../../components/ui';
import StatusSheet from '../../components/StatusSheet';
import { TabHeader } from '../navigation/TabHeader';
import { Stars } from './ReviewsScreen';
import { useStore } from '../../state/store';
import {
  JOIN_WINDOW_MIN,
  joinStateFor,
  selectAlertCounts,
  selectDoctor,
  selectEarnings,
  selectLiveStatus,
  selectNextAppointment,
  selectTaskCounts,
  selectTodaySummary,
} from '../../state/selectors';
import { setLiveStatus } from '../../state/actions';
import { toast } from '../../components/Toast';
import { photoPreview } from '../../components/upload';
import {
  feedback,
  inr,
  modeLabel,
  previousConsultations,
  STATUS_LABEL,
  isAutoStatus,
  acceptsInstantRequests,
  type DaySchedule,
  type Leave,
  type ScheduleOverride,
} from '../../data/doctor';
import { DEMO_NOW_MINUTES, TODAY, toISODate } from '../../data/calendar';

type Props = {
  onOpenTasks: () => void;
  onOpenAlerts: () => void;
  onOpenEarnings: () => void;
  onOpenReviews: () => void;
  onOpenAppointments: () => void;
  onOpenAppointment: (appointmentId: string) => void;
  onJoin: (appointmentId: string) => void;
  onEditSchedule: () => void;
  /** The doctor's own photo and name open their profile. */
  onOpenProfile: () => void;
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Today's bookable hours as one line. Time off wins over a date exception,
 * which wins over the weekly schedule.
 */
export const todayHoursLabel = (schedule: DaySchedule[], overrides: ScheduleOverride[] = [], leave: Leave[] = []) => {
  const iso = toISODate(TODAY);
  if (leave.some((l) => l.date === iso)) return 'Time off today';
  const exception = overrides.filter((o) => o.date === iso);
  if (exception.length) return exception.map((o) => `${o.from} – ${o.to}`).join(' · ');
  const today = schedule.find((d) => d.day === WEEKDAY_NAMES[TODAY.getDay()]);
  if (!today || !today.enabled || today.ranges.length === 0) return 'Not available today';
  return today.ranges.map((r) => `${r.from} – ${r.to}`).join(' · ');
};

const greeting = () => (DEMO_NOW_MINUTES < 12 * 60 ? 'Good morning,' : DEMO_NOW_MINUTES < 17 * 60 ? 'Good afternoon,' : 'Good evening,');

type Tile = { key: string; icon: IconName; value: number; label: string };

/**
 * The doctor's day at a glance. Every figure is derived from the records
 * behind it — appointments, write-ups, alerts — so a count here always matches
 * the list it opens.
 */
export const DashboardScreen = ({
  onOpenTasks,
  onOpenAlerts,
  onOpenEarnings,
  onOpenReviews,
  onOpenAppointments,
  onOpenAppointment,
  onJoin,
  onEditSchedule,
  onOpenProfile,
}: Props) => {
  const doctor = useStore(selectDoctor);
  const status = useStore(selectLiveStatus);
  const summary = useStore(selectTodaySummary);
  const next = useStore(selectNextAppointment);
  const tasks = useStore(selectTaskCounts);
  const alerts = useStore(selectAlertCounts);
  const earnings = useStore(selectEarnings);
  const schedule = useStore((s) => s.availability.schedule);
  const overrides = useStore((s) => s.availability.overrides);
  const leave = useStore((s) => s.availability.leave);
  const [pickerOpen, setPickerOpen] = useState(false);

  const locked = isAutoStatus(status);
  const instantOpen = acceptsInstantRequests(status);

  const lead: Tile = { key: 'appts', icon: 'calendar', value: summary.appointments, label: 'Appointments' };
  const stack: Tile[] = [
    { key: 'done', icon: 'checkCircle', value: summary.completed, label: 'Completed' },
    { key: 'up', icon: 'clock', value: summary.upcoming, label: 'Upcoming' },
  ];

  const appt = next?.appointment;
  const join = appt ? joinStateFor(appt) : undefined;
  const isFollowUp = appt ? previousConsultations(appt).length > 0 : false;

  return (
    <Screen testID="dashboard">
      <TabHeader />

      {/* doctor + live status */}
      <View style={s.identityCard}>
        <View style={s.identityRow}>
          <Pressable
            testID="open-profile"
            onPress={onOpenProfile}
            style={({ pressed }) => [s.identity, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${doctor.name}. Open your profile`}
          >
            <Avatar initials={doctor.initials} size={64} online={instantOpen} tone={doctor.photoFile ? 'brand' : 'mint'} photo={photoPreview(doctor.photoFile)} />
            <View style={s.identityCopy}>
              <Text style={s.greeting}>{greeting()}</Text>
              <Text style={s.docName} numberOfLines={2}>
                {doctor.name}
              </Text>
              <Text style={s.docSpec}>{doctor.speciality}</Text>
            </View>
          </Pressable>
          {locked ? (
            <StatusPill testID="status-locked" label={STATUS_LABEL[status]} tone="warn" />
          ) : (
            <Pressable
              testID="status-trigger"
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [s.statusTrigger, pickerOpen && s.statusTriggerOpen, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Status: ${STATUS_LABEL[status]}. Change status`}
            >
              <View style={[s.statusDot, !instantOpen && s.statusDotOff]} />
              <Text style={s.statusTriggerText} numberOfLines={1}>
                {STATUS_LABEL[status]}
              </Text>
              <Icon name="chevronDown" size={14} color={colors.inkMuted} />
            </Pressable>
          )}
        </View>
        {locked && (
          <Text style={s.autoStatusNote}>
            {status === 'completingNotes'
              ? 'Instant requests are paused until this consultation is written up.'
              : 'Set automatically while you are in a consultation.'}
          </Text>
        )}
      </View>

      <StatusSheet
        visible={pickerOpen && !locked}
        current={status}
        onClose={() => setPickerOpen(false)}
        onSave={(nextStatus) => {
          setLiveStatus(nextStatus);
          setPickerOpen(false);
          toast.show(`Status set to ${STATUS_LABEL[nextStatus]}`);
        }}
        todayHours={todayHoursLabel(schedule, overrides, leave)}
        onEditSchedule={() => {
          setPickerOpen(false);
          onEditSchedule();
        }}
      />

      {/* today's summary */}
      <SectionHeader testID="view-all-appointments" title="Today's Summary" actionLabel="View all" onAction={onOpenAppointments} />
      <View style={s.summaryTop}>
        <View testID={`tile-${lead.key}`} style={[s.tileBase, s.leadTile]}>
          <View style={s.leadTopRow}>
            <View style={[s.tileIcon, s.leadIcon]}>
              <Icon name={lead.icon} size={19} color={colors.surfie} />
            </View>
            <Text style={s.leadValue}>{lead.value}</Text>
          </View>
          <Text style={s.leadLabel} numberOfLines={2}>
            {lead.label}
          </Text>
        </View>
        <View style={s.stackCol}>
          {stack.map((t) => (
            <View key={t.key} testID={`tile-${t.key}`} style={[s.tileBase, s.stackTile]}>
              <View style={s.tileIcon}>
                <Icon name={t.icon} size={15} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={s.stackValue}>{t.value}</Text>
                <Text style={s.stackLabel} numberOfLines={1}>
                  {t.label}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* next appointment */}
      {appt && join ? (
        <Card testID="next-appointment" style={s.nextCard}>
          <View style={s.nextHead}>
            <View style={s.nextHeadLeft}>
              <Icon name="calendar" size={17} color={colors.paris} />
              <Text style={s.nextTitle}>Next Appointment</Text>
            </View>
            <View style={s.inPill}>
              <Text style={s.inPillText}>
                {next.inMinutes <= 0 ? 'Started' : next.inMinutes < 60 ? `In ${next.inMinutes} min` : `At ${appt.time}`}
              </Text>
            </View>
          </View>

          <View style={s.nextBody}>
            <View style={s.nextPatient}>
              <View style={s.nextAvatar}>
                <Text style={s.nextAvatarText}>{appt.initials}</Text>
              </View>
              <View style={s.flex}>
                <Text style={s.patientName} numberOfLines={1}>
                  {appt.name}
                </Text>
                <Text style={s.patientMeta}>
                  {appt.gender} · {appt.age} years
                </Text>
                <View style={s.followUpPill}>
                  <Text style={s.followUpText}>{isFollowUp ? 'Follow-up' : 'New patient'}</Text>
                </View>
              </View>
            </View>

            <View style={s.concernSection}>
              <View style={s.concernRow}>
                <Icon name="document" size={14} color={colors.paris} />
                <Text style={s.concernLabel}>Presenting concern (patient reported)</Text>
              </View>
              <Text style={s.concernText} numberOfLines={2}>
                {appt.concern}
              </Text>
            </View>

            <View style={s.metaRow}>
              <View style={s.metaItem}>
                <View style={s.metaIcon}>
                  <Icon name="clock" size={15} color={colors.paris} />
                </View>
                <View style={s.flex}>
                  <Text style={s.metaValue} numberOfLines={1}>
                    {appt.time}
                  </Text>
                  <Text style={s.metaLabel}>{appt.dayLabel}</Text>
                </View>
              </View>
              <View style={s.metaDivider} />
              <View style={s.metaItem}>
                <View style={s.metaIcon}>
                  <Icon name="wallet" size={15} color={colors.paris} />
                </View>
                <View style={s.flex}>
                  <Text style={s.metaValue} numberOfLines={1}>
                    {appt.payment === 'paid' ? 'Paid' : appt.payment === 'refunded' ? 'Refunded' : 'Not paid'}
                  </Text>
                  <Text style={s.metaLabel}>Payment</Text>
                </View>
              </View>
              <View style={s.metaDivider} />
              <View style={s.metaItem}>
                <View style={s.metaIcon}>
                  <Icon name={appt.mode === 'audio' ? 'phone' : appt.mode === 'inPerson' ? 'inPerson' : 'video'} size={15} color={colors.paris} />
                </View>
                <View style={s.flex}>
                  <Text style={s.metaValue} numberOfLines={1}>
                    {appt.mode === 'inPerson' ? 'In person' : appt.mode === 'audio' ? 'Audio' : 'Video'}
                  </Text>
                  <Text style={s.metaLabel}>Mode</Text>
                </View>
              </View>
            </View>

            <View style={s.nextActions}>
              <Button
                testID="next-view-details"
                label="View Details"
                variant="outlineLight"
                size="sm"
                onPress={() => onOpenAppointment(appt.id)}
                style={s.actionBtnSmall}
              />
              <Button
                testID="next-join"
                label={join.kind === 'open' ? 'Join Consultation' : `Opens ${JOIN_WINDOW_MIN} min before`}
                icon={join.kind === 'open' ? 'video' : 'clock'}
                variant="accent"
                size="sm"
                disabled={join.kind !== 'open'}
                onPress={() => onJoin(appt.id)}
                style={s.joinBtnSmall}
                accessibilityHint={join.kind === 'open' ? `${modeLabel[appt.mode]} with ${appt.name}` : undefined}
              />
            </View>
          </View>
        </Card>
      ) : (
        <Card testID="next-appointment-none" style={s.noneCard}>
          <Icon name="calendar" size={20} color={colors.surfie} />
          <View style={s.flex}>
            <Text style={s.noneTitle}>No more appointments today</Text>
            <Text style={s.noneBody}>Upcoming days are on the Appointments tab.</Text>
          </View>
        </Card>
      )}

      {/* clinical tasks + follow-up alerts */}
      <View style={s.twoUp}>
        <Card testID="open-tasks" style={s.halfCard} onPress={onOpenTasks} accessibilityLabel={`Pending clinical tasks, ${tasks.total}`}>
          <View style={s.halfHead}>
            <View style={s.halfIconChip}>
              <Icon name="document" size={19} color={colors.surfie} />
            </View>
            <Text style={s.halfTitle} numberOfLines={2}>
              Pending Clinical Tasks
            </Text>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <View style={s.listBlock}>
            <View style={s.listRow}>
              <Text style={s.taskNum}>{tasks.summary}</Text>
              <Text style={s.taskText}>Summaries to submit</Text>
            </View>
            <View style={s.listRow}>
              <Text style={s.taskNum}>{tasks.note + tasks.prescription}</Text>
              <Text style={s.taskText}>Notes &amp; prescriptions</Text>
            </View>
          </View>
        </Card>

        <Card testID="open-alerts" style={s.halfCard} onPress={onOpenAlerts} accessibilityLabel={`Follow-up alerts, ${alerts.highPriority} high priority`}>
          <View style={s.halfHead}>
            <View style={[s.halfIconChip, s.halfIconChipDanger]}>
              <Icon name="flag" size={19} color={colors.danger} />
            </View>
            <Text style={s.halfTitle} numberOfLines={2}>
              Follow-up Alerts
            </Text>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <View style={s.listBlock}>
            <View style={s.listRow}>
              <Text style={s.alertNumRed}>{alerts.highPriority}</Text>
              <Text style={s.alertText}>High priority</Text>
            </View>
            <View style={s.listRow}>
              <Text style={s.alertNumOrange}>{alerts.other}</Text>
              <Text style={s.alertText}>Other open</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* earnings + patient feedback */}
      <View style={s.twoUp}>
        <Card testID="view-earnings" style={s.halfCard} onPress={onOpenEarnings} accessibilityLabel="Earnings summary">
          <View style={s.halfHead}>
            <View style={s.halfIconChip}>
              <Icon name="wallet" size={19} color={colors.surfie} />
            </View>
            <Text style={s.halfTitle} numberOfLines={2}>
              Earnings Summary
            </Text>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <View style={s.earnCompact}>
            <View style={s.earnCol}>
              <Text style={s.earnLabel}>Today</Text>
              <Text style={s.earnGreen} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {inr(earnings.daily.total)}
              </Text>
            </View>
            <View style={s.earnCol}>
              <Text style={s.earnLabel}>This week</Text>
              <Text style={s.earnGreenMid} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {inr(earnings.weekly.total)}
              </Text>
            </View>
          </View>
        </Card>

        <Card testID="view-reviews" style={s.halfCard} onPress={onOpenReviews} accessibilityLabel="Patient feedback">
          <View style={s.halfHead}>
            <View style={s.halfIconChip}>
              <Icon name="star" size={19} color={colors.surfie} />
            </View>
            <Text style={s.halfTitle} numberOfLines={2}>
              Patient Feedback
            </Text>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <View style={s.feedbackBlock}>
            <Text style={s.feedbackRating}>{feedback.rating.toFixed(1)}</Text>
            <Stars value={feedback.rating} size={14} />
            <Text style={s.feedbackMeta}>{feedback.reviews} reviews</Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
};

/**
 * White tints for content sitting on the dark Surfie card. These are opacities
 * of white, not new hues, so the two-colour brand palette is untouched.
 */
const onDark = {
  text: 'rgba(255,255,255,0.92)',
  textMuted: 'rgba(255,255,255,0.76)',
  textFaint: 'rgba(255,255,255,0.66)',
  line: 'rgba(255,255,255,0.16)',
  chip: 'rgba(255,255,255,0.13)',
} as const;

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },

  identityCard: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityCopy: { flex: 1, minWidth: 0 },
  greeting: { ...typeStyles.bodySmall, color: colors.inkMuted },
  docName: { ...typeStyles.cardTitle, fontSize: 16, lineHeight: 21, fontWeight: fontWeight.bold, color: colors.ink },
  docSpec: { ...typeStyles.bodySmall, color: colors.inkMuted },

  statusTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    // the status is never truncated; the doctor's name wraps instead
    flexShrink: 0,
  },
  statusTriggerOpen: { borderColor: colors.paris },
  statusTriggerText: { ...typeStyles.status, fontWeight: fontWeight.semibold, color: colors.ink },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.paris },
  statusDotOff: { backgroundColor: colors.inkFaint },
  autoStatusNote: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.sm },

  summaryTop: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  tileBase: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surface.line },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadTile: { flex: 1, minHeight: 132, padding: spacing.md, justifyContent: 'center', alignItems: 'center' },
  leadTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  leadIcon: { width: 38, height: 38, borderRadius: 19 },
  leadValue: { ...typeStyles.metric, fontSize: 30, lineHeight: 36, fontWeight: fontWeight.bold, color: colors.ink },
  leadLabel: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.inkMuted, marginTop: 2, textAlign: 'center' },
  stackCol: { flex: 1, gap: spacing.sm },
  stackTile: { flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  stackValue: { ...typeStyles.metricSmall, fontWeight: fontWeight.bold, color: colors.ink },
  stackLabel: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.inkMuted },

  nextCard: { overflow: 'hidden', borderWidth: 1, borderColor: onDark.line, backgroundColor: colors.surfie, marginTop: spacing.md },
  nextHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm },
  nextHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextTitle: { ...typeStyles.cardTitle, fontSize: 14, color: colors.white },
  inPill: { backgroundColor: onDark.chip, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  inPillText: { ...typeStyles.status, color: colors.paris },
  nextBody: { paddingTop: spacing.sm },
  nextPatient: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  nextAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: onDark.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextAvatarText: { ...typeStyles.avatar, fontSize: 19, lineHeight: undefined, color: colors.white },
  patientName: { ...typeStyles.cardTitle, fontSize: 17, lineHeight: 22, fontWeight: fontWeight.bold, color: colors.white },
  patientMeta: { ...typeStyles.caption, color: onDark.textMuted },
  followUpPill: {
    alignSelf: 'flex-start',
    backgroundColor: onDark.chip,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  followUpText: { ...typeStyles.caption, color: colors.paris, fontWeight: fontWeight.semibold },
  concernSection: { marginTop: spacing.md },
  concernRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  concernLabel: { ...typeStyles.caption, color: onDark.textFaint },
  concernText: { ...typeStyles.bodySmall, color: onDark.text, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: onDark.line,
    alignItems: 'center',
  },
  metaDivider: { width: 1, height: 32, backgroundColor: onDark.line },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingHorizontal: 4 },
  metaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: onDark.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaValue: { ...typeStyles.caption, fontWeight: fontWeight.bold, color: colors.white },
  metaLabel: { ...typeStyles.caption, fontSize: 11, color: onDark.textFaint },
  nextActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionBtnSmall: { flex: 1 },
  joinBtnSmall: { flex: 1.35, paddingHorizontal: spacing.sm },

  noneCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  noneTitle: { ...typeStyles.cardTitle, color: colors.ink },
  noneBody: { ...typeStyles.caption, color: colors.inkMuted },

  twoUp: { flexDirection: 'row', gap: 12, marginTop: spacing.md, marginHorizontal: spacing.lg },
  halfCard: { flex: 1, minWidth: 0, marginHorizontal: 0, padding: spacing.md },
  halfHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  halfIconChip: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfIconChipDanger: { backgroundColor: colors.dangerSoft },
  halfTitle: { ...typeStyles.cardTitle, fontSize: 13, lineHeight: 17, fontWeight: fontWeight.bold, flex: 1, color: colors.ink },
  listBlock: { marginTop: spacing.md, gap: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskNum: { ...typeStyles.number, fontSize: 15, fontWeight: fontWeight.bold, color: colors.surfie, minWidth: 18 },
  taskText: { ...typeStyles.caption, color: colors.ink, flex: 1 },
  alertNumRed: { ...typeStyles.number, fontSize: 15, fontWeight: fontWeight.bold, color: colors.danger, minWidth: 18 },
  alertNumOrange: { ...typeStyles.number, fontSize: 15, fontWeight: fontWeight.bold, color: colors.warn, minWidth: 18 },
  alertText: { ...typeStyles.caption, color: colors.ink, flex: 1 },

  earnCompact: { marginTop: spacing.md, gap: spacing.sm },
  earnCol: { minWidth: 0 },
  earnLabel: { ...typeStyles.caption, color: colors.inkMuted },
  earnGreen: { ...typeStyles.metricSmall, fontWeight: fontWeight.bold, color: colors.surfie },
  earnGreenMid: { ...typeStyles.body, fontFamily: typeStyles.metricSmall.fontFamily, fontWeight: fontWeight.semibold, color: colors.surfie },

  feedbackBlock: { marginTop: spacing.md, gap: 3 },
  feedbackRating: { ...typeStyles.metric, fontSize: 22, lineHeight: 28, fontWeight: fontWeight.bold, color: colors.ink },
  feedbackMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
});

export default DashboardScreen;
