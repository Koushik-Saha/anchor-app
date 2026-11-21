import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { consumeLaunchRoute, routeFromUrl } from './app/launch';
import type { Route } from './app/navigation';
import { SettingsProvider } from './app/SettingsProvider';
import * as deepLinks from './platform/deepLinks';
import * as install from './platform/install';
import { isNative } from './platform/runtime';
import { registerServiceWorker } from './platform/serviceWorker';
import { storage } from './platform/storage';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

/** Picks platform adapters and the launch route, once, before the first render. */
async function boot(): Promise<Route> {
  if (isNative()) {
    try {
      // Native plugin code is only ever downloaded here, never on the web.
      const native = await import('./platform/nativeAdapters');
      native.installNativeAdapters();
    } catch {
      // Fall back to the web adapters rather than show a blank screen.
    }
    // anchor://start (URL scheme / Android shortcut) cold-starts straight into a reset.
    return routeFromUrl(await deepLinks.getLaunchUrl()) ?? { view: 'home' };
  }
  registerServiceWorker();
  // /?action=start (PWA shortcut) — read once and stripped (StrictMode would read it twice).
  return consumeLaunchRoute();
}

void boot().then(async (initialRoute) => {
  install.init(); // beforeinstallprompt can fire before React mounts
  // Settings come from on-device storage before the first paint, so large text never pops in late.
  const initialSettings = await storage.getSettings();
  createRoot(root).render(
    <StrictMode>
      <SettingsProvider initial={initialSettings}>
        <App initialRoute={initialRoute} />
      </SettingsProvider>
    </StrictMode>,
  );
});
