import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import DrArjunImg from '../assets/dr-arjun-mehta.jpg';
import DrNehaImg from '../assets/dr-neha-sharma.jpg';
import { ScreenBackground } from '../components/ScreenBackground';
import type { RootStackParamList } from '../navigation/RootNavigator';

/**
 * The consultations list (P-20).
 *
 * Date block on the left, the professional in the middle, the one action that
 * matters on the right. The overflow menu carries reschedule and cancel so the
 * card never grows a second row of buttons.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Appointment = {
  id: string;
  month: string;
  day: string;
  weekday: string;
  name: string;
  specialty: string;
  time: string;
  mode: string;
  modeIcon: IconName;
  status: string;
  statusTone: 'ok' | 'bad';
  action: string;
  actionIcon: IconName;
  actionTone: 'ok' | 'bad';
  img: any;
  past?: boolean;
};

const UPCOMING: Appointment[] = [
  {
    id: 'a1', month: 'MAY', day: '16', weekday: 'FRI',
    name: 'Dr. Arjun Mehta', specialty: 'General Physician',
    time: '10:30 AM', mode: 'Video Consultation', modeIcon: 'video',
    status: 'Payment Confirmed', statusTone: 'ok',
    action: 'Join\nConsultation', actionIcon: 'video', actionTone: 'ok',
    img: DrArjunImg,
  },
  {
    id: 'a2', month: 'MAY', day: '22', weekday: 'THU',
    name: 'Dr. Neha Sharma', specialty: 'Pulmonologist',
    time: '04:00 PM', mode: 'In-Person', modeIcon: 'inPerson',
    status: 'Payment Confirmed', statusTone: 'ok',
    action: 'View\nDetails', actionIcon: 'document', actionTone: 'ok',
    img: DrNehaImg,
  },
];

const PAST: Appointment[] = [
  {
    id: 'p1', month: 'MAY', day: '05', weekday: 'MON',
    name: 'Dr. Sameer Khanna', specialty: 'Orthopedic Surgeon',
    time: '11:30 AM', mode: 'Video Consultation', modeIcon: 'video',
    status: 'Completed', statusTone: 'ok',
    action: 'View\nSummary', actionIcon: 'document', actionTone: 'ok',
    img: DrRichardImg, past: true,
  },
  {
    id: 'p2', month: 'APR', day: '28', weekday: 'MON',
    name: 'Dr. Ananya Mehta', specialty: 'Clinical Psychologist',
    time: '02:00 PM', mode: 'Video Consultation', modeIcon: 'video',
    status: 'Cancelled (No Show)', statusTone: 'bad',
    action: 'Refund\nProcessed', actionIcon: 'refresh', actionTone: 'bad',
    img: DrNehaImg, past: true,
  },
];

export const AppointmentsScreen = () => {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<'Upcoming' | 'Past'>('Upcoming');
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const Card = ({ a }: { a: Appointment }) => (
    <Pressable
      style={s.card}
      onPress={() =>
        a.past
          ? navigation.navigate('Prescription')
          : navigation.navigate('AppointmentDetail', { consultationId: 'cons-001' })
      }
      accessibilityRole="button"
      accessibilityLabel={`${a.name}, ${a.specialty}, ${a.time}`}
    >
      {/* date block */}
      <View style={[s.dateBox, a.statusTone === 'bad' && s.dateBoxBad]}>
        <Text style={[s.dateMonth, a.statusTone === 'bad' && s.dateTextBad]}>{a.month}</Text>
        <Text style={[s.dateDay, a.statusTone === 'bad' && s.dateTextBad]}>{a.day}</Text>
        <Text style={[s.dateWeekday, a.statusTone === 'bad' && s.dateTextBad]}>{a.weekday}</Text>
      </View>

      <Image source={a.img} style={s.avatar} resizeMode="cover" />

      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{a.name}</Text>
        <Text style={s.specialty} numberOfLines={1}>{a.specialty}</Text>

        <View style={s.metaRow}>
          <Icon name="clock" size={12} color={colors.inkMuted} />
          <Text style={s.metaText}>{a.time}</Text>
        </View>
        <View style={s.metaRow}>
          <Icon name={a.modeIcon} size={12} color={colors.inkMuted} />
          <Text style={s.metaText} numberOfLines={1}>{a.mode}</Text>
        </View>

        <View style={[s.statusPill, a.statusTone === 'bad' && s.statusPillBad]}>
          <Icon
            name={a.statusTone === 'ok' ? 'checkCircle' : 'banCircle'}
            size={13}
            color={a.statusTone === 'ok' ? colors.surfie : colors.danger}
            filled
          />
          <Text style={[s.statusText, a.statusTone === 'bad' && s.statusTextBad]}>{a.status}</Text>
        </View>
      </View>

      {/* right action */}
      <View style={s.actionCol}>
        <View style={[s.actionBox, a.actionTone === 'bad' && s.actionBoxBad]}>
          <Icon
            name={a.actionIcon}
            size={19}
            color={a.actionTone === 'ok' ? colors.surfie : colors.danger}
          />
          <Text style={[s.actionText, a.actionTone === 'bad' && s.actionTextBad]}>{a.action}</Text>
        </View>
      </View>

      {/* overflow: reschedule / cancel */}
      {!a.past && (
        <Pressable
          style={s.dots}
          hitSlop={10}
          onPress={() => setMenuFor((m) => (m === a.id ? null : a.id))}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <View style={s.dot} />
          <View style={s.dot} />
          <View style={s.dot} />
        </Pressable>
      )}

      {menuFor === a.id && (
        <View style={s.menu}>
          <Pressable
            style={({ pressed }) => [s.menuRow, pressed && s.pressed]}
            onPress={() => {
              setMenuFor(null);
              navigation.navigate('RescheduleAppointment', { consultationId: 'cons-001' });
            }}
          >
            <Icon name="calendar" size={15} color={colors.surfie} />
            <Text style={s.menuText}>Reschedule</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.menuRow, s.menuRowLast, pressed && s.pressed]}
            onPress={() => {
              setMenuFor(null);
              navigation.navigate('CancelRefund', { consultationId: 'cons-001' });
            }}
          >
            <Icon name="close" size={15} color={colors.danger} />
            <Text style={[s.menuText, s.menuTextBad]}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );

  const showUpcoming = tab === 'Upcoming';

  return (
    <View style={s.container}>

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenBackground name="appointments" scrolls />
        {/* header */}
        <View style={s.header}>
          <LogoWide width={120} height={30} />
          <Pressable
            style={s.bell}
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={20} color={colors.ink} />
            <View style={s.bellDot} />
          </Pressable>
        </View>

        <Text style={s.title} accessibilityRole="header">Appointments</Text>
        <Text style={s.lede}>Manage your consultations{'\n'}all in one place.</Text>

        {/* underline tabs, no button background */}
        <View style={s.tabs}>
          {(['Upcoming', 'Past'] as const).map((t) => {
            const on = t === tab;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={s.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.tabText, on && s.tabTextOn]}>{t}</Text>
                <View style={[s.tabRule, on && s.tabRuleOn]} />
              </Pressable>
            );
          })}
        </View>

        {showUpcoming ? (
          <>
            <Text style={s.section}>Upcoming Appointments</Text>
            {UPCOMING.map((a) => <Card key={a.id} a={a} />)}
          </>
        ) : (
          <>
            <Text style={s.section}>Past Appointments</Text>
            {PAST.map((a) => <Card key={a.id} a={a} />)}
          </>
        )}

        {/* book another */}
        <View style={s.bookCard}>
          <View style={s.bookIcon}>
            <Icon name="calendar" size={26} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.bookTitle}>Need another consultation?</Text>
          </View>
          <Pressable
            style={s.bookBtn}
            onPress={() => navigation.navigate('ChooseService')}
            accessibilityRole="button"
            accessibilityLabel="Book Appointment"
          >
            <Text style={s.bookBtnText} numberOfLines={1}>Book Appointment</Text>
            <Icon name="chevronRight" size={15} color={colors.white} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfie,
    borderWidth: 1.5,
    borderColor: colors.white,
  },

  title: {
    fontFamily: typography.heading.family,
    fontSize: 30,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 4,
    marginBottom: spacing.md,
  },

  tabs: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  tab: { alignItems: 'center' },
  tabText: {
    fontFamily: typography.body.family,
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkMuted,
    paddingBottom: 8,
  },
  tabTextOn: { color: colors.surfie, fontWeight: '800' },
  tabRule: { height: 2.5, width: '100%', borderRadius: 2, backgroundColor: 'transparent' },
  tabRuleOn: { backgroundColor: colors.surfie },

  section: {
    fontFamily: typography.heading.family,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  dateBox: {
    width: 52,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
  },
  dateBoxBad: { backgroundColor: colors.dangerSoft },
  dateMonth: {
    fontFamily: typography.body.family,
    fontSize: 9,
    fontWeight: '700',
    color: colors.surfie,
    letterSpacing: 0.4,
  },
  dateDay: {
    fontFamily: typography.heading.family,
    fontSize: 21,
    fontWeight: '800',
    color: colors.surfie,
    lineHeight: 25,
  },
  dateWeekday: {
    fontFamily: typography.body.family,
    fontSize: 9,
    color: colors.inkMuted,
    letterSpacing: 0.4,
  },
  dateTextBad: { color: colors.danger },

  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EEF2F1' },

  info: { flex: 1, gap: 1 },
  name: {
    fontFamily: typography.heading.family,
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  specialty: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  statusPillBad: { backgroundColor: colors.dangerSoft },
  statusText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    fontWeight: '700',
    color: colors.surfie,
  },
  statusTextBad: { color: colors.danger },

  actionCol: {
    borderLeftWidth: 1,
    borderLeftColor: colors.surface.line,
    paddingLeft: spacing.sm,
    justifyContent: 'flex-end',
    /* Clears the kebab pinned to the card's top-right. */
    paddingTop: 22,
  },
  actionBox: {
    width: 74,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    gap: 5,
  },
  actionBoxBad: { backgroundColor: colors.dangerSoft },
  actionText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    fontWeight: '700',
    color: colors.surfie,
    textAlign: 'center',
    lineHeight: 13,
  },
  actionTextBad: { color: colors.danger },

  dots: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    padding: 5,
    gap: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: colors.inkFaint },

  menu: {
    position: 'absolute',
    top: 32,
    right: 12,
    minWidth: 152,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  menuTextBad: { color: colors.danger },

  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D4EFE5',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  bookIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookTitle: {
    fontFamily: typography.heading.family,
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfie,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bookBtnText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default AppointmentsScreen;
