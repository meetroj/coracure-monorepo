import React, { useState } from 'react';
import { upcomingDates, appointmentTime } from '../utils/appointmentTime';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, PillButton } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import { consultationsApi } from '@coracure/api';
import PatientTabBar from '../components/PatientTabBar';

const DATES = upcomingDates(5).map(date => ({ ...date, num: date.date }));

const TIMES = ['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];

export const BookFollowUpScreen = () => {
  const navigation = useNavigation<any>();

  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [booking, setBooking] = useState(false);

  const handleConfirm = async () => {
    setBooking(true);
    try {
      await consultationsApi.bookScheduled({
        serviceId: 'spec-ortho',
        specialtyId: 'spec-ortho',
        startsAt: appointmentTime(DATES[selectedDateIdx].full, selectedTime),
        concernId: 'knee-pain',
        intakeAnswers: { type: 'follow_up' },
      });
      navigation.navigate('MainTabs');
    } catch {
      navigation.navigate('MainTabs');
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.headerBar}>
        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>

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
          <Text style={s.pageTitle}>Book Your Follow-Up</Text>
          <Text style={s.pageSubtitle}>
            Recommended after 14 days of recovery plan
          </Text>
        </View>

        {/* Doctor Card */}
        <View style={s.doctorCard}>
          <Image
            source={DrRichardImg}
            style={s.doctorPhoto}
            resizeMode="cover"
          />
          <View style={s.doctorInfo}>
            <Text style={s.doctorName}>Dr. Richard Parker</Text>
            <Text style={s.doctorSpecialty}>Orthopedic Surgeon</Text>
            <Text style={s.doctorSub}>Knee Rehabilitation Specialist</Text>
            <View style={s.ratingRow}>
              <Icon name="star" size={14} color="#F59E0B" filled />
              <Text style={s.ratingText}>4.9 (120+ reviews)</Text>
            </View>
          </View>
        </View>

        {/* Slot Selection */}
        <View style={s.cardSection}>
          <Text style={s.sectionQuestion}>Select Available Slot</Text>

          {/* Date Picker Row */}
          <View style={s.datesRow}>
            {DATES.map((d, idx) => {
              const isSelected = selectedDateIdx === idx;
              return (
                <Pressable
                  key={d.num}
                  style={[s.datePill, isSelected && s.datePillSelected]}
                  onPress={() => setSelectedDateIdx(idx)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select date ${d.day} ${d.num}`}
                >
                  <Text style={[s.dateDay, isSelected && s.dateDaySelected]}>
                    {d.day}
                  </Text>
                  <Text style={[s.dateNum, isSelected && s.dateNumSelected]}>
                    {d.num}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Times Grid */}
          <View style={s.timesGrid}>
            {TIMES.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <Pressable
                  key={time}
                  style={[s.timeBox, isSelected && s.timeBoxSelected]}
                  onPress={() => setSelectedTime(time)}
                  accessibilityRole="button"
                  accessibilityLabel={`Time ${time}`}
                >
                  <Text style={[s.timeText, isSelected && s.timeTextSelected]}>
                    {time}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cancellation Notice Card */}
        <View style={s.cancellationCard}>
          <Icon name="alertCircle" size={16} color="#DC2626" />
          <View style={s.cancelTextCol}>
            <Text style={s.cancelTitle}>Free cancellation</Text>
            <Text style={s.cancelSub}>
              Cancel anytime up to 2 hours before the start time.
            </Text>
          </View>
          <Text style={s.policyDetailsLink}>Policy ›</Text>
        </View>

        {/* Itemized Bill Card */}
        <View style={s.billCard}>
          <View style={s.billRow}>
            <Text style={s.billLabel}>Consultation Fee</Text>
            <Text style={s.billVal}>₹850</Text>
          </View>
          <View style={s.billRow}>
            <Text style={s.billLabel}>Follow-up credit applied</Text>
            <Text style={s.discountVal}>-₹200</Text>
          </View>
          <View style={s.billDivider} />
          <View style={s.billTotalRow}>
            <Text style={s.totalLabel}>Total Payable</Text>
            <Text style={s.totalVal}>₹650</Text>
          </View>
        </View>

        {/* Confirm Follow Up Pill Button */}
        <PillButton
          label={booking ? "CONFIRMING..." : "CONFIRM FOLLOW-UP"}
          onPress={handleConfirm}
          disabled={booking}
          accessibilityLabel="Confirm follow-up booking"
        />
      </ScrollView>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="Appointments" />
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
  pageSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  doctorPhoto: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  doctorSpecialty: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.surfie,
    marginTop: 2,
  },
  doctorSub: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  cardSection: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: spacing.md,
  },
  sectionQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  datePill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 2,
  },
  datePillSelected: {
    backgroundColor: '#EEF8F5',
    borderColor: colors.surfie,
  },
  dateDay: {
    fontSize: 11,
    color: colors.inkMuted,
    fontWeight: '500',
  },
  dateDaySelected: {
    color: colors.surfie,
  },
  dateNum: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  dateNumSelected: {
    color: colors.surfie,
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeBox: {
    width: '48%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.input,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  timeBoxSelected: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  timeTextSelected: {
    color: colors.white,
  },
  cancellationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelTextCol: {
    flex: 1,
  },
  cancelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  cancelSub: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 1,
  },
  policyDetailsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  billCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  billVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  discountVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  totalVal: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.surfie,
  },
});

export default BookFollowUpScreen;

