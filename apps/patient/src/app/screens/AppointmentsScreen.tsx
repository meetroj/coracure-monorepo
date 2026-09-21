import React, { useState } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';

import { messageFor, useConsultations, useServices } from '@coracure/api';
import { colors, spacing } from '@coracure/brand';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChip,
  PageTitle,
  Screen,
  SkeletonCard,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';


import { AppointmentCard } from '../../components/AppointmentCard';
import { useNavigator } from '../navigation/Navigator';

/**
 * The consultations list (FR-6.5).
 *
 * "Upcoming" and "Past" are the backend's own split — `?upcoming=true` returns
 * everything still holding time (held, scheduled, awaiting a provider,
 * in progress) and `false` returns everything that has been. They are two
 * separate queries rather than one filtered client-side, because the server
 * caps each at 100 rows and filtering locally would silently lose the tail.
 */
export const AppointmentsScreen = () => {
  const { navigate } = useNavigator();
  const t = useT();
  const [upcoming, setUpcoming] = useState(true);

  const list = useConsultations(upcoming);
  const services = useServices();

  return (
    <Screen
      testID="appointments"
      refreshControl={
        <RefreshControl
          refreshing={list.isFetching && list.isSuccess}
          onRefresh={list.refetch}
          tintColor={colors.surfie}
          colors={[colors.surfie]}
        />
      }
      header={
        <View style={s.header}>
          <PageTitle title={t('appointments.title')} subtitle={t('appointments.subtitle')} />
          <View style={s.filters}>
            <FilterChip
              label={t('appointments.upcoming')}
              active={upcoming}
              onPress={() => setUpcoming(true)}
            />
            <FilterChip
              label={t('appointments.past')}
              active={!upcoming}
              onPress={() => setUpcoming(false)}
            />
          </View>
        </View>
      }
    >
      {list.isLoading && (
        <View style={s.list}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </View>
      )}

      {list.isError && (
        <ErrorState
          title={t('appointments.loadError')}
          body={messageFor(list.error)}
          requestId={list.error?.requestId}
          onRetry={list.refetch}
        />
      )}

      {list.isSuccess && list.data.length === 0 && (
        <Card tone="mint" elevation="none">
          <EmptyState
            icon="calendar"
            title={upcoming ? t('appointments.noUpcoming') : t('appointments.noPast')}
            body={
              upcoming ? t('appointments.noUpcomingBody') : t('appointments.noPastBody')
            }
            actionLabel={upcoming ? t('dashboard.bookConsultation') : undefined}
            onAction={upcoming ? () => navigate('services') : undefined}
          />
        </Card>
      )}

      {!!list.data?.length && (
        <View style={s.list}>
          {list.data.map((consultation) => (
            <AppointmentCard
              key={consultation.id}
              consultation={consultation}
              services={services.data}
              onPress={() => navigate('consultation', { consultationId: consultation.id })}
              onPrimaryAction={() =>
                navigate('consultation', { consultationId: consultation.id })
              }
            />
          ))}
        </View>
      )}

      {upcoming && !!list.data?.length && (
        <Button
          label={t('appointments.bookAnother')}
          variant="secondary"
          icon="plus"
          onPress={() => navigate('services')}
        />
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  header: { gap: spacing.md, paddingVertical: spacing.md },
  filters: { flexDirection: 'row', gap: spacing.sm },
  list: { gap: spacing.md },
});

export default AppointmentsScreen;
