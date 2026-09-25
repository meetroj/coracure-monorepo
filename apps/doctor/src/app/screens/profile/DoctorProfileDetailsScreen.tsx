import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../../theme/brand';
import { typeStyles, fontWeight } from '../../../theme/typography';
import { Icon, type IconName } from '../../../components/Icon';
import { Screen, Avatar, Card, Button, StatusPill } from '../../../components/ui';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useStore } from '../../../state/store';
import { selectDoctor } from '../../../state/selectors';
import { inr } from '../../../data/doctor';

/** A verified value: read-only, with a lock instead of a chevron. */
const LockedRow = ({ icon, title, value, last }: { icon: IconName; title: string; value: string; last?: boolean }) => (
  <View style={[s.row, !last && s.rowRule]} accessible accessibilityLabel={`${title}: ${value}. Locked after verification`}>
    <View style={s.rowIcon}>
      <Icon name={icon} size={17} color={colors.surfie} />
    </View>
    <View style={s.flex}>
      <Text style={s.rowTitle}>{title}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
    <Icon name="lock" size={15} color={colors.inkMuted} />
  </View>
);

/**
 * Doctor Profile — the detailed view behind Profile › Profile Details.
 *
 * Administrator-verified fields are read-only here; one "Request a change"
 * covers them all. The fee is the doctor's own setting and has its own edit.
 */
export const DoctorProfileDetailsScreen = ({
  onBack,
  onEditFee,
  onRequestChange,
}: {
  onBack: () => void;
  onEditFee: () => void;
  onRequestChange: () => void;
}) => {
  const doctor = useStore(selectDoctor);
  const fee = useStore((s) => s.profile.fee);
  const duration = useStore((s) => s.availability.durationMin);

  const facts: [IconName, string, string][] = [
    ['stethoscope', doctor.speciality, 'Speciality'],
    ['language', doctor.languages.join(', '), 'Languages'],
    ['clock', `${duration} min`, 'Consultation'],
  ];

  return (
    <Screen testID="profile-details" header={<ScreenHeader onBack={onBack} title="Doctor Profile" subtitle="Your professional information." />}>
      <Card style={s.hero}>
        <View style={s.heroTop}>
          <Avatar initials={doctor.initials} size={68} tone="brand" />
          <View style={s.flex}>
            <View style={s.nameRow}>
              <Text style={s.name}>{doctor.name}</Text>
              {doctor.registrationVerified ? (
                <StatusPill label="Verified" tone="success" icon="checkCircle" />
              ) : (
                <StatusPill label="Under review" tone="warn" />
              )}
            </View>
            <Text style={s.qual}>{doctor.qualification}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Icon name="idCard" size={15} color={colors.surfie} />
            <View style={s.flex}>
              <Text style={s.metaLabel}>Registration No.</Text>
              <Text style={s.metaValue} selectable>
                {doctor.registrationNo}
              </Text>
            </View>
          </View>
          <View style={s.metaRule} />
          <View style={s.metaItem}>
            <Icon name="star" size={15} color={colors.surfie} />
            <View style={s.flex}>
              <Text style={s.metaLabel}>Experience</Text>
              <Text style={s.metaValue}>{doctor.yearsExperience}+ years</Text>
            </View>
          </View>
        </View>

        <View style={s.factRow}>
          {facts.map(([icon, value, label]) => (
            <View key={label} style={s.fact}>
              <Icon name={icon} size={15} color={colors.surfie} />
              <Text style={s.factValue} numberOfLines={2}>
                {value}
              </Text>
              <Text style={s.factLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={s.section}>Professional Details</Text>
      <Card style={s.listCard}>
        <LockedRow icon="stethoscope" title="Specialties" value={doctor.specialisations.join(', ') || doctor.speciality} />
        <LockedRow icon="document" title="Qualification" value={doctor.qualification} />
        <LockedRow icon="idCard" title="Registration Number" value={doctor.registrationNo} />
        <LockedRow icon="clock" title="Years of Experience" value={`${doctor.yearsExperience}+ years`} last />
      </Card>
      <View style={s.lockNote}>
        <Icon name="lock" size={13} color={colors.inkMuted} />
        <Text style={s.lockNoteText}>These details are locked after verification.</Text>
      </View>
      <Button testID="request-change" label="Request a change" variant="secondary" size="sm" icon="pencil" onPress={onRequestChange} style={s.requestBtn} />

      <Text style={s.section}>Consultation Fee</Text>
      <Card style={s.listCard}>
        <View style={s.row}>
          <View style={s.rowIcon}>
            <Icon name="tag" size={17} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.rowTitle}>Per consultation</Text>
            <Text style={s.rowValue}>{inr(fee)}</Text>
          </View>
          <Pressable testID="edit-fee" onPress={onEditFee} hitSlop={8} style={s.editBtn} accessibilityRole="button" accessibilityLabel="Edit consultation fee">
            <Icon name="pencil" size={14} color={colors.surfie} />
            <Text style={s.editText}>Edit</Text>
          </Pressable>
        </View>
      </Card>

      <Text style={s.section}>About</Text>
      <Card style={s.aboutCard} tone="mint">
        {doctor.bio ? (
          <>
            <Text style={s.quoteMark}>“</Text>
            <Text style={s.bio}>{doctor.bio}</Text>
          </>
        ) : (
          <Text style={s.bio}>No bio yet. Use “Request a change” to add one.</Text>
        )}
      </Card>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },

  hero: { padding: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { ...typeStyles.name, flexShrink: 1, color: colors.ink },
  qual: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surface.line },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaRule: { width: 1, height: 28, backgroundColor: colors.surface.line, marginHorizontal: spacing.sm },
  metaLabel: { ...typeStyles.caption, color: colors.inkMuted },
  metaValue: { ...typeStyles.bodySmall, color: colors.ink, marginTop: 1 },

  factRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  fact: { flex: 1, alignItems: 'flex-start', gap: 3, padding: spacing.sm, backgroundColor: colors.surface.mintSoft, borderRadius: radius.md },
  factValue: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold, color: colors.ink },
  factLabel: { ...typeStyles.caption, color: colors.inkMuted },

  section: { ...typeStyles.sectionTitle, color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  listCard: { paddingVertical: 0, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm + 2 },
  rowRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...typeStyles.body, fontWeight: fontWeight.medium, color: colors.ink },
  rowValue: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  editText: { ...typeStyles.buttonSmall, color: colors.surfie },

  lockNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.lg, marginTop: spacing.sm },
  lockNoteText: { ...typeStyles.caption, color: colors.inkMuted },
  requestBtn: { marginHorizontal: spacing.lg, marginTop: spacing.md, alignSelf: 'flex-start' },

  aboutCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  quoteMark: { ...typeStyles.pageTitle, fontSize: 26, lineHeight: 26, color: colors.surfie },
  bio: { ...typeStyles.bodySmall, flex: 1, color: colors.inkMuted },
});

export default DoctorProfileDetailsScreen;
