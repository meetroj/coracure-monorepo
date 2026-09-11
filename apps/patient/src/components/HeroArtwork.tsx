import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '@coracure/brand';
import { Icon } from '@coracure/ui';
import { useT } from '@coracure/i18n';

/** Generic generated marketing photography; never an assigned-provider portrait. */
export const HeroArtwork = ({ compact = false }: { compact?: boolean }) => {
  const t = useT();
  return <View style={[s.frame, compact && { height: 210 }]}>
    <Image source={require('../assets/consultation-hero.png')} style={s.photo} resizeMode="cover"
      accessibilityLabel="A clinician listening to a patient during a consultation" />
    <View style={[s.badge, { top: -12, right: 18 }]}>
      <Icon name="shieldCheck" size={22} color={colors.surfie} />
      <Text style={s.badgeText}>{t('welcome.trustedProfessionals')}</Text>
    </View>
    <View style={[s.badge, { bottom: 12, right: 8 }]}>
      <Icon name="calendar" size={22} color={colors.surfie} />
      <Text style={s.badgeText}>{t('welcome.easyAppointments')}</Text>
    </View>
  </View>;
};
export const HeroStats = () => {
  const t = useT();
  return <View style={s.stats}>
    {(['Patients', 'Specialties'] as const).map((key, i) => <View key={key} style={[s.stat, i === 1 && s.divider]}>
      <View style={s.statIcon}><Icon name={i ? 'shieldCheck' : 'user'} size={21} color={colors.surfie} /></View>
      <View style={{ flex: 1 }}><Text style={s.value}>{t(`welcome.stat${key}Value`)}</Text>
        <Text style={s.label}>{t(`welcome.stat${key}Label`)}</Text></View>
    </View>)}
  </View>;
};
const s = StyleSheet.create({
  frame: { height: 270, position: 'relative', marginTop: 12 },
  photo: { width: '100%', height: '100%', borderRadius: 28 },
  badge: { position: 'absolute', width: 84, alignItems: 'center', gap: 5, padding: 10,
    backgroundColor: colors.white, borderRadius: radius.md, ...shadow.card },
  badgeText: { fontSize: 10, lineHeight: 14, textAlign: 'center', color: colors.ink, fontWeight: '600' },
  stats: { flexDirection: 'row', paddingVertical: 16, backgroundColor: colors.white,
    borderRadius: radius.card, borderWidth: 1, borderColor: colors.surface.line },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  divider: { borderLeftWidth: 1, borderLeftColor: colors.surface.line },
  statIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface.selected,
    alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 14, fontWeight: '700', color: colors.ink },
  label: { fontSize: 10, lineHeight: 14, color: colors.inkMuted },
});
export default HeroArtwork;
