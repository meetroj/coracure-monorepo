import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, Icon, type IconName } from '@coracure/ui';
import FlowHeader from '../components/FlowHeader';
import { DOCTORS } from '../data/doctors';

/**
 * The AI assistant tab.
 *
 * *** THIS NEVER DIAGNOSES. *** It maps what the patient types onto a SERVICE
 * and hands them to the doctor list. The disclaimer is always on screen, not
 * buried in a sheet, because the whole surface invites clinical questions — and
 * the crisis card sits below it for the same reason.
 */

/** Local keyword mapping — stands in for `POST /search` until it is wired. */
const serviceFor = (text: string): string => {
  const q = text.toLowerCase();
  if (/fever|cold|cough|flu|throat/.test(q)) return 'General Physician';
  if (/skin|rash|acne|hair|itch/.test(q)) return 'Dermatologist';
  if (/sleep|anxious|anxiety|stress|sad|mood/.test(q)) return 'Psychologist / Therapy';
  if (/knee|back|joint|bone|pain|sprain/.test(q)) return 'Orthopedics';
  if (/breath|chest|asthma|wheez/.test(q)) return 'Pulmonology';
  return 'General Physician';
};

const PROMPTS = [
  'Why do I get headaches often?',
  'Pet mein dard aur acidity ho rahi hai',
  'I have cold, cough and mild fever',
  'Period late hai, kya karun?',
];

const CONCERNS: { label: string; icon: IconName }[] = [
  { label: 'Headache', icon: 'user' },
  { label: 'Stomach Pain', icon: 'heart' },
  { label: 'Fever', icon: 'shield' },
  { label: 'Cold & Cough', icon: 'stethoscope' },
  { label: 'Skin Issues', icon: 'sparkles' },
  { label: 'Sleep Problems', icon: 'clock' },
];

const PROFESSIONALS: { label: string; icon: IconName }[] = [
  { label: 'Psychiatrist', icon: 'user' },
  { label: 'Psychologist', icon: 'heart' },
  { label: 'Counsellor', icon: 'message' },
  { label: 'De-addiction Specialist', icon: 'shield' },
];

