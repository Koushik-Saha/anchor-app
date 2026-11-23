# Running Anchor on iOS and Android

App ID `app.anchor.reset` · name **Anchor** · URL scheme `anchor://` · Capacitor 8.

After **any** web change: `npm run build && npx cap sync` (copies `dist/` into both native projects).

## One-time setup (this Mac)

| Need | How |
|---|---|
| ~40 GB free disk | Xcode alone needs ~35–40 GB to install. |
| **Xcode** (iOS) | Install from the App Store, open it once (it installs components), then `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` and `sudo xcodebuild -license accept`. |
| **Android Studio** (Android) | Install from developer.android.com/studio. The first-run wizard installs the Android SDK and bundles a JDK — nothing else to install. In *SDK Manager*, make sure **Android SDK Platform 36** is installed. |

## iPhone

1. `npm run build && npx cap sync ios && npx cap open ios` — Xcode opens `ios/App/App.xcodeproj` and resolves Swift packages (first time: a minute).
2. Xcode → *Settings → Accounts* → add your Apple ID (a free account is fine for your own device; builds expire after 7 days).
3. Select the **App** target → *Signing & Capabilities* → tick *Automatically manage signing* → *Team*: your Apple ID.
4. iPhone: connect by USB, unlock, tap **Trust**. Turn on *Settings → Privacy & Security → Developer Mode* (it restarts).
5. In Xcode's toolbar pick your iPhone as the destination → **⌘R**.
6. First launch only: iPhone *Settings → General → VPN & Device Management* → trust your developer certificate, then open Anchor.

## Android phone

1. Phone: *Settings → About phone* → tap **Build number** 7 times → *Developer options* → **USB debugging** on. Connect by USB and allow the computer.
2. `npm run build && npx cap sync android && npx cap open android` — wait for *Gradle sync* to finish.
3. Pick your phone in the device dropdown → **Run ▶**.
   (Or from the terminal: `npx cap run android` and choose the device.)

## Opening anchor://start

| | |
|---|---|
| Android, from the computer | `adb shell am start -W -a android.intent.action.VIEW -d "anchor://start" app.anchor.reset` |
| Android, on the phone | Long-press the Anchor icon → **Start reset** |
| iPhone, on the phone | Long-press the Anchor icon → **Start reset** |
| iPhone, by link | Type `anchor://start` in Safari's address bar → **Open**; or Shortcuts app → *Open URLs* → `anchor://start` (add it to the Home Screen or Siri) |

## Device test checklist

Run on a real iPhone **and** a real Android phone, using a build made with `npm run build`.

- [ ] **Launch** — slate splash with the teal mark, no white flash; status bar icons are light on the dark background.
- [ ] **Android only: the app loads** (the INTERNET permission is removed). A blank screen or `ERR_CACHE_MISS` means the WebView needs it after all — report it.
- [ ] **Haptics fire** — Settings → Haptics on (you feel a tap). Start a reset: a soft tap at each turn of the breath, a stronger pulse at each phase change, a "success" pattern on Done. Haptics off → nothing.
- [ ] **Screen stays awake** — set Auto-Lock (iOS) / Screen timeout (Android) to 30 s. Start classic-90: the screen stays on for the whole 93 s. After Done, it sleeps normally again.
- [ ] **Deep link starts a reset** — (a) app fully closed → `anchor://start` → opens straight into the breathing circle; (b) app open on Home → reset starts; (c) already mid-reset → a fresh classic reset starts; (d) long-press the icon on Android **and** iPhone → **Start reset**, from closed, from the background and from another screen.
- [ ] **Airplane mode** — airplane mode on (Wi-Fi off too), force-quit Anchor, open it → full reset to Done → answer "What helped?" → History shows it. Force-quit and reopen → settings and history are still there (stored in Capacitor Preferences).
- [ ] **Leaving mid-reset** — press Home during a reset, come back → "Welcome back." with Resume / Start over.
- [ ] **Zero permission prompts** — none at install or during use. Android *Settings → Apps → Anchor → Permissions*: nothing to grant. iOS *Settings → Anchor*: no permission switches.
- [ ] **988 links** — "Call" opens the dialer, "text" opens Messages.

## Everything is free

Anchor has no in-app purchases and no locked features. There's no store product to set up.

- [ ] **Library** → each of the six resets (Classic, Breathing, Grounding, Box breathing, Extended, Night) starts straight away with one tap. No lock badge, price or extra panel.
- [ ] **My plan** (Home → My plan) opens the form directly. Write a note and a contact, finish a reset → Done shows the note and **Call <name>**.
- [ ] Nowhere in the app (Home, Library, My plan, Done, History, Settings) mentions unlocking, buying, restoring or upgrading. Settings has no Purchase section.
- [ ] **Upgrade from an older build** that had the paid unlock: install the new build over it, without deleting the old one first. My plan, settings and history are all still there.
- [ ] Android: the *Merged Manifest* tab in Android Studio should show only VIBRATE and the app-private `app.anchor.reset.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`. That second one is added by AndroidX Core; it's signature-level and never shown to users. There should be no INTERNET and **no BILLING**: BILLING came from the purchase plugin, which has been removed.

## What's configured where

| | iOS | Android |
|---|---|---|
| URL scheme `anchor://` | `ios/App/App/Info.plist` → `CFBundleURLTypes` | `AndroidManifest.xml` → VIEW intent-filter |
| "Start reset" shortcut | `Info.plist` → `UIApplicationShortcutItems`, handled in `SceneDelegate.swift` | `res/xml/shortcuts.xml` |
| Icons | `Assets.xcassets/AppIcon.appiconset` (1024, opaque) | vector adaptive + themed icon (`drawable/ic_launcher_foreground.xml`), PNG legacy icons |
| Splash | `Splash.imageset` + slate `LaunchScreen.storyboard` | `values/styles.xml` (Android 12+ API, `drawable/splash_icon.xml`), `drawable*/splash.png` |
| Status bar | light content, `UIUserInterfaceStyle` Dark | `SystemBars`/`StatusBar` DARK, slate bars |
| Permissions | no usage-description keys | INTERNET removed; only VIBRATE (@capacitor/haptics), install-time, never prompted |

Raster icons and splash images are generated by `scripts/generate-icons.sh` from `public/icon*.svg` and `resources/mark.svg`.
