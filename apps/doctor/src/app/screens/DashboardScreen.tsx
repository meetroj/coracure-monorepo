import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, AppHeader, IconButton, Card, Avatar, Button, SectionHeader, StatusPill } from '../../components/ui';
import StatusSheet from '../../components/StatusSheet';
import {
  doctor,
  todaySummary,
  clinicalTasks,
  followUpAlerts,
  earnings,
  nextAppointment,
  inr,
  STATUS_LABEL,
  isAutoStatus,
  acceptsInstantRequests,
  type LiveStatus,
} from '../../data/doctor';

type Props = {
  onOpenTasks: () => void;
  onOpenAlerts: () => void;
  onOpenEarnings: () => void;
  onViewAppointment: () => void;
  onOpenNextAppointment?: () => void;
  onJoinConsultation: () => void;
  onOpenRequest?: () => void;
  onOpenMessages?: () => void;
};

type SummaryTile = { key: string; icon: IconName; value: number; label: string; tone: 'brand' | 'warn' | 'danger' };

/**
 * Bento layout, not a scroller: the headline count takes a tall cell on the
 * left, the two other "in progress" counts stack beside it, and the two
 * exception counts share one full-width bar underneath. Nothing scrolls off
 * screen the way the old horizontal row did.
 *
 * No tile repeats "Today" — the section header already carries the timeframe.
 */
const leadTile: SummaryTile = {
  key: 'appts', icon: 'calendar', value: todaySummary.appointments, label: 'Appointments', tone: 'brand',
};
const stackTiles: SummaryTile[] = [
  { key: 'done', icon: 'checkCircle', value: todaySummary.completed, label: 'Completed', tone: 'brand' },
  { key: 'up', icon: 'clock', value: todaySummary.upcoming, label: 'Upcoming', tone: 'brand' },
];
const wideTiles: SummaryTile[] = [
  { key: 'noshow', icon: 'close', value: todaySummary.noShow, label: 'No-show / Cancelled', tone: 'danger' },
  { key: 'sum', icon: 'document', value: todaySummary.pendingSummaries, label: 'Pending Summaries', tone: 'warn' },
];

