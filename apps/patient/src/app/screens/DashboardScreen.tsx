import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';

import {
  messageFor,
  profileApi,
  useConsentStatus,
  useConsultations,
  useProfile,
  useServices,
  useUnreadCount,
} from '@coracure/api';
import { colors, radius, shadow, spacing, typography } from '@coracure/brand';
import {
  Avatar,
  Banner,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonCard,
  type IconName,
} from '@coracure/ui';

import { useT } from '@coracure/i18n';

import { useCareFlow } from '../flow/CareFlowProvider';

import { AppointmentCard } from '../../components/AppointmentCard';
import { EmergencyButton } from '../../components/EmergencyGuidance';
import { ServiceTile } from '../../components/ServiceTile';
import { greetingKeyFor } from '../../lib/consultation';
import { useNavigator } from '../navigation/Navigator';

/**
 * The authenticated home.
 *
 * *** EVERY NUMBER AND NAME ON THIS SCREEN COMES FROM THE BACKEND. *** The
 * greeting is the profile's own name, the appointment is the first row of
 * `GET /me/consultations?upcoming=true`, and the service rail is
 * `GET /services`. Nothing is seeded.
 *
 * Two blocks in the reference design are not here, and both for the same
 * reason — no endpoint reports them, so rendering them would be fiction:
 *
 * - **The "AI Assistant" quick action.** There is no such capability in the
 *   backend. Its slot is "Help & Support", which the complaints endpoints do
 *   back. A button that only logs to the console is worse than no button.
 * - **The "Care Plan 72%" ring.** `GET /me/consultations/:id/care-plan` is
 *   per-consultation and only exists once one has completed. The block below is
 *   a real summary of the patient's own consultations instead, and it links to
 *   the care record when there is one to link to.
 */

type QuickAction = {
  key: string;
  label: string;
  sublabel: string;
  icon: IconName;
  onPress: () => void;
  emphasis?: boolean;
};

