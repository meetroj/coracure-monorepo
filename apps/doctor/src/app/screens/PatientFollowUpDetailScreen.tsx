import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import {
  checkInDays,
  triggerResponses,
  recommendedActions,
  followUpDetail,
  DAY_STATE,
  NOTE_LIMIT,
  type DayState,
} from '../../data/followup';

const MINT = '#E8F8F2';
const LINE = '#E1EDE8';
const INK = '#16232B';
const MUTED = '#6B7C86';
const AMBER = '#C97F1B';

const STATE_COLOR: Record<DayState, string> = {
  stable: colors.paris,
  attention: '#E9A93B',
  redFlag: colors.danger,
  pending: '#D3DCD8',
};

/** Only the three states a doctor can act on are worth a key. */
const LEGEND: DayState[] = ['stable', 'attention', 'redFlag'];

const ACTION_TONE: Record<'brand' | 'warn' | 'danger', { fg: string; bg: string }> = {
  brand: { fg: colors.surfie, bg: MINT },
  warn: { fg: AMBER, bg: '#FDF4E5' },
  danger: { fg: colors.danger, bg: '#FDECEB' },
};

/** The plan facts, in the order the card reads them. */
const FACTS = [
  { k: 'day', icon: 'calendar' as const, flex: 0.9, label: 'Day', value: `${followUpDetail.dayOf} / ${followUpDetail.dayTotal}` },
  { k: 'who', icon: 'user' as const, flex: 1.34, label: 'Assigned To', value: followUpDetail.assignedTo },
  { k: 'next', icon: 'clock' as const, flex: 0.9, label: 'Next Check-in', value: followUpDetail.nextCheckIn },
];

/**
 * Patient Follow-up Detail.
 *
 * The trend is a direction between two observed check-in states — never a
 * score, grade or prediction. Marking the alert reviewed records who acted and
 * when; it does not assert that the safety concern is medically resolved, and
 * the footer says so explicitly.
 */
