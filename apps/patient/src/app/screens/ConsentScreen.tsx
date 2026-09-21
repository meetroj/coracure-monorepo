import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { messageFor, useAcceptConsent, useLegalDocument } from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  Accordion,
  Banner,
  BrandBackground,
  Button,
  ErrorState,
  Icon,
  Screen,
  Sheet,
  Skeleton,
  StepDots,
} from '@coracure/ui';

import { useNavigator } from '../navigation/Navigator';
import { useT } from '@coracure/i18n';

/**
 * Teleconsultation consent (FR-2.3).
 *
 * *** THE COPY IS THE BACKEND'S, NOT THIS SCREEN'S. *** `GET
 * /legal/documents/teleconsultation_consent` returns the current version's full
 * text as supplied by the client, and `POST /legal/consents` records acceptance
 * against whichever version is current server-side. Hardcoding the wording here
 * would mean the app could show one text and the audit trail record another —
 * which is exactly the thing a consent record exists to prevent. So this screen
 * fetches, sections and renders; it never authors.
 *
 * Accepting is idempotent server-side, so a retried tap is not an error.
 */

/**
 * Splits the document body into collapsible sections.
 *
 * The `body` column is free text and its shape is the client's to decide, so
 * this recognises the two conventions legal copy actually arrives in —
 * markdown headings, and numbered clause headings — and falls back to one
 * section rather than mangling anything it does not understand.
 */
type Section = { heading: string; body: string };

const sectionise = (body: string): Section[] => {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;

  const isHeading = (line: string): string | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const md = /^#{1,4}\s+(.*)$/.exec(trimmed);
    if (md) return md[1]!.trim();
    // "1. What we store" / "3) Recording" — a short numbered clause title.
    const numbered = /^(\d{1,2})[.)]\s+(.{3,80})$/.exec(trimmed);
    if (numbered && !trimmed.endsWith('.')) return numbered[2]!.trim();
    return null;
  };

  for (const line of lines) {
    const heading = isHeading(line);
    if (heading) {
      if (current) sections.push(current);
      current = { heading, body: '' };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    } else if (line.trim()) {
      current = { heading: 'Summary', body: line };
    }
  }
  if (current) sections.push(current);

  return sections
    .map((s) => ({ heading: s.heading, body: s.body.trim() }))
    .filter((s) => s.body.length > 0);
};

