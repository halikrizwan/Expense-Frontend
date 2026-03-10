import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { AppText } from './AppText';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export const AppHeader: React.FC<Props> = ({ title, subtitle, right }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <AppText variant="titleMd">{title}</AppText>
        {subtitle ? (
          <AppText variant="label" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
};

const createStyles = () =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    left: {
      gap: spacing.xs,
      flex: 1,
      paddingRight: spacing.md,
    },
  });
