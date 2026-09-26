import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import PatientTabBar from '../components/PatientTabBar';

interface DirectoryEntry {
  id: string;
  name: string;
  category: 'Helplines' | 'Clinics' | 'Centers' | 'Emergency';
  rating: string;
  phone: string;
  address: string;
  hours: string;
  icon: IconName;
  isEmergency?: boolean;
}

const DIRECTORY_ENTRIES: DirectoryEntry[] = [
  {
    id: '1',
    name: '24/7 Clinical Support Hotline',
    category: 'Helplines',
    rating: '4.9 (540+)',
    phone: '14416',
    address: 'Tele-MANAS National Health Network',
    hours: 'Available 24 Hours • Free',
    icon: 'phone',
  },
  {
    id: '2',
    name: 'Outreach Orthopedic Clinic',
    category: 'Clinics',
    rating: '4.8 (120+)',
    phone: '+91 800 234 5678',
    address: 'Sector 14 Medical District, New Delhi',
    hours: 'Mon - Sat: 8:00 AM - 8:00 PM',
    icon: 'shieldCheck',
  },
  {
    id: '3',
    name: 'Post-Op Nurse Care Unit',
    category: 'Centers',
    rating: '4.9 (88)',
    phone: '+91 800 456 7890',
    address: 'In-Home & Virtual Nursing Desk',
    hours: 'Mon - Sun: 7:00 AM - 10:00 PM',
    icon: 'shieldCheck',
  },
  {
    id: '4',
    name: 'Specialized Counseling Center',
    category: 'Helplines',
    rating: '4.7 (95)',
    phone: '1800-599-0019',
    address: 'KIRAN Mental Health & Trauma Support',
    hours: '24/7 Toll Free Helpline',
    icon: 'heart',
  },
  {
    id: '5',
    name: 'Day Care Rehabilitation Center',
    category: 'Centers',
    rating: '4.8 (64)',
    phone: '+91 800 678 1234',
    address: 'Green Park Physiotherapy Hub',
    hours: 'Mon - Fri: 9:00 AM - 6:00 PM',
    icon: 'mapPin',
  },
  {
    id: '6',
    name: 'Emergency Medical Dispatch',
    category: 'Emergency',
    rating: 'Immediate',
    phone: '112',
    address: 'National Emergency Service (All India)',
    hours: 'Immediate Response 24/7',
    icon: 'emergency',
    isEmergency: true,
  },
];

const FILTERS = ['All', 'Helplines', 'Clinics', 'Centers', 'Emergency'];

export const SupportDirectoryScreen = () => {
  const navigation = useNavigation<any>();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = DIRECTORY_ENTRIES.filter((entry) => {
    const matchesFilter = selectedFilter === 'All' || entry.category === selectedFilter;
    const matchesQuery =
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const handleDial = (phone: string, name: string) => {
    Alert.alert('Call Resource', `Calling ${name} at ${phone}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call Now', onPress: () => Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`) },
    ]);
  };

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.headerBar}>
        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>

        <LogoWide width={110} height={28} />

        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.pageTitle}>Support Directory 📍</Text>
          <Text style={s.pageSubtitle}>
            Clinically verified support and helpline resources near you
          </Text>
        </View>

        {/* Search Bar */}
        <View style={s.searchBar}>
          <Icon name="search" size={18} color={colors.inkFaint} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search services, clinics or helplines..."
            placeholderTextColor={colors.inkFaint}
          />
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersRow}
        keyboardShouldPersistTaps="handled"
      >
          {FILTERS.map((f) => {
            const isSelected = selectedFilter === f;
            return (
              <Pressable
                key={f}
                style={[s.filterChip, isSelected && s.filterChipActive]}
                onPress={() => setSelectedFilter(f)}
                accessibilityRole="button"
                accessibilityLabel={f}
              >
                <Text style={[s.filterText, isSelected && s.filterTextActive]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Directory Entries List */}
        <View style={s.entriesList}>
          {filteredEntries.map((item) => (
            <View
              key={item.id}
              style={[s.entryCard, item.isEmergency && s.entryCardEmergency]}
            >
              <View style={s.cardTopRow}>
                <View
                  style={[
                    s.iconWrap,
                    { backgroundColor: item.isEmergency ? '#FEE2E2' : '#EEF8F5' },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    color={item.isEmergency ? '#DC2626' : colors.surfie}
                  />
                </View>
                <View style={s.headerTextCol}>
                  <View style={s.nameBadgeRow}>
                    <Text style={s.entryName} numberOfLines={1}>{item.name}</Text>
                    <View style={s.ratingBadge}>
                      <Icon name="star" size={11} color="#F59E0B" filled />
                      <Text style={s.ratingText}>{item.rating}</Text>
                    </View>
                  </View>
                  <Text style={s.entryAddress}>{item.address}</Text>
                  <Text style={s.entryHours}>{item.hours}</Text>
                </View>
              </View>

              <View style={s.cardBottomRow}>
                <Text style={s.phoneNumber}>{item.phone}</Text>
                <Pressable
                  style={[s.callBtn, item.isEmergency && s.callBtnEmergency]}
                  onPress={() => handleDial(item.phone, item.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${item.name}`}
                >
                  <Icon name="phone" size={14} color={colors.white} />
                  <Text style={s.callBtnText}>Call</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Emergency Footer Banner */}
        <View style={s.emergencyBanner}>
          <Text style={s.emergencyBannerTitle}>24/7 Verified Emergency Numbers</Text>
          <Text style={s.emergencyBannerSub}>
            National Emergency: <Text style={s.boldText}>112</Text> • Tele-MANAS:{' '}
            <Text style={s.boldText}>14416</Text> • KIRAN:{' '}
            <Text style={s.boldText}>1800-599-0019</Text>
          </Text>
        </View>
      </ScrollView>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="CarePlan" />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  titleWrap: {
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 4,
  },
  filtersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  filterTextActive: {
    color: colors.white,
  },
  entriesList: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  entryCardEmergency: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    gap: 3,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  entryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  entryAddress: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  entryHours: {
    fontSize: 11,
    color: colors.inkFaint,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  phoneNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfie,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
  },
  callBtnEmergency: {
    backgroundColor: '#DC2626',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  emergencyBanner: {
    backgroundColor: '#EEF8F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
    marginTop: 4,
  },
  emergencyBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.surfie,
    letterSpacing: 0.3,
  },
  emergencyBannerSub: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '700',
    color: colors.ink,
  },
});

export default SupportDirectoryScreen;
