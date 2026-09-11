import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
  LANGUAGE_LABELS,
  messageFor,
  profileApi,
  useConsentStatus,
  useProfile,
  type Language,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  Avatar,
  Banner,
  Button,
  Card,
  ErrorState,
  Icon,
  ListRow,
  Screen,
  SectionHeader,
  Sheet,
  Skeleton,
  StatusPill,
} from '@coracure/ui';

import { useNavigator } from '../navigation/Navigator';
import { useT } from '@coracure/i18n';
import { useSession } from '../session/SessionProvider';

/** The Profile tab. Distinct from the first-run `/profile` setup screen. */
export const AccountScreen = () => {
  const { navigate } = useNavigator();
  const { signOut } = useSession();
  const t = useT();
  const profile = useProfile();
  const consent = useConsentStatus();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const p = profile.data;
  const language = p?.preferredLanguage as Language | undefined;

  const doSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setSignOutOpen(false);
    }
  };

  if (profile.isError) {
    return (
      <Screen testID="account" scroll={false}>
        <ErrorState
          title={t('account.loadError')}
          body={messageFor(profile.error)}
          requestId={profile.error?.requestId}
          onRetry={profile.refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="account">
      {/* -------------------------- identity card ------------------------ */}
      <Card elevation="raised" style={s.identity}>
        {profile.isLoading ? (
          <View style={s.identityRow}>
            <Skeleton width={64} height={64} radius={32} />
            <View style={s.flex}>
              <Skeleton width="60%" height={20} />
              <Skeleton width="45%" height={14} style={{ marginTop: 8 }} />
            </View>
          </View>
        ) : (
          <View style={s.identityRow}>
            <Avatar initials={profileApi.initialsOf(p?.fullName) || '··'} size={64} />
            <View style={s.flex}>
              <Text style={s.name} numberOfLines={1} accessibilityRole="header">
                {p?.fullName ?? t('account.yourProfile')}
              </Text>
              <Text style={s.mobile}>{p?.mobileNumber}</Text>
              <View style={s.pills}>
                {p?.isComplete ? (
                  <StatusPill label={t('account.profileComplete')} tone="success" icon="checkCircle" />
                ) : (
                  <StatusPill label={t('account.profileIncomplete')} tone="warn" icon="alertCircle" />
                )}
                {p?.status === 'active' && <StatusPill label={t('account.active')} tone="brand" />}
              </View>
            </View>
          </View>
        )}

        {!profile.isLoading && (
          <View style={s.facts}>
            <View style={s.fact}>
              <Text style={s.factLabel}>{t('account.age')}</Text>
              <Text style={s.factValue}>{p?.age !== null && p?.age !== undefined ? p.age : '—'}</Text>
            </View>
            <View style={s.factDivider} />
            <View style={s.fact}>
              <Text style={s.factLabel}>{t('account.gender')}</Text>
              <Text style={s.factValue}>
                {p?.gender === 'undisclosed' ? t('account.notSaid') : (p?.gender ?? '\u2014')}
              </Text>
            </View>
            <View style={s.factDivider} />
            <View style={s.fact}>
              <Text style={s.factLabel}>{t('account.language')}</Text>
              <Text style={s.factValue}>
                {language && LANGUAGE_LABELS[language] ? LANGUAGE_LABELS[language] : '—'}
              </Text>
            </View>
          </View>
        )}
      </Card>

      {p && !p.isComplete && (
        <Banner
          tone="warn"
          title={t('account.finishProfile')}
          body={t('account.finishProfileBody')}
          actionLabel={t('account.completeProfile')}
          onAction={() => navigate('profile')}
        />
      )}

      {/* ----------------------------- account --------------------------- */}
      <View style={s.block}>
        <SectionHeader title={t('account.accountSection')} />
        <Card elevation="card" style={s.rows}>
          <ListRow
            icon="edit"
            title={t('account.personalDetails')}
            subtitle={t('account.personalDetailsSub')}
            onPress={() => navigate('profile')}
          />
          <ListRow
            icon="mapPin"
            title={t('account.yourState')}
            subtitle={t('account.yourStateSub')}
            onPress={() => navigate('profile')}
          />
          <ListRow
            icon="bell"
            title={t('notifications.title')}
            subtitle={t('account.notificationsSub')}
            onPress={() => navigate('notifications')}
            last
          />
        </Card>
      </View>

      {/* ----------------------------- privacy --------------------------- */}
      <View style={s.block}>
        <SectionHeader title={t('account.privacyLegal')} />
        <Card elevation="card" style={s.rows}>
          <ListRow
            icon="shieldCheck"
            title={t('account.teleconsultationConsent')}
            subtitle={
              consent.isLoading
                ? t('account.consentChecking')
                : consent.data?.teleconsultationConsent
                  ? t('account.consentAccepted')
                  : t('account.consentNotAccepted')
            }
            onPress={() => navigate('consent')}
            right={
              consent.data && !consent.data.teleconsultationConsent ? (
                <StatusPill label={t('account.required')} tone="warn" dot={false} />
              ) : undefined
            }
          />
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
            icon="settings"
            title={t('account.settingsSupport')}
            subtitle={t('account.settingsSupportSub')}
            onPress={() => navigate('settings')}
            last
          />
        </Card>
      </View>

      <Button
        label={t('account.signOut')}
        variant="secondary"
        icon="logout"
        onPress={() => setSignOutOpen(true)}
        testID="sign-out"
      />

      <View style={s.note}>
        <Icon name="info" size={14} color={colors.inkFaint} />
        <Text style={s.noteText}>
          {t('account.signOutNote')}
        </Text>
      </View>

      <Sheet visible={signOutOpen} onClose={() => setSignOutOpen(false)} title={t('account.signOutTitle')}>
        <Text style={s.sheetBody}>
          {t('account.signOutBody')}
        </Text>
        <View style={s.sheetActions}>
          <Button
            label={t('account.signOut')}
            variant="danger"
            onPress={doSignOut}
            loading={signingOut}
            testID="confirm-sign-out"
          />
          <Button label={t('account.staySignedIn')} variant="quiet" onPress={() => setSignOutOpen(false)} />
        </View>
      </Sheet>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: spacing.md },

  identity: { gap: spacing.lg, marginTop: spacing.md },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  name: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.ink,
  },
  mobile: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 1,
  },
  pills: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' },

  facts: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  fact: { flex: 1, alignItems: 'center', gap: 2 },
  factDivider: { width: 1, height: 26, backgroundColor: colors.surface.line },
  factLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  factValue: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.ink,
    textTransform: 'capitalize',
  },

  rows: { paddingVertical: 0 },

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
    marginBottom: spacing.lg,
  },
  sheetActions: { gap: spacing.sm },
});

export default AccountScreen;
