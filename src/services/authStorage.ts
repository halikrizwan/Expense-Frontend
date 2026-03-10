import RNFS from 'react-native-fs';

const AUTH_FILE = `${RNFS.DocumentDirectoryPath}/auth_session.json`;

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName?: string | null };
}

export const saveAuthSession = async (session: AuthSession) => {
  await RNFS.writeFile(AUTH_FILE, JSON.stringify(session), 'utf8');
};

export const loadAuthSession = async (): Promise<AuthSession | null> => {
  const exists = await RNFS.exists(AUTH_FILE);
  if (!exists) return null;
  const raw = await RNFS.readFile(AUTH_FILE, 'utf8');
  const parsed = JSON.parse(raw) as Partial<AuthSession>;
  if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
  return parsed as AuthSession;
};

export const clearAuthSession = async () => {
  const exists = await RNFS.exists(AUTH_FILE);
  if (exists) {
    await RNFS.unlink(AUTH_FILE);
  }
};
