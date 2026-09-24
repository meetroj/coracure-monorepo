import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import { consultationsApi } from '@coracure/api';
import { upcomingDates, appointmentTime } from '../utils/appointmentTime';

interface ServiceOption {
  id: string;
  name: string;
  providerType: string;
  duration: number;
  fee: number;
  desc: string;
  icon: IconName;
}

const SERVICES: ServiceOption[] = [
  {
    id: 'spec-ortho',
    name: 'Orthopedic Consultation',
    providerType: 'Orthopedic Surgeon',
    duration: 30,
    fee: 850,
    desc: 'Joint pain, knee/hip stiffness, fractures, sports injuries, ligament recovery.',
    icon: 'stethoscope',
  },
  {
    id: 'spec-gen',
    name: 'General Medicine',
    providerType: 'General Physician',
    duration: 20,
    fee: 550,
    desc: 'Primary clinical consultation, fevers, seasonal infections, preventive care.',
    icon: 'heart',
  },
  {
    id: 'spec-pulmo',
    name: 'Pulmonology Consultation',
    providerType: 'Pulmonologist',
    duration: 30,
    fee: 900,
    desc: 'Chest pain, shortness of breath, asthma, persistent cough, respiratory health.',
    icon: 'clipboard',
  },
  {
    id: 'spec-physio',
    name: 'Physiotherapy & Rehab',
    providerType: 'Senior Physiotherapist',
    duration: 45,
    fee: 650,
    desc: 'Post-op knee/spine rehabilitation, posture correction, mobility workouts.',
    icon: 'shieldCheck',
  },
];

const DATES = upcomingDates(3);

const TIME_SLOTS = [
  { time: '10:30 AM', period: 'Morning', isAvailable: true },
  { time: '11:45 AM', period: 'Morning', isAvailable: true },
  { time: '02:30 PM', period: 'Afternoon', isAvailable: true },
  { time: '04:00 PM', period: 'Afternoon', isAvailable: true },
  { time: '06:15 PM', period: 'Evening', isAvailable: true },
  { time: '07:30 PM', period: 'Evening', isAvailable: true },
];

