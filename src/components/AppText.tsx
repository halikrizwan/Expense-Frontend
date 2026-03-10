import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { typography } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';

type Variant =
  | 'titleLg'
  | 'titleMd'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
}

export const AppText: React.FC<Props> = ({
  variant = 'body',
  color,
  style,
  children,
  ...rest
}) => {
  const { colors } = useAppTheme();

  return (
    <Text {...rest} style={[styles.base, typography[variant], { color: color || colors.textPrimary }, style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.familyRegular,
  },
});
