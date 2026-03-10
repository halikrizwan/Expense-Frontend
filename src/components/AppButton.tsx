import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppColors, radius, spacing } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { AppText } from './AppText';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'soft';
  iconName?: string;
  style?: ViewStyle;
}

export const AppButton: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  iconName,
  style,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;
  const textColor =
    variant === 'outline' || variant === 'soft' ? colors.primary : '#FFF';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withTiming(0.97, { duration: 100 });
  };

  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'outline' && styles.outline,
          variant === 'danger' && styles.danger,
          variant === 'soft' && styles.soft,
          isDisabled && styles.disabled,
          style,
        ]}>
        {loading ? (
          <ActivityIndicator color={variant === 'outline' ? colors.primary : '#FFF'} />
        ) : (
          <View style={styles.content}>
            {iconName ? <Icon name={iconName} size={16} color={textColor} /> : null}
            <AppText variant="label" color={textColor}>
              {title}
            </AppText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    base: {
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    soft: {
      backgroundColor: colors.primarySoft,
    },
    secondary: {
      backgroundColor: colors.secondary,
    },
    outline: {
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    danger: {
      backgroundColor: colors.danger,
    },
    disabled: {
      opacity: 0.6,
    },
  });
