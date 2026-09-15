import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Linking } from 'react-native';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography, shadow } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/ui';
import {
  faqs,
  supportIssues,
  supportContact,
  ISSUE_STATE_LABEL,
  type IssueState,
  type SupportIcon,
} from '../../data/support';

const ISSUE_ICON: Record<SupportIcon, IconName> = {
  video: 'video',
  wallet: 'wallet',
  shieldCheck: 'shieldCheck',
};

const ISSUE_TONE: Record<IssueState, { fg: string; bg: string }> = {
  open: { fg: colors.surfie, bg: colors.successSoft },
  inReview: { fg: '#3E6DB5', bg: colors.task.blueBg },
  resolved: { fg: colors.surfie, bg: colors.successSoft },
};

/**
 * Help & Support — reached from Profile > Help and support.
 *
 * FAQs are local accordions, not links out: a doctor mid-consultation
 * shouldn't have to leave the app to read an answer.
 */
export const HelpSupportScreen = ({
  onBack,
  onRaiseIssue = () => undefined,
  onOpenIssue = () => undefined,
  onViewAllFaqs = () => undefined,
  onViewAllIssues = () => undefined,
}: {
  onBack: () => void;
  onRaiseIssue?: () => void;
  onOpenIssue?: (id: string) => void;
  onViewAllFaqs?: () => void;
  onViewAllIssues?: () => void;
}) => {
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const visibleFaqs = q ? faqs.filter((f) => f.question.toLowerCase().includes(q)) : faqs;

  return (
    <View style={s.root}>
      <Screen contentStyle={s.content}>
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
          <View style={s.barLogo}>
            <LogoWide width={100} height={25} />
          </View>
          <Pressable hitSlop={8} style={s.barBtn} accessibilityRole="button" accessibilityLabel="Notifications">
            <Icon name="bell" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={s.titleWrap}>
          <Text style={[typeStyles.body, s.title]}>Help &amp; Support</Text>
          <Text style={[typeStyles.body, s.subtitle]}>We&rsquo;re here to help. Find answers or reach out to us.</Text>
        </View>

        <View style={s.search}>
          <Icon name="search" size={16} color={colors.inkFaint} />
          <TextInput
            testID="faq-search"
            value={query}
            onChangeText={setQuery}
            placeholder="Search FAQs..."
            placeholderTextColor={colors.inkFaint}
            style={s.searchInput}
          />
        </View>

        {/* -------------------------------- FAQs ------------------------------- */}
        <View style={s.sectionHead}>
          <Text style={[typeStyles.body, s.sectionTitle]}>Frequently Asked Questions</Text>
          <Pressable onPress={onViewAllFaqs} hitSlop={8} style={s.link} accessibilityRole="button">
            <Text style={[typeStyles.body, s.linkText]}>View all FAQs</Text>
            <Icon name="chevronRight" size={14} color={colors.surfie} />
          </Pressable>
        </View>

        <View style={s.card}>
          {visibleFaqs.length === 0 ? (
            <Text style={[typeStyles.body, s.emptyText]}>No FAQs match your search.</Text>
          ) : (
            visibleFaqs.map((f, i) => {
              const open = openFaq === f.id;
              return (
                <View key={f.id} style={[s.faqRow, i < visibleFaqs.length - 1 && s.faqBorder]}>
                  <Pressable
                    testID={`faq-${f.id}`}
                    onPress={() => setOpenFaq(open ? null : f.id)}
                    style={s.faqHead}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                  >
                    <Text style={[typeStyles.body, s.faqQuestion]}>{f.question}</Text>
                    <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} color={colors.inkFaint} />
                  </Pressable>
                  {open && <Text style={[typeStyles.body, s.faqAnswer]}>{f.answer}</Text>}
                </View>
              );
            })
          )}
        </View>

        {/* ---------------------------- raise an issue --------------------------- */}
        <Pressable
          testID="raise-issue"
          onPress={onRaiseIssue}
          style={s.raise}
          accessibilityRole="button"
          accessibilityLabel="Raise an issue"
        >
          <View style={s.raiseIcon}>
            <Icon name="headset" size={19} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={[typeStyles.body, s.raiseTitle]}>Raise an Issue</Text>
            <Text style={[typeStyles.body, s.raiseSub]}>Can&rsquo;t find what you need? Submit a request and our team will assist you.</Text>
          </View>
          <View style={s.raiseArrow}>
            <Icon name="arrowRight" size={18} color={colors.white} />
          </View>
        </Pressable>

        {/* ------------------------------- my issues ------------------------------ */}
        <View style={s.sectionHead}>
          <Text style={[typeStyles.body, s.sectionTitle]}>My Issues</Text>
          <Pressable onPress={onViewAllIssues} hitSlop={8} style={s.link} accessibilityRole="button">
            <Text style={[typeStyles.body, s.linkText]}>View all</Text>
            <Icon name="chevronRight" size={14} color={colors.surfie} />
          </Pressable>
        </View>

        <View style={s.card}>
          {supportIssues.map((issue, i) => {
            const tone = ISSUE_TONE[issue.state];
            return (
              <Pressable
                key={issue.id}
                testID={`issue-${issue.id}`}
                onPress={() => onOpenIssue(issue.id)}
                style={[s.issueRow, i < supportIssues.length - 1 && s.faqBorder]}
                accessibilityRole="button"
              >
                <View style={[s.issueIcon, { backgroundColor: tone.bg }]}>
                  <Icon name={ISSUE_ICON[issue.icon]} size={16} color={tone.fg} />
                </View>
                <View style={s.flex}>
                  <Text style={[typeStyles.body, s.issueTitle]} numberOfLines={1}>{issue.title}</Text>
                  <Text style={[typeStyles.body, s.issueMeta]}>#{issue.ref} · {issue.dateLabel}</Text>
                </View>
                <View style={[s.issuePill, { backgroundColor: tone.bg }]}>
                  <View style={[s.issueDot, { backgroundColor: tone.fg }]} />
                  <Text style={[typeStyles.body, s.issuePillText, { color: tone.fg }]}>
                    {ISSUE_STATE_LABEL[issue.state]}
                  </Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.inkFaint} />
              </Pressable>
            );
          })}
        </View>

        {/* ------------------------------ still need help -------------------------- */}
        <View style={s.contact}>
          <View style={s.contactHead}>
            <View style={s.raiseIcon}>
              <Icon name="headset" size={19} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.contactTitle]}>Still need help?</Text>
              <Text style={[typeStyles.body, s.contactSub]}>Contact our support team directly.</Text>
            </View>
            <Pressable
              testID="contact-us"
              onPress={() => Linking.openURL(`mailto:${supportContact.email}`)}
              style={s.contactBtn}
              accessibilityRole="button"
            >
              <Text style={[typeStyles.body, s.contactBtnText]}>Contact Us</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => Linking.openURL(`mailto:${supportContact.email}`)}
            style={s.contactRow}
            accessibilityRole="link"
          >
            <Icon name="mail" size={14} color={colors.surfie} />
            <Text style={[typeStyles.body, s.contactRowText]}>{supportContact.email}</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(`tel:${supportContact.phone.replace(/\s/g, '')}`)}
            style={s.contactRow}
            accessibilityRole="link"
          >
            <Icon name="phone" size={14} color={colors.surfie} />
            <Text style={[typeStyles.body, s.contactRowText]}>{supportContact.phone}</Text>
          </Pressable>
        </View>
      </Screen>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xl },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  barLogo: { flex: 1, alignItems: 'center' },

  titleWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { ...typeStyles.pageTitle, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 3 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  searchInput: { ...typeStyles.body, flex: 1, color: colors.ink, padding: 0 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typeStyles.sectionTitle, color: colors.ink },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { ...typeStyles.button, color: colors.surfie },

  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  emptyText: { ...typeStyles.body, color: colors.inkMuted, padding: spacing.md },

  faqRow: { paddingHorizontal: spacing.md },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  faqQuestion: { ...typeStyles.body, flex: 1, color: colors.ink },
  faqAnswer: { ...typeStyles.bodySmall, color: colors.inkMuted, paddingBottom: spacing.md },

  raise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface.mint,
    borderRadius: 14,
  },
  raiseIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseTitle: { ...typeStyles.cardTitle, color: colors.ink },
  raiseSub: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  raiseArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },

  issueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  issueIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  issueTitle: { ...typeStyles.cardTitle, color: colors.ink },
  issueMeta: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 1 },
  issuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  issueDot: { width: 6, height: 6, borderRadius: 3 },
  issuePillText: { ...typeStyles.caption, fontWeight: fontWeight.semibold },

  contact: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface.mint,
    borderRadius: 14,
  },
  contactHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contactTitle: { ...typeStyles.cardTitle, color: colors.ink },
  contactSub: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  contactBtn: {
    borderWidth: 1,
    borderColor: colors.surfie,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  contactBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  contactRowText: { ...typeStyles.bodySmall, color: colors.surfie },
});

export default HelpSupportScreen;