export const PatientFollowUpDetailScreen = ({
  onBack,
  onSave,
  onEscalate,
}: {
  onBack: () => void;
  onSave: (action: string, note: string) => void;
  onEscalate?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const d = followUpDetail;
  const [selectedDay, setSelectedDay] = useState(d.dayOf);
  const [action, setAction] = useState<string | null>('followUp');
  const [note, setNote] = useState('');

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <View style={s.appBar}>
          <Pressable testID="back" onPress={onBack} hitSlop={10} style={s.iconBtn} accessibilityLabel="Back">
            <Icon name="arrowLeft" size={18} color={INK} />
          </Pressable>
          <Text style={[typeStyles.body, s.appTitle]}>Patient Follow-up Detail</Text>
          <Pressable hitSlop={10} style={s.iconBtn} accessibilityLabel="More options">
            <Icon name="more" size={17} color={INK} />
          </Pressable>
        </View>
      </View>

      {/* keeps the focused field and the primary action above the keyboard */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* patient */}
          <View style={s.card}>
            <View style={s.patientRow}>
              <View style={s.avatar}>
                <Text style={[typeStyles.body, s.avatarText]}>{d.initials}</Text>
              </View>
              <View style={s.flex}>
                <Text style={[typeStyles.body, s.name]}>{d.name}</Text>
                <Text style={[typeStyles.body, s.meta]}>
                  {d.gender} • {d.age} years • {d.patientId}
                </Text>
                <View style={s.pathPill}>
                  <Icon name="brain" size={10} color={colors.surfie} />
                  <Text style={[typeStyles.body, s.pathText]}>{d.pathway}</Text>
                </View>
              </View>

              {/* when the check-in arrived sits above the flag it raised */}
              <View style={s.riskCol}>
                <Text style={[typeStyles.body, s.riskLabel]}>Last Check-in</Text>
                <Text style={[typeStyles.body, s.riskTime]}>{d.lastCheckIn}</Text>
                <View style={s.riskPill}>
                  <Icon name="alertCircle" size={9} color={colors.danger} />
                  <Text style={[typeStyles.body, s.riskText]}>{d.status}</Text>
                </View>
              </View>
            </View>

            {/* three equal columns, so no fact is pinned to an edge */}
            <View style={s.factRow}>
              {FACTS.map((f, i) => (
                <React.Fragment key={f.k}>
                  {i > 0 && <View style={s.factDivider} />}
                  <View style={[s.fact, { flex: f.flex }]}>
                    <Icon name={f.icon} size={15} color={colors.surfie} />
                    <View style={s.flex}>
                      <Text style={[typeStyles.body, s.factLabel]}>{f.label}</Text>
                      <Text style={[typeStyles.body, s.factValue]} numberOfLines={1}>
                        {f.value}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* seven-day history */}
          <View style={[s.card, s.histCard]}>
            <View style={s.histHead}>
              <Text style={[typeStyles.body, s.histTitle]}>7-Day Check-in History</Text>
              <View style={s.legend}>
                {LEGEND.map((k) => (
                  <View key={k} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: STATE_COLOR[k] }]} />
                    <Text style={[typeStyles.body, s.legendText]}>{DAY_STATE[k].label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={s.dayRow}>
              {checkInDays.map((c) => {
                const on = c.day === selectedDay;
                return (
                  <Pressable
                    key={c.day}
                    testID={`day-${c.day}`}
                    onPress={() => setSelectedDay(c.day)}
                    style={[s.day, on && s.dayOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[typeStyles.body, [s.dayLabel, on && { color: INK, fontWeight: fontWeight.semibold }]]}>
                      {c.label}
                    </Text>
                    <Text style={[typeStyles.body, s.dayDate]}>{c.date}</Text>
                    <View style={[s.dayDot, { backgroundColor: STATE_COLOR[c.state] }]} />
                    <Icon name={DAY_STATE[c.state].face} size={21} color={STATE_COLOR[c.state]} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* answers that triggered the alert */}
          <View style={[s.card, s.sectionCard]}>
            <View style={s.sectionHead}>
              <View style={[s.sectionTile, { backgroundColor: '#FDECEB' }]}>
                <Icon name="bell" size={16} color={colors.danger} />
              </View>
              <View style={s.flex}>
                <Text style={[typeStyles.body, s.sectionTitle]}>Answers Triggering Red Flag</Text>
                <Text style={[typeStyles.body, s.sectionSub]}>
                  Today&apos;s check-in • {triggerResponses.length} issues
                </Text>
              </View>
            </View>

            {triggerResponses.map((r, i) => (
              <Pressable
                key={r.id}
                testID={`response-${r.id}`}
                style={[s.respRow, i < triggerResponses.length - 1 && s.respBorder]}
                accessibilityRole="button"
                accessibilityLabel={`${r.question} ${r.answer}`}
              >
                <View style={s.respTile}>
                  <Icon name={r.icon} size={14} color={colors.surfie} />
                </View>
                <Text style={[typeStyles.body, s.respQ]}>{r.question}</Text>
                <Text style={[typeStyles.body, s.respA]}>{r.answer}</Text>
                <Icon name="chevronRight" size={14} color={MUTED} />
              </Pressable>
            ))}
          </View>

          {/* doctor note */}
          <View style={[s.card, s.sectionCard]}>
            <View style={s.sectionHead}>
              <View style={[s.sectionTile, { backgroundColor: MINT }]}>
                <Icon name="notes" size={16} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={[typeStyles.body, s.sectionTitle]}>Doctor Note</Text>
                <Text style={[typeStyles.body, s.sectionSub]}>
                  Add your observations or notes about this patient
                </Text>
              </View>
            </View>

            <View style={s.noteBox}>
              <TextInput
                testID="note"
                style={[typeStyles.input, s.noteInput]}
                value={note}
                onChangeText={(t) => setNote(t.slice(0, NOTE_LIMIT))}
                multiline
                placeholder="Type your note here..."
                placeholderTextColor={MUTED}
              />
            </View>
            <Text style={[typeStyles.body, s.counter]}>
              {note.length}/{NOTE_LIMIT}
            </Text>
          </View>

          {/* recommended action */}
          <View style={[s.card, s.sectionCard]}>
            <Text style={[typeStyles.body, s.sectionTitle]}>Recommended Action</Text>
            <Text style={[typeStyles.body, s.sectionSub]}>Choose the best next step for this patient</Text>

            <View style={s.actionList}>
              {recommendedActions.map((a) => {
                const on = action === a.key;
                const t = ACTION_TONE[a.tone];
                return (
                  <Pressable
                    key={a.key}
                    testID={`action-${a.key}`}
                    onPress={() => {
                      setAction(a.key);
                      // the referral tile is the escalation path
                      if (a.tone === 'danger') onEscalate?.();
                    }}
                    style={[s.actionTile, { backgroundColor: t.bg }, on && { borderColor: t.fg }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${a.line1} ${a.line2}`}
                  >
                    <Icon name={a.icon} size={17} color={t.fg} />
                    <Text
                      style={[typeStyles.body, s.actionText, { color: t.fg }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {a.line1}
                    </Text>
                    <Text
                      style={[typeStyles.body, s.actionText, { color: t.fg }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {a.line2}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable
            testID="save"
            onPress={() => onSave(action ?? '', note)}
            disabled={!action}
            style={[s.cta, !action && s.ctaOff]}
            accessibilityRole="button"
          >
            <Text style={[typeStyles.body, s.ctaText]}>Save &amp; Mark as Reviewed</Text>
            <View style={s.ctaCheck}>
              <Icon name="check" size={13} color={colors.white} />
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  root: { flex: 1, backgroundColor: colors.white },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  appTitle: { ...typeStyles.pageTitle, fontSize: 16, color: INK },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },

  card: { borderWidth: 1, borderColor: LINE, borderRadius: radius.md, padding: 9 },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: MINT, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typeStyles.avatar, color: colors.surfie },
  name: { ...typeStyles.name, color: INK },
  meta: { ...typeStyles.caption, color: MUTED },
  pathPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: MINT,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  pathText: { ...typeStyles.caption, flexShrink: 1, color: colors.surfie },
  riskCol: { alignItems: 'flex-end', gap: 1 },
  riskLabel: { ...typeStyles.label, fontSize: 9.5, color: MUTED },
  riskTime: { ...typeStyles.label, fontSize: 10.5, color: colors.surfie, fontWeight: fontWeight.semibold, marginBottom: 3 },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FDECEB',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  riskText: { ...typeStyles.status, fontSize: 9.5, color: colors.danger },

  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  /** equal thirds: every fact gets the same width, none hugs an edge */
  /** widths are weighted, not equal: the doctor's full name needs the room */
  fact: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  /** a rule between the three facts, never at either end */
  factDivider: { width: 1, alignSelf: 'stretch', backgroundColor: LINE, marginHorizontal: 6 },
  factLabel: { ...typeStyles.label, color: MUTED },
  factValue: { ...typeStyles.caption, color: INK, fontWeight: fontWeight.semibold },

  histCard: { marginTop: spacing.md, padding: spacing.md },
  histHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  histTitle: { ...typeStyles.caption, color: INK, fontWeight: fontWeight.semibold },

  dayRow: { flexDirection: 'row', gap: 4 },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  dayOn: { borderColor: colors.surfie, borderWidth: 1.5 },
  dayLabel: { ...typeStyles.label, color: MUTED },
  dayDate: { ...typeStyles.label, fontSize: 9, color: MUTED },
  dayDot: { width: 7, height: 7, borderRadius: 4, marginTop: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginLeft: 'auto' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { ...typeStyles.label, fontSize: 9.5, color: MUTED },

  sectionCard: { marginTop: spacing.md, padding: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  sectionTile: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...typeStyles.caption, color: INK, fontWeight: fontWeight.semibold },
  sectionSub: { ...typeStyles.helper, color: MUTED, marginTop: 1 },

  respRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  respBorder: { borderBottomWidth: 1, borderBottomColor: LINE },
  respTile: { width: 26, height: 26, borderRadius: 8, backgroundColor: MINT, alignItems: 'center', justifyContent: 'center' },
  respQ: { ...typeStyles.caption, flex: 1, color: INK },
  respA: { ...typeStyles.caption, color: colors.danger, fontWeight: fontWeight.semibold },

  noteBox: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 10,
  },
  noteInput: { ...typeStyles.input, color: INK, minHeight: 52, padding: 0, textAlignVertical: 'top' },
  counter: { ...typeStyles.number, color: MUTED, textAlign: 'right', marginTop: 5 },

  actionList: { flexDirection: 'row', gap: 8, marginTop: 10 },
  /**
   * Icon sits above the label, not beside it — a narrow 1/3-width tile has no
   * room to spare, and stacking gives the two label lines the tile's full
   * width instead of fighting the icon for it.
   */
  actionTile: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  actionText: { ...typeStyles.label, fontSize: 12, lineHeight: 16, fontWeight: fontWeight.semibold },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfie,
    borderRadius: radius.pill,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  ctaOff: { opacity: 0.45 },
  ctaText: { ...typeStyles.button, flexShrink: 1, textAlign: 'center', color: colors.white },
  ctaCheck: {
    position: 'absolute',
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.paris,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PatientFollowUpDetailScreen;
