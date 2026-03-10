import React, { useState } from 'react';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';

export const AuthNavigator = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  if (mode === 'login') return <LoginScreen onSignupPress={() => setMode('signup')} />;
  return <SignupScreen onLoginPress={() => setMode('login')} />;
};
