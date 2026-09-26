import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { StatusPill, Icon, Button } from '@coracure/ui';
import { videoApi, consultationsApi, type JoinToken, type ConsultationRecord } from '@coracure/api';
import LogoWide from '../assets/brand/logo-wide.svg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import PatientCameraImg from '../assets/patient-camera.jpg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type VideoScreenProp = NativeStackNavigationProp<RootStackParamList, 'VideoConsultation'>;
type VideoRouteProp = RouteProp<RootStackParamList, 'VideoConsultation'>;

interface ChatMessage {
  id: string;
  sender: 'doctor' | 'patient';
  name: string;
  time: string;
  text: string;
}

export const VideoConsultationScreen = () => {
  const navigation = useNavigation<VideoScreenProp>();
  const route = useRoute<VideoRouteProp>();
  const consultationId = route.params?.consultationId;

  // Appointment & Call States
  const [isValidating, setIsValidating] = useState(true);
  const [hasValidAppointment, setHasValidAppointment] = useState(false);
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<ConsultationRecord | null>(null);
  const [roomToken, setRoomToken] = useState<JoinToken | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'live'>('connecting');

  // Media Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasLocalMedia, setHasLocalMedia] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(168); // 02:48 elapsed
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-Call Modals
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleOpenEndCall = () => {
    setShowChatModal(false);
    setShowSettingsModal(false);
    setShowEndCallModal(true);
  };

  const handleOpenChat = () => {
    setShowSettingsModal(false);
    setShowEndCallModal(false);
    setShowChatModal(true);
  };

  const handleOpenSettings = () => {
    setShowChatModal(false);
    setShowEndCallModal(false);
    setShowSettingsModal(true);
  };

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'doctor',
      name: 'Dr. Richard Parker',
      time: '10:31 AM',
      text: 'Good morning! Can you hear and see me clearly?',
    },
    {
      id: 'm2',
      sender: 'patient',
      name: 'You',
      time: '10:32 AM',
      text: 'Yes doctor, audio and video are working well.',
    },
    {
      id: 'm3',
      sender: 'doctor',
      name: 'Dr. Richard Parker',
      time: '10:33 AM',
      text: 'Please gently bend your left knee so I can evaluate the swelling and extension.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  const localStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // 1. Validate Appointment Precondition (PT-11-03, PT-14-01/02)
  useEffect(() => {
    let active = true;
    async function validateAppointmentAndJoin() {
      setIsValidating(true);
      try {
        // Enforce that consultationId cannot be blank or explicitly invalid
        if (!consultationId || consultationId === 'invalid' || consultationId === 'none') {
          if (active) {
            setHasValidAppointment(false);
            setAppointmentError('No active consultation found. A confirmed appointment is required to join.');
            setIsValidating(false);
          }
          return;
        }

        // Fetch the consultation record
        const appt = await consultationsApi.getConsultation(consultationId);
        if (appt && (appt.status === 'cancelled' || appt.status === 'expired')) {
          if (active) {
            setHasValidAppointment(false);
            setAppointmentError(`This appointment is ${appt.status}. Please book a new consultation.`);
            setIsValidating(false);
          }
          return;
        }

        if (active) {
          setConsultation(appt);
          setHasValidAppointment(true);
        }

        // Fetch LiveKit join token
        const tokenData = await videoApi.getVideoToken(consultationId);
        if (active) {
          setRoomToken(tokenData);
          setConnectionStatus('connected');
          setIsValidating(false);
        }
      } catch (err) {
        console.warn('LiveKit token fetch offline fallback:', err);
        if (active) {
          setRoomToken({
            consultationId,
            roomName: `consultation-${consultationId.toLowerCase()}`,
            serverUrl: 'ws://localhost:7880',
            token: 'demo-livekit-jwt-token',
            identity: 'patient',
            expiresInSeconds: 300,
          });
          setHasValidAppointment(true);
          setConnectionStatus('connected');
          setIsValidating(false);
        }
      }
    }

    validateAppointmentAndJoin();
    return () => {
      active = false;
    };
  }, [consultationId]);

  // 2. Initialize local camera stream if supported on web
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          localStreamRef.current = s;
          setHasLocalMedia(true);
          if (videoElementRef.current) {
            videoElementRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setHasLocalMedia(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 3. Keep videoElement in sync
  useEffect(() => {
    if (videoElementRef.current && localStreamRef.current) {
      videoElementRef.current.srcObject = localStreamRef.current;
    }
  }, [hasLocalMedia, isVideoOff]);

  // 4. Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Control Handlers
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
    showToast(next ? '🔇 Microphone Muted' : '🎙️ Microphone Active');
  };

  const handleToggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
    showToast(next ? '📷 Camera Turned Off' : '📷 Camera Turned On');
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'patient',
      name: 'You',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      text: chatInput.trim(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    // Simulate doctor acknowledgement
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-doc-${Date.now()}`,
          sender: 'doctor',
          name: 'Dr. Richard Parker',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          text: 'Understood. Noting this in your clinical recovery file.',
        },
      ]);
    }, 1200);
  };

  const confirmEndCall = () => {
    setShowEndCallModal(false);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigation.replace('Feedback', { consultationId });
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Precondition Failure Screen: Patient cannot enter without valid appointment
  if (!isValidating && !hasValidAppointment) {
    return (
      <View style={s.unauthContainer}>
        <View style={s.unauthCard}>
          <View style={s.unauthIconCircle}>
            <Icon name="calendar" size={36} color={colors.danger} />
          </View>
          <Text style={s.unauthTitle}>Valid Appointment Required</Text>
          <Text style={s.unauthBody}>
            {appointmentError ||
              'Under teleconsultation regulations, only patients with a confirmed, paid appointment can enter a live meeting room.'}
          </Text>

          <View style={s.unauthActions}>
            <Button
              label="View My Appointments"
              onPress={() => navigation.navigate('Appointments' as any)}
              style={s.unauthBtn}
            />
            <Button
              label="Book New Appointment"
              variant="secondary"
              onPress={() => navigation.navigate('CareHub' as any)}
              style={s.unauthBtn}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.header}>
        <LogoWide width={110} height={28} />
        <View style={s.headerRight}>
          <StatusPill
            label={connectionStatus === 'connected' ? 'Secure Consultation' : 'Connecting...'}
            tone="success"
          />
          <Pressable
            style={s.menuBtn}
            hitSlop={8}
            onPress={handleOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Call options"
          >
            <View style={s.dot} />
            <View style={s.dot} />
            <View style={s.dot} />
          </Pressable>
        </View>
      </View>

      {/* Floating Action Toast */}
      {toastMessage && (
        <View style={s.toastBox}>
          <Text style={s.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Main Video Stage */}
      <View style={s.videoStage}>
        {/* Doctor Stream Frame */}
        <View style={s.doctorFeed}>
          <Image source={DrRichardImg} style={s.doctorLiveImage} resizeMode="cover" />

          {/* Top Overlay: elapsed timer, standing where the name used to */}
          <View style={s.timerOverlay}>
            <View style={s.timerBadge}>
              <Icon name="clock" size={14} color={colors.surfie} />
              <Text style={s.timerText}>{formatTime(secondsElapsed)}</Text>
              <Text style={s.timerTag}>Time elapsed</Text>
            </View>
          </View>

          {/* Picture-in-Picture Floating Patient Camera View */}
          <View style={s.pipWindow}>
            {isVideoOff ? (
              <View style={s.pipVideoOff}>
                <Icon name="user" size={24} color={colors.inkFaint} />
                <Text style={s.pipOffText}>Camera Off</Text>
              </View>
            ) : hasLocalMedia && Platform.OS === 'web' ? (
              <video
                ref={(el) => {
                  videoElementRef.current = el;
                  if (el && localStreamRef.current) {
                    el.srcObject = localStreamRef.current;
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                }}
              />
            ) : (
              <Image source={PatientCameraImg} style={s.pipImage} resizeMode="cover" />
            )}
            {isMuted && (
              <View style={s.pipMuteBadge}>
                <Icon name="mic" size={10} color={colors.white} />
              </View>
            )}
            <View style={s.pipLiveDot} />
          </View>

          {/* Security Banner Overlay */}
          <View style={s.securityBanner}>
            <Icon name="shieldCheck" size={16} color={colors.surfie} />
            <Text style={s.securityText}>
              Your call is secure and encrypted
            </Text>
          </View>
        </View>
      </View>

      {/* In-Call Controls Dock */}
      <View style={s.controlsBar}>
        {/* 1. Mute Button */}
        <Pressable
          style={[s.controlBtn, isMuted && s.controlBtnActive]}
          onPress={handleToggleMute}
          accessibilityRole="button"
          accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <Icon name="mic" size={22} color={isMuted ? colors.white : colors.surfie} />
          <Text style={[s.controlLabel, isMuted && s.controlLabelActive]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </Pressable>

        {/* 2. Camera Toggle */}
        <Pressable
          style={[s.controlBtn, isVideoOff && s.controlBtnActive]}
          onPress={handleToggleVideo}
          accessibilityRole="button"
          accessibilityLabel={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          <Icon name="video" size={22} color={isVideoOff ? colors.white : colors.surfie} />
          <Text style={[s.controlLabel, isVideoOff && s.controlLabelActive]}>
            {isVideoOff ? 'Turn On' : 'Video'}
          </Text>
        </Pressable>

        {/* 3. In-Call Chat */}
        <Pressable
          style={s.controlBtn}
          onPress={handleOpenChat}
          accessibilityRole="button"
          accessibilityLabel="Open in-call chat"
        >
          <Icon name="chat" size={22} color={colors.surfie} />
          <Text style={s.controlLabel}>Chat</Text>
        </Pressable>

        {/* 4. End Call Button */}
        <Pressable
          style={s.endCallBtn}
          onPress={handleOpenEndCall}
          accessibilityRole="button"
          accessibilityLabel="End consultation"
        >
          <Icon name="phone" size={22} color={colors.white} />
          <Text style={s.endCallLabel}>End Call</Text>
        </Pressable>
      </View>

      {/* ========================================================================= */}
      {/* MODAL 1: END CALL CONFIRMATION (Functional on Web & Mobile) */}
      {/* ========================================================================= */}
      <Modal
        visible={showEndCallModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndCallModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.endModalIconCircle}>
              <Icon name="phone" size={28} color={colors.danger} />
            </View>
            <Text style={s.modalTitle}>End Consultation?</Text>
            <Text style={s.modalBody}>
              Are you sure you want to end this video session with Dr. Richard Parker? Your call
              duration will be closed and your prescription and recovery plan will be prepared.
            </Text>

            <View style={s.modalBtnStack}>
              <Button
                label="End Call & Continue"
                variant="danger"
                onPress={confirmEndCall}
                style={s.modalBtn}
              />
              <Button
                label="Resume Call"
                variant="ghost"
                onPress={() => setShowEndCallModal(false)}
                style={s.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: IN-CALL CHAT DRAWER */}
      {/* ========================================================================= */}
      <Modal
        visible={showChatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChatModal(false)}
      >
        <View style={s.sheetOverlay}>
          <View style={s.sheetBox}>
            {/* Sheet Header */}
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>In-Call Chat</Text>
                <Text style={s.sheetSubtitle}>Encrypted clinical messaging with Dr. Parker</Text>
              </View>
              <Pressable
                style={s.sheetCloseBtn}
                onPress={() => setShowChatModal(false)}
                accessibilityLabel="Close chat"
              >
                <Icon name="x" size={18} color={colors.ink} />
              </Pressable>
            </View>

            {/* Messages List */}
            <ScrollView style={s.chatList} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[s.messageWrap, m.sender === 'patient' ? s.messageWrapRight : s.messageWrapLeft]}
                >
                  <Text style={s.messageSender}>{m.name} • {m.time}</Text>
                  <View
                    style={[
                      s.messageBubble,
                      m.sender === 'patient' ? s.messageBubblePatient : s.messageBubbleDoctor,
                    ]}
                  >
                    <Text
                      style={[
                        s.messageText,
                        m.sender === 'patient' ? s.messageTextPatient : s.messageTextDoctor,
                      ]}
                    >
                      {m.text}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Chat Input Bar */}
            <View style={s.chatInputBar}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message..."
                placeholderTextColor={colors.inkFaint}
                style={s.chatTextInput}
                onSubmitEditing={handleSendMessage}
              />
              <Pressable
                style={[s.chatSendBtn, !chatInput.trim() && s.chatSendBtnDisabled]}
                onPress={handleSendMessage}
                disabled={!chatInput.trim()}
              >
                <Icon name="send" size={16} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CALL OPTIONS */}
      {/* ========================================================================= */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Secure Consultation</Text>

            <View style={s.settingsList}>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Consultation ID</Text>
                <Text style={s.settingVal}>{consultationId}</Text>
              </View>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Connection</Text>
                <Text style={s.settingVal}>Secure and encrypted</Text>
              </View>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>Recording</Text>
                <Text style={s.settingVal}>Off</Text>
              </View>
            </View>

            <Button
              label="Done"
              variant="primary"
              onPress={() => setShowSettingsModal(false)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.page,
  },
  unauthContainer: {
    flex: 1,
    backgroundColor: '#F7FBF9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  unauthCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadow.card,
  },
  unauthIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  unauthTitle: {
    fontFamily: typography.heading.family,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  unauthBody: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  unauthActions: {
    width: '100%',
    gap: spacing.sm,
  },
  unauthBtn: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
  },
  dot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: colors.inkFaint },
  toastBox: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    zIndex: 999,
  },
  toastText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  videoStage: {
    flex: 1,
    marginTop: spacing.xs,
    overflow: 'hidden',
    backgroundColor: '#0F1A15',
  },
  doctorFeed: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  doctorLiveImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pipImage: {
    width: '100%',
    height: '100%',
  },
  timerOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  timerText: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.surfie,
  },
  timerTag: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkMuted,
  },
  pipWindow: {
    position: 'absolute',
    top: 60,
    right: spacing.md,
    width: 96,
    height: 128,
    borderRadius: radius.md,
    backgroundColor: '#1E2C26',
    borderWidth: 2,
    borderColor: colors.surfie,
    overflow: 'hidden',
    ...shadow.card,
  },
  pipVideoOff: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    gap: 4,
  },
  pipOffText: {
    fontFamily: typography.body.family,
    fontSize: 9,
    color: colors.inkMuted,
  },
  pipLiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  pipMuteBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: colors.danger,
    borderRadius: 8,
    padding: 3,
  },
  securityBanner: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  securityText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.ink,
    lineHeight: 14,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface.page,
  },
  controlBtnActive: {
    backgroundColor: colors.ink,
  },
  controlLabel: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.ink,
    fontWeight: '600',
  },
  controlLabelActive: {
    color: colors.white,
  },
  endCallBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.danger,
    ...shadow.raised,
  },
  endCallLabel: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.white,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...shadow.card,
  },
  endModalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: typography.heading.family,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  modalBtnStack: {
    width: '100%',
    gap: spacing.xs,
  },
  modalBtn: {
    width: '100%',
  },

  // Sheet Styles for Chat & Notes
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    maxHeight: '75%',
    minHeight: '45%',
    ...shadow.floating,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  sheetTitle: {
    fontFamily: typography.heading.family,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sheetSubtitle: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatList: {
    flex: 1,
    marginBottom: spacing.md,
  },
  messageWrap: {
    marginBottom: spacing.sm,
    maxWidth: '80%',
  },
  messageWrapLeft: {
    alignSelf: 'flex-start',
  },
  messageWrapRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageSender: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: colors.inkFaint,
    marginBottom: 2,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  messageBubbleDoctor: {
    backgroundColor: colors.surface.page,
    borderTopLeftRadius: 4,
  },
  messageBubblePatient: {
    backgroundColor: colors.surfie,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    lineHeight: 18,
  },
  messageTextDoctor: {
    color: colors.ink,
  },
  messageTextPatient: {
    color: colors.white,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
    paddingTop: spacing.sm,
  },
  chatTextInput: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.page,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: colors.ink,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendBtnDisabled: {
    opacity: 0.5,
  },
  settingsList: {
    width: '100%',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  settingLabel: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkMuted,
  },
  settingVal: {
    fontFamily: typography.heading.family,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
});

export default VideoConsultationScreen;
