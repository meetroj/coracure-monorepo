import { typeStyles } from '../../../../../libs/typography/src';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import {
  C,
  SlimHeader,
  OverflowButton,
  Tracker,
  Field,
  ShieldNote,
  ScanLine,
  SectionTitle,
  StickyFooter,
  GhostButton,
  SolidButton,
} from '../../components/compact';
import {
  initialDraft,
  expertMessage,
  trackerSteps,
  REPLY_MAX,
  hasIdentifiers,
  type CaseStatus,
} from '../../data/clarification';

/**
 * Expert Clarification (DOC-CAS-03) — post and track.
 *
 * Compact status screen rather than a form dashboard: one slim tracker, the
 * latest message, and a reply box. Close lives in the overflow menu, not the
 * footer — closing while the expert is waiting on an answer would be the wrong
 * default action to put under the doctor's thumb.
 */
export const ExpertClarificationScreen = ({
  onBack,
  onSend,
  onSaveDraft,
  onHistory,
  status = 'clarificationNeeded',
}: {
  onBack: () => void;
  onSend: (reply: string) => void;
  onSaveDraft?: (reply: string) => void;
  onHistory?: () => void;
  status?: CaseStatus;
}) => {
  const insets = useSafeAreaInsets();
  const [reply, setReply] = useState('');
  const steps = useMemo(() => trackerSteps(status), [status]);
  const dirty = hasIdentifiers(reply);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <SlimHeader title="Expert Clarification" onBack={onBack} right={<OverflowButton />} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* compact case block — no patient name or identifiers */}
        <View style={s.caseBlock}>
          <View style={s.caseTop}>
            <Text style={[typeStyles.body, s.caseId]}>{initialDraft.caseId}</Text>
            <View style={s.amberBadge}>
              <View style={s.amberDot} />
              <Text style={[typeStyles.body, s.amberText]}>Clarification needed</Text>
            </View>
          </View>
          <Text style={[typeStyles.body, s.caseTitle]}>{initialDraft.title}</Text>
          <View style={s.caseMetaRow}>
            <Text style={[typeStyles.body, s.caseMeta]}>{initialDraft.speciality} • Posted 10 Sep, 10:20 AM</Text>
            <View style={s.flex} />
            <Icon name="shield" size={11} color={colors.surfie} />
            <Text style={[typeStyles.body, s.deid]}>De-identified • Internal only</Text>
          </View>
        </View>

        <View style={s.trackerWrap}>
          <Tracker steps={steps} />
        </View>
        <Pressable testID="history" onPress={onHistory} hitSlop={6} style={s.historyLink}>
          <Text style={[typeStyles.body, s.historyText]}>History &amp; timestamps</Text>
          <Icon name="chevronRight" size={12} color={colors.surfie} />
        </Pressable>

        <View style={s.divider} />

        <SectionTitle>Latest expert message</SectionTitle>
        {/* slim amber rule, not a filled panel */}
        <View style={s.msgRow}>
          <View style={s.msgBar} />
          <View style={s.msgAvatar}>
            <Text style={[typeStyles.body, s.msgAvatarText]}>{expertMessage.initials}</Text>
          </View>
          <View style={s.flex}>
            <View style={s.msgHead}>
              <Text style={[typeStyles.body, s.msgName]}>{expertMessage.name}</Text>
              <View style={s.flex} />
              <Text style={[typeStyles.body, s.msgTime]}>{expertMessage.at}</Text>
            </View>
            <Text style={[typeStyles.body, s.msgRole]}>{expertMessage.role}</Text>
            <Text style={[typeStyles.body, s.msgBody]}>{expertMessage.body}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <SectionTitle>Your reply</SectionTitle>
        <Field
          testID="reply"
          value={reply}
          onChangeText={setReply}
          placeholder="Add the requested information…"
          multiline
          height={100}
          max={REPLY_MAX}
        />

        <Pressable testID="attach" style={s.attachRow}>
          <Icon name="clip" size={15} color={colors.surfie} />
          <Text style={[typeStyles.body, s.attachText]}>Attach de-identified file</Text>
          <View style={s.flex} />
          <Text style={[typeStyles.body, s.attachMeta]}>PDF, DOC, JPG or PNG (max 10 MB)</Text>
          <Icon name="chevronRight" size={13} color={C.muted} />
        </Pressable>

        <ScanLine clean={!dirty} label={dirty ? undefined : 'No identifiers detected'} />

        <View style={s.internalNote}>
          <ShieldNote tone="grey">Expert discussion is not shown to the patient.</ShieldNote>
        </View>

        <View style={s.auditRow}>
          <Icon name="clock" size={12} color={C.muted} />
          <Text style={[typeStyles.body, s.auditText]}>Every response and status change is time-stamped.</Text>
        </View>
      </ScrollView>

      <StickyFooter bottomInset={insets.bottom}>
        <GhostButton testID="draft" label="Save draft" onPress={() => onSaveDraft?.(reply)} />
        <SolidButton
          testID="send"
          label="Send reply"
          disabled={reply.trim().length === 0}
          onPress={() => onSend(reply.trim())}
        />
      </StickyFooter>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: 16, paddingBottom: 12 },

  caseBlock: { backgroundColor: C.mint, borderRadius: 10, padding: 10 },
  caseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caseId: { ...typeStyles.caption, color: C.ink },
  amberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.amberSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  amberDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.amber },
  amberText: { ...typeStyles.caption, color: C.amber },
  caseTitle: { ...typeStyles.cardTitle, color: C.ink, marginTop: 3 },
  caseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  caseMeta: { ...typeStyles.caption, color: C.muted },
  deid: { ...typeStyles.caption, color: colors.surfie },

  trackerWrap: { marginTop: 14, marginHorizontal: -16 },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 10 },
  historyText: { ...typeStyles.caption, color: colors.surfie, textDecorationLine: 'underline' },

  divider: { height: 1, backgroundColor: C.line, marginTop: 12 },

  msgRow: { flexDirection: 'row', gap: 8, paddingLeft: 9 },
  msgBar: { position: 'absolute', left: 0, top: 2, bottom: 2, width: 3, borderRadius: 2, backgroundColor: C.amber },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { ...typeStyles.avatar, color: colors.surfie },
  msgHead: { flexDirection: 'row', alignItems: 'center' },
  msgName: { ...typeStyles.name, color: C.ink },
  msgTime: { ...typeStyles.caption, color: C.muted },
  msgRole: { ...typeStyles.caption, color: C.muted },
  msgBody: { ...typeStyles.caption, color: C.ink, marginTop: 4 },

  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    marginTop: 8,
  },
  attachText: { ...typeStyles.caption, color: C.ink },
  attachMeta: { ...typeStyles.caption, color: C.muted },

  internalNote: { marginTop: 10 },
  auditRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  auditText: { ...typeStyles.helper, color: C.muted },
});

export default ExpertClarificationScreen;
