import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Screen } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useStore } from '../../state/store';
import { selectDoctor, selectRecord } from '../../state/selectors';
import { detailFor, type Appointment } from '../../data/doctor';
import { canPrescribe, outputLabel } from '../../data/clinical';

/**
 * The patient's copy of the prescription or advice plan, laid out the way the
 * PDF reads. A draft is marked as a draft on every view, so a preview can
 * never be mistaken for the issued document.
 */
export const PrescriptionPreviewScreen = ({ appointment, onBack }: { appointment: Appointment; onBack: () => void }) => {
  const a = appointment;
  const d = detailFor(a);
  const doctor = useStore(selectDoctor);
  const record = useStore((st) => selectRecord(st, a.id));
  const prescriber = canPrescribe(doctor.professionalType);
  const finalised = record.rxStatus === 'finalised';
  const label = outputLabel(doctor.professionalType);

  return (
    <Screen testID="prescription-preview" header={<ScreenHeader onBack={onBack} inline title={`${label} preview`} />}>
      <View
        testID={finalised ? 'preview-finalised' : 'preview-draft'}
        style={[s.banner, finalised ? s.bannerFinal : s.bannerDraft]}
      >
        <Text style={[s.bannerText, finalised ? s.bannerTextFinal : s.bannerTextDraft]}>
          {finalised
            ? `Issued ${record.rxFinalisedAt ?? ''} · shared with the patient`.trim()
            : 'Draft preview — not issued. The patient cannot see this yet.'}
        </Text>
      </View>

      <View style={s.page}>
        <View style={s.pageHead}>
          <LogoWide width={110} height={28} />
          <View style={s.pageDoctor}>
            <Text style={s.docName}>{doctor.name}</Text>
            <Text style={s.docMeta}>{doctor.qualification}</Text>
            <Text style={s.docMeta}>Reg. {doctor.registrationNo}</Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.patientGrid}>
          <View style={s.patientCell}>
            <Text style={s.k}>Patient</Text>
            <Text style={s.v}>{a.name}</Text>
          </View>
          <View style={s.patientCell}>
            <Text style={s.k}>Age / Sex</Text>
            <Text style={s.v}>
              {a.age} / {a.gender}
            </Text>
          </View>
          <View style={s.patientCell}>
            <Text style={s.k}>Consultation</Text>
            <Text style={s.v}>{d.consultationId}</Text>
          </View>
          <View style={s.patientCell}>
            <Text style={s.k}>Date</Text>
            <Text style={s.v}>{a.dateLabel}</Text>
          </View>
        </View>

        {!!record.notes.complaint && (
          <>
            <Text style={s.h}>Presenting complaint</Text>
            <Text style={s.p}>{record.notes.complaint}</Text>
          </>
        )}
        {!!record.notes.diagnosis && (
          <>
            <Text style={s.h}>Diagnosis</Text>
            <Text style={s.p}>{record.notes.diagnosis}</Text>
          </>
        )}

        {prescriber && (
          <>
            <Text style={s.h}>Rx</Text>
            {record.medicines.length === 0 ? (
              <Text style={s.muted}>No medicines.</Text>
            ) : (
              record.medicines.map((m, i) => (
                <View key={m.id} style={s.rx}>
                  <Text style={s.rxName}>
                    {i + 1}. {m.name}
                    {m.generic ? ` (${m.generic})` : ''}
                  </Text>
                  <Text style={s.rxLine}>
                    {[m.dose, m.frequency, m.duration, m.route].filter(Boolean).join(' · ')}
                    {m.quantity ? ` · Qty ${m.quantity}` : ''}
                  </Text>
                  {!!m.instruction && <Text style={s.rxNote}>{m.instruction}</Text>}
                </View>
              ))
            )}
          </>
        )}

        <Text style={s.h}>Advice</Text>
        {record.advice.length === 0 ? (
          <Text style={s.muted}>No advice added.</Text>
        ) : (
          record.advice.map((x, i) => (
            <Text key={`${i}-${x}`} style={s.li}>
              • {x}
            </Text>
          ))
        )}

        {record.donts.length > 0 && (
          <>
            <Text style={s.h}>Seek urgent help if</Text>
            {record.donts.map((x, i) => (
              <Text key={`${i}-${x}`} style={s.li}>
                • {x}
              </Text>
            ))}
          </>
        )}

        <View style={s.rule} />
        <Text style={s.foot}>
          {doctor.name} · CoraCure teleconsultation. This document is shared only with the patient through the CoraCure app.
        </Text>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  banner: { marginHorizontal: spacing.lg, borderRadius: radius.md, padding: spacing.md },
  bannerDraft: { backgroundColor: colors.warnSoft },
  bannerFinal: { backgroundColor: colors.successSoft },
  bannerText: { ...typeStyles.caption, fontWeight: fontWeight.semibold },
  bannerTextDraft: { color: colors.warn },
  bannerTextFinal: { color: colors.surfie },
  page: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  pageHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  pageDoctor: { alignItems: 'flex-end', flexShrink: 1 },
  docName: { ...typeStyles.cardTitle, color: colors.ink, textAlign: 'right' },
  docMeta: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'right' },
  rule: { height: 1, backgroundColor: colors.surface.line, marginVertical: spacing.md },
  patientGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  patientCell: { width: '50%', paddingRight: spacing.sm },
  k: { ...typeStyles.caption, color: colors.inkFaint },
  v: { ...typeStyles.bodySmall, color: colors.ink, fontWeight: fontWeight.medium },
  h: { ...typeStyles.label, color: colors.surfie, marginTop: spacing.lg, marginBottom: 4 },
  p: { ...typeStyles.bodySmall, color: colors.ink },
  muted: { ...typeStyles.caption, color: colors.inkMuted },
  rx: { marginBottom: spacing.sm },
  rxName: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold, color: colors.ink },
  rxLine: { ...typeStyles.caption, color: colors.inkMuted },
  rxNote: { ...typeStyles.caption, color: colors.ink, fontStyle: 'italic' },
  li: { ...typeStyles.bodySmall, color: colors.ink, marginBottom: 2 },
  foot: { ...typeStyles.caption, color: colors.inkFaint },
});

export default PrescriptionPreviewScreen;