export const AIAssistantScreen = () => {
  const navigation = useNavigation<any>();
  const [draft, setDraft] = useState('');

  /** The one way out of this screen: a service, never an answer. */
  const goToService = (text: string) =>
    navigation.navigate('FindDoctor', { serviceName: serviceFor(text) });

  const recommended = DOCTORS[0];

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen contentStyle={s.content}>
        <FlowHeader
          action="clock"
          dot={false}
          actionLabel="Past conversations"
          onAction={() => navigation.navigate('Search')}
        />

        <View style={s.titleRow}>
          <Text style={s.title} accessibilityRole="header">AI Assistant</Text>
          <Icon name="sparkles" size={24} color={colors.surfie} />
        </View>
        <Text style={s.lede}>Your smart health guide</Text>

        {/* The composer */}
        <View style={s.askCard}>
          <Text style={s.askTitle}>How can I help you today?</Text>
          <Text style={s.askSub}>
            Describe your symptoms or health concern in{' '}
            <Text style={s.askLang}>English, Hindi,</Text> or <Text style={s.askLang}>Hinglish</Text>.
          </Text>

          <View style={s.inputBox}>
            <TextInput
              style={s.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={'Type your symptoms or concern here...\nअपने लक्षण या चिंता लिखें...\nApne lakshan ya concern yahan likhen...'}
              placeholderTextColor={colors.inkFaint}
              multiline
              accessibilityLabel="Describe your symptoms"
            />

            <View style={s.inputActions}>
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Speak instead of typing"
                onPress={() => undefined}
              >
                <Icon name="mic" size={22} color={colors.surfie} />
              </Pressable>

              <Pressable
                style={[s.sendBtn, !draft.trim() && s.sendBtnOff]}
                disabled={!draft.trim()}
                onPress={() => goToService(draft)}
                accessibilityRole="button"
                accessibilityLabel="Send"
              >
                <Icon name="send" size={20} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>Try asking something like</Text>
        <View style={s.promptGrid}>
          {PROMPTS.map((p) => (
            <Pressable
              key={p}
              style={s.promptChip}
              onPress={() => goToService(p)}
              accessibilityRole="button"
              accessibilityLabel={p}
            >
              <Icon name="search" size={15} color={colors.surfie} />
              <Text style={s.promptText} numberOfLines={1}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Common concerns</Text>
          <Pressable
            onPress={() => navigation.navigate('ChooseService')}
            accessibilityRole="button"
          >
            <Text style={s.viewAll}>View all ›</Text>
          </Pressable>
        </View>
        <View style={s.concernGrid}>
          {CONCERNS.map((c) => (
            <Pressable
              key={c.label}
              style={s.concernChip}
              onPress={() => goToService(c.label)}
              accessibilityRole="button"
              accessibilityLabel={c.label}
            >
              <Icon name={c.icon} size={18} color={colors.surfie} />
              <Text style={s.concernText} numberOfLines={1}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sectionTitle}>Talk to a professional</Text>
        <View style={s.proRow}>
          {PROFESSIONALS.map((p) => (
            <Pressable
              key={p.label}
              style={s.proChip}
              onPress={() => navigation.navigate('FindDoctor', { serviceName: p.label })}
              accessibilityRole="button"
              accessibilityLabel={p.label}
            >
              <Icon name={p.icon} size={17} color={colors.surfie} />
              <Text style={s.proText}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Who the assistant would hand you to */}
        <View style={s.recCard}>
          <Text style={s.recHead}>Recommended for you</Text>

          <Pressable
            style={s.recRow}
            onPress={() => navigation.navigate('DoctorProfile', { doctorId: recommended.id })}
            accessibilityRole="button"
            accessibilityLabel={`View ${recommended.name}`}
          >
            <View>
              <Image source={recommended.img} style={s.recPhoto} resizeMode="cover" />
              <View style={s.onlineDot} />
            </View>

            <View style={s.recText}>
              <View style={s.recNameRow}>
                <Text style={s.recName} numberOfLines={1}>{recommended.name}</Text>
                <Icon name="checkCircle" size={13} color={colors.surfie} />
                <Text style={s.recMatch}>{recommended.matchPercent}% Match</Text>
              </View>
              <Text style={s.recSpecialty}>{recommended.specialty}</Text>
              <View style={s.recMetaRow}>
                <Icon name="shield" size={13} color={colors.inkFaint} />
                <Text style={s.recMeta}>{recommended.years}+ years experience</Text>
              </View>

              <View style={s.recNext}>
                <Icon name="calendar" size={14} color={colors.surfie} />
                <Text style={s.recNextText}>Next available: {recommended.nextAvailable}</Text>
              </View>
            </View>

            <View style={s.recFee}>
              <Text style={s.recFeeAmount}>₹{recommended.fee}</Text>
              <Text style={s.recFeeLabel}>Consultation fee</Text>
            </View>
          </Pressable>

          <View style={s.recFooter}>
            <View style={s.recFooterCol}>
              <Icon name="globe" size={15} color={colors.inkFaint} />
              <Text style={s.recFooterText}>Languages: {recommended.languages.join(', ')}</Text>
            </View>
            <View style={s.recFooterRule} />
            <View style={s.recFooterCol}>
              <Icon name="video" size={15} color={colors.inkFaint} />
              <Text style={s.recFooterText}>In-person & Video</Text>
            </View>
          </View>
        </View>

        {/* The line that must never leave this screen */}
        <View style={s.disclaimer}>
          <View style={s.disclaimerIcon}>
            <Icon name="sparkles" size={18} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.disclaimerText}>
              I am here to help you understand your symptoms and suggest the right type of
              professional to consult.
            </Text>
            <Text style={s.disclaimerBold}>I do not provide medical diagnosis.</Text>
          </View>
          <Icon name="info" size={18} color={colors.inkFaint} />
        </View>

        {/* Crisis routing, always reachable */}
        <View style={s.urgentCard}>
          <View style={s.urgentTop}>
            <View style={s.urgentIcon}>
              <Icon name="emergency" size={22} color={colors.danger} />
            </View>
            <View style={s.flex}>
              <Text style={s.urgentTitle}>Need urgent help?</Text>
              <Text style={s.urgentSub}>
                If this is an emergency or you are in crisis, seek help immediately.
              </Text>
            </View>
            <Pressable
              style={s.urgentBtn}
              onPress={() => navigation.navigate('SupportDirectory')}
              accessibilityRole="button"
              accessibilityLabel="Get help now"
            >
              <Text style={s.urgentBtnText}>Get Help Now</Text>
            </Pressable>
          </View>

          <View style={s.urgentFooter}>
            <Pressable
              style={s.urgentNumber}
              onPress={() => Linking.openURL('tel:108')}
              accessibilityRole="button"
              accessibilityLabel="Call emergency services on 108"
            >
              <Icon name="phone" size={15} color={colors.danger} />
              <Text style={s.urgentLabel}>Emergency: <Text style={s.urgentDigits}>108</Text></Text>
            </Pressable>
            <View style={s.urgentRule} />
            <Pressable
              onPress={() => Linking.openURL('tel:9152987821')}
              accessibilityRole="button"
              accessibilityLabel="Call the mental health helpline"
            >
              <Text style={s.urgentLabel}>
                Mental Health Helpline: <Text style={s.urgentDigits}>9152987821</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '700',
    color: colors.ink,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: 2,
  },

  askCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  askTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
  },
  askSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  askLang: { color: colors.surfie, fontWeight: '700' },
  inputBox: {
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  input: {
    minHeight: 92,
    textAlignVertical: 'top',
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    lineHeight: 22,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.45 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  viewAll: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
    marginBottom: spacing.md,
  },

  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48.5%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  promptText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.ink,
  },

  concernGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  concernChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '31.5%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  concernText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.ink,
  },

  proRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  proChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  proText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.ink,
  },

  recCard: {
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  recHead: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  recRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  recPhoto: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.white,
  },
  onlineDot: {
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
  recText: { flex: 1, gap: 1 },
  recNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
    flexShrink: 1,
  },
  recMatch: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  recSpecialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.surfie,
  },
  recMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  recMeta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  recNext: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.surface.selected,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: spacing.sm,
  },
  recNextText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.surfie,
  },
  recFee: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignSelf: 'flex-start',
  },
  recFeeAmount: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  recFeeLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkMuted,
  },
  recFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  recFooterCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recFooterText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    flexShrink: 1,
  },
  recFooterRule: {
    width: 1,
    height: 20,
    backgroundColor: colors.surface.line,
    marginHorizontal: spacing.sm,
  },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface.page,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  disclaimerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
  },
  disclaimerBold: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 3,
  },

  urgentCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  urgentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  urgentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  urgentSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  urgentBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: 'transparent',
  },
  urgentBtnText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.danger,
  },
  urgentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F7D5D3',
  },
  urgentNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentRule: {
    width: 1,
    height: 14,
    backgroundColor: '#F0C4C1',
    marginHorizontal: spacing.md,
  },
  urgentLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  urgentDigits: {
    fontFamily: typography.heading.family,
    fontWeight: '700',
    color: colors.danger,
  },
});

export default AIAssistantScreen;
