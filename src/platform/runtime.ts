import { Capacitor } from '@capacitor/core';

/** True inside the iOS / Android app; false in any browser (incl. the installed PWA). */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
