import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { useKeyboardHeight } from '../../components/useKeyboard';
import { colors } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { C } from '../../components/compact';

/* ─── mock thread data ─────────────────────────────────────────────────── */

const CASE = {
  id: 'D-23',
  status: 'Open' as const,
  age: 29,
  gender: 'Female',
  diagnosis: 'Generalized Anxiety Disorder',
  doubt: 'Consideration of SSRI vs SNRI in presence of IBS symptoms.',
};

type Role = 'Psychiatrist' | 'Senior Reviewer' | 'Treating Doctor';

const ROLE_COLOR: Record<Role, { fg: string; bg: string }> = {
  Psychiatrist:    { fg: '#1A7A5E', bg: '#E6F5F0' },
  'Senior Reviewer': { fg: '#5B4BB5', bg: '#EEEBFB' },
  'Treating Doctor': { fg: '#C97F1B', bg: '#FDF4E5' },
};

const MESSAGES: {
  id: string;
  initials: string;
  name: string;
  role: Role;
  date: string;
  body: string;
  likes: number;
}[] = [
  {
    id: 'm1',
    initials: 'RS',
    name: 'Dr. Riya Sharma',
    role: 'Psychiatrist',
    date: '15 May 2024, 09:15 AM',
    body: 'Given the comorbid IBS, SSRI (e.g., Sertraline) is generally better tolerated. Start low and monitor GI symptoms.',
    likes: 0,
  },
  {
    id: 'm2',
    initials: 'AK',
    name: 'Dr. Arjun Kapoor',
    role: 'Senior Reviewer',
    date: '15 May 2024, 10:02 AM',
    body: 'Agree. Additionally, consider Escitalopram if sedation is a concern. Avoid Venlafaxine initially due to GI profile.',
    likes: 2,
  },
  {
    id: 'm3',
    initials: 'NP',
    name: 'Dr. Neha Pillai',
    role: 'Treating Doctor',
    date: '15 May 2024, 10:20 AM',
    body: "Thanks for the inputs. I'll initiate Sertraline 25 mg OD and reassess in 1 week.",
    likes: 1,
  },
];

/* ─── component ────────────────────────────────────────────────────────── */

