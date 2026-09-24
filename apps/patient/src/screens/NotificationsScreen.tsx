import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing, typography } from '@coracure/brand';
import { Icon, type IconName } from '@coracure/ui';
import LogoWide from '../assets/brand/logo-wide.svg';
import PatientTabBar from '../components/PatientTabBar';
import { notificationsApi, type NotificationRecord } from '@coracure/api';

export const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'unread' | 'past'>('unread');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(data || []);
    } catch {
      // API fallback handles empty
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'read', readAt: new Date().toISOString() }))
      );
    } catch {}
  };

  const handleNotificationPress = async (item: NotificationRecord) => {
    if (item.status === 'unread') {
      try {
        await notificationsApi.markRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, status: 'read', readAt: new Date().toISOString() } : n))
        );
      } catch {}
    }

    if (item.deepLinkData && typeof item.deepLinkData === 'object') {
      const { screen, consultationId } = item.deepLinkData as { screen?: string; consultationId?: string };
      if (screen) {
        navigation.navigate(screen, consultationId ? { consultationId } : undefined);
      }
    }
  };

  const getIconConfig = (code: string): { icon: IconName; bg: string; color: string } => {
    switch (code) {
      case 'CONSULTATION_CONFIRMED':
        return { icon: 'calendar', bg: '#EEF8F5', color: colors.surfie };
      case 'FILE_REQUEST_OPEN':
        return { icon: 'alertTriangle', bg: '#FEF3C7', color: '#D97706' };
      case 'CARE_PLAN_UPDATED':
        return { icon: 'heart', bg: '#E0F2FE', color: '#0284C7' };
      case 'PRESCRIPTION_FINALIZED':
        return { icon: 'clipboard', bg: '#DCFCE7', color: '#16A34A' };
      default:
        return { icon: 'bell', bg: '#EEF8F5', color: colors.surfie };
    }
  };

  const formatTimestamp = (iso: string): string => {
    const d = new Date(iso);
    const diffHours = (Date.now() - d.getTime()) / (1000 * 3600);
    if (diffHours < 2) return '10:30 AM';
    if (diffHours < 24) return 'Yesterday 04:30 PM';
    return '18 May, 02:00 PM';
  };

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;
  const displayList = notifications.filter((n) => {
    if (activeTab === 'unread') return n.status === 'unread';
    return n.status === 'read';
  });

  return (
    <View style={s.container}>
      {/* Header Bar */}
      <View style={s.headerBar}>
        <Pressable
          style={s.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrowLeft" size={20} color={colors.ink} />
        </Pressable>

        <LogoWide width={110} height={28} />

        <Pressable
          style={s.headerIconBtn}
          onPress={fetchNotifications}
          accessibilityRole="button"
          accessibilityLabel="Refresh notifications"
        >
          <Icon name="bell" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.surfie} />
        }
      >
        {/* Title */}
        <View style={s.titleWrap}>
          <Text style={s.pageTitle}>Notifications 🔔</Text>
          <Text style={s.pageSubtitle}>
            Stay updated on your care & appointments
          </Text>
        </View>

        {/* Tab Segment & Mark Read Row */}
        <View style={s.tabsRow}>
          <View style={s.segmentContainer}>
            <Pressable
              style={[s.segmentBtn, activeTab === 'unread' && s.segmentBtnActive]}
              onPress={() => setActiveTab('unread')}
              accessibilityRole="button"
              accessibilityLabel="Unread notifications"
            >
              <Text style={[s.segmentText, activeTab === 'unread' && s.segmentTextActive]}>
                Unread
              </Text>
              {unreadCount > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={[s.segmentBtn, activeTab === 'past' && s.segmentBtnActive]}
              onPress={() => setActiveTab('past')}
              accessibilityRole="button"
              accessibilityLabel="Past notifications"
            >
              <Text style={[s.segmentText, activeTab === 'past' && s.segmentTextActive]}>
                Past
              </Text>
            </Pressable>
          </View>

          {unreadCount > 0 && (
            <Pressable
              onPress={handleMarkAllRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Text style={s.markAllLink}>Mark all as read</Text>
            </Pressable>
          )}
        </View>

        {/* Notifications List */}
        {isLoading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color={colors.surfie} />
          </View>
        ) : (
          <View style={s.notifsList}>
            {displayList.map((item) => {
              const iconCfg = getIconConfig(item.templateCode);
              const isUnread = item.status === 'unread';

              return (
                <Pressable
                  key={item.id}
                  style={[s.notifCard, isUnread && s.notifCardUnread]}
                  onPress={() => handleNotificationPress(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <View style={[s.iconCircle, { backgroundColor: iconCfg.bg }]}>
                    <Icon name={iconCfg.icon} size={20} color={iconCfg.color} />
                  </View>

                  <View style={s.cardTextCol}>
                    <View style={s.cardTitleRow}>
                      <Text style={s.cardTitle}>{item.title}</Text>
                      <Text style={s.timeText}>{formatTimestamp(item.createdAt)}</Text>
                    </View>
                    <Text style={s.cardBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                  </View>

                  <View style={s.cardRightAction}>
                    {isUnread && <View style={s.unreadDot} />}
                    <Icon name="chevronRight" size={16} color={colors.inkFaint} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* All Caught Up Illustration Card */}
        <View style={s.caughtUpCard}>
          <View style={s.caughtUpIconCircle}>
            <Icon name="shieldCheck" size={26} color={colors.surfie} />
          </View>
          <Text style={s.caughtUpTitle}>All caught up!</Text>
          <Text style={s.caughtUpSub}>You have seen all notifications.</Text>
        </View>
      </ScrollView>

      {/* 5-Tab Bar */}
      <PatientTabBar activeTab="CarePlan" />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBF9',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  titleWrap: {
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 17,
  },
  segmentBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  segmentTextActive: {
    color: colors.surfie,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: colors.surfie,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  markAllLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.surfie,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifsList: {
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  notifCardUnread: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FAFDFB',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    gap: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  timeText: {
    fontSize: 10,
    color: colors.inkFaint,
  },
  cardBody: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  cardRightAction: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfie,
  },
  caughtUpCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF8F5',
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  caughtUpIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  caughtUpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  caughtUpSub: {
    fontSize: 12,
    color: colors.inkMuted,
  },
});

export default NotificationsScreen;
