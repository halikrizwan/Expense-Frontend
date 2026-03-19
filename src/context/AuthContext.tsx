import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loginApi, logoutApi, meApi, refreshApi, signupApi } from '../services/backend';
import { setAccessToken, setRefreshHandler } from '../services/apiClient';
import { clearAuthSession, loadAuthSession, saveAuthSession } from '../services/authStorage';

interface User {
  id: string;
  email: string;
  displayName?: string | null;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  signup: (payload: { email: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  syncUser: (nextUser: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let refreshTokenMemory = '';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState('');
  const [loading, setLoading] = useState(false);

  const clearSession = useCallback(async () => {
    refreshTokenMemory = '';
    setAccessToken('');
    setAccessTokenState('');
    setUser(null);
    await clearAuthSession();
  }, []);

  const syncUser = useCallback(async (nextUser: User) => {
    setUser(nextUser);
    if (!accessToken || !refreshTokenMemory) return;
    await saveAuthSession({
      accessToken,
      refreshToken: refreshTokenMemory,
      user: nextUser,
    });
  }, [accessToken]);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (!refreshTokenMemory) return null;

    try {
      const refreshed = await refreshApi(refreshTokenMemory);
      setAccessToken(refreshed.accessToken);
      setAccessTokenState(refreshed.accessToken);
      refreshTokenMemory = refreshed.refreshToken;

      let nextUser = user;
      if (!nextUser) {
        const me = await meApi();
        nextUser = me.user;
        setUser(me.user);
      }

      if (nextUser) {
        await saveAuthSession({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          user: nextUser,
        });
      }

      return refreshed.accessToken;
    } catch {
      await clearSession();
      return null;
    }
  }, [clearSession, user]);

  useEffect(() => {
    setRefreshHandler(refreshSession);
    return () => setRefreshHandler(null);
  }, [refreshSession]);

  const bootstrap = useCallback(async () => {
    const stored = await loadAuthSession();
    if (!stored) return;

    setAccessToken(stored.accessToken);
    setAccessTokenState(stored.accessToken);
    refreshTokenMemory = stored.refreshToken;
    setUser(stored.user);

    try {
      const me = await meApi();
      setUser(me.user);
      await saveAuthSession({
        accessToken: stored.accessToken,
        refreshToken: refreshTokenMemory,
        user: me.user,
      });
    } catch {
      try {
        const refreshed = await refreshApi(refreshTokenMemory);
        setAccessToken(refreshed.accessToken);
        setAccessTokenState(refreshed.accessToken);
        refreshTokenMemory = refreshed.refreshToken;

        const me = await meApi();
        setUser(me.user);
        await saveAuthSession({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          user: me.user,
        });
      } catch {
        await clearSession();
      }
    }
  }, [clearSession]);

  const login = useCallback(async (payload: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await loginApi(payload);
      setAccessTokenState(result.accessToken);
      setAccessToken(result.accessToken);
      refreshTokenMemory = result.refreshToken;
      setUser(result.user);
      await saveAuthSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (payload: { email: string; password: string; displayName?: string }) => {
    setLoading(true);
    try {
      await signupApi(payload);
      await login({ email: payload.email, password: payload.password });
    } finally {
      setLoading(false);
    }
  }, [login]);

  const logout = useCallback(async () => {
    try {
      if (refreshTokenMemory) {
        await logoutApi(refreshTokenMemory);
      }
    } catch {
      // ignore logout errors
    }

    refreshTokenMemory = '';
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, accessToken, loading, login, signup, logout, bootstrap, syncUser }),
    [accessToken, bootstrap, loading, login, logout, signup, syncUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
