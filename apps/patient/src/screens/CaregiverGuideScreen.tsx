import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, PillButton, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import PatientTabBar from '../components/PatientTabBar';

interface GuideSection {
  id: string;
  title: string;
  sub: string;
  icon: IconName;
  details: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'signs',
    title: 'Warning Signs',
    sub: 'Subtle indicators needing clinical attention',
    icon: 'alertTriangle',
    details: 'Monitor for sudden sharp swelling, heat around the joint, fever above 100°F, or sudden inability to bear weight. Report immediately through the daily check-in.',
  },
  {
    id: 'nutrition',
    title: 'Nutrition & Hydration',
    sub: 'Tips to help your relative eat well and heal',
    icon: 'heart',
    details: 'Ensure protein-rich meals (dal, paneer, eggs), anti-inflammatory foods, and 2.5L daily hydration to accelerate cartilage repair and reduce joint stiffness.',
  },
  {
    id: 'privacy',
    title: 'Privacy Rule',
    sub: 'What to ask and what to keep in respect',
    icon: 'lock',
    details: 'Medical consultation notes and psychological assessments remain confidential between patient and doctor. Family should support without demanding raw consult records.',
  },
  {
    id: 'talk',
    title: 'How to Talk Supportively',
    sub: 'Tone & phrases that reduce frustration',
    icon: 'shieldCheck',
    details: 'Avoid saying "you should be walking faster". Instead validate progress: "You completed your Day 18 stretch target today, great consistency!"',
  },
  {
    id: 'emergency',
    title: 'Emergency Support Steps',
    sub: 'When to call doctor or 112 in a critical situation',
    icon: 'phone',
    details: 'If sudden shortness of breath, severe calf pain with swelling, or chest tightness occurs, call 112 immediately and notify the CoraCure care team.',
  },
];

export const CaregiverGuideScreen = () => {
  const navigation = useNavigation<any>();
  const [consentAcknowledged, setConsentAcknowledged] = useState(true);

  const handleSectionPress = (section: GuideSection) => {
    Alert.alert(section.title, section.details);
  };

  const handleShareGuide = async () => {
    try {
      await Share.share({
        message: 'CoraCure Caregiver & Family Recovery Guide: Practical tips, warning signs, and supportive care for post-consultation recovery.',
      });
    } catch {}
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
          <Text style={s.pageTitle}>Caregiver & Family Guide 🌿</Text>
          <Text style={s.pageSubtitle}>
            Practical guidance for families supporting recovery
          </Text>
        </View>

        {/* Guide Items List */}
        <View style={s.guideList}>
          {GUIDE_SECTIONS.map((sec) => (
            <Pressable
              key={sec.id}
              style={s.guideCard}
              onPress={() => handleSectionPress(sec)}
              accessibilityRole="button"
              accessibilityLabel={sec.title}
            >
              <View style={s.iconCircle}>
                <Icon name={sec.icon} size={20} color={colors.surfie} />
              </View>
              <View style={s.guideTextCol}>
                <Text style={s.guideTitle}>{sec.title}</Text>
                <Text style={s.guideSub}>{sec.sub}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkFaint} />
            </Pressable>
          ))}
        </View>

        {/* Consent & Privacy Card */}
        <Pressable
          style={s.consentCard}
          onPress={() => setConsentAcknowledged(!consentAcknowledged)}
          accessibilityRole="checkbox"
          accessibilityLabel="Consent acknowledgment"
        >
          <View style={s.consentIconCircle}>
            <Icon name="shieldCheck" size={22} color={colors.surfie} />
          </View>
          <View style={s.consentTextCol}>
            <Text style={s.consentTitle}>Shared with family only with patient consent</Text>
            <Text style={s.consentSub}>
              We respect privacy. Shared file notes obey teleconsultation consent and statutory EHR norms.
            </Text>
          </View>
          <View style={[s.checkboxCircle, consentAcknowledged && s.checkboxCircleActive]}>
            {consentAcknowledged && <Icon name="check" size={13} color={colors.white} />}
          </View>
        </Pressable>

        {/* Actions */}
        <View style={s.actionsWrap}>
          <PillButton
            label="SHARE GUIDE"
            onPress={handleShareGuide}
            variant="primary"
          />
          <Pressable
            style={s.learnMoreBtn}
            onPress={() => navigation.navigate('LegalPolicy')}
            accessibilityRole="button"
            accessibilityLabel="Learn More"
          >
            <Text style={s.learnMoreText}>Learn More</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="CarePlan" />
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
  guideList: {
    gap: 10,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTextCol: {
    flex: 1,
    gap: 2,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  guideSub: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  consentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F5',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 4,
  },
  consentIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentTextCol: {
    flex: 1,
    gap: 2,
  },
  consentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.surfie,
  },
  consentSub: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 15,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  actionsWrap: {
    gap: 10,
    marginTop: 6,
    alignItems: 'center',
  },
  learnMoreBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.surfie,
  },
});

export default CaregiverGuideScreen;
