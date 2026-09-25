import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Note } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ISSUE_CATEGORIES, ISSUE_STATE_LABEL, supportContact, type SupportIssue } from '../../data/support';
import { ISSUE_ICON, ISSUE_TONE, openContact } from './HelpSupportScreen';

/** One support issue: what was reported and every reply, oldest first. */
export const SupportIssueScreen = ({ issue, onBack }: { issue: SupportIssue; onBack: () => void }) => {
  const tone = ISSUE_TONE[issue.state];
  const category = ISSUE_CATEGORIES.find((c) => c.key === issue.category)?.label ?? 'Something else';

  return (
    <Screen testID="support-issue" header={<ScreenHeader onBack={onBack} inline title={issue.ref} subtitle={category} />}>
      <View style={s.card}>
        <View style={s.head}>
          <View style={[s.icon, { backgroundColor: tone.bg }]}>
            <Icon name={ISSUE_ICON[issue.icon]} size={18} color={tone.fg} />
          </View>
          <View style={s.flex}>
            <Text style={s.title}>{issue.title}</Text>
            <Text style={s.meta}>Raised {issue.dateLabel}</Text>
          </View>
          <View testID="issue-state" style={[s.pill, { backgroundColor: tone.bg }]}>
            <Text style={[s.pillText, { color: tone.fg }]}>{ISSUE_STATE_LABEL[issue.state]}</Text>
          </View>
        </View>
        <Text style={s.label}>What you reported</Text>
        <Text style={s.body}>{issue.description}</Text>
      </View>

      <Text style={s.section}>Updates</Text>
      <View style={s.timeline}>
        {issue.updates.map((u, i) => (
          <View key={`${u.at}-${i}`} style={s.update}>
            <View style={s.rail}>
              <View style={[s.dot, i === issue.updates.length - 1 && s.dotLatest]} />
              {i < issue.updates.length - 1 && <View style={s.line} />}
            </View>
            <View style={s.flex}>
              <Text style={s.updateAt}>{u.at} · CoraCure Support</Text>
              <Text style={s.updateBody}>{u.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Note icon="mail">
        Replies also arrive by email. To add details, write to {supportContact.email} and quote {issue.ref}.
      </Note>
      <Text
        testID="email-support"
        style={s.link}
        onPress={() => openContact(`mailto:${supportContact.email}?subject=${encodeURIComponent(issue.ref)}`, 'mail')}
        accessibilityRole="link"
      >
        Email support about {issue.ref}
      </Text>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { ...typeStyles.cardTitle, color: colors.ink },
  meta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  pillText: { ...typeStyles.caption, fontWeight: fontWeight.semibold },
  label: { ...typeStyles.label, color: colors.inkMuted, marginTop: spacing.lg },
  body: { ...typeStyles.body, color: colors.ink, marginTop: 4 },

  section: { ...typeStyles.sectionTitle, color: colors.ink, marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  timeline: { marginHorizontal: spacing.lg },
  update: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surface.inputBorder, marginTop: 5 },
  dotLatest: { backgroundColor: colors.surfie },
  line: { flex: 1, width: 2, backgroundColor: colors.surface.line, marginVertical: 2 },
  updateAt: { ...typeStyles.caption, color: colors.inkMuted },
  updateBody: { ...typeStyles.body, color: colors.ink, marginTop: 2, marginBottom: spacing.lg },

  link: { ...typeStyles.button, color: colors.surfie, marginHorizontal: spacing.lg, marginTop: spacing.md, paddingVertical: spacing.sm },
});

export default SupportIssueScreen;
