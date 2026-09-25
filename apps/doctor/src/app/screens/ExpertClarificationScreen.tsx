import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button, StatusPill } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Tracker } from '../../components/compact';
import { FilePickerSheet } from '../../components/upload';
import { confirm } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { selectDoctor } from '../../state/selectors';
import { closeClarification, replyToClarification } from '../../state/actions';
import {
  experts,
  LIST_STATUS_LABEL,
  REPLY_MAX,
  RESPONSE_TYPE_LABEL,
  trackerSteps,
  type Clarification,
  type CaseStatus,
} from '../../data/clarification';

/**
 * Clarification thread — the discussion on one de-identified case.
 *
 * Every row in the Clarifications list opens its own thread. A reply is added
 * to the thread and stays on screen; answering an expert's question hands the
 * case back to them. Closing asks first and keeps the full history.
 */
export const ExpertClarificationScreen = ({
  clarification,
  onBack,
  onRecordDecision,
}: {
  clarification: Clarification;
  onBack: () => void;
  /** Opens the decision screen for guidance the expert has sent. */
  onRecordDecision: () => void;
}) => {
  const c = useStore((st) => st.clarifications.find((x) => x.id === clarification.id)) ?? clarification;
  const doctor = useStore(selectDoctor);
  const [text, setText] = useState('');
  const [picking, setPicking] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const closed = c.status === 'closed';

  const send = () => {
    const body = text.trim();
    if (!body) return;
    replyToClarification(c.id, body);
    setText('');
    toast.show('Reply sent to the expert');
  };

  const close = () =>
    confirm({
      title: 'Close this thread?',
      message: 'The discussion is kept for audit. Nothing is added to the patient record.',
      confirmLabel: 'Close thread',
      onConfirm: () => {
        closeClarification(c.id);
        toast.show('Thread closed');
      },
    });

  const authorOf = (author: string) =>
    author === 'me' ? { name: `${doctor.name} (you)`, initials: doctor.initials, role: 'Treating doctor' } : experts[author] ?? { name: 'Expert', initials: 'EX', role: 'Expert' };

  return (
    <Screen
      testID="clarification-thread"
      background={colors.white}
      scroll={false}
      header={<ScreenHeader onBack={onBack} inline title="Clarification Thread" subtitle={c.caseId} />}
      footer={
        closed ? (
          <View style={s.closedFoot}>
            <Icon name="lock" size={15} color={colors.inkMuted} />
            <Text style={s.closedText}>Thread closed · history kept for audit</Text>
          </View>
        ) : (
          <View style={s.inputRow}>
            <Pressable
              testID="attach"
              onPress={() => setPicking(true)}
              hitSlop={6}
              style={s.attachBtn}
              accessibilityRole="button"
              accessibilityLabel="Attach a file"
            >
              <Icon name="clip" size={18} color={colors.inkMuted} />
            </Pressable>
            <TextInput
              testID="reply-input"
              style={s.input}
              value={text}
              onChangeText={(t) => setText(t.slice(0, REPLY_MAX))}
              placeholder="Reply to the expert…"
              placeholderTextColor={colors.inkFaint}
              multiline
              accessibilityLabel="Reply"
            />
            <Pressable
              testID="send-reply"
              onPress={send}
              style={[s.sendBtn, !text.trim() && s.sendBtnOff]}
              disabled={!text.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send reply"
            >
              <Icon name="arrowRight" size={17} color={colors.white} />
            </Pressable>
          </View>
        )
      }
    >
      <ScrollView
        ref={scroll}
        style={s.flex}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={(_, h) => h > 0 && scroll.current?.scrollToEnd({ animated: false })}
      >
        <View style={s.caseCard}>
          <View style={s.caseTop}>
            <View style={s.caseIcon}>
              <Icon name={c.icon} size={20} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <View style={s.caseTitleRow}>
                <Text style={s.caseTitle}>{c.title}</Text>
              </View>
              <Text style={s.caseDemog}>
                {c.shared.ageLabel} • {c.shared.gender} • {c.shared.guidanceArea}
              </Text>
              <Text style={s.caseDiag}>
                Diagnosis: <Text style={s.caseDiagValue}>{c.shared.provisionalDiagnosis}</Text>
              </Text>
            </View>
            <StatusPill testID="clarification-status" label={LIST_STATUS_LABEL[c.status]} tone={closed ? 'neutral' : 'brand'} dot={false} />
          </View>
          <View style={s.doubtBox}>
            <Text style={s.doubtLabel}>Specific question</Text>
            <Text style={s.doubtText}>{c.shared.question}</Text>
          </View>
          {c.status !== 'draft' && (
            <View style={s.trackerWrap}>
              <Tracker steps={trackerSteps(c.status as CaseStatus)} />
            </View>
          )}
        </View>

        <View style={s.threadHeader}>
          <Text style={s.threadTitle}>Discussion</Text>
          <Text testID="message-count" style={s.threadCount}>
            {c.messages.length} {c.messages.length === 1 ? 'message' : 'messages'}
          </Text>
        </View>

        {c.messages.map((m) => {
          const who = authorOf(m.author);
          const mine = m.author === 'me';
          return (
            <View key={m.id} testID={`cmsg-${m.id}`} style={[s.msgCard, mine && s.msgMine]}>
              <View style={s.msgTop}>
                <View style={[s.avatar, mine && s.avatarMine]}>
                  <Text style={[s.avatarText, mine && s.avatarTextMine]}>{who.initials}</Text>
                </View>
                <View style={s.flex}>
                  <Text style={s.msgName}>{who.name}</Text>
                  <Text style={s.msgMeta}>
                    {who.role}
                    {m.kind ? ` · ${RESPONSE_TYPE_LABEL[m.kind]}` : ''} · {m.at}
                  </Text>
                </View>
              </View>
              {!!m.body && <Text style={s.msgBody}>{m.body}</Text>}
              {!!m.file && (
                <View style={s.fileRow}>
                  <Icon name="document" size={14} color={colors.surfie} />
                  <Text style={s.fileName} numberOfLines={1}>
                    {m.file}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {!closed && (
          <View style={s.actions}>
            {!!c.guidance && (
              <Button testID="mark-reviewed" label={c.outcome ? 'Update decision' : 'Record decision'} icon="checkCircle" onPress={onRecordDecision} size="sm" style={s.flex} />
            )}
            <Button testID="close-thread" label="Close thread" icon="close" variant="secondary" size="sm" onPress={close} style={s.flex} />
          </View>
        )}
        {!!c.outcome && (
          <View style={s.outcome}>
            <Text style={s.outcomeTitle}>Your decision · {c.outcome.at}</Text>
            <Text style={s.outcomeText}>
              {c.outcome.value}
              {c.outcome.note ? ` — ${c.outcome.note}` : ''}
            </Text>
          </View>
        )}
      </ScrollView>

      <FilePickerSheet
        visible={picking}
        kind="document"
        maxMb={10}
        testID="clarification-attach"
        onClose={() => setPicking(false)}
        onPick={(f) => {
          setPicking(false);
          replyToClarification(c.id, '', f.name);
          toast.show(`${f.name} shared`);
        }}
      />
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  caseCard: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.lg, backgroundColor: '#F3FBF8' },
  caseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md },
  caseIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  caseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  caseTitle: { ...typeStyles.cardTitle, fontSize: 14, color: colors.ink, flexShrink: 1 },
  caseDemog: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  caseDiag: { ...typeStyles.caption, color: colors.ink, marginTop: 3 },
  caseDiagValue: { color: colors.surfie, fontWeight: fontWeight.semibold },
  doubtBox: { borderTopWidth: 1, borderTopColor: colors.surface.line, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  doubtLabel: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.ink, marginBottom: 2 },
  doubtText: { ...typeStyles.bodySmall, color: colors.inkMuted },
  trackerWrap: { borderTopWidth: 1, borderTopColor: colors.surface.line, paddingVertical: spacing.md },

  threadHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  threadTitle: { ...typeStyles.cardTitle, color: colors.ink },
  threadCount: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },

  msgCard: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  msgMine: { backgroundColor: colors.surface.mintSoft, borderColor: colors.surface.selected },
  msgTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEEBFB', alignItems: 'center', justifyContent: 'center' },
  avatarMine: { backgroundColor: colors.successSoft },
  avatarText: { ...typeStyles.caption, fontWeight: fontWeight.bold, color: '#5B4BA8' },
  avatarTextMine: { color: colors.surfie },
  msgName: { ...typeStyles.bodySmall, fontWeight: fontWeight.bold, color: colors.ink },
  msgMeta: { ...typeStyles.caption, fontSize: 11, color: colors.inkMuted },
  msgBody: { ...typeStyles.bodySmall, color: colors.ink },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: colors.white, borderRadius: 8, paddingHorizontal: 8, minHeight: 34 },
  fileName: { ...typeStyles.caption, flex: 1, color: colors.ink },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  outcome: { marginTop: spacing.md, backgroundColor: colors.surface.mint, borderRadius: radius.md, padding: spacing.md },
  outcomeTitle: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  outcomeText: { ...typeStyles.bodySmall, color: colors.ink, marginTop: 2 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  attachBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    ...typeStyles.body,
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    color: colors.ink,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfie, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { opacity: 0.4 },
  closedFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 44 },
  closedText: { ...typeStyles.bodySmall, color: colors.inkMuted },
});

export default ExpertClarificationScreen;
