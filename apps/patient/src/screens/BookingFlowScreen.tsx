import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import { ScreenBackground } from '../components/ScreenBackground';
import { consultationsApi } from '@coracure/api';
import { upcomingDates, appointmentTime } from '../utils/appointmentTime';
import { findDoctor } from '../data/doctors';

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

/** How long a pending_payment consultation holds the slot. */
const HOLD_SECONDS = 10 * 60;

/** The gateway's methods, in the order the mock lists them. */
const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI', sub: 'Pay using any UPI app', icon: 'wallet' },
  { id: 'card', name: 'Debit / Credit Cards', sub: 'Visa, Mastercard, Rupay & more', icon: 'idCard' },
  { id: 'netbanking', name: 'Netbanking', sub: 'All major banks supported', icon: 'globe' },
  { id: 'wallet', name: 'Wallets', sub: 'Paytm, PhonePe, Amazon Pay & more', icon: 'tag' },
] as const;

/** The three questions the intake asks, each answered from a short list. */
const INTAKE_QUESTIONS = [
  {
    id: 'duration',
    label: 'How long have you been experiencing this?',
    options: ['Less than a week', '1 to 4 weeks', '1 to 3 months', 'More than 3 months'],
  },
  {
    id: 'severity',
    label: 'How severe are your symptoms?',
    options: ['Mild', 'Moderate', 'Severe'],
  },
  {
    id: 'seen_before',
    label: 'Have you consulted a doctor for this before?',
    options: ['No, this is the first time', 'Yes, recently', 'Yes, some time ago'],
  },
];

