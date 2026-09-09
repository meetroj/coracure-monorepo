import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/brand';
import { Icon } from '../../../components/Icon';
import { Screen, AppHeader, IconButton, PageTitle, Card, Button, StatusPill, ProgressBar } from '../../../components/ui';
import { pendingItems, rejectedItems, approvedItems, type VerificationItem } from '../../../data/doctor';

/** Supplied banner artwork, cropped from the assets folder. */
const ART = {
  approved: require('../../../assets/status-approved.png'),
  rejected: require('../../../assets/status-rejected.png'),
  review: require('../../../assets/status-review.png'),
};
const ART_RATIO = { approved: 1609 / 684, rejected: 1590 / 588, review: 1611 / 681 };

/* --------------------------- shared status header -------------------------- */

type Phase = 'approved' | 'pending' | 'rejected';

const StatusTabs = ({ phase }: { phase: Phase }) => (
  <View style={s.tabs}>
    {(
      [
        ['approved', 'Approved', 'shieldCheck'],
        ['pending', 'Pending', 'clock'],
        ['rejected', 'Suspended', 'banCircle'],
      ] as const
    ).map(([key, label, icon]) => {
      const on = phase === key;
      const tint = key === 'pending' ? colors.warn : key === 'rejected' ? colors.danger : colors.surfie;
      return (
        <View
          key={key}
          style={[
            s.tab,
            on && {
              backgroundColor:
                key === 'pending' ? colors.warnSoft : key === 'rejected' ? colors.dangerSoft : colors.successSoft,
            },
          ]}
        >
          <Icon name={icon} size={17} color={on ? tint : colors.inkFaint} />
          <Text style={[s.tabText, on && { color: tint, fontWeight: '700' }]}>
            {key === 'rejected' && phase === 'rejected' ? 'Rejected' : label}
          </Text>
        </View>
      );
    })}
  </View>
);

const Banner = ({ kind }: { kind: keyof typeof ART }) => {
  const [w, setW] = useState(0);
  return (
    <View style={s.bannerWrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Image
          source={ART[kind]}
          style={{ width: w, height: w / ART_RATIO[kind], borderRadius: radius.card }}
          resizeMode="cover"
          accessible={false}
        />
      )}
    </View>
  );
};

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
      <View style={s.flex}>
        <Text style={s.itemTitle}>{item.title}</Text>
        <Text style={s.itemBody}>{item.body}</Text>
      </View>
      <StatusPill label={label} tone={tone} icon={item.state === 'verified' ? 'checkCircle' : undefined} />
      <Icon name="chevronRight" size={16} color={colors.inkFaint} />
    </Pressable>
  );
};

const HelpCard = ({ onContact, body }: { onContact: () => void; body: string }) => (
  <Card tone="mint" style={s.helpCard}>
    <View style={s.helpRow}>
      <View style={s.helpIcon}>
        <Icon name="headset" size={20} color={colors.surfie} />
      </View>
      <View style={s.flex}>
        <Text style={s.helpTitle}>Need help?</Text>
        <Text style={s.helpBody}>{body}</Text>
      </View>
    </View>
    <Button label="Contact Admin" icon="chevronRight" onPress={onContact} style={s.helpBtn} />
  </Card>
);

/* -------------------------------- pending --------------------------------- */

export const PendingStatusScreen = ({ onContact }: { onContact: () => void }) => (
  <Screen>
    <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
    <PageTitle title="Account Status" subtitle="Your account is under review" />
    <StatusTabs phase="pending" />

    <Card tone="warn" style={s.heroCard}>
      <Banner kind="review" />
      <View style={s.heroTop}>
        <StatusPill label="Pending verification" tone="warn" />
      </View>
      <Text style={s.heroTitle}>Under Review</Text>
      <Text style={s.heroBody}>
        Your submitted details are being reviewed. We will notify you once verification is complete.
      </Text>

      <View style={s.progressCard}>
        <View style={s.progressHead}>
          <Text style={s.progressLabel}>Verification progress</Text>
          <Text style={s.progressValue}>60% Complete</Text>
        </View>
        <ProgressBar percent={60} />
      </View>
    </Card>

    <View style={s.sectionWrap}>
      <Text style={s.sectionTitle}>Submitted Details</Text>
      <Text style={s.sectionSub}>Here is the status of your submitted information.</Text>
    </View>
    <Card style={s.listCard}>
      {pendingItems.map((it, i) => (
        <ItemRow key={it.key} item={it} last={i === pendingItems.length - 1} />
      ))}
    </Card>

    <HelpCard onContact={onContact} body="Our support team is here to assist you with your verification." />

    <Text style={s.gateNote}>
      Your full profile unlocks once verification is complete.
    </Text>
  </Screen>
);

/* -------------------------------- rejected -------------------------------- */

