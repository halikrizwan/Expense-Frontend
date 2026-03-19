import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppColors, ThemeMode, themeColorsByMode } from '../constants/theme';
import { useAuth } from './AuthContext';
import { getSettingsApi } from '../services/backend';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: AppColors;
  loading: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getSettingsApi()
      .then(settings => {
        if (!cancelled && settings.theme === 'dark') {
          setModeState('dark');
        }
      })
      .catch(() => {
        // Keep default 'light' on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const toggleMode = useCallback(async () => {
    setModeState(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      colors: themeColorsByMode[mode],
      loading,
      setMode,
      toggleMode,
    }),
    [mode, loading, setMode, toggleMode],
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
