import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppButton, AppCard, AppText } from '../components';
import { radius, spacing } from '../constants/theme';
import { useAppTheme } from './ThemeContext';

type AlertKind = 'info' | 'success' | 'error' | 'warning';

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  kind: AlertKind;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

interface AppAlertContextValue {
  alert: (title: string, message: string, kind?: AlertKind) => Promise<void>;
  confirm: (title: string, message: string, confirmText?: string, cancelText?: string) => Promise<boolean>;
}

const AppAlertContext = createContext<AppAlertContextValue | undefined>(undefined);

export const AppAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    kind: 'info',
  });

  const close = useCallback((value: boolean) => {
    setState(current => ({ ...current, visible: false }));
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  }, []);

  const alert = useCallback((title: string, message: string, kind: AlertKind = 'info') => {
    return new Promise<void>(resolve => {
      resolverRef.current = () => resolve();
      setState({
        visible: true,
        title,
        message,
        kind,
        confirmText: 'OK',
        showCancel: false,
      });
    });
  }, []);

  const confirm = useCallback((title: string, message: string, confirmText = 'Confirm', cancelText = 'Cancel') => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
      setState({
        visible: true,
        title,
        message,
        kind: 'warning',
        confirmText,
        cancelText,
        showCancel: true,
      });
    });
  }, []);

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);

  const accent =
    state.kind === 'success'
      ? colors.success
      : state.kind === 'error'
        ? colors.danger
        : state.kind === 'warning'
          ? colors.warning
          : colors.primary;

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <Modal visible={state.visible} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          <Pressable style={styles.overlayTap} onPress={() => close(false)} />
          <View style={styles.centerWrap} pointerEvents="box-none">
            <AppCard style={styles.card}>
              <View style={[styles.badge, { backgroundColor: accent }]} />
              <AppText variant="heading" style={styles.title}>{state.title}</AppText>
              <AppText variant="body" color={colors.textSecondary} style={styles.message}>{state.message}</AppText>
              <View style={[styles.actions, !state.showCancel && styles.actionsSingle]}>
                {state.showCancel ? (
                  <AppButton title={state.cancelText || 'Cancel'} variant="outline" onPress={() => close(false)} style={styles.actionBtn} />
                ) : null}
                <AppButton
                  title={state.confirmText || 'OK'}
                  onPress={() => close(true)}
                  style={state.showCancel ? styles.actionBtn : { ...styles.actionBtn, ...styles.actionBtnSingle }}
                />
              </View>
            </AppCard>
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
};

export const useAppAlert = () => {
  const ctx = useContext(AppAlertContext);
  if (!ctx) throw new Error('useAppAlert must be used within AppAlertProvider');
  return ctx;
};

const createStyles = () =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(9, 12, 20, 0.48)',
      padding: spacing.lg,
    },
    overlayTap: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
    },
    centerWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      zIndex: 1,
      width: '100%',
      maxWidth: 420,
      gap: spacing.sm,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    badge: {
      width: 44,
      height: 6,
      borderRadius: 999,
      marginBottom: spacing.xs,
      alignSelf: 'center',
    },
    title: { textAlign: 'center' },
    message: { textAlign: 'center', lineHeight: 20 },
    actions: {
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionsSingle: {
      justifyContent: 'center',
    },
    actionBtn: {
      flex: 1,
    },
    actionBtnSingle: {
      flex: 0,
      minWidth: 140,
    },
  });
