import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
  DomainCode,
  LANGUAGE_LABELS,
  messageFor,
  useAssignedProvider,
  useDeclineProvider,
  type Consultation,
  type Language,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Icon,
  SectionHeader,
  Sheet,
  Skeleton,
  StatusPill,
  TextField,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';
import { isProviderVisible } from '../lib/consultation';

/**
 * The assigned professional (FR-4.3), and the limited decline (FR-4.4).
 *
 * *** THIS IS THE ONLY PLACE IN THE PATIENT APP THAT NAMES A PROVIDER, AND IT
 * ONLY APPEARS AFTER ASSIGNMENT. *** `GET /doctors/:doctorId` is refused unless
 * that provider is actually treating this patient, and returns a 404 rather
 * than a 403 to anyone else — so there is no way to reach it before a booking
 * has been assigned, and no way to reach anyone else's profile at all. The
 * Telemedicine Practice Guidelines require a patient to know who they are
 * consulting; they do not permit browsing everyone else.
 *
 * `consultation.doctorId` is null until the backend assigns, so before that
 * this renders the "not assigned yet" state and asks for nothing.
 *
 * *** DECLINE IS NOT A PICKER. *** It asks for a different provider, with a
 * required reason, up to a configured limit. The backend reruns assignment; the
 * patient never sees who they might get instead and never chooses. Past the
 * limit, `DECLINE_LIMIT_REACHED` comes back and the action is hidden with the
 * reason shown rather than left to fail.
 */
