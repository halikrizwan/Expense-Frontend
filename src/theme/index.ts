/**
 * Design system: colors, spacing, typography, shadows.
 */

export type ThemeMode = 'light' | 'dark';

export interface AppColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  primarySoft: string;
  secondarySoft: string;
  darkCard: string;
  success: string;
  danger: string;
  warning: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  chip: string;
  tabInactive: string;
  inputBackground: string;
  cardElevated: string;
}

export const lightColors: AppColors = {
  background: '#F3F4F8',
  surface: '#FFFFFF',
  primary: '#7A3FF2',
  secondary: '#FF7A3D',
  primarySoft: '#EFE7FF',
  secondarySoft: '#FFF0E9',
  darkCard: '#1F2140',
  success: '#12B76A',
  danger: '#F04438',
  warning: '#F79009',
  textPrimary: '#1A1A2E',
  textSecondary: '#7A7F99',
  border: '#ECEEF5',
  chip: '#F3EEFF',
  tabInactive: '#A3A8C0',
  inputBackground: '#FCFCFD',
  cardElevated: '#FFFFFF',
};

export const darkColors: AppColors = {
  background: '#0F1220',
  surface: '#171A2B',
  primary: '#9D71FF',
  secondary: '#FF9A67',
  primarySoft: '#262044',
  secondarySoft: '#3A291F',
  darkCard: '#24284A',
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  textPrimary: '#F5F7FF',
  textSecondary: '#9FA7C5',
  border: '#2D324A',
  chip: '#232947',
  tabInactive: '#727A98',
  inputBackground: '#1D2135',
  cardElevated: '#1B1F33',
};

export const themeColorsByMode: Record<ThemeMode, AppColors> = {
  light: lightColors,
  dark: darkColors,
};

export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
};

export const shadows = {
  card: {
    shadowColor: '#1B1D33',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
};

export const typography = {
  familyRegular: 'System',
  familyMedium: 'System',
  familyBold: 'System',
  titleLg: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  titleMd: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
};
