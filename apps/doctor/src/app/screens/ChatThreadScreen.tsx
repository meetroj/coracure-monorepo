import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { ScreenHeader, HeaderAction } from '../../components/ScreenHeader';
import { FilePickerSheet, type PickedFile } from '../../components/upload';
import { toast } from '../../components/Toast';
import { useStore, type ThreadLive } from '../../state/store';
import { sendMessage } from '../../state/actions';
import { MESSAGE_MAX } from '../../data/messaging';
import { patientDocs } from '../../data/documents';

/** A file that is also a document on the patient's record opens in the viewer. */
const docForFile = (thread: ThreadLive, file: string) =>
  patientDocs.find((d) => d.patientId === thread.patientId && file.toLowerCase().startsWith(d.title.toLowerCase()));

/**
 * Chat thread.
 *
 * The context line is permanent: every message belongs to a consultation or a
 * clarification case, and an expert thread says it is internal so the doctor
 * is never unsure whether the patient can see it. Sent messages are kept on
 * the thread, and the view opens at the latest one.
 */
export const ChatThreadScreen = ({
  thread,
  onBack,
  onOpenDoc,
  onOpenContext,
}: {
  thread: ThreadLive;
  onBack: () => void;
  onOpenDoc: (docId: string) => void;
  /** The consultation or clarification the thread belongs to. */
  onOpenContext: () => void;
}) => {
  const live = useStore((st) => st.threads.find((t) => t.id === thread.id)) ?? thread;
  const [draft, setDraft] = useState('');
  const [picking, setPicking] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    sendMessage(live.id, body);
    setDraft('');
  };

  const attach = (f: PickedFile) => {
    setPicking(false);
    sendMessage(live.id, '', f.name);
    toast.show(`${f.name} sent`);
  };

  return (
    <Screen
      testID="chat-thread"
      background={colors.white}
      scroll={false}
      header={
        <ScreenHeader
          onBack={onBack}
          inline
          title={live.name}
          subtitle={live.context}
          right={
            <HeaderAction
              testID="thread-context"
              icon={live.kind === 'expert' ? 'message' : 'user'}
              label={live.kind === 'expert' ? 'Open clarification' : `Open ${live.name}'s appointment`}
              onPress={onOpenContext}
            />
          }
        />
      }
      footer={
        <View style={s.composer}>
          <Pressable
            testID="attach"
            onPress={() => setPicking(true)}
            hitSlop={6}
            style={s.attachBtn}
            accessibilityRole="button"
            accessibilityLabel="Attach a file"
          >
            <Icon name="clip" size={19} color={colors.inkMuted} />
          </Pressable>
          <TextInput
            testID="composer"
            style={s.input}
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, MESSAGE_MAX))}
            placeholder="Write a message…"
            placeholderTextColor={colors.inkFaint}
            multiline
            underlineColorAndroid="transparent"
            accessibilityLabel="Message"
          />
          <Pressable
            testID="send"
            onPress={send}
            disabled={draft.trim().length === 0}
            style={[s.sendBtn, draft.trim().length === 0 && s.sendOff]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Icon name="arrowRight" size={18} color={colors.white} />
          </Pressable>
        </View>
      }
    >
      {live.internalOnly && (
        <View style={s.internalStrip}>
          <Icon name="lock" size={13} color={colors.inkMuted} />
          <Text style={s.internalText}>Internal thread — not shown to the patient.</Text>
        </View>
      )}

      <ScrollView
        ref={scroll}
        style={s.flex}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // open at the latest message, and follow new ones
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        {live.messages.length === 0 && (
          <Text style={s.empty}>No messages yet. Messages here stay with {live.context}.</Text>
        )}
        {live.messages.map((m) => {
          const mine = m.from === 'me';
          const doc = m.file ? docForFile(live, m.file) : undefined;
          return (
            <View key={m.id} testID={`message-${m.id}`} style={[s.bubbleRow, mine && s.bubbleRowMine]}>
              <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                {!!m.body && <Text style={[s.body, mine && s.bodyMine]}>{m.body}</Text>}
                {!!m.file &&
                  (doc ? (
                    <Pressable
                      testID={`file-${m.id}`}
                      onPress={() => onOpenDoc(doc.id)}
                      style={[s.fileRow, mine && s.fileRowMine]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${m.file}`}
                    >
                      <Icon name="document" size={14} color={mine ? colors.white : colors.surfie} />
                      <Text style={[s.fileName, mine && s.bodyMine]} numberOfLines={1}>
                        {m.file}
                      </Text>
                      <Icon name="chevronRight" size={13} color={mine ? colors.white : colors.surfie} />
                    </Pressable>
                  ) : (
                    <View style={[s.fileRow, mine && s.fileRowMine]}>
                      <Icon name="document" size={14} color={mine ? colors.white : colors.surfie} />
                      <Text style={[s.fileName, mine && s.bodyMine]} numberOfLines={1}>
                        {m.file}
                      </Text>
                    </View>
                  ))}
                <Text style={[s.at, mine && s.atMine]}>{m.at}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <FilePickerSheet visible={picking} kind="document" maxMb={10} onPick={attach} onClose={() => setPicking(false)} testID="chat-attach" />
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  internalStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F5F4',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  internalText: { ...typeStyles.caption, color: colors.inkMuted },
  scroll: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  empty: { ...typeStyles.bodySmall, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xl },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleTheirs: { backgroundColor: '#F3F7F5', borderTopLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.surfie, borderTopRightRadius: 4 },
  body: { ...typeStyles.bodySmall, color: colors.ink },
  bodyMine: { color: colors.white },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 8,
    minHeight: 36,
    marginTop: 6,
  },
  fileRowMine: { backgroundColor: 'rgba(255,255,255,0.18)' },
  fileName: { ...typeStyles.caption, flex: 1, color: colors.ink, fontWeight: fontWeight.medium },
  at: { ...typeStyles.caption, fontSize: 11, color: colors.inkMuted, marginTop: 4, textAlign: 'right' },
  atMine: { color: 'rgba(255,255,255,0.8)' },

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  attachBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    ...typeStyles.body,
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: 22,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    color: colors.ink,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfie, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
});

export default ChatThreadScreen;
