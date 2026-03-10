import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AnimatedSection,
  AppButton,
  AppCard,
  AppHeader,
  AppInput,
  AppModal,
  AppText,
  Loading,
  SegmentedTabs,
} from '../components';
import { AppColors, radius, spacing } from '../constants/theme';
import { useAppAlert } from '../context/AppAlertContext';
import { useAppTheme } from '../context/ThemeContext';
import { useUserRequests } from '../hooks/useUserRequests';
import {
  deleteCategoryApi,
  deleteGroupApi,
  deletePersonApi,
  getCategoriesApi,
  getGroupsApi,
  getPeopleApi,
  searchUsersApi,
  updateCategoryApi,
  updateGroupApi,
  updatePersonApi,
} from '../services/backend';
import { subscribeRefresh } from '../services/refreshBus';
import { Category, Group, Person, TransactionType } from '../types/entities';
import { SettingsStackParamList } from '../navigation/types';

type CommonTab = 'category' | 'person' | 'group';
type EditKind = 'category' | 'person' | 'group';

interface EditState {
  kind: EditKind;
  id: string;
  name: string;
  type?: TransactionType;
}

export const CommonDataScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { colors } = useAppTheme();
  const { alert, confirm } = useAppAlert();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sendRequest } = useUserRequests();

  const [commonTab, setCommonTab] = useState<CommonTab>('category');
  const [commonLoading, setCommonLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<Array<{ id: string; email: string; displayName?: string | null }>>([]);

  const [editModal, setEditModal] = useState<EditState | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<TransactionType>('expense');

  const refreshCommon = useCallback(async () => {
    setCommonLoading(true);
    try {
      const [categoryRows, peopleRows, groupRows] = await Promise.all([
        getCategoriesApi(),
        getPeopleApi(),
        getGroupsApi(),
      ]);
      setCategories(categoryRows);
      setPeople(peopleRows);
      setGroups(groupRows);
    } finally {
      setCommonLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCommon();
  }, [refreshCommon]);

  useEffect(() => subscribeRefresh('settings', refreshCommon), [refreshCommon]);

  const withLoading = async (task: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    try {
      await task();
      await alert('Success', successMessage, 'success');
      await refreshCommon();
    } catch (error) {
      await alert('Error', error instanceof Error ? error.message : 'Action failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onSearchUsers = async () => {
    const q = userSearch.trim();
    if (!q) return setSearchedUsers([]);
    try {
      const rows = await searchUsersApi(q);
      setSearchedUsers(rows);
    } catch (error) {
      await alert('Error', error instanceof Error ? error.message : 'Search failed.', 'error');
    }
  };

  const onAddRegisteredUser = async (registeredUserId: string) => {
    await withLoading(async () => {
      await sendRequest(registeredUserId);
    }, 'Request sent successfully.');
  };

  const openEdit = (item: EditState) => {
    setEditModal(item);
    setEditName(item.name);
    setEditType(item.type || 'expense');
  };

  const onSaveEdit = async () => {
    if (!editModal) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      await alert('Validation', 'Name is required.', 'warning');
      return;
    }

    await withLoading(async () => {
      if (editModal.kind === 'category') {
        await updateCategoryApi(editModal.id, { name: trimmed, type: editType });
      } else if (editModal.kind === 'person') {
        await updatePersonApi(editModal.id, trimmed);
      } else {
        await updateGroupApi(editModal.id, trimmed);
      }
      setEditModal(null);
    }, 'Item updated.');
  };

  const onDelete = (kind: EditKind, id: string) => {
    const entityLabel = kind === 'category' ? 'category' : kind === 'person' ? 'user' : 'group';

    confirm(`Delete ${entityLabel}?`, 'If this item is in use, delete may be blocked.', 'Delete', 'Cancel')
      .then(async confirmed => {
        if (!confirmed) return;
        await withLoading(async () => {
          if (kind === 'category') await deleteCategoryApi(id);
          if (kind === 'person') await deletePersonApi(id);
          if (kind === 'group') await deleteGroupApi(id);
        }, `${entityLabel[0].toUpperCase()}${entityLabel.slice(1)} deleted.`);
      });
  };

  const commonItems = useMemo(() => {
    if (commonTab === 'category') {
      return categories.map(item => ({
        id: item.id,
        name: item.name,
        subtitle: item.type === 'income' ? 'Income category' : 'Expense category',
        kind: 'category' as const,
        type: item.type,
      }));
    }
    if (commonTab === 'person') {
      return people.map(item => ({
        id: item.id,
        name: item.name,
        subtitle: 'Used as payer/participant/debt person',
        kind: 'person' as const,
      }));
    }
    return groups.map(item => ({
      id: item.id,
      name: item.name,
      subtitle: 'Split expense group',
      kind: 'group' as const,
    }));
  }, [categories, commonTab, groups, people]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AnimatedSection>
          <AppHeader
            title="Common Data"
            subtitle="Manage categories, users, and groups"
            right={(
              <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={18} color={colors.primary} />
              </Pressable>
            )}
          />
        </AnimatedSection>

        <AnimatedSection delay={50}><AppCard>
          <View style={styles.commonWrap}>
            <SegmentedTabs
              items={[
                { key: 'category', label: 'Category' },
                { key: 'person', label: 'Users' },
                { key: 'group', label: 'Group' },
              ]}
              value={commonTab}
              onChange={value => setCommonTab(value as CommonTab)}
            />

            {commonTab === 'person' ? (
              <View style={styles.userSearchWrap}>
                <AppInput
                  label="Find Registered User"
                  value={userSearch}
                  onChangeText={setUserSearch}
                  autoCapitalize="none"
                  placeholder="Search by email"
                />
                <AppButton title="Search" variant="outline" iconName="magnify" onPress={onSearchUsers} />
                {searchedUsers.length ? (
                  <View style={styles.userSearchList}>
                    {searchedUsers.map(u => (
                      <View key={u.id} style={styles.userSearchRow}>
                        <View style={styles.commonMeta}>
                          <AppText variant="bodyStrong">{u.displayName || u.email}</AppText>
                          <AppText variant="caption" color={colors.textSecondary}>{u.email}</AppText>
                        </View>
                        <Pressable style={styles.iconBtn} onPress={() => onAddRegisteredUser(u.id)}>
                          <Icon name="plus" size={18} color={colors.primary} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {commonLoading ? (
              <Loading label="Loading common data..." />
            ) : commonItems.length ? (
              <View style={styles.commonList}>
                {commonItems.map(item => (
                  <View key={item.id} style={styles.commonRow}>
                    <View style={styles.commonMeta}>
                      <AppText variant="bodyStrong">{item.name}</AppText>
                      <AppText variant="caption" color={colors.textSecondary}>{item.subtitle}</AppText>
                    </View>
                    <View style={styles.commonActions}>
                      <Pressable
                        style={styles.iconBtn}
                        onPress={() =>
                          openEdit({
                            kind: item.kind,
                            id: item.id,
                            name: item.name,
                            type: item.kind === 'category' ? item.type : undefined,
                          })
                        }>
                        <Icon name="pencil-outline" size={18} color={colors.primary} />
                      </Pressable>
                      <Pressable style={styles.iconBtn} onPress={() => onDelete(item.kind, item.id)}>
                        <Icon name="trash-can-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <AppText variant="caption" color={colors.textSecondary}>No items available.</AppText>
            )}
          </View>
        </AppCard></AnimatedSection>
      </ScrollView>

      <AppModal visible={!!editModal} title="Edit Item" onClose={() => setEditModal(null)}>
        <View style={styles.modalBody}>
          <AppInput label="Name" value={editName} onChangeText={setEditName} placeholder="Enter name" />
          {editModal?.kind === 'category' ? (
            <SegmentedTabs
              items={[
                { key: 'expense', label: 'Expense' },
                { key: 'income', label: 'Income' },
              ]}
              value={editType}
              onChange={value => setEditType(value as TransactionType)}
            />
          ) : null}
          <AppButton title="Save Changes" iconName="content-save-outline" onPress={onSaveEdit} loading={busy} />
        </View>
      </AppModal>
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    commonWrap: {
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    commonList: {
      gap: spacing.sm,
    },
    userSearchWrap: {
      gap: spacing.sm,
    },
    userSearchList: {
      gap: spacing.sm,
    },
    userSearchRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.inputBackground,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    commonRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.inputBackground,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    commonMeta: {
      flex: 1,
      gap: spacing.xs,
    },
    commonActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalBody: {
      gap: spacing.md,
      paddingBottom: spacing.sm,
    },
  });