export const DashboardScreen = () => {
  const { navigate } = useNavigator();
  const t = useT();
  const flow = useCareFlow();

  const profile = useProfile();
  const services = useServices();
  const upcoming = useConsultations(true);
  const past = useConsultations(false);
  const unread = useUnreadCount();
  const consent = useConsentStatus();

  const firstName = profileApi.firstNameOf(profile.data?.fullName);
  const initials = profileApi.initialsOf(profile.data?.fullName);

  const nextConsultation = upcoming.data?.[0] ?? null;
  const completedCount = useMemo(
    () => (past.data ?? []).filter((c) => c.status === 'completed').length,
    [past.data],
  );
  const lastCompleted = useMemo(
    () => (past.data ?? []).find((c) => c.status === 'completed') ?? null,
    [past.data],
  );

  const needsConsent = consent.data ? !consent.data.teleconsultationConsent : false;

  const actions: QuickAction[] = [
    {
      key: 'instant',
      label: t('dashboard.consultNow'),
      sublabel: t('dashboard.consultNowSub'),
      icon: 'video',
      emphasis: true,
      // Consult Now starts in Find the Right Care: the patient describes the
      // problem and we map it to a SERVICE. It never opens a provider list.
      onPress: () => navigate('assistant'),
    },
    {
      key: 'book',
      label: t('dashboard.book'),
      sublabel: t('dashboard.bookSub'),
      icon: 'calendar',
      onPress: () => navigate('services'),
    },
    {
      key: 'reports',
      label: t('dashboard.reports'),
      sublabel: t('dashboard.reportsSub'),
      icon: 'document',
      onPress: () => navigate('reports'),
    },
    {
      key: 'support',
      label: t('dashboard.support'),
      sublabel: t('dashboard.supportSub'),
      icon: 'headset',
      onPress: () => navigate('settings'),
    },
  ];

  const refreshing =
    upcoming.isFetching && upcoming.isSuccess && past.isFetching && past.isSuccess;

  const refreshAll = () => {
    void profile.refetch();
    void upcoming.refetch();
    void past.refetch();
    void unread.refetch();
    void services.refetch();
  };

  return (
    <Screen
      testID="dashboard"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshAll}
          tintColor={colors.surfie}
          colors={[colors.surfie]}
        />
      }
      header={
        <View style={s.header}>
          <View style={s.flex}>
            <Text style={s.greeting}>{t(greetingKeyFor())}</Text>
            {profile.isLoading ? (
              <Skeleton width={150} height={22} style={{ marginTop: 4 }} />
            ) : (
              <Text style={s.name} numberOfLines={1} accessibilityRole="header">
                {firstName ? `${firstName} 👋` : `${t('dashboard.welcome')} 👋`}
              </Text>
            )}
          </View>
          <EmergencyButton onPress={() => navigate('emergency')} />
          <IconButton
            name="bell"
            label={t('dashboard.notifications')}
            badge={unread.data?.unread ?? false}
            onPress={() => navigate('notifications')}
          />
          <Pressable
            onPress={() => navigate('account')}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.yourProfile')}
            style={({ pressed }) => pressed && s.pressed}
          >
            <Avatar initials={initials || '··'} size={40} />
          </Pressable>
        </View>
      }
    >
      {/* A real destination: it opens Find the Right Care, which maps what the
          patient types onto SERVICES via `POST /search`. Not a decorative field,
          and not a route to a provider list — there isn't one. */}
      <Pressable
        onPress={() => navigate('assistant')}
        accessibilityRole="search"
        accessibilityLabel={t('dashboard.searchPlaceholder')}
        accessibilityHint={t('dashboard.searchHint')}
        style={({ pressed }) => [s.search, pressed && s.pressed]}
      >
        <Icon name="search" size={18} color={colors.inkFaint} />
        <Text style={s.searchText}>{t('dashboard.searchPlaceholder')}</Text>
      </Pressable>

      {needsConsent && (
        <Banner
          tone="warn"
          title={t('dashboard.consentNeeded')}
          body={t('dashboard.consentNeededBody')}
          actionLabel={t('dashboard.reviewConsent')}
          onAction={() => navigate('consent')}
        />
      )}

      {/* ---------------------------- next up ---------------------------- */}
      <View style={s.block}>
        <SectionHeader
          title={t('dashboard.nextConsultation')}
          actionLabel={upcoming.data?.length ? t('common.seeAll') : undefined}
          onAction={() => navigate('appointments')}
        />

        {upcoming.isLoading && <SkeletonCard lines={2} />}

        {upcoming.isError && (
          <ErrorState
            compact
            title={t('dashboard.consultationsError')}
            body={messageFor(upcoming.error)}
            requestId={upcoming.error?.requestId}
            onRetry={upcoming.refetch}
          />
        )}

        {upcoming.isSuccess && !nextConsultation && (
          <Card tone="mint" elevation="none">
            <EmptyState
              compact
              icon="calendar"
              title={t('dashboard.nothingBooked')}
              body={t('dashboard.nothingBookedBody')}
              actionLabel={t('dashboard.bookConsultation')}
              onAction={() => navigate('services')}
            />
          </Card>
        )}

        {nextConsultation && (
          <AppointmentCard
            featured
            consultation={nextConsultation}
            services={services.data}
            onPress={() =>
              navigate('consultation', { consultationId: nextConsultation.id })
            }
            onPrimaryAction={() =>
              navigate('consultation', { consultationId: nextConsultation.id })
            }
          />
        )}
      </View>

      {/* -------------------------- quick actions ------------------------ */}
      <View style={s.block}>
        <SectionHeader title={t('dashboard.quickActions')} />
        <View style={s.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.key}
              onPress={a.onPress}
              accessibilityRole="button"
              accessibilityLabel={`${a.label}. ${a.sublabel}`}
              style={({ pressed }) => [s.action, pressed && s.pressed]}
            >
              <View style={[s.actionIcon, a.emphasis && s.actionIconEmphasis]}>
                <Icon
                  name={a.icon}
                  size={21}
                  color={a.emphasis ? colors.white : colors.surfie}
                />
              </View>
              <Text style={s.actionLabel} numberOfLines={1}>
                {a.label}
              </Text>
              <Text style={s.actionSub} numberOfLines={1}>
                {a.sublabel}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ------------------------- explore services ---------------------- */}
      <View style={s.block}>
        <SectionHeader
          title={t('dashboard.exploreServices')}
          subtitle={
            services.data?.length
              ? t('dashboard.servicesAvailable', { count: services.data.length })
              : undefined
          }
          actionLabel={services.data?.length ? 'View all' : undefined}
          onAction={() => navigate('services')}
        />

        {services.isLoading && (
          <View style={s.rail}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width={108} height={128} radius={radius.card} />
            ))}
          </View>
        )}

        {services.isError && (
          <ErrorState
            compact
            title={t('dashboard.servicesUnavailable')}
            body={messageFor(services.error)}
            onRetry={services.refetch}
          />
        )}

        {services.isSuccess && services.data.length === 0 && (
          <Card tone="mint" elevation="none">
            <EmptyState
              compact
              icon="stethoscope"
              title={t('dashboard.noServices')}
              body={t('dashboard.noServicesBody')}
            />
          </Card>
        )}

        {!!services.data?.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.rail}
          >
            {services.data.map((service) => (
              <ServiceTile
                key={service.id}
                service={service}
                onPress={() => {
                  flow.setService(service);
                  navigate('choose-time');
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ---------------------------- your care -------------------------- */}
      <View style={s.block}>
        <SectionHeader title={t('dashboard.yourCare')} />
        <Card elevation="card" style={s.care}>
          <View style={s.careRow}>
            <View style={s.careStat}>
              <Text style={s.careValue}>
                {upcoming.isLoading ? '–' : (upcoming.data?.length ?? 0)}
              </Text>
              <Text style={s.careLabel}>{t('dashboard.upcoming')}</Text>
            </View>
            <View style={s.careDivider} />
            <View style={s.careStat}>
              <Text style={s.careValue}>{past.isLoading ? '–' : completedCount}</Text>
              <Text style={s.careLabel}>{t('dashboard.completed')}</Text>
            </View>
            <View style={s.careDivider} />
            <View style={s.careStat}>
              <Text style={s.careValue}>
                {profile.data?.isComplete ? t('dashboard.profileReady') : t('dashboard.profilePartial')}
              </Text>
              <Text style={s.careLabel}>{t('dashboard.profileLabel')}</Text>
            </View>
          </View>

          {lastCompleted ? (
            <Pressable
              onPress={() => navigate('consultation', { consultationId: lastCompleted.id })}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.latestRecordHint')}
              style={({ pressed }) => [s.careLink, pressed && s.pressed]}
            >
              <Icon name="prescription" size={17} color={colors.surfie} />
              <Text style={s.careLinkText}>{t('dashboard.latestRecord')}</Text>
              <Icon name="chevronRight" size={16} color={colors.surfie} />
            </Pressable>
          ) : (
            <Text style={s.careHint}>{t('dashboard.afterFirst')}</Text>
          )}
        </Card>
      </View>

    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  block: { gap: spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  greeting: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  name: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    ...shadow.card,
  },
  searchText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkFaint,
  },

  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    minHeight: 96,
    ...shadow.card,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconEmphasis: { backgroundColor: colors.surfie },
  actionLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  actionSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkFaint,
  },

  rail: { gap: spacing.md, paddingRight: spacing.lg },

  care: { gap: spacing.lg },
  careRow: { flexDirection: 'row', alignItems: 'center' },
  careStat: { flex: 1, alignItems: 'center', gap: 2 },
  careDivider: { width: 1, height: 34, backgroundColor: colors.surface.line },
  careValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '800',
    color: colors.surfie,
  },
  careLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    fontWeight: '600',
  },
  careLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
  },
  careLinkText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  careHint: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkFaint,
    lineHeight: 19,
  },
});

export default DashboardScreen;
