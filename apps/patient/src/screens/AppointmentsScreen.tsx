import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius } from '@coracure/brand';
import { Screen, PageTitle, FilterChip, Card, Avatar, StatusPill, Button, Icon, EmptyState, ErrorState, LoadingState } from '@coracure/ui';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import DrArjunImg from '../assets/dr-arjun-mehta.jpg';
import DrNehaImg from '../assets/dr-neha-sharma.jpg';
import { consultationsApi, type ConsultationRecord } from '@coracure/api';
import { useApi } from '../hooks/useApi';
import type { RootStackParamList } from '../navigation/RootNavigator';

export const AppointmentsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const { data, isLoading, error, refetch } = useApi(
    () => consultationsApi.listConsultations({ upcoming: filter === 'upcoming' }),
    [filter]
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getStatusTone = (status: string) => {
    if (status === 'scheduled') return 'brand';
    if (status === 'completed') return 'success';
    if (status === 'cancelled') return 'danger';
    return 'neutral';
  };

  return (
    <Screen scroll={false}>
      <PageTitle title="Appointments" />

      <View style={s.filterRow}>
        <FilterChip
          label="Upcoming"
          active={filter === 'upcoming'}
          onPress={() => setFilter('upcoming')}
        />
        <FilterChip
          label="Past"
          active={filter === 'past'}
          onPress={() => setFilter('past')}
        />
      </View>

      <View style={s.content}>
        {isLoading && !data ? (
          <LoadingState label="Loading appointments..." />
        ) : error ? (
          <ErrorState body="Could not load appointments." onRetry={refetch} />
        ) : !data || data.length === 0 ? (
          <ScrollView
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.surfie]} />
            }
          >
            {filter === 'upcoming' ? (
              <View style={s.cardsStack}>
                <Card style={s.demoCard}>
                  <View style={s.cardRow}>
                    <Image source={DrRichardImg} style={s.doctorAvatar} resizeMode="cover" />
                    <View style={s.details}>
                      <Text style={s.serviceName}>Dr. Richard Parker</Text>
                      <Text style={s.doctorSpecialty}>Orthopedic Surgeon</Text>
                      <Text style={s.dateTime}>Friday, 18 May 2026 • 10:30 AM</Text>
                      <StatusPill label="Confirmed" tone="brand" style={s.pill} />
                    </View>
                  </View>

                  <View style={s.actionRow}>
                    <Button
                      label="Join Call"
                      size="sm"
                      onPress={() => navigation.navigate('DeviceCheck', { consultationId: 'demo-id' })}
                      style={s.actionBtn}
                    />
                    <Button
                      label="Reschedule"
                      variant="secondary"
                      size="sm"
                      onPress={() => navigation.navigate('RescheduleAppointment', { consultationId: 'demo-id' })}
                      style={s.actionBtn}
                    />
                    <Button
                      label="Cancel"
                      variant="ghost"
                      size="sm"
                      onPress={() => navigation.navigate('CancelRefund', { consultationId: 'demo-id' })}
                      style={s.cancelBtn}
                    />
                  </View>
                </Card>

                <Card style={s.demoCard}>
                  <View style={s.cardRow}>
                    <Image source={DrArjunImg} style={s.doctorAvatar} resizeMode="cover" />
                    <View style={s.details}>
                      <Text style={s.serviceName}>Dr. Arjun Mehta</Text>
                      <Text style={s.doctorSpecialty}>General Physician</Text>
                      <Text style={s.dateTime}>Tomorrow, 11:30 AM</Text>
                      <StatusPill label="Confirmed" tone="brand" style={s.pill} />
                    </View>
                  </View>

                  <View style={s.actionRow}>
                    <Button
                      label="Join Call"
                      size="sm"
                      onPress={() => navigation.navigate('DeviceCheck', { consultationId: 'demo-id-2' })}
                      style={s.actionBtn}
                    />
                    <Button
                      label="Reschedule"
                      variant="secondary"
                      size="sm"
                      onPress={() => navigation.navigate('RescheduleAppointment', { consultationId: 'demo-id-2' })}
                      style={s.actionBtn}
                    />
                  </View>
                </Card>

                <Card style={s.demoCard}>
                  <View style={s.cardRow}>
                    <Image source={DrNehaImg} style={s.doctorAvatar} resizeMode="cover" />
                    <View style={s.details}>
                      <Text style={s.serviceName}>Dr. Neha Sharma</Text>
                      <Text style={s.doctorSpecialty}>Pulmonologist</Text>
                      <Text style={s.dateTime}>22 May 2026 • 03:00 PM</Text>
                      <StatusPill label="Confirmed" tone="brand" style={s.pill} />
                    </View>
                  </View>

                  <View style={s.actionRow}>
                    <Button
                      label="Join Call"
                      size="sm"
                      onPress={() => navigation.navigate('DeviceCheck', { consultationId: 'demo-id-3' })}
                      style={s.actionBtn}
                    />
                    <Button
                      label="Reschedule"
                      variant="secondary"
                      size="sm"
                      onPress={() => navigation.navigate('RescheduleAppointment', { consultationId: 'demo-id-3' })}
                      style={s.actionBtn}
                    />
                  </View>
                </Card>
              </View>
            ) : (
              <Card style={s.demoCard}>
                <View style={s.cardRow}>
                  <Image source={DrRichardImg} style={s.doctorAvatar} resizeMode="cover" />
                  <View style={s.details}>
                    <Text style={s.serviceName}>Dr. Richard Parker</Text>
                    <Text style={s.doctorSpecialty}>Orthopedic Surgeon</Text>
                    <Text style={s.dateTime}>10 May 2026 • 04:00 PM</Text>
                    <StatusPill label="Completed" tone="success" style={s.pill} />
                  </View>
                </View>

                <View style={s.actionRow}>
                  <Button
                    label="Prescription"
                    size="sm"
                    variant="secondary"
                    onPress={() => navigation.navigate('Prescription', { consultationId: 'demo-past-id' })}
                    style={s.actionBtn}
                  />
                  <Button
                    label="Care Plan"
                    size="sm"
                    variant="secondary"
                    onPress={() => navigation.navigate('CarePlan', { consultationId: 'demo-past-id' })}
                    style={s.actionBtn}
                  />
                  <Button
                    label="Feedback"
                    size="sm"
                    variant="ghost"
                    onPress={() => navigation.navigate('Feedback', { consultationId: 'demo-past-id' })}
                    style={s.actionBtn}
                  />
                </View>
              </Card>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.surfie]} />
            }
          >
            {data.map((appt: any) => (
              <Card key={appt.id} style={s.demoCard}>
                <View style={s.cardRow}>
                  <Image source={DrRichardImg} style={s.doctorAvatar} resizeMode="cover" />
                  <View style={s.details}>
                    <Text style={s.serviceName}>{appt.doctorName || 'Dr. Richard Parker'}</Text>
                    <Text style={s.doctorSpecialty}>{appt.doctorTitle || 'Orthopedic Surgeon'}</Text>
                    <Text style={s.dateTime}>
                      {appt.scheduledStartAt ? new Date(appt.scheduledStartAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Friday, 18 May 2026 • 10:30 AM'}
                    </Text>
                    <StatusPill label={appt.status === 'scheduled' ? 'Confirmed' : appt.status} tone={getStatusTone(appt.status)} style={s.pill} />
                  </View>
                </View>

                <View style={s.actionRow}>
                  <Button
                    label="Join Call"
                    size="sm"
                    onPress={() => navigation.navigate('DeviceCheck', { consultationId: appt.id })}
                    style={s.actionBtn}
                  />
                  <Button
                    label="Reschedule"
                    variant="secondary"
                    size="sm"
                    onPress={() => navigation.navigate('RescheduleAppointment', { consultationId: appt.id })}
                    style={s.actionBtn}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    size="sm"
                    onPress={() => navigation.navigate('CancelRefund', { consultationId: appt.id })}
                    style={s.cancelBtn}
                  />
                </View>
              </Card>
            ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  content: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
  },
  cardsStack: {
    gap: spacing.md,
  },
  demoCard: {
    padding: spacing.md,
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  serviceName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  doctorSpecialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  dateTime: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '600',
  },
  pill: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  actionBtn: {
    flex: 1,
  },
  cancelBtn: {
    paddingHorizontal: spacing.sm,
  },
});

export default AppointmentsScreen;
