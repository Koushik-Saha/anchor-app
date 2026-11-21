# PWA verification checklist

Run before every release (and after changing `vite.config.ts`, icons or `index.html`).
Always test the **production build** — the dev server has no service worker.

```bash
npm run build && npx vite preview --port 4173
```

## Automated

- [ ] **Lighthouse PWA** — Lighthouse 12+ dropped the PWA category, so pin 11:
      `npx -y lighthouse@11.7.1 http://localhost:4173/ --only-categories=pwa --chrome-flags="--headless=new" --view`
      Expect score 1: installable-manifest, splash-screen, themed-omnibox, content-width, viewport, maskable-icon.
- [ ] **Precache covers every file**: `precache N entries` in the build log equals the number of files in `dist/`
      (excluding `sw.js` / `workbox-*.js`), with no duplicates.
- [ ] `npm test` (launch URL parsing, install-hint rules) and `npm run size` pass.

## Offline (desktop Chrome)

1. [ ] Open http://localhost:4173, reload once (service worker takes control).
2. [ ] **Stop the preview server** (Ctrl+C) — and/or turn Wi-Fi off.
3. [ ] Reload `/` → Home appears.
4. [ ] Open `/?action=start` → classic-90 starts immediately; address bar shows `/`.
5. [ ] Finish (or Skip to) Done, answer "What helped?" → "Saved on this device only."
6. [ ] Reload → lands on Home (not a second reset). No console errors.

## Installed app (desktop Chrome)

1. [ ] With the server running, click the install icon in the address bar → Install.
2. [ ] Stop the server and turn Wi-Fi off.
3. [ ] Launch **Anchor** from the Dock / Launchpad → Home appears, a reset runs to Done.
4. [ ] Right-click the Dock icon → **Start reset** → opens straight into the reset.

## Mobile (needs https or localhost — use Chrome USB port forwarding on Android)

- [ ] Android Chrome: after one reset, Done shows "Keep Anchor on your home screen" with **Add to Home Screen**;
      no browser install banner ever appears mid-reset. Long-press the installed icon → **Start reset**.
- [ ] iPhone Safari: Done shows "Tap Share, then “Add to Home Screen”." Installed icon uses `apple-touch-icon.png`.
- [ ] "Not now" hides the hint for good (stored in settings); it never shows on Home, in the reset, or when installed.
- [ ] Airplane mode on → open the installed app → full reset works.
