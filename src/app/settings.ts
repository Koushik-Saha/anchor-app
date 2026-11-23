import { createContext, useContext } from 'react';
import { en, type Strings } from '../content/strings';
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

/** The UI text for the person's language. */
export function useStrings(): Strings {
  return en;
}
