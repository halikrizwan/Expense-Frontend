import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AppColors, ThemeMode, colors, themeColorsByMode } from '../constants/theme';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: AppColors;
  loading: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('light');

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    Object.assign(colors, themeColorsByMode[nextMode]);
  }, []);

  const toggleMode = useCallback(async () => {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    await setMode(nextMode);
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      colors: themeColorsByMode[mode],
      loading: false,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return ctx;
};
