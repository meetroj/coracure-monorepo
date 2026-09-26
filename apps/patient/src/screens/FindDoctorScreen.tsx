import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Image, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, Icon } from '@coracure/ui';
import FlowHeader from '../components/FlowHeader';
import { DOCTORS, type Doctor } from '../data/doctors';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FindDoctor'>;
type Rt = RouteProp<RootStackParamList, 'FindDoctor'>;

/**
 * "Find a Doctor" — the list the patient lands on after choosing a service,
 * either from a home-screen tile or from the service screen. Each card carries
 * everything the mock shows, so the patient decides here and the profile screen
 * is only for a closer look.
 */
export const FindDoctorScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const serviceName = route.params?.serviceName;

  const [query, setQuery] = useState('');

  /** Filters are chips the patient can clear, exactly as the mock draws them. */
  const [filters, setFilters] = useState<string[]>(
    [serviceName].filter(Boolean) as string[]
  );

  const q = query.trim().toLowerCase();
  const doctors = DOCTORS.filter((d) => {
    if (q && !`${d.name} ${d.specialty} ${d.matchFor}`.toLowerCase().includes(q)) return false;
    if (serviceName && filters.includes(serviceName)) {
      return d.services.includes(serviceName) || d.specialty === serviceName;
    }
    return true;
  });

  const card = (d: Doctor) => (
    <View key={d.id} style={s.card}>
      <View style={s.cardTop}>
        <Image source={d.img} style={s.photo} resizeMode="cover" />

        <View style={s.cardMid}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{d.name}</Text>
            <Icon name="checkCircle" size={14} color={colors.surfie} />
          </View>
          <Text style={s.specialty} numberOfLines={1}>{d.specialty}</Text>

          <View style={s.metaRow}>
            <Icon name="user" size={13} color={colors.inkFaint} />
            <Text style={s.meta} numberOfLines={1}>{d.years}+ years experience</Text>
          </View>
          <View style={s.metaRow}>
            <Icon name="globe" size={13} color={colors.inkFaint} />
            <Text style={s.meta} numberOfLines={1}>{d.languages.join(', ')}</Text>
          </View>
        </View>

        <View style={s.cardRight}>
          <View style={[s.availPill, d.availableNow && s.availPillNow]}>
            <Text style={s.availText} numberOfLines={1}>
              {d.availableNow ? 'Available Now' : 'Available Today'}
            </Text>
          </View>
          <View style={s.feeBox}>
            <Text style={s.feeAmount}>₹{d.fee}</Text>
            <Text style={s.feeLabel}>Consultation fee</Text>
          </View>
        </View>
      </View>

      <View style={s.cardFooter}>
        <View style={s.nextCol}>
          <View style={s.nextHead}>
            <Icon name="calendar" size={16} color={colors.surfie} />
            <Text style={s.nextLabel}>Next available</Text>
          </View>
          <Text style={s.nextValue}>{d.nextAvailable}</Text>
        </View>

        <Pressable
          style={s.outlineBtn}
          onPress={() => navigation.navigate('DoctorProfile', { doctorId: d.id })}
          accessibilityRole="button"
          accessibilityLabel={`View profile of ${d.name}`}
        >
          <Text style={s.outlineBtnText}>View Profile</Text>
        </Pressable>

        <Pressable
          style={s.solidBtn}
          onPress={() => navigation.navigate('SelectSlot', { doctorId: d.id })}
          accessibilityRole="button"
          accessibilityLabel={`Book ${d.name}`}
        >
          <Text style={s.solidBtnText}>Book</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen contentStyle={s.content}>
      <FlowHeader />

      <Text style={s.title} accessibilityRole="header">Find a Doctor</Text>
      <Text style={s.lede}>Search trusted doctors and book with ease.</Text>

      <View style={s.searchBar}>
        <Icon name="search" size={20} color={colors.inkFaint} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, specialty or concern..."
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Search doctors"
          returnKeyType="search"
        />
        <View style={s.micCircle}>
          <Icon name="mic" size={16} color={colors.white} />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.filterIcon}>
          <Icon name="filter" size={16} color={colors.ink} />
        </View>
        <Text style={s.filterLabel}>Filters</Text>

        {filters.map((f) => (
          <Pressable
            key={f}
            style={s.filterChip}
            onPress={() => setFilters((prev) => prev.filter((x) => x !== f))}
            accessibilityRole="button"
            accessibilityLabel={`Remove filter ${f}`}
          >
            <Text style={s.filterChipText}>{f}</Text>
            <Icon name="close" size={13} color={colors.inkMuted} />
          </Pressable>
        ))}
      </ScrollView>

      <Text style={s.sortText}>
        Sort by: <Text style={s.sortValue}>Best Match</Text>
      </Text>

      <View style={s.list}>
        {doctors.length > 0 ? (
          doctors.map(card)
        ) : (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Icon name="search" size={26} color={colors.surfie} />
            </View>
            <Text style={s.emptyTitle}>No doctors available</Text>
            <Text style={s.empty}>
              Nobody matches this search right now. Clear a filter, or try a different service.
            </Text>
            <Pressable
              style={s.emptyBtn}
              onPress={() => {
                setFilters([]);
                setQuery('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear filters"
            >
              <Text style={s.emptyBtnText}>Clear filters</Text>
            </Pressable>
          </View>
        )}
      </View>

      {doctors.length > 0 && (
        <View style={s.verifiedRow}>
          <Icon name="shieldCheck" size={14} color={colors.surfie} />
          <Text style={s.verifiedText}>All doctors are verified professionals</Text>
        </View>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.md,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingLeft: spacing.lg,
    paddingRight: 5,
    paddingVertical: 5,
    marginTop: spacing.lg,
    ...shadow.card,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.ink,
  },
  micCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  filterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    marginRight: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.mintSoft,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  filterChipText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.surfie,
  },
  sortText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
  },
  sortValue: {
    fontWeight: '700',
    color: colors.ink,
  },
  list: {
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    ...shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface.mintSoft,
  },
  cardMid: { flex: 1, gap: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
    flexShrink: 1,
  },
  specialty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '500',
    color: colors.surfie,
    marginBottom: 2,
  },
  meta: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  cardRight: {
    width: 92,
    alignItems: 'center',
    gap: 4,
  },
  availPill: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.selected,
  },
  availPillNow: { backgroundColor: colors.surface.mint },
  availText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  feeBox: {
    width: '100%',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: 2,
  },
  feeAmount: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.ink,
  },
  feeLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xxs,
    color: colors.inkMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  nextCol: { flex: 1, gap: 2 },
  nextHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nextLabel: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  nextValue: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '500',
    color: colors.surfie,
  },
  outlineBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
  },
  outlineBtnText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  solidBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.cta,
  },
  solidBtnText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.white,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  empty: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  emptyBtnText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  verifiedText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
  },
});

export default FindDoctorScreen;
