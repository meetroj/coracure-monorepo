import React from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl } from 'react-native';

import {
  messageFor,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@coracure/api';
import { colors, radius, spacing, typography } from '@coracure/brand';
import {
  AppHeader,
  Banner,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Screen,
  Skeleton,
} from '@coracure/ui';
import { useT } from '@coracure/i18n';


import { formatWhen } from '../../lib/consultation';
import { useNavigator } from '../navigation/Navigator';

/**
 * The in-app inbox (FR-16.1).
 *
 * *** THE COPY IS NEVER COMPOSED HERE. *** `title` and `body` come from the
 * backend's templates, which are edited from the admin panel and are refused if
 * they name a diagnosis (FR-16.2). Building a sentence in the app would route
 * around that check entirely.
 */
export const NotificationsScreen = () => {
  const { back, navigate } = useNavigator();
  const t = useT();
  const list = useNotifications();
  const unread = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unreadTotal = unread.data?.unread ?? 0;

  const openNotification = (id: string, consultationId: string | null, isUnread: boolean) => {
    if (isUnread) void markRead.mutate(id).catch(() => undefined);
    // The only deep link this app can honour today is a consultation; anything
    // else stays in the inbox rather than navigating somewhere that does not
    // exist yet.
    if (consultationId) navigate('consultation', { consultationId });
  };

  return (
    <Screen
      testID="notifications"
      refreshControl={
        <RefreshControl
          refreshing={list.isFetching && list.isSuccess}
          onRefresh={() => {
            void list.refetch();
            void unread.refetch();
          }}
          tintColor={colors.surfie}
          colors={[colors.surfie]}
        />
      }
      header={
        <AppHeader
          title={t('notifications.title')}
          onBack={back}
          right={
            unreadTotal > 0 ? (
              <Pressable
                onPress={() => markAll.mutate(undefined).catch(() => undefined)}
                hitSlop={10}
                disabled={markAll.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('notifications.markAllHint', { count: unreadTotal })}
                style={({ pressed }) => [s.markAll, pressed && s.pressed]}
              >
                <Text style={s.markAllText}>
                  {markAll.isPending
                    ? t('notifications.clearing')
                    : t('notifications.markAllRead')}
                </Text>
              </Pressable>
            ) : undefined
          }
        />
      }
    >
      {!!markAll.error && (
        <Banner tone="danger" body={messageFor(markAll.error)} onDismiss={markAll.reset} />
      )}

      {list.isLoading && (
        <View style={s.list}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={78} radius={radius.card} />
          ))}
        </View>
      )}

      {list.isError && (
        <ErrorState
          title={t('notifications.loadError')}
          body={messageFor(list.error)}
          requestId={list.error?.requestId}
          onRetry={list.refetch}
        />
      )}

      {list.isSuccess && list.data.length === 0 && (
        <Card tone="mint" elevation="none">
          <EmptyState
            icon="bell"
            title={t('notifications.empty')}
            body={t('notifications.emptyBody')}
          />
        </Card>
      )}

      {!!list.data?.length && (
        <View style={s.list}>
          {list.data.map((n) => {
            const isUnread = n.readAt === null;
            return (
              <Pressable
                key={n.id}
                onPress={() => openNotification(n.id, n.consultationId, isUnread)}
                accessibilityRole="button"
                accessibilityLabel={`${isUnread ? t('notifications.unread') : ''}${n.title}. ${n.body}`}
                accessibilityHint={
                  n.consultationId ? t('notifications.opensConsultation') : undefined
                }
                style={({ pressed }) => [s.item, isUnread && s.itemUnread, pressed && s.pressed]}
              >
                <View style={[s.icon, isUnread && s.iconUnread]}>
                  <Icon
                    name={n.consultationId ? 'calendar' : 'bell'}
                    size={18}
                    color={isUnread ? colors.surfie : colors.inkFaint}
                  />
                </View>
                <View style={s.flex}>
                  <Text style={[s.title, isUnread && s.titleUnread]} numberOfLines={2}>
                    {n.title}
                  </Text>
                  <Text style={s.body} numberOfLines={3}>
                    {n.body}
                  </Text>
                  <Text style={s.when}>{formatWhen(n.createdAt)}</Text>
                </View>
                {isUnread && <View style={s.dot} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  list: { gap: spacing.sm },

  markAll: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  markAllText: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.surfie,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  itemUnread: { backgroundColor: colors.surface.mint, borderColor: '#D8F2E7' },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnread: { backgroundColor: colors.white },
  title: {
    fontFamily: typography.body.family,
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.ink,
  },
  titleUnread: { fontWeight: '800' },
  body: {
    fontFamily: typography.body.family,
    fontSize: typography.size.sm,
    color: colors.inkMuted,
    lineHeight: 19,
    marginTop: 2,
  },
  when: {
    fontFamily: typography.body.family,
    fontSize: typography.size.xs,
    color: colors.inkFaint,
    marginTop: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.paris,
    marginTop: 6,
  },
});

export default NotificationsScreen;
