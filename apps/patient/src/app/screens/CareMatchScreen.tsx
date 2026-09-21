import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { messageFor, useSearch } from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Banner,
  Button,
  Card,
  Icon,
  Screen,
  StepProgress,
} from '@coracure/ui';
import { useT, type TranslationKey } from '@coracure/i18n';

import { EmergencyButton } from '../../components/EmergencyGuidance';
import { rememberSearch } from '../../lib/recentSearches';
import { useCareFlow } from '../flow/CareFlowProvider';
import { useNavigator } from '../navigation/Navigator';

/**
 * The guided route into a recommendation, for PT-09-03: "browse when I am
 * unsure". A patient who cannot put the problem into words answers three
 * questions instead of typing.
 *
 * *** THESE QUESTIONS ARE NOT DIAGNOSTIC AND MUST NEVER BECOME SO. *** They ask
 * which broad area the problem is in, how long it has gone on, and what kind of
 * help is wanted. None of that screens for a condition; it narrows which
 * SERVICE to suggest. Adding "do you have chest pain?" here would turn the
 * screen into unsupervised triage, which SRS section 8 puts behind a qualified
 * reviewer and which this app is explicitly not allowed to do.
 *
 * *** THE ANSWERS BECOME A SEARCH QUERY, NOT A RULE ENGINE. *** The app does
 * not map answers to services itself — that mapping is clinically reviewed
 * content owned by the backend. The answers are composed into a plain-language
 * sentence and sent to `POST /v1/search`, so the same approved taxonomy decides
 * the result as it would for typed text, and the crisis guardrail still applies.
 *
 * The questions are hardcoded here because there is no endpoint that serves
 * them — the specialty `intakeForm` is admin-scoped (gap G-4). When that lands,
 * `QUESTIONS` becomes a fetch and nothing else changes.
 */

type Question = {
  id: string;
  titleKey: TranslationKey;
  helpKey?: TranslationKey;
  options: { value: string; labelKey: TranslationKey }[];
};

const QUESTIONS: Question[] = [
  {
    id: 'area',
    titleKey: 'careMatch.q1',
    helpKey: 'careMatch.q1Help',
    options: [
      { value: 'something physical', labelKey: 'careMatch.a_body' },
      { value: 'mood, stress or sleep', labelKey: 'careMatch.a_mind' },
      { value: 'a habit I want help with', labelKey: 'careMatch.a_habit' },
      { value: 'following up on earlier care', labelKey: 'careMatch.a_followup' },
    ],
  },
  {
    id: 'duration',
    titleKey: 'careMatch.q2',
    options: [
      { value: 'for a few days', labelKey: 'careMatch.a_days' },
      { value: 'for a few weeks', labelKey: 'careMatch.a_weeks' },
      { value: 'for months', labelKey: 'careMatch.a_months' },
      { value: '', labelKey: 'careMatch.a_unsure' },
    ],
  },
  {
    id: 'support',
    titleKey: 'careMatch.q3',
    options: [
      { value: 'I want someone to talk to', labelKey: 'careMatch.a_talk' },
      { value: 'I want medical advice', labelKey: 'careMatch.a_advice' },
      { value: 'I may need a prescription', labelKey: 'careMatch.a_medicine' },
      { value: '', labelKey: 'careMatch.a_open' },
    ],
  },
];

export const CareMatchScreen = () => {
  const t = useT();
  const { back, navigate } = useNavigator();
  const flow = useCareFlow();
  const search = useSearch();

  const [index, setIndex] = useState(0);
  const question = QUESTIONS[index]!;
  const isLast = index === QUESTIONS.length - 1;
  const chosen = flow.answers[question.id];

  /** The answers, as the sentence a patient would have typed. */
  const composed = useMemo(
    () =>
      QUESTIONS.map((q) => flow.answers[q.id])
        .filter((v): v is string => !!v && v.length > 0)
        .join(', '),
    [flow.answers],
  );

  const finish = async () => {
    const query = composed.trim();
    if (!query) {
      // Nothing usable was answered — the catalogue is a better destination
      // than a search with no terms.
      navigate('services');
      return;
    }
    try {
      const response = await search.mutate(query);
      rememberSearch(query, response.crisis);
      if (response.crisis) {
        flow.setCrisis(response.guidance);
        navigate('emergency', { fromSearch: true });
        return;
      }
      flow.setResults({ query, disclaimer: response.disclaimer, results: response.results });
      navigate('find-care');
    } catch {
      // Rendered from `search.error`; the answers are untouched.
    }
  };

  const advance = () => {
    if (isLast) void finish();
    else setIndex((i) => i + 1);
  };

  return (
    <Screen
      testID="care-match"
      bottomInset
      header={
        <AppHeader
          title={t('careMatch.title')}
          onBack={index === 0 ? back : () => setIndex((i) => i - 1)}
          right={<EmergencyButton onPress={() => navigate('emergency')} />}
        />
      }
      footer={
        <View style={s.footer}>
          <Button
            label={isLast ? t('careMatch.seeRecommendation') : t('careMatch.continue')}
            onPress={advance}
            trailingArrow
            loading={search.isPending}
            disabled={search.isPending || chosen === undefined}
            testID="care-match-continue"
          />
          <Button
            label={t('careMatch.skip')}
            variant="quiet"
            onPress={() => {
              flow.setAnswer(question.id, '');
              advance();
            }}
            disabled={search.isPending}
          />
        </View>
      }
    >
      <StepProgress
        step={index + 1}
        total={QUESTIONS.length}
        label={t('careMatch.stepOf', { step: index + 1, total: QUESTIONS.length })}
      />

      <Text style={s.lede}>{t('careMatch.lede')}</Text>

      {!!search.error && (
        <Banner
          tone={search.error.isNetwork ? 'warn' : 'danger'}
          body={messageFor(search.error)}
          actionLabel={search.error.isRetryable ? t('common.retry') : undefined}
          onAction={search.error.isRetryable ? finish : undefined}
          onDismiss={search.reset}
        />
      )}

      <Card elevation="card" style={s.card}>
        <Text style={s.question} accessibilityRole="header">
          {t(question.titleKey)}
        </Text>
        {!!question.helpKey && <Text style={s.help}>{t(question.helpKey)}</Text>}

        <View style={s.options} accessibilityRole="radiogroup">
          {question.options.map((opt) => {
            const label = t(opt.labelKey);
            const on = chosen === opt.value;
            return (
              <Pressable
                key={opt.labelKey}
                onPress={() => flow.setAnswer(question.id, opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={label}
                style={({ pressed }) => [s.option, on && s.optionOn, pressed && s.pressed]}
              >
                <Text style={[s.optionText, on && s.optionTextOn]}>{label}</Text>
                {on && <Icon name="checkCircle" size={19} color={colors.surfie} filled />}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={s.note}>
        <Icon name="info" size={15} color={colors.inkFaint} />
        <Text style={s.noteText}>{t('careMatch.genericNote')}</Text>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  pressed: { opacity: 0.75 },

  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 21,
  },

  card: { gap: spacing.md },
  question: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  help: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
    marginTop: -spacing.xs,
  },

  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
  },
  optionOn: { borderColor: colors.surfie, backgroundColor: colors.surface.mint },
  optionText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
    fontWeight: '600',
  },
  optionTextOn: { color: colors.surfie, fontWeight: '700' },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 17,
  },

  footer: { gap: spacing.xs, paddingTop: spacing.sm },
});

export default CareMatchScreen;
