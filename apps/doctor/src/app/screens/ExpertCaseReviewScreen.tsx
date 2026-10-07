import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { messageFor } from '@coracure/api/errors';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, StatusPill } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonRowList, SectionError } from '../../components/skeletons';
import { C, Field, CheckRow, ShieldNote, SectionTitle, SummaryRow, SolidButton } from '../../components/compact';
import { toast } from '../../components/Toast';
import { GUIDANCE_MAX, RESPONSE_TYPE_LABEL, URGENCY_SHORT, type ResponseType } from '../../data/clarification';
import { REVIEW_STATUS_LABEL, canExpertReply, replyAsExpert, useExpertReview } from '../../data/clarifications';

const RESPONSE_TYPES = (Object.keys(RESPONSE_TYPE_LABEL) as ResponseType[]).map((key) => ({
  key,
  label: RESPONSE_TYPE_LABEL[key],
}));

/**
 * Expert Case Review (DOC-CAS-04) — the assigned expert's side of a case.
 *
 * The expert sees the de-identified case and the discussion so far, and
 * nothing more: no patient name or initials, no consultation, no treating
 * doctor's name. The backend's expert view carries none of them.
 *
 * "Clarification requested" asks the treating doctor a question back; the
 * case returns here when they answer. Everything else is guidance. Guidance
 * is advisory — it never edits the treating doctor's plan and never reaches
 * the patient, stated on screen and gated by an explicit confirmation.
 */
