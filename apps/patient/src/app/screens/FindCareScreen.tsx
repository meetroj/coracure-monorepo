import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';

import {
  messageFor,
  useSearch,
  useSearchGuide,
  useSearchSuggestions,
  type ServiceMatch,
} from '@coracure/api';
import { colors, radius, shadow, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Banner,
  BrandBackground,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Screen,
  SectionHeader,
  Skeleton,
  StatusPill,
  TextField,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { EmergencyButton } from '../../components/EmergencyGuidance';
import { iconForService } from '../../components/ServiceTile';
import { formatInr, formatWhen } from '../../lib/consultation';
import { rememberSearch } from '../../lib/recentSearches';
import { useCareFlow } from '../flow/CareFlowProvider';
import { useNavigator } from '../navigation/Navigator';

/**
 * Find the Right Care — the RECOMMENDATIONS screen.
 *
 * The entry lives on `assistant`, which runs the search and hands the response
 * here through the care flow, so arriving does not cost a second request. The
 * refine box at the top re-runs it for a patient who wants to say it differently.
 *
 * *** THIS SCREEN CANNOT PRODUCE A PROVIDER, BY CONSTRUCTION. *** `POST /search`
 * returns SERVICES with a plain-language reason, the fee, and the soonest the
 * POOL can cover them. There is no provider in the response shape, so there is
 * nothing here that could become a browsable doctor list — which is the point.
 * No name, no photo, no rating, no "book with Dr X".
 *
 * *** THE DISCLAIMER IS THE SERVER'S AND IS ALWAYS RENDERED. *** FR-5.8 requires
 * the interface to state plainly that this recommends whom to consult and does
 * not screen, diagnose or decide treatment. The backend returns that sentence
 * on every response precisely so a client cannot forget it, so it is rendered
 * verbatim and is never replaced with app copy.
 *
 * *** THE CRISIS CHECK IS THE SERVER'S TOO. *** When `crisis` is true the
 * response carries `guidance` and `results` is empty. This screen then replaces
 * its results entirely — it does not show guidance alongside services — and
 * requires an explicit dismissal before the ordinary flow resumes. The app runs
 * no keyword list of its own: the list is clinically approved content edited
 * without a release, and a second, looser copy in the client would be the one
 * that quietly fell behind.
 */
export const FindCareScreen = () => {
  const t = useT();
  const { back, navigate } = useNavigator();

  const flow = useCareFlow();

  // Seeded from the search the assistant already ran — one request, not two.
  const [query, setQuery] = useState(flow.results?.query ?? '');
  const [touched, setTouched] = useState(false);
  const disclaimer = flow.results?.disclaimer ?? null;
  const results = flow.results?.results ?? null;

  const search = useSearch();
  const suggestions = useSearchSuggestions();
  // Loaded only once the patient asks to browse, so the ordinary path is one
  // request rather than two.
  const [browsing, setBrowsing] = useState(false);
  const guide = useSearchGuide(browsing);

  const run = async (text: string) => {
    const trimmed = text.trim();
    setTouched(true);
    if (trimmed.length < 2 || search.isPending) return;
    try {
      const response = await search.mutate(trimmed);
      rememberSearch(trimmed, response.crisis);

      // A crisis REPLACES the flow entirely — it is a full screen, not a panel
      // sharing space with service recommendations.
      if (response.crisis) {
        flow.setCrisis(response.guidance);
        navigate('emergency', { fromSearch: true });
        return;
      }
      flow.setResults({
        query: trimmed,
        disclaimer: response.disclaimer,
        results: response.results,
      });
    } catch {
      // Rendered from `search.error`. The query is untouched.
    }
  };

  /** A recommendation is a SERVICE. Choosing one goes to a TIME, never a person. */
  const chooseService = (match: ServiceMatch) => {
    flow.setService(match);
    flow.setConcernId(match.concerns?.[0]?.id ?? null);
    navigate('choose-time');
  };

  /* ------------------------------ the search ------------------------------ */
  const showValidation = touched && query.trim().length < 2;

  return (
    <BrandBackground intensity="soft">
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          testID="find-care"
          background="transparent"
          bottomInset
          header={
            <AppHeader
              title={t('findCare.title')}
              onBack={back}
              right={<EmergencyButton onPress={() => navigate('emergency')} />}
            />
          }
        >
          <Text style={s.subtitle}>{t('findCare.subtitle')}</Text>

          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder={t('findCare.placeholder')}
            icon="search"
            multiline
            autoCorrect={false}
            returnKeyType="search"
            maxLength={400}
            onSubmitEditing={() => run(query)}
            editable={!search.isPending}
            accessibilityLabel={t('findCare.title')}
            error={showValidation ? t('findCare.subtitle') : null}
          />

          <Button
            label={search.isPending ? t('findCare.searching') : t('findCare.searchAction')}
            onPress={() => run(query)}
            loading={search.isPending}
            disabled={search.isPending || query.trim().length < 2}
            testID="run-search"
          />

          {/*
            FR-5.8. Rendered verbatim from the server on every response, and
            never composed here. `disclaimerLabel` is the only local string —
            the sentence itself is the backend's.
          */}
          {!!disclaimer && (
            <View style={s.disclaimer} accessibilityLiveRegion="polite">
              <Icon name="info" size={15} color={colors.inkMuted} />
              <View style={s.flex}>
                <Text style={s.disclaimerLabel}>{t('findCare.disclaimerLabel')}</Text>
                <Text style={s.disclaimerText}>{disclaimer}</Text>
              </View>
            </View>
          )}

          {!!search.error && (
            <ErrorState
              compact
              title={t('findCare.searchError')}
              body={messageFor(search.error)}
              requestId={search.error.requestId}
              onRetry={() => run(query)}
            />
          )}

          {/* ---------------------------- results --------------------------- */}
          {search.isPending && (
            <View style={s.list}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={132} radius={radius.card} />
              ))}
            </View>
          )}

          {results !== null && results.length === 0 && !search.isPending && (
            <Card tone="mint" elevation="none">
              <EmptyState
                icon="search"
                title={t('findCare.noResults')}
                body={t('findCare.noResultsBody')}
                actionLabel={t('services.chooseTitle')}
                onAction={() => navigate('services')}
              />
            </Card>
          )}

          {!!results?.length && (
            <View style={s.list}>
              <SectionHeader title={t('findCare.resultsTitle')} />
              {results.map((match) => (
                <RecommendationCard
                  key={match.id}
                  match={match}
                  onChooseTime={() => chooseService(match)}
                />
              ))}
              <View style={s.rule}>
                <Icon name="shieldCheck" size={15} color={colors.inkFaint} />
                <Text style={s.ruleText}>{t('findCare.neverPicksDoctor')}</Text>
              </View>
            </View>
          )}

          {/* ------------------------- before typing ------------------------ */}
          {results === null && !search.isPending && (
            <>
              {!!suggestions.data?.popular?.length && (
                <View style={s.list}>
                  <SectionHeader title={t('findCare.popular')} />
                  <View style={s.chips}>
                    {suggestions.data.popular.map((phrase) => (
                      <Pressable
                        key={phrase}
                        onPress={() => {
                          setQuery(phrase);
                          void run(phrase);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={phrase}
                        style={({ pressed }) => [s.chip, pressed && s.pressed]}
                      >
                        <Text style={s.chipText}>{phrase}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <Button
                label={t('findCare.browseAll')}
                variant="secondary"
                icon="stethoscope"
                onPress={() => setBrowsing((b) => !b)}
              />
            </>
          )}

          {/* -------------------------- browse guide ------------------------ */}
          {browsing && (
            <View style={s.list}>
              <SectionHeader title={t('findCare.browseTitle')} />
              {guide.isLoading &&
                [0, 1, 2].map((i) => <Skeleton key={i} height={108} radius={radius.card} />)}
              {guide.isError && (
                <ErrorState
                  compact
                  title={t('booking.servicesError')}
                  body={messageFor(guide.error)}
                  onRetry={guide.refetch}
                />
              )}
              {guide.data?.services.map((entry) => (
                <RecommendationCard
                  key={entry.id}
                  match={{ ...entry, reason: '', matchedBy: 'mapping' }}
                  onChooseTime={() => chooseService({ ...entry, reason: '', matchedBy: 'mapping' })}
                />
              ))}
            </View>
          )}
        </Screen>
      </KeyboardAvoidingView>

    </BrandBackground>
  );
};

/**
 * One recommendation.
 *
 * Shows the SERVICE, why it was suggested, the fee, and the soonest the pool
 * can cover it. Deliberately no provider identity of any kind — see the note on
 * the screen.
 */
const RecommendationCard = ({
  match,
  onChooseTime,
}: {
  match: ServiceMatch;
  onChooseTime: () => void;
}) => {
  const t = useT();
  return (
    <Card elevation="card" style={s.rec}>
      <View style={s.recHead}>
        <View style={s.recIcon}>
          <Icon name={iconForService(match)} size={22} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <Text style={s.recName} numberOfLines={2}>
            {match.name}
          </Text>
          {!!match.reason && (
            <Text style={s.recReason} numberOfLines={2}>
              {match.reason}
            </Text>
          )}
        </View>
        <Text style={s.recFee}>{formatInr(match.consultationFeeInr)}</Text>
      </View>

      {!!match.concerns?.length && (
        <View style={s.concerns}>
          {match.concerns.slice(0, 4).map((c) => (
            <View key={c.id} style={s.concern}>
              <Text style={s.concernText}>{c.name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.recMeta}>
        <View style={s.recMetaItem}>
          <Icon name="clock" size={14} color={colors.inkFaint} />
          <Text style={s.recMetaText}>
            {match.soonestAvailableAt
              ? t('findCare.soonest', { when: formatWhen(match.soonestAvailableAt) })
              : t('findCare.soonestUnknown')}
          </Text>
        </View>
        {/*
          FR-5.4: a result the assistant suggested rather than the clinically
          reviewed mapping is labelled as such. The patient should be able to
          tell the difference.
        */}
        {match.matchedBy === 'assistant' && (
          <StatusPill label={t('findCare.suggestedByAssistant')} tone="warn" dot={false} icon="sparkle" />
        )}
      </View>

      <Button
        label={t('findCare.chooseTime')}
        size="md"
        onPress={onChooseTime}
        trailingArrow
        accessibilityHint={`${match.name}, ${formatInr(match.consultationFeeInr)}`}
      />
    </Card>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  list: { gap: spacing.md },

  subtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 21,
  },

  disclaimer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.mintSoft,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  disclaimerLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '800',
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
    marginTop: 3,
  },

  crisisHead: { alignItems: 'center', paddingTop: spacing.lg },
  crisisIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rec: { gap: spacing.md },
  recHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  recIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.ink,
  },
  recReason: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  recFee: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.surfie,
  },

  concerns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  concern: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.selected,
  },
  concernText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
    fontWeight: '600',
  },

  recMeta: { gap: spacing.sm },
  recMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recMetaText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    fontWeight: '600',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    ...shadow.card,
  },
  chipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
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

export default FindCareScreen;
