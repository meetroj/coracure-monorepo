import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import {
  Screen,
  AppHeader,
  IconButton,
  Card,
  Avatar,
  Button,
  SectionHeader,
  StatusPill,
} from '../../components/ui';
import {
  doctor,
  todaySummary,
  clinicalTasks,
  followUpAlerts,
  earnings,
  feedback,
  nextAppointment,
  inr,
  MANUAL_STATUSES,
  STATUS_LABEL,
  isAutoStatus,
  acceptsInstantRequests,
  type LiveStatus,
} from '../../data/doctor';

type Props = {
  onOpenTasks: () => void;
  onOpenAlerts: () => void;
  onOpenEarnings: () => void;
  onOpenFeedback: () => void;
  onViewAppointment: () => void;
  onJoinConsultation: () => void;
};

const summaryTiles: { key: string; icon: IconName; value: number; label: string; tone: 'brand' | 'success' | 'warn' | 'danger' }[] = [
  { key: 'appts', icon: 'calendar', value: todaySummary.appointments, label: 'Appointments', tone: 'brand' },
  { key: 'done', icon: 'checkCircle', value: todaySummary.completed, label: 'Completed', tone: 'success' },
  { key: 'up', icon: 'clock', value: todaySummary.upcoming, label: 'Upcoming', tone: 'brand' },
  { key: 'noshow', icon: 'close', value: todaySummary.noShow, label: 'No-show', tone: 'danger' },
  { key: 'sum', icon: 'document', value: todaySummary.pendingSummaries, label: 'Pending summary', tone: 'warn' },
];

