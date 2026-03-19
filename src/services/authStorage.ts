import * as Keychain from 'react-native-keychain';
import RNFS from 'react-native-fs';

const AUTH_SERVICE = 'com.expenses.auth';
const AUTH_LEGACY_FILE = `${RNFS.DocumentDirectoryPath}/auth_session.json`;

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName?: string | null };
}

/**
 * Migrates legacy auth session from RNFS file to Keychain (one-time).
 * Call this before attempting Keychain read on first run after upgrade.
 */
const migrateFromLegacyIfExists = async (): Promise<AuthSession | null> => {
  try {
    const exists = await RNFS.exists(AUTH_LEGACY_FILE);
    if (!exists) return null;
    const raw = await RNFS.readFile(AUTH_LEGACY_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
    const session = parsed as AuthSession;
    await RNFS.unlink(AUTH_LEGACY_FILE);
    return session;
  } catch {
    return null;
  }
};

export const saveAuthSession = async (session: AuthSession) => {
  await Keychain.setGenericPassword(AUTH_SERVICE, JSON.stringify(session), {
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    service: AUTH_SERVICE,
  });
};

export const loadAuthSession = async (): Promise<AuthSession | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({ service: AUTH_SERVICE });
    const password = credentials !== false && credentials ? credentials.password : null;
    if (!password) {
      const migrated = await migrateFromLegacyIfExists();
      if (migrated) {
        await saveAuthSession(migrated);
        return migrated;
      }
      return null;
    }
    const parsed = JSON.parse(password) as Partial<AuthSession>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
    return parsed as AuthSession;
  } catch {
    const migrated = await migrateFromLegacyIfExists();
    return migrated;
  }
};

export const clearAuthSession = async () => {
  try {
    await Keychain.resetGenericPassword({ service: AUTH_SERVICE });
  } catch {
    // Ignore; session may not exist
  }
};
