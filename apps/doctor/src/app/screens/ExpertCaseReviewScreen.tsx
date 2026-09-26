import { typeStyles, fontWeight } from '../../theme/typography';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import {
  C,
  SlimHeader,
  Field,
  CheckRow,
  ShieldNote,
  SectionTitle,
  SummaryRow,
  StickyFooter,
  GhostButton,
  SolidButton,
} from '../../components/compact';
import {
  clarifications,
  GUIDANCE_MAX,
  RESPONSE_TYPE_LABEL,
  type ResponseType,
} from '../../data/clarification';

const RESPONSE_TYPES = (Object.keys(RESPONSE_TYPE_LABEL) as ResponseType[]).map((key) => ({
  key,
  label: RESPONSE_TYPE_LABEL[key],
}));

/** The case an expert sees: the shared, de-identified fields of a clarification. */
const sharedCaseOf = (id: string) => {
  const c = clarifications.find((x) => x.id === id) ?? clarifications[0];
  return {
    caseId: c.caseId,
    title: c.title,
    speciality: 'Psychiatry',
    attachments: c.shared.files.length,
    ...c.shared,
  };
};

/**
 * Expert Case Review (DOC-CAS-04) — the authorised expert's side.
 *
 * The expert sees a de-identified case and nothing more: no patient name, id,
 * contact details, treating-doctor notes or wider record. The case shown here
 * is produced by `deIdentify`, so this screen cannot display a field the
 * sharing rules strip.
 *
 * Guidance is advisory. It never edits the treating doctor's plan and never
 * reaches the patient — stated on screen and gated by an explicit confirmation.
 */
export const ExpertCaseReviewScreen = ({
  onBack,
  onSubmit,
  onSaveDraft,
  clarificationId = 'cl3',
}: {
  onBack: () => void;
  onSubmit: (guidance: string, type: ResponseType) => void;
  onSaveDraft?: (guidance: string) => void;
  clarificationId?: string;
}) => {
  const insets = useSafeAreaInsets();
  const shared = sharedCaseOf(clarificationId);
  const [guidance, setGuidance] = useState('');
  const [type, setType] = useState<ResponseType>('considerations');
  const [confirmed, setConfirmed] = useState(false);
  const [open, setOpen] = useState(true);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <SlimHeader
          onBack={onBack}
          center={
            <View style={s.headCenter}>
              <Text style={[typeStyles.body, s.headTitle]}>Expert Case Review</Text>
              <View style={s.accessBadge}>
                <Icon name="shield" size={10} color={colors.surfie} />
                <Text style={[typeStyles.body, s.accessText]}>Expert access</Text>
              </View>
            </View>
          }
        />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* de-identified case strip */}
        <View style={s.caseBlock}>
          <View style={s.caseTop}>
            <Text style={[typeStyles.body, s.caseId]}>{shared.caseId}</Text>
            <View style={s.amberBadge}>
              <View style={s.amberDot} />
              <Text style={[typeStyles.body, s.amberText]}>Awaiting Response</Text>
            </View>
          </View>
          <Text style={[typeStyles.body, s.caseTitle]}>{shared.title}</Text>
          <View style={s.caseMetaRow}>
            <Text style={[typeStyles.body, s.caseMeta]}>
              {shared.ageLabel} • {shared.gender} • {shared.speciality}
            </Text>
            <View style={s.flex} />
            <Icon name="shield" size={11} color={colors.surfie} />
            <Text style={[typeStyles.body, s.deid]}>De-identified</Text>
          </View>
        </View>

        {/* shared context — one region, not a card per row */}
        <Pressable onPress={() => setOpen((v) => !v)} style={s.sectionHead} testID="toggle-context">
          <Text style={[typeStyles.body, s.sectionTitle]}>Shared clinical context</Text>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={15} color={C.muted} />
        </Pressable>
        {open && (
          <View style={s.contextBox}>
            <SummaryRow label="Brief history" value={shared.history} />
            <SummaryRow label="Provisional diagnosis" value={shared.provisionalDiagnosis} />
            <SummaryRow label="Current plan" value={shared.currentPlan} />
            <SummaryRow label="Clinical question" value={shared.question} last />
            <View testID="attachment" style={s.attachLink}>
              <Icon name="clip" size={13} color={colors.surfie} />
              <Text style={[typeStyles.body, s.attachText]}>
                {shared.attachments} permitted attachment{shared.attachments === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        )}

        <SectionTitle>Your clinical guidance</SectionTitle>
        <Field
          testID="guidance"
          value={guidance}
          onChangeText={setGuidance}
          placeholder="Add considerations for the treating doctor…"
          multiline
          height={120}
          max={GUIDANCE_MAX}
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
                <Text style={[typeStyles.body, [s.chipText, on && s.chipTextOn]]}>
                  {r.label}
                </Text>
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
          <Text style={[typeStyles.body, s.audit]}>Expert identity, response and submission time will be recorded.</Text>
        </View>
      </ScrollView>

      <StickyFooter bottomInset={insets.bottom}>
        {onSaveDraft && <GhostButton testID="draft" label="Save draft" onPress={() => onSaveDraft(guidance)} />}
        <SolidButton
          testID="submit"
          label="Submit guidance"
          disabled={!confirmed || guidance.trim().length === 0}
          onPress={() => onSubmit(guidance.trim(), type)}
        />
      </StickyFooter>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: 16, paddingBottom: 12 },

  headCenter: { alignItems: 'center', gap: 2 },
  headTitle: { ...typeStyles.pageTitle, color: C.ink },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.mint,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  accessText: { ...typeStyles.caption, color: colors.surfie },

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

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  sectionTitle: { ...typeStyles.sectionTitle, color: C.ink },
  contextBox: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 9 },
  attachLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9 },
  attachText: { ...typeStyles.caption, color: colors.surfie },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  chipOn: { borderColor: colors.surfie, backgroundColor: '#F4FBF8' },
  radio: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D3E2DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.surfie },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surfie },
  chipText: { ...typeStyles.status, flex: 1, color: C.muted },
  chipTextOn: { color: C.ink, fontWeight: fontWeight.semibold },

  boundary: { marginTop: 12 },
  confirmWrap: { marginTop: 12, gap: 4 },
  audit: { ...typeStyles.helper, color: C.muted, marginLeft: 27 },
});

export default ExpertCaseReviewScreen;
