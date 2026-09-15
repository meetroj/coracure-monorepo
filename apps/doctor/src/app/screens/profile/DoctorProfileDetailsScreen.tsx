import { typeStyles, fontWeight } from '../../../../../../libs/typography/src';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import LogoWide from '../../../assets/brand/logo-wide.svg';
import { colors, radius, spacing } from '../../../theme/brand';
import { Icon, type IconName } from '../../../components/Icon';
import { Screen, Avatar, Card, Button, StatusPill, ListRow } from '../../../components/ui';
import { doctor, inr } from '../../../data/doctor';

/**
 * Doctor Profile — the detailed, read-mostly view behind the Profile tab's
 * "Profile Details" row. Admin-approved fields route through "Request
 * changes" rather than being directly editable here.
 */
export const DoctorProfileDetailsScreen = ({
  onBack,
  onOpen,
}: {
  onBack: () => void;
  onOpen: (key: string) => void;
}) => (
  <View style={s.root}>
    <Screen>
      <View style={s.bar}>
        <Pressable
          testID="back"
          onPress={onBack}
          hitSlop={8}
          style={s.barBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="arrowLeft" size={19} color={colors.ink} />
        </Pressable>
        <View style={s.barLogo}>
          <LogoWide width={100} height={25} />
        </View>
        <Pressable hitSlop={8} style={s.barBtn} accessibilityRole="button" accessibilityLabel="Notifications">
          <Icon name="bell" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <View style={s.titleWrap}>
        <Text style={[typeStyles.body, s.title]}>Doctor Profile</Text>
        <Text style={[typeStyles.body, s.subtitle]}>Manage your professional information</Text>
      </View>

      {/* identity + quick facts */}
      <Card style={s.hero}>
        <View style={s.heroTop}>
          <Avatar initials={doctor.initials} photo={doctor.photo} size={72} online />
          <View style={s.heroCopy}>
            <View style={s.nameRow}>
              <Text style={[typeStyles.body, s.name]} numberOfLines={1}>{doctor.name}</Text>
              <StatusPill label="Verified" tone="success" icon="checkCircle" />
            </View>
            <Text style={[typeStyles.body, s.qual]}>{doctor.qualification}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Icon name="idCard" size={15} color={colors.surfie} />
            <View>
              <Text style={[typeStyles.body, s.metaLabel]}>Registration No.</Text>
              <Text style={[typeStyles.body, s.metaValue]}>{doctor.registrationNo}</Text>
            </View>
          </View>
          <View style={s.metaRule} />
          <View style={s.metaItem}>
            <Icon name="star" size={15} color={colors.surfie} />
            <View>
              <Text style={[typeStyles.body, s.metaLabel]}>Experience</Text>
              <Text style={[typeStyles.body, s.metaValue]}>{doctor.yearsExperience}+ years</Text>
            </View>
          </View>
        </View>

        <View style={s.factRow}>
          {(
            [
              ['stethoscope', doctor.speciality, 'Specialist'],
              ['language', doctor.languages.join(', '), 'Languages'],
              ['clock', `${doctor.consultationMinutes} mins`, 'Consultation Duration'],
            ] as [IconName, string, string][]
          ).map(([icon, value, label]) => (
            <View key={label} style={s.fact}>
              <Icon name={icon} size={15} color={colors.surfie} />
              <Text style={[typeStyles.body, s.factValue]} numberOfLines={1}>{value}</Text>
              <Text style={[typeStyles.body, s.factLabel]}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* professional details — admin-approved, review required to change */}
      <Text style={[typeStyles.body, s.section]}>Professional Details</Text>
      <Card style={s.listCard}>
        <ListRow compact
          icon="stethoscope"
          title="Specialties"
          subtitle={doctor.specialisations.join(', ')}
          right={<StatusPill label="Verified" tone="success" icon="checkCircle" />}
          onPress={() => onOpen('specialisations')}
        />
        <ListRow compact
          icon="idCard"
          title="Qualification"
          subtitle={doctor.qualification}
          right={<StatusPill label="Verified" tone="success" icon="checkCircle" />}
          onPress={() => onOpen('qualification')}
        />
        <ListRow compact
          icon="idCard"
          title="Registration Number"
          subtitle={doctor.registrationNo}
          right={<StatusPill label="Verified" tone="neutral" icon="lock" />}
          onPress={() => onOpen('registration')}
        />
        <ListRow compact
          icon="clock"
          title="Years of Experience"
          subtitle={`${doctor.yearsExperience}+ years`}
          right={<StatusPill label="Verified" tone="neutral" icon="lock" />}
          onPress={() => onOpen('experience')}
        />
        <ListRow compact
          icon="tag"
          title="Consultation Fee"
          subtitle={inr(doctor.consultationFee)}
          right={<Button label="Edit" variant="secondary" size="sm" icon="pencil" onPress={() => onOpen('fee')} />}
          last
        />
      </Card>

      {/* about */}
      <Text style={[typeStyles.body, s.section]}>About</Text>
      <Card style={s.aboutCard} tone="mint">
        <Text style={[typeStyles.body, s.quoteMark]}>&ldquo;</Text>
        <Text style={[typeStyles.body, s.bio]}>{doctor.bio}</Text>
      </Card>

      <View style={s.lockNote}>
        <Icon name="lock" size={13} color={colors.inkFaint} />
        <Text style={[typeStyles.body, s.lockNoteText]}>Some details are locked after admin verification</Text>
      </View>
    </Screen>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  barBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLogo: { flex: 1, alignItems: 'center' },

  titleWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { ...typeStyles.pageTitle, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 3 },

  hero: { marginHorizontal: spacing.lg, padding: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroCopy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { ...typeStyles.name, flexShrink: 1, color: colors.ink },
  qual: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaRule: { width: 1, height: 28, backgroundColor: colors.surface.line, marginHorizontal: spacing.sm },
  metaLabel: { ...typeStyles.label, color: colors.inkFaint },
  metaValue: { ...typeStyles.bodySmall, color: colors.ink, marginTop: 1 },

  factRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  fact: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 3,
    padding: spacing.sm,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
  },
  factValue: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold, color: colors.ink },
  factLabel: { ...typeStyles.caption, color: colors.inkMuted },

  section: { ...typeStyles.sectionTitle, color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  listCard: { marginHorizontal: spacing.lg, paddingVertical: 0, paddingHorizontal: 12 },

  aboutCard: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, padding: spacing.md },
  quoteMark: { ...typeStyles.pageTitle, fontSize: 26, lineHeight: 22, color: colors.surfie },
  bio: { ...typeStyles.bodySmall, flex: 1, color: colors.inkMuted },

  lockNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  lockNoteText: { ...typeStyles.caption, color: colors.inkFaint },
});

export default DoctorProfileDetailsScreen;
