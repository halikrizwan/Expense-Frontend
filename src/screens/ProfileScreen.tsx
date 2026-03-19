import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AnimatedSection, AppButton, AppCard, AppHeader, AppInput, AppText } from '../components';
import { AppColors, radius, spacing } from '../constants/theme';
import { useAppAlert } from '../context/AppAlertContext';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { SettingsStackParamList } from '../navigation/types';
import { getMyProfileApi, updateMyProfileApi } from '../services/backend';

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { colors } = useAppTheme();
  const { user, syncUser } = useAuth();
  const { alert } = useAppAlert();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [memberSince, setMemberSince] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { user: profile } = await getMyProfileApi();
        setEmail(profile.email);
        setDisplayName(profile.displayName || '');
        setMemberSince(profile.createdAt.slice(0, 10));
      } catch (error) {
        await alert('Error', error instanceof Error ? error.message : 'Could not load profile.', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [alert]);

  const onSave = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      await alert('Validation', 'Email is required.', 'warning');
      return;
    }
    if (newPassword && !currentPassword) {
      await alert('Validation', 'Enter your current password to set a new one.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { user: profile } = await updateMyProfileApi({
        email: trimmedEmail,
        displayName: displayName.trim() || null,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      await syncUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
      });
      setCurrentPassword('');
      setNewPassword('');
      await alert('Success', 'Profile updated.', 'success');
    } catch (error) {
      await alert('Error', error instanceof Error ? error.message : 'Could not update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedSection>
          <AppHeader
            title="Profile"
            subtitle="Manage your account details"
            left={(
              <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
                <Icon name="arrow-left" size={22} color={colors.textPrimary} />
              </Pressable>
            )}
          />
        </AnimatedSection>

        <AnimatedSection delay={40}>
          <AppCard>
            <AppText variant="heading">Account Details</AppText>
            <View style={styles.formSection}>
              <AppInput
                label="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
              />
              <AppInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
              />
              <AppText variant="caption" color={colors.textSecondary}>
                Member since {memberSince || '...'}
              </AppText>
            </View>
          </AppCard>
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <AppCard>
            <AppText variant="heading">Password</AppText>
            <View style={styles.formSection}>
              <AppInput
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Required to change password"
              />
              <AppInput
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Leave blank to keep current password"
              />
            </View>
          </AppCard>
        </AnimatedSection>

        <AnimatedSection delay={120}>
          <AppButton
            title={loading ? 'Loading...' : 'Save Profile'}
            iconName="content-save-outline"
            onPress={onSave}
            loading={saving}
            disabled={loading || saving}
          />
        </AnimatedSection>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    formSection: {
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
  });
