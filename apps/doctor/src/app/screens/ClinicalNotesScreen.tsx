import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { PatientStrip, Section, FieldValue } from '../../components/clinical';
import { detailFor, type Appointment } from '../../data/doctor';
import {
  noteFields,
  defaultRisk,
  RISK_CATEGORIES,
  RISK_LABEL,
  type RiskCategory,
} from '../../data/clinical';

/**
 * Clinical Notes & Assessment — DOC-CLN-01.
 *
 * Every required field is present and flagged: chief complaint, history,
 * observations, diagnosis, risk, advice and follow-up. Notes save as a draft
 * and stay editable until the consultation is clinically completed, so nothing
 * here locks work away.
 */

const ICONS: Record<string, IconName> = {
  complaint: 'message',
  history: 'folder',
  observations: 'stethoscope',
  diagnosis: 'document',
  advice: 'heart',
  followUp: 'calendar',
};

export const ClinicalNotesScreen = ({
  appointment,
  onBack,
  onSave = () => undefined,
  onViewProfile = () => undefined,
  onMarkDoubt = () => undefined,
  onOpenCaseSummary = () => undefined,
}: {
  appointment: Appointment;
  onBack: () => void;
  onSave?: (risk: RiskCategory) => void;
  onViewProfile?: () => void;
  onMarkDoubt?: () => void;
  onOpenCaseSummary?: () => void;
}) => {
  const d = detailFor(appointment);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<string[]>(['complaint']);
  const [risk, setRisk] = useState<RiskCategory>(defaultRisk.category);
  const [riskOpen, setRiskOpen] = useState(false);
  const [doubt, setDoubt] = useState(false);
  // stamped when the screen opens — a ticking clock here would just distract
  const [savedAt] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );

  const toggle = (k: string) =>
    setOpen((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));

  return (
    <View style={s.root}>
      <Screen contentStyle={s.content}>
        {/* --------------------------------- header -------------------------------- */}
        <View style={s.bar}>
          <Pressable
            testID="back"
            onPress={onBack}
            hitSlop={8}
            style={s.barBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={19} color={colors.ink} />
          </Pressable>
          <View style={s.barLogo}>
            <LogoWide width={100} height={25} />
          </View>
          <View style={s.saved}>
            <View style={s.savedTop}>
              <Icon name="checkCircle" size={12} color={colors.paris} filled />
              <Text style={[typeStyles.body, s.savedText]}>Autosaved</Text>
            </View>
            <Text style={[typeStyles.body, s.savedTime]}>{savedAt}</Text>
          </View>
        </View>

        <View style={s.titleRow}>
          <View style={s.flex}>
            <Text style={[typeStyles.body, s.title]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              Clinical Notes &amp; Diagnosis
            </Text>
            <Text style={[typeStyles.body, s.subtitle]} numberOfLines={1}>
              Structured consultation record
            </Text>
          </View>
          <Pressable
            testID="mark-doubt"
            onPress={() => {
              setDoubt((v) => !v);
              onMarkDoubt();
            }}
            style={[s.doubtBtn, doubt && s.doubtBtnOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: doubt }}
            accessibilityLabel="Refer for clarification"
          >
            <Text style={[typeStyles.body, [s.doubtText, doubt && s.doubtTextOn]]} numberOfLines={1}>
              Refer for Clarification
            </Text>
          </Pressable>
        </View>

        <PatientStrip
          initials={appointment.initials}
          name={appointment.name}
          meta={`${appointment.age} • ${appointment.gender} • ID: ${d.patientId}`}
          ids={[]}
          action="View Profile"
          onAction={onViewProfile}
        />

        {/* ------------------------------ note fields ------------------------------ */}
        {noteFields.slice(0, 4).map((f) => (
          <Section
            key={f.key}
            testID={`section-${f.key}`}
            icon={ICONS[f.key]}
            title={f.label}
            required={f.required}
            open={open.includes(f.key)}
            onToggle={() => toggle(f.key)}
          >
            <FieldValue value={f.value} placeholder={f.placeholder} max={f.max} />
          </Section>
        ))}

        {/* --------------------------- risk assessment ----------------------------- */}
        <Section
          testID="section-risk"
          icon="shield"
          title="Risk Assessment"
          required
          open={riskOpen}
          onToggle={() => setRiskOpen((v) => !v)}
        >
          <Text style={[typeStyles.body, s.fieldLabel]}>Risk category</Text>
          <View style={s.riskRow}>
            {RISK_CATEGORIES.map((r) => {
              const on = risk === r;
              return (
                <Pressable
                  key={r}
                  testID={`risk-${r}`}
                  onPress={() => setRisk(r)}
                  style={[s.risk, on && s.riskOn, on && r === 'high' && s.riskHigh]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[typeStyles.body, [s.riskText, on && s.riskTextOn]]}>{RISK_LABEL[r]}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {noteFields.slice(4).map((f) => (
          <Section
            key={f.key}
            testID={`section-${f.key}`}
            icon={ICONS[f.key]}
            title={f.label}
            required={f.required}
            open={open.includes(f.key)}
            onToggle={() => toggle(f.key)}
          >
            <FieldValue value={f.value} placeholder={f.placeholder} max={f.max} />
          </Section>
        ))}

        <Pressable
          testID="open-case-summary"
          onPress={onOpenCaseSummary}
          style={s.summaryLink}
          accessibilityRole="button"
        >
          <View style={s.summaryLinkIcon}>
            <Icon name="clip" size={16} color={colors.surfie} />
          </View>
          <Text style={[typeStyles.body, s.summaryLinkText]}>Case Summary</Text>
          <Icon name="chevronRight" size={17} color={colors.inkFaint} />
        </Pressable>
      </Screen>

      {/* -------------------------------- footer --------------------------------- */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          testID="save-notes"
          onPress={() => onSave(risk)}
          style={s.cta}
          accessibilityRole="button"
        >
          <Text style={[typeStyles.body, s.ctaText]} numberOfLines={1}>
            Save Notes
          </Text>
          <View style={s.ctaCheck}>
            <Icon name="arrowRight" size={18} color={colors.white} />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  // clears the fixed footer and no more — the trailing gap was dead space
  // the footer is a sibling, not an overlay — nothing to scroll clear of
  content: { paddingBottom: spacing.md },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  barBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLogo: { flex: 1, alignItems: 'center' },
  saved: { alignItems: 'flex-end', minWidth: 62 },
  savedTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedTime: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 1 },
  savedText: { ...typeStyles.caption, color: colors.inkMuted },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: { ...typeStyles.pageTitle, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 2 },
  doubtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    marginTop: 4,
    flexShrink: 0,
  },
  doubtBtnOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  doubtText: { ...typeStyles.caption, color: colors.surfie },
  doubtTextOn: { color: colors.white },

  fieldLabel: { ...typeStyles.label, color: colors.inkMuted, marginBottom: spacing.sm },
  riskRow: { flexDirection: 'row', gap: spacing.sm },
  risk: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
  },
  riskOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  riskHigh: { backgroundColor: colors.danger, borderColor: colors.danger },
  riskText: { ...typeStyles.status, color: colors.inkMuted },
  riskTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  summaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  summaryLinkIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLinkText: { ...typeStyles.cardTitle, flex: 1, color: colors.ink },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  ctaCheck: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.paris,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfie,
  },
  ctaText: { ...typeStyles.button, flex: 1, textAlign: 'center', color: colors.white },
  footNote: { ...typeStyles.helper, textAlign: 'center', color: colors.inkFaint, marginTop: spacing.sm },
});

export default ClinicalNotesScreen;
