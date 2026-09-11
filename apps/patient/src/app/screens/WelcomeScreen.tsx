import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@coracure/brand';
import { BrandBackground, Screen, StepDots, Button, useLayout } from '@coracure/ui';
import { WideLogo } from '../../components/Brand';
import { useT } from '@coracure/i18n';
import { HeroArtwork, HeroStats } from '../../components/HeroArtwork';
import { useNavigator } from '../navigation/Navigator';
export const WelcomeScreen = () => {
  const { navigate } = useNavigator();
  const { isCompact, isWide } = useLayout();
  const t = useT();
  return <BrandBackground>
    <Screen background="transparent" bottomInset testID="welcome" wide
      header={<View style={s.header}><WideLogo width={118} /></View>}
      contentStyle={[s.content, isWide && s.wide]}
      footer={<View style={s.footer}>
        <StepDots total={3} index={0} />
        <Button label={t('welcome.getStarted')} onPress={() => navigate('login')} trailingArrow testID="get-started" />
        <Button label={t('common.skip')} variant="quiet" onPress={() => navigate('login')} />
      </View>}>
      <View style={[s.copy, isWide && { flex: 1 }]}>
        <Text style={[s.title, isCompact && { fontSize: 27, lineHeight: 33 }]} accessibilityRole="header">
          {t('welcome.titleLine1')}{'\n'}<Text style={s.accent}>{t('welcome.titleLine2')}</Text>
        </Text>
        <Text style={s.lede}>{t('welcome.lede')}</Text>
      </View>
      <View style={[s.visual, isWide && { flex: 1 }]}><HeroArtwork compact={isCompact} /><HeroStats /></View>
    </Screen>
  </BrandBackground>;
};
const s = StyleSheet.create({
  header: { paddingTop: 22, paddingBottom: 12 },
  content: { gap: 20, justifyContent: 'center' },
  wide: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  copy: { gap: 12 },
  title: { fontFamily: typography.heading.family, fontSize: 30, lineHeight: 37, fontWeight: '700', color: colors.ink, letterSpacing: -0.7 },
  accent: { color: colors.surfie },
  lede: { fontFamily: typography.body.family, fontSize: 14, lineHeight: 21, color: colors.inkMuted, maxWidth: 360 },
  visual: { gap: 16 },
  footer: { gap: 8, width: '100%', maxWidth: 456, alignSelf: 'center' },
});
export default WelcomeScreen;
