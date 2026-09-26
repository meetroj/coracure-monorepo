import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, StatusPill } from '../../components/ui';
import { ScreenHeader, HeaderAction } from '../../components/ScreenHeader';
import { NoteInput } from '../../components/clinical';
import { useStore } from '../../state/store';
import { JOIN_WINDOW_MIN, joinStateFor, selectRecord } from '../../state/selectors';
import { setAllergies } from '../../state/actions';
import {
  detailFor,
  minutesUntil,
  modeLabel,
  previousConsultations,
  type Appointment,
  type ConsultMode,
} from '../../data/doctor';
import { docsForPatient, visibleDocs, type PatientDoc } from '../../data/documents';
import { minutesToClock } from '../../data/calendar';

/**
 * Appointment Details — everything the doctor needs before (or after) the
 * call, in one scroll: who, what they reported, what they shared, what they
 * consented to, and what happened last time.
 */

const SECTION_GAP = spacing.xl;
const HISTORY_MAX = 1000;

const CONSENT_LABEL: Record<ConsultMode, string> = {
  video: 'Consent for Video Consultation',
  audio: 'Consent for Audio Consultation',
  inPerson: 'Consent for In-person Consultation',
};

const STATE_LABEL: Record<Appointment['state'], { label: string; tone: 'success' | 'neutral' | 'danger' | 'warn' | 'brand' }> = {
  confirmed: { label: 'Confirmed', tone: 'success' },
  upcoming: { label: 'Upcoming', tone: 'brand' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  noShow: { label: 'No-show', tone: 'warn' },
};

/** Abstract preview: a clinical document is never rendered as a real image. */
const DocTile = ({ doc, onPress }: { doc: PatientDoc; onPress: () => void }) => (
  <Pressable
    testID={`doc-${doc.id}`}
    style={({ pressed }) => [s.doc, pressed && s.pressed]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`Open ${doc.title}`}
  >
    <View style={s.docThumb}>
      {[0.9, 0.7, 0.8, 0.5].map((w, i) => (
        <View key={i} style={[s.docLine, { width: `${w * 100}%` }]} />
      ))}
      <View style={[s.docKind, doc.fileType === 'PDF' && s.docKindPdf]}>
        <Text style={[s.docKindText, doc.fileType === 'PDF' && s.docKindTextPdf]}>{doc.fileType}</Text>
      </View>
    </View>
    <Text style={s.docTitle} numberOfLines={2}>
      {doc.title}
    </Text>
    <Text style={s.docMeta} numberOfLines={1}>
      {doc.uploadedAt}
    </Text>
  </Pressable>
);

export const AppointmentDetailsScreen = ({
  appointment,
  onBack,
  onJoin,
  onMessage,
  onOpenDoc,
  onViewAllDocs,
  onRequestDoc,
  onOpenCase,
}: {
  appointment: Appointment;
  onBack: () => void;
  onJoin: (appointmentId: string) => void;
  /** Opens this patient's chat thread. */
  onMessage: () => void;
  onOpenDoc: (docId: string) => void;
  onViewAllDocs: () => void;
  /** Opens Request a Report for this consultation — the doctor asks, the patient supplies. */
  onRequestDoc: () => void;
  /** Opens the consultation record for this or an earlier appointment. */
  onOpenCase: (appointmentId: string) => void;
}) => {
  const a = appointment;
  const d = detailFor(a);
  const record = useStore((st) => selectRecord(st, a.id));
  const docs = visibleDocs(docsForPatient(a.patientId));
  const shown = docs.slice(0, 4);
  const past = previousConsultations(a).slice(0, 3);
  const join = joinStateFor(a);
  const state = STATE_LABEL[a.state];

  // a state that cannot be acted on carries no handler at all
  const cta: { label: string; sub: string; enabled: boolean; onPress?: () => void } = (() => {
    if (join.kind === 'open') {
      const until = minutesUntil(a);
      return {
        label: 'Join Consultation',
        sub: until > 0 ? `Starts in ${until} min · ${modeLabel[a.mode]}` : `Started ${-until} min ago · ${modeLabel[a.mode]}`,
        enabled: true,
        onPress: () => onJoin(a.id),
      };
    }
    if (join.kind === 'later') {
      return {
        label: `Opens at ${minutesToClock(a.minutes - JOIN_WINDOW_MIN).replace(/^0/, '')}`,
        sub: `Starts ${a.time} · joining opens ${JOIN_WINDOW_MIN} min before`,
        enabled: false,
      };
    }
    if (join.kind === 'upcoming') {
      return {
        label: `Starts ${a.dayLabel}`,
        sub: `${a.dateLabel} · ${a.time} · ${modeLabel[a.mode]}`,
        enabled: false,
      };
    }
    if (a.state === 'cancelled') {
      return { label: 'Appointment cancelled', sub: 'Refunded to the patient', enabled: false };
    }
    return {
      label: 'Open consultation record',
      sub: a.state === 'noShow' ? 'Patient did not join' : 'Notes, prescription and summary',
      enabled: true,
      onPress: () => onOpenCase(a.id),
    };
  })();

  return (
    <Screen
      testID="appointment-details"
      header={
        <ScreenHeader
          onBack={onBack}
          right={<HeaderAction testID="message-patient" icon="message" label={`Message ${a.name}`} onPress={onMessage} />}
        />
      }
      footer={
        <Pressable
          testID="join-consultation"
          onPress={cta.onPress}
          disabled={!cta.enabled}
          style={({ pressed }) => [s.footCta, !cta.enabled && s.footCtaOff, pressed && cta.enabled && s.pressed]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !cta.enabled }}
          accessibilityLabel={`${cta.label}. ${cta.sub}`}
        >
          <View style={s.footCtaIcon}>
            <Icon
              name={join.kind === 'open' ? 'video' : a.state === 'completed' || a.state === 'noShow' ? 'document' : 'clock'}
              size={19}
              color={colors.surfie}
            />
          </View>
          <View style={s.footCtaCopy}>
            <Text style={s.footCtaText} numberOfLines={1}>
              {cta.label}
            </Text>
            <Text style={s.footCtaSub} numberOfLines={1}>
              {cta.sub}
            </Text>
          </View>
          {cta.enabled && (
            <View style={s.footCtaArrow}>
              <Icon name="arrowRight" size={18} color={colors.ink} />
            </View>
          )}
        </Pressable>
      }
    >
      {/* ------------------------------ patient header --------------------------- */}
      <View style={s.patient}>
        <View style={s.patientTop}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{a.initials}</Text>
          </View>
          <View style={s.flex}>
            <Text style={s.name}>{a.name}</Text>
            <Text style={s.sub}>
              {a.age} years · {a.gender}
            </Text>
            <Text style={s.patientId} selectable>
              {d.patientId}
            </Text>
          </View>
          <View style={s.idCard}>
            <Text style={s.idLabel}>Appointment ID</Text>
            {/* selectable: long-press copies it, without a clipboard dependency */}
            <Text testID="appointment-ref" style={s.idValue} numberOfLines={1} selectable>
              {d.appointmentRef}
            </Text>
          </View>
        </View>

        <View style={s.patientFoot}>
          <View style={s.footItem}>
            <Icon name="calendar" size={15} color={colors.surfie} />
            <Text style={s.footText} numberOfLines={1}>
              {d.dateLabel}
            </Text>
          </View>
          <View style={s.footRule} />
          <View style={s.footItem}>
            <Icon name="clock" size={15} color={colors.surfie} />
            <Text style={s.footText} numberOfLines={1}>
              {a.time}
            </Text>
          </View>
          <View style={s.footStatus}>
            <StatusPill testID="appointment-state" label={state.label} tone={state.tone} />
          </View>
        </View>
      </View>

      {/* ---------------------------- presenting complaint ------------------------ */}
      <Text style={[s.sectionTitle, s.sectionSolo]}>Presenting Complaint</Text>
      <View style={s.quote}>
        <View style={s.quoteMark}>
          <Text style={s.quoteGlyph}>&rdquo;</Text>
        </View>
        <View style={s.flex}>
          <Text style={s.quoteText}>{d.concernDetail}</Text>
          <Text style={s.quoteSource}>Patient reported at booking</Text>
        </View>
      </View>

      {/* ------------------------------ intake summary --------------------------- */}
      <Text style={[s.sectionTitle, s.sectionSolo]}>Intake Summary</Text>
      <View style={[s.card, s.intakeGrid]}>
        {d.intake.map((row) => (
          <View key={row.key} style={s.intakeCell}>
            <View style={s.intakeCellHead}>
              <View style={s.intakeIcon}>
                <Icon name={row.icon} size={14} color={colors.surfie} />
              </View>
              <Text style={s.intakeLabel} numberOfLines={1}>
                {row.label}
              </Text>
            </View>
            <Text style={s.intakeValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* ---------------------------- medical history ----------------------------- */}
      <Text style={[s.sectionTitle, s.sectionSolo]}>Medical History &amp; Allergies</Text>
      <View style={s.historyWrap}>
        <NoteInput
          testID="medical-history"
          value={record.allergies}
          onChangeText={(v) => setAllergies(a.id, v)}
          placeholder="Known conditions and allergies — e.g. hypothyroidism, penicillin allergy…"
          max={HISTORY_MAX}
          minHeight={64}
          accessibilityLabel="Medical history and allergies"
        />
        <Text style={s.historyHint}>Saved to this consultation and shown on the prescription.</Text>
      </View>

      {/* ---------------------------- uploaded documents ------------------------- */}
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Uploaded Documents</Text>
        {docs.length > 0 && (
          <Pressable
            testID="view-all-docs"
            onPress={onViewAllDocs}
            hitSlop={10}
            style={s.link}
            accessibilityRole="button"
            accessibilityLabel={`View all ${docs.length} documents`}
          >
            <Text style={s.linkText}>View all {docs.length}</Text>
            <Icon name="chevronRight" size={14} color={colors.surfie} />
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.docRow}>
        {shown.map((doc) => (
          <DocTile key={doc.id} doc={doc} onPress={() => onOpenDoc(doc.id)} />
        ))}
        <Pressable
          testID="request-document"
          style={({ pressed }) => [s.doc, pressed && s.pressed]}
          onPress={onRequestDoc}
          accessibilityRole="button"
          accessibilityLabel="Request a document from the patient"
        >
          <View style={[s.docThumb, s.docThumbRequest]}>
            <Icon name="upload" size={22} color={colors.surfie} />
          </View>
          <Text style={s.docTitle} numberOfLines={2}>
            Request document
          </Text>
          <Text style={s.docMeta} numberOfLines={1}>
            Ask the patient
          </Text>
        </Pressable>
      </ScrollView>

      {/* --------------------------------- consent ------------------------------- */}
      <Text style={[s.sectionTitle, s.sectionSolo]}>Consent</Text>
      <View style={[s.card, s.consent]}>
        <View style={s.consentShield}>
          <Icon name="shieldCheck" size={24} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <Text style={s.consentText}>{CONSENT_LABEL[a.mode]}</Text>
          <Text style={s.consentMeta}>
            Accepted on {d.dateLabel}, {d.consent.time} · {d.consent.version}
          </Text>
        </View>
        <StatusPill label="Accepted" tone="success" dot={false} />
      </View>

      {/* ---------------------------- past consultations ------------------------- */}
      <Text style={[s.sectionTitle, s.sectionSolo]}>Past Consultations</Text>
      {past.length === 0 ? (
        <View style={[s.card, s.pastEmpty]}>
          <Text style={s.pastEmptyText}>First consultation with this patient.</Text>
        </View>
      ) : (
        <View style={s.card}>
          {past.map((p, i) => (
            <Pressable
              key={p.id}
              testID={`past-${p.id}`}
              onPress={() => onOpenCase(p.id)}
              style={({ pressed }) => [s.past, i < past.length - 1 && s.pastRule, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Consultation on ${p.dateLabel}, ${p.concern}`}
            >
              <View style={s.pastIcon}>
                <Icon name={p.mode === 'audio' ? 'phone' : p.mode === 'inPerson' ? 'inPerson' : 'video'} size={16} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={s.pastMeta}>
                  {p.dateLabel} · {p.time}
                </Text>
                <Text style={s.pastTitle}>{modeLabel[p.mode]}</Text>
                <Text style={s.pastNote} numberOfLines={1}>
                  {p.concern}
                </Text>
              </View>
              <Icon name="chevronRight" size={17} color={colors.inkFaint} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },

  patient: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface.mint,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  patientTop: { flexDirection: 'row', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typeStyles.avatar, fontSize: 19, lineHeight: undefined, color: colors.surfie },
  name: { ...typeStyles.name, color: colors.ink },
  sub: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  patientId: { ...typeStyles.bodySmall, color: colors.surfie, marginTop: 2 },
  idCard: {
    alignItems: 'flex-end',
    maxWidth: 150,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  idLabel: { ...typeStyles.caption, fontSize: 11, lineHeight: 14, color: colors.inkFaint },
  idValue: { ...typeStyles.caption, color: colors.ink, flexShrink: 1 },
  patientFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  footItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  footStatus: { flexShrink: 0, paddingLeft: spacing.sm },
  footRule: { width: 1, height: 16, backgroundColor: colors.surface.line, marginHorizontal: spacing.sm },
  footText: { ...typeStyles.bodySmall, color: colors.ink },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: SECTION_GAP,
    marginBottom: spacing.sm,
  },
  sectionSolo: { marginHorizontal: spacing.lg, marginTop: SECTION_GAP, marginBottom: spacing.sm },
  sectionTitle: { ...typeStyles.sectionTitle, fontSize: 17, lineHeight: 23, color: colors.ink },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  linkText: { ...typeStyles.button, color: colors.surfie },

  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },

  quote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  quoteMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteGlyph: { ...typeStyles.pageTitle, fontSize: 28, lineHeight: 30, color: colors.surfie, marginTop: 8 },
  quoteText: { ...typeStyles.body, color: colors.ink },
  quoteSource: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 4 },

  intakeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.md },
  intakeCell: { flexBasis: '45%', flexGrow: 1, minWidth: 0, gap: 3 },
  intakeCellHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  intakeIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  intakeLabel: { ...typeStyles.caption, flexShrink: 1, color: colors.inkMuted },
  intakeValue: { ...typeStyles.bodySmall, color: colors.ink, marginLeft: 24 + spacing.sm },

  historyWrap: { marginHorizontal: spacing.lg },
  historyHint: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 4 },

  docRow: { paddingHorizontal: spacing.lg, gap: spacing.md },
  doc: { width: 120 },
  docThumb: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: 5,
    justifyContent: 'center',
  },
  docThumbRequest: {
    borderStyle: 'dashed',
    borderColor: colors.surfie,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
  },
  docLine: { height: 4, borderRadius: 2, backgroundColor: colors.surface.line },
  docKind: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 5,
    borderRadius: 4,
    backgroundColor: colors.surface.selected,
  },
  docKindPdf: { backgroundColor: colors.dangerSoft },
  docKindText: { ...typeStyles.caption, fontSize: 11, lineHeight: 15, color: colors.surfie, fontWeight: fontWeight.semibold },
  docKindTextPdf: { color: colors.danger },
  docTitle: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.ink, marginTop: spacing.sm },
  docMeta: { ...typeStyles.caption, fontSize: 11, color: colors.inkFaint, marginTop: 1 },

  consent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  consentShield: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  consentText: { ...typeStyles.bodySmall, fontWeight: fontWeight.semibold, color: colors.ink },
  consentMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },

  past: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 64 },
  pastRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  pastIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastMeta: { ...typeStyles.caption, color: colors.inkMuted },
  pastTitle: { ...typeStyles.cardTitle, fontSize: 14, color: colors.ink, marginTop: 1 },
  pastNote: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  pastEmpty: { padding: spacing.md },
  pastEmptyText: { ...typeStyles.bodySmall, color: colors.inkMuted },

  footCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfie,
  },
  footCtaOff: { backgroundColor: colors.inkMuted },
  footCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footCtaCopy: { flex: 1, alignItems: 'center' },
  footCtaArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.paris,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footCtaText: { ...typeStyles.button, color: colors.white },
  footCtaSub: { ...typeStyles.caption, color: 'rgba(255,255,255,0.86)', marginTop: 1 },
});

export default AppointmentDetailsScreen;
