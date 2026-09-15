import { typeStyles, fontWeight } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import {
  DOC_TYPES,
  REASON_MAX,
  REQUEST_STATUS_LABEL,
  newRequest,
  patientRequestNotice,
  docPatient,
  type DocTypeKey,
  type ReportRequest,
} from '../../data/documents';

const MINT = '#E8F8F2';
const LINE = '#E1EDE8';
const INK = '#16232B';
const MUTED = '#6B7C86';

/**
 * Request a Report (DOC-DOC-02).
 *
 * The requested item and the reason are the focus; everything else is
 * read-only provenance. Sending records who asked, what for, when and against
 * which consultation, and creates an Open request the patient can upload
 * directly against.
 *
 * There is deliberately no upload control here — the doctor requests, the
 * patient supplies.
 */
export const RequestReportScreen = ({
  onBack,
  onClose,
  onSend,
  onSaveDraft,
}: {
  onBack: () => void;
  onClose?: () => void;
  onSend: (req: ReportRequest) => void;
  onSaveDraft?: (req: ReportRequest) => void;
}) => {
  const insets = useSafeAreaInsets();
  const base = newRequest();
  const [docType, setDocType] = useState<DocTypeKey>('prescription');
  const [itemName, setItemName] = useState(base.itemName);
  const [reason, setReason] = useState(base.reason);

  const canSend = itemName.trim().length > 0 && reason.trim().length > 0;
  const compose = (status: ReportRequest['status']): ReportRequest => ({
    ...base,
    docType,
    itemName: itemName.trim(),
    reason: reason.trim(),
    status,
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <View style={s.appBar}>
          <Pressable testID="back" onPress={onBack} hitSlop={10} accessibilityLabel="Back">
            <Icon name="chevronLeft" size={22} color={INK} />
          </Pressable>
          <LogoWide width={104} height={26} />
          <Pressable testID="close" onPress={onClose ?? onBack} hitSlop={10} accessibilityLabel="Close">
            <Icon name="close" size={20} color={INK} />
          </Pressable>
        </View>
      </View>

      {/* keeps the focused field and the primary action above the keyboard */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typeStyles.body, s.h1]}>Request a Report</Text>
          <Text style={[typeStyles.body, s.sub]}>Ask the patient to upload a specific document.</Text>

          {/* patient + consultation */}
          <View style={s.strip}>
            <View style={s.avatar}>
              <Text style={[typeStyles.body, s.avatarText]}>{docPatient.initials}</Text>
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.name]}>{docPatient.name}</Text>
              <Text style={[typeStyles.body, s.meta]}>
                {docPatient.gender} • {docPatient.age} years
              </Text>
              <Text style={[typeStyles.body, s.meta]}>Patient ID: {docPatient.patientId}</Text>
            </View>
            <View style={s.stripDivider} />
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.meta]}>Consultation: {docPatient.consultationId}</Text>
              <Pressable hitSlop={6}>
                <Text style={[typeStyles.body, s.link]}>Change consultation</Text>
              </Pressable>
            </View>
          </View>

          {/* document type */}
          <Text style={[typeStyles.body, s.h2]}>What do you need?</Text>
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
                >
                  {on && (
                    <View style={s.tileCheck}>
                      <Icon name="checkCircle" size={13} color={colors.surfie} filled />
                    </View>
                  )}
                  <Icon name={t.icon} size={17} color={on ? colors.surfie : MUTED} />
                  <Text style={[typeStyles.body, [s.tileLabel, on && s.tileLabelOn]]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* item name */}
          <Text style={[typeStyles.body, s.h2]}>Report or document name</Text>
          <TextInput
            testID="item-name"
            multiline
            scrollEnabled={false}
            style={[typeStyles.input, s.input]}
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g. Previous psychiatric prescription"
            placeholderTextColor={MUTED}
          />

          {/* reason */}
          <Text style={[typeStyles.body, s.h2]}>Why is it needed?</Text>
          <View style={s.textareaWrap}>
            <TextInput
              testID="reason"
              style={[typeStyles.input, s.textarea]}
              value={reason}
              onChangeText={(t) => setReason(t.slice(0, REASON_MAX))}
              multiline
              placeholder="Explain why this document is needed."
              placeholderTextColor={MUTED}
            />
            <Text style={[typeStyles.body, s.counter]}>
              {reason.length}/{REASON_MAX}
            </Text>
          </View>

          {/* provenance — recorded with the request */}
          <Text style={[typeStyles.body, s.h2]}>Request details</Text>
          <View style={s.detailCard}>
            <View style={s.detailCol}>
              <Text style={[typeStyles.body, s.detailLabel]}>Requested by</Text>
              <Text style={[typeStyles.body, s.detailValue]}>{base.requestedBy}</Text>
              <Text style={[typeStyles.body, [s.detailLabel, s.detailSpaced]]}>Linked consultation</Text>
              <Text style={[typeStyles.body, s.detailValue]}>{base.consultationId}</Text>
            </View>
            <View style={s.detailDivider} />
            <View style={s.detailCol}>
              <Text style={[typeStyles.body, s.detailLabel]}>Request date</Text>
              <Text style={[typeStyles.body, s.detailValue]}>{base.requestedOn}</Text>
              <Text style={[typeStyles.body, [s.detailLabel, s.detailSpaced]]}>Initial status</Text>
              <View style={s.statusPill}>
                <Text style={[typeStyles.body, s.statusText]}>{REQUEST_STATUS_LABEL.open}</Text>
              </View>
            </View>
          </View>

          {/* notification preview — no diagnosis, by construction */}
          <View style={s.notice}>
            <View style={s.noticeHead}>
              <Icon name="bell" size={15} color={colors.surfie} />
              <Text style={[typeStyles.body, s.noticeTitle]}>Patient notification</Text>
            </View>
            <Text testID="notice-body" style={[typeStyles.body, s.noticeBody]}>
              {patientRequestNotice(base.requestedBy)}
            </Text>
            <Text style={[typeStyles.body, s.noticeNote]}>No diagnosis will appear in the notification.</Text>
          </View>

          <View style={s.linkRow}>
            <Icon name="link" size={15} color={colors.surfie} />
            <Text style={[typeStyles.body, s.linkText]}>
              The patient&apos;s upload will be labelled and linked to this request.
            </Text>
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable
            testID="send"
            onPress={() => onSend(compose('open'))}
            disabled={!canSend}
            style={[s.cta, !canSend && s.ctaOff]}
          >
            <Text style={[typeStyles.body, s.ctaText]}>Send Request</Text>
          </Pressable>
          <Pressable testID="draft" onPress={() => onSaveDraft?.(compose('draft'))} hitSlop={8} style={s.draftBtn}>
            <Text style={[typeStyles.body, s.draftText]}>Save as Draft</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  root: { flex: 1, backgroundColor: colors.white },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  h1: { ...typeStyles.pageTitle, color: INK, textAlign: 'center', marginTop: 2 },
  sub: { ...typeStyles.caption, color: MUTED, textAlign: 'center', marginTop: 1, marginBottom: spacing.md },
  h2: { ...typeStyles.sectionTitle, color: INK, marginTop: spacing.md, marginBottom: 6 },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F7FAF9',
    borderRadius: radius.md,
    padding: 9,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: MINT, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typeStyles.avatar, color: colors.surfie },
  name: { ...typeStyles.name, color: INK },
  meta: { ...typeStyles.caption, color: MUTED },
  stripDivider: { width: 1, height: 34, backgroundColor: LINE },
  link: { ...typeStyles.buttonSmall, color: colors.surfie, textDecorationLine: 'underline', marginTop: 2 },

  tileRow: { gap: 6, paddingRight: spacing.lg },
  tile: {
    width: 94,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: 5,
  },
  tileOn: { borderColor: colors.surfie, backgroundColor: '#F4FBF8' },
  tileCheck: { position: 'absolute', top: 4, right: 4 },
  tileLabel: { ...typeStyles.label, color: MUTED, textAlign: 'center' },
  tileLabelOn: { color: INK, fontWeight: fontWeight.semibold },

  input: { ...typeStyles.input, borderWidth: 1, borderColor: LINE, borderRadius: radius.md, paddingHorizontal: spacing.sm, minHeight: 42, paddingVertical: 8, color: INK },
  textareaWrap: { borderWidth: 1, borderColor: LINE, borderRadius: radius.md, padding: 8 },
  textarea: { ...typeStyles.input, color: INK, minHeight: 56, padding: 0, textAlignVertical: 'top' },
  counter: { ...typeStyles.number, color: MUTED, textAlign: 'right' },

  detailCard: { flexDirection: 'row', borderWidth: 1, borderColor: LINE, borderRadius: radius.md, padding: 9 },
  detailCol: { flex: 1 },
  detailDivider: { width: 1, backgroundColor: LINE, marginHorizontal: 8 },
  detailLabel: { ...typeStyles.label, color: MUTED },
  detailSpaced: { marginTop: 7 },
  detailValue: { ...typeStyles.caption, color: INK },
  statusPill: { alignSelf: 'flex-start', backgroundColor: MINT, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginTop: 1 },
  statusText: { ...typeStyles.status, color: colors.surfie },

  notice: { backgroundColor: MINT, borderRadius: radius.md, padding: 9, marginTop: spacing.md },
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noticeTitle: { ...typeStyles.cardTitle, color: INK },
  noticeBody: { ...typeStyles.caption, color: INK, marginTop: 4 },
  noticeNote: { ...typeStyles.caption, color: MUTED, marginTop: 4 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: radius.md,
    padding: 9,
    marginTop: spacing.sm,
  },
  linkText: { ...typeStyles.buttonSmall, flex: 1, color: INK },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: LINE,
    backgroundColor: colors.white,
    gap: 4,
  },
  cta: { backgroundColor: colors.surfie, borderRadius: radius.md, minHeight: 46, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  ctaOff: { opacity: 0.45 },
  ctaText: { ...typeStyles.button, color: colors.white },
  draftBtn: { alignItems: 'center', paddingVertical: 7 },
  draftText: { ...typeStyles.body, color: colors.surfie },
});

export default RequestReportScreen;
