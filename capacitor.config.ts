/// <reference types="@capacitor/status-bar" />
/// <reference types="@capacitor/splash-screen" />
import type { CapacitorConfig } from '@capacitor/cli';

const SLATE = '#0F172A';

const config: CapacitorConfig = {
  appId: 'app.anchor.reset',
  appName: 'Anchor',
  webDir: 'dist',
  // Shown behind the web view while it loads — no white flash on either platform.
  backgroundColor: SLATE,
  android: {
    allowMixedContent: false,
  },
  ios: {
    // The web layer handles safe areas itself (viewport-fit=cover + env(safe-area-inset-*)).
    contentInset: 'never',
  },
  plugins: {
    // Android 15+ forces edge-to-edge; Capacitor exposes correct safe-area insets to CSS.
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK', // light icons on the dark background
    },
    StatusBar: {
      style: 'DARK', // light text for dark backgrounds
      backgroundColor: SLATE, // Android < 15 (15+ is always transparent/edge-to-edge)
      overlaysWebView: false,
    },
    SplashScreen: {
      // Short: the app must open fast enough to be useful mid-panic.
      launchShowDuration: 300,
      launchAutoHide: true,
      launchFadeOutDuration: 150,
      backgroundColor: SLATE,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    // Privacy: no native HTTP or cookie bridging — the app makes no network requests.
    CapacitorHttp: { enabled: false },
    CapacitorCookies: { enabled: false },
  },
};

export default config;
