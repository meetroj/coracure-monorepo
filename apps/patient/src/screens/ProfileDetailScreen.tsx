import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '@coracure/brand';
import { Icon, PillButton, type IconName } from '@coracure/ui';
import FlowHeader from '../components/FlowHeader';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/RootNavigator';

/**
 * Every row on Profile & Settings that used to open an Alert now opens a real
 * page. The four are the same shape — a title, then cards of rows — so they
 * share one screen and differ only in the section they are asked for.
 */
export type ProfileSection = 'personal' | 'language' | 'notifications' | 'dataDeletion';

const LANGUAGES = ['English', 'हिन्दी (Hindi)', 'मराठी (Marathi)', 'বাংলা (Bengali)', 'தமிழ் (Tamil)', 'తెలుగు (Telugu)'];

const NOTIFICATION_CHANNELS = [
  { key: 'push', icon: 'bell' as IconName, title: 'Push notifications', sub: 'On this device' },
  { key: 'sms', icon: 'message' as IconName, title: 'SMS', sub: 'To your registered mobile number' },
  { key: 'email', icon: 'send' as IconName, title: 'Email', sub: 'Receipts and summaries' },
];

const NOTIFICATION_TOPICS = [
  { key: 'appointments', icon: 'calendar' as IconName, title: 'Appointment reminders', sub: '24 hours and 30 minutes before' },
  { key: 'carePlan', icon: 'checkCircle' as IconName, title: 'Care plan tasks', sub: 'Daily tasks and medicine reminders' },
  { key: 'prescriptions', icon: 'prescription' as IconName, title: 'Prescription ready', sub: 'When a doctor signs a prescription' },
  { key: 'offers', icon: 'tag' as IconName, title: 'Offers and updates', sub: 'Occasional news from CoraCure' },
];

/* --------------------------------- pieces -------------------------------- */

/** A titled card whose children are rows; the hairlines between them are ours. */
const Group = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <View style={s.section}>
    {!!title && <Text style={s.sectionTitle}>{title}</Text>}
    <View style={s.cardGroup}>
      {React.Children.toArray(children).map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={s.rowDivider} />}
          {row}
        </React.Fragment>
      ))}
    </View>
  </View>
);

const ValueRow = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
  <View style={s.rowItem}>
    <View style={s.rowIconCircle}>
      <Icon name={icon} size={18} color={colors.surfie} />
    </View>
    <View style={s.rowTextCol}>
      <Text style={s.rowSub}>{label}</Text>
      <Text style={s.rowTitle}>{value}</Text>
    </View>
  </View>
);

const ToggleRow = ({
  icon,
  title,
  sub,
  on,
  onToggle,
}: {
  icon: IconName;
  title: string;
  sub: string;
  on: boolean;
  onToggle: () => void;
}) => (
  <Pressable style={s.rowItem} onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: on }}>
    <View style={s.rowIconCircle}>
      <Icon name={icon} size={18} color={colors.surfie} />
    </View>
    <View style={s.rowTextCol}>
      <Text style={s.rowTitle}>{title}</Text>
      <Text style={s.rowSub}>{sub}</Text>
    </View>
    <View style={[s.togglePill, on && s.togglePillOn]}>
      <Text style={[s.toggleText, on && s.toggleTextOn]}>{on ? 'On' : 'Off'}</Text>
    </View>
  </Pressable>
);

const PickRow = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <Pressable style={s.rowItem} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
    <View style={s.rowTextCol}>
      <Text style={[s.rowTitle, selected && s.rowTitleOn]}>{label}</Text>
    </View>
    {selected && <Icon name="check" size={18} color={colors.surfie} />}
  </Pressable>
);

const Note = ({ icon, children }: { icon: IconName; children: React.ReactNode }) => (
  <View style={s.note}>
    <Icon name={icon} size={17} color={colors.surfie} />
    <Text style={s.noteText}>{children}</Text>
  </View>
);

/* --------------------------------- screen -------------------------------- */

type Nav = any;
type R = RouteProp<RootStackParamList, 'ProfileDetail'>;

