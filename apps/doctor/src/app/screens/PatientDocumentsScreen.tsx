import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, EmptyState, Note, StatusPill } from '../../components/ui';
import { ScreenHeader, HeaderTextAction } from '../../components/ScreenHeader';
import { confirm } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { selectDoctor } from '../../state/selectors';
import { cancelReportRequest } from '../../state/actions';
import { patientById } from '../../data/patients';
import {
  docsForPatient,
  visibleDocs,
  DOC_FILTERS,
  DOC_TYPES,
  REQUEST_STATUS_LABEL,
  SOURCE_LABEL,
  type PatientDoc,
} from '../../data/documents';

/**
 * Patient Documents (DOC-DOC-01) — one patient's files, across consultations.
 *
 * Only files reachable through the assigned care relationship are listed,
 * enforced in `visibleDocs`. Every file opens in the viewer; requests the
 * doctor has made sit alongside, and an open one can be withdrawn.
 */
export const PatientDocumentsScreen = ({
  patientId,
  appointmentId,
  onBack,
  onOpenDoc,
  onViewPatient,
  onRequestReport,
}: {
  patientId: string;
  /** The consultation it was opened from — its files are grouped first. */
  appointmentId?: string;
  onBack: () => void;
  onOpenDoc: (docId: string) => void;
  onViewPatient: () => void;
  onRequestReport?: () => void;
}) => {
  const patient = patientById(patientId);
  const doctor = useStore(selectDoctor);
  const requests = useStore((st) => st.reportRequests.filter((r) => r.patientId === patientId));
  const [filter, setFilter] = useState<(typeof DOC_FILTERS)[number]['key']>('all');
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);

  const all = useMemo(() => visibleDocs(docsForPatient(patientId)), [patientId]);
  const list = useMemo(() => {
    let out = all;
    if (filter === 'requested') out = out.filter((d) => d.source === 'requested');
    else if (filter !== 'all') out = out.filter((d) => d.kind === filter);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((d) => d.title.toLowerCase().includes(q));
    return newestFirst ? out : [...out].reverse();
  }, [all, filter, query, newestFirst]);

  const groups = [
    { key: 'current', title: 'This consultation', rows: list.filter((d) => appointmentId && d.appointmentId === appointmentId) },
    {
      key: 'previous',
      title: appointmentId ? 'Earlier consultations' : 'Consultations',
      rows: list.filter((d) => d.appointmentId && d.appointmentId !== appointmentId),
    },
    { key: 'history', title: 'Medical history', rows: list.filter((d) => !d.appointmentId) },
  ].filter((g) => g.rows.length > 0);

  const sourceText = (d: PatientDoc) => (d.source === 'requested' ? `Requested by ${doctor.name}` : SOURCE_LABEL[d.source]);
  const fulfilled = requests.filter((r) => r.status === 'fulfilled' && r.fileIds.length > 0);

  return (
    <Screen
      testID="patient-documents"
      background={colors.white}
      header={
        <ScreenHeader
          onBack={onBack}
          title="Patient Documents"
          subtitle="Reports and files shared across consultations."
          right={onRequestReport ? <HeaderTextAction testID="request-report" label="Request" icon="upload" onPress={onRequestReport} /> : undefined}
        />
      }
    >
      <View style={s.body}>
        {fulfilled.map((r) => (
          <Pressable
            key={r.id}
            testID={`fulfilled-${r.id}`}
            onPress={() => onOpenDoc(r.fileIds[0])}
            style={({ pressed }) => [s.notif, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Requested document uploaded: ${r.itemName}`}
          >
            <View style={s.notifIcon}>
              <Icon name="bell" size={15} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.notifTitle}>Requested document uploaded</Text>
              <Text style={s.notifBody} numberOfLines={2}>
                {patient?.name} uploaded {r.itemName}.
              </Text>
            </View>
            <Icon name="chevronRight" size={15} color={colors.inkMuted} />
          </Pressable>
        ))}

        <View style={s.strip}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{patient?.initials}</Text>
          </View>
          <View style={s.flex}>
            <View style={s.nameRow}>
              <Text style={s.name}>{patient?.name}</Text>
              <View style={s.assignedPill}>
                <Text style={s.assignedText}>Assigned to you</Text>
              </View>
            </View>
            <Text style={s.meta}>
              {patient?.gender} • {patient?.age} years • {patientId}
            </Text>
          </View>
          <Pressable
            testID="view-patient"
            onPress={onViewPatient}
            style={({ pressed }) => [s.viewPatient, pressed && s.pressed]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`View ${patient?.name}`}
          >
            <Text style={s.viewPatientText}>View</Text>
            <Icon name="chevronRight" size={13} color={colors.surfie} />
          </Pressable>
        </View>

        <View style={s.searchRow}>
          <View style={s.search}>
            <Icon name="search" size={16} color={colors.inkMuted} />
            <TextInput
              testID="search"
              style={s.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search documents"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel="Search documents"
            />
          </View>
          <Pressable
            testID="sort-docs"
            style={s.sortBtn}
            onPress={() => setNewestFirst((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={newestFirst ? 'Newest first. Show oldest first' : 'Oldest first. Show newest first'}
          >
            <Icon name="sort" size={14} color={colors.inkMuted} />
            <Text style={s.sortText}>{newestFirst ? 'Newest' : 'Oldest'}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {DOC_FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable
                key={f.key}
                testID={`filter-${f.key}`}
                onPress={() => setFilter(f.key)}
                style={[s.chip, on && s.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.chipText, on && s.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {groups.length === 0 ? (
          <EmptyState icon="folder" title="No documents" body={all.length ? 'Nothing matches this filter or search.' : 'This patient has not shared any files yet.'} />
        ) : (
          groups.map((g) => (
            <View key={g.key}>
              <Text style={s.groupTitle}>{g.title}</Text>
              {g.rows.map((d, i) => (
                <Pressable
                  key={d.id}
                  testID={`doc-row-${d.id}`}
                  onPress={() => onOpenDoc(d.id)}
                  style={({ pressed }) => [s.row, i < g.rows.length - 1 && s.rowBorder, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${d.title}, ${d.fileType}, ${d.size}`}
                >
                  <View style={[s.fileIcon, d.fileType === 'JPG' && s.fileIconImg]}>
                    <Text style={[s.fileIconText, d.fileType === 'JPG' && s.fileIconTextImg]}>{d.fileType}</Text>
                  </View>
                  <View style={s.flex}>
                    <Text style={s.fileTitle}>{d.title}</Text>
                    <Text style={s.fileMeta}>
                      {d.size} · {d.uploadedBy === 'patient' ? 'Uploaded by patient' : 'Generated by CoraCure'} · {d.uploadedAt}
                    </Text>
                    <View style={s.tagRow}>
                      <View style={s.sourceTag}>
                        <Text style={s.sourceText}>{sourceText(d)}</Text>
                      </View>
                      {d.source === 'requested' && (
                        <View style={s.fulfilledTag}>
                          <Text style={s.fulfilledText}>Fulfilled</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View testID={`view-${d.id}`} style={s.viewBtn}>
                    <Icon name="eye" size={15} color={colors.surfie} />
                    <Text style={s.viewText}>View</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))
        )}

        {requests.length > 0 && (
          <>
            <Text style={s.groupTitle}>Your requests</Text>
            {requests.map((r) => (
              <View key={r.id} testID={`request-${r.id}`} style={s.reqRow}>
                <View style={s.flex}>
                  <Text style={s.fileTitle}>{r.itemName || DOC_TYPES.find((t) => t.key === r.docType)?.label}</Text>
                  <Text style={s.fileMeta}>
                    {DOC_TYPES.find((t) => t.key === r.docType)?.label} · {r.requestedOn} · {r.consultationId}
                  </Text>
                </View>
                <StatusPill
                  label={REQUEST_STATUS_LABEL[r.status]}
                  tone={r.status === 'fulfilled' ? 'success' : r.status === 'open' ? 'brand' : 'neutral'}
                  dot={false}
                />
                {(r.status === 'open' || r.status === 'draft') && (
                  <Pressable
                    testID={`cancel-${r.id}`}
                    onPress={() =>
                      confirm({
                        title: r.status === 'draft' ? 'Discard this draft request?' : 'Withdraw this request?',
                        message: `${r.itemName || 'The request'} will no longer be asked of the patient.`,
                        confirmLabel: r.status === 'draft' ? 'Discard' : 'Withdraw',
                        destructive: true,
                        onConfirm: () => {
                          cancelReportRequest(r.id);
                          toast.show('Request withdrawn', 'info');
                        },
                      })
                    }
                    hitSlop={8}
                    style={s.cancelBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Withdraw request for ${r.itemName}`}
                  >
                    <Icon name="close" size={15} color={colors.inkMuted} />
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}

        <Note icon="lock" style={s.noteReset}>
          Only files available through your assigned care relationship are shown.
        </Note>
        <Text testID="doc-count" style={s.footCount}>
          Showing {list.length} of {all.length} documents
        </Text>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },
  body: { paddingHorizontal: spacing.lg },
  noteReset: { marginHorizontal: 0 },

  notif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 56,
    marginBottom: spacing.sm,
  },
  notifIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.ink },
  notifBody: { ...typeStyles.caption, color: colors.inkMuted },

  strip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successSoft, borderRadius: radius.md, padding: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typeStyles.avatar, lineHeight: undefined, color: colors.surfie },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  name: { ...typeStyles.name, color: colors.ink },
  assignedPill: { backgroundColor: '#D6F0E4', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  assignedText: { ...typeStyles.caption, fontSize: 11, lineHeight: 16, color: colors.surfie },
  meta: { ...typeStyles.caption, color: colors.inkMuted },
  viewPatient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 36,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#CFE9DC',
    paddingHorizontal: spacing.sm,
  },
  viewPatientText: { ...typeStyles.buttonSmall, color: colors.surfie },

  searchRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  searchInput: { ...typeStyles.inputSingle, flex: 1, height: 42, color: colors.ink },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  sortText: { ...typeStyles.caption, color: colors.inkMuted },

  chipRow: { gap: 6, paddingVertical: spacing.sm },
  chip: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.pill, paddingHorizontal: spacing.md },
  chipOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },
  chipText: { ...typeStyles.status, color: colors.inkMuted },
  chipTextOn: { color: colors.white, fontWeight: fontWeight.semibold },

  groupTitle: { ...typeStyles.label, color: colors.surfie, marginTop: spacing.md, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, minHeight: 64 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  fileIcon: { width: 36, height: 40, borderRadius: 6, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  fileIconImg: { backgroundColor: colors.successSoft },
  fileIconText: { ...typeStyles.caption, fontSize: 11, fontWeight: fontWeight.semibold, color: colors.danger },
  fileIconTextImg: { color: colors.surfie },
  fileTitle: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold, color: colors.ink },
  fileMeta: { ...typeStyles.caption, color: colors.inkMuted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  sourceTag: { backgroundColor: '#EEF3FB', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  sourceText: { ...typeStyles.caption, fontSize: 11, lineHeight: 16, color: '#3F5E8C' },
  fulfilledTag: { backgroundColor: '#D6F0E4', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  fulfilledText: { ...typeStyles.caption, fontSize: 11, lineHeight: 16, color: colors.surfie },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 36, paddingHorizontal: 4 },
  viewText: { ...typeStyles.buttonSmall, color: colors.surfie },

  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  cancelBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  footCount: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.sm },
});

export default PatientDocumentsScreen;
