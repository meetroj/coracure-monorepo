import { typeStyles } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { C, SlimHeader, OverflowButton } from '../../components/compact';
import { messagesByThread, MESSAGE_MAX, type ChatThread, type ChatMessage } from '../../data/messaging';

/**
 * Chat thread.
 *
 * The context strip is permanent, not decorative: every message here belongs to
 * a consultation or a clarification case, and an expert thread is flagged
 * internal so the doctor is never unsure whether the patient can see it.
 */
export const ChatThreadScreen = ({
  thread,
  onBack,
}: {
  thread: ChatThread;
  onBack: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<ChatMessage[]>([]);

  const history = [...(messagesByThread[thread.id] ?? []), ...sent];

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setSent((v) => [...v, { id: `s${v.length}`, from: 'me', body, at: 'Now' }]);
    setDraft('');
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <SlimHeader
          onBack={onBack}
          right={<OverflowButton />}
          center={
            <View style={s.headCenter}>
              <Text style={[typeStyles.body, s.headName]}>
                {thread.name}
              </Text>
              <Text style={[typeStyles.body, s.headContext]}>{thread.context}</Text>
            </View>
          }
        />
      </View>

      {thread.internalOnly && (
        <View style={s.internalStrip}>
          <Icon name="lock" size={12} color={C.muted} />
          <Text style={[typeStyles.body, s.internalText]}>Internal thread — not shown to the patient.</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {history.map((m) => {
            const mine = m.from === 'me';
            return (
              <View key={m.id} style={[s.bubbleRow, mine && s.bubbleRowMine]}>
                <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                  <Text style={[typeStyles.body, [s.body, mine && s.bodyMine]]}>{m.body}</Text>
                  {!!m.file && (
                    <View style={[s.fileRow, mine && s.fileRowMine]}>
                      <Icon name="document" size={13} color={mine ? colors.white : colors.surfie} />
                      <Text style={[typeStyles.body, [s.fileName, mine && s.bodyMine]]}>
                        {m.file}
                      </Text>
                    </View>
                  )}
                  <Text style={[typeStyles.body, [s.at, mine && s.atMine]]}>{m.at}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[s.composer, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable testID="attach" hitSlop={8} style={s.attachBtn} accessibilityLabel="Attach file">
            <Icon name="clip" size={18} color={C.muted} />
          </Pressable>
          <TextInput
            testID="composer"
            style={[typeStyles.input, s.input]}
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, MESSAGE_MAX))}
            placeholder="Write a message…"
            placeholderTextColor={C.muted}
            multiline
          />
          <Pressable
            testID="send"
            onPress={send}
            disabled={draft.trim().length === 0}
            style={[s.sendBtn, draft.trim().length === 0 && s.sendOff]}
            accessibilityLabel="Send message"
          >
            <Icon name="arrowRight" size={17} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.white },

  headCenter: { alignItems: 'center' },
  headName: { ...typeStyles.name, color: C.ink },
  headContext: { ...typeStyles.caption, color: colors.surfie },

  internalStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F5F4',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  internalText: { ...typeStyles.caption, color: C.muted },

  scroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  bubbleTheirs: { backgroundColor: '#F3F7F5', borderTopLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.surfie, borderTopRightRadius: 4 },
  body: { ...typeStyles.caption, color: C.ink },
  bodyMine: { color: colors.white },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginTop: 6,
  },
  fileRowMine: { backgroundColor: 'rgba(255,255,255,0.18)' },
  fileName: { ...typeStyles.caption, flex: 1, color: C.ink },
  at: { ...typeStyles.caption, color: C.muted, marginTop: 4, textAlign: 'right' },
  atMine: { color: 'rgba(255,255,255,0.75)' },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: colors.white,
  },
  attachBtn: { height: 38, justifyContent: 'center' },
  input: { ...typeStyles.input, flex: 1, minHeight: 38, maxHeight: 96, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 9, color: C.ink },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.4 },
});

export default ChatThreadScreen;
