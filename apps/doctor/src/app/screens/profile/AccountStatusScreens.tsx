import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../../theme/brand';
import { typeStyles, fontWeight } from '../../../theme/typography';
import { Icon } from '../../../components/Icon';
import { Screen, PageTitle, Card, Button, StatusPill, ProgressBar } from '../../../components/ui';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { confirm } from '../../../components/confirm';
import { TabHeader } from '../../navigation/TabHeader';
import type { VerificationItem } from '../../../data/doctor';
import {
  OTHER_ID,
  maskId,
  totalExperienceYears,
  type RegistrationDraft,
  type StepKey,
} from '../../../data/registration';
import { TODAY } from '../../../data/calendar';
import type { VerificationState } from '../../../state/store';

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

type Status = Exclude<VerificationState, 'notSubmitted'>;

/**
 * What the verification team is looking at, built from what the doctor
 * submitted — so a new doctor sees their own ID type and degrees, not a
 * fixture's.
 */
export const verificationItems = (status: Status, draft: RegistrationDraft): VerificationItem[] => {
  const idp = draft.identity;
  const idName = idp.idType === OTHER_ID ? idp.idTypeName || 'Government ID' : idp.idType || 'Government ID';
  const years = totalExperienceYears(
    draft.experience,
    `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`
  );
  const base: (VerificationItem & { step: StepKey })[] = [
    {
      key: 'basic',
      step: 'basic',
      icon: 'idCard',
      title: 'Basic details & photo',
      body: [draft.basic.fullName, draft.basic.languages.join(', ')].filter(Boolean).join(' · '),
      state: 'underReview',
    },
    {
      key: 'identity',
      step: 'identity',
      icon: 'shieldCheck',
      title: 'Proof of identity',
      body: `${idName} · ${maskId(idp.idNumber.replace(/\s/g, ''))}`,
      state: 'underReview',
    },
    {
      key: 'qualifications',
      step: 'qualifications',
      icon: 'document',
      title: 'Qualifications',
      body: draft.qualifications.map((q) => q.degree).join(', ') || 'None submitted',
      state: 'underReview',
    },
    {
      key: 'experience',
      step: 'experience',
      icon: 'inPerson',
      title: 'Experience',
      body: `${draft.experience.length} ${draft.experience.length === 1 ? 'role' : 'roles'} · ${years} ${years === 1 ? 'year' : 'years'}`,
      state: 'underReview',
    },
  ];
  if (status === 'approved') return base.map((i) => ({ ...i, state: 'verified' as const }));
  if (status === 'pending') return base;
  const issues: Partial<Record<StepKey, { issueLabel: string; body: string }>> = {
    identity: { issueLabel: 'Name mismatch', body: 'The name on your ID must match the name on your registration.' },
    qualifications: { issueLabel: 'Document unclear', body: 'Upload a clear, complete copy of each degree certificate.' },
  };
  return base.map((i) => {
    const issue = issues[i.step];
    return issue ? { ...i, state: 'issue' as const, ...issue } : { ...i, state: 'verified' as const };
  });
};

/* ---------------------------------- parts ---------------------------------- */

/** Native image dimensions stay out of layout; the copy sets the banner height. */
const Banner = ({ kind, children }: { kind: keyof typeof ART; children?: ReactNode }) => (
  <View style={s.bannerWrap}>
    <Image source={ART[kind]} style={s.bannerImg} resizeMode="contain" accessible={false} />
    {!!children && <View style={s.bannerOverlay}>{children}</View>}
  </View>
);

/** Information, not a control: no chevron, no press. */
const ItemRow = ({ item, last }: { item: VerificationItem; last?: boolean }) => {
  const tone = item.state === 'verified' ? 'success' : item.state === 'underReview' ? 'warn' : ('danger' as const);
  const label = item.state === 'verified' ? 'Verified' : item.state === 'underReview' ? 'Under review' : item.issueLabel ?? 'Issue';
  return (
    <View testID={`verification-${item.key}`} style={[s.item, !last && s.itemBorder]} accessible accessibilityLabel={`${item.title}, ${label}. ${item.body}`}>
      <View style={[s.itemIcon, item.state === 'issue' && s.itemIconIssue]}>
        <Icon name={item.icon} size={19} color={item.state === 'issue' ? colors.danger : colors.surfie} />
      </View>
      <View style={s.itemCopy}>
        <Text style={s.itemTitle}>{item.title}</Text>
        <Text style={s.itemBody}>{item.body}</Text>
      </View>
      <StatusPill label={label} tone={tone} icon={item.state === 'verified' ? 'checkCircle' : undefined} dot={item.state !== 'verified'} />
    </View>
  );
};