export const DashboardScreen = ({
  onOpenTasks,
  onOpenAlerts,
  onOpenEarnings,
  onViewAppointment,
  onOpenNextAppointment,
  onJoinConsultation,
  onOpenRequest,
  onOpenMessages,
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
            <IconButton testID="nav-notifications" name="bell" badge label="Notifications" onPress={onOpenRequest} />
            <IconButton testID="nav-messages" name="message" label="Messages" onPress={onOpenMessages} />
          </>
        }
      />

      {/* doctor + live status */}
      <View style={s.identityCard}>
        <View style={s.identityRow}>
          <Avatar initials={doctor.initials} photo={doctor.photo} size={68} online={instantOpen} />
          <View style={s.identityCopy}>
            <Text style={s.greeting}>Good morning,</Text>
            <Text style={s.docName} numberOfLines={2}>{doctor.name}</Text>
            <Text style={s.docSpec}>{doctor.speciality}</Text>
          </View>
          {locked ? (
            <StatusPill label={STATUS_LABEL[status]} tone="warn" />
          ) : (
            <Pressable
              testID="status-trigger"
              onPress={() => setPickerOpen((o) => !o)}
              style={[s.statusTrigger, pickerOpen && s.statusTriggerOpen]}
              accessibilityRole="button"
              accessibilityLabel={`Availability: ${STATUS_LABEL[status]}`}
            >
              <View style={[s.statusDot, !instantOpen && s.statusDotOff]} />
              <Text style={s.statusTriggerText} numberOfLines={1}>{STATUS_LABEL[status]}</Text>
              <Icon name="chevronDown" size={14} color={colors.inkMuted} />
            </Pressable>
          )}
        </View>
        {locked && (
          <Text style={s.autoStatusNote}>
            {status === 'completingNotes'
              ? 'New instant requests are paused until your documentation is complete.'
              : 'Set automatically — you cannot change this right now.'}
          </Text>
        )}
      </View>

      <StatusSheet
        visible={pickerOpen && !locked}
        current={status}
        onClose={() => setPickerOpen(false)}
        onSave={(next) => { setStatus(next); setPickerOpen(false); }}
      />

      {/* today's summary */}
      <SectionHeader title="Today's Summary" actionLabel="View all" onAction={onViewAppointment} />
      <View style={s.summaryGrid}>
        <View style={s.summaryTop}>
          {/* left — the headline count, given the tall cell */}
          <View testID={`tile-${leadTile.key}`} style={[s.tileBase, s.leadTile]}>
            {/* Icon and count share a row, matching the stacked tiles beside it. */}
            <View style={s.leadTopRow}>
              <View style={[s.tileIcon, s.leadIcon]}>
                <Icon name={leadTile.icon} size={19} color={colors.surfie} />
              </View>
              <Text style={s.leadValue}>{leadTile.value}</Text>
            </View>
            <Text style={s.leadLabel} numberOfLines={2}>{leadTile.label}</Text>
          </View>

          {/* right — two stacked, sharing the left cell's height */}
          <View style={s.stackCol}>
            {stackTiles.map((t) => (
              <View key={t.key} testID={`tile-${t.key}`} style={[s.tileBase, s.stackTile]}>
                <View style={s.tileIcon}>
                  <Icon name={t.icon} size={15} color={colors.surfie} />
                </View>
                <View style={s.flex}>
                  <Text style={s.stackValue}>{t.value}</Text>
                  <Text style={s.stackLabel} numberOfLines={1}>{t.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* bottom — one common bar spanning the full width */}
        <View style={[s.tileBase, s.wideTile]}>
          {wideTiles.map((t, i) => (
            <React.Fragment key={t.key}>
              {i > 0 && <View style={s.wideDivider} />}
              <View testID={`tile-${t.key}`} style={s.wideCell}>
                <View style={[s.tileIcon, t.tone === 'danger' ? s.tileIconDanger : s.tileIconWarn]}>
                  <Icon name={t.icon} size={15} color={t.tone === 'danger' ? colors.danger : colors.warn} />
                </View>
                <View style={s.flex}>
                  <Text style={s.stackValue}>{t.value}</Text>
                  <Text style={s.stackLabel} numberOfLines={2}>{t.label}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* next appointment */}
      <Card style={s.nextCard}>
        <View style={s.nextHead}>
          <View style={s.nextHeadLeft}>
            <Icon name="calendar" size={17} color={colors.paris} />
            <Text style={s.nextTitle}>Next Appointment</Text>
          </View>
          <StatusPill label={`In ${nextAppointment.inMinutes} mins`} tone="success" />
        </View>

        <View style={s.nextBody}>
          <View style={s.nextPatient}>
            <View style={s.avatarShift}>
              <Avatar initials={nextAppointment.initials} size={60} online />
            </View>
            <View style={s.flex}>
              <Text style={s.patientName} numberOfLines={1}>{nextAppointment.name}</Text>
              <Text style={s.patientMeta}>{nextAppointment.gender} · {nextAppointment.age} years</Text>
              <View style={s.followUpRow}>
                <View style={s.followUpPill}>
                  <Text style={s.followUpText}>Follow-up</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Presenting Concern — full width below the patient/follow-up row */}
          <View style={s.concernSection}>
            <View style={s.concernRow}>
              <Icon name="document" size={14} color={colors.paris} />
              <Text style={s.concernLabel}>Presenting Concern</Text>
            </View>
            <Text style={s.concernText} numberOfLines={2}>{nextAppointment.concern}</Text>
          </View>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <View style={s.metaIcon}><Icon name="clock" size={15} color={colors.paris} /></View>
              <View style={s.flex}>
                <Text style={s.metaValue} numberOfLines={1}>{nextAppointment.time}</Text>
                <Text style={s.metaLabel}>{nextAppointment.dayLabel}</Text>
              </View>
            </View>
            <View style={s.metaDivider} />
            <View style={s.metaItem}>
              <View style={s.metaIcon}><Icon name="wallet" size={15} color={colors.paris} /></View>
              <View style={s.flex}>
                <Text style={s.metaValue} numberOfLines={1}>{nextAppointment.payment}</Text>
                <Text style={s.metaLabel}>Payment</Text>
              </View>
            </View>
            <View style={s.metaDivider} />
            <View style={s.metaItem}>
              <View style={s.metaIcon}><Icon name="video" size={15} color={colors.paris} /></View>
              <View style={s.flex}>
                <Text style={s.metaValue} numberOfLines={1}>{nextAppointment.mode}</Text>
                <Text style={s.metaLabel}>Mode</Text>
              </View>
            </View>
          </View>

          <View style={s.nextActions}>
            <Button testID="next-view-details" label="View Details" variant="secondary" size="sm" onPress={onOpenNextAppointment ?? onViewAppointment} style={s.actionBtnSmall} />
            <Button label="Join Consultation" icon="video" variant="accent" size="sm" onPress={onJoinConsultation} style={s.joinBtnSmall} />
          </View>
        </View>
      </Card>

      {/* clinical tasks + follow-up alerts */}
      <View style={s.twoUp}>
        <Card style={s.halfCard} onPress={onOpenTasks}>
          <View style={s.halfHead}>
            <View style={s.halfIconChip}><Icon name="document" size={19} color={colors.surfie} /></View>
            <Text style={s.halfTitle} numberOfLines={2}>Pending Clinical Tasks</Text>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <View style={s.listBlock}>
            <View style={s.listRow}>
              <Text style={s.taskNum}>{clinicalTasks.caseSummaries}</Text>
              <Text style={s.taskText}>Reports to Review</Text>
            </View>
            <View style={s.listRow}>
              <Text style={s.taskNum}>{clinicalTasks.prescriptionDrafts}</Text>
              <Text style={s.taskText}>Prescriptions to Sign</Text>
            </View>
          </View>
        </Card>

        <Card style={s.halfCard} onPress={onOpenAlerts}>
          <View style={s.halfHead}>
            <View style={[s.halfIconChip, s.halfIconChipDanger]}><Icon name="bell" size={19} color={colors.danger} /></View>
            <Text style={s.halfTitle} numberOfLines={2}>Follow-up Alerts</Text>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <View style={s.listBlock}>
            <View style={s.listRow}>
              <Text style={s.alertNumRed}>{followUpAlerts.highPriority}</Text>
              <Text style={s.alertText}>High Priority</Text>
            </View>
            <View style={s.listRow}>
              <Text style={s.alertNumOrange}>{followUpAlerts.dueToday}</Text>
              <Text style={s.alertText}>Due Today</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* earnings */}
      <View style={s.twoUpBottom}>
        <Card testID="view-earnings" style={s.bottomCard} onPress={onOpenEarnings}>
          <View style={s.halfHead}>
            <View style={s.halfIconChip}><Icon name="wallet" size={19} color={colors.surfie} /></View>
            <Text style={s.halfTitle} numberOfLines={2}>Earnings Summary</Text>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </View>
          <View style={s.earnCompact}>
            <View style={s.earnCol}>
              <Text style={s.earnLabel}>Today's Earnings</Text>
              <Text style={s.earnGreen}>{inr(earnings.today)}</Text>
            </View>
            <View style={s.earnRule} />
            <View style={s.earnCol}>
              <Text style={s.earnLabel}>This week</Text>
              <Text style={s.earnGreenMid}>{inr(earnings.week)}</Text>
            </View>
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
  textMuted: 'rgba(255,255,255,0.72)',
  textFaint: 'rgba(255,255,255,0.60)',
  line: 'rgba(255,255,255,0.16)',
  chip: 'rgba(255,255,255,0.13)',
} as const;

const s = StyleSheet.create({
  flex: { flex: 1 },

  identityCard: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityCopy: { flex: 1, minWidth: 0 },
  greeting: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted },
  docName: { fontFamily: typography.heading.family, fontSize: typography.size.md, lineHeight: 20, fontWeight: '700', color: colors.ink },
  docSpec: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },

  statusTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.sm, height: 32, maxWidth: 112,
    borderRadius: radius.pill, backgroundColor: colors.surface.page,
    borderWidth: 1, borderColor: colors.surface.line,
  },
  statusTriggerOpen: { borderColor: colors.paris },
  statusTriggerText: { fontFamily: typography.body.family, fontSize: typography.size.xs, fontWeight: '700', color: colors.ink },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.paris },
  statusDotOff: { backgroundColor: colors.inkFaint },
  autoStatusNote: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted, marginTop: spacing.sm },

  /* Today's Summary — bento grid (tall lead + stacked pair + full-width bar) */
  summaryGrid: { marginHorizontal: spacing.lg, gap: spacing.sm },
  summaryTop: { flexDirection: 'row', gap: spacing.sm },
  tileBase: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  tileIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  tileIconDanger: { backgroundColor: colors.dangerSoft },
  tileIconWarn: { backgroundColor: colors.warnSoft },

  // 132 = the two stacked tiles (62 each) plus the 8pt gap between them, so
  // the lead cell and the right-hand column always end flush.
  // Centred on both axes — the icon/count row and the label sit mid-cell.
  leadTile: { flex: 1, minHeight: 132, paddingHorizontal: spacing.md, paddingVertical: spacing.md, justifyContent: 'center', alignItems: 'center' },
  leadTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // No bottom margin — the icon now sits beside the count, not above it.
  leadIcon: { width: 38, height: 38, borderRadius: 19 },
  leadValue: { fontFamily: typography.heading.family, fontSize: 30, lineHeight: 34, fontWeight: '700', color: colors.ink },
  leadLabel: { fontFamily: typography.body.family, fontSize: typography.size.xs, fontWeight: '600', color: colors.inkMuted, marginTop: 2, textAlign: 'center' },

  stackCol: { flex: 1, gap: spacing.sm },
  stackTile: { flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  stackValue: { fontFamily: typography.heading.family, fontSize: typography.size.lg, lineHeight: 22, fontWeight: '700', color: colors.ink },
  stackLabel: { fontFamily: typography.body.family, fontSize: 11, lineHeight: 14, fontWeight: '600', color: colors.inkMuted },

  wideTile: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  wideCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wideDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.surface.line, marginHorizontal: spacing.md },

  /**
   * Next Appointment sits on Surfie Green — the dark end of the brand palette —
   * so it reads as the one thing on the screen that needs acting on. Every
   * value inside therefore flips to white/Paris Green; `onDark` holds those
   * tints so they stay consistent across the card.
   */
  nextCard: { overflow: 'hidden', borderWidth: 1, borderColor: onDark.line, backgroundColor: colors.surfie, marginTop: spacing.md },
  nextHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm },
  nextHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextTitle: { fontFamily: typography.heading.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.white },
  nextBody: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.md },
  nextPatient: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatarShift: { marginLeft: -4 },
  patientName: { fontFamily: typography.heading.family, fontSize: typography.size.lg, fontWeight: '700', color: colors.white },
  patientMeta: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: onDark.textMuted },
  followUpRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  followUpPill: { backgroundColor: onDark.chip, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  followUpText: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: colors.paris, fontWeight: '600' },

  concernSection: { marginTop: spacing.sm },
  concernRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  concernLabel: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: onDark.textFaint },
  concernText: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: onDark.text, marginTop: 2 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: onDark.line, alignItems: 'center' },
  metaDivider: { width: 1, height: 32, backgroundColor: onDark.line },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingHorizontal: 4 },
  metaIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: onDark.chip, alignItems: 'center', justifyContent: 'center' },
  metaValue: { fontFamily: typography.body.family, fontSize: typography.size.xs, fontWeight: '700', color: colors.white },
  metaLabel: { fontFamily: typography.body.family, fontSize: typography.size.xxs, color: onDark.textFaint },
  nextActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionBtnSmall: { flex: 1, height: 44 },
  joinBtnSmall: { flex: 1.25, height: 44, paddingHorizontal: spacing.sm },

  twoUp: { flexDirection: 'row', gap: 12, marginTop: spacing.sm, marginHorizontal: spacing.lg },
  twoUpBottom: { flexDirection: 'row', gap: 12, marginTop: spacing.sm, marginHorizontal: spacing.lg },
  halfCard: { flex: 1, minWidth: 0, marginHorizontal: 0, padding: spacing.lg },
  bottomCard: { flex: 1, minWidth: 0, marginHorizontal: 0, padding: spacing.lg },

  listBlock: { marginTop: spacing.md, gap: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listText: { fontFamily: typography.body.family, fontSize: typography.size.sm, fontWeight: '600', color: colors.ink },
  taskNum: { fontFamily: typography.heading.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.surfie, minWidth: 16 },
  taskText: { fontFamily: typography.body.family, fontSize: typography.size.xs, fontWeight: '400', color: colors.ink },
  alertNumRed: { fontFamily: typography.heading.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.danger, minWidth: 16 },
  alertNumOrange: { fontFamily: typography.heading.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.warn, minWidth: 16 },
  alertText: { fontFamily: typography.body.family, fontSize: typography.size.xs, fontWeight: '400', color: colors.ink },

  halfHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  halfIconChip: { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  halfIconChipDanger: { backgroundColor: '#FBDEDC' },
  halfTitle: { flex: 1, fontFamily: typography.heading.family, fontSize: 12.5, lineHeight: 16, fontWeight: '700', color: colors.ink, flexShrink: 1 },

  earnCompact: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  earnCol: { flex: 1, gap: 2 },
  earnRule: { width: 1, height: 32, backgroundColor: colors.surface.line, marginHorizontal: spacing.md },
  earnLabel: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted },
  earnGreen: { fontFamily: typography.heading.family, fontSize: typography.size.xl, fontWeight: '700', color: colors.surfie },
  earnGreenMid: { fontFamily: typography.heading.family, fontSize: typography.size.lg, fontWeight: '600', color: colors.surfie },

  listBadge: { width: 24, height: 24, borderRadius: 10, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  listBadgeDanger: { width: 24, height: 24, borderRadius: 10, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  listBadgeWarn: { width: 24, height: 24, borderRadius: 10, backgroundColor: '#FBE7D2', alignItems: 'center', justifyContent: 'center' },
  listBadgeText: { fontFamily: typography.heading.family, fontSize: typography.size.xs, fontWeight: '700', color: colors.ink },
});

export default DashboardScreen;
