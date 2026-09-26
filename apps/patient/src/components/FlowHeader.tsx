import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';

/**
 * The header every screen in the booking flow shares: a circled back arrow, the
 * wide logo centred, and one circled action on the right. The mocks draw this
 * identically on the service, doctor-list, slot and instant-request screens.
 */
export const FlowHeader = ({
  action = 'bell',
  onAction,
  actionLabel = 'Notifications',
  dot = true,
}: {
  /** Right-hand icon. The instant-request screen uses `headset` instead. */
  action?: IconName;
  onAction?: () => void;
  actionLabel?: string;
  /** The unread dot on the bell. */
  dot?: boolean;
}) => {
  const navigation = useNavigation<any>();
  return (
    <View style={s.row}>
      <Pressable
        style={s.circle}
        hitSlop={10}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Icon name="arrowLeft" size={20} color={colors.ink} />
      </Pressable>

      <LogoWide width={120} height={30} />

      <Pressable
        style={s.circle}
        hitSlop={10}
        onPress={onAction ?? (() => navigation.navigate('Notifications'))}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        <Icon name={action} size={20} color={colors.ink} />
        {dot && <View style={s.dot} />}
      </Pressable>
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfie,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
});

export default FlowHeader;
