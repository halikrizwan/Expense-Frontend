import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppColors, spacing } from '../../constants/theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText } from './AppText';

interface Props {
  label: string;
  active?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export const Chip: React.FC<Props> = ({ label, active, onPress, onLongPress }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => { scale.value = withTiming(0.96, { duration: 90 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
        style={[styles.base, active ? styles.active : styles.inactive]}>
        <AppText variant="label" color={active ? colors.primary : colors.textSecondary}>
          {label}
        </AppText>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    base: {
      borderRadius: 999,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
    },
    active: {
      backgroundColor: colors.chip,
      borderColor: colors.primary,
    },
    inactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
  });
