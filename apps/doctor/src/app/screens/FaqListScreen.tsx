import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, EmptyState } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { faqs, type Faq } from '../../data/support';
import { FaqList } from './HelpSupportScreen';

const TOPICS: Faq['topic'][] = ['Consultations', 'Records', 'Payments', 'Account'];

/** Every FAQ, grouped by topic, searchable. */
export const FaqListScreen = ({ onBack }: { onBack: () => void }) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = q ? faqs.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(q)) : faqs;

  return (
    <Screen testID="faq-list" header={<ScreenHeader onBack={onBack} title="FAQs" subtitle={`${faqs.length} answers to common questions.`} />}>
      <View style={s.search}>
        <Icon name="search" size={16} color={colors.inkMuted} />
        <TextInput
          testID="faq-list-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search FAQs"
          placeholderTextColor={colors.inkFaint}
          style={s.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search FAQs"
        />
      </View>
      {matches.length === 0 ? (
        <EmptyState icon="search" title="No matching FAQs" body="Try another word, or raise an issue from Help & Support." />
      ) : (
        TOPICS.map((t) => {
          const items = matches.filter((f) => f.topic === t);
          if (items.length === 0) return null;
          return (
            <View key={t}>
              <Text style={s.topic}>{t}</Text>
              <FaqList items={items} testIDPrefix="faq-all" />
            </View>
          );
        })
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    backgroundColor: colors.white,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  searchInput: { ...typeStyles.inputSingle, flex: 1, height: 44, color: colors.ink },
  topic: { ...typeStyles.label, color: colors.surfie, marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
});

export default FaqListScreen;
