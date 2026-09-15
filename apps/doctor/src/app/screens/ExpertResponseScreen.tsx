import { typeStyles } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import {
  C,
  SlimHeader,
  OverflowButton,
  Field,
  SelectRow,
  CheckRow,
  ShieldNote,
  Label,
  SectionTitle,
  StickyFooter,
  GhostButton,
  SolidButton,
} from '../../components/compact';
import {
  initialDraft,
  expertGuidance,
  OUTCOMES,
  DECISION_MAX,
  reviewStamp,
} from '../../data/clarification';

/**
 * Expert Response (DOC-CAS-05) — the treating doctor reads the guidance and
 * decides.
 *
 * Deliberately a document to read, not a workflow dashboard: the guidance sits
 * in open reading space with thin separators rather than inside a card. The
 * decision is one dropdown plus one note.
 *
 * Closing preserves the discussion for audit and writes nothing to the patient
 * record — the doctor remains responsible for the care decision, which the
 * confirmation states rather than implies.
 */
export const ExpertResponseScreen = ({
  onBack,
  onClose,
  onKeepOpen,
}: {
  onBack: () => void;
  onClose: (outcome: string, note: string) => void;
  onKeepOpen?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <SlimHeader title="Expert Response" onBack={onBack} right={<OverflowButton />} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* two-line case context — no patient identity */}
        <View style={s.caseBlock}>
          <View style={s.caseTop}>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.caseId]}>
                {initialDraft.caseId} • {initialDraft.speciality}
              </Text>
              <Text style={[typeStyles.body, s.caseTitle]}>{initialDraft.title}</Text>
            </View>
            <View style={s.greenBadge}>
              <Icon name="checkCircle" size={12} color={colors.surfie} filled />
              <Text style={[typeStyles.body, s.greenText]}>Response received</Text>
            </View>
          </View>
          <Text style={[typeStyles.body, s.caseMeta]}>De-identified case • {expertGuidance.receivedAt}</Text>
        </View>

        {/* guidance as reading matter, not a card */}
        <Text style={[typeStyles.body, s.guidanceHead]}>Guidance from {expertGuidance.author}</Text>
        <Text style={[typeStyles.body, s.guidanceBody]}>{expertGuidance.body}</Text>
        <Text style={[typeStyles.body, s.guidanceMeta]}>
          {expertGuidance.kind} • {expertGuidance.role}
        </Text>
        <View style={s.linkRow}>
          <Pressable testID="shared-case" style={s.linkBtn} hitSlop={6}>
            <Icon name="document" size={14} color={colors.surfie} />
            <Text style={[typeStyles.body, s.linkText]}>Shared case</Text>
          </Pressable>
          <View style={s.linkDivider} />
          <Pressable testID="attachments" style={s.linkBtn} hitSlop={6}>
            <Icon name="clip" size={14} color={colors.surfie} />
            <Text style={[typeStyles.body, s.linkText]}>
              {expertGuidance.attachments} attachment{expertGuidance.attachments === 1 ? '' : 's'}
            </Text>
          </Pressable>
        </View>

        <View style={s.divider} />

        <SectionTitle>Your decision</SectionTitle>
        <Label>Outcome</Label>
        <SelectRow
          testID="outcome"
          value={outcome}
          // cycles through the authored outcomes; a picker replaces this later
          onPress={() => setOutcome((v) => OUTCOMES[(OUTCOMES.indexOf(v) + 1) % OUTCOMES.length])}
        />
        <View style={s.noteWrap}>
          <Field
            testID="decision-note"
            value={note}
            onChangeText={setNote}
            placeholder="Record your decision or next step…"
            multiline
            height={82}
            max={DECISION_MAX}
          />
        </View>

        <View style={s.divider} />

        <CheckRow testID="confirm" checked={confirmed} onToggle={() => setConfirmed((v) => !v)}>
          I reviewed the guidance and remain responsible for the final care decision.
        </CheckRow>

        <View style={s.closeNote}>
          <ShieldNote tone="grey" sub="Nothing is added to the patient record automatically.">
            Closing keeps the complete discussion and audit history.
          </ShieldNote>
        </View>

        {/* preview of what will be stamped, shown only once confirmed */}
        <View style={[s.stamp, !confirmed && s.stampOff]}>
          <Icon name="user" size={13} color={C.muted} />
          <Text style={[typeStyles.body, s.stampText]}>
            Reviewed by {reviewStamp.by} • {reviewStamp.at}
          </Text>
        </View>

        <Text style={[typeStyles.body, s.audit]}>Reviewer and closure time will be recorded.</Text>
      </ScrollView>

      <StickyFooter bottomInset={insets.bottom}>
        <GhostButton testID="keep-open" label="Keep Open" onPress={onKeepOpen} />
        <SolidButton
          testID="close-thread"
          label="Close Thread"
          disabled={!confirmed}
          onPress={() => onClose(outcome, note)}
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
  caseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  caseId: { ...typeStyles.caption, color: C.ink },
  caseTitle: { ...typeStyles.cardTitle, color: C.ink, marginTop: 2 },
  greenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D6F0E4',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  greenText: { ...typeStyles.caption, color: colors.surfie },
  caseMeta: { ...typeStyles.caption, color: C.muted, marginTop: 5 },

  guidanceHead: { ...typeStyles.bodySmall, color: C.ink, marginTop: 16 },
  guidanceBody: { ...typeStyles.caption, color: C.ink, marginTop: 7 },
  guidanceMeta: { ...typeStyles.caption, color: C.muted, marginTop: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  linkText: { ...typeStyles.buttonSmall, color: colors.surfie },
  linkDivider: { width: 1, height: 14, backgroundColor: C.line },

  divider: { height: 1, backgroundColor: C.line, marginTop: 14 },

  noteWrap: { marginTop: 8 },

  closeNote: { marginTop: 10 },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F4F6F5',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    marginTop: 8,
  },
  stampOff: { opacity: 0.45 },
  stampText: { ...typeStyles.caption, color: C.muted },
  audit: { ...typeStyles.helper, color: C.muted, marginTop: 8 },
});

export default ExpertResponseScreen;
