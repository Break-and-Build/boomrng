import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../../shared/types/settings';
import { DEFAULT_SETTINGS } from '../../shared/types/settings';
import { loadSettings, saveSettings, STORAGE_KEYS } from '../../shared/storage/storage-service';
import { subscribeToStorage } from '../../shared/storage/storage-service';

export function useSettings(): [Settings, (value: Settings) => void, boolean] {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadSettings().then((loaded) => {
      if (!cancelled) {
        setSettings(loaded);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToStorage<Settings>(STORAGE_KEYS.SETTINGS, (newValue) => {
      setSettings(newValue);
    });

    return unsubscribe;
  }, []);

  const updateSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, []);

  return [settings, updateSettings, isLoading];
}
