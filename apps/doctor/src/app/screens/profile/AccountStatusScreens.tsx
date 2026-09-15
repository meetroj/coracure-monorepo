import { typeStyles, fontWeight } from '../../../../../../libs/typography/src';
import React, { useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Modal, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../../../theme/brand';
import { Icon } from '../../../components/Icon';
import { Screen, AppHeader, IconButton, PageTitle, Card, Button, StatusPill, ProgressBar } from '../../../components/ui';
import { pendingItems, rejectedItems, approvedItems, type VerificationItem } from '../../../data/doctor';

/**
 * Supplied banner artwork. b1/b2/b3 are the 3D clipboard set:
 * b1 — green with a tick (approved), b2 — magnifier + clock (under review),
 * b3 — red with a warning triangle (rejected).
 */
const ART = {
  approved: require('../../../assets/b1.png'),
  review: require('../../../assets/b2.png'),
  rejected: require('../../../assets/b3.png'),
};

/* --------------------------- shared status header -------------------------- */

type Phase = 'approved' | 'pending' | 'rejected';

const StatusTabs = ({ phase, onSelect }: { phase: Phase; onSelect?: (p: Phase) => void }) => (
  <View style={s.tabs}>
    {(
      [
        ['approved', 'Approved', 'shieldCheck'],
        ['pending', 'Pending', 'clock'],
        ['rejected', 'Rejected', 'banCircle'],
      ] as const
    ).map(([key, label, icon]) => {
      const on = phase === key;
      const tint = key === 'pending' ? colors.warn : key === 'rejected' ? colors.danger : colors.surfie;
      return (
        <Pressable
          key={key}
          testID={`status-tab-${key}`}
          onPress={() => onSelect?.(key)}
          disabled={!onSelect}
          accessibilityRole="button"
          accessibilityState={{ selected: on }}
          style={[
            s.tab,
            on && {
              backgroundColor:
                key === 'pending' ? colors.warnSoft : key === 'rejected' ? colors.dangerSoft : colors.successSoft,
            },
          ]}
        >
          <Icon name={icon} size={17} color={on ? tint : colors.inkFaint} />
          {/* Label is fixed per tab — it must not change when selected. */}
          <Text style={[typeStyles.body, [s.tabText, on && { color: tint, fontWeight: fontWeight.semibold }]]}>
            {label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/** Keep native image dimensions out of layout; copy determines banner height. */
const Banner = ({ kind, children }: { kind: keyof typeof ART; children?: ReactNode }) => (
  <View style={s.bannerWrap}>
    <Image
      source={ART[kind]}
      style={s.bannerImg}
      resizeMode="contain"
      accessible={false}
    />
    {!!children && <View style={s.bannerOverlay}>{children}</View>}
  </View>
);

const ItemRow = ({ item, last }: { item: VerificationItem; last?: boolean }) => {
  const tone =
    item.state === 'verified' ? 'success' : item.state === 'underReview' ? 'warn' : ('danger' as const);
  const label =
    item.state === 'verified' ? 'Verified' : item.state === 'underReview' ? 'Under review' : item.issueLabel ?? 'Issue';
  return (
    <Pressable style={[s.item, !last && s.itemBorder]}>
      <View style={[s.itemIcon, item.state === 'issue' && s.itemIconIssue]}>
        <Icon name={item.icon} size={19} color={item.state === 'issue' ? colors.danger : colors.surfie} />
      </View>
      {/* Title on top, description beneath. No line cap — the copy wraps so it
          is always readable in full, even if that makes rows uneven. */}
      <View style={s.itemCopy}>
        <Text style={[typeStyles.body, s.itemTitle]}>{item.title}</Text>
        <Text style={[typeStyles.body, s.itemBody]}>{item.body}</Text>
      </View>
      <StatusPill label={label} tone={tone} icon={item.state === 'verified' ? 'checkCircle' : undefined} />
      <Icon name="chevronRight" size={16} color={colors.inkFaint} />
    </Pressable>
  );
};

/* ------------------------------- help card -------------------------------- */

/**
 * Support topics. Deliberately routed through the support workflow rather than
 * naming an individual administrator — no personal contact details are exposed.
 */
const SUPPORT_TOPICS = [
  { key: 'verification', label: 'Verification issue', icon: 'shieldCheck' },
  { key: 'documents', label: 'Document upload issue', icon: 'document' },
  { key: 'access', label: 'Account access issue', icon: 'lock' },
  { key: 'other', label: 'Other', icon: 'message' },
] as const;

/** Outlined, compact CTA. `hitSlop` lifts the 38px control past a 44px target. */
const GetSupportButton = ({ onPress, block }: { onPress: () => void; block?: boolean }) => (
  <Pressable
    testID="help-get-support"
    onPress={onPress}
    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
    accessibilityRole="button"
    accessibilityLabel="Get support"
    style={({ pressed }) => [s.helpBtn, block && s.helpBtnBlock, pressed && s.helpBtnPressed]}
  >
    <Text style={[typeStyles.body, s.helpBtnText]}>Get Support</Text>
    <Icon name="chevronRight" size={14} color={colors.surfie} />
  </Pressable>
);

const HelpCard = ({ onContact }: { onContact: () => void }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Below 360 the button drops under the copy rather than squeezing it.
  const stacked = width < 360;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);

  return (
    <>
      <View style={s.helpCard}>
        <View style={s.helpRow}>
          <View style={s.helpIcon}>
            <Icon name="headset" size={18} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={[typeStyles.body, s.helpTitle]}>Need help with verification?</Text>
            <Text style={[typeStyles.body, s.helpBody]} numberOfLines={2}>
              Get assistance with documents or account review.
            </Text>
          </View>
          {!stacked && <GetSupportButton onPress={() => setSheetOpen(true)} />}
        </View>
        {stacked && (
          <View style={s.helpStackedWrap}>
            <GetSupportButton onPress={() => setSheetOpen(true)} block />
          </View>
        )}
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setSheetOpen(false)}>
          {/* Swallow taps so pressing the sheet itself does not dismiss it. */}
          <Pressable
            style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
            onPress={() => {}}
          >
            <View style={s.sheetHandle} />
            <Text style={[typeStyles.body, s.sheetTitle]}>How can we help?</Text>
            <Text style={[typeStyles.body, s.sheetSub]}>
              Choose a topic so we can route your request to the right team.
            </Text>

            {SUPPORT_TOPICS.map((t) => {
              const on = topic === t.key;
              return (
                <Pressable
                  key={t.key}
                  testID={`support-topic-${t.key}`}
                  onPress={() => setTopic(t.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[s.topicRow, on && s.topicRowOn]}
                >
                  <View style={[s.topicIcon, on && s.topicIconOn]}>
                    <Icon name={t.icon} size={16} color={colors.surfie} />
                  </View>
                  <Text style={[typeStyles.body, s.topicLabel]}>{t.label}</Text>
                  <View style={[s.radio, on && s.radioOn]}>
                    {on && <Icon name="check" size={11} color={colors.white} />}
                  </View>
                </Pressable>
              );
            })}

            <Button
              testID="support-submit"
              label="Contact Support"
              onPress={() => { setSheetOpen(false); onContact(); }}
              disabled={!topic}
              style={s.sheetCta}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

/* -------------------------------- pending --------------------------------- */

export const PendingStatusScreen = ({
  onContact,
  onSelectPhase,
}: {
  onContact: () => void;
  onSelectPhase?: (p: Phase) => void;
}) => (
  <Screen>
    <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
    <PageTitle title="Account Status" subtitle="Your account is under review" />
    <StatusTabs phase="pending" onSelect={onSelectPhase} />

    <Card tone="warn" style={s.heroCard}>
      <Banner kind="review">
        <StatusPill label="Pending verification" tone="warn" />
        <Text style={[typeStyles.body, s.bannerTitle]}>Under Review</Text>
        <Text style={[typeStyles.body, s.heroBody]}>
          Your submitted details are being reviewed. We will notify you once verification is complete.
        </Text>
      </Banner>

      <View style={s.progressCard}>
        <View style={s.progressHead}>
          <Text style={[typeStyles.body, s.progressLabel]}>Verification progress</Text>
          <Text style={[typeStyles.body, s.progressValue]}>60% Complete</Text>
        </View>
        <ProgressBar percent={60} />
      </View>
    </Card>

    <View style={s.sectionWrap}>
      <Text style={[typeStyles.body, s.sectionTitle]}>Submitted Details</Text>
      <Text style={[typeStyles.body, s.sectionSub]}>Here is the status of your submitted information.</Text>
    </View>
    <Card style={s.listCard}>
      {pendingItems.map((it, i) => (
        <ItemRow key={it.key} item={it} last={i === pendingItems.length - 1} />
      ))}
    </Card>

    <HelpCard onContact={onContact} />

    <Text style={[typeStyles.body, s.gateNote]}>
      Your full profile unlocks once verification is complete.
    </Text>
  </Screen>
);

/* -------------------------------- rejected -------------------------------- */

export const RejectedStatusScreen = ({
  onResubmit,
  onContact,
  onSelectPhase,
}: {
  onResubmit: () => void;
  onContact: () => void;
  onSelectPhase?: (p: Phase) => void;
}) => (
  <Screen>
    <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
    <PageTitle title="Account Status" subtitle="Your account needs attention" />
    <StatusTabs phase="rejected" onSelect={onSelectPhase} />

    <Card tone="danger" style={s.heroCard}>
      <Banner kind="rejected">
        <StatusPill label="Verification unsuccessful" tone="danger" />
        <Text style={[typeStyles.body, s.bannerTitle]}>Changes Required</Text>
        {/* Kept to two short sentences, matching the pending and approved
            heroes — the detail lives in "Issues to Resolve" below. */}
        <Text style={[typeStyles.body, s.heroBody]}>
          Some of your details could not be verified. Review the issues below and resubmit.
        </Text>
      </Banner>

      <Pressable style={s.reviewStatusRow}>
        {/* Label and value share one line. */}
        <View style={s.reviewStatusCopy}>
          <Text style={[typeStyles.body, s.reviewStatusLabel]} numberOfLines={1}>Review status</Text>
          <Text style={[typeStyles.body, s.reviewStatusValue]} numberOfLines={1}>Action required</Text>
        </View>
        <Icon name="chevronRight" size={17} color={colors.danger} />
      </Pressable>
    </Card>

    <View style={s.sectionWrap}>
      <Text style={[typeStyles.body, s.sectionTitle]}>Issues to Resolve</Text>
      <Text style={[typeStyles.body, s.sectionSub]}>Please address the following to activate your account.</Text>
    </View>
    <Card style={s.listCard}>
      {rejectedItems.map((it, i) => (
        <ItemRow key={it.key} item={it} last={i === rejectedItems.length - 1} />
      ))}
    </Card>

    <View style={s.inlineWarn}>
      <Icon name="alertCircle" size={17} color={colors.danger} />
      <Text style={[typeStyles.body, s.inlineWarnText]}>
        Your doctor account remains inactive until these issues are resolved.
      </Text>
    </View>

    <View style={[s.ctaWrap, s.ctaRow]}>
      {/* only the rejected items may be updated and resubmitted */}
      <Button testID="resubmit" label="Resubmit" icon="arrowRight" iconRight onPress={onResubmit} style={s.ctaHalf} />
      <Button label="Contact Admin" onPress={onContact} style={s.ctaHalf} />
    </View>
  </Screen>
);

/* ---------------------------- approved (once) ----------------------------- */

export const ApprovedStatusScreen = ({
  onAcknowledge,
  onSelectPhase,
}: {
  onAcknowledge: () => void;
  onSelectPhase?: (p: Phase) => void;
}) => (
  <Screen>
    <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
    <PageTitle title="Account Status" subtitle="Your doctor account is active" />
    <StatusTabs phase="approved" onSelect={onSelectPhase} />

    <Card tone="mint" style={s.heroCard}>
      <Banner kind="approved">
        <StatusPill label="Verification complete" tone="success" />
        <Text style={[typeStyles.body, s.bannerTitle]}>Account Approved</Text>
        <Text style={[typeStyles.body, s.heroBody]}>
          Your professional details have been verified. You can now use all doctor features.
        </Text>
      </Banner>

      <View style={s.progressCard}>
        <View style={s.progressHead}>
          <Text style={[typeStyles.body, s.progressLabel]}>Verification progress</Text>
          <Text style={[typeStyles.body, s.progressValue]}>100% Complete</Text>
        </View>
        <ProgressBar percent={100} />
      </View>
    </Card>

    <View style={s.sectionWrap}>
      <Text style={[typeStyles.body, s.sectionTitle]}>Verified Details</Text>
      <Text style={[typeStyles.body, s.sectionSub]}>Your information has been verified and is up to date.</Text>
    </View>
    <Card style={s.listCard}>
      {approvedItems.map((it, i) => (
        <ItemRow key={it.key} item={it} last={i === approvedItems.length - 1} />
      ))}
    </Card>

    <HelpCard onContact={onAcknowledge} />

    <View style={s.ctaWrap}>
      <Button testID="acknowledge" label="Go to Dashboard" icon="arrowRight" onPress={onAcknowledge} />
    </View>
  </Screen>
);

const s = StyleSheet.create({
  flex: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    padding: 4,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  tabText: { ...typeStyles.body, color: colors.inkFaint },

  bannerWrap: { minHeight: 132, justifyContent: 'center' },
  /**
   * Pinned to the right, not stretched across the card. b1/b2/b3 are square
   * canvases, so a full-width box plus `contain` parked them dead centre,
   * behind the copy. A right-hand box roughly as wide as the banner is tall
   * lets `contain` fill it, which puts the art flush right.
   */
  bannerImg: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '42%',
    height: '100%',
  },
  bannerOverlay: {
    width: '56%',
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  bannerTitle: { ...typeStyles.cardTitle, color: colors.ink },
  /**
   * Colour comes from the Card `tone` per phase — mint for approved, amber for
   * pending, red for rejected — so the whole card carries the status.
   */
  heroCard: { padding: spacing.md },
  heroBody: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.xs },
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { ...typeStyles.label, color: colors.ink },
  progressValue: { ...typeStyles.body, color: colors.surfie },

  reviewStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  // Label pinned left, value pushed to the right of the same line.
  reviewStatusCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  reviewStatusLabel: { ...typeStyles.label, color: colors.ink, flexShrink: 0 },
  reviewStatusValue: { ...typeStyles.body, color: colors.danger },

  sectionWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { ...typeStyles.sectionTitle, color: colors.ink },
  sectionSub: { ...typeStyles.bodySmall, color: colors.inkMuted },

  listCard: { paddingVertical: 0 },
  // Tighter gaps than the default 12 — every pixel saved here is width the
  // title and description get before they have to wrap.
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconIssue: { backgroundColor: colors.dangerSoft },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { ...typeStyles.cardTitle, color: colors.ink },
  itemBody: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },

  /* ------------------------------ help card ------------------------------ */
  helpCard: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.selected,
    padding: 14,
    shadowColor: colors.surfie,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // Light chip on the mint card — white reads cleaner than mint-on-mint.
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  helpTitle: {
    fontFamily: typography.heading.family,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  helpBody: {
    fontFamily: typography.body.family,
    fontSize: 11,
    lineHeight: 14,
    color: colors.inkMuted,
    marginTop: 4,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 38,
    paddingHorizontal: spacing.md,
    // Capsule, unlike the squircle buttons elsewhere — requested for this CTA.
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surfie,
    backgroundColor: colors.white,
    flexShrink: 0,
  },
  helpBtnBlock: { alignSelf: 'flex-start' },
  helpBtnPressed: { backgroundColor: colors.surface.selected },
  helpBtnText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: fontWeight.semibold,
    color: colors.surfie,
  },
  helpStackedWrap: { marginTop: spacing.md },

  /* ----------------------------- support sheet ---------------------------- */
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.surface.line, alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg, fontWeight: fontWeight.semibold, color: colors.ink,
  },
  sheetSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs, color: colors.inkMuted,
    marginTop: 2, marginBottom: spacing.md,
  },
  topicRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 10, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.surface.line,
    marginBottom: spacing.sm,
  },
  topicRowOn: { borderColor: colors.paris, backgroundColor: colors.surface.mintSoft },
  topicIcon: {
    width: 30, height: 30, borderRadius: radius.sm,
    backgroundColor: colors.surface.selected,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  topicIconOn: { backgroundColor: colors.white },
  topicLabel: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm, fontWeight: fontWeight.semibold, color: colors.ink,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.surface.inputBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  sheetCta: { marginTop: spacing.sm },

  inlineWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  inlineWarnText: { ...typeStyles.helper, flex: 1, color: colors.danger },

  ctaWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.sm },
  ctaRow: { flexDirection: 'row' },
  // Equal halves, each free to shrink so neither label gets clipped.
  ctaHalf: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm },
  gateNote: { ...typeStyles.caption, color: colors.inkFaint, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.xl },
});
