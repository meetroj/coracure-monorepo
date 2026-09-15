import { typeStyles } from '../../../../../libs/typography/src';
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/ui';

const MINT = '#E8F8F2';

/**
 * Terminal state after a declined — or unanswered — instant request.
 *
 * Neutral rather than celebratory or alarming: declining is a normal action.
 * The patient's details are deliberately gone from this screen; once the
 * request reroutes, the doctor no longer has a reason to see them.
 */
export const InstantDeclinedScreen = ({
  onReturn,
  onPause,
  onBack,
}: {
  onReturn: () => void;
  onPause?: () => void;
  onBack: () => void;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={{ paddingTop: insets.top }}>
        <View style={s.appBar}>
          <Pressable testID="back" onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
            <Icon name="chevronLeft" size={24} color={colors.ink} />
          </Pressable>
          <LogoWide width={124} height={31} />
          <View style={s.statusChip}>
            <View style={s.liveDot} />
            <Text style={[typeStyles.body, s.statusText]}>Available Now</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.iconWrap}>
          <Icon name="reroute" size={44} color={colors.inkFaint} />
        </View>

        <Text style={[typeStyles.body, s.title]}>Request declined</Text>
        <Text style={[typeStyles.body, s.subtitle]}>
          The patient&apos;s request has been moved to another available doctor.
        </Text>

        <View style={s.routingCard}>
          <Text style={[typeStyles.body, s.routingLabel]}>Routing status</Text>
          <View style={s.routingRow}>
            <View style={s.routingIcon}>
              <Icon name="checkCircle" size={22} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={[typeStyles.body, s.routingTitle]}>Automatically rerouted</Text>
              <Text style={[typeStyles.body, s.routingBody]}>No further action is required.</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.availRow}>
          <View style={s.availIcon}>
            <Icon name="info" size={18} color={colors.surfie} />
          </View>
          <Text style={[typeStyles.body, s.availText]}>You are available to receive another instant request.</Text>
        </View>
      </ScrollView>

      <View style={[s.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button testID="return" label="Return to dashboard" onPress={onReturn} />
        <Pressable testID="pause" onPress={onPause} hitSlop={8} style={s.pauseBtn}>
          <Text style={[typeStyles.body, s.pauseText]}>Pause instant requests</Text>
        </Pressable>
        <Text style={[typeStyles.body, s.footNote]}>Patient details from this request are no longer accessible.</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.white },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.paris },
  statusText: { ...typeStyles.status, color: colors.surfie },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1, justifyContent: 'center' },

  iconWrap: {
    alignSelf: 'center',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#F1F4F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typeStyles.pageTitle, color: colors.ink, textAlign: 'center', marginTop: spacing.lg },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.sm },

  routingCard: {
    backgroundColor: MINT,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  routingLabel: { ...typeStyles.label, color: colors.inkMuted },
  routingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  routingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D6F0E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routingTitle: { ...typeStyles.cardTitle, color: colors.ink },
  routingBody: { ...typeStyles.body, color: colors.inkMuted },

  divider: { height: 1, backgroundColor: colors.surface.line, marginVertical: spacing.lg },

  availRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  availIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availText: { ...typeStyles.body, flex: 1, color: colors.inkMuted },

  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  pauseBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  pauseText: { ...typeStyles.body, color: colors.surfie },
  footNote: { ...typeStyles.helper, color: colors.inkMuted, textAlign: 'center' },
});

export default InstantDeclinedScreen;
