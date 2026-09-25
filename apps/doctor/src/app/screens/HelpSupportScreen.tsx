import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Linking } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { Screen, EmptyState } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { BottomSheet, SheetActions } from '../../components/BottomSheet';
import { TextField, FieldLabel } from '../../components/form';
import { confirmDiscard } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { raiseIssue } from '../../state/actions';
import {
  faqs,
  supportContact,
  ISSUE_CATEGORIES,
  ISSUE_STATE_LABEL,
  type Faq,
  type IssueState,
  type SupportIcon,
} from '../../data/support';

export const ISSUE_ICON: Record<SupportIcon, IconName> = {
  video: 'video',
  wallet: 'wallet',
  shieldCheck: 'shieldCheck',
  message: 'message',
};

export const ISSUE_TONE: Record<IssueState, { fg: string; bg: string }> = {
  open: { fg: colors.warn, bg: colors.warnSoft },
  inReview: { fg: colors.task.blueFg, bg: colors.task.blueBg },
  resolved: { fg: colors.surfie, bg: colors.successSoft },
};

/** Opens a mail, phone or WhatsApp link, and says so when the device cannot. */
export const openContact = (url: string, what: string) =>
  Linking.openURL(url).catch(() => toast.show(`Could not open ${what} on this device`, 'error'));

/** Accordion list of FAQs — shared by Help & Support and the full FAQ list. */
export const FaqList = ({ items, testIDPrefix = 'faq' }: { items: Faq[]; testIDPrefix?: string }) => {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={s.card}>
      {items.map((f, i) => {
        const on = open === f.id;
        return (
          <View key={f.id} style={[s.faqRow, i < items.length - 1 && s.rule]}>
            <Pressable
              testID={`${testIDPrefix}-${f.id}`}
              onPress={() => setOpen(on ? null : f.id)}
              style={s.faqHead}
              accessibilityRole="button"
              accessibilityState={{ expanded: on }}
            >
              <Text style={s.faqQuestion}>{f.question}</Text>
              <Icon name={on ? 'chevronUp' : 'chevronDown'} size={16} color={colors.inkMuted} />
            </Pressable>
            {on && <Text style={s.faqAnswer}>{f.answer}</Text>}
          </View>
        );
      })}
    </View>
  );
};