const HelpCard = ({ onGetSupport }: { onGetSupport: () => void }) => (
  <View style={s.helpCard}>
    <View style={s.helpIcon}>
      <Icon name="headset" size={18} color={colors.surfie} />
    </View>
    <View style={s.flex}>
      <Text style={s.helpTitle}>Need help with verification?</Text>
      <Text style={s.helpBody}>Raise an issue with the verification team.</Text>
    </View>
    <Pressable
      testID="help-get-support"
      onPress={onGetSupport}
      hitSlop={6}
      accessibilityRole="button"
      style={({ pressed }) => [s.helpBtn, pressed && s.helpBtnPressed]}
    >
      <Text style={s.helpBtnText}>Get Support</Text>
      <Icon name="chevronRight" size={14} color={colors.surfie} />
    </Pressable>
  </View>
);

/* --------------------------------- screen ---------------------------------- */

const COPY: Record<Status, { kind: keyof typeof ART; pill: string; tone: 'warn' | 'danger' | 'success'; title: string; body: string; subtitle: string }> = {
  pending: {
    kind: 'review',
    pill: 'Pending verification',
    tone: 'warn',
    title: 'Under Review',
    body: 'The verification team is reviewing your details. You will be notified once the review is complete.',
    subtitle: 'Your account is under review',
  },
  rejected: {
    kind: 'rejected',
    pill: 'Verification unsuccessful',
    tone: 'danger',
    title: 'Changes Required',
    body: 'Some of your details could not be verified. Review the issues below and resubmit.',
    subtitle: 'Your account needs attention',
  },
  approved: {
    kind: 'approved',
    pill: 'Verification complete',
    tone: 'success',
    title: 'Account Approved',
    body: 'Your professional details have been verified. You can now use all doctor features.',
    subtitle: 'Your doctor account is active',
  },
};

/**
 * Account Status — the verification state of the doctor's own account.
 *
 * Shown in place of the profile on the Profile tab until the doctor has seen
 * it and continued with "Go to Dashboard"; afterwards it stays reachable from
 * Profile › Account status (with `onBack`).
 */
