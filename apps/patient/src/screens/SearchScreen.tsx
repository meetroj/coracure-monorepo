import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon } from '@coracure/ui';
import { searchApi, type SearchResponse, type ServiceMatch, type EmergencyGuidance } from '@coracure/api';

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const inputRef = useRef<TextInput>(null);

  const POPULAR_SUGGESTIONS = [
    'Knee pain & swelling',
    'Physiotherapy rehab',
    'Joint stiffness',
    'Chest discomfort',
    'General physician consult',
    'Asthma & breathing',
  ];

  const executeSearch = async (text: string) => {
    const q = text.trim();
    if (!q) {
      setSearchResponse(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await searchApi.search(q);
      setSearchResponse(res);
    } catch {
      // Handled by API layer
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!query) {
      setSearchResponse(null);
      return;
    }
    const timer = setTimeout(() => {
      executeSearch(query);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const handleDialNumber = (number: string) => {
    const clean = number.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${clean}`);
  };

  /**
   * Same destination as an Explore Services chip on the dashboard: the slot
   * screen, not straight into the booking flow. The patient never picks a
   * provider — they pick a time and the backend assigns — so jumping past
   * SelectSlot skipped the only step that is theirs to make.
   */
  const handleBookService = (service: ServiceMatch) => {
    navigation.navigate('SelectSlot', { serviceName: service.name });
  };

  return (
    <View style={s.container}>
      {/* Header with Search Input */}
      <View style={s.headerBar}>
        <Pressable
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink}
        />
        </Pressable>

        <View style={s.searchField}>
          <Icon name="search" size={18} color={colors.inkFaint} />
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            placeholder="Search symptoms, concerns, therapy..."
            placeholderTextColor={colors.inkFaint}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => executeSearch(query)}
            underlineColorAndroid="transparent"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
                setSearchResponse(null);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="close" size={16} color={colors.inkFaint} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading && (
          <View style={s.centerBox}>
            <ActivityIndicator size="small" color={colors.surfie} />
            <Text style={s.loadingText}>Searching clinical catalog...</Text>
          </View>
        )}

        {/* Empty Query: Show Suggested Concerns */}
        {!query && !isLoading && (
          <View style={s.suggestedSection}>
            <Text style={s.suggestedTitle}>Popular Health Concerns</Text>
            <View style={s.chipsWrap}>
              {POPULAR_SUGGESTIONS.map((sugg) => (
                <Pressable
                  key={sugg}
                  style={s.chip}
                  onPress={() => {
                    setQuery(sugg);
                    executeSearch(sugg);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Search for ${sugg}`}
                >
                  <Icon name="search" size={14} color={colors.surfie} />
                  <Text style={s.chipText}>{sugg}</Text>
                </Pressable>
              ))}
            </View>

            <View style={s.infoNotice}>
              <Icon name="shieldCheck" size={20} color={colors.surfie} />
              <Text style={s.infoNoticeText}>
                No doctor shopping: You select the clinical concern or service, and our platform assigns certified specialists based on pool availability.
              </Text>
            </View>
          </View>
        )}

        {/* Search Results Display */}
        {searchResponse && !isLoading && (
          <View style={s.resultsContainer}>
            {/* Statutory Medical Disclaimer (PT-09-03) */}
            <View style={s.disclaimerCard}>
              <Icon name="info" size={16} color="#0E766C" />
              <Text style={s.disclaimerText}>{searchResponse.disclaimer}</Text>
            </View>

            {/* Emergency Crisis Intercept (PT-09-02) */}
            {searchResponse.crisis && searchResponse.guidance && (
              <View style={s.crisisCard}>
                <View style={s.crisisTopRow}>
                  <View style={s.crisisIconWrap}>
                    <Icon name="emergency" size={24} color="#DC2626" />
                  </View>
                  <View style={s.crisisTitleWrap}>
                    <Text style={s.crisisTitle}>{searchResponse.guidance.title}</Text>
                    <Text style={s.crisisBadge}>24/7 Helpline</Text>
                  </View>
                </View>

                <Text style={s.crisisMessage}>{searchResponse.guidance.message}</Text>

                <View style={s.helplinesList}>
                  {searchResponse.guidance.helplines.map((hl) => (
                    <Pressable
                      key={hl.number}
                      style={s.helplineRow}
                      onPress={() => handleDialNumber(hl.number)}
                      accessibilityRole="button"
                      accessibilityLabel={`Dial ${hl.name} at ${hl.number}`}
                    >
                      <View style={s.helplineInfo}>
                        <Text style={s.helplineName}>{hl.name}</Text>
                        <Text style={s.helplineAvail}>{hl.available}</Text>
                      </View>
                      <View style={s.callBtn}>
                        <Icon name="phone" size={15} color={colors.white} />
                        <Text style={s.callBtnText}>Call {hl.number}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>

                {searchResponse.guidance.footer && (
                  <Text style={s.crisisFooter}>{searchResponse.guidance.footer}</Text>
                )}
              </View>
            )}

            {/* Normal Service Matches */}
            {!searchResponse.crisis && (
              <View style={s.matchesSection}>
                <Text style={s.matchesHeader}>
                  Matching Services ({searchResponse.results.length})
                </Text>

                {searchResponse.results.length === 0 ? (
                  <View style={s.noMatchBox}>
                    <Icon name="alertCircle" size={32} color={colors.inkFaint} />
                    <Text style={s.noMatchTitle}>No exact clinical service match</Text>
                    <Text style={s.noMatchSub}>
                      Try describing your symptoms differently, or consult with General Medicine for clinical triage.
                    </Text>
                  </View>
                ) : (
                  searchResponse.results.map((service) => (
                    <View key={service.id} style={s.serviceCard}>
                      <View style={s.serviceHeader}>
                        <View style={s.serviceIconWrap}>
                          <Icon name="stethoscope" size={20} color={colors.surfie} />
                        </View>
                        <View style={s.serviceTitleWrap}>
                          <Text style={s.serviceName}>{service.name}</Text>
                          <Text style={s.providerType}>{service.providerType}</Text>
                        </View>
                        <View style={s.feePill}>
                          <Text style={s.feeText}>₹{service.consultationFeeInr}</Text>
                        </View>
                      </View>

                      <Text style={s.serviceDesc}>{service.description}</Text>

                      {/* Clinical Match Reason */}
                      {service.reason && (
                        <View style={s.reasonRow}>
                          <Icon name="checkCircle" size={14} color={colors.surfie} />
                          <Text style={s.reasonText}>{service.reason}</Text>
                        </View>
                      )}

                      {/* Concerns Badges */}
                      {service.concerns && service.concerns.length > 0 && (
                        <View style={s.concernsRow}>
                          {service.concerns.map((c) => (
                            <View key={c.id} style={s.concernBadge}>
                              <Text style={s.concernBadgeText}>{c.name}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Footer: Soonest Availability & Action */}
                      <View style={s.serviceFooter}>
                        <View style={s.availabilityWrap}>
                          <Icon name="clock" size={14} color={colors.surfie} />
                          <Text style={s.availText}>Next slot today: 2:30 PM</Text>
                        </View>

                        <Pressable
                          style={s.bookBtn}
                          onPress={() => handleBookService(service)}
                          accessibilityRole="button"
                          accessibilityLabel={`Book ${service.name}`}
                        >
                          <Text style={s.bookBtnText}>Book Service</Text>
                          <Icon name="arrowRight" size={14} color={colors.white} />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  suggestedSection: {
    paddingTop: spacing.md,
  },
  suggestedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipText: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: '500',
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EEF8F5',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#0E766C',
    lineHeight: 17,
  },
  resultsContainer: {
    gap: spacing.md,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF8F5',
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#0E766C',
    lineHeight: 16,
  },
  crisisCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: radius.card,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  crisisTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.sm,
  },
  crisisIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crisisTitleWrap: {
    flex: 1,
  },
  crisisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
  },
  crisisBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 2,
  },
  crisisMessage: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  helplinesList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  helplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  helplineInfo: {
    flex: 1,
  },
  helplineName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  helplineAvail: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  crisisFooter: {
    fontSize: 11,
    color: '#991B1B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  matchesSection: {
    gap: spacing.md,
  },
  matchesHeader: {
    fontFamily: typography.heading.family,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  noMatchBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  noMatchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  noMatchSub: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  /**
   * Home-screen vocabulary, not a second one: the same 18px white card, the
   * same pill chips, the same mint accents and the brand type families. A
   * service found by search should look like the service tiles on the home
   * screen the patient just came from.
   */
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    gap: 10,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  serviceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitleWrap: {
    flex: 1,
  },
  serviceName: {
    fontFamily: typography.heading.family,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  providerType: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.surfie,
    fontWeight: '600',
    marginTop: 2,
  },
  feePill: {
    backgroundColor: colors.surface.mintSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  feeText: {
    fontFamily: typography.heading.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.surfie,
  },
  serviceDesc: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.mintSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  reasonText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.surfie,
    fontWeight: '600',
    flex: 1,
  },
  concernsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  /** The home screen's service chip, to the pixel. */
  concernBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  concernBadgeText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: spacing.sm,
    marginTop: 2,
  },
  availabilityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  availText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.surfie,
    fontWeight: '600',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfie,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  bookBtnText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
});

export default SearchScreen;

