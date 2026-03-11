import { NavigatorScreenParams } from '@react-navigation/native';

export type RootTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  TransactionsTab: NavigatorScreenParams<TransactionsStackParamList>;
  DebtsTab: NavigatorScreenParams<DebtsStackParamList>;
  SplitsTab: NavigatorScreenParams<SplitsStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type DashboardStackParamList = {
  DashboardHome: { refreshAt?: number } | undefined;
  Alerts: undefined;
};

export type TransactionsStackParamList = {
  TransactionsHome: { refreshAt?: number } | undefined;
};

export type DebtsStackParamList = {
  DebtsHome: { refreshAt?: number } | undefined;
};

export type SplitsStackParamList = {
  SplitsHome: { refreshAt?: number } | undefined;
};

export type SettingsStackParamList = {
  SettingsHome: { refreshAt?: number } | undefined;
  CommonData: { tab?: 'category' | 'person' | 'group' } | undefined;
};
