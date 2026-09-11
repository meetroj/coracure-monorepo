import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';

import { messageFor, useConcerns, useServices, type Service } from '@coracure/api';
import { colors, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  OfflineBanner,
  Screen,
  Skeleton,
  TextField,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { EmergencyButton } from '../../components/EmergencyGuidance';
import { ServiceRow } from '../../components/ServiceTile';
import { useCareFlow } from '../flow/CareFlowProvider';
import { useNavigator } from '../navigation/Navigator';

/**
 * PT-06-01 — the services on offer, with their price.
 *
 * *** THE PATIENT CHOOSES A SERVICE, NOT A PERSON, AND THE COPY SAYS SO. ***
 * The lede states it in as many words, because a patient arriving from any
 * other health app expects to be picking a doctor next and should be told
 * plainly that they are not.
 *
 * Disabled services never appear: `GET /v1/services` filters on `isActive`
 * server-side, so there is nothing to filter here — and nothing that could
 * accidentally show one by forgetting to.
 *
 * Concerns are loaded alongside so each service can show what it covers, which
 * is what makes "Psychologist / Therapy" mean something to someone who does not
 * know what a psychologist treats.
 */
export const ChooseServiceScreen = () => {
  const t = useT();
  const { back, navigate } = useNavigator();
  const flow = useCareFlow();

  const services = useServices();
  const concerns = useConcerns();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const list = services.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (svc) =>
        svc.name.toLowerCase().includes(q) ||
        svc.code.toLowerCase().includes(q) ||
        (svc.description ?? '').toLowerCase().includes(q) ||
        (concerns.data ?? []).some(
          (c) => c.specialtyId === svc.id && c.name.toLowerCase().includes(q),
        ),
    );
  }, [services.data, concerns.data, query]);

  const choose = (service: Service) => {
    flow.setService(service);
    // Service → TIME. Never service → provider.
    navigate('choose-time');
  };

  /* ------------------------------- loading -------------------------------- */
  if (services.isLoading) {
    return (
      <Screen
        testID="services-loading"
        header={<AppHeader title={t('services.chooseTitle')} onBack={back} />}
      >
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={96} radius={18} />
        ))}
      </Screen>
    );
  }

  /* -------------------------------- error --------------------------------- */
  // A cached list is better than an error page: SH-03 wants stale data over a
  // blank screen when a refresh fails.
  const staleOnly = services.isError && !!services.data?.length;

  if (services.isError && !services.data?.length) {
    return (
      <Screen
        scroll={false}
        header={<AppHeader title={t('services.chooseTitle')} onBack={back} />}
      >
        <ErrorState
          title={t('booking.servicesError')}
          body={messageFor(services.error)}
          requestId={services.error?.requestId}
          onRetry={services.refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen
      testID="services"
      refreshControl={
        <RefreshControl
          refreshing={services.isFetching && services.isSuccess}
          onRefresh={services.refetch}
          tintColor={colors.surfie}
          colors={[colors.surfie]}
        />
      }
      header={
        <AppHeader
          title={t('services.chooseTitle')}
          onBack={back}
          right={<EmergencyButton onPress={() => navigate('emergency')} />}
        />
      }
    >
      <Text style={s.lede}>{t('services.chooseSubtitle')}</Text>

      {staleOnly && <OfflineBanner onRetry={services.refetch} />}

      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={t('services.searchPlaceholder')}
        accessibilityLabel={t('services.searchPlaceholder')}
        icon="search"
        autoCorrect={false}
        returnKeyType="search"
      />

      {filtered.length === 0 ? (
        <Card tone="mint" elevation="none">
          <EmptyState
            icon="search"
            title={query ? t('services.noMatch') : t('dashboard.noServices')}
            body={query ? t('services.noMatchBody') : t('dashboard.noServicesBody')}
            actionLabel={query ? t('services.clearSearch') : undefined}
            onAction={query ? () => setQuery('') : undefined}
          />
        </Card>
      ) : (
        <View style={s.list}>
          {filtered.map((service) => {
            const related = (concerns.data ?? [])
              .filter((c) => c.specialtyId === service.id)
              .slice(0, 3);
            return (
              <View key={service.id} style={s.item}>
                <ServiceRow
                  service={service}
                  selected={flow.service?.id === service.id}
                  onPress={() => choose(service)}
                />
                {related.length > 0 && (
                  <View style={s.concerns}>
                    {related.map((c) => (
                      <View key={c.id} style={s.concern}>
                        <Text style={s.concernText}>{c.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={s.rule}>
        <Icon name="shieldCheck" size={15} color={colors.inkFaint} />
        <Text style={s.ruleText}>{t('findCare.neverPicksDoctor')}</Text>
      </View>

      <Button
        label={t('assistant.heading')}
        variant="secondary"
        icon="search"
        onPress={() => navigate('assistant')}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 21,
  },
  list: { gap: spacing.md },
  item: { gap: 6 },

  concerns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.xs },
  concern: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.surface.selected,
  },
  concernText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.surfie,
    fontWeight: '600',
  },

  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  ruleText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 16,
  },
});

export default ChooseServiceScreen;
