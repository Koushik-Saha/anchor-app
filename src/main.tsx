import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { SettingsProvider } from './app/SettingsProvider';
import { storage } from './platform/storage';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// Settings come from on-device storage (synchronous under the hood), so this
// resolves within a microtask and the first paint already has the right text size.
void storage.getSettings().then((initial) => {
  createRoot(root).render(
    <StrictMode>
      <SettingsProvider initial={initial}>
        <App />
      </SettingsProvider>
    </StrictMode>,
  );
});
