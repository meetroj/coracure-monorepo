import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, EmptyState, Note } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useStore } from '../../state/store';
import { selectUnreadMessageCount } from '../../state/selectors';
import { THREAD_FILTERS } from '../../data/messaging';

/**
 * Messages.
 *
 * Every thread is anchored to a consultation or a clarification case — there
 * is no contextless messaging and no directory to browse. Expert threads are
 * marked internal: expert discussion is never shown to the patient.
 */
export const ChatListScreen = ({
  onBack,
  onOpenThread,
}: {
  onBack: () => void;
  onOpenThread: (threadId: string) => void;
}) => {
  const threads = useStore((st) => st.threads);
  const unread = useStore(selectUnreadMessageCount);
  const [filter, setFilter] = useState<(typeof THREAD_FILTERS)[number]['key']>('all');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    let out = threads.filter((t) => t.messages.length > 0 || t.lastMessage);
    if (filter === 'unread') out = out.filter((t) => t.unread > 0);
    else if (filter !== 'all') out = out.filter((t) => t.kind === filter);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((t) => t.name.toLowerCase().includes(q) || t.context.toLowerCase().includes(q));
    return out;
  }, [threads, filter, query]);

  return (
    <Screen
      testID="chat-list"
      background={colors.white}
      header={<ScreenHeader onBack={onBack} title="Messages" subtitle={unread ? `${unread} unread` : 'No unread messages'} />}
    >
      <View style={s.search}>
        <Icon name="search" size={16} color={colors.inkFaint} />
        <TextInput
          testID="search"
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or case"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Search messages"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {THREAD_FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <Pressable
              key={f.key}
              testID={`tfilter-${f.key}`}
              onPress={() => setFilter(f.key)}
              style={[s.chip, on && s.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[s.chipText, on && s.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {shown.length === 0 ? (
        <EmptyState icon="message" title="No conversations" body="Nothing matches this filter or search." />
      ) : (
        <View style={s.list}>
          {shown.map((t, i) => (
            <Pressable
              key={t.id}
              testID={`thread-${t.id}`}
              onPress={() => onOpenThread(t.id)}
              style={({ pressed }) => [s.row, i < shown.length - 1 && s.rowBorder, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${t.name}, ${t.context}${t.unread ? `, ${t.unread} unread` : ''}. ${t.lastMessage}`}
            >
              <View style={[s.avatar, t.kind === 'expert' && s.avatarExpert]}>
                <Text style={[s.avatarText, t.kind === 'expert' && s.avatarTextExpert]}>{t.initials}</Text>
              </View>
              <View style={s.flex}>
                <View style={s.rowHead}>
                  <Text style={s.name} numberOfLines={1}>
                    {t.name}
                  </Text>
                  {t.internalOnly && (
                    <View style={s.internalPill}>
                      <Icon name="lock" size={10} color={colors.inkMuted} />
                      <Text style={s.internalText}>Internal</Text>
                    </View>
                  )}
                  <View style={s.flex} />
                  <Text style={s.at}>{t.at}</Text>
                </View>
                <Text style={s.context}>{t.context}</Text>
                <Text style={[s.last, t.unread > 0 && s.lastUnread]} numberOfLines={1}>
                  {t.lastMessage}
                </Text>
              </View>
              {t.unread > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{t.unread}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <Note tone="neutral" icon="shield">
        Conversations are limited to your assigned patients and your own case threads.
      </Note>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
  },
  searchInput: { ...typeStyles.inputSingle, flex: 1, height: 44, color: colors.ink },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.status, color: colors.inkMuted },
  chipTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  list: { paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 72, paddingVertical: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  avatarExpert: { backgroundColor: '#EEF3FB' },
  avatarText: { ...typeStyles.avatar, lineHeight: undefined, color: colors.surfie },
  avatarTextExpert: { color: '#4A6A9B' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { ...typeStyles.name, color: colors.ink, flexShrink: 1 },
  internalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F4F3',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  internalText: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, color: colors.inkMuted },
  at: { ...typeStyles.caption, color: colors.inkMuted },
  context: { ...typeStyles.caption, color: colors.surfie, marginTop: 1 },
  last: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  lastUnread: { color: colors.ink, fontWeight: fontWeight.semibold },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, fontWeight: fontWeight.bold, color: colors.white },
});

export default ChatListScreen;