export const ConsentScreen = () => {
  const { replace } = useNavigator();
  const t = useT();
  const doc = useLegalDocument('teleconsultation_consent');
  const accept = useAcceptConsent();
  const [declineOpen, setDeclineOpen] = useState(false);

  const sections = useMemo(() => (doc.data ? sectionise(doc.data.body) : []), [doc.data]);

  const onAccept = async () => {
    try {
      await accept.mutate('teleconsultation_consent');
      replace('splash');
    } catch {
      // Rendered from `accept.error`.
    }
  };

  const onDecline = () => {
    setDeclineOpen(false);
    // Declining is a real choice, not a dead end. The account stays; booking is
    // what is gated, and the backend enforces that with `CONSENT_REQUIRED`.
    // Nothing is sent — there is no "record a refusal" endpoint, and inventing
    // one would fabricate a legal record.
    replace('dashboard');
  };

  if (doc.isLoading) {
    return (
      <BrandBackground intensity="soft">
        <Screen background="transparent" testID="consent-loading">
          <View style={s.skeleton}>
            <Skeleton width={52} height={52} radius={26} />
            <Skeleton width="70%" height={28} />
            <Skeleton width="90%" height={16} />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={60} radius={radius.card} />
            ))}
          </View>
        </Screen>
      </BrandBackground>
    );
  }

  if (doc.isError || !doc.data) {
    return (
      <BrandBackground intensity="soft">
        <Screen background="transparent" scroll={false}>
          <ErrorState
            title={t('consent.loadError')}
            body={messageFor(doc.error, t('consent.loadErrorBody'))}
            requestId={doc.error?.requestId}
            onRetry={doc.refetch}
          />
        </Screen>
      </BrandBackground>
    );
  }

  return (
    <BrandBackground intensity="soft">
      <Screen
        background="transparent"
        bottomInset
        testID="consent"
        footer={
          <View style={s.footer}>
            <Button
              label={t('consent.acceptContinue')}
              onPress={onAccept}
              trailingArrow
              loading={accept.isPending}
              disabled={accept.isPending}
              testID="accept-consent"
              accessibilityHint={t('consent.acceptHint', { version: doc.data.version })}
            />
            <Button
              label={t('consent.decline')}
              variant="quiet"
              onPress={() => setDeclineOpen(true)}
              disabled={accept.isPending}
              testID="decline-consent"
            />
            <StepDots total={5} index={4} />
          </View>
        }
      >
        <View style={s.headings}>
          <View style={s.badge}>
            <Icon name="shieldCheck" size={22} color={colors.surfie} />
          </View>
          <Text style={s.title} accessibilityRole="header">
            {doc.data.title}
          </Text>
          <Text style={s.version}>{t('consent.version', { version: doc.data.version })}</Text>
          <Text style={s.subtitle}>{t('consent.subtitle')}</Text>
        </View>

        {!!accept.error && (
          <Banner
            tone={accept.error.isNetwork ? 'warn' : 'danger'}
            body={messageFor(accept.error, t('consent.recordError'))}
            actionLabel={accept.error.isRetryable ? t('common.retry') : undefined}
            onAction={accept.error.isRetryable ? onAccept : undefined}
          />
        )}

        {/*
          A product fact rather than legal copy, and one the call UI must state
          too: consultations are not recorded. It is surfaced here because it is
          the question patients ask first.
        */}
        <View style={s.factRow}>
          <View style={s.fact}>
            <Icon name="banCircle" size={16} color={colors.surfie} />
            <Text style={s.factText}>{t('consent.notRecorded')}</Text>
          </View>
          <View style={s.fact}>
            <Icon name="lock" size={16} color={colors.surfie} />
            <Text style={s.factText}>{t('consent.encrypted')}</Text>
          </View>
          <View style={s.fact}>
            <Icon name="idCard" size={16} color={colors.surfie} />
            <Text style={s.factText}>{t('consent.yoursToDelete')}</Text>
          </View>
        </View>

        <View style={s.sections}>
          {sections.map((section, i) => (
            <Accordion
              key={`${section.heading}-${i}`}
              title={section.heading}
              icon={i === 0 ? 'document' : 'info'}
              defaultOpen={i === 0}
            >
              <Text style={s.body}>{section.body}</Text>
            </Accordion>
          ))}
        </View>

        <Text style={s.stamp}>{t('consent.evidenceNote')}</Text>
      </Screen>

      <Sheet visible={declineOpen} onClose={() => setDeclineOpen(false)} title={t('consent.declineTitle')}>
        <Text style={s.sheetBody}>{t('consent.declineBody')}</Text>
        <View style={s.sheetActions}>
          <Button label={t('common.goBack')} variant="secondary" onPress={() => setDeclineOpen(false)} />
          <Button label={t('consent.declineForNow')} variant="quiet" onPress={onDecline} testID="confirm-decline" />
        </View>
      </Sheet>
    </BrandBackground>
  );
};

const s = StyleSheet.create({
  skeleton: { gap: spacing.lg, paddingTop: spacing.xl, alignItems: 'stretch' },

  headings: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.lg },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  version: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.xs,
  },

  factRow: { flexDirection: 'row', gap: spacing.sm },
  fact: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.mint,
    borderWidth: 1,
    borderColor: '#D8F2E7',
  },
  factText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
    textAlign: 'center',
  },

  sections: { gap: spacing.md },
  body: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 21,
  },

  stamp: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 17,
    textAlign: 'center',
  },

  sheetBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  sheetActions: { gap: spacing.sm },

  footer: { gap: spacing.sm, paddingTop: spacing.sm },
});

export default ConsentScreen;
