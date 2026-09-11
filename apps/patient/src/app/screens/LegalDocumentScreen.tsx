import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { messageFor, useLegalDocument } from '@coracure/api';
import { colors, spacing, typography } from '@coracure/brand';
import { AppHeader, ErrorState, Screen, Skeleton } from '@coracure/ui';

import { useNavigator, useRouteParams } from '../navigation/Navigator';
import { useT } from '@coracure/i18n';

/**
 * A legal document, rendered verbatim.
 *
 * The body is the client's own copy, served from
 * `GET /legal/documents/:documentType`, and it is public — the app store's
 * review process reaches these before anyone has an account, which is why this
 * route is in `PUBLIC_ROUTES` and the fetch is unauthenticated.
 *
 * No paraphrasing, no summarising, no "key points" box. The text shown must be
 * the text that was published.
 */
export const LegalDocumentScreen = () => {
  const { back } = useNavigator();
  const { documentType } = useRouteParams('legal');
  const t = useT();
  const doc = useLegalDocument(documentType);

  return (
    <Screen
      testID="legal"
      background="white"
      header={<AppHeader title={doc.data?.title ?? t('settings.legal')} onBack={back} />}
    >
      {doc.isLoading && (
        <View style={s.skeleton}>
          <Skeleton width="55%" height={24} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width={i % 3 === 2 ? '70%' : '100%'} height={13} />
          ))}
        </View>
      )}

      {doc.isError && (
        <ErrorState
          title={t('common.somethingWentWrong')}
          body={messageFor(doc.error)}
          requestId={doc.error?.requestId}
          onRetry={doc.refetch}
        />
      )}

      {!!doc.data && (
        <>
          <Text style={s.version}>
            {t('consent.version', { version: doc.data.version })}
            {doc.data.publishedAt ? ` · published ${doc.data.publishedAt.slice(0, 10)}` : ''}
          </Text>
          <Text style={s.body} selectable>
            {doc.data.body}
          </Text>
        </>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  skeleton: { gap: spacing.md },
  version: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 24,
  },
});

export default LegalDocumentScreen;
