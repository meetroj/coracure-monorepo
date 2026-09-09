import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/brand';
import { Icon } from '../../../components/Icon';
import {
  Screen,
  AppHeader,
  IconButton,
  PageTitle,
  Card,
  Avatar,
  Button,
  StatusPill,
  ListRow,
} from '../../../components/ui';
import { doctor, inr } from '../../../data/doctor';

/**
 * Full profile — only reachable once verification is approved AND the
 * approval has been acknowledged.
 *
 * Administrator-approved professional and verification fields are not freely
 * editable: they route through "Request changes" instead.
 */
export const ProfileScreen = ({
  onLogout,
  onOpen,
}: {
  onLogout: () => void;
  onOpen: (key: string) => void;
}) => (
  <Screen>
    <AppHeader
      right={
        <>
          <IconButton name="bell" badge label="Notifications" />
          <IconButton name="settings" label="Settings" onPress={() => onOpen('settings')} />
        </>
      }
    />
    <PageTitle title="Profile" />

    {/* identity */}
    <Card>
      <View style={s.idRow}>
        <Avatar initials={doctor.initials} size={68} online />
        <View style={s.idCopy}>
          <View style={s.nameRow}>
            <Text style={s.name}>{doctor.name}</Text>
            <Icon name="checkCircle" size={17} color={colors.paris} filled />
          </View>
          <Text style={s.spec}>{doctor.speciality}</Text>
          <Text style={s.qual}>
            {doctor.qualification} · {doctor.yearsExperience} years experience
          </Text>
          <View style={s.availRow}>
            <View style={s.availDot} />
            <Text style={s.availText}>Available now</Text>
          </View>
        </View>
      </View>
      <Button label="Request changes" variant="secondary" size="sm" onPress={() => onOpen('requestChanges')} style={s.editBtn} />
    </Card>

    {/* professional details — admin-approved, review required to change */}
    <Text style={s.section}>Professional details</Text>
    <Card style={s.listCard}>
      <ListRow
        icon="idCard"
        title="Medical registration"
        subtitle={doctor.registrationNo}
        right={<StatusPill label="Verified" tone="success" icon="checkCircle" />}
        onPress={() => onOpen('registration')}
      />
      <ListRow
        icon="stethoscope"
        title="Specialisations"
        subtitle={doctor.specialisations.join(', ')}
        onPress={() => onOpen('specialisations')}
      />
      <ListRow
        icon="language"
        title="Languages"
        subtitle={doctor.languages.join(', ')}
        onPress={() => onOpen('languages')}
        last
      />
    </Card>

    {/* consultation settings — exactly one fee and one duration */}
    <Text style={s.section}>Consultation settings</Text>
    <Card style={s.listCard}>
      <ListRow
        icon="tag"
        title="Consultation fee"
        subtitle={inr(doctor.consultationFee)}
        onPress={() => onOpen('fee')}
      />
      <ListRow
        icon="clock"
        title="Consultation duration"
        subtitle={`${doctor.consultationMinutes} minutes`}
        onPress={() => onOpen('duration')}
        last
      />
    </Card>

    {/* account */}
    <Text style={s.section}>Account</Text>
    <Card style={s.listCard}>
      <ListRow
        icon="wallet"
        title="Earnings and payouts"
        subtitle="View earnings, payout history and tax details"
        onPress={() => onOpen('earnings')}
      />
      <ListRow
        icon="wallet"
        title="Bank details"
        subtitle="Linked account for payouts"
        right={<StatusPill label="Verified" tone="success" />}
        onPress={() => onOpen('bank')}
      />
      <ListRow
        icon="document"
        title="Verification documents"
        subtitle="Identity, medical licence, certificates"
        right={<StatusPill label="Approved" tone="success" />}
        onPress={() => onOpen('documents')}
      />
      <ListRow
        icon="bell"
        title="Notifications"
        subtitle="Manage what you are notified about"
        onPress={() => onOpen('notifications')}
        last
      />
    </Card>

    <Card style={[s.listCard, s.spaced]} tone="mint">
      <ListRow icon="headset" title="Help and support" subtitle="24/7 assistance" onPress={() => onOpen('help')} last />
    </Card>

    <Card style={[s.listCard, s.spaced]}>
      <ListRow
        icon="lock"
        title="Privacy and security"
        subtitle="Manage your data and account security"
        onPress={() => onOpen('privacy')}
        last
      />
    </Card>

    <Card style={[s.listCard, s.spaced, s.logoutCard]}>
      <ListRow icon="logout" title="Log out" danger onPress={onLogout} last />
    </Card>

    <Text style={s.footNote}>
      Professional and verification details approved by an administrator cannot be edited directly.
    </Text>
  </Screen>
);

const s = StyleSheet.create({
  idRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  idCopy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: typography.heading.family, fontSize: typography.size.xl, fontWeight: '700', color: colors.ink },
  spec: { fontFamily: typography.body.family, fontSize: typography.size.md, color: colors.inkMuted },
  qual: { fontFamily: typography.body.family, fontSize: typography.size.sm, color: colors.inkFaint, marginTop: 1 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  availDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.paris },
  availText: { fontFamily: typography.body.family, fontSize: typography.size.sm, fontWeight: '600', color: colors.surfie },
  editBtn: { marginTop: spacing.md },

  section: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  listCard: { paddingVertical: 0 },
  spaced: { marginTop: spacing.md },
  logoutCard: { backgroundColor: colors.dangerSoft, borderColor: '#F7D5D3' },
  footNote: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
});

export default ProfileScreen;