export const RejectedStatusScreen = ({
  onResubmit,
  onContact,
}: {
  onResubmit: () => void;
  onContact: () => void;
}) => (
  <Screen>
    <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
    <PageTitle title="Account Status" subtitle="Your account needs attention" />
    <StatusTabs phase="rejected" />

    <Card tone="danger" style={s.heroCard}>
      <Banner kind="rejected" />
      <View style={s.heroTop}>
        <StatusPill label="Verification unsuccessful" tone="danger" />
      </View>
      <Text style={s.heroTitle}>Changes Required</Text>
      <Text style={s.heroBody}>
        We could not verify some of your professional details. Review the reasons below and contact the
        administrator after making corrections.
      </Text>

      <Pressable style={s.reviewStatusRow}>
        <View style={s.flex}>
          <Text style={s.reviewStatusLabel}>Review status</Text>
          <Text style={s.reviewStatusValue}>Action required</Text>
        </View>
        <Icon name="chevronRight" size={17} color={colors.danger} />
      </Pressable>
    </Card>

    <View style={s.sectionWrap}>
      <Text style={s.sectionTitle}>Issues to Resolve</Text>
      <Text style={s.sectionSub}>Please address the following to activate your account.</Text>
    </View>
    <Card style={s.listCard}>
      {rejectedItems.map((it, i) => (
        <ItemRow key={it.key} item={it} last={i === rejectedItems.length - 1} />
      ))}
    </Card>

    <View style={s.inlineWarn}>
      <Icon name="alertCircle" size={17} color={colors.danger} />
      <Text style={s.inlineWarnText}>
        Your doctor account remains inactive until these issues are resolved.
      </Text>
    </View>

    <View style={s.ctaWrap}>
      {/* only the rejected items may be updated and resubmitted */}
      <Button testID="resubmit" label="Review and resubmit" icon="arrowRight" onPress={onResubmit} />
      <Button label="Contact Admin" variant="ghost" onPress={onContact} />
    </View>
  </Screen>
);

/* ---------------------------- approved (once) ----------------------------- */

export const ApprovedStatusScreen = ({ onAcknowledge }: { onAcknowledge: () => void }) => (
  <Screen>
    <AppHeader right={<IconButton name="bell" badge label="Notifications" />} />
    <PageTitle title="Account Status" subtitle="Your doctor account is active" />
    <StatusTabs phase="approved" />

    <Card tone="mint" style={s.heroCard}>
      <Banner kind="approved" />
      <View style={s.heroTop}>
        <StatusPill label="Verification complete" tone="success" />
      </View>
      <Text style={s.heroTitle}>Account Approved</Text>
      <Text style={s.heroBody}>
        Your professional details have been verified. You can now use all doctor features.
      </Text>

      <View style={s.progressCard}>
        <View style={s.progressHead}>
          <Text style={s.progressLabel}>Verification progress</Text>
          <Text style={s.progressValue}>100% Complete</Text>
        </View>
        <ProgressBar percent={100} />
      </View>
    </Card>

    <View style={s.sectionWrap}>
      <Text style={s.sectionTitle}>Verified Details</Text>
      <Text style={s.sectionSub}>Your information has been verified and is up to date.</Text>
    </View>
    <Card style={s.listCard}>
      {approvedItems.map((it, i) => (
        <ItemRow key={it.key} item={it} last={i === approvedItems.length - 1} />
      ))}
    </Card>

    <HelpCard onContact={onAcknowledge} body="Our support team is here to assist you with your account." />

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
  tabText: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkFaint },

  bannerWrap: { marginBottom: spacing.md },
  heroCard: { paddingTop: spacing.md },
  heroTop: { flexDirection: 'row' },
  heroTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  heroBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    lineHeight: 21,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { fontFamily: typography.body.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.ink },
  progressValue: { fontFamily: typography.body.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.surfie },

  reviewStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  reviewStatusLabel: { fontFamily: typography.body.family, fontSize: typography.size.sm, fontWeight: '700', color: colors.ink },
  reviewStatusValue: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.danger },

  sectionWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { fontFamily: typography.heading.family, fontSize: typography.size.xl, fontWeight: '700', color: colors.ink },
  sectionSub: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },

  listCard: { paddingVertical: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
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
  itemTitle: { fontFamily: typography.heading.family, fontSize: typography.size.md, fontWeight: '700', color: colors.ink },
  itemBody: { fontFamily: typography.body.family, fontSize: typography.size.xs, color: colors.inkMuted, marginTop: 1 },

  helpCard: { marginTop: spacing.lg },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTitle: { fontFamily: typography.heading.family, fontSize: typography.size.lg, fontWeight: '700', color: colors.ink },
  helpBody: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkMuted },
  helpBtn: { marginTop: spacing.md },

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
  inlineWarnText: { flex: 1, fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.danger },

  ctaWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.sm },
  gateNote: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
});
