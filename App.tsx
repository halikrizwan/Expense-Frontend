import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText, ErrorBoundary, Loading } from './src/components';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppAlertProvider } from './src/context/AppAlertContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { RootNavigator } from './src/navigation/RootNavigator';

const AppContent = ({ ready, error }: { ready: boolean; error: string }) => {
  const { colors, mode } = useAppTheme();
  const { user } = useAuth();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        loaderContainer: {
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        },
      }),
    [colors],
  );

  return (
    <>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {ready ? user ? <RootNavigator /> : <AuthNavigator /> : (
        <View style={styles.loaderContainer}>
          {error ? <AppText>{error}</AppText> : <Loading label="Preparing app..." />}
        </View>
      )}
    </>
  );
};

const AppBoot = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const { bootstrap } = useAuth();

  useEffect(() => {
    const run = async () => {
      try {
        await MaterialCommunityIcons.loadFont();
        await bootstrap();
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize app.');
      }
    };

    run();
  }, [bootstrap]);

  return <AppContent ready={ready} error={error} />;
};

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppAlertProvider>
              <AppBoot />
            </AppAlertProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
