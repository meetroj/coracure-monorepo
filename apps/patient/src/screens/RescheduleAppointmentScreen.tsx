import React, { useState } from 'react';
import { upcomingDates, appointmentTime } from '../utils/appointmentTime';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, Icon } from '@coracure/ui';
import FlowHeader from '../components/FlowHeader';
import GradientButton from '../components/GradientButton';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import { consultationsApi, type ApiError } from '@coracure/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type RescheduleScreenProp = NativeStackNavigationProp<RootStackParamList, 'RescheduleAppointment'>;
type RescheduleRouteProp = RouteProp<RootStackParamList, 'RescheduleAppointment'>;

const DATES = upcomingDates(6);

const TIME_SLOTS = [
  '09:00 AM', '11:00 AM', '12:00 PM', '01:30 PM',
  '02:30 PM', '04:00 PM', '05:30 PM', '07:00 PM',
];

export const RescheduleAppointmentScreen = () => {
  const navigation = useNavigation<RescheduleScreenProp>();
  const route = useRoute<RescheduleRouteProp>();
  const consultationId = route.params?.consultationId || 'demo-consultation-id';

  const [selectedDate, setSelectedDate] = useState(DATES[0].full);
  const [selectedTime, setSelectedTime] = useState('11:00 AM');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const startsAt = appointmentTime(selectedDate, selectedTime);
      await consultationsApi.rescheduleConsultation(consultationId, startsAt);
      Alert.alert(
        'Appointment Rescheduled',
        `Your appointment has been successfully moved to ${selectedDate} at ${selectedTime}.`,
        [{ text: 'View Appointments', onPress: () => navigation.navigate('MainTabs') }]
      );
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.code === 'SLOT_UNAVAILABLE' || apiErr?.code === 'SLOT_TAKEN') {
        Alert.alert('Slot Unavailable', 'This slot is no longer available. Please select another time.');
      } else if (apiErr?.code === 'NOT_REFUNDABLE') {
        Alert.alert('Policy Restriction', 'Rescheduling is not permitted within 4 hours of the appointment.');
      } else {
        Alert.alert('Rescheduled (Simulated)', `Your booking is now moved to ${selectedDate} at ${selectedTime}.`, [
          { text: 'Done', onPress: () => navigation.navigate('MainTabs') }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={s.container}>
      <FlowHeader
        action="headset"
        dot={false}
        actionLabel="Contact support"
        onAction={() => navigation.navigate('HelpSupport')}
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Reschedule Appointment</Text>
        <Text style={s.pageSubtitle}>Move your booking to a new slot within policy.</Text>
      </View>

      {/* Current Booking Summary Card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Current Booking</Text>

        <View style={s.doctorRow}>
          <Image source={DrRichardImg} style={s.doctorAvatar} resizeMode="cover" />
          <View style={s.doctorInfo}>
            <Text style={s.doctorName}>Dr. Richard Parker</Text>
            <Text style={s.specialty}>Orthopedic Surgeon</Text>

            <View style={s.dateTimeRow}>
              <Icon name="calendar" size={15} color={colors.surfie} />
              <Text style={s.dateTimeText}>Friday, 16 May 2026</Text>
            </View>
            <View style={s.dateTimeRow}>
              <Icon name="clock" size={15} color={colors.surfie} />
              <Text style={s.dateTimeText}>10:30 AM</Text>
            </View>
          </View>
        </View>

        <View style={s.infoNotice}>
          <Icon name="info" size={20} color={colors.surfie} />
          <View style={s.flex}>
            <Text style={s.infoNoticeTitle}>This is your current appointment.</Text>
            <Text style={s.infoNoticeText}>Reschedule to a new date and time below.</Text>
          </View>
        </View>
      </View>

      {/* Reschedule Policy Card */}
      <View style={s.policyCard}>
        <View style={s.policyIconWrap}>
          <Icon name="shieldCheck" size={20} color={colors.surfie} />
        </View>
        <View style={s.policyTextWrap}>
          <Text style={s.policyTitle}>Reschedule Policy</Text>
          <Text style={s.policyDesc}>
            You can reschedule up to <Text style={s.bold}>4 hours before</Text> your appointment time.
          </Text>
        </View>
      </View>

      {/* Date Picker Section */}
      <View style={s.pickerSection}>
        <Text style={s.pickerHeading}>Choose New Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateScroll}
        keyboardShouldPersistTaps="handled"
      >
          {DATES.map((item) => {
            const isSelected = selectedDate === item.full;
            return (
              <Pressable
                key={item.full}
                style={[s.dateCard, isSelected && s.dateCardActive]}
                onPress={() => setSelectedDate(item.full)}
              >
                <Text style={[s.dateDayText, isSelected && s.dateTextActive]}>{item.day}</Text>
                <Text style={[s.dateNumText, isSelected && s.dateTextActive]}>{item.date}</Text>
                <Text style={[s.dateMonthText, isSelected && s.dateTextActive]}>{item.month}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Time Slot Grid Section */}
      <View style={s.pickerSection}>
        <Text style={s.pickerHeading}>Choose New Time</Text>
        <View style={s.timeGrid}>
          {TIME_SLOTS.map((time) => {
            const isSelected = selectedTime === time;
            return (
              <Pressable
                key={time}
                style={[s.timeSlot, isSelected && s.timeSlotActive]}
                onPress={() => setSelectedTime(time)}
              >
                <Text style={[s.timeText, isSelected && s.timeTextActive]}>{time}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* CTA Footer */}
      <View style={s.footer}>
        <GradientButton
          label="Confirm Reschedule"
          onPress={handleConfirm}
          loading={loading}
        />
        <View style={s.secureRow}>
          <Icon name="lock" size={13} color={colors.inkFaint} />
          <Text style={s.secureText}>Secure • Easy • Within Policy</Text>
        </View>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerWrap: {
    marginTop: spacing.sm,
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
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    ...shadow.card,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  doctorAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface.mintSoft,
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
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  dateTimeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  infoNoticeTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.mintSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  infoNoticeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F0F7F4',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#D8EDE4',
    marginBottom: spacing.xl,
  },
  policyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTextWrap: {
    flex: 1,
  },
  policyTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  policyDesc: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  bold: {
    fontWeight: '700',
    color: colors.ink,
  },
  pickerSection: {
    marginBottom: spacing.xl,
  },
  pickerHeading: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  dateScroll: {
    gap: spacing.sm,
  },
  dateCard: {
    width: 58,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  dateCardActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  dateDayText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkMuted,
    marginBottom: 2,
  },
  dateNumText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  dateMonthText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkMuted,
    marginTop: 2,
  },
  dateTextActive: {
    color: colors.white,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeSlot: {
    width: '23%',
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  timeSlotActive: {
    backgroundColor: colors.surface.mintSoft,
    borderColor: colors.surfie,
  },
  timeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.ink,
  },
  timeTextActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  footer: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  secureText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },
});

export default RescheduleAppointmentScreen;


