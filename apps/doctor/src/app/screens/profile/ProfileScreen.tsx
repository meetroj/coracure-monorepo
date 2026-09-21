import { typeStyles } from '../../../../../../libs/typography/src';
import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';

import { colors, spacing, typography } from '../../../theme/brand';
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
import { supportContact } from '../../../data/support';

/**
 * Full profile — only reachable once verification is approved AND the
 * approval has been acknowledged.
 *
 * Administrator-approved professional and verification fields are not freely
 * editable: they route through "Request changes" instead. The full
 * photo/registration/specialties view lives behind "Profile Details" — this
 * screen stays a menu, not a duplicate of that page.
 */
export const ProfileScreen = ({
  onLogout,
  onOpen,
}: {
  onLogout: () => void;
  onOpen: (key: string) => void;
}) => (
  <Screen>
    {/* No settings icon: every setting this screen owns is a row below, and a
        gear in the header would only have duplicated them. */}
    <AppHeader right={<IconButton name="bell" badge label="Notifications" onPress={() => onOpen('notifications')} />} />
    <PageTitle title="Profile" />

    {/* identity */}
    <Card style={{ padding: 12 }}>
      <View style={s.idRow}>
        <Avatar initials={doctor.initials} photo={doctor.photo} size={52} online />
        <View style={s.idCopy}>
          <View style={s.nameRow}>
            <Text style={[typeStyles.body, s.name]}>{doctor.name}</Text>
            <Icon name="checkCircle" size={17} color={colors.paris} filled />
          </View>
          <Text style={[typeStyles.body, s.spec]}>{doctor.speciality}</Text>
          <Text style={[typeStyles.body, s.qual]}>
            {doctor.qualification} · {doctor.yearsExperience} years experience
          </Text>
          <View style={s.availRow}>
            <View style={s.availDot} />
            <Text style={[typeStyles.body, s.availText]}>Available now</Text>
          </View>
        </View>
      </View>
      <Button label="Request changes" variant="secondary" size="sm" onPress={() => onOpen('requestChanges')} style={s.editBtn} />
    </Card>

    {/* the full read-only profile — photo, registration, specialties, about */}
    <Card style={s.listCard}>
      <ListRow compact
        icon="idCard"
        title="Profile Details"
        subtitle="Photo, registration, specialties and more"
        onPress={() => onOpen('profileDetails')}
        last
      />
    </Card>

    {/* consultation settings — exactly one fee and one duration */}
    <Text style={[typeStyles.body, s.section]}>Consultation settings</Text>
    <Card style={s.listCard}>
      <ListRow compact
        icon="tag"
        title="Consultation fee"
        subtitle={inr(doctor.consultationFee)}
        onPress={() => onOpen('fee')}
      />
      <ListRow compact
        icon="clock"
        title="Consultation duration"
        subtitle={`${doctor.consultationMinutes} minutes`}
        onPress={() => onOpen('duration')}
      />
      {/* Availability lives here since Clarifications took its tab slot. It
          sits beside duration because both feed the same slot engine. */}
      <ListRow compact
        icon="calendar"
        title="Availability"
        subtitle="Weekly hours, overrides and leave"
        onPress={() => onOpen('availability')}
        last
      />
    </Card>

    {/* account */}
    <Text style={[typeStyles.body, s.section]}>Account</Text>
    <Card style={s.listCard}>
      <ListRow compact
        icon="wallet"
        title="Earnings and payouts"
        subtitle="View earnings, payout history and tax details"
        onPress={() => onOpen('earnings')}
      />
      <ListRow compact
        icon="wallet"
        title="Bank details"
        subtitle="Linked account for payouts"
        right={<StatusPill label="Verified" tone="success" />}
        onPress={() => onOpen('bank')}
      />
      <ListRow compact
        icon="document"
        title="Verification documents"
        subtitle="Identity, medical licence, certificates"
        right={<StatusPill label="Approved" tone="success" />}
        onPress={() => onOpen('documents')}
      />
      <ListRow compact
        icon="bell"
        title="Notifications"
        subtitle="Manage what you are notified about"
        onPress={() => onOpen('notifications')}
        last
      />
    </Card>

    <Card style={[s.listCard, s.spaced]} tone="mint">
      <ListRow compact icon="headset" title="Help and support" subtitle="24/7 assistance" onPress={() => onOpen('help')} />
      <ListRow compact
        icon="message"
        title="WhatsApp Support"
        subtitle={supportContact.whatsapp}
        onPress={() => Linking.openURL(`https://wa.me/${supportContact.whatsapp.replace(/[^\d]/g, '')}`)}
        last
      />
    </Card>

    <Card style={[s.listCard, s.spaced]}>
      <ListRow compact
        icon="lock"
        title="Privacy and security"
        subtitle="Manage your data and account security"
        onPress={() => onOpen('privacy')}
        last
      />
    </Card>

    <Card style={[s.listCard, s.spaced, s.logoutCard]}>
      <ListRow compact icon="logout" title="Log out" danger onPress={onLogout} last />
    </Card>
  </Screen>
);

const s = StyleSheet.create({
  idRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  idCopy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { ...typeStyles.name, flexShrink: 1, color: colors.ink },
  spec: { ...typeStyles.body, color: colors.inkMuted },
  qual: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 1 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  availDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.paris },
  availText: { ...typeStyles.body, color: colors.surfie },
  editBtn: { marginTop: spacing.md },

  section: { ...typeStyles.sectionTitle, color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  listCard: { paddingVertical: 0, paddingHorizontal: 12 },
  spaced: { marginTop: spacing.md },
  logoutCard: { backgroundColor: colors.dangerSoft, borderColor: '#F7D5D3' },
});

export default ProfileScreen;
