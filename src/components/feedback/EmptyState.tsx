import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../constants/theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText } from '../common/AppText';
import { AppButton } from '../common/AppButton';

interface Props {
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<Props> = ({ title, description, actionTitle, onAction }) => {
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
      {actionTitle && onAction ? (
        <AppButton title={actionTitle} onPress={onAction} style={styles.action} />
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
    action: { marginTop: spacing.sm },
  });
