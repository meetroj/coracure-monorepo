import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/brand';
import { typeStyles } from '../theme/typography';
import { Icon } from './Icon';
import { Screen, Button } from './ui';
import { ScreenHeader } from './ScreenHeader';

/**
 * What a route shows when the record it was opened for does not exist — a
 * notification for an appointment that has gone, a stale link.
 *
 * Never a blank screen and never a silent fallback to some other patient:
 * the doctor is told plainly and given the way back.
 */
export const NotFound = ({
  onBack,
  what = 'item',
  testID = 'not-found',
}: {
  onBack: () => void;
  what?: string;
  testID?: string;
}) => (
  <Screen testID={testID} header={<ScreenHeader onBack={onBack} />}>
    <View style={s.wrap}>
      <View style={s.icon}>
        <Icon name="alertCircle" size={28} color={colors.warn} />
      </View>
      <Text style={s.title}>Could not open this {what}</Text>
      <Text style={s.body}>
        It may have been moved or is no longer available to you. Nothing was changed.
      </Text>
      <Button testID="not-found-back" label="Go back" icon="arrowLeft" variant="secondary" onPress={onBack} style={s.btn} />
    </View>
  </Screen>
);

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl * 1.5, gap: spacing.sm },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.warnSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typeStyles.sectionTitle, color: colors.ink, textAlign: 'center' },
  body: { ...typeStyles.body, color: colors.inkMuted, textAlign: 'center' },
  btn: { marginTop: spacing.lg, alignSelf: 'stretch' },
});

export default NotFound;
