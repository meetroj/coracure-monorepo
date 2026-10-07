import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Linking } from 'react-native';

import { messageFor } from '@coracure/api/errors';

import { BrandLockup } from '../../components/BrandLockup';
import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Screen, Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { selectDoctor, selectRecord } from '../../state/selectors';
import { detailFor, type Appointment } from '../../data/doctor';
import { canPrescribe, outputLabel } from '../../data/clinical';
import { UUID, useClinicalRecordSync } from '../../data/clinicalRecord';
import { fetchFileDownloadUrl, useIssuedPrescription } from '../../data/patientFiles';
import { useSignatureUrl } from '../../data/profile';

/**
 * The patient's copy of the prescription or advice plan, laid out the way the
 * PDF reads. A draft is marked as a draft on every view, so a preview can
 * never be mistaken for the issued document.
 *
 * Once the record is finalised the server renders the real PDF and stores it
 * as the patient's `prescription_pdf` file; "Open issued PDF" opens that, by
 * a link minted per tap. The layout below stays as the draft view.
 */
export const PrescriptionPreviewScreen = ({ appointment, onBack }: { appointment: Appointment; onBack: () => void }) => {
  const a = appointment;
  const d = detailFor(a);
  const doctor = useStore(selectDoctor);
  useClinicalRecordSync(a.id);
  const record = useStore((st) => selectRecord(st, a.id));
  const prescriber = canPrescribe(doctor.professionalType);
  const finalised = record.rxStatus === 'finalised';
  const label = outputLabel(doctor.professionalType);
  const real = UUID.test(a.id);
  const issued = useIssuedPrescription(a.patientId, a.id, real && finalised);
  const pdf = issued.data?.[0];
  // Issued means the server record is finalised (the case-summary submit), not the local Rx checkpoint.
  const shared = record.summaryStatus === 'submitted' || !!pdf;
  const [opening, setOpening] = useState(false);
  // the server's copy; the one picked during sign-up this session until it answers
  const signature = useSignatureUrl(prescriber);
  const signatureUrl = signature.data ?? doctor.signatureUrl;

  const openPdf = async () => {
    if (!pdf || opening) return;
    setOpening(true);
    try {
      const { url } = await fetchFileDownloadUrl(pdf.id);
      await Linking.openURL(url);
    } catch (e) {
      toast.show(messageFor(e), 'error');
    } finally {
      setOpening(false);
    }
  };

  return (
    <Screen testID="prescription-preview" header={<ScreenHeader onBack={onBack} inline title={`${label} preview`} />}>
      <View
        testID={finalised ? 'preview-finalised' : 'preview-draft'}
        style={[s.banner, finalised ? s.bannerFinal : s.bannerDraft]}
      >
        <Text style={[s.bannerText, finalised ? s.bannerTextFinal : s.bannerTextDraft]}>
          {finalised
            ? shared
              ? 'Issued · shared with the patient'
              : 'Finalised — issued to the patient when you submit the case summary. The patient cannot see this yet.'
            : 'Draft preview — not issued. The patient cannot see this yet.'}
        </Text>
      </View>

      {real && finalised && (
        <View style={s.issued}>
          {pdf ? (
            <Button testID="open-issued-pdf" label="Open issued PDF" icon="download" variant="secondary" loading={opening} onPress={openPdf} />
          ) : (
            <Text testID="issued-pdf-missing" style={s.muted}>
              {issued.showSkeleton
                ? 'Looking for the issued PDF…'
                : issued.error
                  ? 'Could not check for the issued PDF.'
                  : 'The PDF is issued when the case summary is submitted.'}
            </Text>
          )}
        </View>
      )}

      <View style={s.page}>
        <View style={s.pageHead}>
          <BrandLockup height={28} accessibilityLabel="Coracure" />
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
            <Text style={s.h}>Chief Complaint</Text>
            <Text style={s.p}>{record.notes.complaint}</Text>
          </>
        )}
        {prescriber && !!record.notes.diagnosis && (
          <>
            <Text style={s.h}>Provisional Diagnosis</Text>
            <Text style={s.p}>{record.notes.diagnosis}</Text>
          </>
        )}
        {prescriber && !!record.allergies && (
          <>
            <Text style={s.h}>History of Allergies</Text>
            <Text style={s.p}>{record.allergies}</Text>
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

        <Text style={s.h}>{prescriber ? 'Advice & Instructions' : 'Recommendations / Interventions'}</Text>
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
            <Text style={s.h}>{prescriber ? 'Warning Signs' : 'Precautions & Warning Signs'}</Text>
            {record.donts.map((x, i) => (
              <Text key={`${i}-${x}`} style={s.li}>
                • {x}
              </Text>
            ))}
          </>
        )}

        <View style={s.rule} />
        {prescriber && (
          <View style={s.signatureBlock}>
            {signatureUrl ? (
              <Image source={{ uri: signatureUrl }} style={s.signatureImage} resizeMode="contain" />
            ) : (
              <Text style={s.muted}>Signature not yet uploaded.</Text>
            )}
            <Text style={s.signatureCaption}>Approved doctor signature</Text>
          </View>
        )}
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
  issued: { marginHorizontal: spacing.lg, marginTop: spacing.md },
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
  signatureBlock: { alignItems: 'flex-end', marginBottom: spacing.md },
  signatureImage: { width: 140, height: 56 },
  signatureCaption: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 2 },
  foot: { ...typeStyles.caption, color: colors.inkFaint },
});

export default PrescriptionPreviewScreen;