export const AssignedProviderCard = ({
  consultation,
  onChanged,
}: {
  consultation: Consultation;
  onChanged?: () => void;
}) => {
  const t = useT();
  // PT-11-01: named only once paid. Gating the FETCH, not just the render,
  // means a held booking never even asks who its professional is.
  const visible = isProviderVisible(consultation);
  const provider = useAssignedProvider(visible ? consultation.doctorId : null);
  const decline = useDeclineProvider();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  /** Set once the backend says there are no declines left for this booking. */
  const [limitReached, setLimitReached] = useState(false);

  /**
   * Whether declining is even offered.
   *
   * Only while the booking still holds time — once a consultation is in
   * progress or done, reassignment is meaningless.
   */
  const canDecline =
    !limitReached &&
    visible &&
    consultation.status === 'scheduled';

  const submitDecline = async () => {
    setTouched(true);
    const trimmed = reason.trim();
    if (!trimmed || decline.isPending) return;
    try {
      await decline.mutate({ consultationId: consultation.id, reason: trimmed });
      setOpen(false);
      setReason('');
      setTouched(false);
      onChanged?.();
    } catch (e) {
      // Branch on the code: the limit is a designed outcome, not a failure.
      if ((e as { code?: string })?.code === DomainCode.DECLINE_LIMIT_REACHED) {
        setLimitReached(true);
        setOpen(false);
      }
    }
  };

  /* ------------------------- before assignment -------------------------- */
  // A booking that ended before payment never had a professional to show.
  if (!visible && (consultation.status === 'cancelled' || consultation.status === 'expired')) {
    return null;
  }
  if (!visible) {
    return (
      <View style={s.block}>
        <SectionHeader title={t('provider.sectionTitle')} />
        <Card tone="mint" elevation="none" style={s.pending}>
          <View style={s.pendingIcon}>
            <Icon name="clock" size={20} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.pendingTitle}>{t('provider.notAssignedYet')}</Text>
            <Text style={s.pendingBody}>{t('provider.notAssignedBody')}</Text>
          </View>
        </Card>
      </View>
    );
  }

  /* ------------------------- after assignment --------------------------- */
  return (
    <View style={s.block}>
      <SectionHeader title={t('provider.sectionTitle')} />

      {provider.isLoading && (
        <Card elevation="card">
          <View style={s.row}>
            <Skeleton width={56} height={56} radius={28} />
            <View style={s.flex}>
              <Skeleton width="60%" height={18} />
              <Skeleton width="45%" height={13} style={{ marginTop: 8 }} />
            </View>
          </View>
        </Card>
      )}

      {provider.isError && (
        <Banner
          tone="warn"
          body={messageFor(provider.error, t('provider.loadError'))}
          actionLabel={t('common.retry')}
          onAction={provider.refetch}
        />
      )}

      {!!provider.data && (
        <Card elevation="raised" style={s.card}>
          <View style={s.row}>
            <Avatar initials={initialsOf(provider.data.fullName)} size={56} />
            <View style={s.flex}>
              <Text style={s.name} numberOfLines={2} accessibilityRole="header">
                {provider.data.fullName}
              </Text>
              {!!provider.data.qualification && (
                <Text style={s.qualification} numberOfLines={2}>
                  {provider.data.qualification}
                </Text>
              )}
              <View style={s.pills}>
                {provider.data.yearsOfExperience !== null && (
                  <StatusPill
                    label={t('provider.experience', { years: provider.data.yearsOfExperience })}
                    tone="brand"
                    dot={false}
                    icon="star"
                  />
                )}
                {provider.data.canPrescribe && (
                  <StatusPill
                    label={t('provider.canPrescribe')}
                    tone="success"
                    dot={false}
                    icon="prescription"
                  />
                )}
              </View>
            </View>
          </View>

          <View style={s.facts}>
            {!!provider.data.languages?.length && (
              <Fact
                icon="language"
                text={t('provider.speaks', {
                  languages: provider.data.languages
                    .map((l) => LANGUAGE_LABELS[l as Language] ?? l)
                    .join(', '),
                })}
              />
            )}
            {!!provider.data.registrationNumber && (
              <Fact
                icon="idCard"
                text={t('provider.registration', { number: provider.data.registrationNumber })}
              />
            )}
          </View>

          {!!provider.data.bio && <Text style={s.bio}>{provider.data.bio}</Text>}

          <Text style={s.assignedNote}>{t('provider.assignedNote')}</Text>
        </Card>
      )}

      {limitReached && (
        <Banner
          tone="info"
          title={t('provider.declineLimitTitle')}
          body={t('provider.declineLimitBody')}
        />
      )}

      {canDecline && !!provider.data && (
        <Button
          label={t('provider.declineAction')}
          variant="quiet"
          onPress={() => setOpen(true)}
          testID="open-decline"
        />
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('provider.declineTitle')}>
        <Text style={s.sheetBody}>{t('provider.declineBody')}</Text>

        <TextField
          label={t('provider.declineReasonLabel')}
          value={reason}
          onChangeText={setReason}
          placeholder={t('provider.declineReasonPlaceholder')}
          maxLength={200}
          multiline
          required
          error={touched && !reason.trim() ? t('provider.declineReasonRequired') : null}
          containerStyle={s.sheetField}
        />

        {!!decline.error && decline.error.code !== DomainCode.DECLINE_LIMIT_REACHED && (
          <Banner tone="danger" body={messageFor(decline.error, t('provider.declineFailed'))} />
        )}

        <View style={s.sheetActions}>
          <Button
            label={t('provider.declineConfirm')}
            onPress={submitDecline}
            loading={decline.isPending}
            disabled={decline.isPending || !reason.trim()}
            testID="confirm-decline-provider"
          />
          <Button label={t('common.cancel')} variant="quiet" onPress={() => setOpen(false)} />
        </View>
      </Sheet>
    </View>
  );
};

const Fact = ({ icon, text }: { icon: 'language' | 'idCard'; text: string }) => (
  <View style={s.fact}>
    <Icon name={icon} size={15} color={colors.inkFaint} />
    <Text style={s.factText}>{text}</Text>
  </View>
);

/** Local copy — the shared one lives in `profileApi` and is for patients. */
const initialsOf = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: spacing.md },

  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  name: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.ink,
  },
  qualification: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 1,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },

  facts: { gap: 6 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },

  bio: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  assignedNote: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 16,
  },

  pending: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  pendingIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.ink,
  },
  pendingBody: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
    marginTop: 2,
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

export default AssignedProviderCard;
