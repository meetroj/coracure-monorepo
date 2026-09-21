import { typeStyles } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { careResources } from '../../data/followup';
import {
  caseDetailFor,
  isClinicallyComplete,
  type PatientCase,
} from '../../data/doctor';

/**
 * Case Detail — the complete consultation record behind one case (DR-11-01).
 *
 * This screen owns none of the clinical content. Each block is a summary of
 * what another module holds — notes, prescription, summary, follow-up,
 * check-ins, clarification — and opens that module. A block the doctor has not
 * written yet says so plainly rather than being hidden, because an unwritten
 * record is exactly what the doctor needs to see.
 */

const STATE_META: Record<PatientCase['state'], { label: string; fg: string; bg: string }> = {
  complete: { label: 'Completed', fg: colors.surfie, bg: colors.successSoft },
  pending: { label: 'Pending', fg: colors.warn, bg: colors.warnSoft },
  followUp: { label: 'Follow-up', fg: colors.warn, bg: colors.warnSoft },
  noShow: { label: 'No-show', fg: colors.inkMuted, bg: '#EFF3F1' },
};

/** One record block. `onPress` is omitted where nothing can be opened yet. */
const RecordRow = ({
  icon,
  title,
  lines,
  chips,
  tag,
  trailing,
  accessory,
  chevron,
  onPress,
  testID,
  style,
}: {
  icon: IconName;
  title: string;
  lines?: (string | null)[];
  /** Rendered on one swipeable line — a long list must not grow the card. */
  chips?: string[];
  /** Only the label carries the tint; the value sits plainly beside it. */
  tag?: { label: string; value: string };
  trailing?: React.ReactNode;
  /** Sits between the copy and the chevron — an avatar, for instance. */
  accessory?: React.ReactNode;
  /** Forces the chevron on a row that has no destination wired yet. */
  chevron?: boolean;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const body = (
    <>
      <View style={s.rowIcon}>
        <Icon name={icon} size={17} color={colors.surfie} />
      </View>
      <View style={s.flex}>
        <View style={s.rowTitleLine}>
          <Text style={[typeStyles.body, s.rowTitle]} numberOfLines={1}>{title}</Text>
          {trailing}
        </View>
        {(lines ?? []).filter(Boolean).map((l) => (
          <Text key={l} style={[typeStyles.body, s.rowLine]} numberOfLines={2}>{l}</Text>
        ))}
        {!!tag && (
          <View style={s.tagRow}>
            <View style={s.chip}>
              <Text style={[typeStyles.body, s.chipText]}>{tag.label}</Text>
            </View>
            <Text style={[typeStyles.body, s.tagValue]} numberOfLines={1}>{tag.value}</Text>
          </View>
        )}
        {!!chips?.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
            style={s.chipScroll}
          >
            {chips.map((c) => (
              <View key={c} style={s.chip}>
                <Text style={[typeStyles.body, s.chipText]} numberOfLines={1}>{c}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      {accessory}
      {(chevron || !!onPress) && <Icon name="chevronRight" size={16} color={colors.inkFaint} />}
    </>
  );

  if (!onPress) return <View style={[s.row, style]}>{body}</View>;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.rowPressed, style]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {body}
    </Pressable>
  );
};

export const CaseDetailScreen = ({
  patientCase,
  onBack,
  onExport = () => undefined,
  onOpenNotes,
  onOpenPrescription,
  onOpenSummary,
  onOpenCheckins,
  onOpenClarification,
  recommended = [],
  onOpenRecommended,
}: {
  patientCase: PatientCase;
  onBack: () => void;
  onExport?: () => void;
  onOpenNotes?: () => void;
  onOpenPrescription?: () => void;
  onOpenSummary?: () => void;
  onOpenCheckins?: () => void;
  onOpenClarification?: () => void;
  /** Care Hub resources recommended for this consultation (DOC-FUP-04). */
  recommended?: string[];
  onOpenRecommended?: () => void;
}) => {
  const c = patientCase;
  const d = caseDetailFor(c);
  const state = STATE_META[c.state];
  const complete = isClinicallyComplete(c);
  /** Measured footer size — a percentage-width rect left a sliver unpainted. */
  const [barSize, setBarSize] = useState({ w: 0, h: 0 });
  const [cardSize, setCardSize] = useState({ w: 0, h: 0 });
  const recommendedTitles = careResources
    .filter((r) => recommended.includes(r.id))
    .map((r) => r.title);

  return (
    <View style={s.root}>
      <Screen contentStyle={s.content} bottomInset>
        {/* ---------------------------------- bar ---------------------------------- */}
        <View style={s.bar}>
          <Pressable
            testID="back"
            onPress={onBack}
            hitSlop={8}
            style={s.barBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={19} color={colors.ink} />
          </Pressable>
          <View style={s.flex}>
            <Text style={[typeStyles.body, s.title]} numberOfLines={1}>{d.ref} Case Detail</Text>
            <Text style={[typeStyles.body, s.subtitle]} numberOfLines={1}>
              Complete consultation record
            </Text>
          </View>
          <Pressable
            testID="export-case"
            onPress={onExport}
            style={({ pressed }) => [s.exportBtn, pressed && s.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Export case record"
          >
            <Icon name="upload" size={14} color={colors.surfie} />
            <Text style={[typeStyles.body, s.exportText]}>Export</Text>
          </Pressable>
        </View>

        {/* -------------------------------- patient -------------------------------- */}
        <View
          style={s.patient}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setCardSize((p) => (p.w === width && p.h === height ? p : { w: width, h: height }));
          }}
        >
          {/* Light mint fading to white, top to bottom. */}
          {cardSize.w > 0 && (
            <Svg style={StyleSheet.absoluteFill} width={cardSize.w} height={cardSize.h}>
              <Defs>
                <LinearGradient id="caseCardGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.surface.selected} />
                  <Stop offset="1" stopColor={colors.white} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={cardSize.w} height={cardSize.h} fill="url(#caseCardGrad)" />
            </Svg>
          )}
          <View style={s.patientTop}>
            <View style={s.avatar}>
              <Text style={[typeStyles.body, s.avatarText]}>{c.initials}</Text>
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.caseRef]} numberOfLines={1}>
                CASE ID  {d.ref} · {c.caseId}
              </Text>
              <Text style={[typeStyles.body, s.name]} numberOfLines={1}>{c.name}</Text>
              <Text style={[typeStyles.body, s.meta]}>{c.gender} · {c.age} years</Text>
            </View>
            <View style={s.patientRight}>
              <View style={[s.statePill, { backgroundColor: state.bg }]}>
                <View style={[s.stateDot, { backgroundColor: state.fg }]} />
                <Text style={[typeStyles.body, s.stateText, { color: state.fg }]}>{state.label}</Text>
              </View>
              <View style={s.paidRow}>
                <Text style={[typeStyles.body, s.paidText]}>{d.paid ? 'Paid' : 'Unpaid'}</Text>
                <Icon
                  name={d.paid ? 'checkCircle' : 'alertCircle'}
                  size={14}
                  color={d.paid ? colors.surfie : colors.warn}
                />
              </View>
            </View>
          </View>

          <View style={s.patientFoot}>
            <View style={s.footItem}>
              <Icon name="calendar" size={14} color={colors.surfie} />
              <Text style={[typeStyles.body, s.footText]} numberOfLines={1}>{c.dateLabel}</Text>
            </View>
            <View style={s.footRule} />
            <View style={s.footItem}>
              <Icon name="video" size={14} color={colors.surfie} />
              <Text style={[typeStyles.body, s.footText]} numberOfLines={1}>{d.mode}</Text>
            </View>
          </View>
        </View>

        {/* -------------------------------- record --------------------------------- */}
        {/* Created and last-updated each get their own line — combined, the
            timestamp wrapped and broke mid-date. */}
        <RecordRow
          icon="shieldCheck"
          title="Audit Trail"
          chevron
          lines={[
            `Created by ${d.audit.createdBy}`,
            d.audit.createdAt,
            `Last updated ${d.audit.updatedAt}`,
          ]}
        />

        <RecordRow
          testID="row-notes"
          icon="stethoscope"
          title="Clinical Notes & Diagnosis"
          lines={[d.notes ? d.notes.excerpt : 'Not yet written.']}
          tag={d.notes ? { label: 'Primary Diagnosis', value: d.notes.primaryDiagnosis } : undefined}
          onPress={onOpenNotes}
        />

        <RecordRow
          testID="row-prescription"
          icon="prescription"
          title={d.prescription ? 'Prescription Issued' : 'Prescription'}
          lines={[
            d.prescription
              ? `${d.prescription.medicines} Medicines · ${d.prescription.supplements} Supplement`
              : 'Not yet finalised.',
          ]}
          chips={d.prescription?.names}
          onPress={onOpenPrescription}
        />

        <RecordRow
          testID="row-summary"
          icon="document"
          title="Case Summary"
          lines={[d.summary ?? 'Not yet submitted.']}
          onPress={onOpenSummary}
        />

        <RecordRow
          testID="row-checkins"
          icon="heart"
          title="Follow-up Plan"
          lines={
            d.checkins
              ? [`${d.checkins.count} Check-ins submitted`, `Latest on ${d.checkins.latest}`]
              : ['No check-ins submitted yet.']
          }
          trailing={
            d.checkins ? (
              <View style={s.okPill}>
                <Text style={[typeStyles.body, s.okPillText]}>{d.checkins.status}</Text>
              </View>
            ) : undefined
          }
          onPress={onOpenCheckins}
        />

        <RecordRow
          testID="row-clarification"
          icon="message"
          title="Clarification Thread"
          lines={
            d.clarification
              ? [`${d.clarification.messages} Messages`, `Latest: ${d.clarification.latest}`]
              : ['No clarification raised.']
          }
          accessory={
            d.clarification ? (
              <View style={s.threadAvatar}>
                <Text style={[typeStyles.body, s.threadAvatarText]}>
                  {d.clarification.withInitials}
                </Text>
              </View>
            ) : undefined
          }
          onPress={onOpenClarification}
        />

        <RecordRow
          testID="row-recommended"
          icon="sparkle"
          title="Recommended Resources"
          lines={[
            recommended.length
              ? `${recommended.length} recommended from the Care Hub`
              : 'Nothing recommended yet.',
          ]}
          chips={recommendedTitles.length ? recommendedTitles : undefined}
          onPress={onOpenRecommended}
        />

        {/* --------------------------------- footer -------------------------------- */}
        {/* Sits at the end of the record, not pinned to the viewport — it is a
            closing statement about the case, not a persistent toolbar. */}
        <View style={s.footerWrap}>
          <View
          style={s.footer}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setBarSize((p) => (p.w === width && p.h === height ? p : { w: width, h: height }));
          }}
        >
          {barSize.w > 0 && (
            <Svg style={StyleSheet.absoluteFill} width={barSize.w} height={barSize.h}>
              <Defs>
                {/* Same light mint-to-white ramp as the patient card, so the
                    two bookend the record with one treatment. */}
                <LinearGradient id="caseFootGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.surface.selected} />
                  <Stop offset="1" stopColor={colors.white} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={barSize.w} height={barSize.h} fill="url(#caseFootGrad)" />
            </Svg>
          )}

          <View style={s.footInner}>
            <Icon name="lock" size={13} color={colors.surfie} />
            <Text style={[typeStyles.body, s.footStrong]} numberOfLines={1}>
              Records encrypted
            </Text>
            <View style={s.footRule} />
            <Text style={[typeStyles.body, s.footFaint]} numberOfLines={1}>
              {complete ? `Closed ${d.closedAt}` : 'Open · work outstanding'}
            </Text>
            <Icon
              name={complete ? 'checkCircle' : 'alertCircle'}
              size={15}
              color={complete ? colors.surfie : colors.warn}
            />
          </View>
          </View>
        </View>
      </Screen>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1, minWidth: 0 },
  content: { paddingBottom: spacing.lg },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  barBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: { ...typeStyles.pageTitle, fontSize: 18, color: colors.ink },
  subtitle: { ...typeStyles.caption, color: colors.inkMuted },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    flexShrink: 0,
  },
  exportText: { ...typeStyles.buttonSmall, color: colors.surfie },

  /* patient header */
  patient: {
    marginHorizontal: spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  patientTop: { flexDirection: 'row', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { ...typeStyles.avatar, fontSize: 19, color: colors.surfie },
  caseRef: { ...typeStyles.label, fontSize: 9.5, color: colors.inkFaint },
  name: { ...typeStyles.name, color: colors.ink, marginTop: 1 },
  meta: { ...typeStyles.bodySmall, color: colors.inkMuted },
  patientRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  stateText: { ...typeStyles.status },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paidText: { ...typeStyles.caption, color: colors.inkMuted },

  patientFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  // `paddingHorizontal` keeps the mode label off the divider it used to touch.
  footItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  footText: { ...typeStyles.bodySmall, color: colors.ink },

  /* record rows */
  row: {
    flexDirection: 'row',
    // Centred so the chevron sits level with the card, not its first line.
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  rowPressed: { opacity: 0.75 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { ...typeStyles.cardTitle, flex: 1, color: colors.ink },
  rowLine: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },

  // One swipeable line — chips never wrap and never grow the card.
  chipScroll: { marginTop: spacing.sm, marginHorizontal: -2 },
  chipRow: { flexDirection: 'row', gap: 5, paddingHorizontal: 2 },
  chip: {
    backgroundColor: colors.surface.selected,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: { ...typeStyles.caption, fontSize: 10, color: colors.surfie },
  // Only the label is tinted; the diagnosis itself reads as plain text.
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  tagValue: { ...typeStyles.caption, fontSize: 10.5, color: colors.ink, flexShrink: 1 },
  threadAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  threadAvatarText: { ...typeStyles.caption, fontSize: 10, color: colors.surfie },
  okPill: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 0,
  },
  okPillText: { ...typeStyles.caption, fontSize: 10, color: colors.surfie },

  /* footer — floating pill, not a welded strip */
  footerWrap: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  footer: {
    height: 44,
    borderRadius: radius.pill,
    overflow: 'hidden',
    // Solid fallback if the gradient layer fails to paint.
    backgroundColor: colors.surface.selected,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  footInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  footRule: { width: 1, height: 16, backgroundColor: colors.surface.line },
  footStrong: { ...typeStyles.caption, fontSize: 10.5, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  footFaint: { ...typeStyles.caption, fontSize: 10.5, color: colors.inkMuted, flex: 1 },
});

export default CaseDetailScreen;
