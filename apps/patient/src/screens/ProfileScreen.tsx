import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, Avatar, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import PatientTabBar from '../components/PatientTabBar';
import { useAuth } from '../hooks/useAuth';

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();

  const [notifEnabled, setNotifEnabled] = useState(true);

  const fullName = user?.fullName || 'Alex Morgan';
  const mobile = user?.mobileNumber || '+91 98765 43210';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleDataDeletion = () => {
    Alert.alert(
      'Statutory Data Deletion',
      'Under Indian medical records statutory regulations, completed consultation records and signed prescriptions cannot be erased and must be retained for audit. Personal demographics and device identifiers can be anonymized. Would you like to submit a data anonymization request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Request',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Request Registered',
              'Your request (#DEL-2026-881) has been submitted to the CoraCure Data Governance Officer. You will receive an SMS confirmation.'
            ),
        },
      ]
    );
  };

  const handleSignOutConfirm = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from your CoraCure account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.headerBar}>
        <View style={{ width: 38 }} />

        <LogoWide width={110} height={28} />

        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.pageTitle} accessibilityRole="header">Profile & Settings</Text>
        </View>

        {/* User Card */}
        <View style={s.userCard}>
          <View style={s.avatarWrap}>
            <Avatar initials={initials} size={56} />
            <View style={s.onlineDot} />
          </View>
          <View style={s.userInfoCol}>
            <Text style={s.userName}>{fullName}</Text>
            <Text style={s.userPhone}>{mobile}</Text>
            <View style={s.patientBadge}>
              <Text style={s.patientBadgeText}>Active Patient</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Account & Preferences */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Basic Details</Text>
          <View style={s.cardGroup}>
            <Pressable
              style={s.rowItem}
              onPress={() =>
                Alert.alert('Personal Details', `Name: ${fullName}\nPhone: ${mobile}\nGender: ${user?.gender || 'Male'}\nDOB: ${user?.dateOfBirth || '1992-04-14'}`)
              }
              accessibilityRole="button"
              accessibilityLabel="Personal Details"
            >
              <View style={s.rowIconCircle}>
                <Icon name="user" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Personal Details</Text>
                <Text style={s.rowSub}>Name, age, gender and emergency contact</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>

            <View style={s.rowDivider} />

            <Pressable
              style={s.rowItem}
              onPress={() =>
                Alert.alert('Language & Region', 'Preferred Language: English\nRegion: Delhi NCR (India)\nTimezone: IST (UTC+05:30)')
              }
              accessibilityRole="button"
              accessibilityLabel="Language and Region"
            >
              <View style={s.rowIconCircle}>
                <Icon name="globe" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Language & Region</Text>
                <Text style={s.rowSub}>English (India), Regional settings</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>

            <View style={s.rowDivider} />

            <Pressable
              style={s.rowItem}
              onPress={() => setNotifEnabled(!notifEnabled)}
              accessibilityRole="button"
              accessibilityLabel="Notifications setting"
            >
              <View style={s.rowIconCircle}>
                <Icon name="bell" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Notifications</Text>
                <Text style={s.rowSub}>Manage push, SMS and appointment alerts</Text>
              </View>
              <View style={[s.togglePill, notifEnabled && s.togglePillActive]}>
                <Text style={[s.toggleText, notifEnabled && s.toggleTextActive]}>
                  {notifEnabled ? 'Enabled' : 'Muted'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Section 2: Health */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Health</Text>
          <View style={s.cardGroup}>
            <Pressable
              style={s.rowItem}
              onPress={() => navigation.navigate('Reports')}
              accessibilityRole="button"
              accessibilityLabel="Reports and records"
            >
              <View style={s.rowIconCircle}>
                <Icon name="folder" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Reports & Records</Text>
                <Text style={s.rowSub}>Uploaded reports and consultation summaries</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>

            <View style={s.rowDivider} />

            <Pressable
              style={s.rowItem}
              onPress={() => navigation.navigate('CarePlan')}
              accessibilityRole="button"
              accessibilityLabel="Care plan"
            >
              <View style={s.rowIconCircle}>
                <Icon name="heart" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Care Plan</Text>
                <Text style={s.rowSub}>Daily tasks, medicines and follow-ups</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>

            <View style={s.rowDivider} />

            <Pressable
              style={s.rowItem}
              onPress={() => navigation.navigate('Prescription')}
              accessibilityRole="button"
              accessibilityLabel="Prescriptions"
            >
              <View style={s.rowIconCircle}>
                <Icon name="prescription" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Prescriptions</Text>
                <Text style={s.rowSub}>Every prescription written for you</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>

            <View style={s.rowDivider} />

            <Pressable
              style={s.rowItem}
              onPress={() => navigation.navigate('DailyCheckIn')}
              accessibilityRole="button"
              accessibilityLabel="Daily check-in"
            >
              <View style={s.rowIconCircle}>
                <Icon name="checkCircle" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Daily Check-In</Text>
                <Text style={s.rowSub}>Two minutes on how you are doing today</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>
          </View>
        </View>

        {/* Section 3: Privacy & Support */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Privacy & Support</Text>
          <View style={s.cardGroup}>
            <Pressable
              style={s.rowItem}
              onPress={handleDataDeletion}
              accessibilityRole="button"
              accessibilityLabel="Data Deletion Request"
            >
              <View style={s.rowIconCircle}>
                <Icon name="lock" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Data Deletion Request</Text>
                <Text style={s.rowSub}>Request statutory data erasure</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>

            <View style={s.rowDivider} />

            <Pressable
              style={s.rowItem}
              onPress={() => navigation.navigate('HelpSupport')}
              accessibilityRole="button"
              accessibilityLabel="Help and Support"
            >
              <View style={s.rowIconCircle}>
                <Icon name="info" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Help & Support</Text>
                <Text style={s.rowSub}>FAQs, complaints, and contact support</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>

            <View style={s.rowDivider} />

            <Pressable
              style={s.rowItem}
              onPress={() => navigation.navigate('LegalPolicy')}
              accessibilityRole="button"
              accessibilityLabel="Legal and Policy"
            >
              <View style={s.rowIconCircle}>
                <Icon name="document" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Legal & Policy</Text>
                <Text style={s.rowSub}>Terms of Use, Privacy and Refund Policy</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>

            <View style={s.rowDivider} />

            <Pressable
              style={s.rowItem}
              onPress={() => navigation.navigate('HelpSupport')}
              accessibilityRole="button"
              accessibilityLabel="Partner with CoraCure"
            >
              <View style={s.rowIconCircle}>
                <Icon name="stethoscope" size={18} color={colors.surfie} />
              </View>
              <View style={s.rowTextCol}>
                <Text style={s.rowTitle}>Partner with CoraCure</Text>
                <Text style={s.rowSub}>For doctors and clinics looking to join us</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>

            <View style={s.rowDivider} />

            <Pressable
              style={s.rowItem}
              onPress={handleSignOutConfirm}
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
            >
              <View style={[s.rowIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Icon name="trash" size={18} color="#DC2626" />
              </View>
              <View style={s.rowTextCol}>
                <Text style={[s.rowTitle, { color: '#DC2626' }]}>Sign Out</Text>
                <Text style={s.rowSub}>Clear credentials and end session securely</Text>
              </View>
              <Icon name="chevronRight" size={18} color="#DC2626" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="Profile" />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  titleWrap: {
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: colors.white,
  },
  userInfoCol: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  userPhone: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  patientBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF8F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 2,
  },
  patientBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.surfie,
  },
  section: {
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginLeft: 2,
  },
  cardGroup: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 56,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  rowSub: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  togglePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  togglePillActive: {
    backgroundColor: '#EEF8F5',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.inkFaint,
  },
  toggleTextActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
});

export default ProfileScreen;
