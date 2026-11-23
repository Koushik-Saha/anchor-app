import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { PWA_MANIFEST } from './src/app/pwaManifest';

export default defineConfig({
  plugins: [
    // Preact runs the React code via preact/compat (aliases react, react-dom, jsx-runtime):
    // ~4 KB instead of ~44 KB gzip, so Start is tappable sooner on a first visit.
    preact(),
    tailwindcss(),
    VitePWA({
      // New versions install in the background and take over on the next launch.
      registerType: 'autoUpdate',
      // Registered from main.tsx on the web only (src/platform/serviceWorker.ts) — never inside the native apps.
      injectRegister: null,
      // Icon PNGs come from scripts/generate-icons.sh; globPatterns below precaches all of public/.
      includeManifestIcons: false, // already covered by globPatterns (avoids duplicate precache entries)
      manifest: PWA_MANIFEST,
      workbox: {
        // The whole app shell — HTML, JS (which bundles every protocol), CSS, icons,
        // manifest — is precached on first load, so everything works offline after that.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'], // + manifest.webmanifest, added by the plugin
        // Any in-app navigation (including /?action=start) is answered from the cache.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // No runtime caching: the app makes no network requests (CLAUDE.md rule 1).
      },
    }),
  ],
});
