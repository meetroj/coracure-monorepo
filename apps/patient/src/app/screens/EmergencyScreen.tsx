import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useEmergencyGuidance } from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import { Button, Icon, Screen } from '@coracure/ui';
import { useT } from '@coracure/i18n';

import { EmergencyGuidanceBody } from '../../components/EmergencyGuidance';
import { clearDraft, draftKeys } from '../../lib/drafts';
import { useCareFlow } from '../flow/CareFlowProvider';
import { useNavigator, useRouteParams } from '../navigation/Navigator';

/**
 * PT-09-02 and PT-18-02 — emergency guidance.
 *
 * Reached two ways, and both matter:
 *
 * 1. **From a crisis search.** `POST /v1/search` returned `crisis: true` and the
 *    structured guidance travelled here through the care flow. `fromSearch` is
 *    true and dismissal returns to a cleared search.
 * 2. **From the persistent entry point** on every main patient screen, with no
 *    search involved. Guidance is then read from `GET /v1/care-hub/emergency`.
 *
 * *** THE COPY AND THE NUMBERS ARE CONFIGURATION, NOT CODE. *** PT-09-02:
 * "Guidance copy comes from configuration and changes with no app release." A
 * helpline that has changed number is worse than no helpline, so nothing here
 * carries a number of its own. When the backend returns nothing, the fallback
 * points at local emergency services — true everywhere, and it cannot go stale.
 *
 * *** DISMISSAL IS EXPLICIT. *** There is no scrim to tap and no swipe-to-close.
 * Somebody who has just typed that they want to hurt themselves should not lose
 * this screen by brushing its edge. Booking stays reachable afterwards, which
 * PT-09-02 requires — this is an interruption, not a dead end.
 */

/** The heart-and-pulse mark. Drawn, not an asset — it scales and recolours. */
const EmergencyMark = ({ size = 96 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityElementsHidden>
    <Defs>
      <LinearGradient id="em-ring" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={colors.danger} stopOpacity="0.16" />
        <Stop offset="1" stopColor={colors.danger} stopOpacity="0.06" />
      </LinearGradient>
    </Defs>
    <Circle cx="60" cy="60" r="56" fill="url(#em-ring)" />
    <Circle cx="60" cy="60" r="42" fill={colors.dangerSoft} />
    <Path
      d="M60 86l-7-6.3C38.5 66.6 30 58.9 30 49.2A13.2 13.2 0 0143.2 36c4.4 0 8.9 2.2 13.3 7.3 4.4-5.1 8.9-7.3 13.3-7.3A13.2 13.2 0 0190 49.2c0 9.7-8.5 17.4-23 30.5L60 86z"
      fill={colors.danger}
    />
    <Path
      d="M36 58h9l4-7 6.5 13.5L60 58h11"
      stroke={colors.white}
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

export const EmergencyScreen = () => {
  const t = useT();
  const { back, canGoBack, reset: resetNav } = useNavigator();
  const params = useRouteParams('emergency');
  const flow = useCareFlow();

  const fromSearch = params?.fromSearch === true;
  // Only fetched when there is no structured guidance already in hand — a crisis
  // search carries its own, and it is the better shape.
  const guidance = useEmergencyGuidance(!flow.crisis);

  const dismiss = () => {
    if (fromSearch) {
      // Clear the query with the interrupt so the ordinary flow resumes from a
      // clean state, not one tap from re-triggering the same screen.
      //
      // *** THE DRAFT HAS TO GO TOO. *** The assistant's input is a draft that
      // deliberately survives navigation (SH-03), so clearing only the flow
      // would leave "i want to die" sitting in the box on return — the exact
      // thing this dismissal exists to spare somebody.
      clearDraft(draftKeys.assistantQuery);
      flow.setCrisis(null);
      flow.setResults(null);
      resetNav('assistant');
      return;
    }
    flow.setCrisis(null);
    if (canGoBack) back();
    else resetNav('dashboard');
  };

  return (
    <Screen
      testID="emergency"
      background="white"
      bottomInset
      contentStyle={s.content}
      footer={
        <View style={s.footer}>
          <Button
            label={fromSearch ? t('emergencyScreen.backToSearch') : t('emergencyScreen.dismiss')}
            variant="secondary"
            onPress={dismiss}
            accessibilityHint={t('emergencyScreen.dismissHint')}
            testID="dismiss-emergency"
          />
        </View>
      }
    >
      <View style={s.hero}>
        <EmergencyMark size={104} />
        <Text style={s.title} accessibilityRole="header">
          {t('emergencyScreen.title')}
        </Text>
        <Text style={s.lede}>{t('emergencyScreen.lede')}</Text>
      </View>

      <View style={s.card}>
        <EmergencyGuidanceBody
          guidance={flow.crisis}
          items={guidance.data}
          loading={!flow.crisis && guidance.isLoading}
          error={guidance.error}
          onRetry={guidance.refetch}
        />
      </View>

      {/*
        The app must never imply it can manage an emergency itself. This is the
        one place that says so in as many words.
      */}
      <View style={s.limits}>
        <Icon name="info" size={15} color={colors.inkFaint} />
        <View style={s.flex}>
          <Text style={s.limitsText}>{t('emergencyScreen.notAnEmergencyService')}</Text>
          <Text style={s.limitsText}>{t('emergencyScreen.stillBook')}</Text>
        </View>
      </View>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.xl },

  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  title: {
    fontFamily: typography.heading.family,
    fontSize: typography.size.xxxl,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginTop: spacing.sm,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  card: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#F6D5D3',
    padding: spacing.lg,
  },

  limits: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  limitsText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    lineHeight: 17,
  },

  footer: { paddingTop: spacing.sm },
});

export default EmergencyScreen;
