import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, Icon } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import GradientButton from '../components/GradientButton';
import ScreenBackground from '../components/ScreenBackground';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type CarePlanScreenProp = NativeStackNavigationProp<RootStackParamList, 'CarePlan'>;
type CarePlanRouteProp = RouteProp<RootStackParamList, 'CarePlan'>;

interface TaskItem {
  id: string;
  title: string;
  category: string;
  completed: boolean;
}

const INITIAL_TASKS: TaskItem[] = [
  { id: '1', title: 'Morning Walk (15 mins)', category: 'Routine Health', completed: true },
  { id: '2', title: 'Physiotherapy Stretch', category: 'Exercise Recovery', completed: true },
  { id: '3', title: 'General Dietary Intake', category: 'Nutrition', completed: false },
  { id: '4', title: 'Hydration Goal (2.5L)', category: 'Daily Habit', completed: false },
];

const MEDICINES = [
  { name: 'Amoxycillin 500mg', timing: 'Twice daily • After food', status: 'Taken' },
  { name: 'Paracetamol 650mg', timing: 'Thrice daily • If fever', status: 'Upcoming' },
  { name: 'Pantoprazole 40mg', timing: 'Once daily • Before food', status: 'Taken' },
];

const WELLNESS_TOPICS = [
  { id: '1', title: 'Routine Habits', icon: 'checkCircle' as const },
  { id: '2', title: 'Health Profile', icon: 'clipboard' as const },
  { id: '3', title: 'Deep Rest', icon: 'heart' as const },
  { id: '4', title: 'Mental Wellness', icon: 'sun' as const },
];

/** The light-green circular tick both lists use. */
const Tick = ({ on }: { on: boolean }) => (
  <View style={[s.tick, on && s.tickOn]}>
    {on && <Icon name="check" size={13} color={colors.white} />}
  </View>
);

