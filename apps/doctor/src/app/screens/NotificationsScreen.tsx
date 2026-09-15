import { typeStyles } from '../../../../../libs/typography/src';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, spacing } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Screen, AppHeader, IconButton, PageTitle, Button } from '../../components/ui';
import { ShieldNote } from '../../components/compact';
import { notifications, NOTIF_META, type AppNotification, type NotifTarget } from '../../data/messaging';

const TONE = {
  brand: { fg: colors.surfie, bg: colors.successSoft },
  warn: { fg: colors.warn, bg: colors.warnSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
};

const GROUPS: { key: AppNotification['group']; title: string }[] = [
  { key: 'today', title: 'Today' },
  { key: 'earlier', title: 'Earlier' },
];

/**
 * Notifications inbox.
 *
 * Every row routes to an authorised destination rather than dumping the doctor
 * on a dashboard — the target is part of the notification, so a row can never
 * point somewhere the doctor is not entitled to open.
 */
export const NotificationsScreen = ({
  onBack,
  onOpen,
  onOpenMessages,
}: {
  onBack: () => void;
  onOpen: (target: NotifTarget) => void;
  onOpenMessages?: () => void;
}) => (
  <Screen>
    <AppHeader
      onBack={onBack}
      right={
        <>
          <IconButton testID="nav-notifications-bell" name="bell" badge label="Notifications" />
          <IconButton testID="nav-notifications-messages" name="message" label="Messages" onPress={onOpenMessages} />
        </>
      }
    />
    <PageTitle title="Notifications" subtitle="Stay updated on your patients and consultations" />

    {GROUPS.map((g) => {
      const rows = notifications.filter((n) => n.group === g.key);
      if (rows.length === 0) return null;
      return (
        <View key={g.key} style={s.group}>
          <Text style={[typeStyles.body, s.groupTitle]}>{g.title}</Text>
          {rows.map((n) => {
            const meta = NOTIF_META[n.kind];
            const tone = TONE[meta.tone];
            return (
              <Pressable
                key={n.id}
                testID={`notif-${n.id}`}
                onPress={() => onOpen(n.target)}
                style={s.row}
                accessibilityRole="button"
                accessibilityLabel={n.title}
              >
                <View style={[s.icon, { backgroundColor: tone.bg }]}>
                  <Icon name={meta.icon} size={17} color={tone.fg} />
                </View>
                <View style={s.flex}>
                  <View style={s.rowHead}>
                    <View style={[s.dot, { backgroundColor: tone.fg }]} />
                    <Text style={[typeStyles.body, s.title]} numberOfLines={1}>
                      {n.title}
                    </Text>
                    <Text style={[typeStyles.body, s.at]}>{n.at}</Text>
                  </View>
                  <View style={s.bodyRow}>
                    <Text style={[typeStyles.body, s.body]}>{n.body}</Text>
                    <Button
                      testID={`notif-action-${n.id}`}
                      label={meta.actionLabel}
                      variant={meta.actionVariant}
                      icon={meta.actionVariant === 'primary' ? meta.icon : undefined}
                      size="sm"
                      onPress={() => onOpen(n.target)}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      );
    })}

    <View style={s.note}>
      <ShieldNote tone="grey">Notifications never contain a diagnosis.</ShieldNote>
    </View>
  </Screen>
);

const s = StyleSheet.create({
  flex: { flex: 1 },
  group: { marginTop: spacing.md },
  groupTitle: {
    ...typeStyles.sectionTitle,
    color: colors.inkMuted,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  title: { ...typeStyles.cardTitle, flex: 1, color: colors.ink },
  at: { ...typeStyles.caption, color: colors.inkFaint },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 3 },
  body: { ...typeStyles.bodySmall, flex: 1, color: colors.inkMuted },
  note: { marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xl },
});

export default NotificationsScreen;
