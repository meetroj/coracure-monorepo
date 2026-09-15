import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import {
  pathways,
  DURATIONS,
  reviewDateFor,
  shortDate,
  planPatient,
  DEFAULT_START,
  type Duration,
  type PathwayKey,
} from '../../data/followup';

const MINT = '#E8F8F2';
const LINE = '#E1EDE8';
const INK = '#16232B';
const MUTED = '#6B7C86';

/**
 * Assign Follow-up Plan.
 *
 * Compact by design: everything fits without scrolling far, because a doctor
 * assigns this at the end of a consultation. The review date is derived from
 * the start date and duration rather than being separately editable — two
 * fields that can disagree is a bug waiting to happen.
 *
 * The pathway's questions are governed centrally, so this screen shows only
 * how many there are, never the questions themselves or a way to edit them.
 */
export const AssignFollowUpPlanScreen = ({
  onBack,
  onAssign,
  onViewConsultation,
}: {
  onBack: () => void;
  onAssign: () => void;
  onViewConsultation?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [pathway, setPathway] = useState<PathwayKey>('depressionAnxiety');
  const [duration, setDuration] = useState<Duration>(7);
  const [start] = useState(DEFAULT_START);

  const selected = pathways.find((p) => p.key === pathway)!;
  const review = useMemo(() => reviewDateFor(start, duration), [start, duration]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <View style={s.appBar}>
          <Pressable testID="back" onPress={onBack} hitSlop={10} style={s.iconBtn} accessibilityLabel="Back">
            <Icon name="arrowLeft" size={18} color={INK} />
          </Pressable>
          <LogoWide width={104} height={26} />
          <Pressable hitSlop={10} style={s.iconBtn} accessibilityLabel="Notifications">
            <Icon name="bell" size={17} color={INK} />
            <View style={s.dot} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[typeStyles.body, s.h1]}>Assign Follow-up Plan</Text>
        <Text style={[typeStyles.body, s.sub]}>Choose a pathway and schedule the patient&apos;s daily check-ins.</Text>

        {/* thin patient strip */}
        <View style={s.strip}>
          <View style={s.avatar}>
            <Text style={[typeStyles.body, s.avatarText]}>{planPatient.initials}</Text>
          </View>
          <View style={s.flex}>
            <Text style={[typeStyles.body, s.stripName]}>{planPatient.name}</Text>
            <Text style={[typeStyles.body, s.stripMeta]}>
              {planPatient.gender} • {planPatient.age} years
            </Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.flex}>
            <Text style={[typeStyles.body, s.stripLabel]}>Consultation ID</Text>
            <Text style={[typeStyles.body, s.stripValue]}>{planPatient.consultationId}</Text>
          </View>
          <Pressable testID="view-consultation" onPress={onViewConsultation} hitSlop={8} style={s.viewBtn}>
            <Text style={[typeStyles.body, s.viewText]}>View</Text>
            <Icon name="chevronRight" size={13} color={colors.surfie} />
          </Pressable>
        </View>

        {/* pathway picker */}
        <Text style={[typeStyles.body, s.h2]}>Select pathway</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tileRow}>
          {pathways.map((p) => {
            const on = p.key === pathway;
            return (
              <Pressable
                key={p.key}
                testID={`pathway-${p.key}`}
                onPress={() => setPathway(p.key)}
                style={[s.tile, on && s.tileOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                {on && (
                  <View style={s.tileCheck}>
                    <Icon name="checkCircle" size={13} color={colors.white} filled />
                  </View>
                )}
                <View style={s.tileIcon}>
                  <Icon name={p.icon} size={16} color={colors.surfie} />
                </View>
                <Text style={[typeStyles.body, [s.tileLabel, on && s.tileLabelOn]]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* selected pathway info — count only, never the questions */}
        <View style={s.infoPanel}>
          <View style={s.infoIcon}>
            <Icon name={selected.icon} size={18} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={[typeStyles.body, s.infoTitle]}>{selected.label}</Text>
            <Text style={[typeStyles.body, s.infoMeta]}>
              Clinically approved • {selected.dailyQuestions} daily questions
            </Text>
          </View>
        </View>

        {/* schedule */}
        <Text style={[typeStyles.body, s.h2]}>Plan schedule</Text>
        <View style={s.dateRow}>
          <Pressable style={s.dateField}>
            <Icon name="calendar" size={16} color={colors.surfie} />
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.fieldLabel]}>Start date</Text>
              <Text style={[typeStyles.body, s.fieldValue]}>{start}</Text>
            </View>
            <Icon name="chevronDown" size={13} color={MUTED} />
          </Pressable>
          {/* derived from start + duration, so the two can never disagree */}
          <View style={s.dateField}>
            <Icon name="calendar" size={16} color={colors.surfie} />
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.fieldLabel]}>Review date</Text>
              <Text testID="review-date" style={[typeStyles.body, s.fieldValue]}>
                {review}
              </Text>
            </View>
          </View>
        </View>

        {/* duration */}
        <Text style={[typeStyles.body, s.h2]}>Check-in duration</Text>
        <View style={s.segment}>
          {DURATIONS.map((d) => {
            const on = d === duration;
            return (
              <Pressable
                key={d}
                testID={`duration-${d}`}
                onPress={() => setDuration(d)}
                style={[s.segItem, on && s.segItemOn]}
              >
                <Text style={[typeStyles.body, [s.segText, on && s.segTextOn]]}>{d} Days</Text>
              </Pressable>
            );
          })}
        </View>

        {/* summary */}
        <Text style={[typeStyles.body, s.h2]}>Plan summary</Text>
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <View style={s.summaryIcon}>
              <Icon name="calendar" size={14} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.summaryLabel]}>Starts</Text>
              <Text style={[typeStyles.body, s.summaryValue]}>{shortDate(start)}</Text>
            </View>
          </View>
          <View style={s.summaryCard}>
            <View style={s.summaryIcon}>
              <Icon name="checklist" size={14} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.summaryLabel]}>Check-ins</Text>
              <Text testID="checkin-count" style={[typeStyles.body, s.summaryValue]}>
                {duration}
              </Text>
            </View>
          </View>
          <View style={s.summaryCard}>
            <View style={s.summaryIcon}>
              <Icon name="calendar" size={14} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.summaryLabel]}>Review</Text>
              <Text style={[typeStyles.body, s.summaryValue]}>{shortDate(review)}</Text>
            </View>
          </View>
        </View>

        <View style={s.note}>
          <Icon name="info" size={15} color={colors.surfie} />
          <Text style={[typeStyles.body, s.noteText]}>The assigned pathway will appear in the patient&apos;s Care Plan.</Text>
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable testID="assign" onPress={onAssign} style={s.cta} accessibilityRole="button">
          <Text style={[typeStyles.body, s.ctaText]}>Assign Follow-up Plan</Text>
          <View style={s.ctaArrow}>
            <Icon name="arrowRight" size={15} color={colors.white} />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.white },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.paris,
  },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  h1: { ...typeStyles.pageTitle, color: INK, marginTop: spacing.sm },
  sub: { ...typeStyles.caption, color: MUTED, marginTop: 2, marginBottom: spacing.md },
  h2: { ...typeStyles.sectionTitle, color: INK, marginTop: spacing.md, marginBottom: spacing.sm },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typeStyles.avatar, color: colors.surfie },
  stripName: { ...typeStyles.name, color: INK },
  stripMeta: { ...typeStyles.caption, color: MUTED },
  stripDivider: { width: 1, height: 24, backgroundColor: LINE },
  stripLabel: { ...typeStyles.label, color: MUTED },
  stripValue: { ...typeStyles.caption, color: INK },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  viewText: { ...typeStyles.buttonSmall, color: colors.surfie },

  tileRow: { gap: spacing.sm, paddingRight: spacing.lg },
  tile: {
    width: 82,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tileOn: { borderColor: colors.surfie, backgroundColor: '#F4FBF8' },
  tileCheck: { position: 'absolute', top: 4, right: 4 },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  tileLabel: { ...typeStyles.label, color: MUTED, textAlign: 'center' },
  tileLabelOn: { color: INK, fontWeight: fontWeight.semibold },

  infoPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: MINT,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { ...typeStyles.cardTitle, color: INK },
  infoMeta: { ...typeStyles.caption, color: MUTED, marginTop: 1 },

  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  fieldLabel: { ...typeStyles.label, color: MUTED },
  fieldValue: { ...typeStyles.input, color: INK },

  segment: {
    flexDirection: 'row',
    backgroundColor: '#F3F8F6',
    borderRadius: radius.md,
    padding: 3,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  segItemOn: { backgroundColor: colors.surfie },
  segText: { ...typeStyles.status, color: MUTED },
  segTextOn: { color: colors.white },

  summaryRow: { flexDirection: 'row', gap: 6 },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.md,
    paddingHorizontal: 6,
    paddingVertical: spacing.sm,
  },
  summaryIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { ...typeStyles.label, color: MUTED },
  summaryValue: { ...typeStyles.metricSmall, color: INK },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: MINT,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    marginTop: spacing.md,
  },
  noteText: { ...typeStyles.caption, flex: 1, color: INK },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: LINE,
    backgroundColor: colors.white,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfie,
    borderRadius: radius.pill,
    height: 46,
    paddingHorizontal: spacing.md,
  },
  ctaText: { ...typeStyles.button, flex: 1, textAlign: 'center', color: colors.white },
  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.paris,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AssignFollowUpPlanScreen;