export const ExpertClarificationScreen = ({
  onBack,
  onSend,
  onMarkReviewed,
  onClose,
}: {
  onBack: () => void;
  onSend: (msg: string) => void;
  onMarkReviewed?: () => void;
  onClose?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string) => setLiked((p) => ({ ...p, [id]: !p[id] }));
  const toggleBookmark = (id: string) => setBookmarked((p) => ({ ...p, [id]: !p[id] }));

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* ── header ── */}
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Back" style={s.backBtn}>
          <Icon name="arrowLeft" size={20} color={C.ink} />
        </Pressable>
        <LogoWide width={96} height={24} />
        <View style={s.backBtn} />
      </View>

      {/* ── page title ── */}
      <View style={s.titleWrap}>
        <Text style={[typeStyles.body, s.pageTitle]}>Clarification Thread</Text>
        <Text style={[typeStyles.body, s.pageSub]}>Case discussions and expert clarifications</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── case card ── */}
        <View style={s.caseCard}>
          <View style={s.caseCardInner}>
            <View style={s.caseIconWrap}>
              <Icon name="document" size={20} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <View style={s.caseTopRow}>
                <Text style={[typeStyles.body, s.caseId]}>{CASE.id}</Text>
                <View style={s.openBadge}>
                  <Text style={[typeStyles.body, s.openText]}>{CASE.status}</Text>
                </View>
              </View>
              <Text style={[typeStyles.body, s.caseDemog]}>
                {CASE.age} • {CASE.gender}
              </Text>
              <Text style={[typeStyles.body, s.caseDiagLabel]}>
                Diagnosis:{' '}
                <Text style={s.caseDiagValue}>{CASE.diagnosis}</Text>
              </Text>
            </View>
          </View>

          <View style={s.doubtBox}>
            <Text style={[typeStyles.body, s.doubtLabel]}>Specific Doubt</Text>
            <Text style={[typeStyles.body, s.doubtText]}>{CASE.doubt}</Text>
          </View>
        </View>

        {/* ── thread header ── */}
        <View style={s.threadHeader}>
          <Text style={[typeStyles.body, s.threadTitle]}>Discussion Thread</Text>
          <Text style={[typeStyles.body, s.threadCount]}>{MESSAGES.length} Messages</Text>
        </View>

        {/* ── messages ── */}
        {MESSAGES.map((msg) => {
          const role = ROLE_COLOR[msg.role];
          const isLiked = !!liked[msg.id];
          const isBookmarked = !!bookmarked[msg.id];
          return (
            <View key={msg.id} style={s.msgCard}>
              <View style={s.msgTop}>
                <View style={[s.avatar, { backgroundColor: role.bg }]}>
                  <Text style={[typeStyles.body, s.avatarText, { color: role.fg }]}>
                    {msg.initials}
                  </Text>
                </View>
                <View style={s.flex}>
                  <View style={s.msgNameRow}>
                    <Text style={[typeStyles.body, s.msgName]}>{msg.name}</Text>
                    <View style={[s.roleBadge, { backgroundColor: role.bg }]}>
                      <Text style={[typeStyles.body, s.roleText, { color: role.fg }]}>
                        {msg.role}
                      </Text>
                    </View>
                  </View>
                  <Text style={[typeStyles.body, s.msgDate]}>{msg.date}</Text>
                </View>
              </View>
              <Text style={[typeStyles.body, s.msgBody]}>{msg.body}</Text>
              <View style={s.msgActions}>
                <Pressable
                  onPress={() => toggleLike(msg.id)}
                  style={s.actionBtn}
                  hitSlop={6}
                  accessibilityLabel="Like"
                >
                  <Icon
                    name="thumbsUp"
                    size={19}
                    color={isLiked ? colors.surfie : C.muted}
                    filled={isLiked}
                  />
                  {msg.likes + (isLiked ? 1 : 0) > 0 && (
                    <Text style={[typeStyles.body, s.actionCount, isLiked && s.likedCount]}>
                      {msg.likes + (isLiked ? 1 : 0)}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => toggleBookmark(msg.id)}
                  style={s.actionBtn}
                  hitSlop={6}
                  accessibilityLabel="Bookmark"
                >
                  <Icon
                    name="bookmark"
                    size={19}
                    color={isBookmarked ? colors.surfie : C.muted}
                    filled={isBookmarked}
                  />
                </Pressable>
                <View style={s.flex} />
                <Pressable
                  testID={`reply-${msg.id}`}
                  style={s.replyBtn}
                  hitSlop={6}
                  onPress={() => {
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                >
                  <Icon name="reply" size={18} color={C.muted} />
                  <Text style={[typeStyles.body, s.replyText]}>Reply</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* ── thread actions ── */}
        <View style={s.composerActions}>
          <Pressable testID="mark-reviewed" onPress={onMarkReviewed} style={s.solidBtn}>
            <Icon name="checkCircle" size={16} color={colors.white} />
            <Text style={[typeStyles.body, s.solidBtnText]}>Mark Reviewed</Text>
          </Pressable>
          <Pressable testID="close-thread" onPress={onClose} style={s.ghostBtn}>
            <Icon name="close" size={16} color={C.ink} />
            <Text style={[typeStyles.body, s.ghostBtnText]}>Close</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── reply composer ──
          Pinned, not appended to the thread: replying is available from
          wherever the doctor is reading, without scrolling past every message
          to reach the box. */}
      {/* lifted by the measured keyboard height rather than by
          KeyboardAvoidingView, which has nothing to react to under an
          edge-to-edge window on Android */}
      <View
        style={[
          s.composerBar,
          {
            marginBottom: keyboard,
            // the gesture bar is behind the keyboard, so its inset is dead space
            paddingBottom: keyboard ? 10 : insets.bottom + 10,
          },
        ]}
      >
          <View style={s.inputRow}>
            <Icon name="message" size={16} color={C.muted} />
            <TextInput
              ref={inputRef}
              testID="reply-input"
              style={[typeStyles.body, s.input]}
              value={text}
              onChangeText={setText}
              placeholder="Ask for clarification..."
              placeholderTextColor={C.muted}
              multiline
            />
            <Pressable hitSlop={6} accessibilityLabel="Attach file">
              <Icon name="clip" size={17} color={C.muted} />
            </Pressable>
            <Pressable
              testID="send-reply"
              onPress={() => { if (text.trim()) { onSend(text.trim()); setText(''); } }}
              style={[s.sendBtn, !text.trim() && s.sendBtnOff]}
              disabled={!text.trim()}
              accessibilityLabel="Send"
            >
              <Icon name="arrowRight" size={16} color={colors.white} />
            </Pressable>
          </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1, minWidth: 0 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 36 },

  titleWrap: { paddingHorizontal: 16, marginBottom: 12 },
  pageTitle: { fontSize: 22, fontWeight: fontWeight.bold, color: C.ink, lineHeight: 28 },
  pageSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  scroll: { paddingHorizontal: 16, paddingBottom: 16 },

  /* case card */
  caseCard: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F3FBF8',
  },
  caseCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
  },
  caseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  caseId: { fontSize: 15, fontWeight: fontWeight.bold, color: C.ink },
  openBadge: {
    backgroundColor: '#E6F5F0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  openText: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.surfie },
  caseDemog: { fontSize: 12, color: C.muted, marginTop: 2 },
  caseDiagLabel: { fontSize: 12, color: C.ink, marginTop: 3 },
  caseDiagValue: { color: colors.surfie, fontWeight: fontWeight.semibold },

  doubtBox: {
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  doubtLabel: { fontSize: 12, fontWeight: fontWeight.semibold, color: C.ink, marginBottom: 3 },
  doubtText: { fontSize: 12, color: C.muted, lineHeight: 18 },

  /* thread */
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  threadTitle: { fontSize: 14, fontWeight: fontWeight.bold, color: C.ink },
  threadCount: { fontSize: 12, color: colors.surfie, fontWeight: fontWeight.semibold },

  /* message card */
  msgCard: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  msgTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 8 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: fontWeight.bold },
  msgNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  msgName: { fontSize: 13, fontWeight: fontWeight.bold, color: C.ink },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  roleText: { fontSize: 10, fontWeight: fontWeight.semibold },
  msgDate: { fontSize: 10, color: C.muted, marginTop: 2 },
  msgBody: { fontSize: 13, color: C.ink, lineHeight: 19, marginLeft: 51 },

  msgActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginLeft: 51,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12, color: C.muted },
  likedCount: { color: colors.surfie },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyText: { fontSize: 12, color: C.muted },

  /* input */
  composerActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  composerBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: colors.white,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: { flex: 1, fontSize: 13, color: C.ink, padding: 0, maxHeight: 80 },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.4 },

  /* disclaimer */
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F7FAF9',
    borderRadius: 10,
    padding: 10,
  },
  disclaimerText: { fontSize: 11, color: C.muted, lineHeight: 17 },

  /* footer */
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: colors.white,
  },
  solidBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.surfie,
  },
  solidBtnText: { fontSize: 14, fontWeight: fontWeight.semibold, color: colors.white },
  ghostBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.line,
  },
  ghostBtnText: { fontSize: 14, fontWeight: fontWeight.semibold, color: C.ink },
});

export default ExpertClarificationScreen;
