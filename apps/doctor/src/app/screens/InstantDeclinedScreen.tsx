import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, Button } from '../../components/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useStore } from '../../state/store';
import { selectLiveStatus } from '../../state/selectors';
import { STATUS_LABEL } from '../../data/doctor';

/**
 * Terminal state after a declined — or unanswered — instant request.
 *
 * Neutral rather than celebratory or alarming: declining is a normal action.
 * The patient's details are deliberately gone from this screen; once the
 * request reroutes, the doctor no longer has a reason to see them.
 */
export const InstantDeclinedScreen = ({
  expired = false,
  onReturn,
  onPause,
  onBack,
}: {
  /** The request timed out rather than being declined. */
  expired?: boolean;
  onReturn: () => void;
  /** Stops instant requests (status becomes Scheduled Only). Hidden once they are already off. */
  onPause?: () => void;
  onBack: () => void;
}) => {
  const status = useStore(selectLiveStatus);
  const available = status === 'available';

  return (
    <Screen
      testID="instant-declined"
      background={colors.white}
      contentStyle={s.center}
      header={
        <ScreenHeader
          onBack={onBack}
          right={
            <View style={s.statusChip}>
              <View style={[s.liveDot, !available && s.liveDotOff]} />
              <Text style={[s.statusText, !available && s.statusTextOff]}>{STATUS_LABEL[status]}</Text>
            </View>
          }
        />
      }
      footer={
        <View style={s.actions}>
          <Button testID="return" label="Return to dashboard" onPress={onReturn} />
          {available && !!onPause && (
            <Pressable testID="pause" onPress={onPause} hitSlop={8} style={s.pauseBtn} accessibilityRole="button">
              <Text style={s.pauseText}>Pause instant requests</Text>
            </Pressable>
          )}
          <Text style={s.footNote}>Patient details from this request are no longer accessible.</Text>
        </View>
      }
    >
      <View style={s.body}>
        <View style={s.iconWrap}>
          <Icon name={expired ? 'clock' : 'reroute'} size={42} color={colors.inkFaint} />
        </View>

        <Text style={s.title} accessibilityRole="header">
          {expired ? 'Request expired' : 'Request declined'}
        </Text>
        <Text style={s.subtitle}>
          {expired
            ? 'The request was not answered in time and has moved to another available doctor.'
            : 'The patient’s request has been moved to another available doctor.'}
        </Text>

        <View style={s.routingCard}>
          <Text style={s.routingLabel}>Routing status</Text>
          <View style={s.routingRow}>
            <View style={s.routingIcon}>
              <Icon name="checkCircle" size={22} color={colors.surfie} />
            </View>
            <View style={s.flex}>
              <Text style={s.routingTitle}>Automatically rerouted</Text>
              <Text style={s.routingBody}>No further action is required.</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.availRow}>
          <View style={s.availIcon}>
            <Icon name="info" size={18} color={colors.surfie} />
          </View>
          <Text style={s.availText}>
            {available
              ? 'You are available to receive another instant request.'
              : `Your status is ${STATUS_LABEL[status]}, so instant requests will not reach you.`}
          </Text>
        </View>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  center: { flexGrow: 1, justifyContent: 'center' },
  body: { paddingHorizontal: spacing.lg },

  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.paris },
  liveDotOff: { backgroundColor: colors.inkFaint },
  statusText: { ...typeStyles.status, color: colors.surfie },
  statusTextOff: { color: colors.inkMuted },

  iconWrap: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F1F4F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typeStyles.pageTitle, color: colors.ink, textAlign: 'center', marginTop: spacing.lg },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.sm },

  routingCard: { backgroundColor: colors.surface.mint, borderRadius: radius.card, padding: spacing.md, marginTop: spacing.xl },
  routingLabel: { ...typeStyles.caption, color: colors.inkMuted },
  routingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  routingIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D6F0E4', alignItems: 'center', justifyContent: 'center' },
  routingTitle: { ...typeStyles.cardTitle, color: colors.ink },
  routingBody: { ...typeStyles.body, color: colors.inkMuted },

  divider: { height: 1, backgroundColor: colors.surface.line, marginVertical: spacing.lg },

  availRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  availIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface.mint, alignItems: 'center', justifyContent: 'center' },
  availText: { ...typeStyles.body, flex: 1, color: colors.inkMuted },

  actions: { gap: spacing.xs },
  pauseBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  pauseText: { ...typeStyles.button, color: colors.surfie },
  footNote: { ...typeStyles.helper, color: colors.inkMuted, textAlign: 'center' },
});

export default InstantDeclinedScreen;
