import { useSyncExternalStore } from 'react';
import * as install from '../platform/install';

/** Live install state: platform, running installed, native prompt available. */
export function useInstallState(): install.InstallState {
  return useSyncExternalStore(install.subscribe, install.getState, install.getState);
}
