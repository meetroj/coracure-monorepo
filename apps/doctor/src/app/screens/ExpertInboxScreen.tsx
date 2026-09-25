import { typeStyles, fontWeight } from '../../theme/typography';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { C } from '../../components/compact';

/* ─── types & data ─────────────────────────────────────────────────────── */

type Urgency = 'High' | 'Medium' | 'Low';

type InboxCase = {
  id: string;
  caseId: string;
  initials: string;
  age: number;
  gender: 'Male' | 'Female';
  urgency: Urgency;
  timeAgo: string;
  diagnosis: string;
  history: string;
  doubt: string;
  currentPlan: string;
  hasTimer?: boolean;
};

const URGENCY_STYLE: Record<Urgency, { fg: string; bg: string; dot: string }> = {
  High:   { fg: '#D94A45', bg: '#FDECEB', dot: '#D94A45' },
  Medium: { fg: '#C97F1B', bg: '#FDF4E5', dot: '#C97F1B' },
  Low:    { fg: '#0E766C', bg: '#E7F7F0', dot: '#0E766C' },
};

const AVATAR_COLORS = [
  { bg: '#E6F5F0', fg: '#0E766C' },
  { bg: '#EAF1FC', fg: '#3E6DB5' },
  { bg: '#F0EDFB', fg: '#6B5BB5' },
  { bg: '#FDF4E5', fg: '#C97F1B' },
];

const CASES: InboxCase[] = [
  {
    id: 'c1',
    caseId: 'EX-78421',
    initials: 'RS',
    age: 30,
    gender: 'Female',
    urgency: 'High',
    timeAgo: '5m ago',
    diagnosis: 'Generalized Anxiety Disorder with comorbid IBS',
    history: 'Patient presents with 3-week history of persistent anxiety, GI distress, and sleep disturbance. No prior psychiatric history.',
    doubt: 'SSRI vs SNRI selection given active IBS symptoms. Concerned about GI side-effect profile.',
    currentPlan: 'Awaiting expert input before initiating pharmacotherapy.',
  },
  {
    id: 'c2',
    caseId: 'EX-78422',
    initials: 'AP',
    age: 54,
    gender: 'Male',
    urgency: 'Medium',
    timeAgo: '18m ago',
    hasTimer: true,
    diagnosis: 'Chronic Heart Failure with Reduced Ejection Fraction (HFrEF)',
    history: 'Known HFrEF for 2 years. Increased fatigue, ankle swelling, and shortness of breath on mild exertion over the past 1 week. No chest pain. Compliant with medications.',
    doubt: 'Persistent dyspnea despite optimized therapy. Consider device therapy or advanced HF evaluation?',
    currentPlan: 'On guideline-directed medical therapy. Echo and NT-proBNP ordered. Seeking expert input on next steps.',
  },
  {
    id: 'c3',
    caseId: 'EX-78423',
    initials: 'SK',
    age: 41,
    gender: 'Female',
    urgency: 'Low',
    timeAgo: '1h ago',
    diagnosis: 'Type 2 Diabetes Mellitus — suboptimal glycaemic control',
    history: 'T2DM for 6 years on metformin + glipizide. HbA1c 9.1% at last check. No hypoglycaemic episodes reported.',
    doubt: 'Should we add a GLP-1 agonist or switch to insulin given persistent poor control?',
    currentPlan: 'Dietary counselling ongoing. Awaiting specialist guidance on intensification.',
  },
];

type ResponseType = {
  key: string;
  label: string;
  icon: IconName;
};

const RESPONSE_TYPES: ResponseType[] = [
  { key: 'comment',        label: 'Comment',               icon: 'message' },
  { key: 'clinical',       label: 'Clinical\nConsiderations', icon: 'stethoscope' },
  { key: 'clarification',  label: 'Ask\nClarification',    icon: 'alertCircle' },
  { key: 'followup',       label: 'Recommend\nEarly Follow-up', icon: 'calendar' },
  { key: 'inperson',       label: 'Recommend\nIn-Person Review', icon: 'inPerson' },
];

const RESPONSE_MAX = 1500;

/* ─── sub-components ───────────────────────────────────────────────────── */

const UrgencyBadge = ({ urgency }: { urgency: Urgency }) => {
  const t = URGENCY_STYLE[urgency];
  return (
    <View style={[badge.wrap, { backgroundColor: t.bg }]}>
      <Icon name="trendUp" size={11} color={t.fg} />
      <Text style={[typeStyles.body, badge.text, { color: t.fg }]}>{urgency}</Text>
    </View>
  );
};

