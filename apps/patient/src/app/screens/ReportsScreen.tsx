import React from 'react';
import { View, Text, StyleSheet, RefreshControl, Linking } from 'react-native';

import {
  filesApi,
  messageFor,
  useDeleteFile,
  useFiles,
  useOpenFileRequests,
  useMutation,
  type PatientFile,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  Banner,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  ListRow,
  PageTitle,
  Screen,
  SectionHeader,
  Skeleton,
  StatusPill,
} from '@coracure/ui';

import { formatDateLong } from '../../lib/consultation';
import { useT } from '@coracure/i18n';

/**
 * The patient's files (FR-8).
 *
 * *** DELETE IS DISABLED, NOT ATTEMPTED, ON RECORD FILES. *** Once a file is
 * attached to a clinical record the backend refuses removal with
 * `FILE_IS_PART_OF_A_RECORD`. Showing an enabled control that always fails
 * teaches the user nothing; the reason is shown up front instead, and the
 * refusal is still handled in case the flag and the server disagree.
 */
const humanSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
};

const iconForType = (contentType: string) => {
  if (/^image\//.test(contentType)) return 'eye' as const;
  if (/pdf/.test(contentType)) return 'document' as const;
  return 'folder' as const;
};

export const ReportsScreen = () => {
  const t = useT();
  const files = useFiles();
  const requests = useOpenFileRequests();
  const remove = useDeleteFile();

  /**
   * Downloads are a signed URL handed to the OS browser rather than fetched
   * into the app: the URL is short-lived and the file may be large, and the
   * platform viewer handles PDFs and images better than anything we would
   * build.
   */
  const open = useMutation<PatientFile, void>(async (file) => {
    const { url } = await filesApi.getDownloadUrl(file.id);
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  });

  const deleteMessage = !remove.error
    ? null
    : remove.error.code === 'FILE_IS_PART_OF_A_RECORD'
      ? t('reports.partOfRecord')
      : messageFor(remove.error);

  return (
    <Screen
      testID="reports"
      refreshControl={
        <RefreshControl
          refreshing={files.isFetching && files.isSuccess}
          onRefresh={() => {
            void files.refetch();
            void requests.refetch();
          }}
          tintColor={colors.surfie}
          colors={[colors.surfie]}
        />
      }
      header={
        <View style={s.header}>
          <PageTitle
            title={t('reports.title')}
            subtitle={t('reports.subtitle')}
          />
        </View>
      }
    >
      {!!deleteMessage && <Banner tone="danger" body={deleteMessage} onDismiss={remove.reset} />}
      {!!open.error && (
        <Banner
          tone={open.error.isNetwork ? 'warn' : 'danger'}
          body={messageFor(open.error, t('reports.openError'))}
          onDismiss={open.reset}
        />
      )}

      {/* -------------------------- open requests ------------------------ */}
      {!!requests.data?.length && (
        <View style={s.block}>
          <SectionHeader
            title={t('reports.requested')}
            subtitle={t('reports.requestedSub')}
          />
          {requests.data.map((r) => (
            <Card key={r.id} tone="warn" elevation="none" style={s.request}>
              <Icon name="upload" size={18} color={colors.warn} />
              <View style={s.flex}>
                <Text style={s.requestText}>{r.description}</Text>
                <Text style={s.requestMeta}>
                  {t('reports.requestedOn', { date: formatDateLong(r.createdAt) })}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* ------------------------------ files ---------------------------- */}
      <View style={s.block}>
        <SectionHeader
          title={t('reports.yourFiles')}
          subtitle={
            files.data?.length ? t('reports.stored', { count: files.data.length }) : undefined
          }
        />

        {files.isLoading && (
          <View style={s.block}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={64} radius={radius.card} />
            ))}
          </View>
        )}

        {files.isError && (
          <ErrorState
            title={t('reports.loadError')}
            body={messageFor(files.error)}
            requestId={files.error?.requestId}
            onRetry={files.refetch}
          />
        )}

        {files.isSuccess && files.data.length === 0 && (
          <Card tone="mint" elevation="none">
            <EmptyState
              icon="folder"
              title={t('reports.noFiles')}
              body={t('reports.noFilesBody')}
            />
          </Card>
        )}

        {!!files.data?.length && (
          <Card elevation="card" style={s.fileCard}>
            {files.data.map((file, i) => (
              <ListRow
                key={file.id}
                icon={iconForType(file.contentType)}
                title={file.fileName}
                subtitle={[humanSize(file.sizeBytes), formatDateLong(file.createdAt)]
                  .filter(Boolean)
                  .join(' · ')}
                last={i === files.data!.length - 1}
                onPress={() => open.mutate(file).catch(() => undefined)}
                right={
                  file.isPartOfRecord ? (
                    <StatusPill label={t('reports.inRecord')} tone="brand" dot={false} icon="lock" />
                  ) : undefined
                }
              />
            ))}
          </Card>
        )}
      </View>

      <View style={s.note}>
        <Icon name="shieldCheck" size={15} color={colors.inkFaint} />
        <Text style={s.noteText}>{t('reports.encryptionNote')}</Text>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingVertical: spacing.md },
  block: { gap: spacing.md },

  request: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  requestText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
    fontWeight: '600',
    lineHeight: 19,
  },
  requestMeta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    marginTop: 2,
  },

  fileCard: { paddingVertical: 0 },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 16,
  },
});

export default ReportsScreen;
