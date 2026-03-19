import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText } from '../common/AppText';

export interface BarDataPoint {
  label: string;
  income?: number;
  expense?: number;
}

interface Props {
  data: BarDataPoint[];
  maxHeight?: number;
  barWidth?: number;
  gap?: number;
}

export const BarChart: React.FC<Props> = ({
  data,
  maxHeight = 120,
  barWidth = 24,
  gap = 8,
}) => {
  const { colors } = useAppTheme();
  const maxValue = useMemo(() => {
    let max = 0;
    data.forEach(d => {
      max = Math.max(max, d.income || 0, d.expense || 0);
    });
    return Math.max(max, 1);
  }, [data]);

  const totalWidth = data.length * (barWidth * 2 + gap) - gap;

  return (
    <View style={styles.container}>
      <Svg width={totalWidth} height={maxHeight + 24}>
        {data.map((d, i) => {
          const x = i * (barWidth * 2 + gap);
          const incomeHeight = ((d.income || 0) / maxValue) * maxHeight;
          const expenseHeight = ((d.expense || 0) / maxValue) * maxHeight;
          return (
            <React.Fragment key={d.label}>
              {incomeHeight > 0 && (
                <Rect
                  x={x}
                  y={maxHeight - incomeHeight}
                  width={barWidth}
                  height={incomeHeight}
                  rx={4}
                  fill={colors.success}
                />
              )}
              {expenseHeight > 0 && (
                <Rect
                  x={x + barWidth + gap}
                  y={maxHeight - expenseHeight}
                  width={barWidth}
                  height={expenseHeight}
                  rx={4}
                  fill={colors.secondary}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.labels}>
        {data.map(d => (
          <View key={d.label} style={styles.labelItem}>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {d.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  labels: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 4,
  },
  labelItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 36,
  },
});
