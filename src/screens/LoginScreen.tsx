import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppButton, AppCard, AppInput, AppText } from '../components';
import { AppColors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useAppAlert } from '../context/AppAlertContext';
import { useAppTheme } from '../context/ThemeContext';

export const LoginScreen = ({ onSignupPress }: { onSignupPress: () => void }) => {
  const { colors } = useAppTheme();
  const { login, loading } = useAuth();
  const { alert } = useAppAlert();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.bgOrbPrimary} />
      <View style={styles.bgOrbSecondary} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}><Icon name="cash-multiple" size={22} color="#FFF" /></View>
          <View style={styles.logoBadgeAlt}><Icon name="currency-usd" size={20} color={colors.primary} /></View>
        </View>

        <AppCard style={styles.card}>
          <AppText variant="titleMd">Welcome Back</AppText>
          <AppText variant="caption" color={colors.textSecondary}>Track expenses, debts, and shared payments securely.</AppText>

          <View style={styles.formArea}>
            <AppInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
            <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
          </View>

          <AppButton
            title="Login"
            loading={loading}
            onPress={async () => {
              try {
                await login({ email: email.trim(), password });
              } catch (error) {
                await alert('Login failed', error instanceof Error ? error.message : 'Unable to login.', 'error');
              }
            }}
          />
          <AppButton title="Create New Account" variant="outline" onPress={onSignupPress} />
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
    bgOrbPrimary: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      top: -90,
      right: -90,
    },
    bgOrbSecondary: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 999,
      backgroundColor: colors.secondarySoft,
      bottom: -70,
      left: -70,
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
      backgroundColor: colors.primary,
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
