import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';

import {
  getApiConfig,
  legalApi,
  messageFor,
  secureStorageAvailable,
  useMutation,
} from '@coracure/api';
import { colors, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Banner,
  Button,
  Card,
  Icon,
  ListRow,
  Screen,
  SectionHeader,
  Sheet,
  TextField,
} from '@coracure/ui';

import { useNavigator } from '../navigation/Navigator';
import { useT } from '@coracure/i18n';

/**
 * Settings, support and data rights.
 *
 * The deletion request is a real, irreversible-feeling action, so it is behind
 * a sheet that says what it does: `POST /me/deletion-requests` files a request
 * for review — it does not delete anything itself, and the copy must not imply
 * otherwise.
 */
export const SettingsScreen = () => {
  const { back, navigate } = useNavigator();
  const t = useT();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [filed, setFiled] = useState(false);

  const requestDeletion = useMutation<string | undefined, unknown>((r) =>
    legalApi.requestDataDeletion(r),
  );

  const fileRequest = async () => {
    try {
      await requestDeletion.mutate(reason.trim() || undefined);
      setFiled(true);
      setDeleteOpen(false);
      setReason('');
    } catch {
      // Rendered from `requestDeletion.error` inside the sheet.
    }
  };

  return (
    <Screen testID="settings" header={<AppHeader title={t('settings.title')} onBack={back} />}>
      {filed && (
        <Banner
          tone="success"
          title={t('settings.deletionFiled')}
          body={t('settings.deletionFiledBody')}
          onDismiss={() => setFiled(false)}
        />
      )}

      <View style={s.block}>
        <SectionHeader title={t('settings.helpSupport')} />
        <Card elevation="card" style={s.rows}>
          <ListRow
            icon="headset"
            title={t('settings.contactSupport')}
            subtitle={t('settings.contactSupportSub')}
            onPress={() => {
              void Linking.openURL('mailto:support@coracure.in?subject=CoraCure%20app%20support');
            }}
          />
          <ListRow
            icon="alertTriangle"
            title={t('settings.emergency')}
            subtitle={t('settings.emergencySub')}
            onPress={() => {
              void Linking.openURL('tel:112');
            }}
            danger
            last
          />
        </Card>
      </View>

      <View style={s.block}>
        <SectionHeader title={t('settings.legal')} />
        <Card elevation="card" style={s.rows}>
          <ListRow
            icon="lock"
            title={t('login.privacyPolicy')}
            onPress={() => navigate('legal', { documentType: 'privacy_policy' })}
          />
          <ListRow
            icon="document"
            title={t('login.termsOfUse')}
            onPress={() => navigate('legal', { documentType: 'terms_of_use' })}
          />
          <ListRow
            icon="shieldCheck"
            title={t('account.teleconsultationConsent')}
            onPress={() => navigate('legal', { documentType: 'teleconsultation_consent' })}
            last
          />
        </Card>
      </View>

      <View style={s.block}>
        <SectionHeader title={t('settings.yourData')} />
        <Card elevation="card" style={s.rows}>
          <ListRow
            icon="trash"
            title={t('settings.requestDeletion')}
            subtitle={t('settings.requestDeletionSub')}
            onPress={() => setDeleteOpen(true)}
            danger
            last
          />
        </Card>
      </View>

      {/* Diagnostics — never credentials, never patient data. */}
      <View style={s.block}>
        <SectionHeader title={t('settings.about')} />
        <Card elevation="none" tone="mint" style={s.about}>
          <AboutRow label={t('settings.platform')} value={`${Platform.OS} ${String(Platform.Version)}`} />
          <AboutRow label={t('settings.api')} value={getApiConfig().baseUrl} />
          <AboutRow
            label={t('settings.secureStorage')}
            value={
              secureStorageAvailable() ? t('settings.keychain') : t('settings.memoryOnly')
            }
          />
        </Card>
      </View>

      <View style={s.note}>
        <Icon name="shieldCheck" size={14} color={colors.inkFaint} />
        <Text style={s.noteText}>
          {t('settings.securityNote')}
        </Text>
      </View>

      <Sheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('settings.requestDeletion')}>
        <Text style={s.sheetBody}>
          {t('settings.deletionBody')}
        </Text>

        <TextField
          label={t('settings.deletionReason')}
          value={reason}
          onChangeText={setReason}
          placeholder={t('settings.deletionReasonPlaceholder')}
          maxLength={2000}
          multiline
          containerStyle={s.sheetField}
        />

        {!!requestDeletion.error && (
          <Banner tone="danger" body={messageFor(requestDeletion.error)} />
        )}

        <View style={s.sheetActions}>
          <Button
            label={t('settings.fileRequest')}
            variant="danger"
            onPress={fileRequest}
            loading={requestDeletion.isPending}
            testID="confirm-deletion"
          />
          <Button label={t('common.goBack')} variant="quiet" onPress={() => setDeleteOpen(false)} />
        </View>
      </Sheet>
    </Screen>
  );
};

const AboutRow = ({ label, value }: { label: string; value: string }) => (
  <View style={s.aboutRow}>
    <Text style={s.aboutLabel}>{label}</Text>
    <Text style={s.aboutValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const s = StyleSheet.create({
  block: { gap: spacing.md },
  rows: { paddingVertical: 0 },

  about: { gap: spacing.sm },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  aboutLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  aboutValue: {
    flexShrink: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
    fontWeight: '700',
  },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 16,
  },

  sheetBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    lineHeight: 22,
  },
  sheetField: { marginTop: spacing.lg },
  sheetActions: { gap: spacing.sm, marginTop: spacing.lg },
});

export default SettingsScreen;
