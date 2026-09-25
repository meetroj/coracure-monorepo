import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon, type IconName } from '../../components/Icon';
import { BackButton } from '../../components/ScreenHeader';
import { ActionSheet, BottomSheet } from '../../components/BottomSheet';
import { confirm } from '../../components/confirm';
import { useStore } from '../../state/store';
import { selectDoctor, selectRecord } from '../../state/selectors';
import { sendMessage } from '../../state/actions';
import { detailFor, type Appointment } from '../../data/doctor';
import { MESSAGE_MAX } from '../../data/messaging';

/**
 * Consultation Room — the live call, in-app.
 *
 * Reached only from an assigned appointment; there is no meeting link or join
 * code. Nothing here records the session. The clinical tools open on top of
 * the room, which stays mounted underneath — the call and its timer carry on
 * while the doctor writes a note.
 *
 * The video surface is a placeholder until the video SDK is integrated, so it
 * renders identity, never a face, and controls that need the SDK (switch
 * camera, add participant) are not offered at all.
 */

export type CallLog = {
  consultationId: string;
  appointmentId: string;
  joinedAt: number;
  leftAt: number;
  durationSeconds: number;
};

export type RoomAction = 'note' | 'rx' | 'followUp' | 'report';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (total: number) =>
  `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;

/* ------------------------------ video surface ----------------------------- */

const Feed = ({ initials, self, muted, videoOff }: { initials: string; self?: boolean; muted?: boolean; videoOff?: boolean }) => (
  <View style={[s.feed, self ? s.feedSelf : s.feedMain]}>
    {self && videoOff ? (
      <View style={s.camOff}>
        <Icon name="videoOff" size={16} color={colors.white} />
        <Text style={s.camOffText}>Camera off</Text>
      </View>
    ) : (
      <View style={[s.feedAvatar, self && s.feedAvatarSelf]}>
        <Text style={[s.feedInitials, self && s.feedInitialsSelf]}>{initials}</Text>
      </View>
    )}
    {self && muted && (
      <View style={s.pipMuted}>
        <Icon name="micOff" size={11} color={colors.white} />
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
    accessibilityState={{ selected: !!active }}
  >
    <View style={[s.controlBtn, active && s.controlBtnActive, danger && s.controlBtnDanger]}>
      <View style={danger ? s.endGlyph : undefined}>
        <Icon name={icon} size={danger ? 24 : 21} color={danger ? colors.white : active ? colors.surfie : colors.inkMuted} />
      </View>
    </View>
    <Text style={[s.controlLabel, danger && s.controlLabelDanger]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
      {label}
    </Text>
  </Pressable>
);

/* ------------------------------- in-call chat ------------------------------ */

const InCallChat = ({ visible, threadId, onClose }: { visible: boolean; threadId?: string; onClose: () => void }) => {
  const thread = useStore((st) => st.threads.find((t) => t.id === threadId));
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);

  const send = () => {
    const body = draft.trim();
    if (!body || !threadId) return;
    sendMessage(threadId, body);
    setDraft('');
  };

  return (
    <BottomSheet
      visible={visible}
      title="Chat"
      subtitle={thread ? `${thread.name} · ${thread.context}` : undefined}
      onClose={onClose}
      testID="room-chat"
      footer={
        <View style={s.chatComposer}>
          <TextInput
            testID="room-chat-input"
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, MESSAGE_MAX))}
            placeholder="Write a message…"
            placeholderTextColor={colors.inkFaint}
            style={s.chatInput}
            multiline
            accessibilityLabel="Message"
          />
          <Pressable
            testID="room-chat-send"
            onPress={send}
            disabled={!draft.trim()}
            style={[s.chatSend, !draft.trim() && s.chatSendOff]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Icon name="arrowRight" size={17} color={colors.white} />
          </Pressable>
        </View>
      }
    >
      <ScrollView
        ref={scroll}
        style={s.chatList}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        {(thread?.messages ?? []).length === 0 && (
          <Text style={s.chatEmpty}>No messages yet. Messages here are part of this consultation.</Text>
        )}
        {(thread?.messages ?? []).map((m) => (
          <View key={m.id} style={[s.bubbleRow, m.from === 'me' && s.bubbleRowMine]}>
            <View style={[s.bubble, m.from === 'me' ? s.bubbleMine : s.bubbleTheirs]}>
              <Text style={[s.bubbleText, m.from === 'me' && s.bubbleTextMine]}>{m.body}</Text>
              <Text style={[s.bubbleAt, m.from === 'me' && s.bubbleAtMine]}>{m.at}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

/* --------------------------------- screen --------------------------------- */

/**
 * Psychiatry-first. No lab ordering and no generic health tips — this is the
 * action set a psychiatrist actually needs mid-consultation.
 */
const ACTIONS: { key: RoomAction; icon: IconName; label: string }[] = [
  { key: 'note', icon: 'document', label: 'Clinical Note' },
  { key: 'rx', icon: 'prescription', label: 'Prescription' },
  { key: 'followUp', icon: 'calendar', label: 'Follow-up Plan' },
  { key: 'report', icon: 'folder', label: 'Request Report' },
];

export const ConsultationRoomScreen = ({
  appointment,
  joinedAt: joinedAtProp,
  threadId,
  onLeave,
  onEnd,
  onAction,
  onViewDetails,
  onReportIssue,
  now = Date.now,
}: {
  appointment: Appointment;
  /** When the doctor joined, from the live call — so re-entering keeps the timer. */
  joinedAt?: number;
  /** The patient's chat thread, for in-call messages. */
  threadId?: string;
  onLeave: () => void;
  onEnd: (log: CallLog) => void;
  onAction: (key: RoomAction) => void;
  onViewDetails: () => void;
  onReportIssue: () => void;
  /** Injectable so the timer is deterministic under test. */
  now?: () => number;
}) => {
  const a = appointment;
  const d = detailFor(a);
  const insets = useSafeAreaInsets();
  const doctor = useStore(selectDoctor);
  const record = useStore((st) => selectRecord(st, a.id));

  const joinedAt = useRef(joinedAtProp ?? now()).current;
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.floor((now() - joinedAt) / 1000)));
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((now() - joinedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [joinedAt, now]);

  const leave = () =>
    confirm({
      title: 'Leave the consultation room?',
      message: `${a.name} will see that you left. You can rejoin from the appointment while it is still open.`,
      confirmLabel: 'Leave room',
      cancelLabel: 'Stay',
      onConfirm: onLeave,
    });

  const end = () =>
    confirm({
      title: 'End consultation?',
      message: `This ends the call for you and ${a.name}. You will write up the notes next.`,
      confirmLabel: 'End consultation',
      cancelLabel: 'Continue call',
      destructive: true,
      onConfirm: () => {
        const leftAt = now();
        onEnd({
          consultationId: d.consultationId,
          appointmentId: a.id,
          joinedAt,
          leftAt,
          durationSeconds: Math.floor((leftAt - joinedAt) / 1000),
        });
      },
    });

  const actionStatus = (key: RoomAction) => {
    if (key === 'note') return record.notesStatus === 'saved' ? 'Saved' : record.notesStatus === 'draft' ? 'Draft' : '';
    if (key === 'rx')
      return record.rxStatus === 'finalised' ? 'Finalised' : record.medicines.length ? `${record.medicines.length} added` : '';
    if (key === 'followUp') return record.plan ? 'Assigned' : '';
    return '';
  };

  const stage = (
    <View style={[s.stage, fullscreen && s.stageFull]}>
      <Feed initials={a.initials} />

      <View style={s.tag}>
        <Text style={s.tagName} numberOfLines={1}>
          {a.name}
        </Text>
        <Text style={s.tagMeta} numberOfLines={1}>
          {a.age} years · {a.gender}
        </Text>
      </View>

      <View style={s.pip}>
        <Feed initials={doctor.initials} self muted={muted} videoOff={videoOff} />
      </View>

      <Pressable
        testID="toggle-fullscreen"
        onPress={() => setFullscreen((v) => !v)}
        hitSlop={6}
        style={s.stageExpand}
        accessibilityRole="button"
        accessibilityLabel={fullscreen ? 'Exit full screen' : 'Full screen'}
      >
        <Icon name={fullscreen ? 'collapse' : 'expand'} size={16} color={colors.ink} />
      </Pressable>
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]} testID="consultation-room">
      {!fullscreen && (
        <>
          <View style={s.header}>
            <BackButton onPress={leave} label="Leave consultation room" />
            <View style={s.headerTitle}>
              <Text style={s.title} numberOfLines={1} accessibilityRole="header">
                Consultation Room
              </Text>
              <View style={s.encRow}>
                <Icon name="lock" size={11} color={colors.surfie} />
                <Text style={s.enc} numberOfLines={1}>
                  Secure connection
                </Text>
              </View>
            </View>
            <View style={s.timerCapsule}>
              <View style={s.timerDot} />
              <Text testID="call-timer" style={s.timer} accessibilityLabel={`Call time ${clock(elapsed)}`}>
                {clock(elapsed)}
              </Text>
            </View>
          </View>
        </>
      )}

      {fullscreen ? (
        stage
      ) : (
        <ScrollView style={s.flex} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {stage}

          {/* ---------------------------- patient summary -------------------------- */}
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Patient Summary</Text>
              <Pressable
                testID="view-details"
                onPress={onViewDetails}
                hitSlop={10}
                style={s.link}
                accessibilityRole="button"
                accessibilityLabel="View appointment details"
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
              accessibilityLabel="Patient summary, show more"
            >
              {[
                { icon: 'user' as IconName, label: 'Patient ID', value: d.patientId },
                { icon: 'calendar' as IconName, label: 'Last visit', value: d.past?.dateLabel ?? 'First visit' },
                { icon: 'document' as IconName, label: 'Visits', value: String(d.totalConsultations) },
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
                      <Text style={s.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
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
                  ['Previous consultation', d.past ? `${d.past.dateLabel} · ${d.past.note}` : 'First consultation'],
                  ['Total consultations', String(d.totalConsultations)],
                  ['Consent', `Accepted · ${d.consent.version}`],
                ].map(([k, v], i, arr) => (
                  <View key={k} style={[s.expandLine, i < arr.length - 1 && s.hairline]}>
                    <Text style={s.expandLabel}>{k}</Text>
                    <Text style={s.expandValue} numberOfLines={2}>
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
              {ACTIONS.map((act) => {
                const status = actionStatus(act.key);
                return (
                  <Pressable
                    key={act.key}
                    testID={`action-${act.key}`}
                    onPress={() => onAction(act.key)}
                    style={({ pressed }) => [s.action, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={status ? `${act.label}, ${status}` : act.label}
                  >
                    <View style={s.actionIcon}>
                      <Icon name={act.icon} size={17} color={colors.surfie} />
                    </View>
                    <Text style={s.actionLabel} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                      {act.label}
                    </Text>
                    {!!status && (
                      <Text style={s.actionStatus} numberOfLines={1}>
                        {status}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
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
        {/* a handset turned down — the universal end-call glyph */}
        <Control testID="ctl-end" icon="phone" label="End Call" danger onPress={end} />
        <Control testID="ctl-chat" icon="message" label="Chat" onPress={() => setChatOpen(true)} />
        <Control testID="ctl-more" icon="more" label="More" onPress={() => setMoreOpen(true)} />
      </View>

      <ActionSheet
        visible={moreOpen}
        title="More"
        onClose={() => setMoreOpen(false)}
        testID="room-more"
        actions={[
          { key: 'details', label: 'Patient details', icon: 'user', onPress: onViewDetails },
          { key: 'report', label: 'Request a report', icon: 'folder', onPress: () => onAction('report') },
          { key: 'followUp', label: 'Assign follow-up plan', icon: 'calendar', onPress: () => onAction('followUp') },
          { key: 'issue', label: 'Report a technical issue', icon: 'headset', onPress: onReportIssue },
        ]}
      />
      <InCallChat visible={chatOpen} threadId={threadId} onClose={() => setChatOpen(false)} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  scroll: { paddingBottom: spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: { flex: 1, alignItems: 'center' },
  title: { ...typeStyles.cardTitle, fontWeight: fontWeight.bold, color: colors.ink },
  encRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  enc: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  timerCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.mint,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 34,
  },
  timerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  timer: { ...typeStyles.number, fontWeight: fontWeight.bold, color: colors.ink },

  stage: {
    height: 280,
    marginHorizontal: spacing.lg,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surface.mintSoft,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  stageFull: { flex: 1, height: undefined, margin: 0, borderRadius: 0, borderWidth: 0 },
  feed: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  feedMain: { backgroundColor: colors.surface.mintSoft },
  feedSelf: { backgroundColor: colors.surfie },
  feedAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarSelf: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)' },
  feedInitials: { ...typeStyles.pageTitle, fontSize: 28, lineHeight: 34, color: colors.surfie },
  feedInitialsSelf: { ...typeStyles.caption, color: colors.white, fontWeight: fontWeight.semibold },
  camOff: { alignItems: 'center', gap: 4 },
  camOffText: { ...typeStyles.caption, fontSize: 11, color: colors.white },
  tag: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    backgroundColor: 'rgba(28,28,28,0.62)',
    borderRadius: 10,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    maxWidth: '58%',
  },
  tagName: { ...typeStyles.caption, fontWeight: fontWeight.bold, color: colors.white },
  tagMeta: { ...typeStyles.caption, fontSize: 11, color: 'rgba(255,255,255,0.86)' },
  pip: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 88,
    height: 112,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
  },
  pipMuted: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageExpand: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...typeStyles.cardTitle, color: colors.ink },
  cardTitleSolo: { marginBottom: spacing.md },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  linkText: { ...typeStyles.buttonSmall, color: colors.surfie },

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
  summaryLabel: { ...typeStyles.caption, fontSize: 11, lineHeight: 14, color: colors.inkFaint },
  summaryValue: { ...typeStyles.caption, fontWeight: fontWeight.bold, color: colors.ink },
  expand: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surface.line },
  expandLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 9 },
  hairline: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  expandLabel: { ...typeStyles.caption, color: colors.inkMuted },
  expandValue: { ...typeStyles.caption, fontWeight: fontWeight.semibold, color: colors.ink, flexShrink: 1, textAlign: 'right' },

  quote: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  quoteGlyph: { ...typeStyles.cardTitle, fontSize: 19, lineHeight: 26, fontWeight: fontWeight.bold, color: colors.surfie },
  quoteTitle: { ...typeStyles.bodySmall, fontWeight: fontWeight.bold, color: colors.ink },
  quoteBody: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 3 },
  quoteMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' },
  quoteMetaText: { ...typeStyles.caption, color: colors.inkMuted },
  quoteMetaValue: { fontWeight: fontWeight.bold, color: colors.surfie },
  quoteDot: { ...typeStyles.caption, color: colors.inkFaint },

  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minHeight: 96,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typeStyles.caption,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    textAlign: 'center',
  },
  actionStatus: { ...typeStyles.caption, fontSize: 11, lineHeight: 14, color: colors.surfie },

  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  control: { flex: 1, alignItems: 'center', gap: 5, minHeight: 64 },
  controlBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  // the toggles need a visible on-state, or "am I muted?" is unanswerable
  controlBtnActive: { backgroundColor: colors.surface.mint },
  endGlyph: { transform: [{ rotate: '135deg' }] },
  controlBtnDanger: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.danger, marginTop: -6 },
  controlLabel: { ...typeStyles.caption, fontSize: 11, lineHeight: 14, color: colors.inkMuted },
  controlLabelDanger: { color: colors.danger, fontWeight: fontWeight.bold, marginTop: 2 },

  chatList: { maxHeight: 320 },
  chatEmpty: { ...typeStyles.bodySmall, color: colors.inkMuted, paddingVertical: spacing.lg, textAlign: 'center' },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleTheirs: { backgroundColor: '#F3F7F5', borderTopLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.surfie, borderTopRightRadius: 4 },
  bubbleText: { ...typeStyles.bodySmall, color: colors.ink },
  bubbleTextMine: { color: colors.white },
  bubbleAt: { ...typeStyles.caption, fontSize: 11, color: colors.inkMuted, marginTop: 3, textAlign: 'right' },
  bubbleAtMine: { color: 'rgba(255,255,255,0.8)' },
  chatComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  chatInput: {
    ...typeStyles.body,
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    color: colors.ink,
  },
  chatSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendOff: { opacity: 0.4 },
});

export default ConsultationRoomScreen;