export const DashboardScreen = ({
  onOpenTasks,
  onOpenAlerts,
  onOpenEarnings,
  onOpenFeedback,
  onViewAppointment,
  onJoinConsultation,
}: Props) => {
  const [status, setStatus] = useState<LiveStatus>('offline');
  const [pickerOpen, setPickerOpen] = useState(false);

  const locked = isAutoStatus(status);
  const instantOpen = acceptsInstantRequests(status);

  return (
    <Screen>
      <AppHeader
        right={
          <>
            <IconButton name="bell" badge label="Notifications" />
            <IconButton name="message" label="Messages" />
          </>
        }
      />

      {/* ------------------------- doctor + live status ------------------------- */}
      <Card style={s.identityCard}>
        <View style={s.identityRow}>
          <Avatar initials={doctor.initials} size={54} online={instantOpen} />
          <View style={s.identityCopy}>
            <Text style={s.greeting}>Good morning,</Text>
            <Text style={s.docName}>{doctor.name}</Text>
            <Text style={s.docSpec}>{doctor.speciality}</Text>
          </View>
        </View>

        {/* One status shown at a time. Tapping opens the picker; system-driven
            states are displayed but cannot be chosen. */}
        {locked ? (
          <View style={s.autoStatusBox}>
            <StatusPill label={STATUS_LABEL[status]} tone="warn" />
            <Text style={s.autoStatusNote}>
              {status === 'completingNotes'
                ? 'New instant requests are paused until your documentation is complete.'
                : 'Set automatically — you cannot change this right now.'}
            </Text>
          </View>
        ) : (
          <View style={s.statusBlock}>
            <Pressable
              testID="status-trigger"
              onPress={() => setPickerOpen((o) => !o)}
              style={[s.statusTrigger, pickerOpen && s.statusTriggerOpen]}
              accessibilityRole="button"
              accessibilityLabel={`Availability: ${STATUS_LABEL[status]}`}
            >
              <View style={[s.statusDot, !instantOpen && s.statusDotOff]} />
              <Text style={s.statusTriggerText}>{STATUS_LABEL[status]}</Text>
              <Icon name={pickerOpen ? 'chevronDown' : 'chevronDown'} size={16} color={colors.inkMuted} />
            </Pressable>

            {pickerOpen && (
              <View style={s.dropdown}>
                {MANUAL_STATUSES.map((m, i) => {
                  const active = status === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      testID={`status-${m.key}`}
                      onPress={() => {
                        setStatus(m.key);
                        setPickerOpen(false);
                      }}
                      style={[s.dropdownItem, i < MANUAL_STATUSES.length - 1 && s.dropdownItemBorder]}
                    >
                      <View style={[s.statusDot, m.key !== 'available' && s.statusDotOff]} />
                      <Text style={[s.dropdownText, active && s.dropdownTextActive]}>{m.label}</Text>
                      {active && <Icon name="checkCircle" size={17} color={colors.surfie} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </Card>

      {/* ---------------------------- today's summary --------------------------- */}
      <SectionHeader title="Today's Summary" actionLabel="View all" onAction={onViewAppointment} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tileRow}>
        {summaryTiles.map((t) => (
          <View key={t.key} testID={`tile-${t.key}`} style={s.tile}>
            {/* icon and count sit on one row; the section header already says
                "Today", so the per-tile "Today" line is gone */}
            <View style={s.tileTop}>
              <View style={[s.tileIcon, t.tone === 'danger' && s.tileIconDanger, t.tone === 'warn' && s.tileIconWarn]}>
                <Icon
                  name={t.icon}
                  size={19}
                  color={t.tone === 'danger' ? colors.danger : t.tone === 'warn' ? colors.warn : colors.surfie}
                />
              </View>
              <Text style={s.tileValue}>{t.value}</Text>
            </View>
            <Text style={s.tileLabel}>{t.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* --------------------------- next appointment --------------------------- */}
      <View style={s.nextWrap}>
        <Card style={s.nextCard}>
          <View style={s.nextHead}>
            <View style={s.nextHeadLeft}>
              <Icon name="calendar" size={18} color={colors.surfie} />
              <Text style={s.nextTitle}>Next Appointment</Text>
            </View>
            <StatusPill label={`In ${nextAppointment.inMinutes} mins`} tone="success" />
          </View>

          <View style={s.nextPatient}>
            <Avatar initials={nextAppointment.initials} size={46} online />
            <View style={s.flex}>
              <Text style={s.patientName}>{nextAppointment.name}</Text>
              <Text style={s.patientMeta}>
                {nextAppointment.gender} · {nextAppointment.age} years
              </Text>
            </View>
          </View>

          <Text style={s.concernLabel}>Presenting concern</Text>
          <Text style={s.concernText}>{nextAppointment.concern}</Text>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Icon name="clock" size={16} color={colors.surfie} />
              <View>
                <Text style={s.metaValue}>{nextAppointment.time}</Text>
                <Text style={s.metaLabel}>{nextAppointment.dayLabel}</Text>
              </View>
            </View>
            <View style={s.metaItem}>
              <Icon name="wallet" size={16} color={colors.surfie} />
              <View>
                <Text style={s.metaValue}>{nextAppointment.payment}</Text>
                <Text style={s.metaLabel}>Payment</Text>
              </View>
            </View>
            <View style={s.metaItem}>
              <Icon name="video" size={16} color={colors.surfie} />
              <View>
                <Text style={s.metaValue}>{nextAppointment.mode}</Text>
                <Text style={s.metaLabel}>Mode</Text>
              </View>
            </View>
          </View>

          <View style={s.nextActions}>
            <Button label="View Details" variant="secondary" onPress={onViewAppointment} style={s.flex} />
            <Button label="Join Consultation" icon="video" onPress={onJoinConsultation} style={s.flex} />
          </View>
        </Card>
      </View>

      {/* --------------------- clinical tasks + follow-up alerts ------------------ */}
      <View style={s.twoUp}>
        <Card style={s.halfCard} onPress={onOpenTasks}>
          <View style={s.halfHead}>
            <Icon name="document" size={18} color={colors.surfie} />
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <Text style={s.halfTitle}>Pending Clinical Tasks</Text>
          <View style={s.miniGrid}>
            <MiniStat value={clinicalTasks.caseSummaries} label="Case summaries" />
            <MiniStat value={clinicalTasks.prescriptionDrafts} label="Prescription drafts" />
            <MiniStat value={clinicalTasks.incompleteNotes} label="Incomplete note" tone="warn" />
            <MiniStat value={clinicalTasks.followUpResponses} label="Follow-up responses" />
          </View>
        </Card>

        <Card style={s.halfCard} onPress={onOpenAlerts}>
          <View style={s.halfHead}>
            <Icon name="bell" size={18} color={colors.warn} />
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <Text style={s.halfTitle}>Follow-up Alerts</Text>
          <View style={s.alertRow}>
            <View style={[s.alertBox, s.alertDanger]}>
              <Text style={[s.alertValue, { color: colors.danger }]}>{followUpAlerts.highPriority}</Text>
              <Text style={s.alertLabel}>High priority</Text>
            </View>
            <View style={[s.alertBox, s.alertWarn]}>
              <Text style={[s.alertValue, { color: colors.warn }]}>{followUpAlerts.dueToday}</Text>
              <Text style={s.alertLabel}>Due today</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* -------------------------------- earnings ------------------------------ */}
      <Card style={s.spaced} onPress={onOpenEarnings}>
        <View style={s.earnRow}>
          <View style={s.earnIcon}>
            <Icon name="wallet" size={20} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.earnLabel}>Earnings</Text>
            <View style={s.earnValues}>
              <View>
                <Text style={s.earnBig}>{inr(earnings.today)}</Text>
                <Text style={s.earnSub}>Today</Text>
              </View>
              <View style={s.earnDivider} />
              <View>
                <Text style={s.earnMid}>{inr(earnings.week)}</Text>
                <Text style={s.earnSub}>This week</Text>
              </View>
            </View>
          </View>
          <Icon name="chevronRight" size={18} color={colors.inkFaint} />
        </View>
      </Card>

      {/* -------------------------------- feedback ------------------------------ */}
      <Card style={s.spaced} onPress={onOpenFeedback}>
        <View style={s.feedbackRow}>
          <View style={s.ratingBubble}>
            <Text style={s.ratingValue}>{feedback.rating}</Text>
          </View>
          <View style={s.flex}>
            <Text style={s.earnLabel}>Overall feedback</Text>
            <View style={s.stars}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="star" size={15} color={colors.paris} filled />
              ))}
            </View>
            <Text style={s.earnSub}>{feedback.reviews} patient reviews</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.inkFaint} />
        </View>
      </Card>
    </Screen>
  );
};

const MiniStat = ({ value, label, tone }: { value: number; label: string; tone?: 'warn' }) => (
  <View style={[s.miniStat, tone === 'warn' && s.miniStatWarn]}>
    <Text style={[s.miniValue, tone === 'warn' && { color: colors.warn }]}>{value}</Text>
    <Text style={s.miniLabel} numberOfLines={2}>
      {label}
    </Text>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1 },
  spaced: { marginTop: spacing.md },

  identityCard: { marginTop: spacing.sm },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityCopy: { flex: 1 },
  greeting: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },
  docName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
  },
  docSpec: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },

  statusBlock: { marginTop: spacing.lg },
  statusTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface.page,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  statusTriggerOpen: { borderColor: colors.paris },
  statusTriggerText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.paris },
  statusDotOff: { backgroundColor: colors.inkFaint },
  dropdown: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  dropdownText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
  },
  dropdownTextActive: { color: colors.ink, fontWeight: '700' },
  autoStatusBox: { marginTop: spacing.lg, gap: spacing.sm },
  autoStatusNote: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted },

  tileRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  tile: {
    minWidth: 124,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconDanger: { backgroundColor: colors.dangerSoft },
  tileIconWarn: { backgroundColor: colors.warnSoft },
  tileValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
  },
  tileLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    fontWeight: '600',
    marginTop: spacing.sm,
  },

  nextWrap: { marginTop: spacing.xl },
  nextCard: { borderLeftWidth: 4, borderLeftColor: colors.paris },
  nextHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nextTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  nextPatient: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  patientName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  patientMeta: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },
  concernLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    marginTop: spacing.md,
  },
  concernText: { fontFamily: typography.body.family, fontSize: typography.size.md, color: colors.ink, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  metaValue: { fontFamily: typography.body.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.ink },
  metaLabel: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkFaint },
  nextActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },

  twoUp: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.lg },
  halfCard: { flex: 1, marginHorizontal: 0, padding: spacing.md },
  halfHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  halfTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  miniStat: {
    width: '46%',
    flexGrow: 1,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  miniStatWarn: { backgroundColor: colors.warnSoft },
  miniValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.surfie,
  },
  miniLabel: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkMuted },
  alertRow: { gap: spacing.sm, marginTop: spacing.md },
  alertBox: { borderRadius: radius.md, padding: spacing.sm },
  alertDanger: { backgroundColor: colors.dangerSoft },
  alertWarn: { backgroundColor: colors.warnSoft },
  alertValue: { fontFamily: typography.heading.family, fontSize: typography.size.xl, fontWeight: '700' },
  alertLabel: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkMuted },

  earnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  earnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnLabel: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },
  earnValues: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  earnBig: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
  },
  earnMid: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  earnSub: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.inkFaint },
  earnDivider: { width: 1, height: 28, backgroundColor: colors.surface.line },

  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ratingBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.surfie,
  },
  stars: { flexDirection: 'row', gap: 2, marginVertical: 2 },
});

export default DashboardScreen;
