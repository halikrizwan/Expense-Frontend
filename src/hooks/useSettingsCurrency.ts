import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getSettingsApi, updateSettingsApi } from '../services/backend';

export const useSettingsCurrency = () => {
  const [currency, setCurrencyState] = useState('AED');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getSettingsApi();
      setCurrencyState(settings.currency || 'AED');
    } catch {
      // Keep previous currency on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const saveCurrency = useCallback(async (value: string) => {
    await updateSettingsApi({ currency: value });
    setCurrencyState(value);
  }, []);

  return { currency, loading, refresh, saveCurrency };
};
