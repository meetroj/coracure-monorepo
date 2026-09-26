import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, Icon } from '@coracure/ui';
import FlowHeader from '../components/FlowHeader';
import GradientButton from '../components/GradientButton';
import ScreenBackground from '../components/ScreenBackground';
import { findDoctor } from '../data/doctors';
import { upcomingDates } from '../utils/appointmentTime';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SelectSlot'>;
type Rt = RouteProp<RootStackParamList, 'SelectSlot'>;

const SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
];

/** The hold on a chosen slot, in seconds. The backend expires it server-side. */
const HOLD_SECONDS = 5 * 60;

export const SelectSlotScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const doctor = findDoctor(route.params?.doctorId);

  const dates = useMemo(() => upcomingDates(7), []);
  const [dateIdx, setDateIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [heldFor, setHeldFor] = useState(HOLD_SECONDS);

  // The countdown only runs once a slot is actually held.
  useEffect(() => {
    if (!slot) {
      setHeldFor(HOLD_SECONDS);
      return;
    }
    const id = setInterval(() => setHeldFor((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [slot]);

  const mmss = `${String(Math.floor(heldFor / 60)).padStart(2, '0')}:${String(heldFor % 60).padStart(2, '0')}`;
  const expired = slot != null && heldFor === 0;

  return (
    <Screen contentStyle={s.content}>
      <ScreenBackground name="slot" scrolls />
      <FlowHeader />

      <Text style={s.title} accessibilityRole="header">Select a Slot</Text>
      <Text style={s.lede}>Choose a convenient date and time for your appointment.</Text>

      {/* Who the slot is with */}
      <View style={s.doctorCard}>
        <View>
          <Image source={doctor.img} style={s.doctorPhoto} resizeMode="cover" />
          <View style={s.onlineDot} />
        </View>
        <View style={s.doctorText}>
          <Text style={s.doctorName}>{doctor.name}</Text>
          <Text style={s.doctorSpecialty}>{doctor.specialty}</Text>
          <View style={s.ratingRow}>
            <Icon name="star" size={15} color={colors.surfie} filled />
            <Text style={s.ratingText}>{doctor.rating} ({doctor.reviews})</Text>
          </View>
        </View>
      </View>

      <Text style={s.sectionTitle}>Select Date</Text>
      <View style={s.dateStrip}>
        <Pressable
          style={s.stripArrow}
          hitSlop={8}
          onPress={() => setDateIdx((i) => Math.max(0, i - 1))}
          accessibilityRole="button"
          accessibilityLabel="Earlier dates"
        >
          <Icon name="arrowLeft" size={16} color={colors.inkMuted} />
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateRow}
        keyboardShouldPersistTaps="handled"
      >
          {dates.map((d, i) => {
            const on = i === dateIdx;
            return (
              <Pressable
                key={d.isoDate}
                style={[s.dateCard, on && s.dateCardOn]}
                onPress={() => setDateIdx(i)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={d.dateStr}
              >
                <Text style={[s.dateDay, on && s.dateOnText]}>{d.day}</Text>
                <Text style={[s.dateNum, on && s.dateOnText]}>{d.date}</Text>
                <Text style={[s.dateMonth, on && s.dateOnText]}>{d.month}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={s.stripArrow}
          hitSlop={8}
          onPress={() => setDateIdx((i) => Math.min(dates.length - 1, i + 1))}
          accessibilityRole="button"
          accessibilityLabel="Later dates"
        >
          <Icon name="chevronRight" size={16} color={colors.inkMuted} />
        </Pressable>
      </View>

      <Text style={s.sectionTitle}>Available Slots</Text>
      <View style={s.slotGrid}>
        {SLOTS.map((t) => {
          const [time, period] = t.split(' ');
          const on = slot === t;
          return (
            <Pressable
              key={t}
              style={[s.slotBox, on && s.slotBoxOn]}
              onPress={() => setSlot(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Select ${t}`}
            >
              <Text style={[s.slotTime, on && s.slotTimeOn]}>{time}</Text>
              <Text style={[s.slotPeriod, on && s.slotTimeOn]}>{period}</Text>
              {on && (
                <View style={s.slotTick}>
                  <Icon name="check" size={11} color={colors.white} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={s.statCard}>
        <View style={s.stat}>
          <View style={s.statIcon}>
            <Icon name="clock" size={18} color={colors.surfie} />
          </View>
          <View>
            <Text style={s.statLabel}>Consultation Duration</Text>
            <Text style={s.statValue}>{doctor.durationMins} mins</Text>
          </View>
        </View>
        <View style={s.statRule} />
        <View style={s.stat}>
          <View style={s.statIcon}>
            <Icon name="wallet" size={18} color={colors.surfie} />
          </View>
          <View>
            <Text style={s.statLabel}>Consultation Fee</Text>
            <Text style={s.statValue}>₹{doctor.fee}</Text>
          </View>
        </View>
      </View>

      {slot && (
        <View style={[s.holdPill, expired && s.holdPillExpired]}>
          <Icon name="clock" size={15} color={expired ? colors.danger : colors.surfie} />
          <Text style={[s.holdText, expired && s.holdTextExpired]}>
            {expired ? 'This slot hold has expired. Pick another time.' : 'Slot is held for '}
            {!expired && <Text style={s.holdCount}>{mmss}</Text>}
          </Text>
        </View>
      )}

      <GradientButton
        label="Continue"
        disabled={!slot || expired}
        onPress={() =>
          navigation.navigate('BookingFlow', {
            step: 3,
            doctorId: doctor.id,
            serviceName: doctor.specialty,
            fee: doctor.fee,
            slot: `${dates[dateIdx].dateStr}, ${slot}`,
          })
        }
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.xxl,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },

  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  doctorPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface.mintSoft,
  },
  onlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfie,
    borderWidth: 2,
    borderColor: colors.white,
  },
  doctorText: { flex: 1, gap: 2 },
  doctorName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  doctorSpecialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.ink,
  },

  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  stripArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: { gap: 4, paddingHorizontal: 4 },
  dateCard: {
    width: 52,
    alignItems: 'center',
    gap: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateCardOn: {
    borderColor: colors.surfie,
    backgroundColor: colors.surface.mintSoft,
  },
  dateDay: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  dateNum: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '500',
    color: colors.ink,
  },
  dateMonth: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  dateOnText: { color: colors.surfie },

  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  slotBox: {
    width: '22.5%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  slotBoxOn: {
    borderColor: colors.surfie,
    backgroundColor: colors.surface.mintSoft,
  },
  slotTime: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '500',
    color: colors.ink,
  },
  slotPeriod: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  slotTimeOn: { color: colors.surfie },
  slotTick: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  statValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  statRule: {
    width: 1,
    height: 34,
    backgroundColor: colors.surface.line,
    marginHorizontal: spacing.sm,
  },

  holdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  holdPillExpired: { backgroundColor: colors.dangerSoft },
  holdText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  holdTextExpired: { color: colors.danger },
  holdCount: {
    fontFamily: typography.heading.family,
    fontWeight: '700',
    color: colors.surfie,
  },
});

export default SelectSlotScreen;
