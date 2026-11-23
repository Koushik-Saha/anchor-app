# Anchor — CLAUDE.md

## Product

Anchor is a panic-reset app. **One tap starts a 90-second guided reset**: paced breathing, then a 5-4-3-2-1 grounding exercise, then a few calm closing lines (`classic-90` in `src/content/protocols.ts`: 48 s + 30 s + 15 s).
One codebase → web (PWA) + Android + iOS (Capacitor).

Anchor is a **self-help / wellness tool, not a medical device**. Copy describes what the app *does* ("breathe with the circle", "name five things you can see"), never what it *cures, treats, prevents or reduces*. No efficacy or outcome claims anywhere: app, store listing, privacy page, release notes.
**Run `npm run copy-scan` after any copy change**: it must report 0 HIGH. Read every REVIEW line yourself.

## Non-negotiable design rules

- **Fully offline.** No network calls in the reset flow, ever, and none anywhere else either (no CDN, fonts or remote config). The web CSP (`connect-src 'self'`) and the Android manifest (no INTERNET) enforce this; keep it that way.
- **No account, no analytics, no ads, no tracking.** Settings, history and My plan notes are stored on-device only (through `src/platform/storage.ts`) and never leave the phone.
- **Every reset-flow screen:**
  - huge tap targets (≥ 64 px, `min-h-tap`);
  - **one** short line of text (≤ 8 words; `protocols.test.ts` checks this);
  - **Skip and Close (✕) always visible**. The user is never trapped in a flow: no popups, upsells, permission prompts or confirmations during a reset.
- **Accessibility:**
  - large-text and reduced-motion options in Settings;
  - VoiceOver and TalkBack support;
  - a haptic rhythm that can be followed with eyes closed;
  - optional tones, **OFF by default** (`DEFAULT_SETTINGS.sound = false`);
  - the screen stays awake during a reset (`wakeLock` adapter).
- **A crisis line is always one tap away** (`CrisisLine`). Which line comes from `src/content/crisisLines.ts`: device locale, or the override in Settings (`settings.crisisRegion`). Bundled, never looked up. Never remove it, never hide it behind a menu.
  - *Gap today:* it's on Home and Done only, so from Reset, Library, History, Settings and My plan it takes two taps. Close this gap when you next touch those screens, without breaking the one-line rule in the reset flow.

## Launch decision: Anchor is FREE

- There is **no paywall, no in-app purchase and no locked feature**. Every protocol and My plan are available to everyone.
- **Do not add** payment, entitlement-gating, "pro" or unlock code, store-billing plugins or purchase SDKs.
- *Supersedes* the earlier one-time-unlock plan ($6.99 `full_unlock`). It was removed on 2026-11-22; see **History: the paid unlock (removed)** below.
- `src/app/free.test.ts` enforces this. It fails if any UI source mentions unlock / purchase / upgrade / price wording, if anything imports a purchase module, if a billing dependency comes back, or if Library or My plan regains a gate. Don't weaken it; fix the code instead.

## Stack and gates

- **Stack:** Preact (via `preact/compat`) + Vite + Capacitor 8 (iOS / Android), TypeScript strict, Tailwind 4, Vitest.
- **Before declaring any task done**, run all of these and report the results:
  ```bash
  npm run typecheck && npm run lint && npm test && npm run build && npm run size
  ```
  Add `npm run copy-scan` when copy changed.
- **Work in small steps**, with tests in the same change as every feature (engine tests first).
- **End every task with a summary of the files changed.**
- Push after every task: commit and push to `origin main` once the gates pass. The repo is **public**, so never commit secrets.

## Project rules (follow for every task)

1. **This app collects NO user data.** Never add analytics, tracking, network calls, accounts, or third-party SDKs that phone home.
2. **Everything must work fully offline after first load.** No CDN assets, no web fonts, no remote config.
3. **All persistent state goes through `src/platform/storage.ts`** — never call `localStorage` (or any other storage API) directly elsewhere.
4. **All haptics / audio / wake-lock access goes through the `src/platform` adapters.**
5. **TypeScript strict, no `any`.** Vitest tests for anything in `src/engine`.
6. **Keep total JS bundle under 200 KB gzipped.** Ask before adding any dependency over 10 KB.
7. **Design tokens** — dark theme only:
   | Token | Hex | Tailwind classes |
   |---|---|---|
   | background | `#0F172A` | `bg-canvas` |
   | surface | `#1E293B` | `bg-surface` |
   | accent (teal) | `#5EEAD4` | `text-accent`, `bg-accent` |
   | text | `#E2E8F0` | `text-ink` |
   | muted | `#94A3B8` | `text-muted` |

   Minimum tap target **64px** inside the reset flow (`min-h-tap` / `min-w-tap` / `size-tap`).
   Maximum **~8 words of text** on any reset-flow screen.

Rules 1, 3, 4 and the no-`any` part of 5 are enforced by ESLint (`eslint.config.js`); rule 6 by `npm run size` in CI.
If a lint rule blocks you, route the call through `src/platform` — do not disable the rule.

## Stack note: Preact behind React imports

