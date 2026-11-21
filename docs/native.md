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
| iPhone | Type `anchor://start` in Safari's address bar → **Open**; or Shortcuts app → *Open URLs* → `anchor://start` (add it to the Home Screen or Siri) |

## Device test checklist

Run on a real iPhone **and** a real Android phone, using a build made with `npm run build`.

- [ ] **Launch** — slate splash with the teal mark, no white flash; status bar icons are light on the dark background.
- [ ] **Android only: the app loads** (the INTERNET permission is removed). A blank screen or `ERR_CACHE_MISS` means the WebView needs it after all — report it.
- [ ] **Haptics fire** — Settings → Haptics on (you feel a tap). Start a reset: a soft tap at each turn of the breath, a stronger pulse at each phase change, a "success" pattern on Done. Haptics off → nothing.
- [ ] **Screen stays awake** — set Auto-Lock (iOS) / Screen timeout (Android) to 30 s. Start classic-90: the screen stays on for the whole 93 s. After Done, it sleeps normally again.
- [ ] **Deep link starts a reset** — (a) app fully closed → `anchor://start` → opens straight into the breathing circle; (b) app open on Home → reset starts; (c) already mid-reset → the running reset continues, not restarted; (d) Android: long-press icon → **Start reset**.
- [ ] **Airplane mode** — airplane mode on (Wi-Fi off too), force-quit Anchor, open it → full reset to Done → answer "What helped?" → History shows it. Force-quit and reopen → settings and history are still there (stored in Capacitor Preferences).
- [ ] **Leaving mid-reset** — press Home during a reset, come back → "Welcome back." with Resume / Start over.
- [ ] **Zero permission prompts** — none at install or during use. Android *Settings → Apps → Anchor → Permissions*: nothing to grant. iOS *Settings → Anchor*: no permission switches.
- [ ] **988 links** — "Call" opens the dialer, "text" opens Messages.

## One-time unlock (in-app purchase)

Product `full_unlock`, **non-consumable**, $6.99 — bought directly through StoreKit 2 / Google Play Billing. No third-party server and no API keys.

### iOS
1. **Xcode:** select the **App** target → *Signing & Capabilities* → **+ Capability** → **In-App Purchase**.
2. **Fast local test (no App Store Connect needed):** *File → New → File… → StoreKit Configuration File* → name it `Anchor`. Click **+** → *Add Non-Consumable In-App Purchase* → Reference Name `Full unlock`, Product ID `full_unlock`, Price `6.99`. Then *Product → Scheme → Edit Scheme… → Run → Options → StoreKit Configuration* → `Anchor.storekit`. Run on the iPhone; *Debug → StoreKit → Manage Transactions* lets you refund/delete purchases.
3. **Sandbox (real App Store flow):** in App Store Connect create the app (`app.anchor.reset`), sign the *Paid Apps* agreement (products don't load without it), then *In-App Purchases → +* → Non-Consumable, ID `full_unlock`, price $6.99. *Users and Access → Sandbox → Test Accounts* → add a tester. On the iPhone: *Settings → App Store → Sandbox Account* → sign in. Run from Xcode with the StoreKit Configuration set to **None**.

### Android
1. Play Console → create the app (`app.anchor.reset`) → upload a signed AAB (*Build → Generate Signed App Bundle*) to **Internal testing** — Play won't let you create products before a build with billing is uploaded.
2. *Monetize → Products → In-app products* → create `full_unlock`, $6.99, **Activate**.
3. *Setup → License testing* → add your Google account; add it to the internal testing track too, open the opt-in link on the phone and **install Anchor from Play** (sideloaded builds can't buy).
4. License testers get test cards: "always approves", "always declines", and "slow test card" (approves after a few minutes — tests the pending path).

### Purchase test checklist
- [ ] Web build: locked card / My plan → "Unlock in the free mobile app." — no purchase button.
- [ ] Library → locked protocol → price shows in your currency → **Unlock** → store sheet → buy → "Unlocked. Thank you." → **Start <protocol>** works. My plan opens.
- [ ] Cancel the store sheet → back to the panel, no error message.
- [ ] Android declined card → "The purchase didn't go through…". Slow card → "Waiting for the store to confirm…", and the unlock appears on its own a few minutes later.
- [ ] **Restore on a fresh install:** buy → delete the app → reinstall → open Library. Expected: already unlocked (silent entitlement check). If not, *Settings → Restore purchases* → "One-time unlock · Active".
- [ ] Restore with a different store account that never bought → "No earlier purchase found for this account."
- [ ] Airplane mode after unlocking → everything still unlocked (the flag is stored on the device).
- [ ] Android: *Merged Manifest* tab in Android Studio shows only VIBRATE, com.android.vending.BILLING and the app-private `app.anchor.reset.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (added by AndroidX Core, signature-level, never shown to users) — no INTERNET.

## What's configured where

| | iOS | Android |
|---|---|---|
| URL scheme `anchor://` | `ios/App/App/Info.plist` → `CFBundleURLTypes` | `AndroidManifest.xml` → VIEW intent-filter |
| "Start reset" shortcut | — (use the Shortcuts app) | `res/xml/shortcuts.xml` |
| Icons | `Assets.xcassets/AppIcon.appiconset` (1024, opaque) | vector adaptive + themed icon (`drawable/ic_launcher_foreground.xml`), PNG legacy icons |
| Splash | `Splash.imageset` + slate `LaunchScreen.storyboard` | `values/styles.xml` (Android 12+ API, `drawable/splash_icon.xml`), `drawable*/splash.png` |
| Status bar | light content, `UIUserInterfaceStyle` Dark | `SystemBars`/`StatusBar` DARK, slate bars |
| Permissions | no usage-description keys | INTERNET removed; VIBRATE (@capacitor/haptics) and com.android.vending.BILLING (Play Billing) — both install-time, never prompted |

Raster icons and splash images are generated by `scripts/generate-icons.sh` from `public/icon*.svg` and `resources/mark.svg`.
