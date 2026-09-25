import React, { useContext, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { NavigationContext } from '@react-navigation/native';

import LogoWide from '../../assets/brand/logo-wide.svg';
import { spacing } from '../../theme/brand';
import { IconButton } from '../../components/ui';
import { ActionSheet } from '../../components/BottomSheet';
import { confirm } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { selectUnreadMessageCount, selectUnreadNotificationCount } from '../../state/selectors';
import { resetDemoData, setVerification } from '../../state/actions';

/**
 * The header on every tab root: the wordmark, then notifications and
 * messages, each with an unread count derived from the records themselves.
 *
 * Demo tools. Verification is decided by an administrator, which this build
 * has no backend for. So a tester can walk the Pending → Approved / Rejected
 * states, a long press (1.5s) on the wordmark opens a small menu that moves
 * the account between them, or resets the demo data. It is deliberately
 * undiscoverable in normal use and documented for testers.
 */
export const TabHeader = () => {
  const navigation = useContext(NavigationContext);
  const notifications = useStore(selectUnreadNotificationCount);
  const messages = useStore(selectUnreadMessageCount);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <View style={s.header}>
      <Pressable
        testID="brand-logo"
        onLongPress={() => setDemoOpen(true)}
        delayLongPress={1500}
        accessibilityRole="image"
        accessibilityLabel="CoraCure"
        style={s.logo}
      >
        <LogoWide width={124} height={31} />
      </Pressable>

      {navigation && (
        <View style={s.right}>
          <IconButton
            testID="nav-notifications"
            name="bell"
            label="Notifications"
            badge={notifications}
            onPress={() => navigation.navigate('Notifications' as never)}
          />
          <IconButton
            testID="nav-messages"
            name="message"
            label="Messages"
            badge={messages}
            onPress={() => navigation.navigate('ChatList' as never)}
          />
        </View>
      )}

      <ActionSheet
        visible={demoOpen}
        title="Demo tools"
        onClose={() => setDemoOpen(false)}
        testID="demo-tools"
        actions={[
          {
            key: 'approve',
            label: 'Approve verification',
            hint: 'As if an administrator approved the account',
            icon: 'shieldCheck',
            onPress: () => {
              setVerification('approved');
              toast.show('Verification set to Approved');
            },
          },
          {
            key: 'reject',
            label: 'Reject verification',
            hint: 'Shows the issues the doctor must fix',
            icon: 'banCircle',
            onPress: () => {
              setVerification('rejected');
              toast.show('Verification set to Rejected', 'info');
            },
          },
          {
            key: 'pending',
            label: 'Set to pending review',
            icon: 'clock',
            onPress: () => {
              setVerification('pending');
              toast.show('Verification set to Pending', 'info');
            },
          },
          {
            key: 'reset',
            label: 'Reset demo data',
            hint: 'Restores patients, notes, alerts and messages',
            icon: 'refresh',
            destructive: true,
            onPress: () =>
              confirm({
                title: 'Reset demo data?',
                message: 'Every change made in this session to patients, notes, alerts and messages is undone.',
                confirmLabel: 'Reset',
                destructive: true,
                onConfirm: () => {
                  resetDemoData();
                  toast.show('Demo data reset');
                },
              }),
          },
        ]}
      />
    </View>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: 60,
  },
  logo: { paddingVertical: 4 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

export default TabHeader;
