import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { resolveLanguage } from '../content/strings';
import * as audio from '../platform/audio';
import * as haptics from '../platform/haptics';
import { deviceLocales } from '../platform/locale';
import { storage } from '../platform/storage';
import { SettingsContext, type Settings } from './settings';

interface SettingsProviderProps {
  /** Loaded before first render (see main.tsx) so large text never flashes in late. */
  initial: Settings;
  children: ReactNode;
}

export function SettingsProvider({ initial, children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(initial);

  // Large text scales the root font size; every rem-based size follows.
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute('data-large-text', settings.largeText);
  }, [settings.largeText]);

  // Screen readers pick their voice from this.
  useLayoutEffect(() => {
    document.documentElement.lang = resolveLanguage(settings.language, deviceLocales());
  }, [settings.language]);

  // App-level reduce motion: index.css applies the same rules as the OS media query.
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute('data-reduced-motion', settings.reducedMotion);
  }, [settings.reducedMotion]);

  // Adapters gate themselves, so call sites can just call pulse()/toneOnPhaseChange().
  useEffect(() => haptics.setEnabled(settings.haptics), [settings.haptics]);
  useEffect(() => audio.setEnabled(settings.sound), [settings.sound]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      void storage.saveSettings(next);
    },
    [settings],
  );

  const api = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);
  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}
