import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { C, SlimHeader, ShieldNote } from '../../components/compact';
import { threads, THREAD_FILTERS, threadUnread, type ChatThread } from '../../data/messaging';

/**
 * Chat list.
 *
 * Every thread is anchored to a consultation or a clarification case — there is
 * no contextless messaging and no directory to browse. Expert threads are
 * marked internal, matching the rule that expert discussion is never shown to
 * the patient.
 */
export const ChatListScreen = ({
  onBack,
  onOpenThread,
}: {
  onBack: () => void;
  onOpenThread: (t: ChatThread) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<(typeof THREAD_FILTERS)[number]['key']>('all');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    let out = threads;
    if (filter === 'unread') out = out.filter((t) => t.unread > 0);
    else if (filter !== 'all') out = out.filter((t) => t.kind === filter);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((t) => t.name.toLowerCase().includes(q) || t.context.toLowerCase().includes(q));
    return out;
  }, [filter, query]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <SlimHeader title="Messages" onBack={onBack} />
      </View>

      <View style={s.countRow}>
        <Text style={[typeStyles.body, s.count]}>{threadUnread(threads)} unread messages</Text>
      </View>

      <View style={s.searchWrap}>
        <View style={s.search}>
          <Icon name="search" size={15} color={C.muted} />
          <TextInput
            testID="search"
            style={[typeStyles.input, s.searchInput]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or case"
            placeholderTextColor={C.muted}
          />
        </View>
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
            >
              <Text style={[typeStyles.body, [s.chipText, on && s.chipTextOn]]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {shown.length === 0 ? (
          <View style={s.empty}>
            <Icon name="message" size={26} color={colors.surfie} />
            <Text style={[typeStyles.body, s.emptyTitle]}>No conversations</Text>
            <Text style={[typeStyles.body, s.emptyBody]}>Nothing matches this filter or search.</Text>
          </View>
        ) : (
          shown.map((t, i) => (
            <Pressable
              key={t.id}
              testID={`thread-${t.id}`}
              onPress={() => onOpenThread(t)}
              style={[s.row, i < shown.length - 1 && s.rowBorder]}
            >
              <View style={[s.avatar, t.kind === 'expert' && s.avatarExpert]}>
                <Text style={[typeStyles.body, [s.avatarText, t.kind === 'expert' && s.avatarTextExpert]]}>{t.initials}</Text>
              </View>
              <View style={s.flex}>
                <View style={s.rowHead}>
                  <Text style={[typeStyles.body, s.name]}>
                    {t.name}
                  </Text>
                  {t.internalOnly && (
                    <View style={s.internalPill}>
                      <Icon name="lock" size={8} color={C.muted} />
                      <Text style={[typeStyles.body, s.internalText]}>Internal</Text>
                    </View>
                  )}
                  <View style={s.flex} />
                  <Text style={[typeStyles.body, s.at]}>{t.at}</Text>
                </View>
                <Text style={[typeStyles.body, s.context]}>{t.context}</Text>
                <Text style={[typeStyles.body, [s.last, t.unread > 0 && s.lastUnread]]}>
                  {t.lastMessage}
                </Text>
              </View>
              {t.unread > 0 && (
                <View style={s.badge}>
                  <Text style={[typeStyles.body, s.badgeText]}>{t.unread}</Text>
                </View>
              )}
            </Pressable>
          ))
        )}

        <View style={s.note}>
          <ShieldNote tone="grey">
            Conversations are limited to your assigned patients and your own case threads.
          </ShieldNote>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.white },

  countRow: { paddingHorizontal: 16, paddingTop: 2 },
  count: { ...typeStyles.number, color: C.ink },

  searchWrap: { paddingHorizontal: 16, paddingTop: 8 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: { ...typeStyles.input, flex: 1, color: C.ink, padding: 0 },

  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.status, color: C.muted },
  chipTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  scroll: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  avatarExpert: { backgroundColor: '#EEF3FB' },
  avatarText: { ...typeStyles.avatar, color: colors.surfie },
  avatarTextExpert: { color: '#4A6A9B' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { ...typeStyles.name, color: C.ink, maxWidth: 140 },
  internalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F1F4F3',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  internalText: { ...typeStyles.caption, color: C.muted },
  at: { ...typeStyles.caption, color: C.muted },
  context: { ...typeStyles.caption, color: colors.surfie, marginTop: 1 },
  last: { ...typeStyles.caption, color: C.muted, marginTop: 2 },
  lastUnread: { color: C.ink, fontWeight: fontWeight.semibold },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typeStyles.status, color: colors.white },

  note: { marginTop: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 4 },
  emptyTitle: { ...typeStyles.cardTitle, color: C.ink },
  emptyBody: { ...typeStyles.caption, color: C.muted },
});

export default ChatListScreen;