export const CarePlanScreen = () => {
  const navigation = useNavigation<CarePlanScreenProp>();
  const route = useRoute<CarePlanRouteProp>();
  const consultationId = route.params?.consultationId || 'demo-consultation-id';

  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <Screen contentStyle={s.container}>
      <ScreenBackground name="appointmentDetails" scrolls />
      <AppHeader
        logo={<LogoWide width={120} height={30} />}
        right={
          <Pressable
            style={s.bell}
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={20} color={colors.ink} />
            <View style={s.bellDot} />
          </Pressable>
        }
      />

      <View style={s.headerWrap}>
        <Text style={s.eyebrow}>Your Care Plan</Text>
        <Text style={s.pageTitle} accessibilityRole="header">Care Plan</Text>
        <Text style={s.pageSubtitle}>Personalized for you by</Text>
        <Text style={s.pageSubtitleName}>Dr. Richard Parker</Text>
      </View>

      {/* Doctor Guidance Card */}
      <View style={s.guidanceCard}>
        <Image source={DrRichardImg} style={s.doctorGuidancePhoto} resizeMode="cover" />

        <View style={s.guidanceBody}>
          <Text style={s.doctorGuidanceTitle}>Doctor's Guidance</Text>
          <Text style={s.guidanceQuote}>
            Your condition is manageable with the right care and consistency. Follow this plan for
            quicker relief and stay healthy.
          </Text>

          <View style={s.planDatesRow}>
            <View style={s.planDateCol}>
              <View style={s.planDateHead}>
                <Icon name="calendar" size={13} color={colors.surfie} />
                <Text style={s.planDateLabel}>Started</Text>
              </View>
              <Text style={s.planDateValue}>18 May 2026</Text>
            </View>
            <View style={s.planDateRule} />
            <View style={s.planDateCol}>
              <View style={s.planDateHead}>
                <Icon name="checkCircle" size={13} color={colors.surfie} />
                <Text style={s.planDateLabel}>Target</Text>
              </View>
              <Text style={s.planDateValue}>01 Jun 2026</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Plan Progress Metric Card */}
      <View style={s.progressCard}>
        <View style={s.progressInfo}>
          <Text style={s.progressTitle}>Plan Progress</Text>
          <Text style={s.progressSub}>
            <Text style={s.progressCount}>{completedCount} of {tasks.length}</Text> tasks completed today
          </Text>
        </View>
        <View style={s.progressRing}>
          <Text style={s.progressNumber}>{completedCount} of {tasks.length}</Text>
        </View>
      </View>

      {/* Daily Tasks Checklist */}
      <View style={s.section}>
        <View style={s.listCard}>
          <View style={s.cardHead}>
            <Text style={s.cardHeadTitle}>Today's Tasks</Text>
            <Text style={s.cardHeadSub}>
              <Text style={s.cardHeadCount}>{completedCount} of {tasks.length}</Text> completed
            </Text>
          </View>
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              style={[s.taskRow, task.completed && s.taskRowDone]}
              onPress={() => toggleTask(task.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.completed }}
            >
              <Tick on={task.completed} />
              <View style={s.taskTextCol}>
                <Text style={[s.taskTitle, task.completed && s.taskTitleDone]}>{task.title}</Text>
                <Text style={s.taskCategory}>{task.category}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Medicines Adherence */}
      <View style={s.section}>
        <View style={s.listCard}>
          <View style={s.cardHead}>
            <Text style={s.cardHeadTitle}>Medicines</Text>
          </View>
          {MEDICINES.map((med) => (
            <View key={med.name} style={s.medRow}>
              <Tick on={med.status === 'Taken'} />
              <View style={s.medInfoCol}>
                <Text style={s.medName}>{med.name}</Text>
                <Text style={s.medTiming}>{med.timing}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Next Follow-Up Booking Card */}
      <View style={s.followUpCard}>
        <View style={s.followUpIcon}>
          <Icon name="calendar" size={22} color={colors.surfie} />
        </View>
        <View style={s.followUpTextCol}>
          <Text style={s.followUpTitle}>Next Follow-up</Text>
          <Text style={s.followUpDate}>30 May 2026, 10:00 AM</Text>
          <Text style={s.followUpDoctor}>Consultation with Dr. Richard Parker</Text>
        </View>
        <Button
          label="Book"
          size="sm"
          onPress={() => navigation.navigate('RescheduleAppointment', { consultationId })}
        />
      </View>

      {/* Warning Signs Alert Card */}
      <View style={s.warningCard}>
        <View style={s.warningIcon}>
          <Icon name="emergency" size={22} color={colors.danger} />
        </View>
        <View style={s.warningTextCol}>
          <Text style={s.warningTitle}>Watch for Warning Signs</Text>
          <Text style={s.warningDesc} numberOfLines={2}>
            Sharp chest pain, breathing difficulty or high fever needs emergency care.
          </Text>
        </View>
        <Pressable
          style={s.learnMoreBtn}
          onPress={() => navigation.navigate('EducationLibrary')}
          accessibilityRole="button"
          accessibilityLabel="Learn more about warning signs"
        >
          <Text style={s.learnMoreText}>Learn More</Text>
        </Pressable>
      </View>

      {/* Recommended Wellness Resources */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Recommended for You</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wellnessRow}
        keyboardShouldPersistTaps="handled"
      >
          {WELLNESS_TOPICS.map((topic) => (
            <Pressable key={topic.id} style={s.wellnessCard}>
              <View style={s.wellnessIconBox}>
                <Icon name="heart" size={20} color={colors.surfie} />
              </View>
              <Text style={s.wellnessCardText}>{topic.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Action to view Prescription */}
      <View style={s.footer}>
        <GradientButton
          label="View Digital Prescription"
          cornerRadius={radius.card}
          onPress={() => navigation.navigate('Prescription', { consultationId })}
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
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfie,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  eyebrow: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '600',
    color: colors.ink,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
  },
  pageSubtitleName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  guidanceCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
    ...shadow.card,
    marginBottom: spacing.md,
  },
  doctorGuidancePhoto: {
    width: '100%',
    height: 190,
    backgroundColor: colors.surface.mintSoft,
  },
  doctorGuidanceTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  guidanceBody: {
    padding: spacing.lg,
  },
  guidanceQuote: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
    lineHeight: 20,
  },
  planDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  planDateCol: {
    flex: 1,
    gap: 3,
  },
  planDateHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  planDateLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  planDateValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  planDateRule: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface.line,
  },
  progressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    ...shadow.card,
    marginBottom: spacing.lg,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  progressSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 2,
  },
  progressRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: colors.surfie,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  progressNumber: {
    fontFamily: typography.heading.family,
    fontSize: 12,
    fontWeight: '700',
    color: colors.surfie,
    textAlign: 'center',
  },
  progressCount: {
    fontFamily: typography.heading.family,
    fontWeight: '700',
    color: colors.surfie,
  },
  section: {
    marginBottom: spacing.xl,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
    ...shadow.card,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardHeadTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  cardHeadSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  cardHeadCount: {
    fontFamily: typography.heading.family,
    fontWeight: '700',
    color: colors.surfie,
  },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    gap: spacing.md,
  },
  taskRowDone: {
    backgroundColor: '#FAFDFB',
  },
  taskTextCol: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.ink,
  },
  taskTitleDone: {
    color: colors.inkMuted,
    textDecorationLine: 'line-through',
  },
  taskCategory: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 1,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    gap: spacing.md,
  },
  medInfoCol: {
    flex: 1,
  },
  medName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  medTiming: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 2,
  },
  followUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.card,
    marginBottom: spacing.md,
  },
  followUpIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followUpTextCol: {
    flex: 1,
  },
  followUpTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  followUpDate: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '600',
    marginTop: 2,
  },
  followUpDoctor: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 1,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#F7D5D3',
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTextCol: {
    flex: 1,
  },
  warningTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.danger,
  },
  warningDesc: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 14,
  },
  learnMoreBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: 'transparent',
  },
  learnMoreText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.danger,
  },
  wellnessRow: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  wellnessCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  wellnessIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessCardText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xs,
  },
});

export default CarePlanScreen;

