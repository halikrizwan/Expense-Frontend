import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '../context/ThemeContext';
import { AppText } from './AppText';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  size?: number;
  strokeWidth?: number;
  slices: DonutSlice[];
  centerLabel?: string;
}

export const DonutChart: React.FC<Props> = ({
  size = 170,
  strokeWidth = 26,
  slices,
  centerLabel,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(
    1,
    slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0),
  );

  let offsetAccumulator = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}> 
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {slices.map(slice => {
          const value = Math.max(0, slice.value);
          const sliceLength = (value / total) * circumference;
          const strokeDasharray = `${sliceLength} ${circumference}`;
          const strokeDashoffset = -offsetAccumulator;
          offsetAccumulator += sliceLength;

          return (
            <Circle
              key={slice.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={slice.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </Svg>

      <View style={styles.center}>
        <AppText variant="caption" color={colors.textSecondary}>
          Total
        </AppText>
        <AppText variant="bodyStrong">{centerLabel || String(total)}</AppText>
      </View>
    </View>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
