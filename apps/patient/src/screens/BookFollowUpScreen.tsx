import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, Avatar, StatusPill, Icon } from '@coracure/ui';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import { consultationsApi } from '@coracure/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type FollowUpNavProp = NativeStackNavigationProp<RootStackParamList, 'BookFollowUp'>;
type FollowUpRouteProp = RouteProp<RootStackParamList, 'BookFollowUp'>;

const AVAILABLE_DATES = [
  { label: '30 May', full: '2026-05-30' },
  { label: '2 Jun', full: '2026-06-02' },
  { label: '3 Jun', full: '2026-06-03' },
  { label: '4 Jun', full: '2026-06-04' },
  { label: '5 Jun', full: '2026-06-05' },
];

const AVAILABLE_TIMES = ['10:00 AM', '02:30 PM', '04:30 PM', '05:30 PM'];

export const BookFollowUpScreen = () => {
  const navigation = useNavigation<FollowUpNavProp>();
  const route = useRoute<FollowUpRouteProp>();

  const [selectedDate, setSelectedDate] = useState('2026-05-30');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [reason, setReason] = useState('Knee pain review and progress follow-up');
  const [booking, setBooking] = useState(false);

  const handleContinue = async () => {
    setBooking(true);
    try {
      const startsAt = `${selectedDate}T10:00:00.000Z`;
      await consultationsApi.bookScheduled({
        serviceId: 'follow-up-service',
        startsAt,
        intakeAnswers: { reason },
      });
      Alert.alert(
        'Follow-Up Booked',
        `Your follow-up consultation with Dr. Richard Parker has been booked for ${selectedDate} at ${selectedTime}.`,
        [{ text: 'View Appointments', onPress: () => navigation.navigate('MainTabs') }]
      );
    } catch {
      Alert.alert(
        'Follow-Up Confirmed (Simulated)',
        `Your follow-up with Dr. Richard Parker is scheduled for ${selectedDate} at ${selectedTime}.`,
        [{ text: 'Done', onPress: () => navigation.navigate('MainTabs') }]
      );
    } finally {
      setBooking(false);
    }
  };

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={<Icon name="bell" size={20} color={colors.inkMuted} />}
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Book Your Follow-Up</Text>
        <Text style={s.pageSubtitle}>
          Schedule your next consultation to stay on track with your recovery.
        </Text>
      </View>

      {/* Doctor Card */}
      <View style={s.doctorCard}>
        <View style={s.doctorRow}>
          <Image
            source={DrRichardImg}
            style={s.doctorAvatar}
            resizeMode="cover"
          />
          <View style={s.doctorInfo}>
            <Text style={s.doctorName}>Dr. Richard Parker</Text>
            <Text style={s.specialty}>Orthopedic Surgeon</Text>
            <Text style={s.verifiedTag}>✓ Verified Specialist</Text>
            <Text style={s.lastConsult}>Last consulted: 18 May 2026</Text>
          </View>
        </View>

        <View style={s.carePlanBadge}>
          <Icon name="checkCircle" size={14} color={colors.surfie} />
          <Text style={s.carePlanBadgeText}>Recommended by your care plan</Text>
        </View>
      </View>

      {/* Next Available Slots */}
      <View style={s.section}>
        <View style={s.slotHeaderRow}>
          <Text style={s.sectionTitle}>Next Available Slots</Text>
          <Text style={s.durationText}>⏱ Duration: 20 mins</Text>
        </View>

        {/* Date Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateScroll}>
          {AVAILABLE_DATES.map((d) => {
            const isSelected = selectedDate === d.full;
            return (
              <Pressable
                key={d.full}
                style={[s.dateChip, isSelected && s.dateChipActive]}
                onPress={() => setSelectedDate(d.full)}
              >
                <Text style={[s.dateChipText, isSelected && s.dateChipTextActive]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Time Selector */}
        <View style={s.timeGrid}>
          {AVAILABLE_TIMES.map((t) => {
            const isSelected = selectedTime === t;
            return (
              <Pressable
                key={t}
                style={[s.timeChip, isSelected && s.timeChipActive]}
                onPress={() => setSelectedTime(t)}
              >
                <Text style={[s.timeChipText, isSelected && s.timeChipTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Need an Earlier Doctor Callout */}
      <View style={s.earlierCallout}>
        <View style={s.earlierIcon}>
          <Icon name="info" size={18} color={colors.surfie} />
        </View>
        <View style={s.earlierTextWrap}>
          <Text style={s.earlierTitle}>Need an earlier doctor?</Text>
          <Text style={s.earlierDesc}>See another available doctor or visit clinic if you need urgent care.</Text>
        </View>
        <Pressable onPress={() => Alert.alert('Earlier Slots', 'Checking other available specialists...')}>
          <Text style={s.earlierLink}>See Options</Text>
        </Pressable>
      </View>

      {/* Reason for Visit */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Reason for Visit</Text>
        <View style={s.reasonInputWrap}>
          <TextInput
            style={s.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason for follow-up consultation"
          />
          <Icon name="edit" size={16} color={colors.surfie} />
        </View>
      </View>

      {/* Consultation Fee Card */}
      <View style={s.feeCard}>
        <View style={s.feeRow}>
          <View>
            <Text style={s.feeLabel}>Consultation Fee</Text>
            <Text style={s.feeAmount}>₹800</Text>
          </View>
          <StatusPill label="Included in Care" tone="brand" />
        </View>
        <Text style={s.feeNotice}>
          A detailed bill & invoice will be shared after the consultation.
        </Text>
      </View>

      {/* Continue CTA */}
      <View style={s.footer}>
        <Button
          label="Continue to Payment →"
          onPress={handleContinue}
          loading={booking}
        />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
  },
  doctorCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    ...shadow.card,
    marginBottom: spacing.lg,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  doctorAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  specialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  verifiedTag: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.surfie,
    fontWeight: '600',
    marginTop: 2,
  },
  lastConsult: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 1,
  },
  carePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface.mintSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  carePlanBadgeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  section: {
    marginBottom: spacing.lg,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  durationText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  dateScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  dateChipActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  dateChipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.ink,
  },
  dateChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timeChip: {
    width: '23%',
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  timeChipActive: {
    backgroundColor: colors.surface.mintSoft,
    borderColor: colors.surfie,
  },
  timeChipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.ink,
  },
  timeChipTextActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  earlierCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF7F2',
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.lg,
  },
  earlierIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earlierTextWrap: {
    flex: 1,
  },
  earlierTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },
  earlierDesc: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 1,
  },
  earlierLink: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  reasonInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  reasonInput: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  feeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    ...shadow.card,
    marginBottom: spacing.xl,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  feeAmount: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  feeNotice: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xs,
  },
});

export default BookFollowUpScreen;

