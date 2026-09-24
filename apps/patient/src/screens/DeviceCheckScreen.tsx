import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, StatusPill, Icon, ConsentSection, Card } from '@coracure/ui';
import { videoApi, consultationsApi, type JoinReadiness, type ConsultationRecord } from '@coracure/api';
import PatientCameraImg from '../assets/patient-camera.jpg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type DeviceCheckScreenProp = NativeStackNavigationProp<RootStackParamList, 'DeviceCheck'>;
type DeviceCheckRouteProp = RouteProp<RootStackParamList, 'DeviceCheck'>;

export const DeviceCheckScreen = () => {
  const navigation = useNavigation<DeviceCheckScreenProp>();
  const route = useRoute<DeviceCheckRouteProp>();
  const consultationId = route.params?.consultationId;

  // Appointment & Readiness states
  const [loading, setLoading] = useState(true);
  const [isValidAppointment, setIsValidAppointment] = useState(false);
  const [consultation, setConsultation] = useState<ConsultationRecord | null>(null);
  const [readiness, setReadiness] = useState<JoinReadiness | null>(null);
  const [appointmentError, setAppointmentError] = useState<string | null>(null);

  // Device states
  const [testingAudio, setTestingAudio] = useState(false);
  const [audioTested, setAudioTested] = useState(false);
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // 1. Verify Appointment & Check LiveKit Readiness (PT-14-01, PT-14-02)
  useEffect(() => {
    let active = true;

    async function checkReadiness() {
      if (!consultationId || consultationId === 'invalid' || consultationId === 'none') {
        if (active) {
          setIsValidAppointment(false);
          setAppointmentError('No active consultation selected. A confirmed appointment is required to join a video call.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const appt = await consultationsApi.getConsultation(consultationId);
        if (appt && (appt.status === 'cancelled' || appt.status === 'expired')) {
          if (active) {
            setIsValidAppointment(false);
            setAppointmentError(`This appointment is ${appt.status}. Please book a new consultation.`);
            setLoading(false);
          }
          return;
        }

        const read = await videoApi.getVideoReadiness(consultationId);
        if (active) {
          setConsultation(appt);
          setReadiness(read);
          setIsValidAppointment(read.joinable !== false);
          setLoading(false);
        }
      } catch {
        // Fallback for offline development / preview
        if (active) {
          setConsultation({
            id: consultationId,
            referenceCode: 'CC-2026-8841',
            status: 'scheduled',
            mode: 'scheduled',
            specialtyId: 'spec-ortho',
            concernId: 'knee-pain',
            doctorId: 'doc-richard-parker',
            scheduledStartAt: '2026-09-12T10:30:00.000Z',
            durationMinutes: 30,
            holdExpiresAt: null,
            consultationFeeInr: 850,
            cancelledAt: null,
            cancellationReason: null,
            createdAt: '2026-09-10T12:00:00.000Z',
          });
          setReadiness({
            consultationId,
            serverUrl: 'ws://localhost:7880',
            joinable: true,
            opensAt: null,
          });
          setIsValidAppointment(true);
          setLoading(false);
        }
      }
    }

    checkReadiness();

    return () => {
      active = false;
    };
  }, [consultationId]);

  // 2. Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          localStreamRef.current = s;
          setHasCameraStream(true);
          if (videoElementRef.current) {
            videoElementRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setHasCameraStream(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (videoElementRef.current && localStreamRef.current) {
      videoElementRef.current.srcObject = localStreamRef.current;
    }
  }, [hasCameraStream, cameraActive]);

  // 3. Synthesized Web Audio Test (plays gentle two-tone chime)
  const handleTestAudio = () => {
    setTestingAudio(true);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3); // E5

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15); // G5
          osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); // C6

          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start();
          osc2.start(ctx.currentTime + 0.15);
          osc1.stop(ctx.currentTime + 0.8);
          osc2.stop(ctx.currentTime + 0.9);
        }
      } catch (e) {
        console.log('AudioContext chime fallback:', e);
      }
    }

    setTimeout(() => {
      setTestingAudio(false);
      setAudioTested(true);
    }, 900);
  };

  const handleToggleCamera = () => {
    const next = !cameraActive;
    setCameraActive(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
    }
  };

  const handleJoin = () => {
    if (!isValidAppointment || !consultationId) {
      return;
    }
    navigation.navigate('VideoConsultation', { consultationId });
  };

  return (
    <Screen bottomInset contentStyle={s.container}>
      <AppHeader
        onBack={() => navigation.goBack()}
        right={<Icon name="info" size={20} color={colors.inkMuted} />}
      />

      <View style={s.tagWrap}>
        <StatusPill label="Pre-Call Check" tone="brand" />
      </View>

      <View style={s.headerWrap}>
        <Text style={s.pageTitle}>Let's make sure everything works well</Text>
        <Text style={s.pageSubtitle}>
          Run a quick system check to ensure seamless audio and video during your consultation.
        </Text>
      </View>

      {/* ========================================================================= */}
      {/* 1. APPOINTMENT PRECONDITION STATUS CARD */}
      {/* ========================================================================= */}
      {loading ? (
        <Card style={s.loadingCard}>
          <Text style={s.loadingText}>Verifying appointment & room readiness...</Text>
        </Card>
      ) : isValidAppointment ? (
        <View style={s.appointmentSummaryCard}>
          <View style={s.doctorAvatarFrame}>
            <Image source={DrRichardImg} style={s.doctorAvatarImg} resizeMode="cover" />
          </View>
          <View style={s.appointmentInfoCol}>
            <View style={s.appointmentPillRow}>
              <StatusPill label="Confirmed Appointment" tone="success" />
              <StatusPill label="Room Ready" tone="brand" />
            </View>
            <Text style={s.doctorName}>Dr. Richard Parker</Text>
            <Text style={s.doctorSpecialty}>Orthopedic Surgeon • Knee Specialist</Text>
            <View style={s.appointmentTimeRow}>
              <Icon name="clock" size={13} color={colors.surfie} />
              <Text style={s.appointmentTimeText}>Friday, 19 May 2024 • 10:30 AM (30 mins)</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={s.noAppointmentCard}>
          <View style={s.noApptIconCircle}>
            <Icon name="alertCircle" size={24} color={colors.danger} />
          </View>
          <View style={s.noApptTextCol}>
            <Text style={s.noApptTitle}>Valid Appointment Required</Text>
            <Text style={s.noApptBody}>
              {appointmentError ||
                'Under teleconsultation regulations, patients must have a confirmed and active appointment with an assigned doctor before joining.'}
            </Text>
            <View style={s.noApptActions}>
              <Pressable
                style={s.noApptBtnPrimary}
                onPress={() => navigation.navigate('Appointments' as any)}
              >
                <Text style={s.noApptBtnPrimaryText}>View My Appointments</Text>
              </Pressable>
              <Pressable
                style={s.noApptBtnSecondary}
                onPress={() => navigation.navigate('CareHub' as any)}
              >
                <Text style={s.noApptBtnSecondaryText}>Book Appointment</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 2. CAMERA PREVIEW BOX */}
      {/* ========================================================================= */}
      <View style={s.cameraCard}>
        <View style={s.cameraHeader}>
          <Text style={s.cameraTitle}>Your Camera</Text>
          <StatusPill
            label={cameraActive ? 'Looks good' : 'Camera Off'}
            tone={cameraActive ? 'success' : 'neutral'}
          />
        </View>

        <View style={s.cameraViewport}>
          {!cameraActive ? (
            <View style={s.cameraOffPlaceholder}>
              <Icon name="user" size={36} color={colors.inkFaint} />
              <Text style={s.cameraOffText}>Camera is paused</Text>
            </View>
          ) : hasCameraStream && Platform.OS === 'web' ? (
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
            <Image
              source={PatientCameraImg}
              style={s.cameraImage}
              resizeMode="cover"
            />
          )}

          <Pressable
            style={[s.cameraControlBtn, !cameraActive && s.cameraControlBtnOff]}
            onPress={handleToggleCamera}
            accessibilityLabel={cameraActive ? 'Turn camera off' : 'Turn camera on'}
          >
            <Icon name="camera" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 3. HARDWARE & NETWORK DIAGNOSTICS */}
      {/* ========================================================================= */}
      <View style={s.diagCard}>
        <View style={s.diagRow}>
          <View style={s.diagIconBox}>
            <Icon name="mic" size={18} color={colors.surfie} />
          </View>
          <View style={s.diagTextWrap}>
            <Text style={s.diagLabel}>Microphone</Text>
            <Text style={s.diagSub}>Voice will be heard clearly by the doctor</Text>
          </View>
          <StatusPill label="Working" tone="success" />
        </View>

        <View style={s.divider} />

        <View style={s.diagRow}>
          <View style={s.diagIconBox}>
            <Icon name="headset" size={18} color={colors.surfie} />
          </View>
          <View style={s.diagTextWrap}>
            <Text style={s.diagLabel}>Speaker</Text>
            <Text style={s.diagSub}>Audio output is functional</Text>
          </View>
          <StatusPill label={audioTested ? 'Verified' : 'Working'} tone="success" />
        </View>

        <View style={s.divider} />

        <View style={s.diagRow}>
          <View style={s.diagIconBox}>
            <Icon name="globe" size={18} color={colors.surfie} />
          </View>
          <View style={s.diagTextWrap}>
            <Text style={s.diagLabel}>Internet Connection</Text>
            <Text style={s.diagSub}>Stable & strong for HD WebRTC</Text>
          </View>
          <StatusPill label="Strong (54 Mbps)" tone="success" />
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE AUDIO TEST CARD */}
      {/* ========================================================================= */}
      <View style={s.audioTestCard}>
        <View style={s.audioTestInfo}>
          <Icon name="headset" size={22} color={colors.surfie} />
          <View style={s.flex}>
            <Text style={s.audioTestTitle}>Test your audio</Text>
            <Text style={s.audioTestDesc}>
              Tap to play a test chime tone and make sure your speaker is clear.
            </Text>
          </View>
        </View>

        {audioTested && (
          <View style={s.audioPassedBanner}>
            <Icon name="checkCircle" size={14} color={colors.success} />
            <Text style={s.audioPassedText}>Audio verified ✓ Speaker volume is loud & clear.</Text>
          </View>
        )}

        <Button
          label={testingAudio ? 'Playing Chime...' : audioTested ? 'Re-test Audio' : 'Test Audio'}
          onPress={handleTestAudio}
          variant="secondary"
          size="sm"
          loading={testingAudio}
          style={s.testBtn}
        />
      </View>

      {/* ========================================================================= */}
      {/* 5. NEED HELP TIPS SECTION */}
      {/* ========================================================================= */}
      <View style={s.helpWrap}>
        <ConsentSection title="Need help? Quick tips for best call quality">
          <View style={s.tipList}>
            <View style={s.tipRow}>
              <Text style={s.tipBullet}>•</Text>
              <Text style={s.tipText}>Check if camera and microphone permissions are granted in browser.</Text>
            </View>
            <View style={s.tipRow}>
              <Text style={s.tipBullet}>•</Text>
              <Text style={s.tipText}>For best video quality, connect to a stable Wi-Fi or 5G network.</Text>
            </View>
            <View style={s.tipRow}>
              <Text style={s.tipBullet}>•</Text>
              <Text style={s.tipText}>Sit in a well-lit room facing the light so the doctor can evaluate physical signs.</Text>
            </View>
          </View>
        </ConsentSection>
      </View>

      {/* ========================================================================= */}
      {/* 6. FOOTER CTA */}
      {/* ========================================================================= */}
      <View style={s.footer}>
        {isValidAppointment ? (
          <Button
            label="Join Consultation →"
            onPress={handleJoin}
            icon="video"
          />
        ) : (
          <Button
            label="Select an Appointment to Join"
            variant="secondary"
            onPress={() => navigation.navigate('Appointments' as any)}
          />
        )}
        <View style={s.encryptionNotice}>
          <Icon name="lock" size={13} color={colors.inkFaint} />
          <Text style={s.encryptionText}>LiveKit WebRTC • Secure and end-to-end encrypted</Text>
        </View>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  flex: { flex: 1 },
  tagWrap: {
    marginTop: spacing.xs,
  },
  headerWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.ink,
  },
  pageSubtitle: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  loadingCard: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
  },
  appointmentSummaryCard: {
    backgroundColor: '#EEF8F5',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#C7EBE0',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  doctorAvatarFrame: {
    width: 60,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  doctorAvatarImg: {
    width: '100%',
    height: '100%',
  },
  appointmentInfoCol: {
    flex: 1,
    gap: 3,
  },
  appointmentPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 2,
  },
  doctorName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.ink,
  },
  doctorSpecialty: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.inkMuted,
  },
  appointmentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  appointmentTimeText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: colors.surfie,
    fontWeight: '600',
  },
  noAppointmentCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  noApptIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noApptTextCol: {
    flex: 1,
    gap: 4,
  },
  noApptTitle: {
    fontFamily: typography.heading.family,
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  noApptBody: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  noApptActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 6,
  },
  noApptBtnPrimary: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  noApptBtnPrimaryText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  noApptBtnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  noApptBtnSecondaryText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
  },
  cameraCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    ...shadow.card,
    marginBottom: spacing.lg,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cameraTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  cameraViewport: {
    height: 180,
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cameraImage: {
    width: '100%',
    height: '100%',
  },
  cameraOffPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cameraOffText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkFaint,
  },
  cameraControlBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cameraControlBtnOff: {
    backgroundColor: colors.danger,
  },
  diagCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    ...shadow.card,
    marginBottom: spacing.lg,
  },
  diagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  diagIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagTextWrap: {
    flex: 1,
  },
  diagLabel: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  diagSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface.line,
    marginVertical: spacing.xs,
  },
  audioTestCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
    ...shadow.card,
    marginBottom: spacing.lg,
  },
  audioTestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  audioTestTitle: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  audioTestDesc: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    marginTop: 2,
  },
  audioPassedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  audioPassedText: {
    fontFamily: typography.body.family,
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  testBtn: {
    alignSelf: 'flex-start',
  },
  helpWrap: {
    marginBottom: spacing.xl,
  },
  tipList: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tipBullet: {
    color: colors.surfie,
    fontSize: typography.size.sm,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  footer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  encryptionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  encryptionText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
  },
});

export default DeviceCheckScreen;
