/* eslint-disable react/no-unstable-nested-components */
import React, { useMemo } from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import {
  DashboardStackParamList,
  DebtsStackParamList,
  RootTabParamList,
  SettingsStackParamList,
  SplitsStackParamList,
  TransactionsStackParamList,
} from './types';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { DebtsScreen } from '../screens/DebtsScreen';
import { SplitsScreen } from '../screens/SplitsScreen';
import { CommonDataScreen } from '../screens/CommonDataScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { emitRefresh } from '../services/refreshBus';

const Tab = createBottomTabNavigator<RootTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const TransactionsStack = createNativeStackNavigator<TransactionsStackParamList>();
const DebtsStack = createNativeStackNavigator<DebtsStackParamList>();
const SplitsStack = createNativeStackNavigator<SplitsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const iconByRoute: Record<keyof RootTabParamList, string> = {
  DashboardTab: 'home-outline',
  TransactionsTab: 'wallet-outline',
  DebtsTab: 'hand-coin-outline',
  SplitsTab: 'chart-donut',
  SettingsTab: 'cog-outline',
};

const TabBarIcon = ({ routeName, color, size }: { routeName: keyof RootTabParamList; color: string; size: number }) => (
  <Icon name={iconByRoute[routeName]} color={color} size={size} />
);

const TabAnimatedButton = ({ style, children, onPress, onLongPress, accessibilityState, accessibilityLabel, testID }: any) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        onPressIn={() => { scale.value = withTiming(0.94, { duration: 90 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
        style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
};

const FloatingAddButton = ({ onPress, colors }: { onPress?: PressableProps['onPress']; colors: AppColors }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Animated.View style={[styles.fabWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.92, { duration: 90 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 130 }); }}>
        <View style={styles.fab}>
          <Icon name="plus" color="#FFF" size={24} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const DashboardStackScreen = () => (
  <DashboardStack.Navigator>
    <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} options={{ headerShown: false }} />
    <DashboardStack.Screen name="Alerts" component={AlertsScreen} options={{ headerShown: false }} />
  </DashboardStack.Navigator>
);

const TransactionsStackScreen = () => (
  <TransactionsStack.Navigator>
    <TransactionsStack.Screen name="TransactionsHome" component={TransactionsScreen} options={{ headerShown: false }} />
  </TransactionsStack.Navigator>
);

const DebtsStackScreen = () => (
  <DebtsStack.Navigator>
    <DebtsStack.Screen name="DebtsHome" component={DebtsScreen} options={{ headerShown: false }} />
  </DebtsStack.Navigator>
);

const SplitsStackScreen = () => (
  <SplitsStack.Navigator>
    <SplitsStack.Screen name="SplitsHome" component={SplitsScreen} options={{ headerShown: false }} />
  </SplitsStack.Navigator>
);

const SettingsStackScreen = () => (
  <SettingsStack.Navigator>
    <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ headerShown: false }} />
    <SettingsStack.Screen name="CommonData" component={CommonDataScreen} options={{ headerShown: false }} />
  </SettingsStack.Navigator>
);

export const RootNavigator = () => {
  const { colors } = useAppTheme();

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.surface,
        primary: colors.primary,
        text: colors.textPrimary,
        border: colors.border,
      },
    }),
    [colors],
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 66,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarButton: props => <TabAnimatedButton {...props} />,
          tabBarIcon: ({ color, size }) => <TabBarIcon routeName={route.name as keyof RootTabParamList} color={color} size={size} />,
        })}>
        <Tab.Screen
          name="DashboardTab"
          component={DashboardStackScreen}
          options={{ title: 'Home' }}
          listeners={() => ({
            tabPress: () => emitRefresh('dashboard'),
          })}
        />
        <Tab.Screen
          name="DebtsTab"
          component={DebtsStackScreen}
          options={{ title: 'Debts' }}
          listeners={() => ({
            tabPress: () => emitRefresh('debts'),
          })}
        />
        <Tab.Screen
          name="TransactionsTab"
          component={TransactionsStackScreen}
          options={{
            title: 'Add',
            tabBarButton: props => <FloatingAddButton colors={colors} onPress={props.onPress} />,
            tabBarIcon: () => null,
            tabBarLabel: () => null,
          }}
          listeners={() => ({
            tabPress: () => emitRefresh('transactions'),
          })}
        />
        <Tab.Screen
          name="SplitsTab"
          component={SplitsStackScreen}
          options={{ title: 'Splits' }}
          listeners={() => ({
            tabPress: () => emitRefresh('splits'),
          })}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsStackScreen}
          options={{ title: 'Settings' }}
          listeners={() => ({
            tabPress: () => emitRefresh('settings'),
          })}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    fabWrap: {
      top: -14,
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#1B1D33',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 6,
    },
  });
