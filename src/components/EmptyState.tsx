import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { AppText } from './AppText';

interface Props {
  title: string;
  description?: string;
}

export const EmptyState: React.FC<Props> = ({ title, description }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={styles.container}>
      <AppText variant="bodyStrong">{title}</AppText>
      {description ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {description}
        </AppText>
      ) : null}
    </View>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
  });