/** Stands in for `GET /documents` until the uploader is wired. */
const UPLOADED_REPORTS = [
  { name: 'Blood Test Report.pdf', when: '15 May 2026', size: '1.2 MB' },
  { name: 'X-Ray Chest.pdf', when: '15 May 2026', size: '820 KB' },
];

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
    // Arriving from the slot screen: the doctor already fixed the service and fee.
    if (initialParams.serviceName) {
      const doctor = findDoctor(initialParams.doctorId);
      return {
        id: doctor.id,
        name: initialParams.serviceName,
        providerType: doctor.name,
        duration: doctor.durationMins,
        fee: initialParams.fee ?? doctor.fee,
        desc: doctor.about,
        icon: 'stethoscope',
      };
    }
    return SERVICES[0];
  });

  // Step 2: Selected Slot
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTime, setSelectedTime] = useState(
    () => (initialParams.slot as string | undefined)?.split(', ').pop() || '10:30 AM'
  );

  // Step 3: Intake Form
  const [chiefComplaint, setChiefComplaint] = useState('');
  /** The three quick questions, each an accordion with one answer. */
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<{ name: string; dose: string }[]>([]);

  // Step 4: Checkout & Payment
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  /** Seconds left on the slot hold. The backend expires it server-side too. */
  const [holdLeft, setHoldLeft] = useState(HOLD_SECONDS);

  useEffect(() => {
    if (currentStep !== 4) return;
    const id = setInterval(() => setHoldLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [currentStep]);

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
              ...answers,
              currentMedicines: medicines.map((m) => m.name),
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

  const bookedDoctor = findDoctor(initialParams.doctorId);
  const consultationFee = selectedService.fee;
  const convenienceFee = 49;
  const subtotal = consultationFee + convenienceFee;
  const gst = Math.round(subtotal * 0.18 * 100) / 100;
  const totalAmount = Math.round((subtotal + gst) * 100) / 100;
  const holdMmSs = `${String(Math.floor(holdLeft / 60)).padStart(2, '0')}:${String(holdLeft % 60).padStart(2, '0')}`;

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
              ? 'Pre-Consult Intake'
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
        keyboardShouldPersistTaps="handled"
      >
        <ScreenBackground name="slot" scrolls />
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

        {/* STEP 3: PRE-CONSULT INTAKE */}
        {currentStep === 3 && (
          <View style={s.stepContainer}>
            {/* 1. Main concern */}
            <View style={s.intakeCard}>
              <Text style={s.intakeCardTitle}>1. Tell us your main concern</Text>
              <View style={s.intakeTextBox}>
                <TextInput
                  style={s.intakeTextArea}
                  multiline
                  value={chiefComplaint}
                  onChangeText={setChiefComplaint}
                  maxLength={500}
                  placeholder="Describe your symptoms or concern in your own words..."
                  placeholderTextColor={colors.inkFaint}
                  accessibilityLabel="Describe your main concern"
                />
                <Text style={s.intakeCount}>{chiefComplaint.length}/500</Text>
              </View>
            </View>

            {/* 2. Quick questions */}
            <View style={s.intakeCard}>
              <Text style={s.intakeCardTitle}>2. A few quick questions</Text>
              <View style={s.servicePill}>
                <View style={s.servicePillDot} />
                <Text style={s.servicePillText}>{selectedService.name}</Text>
              </View>

              {INTAKE_QUESTIONS.map((q) => {
                const open = openQuestion === q.id;
                return (
                  <View key={q.id} style={s.questionBox}>
                    <Pressable
                      style={s.questionHead}
                      onPress={() => setOpenQuestion(open ? null : q.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      accessibilityLabel={q.label}
                    >
                      <View style={s.flex}>
                        <Text style={s.questionText} numberOfLines={2}>{q.label}</Text>
                        {answers[q.id] && <Text style={s.questionAnswer}>{answers[q.id]}</Text>}
                      </View>
                      <Icon
                        name={open ? 'chevronUp' : 'chevronDown'}
                        size={18}
                        color={colors.inkMuted}
                      />
                    </Pressable>

                    {open && (
                      <View style={s.questionOptions}>
                        {q.options.map((opt) => (
                          <Pressable
                            key={opt}
                            style={[s.questionOpt, answers[q.id] === opt && s.questionOptOn]}
                            onPress={() => {
                              setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                              setOpenQuestion(null);
                            }}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: answers[q.id] === opt }}
                            accessibilityLabel={opt}
                          >
                            <Text
                              style={[
                                s.questionOptText,
                                answers[q.id] === opt && s.questionOptTextOn,
                              ]}
                              numberOfLines={2}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* 3. Current medicines */}
            <View style={s.intakeCard}>
              <View style={s.intakeCardHeadWrap}>
                <Text style={s.intakeCardTitle}>
                  3. Current medicines <Text style={s.optional}>(optional)</Text>
                </Text>
                <Pressable
                  style={s.addMedBtn}
                  onPress={() =>
                    setMedicines((prev) => [
                      ...prev,
                      { name: 'Paracetamol 500 mg', dose: '1 tablet • As needed' },
                    ])
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Add medicine"
                >
                  <Icon name="plus" size={16} color={colors.surfie} />
                  <Text style={s.addMedText}>Add Medicine</Text>
                </Pressable>
              </View>
              <Text style={s.intakeCardSub}>Add any medicines you are currently taking</Text>

              {medicines.map((m, i) => (
                <View key={`${m.name}-${i}`} style={s.medPill}>
                  <Icon name="checkCircle" size={20} color={colors.surfie} filled />
                  <View style={s.flex}>
                    <Text style={s.medPillName}>{m.name}</Text>
                    <Text style={s.medPillDose}>{m.dose}</Text>
                  </View>
                  <Pressable
                    hitSlop={10}
                    onPress={() => setMedicines((prev) => prev.filter((_, idx) => idx !== i))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${m.name}`}
                  >
                    <Icon name="close" size={16} color={colors.inkMuted} />
                  </Pressable>
                </View>
              ))}
            </View>

            {/* 4. Reports */}
            <View style={s.intakeCard}>
              <View style={s.intakeCardHead}>
                <Text style={s.intakeCardTitle}>
                  4. Upload relevant reports <Text style={s.optional}>(optional)</Text>
                </Text>
                <Text style={s.uploadCount}>
                  <Text style={s.uploadCountNum}>{UPLOADED_REPORTS.length}/5</Text> uploaded
                </Text>
              </View>
              <Text style={s.intakeCardSub}>Share any recent test reports or documents</Text>

              {UPLOADED_REPORTS.map((r) => (
                <Pressable
                  key={r.name}
                  style={s.reportRow}
                  onPress={() => navigation.navigate('Reports')}
                  accessibilityRole="button"
                  accessibilityLabel={r.name}
                >
                  <Text style={s.reportName} numberOfLines={1}>{r.name}</Text>
                  <Text style={s.reportMeta} numberOfLines={1}>
                    {r.when} • {r.size}
                  </Text>
                  <View style={s.uploadedPill}>
                    <Text style={s.uploadedText}>Uploaded</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={s.safeCard}>
              <View style={s.safeIconOn}>
                <Icon name="shieldCheck" size={22} color={colors.white} />
              </View>
              <View style={s.flex}>
                <Text style={s.safeTitle}>Your information is safe with us</Text>
                <Text style={s.safeSub}>
                  By proceeding, you agree to our{' '}
                  <Text
                    style={s.safeLink}
                    onPress={() => navigation.navigate('LegalPolicy')}
                  >
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={s.safeLink}
                    onPress={() => navigation.navigate('LegalPolicy')}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </View>
            </View>

            <Pressable
              style={s.primaryPillBtn}
              onPress={handleNextFromIntake}
              accessibilityRole="button"
              accessibilityLabel="Continue to payment"
            >
              <Text style={s.primaryPillBtnText}>Continue to Payment</Text>
              <View style={s.arrowCircle}>
                <Icon name="arrowRight" size={16} color={colors.surfie} />
              </View>
            </Pressable>
          </View>
        )}

        {/* STEP 4: REVIEW & PAY */}
        {currentStep === 4 && (
          <View style={s.stepContainer}>
            <View style={s.reviewHead}>
              <View style={s.flex}>
                <Text style={s.reviewTitle}>Review & Pay</Text>
              </View>
              <View style={[s.holdPill, holdLeft === 0 && s.holdPillExpired]}>
                <Icon
                  name="clock"
                  size={15}
                  color={holdLeft === 0 ? colors.danger : colors.surfie}
                />
                <Text style={[s.holdText, holdLeft === 0 && s.holdTextExpired]}>
                  {holdLeft === 0 ? 'Hold expired' : 'Slot held for '}
                  {holdLeft > 0 && <Text style={s.holdCount}>{holdMmSs}</Text>}
                </Text>
              </View>
            </View>

            {/* Who, when, how */}
            <View style={s.reviewCard}>
              <View style={s.reviewDocRow}>
                <View>
                  <Image source={bookedDoctor.img} style={s.reviewPhoto} resizeMode="cover" />
                  <View style={s.reviewOnlineDot} />
                </View>
                <View style={s.flex}>
                  <Text style={s.reviewDocName}>{bookedDoctor.name}</Text>
                  <Text style={s.reviewDocSpecialty}>{bookedDoctor.specialty}</Text>
                  <Text style={s.reviewDocMeta}>
                    {bookedDoctor.qualification} • {bookedDoctor.years}+ years experience
                  </Text>
                </View>
              </View>

              <View style={s.reviewRule} />

              <View style={s.reviewWhenRow}>
                <View style={s.reviewWhenCol}>
                  <Icon name="calendar" size={20} color={colors.surfie} />
                  <View>
                    <Text style={s.reviewWhenLabel}>Date</Text>
                    <Text style={s.reviewWhenValue}>{DATES[selectedDateIdx].dateStr}</Text>
                  </View>
                </View>
                <View style={s.reviewWhenRule} />
                <View style={s.reviewWhenCol}>
                  <Icon name="clock" size={20} color={colors.surfie} />
                  <View>
                    <Text style={s.reviewWhenLabel}>Time</Text>
                    <Text style={s.reviewWhenValue}>{selectedTime}</Text>
                  </View>
                </View>
                <View style={s.reviewWhenRule} />
                <View style={s.reviewWhenCol}>
                  <Icon name="video" size={20} color={colors.surfie} />
                  <View>
                    <Text style={s.reviewWhenLabel}>Consultation</Text>
                    <Text style={s.reviewWhenValue}>Video</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* What it costs */}
            <View style={s.reviewCard}>
              <Text style={s.billTitle}>Bill Breakdown</Text>

              <View style={s.billRow}>
                <Text style={s.billLabel}>Doctor Consultation Fee</Text>
                <Text style={s.billVal}>₹{consultationFee.toFixed(2)}</Text>
              </View>
              <View style={s.billRow}>
                <View style={s.billLabelRow}>
                  <Text style={s.billLabel}>Convenience Fee</Text>
                  <Icon name="info" size={14} color={colors.inkFaint} />
                </View>
                <Text style={s.billVal}>₹{convenienceFee.toFixed(2)}</Text>
              </View>

              <View style={s.billDivider} />

              <View style={s.billRow}>
                <Text style={s.billLabel}>Subtotal (Before GST)</Text>
                <Text style={s.billVal}>₹{subtotal.toFixed(2)}</Text>
              </View>
              <View style={s.billRow}>
                <Text style={s.billLabel}>GST (18%)</Text>
                <Text style={s.billVal}>₹{gst.toFixed(2)}</Text>
              </View>

              <View style={s.billDivider} />

              <View style={s.billTotalRow}>
                <Text style={s.totalLabel}>Total Payable</Text>
                <Text style={s.totalVal}>₹{totalAmount.toFixed(2)}</Text>
              </View>

              <View style={s.commissionNote}>
                <View style={s.commissionShield}>
                  <Icon name="shieldCheck" size={20} color={colors.white} />
                </View>
                <Text style={s.commissionText}>
                  The full consultation fee (₹{consultationFee.toFixed(2)}) goes directly to the
                  doctor. CoraCure does not deduct any commission from it.
                </Text>
              </View>
            </View>

            {/* How to pay */}
            <View style={s.reviewCard}>
              <Text style={s.billTitle}>Choose a payment method</Text>

              {PAYMENT_METHODS.map((m, i) => (
                <Pressable
                  key={m.id}
                  style={[s.methodRow, i > 0 && s.methodRowRuled]}
                  onPress={() => setPaymentMethod(m.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: paymentMethod === m.id }}
                  accessibilityLabel={`Pay by ${m.name}`}
                >
                  <View
                    style={[s.methodIconCircle, paymentMethod === m.id && s.methodIconCircleOn]}
                  >
                    <Icon name={m.icon} size={20} color={colors.surfie} />
                  </View>
                  <View style={s.flex}>
                    <Text style={s.methodName}>{m.name}</Text>
                    <Text style={s.methodSub}>{m.sub}</Text>
                  </View>
                  {paymentMethod === m.id ? (
                    <Icon name="checkCircle" size={20} color={colors.surfie} filled />
                  ) : (
                    <Icon name="chevronRight" size={18} color={colors.inkFaint} />
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[
                s.payBtn,
                (isProcessingPayment || holdLeft === 0) && s.primaryPillBtnDisabled,
              ]}
              onPress={handleExecutePayment}
              disabled={isProcessingPayment || holdLeft === 0}
              accessibilityRole="button"
              accessibilityLabel={`Pay rupees ${totalAmount} now`}
            >
              {isProcessingPayment ? (
                <View style={s.loadingBtnContent}>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={s.primaryPillBtnText}>Confirming your booking...</Text>
                </View>
              ) : (
                <>
                  <Icon name="lock" size={18} color={colors.white} />
                  <Text style={s.primaryPillBtnText}>
                    {holdLeft === 0 ? 'Slot hold expired' : `Pay Now ₹${totalAmount.toFixed(2)}`}
                  </Text>
                </>
              )}
            </Pressable>

            <View style={s.securedRow}>
              <Icon name="lock" size={13} color={colors.inkFaint} />
              <Text style={s.securedText}>Payments are secured by our payment partner</Text>
            </View>
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
  /* ------------------------------- review & pay ------------------------------ */
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  reviewTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '700',
    color: colors.ink,
  },
  holdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
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
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  reviewDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reviewPhoto: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface.mintSoft,
  },
  reviewOnlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.surfie,
    borderWidth: 2,
    borderColor: colors.white,
  },
  reviewDocName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
  },
  reviewDocSpecialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: 1,
  },
  reviewDocMeta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 3,
  },
  reviewRule: {
    height: 1,
    backgroundColor: colors.surface.line,
    marginVertical: spacing.md,
  },
  reviewWhenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewWhenCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewWhenLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  reviewWhenValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  reviewWhenRule: {
    width: 1,
    height: 32,
    backgroundColor: colors.surface.line,
    marginHorizontal: spacing.sm,
  },
  billLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  commissionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  commissionShield: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  methodRowRuled: {
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  methodIconCircleOn: { backgroundColor: colors.surface.selected },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfie,
    marginTop: spacing.lg,
  },
  securedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  securedText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkFaint,
  },

  flex: { flex: 1 },

  /* ---------------------------- pre-consult intake --------------------------- */
  intakeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  intakeCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  intakeCardTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  intakeCardSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 3,
  },
  optional: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '400',
    color: colors.inkFaint,
  },
  intakeTextBox: {
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  intakeTextArea: {
    minHeight: 96,
    textAlignVertical: 'top',
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  intakeCount: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    textAlign: 'right',
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  servicePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfie,
  },
  servicePillText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.surfie,
  },
  questionBox: {
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  questionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  questionText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  questionAnswer: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
    marginTop: 2,
  },
  questionOptions: {
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  questionOpt: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  questionOptOn: { backgroundColor: colors.surface.mintSoft },
  questionOptText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
  },
  questionOptTextOn: { color: colors.surfie, fontWeight: '700' },
  intakeCardHeadWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surfie,
  },
  addMedText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.surfie,
  },
  medPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  medPillName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  medPillDose: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 1,
  },
  uploadCount: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  uploadCountNum: {
    fontFamily: typography.heading.family,
    fontWeight: '700',
    color: colors.surfie,
  },
  reportRow: {
    /* Stacked: the pill clipped when it shared a row with the file name. */
    alignItems: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  reportName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  reportMeta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
  },
  uploadedPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginTop: 6,
  },
  uploadedText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  safeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  safeIconOn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  safeSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 19,
  },
  safeLink: { color: colors.surfie, fontWeight: '700' },

  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    /* Transparent so it reads as part of the page, not a floating bar. */
    backgroundColor: 'transparent',
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