export const ProfileDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const section: ProfileSection = route.params?.section ?? 'personal';
  const { user } = useAuth();

  const [language, setLanguage] = useState(user?.preferredLanguage ?? 'English');
  const [channels, setChannels] = useState<Record<string, boolean>>({ push: true, sms: true, email: false });
  const [topics, setTopics] = useState<Record<string, boolean>>({
    appointments: true,
    carePlan: true,
    prescriptions: true,
    offers: false,
  });

  const requestDeletion = () =>
    Alert.alert(
      'Submit anonymization request?',
      'Completed consultation records and signed prescriptions must be retained for audit under Indian medical records regulations. Your demographics and device identifiers will be anonymized.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Request',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Request registered',
              'Request #DEL-2026-881 has been sent to the CoraCure Data Governance Officer. You will receive an SMS confirmation.'
            ),
        },
      ]
    );

  const page = {
    personal: { title: 'Personal Details', lede: 'The details your doctor sees before a consultation.' },
    language: { title: 'Language & Region', lede: 'How the app speaks to you and how times are shown.' },
    notifications: { title: 'Notifications', lede: 'Choose how and when CoraCure reaches you.' },
    dataDeletion: { title: 'Data Deletion Request', lede: 'What can be erased, and what the law requires us to keep.' },
  }[section];

  return (
    <View style={s.container}>
      <View style={s.headerWrap}>
        <FlowHeader />
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle} accessibilityRole="header">{page.title}</Text>
        <Text style={s.lede}>{page.lede}</Text>

        {section === 'personal' && (
          <>
            <Group title="About you">
                <ValueRow key="n" icon="user" label="Full name" value={user?.fullName || 'Alex Morgan'} />
                <ValueRow key="m" icon="phone" label="Mobile number" value={user?.mobileNumber || '+91 98765 43210'} />
                <ValueRow key="e" icon="send" label="Email address" value="alex.morgan@example.com" />
                <ValueRow key="d" icon="calendar" label="Date of birth" value={user?.dateOfBirth || '14 Apr 1992'} />
                <ValueRow key="g" icon="idCard" label="Gender" value={user?.gender || 'Male'} />
            </Group>

            <Group title="Address">
                <ValueRow key="a" icon="mapPin" label="Address" value="B-704, Sunrise Residency, Sector 21" />
                <ValueRow key="c" icon="home" label="City and state" value="Gurugram, Haryana" />
                <ValueRow key="p" icon="tag" label="PIN code" value="122016" />
            </Group>

            <Group title="Emergency contact">
                <ValueRow key="en" icon="user" label="Name" value="Priya Morgan" />
                <ValueRow key="er" icon="heart" label="Relationship" value="Spouse" />
                <ValueRow key="ep" icon="phone" label="Mobile number" value="+91 98110 22345" />
            </Group>

            <Note icon="lock">Only your treating doctor can see these details. They are never shown to other patients.</Note>

            <View style={s.footer}>
              <PillButton label="Edit details" onPress={() => navigation.navigate('ProfileSetup')} cornerRadius={radius.md} />
            </View>
          </>
        )}

        {section === 'language' && (
          <>
            <Group title="App language">
                {LANGUAGES.map((l) => (
                  <PickRow key={l} label={l} selected={language === l} onPress={() => setLanguage(l)} />
                ))}
            </Group>

            <Group title="Region">
                <ValueRow key="r" icon="globe" label="Region" value="India" />
                <ValueRow key="t" icon="clock" label="Time zone" value="IST (UTC +05:30)" />
                <ValueRow key="d" icon="calendar" label="Date format" value="DD MMM YYYY" />
            </Group>

            <Note icon="info">Consultations are always shown in your region's time zone, not the doctor's.</Note>

            <View style={s.footer}>
              <PillButton label="Save preference" onPress={() => navigation.goBack()} cornerRadius={radius.md} />
            </View>
          </>
        )}

        {section === 'notifications' && (
          <>
            <Group title="How we reach you">
                {NOTIFICATION_CHANNELS.map((c) => (
                  <ToggleRow
                    key={c.key}
                    icon={c.icon}
                    title={c.title}
                    sub={c.sub}
                    on={!!channels[c.key]}
                    onToggle={() => setChannels((p) => ({ ...p, [c.key]: !p[c.key] }))}
                  />
                ))}
            </Group>

            <Group title="What we notify you about">
                {NOTIFICATION_TOPICS.map((t) => (
                  <ToggleRow
                    key={t.key}
                    icon={t.icon}
                    title={t.title}
                    sub={t.sub}
                    on={!!topics[t.key]}
                    onToggle={() => setTopics((p) => ({ ...p, [t.key]: !p[t.key] }))}
                  />
                ))}
            </Group>

            <Note icon="shieldCheck">
              Notifications never name a condition or a diagnosis, on any channel.
            </Note>
          </>
        )}

        {section === 'dataDeletion' && (
          <>
            <Group title="Can be anonymized">
                <ValueRow key="1" icon="user" label="Personal demographics" value="Name, date of birth, gender" />
                <ValueRow key="2" icon="phone" label="Contact details" value="Mobile number, email, address" />
                <ValueRow key="3" icon="idCard" label="Device identifiers" value="Push tokens and device IDs" />
            </Group>

            <Group title="Must be retained">
                <ValueRow key="4" icon="prescription" label="Signed prescriptions" value="Retained for statutory audit" />
                <ValueRow key="5" icon="document" label="Consultation records" value="Retained for statutory audit" />
                <ValueRow key="6" icon="wallet" label="Payment receipts" value="Retained for tax and refund audit" />
            </Group>

            <Note icon="alertTriangle">
              Anonymization cannot be undone. You will keep access to your account, but past records will no longer
              carry your name.
            </Note>

            <View style={s.footer}>
              <PillButton label="Request anonymization" onPress={requestDeletion} cornerRadius={radius.md} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FBF9' },
  headerWrap: { paddingHorizontal: spacing.lg },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: -6,
  },
  section: { gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginLeft: 2 },
  cardGroup: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  rowItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 56 },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  rowTitleOn: { color: colors.surfie },
  rowSub: { fontSize: 11, color: colors.inkMuted },
  togglePill: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  togglePillOn: { backgroundColor: '#EEF8F5' },
  toggleText: { fontSize: 10, fontWeight: '600', color: colors.inkFaint },
  toggleTextOn: { color: colors.surfie, fontWeight: '700' },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EEF8F5',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 4,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.inkMuted },
  footer: { marginTop: spacing.sm },
});

export default ProfileDetailScreen;