export const BookingFlowScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialParams = route?.params || {};

  // Flow step: 1 = Service, 2 = Slot, 3 = Intake, 4 = Payment, 5 = Confirmation
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (initialParams.step) return initialParams.step;
    return initialParams.serviceId ? 2 : 1;
  });

  // Step 1: Selected Service
  const [selectedService, setSelectedService] = useState<ServiceOption>(() => {
    if (initialParams.serviceId) {
      const found = SERVICES.find((s) => s.id === initialParams.serviceId);
      if (found) return found;
    }
    return SERVICES[0];
  });

  // Step 2: Selected Slot
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTime, setSelectedTime] = useState('10:30 AM');

  // Step 3: Intake Form
  const [chiefComplaint, setChiefComplaint] = useState(
    'Persistent right knee pain and stiffness when climbing stairs or walking long distances.'
  );
  const [duration, setDuration] = useState('1 to 4 weeks');
  const [hasPriorImaging, setHasPriorImaging] = useState(true);

  // Step 4: Checkout & Payment
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Step 5: Confirmed Consultation Record
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  const handleNextFromService = () => {
    setCurrentStep(2);
  };

  const handleNextFromSlot = () => {
    setCurrentStep(3);
  };

  const handleNextFromIntake = () => {
    setCurrentStep(4);
  };

  const handleExecutePayment = async () => {
    setIsProcessingPayment(true);
    try {
      // Simulate gateway authorization & backend confirmation
      setTimeout(async () => {
        try {
          const newCons = await consultationsApi.bookScheduled({
            serviceId: selectedService.id,
            specialtyId: selectedService.id,
            startsAt: appointmentTime(DATES[selectedDateIdx].isoDate, selectedTime),
            concernId: 'knee-pain',
            intakeAnswers: {
              chiefComplaint,
              duration,
              hasPriorImaging,
            },
          });

          setConfirmedBooking(newCons);
          setIsProcessingPayment(false);
          setCurrentStep(5);
        } catch {
          setIsProcessingPayment(false);
          setCurrentStep(5);
        }
      }, 1200);
    } catch {
      setIsProcessingPayment(false);
    }
  };

  const consultationFee = selectedService.fee;
  const platformFee = 50;
  const gst = Math.round(platformFee * 0.18);
  const totalAmount = consultationFee + platformFee + gst;

  return (
    <View style={s.container}>
      {/* Header Bar */}
      <View style={s.headerBar}>
        <Pressable
          style={s.backBtn}
          onPress={() => {
            if (currentStep > 1 && currentStep < 5) {
              setCurrentStep((p) => p - 1);
            } else {
              navigation.goBack();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>

        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle}>
            {currentStep === 1
              ? 'Select Specialty Service'
              : currentStep === 2
              ? 'Choose Time Slot'
              : currentStep === 3
              ? 'Clinical Intake'
              : currentStep === 4
              ? 'Payment & Checkout'
              : 'Booking Confirmed'}
          </Text>
          {currentStep < 5 && (
            <Text style={s.stepIndicator}>Step {currentStep} of 4</Text>
          )}
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Step Progress Dots */}
      {currentStep < 5 && (
        <View style={s.progressRow}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                s.progressSegment,
                step <= currentStep && s.progressSegmentActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Main Content */}
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: SERVICE SELECTION (No doctor picking, pool assignment) */}
        {currentStep === 1 && (
          <View style={s.stepContainer}>
            <View style={s.governanceBanner}>
              <Icon name="shieldCheck" size={18} color="#0E766C" />
              <Text style={s.governanceText}>
                No Doctor Picking: CoraCure pool automatically assigns the best certified specialist on duty for your chosen specialty.
              </Text>
            </View>

            <Text style={s.sectionHeading}>Available Specialty Services</Text>

            <View style={s.servicesList}>
              {SERVICES.map((srv) => {
                const isSelected = selectedService.id === srv.id;
                return (
                  <Pressable
                    key={srv.id}
                    style={[s.serviceOptionCard, isSelected && s.serviceOptionSelected]}
                    onPress={() => setSelectedService(srv)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${srv.name}`}
                  >
                    <View style={s.serviceTop}>
                      <View
                        style={[
                          s.serviceIconCircle,
                          { backgroundColor: isSelected ? '#0E766C' : '#EEF8F5' },
                        ]}
                      >
                        <Icon
                          name={srv.icon}
                          size={20}
                          color={isSelected ? colors.white : colors.surfie}
                        />
                      </View>

                      <View style={s.serviceHeadText}>
                        <Text style={s.serviceCardTitle}>{srv.name}</Text>
                        <Text style={s.providerLabel}>{srv.providerType} • {srv.duration} mins</Text>
                      </View>

                      <Text style={s.feeDisplay}>₹{srv.fee}</Text>
                    </View>

                    <Text style={s.serviceCardDesc}>{srv.desc}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={s.primaryPillBtn}
              onPress={handleNextFromService}
              accessibilityRole="button"
              accessibilityLabel="Continue to slot selection"
            >
              <Text style={s.primaryPillBtnText}>Continue to Time Slots</Text>
              <View style={s.arrowCircle}>
                <Icon name="arrowRight" size={16} color={colors.surfie} />
              </View>
            </Pressable>
          </View>
        )}

        {/* STEP 2: POOL SLOT PICKER */}
        {currentStep === 2 && (
          <View style={s.stepContainer}>
            <View style={s.selectedServiceSummary}>
              <View style={s.summaryIconCircle}>
                <Icon name="stethoscope" size={20} color={colors.surfie} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.summaryTitle}>{selectedService.name}</Text>
                <Text style={s.summarySub}>
                  {selectedService.providerType} • ₹{selectedService.fee}
                </Text>
              </View>
            </View>

            <Text style={s.sectionHeading}>Select Date</Text>
            <View style={s.dateRow}>
              {DATES.map((d, idx) => {
                const isSelected = selectedDateIdx === idx;
                return (
                  <Pressable
                    key={d.label}
                    style={[s.dateChip, isSelected && s.dateChipSelected]}
                    onPress={() => setSelectedDateIdx(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select date ${d.dateStr}`}
                  >
                    <Text style={[s.dateLabel, isSelected && s.dateLabelSelected]}>
                      {d.label}
                    </Text>
                    <Text style={[s.dateSub, isSelected && s.dateSubSelected]}>
                      {d.dateStr}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.sectionHeading}>Select Time Slot (Pool Availability)</Text>
            <View style={s.slotsGrid}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedTime === slot.time;
                return (
                  <Pressable
                    key={slot.time}
                    style={[s.slotBox, isSelected && s.slotBoxSelected]}
                    onPress={() => setSelectedTime(slot.time)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${slot.time} slot`}
                  >
                    <Icon
                      name="clock"
                      size={16}
                      color={isSelected ? colors.white : colors.surfie}
                    />
                    <Text style={[s.slotTimeText, isSelected && s.slotTimeSelected]}>
                      {slot.time}
                    </Text>
                    <Text style={[s.slotPeriodText, isSelected && s.slotPeriodSelected]}>
                      {slot.period}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.poolNoteCard}>
              <Icon name="info" size={16} color="#0E766C" />
              <Text style={s.poolNoteText}>
                Slots are guaranteed by doctors on shift. An Orthopedic specialist will be locked in for your call.
              </Text>
            </View>

            <Pressable
              style={s.primaryPillBtn}
              onPress={handleNextFromSlot}
              accessibilityRole="button"
              accessibilityLabel="Continue to intake questionnaire"
            >
              <Text style={s.primaryPillBtnText}>Continue to Medical Intake</Text>
              <View style={s.arrowCircle}>
                <Icon name="arrowRight" size={16} color={colors.surfie} />
              </View>
            </Pressable>
          </View>
        )}

        {/* STEP 3: CLINICAL INTAKE (PT-11-01, PT-11-03) */}
        {currentStep === 3 && (
          <View style={s.stepContainer}>
            <View style={s.intakeNotice}>
              <Text style={s.intakeNoticeTitle}>Pre-Consultation Clinical Intake</Text>
              <Text style={s.intakeNoticeDesc}>
                Your doctor will review your notes before connecting to optimize your consultation time.
              </Text>
            </View>

            <View style={s.formGroup}>
              <Text style={s.fieldLabel}>What symptoms or concerns are you experiencing? *</Text>
              <TextInput
                style={s.textArea}
                multiline
                numberOfLines={4}
                value={chiefComplaint}
                onChangeText={setChiefComplaint}
                placeholder="Describe your pain, symptoms, or what brought you in today..."
                placeholderTextColor={colors.inkFaint}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.fieldLabel}>How long have you had this issue?</Text>
              <View style={s.durationChipsRow}>
                {['< 1 week', '1 to 4 weeks', '1 to 3 months', '> 3 months'].map((d) => (
                  <Pressable
                    key={d}
                    style={[s.durationChip, duration === d && s.durationChipSelected]}
                    onPress={() => setDuration(d)}
                    accessibilityRole="button"
                    accessibilityLabel={`Duration: ${d}`}
                  >
                    <Text
                      style={[
                        s.durationChipText,
                        duration === d && s.durationChipTextSelected,
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.fieldLabel}>Do you have prior imaging or tests (X-Ray, MRI, Blood Test)?</Text>
              <View style={s.imagingToggleRow}>
                <Pressable
                  style={[s.toggleBtn, hasPriorImaging && s.toggleBtnSelected]}
                  onPress={() => setHasPriorImaging(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Yes, prior imaging exists"
                >
                  <Icon
                    name="check"
                    size={16}
                    color={hasPriorImaging ? colors.white : colors.ink}
                  />
                  <Text style={[s.toggleText, hasPriorImaging && s.toggleTextSelected]}>
                    Yes, I have reports
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.toggleBtn, !hasPriorImaging && s.toggleBtnSelected]}
                  onPress={() => setHasPriorImaging(false)}
                  accessibilityRole="button"
                  accessibilityLabel="No prior imaging"
                >
                  <Text style={[s.toggleText, !hasPriorImaging && s.toggleTextSelected]}>
                    No prior reports
                  </Text>
                </Pressable>
              </View>
              {hasPriorImaging && (
                <Text style={s.imagingHelperText}>
                  You can upload your reports under Medical Reports or in the pre-call check.
                </Text>
              )}
            </View>

            <Pressable
              style={s.primaryPillBtn}
              onPress={handleNextFromIntake}
              accessibilityRole="button"
              accessibilityLabel="Continue to itemized bill and payment"
            >
              <Text style={s.primaryPillBtnText}>Proceed to Checkout</Text>
              <View style={s.arrowCircle}>
                <Icon name="arrowRight" size={16} color={colors.surfie} />
              </View>
            </Pressable>
          </View>
        )}

        {/* STEP 4: ITEMIZED BILL & CHECKOUT (PT-12-01, PT-12-02) */}
        {currentStep === 4 && (
          <View style={s.stepContainer}>
            {/* Itemized Bill Card */}
            <View style={s.billCard}>
              <Text style={s.billTitle}>Itemized Consultation Invoice</Text>

              <View style={s.billRow}>
                <Text style={s.billLabel}>
                  {selectedService.name} ({selectedService.duration} mins)
                </Text>
                <Text style={s.billVal}>₹{consultationFee}</Text>
              </View>

              <View style={s.billRow}>
                <Text style={s.billLabel}>Platform & Convenience Fee</Text>
                <Text style={s.billVal}>₹{platformFee}</Text>
              </View>

              <View style={s.billRow}>
                <Text style={s.billLabel}>GST (18% on convenience fee)</Text>
                <Text style={s.billVal}>₹{gst}</Text>
              </View>

              <View style={s.billDivider} />

              <View style={s.billTotalRow}>
                <Text style={s.totalLabel}>Total Payable</Text>
                <Text style={s.totalVal}>₹{totalAmount}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <Text style={s.sectionHeading}>Select Payment Method</Text>

            <View style={s.paymentMethodsList}>
              {/* UPI */}
              <Pressable
                style={[s.methodCard, paymentMethod === 'upi' && s.methodCardSelected]}
                onPress={() => setPaymentMethod('upi')}
                accessibilityRole="button"
                accessibilityLabel="Pay via UPI"
              >
                <View style={s.methodLeft}>
                  <View style={s.methodIconCircle}>
                    <Icon name="wallet" size={18} color={colors.surfie} />
                  </View>
                  <View>
                    <Text style={s.methodName}>Instant UPI</Text>
                    <Text style={s.methodSub}>Google Pay, PhonePe, Paytm, BHIM</Text>
                  </View>
                </View>
                <View
                  style={[
                    s.radioOuter,
                    paymentMethod === 'upi' && s.radioOuterSelected,
                  ]}
                >
                  {paymentMethod === 'upi' && <View style={s.radioInner} />}
                </View>
              </Pressable>

              {/* Credit/Debit Card */}
              <Pressable
                style={[s.methodCard, paymentMethod === 'card' && s.methodCardSelected]}
                onPress={() => setPaymentMethod('card')}
                accessibilityRole="button"
                accessibilityLabel="Pay via Credit or Debit Card"
              >
                <View style={s.methodLeft}>
                  <View style={s.methodIconCircle}>
                    <Icon name="idCard" size={18} color={colors.surfie} />
                  </View>
                  <View>
                    <Text style={s.methodName}>Credit / Debit Card</Text>
                    <Text style={s.methodSub}>Visa, Mastercard, RuPay</Text>
                  </View>
                </View>
                <View
                  style={[
                    s.radioOuter,
                    paymentMethod === 'card' && s.radioOuterSelected,
                  ]}
                >
                  {paymentMethod === 'card' && <View style={s.radioInner} />}
                </View>
              </Pressable>

              {/* Net Banking */}
              <Pressable
                style={[s.methodCard, paymentMethod === 'netbanking' && s.methodCardSelected]}
                onPress={() => setPaymentMethod('netbanking')}
                accessibilityRole="button"
                accessibilityLabel="Pay via Net Banking"
              >
                <View style={s.methodLeft}>
                  <View style={s.methodIconCircle}>
                    <Icon name="globe" size={18} color={colors.surfie} />
                  </View>
                  <View>
                    <Text style={s.methodName}>Net Banking</Text>
                    <Text style={s.methodSub}>All major Indian banks</Text>
                  </View>
                </View>
                <View
                  style={[
                    s.radioOuter,
                    paymentMethod === 'netbanking' && s.radioOuterSelected,
                  ]}
                >
                  {paymentMethod === 'netbanking' && <View style={s.radioInner} />}
                </View>
              </Pressable>
            </View>

            <View style={s.refundGuaranteeRow}>
              <Icon name="shieldCheck" size={16} color="#0E766C" />
              <Text style={s.refundGuaranteeText}>
                100% Refund Guarantee: Cancel anytime up to 2 hours before the start time with zero cancellation fee.
              </Text>
            </View>

            <Pressable
              style={[s.primaryPillBtn, isProcessingPayment && s.primaryPillBtnDisabled]}
              onPress={handleExecutePayment}
              disabled={isProcessingPayment}
              accessibilityRole="button"
              accessibilityLabel={`Pay rupees ${totalAmount} and confirm booking`}
            >
              {isProcessingPayment ? (
                <View style={s.loadingBtnContent}>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={s.primaryPillBtnText}>Confirming demo booking...</Text>
                </View>
              ) : (
                <>
                  <Text style={s.primaryPillBtnText}>Pay ₹{totalAmount} & Confirm</Text>
                  <View style={s.arrowCircle}>
                    <Icon name="arrowRight" size={16} color={colors.surfie} />
                  </View>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* STEP 5: BOOKING CONFIRMATION VOUCHER */}
        {currentStep === 5 && (
          <View style={s.stepContainer}>
            <View style={s.successHeaderCard}>
              <View style={s.successCheckCircle}>
                <Icon name="check" size={32} color={colors.white} />
              </View>
              <Text style={s.successHeading}>Appointment Confirmed!</Text>
              <Text style={s.successSub}>
                Your teleconsultation has been confirmed and scheduled with our clinical team.
              </Text>
            </View>

            {/* Voucher Card */}
            <View style={s.voucherCard}>
              <View style={s.voucherHeader}>
                <Text style={s.voucherRef}>
                  Ref: {confirmedBooking?.referenceCode || 'CC-2026-8841'}
                </Text>
                <View style={s.confirmedBadge}>
                  <Text style={s.confirmedBadgeText}>Confirmed</Text>
                </View>
              </View>

              <View style={s.voucherBody}>
                <View style={s.voucherDetailRow}>
                  <Text style={s.voucherField}>Specialty Service</Text>
                  <Text style={s.voucherVal}>{selectedService.name}</Text>
                </View>

                <View style={s.voucherDetailRow}>
                  <Text style={s.voucherField}>Assigned Doctor</Text>
                  <Text style={s.voucherVal}>Dr. Richard Parker</Text>
                </View>

                <View style={s.voucherDetailRow}>
                  <Text style={s.voucherField}>Date & Time</Text>
                  <Text style={s.voucherVal}>
                    {DATES[selectedDateIdx].dateStr}, {selectedTime}
                  </Text>
                </View>

                <View style={s.voucherDetailRow}>
                  <Text style={s.voucherField}>Total Paid</Text>
                  <Text style={s.voucherVal}>₹{totalAmount} (Demo - no charge)</Text>
                </View>
              </View>

              <View style={s.voucherInstructions}>
                <Icon name="info" size={16} color="#0E766C" />
                <Text style={s.instructionText}>
                  Please run the audio & video Device Check before entering the live call room.
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <Pressable
              style={s.primaryPillBtn}
              onPress={() =>
                navigation.navigate('DeviceCheck', {
                  consultationId: confirmedBooking?.id || 'cons-001',
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Run Pre-Call Device Check"
            >
              <Text style={s.primaryPillBtnText}>Run Pre-Call Device Check</Text>
              <View style={s.arrowCircle}>
                <Icon name="arrowRight" size={16} color={colors.surfie} />
              </View>
            </Pressable>

            <Pressable
              style={s.secondaryOutlineBtn}
              onPress={() => navigation.navigate('MainTabs')}
              accessibilityRole="button"
              accessibilityLabel="Go to Dashboard"
            >
              <Text style={s.secondaryOutlineText}>Return to Home</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  stepIndicator: {
    fontSize: 12,
    color: colors.surfie,
    fontWeight: '600',
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressSegmentActive: {
    backgroundColor: colors.surfie,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  stepContainer: {
    gap: spacing.lg,
  },
  governanceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EEF8F5',
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  governanceText: {
    flex: 1,
    fontSize: 12,
    color: '#0E766C',
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  servicesList: {
    gap: spacing.md,
  },
  serviceOptionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
  },
  serviceOptionSelected: {
    borderColor: colors.surfie,
    backgroundColor: '#FCFDFD',
  },
  serviceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceHeadText: {
    flex: 1,
  },
  serviceCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  providerLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  feeDisplay: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surfie,
  },
  serviceCardDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  selectedServiceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  summarySub: {
    fontSize: 12,
    color: colors.surfie,
    fontWeight: '600',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 3,
  },
  dateChipSelected: {
    backgroundColor: '#EEF8F5',
    borderColor: colors.surfie,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  dateLabelSelected: {
    color: colors.surfie,
  },
  dateSub: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  dateSubSelected: {
    color: colors.surfie,
    fontWeight: '600',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotBox: {
    width: '31%',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  slotBoxSelected: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  slotTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  slotTimeSelected: {
    color: colors.white,
  },
  slotPeriodText: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  slotPeriodSelected: {
    color: '#A7F3D0',
  },
  poolNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF8F5',
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  poolNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#0E766C',
    lineHeight: 16,
  },
  intakeNotice: {
    backgroundColor: '#EEF8F5',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  intakeNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0E766C',
  },
  intakeNoticeDesc: {
    fontSize: 12,
    color: '#0E766C',
    lineHeight: 17,
  },
  formGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  textArea: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    fontSize: 14,
    color: colors.ink,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  durationChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  durationChipSelected: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  durationChipText: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: '500',
  },
  durationChipTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  imagingToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.input,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  toggleBtnSelected: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  toggleTextSelected: {
    color: colors.white,
  },
  imagingHelperText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: 'italic',
  },
  billCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  billVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.surfie,
  },
  paymentMethodsList: {
    gap: 10,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  methodCardSelected: {
    borderColor: colors.surfie,
    backgroundColor: '#FCFDFD',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  methodSub: {
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.surfie,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfie,
  },
  refundGuaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF8F5',
    padding: 10,
    borderRadius: radius.card,
  },
  refundGuaranteeText: {
    flex: 1,
    fontSize: 11,
    color: '#0E766C',
    lineHeight: 15,
  },
  primaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfie,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 10,
    marginTop: spacing.sm,
  },
  primaryPillBtnDisabled: {
    opacity: 0.7,
  },
  primaryPillBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryOutlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginTop: spacing.xs,
  },
  secondaryOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  successHeaderCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 8,
  },
  successCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  successSub: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  voucherCard: {
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#FCFDFD',
    gap: spacing.md,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
  },
  voucherRef: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  confirmedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  voucherBody: {
    gap: 8,
  },
  voucherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherField: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  voucherVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  voucherInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF8F5',
    padding: 10,
    borderRadius: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 11,
    color: '#0E766C',
    lineHeight: 15,
  },
});

export default BookingFlowScreen;

