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
import { AppColors, radius, spacing } from '../../constants/theme';
import { useAppTheme } from '../../context/ThemeContext';
import { AppText } from '../common/AppText';
import { SelectItem } from './AppSelect';

interface Props {
  label?: string;
  options: SelectItem[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export const AppMultiSelect: React.FC<Props> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select',
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  const selectedLabels = useMemo(
    () => options.filter(option => selectedValues.includes(option.value)).map(option => option.label),
    [options, selectedValues],
  );

  const summary = useMemo(() => {
    if (!selectedValues.length) return placeholder;
    if (selectedValues.length <= 2) return selectedLabels.join(', ');
    return `${selectedValues.length} selected`;
  }, [placeholder, selectedLabels, selectedValues.length]);

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return options;
    return options.filter(option => option.label.toLowerCase().includes(search));
  }, [options, query]);

  const toggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(item => item !== value));
      return;
    }
    onChange([...selectedValues, value]);
  };

  const close = () => {
    setVisible(false);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      {label ? <AppText variant="label" color={colors.textSecondary}>{label}</AppText> : null}

      <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
        <AppText numberOfLines={1} color={selectedValues.length ? colors.textPrimary : colors.textSecondary}>
          {summary}
        </AppText>
        <Icon name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHeader}>
              <AppText variant="heading">Select options</AppText>
              <TouchableOpacity onPress={close} style={styles.doneBtn}>
                <AppText variant="label" color="#FFF">Done</AppText>
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
              data={filteredOptions}
              keyExtractor={item => item.value}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={(
                <View style={styles.emptyRow}>
                  <AppText variant="caption" color={colors.textSecondary}>No results found</AppText>
                </View>
              )}
              renderItem={({ item }) => {
                const active = selectedValues.includes(item.value);
                return (
                  <Pressable style={[styles.row, active && styles.rowActive]} onPress={() => toggle(item.value)}>
                    <AppText color={active ? colors.primary : colors.textPrimary}>{item.label}</AppText>
                    <Icon
                      name={active ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                      size={20}
                      color={active ? colors.primary : colors.textSecondary}
                    />
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
      backgroundColor: colors.inputBackground,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
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
      maxHeight: '72%',
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    doneBtn: {
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.primary,
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
