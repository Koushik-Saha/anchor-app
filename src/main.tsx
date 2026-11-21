import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { consumeLaunchRoute } from './app/launch';
import { SettingsProvider } from './app/SettingsProvider';
import * as install from './platform/install';
import { storage } from './platform/storage';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// Read once, before any render (StrictMode would otherwise read it twice):
// the "Start reset" shortcut opens /?action=start straight into classic-90.
const initialRoute = consumeLaunchRoute();
install.init(); // beforeinstallprompt can fire before React mounts

// Settings come from on-device storage (synchronous under the hood), so this
// resolves within a microtask and the first paint already has the right text size.
void storage.getSettings().then((initial) => {
  createRoot(root).render(
    <StrictMode>
      <SettingsProvider initial={initial}>
        <App initialRoute={initialRoute} />
      </SettingsProvider>
    </StrictMode>,
  );
});