export const AccountStatusScreen = ({
  status,
  acknowledged,
  submittedAt,
  items,
  onBack,
  onAcknowledge,
  onGetSupport,
  onResubmit,
  onLogout,
}: {
  status: Status;
  acknowledged: boolean;
  submittedAt?: string;
  items: VerificationItem[];
  /** Present when opened from Profile; absent on the Profile tab itself. */
  onBack?: () => void;
  onAcknowledge: () => void;
  onGetSupport: () => void;
  onResubmit: () => void;
  /** Offered on the Profile tab, where this screen stands in for the profile and its Log out. */
  onLogout?: () => void;
}) => {
  const c = COPY[status];
  /**
   * A bar, not a three-dot tracker: the dots implied the review moves in
   * discrete hops the doctor can watch, which it does not. Submitted is 60%
   * because the work that remains is the admin's, not theirs.
   */
  const percent = status === 'approved' ? 100 : status === 'rejected' ? 40 : 60;
  const issues = items.filter((i) => i.state === 'issue').length;

  const footer =
    status === 'rejected' ? (
      <View style={s.ctaRow}>
        <Button testID="contact-admin" label="Contact Admin" variant="secondary" onPress={onGetSupport} style={s.ctaHalf} />
        <Button testID="resubmit" label="Resubmit" icon="arrowRight" iconRight onPress={onResubmit} style={s.ctaHalf} />
      </View>
    ) : !acknowledged ? (
      <Button testID="acknowledge" label="Go to Dashboard" icon="arrowRight" iconRight onPress={onAcknowledge} />
    ) : undefined;

  return (
    <Screen
      testID={`account-status-${status}`}
      header={onBack ? <ScreenHeader onBack={onBack} title="Account Status" subtitle={c.subtitle} /> : undefined}
      footer={footer}
    >
      {!onBack && (
        <>
          <TabHeader />
          <PageTitle title="Account Status" subtitle={c.subtitle} />
        </>
      )}

      <Card tone={status === 'pending' ? 'warn' : status === 'rejected' ? 'danger' : 'mint'} style={s.heroCard}>
        <Banner kind={c.kind}>
          <StatusPill label={c.pill} tone={c.tone} />
          <Text style={s.bannerTitle}>{c.title}</Text>
          <Text style={s.heroBody}>{c.body}</Text>
        </Banner>
        <View style={s.progressCard}>
          <View style={s.progressHead}>
            <Text style={s.progressLabel}>Verification Progress</Text>
            <Text style={s.progressValue}>{percent}% Complete</Text>
          </View>
          <ProgressBar percent={percent} />
          {!!submittedAt && <Text style={s.progressMeta}>Submitted {submittedAt}</Text>}
        </View>
      </Card>

      <View style={s.sectionWrap}>
        <Text style={s.sectionTitle}>{status === 'rejected' ? 'Issues to Resolve' : status === 'approved' ? 'Verified Details' : 'Submitted Details'}</Text>
        <Text style={s.sectionSub}>
          {status === 'rejected'
            ? `${issues} ${issues === 1 ? 'item needs' : 'items need'} your attention before your account can be activated.`
            : status === 'approved'
              ? 'Your information has been verified and is up to date.'
              : 'The status of each part of your submission.'}
        </Text>
      </View>
      <Card style={s.listCard}>
        {items.map((it, i) => (
          <ItemRow key={it.key} item={it} last={i === items.length - 1} />
        ))}
      </Card>

      {status === 'rejected' && (
        <View style={s.inlineWarn}>
          <Icon name="alertCircle" size={17} color={colors.danger} />
          <Text style={s.inlineWarnText}>Your doctor account stays inactive until these issues are resolved.</Text>
        </View>
      )}

      <HelpCard onGetSupport={onGetSupport} />

      {status === 'pending' && <Text style={s.gateNote}>Your full profile unlocks once verification is complete.</Text>}

      {!!onLogout && (
        <Pressable
          testID="logout"
          onPress={() =>
            confirm({
              title: 'Log out?',
              message: 'You will need a one-time code to sign in again.',
              confirmLabel: 'Log out',
              destructive: true,
              onConfirm: onLogout,
            })
          }
          style={({ pressed }) => [s.logout, pressed && s.helpBtnPressed]}
          accessibilityRole="button"
        >
          <Icon name="logout" size={17} color={colors.danger} />
          <Text style={s.logoutText}>Log out</Text>
        </Pressable>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },

  bannerWrap: { minHeight: 132, justifyContent: 'center' },
  // pinned right rather than centred behind the copy (the art is square)
  bannerImg: { position: 'absolute', top: 0, right: 0, width: '42%', height: '100%' },
  bannerOverlay: { width: '58%', paddingVertical: spacing.xs, alignItems: 'flex-start', gap: spacing.xs },
  bannerTitle: { ...typeStyles.cardTitle, color: colors.ink },
  heroCard: { padding: spacing.md },
  heroBody: { ...typeStyles.caption, color: colors.inkMuted },
  progressCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  progressLabel: { ...typeStyles.label, color: colors.ink },
  progressValue: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  progressMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.sm },

  sectionWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { ...typeStyles.sectionTitle, color: colors.ink },
  sectionSub: { ...typeStyles.bodySmall, color: colors.inkMuted },

  listCard: { paddingVertical: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  itemIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  itemIconIssue: { backgroundColor: colors.dangerSoft },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { ...typeStyles.cardTitle, color: colors.ink },
  itemBody: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },

  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surface.selected,
    padding: spacing.md,
    flexWrap: 'wrap',
  },
  helpIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  helpTitle: { ...typeStyles.label, color: colors.ink, fontWeight: fontWeight.semibold },
  helpBody: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surfie,
    backgroundColor: colors.white,
  },
  helpBtnPressed: { backgroundColor: colors.surface.selected },
  helpBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },

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

  ctaRow: { flexDirection: 'row', gap: spacing.sm },
  ctaHalf: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm },
  gateNote: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.xl },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: { ...typeStyles.button, color: colors.danger },
});

export default AccountStatusScreen;
