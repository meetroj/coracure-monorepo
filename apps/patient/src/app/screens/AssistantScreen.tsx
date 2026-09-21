import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';

import { messageFor, useSearch, useSearchSuggestions } from '@coracure/api';
import { colors, radius, shadow, spacing, typography } from '@coracure/brand';
import {
  Banner,
  BrandBackground,
  Button,
  Card,
  Icon,
  Screen,
  SectionHeader,
  Sheet,
  Skeleton,
  SuggestionChip,
  TextField,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { WideLogo } from '../../components/Brand';
import { EmergencyButton } from '../../components/EmergencyGuidance';
import { draftKeys, useDraft } from '../../lib/drafts';
import { rememberSearch, useRecentSearches } from '../../lib/recentSearches';
import { useCareFlow } from '../flow/CareFlowProvider';
import { useNavigator } from '../navigation/Navigator';

/**
 * PT-09-01 — describe the problem in your own words.
 *
 * This is the ENTRY. It takes free text and nothing else; the results live on
 * `find-care`, which this screen hands off to. Splitting them is what lets the
 * entry stay calm and the results screen stay a results screen.
 *
 * *** IT IS NOT AN AI DOCTOR AND THE COPY NEVER SAYS IT IS. *** PT-09-01
 * requires the screen to state visibly that this does not screen, diagnose or
 * decide treatment, and that sentence is the BACKEND's — returned on every
 * search response so a client cannot forget it. The header subtitle is "here to
 * point you to the right care", which is the whole of what it does.
 *
 * *** CRISIS IS DETECTED SERVER-SIDE. *** A `crisis: true` response is routed
 * straight to the emergency screen. The app runs no keyword list of its own:
 * the list is clinically approved content edited without an app release, and a
 * second copy in the client is the one that quietly falls behind.
 */
export const AssistantScreen = () => {
  const t = useT();
  const { navigate } = useNavigator();
  const flow = useCareFlow();

  // SH-03: what the patient typed survives navigating away and a failed request.
  const [query, setQuery] = useDraft(draftKeys.assistantQuery, '');
  const [touched, setTouched] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const suggestions = useSearchSuggestions();
  const { recent, clear } = useRecentSearches();
  const search = useSearch();

  const run = async (text: string) => {
    const trimmed = text.trim();
    setTouched(true);
    if (trimmed.length < 2 || search.isPending) return;
    try {
      const response = await search.mutate(trimmed);
      // Recorded from the RESPONSE, so a crisis phrase is never kept as a chip.
      rememberSearch(trimmed, response.crisis);

      if (response.crisis) {
        flow.setCrisis(response.guidance);
        navigate('emergency', { fromSearch: true });
        return;
      }

      // The results screen renders what this one fetched — one search, not two.
      flow.setResults({ query: trimmed, disclaimer: response.disclaimer, results: response.results });
      navigate('find-care');
    } catch {
      // Rendered from `search.error`. The query is untouched, so the patient
      // does not retype it.
    }
  };

  const examples = [t('assistant.example1'), t('assistant.example2'), t('assistant.example3')];
  const showValidation = touched && query.trim().length < 2;

  return (
    <BrandBackground intensity="soft">
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          testID="assistant"
          background="transparent"
          bottomInset
          header={
            <View style={s.header}>
              <View style={s.brand}>
                <WideLogo width={112} />
                <Text style={s.status} numberOfLines={1}>
                  {t('assistant.status')}
                </Text>
              </View>
              {/* PT-18-02: reachable from every main patient screen. */}
              <EmergencyButton onPress={() => navigate('emergency')} />
            </View>
          }
        >
          <View style={s.headings}>
            <Text style={s.heading} accessibilityRole="header">
              {t('assistant.heading')}
            </Text>
            <Text style={s.lede}>{t('assistant.lede')}</Text>
          </View>

          <Card elevation="card" style={s.inputCard}>
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder={t('assistant.placeholder')}
              accessibilityLabel={t('assistant.inputLabel')}
              multiline
              autoCorrect={false}
              maxLength={400}
              returnKeyType="search"
              onSubmitEditing={() => run(query)}
              editable={!search.isPending}
              error={showValidation ? t('assistant.tooShort') : null}
              right={
                <Pressable
                  onPress={() => setVoiceOpen(true)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('assistant.voice')}
                  accessibilityHint={t('assistant.voiceHint')}
                  style={({ pressed }) => [s.mic, pressed && s.pressed]}
                >
                  <Icon name="message" size={18} color={colors.surfie} />
                </Pressable>
              }
            />
            <Button
              label={search.isPending ? t('assistant.submitting') : t('assistant.submit')}
              onPress={() => run(query)}
              loading={search.isPending}
              disabled={search.isPending || query.trim().length < 2}
              trailingArrow
              testID="assistant-submit"
            />
          </Card>

          {!!search.error && (
            <Banner
              tone={search.error.isNetwork ? 'warn' : 'danger'}
              body={messageFor(search.error)}
              actionLabel={search.error.isRetryable ? t('common.retry') : undefined}
              onAction={search.error.isRetryable ? () => run(query) : undefined}
              onDismiss={search.reset}
            />
          )}

          {/* ------------------------------ recent ------------------------- */}
          {recent.length > 0 && (
            <View style={s.block}>
              <SectionHeader
                title={t('assistant.recent')}
                actionLabel={t('assistant.clearRecent')}
                onAction={clear}
              />
              <View style={s.chips}>
                {recent.map((phrase) => (
                  <SuggestionChip
                    key={phrase}
                    label={phrase}
                    icon="clock"
                    onPress={() => {
                      setQuery(phrase);
                      void run(phrase);
                    }}
                  />
                ))}
              </View>
              <Text style={s.privacyNote}>{t('assistant.recentPrivacy')}</Text>
            </View>
          )}

          {/* ---------------------------- suggestions ---------------------- */}
          <View style={s.block}>
            <SectionHeader title={t('assistant.popular')} />
            {suggestions.isLoading && (
              <View style={s.chips}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} width={120} height={40} radius={radius.pill} />
                ))}
              </View>
            )}
            {!!suggestions.data?.popular?.length && (
              <View style={s.chips}>
                {suggestions.data.popular.map((phrase) => (
                  <SuggestionChip
                    key={phrase}
                    label={phrase}
                    tone="brand"
                    onPress={() => {
                      setQuery(phrase);
                      void run(phrase);
                    }}
                  />
                ))}
              </View>
            )}
            {/*
              The suggestions endpoint failing is not worth an error state — the
              screen works perfectly without it, so it simply shows the examples.
            */}
            {(suggestions.isError || suggestions.data?.popular?.length === 0) && (
              <View style={s.examples}>
                {examples.map((ex) => (
                  <Pressable
                    key={ex}
                    onPress={() => setQuery(ex)}
                    accessibilityRole="button"
                    accessibilityLabel={ex}
                    style={({ pressed }) => [s.example, pressed && s.pressed]}
                  >
                    <Icon name="message" size={15} color={colors.inkFaint} />
                    <Text style={s.exampleText}>{ex}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* ------------------------------ unsure ------------------------- */}
          <Card tone="mint" elevation="none" style={s.unsure}>
            <View style={s.unsureIcon}>
              <Icon name="stethoscope" size={19} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.unsureTitle}>{t('assistant.unsure')}</Text>
              <Pressable
                onPress={() => navigate('services')}
                hitSlop={8}
                accessibilityRole="button"
                style={s.unsureLink}
              >
                <Text style={s.unsureLinkText}>{t('assistant.browseServices')}</Text>
                <Icon name="arrowRight" size={14} color={colors.surfie} />
              </Pressable>
            </View>
          </Card>
        </Screen>
      </KeyboardAvoidingView>

      {/*
        Voice: the platform keyboard's own dictation is what actually works
        today. A bundled recorder means a native speech dependency and an audio
        permission, which is not worth adding to say the same thing — so this
        points at the microphone the patient already has rather than shipping a
        button that does nothing.
      */}
      <Sheet
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        title={t('assistant.voiceUnavailable')}
      >
        <Text style={s.sheetBody}>{t('assistant.voiceUnavailableBody')}</Text>
        <Button label={t('common.close')} variant="secondary" onPress={() => setVoiceOpen(false)} />
      </Sheet>
    </BrandBackground>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  block: { gap: spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  brand: { gap: 2, flexShrink: 1 },
  status: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },

  headings: { gap: spacing.sm, paddingTop: spacing.xs },
  heading: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 22,
  },

  inputCard: { gap: spacing.md },
  mic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  privacyNote: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 16,
  },

  examples: { gap: spacing.sm },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    ...shadow.card,
  },
  exampleText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },

  unsure: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  unsureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsureTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  unsureLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  unsureLinkText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },

  sheetBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
});

export default AssistantScreen;
