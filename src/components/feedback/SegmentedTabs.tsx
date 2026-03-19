import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppColors, radius, spacing } from '../../constants/theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText } from '../common/AppText';

interface Item {
  key: string;
  label: string;
}

interface Props {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
}

const SegmentedItem = ({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: AppColors;
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.itemWrap, animatedStyle]}>
      <Pressable
        style={[styles.item, active && styles.active]}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 90 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
        onPress={onPress}>
        <AppText variant="label" color={active ? '#FFF' : colors.textSecondary}>
          {label}
        </AppText>
      </Pressable>
    </Animated.View>
  );
};

export const SegmentedTabs: React.FC<Props> = ({ items, value, onChange }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {items.map(item => {
        const active = item.key === value;
        return (
          <SegmentedItem
            key={item.key}
            label={item.label}
            active={active}
            onPress={() => onChange(item.key)}
            colors={colors}
          />
        );
      })}
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xs,
      gap: spacing.xs,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
    },
    active: {
      backgroundColor: colors.primary,
    },
    itemWrap: {
      flex: 1,
    },
  });
