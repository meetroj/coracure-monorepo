import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius, shadow } from '@coracure/brand';
import { Screen, AppHeader, Button, StatusPill, Icon, ConsentSection } from '@coracure/ui';
import PatientCameraImg from '../assets/patient-camera.jpg';
import type { RootStackParamList } from '../navigation/RootNavigator';

type DeviceCheckScreenProp = NativeStackNavigationProp<RootStackParamList, 'DeviceCheck'>;
type DeviceCheckRouteProp = RouteProp<RootStackParamList, 'DeviceCheck'>;

export const DeviceCheckScreen = () => {
  const navigation = useNavigation<DeviceCheckScreenProp>();
  const route = useRoute<DeviceCheckRouteProp>();
  const consultationId = route.params?.consultationId || 'demo-consultation-id';

  const [testingAudio, setTestingAudio] = useState(false);
  const [audioTested, setAudioTested] = useState(false);

  const handleTestAudio = () => {
    setTestingAudio(true);
    setTimeout(() => {
      setTestingAudio(false);
      setAudioTested(true);
      Alert.alert('Sound Check', 'Did you hear the sample chime clearly?', [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Audio Works', onPress: () => setAudioTested(true) },
      ]);
    }, 1200);
  };

  const handleJoin = () => {
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
        <Text style={s.pageSubtitle}>Run a quick check to ensure the best consultation experience.</Text>
      </View>

      {/* Camera Preview Box */}
      <View style={s.cameraCard}>
        <View style={s.cameraHeader}>
          <Text style={s.cameraTitle}>Your Camera</Text>
          <StatusPill label="Looks good" tone="success" />
        </View>

        <View style={s.cameraViewport}>
          <Image
            source={PatientCameraImg}
            style={s.cameraImage}
            resizeMode="cover"
          />
          <View style={s.cameraControls}>
            <View style={s.cameraControlBtn}>
              <Icon name="camera" size={18} color={colors.white} />
            </View>
          </View>
        </View>
      </View>

      {/* Diagnostics List */}
      <View style={s.diagCard}>
        <View style={s.diagRow}>
          <View style={s.diagIconBox}>
            <Icon name="mic" size={18} color={colors.surfie} />
          </View>
          <View style={s.diagTextWrap}>
            <Text style={s.diagLabel}>Microphone</Text>
            <Text style={s.diagSub}>Voice will be heard clearly</Text>
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
            <Text style={s.diagSub}>Audio will play clearly</Text>
          </View>
          <StatusPill label="Working" tone="success" />
        </View>

        <View style={s.divider} />

        <View style={s.diagRow}>
          <View style={s.diagIconBox}>
            <Icon name="globe" size={18} color={colors.surfie} />
          </View>
          <View style={s.diagTextWrap}>
            <Text style={s.diagLabel}>Internet Connection</Text>
            <Text style={s.diagSub}>Stable and strong</Text>
          </View>
          <StatusPill label="Strong" tone="success" />
        </View>
      </View>

      {/* Audio Test Card */}
      <View style={s.audioTestCard}>
        <View style={s.audioTestInfo}>
          <Icon name="headset" size={22} color={colors.surfie} />
          <View style={s.flex}>
            <Text style={s.audioTestTitle}>Test your audio</Text>
            <Text style={s.audioTestDesc}>Tap to play a test sound and make sure you can hear it.</Text>
          </View>
        </View>
        <Button
          label={testingAudio ? 'Playing...' : audioTested ? 'Re-test Audio' : 'Test Audio'}
          onPress={handleTestAudio}
          variant="secondary"
          size="sm"
          loading={testingAudio}
          style={s.testBtn}
        />
      </View>

      {/* Need Help Tips Section */}
      <View style={s.helpWrap}>
        <ConsentSection title="Need help? Quick tips for best call quality">
          <View style={s.tipList}>
            <View style={s.tipRow}>
              <Text style={s.tipBullet}>•</Text>
              <Text style={s.tipText}>Check if camera and microphone access is enabled in system permissions.</Text>
            </View>
            <View style={s.tipRow}>
              <Text style={s.tipBullet}>•</Text>
              <Text style={s.tipText}>For best video quality, connect to a stable Wi-Fi network.</Text>
            </View>
            <View style={s.tipRow}>
              <Text style={s.tipBullet}>•</Text>
              <Text style={s.tipText}>Close other applications that might be using your camera or microphone.</Text>
            </View>
          </View>
        </ConsentSection>
      </View>

      {/* Footer CTA */}
      <View style={s.footer}>
        <Button
          label="Join Consultation →"
          onPress={handleJoin}
          icon="video"
        />
        <View style={s.encryptionNotice}>
          <Icon name="lock" size={13} color={colors.inkFaint} />
          <Text style={s.encryptionText}>Your call is secure and encrypted</Text>
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
    marginBottom: spacing.lg,
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
    backgroundColor: '#EAEFE9',
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
  selfieAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  cameraControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: spacing.md,
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

