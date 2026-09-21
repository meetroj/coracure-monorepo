import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon, type IconName } from '../../components/Icon';
import { detailFor, doctor, type Appointment } from '../../data/doctor';

/**
 * Consultation Room — the live call, in-app.
 *
 * The room is reached only from an assigned appointment; there is no meeting
 * link, no join code and no way in from outside the app.
 *
 * Deliberately absent: any record control. The session is never captured.
 * What IS captured is attendance — join time, leave time and duration are
 * stamped against the consultation id and handed to `onEnd`.
 *
 * The concern shown here is patient-reported intake, labelled as such. It is
 * never presented as a diagnosis.
 */

export type CallLog = {
  consultationId: string;
  appointmentId: string;
  joinedAt: number;
  leftAt: number;
  durationSeconds: number;
};

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (total: number) =>
  `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;

/* ------------------------------ video surface ----------------------------- */

/**
 * Placeholder for the real stream. It renders identity, not a face: no stock
 * portrait stands in for a patient, and a camera-off state must look the same
 * whether the feed is absent or simply not yet attached.
 */
const Feed = ({
  initials,
  self,
  muted,
}: {
  initials: string;
  self?: boolean;
  muted?: boolean;
}) => (
  <View style={[s.feed, self ? s.feedSelf : s.feedMain]}>
    <View style={[s.feedAvatar, self && s.feedAvatarSelf]}>
      <Text style={[s.feedInitials, self && s.feedInitialsSelf]}>{initials}</Text>
    </View>
    {self && muted && (
      <View style={s.pipMuted}>
        <Icon name="micOff" size={10} color={colors.white} />
      </View>
    )}
  </View>
);

/* ----------------------------- control button ----------------------------- */

const Control = ({
  icon,
  label,
  onPress,
  danger,
  active,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  active?: boolean;
  testID?: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={s.control}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: active }}
  >
    <View style={[s.controlBtn, active && s.controlBtnActive, danger && s.controlBtnDanger]}>
      <View style={danger ? s.endGlyph : undefined}>
        <Icon
          name={icon}
          size={danger ? 24 : 21}
          color={danger ? colors.white : active ? colors.surfie : colors.inkMuted}
        />
      </View>
    </View>
    <Text style={[s.controlLabel, danger && s.controlLabelDanger]} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

/* --------------------------------- screen --------------------------------- */

/**
 * Psychiatry-first. No lab ordering and no generic health tips — this is the
 * action set a psychiatrist actually needs mid-consultation.
 */
const ACTIONS: { key: string; icon: IconName; label: string }[] = [
  { key: 'note', icon: 'document', label: 'Add Clinical Note' },
  { key: 'rx', icon: 'prescription', label: 'Create Prescription' },
  { key: 'followUp', icon: 'calendar', label: 'Assign Follow-up' },
  { key: 'report', icon: 'folder', label: 'Request Report' },
];

export const ConsultationRoomScreen = ({
  appointment,
  onBack,
  onEnd = () => undefined,
  onAction = () => undefined,
  onViewDetails = () => undefined,
  onAddParticipant = () => undefined,
  onMore = () => undefined,
  onChat = () => undefined,
  /** Injectable so the timer is deterministic under test. */
  now = Date.now,
}: {
  appointment: Appointment;
  onBack: () => void;
  onEnd?: (log: CallLog) => void;
  onAction?: (key: string) => void;
  onViewDetails?: (a: Appointment) => void;
  onAddParticipant?: () => void;
  onMore?: () => void;
  onChat?: () => void;
  now?: () => number;
}) => {
  const d = detailFor(appointment);
  const insets = useSafeAreaInsets();

  const joinedAt = useRef(now()).current;
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((now() - joinedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [joinedAt, now]);

  const end = () => {
    const leftAt = now();
    onEnd({
      consultationId: d.consultationId,
      appointmentId: d.appointmentId,
      joinedAt,
      leftAt,
      durationSeconds: Math.floor((leftAt - joinedAt) / 1000),
    });
  };

  const runAction = (key: string) => {
    // A note started mid-call is a draft until the doctor finalises it after.
    if (key === 'note') setNoteDraft(true);
    onAction(key);
  };

  const stage = (
    <View style={[s.stage, fullscreen && s.stageFull]}>
      <Feed initials={appointment.initials} />

      {/* patient identity chip, over the feed */}
      <View style={s.tag}>
        <View style={s.tagTop}>
          <Text style={s.tagName} numberOfLines={1}>
            {appointment.name}
          </Text>
          <Icon name="signal" size={12} color={colors.paris} />
        </View>
        <Text style={s.tagMeta} numberOfLines={1}>
          {appointment.age} years · {appointment.gender}
        </Text>
      </View>

      {/* self view, with its camera switch tucked into the corner */}
      <View style={s.pip}>
        <Feed initials={doctor.initials} self muted={muted} />
        <Pressable
          onPress={() => undefined}
          hitSlop={6}
          style={s.pipSwitch}
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
        >
          <Icon name="switchCamera" size={13} color={colors.white} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => setVideoOff((v) => !v)}
        style={s.stageCam}
        accessibilityRole="button"
        accessibilityLabel={videoOff ? 'Start video' : 'Stop video'}
      >
        <Icon name={videoOff ? 'videoOff' : 'video'} size={15} color={colors.ink} />
      </Pressable>

      <Pressable
        testID="toggle-fullscreen"
        onPress={() => setFullscreen((v) => !v)}
        style={s.stageExpand}
        accessibilityRole="button"
        accessibilityLabel={fullscreen ? 'Exit full screen' : 'Full screen'}
      >
        <Icon name={fullscreen ? 'collapse' : 'expand'} size={15} color={colors.ink} />
      </Pressable>
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* --------------------------------- header -------------------------------- */}
      {!fullscreen && (
      <>
      <View style={s.header}>
        <Pressable
          testID="back"
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <LogoWide width={96} height={24} />
        </Pressable>

        <View style={s.headerTitle}>
          <Text style={s.title} numberOfLines={1}>
            Consultation Room
          </Text>
          <View style={s.encRow}>
            <Icon name="shieldCheck" size={11} color={colors.surfie} />
            <Text style={s.enc} numberOfLines={1}>
              End-to-end encrypted
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onAddParticipant}
          hitSlop={8}
          style={s.hBtn}
          accessibilityRole="button"
          accessibilityLabel="Add participant"
        >
          <Icon name="userPlus" size={17} color={colors.ink} />
        </Pressable>
        <Pressable
          onPress={onMore}
          hitSlop={8}
          style={s.hBtn}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Icon name="more" size={17} color={colors.ink} />
        </Pressable>
      </View>

      {/* ------------------------------ status strip ----------------------------- */}
      <View style={s.strip}>
        <View style={s.capsule}>
          <View style={s.stripItem}>
            <View style={s.liveDot} />
            <Text style={s.stripText}>Connected</Text>
          </View>
          <View style={s.stripRule} />
          <View style={s.stripItem}>
            <Icon name="shieldCheck" size={12} color={colors.surfie} />
            <Text style={s.stripText}>Secure</Text>
          </View>
        </View>

        <View style={s.flex} />

        <View style={s.capsule}>
          <View style={s.timerDot} />
          <Text testID="call-timer" style={s.timer}>
            {clock(elapsed)}
          </Text>
        </View>
      </View>
      </>
      )}

      {fullscreen ? (
        stage
      ) : (
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* --------------------------------- video ------------------------------- */}
        {stage}

        {/* ---------------------------- patient summary -------------------------- */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Patient Summary</Text>
            <Pressable
              testID="view-details"
              onPress={() => onViewDetails(appointment)}
              hitSlop={8}
              style={s.link}
              accessibilityRole="button"
              accessibilityLabel="View details"
            >
              <Text style={s.linkText}>View details</Text>
              <Icon name="chevronRight" size={14} color={colors.surfie} />
            </Pressable>
          </View>

          <Pressable
            testID="context-row"
            onPress={() => setContextOpen((v) => !v)}
            style={s.summaryRow}
            accessibilityRole="button"
            accessibilityState={{ expanded: contextOpen }}
            accessibilityLabel="Patient summary"
          >
            {[
              { icon: 'user' as IconName, label: 'Patient ID', value: d.consultationId },
              { icon: 'calendar' as IconName, label: 'Last visit', value: d.past?.dateLabel ?? 'First' },
              { icon: 'document' as IconName, label: 'Total visits', value: String(d.totalConsultations) },
            ].map((cell, i) => (
              <React.Fragment key={cell.label}>
                {i > 0 && <View style={s.summaryRule} />}
                <View style={s.summaryCell}>
                  <View style={s.summaryIcon}>
                    <Icon name={cell.icon} size={14} color={colors.surfie} />
                  </View>
                  <View style={s.flex}>
                    <Text style={s.summaryLabel} numberOfLines={1}>
                      {cell.label}
                    </Text>
                    {/* shrinks to fit rather than clipping — a date has to
                        stay readable, and on one line */}
                    <Text
                      style={s.summaryValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {cell.value}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </Pressable>

          {contextOpen && (
            <View style={s.expand}>
              {[
                ['Previous consultation', d.past?.dateLabel ?? 'First consultation'],
                ['Total consultations', String(d.totalConsultations)],
                ['Consent', `Accepted · ${d.consent.version}`],
              ].map(([k, v], i, arr) => (
                <View key={k} style={[s.expandLine, i < arr.length - 1 && s.hairline]}>
                  <Text style={s.expandLabel}>{k}</Text>
                  <Text style={s.expandValue} numberOfLines={1}>
                    {v}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* --------------------------- presenting concern ------------------------ */}
        <View style={s.card}>
          <Text style={[s.cardTitle, s.cardTitleSolo]}>Presenting Concern</Text>

          <View style={s.quote}>
            <View style={s.quoteBadge}>
              <Text style={s.quoteGlyph}>&ldquo;</Text>
            </View>
            <View style={s.flex}>
              <Text style={s.quoteTitle}>{d.concern}</Text>
              <Text style={s.quoteBody}>{d.concernDetail}</Text>
              <View style={s.quoteMeta}>
                <Text style={s.quoteMetaText}>
                  Duration: <Text style={s.quoteMetaValue}>{d.duration}</Text>
                </Text>
                <Text style={s.quoteDot}>•</Text>
                <Text style={s.quoteMetaText}>
                  Severity: <Text style={s.quoteMetaValue}>{d.severity}</Text>
                </Text>
              </View>
            </View>
          </View>

        </View>

        {/* ---------------------------- quick actions ---------------------------- */}
        <View style={s.card}>
          <Text style={[s.cardTitle, s.cardTitleSolo]}>Quick Clinical Actions</Text>
          <View style={s.actions}>
            {ACTIONS.map((a) => (
              <Pressable
                key={a.key}
                testID={`action-${a.key}`}
                onPress={() => runAction(a.key)}
                style={s.action}
                accessibilityRole="button"
                accessibilityLabel={a.label}
              >
                <View style={s.actionIcon}>
                  <Icon name={a.icon} size={17} color={colors.surfie} />
                </View>
                <Text style={s.actionLabel} numberOfLines={2}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {noteDraft && (
          <View testID="draft-note" style={s.draft}>
            <Icon name="info" size={14} color={colors.warn} />
            <Text style={s.draftText}>
              Note saved as a draft. Finalise it with the case summary after the call.
            </Text>
          </View>
        )}
      </ScrollView>
      )}

      {/* ------------------------------- controls -------------------------------- */}
      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.sm }]}>
        <Control
          testID="ctl-mute"
          icon={muted ? 'micOff' : 'mic'}
          label={muted ? 'Unmute' : 'Mute'}
          active={muted}
          onPress={() => setMuted((v) => !v)}
        />
        <Control
          testID="ctl-video"
          icon={videoOff ? 'videoOff' : 'video'}
          label={videoOff ? 'Start Video' : 'Stop Video'}
          active={videoOff}
          onPress={() => setVideoOff((v) => !v)}
        />
        {/* a handset turned down — the universal end-call glyph, no strike */}
        <Control testID="ctl-end" icon="phone" label="End Call" danger onPress={end} />
        <Control testID="ctl-chat" icon="message" label="Chat" onPress={onChat} />
        <Control testID="ctl-more" icon="more" label="More" onPress={onMore} />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingBottom: spacing.lg },

  /* header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: { flex: 1, alignItems: 'center' },
  title: {
    fontFamily: typography.heading.family,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  encRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  enc: { fontFamily: typography.body.family, fontSize: 10, color: colors.surfie, fontWeight: '600' },
  hBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* status strip */
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  // both groups share one pill shape, so the row reads as two controls
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.mint,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  stripItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stripRule: { width: 1, height: 12, backgroundColor: colors.surface.line },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.paris },
  stripText: {
    fontFamily: typography.body.family,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  timerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  timer: {
    fontFamily: typography.heading.family,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.3,
  },

  /* video */
  stage: {
    height: 288,
    marginHorizontal: spacing.lg,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface.mintSoft,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  // Edge to edge and flexible, not a fixed 288 tile — this is the "true"
  // full-screen state, filling everything above the control bar.
  stageFull: {
    flex: 1,
    height: undefined,
    margin: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  feed: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  feedMain: { backgroundColor: colors.surface.mintSoft },
  feedSelf: { backgroundColor: colors.surfie },
  feedAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarSelf: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)' },
  feedInitials: {
    fontFamily: typography.heading.family,
    fontSize: 28,
    fontWeight: '700',
    color: colors.surfie,
  },
  feedInitialsSelf: { fontSize: 12, color: colors.white },

  tag: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    backgroundColor: 'rgba(28,28,28,0.55)',
    borderRadius: 10,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    maxWidth: '58%',
  },
  tagTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagName: {
    fontFamily: typography.heading.family,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.white,
    flexShrink: 1,
  },
  tagMeta: { fontFamily: typography.body.family, fontSize: 10, color: 'rgba(255,255,255,0.82)' },

  pip: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 84,
    height: 106,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
  },
  pipSwitch: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(28,28,28,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipMuted: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCam: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageExpand: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* cards */
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: {
    fontFamily: typography.heading.family,
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
  },
  cardTitleSolo: { marginBottom: spacing.md },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '700',
    color: colors.surfie,
  },

  /* patient summary */
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingBottom: spacing.sm },
  summaryRule: { width: 1, height: 30, backgroundColor: colors.surface.line, marginHorizontal: 6 },
  summaryCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontFamily: typography.body.family, fontSize: 9.5, color: colors.inkFaint },
  summaryValue: {
    fontFamily: typography.body.family,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 1,
  },
  expand: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surface.line },
  expandLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 9,
  },
  hairline: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  expandLabel: { fontFamily: typography.body.family, fontSize: 12, color: colors.inkMuted },
  expandValue: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
    flexShrink: 1,
  },

  /* concern */
  reported: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  reportedText: {
    fontFamily: typography.body.family,
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.surfie,
  },
  quote: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.surface.mint,
    borderRadius: 12,
    padding: spacing.md,
  },
  quoteBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteGlyph: {
    fontFamily: typography.heading.family,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.surfie,
  },
  quoteTitle: {
    fontFamily: typography.body.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  quoteBody: {
    fontFamily: typography.body.family,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted,
    marginTop: 3,
  },
  quoteMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  quoteMetaText: { fontFamily: typography.body.family, fontSize: 11, color: colors.inkMuted },
  quoteMetaValue: { fontWeight: '700', color: colors.surfie },
  quoteDot: { fontSize: 11, color: colors.inkFaint },
  disclaimer: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: spacing.sm,
  },

  /* quick actions */
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: 3,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: typography.body.family,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },

  draft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warnSoft,
    borderRadius: 12,
  },
  draftText: { flex: 1, fontFamily: typography.body.family, fontSize: 11.5, color: colors.warn },

  /* controls */
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  control: { flex: 1, alignItems: 'center', gap: 5 },
  controlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // the toggles still need a visible on-state, or "am I muted?" is unanswerable
  controlBtnActive: { backgroundColor: colors.surface.mint },
  endGlyph: { transform: [{ rotate: '135deg' }] },
  // the only red control, and the only one that breaks the row's rhythm
  controlBtnDanger: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.danger,
    marginTop: -6,
  },
  controlLabel: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  controlLabelDanger: { color: colors.danger, fontWeight: '700', marginTop: 2 },
});

export default ConsultationRoomScreen;
