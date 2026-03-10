import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedSection, AppButton, AppCard, AppHeader, AppInput, AppText, Loading } from '../components';
import { AppColors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useAppAlert } from '../context/AppAlertContext';
import { useAppTheme } from '../context/ThemeContext';
import { useSettingsCurrency } from '../hooks/useSettingsCurrency';
import { SettingsStackParamList } from '../navigation/types';
import { resetAllApi, updateSettingsApi } from '../services/backend';
import { exportToExcel, exportToJson, importFromJson } from '../services/exportService';
import { subscribeRefresh } from '../services/refreshBus';

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { colors, mode, setMode } = useAppTheme();
  const { logout } = useAuth();
  const { alert, confirm } = useAppAlert();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const { currency, loading: currencyLoading, refresh, saveCurrency } = useSettingsCurrency();
  const [currencyInput, setCurrencyInput] = useState(currency);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCurrencyInput(currency); }, [currency]);
  useEffect(() => subscribeRefresh('settings', refresh), [refresh]);

  const withLoading = async (task: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    try { await task(); await alert('Success', successMessage, 'success'); }
    catch (error) { await alert('Error', error instanceof Error ? error.message : 'Action failed.', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <AnimatedSection><AppHeader title="Settings" subtitle="Backup and app preferences" /></AnimatedSection>

        <AnimatedSection delay={40}><AppCard>
          <AppText variant="heading">Theme</AppText>
          <View style={styles.themeRow}>
            <View style={styles.themeMeta}>
              <AppText variant="bodyStrong">Dark Mode</AppText>
              <AppText variant="caption" color={colors.textSecondary}>Current: {mode === 'dark' ? 'Dark' : 'Light'}</AppText>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={async enabled => {
                const next = enabled ? 'dark' : 'light';
                await setMode(next);
                try { await updateSettingsApi({ theme: next }); } catch {}
              }}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={mode === 'dark' ? colors.primary : '#FFFFFF'}
            />
          </View>
        </AppCard></AnimatedSection>

        <AnimatedSection delay={55}><AppCard>
          <AppText variant="heading">Common Data</AppText>
          <View style={styles.currencyContent}>
            <AppText variant="caption" color={colors.textSecondary}>Manage categories, users, and groups on a dedicated page.</AppText>
            <AppButton
              title="Open Common Data"
              iconName="database-cog-outline"
              variant="outline"
              onPress={() => navigation.navigate('CommonData')}
            />
          </View>
        </AppCard></AnimatedSection>

        <AnimatedSection delay={60}><AppCard>
          <AppText variant="heading">Currency</AppText>
          {currencyLoading ? <Loading label="Loading currency..." /> : (
            <View style={styles.currencyContent}>
              <AppText variant="caption" color={colors.textSecondary}>Current currency: {currency}</AppText>
              <AppInput value={currencyInput} onChangeText={setCurrencyInput} autoCapitalize="characters" maxLength={3} placeholder="AED" />
              <AppButton title="Save Currency" iconName="content-save-outline" onPress={async () => {
                const next = currencyInput.trim().toUpperCase();
                if (next.length !== 3) return alert('Validation', 'Currency must be a 3-letter code.', 'warning');
                await withLoading(async () => saveCurrency(next), 'Currency updated.');
              }} />
            </View>
          )}
        </AppCard></AnimatedSection>

        <AnimatedSection delay={120}><AppCard>
          <AppText variant="heading">Backup</AppText>
          <View style={styles.buttonGap}>
            <AppButton title={busy ? 'Exporting...' : 'Export to Excel'} iconName="file-excel-box-outline" onPress={async () => withLoading(async () => { await exportToExcel(); }, 'Excel file exported.')} loading={busy} />
            <AppButton title="Export to JSON" iconName="file-code-outline" variant="outline" onPress={async () => withLoading(async () => { await exportToJson(); }, 'JSON backup exported.')} disabled={busy} />
            <AppButton title="Import from JSON" iconName="file-import-outline" variant="outline" onPress={async () => withLoading(async () => importFromJson(), 'JSON backup imported.')} disabled={busy} />
          </View>
        </AppCard></AnimatedSection>

        <AnimatedSection delay={150}><AppCard>
          <AppText variant="heading">Account</AppText>
          <View style={styles.buttonGap}>
            <AppButton title="Logout" iconName="logout" variant="outline" onPress={logout} />
          </View>
        </AppCard></AnimatedSection>

        <AnimatedSection delay={180} style={styles.dangerCard}>
          <AppText variant="heading">Danger Zone</AppText>
          <AppText variant="caption" color={colors.textSecondary}>This deletes all local data on this device.</AppText>
          <AppButton title="Reset All Data" iconName="trash-can-outline" variant="danger" onPress={async () => {
            const confirmed = await confirm('Reset all data?', 'This permanently deletes all local records.', 'Reset', 'Cancel');
            if (!confirmed) return;
            await withLoading(async () => resetAllApi(), 'All data reset complete.');
          }} />
        </AnimatedSection>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: AppColors, mode: 'light' | 'dark') =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    themeRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    themeMeta: {
      flex: 1,
      gap: spacing.xs,
    },
    currencyContent: {
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    buttonGap: { marginTop: spacing.sm, gap: spacing.sm },
    dangerCard: {
      backgroundColor: mode === 'dark' ? colors.surface : '#FFF1EF',
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: mode === 'dark' ? colors.border : '#FFD9D2',
    },
  });
