import React, { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles, fontWeight } from '../theme/typography';
import { useStore } from '../state/store';
import { selectDoctor } from '../state/selectors';
import { useSelfProfile } from '../data/profile';
import { nowMinutes } from '../data/calendar';
import { Icon, type IconName } from './Icon';
import { Avatar, Card, Screen, Button } from './ui';
import { photoPreview } from './upload';
import { TabHeader } from '../app/navigation/TabHeader';

/**
 * What a doctor sees while the server has not verified the account.
 *
 * The backend refuses every clinical call with `DOCTOR_NOT_APPROVED` until an
 * administrator verifies the doctor, so the clinical tabs do not mount (and so
 * do not fetch) for them. Two surfaces instead:
 *
 *   - the Dashboard tab keeps its place as the home screen, showing where the
 *     review stands and what they can do meanwhile;
 *   - every other clinical tab shows a short "under review" panel.
 *
 * It judges by the server's status once that is known; until then it renders
 * the screen, so a profile that fails to load never locks a verified doctor out.
 */

type Variant = 'dashboard' | 'tab';

type Phase = {
  icon: IconName;
  tone: 'warn' | 'danger' | 'mint';
  title: string;
  body: string;
  /** 0 registration · 1 review · 2 verified; null hides the tracker. */
  step: 0 | 1 | 2 | null;
  failed?: boolean;
  cta: string;
};

const PHASE: Record<string, Phase> = {
  pending: {
    icon: 'document',
    tone: 'warn',
    title: 'Finish your registration',
    body: 'Submit your credentials so the Coracure team can verify you. Appointments, cases and clarifications open once you are verified.',
    step: 0,
    cta: 'Open Account Status',
  },
  under_review: {
    icon: 'clock',
    tone: 'warn',
    title: 'Your account is under review',
    body: 'The Coracure team is checking your credentials. This usually takes a short while, and this page opens up by itself the moment you are verified.',
    step: 1,
    cta: 'View review status',
  },
  rejected: {
    icon: 'alertTriangle',
    tone: 'danger',
    title: 'Changes needed',
    body: 'Something in your submission needs fixing before you can be verified. Open Account Status to see what, and resubmit.',
    step: 1,
    failed: true,
    cta: 'See what to fix',
  },
  suspended: {
    icon: 'banCircle',
    tone: 'danger',
    title: 'Your account is suspended',
    body: 'You cannot take consultations while the suspension lasts. Contact the Coracure team to find out why and what happens next.',
    step: null,
    cta: 'Contact support',
  },
};

const STEPS = ['Registration', 'Review', 'Verified'];

const toneBg = { warn: colors.warnSoft, danger: colors.dangerSoft, mint: colors.successSoft };
const toneFg = { warn: colors.warn, danger: colors.danger, mint: colors.surfie };

