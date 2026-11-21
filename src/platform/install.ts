/**
 * Install ("Add to Home Screen") adapter. Use as a namespace:
 *   import * as install from '../platform/install';
 *
 * - Android Chrome/Edge: we capture `beforeinstallprompt` and suppress the
 *   browser's own install banner (it could otherwise pop up mid-reset — no
 *   popups in the flow). Our hint offers the native prompt on a calm screen.
 * - iOS: there is no prompt API; the hint explains Share → Add to Home Screen.
 * - Native app builds (Phase 3) are already "installed": standalone is true.
 *
 * Nothing here touches the network. Never throws.
 */

export type InstallPlatform = 'ios' | 'android' | 'other-mobile' | 'desktop';

export interface InstallState {
  platform: InstallPlatform;
  /** Running as an installed app (home screen / standalone window). */
  standalone: boolean;
  /** The browser offered a native install prompt we can show. */
  canPrompt: boolean;
  /** Installed during this session (appinstalled fired). */
  installed: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ─── Pure helpers (tested) ───────────────────────────────────────────────────

export function detectInstallPlatform(env: { userAgent: string; maxTouchPoints: number; uaDataMobile?: boolean }): InstallPlatform {
  const { userAgent: ua, maxTouchPoints } = env;
  // iPadOS reports a desktop Mac user agent; touch support gives it away.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (env.uaDataMobile === true || /Mobi/i.test(ua)) return 'other-mobile';
  return 'desktop';
}

/** Mobile browsers only, never once installed, never after "Not now". */
export function shouldShowInstallHint(state: InstallState, dismissed: boolean): boolean {
  return !dismissed && !state.standalone && !state.installed && state.platform !== 'desktop';
}

// ─── Browser wiring ──────────────────────────────────────────────────────────

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisSession = false;
let snapshot: InstallState = computeState();
const listeners = new Set<() => void>();

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = 'standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true;
  return iosStandalone || (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
}

function computeState(): InstallState {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const uaData = nav && 'userAgentData' in nav ? (nav as { userAgentData?: { mobile?: boolean } }).userAgentData : undefined;
  return {
    platform: detectInstallPlatform({
      userAgent: nav?.userAgent ?? '',
      maxTouchPoints: nav?.maxTouchPoints ?? 0,
      uaDataMobile: uaData?.mobile,
    }),
    standalone: isStandalone(),
    canPrompt: deferredPrompt !== null,
    installed: installedThisSession,
  };
}

function update(): void {
  snapshot = computeState();
  listeners.forEach((l) => l());
}

let initialised = false;

/** Call once at startup, before render — `beforeinstallprompt` can fire early. */
export function init(): void {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // no surprise browser banner, especially not mid-reset
    deferredPrompt = event as BeforeInstallPromptEvent;
    update();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedThisSession = true;
    update();
  });
  window.matchMedia?.('(display-mode: standalone)').addEventListener('change', update);
  update();
}

/** For useSyncExternalStore. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function getState(): InstallState {
  return snapshot;
}

/** Shows the browser's native install dialog, if it offered one. */
export async function prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferredPrompt;
  if (!event) return 'unavailable';
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferredPrompt = null; // a prompt event can only be used once
    update();
    return outcome;
  } catch {
    return 'unavailable';
  }
}
