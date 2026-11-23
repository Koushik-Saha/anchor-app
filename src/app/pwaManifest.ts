const BG = '#0F172A';

/** The web app manifest (used by vite.config.ts, validated in shortcuts.test.ts). */
export const PWA_MANIFEST = {
  id: '/',
  name: 'Anchor',
  short_name: 'Anchor',
  description: 'A 90-second panic reset. Works offline. Collects no data.',
  lang: 'en',
  dir: 'ltr' as const,
  start_url: '/',
  scope: '/',
  display: 'standalone' as const,
  orientation: 'portrait' as const,
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
      short_name: 'Start reset',
      description: 'Begin the 90-second reset now',
      url: '/?action=start',
      icons: [{ src: 'icon-96.png', sizes: '96x96', type: 'image/png' }],
    },
  ],
};
