import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Share, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, Icon } from '@coracure/ui';
import { findDoctor } from '../data/doctors';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DoctorProfile'>;
type Rt = RouteProp<RootStackParamList, 'DoctorProfile'>;

/**
 * The doctor's own page: credentials, what they treat, and the next five days
 * they are free. Both ways out are on the footer — start now, or pick a slot.
 */
export const DoctorProfileScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const doctor = findDoctor(route.params?.doctorId);

  const [expanded, setExpanded] = useState(false);

  const onShare = () => {
    Share.share({
      message: `${doctor.name}, ${doctor.specialty} on CoraCure. Consultation ₹${doctor.fee}.`,
    }).catch(() => undefined);
  };

  return (
    <Screen contentStyle={s.content}>
      <View style={s.topBar}>
        <Pressable
          style={s.circle}
          hitSlop={10}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>

        <View style={s.topBarRight}>
          <Pressable
            style={s.circle}
            hitSlop={10}
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel="Share this profile"
          >
            <Icon name="share" size={19} color={colors.ink} />
          </Pressable>
          <Pressable
            style={s.circle}
            hitSlop={10}
            onPress={() => navigation.navigate('HelpSupport')}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <View style={s.kebabRow}>
              <View style={s.kebabDot} />
              <View style={s.kebabDot} />
              <View style={s.kebabDot} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Identity */}
      <View style={s.hero}>
        <View>
          <Image source={doctor.img} style={s.photo} resizeMode="cover" />
          <View style={s.satisfactionBadge}>
            <Icon name="shieldCheck" size={16} color={colors.surfie} />
            <Text style={s.satisfactionText}>{doctor.satisfaction}% Patient{'\n'}Satisfaction</Text>
          </View>
        </View>

        <View style={s.heroText}>
          {doctor.availableNow && (
            <View style={s.instantPill}>
              <View style={s.instantDot} />
              <Text style={s.instantText}>Available for instant consult</Text>
            </View>
          )}

          <View style={s.nameRow}>
            <Text style={s.name}>{doctor.name}</Text>
            <Icon name="checkCircle" size={18} color={colors.surfie} />
          </View>
          <Text style={s.specialty}>{doctor.specialty}</Text>
          <Text style={s.meta}>{doctor.qualification}</Text>
          <Text style={s.meta}>Medical Registration: {doctor.regNo}</Text>
          <Text style={s.meta}>{doctor.years}+ years experience</Text>

          <View style={s.langRow}>
            <Icon name="globe" size={16} color={colors.inkFaint} />
            <Text style={s.langLabel}>Languages</Text>
            <Text style={s.langValue}>{doctor.languages.join(', ')}</Text>
          </View>
        </View>
      </View>

      {/* Duration, fee, about, focus */}
      <View style={s.card}>
        <View style={s.statRow}>
          <View style={s.stat}>
            <View style={s.statIcon}>
              <Icon name="clock" size={20} color={colors.surfie} />
            </View>
            <View>
              <Text style={s.statLabel}>Consultation Duration</Text>
              <Text style={s.statValue}>{doctor.durationMins} mins</Text>
            </View>
          </View>

          <View style={s.statRule} />

          <View style={s.stat}>
            <View style={s.statIcon}>
              <Icon name="wallet" size={20} color={colors.surfie} />
            </View>
            <View>
              <Text style={s.statLabel}>Consultation Fee</Text>
              <Text style={s.statValue}>₹{doctor.fee}</Text>
            </View>
          </View>
        </View>

        <View style={s.cardRule} />

        <Text style={s.sectionTitle}>About Doctor</Text>
        <Text style={s.about} numberOfLines={expanded ? undefined : 4}>
          {doctor.about}
        </Text>
        <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
          <Text style={s.readMore}>{expanded ? 'Read Less' : 'Read More'}</Text>
        </Pressable>

        <View style={s.cardRule} />

        <Text style={s.sectionTitle}>Areas of Focus</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.focusWrap}
          keyboardShouldPersistTaps="handled"
        >
          {doctor.focus.map((f) => (
            <View key={f.label} style={s.focusChip}>
              <Icon name={f.icon} size={14} color={colors.surfie} />
              <Text style={s.focusText} numberOfLines={1}>{f.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Availability */}
      <View style={s.card}>
        <View style={s.availHead}>
          <Text style={s.sectionTitle}>Upcoming Availability</Text>
          <Pressable
            onPress={() => navigation.navigate('SelectSlot', { doctorId: doctor.id })}
            accessibilityRole="button"
          >
            <Text style={s.readMore}>View full calendar</Text>
          </Pressable>
        </View>

        <View style={s.dayRow}>
          {doctor.upcoming.map((u, i) => (
            <Pressable
              key={u.date}
              style={[s.dayCard, i === 0 && s.dayCardOn]}
              onPress={() => navigation.navigate('SelectSlot', { doctorId: doctor.id })}
              accessibilityRole="button"
              accessibilityLabel={`${u.day} ${u.date}`}
            >
              <Text style={[s.dayName, i === 0 && s.dayNameOn]}>{u.day}</Text>
              <Text style={s.dayDate}>{u.date}</Text>
              <View style={[s.dayDot, i !== 0 && s.dayDotHidden]} />
              {u.times.map((t, ti) => (
                <Text key={t} style={[s.dayTime, i === 0 && ti === 0 && s.dayTimeOn]}>{t}</Text>
              ))}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.footer}>
        <Pressable
          style={s.consultBtn}
          onPress={() => navigation.navigate('InstantConsultRequest', { doctorId: doctor.id })}
          accessibilityRole="button"
          accessibilityLabel="Consult now, start instantly"
        >
          <Icon name="emergency" size={20} color={colors.white} />
          <View>
            <Text style={s.consultTitle}>Consult Now</Text>
            <Text style={s.consultSub}>Start instantly</Text>
          </View>
        </Pressable>

        <Pressable
          style={s.bookBtn}
          onPress={() => navigation.navigate('SelectSlot', { doctorId: doctor.id })}
          accessibilityRole="button"
          accessibilityLabel="Book appointment, choose a time slot"
        >
          <Icon name="calendar" size={20} color={colors.surfie} />
          <View>
            <Text style={s.bookTitle}>Book Appointment</Text>
            <Text style={s.bookSub}>Choose a time slot</Text>
          </View>
        </Pressable>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  kebabRow: { gap: 2.5, alignItems: 'center' },
  kebabDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: colors.ink },

  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  photo: {
    width: 136,
    height: 176,
    borderRadius: radius.card,
    backgroundColor: colors.surface.mintSoft,
  },
  satisfactionBadge: {
    position: 'absolute',
    left: 6,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    ...shadow.card,
  },
  satisfactionText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    fontWeight: '600',
    color: colors.ink,
    lineHeight: 13,
  },
  heroText: { flex: 1, gap: 2 },
  instantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  instantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfie,
  },
  instantText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '600',
    color: colors.surfie,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
    flexShrink: 1,
  },
  specialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '600',
    color: colors.surfie,
    marginBottom: 4,
  },
  meta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    lineHeight: 17,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  langLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
  langValue: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkMuted,
  },
  statValue: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  statRule: {
    width: 1,
    height: 40,
    backgroundColor: colors.surface.line,
    marginHorizontal: spacing.sm,
  },
  cardRule: {
    height: 1,
    backgroundColor: colors.surface.line,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  about: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  readMore: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
    marginTop: 6,
  },
  focusWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  focusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  focusText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.ink,
  },
  availHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  dayCardOn: {
    borderColor: colors.surfie,
    backgroundColor: colors.surface.mintSoft,
  },
  dayName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  dayNameOn: { color: colors.surfie },
  dayDate: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfie,
    marginVertical: 3,
  },
  /* Keeps the dot's space so unselected days line up with the selected one. */
  dayDotHidden: { backgroundColor: 'transparent' },
  dayTime: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkMuted,
    marginTop: 2,
  },
  dayTimeOn: {
    color: colors.surfie,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },


  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  consultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfie,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    ...shadow.floating,
  },
  consultTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.white,
  },
  consultSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  bookBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfie,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
  },
  bookTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  bookSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surfie,
  },
});

export default DoctorProfileScreen;
