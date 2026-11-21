import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const BG = '#0F172A';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New versions install in the background and take over on the next launch.
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      // Icon PNGs come from scripts/generate-icons.sh; globPatterns below precaches all of public/.
      includeManifestIcons: false, // already covered by globPatterns (avoids duplicate precache entries)
      manifest: {
        id: '/',
        name: 'Anchor',
        short_name: 'Anchor',
        description: 'A 90-second panic reset. Works offline. Collects no data.',
        lang: 'en',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: BG,
        background_color: BG,
        categories: ['health', 'lifestyle'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        // Long-press the home-screen icon → "Start reset" opens straight into classic-90.
        shortcuts: [
          {
            name: 'Start reset',
            short_name: 'Start',
            description: 'Begin the 90-second reset now',
            url: '/?action=start',
            icons: [{ src: 'icon-96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
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
