# Release checklist

Work through it top to bottom for every release. Nothing here submits anything on its own: the final *Submit for Review* / *Send for review* clicks are yours.

Related: [store-listing.md](store-listing.md) (copy, privacy answers, screenshots) · [signing.md](signing.md) (keys + signed builds) · [deploy.md](deploy.md) (Coolify + post-deploy smoke test) · [native.md](native.md) (device + purchase tests) · [pwa-checklist.md](pwa-checklist.md) (web).

---

## 1. Pre-flight (repo)

- [ ] `nvm use` (Node 22), `npm ci`
- [ ] `npm run typecheck && npm run lint && npm test && npm run build && npm run size`: all green; JS gzip well under 200 KB (≈ 29 KB at 1.0.0).
- [ ] `npm run copy-scan`: **0 HIGH**. Re-read every REVIEW line (see §6).
- [ ] No placeholders left in anything that ships or gets pasted into a store:
  ```bash
  grep -rnE "example\.com|YOUR-DOMAIN|YOUR NAME|RELEASE:" public docs/store-listing.md index.html
  ```
  `public/privacy.html` has two `RELEASE:` notes: the contact email, and confirming the web host's log settings.
- [ ] Device checklist in `docs/native.md` passed on a real iPhone **and** a real Android phone (launch, haptics, screen stays awake, deep link, airplane mode, purchase + restore on a fresh install).
- [ ] Web checklist in `docs/pwa-checklist.md` passed (Lighthouse PWA, offline reload, installed app offline).

## 2. Version bump

Use the same marketing version everywhere. Build numbers only ever go up.

| Where | Marketing version | Build number |
|---|---|---|
| `package.json` → `"version"` | `1.0.0` | — |
| iOS: Xcode → *App* target → *General* | **Version** `1.0.0` (`MARKETING_VERSION`) | **Build** `1` (`CURRENT_PROJECT_VERSION`), +1 for every upload |
| Android: `android/app/build.gradle` | `versionName "1.0.0"` | `versionCode 1`, +1 for every upload |

Then run `npm run build && npx cap sync`, commit (`Release 1.0.0`), and tag it: `git tag v1.0.0 && git push --tags`.

## 3. iOS: archive and upload

One-time setup:
- [ ] Apple Developer Program membership ($99/yr). Create the app record in App Store Connect with bundle ID `app.anchor.reset`.
- [ ] Sign the **Paid Apps agreement** and fill in tax and banking. In-app purchases don't load without it.
- [ ] **Privacy manifest:** `ios/App/App/PrivacyInfo.xcprivacy` exists (no tracking, no collected data, UserDefaults `CA92.1`). In Xcode, drag it into the **App** group and tick **Target Membership: App**. Without this, the upload is flagged (ITMS-91053).
- [ ] **Capability:** *Signing & Capabilities* → **+ In-App Purchase**.
- [ ] **Export compliance:** Anchor uses no encryption beyond the OS. Add `ITSAppUsesNonExemptEncryption` = `NO` to `Info.plist`, or answer "No" in App Store Connect on each upload.
- [ ] **iPad decision:** the project targets iPhone + iPad (`TARGETED_DEVICE_FAMILY = 1,2`).
  - Either supply 13" iPad screenshots,
  - or make it iPhone-only: *General → Supported Destinations* → remove iPad.

Each release:
1. `npm run build && npx cap sync ios && npx cap open ios`
2. Scheme **App**, destination **Any iOS Device (arm64)**. Set *Edit Scheme → Run → StoreKit Configuration* to **None**; the local `.storekit` file is for testing only.
3. **Product → Archive.** When it finishes, Organizer opens → **Distribute App → App Store Connect → Upload**.
4. Wait for the processing email, then test it via **TestFlight** on a real iPhone, running the native.md checklist on the TestFlight build.
5. In App Store Connect, on the new version page:
   - paste the copy from store-listing.md;
   - add screenshots;
   - check the privacy policy URL and App Privacy (**Data Not Collected**);
   - set the age rating (4+);
   - attach the **`full_unlock`** in-app purchase. The first IAP must be submitted together with an app version;
   - add the App Review notes.
6. **Submit for Review**: your click.

## 4. Android: bundle and upload

One-time setup:
- [ ] Google Play developer account ($25). Create the app (`app.anchor.reset`), free, with in-app products.
- [ ] Create the **upload key** and `android/keystore.properties` exactly as in [signing.md](signing.md). Both stay outside git.
- [ ] Enrol in **Play App Signing** when you first upload. Google holds the app signing key; you keep the upload key.
- [ ] Fill in the *App content* forms using the exact answers in store-listing.md: privacy policy, ads (No), app access, content rating, target audience, **Data safety (No data collected)** and the **Health apps** declaration (wellness category).
- [ ] **Backup decision:** `android:allowBackup="true"` today. See the note in store-listing.md; the privacy policy already covers the current setting.

