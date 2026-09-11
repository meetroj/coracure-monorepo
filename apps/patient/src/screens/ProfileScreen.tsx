import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, typography, radius } from '@coracure/brand';
import { Screen, Avatar, StatusPill, Card, ListRow, Button, Divider } from '@coracure/ui';
import { useAuth } from '../hooks/useAuth';

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return '';
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age} years`;
  };

  const ageLabel = user?.dateOfBirth ? calculateAge(user.dateOfBirth) : '';

  return (
    <Screen>
      <View style={s.header}>
        <Avatar initials={initials} size={64} />
        <Text style={s.name}>{user?.fullName || 'Patient Name'}</Text>
        <Text style={s.phone}>{user?.mobileNumber || '+91 98765-43210'}</Text>
        <View style={s.pillWrap}>
          <StatusPill label={user?.status === 'active' ? 'Active Patient' : (user?.status || 'Active')} tone={user?.status === 'active' ? 'success' : 'neutral'} />
        </View>
      </View>

      <Card style={s.infoCard}>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Name</Text>
          <Text style={s.infoValue}>{user?.fullName || '-'}</Text>
        </View>
        <Divider />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Date of Birth</Text>
          <Text style={s.infoValue}>{user?.dateOfBirth || '-'} {ageLabel ? `(${ageLabel})` : ''}</Text>
        </View>
        <Divider />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Gender</Text>
          <Text style={s.infoValue}>{user?.gender ? (user.gender.charAt(0).toUpperCase() + user.gender.slice(1)) : '-'}</Text>
        </View>
        <Divider />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Language</Text>
          <Text style={s.infoValue}>{user?.preferredLanguage === 'hi' ? 'Hindi' : 'English'}</Text>
        </View>
        <Divider />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Region</Text>
          <Text style={s.infoValue}>{user?.regionId || 'Default'}</Text>
        </View>
      </Card>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Settings & Preferences</Text>
        <View style={s.listWrap}>
          <ListRow icon="user" title="Edit Profile" onPress={() => {}} />
          <ListRow icon="bell" title="Notifications" onPress={() => {}} />
          <ListRow icon="lock" title="Privacy Policy" onPress={() => {}} />
          <ListRow icon="document" title="Terms of Service" onPress={() => {}} />
          <ListRow icon="download" title="Data Export" onPress={() => {}} />
          <ListRow icon="trash" title="Delete Account" danger last onPress={() => {}} />
        </View>
      </View>

      <View style={s.footer}>
        <Button
          label="Sign Out"
          onPress={signOut}
          variant="danger"
          icon="logout"
        />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  name: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.md,
  },
  phone: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: 4,
  },
  pillWrap: {
    marginTop: spacing.sm,
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  infoValue: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.ink,
  },
  section: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  listWrap: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    marginTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
});

export default ProfileScreen;
