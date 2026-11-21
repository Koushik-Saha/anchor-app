import { createContext, useContext } from 'react';
import type { Settings } from '../platform/storage';

export type { Settings };

export interface SettingsApi {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

export const SettingsContext = createContext<SettingsApi | null>(null);

export function useSettings(): SettingsApi {
  const api = useContext(SettingsContext);
  if (!api) throw new Error('useSettings must be used inside <SettingsProvider>');
  return api;
}