- Code is written against React APIs (`import { useState } from 'react'`, `@types/react` for types), but the app runs on **Preact** via `preact/compat` — aliased by `@preact/preset-vite` (build/dev) and in `vitest.config.ts` (tests). Chosen 2026-11-21 to cut JS from ~65 KB to ~29 KB gzip so Start is tappable < 1 s on a first visit over slow 4G.
- Only use React APIs that `preact/compat` supports (hooks incl. `useSyncExternalStore`/`useId`, `forwardRef`, context, `createRoot`). Avoid React-only internals, Server Components and concurrent-only APIs (`useTransition`, `use`).
- Keep the JS budget lean: check `npm run size` after adding UI.

## Accessibility (verified each release)

- Every screen has one `h1` (`tabIndex={-1}`); `App.tsx` moves focus to it on navigation. Reset's h1 is `sr-only`, inside the header landmark.
- Keyboard: Space starts a reset on Home and skips a phase in the flow; Escape closes the flow. Focused buttons keep their own Space behaviour.
- Layout must hold at 320 px and at 200 % text: let rows wrap (`flex-wrap`), never fixed heights with hidden overflow; user-entered text gets `[overflow-wrap:anywhere]`.
- Contrast: every text token combination passes WCAG AA; don't add text colours with alpha below the current ones without re-checking.

## Commands

Requires Node 22 (`nvm use` reads `.nvmrc`).

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build (incl. service worker) to `dist/` |
| `npm run preview` | Serve `dist/` — use this to test offline/PWA behaviour |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm test` | Vitest (once); `npm run test:watch` for watch mode |
| `npm run size` | Gzipped JS bundle budget check (run after build) |

CI (`.github/workflows/ci.yml`) runs typecheck → lint → test → build → size on every push and PR.

## Layout

- `src/engine` — reset state machine + protocol types. Pure TypeScript: no React, no platform, no Capacitor (lint-enforced). Every module here gets tests (write them first).
  - `createResetEngine(protocol, { now, scheduler })` → `start/pause/resume/restart/skipPhase/abort/interrupt/dispose`, `subscribe({ onPhaseChange, onTick, onComplete, onStateChange })`, `getState()`, `wasInterrupted`.
  - Timing is `clock() - phaseStartedAt` (monotonic), never summed frame deltas; boundaries carry overshoot. Don't add setInterval/setTimeout timing.
  - Interruption contract: the UI calls `engine.interrupt()` on `visibilitychange` → hidden (primary); a frame gap > 5s (device slept) also pauses with `wasInterrupted = true` (fallback — keep it generous, visible-page stalls of 1–2s are normal), and offer Resume / Restart when `wasInterrupted`.
  - Tests use a fake clock + fake frame scheduler (see `resetEngine.test.ts`) — never real timers.
- `src/content` — protocol definitions as typed data. New protocol = new data, never new engine code. `protocols.test.ts` validates everything shipped.
  - Breathing patterns are data too (`breathPatterns.ts`: 4-2-6, box, 4-7-8, double inhale). A pattern is only timing for a `BreathingPhase` (`topUpSec` = the double inhale's short second inhale), so circle, haptics, tones, reduced motion and keep-awake need no per-pattern code.
  - A protocol with `choosePattern: true` (only `breathing-60`) opens `PatternPicker` from Library and breathes the person's last pick, saved as `settings.breathPattern`; `protocolWithChosenPattern()` applies it in Reset. Every other protocol, including the classic reset, always breathes as written (4-2-6). Unknown stored ids fall back to 4-2-6.
- `src/platform` — the only place that touches device APIs: `storage.ts`, `haptics.ts`, `audio.ts`, `wakeLock.ts`. Each must work on web and no-op safely where unsupported, and never throw. Pattern for every adapter:
  - an `XAdapter` interface + `createWebX()` web implementation (takes its browser API as an optional param so tests can pass fakes),
  - a module-level API that call sites use, delegating to the active adapter,
  - `setAdapter()` (`setStorageBackend()` for storage) to slot in a Capacitor implementation once at startup — call sites never change.
  - Usage: `storage.getSettings()` / `storage.addHistoryEntry(e)`; namespace-import the rest: `import * as haptics from '../platform/haptics'` → `haptics.pulse('phase')`, `audio.toneOnPhaseChange(pitch)`, `await wakeLock.acquire()`.
  - Haptics/audio gate themselves on `settings.haptics` / `settings.sound` (synced by `SettingsProvider`). Audio needs `audio.prime()` from a tap handler (e.g. Start reset) before timer-driven tones will play on iOS.
  - Stored data is untrusted (old/corrupt): read through the typed helpers, which normalise it.
- `src/app` — app-wide state: `navigation.ts` (`View` type + `useNavigation()`), `settings.ts` (`useSettings()`, defaults, normalisation), `SettingsProvider.tsx`. Settings are loaded before first render in `main.tsx`.
- `src/screens` — Home, Reset, Done, Library, PatternPicker, Plan, History, WhatHelped, Settings. Navigation is a view-state switch in `App.tsx` (no router) — call `useNavigation().navigate('library')`.
- `src/components` — shared UI. Use these instead of one-off styles:
  - `Screen` — page layout (480px column, safe areas); `bottom` prop for a `BottomBar`.
  - `BigButton` — primary action, accent, min 96px. One per screen at most.
  - `CalmButton` — secondary; `variant="surface"` (64px, OK in reset flow) or `"quiet"` (48px text link, outside reset flow only).
  - `ScreenTitle`, `BottomBar`, `Toggle` (settings switch, optional description/disabled), `ProgressDots`, `CrisisLine` (988 line), `BreathMark` (logo), `StubScreen` (temporary), `DeviceCheck` (adapter test panel, dev builds only).
  - Reduced motion = OS setting OR `settings.reducedMotion`: use `useReducedMotion()`, never the media query alone.
  - `cx()` + `focusRing` in `cx.ts`.

## PWA

- Manifest + service worker are configured in `vite.config.ts` (vite-plugin-pwa, generateSW). Every built file is precached; there is no runtime caching because the app makes no requests.
- Icons: edit `public/icon.svg` / `public/icon-maskable.svg`, then run `scripts/generate-icons.sh` and commit the PNGs.
- One-tap start: the PWA shortcut (`/?action=start`), Android shortcut and iOS quick action (both `anchor://start`) all resolve through `routeFromUrl` in `src/app/launch.ts` to a fresh classic-90, from any screen, including over a running reset (the replaced run is saved as stopped). The manifest lives in `src/app/pwaManifest.ts`.
- Install hint (`InstallHint`, `src/platform/install.ts`): mobile browsers only, Done screen only, never in the reset flow. The browser's own install banner is suppressed so it can't pop up mid-reset.
- Release check: `docs/pwa-checklist.md` (Lighthouse **11** — v12+ has no PWA category).

