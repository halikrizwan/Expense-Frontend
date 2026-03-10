import React, { useMemo } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { AppColors, radius, shadows, spacing } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';

export const AppCard: React.FC<ViewProps> = ({ style, children, ...rest }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      ...shadows.card,
    },
  });
