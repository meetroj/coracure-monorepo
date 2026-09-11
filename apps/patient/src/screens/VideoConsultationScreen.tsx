import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Avatar, StatusPill, Icon } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import DrRichardImg from '../assets/dr-richard-parker.jpg';
import PatientCameraImg from '../assets/patient-camera.jpg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type VideoScreenProp = NativeStackNavigationProp<RootStackParamList, 'VideoConsultation'>;
type VideoRouteProp = RouteProp<RootStackParamList, 'VideoConsultation'>;

export const VideoConsultationScreen = () => {
  const navigation = useNavigation<VideoScreenProp>();
  const route = useRoute<VideoRouteProp>();
  const consultationId = route.params?.consultationId || 'demo-consultation-id';

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(168); // 02:48 elapsed

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Consultation?',
      'Are you sure you want to end this video session with Dr. Richard Parker?',
      [
        { text: 'Resume Call', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => navigation.replace('Feedback', { consultationId }),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={s.header}>
        <LogoWide width={110} height={28} />
        <View style={s.headerRight}>
          <StatusPill label="Encrypted consultation" tone="success" />
          <Pressable style={s.menuBtn}>
            <Icon name="settings" size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      {/* Main Video Stage */}
      <View style={s.videoStage}>
        {/* Doctor Feed Real View */}
        <View style={s.doctorFeed}>
          <Image
            source={DrRichardImg}
            style={s.doctorLiveImage}
            resizeMode="cover"
          />

          {/* Top Overlay Banner with Doctor Name and Elapsed Timer */}
          <View style={s.timerOverlay}>
            <View style={s.timerCol}>
              <Text style={s.timerLabel}>Dr. Richard Parker</Text>
              <Text style={s.timerSub}>Orthopedic Surgeon</Text>
            </View>
            <View style={s.timerBadge}>
              <Icon name="clock" size={14} color={colors.surfie} />
              <Text style={s.timerText}>{formatTime(secondsElapsed)}</Text>
              <Text style={s.timerTag}>Time elapsed</Text>
            </View>
          </View>

          {/* Picture-in-Picture Floating Patient Self-View */}
          <View style={s.pipWindow}>
            {isVideoOff ? (
              <View style={s.pipVideoOff}>
                <Icon name="user" size={24} color={colors.inkFaint} />
              </View>
            ) : (
              <Image
                source={PatientCameraImg}
                style={s.pipImage}
                resizeMode="cover"
              />
            )}
            {isMuted && (
              <View style={s.pipMuteBadge}>
                <Icon name="mic" size={10} color={colors.white} />
              </View>
            )}
          </View>

          {/* Security Banner Overlay */}
          <View style={s.securityBanner}>
            <Icon name="shieldCheck" size={16} color={colors.surfie} />
            <Text style={s.securityText}>
              Your consultation is secure and private. End-to-end encrypted for your safety.
            </Text>
          </View>
        </View>
      </View>

      {/* In-Call Controls Bar */}
      <View style={s.controlsBar}>
        {/* Mute Button */}
        <Pressable
          style={[s.controlBtn, isMuted && s.controlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Icon name="mic" size={22} color={isMuted ? colors.white : colors.ink} />
          <Text style={[s.controlLabel, isMuted && s.controlLabelActive]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </Pressable>

        {/* Camera Toggle */}
        <Pressable
          style={[s.controlBtn, isVideoOff && s.controlBtnActive]}
          onPress={() => setIsVideoOff(!isVideoOff)}
        >
          <Icon name="camera" size={22} color={isVideoOff ? colors.white : colors.ink} />
          <Text style={[s.controlLabel, isVideoOff && s.controlLabelActive]}>
            {isVideoOff ? 'Turn On' : 'Camera'}
          </Text>
        </Pressable>

        {/* Chat */}
        <Pressable style={s.controlBtn} onPress={() => Alert.alert('In-Call Chat', 'Chat panel is open.')}>
          <Icon name="chat" size={22} color={colors.ink} />
          <Text style={s.controlLabel}>Chat</Text>
        </Pressable>

        {/* Notes */}
        <Pressable style={s.controlBtn} onPress={() => Alert.alert('Clinical Notes', 'Doctor is updating your care summary.')}>
          <Icon name="document" size={22} color={colors.ink} />
          <Text style={s.controlLabel}>Notes</Text>
        </Pressable>

        {/* End Call Button */}
        <Pressable style={s.endCallBtn} onPress={handleEndCall}>
          <Icon name="phone" size={22} color={colors.white} />
          <Text style={s.endCallLabel}>End Call</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.page,
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
  },
  videoStage: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: '#0F1A15',
    ...shadow.floating,
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
  doctorLiveName: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.white,
    marginTop: spacing.xs,
  },
  doctorLiveSub: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.surface.mintSoft,
  },
  timerOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerCol: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  timerLabel: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.white,
  },
  timerSub: {
    fontFamily: typography.body.family,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
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
    width: 90,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: '#1E2C26',
    borderWidth: 2,
    borderColor: colors.surfie,
    overflow: 'hidden',
    ...shadow.card,
  },
  pipFeed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipVideoOff: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  pipLiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.paris,
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
});

export default VideoConsultationScreen;

