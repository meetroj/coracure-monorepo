import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, Icon } from '@coracure/ui';
import FlowHeader from '../components/FlowHeader';
import ScreenBackground from '../components/ScreenBackground';
import { findDoctor } from '../data/doctors';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AppointmentDetail'>;
type Rt = RouteProp<RootStackParamList, 'AppointmentDetail'>;

/**
 * One appointment, at a glance: who, when, how to join, what it cost and what
 * comes after. The card in the appointments list opens this, and the join
 * button hands off to the pre-call check rather than straight into the room.
 */
export const AppointmentDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const consultationId = route.params?.consultationId || 'cons-001';
  const doctor = findDoctor(route.params?.doctorId);

  /** Set by the backend from the slot; the window opens shortly before it. */
  const windowOpen = true;

  const fee = doctor.fee;
  const platformFee = 40;
  const tax = Math.round((fee + platformFee) * 0.18 * 100) / 100;
  const total = fee + platformFee + tax;

  return (
    <Screen
      contentStyle={s.content}
    >
      <ScreenBackground name="appointmentDetails" scrolls />
      <FlowHeader
        action="chat"
        dot={false}
        actionLabel="Chat with support"
        onAction={() => navigation.navigate('HelpSupport')}
      />

      <Text style={s.title} accessibilityRole="header">Appointment Details</Text>
      <Text style={s.lede}>Your consultation at a glance</Text>

      {/* Who and when */}
      <View style={s.card}>
        <View style={s.docRow}>
          <View style={s.docLeft}>
            <Image source={doctor.img} style={s.photo} resizeMode="cover" />

            <Pressable
              style={s.idBox}
              onPress={() => Alert.alert('Consultation ID', consultationId)}
              accessibilityRole="button"
              accessibilityLabel="Copy consultation ID"
            >
              <Text style={s.idLabel}>Consultation ID</Text>
              <View style={s.idValueRow}>
                <Text style={s.idValue} numberOfLines={1}>{consultationId}</Text>
                <Icon name="copy" size={13} color={colors.inkMuted} />
              </View>
            </Pressable>
          </View>

          <View style={s.docText}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>{doctor.name}</Text>
              <Icon name="checkCircle" size={16} color={colors.surfie} />
            </View>
            <Text style={s.specialty} numberOfLines={1}>{doctor.specialty}</Text>
            <Text style={s.meta} numberOfLines={2}>
              {doctor.qualification} • {doctor.years}+ years experience
            </Text>

            <View style={s.ratingPill}>
              <Icon name="star" size={14} color={colors.surfie} filled />
              <Text style={s.ratingText} numberOfLines={1}>
                {doctor.rating} ({doctor.reviews})
              </Text>
            </View>
          </View>
        </View>

        <View style={s.cardRule} />

        <View style={s.whenRow}>
          <View style={s.whenCol}>
            <View style={s.whenHead}>
              <Icon name="calendar" size={16} color={colors.surfie} />
              <Text style={s.whenLabel}>Date</Text>
            </View>
            <Text style={s.whenValue}>Friday, 16 May 2026</Text>
          </View>
          <View style={s.whenRule} />
          <View style={s.whenCol}>
            <View style={s.whenHead}>
              <Icon name="clock" size={16} color={colors.surfie} />
              <Text style={s.whenLabel}>Time</Text>
            </View>
            <Text style={s.whenValue}>10:30 AM</Text>
            <Text style={s.whenValue}>to 11:00 AM</Text>
          </View>
          <View style={s.whenRule} />
          <View style={s.whenCol}>
            <View style={s.whenHead}>
              <Icon name="globe" size={16} color={colors.surfie} />
              <Text style={s.whenLabel}>Language</Text>
            </View>
            <Text style={s.whenValue}>{doctor.languages.join(', ')}</Text>
          </View>
        </View>
      </View>

      {/* The join band, only live inside the window */}
      <View style={[s.joinCard, !windowOpen && s.joinCardShut]}>
        <Pressable
          style={[s.joinBtn, !windowOpen && s.joinBtnOff]}
          disabled={!windowOpen}
          onPress={() => navigation.navigate('DeviceCheck', { consultationId })}
          accessibilityRole="button"
          accessibilityLabel="Join consultation"
        >
          <Icon name="video" size={17} color={colors.white} />
          <Text style={s.joinBtnText} numberOfLines={1}>Join Consultation</Text>
        </Pressable>

        <Pressable
          style={s.joinCancelBtn}
          onPress={() => navigation.navigate('CancelRefund', { consultationId })}
          accessibilityRole="button"
          accessibilityLabel="Cancel appointment"
        >
          <Text style={s.joinCancelText} numberOfLines={1}>Cancel</Text>
        </Pressable>
      </View>

      {/* What lands afterwards */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>After your consultation</Text>
        <Text style={s.sectionSub}>Access your prescription, doctor's advice and reports here.</Text>

        <View style={s.afterRow}>
          <Pressable
            style={s.afterTile}
            onPress={() => navigation.navigate('Prescription')}
            accessibilityRole="button"
            accessibilityLabel="View prescription"
          >
            <View style={s.afterIcon}>
              <Icon name="prescription" size={18} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.afterTitle} numberOfLines={1}>Prescription</Text>
              <Text style={s.afterSub} numberOfLines={1}>After consult</Text>
            </View>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </Pressable>

          <Pressable
            style={s.afterTile}
            onPress={() => navigation.navigate('CarePlan', { consultationId })}
            accessibilityRole="button"
            accessibilityLabel="Doctor's advice"
          >
            <View style={s.afterIcon}>
              <Icon name="message" size={18} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.afterTitle} numberOfLines={1}>Advice</Text>
              <Text style={s.afterSub} numberOfLines={1}>After consult</Text>
            </View>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </Pressable>
        </View>
      </View>

      {/* What it cost */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Payment & Billing</Text>

        <View style={s.billRow}>
          <Text style={s.billLabel}>Consultation Fee</Text>
          <Text style={s.billValue}>₹{fee.toFixed(2)}</Text>
        </View>
        <View style={s.billRow}>
          <Text style={s.billLabel}>Platform Fee</Text>
          <Text style={s.billValue}>₹{platformFee.toFixed(2)}</Text>
        </View>
        <View style={s.billRow}>
          <Text style={s.billLabel}>Tax (18% GST)</Text>
          <Text style={s.billValue}>₹{tax.toFixed(2)}</Text>
        </View>

        <View style={s.cardRule} />

        <View style={s.billRow}>
          <Text style={s.totalLabel}>Total Paid</Text>
          <Text style={s.totalValue}>₹{total.toFixed(2)}</Text>
        </View>

        <View style={s.cardRule} />

        <View style={s.paidRow}>
          <View style={s.paidShield}>
            <Icon name="shieldCheck" size={18} color={colors.white} />
          </View>
          <View style={s.flex}>
            <Text style={s.paidTitle}>Payment completed</Text>
            <Text style={s.paidSub}>Paid on 15 May 2026, 08:45 PM</Text>
          </View>
          <Pressable
            style={s.invoiceBtn}
            onPress={() => Alert.alert('Invoice', 'Your invoice is being prepared for download.')}
            accessibilityRole="button"
            accessibilityLabel="Download invoice"
          >
            <Text style={s.invoiceText}>Download Invoice</Text>
            <Icon name="download" size={15} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      {/* What was sent ahead */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Uploaded Documents</Text>

        <Pressable
          style={s.docTile}
          onPress={() => navigation.navigate('Reports')}
          accessibilityRole="button"
          accessibilityLabel="ECG report"
        >
          <View style={s.docIcon}>
            <Icon name="document" size={18} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.afterTitle}>ECG Report</Text>
            <Text style={s.afterSub}>Uploaded on 15 May 2026</Text>
          </View>
          <Text style={s.docSize}>1.2 MB</Text>
          <View style={s.docDownload}>
            <Icon name="download" size={15} color={colors.ink} />
          </View>
        </Pressable>
      </View>

      <Pressable
        style={s.rescheduleBtn}
        onPress={() => navigation.navigate('RescheduleAppointment', { consultationId })}
        accessibilityRole="button"
        accessibilityLabel="Reschedule appointment"
      >
        <Icon name="calendar" size={20} color={colors.surfie} />
        <Text style={s.rescheduleTitle} numberOfLines={1}>Reschedule Appointment</Text>
      </Pressable>

      <Pressable
        style={s.complaintCard}
        onPress={() => navigation.navigate('HelpSupport')}
        accessibilityRole="button"
        accessibilityLabel="Raise a complaint"
      >
        <View style={s.complaintIcon}>
          <Icon name="shieldCheck" size={18} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <Text style={s.complaintTitle}>Have an issue with this appointment?</Text>
          <Text style={s.complaintSub}>We are here to help.</Text>
        </View>
        <Text style={s.complaintLink}>Raise a Complaint</Text>
        <Icon name="chevronRight" size={16} color={colors.surfie} />
      </Pressable>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.md,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  cardRule: {
    height: 1,
    backgroundColor: colors.surface.line,
    marginVertical: spacing.md,
  },
  docRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  docLeft: {
    width: 104,
    gap: spacing.sm,
  },
  photo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.surface.mintSoft,
  },
  docText: { flex: 1, gap: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
    flexShrink: 1,
  },
  specialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '600',
    color: colors.surfie,
  },
  meta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.sm,
  },
  ratingText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  idBox: {
    width: '100%',
    gap: 2,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  idLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkMuted,
  },
  idValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  idValue: {
    flex: 1,
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },

  whenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  whenCol: { flex: 1, gap: 3 },
  whenHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  whenLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  whenValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.ink,
  },
  whenRule: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.surface.line,
    marginHorizontal: spacing.sm,
  },

  joinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  joinCancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.white,
  },
  joinCancelText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.danger,
  },
  joinCardShut: { backgroundColor: colors.surface.page },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfie,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  joinBtnOff: { opacity: 0.45 },
  joinBtnText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.white,
  },

  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  sectionSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 3,
  },
  afterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  afterTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.sm,
  },
  afterIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  afterTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  afterSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkMuted,
    marginTop: 1,
  },

  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  billLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
  },
  billValue: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  totalLabel: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.surfie,
  },
  totalValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.surfie,
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paidShield: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  paidSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  invoiceText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.ink,
  },

  docTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.page,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docSize: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  docDownload: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfie,
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  rescheduleTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },

  complaintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  complaintIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  complaintTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  complaintSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  complaintLink: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
});

export default AppointmentDetailScreen;
