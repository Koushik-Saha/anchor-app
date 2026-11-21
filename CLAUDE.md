# Anchor — CLAUDE.md

Anchor is a single-purpose, offline-first app for the worst 90 seconds of a panic attack.
One codebase → web (PWA) + Android + iOS (via Capacitor, not yet initialised).

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
- `src/platform` — the only place that touches device APIs: `storage.ts`, `haptics.ts`, `audio.ts`, `wakeLock.ts`. Each must work on web and no-op safely where unsupported, and never throw. Pattern for every adapter:
  - an `XAdapter` interface + `createWebX()` web implementation (takes its browser API as an optional param so tests can pass fakes),
  - a module-level API that call sites use, delegating to the active adapter,
  - `setAdapter()` (`setStorageBackend()` for storage) to slot in a Capacitor implementation once at startup — call sites never change.
  - Usage: `storage.getSettings()` / `storage.addHistoryEntry(e)`; namespace-import the rest: `import * as haptics from '../platform/haptics'` → `haptics.pulse('phase')`, `audio.toneOnPhaseChange(pitch)`, `await wakeLock.acquire()`.
  - Haptics/audio gate themselves on `settings.haptics` / `settings.sound` (synced by `SettingsProvider`). Audio needs `audio.prime()` from a tap handler (e.g. Start reset) before timer-driven tones will play on iOS.
  - Stored data is untrusted (old/corrupt): read through the typed helpers, which normalise it.
- `src/app` — app-wide state: `navigation.ts` (`View` type + `useNavigation()`), `settings.ts` (`useSettings()`, defaults, normalisation), `SettingsProvider.tsx`. Settings are loaded before first render in `main.tsx`.
- `src/screens` — Home, Reset, Done, Library, Plan, History, Settings. Navigation is a view-state switch in `App.tsx` (no router) — call `useNavigation().navigate('library')`.
- `src/components` — shared UI. Use these instead of one-off styles:
  - `Screen` — page layout (480px column, safe areas); `bottom` prop for a `BottomBar`.
  - `BigButton` — primary action, accent, min 96px. One per screen at most.
  - `CalmButton` — secondary; `variant="surface"` (64px, OK in reset flow) or `"quiet"` (48px text link, outside reset flow only).
  - `ScreenTitle`, `BottomBar`, `Toggle` (settings switch, optional description/disabled), `Sheet` (native-<dialog> bottom panel — never in the reset flow), `ProgressDots`, `CrisisLine` (988 line), `BreathMark` (logo), `StubScreen` (temporary), `DeviceCheck` (adapter test panel, dev builds only).
  - Reduced motion = OS setting OR `settings.reducedMotion`: use `useReducedMotion()`, never the media query alone.
  - `cx()` + `focusRing` in `cx.ts`.

## PWA

- Manifest + service worker are configured in `vite.config.ts` (vite-plugin-pwa, generateSW). Every built file is precached; there is no runtime caching because the app makes no requests.
- Icons: edit `public/icon.svg` / `public/icon-maskable.svg`, then run `scripts/generate-icons.sh` and commit the PNGs.
- Launch URL `/?action=start` (manifest shortcut, later `anchor://start`) opens classic-90; handled once in `main.tsx` via `src/app/launch.ts`.
- Install hint (`InstallHint`, `src/platform/install.ts`): mobile browsers only, Done screen only, never in the reset flow. The browser's own install banner is suppressed so it can't pop up mid-reset.
- Release check: `docs/pwa-checklist.md` (Lighthouse **11** — v12+ has no PWA category).

## Conventions

- Mobile-first single column; centred at max ~480px on wider screens.
- Use system fonts only. The breathing circle is the only animation. `prefers-reduced-motion` is handled globally in `index.css`; still gate any motion with `motion-safe:`.
- Size things in rem (Tailwind defaults, `min-h-tap`) so the Large text setting (root font-size 125%) scales them. Avoid px except for layout caps like the 480px column.
- Exit/skip must always be visible in the reset flow; no popups, upsells, or permission prompts during a reset.
- Native apps: Capacitor 8, `capacitor.config.ts`, projects in `ios/` (SPM) and `android/`. After any web change: `npm run build && npx cap sync`. Build/run steps + device checklist: `docs/native.md`.
- Native adapters (`src/platform/nativeAdapters.ts`: Preferences, Haptics, KeepAwake, App deep links) are loaded only via dynamic import when `isNative()` — never import Capacitor plugins anywhere else, so the web bundle stays plugin-free.
- Permissions: none at runtime. Android: INTERNET removed in the manifest; only VIBRATE (from @capacitor/haptics). iOS: no `*UsageDescription` keys. Never add a plugin that needs more without asking.
- The service worker is registered from `src/platform/serviceWorker.ts` on the web only, never inside the native apps.
