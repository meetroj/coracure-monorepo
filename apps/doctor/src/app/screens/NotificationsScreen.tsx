import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, EmptyState, Note } from '../../components/ui';
import { ScreenHeader, HeaderTextAction } from '../../components/ScreenHeader';
import { useStore } from '../../state/store';
import { selectNotifications } from '../../state/selectors';
import { markAllNotificationsRead } from '../../state/actions';
import { NOTIF_META, notifGroup, notifTimeLabel, type AppNotification } from '../../data/messaging';

const TONE = {
  brand: { fg: colors.surfie, bg: colors.successSoft },
  warn: { fg: colors.warn, bg: colors.warnSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
};

const GROUPS: { key: 'today' | 'earlier'; title: string }[] = [
  { key: 'today', title: 'Today' },
  { key: 'earlier', title: 'Earlier' },
];

/**
 * Notifications inbox.
 *
 * Every row opens the record it names — an appointment, an alert, a document
 * — by its id, never a generic screen. Unread rows are marked, and opening one
 * marks it read, which is what the badge on the tab headers counts.
 */
export const NotificationsScreen = ({
  onBack,
  onOpen,
}: {
  onBack: () => void;
  onOpen: (n: AppNotification) => void;
}) => {
  const list = useStore(selectNotifications);
  const unread = list.filter((n) => !n.read).length;

  return (
    <Screen
      testID="notifications"
      header={
        <ScreenHeader
          onBack={onBack}
          title="Notifications"
          subtitle={unread ? `${unread} unread` : 'You are all caught up'}
          right={
            unread > 0 ? (
              <HeaderTextAction testID="mark-all-read" label="Mark all read" onPress={markAllNotificationsRead} />
            ) : undefined
          }
        />
      }
    >
      {list.length === 0 && <EmptyState icon="bell" title="No notifications" body="Updates about your patients will appear here." />}

      {GROUPS.map((g) => {
        const rows = list.filter((n) => notifGroup(n) === g.key);
        if (rows.length === 0) return null;
        return (
          <View key={g.key} style={s.group}>
            <Text style={s.groupTitle}>{g.title}</Text>
            {rows.map((n) => {
              const meta = NOTIF_META[n.kind];
              const tone = TONE[meta.tone];
              return (
                <Pressable
                  key={n.id}
                  testID={`notif-${n.id}`}
                  onPress={() => onOpen(n)}
                  style={({ pressed }) => [s.row, !n.read && s.rowUnread, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}. ${meta.actionLabel}`}
                >
                  <View style={[s.icon, { backgroundColor: tone.bg }]}>
                    <Icon name={meta.icon} size={18} color={tone.fg} />
                  </View>
                  <View style={s.flex}>
                    <View style={s.rowHead}>
                      {!n.read && <View testID={`unread-${n.id}`} style={[s.dot, { backgroundColor: tone.fg }]} />}
                      <Text style={[s.title, !n.read && s.titleUnread]} numberOfLines={2}>
                        {n.title}
                      </Text>
                      <Text style={s.at}>{notifTimeLabel(n)}</Text>
                    </View>
                    <Text style={s.body}>{n.body}</Text>
                    <View style={s.actionRow}>
                      <View style={[s.action, meta.actionVariant === 'primary' ? s.actionPrimary : s.actionSecondary]}>
                        <Text style={[s.actionText, meta.actionVariant === 'primary' && s.actionTextPrimary]}>{meta.actionLabel}</Text>
                        <Icon name="chevronRight" size={13} color={meta.actionVariant === 'primary' ? colors.white : colors.surfie} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      <Note tone="neutral" icon="shield">
        Notifications never contain a diagnosis.
      </Note>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.8 },
  group: { marginTop: spacing.sm },
  groupTitle: { ...typeStyles.label, color: colors.inkMuted, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  rowUnread: { backgroundColor: colors.surface.mintSoft, borderColor: colors.surface.selected },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { ...typeStyles.bodySmall, flex: 1, color: colors.ink, fontWeight: fontWeight.medium },
  titleUnread: { fontWeight: fontWeight.bold },
  at: { ...typeStyles.caption, color: colors.inkFaint },
  body: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2 },
  actionRow: { flexDirection: 'row', marginTop: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  actionPrimary: { backgroundColor: colors.surfie },
  actionSecondary: { borderWidth: 1.5, borderColor: colors.surfie },
  actionText: { ...typeStyles.buttonSmall, color: colors.surfie },
  actionTextPrimary: { color: colors.white },
});

export default NotificationsScreen;
