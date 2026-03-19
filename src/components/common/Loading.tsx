import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { spacing } from '../../constants/theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText } from './AppText';

interface Props {
  label?: string;
}

export const Loading: React.FC<Props> = ({ label = 'Loading...' }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </View>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
  });
