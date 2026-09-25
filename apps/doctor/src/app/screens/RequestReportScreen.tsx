import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextField, FieldLabel } from '../../components/form';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { selectDoctor } from '../../state/selectors';
import { addReportRequest } from '../../state/actions';
import { patientById } from '../../data/patients';
import { fmtDate, dayOffset } from '../../data/calendar';
import type { Appointment } from '../../data/doctor';
import {
  DOC_TYPES,
  REASON_MAX,
  REQUEST_STATUS_LABEL,
  patientRequestNotice,
  type DocTypeKey,
  type ReportRequest,
} from '../../data/documents';

/**
 * Request a Report (DOC-DOC-02) — for the consultation it was opened from.
 *
 * The requested item and the reason are the focus; everything else is
 * read-only provenance. Sending records who asked, what for, when and against
 * which consultation, and creates an Open request the patient can upload
 * directly against. There is no upload control here — the doctor requests,
 * the patient supplies.
 */
export const RequestReportScreen = ({
  appointment,
  onBack,
  onDone,
  onDirtyChange,
}: {
  appointment: Appointment;
  onBack: () => void;
  /** Called once the request is stored, as open or as a draft. */
  onDone: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) => {
  const doctor = useStore(selectDoctor);
  const patient = patientById(appointment.patientId);
  const [docType, setDocType] = useState<DocTypeKey>('prescription');
  const [itemName, setItemName] = useState('');
  const [reason, setReason] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const dirty = itemName.trim().length > 0 || reason.trim().length > 0;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const itemError = !itemName.trim() ? 'Name the report or document you need.' : undefined;
  const reasonError = !reason.trim() ? 'Explain why this document is needed.' : undefined;

  const store = (status: ReportRequest['status']) => {
    addReportRequest({
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      docType,
      itemName: itemName.trim(),
      reason: reason.trim(),
      requestedBy: doctor.name,
      requestedOn: fmtDate(dayOffset(0)),
      consultationId: appointment.consultationId,
      status,
      fileIds: [],
    });
  };

  const send = () => {
    if (itemError || reasonError) {
      setShowErrors(true);
      return;
    }
    store('open');
    toast.show(`Request sent to ${patient?.name.split(' ')[0] ?? 'the patient'}`);
    onDone();
  };

  const saveDraft = () => {
    if (itemError) {
      setShowErrors(true);
      return;
    }
    store('draft');
    toast.show('Request saved as draft', 'info');
    onDone();
  };

  return (
    <Screen
      testID="request-report"
      background={colors.white}
      header={<ScreenHeader onBack={onBack} title="Request a Report" subtitle="Ask the patient to upload a specific document." />}
      footer={
        <View style={s.footer}>
          <Button testID="send" label="Send request" onPress={send} />
          <Button testID="draft" label="Save as draft" variant="ghost" size="sm" onPress={saveDraft} />
        </View>
      }
    >
      <View style={s.body}>
        {/* patient + consultation — fixed by where the request was raised */}
        <View style={s.strip}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{patient?.initials}</Text>
          </View>
          <View style={s.flex}>
            <Text style={s.name}>{patient?.name}</Text>
            <Text style={s.meta}>
              {patient?.gender} • {patient?.age} years • {appointment.patientId}
            </Text>
          </View>
          <View style={s.stripDivider} />
          <View style={s.consult}>
            <Text style={s.metaLabel}>Consultation</Text>
            <Text style={s.metaStrong}>{appointment.consultationId}</Text>
            <Text style={s.meta}>{appointment.dateLabel}</Text>
          </View>
        </View>

        <FieldLabel required>What do you need?</FieldLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tileRow}>
          {DOC_TYPES.map((t) => {
            const on = docType === t.key;
            return (
              <Pressable
                key={t.key}
                testID={`type-${t.key}`}
                onPress={() => setDocType(t.key)}
                style={[s.tile, on && s.tileOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t.label}
              >
                {on && (
                  <View style={s.tileCheck}>
                    <Icon name="checkCircle" size={13} color={colors.surfie} filled />
                  </View>
                )}
                <Icon name={t.icon} size={18} color={on ? colors.surfie : colors.inkMuted} />
                <Text style={[s.tileLabel, on && s.tileLabelOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <TextField
          testID="item-name"
          label="Report or document name"
          required
          value={itemName}
          onChangeText={setItemName}
          placeholder="e.g. Previous psychiatric prescription"
          maxLength={120}
          error={showErrors ? itemError : undefined}
        />
        <TextField
          testID="reason"
          label="Why is it needed?"
          required
          multiline
          value={reason}
          onChangeText={(t) => setReason(t.slice(0, REASON_MAX))}
          placeholder="Explain why this document is needed."
          helper={`${reason.length}/${REASON_MAX} · Kept with the request; not sent to the patient.`}
          error={showErrors ? reasonError : undefined}
        />

        {/* provenance — recorded with the request */}
        <Text style={s.h2}>Request details</Text>
        <View style={s.detailCard}>
          <View style={s.detailCol}>
            <Text style={s.detailLabel}>Requested by</Text>
            <Text style={s.detailValue}>{doctor.name}</Text>
            <Text style={[s.detailLabel, s.detailSpaced]}>Linked consultation</Text>
            <Text style={s.detailValue}>{appointment.consultationId}</Text>
          </View>
          <View style={s.detailDivider} />
          <View style={s.detailCol}>
            <Text style={s.detailLabel}>Request date</Text>
            <Text style={s.detailValue}>{fmtDate(dayOffset(0))}</Text>
            <Text style={[s.detailLabel, s.detailSpaced]}>Status once sent</Text>
            <View style={s.statusPill}>
              <Text style={s.statusText}>{REQUEST_STATUS_LABEL.open}</Text>
            </View>
          </View>
        </View>

        {/* notification preview — no diagnosis, by construction */}
        <View style={s.notice}>
          <View style={s.noticeHead}>
            <Icon name="bell" size={15} color={colors.surfie} />
            <Text style={s.noticeTitle}>What the patient is told</Text>
          </View>
          <Text testID="notice-body" style={s.noticeBody}>
            {patientRequestNotice(doctor.name)}
          </Text>
          <Text style={s.noticeNote}>The notification never includes a diagnosis or your reason.</Text>
        </View>

        <View style={s.linkRow}>
          <Icon name="link" size={15} color={colors.surfie} />
          <Text style={s.linkText}>The patient’s upload is labelled and linked to this request.</Text>
        </View>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: spacing.lg },
  footer: { gap: 2 },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typeStyles.avatar, lineHeight: undefined, color: colors.surfie },
  name: { ...typeStyles.name, color: colors.ink },
  meta: { ...typeStyles.caption, color: colors.inkMuted },
  metaLabel: { ...typeStyles.caption, color: colors.inkMuted },
  metaStrong: { ...typeStyles.label, color: colors.ink },
  stripDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.surface.line },
  consult: { flexShrink: 0 },

  tileRow: { gap: spacing.sm, paddingBottom: spacing.lg, paddingTop: 2 },
  tile: {
    width: 100,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
  },
  tileOn: { borderColor: colors.surfie, backgroundColor: colors.surface.mintSoft },
  tileCheck: { position: 'absolute', top: 5, right: 5 },
  tileLabel: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'center' },
  tileLabelOn: { color: colors.ink, fontWeight: fontWeight.semibold },

  h2: { ...typeStyles.label, color: colors.ink, marginTop: spacing.sm, marginBottom: 6 },
  detailCard: { flexDirection: 'row', borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, padding: spacing.md },
  detailCol: { flex: 1 },
  detailDivider: { width: 1, backgroundColor: colors.surface.line, marginHorizontal: spacing.sm },
  detailLabel: { ...typeStyles.caption, color: colors.inkMuted },
  detailSpaced: { marginTop: spacing.sm },
  detailValue: { ...typeStyles.bodySmall, color: colors.ink },
  statusPill: { alignSelf: 'flex-start', backgroundColor: colors.surface.selected, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  statusText: { ...typeStyles.status, color: colors.surfie },

  notice: { backgroundColor: colors.surface.mint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeTitle: { ...typeStyles.label, color: colors.ink },
  noticeBody: { ...typeStyles.bodySmall, color: colors.ink, marginTop: 6 },
  noticeNote: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 6 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  linkText: { ...typeStyles.caption, flex: 1, color: colors.ink },
});

export default RequestReportScreen;
