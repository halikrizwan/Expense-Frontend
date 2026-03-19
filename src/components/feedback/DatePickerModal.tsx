import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppColors, radius, spacing } from '../../constants/theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';

interface Props {
  visible: boolean;
  value: Date;
  title?: string;
  confirmLabel?: string;
  embedded?: boolean;
  onClose: () => void;
  onConfirm: (value: Date) => void;
}

const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const DatePickerModal: React.FC<Props> = ({
  visible,
  value,
  title = 'Select Date',
  confirmLabel = 'Confirm',
  embedded = false,
  onClose,
  onConfirm,
}) => {
  const { colors, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const [cursor, setCursor] = useState(dayjs(value));
  const [selected, setSelected] = useState(dayjs(value));

  useEffect(() => {
    if (!visible) return;
    const next = dayjs(value);
    setCursor(next);
    setSelected(next);
  }, [value, visible]);

  const days = useMemo(() => {
    const start = cursor.startOf('month').startOf('week');
    return Array.from({ length: 42 }, (_, index) => start.add(index, 'day'));
  }, [cursor]);

  if (!visible) return null;

  const content = (
    <View style={styles.backdrop}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <AppText variant="titleMd">{title}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Pick a date from the calendar below.
              </AppText>
            </View>
            <View style={styles.iconBadge}>
              <Icon name="calendar-month" size={26} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.selectorRow}>
            <View style={styles.selectorPill}>
              <Pressable onPress={() => setCursor(current => current.subtract(1, 'month'))} hitSlop={8}>
                <Icon name="chevron-left" size={18} color={colors.textSecondary} />
              </Pressable>
              <AppText variant="bodyStrong">{cursor.format('MMMM')}</AppText>
              <Pressable onPress={() => setCursor(current => current.add(1, 'month'))} hitSlop={8}>
                <Icon name="chevron-right" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.selectorPill}>
              <Pressable onPress={() => setCursor(current => current.subtract(1, 'year'))} hitSlop={8}>
                <Icon name="chevron-left" size={18} color={colors.textSecondary} />
              </Pressable>
              <AppText variant="bodyStrong">{cursor.format('YYYY')}</AppText>
              <Pressable onPress={() => setCursor(current => current.add(1, 'year'))} hitSlop={8}>
                <Icon name="chevron-right" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekHeader}>
            {weekDays.map(day => (
              <View key={day} style={styles.weekCell}>
                <AppText
                  variant="label"
                  color={day === 'SUN' ? colors.secondary : colors.textPrimary}>
                  {day}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map(day => {
              const isCurrentMonth = day.month() === cursor.month();
              const isSelected = day.isSame(selected, 'day');
              const isToday = day.isSame(dayjs(), 'day');

              return (
                <Pressable
                  key={day.format('YYYY-MM-DD')}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => setSelected(day)}>
                  <AppText
                    variant="bodyStrong"
                    color={
                      isSelected
                        ? '#FFFFFF'
                        : !isCurrentMonth
                          ? colors.textSecondary
                          : day.day() === 0
                            ? colors.secondary
                            : colors.textPrimary
                    }>
                    {day.format('DD')}
                  </AppText>
                  {isToday && !isSelected ? <View style={styles.todayMark} /> : null}
                </Pressable>
              );
            })}
          </View>

          <AppButton
            title={confirmLabel}
            onPress={() => onConfirm(selected.toDate())}
            style={styles.confirmBtn}
          />
        </View>
      </View>
    </View>
  );

  if (embedded) {
    return content;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {content}
    </Modal>
  );
};

const createStyles = (colors: AppColors, mode: 'light' | 'dark') =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: mode === 'dark' ? 'rgba(7, 10, 20, 0.76)' : 'rgba(53, 45, 8, 0.18)',
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
    centerWrap: {
      width: '100%',
      maxWidth: 420,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 36,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: mode === 'dark' ? 0.32 : 0.14,
      shadowRadius: 28,
      elevation: 14,
      gap: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    iconBadge: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectorRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    selectorPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.inputBackground,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    weekHeader: {
      flexDirection: 'row',
      marginTop: spacing.xs,
    },
    weekCell: {
      flex: 1,
      alignItems: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: spacing.xs,
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      position: 'relative',
    },
    dayCellSelected: {
      backgroundColor: colors.secondary,
    },
    todayMark: {
      position: 'absolute',
      bottom: 8,
      width: 18,
      height: 3,
      borderRadius: 999,
      backgroundColor: colors.secondary,
    },
    confirmBtn: {
      marginTop: spacing.md,
    },
  });