/** Registration → review → verified, with the current stop marked. */
const Tracker = ({ step, failed }: { step: number; failed?: boolean }) => (
  <View
    testID="review-tracker"
    style={s.tracker}
    accessible
    accessibilityLabel={`Step ${step + 1} of 3: ${STEPS[step]}${failed ? ', needs changes' : ''}`}
  >
    {STEPS.map((label, i) => {
      const done = i < step;
      const current = i === step;
      return (
        <React.Fragment key={label}>
          {i > 0 && <View style={[s.trackLine, i <= step && s.trackLineOn]} />}
          <View style={s.trackStop}>
            <View
              style={[
                s.dot,
                done && s.dotDone,
                current && (failed ? s.dotFailed : s.dotCurrent),
              ]}
            >
              {done ? (
                <Icon name="check" size={13} weight={3} color={colors.white} />
              ) : current && failed ? (
                <Icon name="close" size={13} weight={3} color={colors.white} />
              ) : (
                <Text style={[s.dotNum, current && s.dotNumOn]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[s.stopLabel, (done || current) && s.stopLabelOn]}>{label}</Text>
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

const StatusCard = ({ phase }: { phase: Phase }) => (
  <Card testID="review-status-card" style={s.statusCard}>
    <View style={[s.badge, { backgroundColor: toneBg[phase.tone] }]}>
      <Icon name={phase.icon} size={26} color={toneFg[phase.tone]} />
    </View>
    <Text style={s.title}>{phase.title}</Text>
    <Text style={s.body}>{phase.body}</Text>
    {phase.step !== null && <Tracker step={phase.step} failed={phase.failed} />}
  </Card>
);

type Nav = { navigate: (name: string, params?: object) => void };

const greeting = () => {
  const now = nowMinutes();
  return now < 12 * 60 ? 'Good morning,' : now < 17 * 60 ? 'Good afternoon,' : 'Good evening,';
};

const Shortcut = ({
  icon,
  title,
  sub,
  onPress,
  testID,
}: {
  icon: IconName;
  title: string;
  sub: string;
  onPress: () => void;
  testID: string;
}) => (
  <Card testID={testID} onPress={onPress} style={s.shortcut}>
    <View style={s.shortcutIcon}>
      <Icon name={icon} size={18} color={colors.surfie} />
    </View>
    <View style={s.flex}>
      <Text style={s.shortcutTitle}>{title}</Text>
      <Text style={s.shortcutSub}>{sub}</Text>
    </View>
    <Icon name="arrowRight" size={16} color={colors.inkFaint} />
  </Card>
);

/** The Dashboard tab for a doctor who is not verified yet. */
const WaitingDashboard = ({ phase, status }: { phase: Phase; status: string }) => {
  const doctor = useStore(selectDoctor);
  const navigation = useNavigation<Nav>();
  const toStatus = () => navigation.navigate('Tabs', { screen: 'ProfileTab' });
  return (
    <Screen testID="verified-gate" header={<TabHeader />}>
      <View style={s.hello}>
        <Avatar initials={doctor.initials} size={52} tone="brand" photo={photoPreview(doctor.photoFile)} />
        <View style={s.flex}>
          <Text style={s.greeting}>{greeting()}</Text>
          <Text style={s.name} numberOfLines={1}>
            {doctor.name}
          </Text>
        </View>
      </View>

      <StatusCard phase={phase} />

      <Button
        testID="gate-account-status"
        label={phase.cta}
        icon="arrowRight"
        iconRight
        onPress={status === 'suspended' ? () => navigation.navigate('HelpSupport') : toStatus}
        style={s.cta}
      />

      <Text style={s.section}>While you wait</Text>
      <View style={s.shortcuts}>
        <Shortcut
          testID="shortcut-profile"
          icon="idCard"
          title="Your profile"
          sub="Check your details, bio and languages"
          onPress={() => navigation.navigate('ProfileDetails')}
        />
        <Shortcut
          testID="shortcut-status"
          icon="shieldCheck"
          title="Account status"
          sub="See each document and what is left"
          onPress={toStatus}
        />
        <Shortcut
          testID="shortcut-help"
          icon="headset"
          title="Help & support"
          sub="Questions about your review"
          onPress={() => navigation.navigate('HelpSupport')}
        />
      </View>
    </Screen>
  );
};

/** Appointments, Cases and Clarifications for a doctor who is not verified yet. */
const WaitingTab = ({ phase, status }: { phase: Phase; status: string }) => {
  const navigation = useNavigation<Nav>();
  return (
    <Screen testID="verified-gate" header={<TabHeader />}>
      <View style={s.tabWrap}>
        <StatusCard phase={phase} />
        <Text style={s.hint}>This section opens once your account is verified.</Text>
        <Button
          testID="gate-account-status"
          label={phase.cta}
          variant="secondary"
          onPress={() =>
            status === 'suspended' ? navigation.navigate('HelpSupport') : navigation.navigate('Tabs', { screen: 'ProfileTab' })
          }
          style={s.cta}
        />
      </View>
    </Screen>
  );
};

export const VerifiedGate = ({ children, variant = 'tab' }: { children: ReactNode; variant?: Variant }) => {
  const status = useStore((s) => s.selfProfile?.verificationStatus);
  const profile = useSelfProfile();
  const focused = useIsFocused();
  const waiting = !!status && status !== 'verified';

  // The profile is read once per sign-in, so an approval that lands while the
  // app is open would never be seen. While waiting, ask again on every focus
  // and every 10s; the moment the server says verified the tabs open by
  // themselves.
  const { refresh } = profile;
  useEffect(() => {
    if (!waiting || !focused) return;
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [waiting, focused, refresh]);

  if (!waiting || !status) return <>{children}</>;
  const phase = PHASE[status] ?? PHASE.under_review;
  return variant === 'dashboard' ? <WaitingDashboard phase={phase} status={status} /> : <WaitingTab phase={phase} status={status} />;
};

/** Wraps a screen component so it only mounts, and only fetches, for a verified doctor. */
export const gated =
  <P extends object>(Component: React.ComponentType<P>, variant: Variant = 'tab'): React.FC<P> =>
  (props) => (
    <VerifiedGate variant={variant}>
      <Component {...props} />
    </VerifiedGate>
  );

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hello: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  greeting: { ...typeStyles.caption, color: colors.inkMuted },
  name: { ...typeStyles.name, fontSize: 20, color: colors.ink },

  tabWrap: { paddingTop: spacing.md },
  statusCard: { marginHorizontal: spacing.lg, alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  badge: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  title: { ...typeStyles.sectionTitle, color: colors.ink, textAlign: 'center', marginTop: spacing.xs },
  body: { ...typeStyles.bodySmall, color: colors.inkMuted, textAlign: 'center' },
  hint: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg },
  cta: { marginHorizontal: spacing.lg, marginTop: spacing.md },

  tracker: { flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'stretch', marginTop: spacing.md },
  trackStop: { alignItems: 'center', width: 78, gap: 6 },
  trackLine: { flex: 1, height: 2, backgroundColor: colors.surface.line, marginTop: 13 },
  trackLineOn: { backgroundColor: colors.surfie },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.surface.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  dotCurrent: { borderColor: colors.surfie, backgroundColor: colors.successSoft },
  dotFailed: { borderColor: colors.danger, backgroundColor: colors.danger },
  dotNum: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.inkFaint },
  dotNumOn: { color: colors.surfie },
  stopLabel: { ...typeStyles.caption, color: colors.inkFaint, textAlign: 'center' },
  stopLabelOn: { color: colors.ink, fontWeight: fontWeight.semibold },

  section: { ...typeStyles.sectionTitle, color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  shortcuts: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  shortcutIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  shortcutTitle: { ...typeStyles.body, fontWeight: fontWeight.medium, color: colors.ink },
  shortcutSub: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
});
