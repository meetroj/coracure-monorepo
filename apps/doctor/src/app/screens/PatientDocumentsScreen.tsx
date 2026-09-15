import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import {
  patientDocs,
  visibleDocs,
  docGroups,
  DOC_FILTERS,
  SOURCE_LABEL,
  docNotifications,
  docPatient,
  type PatientDoc,
} from '../../data/documents';

const MINT = '#E8F8F2';
const LINE = '#E1EDE8';
const INK = '#16232B';
const MUTED = '#6B7C86';

const sourceText = (d: PatientDoc) =>
  d.source === 'requested' ? 'Requested by Dr. Arjun Mehta' : SOURCE_LABEL[d.source];

/**
 * Patient Documents (DOC-DOC-01).
 *
 * Read-only history across consultations. There is no upload control and no
 * request form here — this screen answers "what has this patient shared", and
 * nothing else. Only files reachable through the assigned care relationship
 * are listed, enforced in `visibleDocs` rather than by omission from fixtures.
 */
export const PatientDocumentsScreen = ({
  onBack,
  onOpenDoc,
  onOpenNotification,
}: {
  onBack: () => void;
  onOpenDoc?: (d: PatientDoc) => void;
  /** DOC-DOC-03: opening a fulfilment notice routes to the linked document. */
  onOpenNotification?: (docId: string) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<(typeof DOC_FILTERS)[number]['key']>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    let out = visibleDocs(patientDocs);
    if (filter === 'requested') out = out.filter((d) => d.source === 'requested');
    else if (filter !== 'all') out = out.filter((d) => d.kind === filter);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((d) => d.title.toLowerCase().includes(q));
    return out;
  }, [filter, query]);

  const unread = docNotifications.filter((n) => !n.read);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <View style={s.appBar}>
          <Pressable testID="back" onPress={onBack} hitSlop={10} accessibilityLabel="Back">
            <Icon name="arrowLeft" size={20} color={INK} />
          </Pressable>
          <LogoWide width={104} height={26} />
          <Pressable hitSlop={10} accessibilityLabel="Access log">
            <Icon name="shieldCheck" size={19} color={colors.surfie} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typeStyles.body, s.h1]}>Patient Documents</Text>
        <Text style={[typeStyles.body, s.sub]}>Reports and files shared across consultations.</Text>

        {/* DOC-DOC-03: fulfilment notice, routes to the file it names */}
        {unread.map((n) => (
          <Pressable
            key={n.id}
            testID={`notif-${n.id}`}
            onPress={() => onOpenNotification?.(n.docId)}
            style={s.notif}
          >
            <View style={s.notifIcon}>
              <Icon name="bell" size={15} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.notifTitle]}>{n.title}</Text>
              <Text testID={`notif-body-${n.id}`} style={[typeStyles.body, s.notifBody]}>
                {n.body}
              </Text>
            </View>
            <Text style={[typeStyles.body, s.notifTime]}>{n.receivedAgo}</Text>
            <Icon name="chevronRight" size={14} color={MUTED} />
          </Pressable>
        ))}

        {/* patient strip */}
        <View style={s.strip}>
          <View style={s.avatar}>
            <Text style={[typeStyles.body, s.avatarText]}>{docPatient.initials}</Text>
          </View>
          <View style={s.flex}>
            <View style={s.nameRow}>
              <Text style={[typeStyles.body, s.name]}>{docPatient.name}</Text>
              <View style={s.assignedPill}>
                <Text style={[typeStyles.body, s.assignedText]}>Assigned to you</Text>
              </View>
            </View>
            <Text style={[typeStyles.body, s.meta]}>
              {docPatient.gender} • {docPatient.age} years
            </Text>
            <Text style={[typeStyles.body, s.meta]}>Patient ID: {docPatient.patientId}</Text>
          </View>
          <Pressable style={s.viewPatient} hitSlop={6}>
            <Text style={[typeStyles.body, s.viewPatientText]}>View Patient</Text>
            <Icon name="chevronRight" size={12} color={colors.surfie} />
          </Pressable>
        </View>

        {/* search + sort */}
        <View style={s.searchRow}>
          <View style={s.search}>
            <Icon name="search" size={15} color={MUTED} />
            <TextInput
              testID="search"
              style={[typeStyles.input, s.searchInput]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search documents"
              placeholderTextColor={MUTED}
            />
          </View>
          <Pressable style={s.sortBtn} hitSlop={6}>
            <Text style={[typeStyles.body, s.sortText]}>Newest</Text>
            <Icon name="chevronDown" size={12} color={MUTED} />
          </Pressable>
        </View>

        {/* filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {DOC_FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable
                key={f.key}
                testID={`filter-${f.key}`}
                onPress={() => setFilter(f.key)}
                style={[s.chip, on && s.chipOn]}
              >
                <Text style={[typeStyles.body, [s.chipText, on && s.chipTextOn]]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* grouped rows */}
        {list.length === 0 ? (
          <View style={s.empty}>
            <Text style={[typeStyles.body, s.emptyTitle]}>No documents</Text>
            <Text style={[typeStyles.body, s.emptyBody]}>Nothing matches this filter or search.</Text>
          </View>
        ) : (
          docGroups.map((g) => {
            const rows = list.filter((d) => d.group === g.key);
            if (rows.length === 0) return null;
            return (
              <View key={g.key}>
                <View style={s.groupHead}>
                  <Text style={[typeStyles.body, s.groupTitle]}>{g.title}</Text>
                  {!!g.sub && <Text style={[typeStyles.body, s.groupSub]}>{g.sub}</Text>}
                </View>
                {rows.map((d, i) => (
                  <View key={d.id} style={[s.row, i < rows.length - 1 && s.rowBorder]}>
                    <View style={s.fileIcon}>
                      <Text style={[typeStyles.body, s.fileIconText]}>PDF</Text>
                    </View>
                    <View style={s.flex}>
                      <Text style={[typeStyles.body, s.fileTitle]}>{d.title}</Text>
                      <Text style={[typeStyles.body, s.fileMeta]}>
                        {d.fileType} • {d.size}
                      </Text>
                      <Text style={[typeStyles.body, s.fileMeta]}>
                        {d.uploadedBy === 'patient' ? 'Uploaded by patient' : 'Generated by CoraCure'}
                      </Text>
                      <Text style={[typeStyles.body, s.fileMeta]}>{d.uploadedAt}</Text>
                      <View style={s.tagRow}>
                        <View style={s.sourceTag}>
                          <Text style={[typeStyles.body, s.sourceText]}>{sourceText(d)}</Text>
                        </View>
                        {d.source === 'requested' && (
                          <View style={s.fulfilledTag}>
                            <Text style={[typeStyles.body, s.fulfilledText]}>Fulfilled</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={s.rowActions}>
                      <Icon name="lock" size={14} color={MUTED} />
                      <Pressable
                        testID={`view-${d.id}`}
                        onPress={() => onOpenDoc?.(d)}
                        hitSlop={6}
                        style={s.viewBtn}
                      >
                        <Icon name="eye" size={14} color={colors.surfie} />
                        <Text style={[typeStyles.body, s.viewText]}>View</Text>
                      </Pressable>
                      {/* overflow only where an authorised action exists */}
                      {d.uploadedBy === 'patient' && (
                        <Pressable hitSlop={6} accessibilityLabel={`More options for ${d.title}`}>
                          <Icon name="more" size={15} color={MUTED} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}

        <View style={s.security}>
          <Icon name="lock" size={14} color={colors.surfie} />
          <Text style={[typeStyles.body, s.securityText]}>Documents are encrypted, access-controlled and audit logged.</Text>
        </View>

        <Text style={[typeStyles.body, s.footCount]}>Showing {list.length} documents</Text>
        <Text style={[typeStyles.body, s.footNote]}>Only files available through your assigned care relationship are shown.</Text>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  root: { flex: 1, backgroundColor: colors.white },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  scroll: { paddingHorizontal: spacing.lg },
  h1: { ...typeStyles.pageTitle, color: INK, marginTop: 2 },
  sub: { ...typeStyles.caption, color: MUTED, marginTop: 1, marginBottom: spacing.sm },

  notif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MINT,
    borderRadius: radius.md,
    padding: 8,
    marginBottom: spacing.sm,
  },
  notifIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { ...typeStyles.cardTitle, color: INK },
  notifBody: { ...typeStyles.caption, color: MUTED },
  notifTime: { ...typeStyles.caption, maxWidth: 70, color: MUTED },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: MINT,
    borderRadius: radius.md,
    padding: 9,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typeStyles.avatar, color: colors.surfie },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  name: { ...typeStyles.name, color: INK },
  assignedPill: { backgroundColor: '#D6F0E4', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  assignedText: { ...typeStyles.caption, color: colors.surfie },
  meta: { ...typeStyles.caption, color: MUTED },
  viewPatient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#CFE9DC',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  viewPatientText: { ...typeStyles.caption, color: colors.surfie },

  searchRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 38,
  },
  searchInput: { ...typeStyles.input, flex: 1, color: INK, padding: 0 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.md,
    paddingHorizontal: 9,
    height: 38,
  },
  sortText: { ...typeStyles.caption, color: MUTED },

  chipRow: { gap: 6, paddingVertical: spacing.sm },
  chip: { borderWidth: 1, borderColor: LINE, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5 },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.status, color: MUTED },
  chipTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  groupHead: { backgroundColor: MINT, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6, marginTop: spacing.sm },
  groupTitle: { ...typeStyles.sectionTitle, color: colors.surfie },
  groupSub: { ...typeStyles.caption, color: MUTED },

  row: { flexDirection: 'row', gap: 8, paddingVertical: 9 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: LINE },
  fileIcon: {
    width: 34,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#FDECEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconText: { ...typeStyles.caption, color: '#D94A45' },
  fileTitle: { ...typeStyles.cardTitle, color: INK },
  fileMeta: { ...typeStyles.caption, color: MUTED },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  sourceTag: { maxWidth: '100%', backgroundColor: '#EEF3FB', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  sourceText: { ...typeStyles.caption, color: '#4A6A9B' },
  fulfilledTag: { backgroundColor: '#D6F0E4', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  fulfilledText: { ...typeStyles.caption, color: colors.surfie },
  rowActions: { alignItems: 'flex-end', gap: 6 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewText: { ...typeStyles.buttonSmall, color: colors.surfie },

  security: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: MINT,
    borderRadius: radius.md,
    padding: 9,
    marginTop: spacing.md,
  },
  securityText: { ...typeStyles.caption, flex: 1, color: INK },

  footCount: { ...typeStyles.number, color: INK, marginTop: spacing.sm },
  footNote: { ...typeStyles.helper, color: MUTED, marginTop: 1 },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: 3 },
  emptyTitle: { ...typeStyles.cardTitle, color: INK },
  emptyBody: { ...typeStyles.caption, color: MUTED },
});

export default PatientDocumentsScreen;
