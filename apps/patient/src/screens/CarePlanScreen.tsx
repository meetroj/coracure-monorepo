import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Avatar, StatusPill, Button, Icon } from '@coracure/ui';
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
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={<Icon name="bell" size={20} color={colors.inkMuted} />}
      />

      <View style={s.tagWrap}>
        <StatusPill label="Your Care Plan" tone="brand" />
      </View>

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>P-27 Care Plan</Text>
        <Text style={s.pageSubtitle}>Personalized for you by Dr. Richard Parker</Text>
      </View>

      {/* Doctor Guidance Card */}
      <View style={s.guidanceCard}>
        <View style={s.doctorHeaderRow}>
          <Image
            source={DrRichardImg}
            style={s.doctorGuidanceAvatar}
            resizeMode="cover"
          />
          <View style={s.doctorMeta}>
            <Text style={s.doctorGuidanceTitle}>Doctor's Guidance</Text>
            <Text style={s.doctorSub}>Orthopedic Specialist</Text>
          </View>
          <StatusPill label="Post-Release 14-Day" tone="success" />
        </View>

        <Text style={s.guidanceBody}>
          "Post-condition is manageable with the right care and consistency. Follow this plan for quicker relief and stay healthy."
        </Text>

        <View style={s.planDatesRow}>
          <Text style={s.planDate}>📅 18 May 2026</Text>
          <Text style={s.planTargetDate}>🎯 Target: 01 Jun 2026</Text>
        </View>
      </View>

      {/* Plan Progress Metric Card */}
      <View style={s.progressCard}>
        <View style={s.progressInfo}>
          <Text style={s.progressTitle}>Plan Progress</Text>
          <Text style={s.progressSub}>{completedCount} of {tasks.length} tasks completed today</Text>
        </View>
        <View style={s.progressRing}>
          <Text style={s.progressNumber}>{progressPercent}%</Text>
        </View>
      </View>

      {/* Daily Tasks Checklist */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Today's Tasks</Text>
        <View style={s.tasksList}>
          {tasks.map((task) => (
            <Pressable
              key={task.id}
              style={[s.taskRow, task.completed && s.taskRowDone]}
              onPress={() => toggleTask(task.id)}
            >
              <View style={[s.checkbox, task.completed && s.checkboxDone]}>
                {task.completed && <Icon name="check" size={14} color={colors.white} />}
              </View>
              <View style={s.taskTextCol}>
                <Text style={[s.taskTitle, task.completed && s.taskTitleDone]}>{task.title}</Text>
                <Text style={s.taskCategory}>{task.category}</Text>
              </View>
              <StatusPill
                label={task.completed ? 'Done' : 'Pending'}
                tone={task.completed ? 'success' : 'neutral'}
              />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Medicines Adherence */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Medicines</Text>
          <Pressable onPress={() => navigation.navigate('Prescription', { consultationId })}>
            <Text style={s.viewAllLink}>View Prescription &gt;</Text>
          </Pressable>
        </View>

        <View style={s.medicineList}>
          {MEDICINES.map((med) => (
            <View key={med.name} style={s.medRow}>
              <View style={s.medIconBox}>
                <Icon name="prescription" size={18} color={colors.surfie} />
              </View>
              <View style={s.medInfoCol}>
                <Text style={s.medName}>{med.name}</Text>
                <Text style={s.medTiming}>{med.timing}</Text>
              </View>
              <StatusPill
                label={med.status}
                tone={med.status === 'Taken' ? 'success' : 'warn'}
              />
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
          <Text style={s.warningDesc}>
            If you experience sharp chest pain, breathing difficulty, or high fever, call emergency care.
          </Text>
        </View>
        <Button
          label="Call Clinic"
          variant="danger"
          size="sm"
          onPress={() => Alert.alert('Emergency Assistance', 'Calling CoraCure emergency helpline: 1800-CORACURE')}
        />
      </View>

      {/* Recommended Wellness Resources */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Recommended for You</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wellnessRow}>
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
        <Button
          label="View Digital Prescription →"
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
  tagWrap: {
    marginTop: spacing.xs,
  },
  headerWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
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
  guidanceCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    ...shadow.card,
    marginBottom: spacing.md,
  },
  doctorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  doctorGuidanceAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  doctorMeta: {
    flex: 1,
  },
  doctorGuidanceTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  doctorSub: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  guidanceBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  planDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  planDate: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  planTargetDate: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '600',
  },
  progressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.selected,
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
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 4,
    borderColor: colors.surfie,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  viewAllLink: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  tasksList: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
    gap: spacing.md,
  },
  taskRowDone: {
    backgroundColor: '#FAFDFB',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
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
  medicineList: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
    gap: spacing.md,
  },
  medIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
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