/** The Raise an Issue form. Nothing is stored until Submit. */
const RaiseIssueSheet = ({
  visible,
  initialCategory,
  onClose,
  onRaised,
}: {
  visible: boolean;
  initialCategory?: string;
  onClose: () => void;
  onRaised: (id: string) => void;
}) => {
  const [category, setCategory] = useState(initialCategory ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (visible) {
      setCategory(initialCategory ?? '');
      setTitle('');
      setDescription('');
      setShowErrors(false);
    }
  }, [visible, initialCategory]);

  const dirty = !!title.trim() || !!description.trim();
  const errors = {
    category: !category ? 'Choose what the issue is about.' : undefined,
    title: title.trim().length < 5 ? 'Give the issue a short title (at least 5 characters).' : undefined,
    description: description.trim().length < 10 ? 'Describe what happened (at least 10 characters).' : undefined,
  };
  const close = () => (dirty ? confirmDiscard(onClose, 'this issue') : onClose());
  const submit = () => {
    if (errors.category || errors.title || errors.description) {
      setShowErrors(true);
      return;
    }
    const id = raiseIssue(category, title.trim(), description.trim());
    onRaised(id);
  };

  return (
    <BottomSheet
      visible={visible}
      title="Raise an issue"
      subtitle="Our support team replies within 24 hours."
      onClose={close}
      testID="raise-sheet"
      footer={<SheetActions testID="raise" onCancel={close} confirmLabel="Submit" onConfirm={submit} />}
    >
      <FieldLabel required>What is it about?</FieldLabel>
      <View style={[s.catBox, showErrors && !!errors.category && s.catBoxInvalid]}>
        {ISSUE_CATEGORIES.map((c, i) => {
          const on = category === c.key;
          return (
            <Pressable
              key={c.key}
              testID={`category-${c.key}`}
              onPress={() => setCategory(c.key)}
              style={[s.cat, i < ISSUE_CATEGORIES.length - 1 && s.rule, on && s.catOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Icon name={ISSUE_ICON[c.icon]} size={17} color={on ? colors.surfie : colors.inkMuted} />
              <Text style={[s.catText, on && s.catTextOn]}>{c.label}</Text>
              {on && <Icon name="check" size={18} weight={3} color={colors.paris} />}
            </Pressable>
          );
        })}
      </View>
      {showErrors && !!errors.category && <Text style={s.error}>{errors.category}</Text>}
      <View style={s.gap} />
      <TextField
        testID="issue-title"
        label="Title"
        required
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Join button stayed disabled"
        maxLength={80}
        error={showErrors ? errors.title : undefined}
      />
      <TextField
        testID="issue-description"
        label="What happened?"
        required
        multiline
        value={description}
        onChangeText={(t) => setDescription(t.slice(0, 1000))}
        placeholder="Describe the problem. Do not include patient details."
        helper={`${description.length}/1000`}
        error={showErrors ? errors.description : undefined}
      />
    </BottomSheet>
  );
};

/**
 * Help & Support — reached from Profile > Help and support, Account Status and
 * the consultation room's "Report an issue".
 *
 * FAQs are local accordions, not links out: a doctor mid-consultation
 * shouldn't have to leave the app to read an answer.
 */
export const HelpSupportScreen = ({
  onBack,
  onOpenIssue,
  onViewAllFaqs,
  initialRaise = false,
  initialCategory,
}: {
  onBack: () => void;
  onOpenIssue: (id: string) => void;
  onViewAllFaqs: () => void;
  /** Opens straight into the Raise an Issue form. */
  initialRaise?: boolean;
  initialCategory?: string;
}) => {
  const issues = useStore((st) => st.supportIssues);
  const [query, setQuery] = useState('');
  const [raising, setRaising] = useState(initialRaise);

  const q = query.trim().toLowerCase();
  const visibleFaqs = q ? faqs.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(q)) : faqs.slice(0, 4);

  return (
    <Screen testID="help-support" header={<ScreenHeader onBack={onBack} title="Help & Support" subtitle="Find answers or reach our support team." />}>
      <View style={s.search}>
        <Icon name="search" size={16} color={colors.inkMuted} />
        <TextInput
          testID="faq-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search FAQs"
          placeholderTextColor={colors.inkFaint}
          style={s.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search FAQs"
        />
      </View>

      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Frequently Asked Questions</Text>
        <Pressable testID="view-all-faqs" onPress={onViewAllFaqs} hitSlop={8} style={s.link} accessibilityRole="button">
          <Text style={s.linkText}>All FAQs</Text>
          <Icon name="chevronRight" size={14} color={colors.surfie} />
        </Pressable>
      </View>
      {visibleFaqs.length === 0 ? (
        <View style={s.card}>
          <Text style={s.emptyText}>No FAQs match “{query.trim()}”. Raise an issue and our team will help.</Text>
        </View>
      ) : (
        <FaqList items={visibleFaqs} />
      )}

      <Pressable
        testID="raise-issue"
        onPress={() => setRaising(true)}
        style={({ pressed }) => [s.raise, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Raise an issue"
      >
        <View style={s.raiseIcon}>
          <Icon name="headset" size={19} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <Text style={s.raiseTitle}>Raise an Issue</Text>
          <Text style={s.raiseSub}>Can’t find what you need? Submit a request and our team will assist you.</Text>
        </View>
        <View style={s.raiseArrow}>
          <Icon name="arrowRight" size={18} color={colors.white} />
        </View>
      </Pressable>

      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>My Issues</Text>
      </View>
      {issues.length === 0 ? (
        <EmptyState icon="headset" title="No issues raised" body="Issues you raise appear here with their status." />
      ) : (
        <View style={s.card}>
          {issues.map((issue, i) => {
            const tone = ISSUE_TONE[issue.state];
            return (
              <Pressable
                key={issue.id}
                testID={`issue-${issue.id}`}
                onPress={() => onOpenIssue(issue.id)}
                style={({ pressed }) => [s.issueRow, i < issues.length - 1 && s.rule, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${issue.title}, ${ISSUE_STATE_LABEL[issue.state]}`}
              >
                <View style={[s.issueIcon, { backgroundColor: tone.bg }]}>
                  <Icon name={ISSUE_ICON[issue.icon]} size={16} color={tone.fg} />
                </View>
                <View style={s.flex}>
                  <Text style={s.issueTitle} numberOfLines={1}>
                    {issue.title}
                  </Text>
                  <Text style={s.issueMeta}>
                    {issue.ref} · {issue.dateLabel}
                  </Text>
                </View>
                <View style={[s.issuePill, { backgroundColor: tone.bg }]}>
                  <Text style={[s.issuePillText, { color: tone.fg }]}>{ISSUE_STATE_LABEL[issue.state]}</Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.inkFaint} />
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={s.contact}>
        <View style={s.contactHead}>
          <View style={s.raiseIcon}>
            <Icon name="headset" size={19} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.contactTitle}>Still need help?</Text>
            <Text style={s.contactSub}>Contact our support team directly.</Text>
          </View>
        </View>
        <Pressable testID="contact-email" onPress={() => openContact(`mailto:${supportContact.email}`, 'mail')} style={s.contactRow} accessibilityRole="link">
          <Icon name="mail" size={15} color={colors.surfie} />
          <Text style={s.contactRowText}>{supportContact.email}</Text>
        </Pressable>
        <Pressable
          testID="contact-phone"
          onPress={() => openContact(`tel:${supportContact.phone.replace(/\s/g, '')}`, 'the phone app')}
          style={s.contactRow}
          accessibilityRole="link"
        >
          <Icon name="phone" size={15} color={colors.surfie} />
          <Text style={s.contactRowText}>{supportContact.phone}</Text>
        </Pressable>
        <Pressable
          testID="contact-whatsapp"
          onPress={() => openContact(`https://wa.me/${supportContact.whatsapp.replace(/[^\d]/g, '')}`, 'WhatsApp')}
          style={s.contactRow}
          accessibilityRole="link"
        >
          <Icon name="message" size={15} color={colors.surfie} />
          <Text style={s.contactRowText}>WhatsApp: {supportContact.whatsapp}</Text>
        </Pressable>
      </View>

      <RaiseIssueSheet
        visible={raising}
        initialCategory={initialCategory}
        onClose={() => setRaising(false)}
        onRaised={() => {
          setRaising(false);
          toast.show('Issue raised — we’ll reply within 24 hours');
        }}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  gap: { height: spacing.md },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    backgroundColor: colors.white,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  searchInput: { ...typeStyles.inputSingle, flex: 1, height: 44, color: colors.ink },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { ...typeStyles.sectionTitle, color: colors.ink, flex: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 36 },
  linkText: { ...typeStyles.button, color: colors.surfie },

  card: { marginHorizontal: spacing.lg, backgroundColor: colors.white, borderRadius: radius.input, borderWidth: 1, borderColor: colors.surface.line, overflow: 'hidden' },
  emptyText: { ...typeStyles.bodySmall, color: colors.inkMuted, padding: spacing.md },

  faqRow: { paddingHorizontal: spacing.md },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingVertical: spacing.sm },
  faqQuestion: { ...typeStyles.body, flex: 1, color: colors.ink, fontWeight: fontWeight.medium },
  faqAnswer: { ...typeStyles.bodySmall, color: colors.inkMuted, paddingBottom: spacing.md },

  raise: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surface.mint, borderRadius: radius.input },
  raiseIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  raiseTitle: { ...typeStyles.cardTitle, color: colors.ink },
  raiseSub: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  raiseArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfie, alignItems: 'center', justifyContent: 'center' },

  issueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, minHeight: 60 },
  issueIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  issueTitle: { ...typeStyles.cardTitle, color: colors.ink },
  issueMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  issuePill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  issuePillText: { ...typeStyles.caption, fontWeight: fontWeight.semibold },

  contact: { marginHorizontal: spacing.lg, marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.surface.mint, borderRadius: radius.input },
  contactHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  contactTitle: { ...typeStyles.cardTitle, color: colors.ink },
  contactSub: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  contactRowText: { ...typeStyles.bodySmall, color: colors.surfie },

  catBox: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, overflow: 'hidden', marginTop: 6 },
  catBoxInvalid: { borderColor: colors.danger },
  cat: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 50, paddingHorizontal: spacing.md },
  catOn: { backgroundColor: colors.surface.mintSoft },
  catText: { ...typeStyles.body, color: colors.ink, flex: 1 },
  catTextOn: { fontWeight: fontWeight.medium },
  error: { ...typeStyles.helper, color: colors.danger, marginTop: 4 },
});

export default HelpSupportScreen;
