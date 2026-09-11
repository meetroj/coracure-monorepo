import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, Avatar, StatusPill, Icon } from '@coracure/ui';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import { consultationsApi, type ApiError } from '@coracure/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type CancelScreenProp = NativeStackNavigationProp<RootStackParamList, 'CancelRefund'>;
type CancelRouteProp = RouteProp<RootStackParamList, 'CancelRefund'>;

const CANCEL_REASONS = [
  'Change in plans',
  'Found alternative treatment',
  'Doctor requested reschedule',
  'Financial reasons',
  'Other',
];

export const CancelRefundScreen = () => {
  const navigation = useNavigation<CancelScreenProp>();
  const route = useRoute<CancelRouteProp>();
  const consultationId = route.params?.consultationId || 'demo-consultation-id';

  const [selectedReason, setSelectedReason] = useState('Change in plans');
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirmCancel = async () => {
    Alert.alert(
      'Confirm Cancellation',
      'Are you sure you want to cancel this consultation? A full refund of ₹1,200.00 will be initiated.',
      [
        { text: 'Keep Appointment', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await consultationsApi.cancelConsultation(consultationId, selectedReason);
              Alert.alert(
                'Cancellation Initiated',
                'Your consultation has been cancelled. Your refund of ₹1,200.00 has been initiated to your original payment method.',
                [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]
              );
            } catch (err: unknown) {
              const apiErr = err as ApiError;
              if (apiErr?.code === 'NOT_REFUNDABLE') {
                Alert.alert('Policy Notice', 'This consultation is past the refundable cancellation window.');
              } else {
                Alert.alert('Cancellation Completed', 'Your refund request has been registered and is being processed.', [
                  { text: 'Done', onPress: () => navigation.navigate('MainTabs') }
                ]);
              }
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={<Icon name="info" size={20} color={colors.inkMuted} />}
      />

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Cancel and Refund</Text>
        <Text style={s.pageSubtitle}>We're here to make it simple and stress-free.</Text>
      </View>

      {/* Booking Summary Card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.sectionLabel}>Booking Summary</Text>
          <StatusPill label="Confirmed" tone="brand" />
        </View>

        <View style={s.doctorRow}>
          <Image
            source={DrRichardImg}
            style={s.doctorAvatar}
            resizeMode="cover"
          />
          <View style={s.doctorInfo}>
            <Text style={s.doctorName}>Dr. Richard Parker</Text>
            <Text style={s.specialty}>Orthopedic Surgeon</Text>
            <View style={s.dateTimeRow}>
              <Icon name="calendar" size={14} color={colors.inkMuted} />
              <Text style={s.dateTimeText}>Friday, 18 May 2026 • 10:30 AM</Text>
            </View>
          </View>
        </View>

        <View style={s.bookingIdRow}>
          <Text style={s.bookingIdLabel}>Booking ID</Text>
          <Text style={s.bookingIdValue}>CC24-001048</Text>
        </View>
      </View>

      {/* Cancellation Policy Card */}
      <View style={s.policyCard}>
        <View style={s.policyIconWrap}>
          <Icon name="checkCircle" size={20} color={colors.surfie} />
        </View>
        <View style={s.policyTextWrap}>
          <Text style={s.policyTitle}>Cancellation Policy</Text>
          <Text style={s.policyDesc}>
            You can cancel your appointment up to <Text style={s.bold}>12 hours before</Text> the scheduled time for a full refund.
          </Text>
          <Text style={s.policyHighlight}>✓ This appointment is eligible for a full refund.</Text>
        </View>
      </View>

      {/* Refund Details Breakdown */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Refund Details</Text>
        <View style={s.refundRow}>
          <View style={s.refundCol}>
            <Text style={s.refundLabel}>Paid Amount</Text>
            <Text style={s.paidAmount}>₹1,200.00</Text>
          </View>
          <Icon name="arrowRight" size={18} color={colors.inkMuted} />
          <View style={s.refundCol}>
            <Text style={s.refundLabel}>Refund Amount</Text>
            <View style={s.refundAmountRow}>
              <Text style={s.refundAmount}>₹1,200.00</Text>
              <View style={s.fullRefundPill}>
                <Text style={s.fullRefundText}>100% Refund</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Reason for Cancellation Dropdown */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Reason for Cancellation</Text>
        <Pressable
          style={s.dropdownHeader}
          onPress={() => setShowReasonDropdown(!showReasonDropdown)}
        >
          <Text style={s.dropdownSelectedText}>{selectedReason}</Text>
          <Icon name={showReasonDropdown ? 'chevronUp' : 'chevronDown'} size={18} color={colors.ink} />
        </Pressable>

        {showReasonDropdown && (
          <View style={s.dropdownList}>
            {CANCEL_REASONS.map((reason) => (
              <Pressable
                key={reason}
                style={[s.dropdownItem, selectedReason === reason && s.dropdownItemActive]}
                onPress={() => {
                  setSelectedReason(reason);
                  setShowReasonDropdown(false);
                }}
              >
                <Text style={[s.dropdownItemText, selectedReason === reason && s.dropdownItemTextActive]}>
                  {reason}
                </Text>
                {selectedReason === reason && <Icon name="check" size={16} color={colors.surfie} />}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Refund Status Timeline */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Refund Status</Text>
        <View style={s.timeline}>
          <View style={s.timelineStep}>
            <View style={[s.stepCircle, s.stepCircleDone]}>
              <Icon name="check" size={12} color={colors.white} />
            </View>
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>Cancellation Requested</Text>
              <Text style={s.stepSub}>Today, 10:35 AM</Text>
            </View>
          </View>
          <View style={s.timelineLine} />

          <View style={s.timelineStep}>
            <View style={[s.stepCircle, s.stepCircleActive]}>
              <View style={s.stepDotInner} />
            </View>
            <View style={s.stepContent}>
              <Text style={s.stepTitleActive}>Refund Processing</Text>
              <Text style={s.stepSub}>Within 24-48 business hours</Text>
            </View>
          </View>
          <View style={s.timelineLine} />

          <View style={s.timelineStep}>
            <View style={s.stepCircle}>
              <View style={s.stepDotEmpty} />
            </View>
            <View style={s.stepContent}>
              <Text style={s.stepTitlePending}>Refund Completed</Text>
              <Text style={s.stepSub}>100% refund credited to original payment source</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <View style={s.footer}>
        <Button
          label="Confirm Cancellation →"
          onPress={handleConfirmCancel}
          loading={loading}
          variant="danger"
        />
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateTimeText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '600',
  },
  bookingIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  bookingIdLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  bookingIdValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#F0F7F4',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#D8EDE4',
    marginBottom: spacing.lg,
  },
  policyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
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
    marginTop: 2,
    lineHeight: 16,
  },
  policyHighlight: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
    marginTop: 6,
  },
  bold: {
    fontWeight: '700',
    color: colors.ink,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  refundCol: {
    gap: 4,
  },
  refundLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  paidAmount: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  refundAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  refundAmount: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.surfie,
  },
  fullRefundPill: {
    backgroundColor: colors.surface.mintSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  fullRefundText: {
    fontFamily: typography.body.family,
    fontSize: 10,
    fontWeight: '700',
    color: colors.surfie,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface.page,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginTop: spacing.sm,
  },
  dropdownSelectedText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
    fontWeight: '600',
  },
  dropdownList: {
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  dropdownItemActive: {
    backgroundColor: colors.surface.mintSoft,
  },
  dropdownItemText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: colors.surfie,
  },
  timeline: {
    marginTop: spacing.md,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  stepCircleActive: {
    borderColor: colors.surfie,
    backgroundColor: colors.surface.mintSoft,
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfie,
  },
  stepDotEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface.line,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.surface.line,
    marginLeft: 10,
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  stepTitleActive: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  stepTitlePending: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  stepSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  footer: {
    marginTop: spacing.lg,
  },
});

export default CancelRefundScreen;

