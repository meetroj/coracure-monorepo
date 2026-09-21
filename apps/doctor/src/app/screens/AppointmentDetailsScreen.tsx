import { typeStyles } from '../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/ui';
import {
  detailFor,
  modeLabel,
  type Appointment,
  type UploadedDoc,
} from '../../data/doctor';

/**
 * Appointment Details — opened from a row on the Appointments screen.
 *
 * Everything the doctor needs before the call, in one scroll: who, what they
 * reported, what they uploaded, what they consented to, and what happened last
 * time. Identifiers and payment sit in a collapsed row at the bottom because
 * they matter for disputes, not for the consultation.
 *
 * Compact by design — 14–16px body, 14px radii, hairline borders, no shadows.
 */

const SECTION_GAP = spacing.xl;

/* ------------------------------ doc thumbnail ----------------------------- */

/** Abstract preview: a clinical document is never rendered as a real image. */
const DocTile = ({ doc, onPress }: { doc: UploadedDoc; onPress: () => void }) => (
  <Pressable style={s.doc} onPress={onPress} accessibilityRole="button" accessibilityLabel={doc.title}>
    <View style={s.docThumb}>
      {doc.lines.map((w, i) => (
        <View key={i} style={[s.docLine, { width: `${w * 100}%` }]} />
      ))}
    </View>
    {/* Title on line one, upload date beneath it. */}
    <View style={s.docCaption}>
      <Text style={[typeStyles.body, s.docTitle]} numberOfLines={1}>
        {doc.title}
      </Text>
      <Text style={[typeStyles.body, s.docMeta]} numberOfLines={1}>
        {doc.uploaded}
      </Text>
    </View>
  </Pressable>
);

/**
 * Asks the patient for a document that is not here yet. Sized like a `DocTile`
 * so it sits in the same row, outlined rather than filled so it never reads as
 * a document that already exists.
 */
const RequestDocTile = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    testID="request-document"
    style={s.doc}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Request a document from the patient"
  >
    <View style={[s.docThumb, s.docThumbRequest]}>
      <Icon name="upload" size={22} color={colors.surfie} />
    </View>
    <View style={s.docCaption}>
      <Text style={[typeStyles.body, s.docTitle]} numberOfLines={1}>
        Request document
      </Text>
      <Text style={[typeStyles.body, s.docMeta]} numberOfLines={1}>
        Ask the patient
      </Text>
    </View>
  </Pressable>
);

/* --------------------------------- screen --------------------------------- */

