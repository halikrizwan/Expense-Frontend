import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppColors, spacing } from '../../constants/theme';
import { useAppTheme } from '../../context/ThemeContext';

export const Divider = () => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <View style={styles.line} />;
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    line: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
  });
