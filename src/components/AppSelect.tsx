import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppColors, radius, spacing } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { AppText } from './AppText';

export interface SelectItem {
  label: string;
  value: string;
}

interface Props {
  label?: string;
  value: string;
  items: SelectItem[];
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const AppSelect: React.FC<Props> = ({
  label,
  value,
  items,
  onValueChange,
  placeholder = 'Select',
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  const selectedLabel =
    items.find(item => item.value === value)?.label || placeholder;

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;
    return items.filter(item => item.label.toLowerCase().includes(search));
  }, [items, query]);

  const close = () => {
    setVisible(false);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      {label ? <AppText variant="label" color={colors.textSecondary}>{label}</AppText> : null}

      <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
        <AppText numberOfLines={1} color={value ? colors.textPrimary : colors.textSecondary}>
          {selectedLabel}
        </AppText>
        <Icon name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHeader}>
              <AppText variant="heading">Select option</AppText>
              <TouchableOpacity onPress={close} style={styles.closeBtn}>
                <Icon name="close" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Icon name="magnify" size={18} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor={colors.textSecondary}
                style={styles.searchInput}
              />
            </View>

            <FlatList
              data={filteredItems}
              keyExtractor={item => item.value}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={(
                <View style={styles.emptyRow}>
                  <AppText variant="caption" color={colors.textSecondary}>No results found</AppText>
                </View>
              )}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => {
                      onValueChange(item.value);
                      close();
                    }}>
                    <AppText color={active ? colors.primary : colors.textPrimary}>{item.label}</AppText>
                    {active ? <Icon name="check-circle" size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { gap: spacing.xs },
    trigger: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.inputBackground,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      minHeight: 48,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(10, 14, 24, 0.45)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
      maxHeight: '70%',
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.inputBackground,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      paddingVertical: spacing.sm,
    },
    row: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    rowActive: {
      backgroundColor: colors.primarySoft,
    },
    emptyRow: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
  });