export const AppointmentDetailsScreen = ({
  appointment,
  onBack,
  onJoin = () => undefined,
  onMessage = () => undefined,
  onMore = () => undefined,
  onOpenDoc = () => undefined,
  onRequestDoc = () => undefined,
  onViewHistory = () => undefined,
  onCopyId,
}: {
  appointment: Appointment;
  onBack: () => void;
  onJoin?: (a: Appointment) => void;
  onMessage?: () => void;
  onMore?: () => void;
  onOpenDoc?: (id: string) => void;
  /** Opens Request a Report (DOC-DOC-02) — the doctor asks, the patient supplies. */
  onRequestDoc?: () => void;
  onViewHistory?: () => void;
  /** Copies the appointment reference. Needs a clipboard binding to do anything. */
  onCopyId?: (id: string) => void;
}) => {
  const d = detailFor(appointment);
  const insets = useSafeAreaInsets();
  // What the doctor notes down for this patient's known conditions — not
  // part of the intake, since the patient never reported it themselves.
  const [medicalHistory, setMedicalHistory] = useState('');
  const joinable = appointment.state === 'confirmed';

  const stateLabel =
    appointment.state === 'confirmed'
      ? 'Confirmed'
      : appointment.state === 'completed'
        ? 'Completed'
        : appointment.state === 'cancelled'
          ? 'Cancelled'
          : appointment.state === 'noShow'
            ? 'No-show'
            : 'Upcoming';

  return (
    <View style={s.root}>
      <Screen contentStyle={s.content}>
        {/* --------------------------------- top bar ------------------------------- */}
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
            <LogoWide width={104} height={26} />
          </View>

          <View style={s.barRight}>
            <Pressable
              onPress={onMessage}
              hitSlop={8}
              style={s.barBtn}
              accessibilityRole="button"
              accessibilityLabel="Message patient"
            >
              <Icon name="message" size={18} color={colors.ink} />
            </Pressable>
            <Pressable
              onPress={onMore}
              hitSlop={8}
              style={s.barBtn}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Icon name="more" size={18} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        {/* ------------------------------ patient header --------------------------- */}
        <View style={s.patient}>
          <View style={s.patientTop}>
            <View style={s.avatar}>
              <Text style={[typeStyles.body, s.avatarText]}>{appointment.initials}</Text>
            </View>

            <View style={s.flex}>
              <Text style={[typeStyles.body, s.name]}>
                {appointment.name}
              </Text>
              <Text style={[typeStyles.body, s.sub]}>
                {appointment.age} years · {appointment.gender}
              </Text>
              {/* Bare ID, no label — the green marks it as the patient reference. */}
              <Text style={[typeStyles.body, s.patientId]}>{d.patientId}</Text>
            </View>

            {/* White card so the appointment reference reads as its own object. */}
            <View style={s.idCard}>
              <Text style={[typeStyles.body, s.idLabel]}>Appointment ID</Text>
              <View style={s.idValueRow}>
                <Text style={[typeStyles.body, s.idValue]} numberOfLines={1}>
                  {d.appointmentId}
                </Text>
                <Pressable
                  testID="copy-appointment-id"
                  onPress={() => onCopyId?.(d.appointmentId)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Copy appointment ID"
                >
                  <Icon name="copy" size={14} color={colors.surfie} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Date, time and status all sit on the footer line together. */}
          <View style={s.patientFoot}>
            <View style={s.footItem}>
              <Icon name="calendar" size={15} color={colors.surfie} />
              <Text style={[typeStyles.body, s.footText]} numberOfLines={1}>{d.dateLabel}</Text>
            </View>
            <View style={s.footRule} />
            <View style={s.footItem}>
              <Icon name="clock" size={15} color={colors.surfie} />
              <Text style={[typeStyles.body, s.footText]} numberOfLines={1}>{appointment.time}</Text>
            </View>
            <View style={s.footRule} />
            <View style={s.footStatus}>
              <View style={s.statusPill}>
                <View style={s.statusDot} />
                <Text style={[typeStyles.body, s.statusText]} numberOfLines={1}>{stateLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ---------------------------- presenting complaint ------------------------ */}
        <Text style={[typeStyles.body, [s.sectionTitle, s.sectionSolo]]}>Presenting Complaint</Text>
        <View style={s.quote}>
          <View style={s.quoteMark}>
            {/* Closing mark (&rdquo;, the "99" shape), not the opening one. */}
            <Text style={[typeStyles.body, s.quoteGlyph]}>&rdquo;</Text>
          </View>
          <Text style={[typeStyles.body, s.quoteText]}>{d.concernDetail}</Text>
        </View>

        {/* ------------------------------ intake summary --------------------------- */}
        <Text style={[typeStyles.body, [s.sectionTitle, s.sectionSolo]]}>Intake Summary</Text>
        <View style={[s.card, s.intakeGrid]}>
          {d.intake.map((row) => (
            <View key={row.key} style={s.intakeCell}>
              <View style={s.intakeCellHead}>
                <View style={s.intakeIcon}>
                  <Icon name={row.icon} size={14} color={colors.surfie} />
                </View>
                <Text style={[typeStyles.body, s.intakeLabel]} numberOfLines={1}>{row.label}</Text>
              </View>
              <Text style={[typeStyles.body, s.intakeValue]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ---------------------------- medical history ----------------------------- */}
        <Text style={[typeStyles.body, [s.sectionTitle, s.sectionSolo]]}>Medical History</Text>
        <View style={[s.card, s.historyCard]}>
          <TextInput
            testID="medical-history"
            value={medicalHistory}
            onChangeText={setMedicalHistory}
            multiline
            placeholder="Note any known conditions — e.g. diabetes, high blood pressure, allergies…"
            placeholderTextColor={colors.inkFaint}
            style={[typeStyles.body, s.historyInput]}
          />
        </View>

        {/* ---------------------------- uploaded documents -------------------------
            Rendered even with nothing uploaded: an empty record is precisely
            when the doctor needs to ask the patient for one. */}
        <View style={s.sectionHead}>
          <Text style={[typeStyles.body, s.sectionTitle]}>Uploaded Documents</Text>
          {d.documents.length > 0 && (
            <Pressable
              hitSlop={8}
              style={s.link}
              accessibilityRole="button"
              accessibilityLabel={`View all ${d.documents.length} documents`}
            >
              <Text style={[typeStyles.body, s.linkText]}>View all {d.documents.length}</Text>
              <Icon name="chevronRight" size={14} color={colors.surfie} />
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.docRow}
        >
          {d.documents.map((doc) => (
            <DocTile key={doc.id} doc={doc} onPress={() => onOpenDoc(doc.id)} />
          ))}
          <RequestDocTile onPress={onRequestDoc} />
        </ScrollView>

        {/* --------------------------------- consent ------------------------------- */}
        <Text style={[typeStyles.body, [s.sectionTitle, s.sectionSolo]]}>Consent</Text>
        <View style={[s.card, s.consent]}>
          <View style={s.consentShield}>
            <Icon name="shieldCheck" size={26} color={colors.surfie} />
          </View>
          {/* What was consented to on line one, when it was accepted on line two. */}
          <View style={s.flex}>
            <Text style={[typeStyles.body, s.consentText]}>Consent for Video Consultation</Text>
            <Text style={[typeStyles.body, s.consentMeta]}>
              Accepted on {d.dateLabel}, {d.consent.time}
            </Text>
          </View>
          <View style={s.verified}>
            <Text style={[typeStyles.body, s.verifiedText]}>Accepted</Text>
          </View>
        </View>

        {/* ---------------------------- past consultation -------------------------- */}
        {d.past && (
          <>
            <View style={s.sectionHead}>
              <Text style={[typeStyles.body, s.sectionTitle]}>Past Consultation</Text>
              <Pressable
                onPress={onViewHistory}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View consultation history"
              >
                <Text style={[typeStyles.body, s.linkText]}>View history</Text>
              </Pressable>
            </View>
            <Pressable style={[s.card, s.past]} accessibilityRole="button">
              <View style={s.pastIcon}>
                <Icon name="video" size={16} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={[typeStyles.body, s.pastMeta]}>
                  {d.past.dateLabel} · {d.past.time}
                </Text>
                <Text style={[typeStyles.body, s.pastTitle]}>{d.past.title}</Text>
                <Text style={[typeStyles.body, s.pastNote]}>
                  {d.past.note}
                </Text>
              </View>
              <Icon name="chevronRight" size={17} color={colors.inkFaint} />
            </Pressable>
          </>
        )}

      </Screen>

      {/* --------------------------------- footer -------------------------------- */}
      {/* Message lives in the top bar, so the CTA gets the full width here. */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          testID="join-consultation"
          onPress={() => onJoin(appointment)}
          disabled={!joinable}
          style={[s.footCta, !joinable && s.footCtaOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !joinable }}
        >
          <View style={s.footCtaIcon}>
            <Icon name="video" size={19} color={colors.surfie} />
          </View>
          <View style={s.footCtaCopy}>
            <Text style={[typeStyles.body, s.footCtaText]}>
              {joinable ? 'Join Consultation' : 'Consultation closed'}
            </Text>
            <Text style={[typeStyles.body, s.footCtaSub]}>
              {joinable ? `Starts in ${d.startsInMinutes} min` : modeLabel[appointment.mode]}
            </Text>
          </View>
          <View style={[s.footCtaArrow, !joinable && s.footCtaArrowOff]}>
            <Icon name="arrowRight" size={18} color={joinable ? colors.ink : colors.white} />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  // The footer is a sibling below the scroll view, so it needs no reserved
  // space here — 96 was leaving a dead gap above the Join button.
  content: { paddingBottom: spacing.lg },

  /* top bar */
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
  barRight: { flexDirection: 'row', gap: spacing.sm },

  /* patient header */
  patient: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface.mint,
    borderRadius: 14,
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
  avatarText: { ...typeStyles.avatar, fontSize: 19, color: colors.surfie },
  name: { ...typeStyles.name, color: colors.ink },
  sub: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 1 },
  // Green, unlabelled — the colour is what marks it as the patient reference.
  patientId: { ...typeStyles.bodySmall, color: colors.surfie, marginTop: 2 },
  idCard: {
    alignItems: 'flex-end',
    maxWidth: 148,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  idLabel: { ...typeStyles.label, fontSize: 9.5, color: colors.inkFaint },
  idValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  idValue: { ...typeStyles.body, fontSize: 11, color: colors.ink, flexShrink: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.paris },
  statusText: { ...typeStyles.status, color: colors.surfie },
  patientFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    // Breathing room under the rule — the row used to sit right on the line.
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  footItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  footStatus: { flexShrink: 0, paddingLeft: spacing.sm },
  footRule: { width: 1, height: 16, backgroundColor: colors.surface.line },
  footText: { ...typeStyles.bodySmall, color: colors.ink },

  /* sections */
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: SECTION_GAP,
    marginBottom: spacing.sm,
  },
  sectionSolo: { marginHorizontal: spacing.lg, marginTop: SECTION_GAP, marginBottom: spacing.sm },
  sectionTitle: { ...typeStyles.sectionTitle, color: colors.ink },
  sectionNote: { ...typeStyles.caption, color: colors.inkFaint },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { ...typeStyles.button, color: colors.surfie },

  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },

  /* concern */
  quote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  /**
   * Heavy, oversized curly quote — the "66" mark. At body weight and size the
   * glyph collapsed into what read as a dash. `lineHeight` is deliberately
   * tighter than `fontSize` to pull the mark up into optical centre, since the
   * glyph's ink sits in the top half of its em box.
   */
  quoteGlyph: {
    ...typeStyles.body,
    fontSize: 30,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.surfie,
  },
  quoteText: { ...typeStyles.body, flex: 1, color: colors.ink },

  /* intake — a 2-up grid, not a single stacked list */
  intakeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.sm,
  },
  intakeCell: { flexBasis: '45%', flexGrow: 1, minWidth: 0, gap: 3 },
  intakeCellHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  intakeIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  intakeLabel: { ...typeStyles.caption, flexShrink: 1, color: colors.inkMuted },
  intakeValue: { ...typeStyles.bodySmall, color: colors.ink, marginLeft: 22 + spacing.sm },

  /* documents */
  docRow: { paddingHorizontal: spacing.lg, gap: spacing.md },
  doc: { width: 116 },
  docThumb: {
    height: 78,
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
  // Stacked: title, then the upload date on its own line beneath.
  docCaption: { marginTop: spacing.sm },
  docTitle: { ...typeStyles.cardTitle, fontSize: 11.5, color: colors.ink },
  docMeta: { ...typeStyles.caption, fontSize: 9.5, color: colors.inkFaint, marginTop: 1 },

  /* consent */
  consent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  consentShield: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  consentText: { ...typeStyles.body, fontSize: 12.5, lineHeight: 16, color: colors.ink },
  consentMeta: { ...typeStyles.caption, fontSize: 10.5, color: colors.inkMuted, marginTop: 1 },
  verified: {
    backgroundColor: colors.successSoft,
    // Minimal radius, not a capsule.
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    flexShrink: 0,
  },
  verifiedText: { ...typeStyles.caption, color: colors.surfie },

  /* past consultation */
  past: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  pastIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastMeta: { ...typeStyles.caption, color: colors.inkMuted },
  pastTitle: { ...typeStyles.cardTitle, color: colors.ink, marginTop: 1 },
  pastNote: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },

  /* medical history */
  historyCard: { padding: spacing.md },
  historyInput: { color: colors.ink, minHeight: 60, textAlignVertical: 'top' },

  /* sticky footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  footCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 60,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfie,
  },
  footCtaOff: { backgroundColor: colors.inkFaint },
  // Pale tile left, copy centred, accent arrow right — per the reference.
  footCtaIcon: {
    width: 44,
    height: 44,
    // Softer squircle than the default 12 — matches the reference tile.
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
  footCtaArrowOff: { backgroundColor: 'rgba(255,255,255,0.24)' },
  footCtaText: { ...typeStyles.button, color: colors.white },
  footCtaSub: { ...typeStyles.caption, color: 'rgba(255,255,255,0.82)', marginTop: 1 },
});

export default AppointmentDetailsScreen;