export const ExpertCaseReviewScreen = ({ caseId, onBack }: { caseId: string; onBack: () => void }) => {
  const { data: c, showSkeleton, error, retry } = useExpertReview(caseId);
  const [guidance, setGuidance] = useState('');
  const [type, setType] = useState<ResponseType>('considerations');
  const [confirmed, setConfirmed] = useState(false);
  const [open, setOpen] = useState(true);
  const [sending, setSending] = useState(false);

  const replyable = !!c && canExpertReply(c.status);
  const ready = replyable && confirmed && guidance.trim().length > 0 && !sending;

  const submit = async () => {
    if (!ready) return;
    setSending(true);
    try {
      await replyAsExpert(caseId, type, guidance.trim());
      setGuidance('');
      setConfirmed(false);
      toast.show(type === 'clarification' ? 'Question sent to the treating doctor' : 'Guidance sent');
      retry();
    } catch (e) {
      // what was written stays in the box
      toast.show(messageFor(e), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen
      testID="expert-case-review"
      background={colors.white}
      header={<ScreenHeader onBack={onBack} inline title="Expert Case Review" subtitle={c?.ref ?? 'De-identified case'} />}
      footer={
        replyable ? (
          <SolidButton
            testID="submit"
            label={sending ? 'Sending…' : type === 'clarification' ? 'Ask the treating doctor' : 'Submit guidance'}
            disabled={!ready}
            onPress={submit}
          />
        ) : undefined
      }
    >
      {showSkeleton ? (
        <SkeletonRowList rows={4} avatar="none" />
      ) : error ? (
        <SectionError testID="review-error" message="Could not load this case." onRetry={retry} />
      ) : !c ? null : (
        <View style={s.body}>
          <View style={s.caseBlock}>
            <View style={s.caseTop}>
              <Text style={s.ref}>{c.ref}</Text>
              <StatusPill
                testID="review-status"
                label={REVIEW_STATUS_LABEL[c.status]}
                tone={c.status === 'awaiting_response' ? 'warn' : 'brand'}
                dot={false}
              />
            </View>
            <Text style={s.caseTitle}>{c.title}</Text>
            <View style={s.caseMetaRow}>
              <Text style={s.caseMeta}>
                {c.ageLabel} • {c.gender} • {URGENCY_SHORT[c.urgency]} urgency
                {c.guidanceArea ? ` • ${c.guidanceArea}` : ''}
              </Text>
              <View style={s.flex} />
              <Icon name="shield" size={11} color={colors.surfie} />
              <Text style={s.deid}>De-identified</Text>
            </View>
          </View>

          <Pressable onPress={() => setOpen((v) => !v)} style={s.sectionHead} testID="toggle-context" accessibilityRole="button">
            <Text style={s.sectionTitle}>Shared clinical context</Text>
            <Icon name={open ? 'chevronDown' : 'chevronRight'} size={15} color={C.muted} />
          </Pressable>
          {open && (
            <View style={s.contextBox}>
              <SummaryRow label="Brief history" value={c.history} />
              <SummaryRow label="Provisional diagnosis" value={c.diagnosis || 'Not given'} />
              <SummaryRow label="Current plan" value={c.currentPlan || 'Not given'} />
              <SummaryRow label="Clinical question" value={c.question} last />
            </View>
          )}

          {c.messages.length > 0 && (
            <>
              <SectionTitle>Discussion</SectionTitle>
              {c.messages.map((m) => {
                const mine = m.author === 'me';
                return (
                  <View key={m.id} testID={`review-msg-${m.id}`} style={[s.msg, mine && s.msgMine]}>
                    <Text style={s.msgWho}>
                      {mine ? 'You' : 'Treating doctor'}
                      {m.kind ? ` · ${RESPONSE_TYPE_LABEL[m.kind]}` : ''} · {m.at}
                    </Text>
                    <Text style={s.msgBody}>{m.body}</Text>
                  </View>
                );
              })}
            </>
          )}

          {replyable ? (
            <>
              <SectionTitle>{c.status === 'clarification_asked' ? 'Add to your guidance' : 'Your clinical guidance'}</SectionTitle>
              {c.status === 'clarification_asked' && (
                <Text testID="waiting-on-doctor" style={s.hint}>
                  You asked the treating doctor a question. You can still add guidance while you wait.
                </Text>
              )}
              <Field
                testID="guidance"
                value={guidance}
                onChangeText={setGuidance}
                placeholder="Add considerations for the treating doctor…"
                multiline
                height={120}
                max={GUIDANCE_MAX}
                accessibilityLabel="Your guidance"
              />

              <SectionTitle>Response type</SectionTitle>
              <View style={s.chipGrid}>
                {RESPONSE_TYPES.map((r) => {
                  const on = type === r.key;
                  return (
                    <Pressable
                      key={r.key}
                      testID={`type-${r.key}`}
                      onPress={() => setType(r.key)}
                      style={[s.chip, on && s.chipOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                    >
                      <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
                      <Text style={[s.chipText, on && s.chipTextOn]}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={s.boundary}>
                <ShieldNote sub="No patient communication or wider record access.">
                  Guidance supports the treating doctor. It does not modify their care plan.
                </ShieldNote>
              </View>

              <View style={s.confirmWrap}>
                <CheckRow testID="confirm" checked={confirmed} onToggle={() => setConfirmed((v) => !v)}>
                  I confirm this response contains clinical guidance only.
                </CheckRow>
                <Text style={s.audit}>Expert identity, response and submission time will be recorded.</Text>
              </View>
            </>
          ) : (
            <View testID="review-readonly" style={s.readonly}>
              <Icon name="lock" size={14} color={colors.inkMuted} />
              <Text style={s.readonlyText}>
                {c.status === 'closed' ? 'This case is closed.' : 'The treating doctor has reviewed your guidance.'} Nothing more to add.
              </Text>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },

  caseBlock: { backgroundColor: C.mint, borderRadius: 10, padding: 10, gap: 3 },
  caseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ref: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: C.ink },
  caseTitle: { ...typeStyles.cardTitle, color: C.ink },
  caseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  caseMeta: { ...typeStyles.caption, color: C.muted, flexShrink: 1 },
  deid: { ...typeStyles.caption, color: colors.surfie },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6, minHeight: 32 },
  sectionTitle: { ...typeStyles.sectionTitle, color: C.ink },
  contextBox: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 9 },

  msg: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  msgMine: { backgroundColor: colors.surface.mintSoft, borderColor: colors.surface.selected },
  msgWho: { ...typeStyles.caption, color: colors.inkMuted, marginBottom: 2 },
  msgBody: { ...typeStyles.bodySmall, color: colors.ink },

  hint: { ...typeStyles.caption, color: colors.inkMuted, marginBottom: spacing.sm },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  chipOn: { borderColor: colors.surfie, backgroundColor: '#F4FBF8' },
  radio: { width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: '#D3E2DC', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.surfie },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfie },
  chipText: { ...typeStyles.status, flex: 1, color: C.muted },
  chipTextOn: { color: C.ink, fontWeight: fontWeight.semibold },

  boundary: { marginTop: 12 },
  confirmWrap: { marginTop: 12, gap: 4 },
  audit: { ...typeStyles.helper, color: C.muted, marginLeft: 27 },

  readonly: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg },
  readonlyText: { ...typeStyles.caption, color: colors.inkMuted, flex: 1 },
});

export default ExpertCaseReviewScreen;
