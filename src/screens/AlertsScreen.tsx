import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedSection, AppButton, AppCard, AppHeader, AppText, EmptyState, Loading } from '../components';
import { AppColors, radius, spacing } from '../constants/theme';
import { useAppAlert } from '../context/AppAlertContext';
import { useAppTheme } from '../context/ThemeContext';
import { AppNotificationItem, useNotifications } from '../hooks/useNotifications';
import { DashboardStackParamList } from '../navigation/types';
import { formatDate } from '../utils/format';

export const AlertsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { alert } = useAppAlert();
  const { notifications, loading, refreshNotifications, acceptRequest, declineRequest } = useNotifications();

  const onAccept = async (item: AppNotificationItem) => {
    if (!item.actionUserRequestId) return;
    try {
      await acceptRequest(item.actionUserRequestId);
      await refreshNotifications();
      await alert('Accepted', 'User added to your users list.', 'success');
    } catch (error) {
      await alert('Error', error instanceof Error ? error.message : 'Could not accept request.', 'error');
    }
  };

  const onDecline = async (item: AppNotificationItem) => {
    if (!item.actionUserRequestId) return;
    try {
      await declineRequest(item.actionUserRequestId);
      await refreshNotifications();
      await alert('Declined', 'Request has been declined.', 'info');
    } catch (error) {
      await alert('Error', error instanceof Error ? error.message : 'Could not decline request.', 'error');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <AnimatedSection>
            <AppHeader
              title="Alerts"
              subtitle="Reminders and requests"
              right={(
                <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
                  <Icon name="arrow-left" size={18} color={colors.primary} />
                </Pressable>
              )}
            />
          </AnimatedSection>
        )}
        renderItem={({ item, index }) => (
          <AnimatedSection delay={Math.min(40 + index * 25, 180)}>
            <AppCard style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconWrap, item.tone === 'warning' ? styles.warningBg : styles.infoBg]}>
                    <Icon name={item.icon} size={18} color={item.tone === 'warning' ? colors.warning : colors.primary} />
                  </View>
                  <View style={styles.nameWrap}>
                    <AppText variant="bodyStrong">{item.title}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>{item.message}</AppText>
                  </View>
                </View>
                <AppText variant="caption" color={colors.textSecondary}>{formatDate(item.sortAt)}</AppText>
              </View>
              {item.kind === 'user_request' ? (
                <View style={styles.actionRow}>
                  <AppButton title="Decline" variant="outline" iconName="close" onPress={() => onDecline(item)} style={styles.actionBtn} />
                  <AppButton title="Accept" iconName="check" onPress={() => onAccept(item)} style={styles.actionBtn} />
                </View>
              ) : null}
            </AppCard>
          </AnimatedSection>
        )}
        ListEmptyComponent={loading ? <Loading label="Loading alerts..." /> : <EmptyState title="No alerts" description="No reminders or pending requests." />}
      />
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      borderRadius: radius.lg,
      gap: spacing.sm,
    },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      flex: 1,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    infoBg: {
      backgroundColor: '#F3EEFF',
    },
    warningBg: {
      backgroundColor: '#FFF2E8',
    },
    nameWrap: {
      flex: 1,
      gap: spacing.xs,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionBtn: { flex: 1 },
  });