Each release:
1. `npm run build && npx cap sync android && npx cap open android`
2. `cd android && ./gradlew bundleRelease`, signed automatically from `keystore.properties`. Output: `android/app/build/outputs/bundle/release/app-release.aab`. Verify it with `jarsigner` (signing.md §4).
3. Play Console → **Testing → Internal testing → Create release** → upload the `.aab` → add release notes → roll out to testers.
4. Install from the internal testing link on a real phone and run the native.md checklist, including purchase with a license tester.
5. Create the `full_unlock` product if this is the first release: *Monetize → In-app products*, USD 6.99, **Activate**.
6. Store listing:
   - paste the copy;
   - add the phone screenshots and the **1024×500 feature graphic**;
   - add the icon (`public/icon-512.png`);
   - check that Data safety shows "No data collected".
7. Promote to **Production** → **Send for review**: your click.

## 5. Web (PWA)

- [ ] Deploy with the `Dockerfile` on Coolify using the exact settings in [deploy.md](deploy.md). Ideally enable HTTP/3 on the proxy, which saves one round trip on the first visit.
- [ ] Run the post-deploy smoke test in deploy.md (A–F), starting with `scripts/smoke-web.sh https://YOUR-DOMAIN`.
- [ ] `https://YOUR-DOMAIN/privacy.html` loads. This is the URL both stores link to.
- [ ] Host access logs are off or kept short, matching what privacy.html says.
- [ ] Run docs/pwa-checklist.md against the live URL.

## 6. Review-risk notes

**Apple 1.4.1 / Google health policy: no medical claims.** Anchor must read as a self-help / wellness tool everywhere. `npm run copy-scan` checks all shipped and store copy:

| Result (1.0.0) | Count |
|---|---|
| HIGH (treatment / cure / diagnosis / efficacy claims) | **0** |
| REVIEW (medical vocabulary) | 6, reviewed below |

Flagged by the scan, with my assessment:

| Where | Text | Assessment |
|---|---|---|
| Settings, privacy.html, store description | "not a medical device, and not a substitute for professional care" | ✅ Disclaimer. Reviewers want this. Keep. |
| App Review notes | "makes no medical, diagnostic or treatment claims" | ✅ Disclaimer for the reviewer. Keep. |
| privacy.html heading | "Not medical advice" | ✅ Keep. |
| My plan → Private note hint | "for example, a medication reminder" | ⚠ **Low risk.** It's not a claim, but it invites a reviewer to ask whether the app handles health data. Answer: it's stored only on the device. **Optional rewording:** "Only shown here — anything you want to remember." |

Not caught by the scan (tone and implied effects), from a manual read of every reset-flow line:

| Where | Text | Assessment |
|---|---|---|
| Settle line (classic, grounding-only, extended); My plan placeholder; screenshot #4 | "You are safe right now." | ⚠ **Medium.** The app can't know the person is safe, and panic symptoms can overlap with real emergencies. Common in self-help copy and not a store-policy violation, but it is an absolute promise. **Suggest:** "You can get through this." |
| Extended reset line | "Each breath slows things down." | ⚠ **Low–medium.** Implies a physiological effect, a soft efficacy claim. **Suggest:** "One slow breath at a time." |
| Extended reset line | "Your body knows how to settle." | ⚠ **Low.** Soft physiological assertion. Acceptable; or "Let your shoulders drop." |
| Settle line; Done headline | "This always passes." / "It always passes." | ✅ **Low.** Panic episodes do end; the line is reassurance, not a treatment claim. Keep. |
| Store copy | "Panic attack?", "made for the worst 90 seconds", "let the wave pass" | ✅ Describes the moment, not an outcome. Keep. Never add "reduces / stops / treats anxiety". |
| Keywords | `panic, anxiety` | ✅ Describing the use case is fine; it isn't a claim. |

These lines are product copy, so I've **flagged them, not changed them**. If you reword them, keep each at 8 words or fewer; `protocols.test.ts` checks this.

Other review risks:
- **988 is US-only.** The app says "988 (US)". If you release outside the US, either start with the US storefront only or add non-US guidance in the app. privacy.html already says "elsewhere, contact your local emergency number".
- **Apple 3.1.1:** the unlock is sold only through IAP in the native apps. The web version only says "Unlock in the free mobile app" and has no external purchase links. ✅
- **Apple 3.1.1 restore:** Restore purchases is in the unlock panel and in Settings. ✅
- **Apple 4.2 (minimum functionality):** single-purpose, but it has the reset flow, library, history, settings and My plan. Mention haptics and offline use in the review notes. ✅
- **Apple 5.1.1 / Play User Data:** no data collected, a privacy policy URL is set, and the privacy manifest declares nothing collected. ✅
- **Permissions:**
  - iOS requests none.
  - Android: the merged manifest (verified by a test build) holds only install-time VIBRATE and BILLING, plus AndroidX's app-private `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` (signature-level, invisible to users). INTERNET is removed. ✅