const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: fontWeight.semibold },
});

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) => (
  <View style={dr.row}>
    <View style={dr.iconWrap}>
      <Icon name={icon} size={16} color={colors.surfie} />
    </View>
    <View style={dr.flex}>
      <Text style={[typeStyles.body, dr.label]}>{label}</Text>
      <Text style={[typeStyles.body, dr.value]}>{value}</Text>
    </View>
  </View>
);

const dr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  flex: { flex: 1 },
  label: { fontSize: 12, fontWeight: fontWeight.semibold, color: C.ink, marginBottom: 2 },
  value: { fontSize: 12, color: C.muted, lineHeight: 18 },
});

/* ─── main screen ──────────────────────────────────────────────────────── */

export const ExpertInboxScreen = ({
  onBack,
  onNotifications,
  onMessages,
  onSubmit,
}: {
  onBack?: () => void;
  onNotifications?: () => void;
  onMessages?: () => void;
  onSubmit?: (caseId: string, type: string, response: string) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [urgencyFilter, setUrgencyFilter] = useState<'All' | Urgency>('All');
  const [expandedId, setExpandedId] = useState<string | null>('c2');
  const [responseType, setResponseType] = useState('comment');
  const [responseText, setResponseText] = useState('');

  const filtered =
    urgencyFilter === 'All'
      ? CASES
      : CASES.filter((c) => c.urgency === urgencyFilter);

  const counts = {
    All: CASES.length,
    High: CASES.filter((c) => c.urgency === 'High').length,
    Medium: CASES.filter((c) => c.urgency === 'Medium').length,
    Low: CASES.filter((c) => c.urgency === 'Low').length,
  };

  const expandedCase = CASES.find((c) => c.id === expandedId);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* ── header ── */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        <LogoWide width={100} height={26} />
        <View style={s.headerRight}>
          <Pressable onPress={onNotifications} hitSlop={8} accessibilityLabel="Notifications">
            <View>
              <Icon name="bell" size={22} color={C.ink} />
              <View style={s.notifDot} />
            </View>
          </Pressable>
          <Pressable onPress={onMessages} hitSlop={8} accessibilityLabel="Messages">
            <Icon name="message" size={22} color={C.ink} />
          </Pressable>
        </View>
      </View>

      {/* ── page title ── */}
      <View style={s.titleWrap}>
        <Text style={[typeStyles.body, s.pageTitle]}>Expert Inbox</Text>
        <Text style={[typeStyles.body, s.pageSub]}>Clarification requests assigned to you</Text>
      </View>

      {/* ── urgency filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {(['All', 'High', 'Medium', 'Low'] as const).map((f) => {
          const on = urgencyFilter === f;
          const dot = f !== 'All' ? URGENCY_STYLE[f].dot : undefined;
          return (
            <Pressable
              key={f}
              testID={`filter-${f}`}
              onPress={() => setUrgencyFilter(f)}
              style={[s.filterChip, on && s.filterChipOn]}
            >
              {dot && <View style={[s.filterDot, { backgroundColor: dot }]} />}
              <Text style={[typeStyles.body, s.filterText, on && s.filterTextOn]}>
                {f} ({counts[f]})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          const urg = URGENCY_STYLE[item.urgency];

          return (
            <View key={item.id} style={[s.card, isExpanded && s.cardExpanded]}>
              {/* ── case row ── */}
              <Pressable
                testID={`case-${item.id}`}
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
                style={s.caseRow}
              >
                <View style={[s.avatar, { backgroundColor: avatarColor.bg }]}>
                  <View style={[s.avatarDot, { backgroundColor: urg.dot }]} />
                  <Text style={[typeStyles.body, s.avatarText, { color: avatarColor.fg }]}>
                    {item.initials}
                  </Text>
                </View>

                <View style={s.flex}>
                  <View style={s.caseTopRow}>
                    <Text style={[typeStyles.body, s.caseId]}>
                      Case ID: {item.caseId}
                      {item.hasTimer && (
                        <Text style={s.timerIcon}> ⏱</Text>
                      )}
                    </Text>
                    <UrgencyBadge urgency={item.urgency} />
                    <Text style={[typeStyles.body, s.timeAgo]}>{item.timeAgo}</Text>
                  </View>
                  <Text style={[typeStyles.body, s.caseDemog]}>
                    {item.age}y • {item.gender}
                  </Text>
                </View>

                <Icon
                  name={isExpanded ? 'chevronDown' : 'chevronRight'}
                  size={16}
                  color={C.muted}
                />
              </Pressable>

              {/* ── expanded detail ── */}
              {isExpanded && (
                <View style={s.expandedBody}>
                  <View style={s.detailDivider} />

                  <DetailRow
                    icon="stethoscope"
                    label="Diagnosis (Provisional)"
                    value={item.diagnosis}
                  />
                  <DetailRow
                    icon="document"
                    label="Brief History"
                    value={item.history}
                  />
                  <DetailRow
                    icon="alertCircle"
                    label="Specific Doubt"
                    value={item.doubt}
                  />
                  <DetailRow
                    icon="notes"
                    label="Current Plan"
                    value={item.currentPlan}
                  />

                  {/* ── response type ── */}
                  <Text style={[typeStyles.body, s.sectionLabel]}>Select response type</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.typeRow}
                  >
                    {RESPONSE_TYPES.map((rt) => {
                      const on = responseType === rt.key;
                      return (
                        <Pressable
                          key={rt.key}
                          testID={`type-${rt.key}`}
                          onPress={() => setResponseType(rt.key)}
                          style={[s.typeChip, on && s.typeChipOn]}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                        >
                          <View style={[s.typeIconWrap, on && s.typeIconWrapOn]}>
                            <Icon name={rt.icon} size={18} color={on ? colors.surfie : C.muted} />
                          </View>
                          <Text
                            style={[typeStyles.body, s.typeLabel, on && s.typeLabelOn]}
                            numberOfLines={2}
                          >
                            {rt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* ── response input ── */}
                  <Text style={[typeStyles.body, s.sectionLabel]}>Your response</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      testID="response-input"
                      style={[typeStyles.body, s.input]}
                      value={responseText}
                      onChangeText={(t) => setResponseText(t.slice(0, RESPONSE_MAX))}
                      placeholder="Type your response here..."
                      placeholderTextColor={C.muted}
                      multiline
                    />
                    <Text style={[typeStyles.body, s.counter]}>
                      {responseText.length}/{RESPONSE_MAX}
                    </Text>
                  </View>

                  {/* ── submit ── */}
                  <Pressable
                    testID="submit-response"
                    onPress={() =>
                      onSubmit?.(item.caseId, responseType, responseText.trim())
                    }
                    style={[
                      s.submitBtn,
                      (!responseText.trim()) && s.submitBtnOff,
                    ]}
                    disabled={!responseText.trim()}
                    accessibilityRole="button"
                  >
                    <Icon name="arrowRight" size={16} color={colors.white} />
                    <Text style={[typeStyles.body, s.submitText]}>Submit Response</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1, minWidth: 0 },

  /* header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  notifDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfie,
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  /* title */
  titleWrap: { paddingHorizontal: 16, marginBottom: 10 },
  pageTitle: { fontSize: 22, fontWeight: fontWeight.bold, color: C.ink, lineHeight: 28 },
  pageSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  /* filter */
  filterRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: colors.white,
  },
  filterChipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { fontSize: 13, color: C.muted },
  filterTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  /* scroll */
  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  /* card */
  card: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  cardExpanded: { borderColor: colors.surfie },

  /* case row */
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  avatarText: { fontSize: 13, fontWeight: fontWeight.bold },
  caseTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  caseId: { fontSize: 13, fontWeight: fontWeight.semibold, color: C.ink },
  timerIcon: { fontSize: 12 },
  timeAgo: { fontSize: 11, color: C.muted },
  caseDemog: { fontSize: 12, color: C.muted, marginTop: 2 },

  /* expanded */
  expandedBody: { paddingHorizontal: 12, paddingBottom: 14 },
  detailDivider: { height: 1, backgroundColor: C.line, marginBottom: 14 },

  /* response type */
  sectionLabel: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    color: C.ink,
    marginBottom: 10,
    marginTop: 4,
  },
  typeRow: { gap: 8, paddingBottom: 4 },
  typeChip: {
    width: 72,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  typeChipOn: { borderColor: colors.surfie, backgroundColor: '#F4FBF8' },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F2F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconWrapOn: { backgroundColor: C.mint },
  typeLabel: { fontSize: 10, color: C.muted, textAlign: 'center', lineHeight: 14 },
  typeLabelOn: { color: C.ink, fontWeight: fontWeight.semibold },

  /* input */
  inputWrap: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    minHeight: 90,
    marginBottom: 12,
  },
  input: { fontSize: 13, color: C.ink, padding: 0, minHeight: 60, textAlignVertical: 'top' },
  counter: { fontSize: 10, color: C.muted, textAlign: 'right', marginTop: 4 },

  /* submit */
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.surfie,
  },
  submitBtnOff: { opacity: 0.45 },
  submitText: { fontSize: 15, fontWeight: fontWeight.semibold, color: colors.white },
});

export default ExpertInboxScreen;