## Release & deploy

- Web: `Dockerfile` (Node build → nginx) + `deploy/nginx.conf` / `deploy/security-headers.conf`. Hashed assets immutable; HTML, `sw.js`, manifest `no-cache`; strict CSP (`script-src 'self'`, `connect-src 'self'`) — never add inline scripts or third-party origins; no access logs. Verify with `scripts/smoke-web.sh <url>`. Coolify settings + device smoke test: `docs/deploy.md`.
- Native signing: `docs/signing.md`. Android release signing reads `android/keystore.properties` (gitignored) or `ANCHOR_UPLOAD_*` env vars and refuses to build unsigned. Never commit keys, passwords, `.p8`/`.p12`/profiles (repo is public).
- Web haptics/tones wait for the first user tap (`navigator.userActivation`) — launches via shortcut start silently rather than error.

## Conventions

- Mobile-first single column; centred at max ~480px on wider screens.
- Use system fonts only. The breathing circle is the only animation. `prefers-reduced-motion` is handled globally in `index.css`; still gate any motion with `motion-safe:`.
- Size things in rem (Tailwind defaults, `min-h-tap`) so the Large text setting (root font-size 125%) scales them. Avoid px except for layout caps like the 480px column.
- Exit/skip must always be visible in the reset flow; no popups, upsells, or permission prompts during a reset.
- Native apps: Capacitor 8, `capacitor.config.ts`, projects in `ios/` (SPM) and `android/`. After any web change: `npm run build && npx cap sync`. Build/run steps + device checklist: `docs/native.md`.
- Native adapters (`src/platform/nativeAdapters.ts`: Preferences, Haptics, KeepAwake, App deep links) are loaded only via dynamic import when `isNative()` — never import Capacitor plugins anywhere else, so the web bundle stays plugin-free.
- Permissions: none at runtime. Android: INTERNET removed in the manifest; only VIBRATE (from @capacitor/haptics). iOS: no `*UsageDescription` keys. Never add a plugin that needs more without asking.
- The service worker is registered from `src/platform/serviceWorker.ts` on the web only, never inside the native apps.

## My plan

- My plan fields are private: keep `PRIVATE_FIELD` (no spellcheck/grammar extensions) on every input that holds personal text.
- `src/app/planStore.ts` caches the plan at startup; Done shows the person's note and a one-tap call to their contact.

## What helped

- `src/app/whatHelped.ts` turns on-device history into a few lines, using only counts and strict majorities over completed resets (at least 3). It's computed on open and never stored. No advice, scores or outcome claims: the lines only repeat the person's own answers.

## History: the paid unlock (removed 2026-11-22)

- **What it was:** until 2026-11-22, Box breathing, Extended reset, Night reset and My plan sat behind a one-time $6.99 purchase (`full_unlock`, `@capgo/native-purchases`). All of it is gone:
  - the code (`unlock.ts`, `purchases.ts`, `UnlockPanel`, `Sheet`, the `locked` field);
  - the plugin;
  - the store copy.
- **On-device data:** older installs may still hold the key `anchor:v1:unlocked`.
  - It's listed in `RETIRED_KEYS` in `storage.ts`. Nothing reads or rewrites it, and only `clearAll()` deletes it.
  - **Never add a startup migration that deletes or rewrites stored data.** People's My plan, settings and history must survive every update (tested in `storage.test.ts`, "upgrading from the paid version").
