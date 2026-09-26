import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing } from '../../../theme/brand';
import { typeStyles } from '../../../theme/typography';
import { Icon } from '../../../components/Icon';
import { Screen, PageTitle, Card, Avatar, Button, StatusPill, ListRow } from '../../../components/ui';
import { photoPreview } from '../../../components/upload';
import { confirm } from '../../../components/confirm';
import { useStore } from '../../../state/store';
import { selectDoctor, selectLiveStatus } from '../../../state/selectors';
import { signOut } from '../../../state/actions';
import { STATUS_LABEL, inr } from '../../../data/doctor';
import { supportContact } from '../../../data/support';
import { TabHeader } from '../../navigation/TabHeader';
import { openContact } from '../HelpSupportScreen';
import type { ProfileDestination } from './ProfileRouter';

const ACCOUNT_PILL = {
  approved: { label: 'Approved', tone: 'success' },
  pending: { label: 'Under review', tone: 'warn' },
  rejected: { label: 'Changes required', tone: 'danger' },
} as const;

const workingDays = (schedule: { enabled: boolean; short: string }[]) => {
  const on = schedule.filter((d) => d.enabled).map((d) => d.short);
  if (on.length === 0) return 'No weekly hours set';
  if (on.join() === 'Mon,Tue,Wed,Thu,Fri') return 'Monday to Friday';
  return on.join(', ');
};

/**
 * The full profile — shown once the doctor has seen their account status and
 * continued, whatever the review status.
 *
 * Administrator-approved professional fields are not freely editable: they
 * route through "Request changes". Every value on this screen comes from the
 * store, so a fee or duration saved elsewhere shows here straight away.
 */
export const ProfileScreen = ({ onOpen }: { onOpen: (key: ProfileDestination) => void }) => {
  const doctor = useStore(selectDoctor);
  const live = useStore(selectLiveStatus);
  const fee = useStore((s) => s.profile.fee);
  const duration = useStore((s) => s.availability.durationMin);
  const schedule = useStore((s) => s.availability.schedule);
  const pendingChanges = useStore((s) => s.profile.changeRequests.length);
  const account = useStore((s) => (s.verification.status === 'notSubmitted' ? 'pending' : s.verification.status));

  const logout = () =>
    confirm({
      title: 'Log out?',
      message: 'You will need a one-time code to sign in again.',
      confirmLabel: 'Log out',
      destructive: true,
      onConfirm: signOut,
    });

  return (
    <Screen testID="profile">
      <TabHeader />
      <PageTitle title="Profile" />

      <Card style={s.idCard}>
        <View style={s.idRow}>
          <Avatar initials={doctor.initials} size={54} tone="brand" photo={photoPreview(doctor.photoFile)} />
          <View style={s.idCopy}>
            <View style={s.nameRow}>
              <Text style={s.name}>{doctor.name}</Text>
              {doctor.registrationVerified && <Icon name="checkCircle" size={17} color={colors.paris} filled />}
            </View>
            <Text style={s.spec}>{doctor.speciality}</Text>
            <Text style={s.qual}>
              {doctor.qualification} · {doctor.yearsExperience} years experience
            </Text>
            <View style={s.availRow}>
              <View style={[s.availDot, live !== 'available' && s.availDotOff]} />
              <Text testID="profile-live-status" style={[s.availText, live !== 'available' && s.availTextOff]}>
                {STATUS_LABEL[live]}
              </Text>
            </View>
          </View>
        </View>
        <Button
          testID="request-changes"
          label={pendingChanges ? `Request changes · ${pendingChanges} pending` : 'Request changes'}
          variant="secondary"
          size="sm"
          onPress={() => onOpen('requestChanges')}
          style={s.editBtn}
        />
      </Card>

      <Card style={s.listCard}>
        <ListRow compact testID="row-profile-details" icon="idCard" title="Profile Details" subtitle="Registration, qualifications and about" onPress={() => onOpen('profileDetails')} />
        <ListRow
          compact
          testID="row-account-status"
          icon="shieldCheck"
          title="Account status"
          subtitle="Verification and submitted documents"
          right={<StatusPill label={ACCOUNT_PILL[account].label} tone={ACCOUNT_PILL[account].tone} />}
          onPress={() => onOpen('accountStatus')}
          last
        />
      </Card>

      <Text style={s.section}>Consultation settings</Text>
      <Card style={s.listCard}>
        <ListRow compact testID="row-fee" icon="tag" title="Consultation fee" subtitle={inr(fee)} onPress={() => onOpen('fee')} />
        <ListRow compact testID="row-duration" icon="clock" title="Consultation duration" subtitle={`${duration} minutes`} onPress={() => onOpen('duration')} />
        <ListRow compact testID="row-availability" icon="calendar" title="Availability" subtitle={workingDays(schedule)} onPress={() => onOpen('availability')} last />
      </Card>

      <Text style={s.section}>Account</Text>
      <Card style={s.listCard}>
        <ListRow compact testID="row-earnings" icon="wallet" title="Earnings and payouts" subtitle="Earnings, payout status and history" onPress={() => onOpen('earnings')} />
        <ListRow compact testID="row-reviews" icon="star" title="Reviews & feedback" subtitle="What patients said after consultations" onPress={() => onOpen('reviews')} />
        <ListRow
          compact
          testID="row-bank"
          icon="wallet"
          title="Bank details"
          subtitle="Linked account for payouts"
          right={<StatusPill label={doctor.bankVerified ? 'Verified' : 'Pending'} tone={doctor.bankVerified ? 'success' : 'warn'} />}
          onPress={() => onOpen('bank')}
        />
        <ListRow compact testID="row-notifications" icon="bell" title="Notifications" subtitle="Alerts, requests and updates" onPress={() => onOpen('notifications')} last />
      </Card>

      <Card style={[s.listCard, s.spaced]} tone="mint">
        <ListRow compact testID="row-help" icon="headset" title="Help and support" subtitle="FAQs and your support issues" onPress={() => onOpen('help')} />
        <ListRow
          compact
          testID="row-whatsapp"
          icon="message"
          title="WhatsApp support"
          subtitle={supportContact.whatsapp}
          onPress={() => openContact(`https://wa.me/${supportContact.whatsapp.replace(/[^\d]/g, '')}`, 'WhatsApp')}
          last
        />
      </Card>

      <Card style={[s.listCard, s.spaced]}>
        <ListRow compact testID="row-privacy" icon="lock" title="Privacy and security" subtitle="Sign-in and visibility" onPress={() => onOpen('privacy')} last />
      </Card>

      <Card style={[s.listCard, s.spaced, s.logoutCard]}>
        <ListRow compact testID="logout" icon="logout" title="Log out" danger onPress={logout} last />
      </Card>
    </Screen>
  );
};

const s = StyleSheet.create({
  idCard: { padding: spacing.md },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  idCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { ...typeStyles.name, flexShrink: 1, color: colors.ink },
  spec: { ...typeStyles.bodySmall, color: colors.inkMuted },
  qual: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  availDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.paris },
  availDotOff: { backgroundColor: colors.inkFaint },
  availText: { ...typeStyles.status, color: colors.surfie },
  availTextOff: { color: colors.inkMuted },
  editBtn: { marginTop: spacing.md },

  section: { ...typeStyles.sectionTitle, color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  listCard: { paddingVertical: 0, paddingHorizontal: spacing.md, marginTop: spacing.md },
  spaced: { marginTop: spacing.md },
  logoutCard: { backgroundColor: colors.dangerSoft, borderColor: '#F7D5D3', marginBottom: spacing.sm },
});

export default ProfileScreen;
