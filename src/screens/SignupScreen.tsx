import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton, AppCard, AppInput, AppText } from '../components';
import { AppColors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useAppAlert } from '../context/AppAlertContext';
import { useAppTheme } from '../context/ThemeContext';

export const SignupScreen = ({ onLoginPress }: { onLoginPress: () => void }) => {
  const { colors } = useAppTheme();
  const { signup, loading } = useAuth();
  const { alert } = useAppAlert();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.bgGrid} />
      <View style={styles.bgOrb} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}><Icon name="wallet-outline" size={22} color="#FFF" /></View>
          <View style={styles.logoBadgeAlt}><Icon name="chart-donut" size={20} color={colors.primary} /></View>
        </View>

        <AppCard style={styles.card}>
          <AppText variant="titleMd">Create Account</AppText>
          <AppText variant="caption" color={colors.textSecondary}>Start sharing expenses and tracking money with your network.</AppText>

          <View style={styles.formArea}>
            <AppInput label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
            <AppInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
            <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Min 8 characters" />
          </View>

          <AppButton
            title="Create Account"
            loading={loading}
            onPress={async () => {
              try {
                await signup({ displayName: displayName.trim() || undefined, email: email.trim(), password });
              } catch (error) {
                await alert('Signup failed', error instanceof Error ? error.message : 'Unable to signup.', 'error');
              }
            }}
          />
          <AppButton title="Back to Login" variant="outline" onPress={onLoginPress} />
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxl,
      justifyContent: 'center',
      gap: spacing.md,
    },
    bgGrid: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 1,
      borderColor: 'transparent',
      opacity: 0.08,
      backgroundColor: colors.primarySoft,
    },
    bgOrb: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 999,
      backgroundColor: colors.secondarySoft,
      bottom: -90,
      right: -60,
    },
    logoRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
    },
    logoBadge: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoBadgeAlt: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    formArea: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
  });
