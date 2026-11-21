# Signing the native release builds

**Rule:** signing keys, passwords and store credentials never go into this repo, which is public. They live in your home folder, your Mac's Keychain and your password manager. The repo only contains config that *reads* them. `.gitignore` already blocks `*.jks`, `*.keystore`, `keystore.properties`, `*.p8`, `*.p12` and `*.mobileprovision`.

---

## Android: upload key + Gradle

Google Play uses two keys:
- **App signing key:** Google creates and holds it (Play App Signing). You never see it.
- **Upload key:** yours. You sign each `.aab` with it before uploading. If it's lost or leaked, Play support can reset it, but that takes days.

### 1. Create the upload key (once), outside the repo
```bash
mkdir -p ~/keys && chmod 700 ~/keys
keytool -genkeypair -v -keystore ~/keys/anchor-upload.jks -alias anchor-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
`keytool` asks for a store password, a key password and your name or organisation. Save both passwords in your password manager, and **back up `~/keys/anchor-upload.jks`** somewhere safe and offline.

### 2. Point Gradle at it (local file, gitignored)
```bash
cp android/keystore.properties.example android/keystore.properties
# edit android/keystore.properties:
#   storeFile=~/keys/anchor-upload.jks
#   storePassword=…   keyAlias=anchor-upload   keyPassword=…
git check-ignore -v android/keystore.properties   # must print a .gitignore rule
```
As an alternative (for CI), set the environment variables `ANCHOR_UPLOAD_STORE_FILE`, `ANCHOR_UPLOAD_STORE_PASSWORD`, `ANCHOR_UPLOAD_KEY_ALIAS` and `ANCHOR_UPLOAD_KEY_PASSWORD`.

`android/app/build.gradle` reads these values, signs `release` builds with them, and **refuses to build a release** if they're missing. You'll never end up with an unsigned bundle by accident.

### 3. Build the signed bundle
```bash
nvm use && npm ci
npm run build && npx cap sync android
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```
(Or in Android Studio: *Build → Generate Signed App Bundle* gives the same result, using its own wizard.)

### 4. Verify before uploading
```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | grep -E "jar verified|CN="
```
You should see `jar verified.` and **your** name in the `CN=` line.

### 5. Upload
In Play Console, go to *Testing → Internal testing → Create release* and upload `app-release.aab`. On the first upload, accept **Play App Signing**. Then follow `docs/release-checklist.md` §4.

---

## iOS: Xcode automatic signing

Apple signing identities live in your **Mac's Keychain** and your **Apple Developer account**. Xcode creates and renews them; nothing needs to be in the repo.

1. Join the Apple Developer Program ($99/yr). In Xcode → *Settings → Accounts*, add that Apple ID.
2. `npm run build && npx cap sync ios && npx cap open ios`
3. Select the **App** target → *Signing & Capabilities*:
   - **Automatically manage signing**: on
   - **Team**: your team
   - **Bundle Identifier**: `app.anchor.reset`
   - **+ Capability → In-App Purchase**
4. Add `ios/App/App/PrivacyInfo.xcprivacy` to the App target (drag it into the *App* group and tick *Target Membership: App*).
5. Destination **Any iOS Device (arm64)** → **Product → Archive** → *Distribute App* → *App Store Connect* → *Upload*. On the first archive, Xcode creates an **Apple Distribution** certificate in your Keychain automatically.

**What lands in the repo:** only your **Team ID** (`DEVELOPMENT_TEAM`, 10 characters) in `project.pbxproj`. It isn't secret, since it's embedded in every app you ship, so committing it is normal.

**Never commit:**
- exported certificates (`.p12`);
- provisioning profiles (`.mobileprovision`);
- App Store Connect API keys (`AuthKey_*.p8`).

All three are gitignored. Keep any exports in `~/keys` and your password manager.

---

## If a key leaks

- **Android upload key:** in Play Console, go to *Setup → App signing → Request upload key reset*. Generate a new one with step 1.
- **Apple:** revoke the certificate at developer.apple.com → *Certificates*. Xcode will create a new one on the next archive.
- **Either:** rotate any passwords, and remove the file from git history if it was ever committed (`git filter-repo`). Treat it as compromised regardless.
