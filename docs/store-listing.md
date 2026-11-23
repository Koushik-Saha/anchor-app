# Anchor — store listing

Ready-to-paste copy for App Store Connect and Google Play Console. Character counts are checked against each store's limits (see the bottom of this file).

**Positioning rule:** Anchor is a *self-help / wellness* tool. Describe what it **does** (guides breathing and grounding), never what it **cures, treats, prevents or reduces**. Run `npm run copy-scan` after any edit to this file.

---

## Shared copy

### Name — both stores (max 30)
```
Anchor: Panic Reset
```

### Apple subtitle (max 30)
```
One tap. 90 seconds. Offline.
```

### Google short description (max 80)
```
Panic attack? One tap. 90 seconds. No account, no internet, no one watching.
```

### Apple promotional text (max 170 — can be changed without review)
```
Panic attack? One tap. 90 seconds. No account, no internet, no one watching. Breathe with the circle, come back through your senses, and let the wave pass.
```

### Description — both stores (max 4,000)
```
Panic attack? One tap. 90 seconds. No account, no internet, no one watching.

Anchor is made for the worst 90 seconds. Open it and tap the big button. That's it — no sign-up, no menus, nothing to read.

A slow circle breathes with you: in for 4, hold for 2, out for 6. Then a simple 5-4-3-2-1 exercise brings your attention back through your senses — five things you can see, four you can touch. Then a few calm words, one line at a time, never a wall of text.

Every screen is built for shaking hands and a racing mind: huge buttons, one short line of text, and a Skip and Close that are always there. You're never trapped in it.

WORKS ANYWHERE
• Fully offline — airplane mode, a basement, a subway.
• Soft haptics you can follow with your eyes closed. Gentle tones if you want them (off by default).
• Keeps your screen awake while you breathe.

PRIVATE BY DESIGN
• No account. No analytics. No ads. No tracking.
• Your settings, history and notes stay on your phone. We can't see them, because they never reach us.

GENTLE ON PURPOSE
• Large text and reduced-motion options; works with VoiceOver and TalkBack.
• Dark, dim and quiet — designed for 2 a.m.
• "In crisis? Call or text 988" is always one tap away (US).

FREE
Everything in Anchor is free: the classic 90-second reset, breathing-only and grounding-only resets, box breathing, an extended 3-minute reset, a night reset (extra dim, silent), and My plan: your own note, shown after every reset, and a one-tap call to your person.
No subscription. No in-app purchase. Nothing locked.

Anchor is a self-help tool, not a medical device, and not a substitute for professional care. If you are in crisis in the US, call or text 988. Elsewhere, contact your local emergency number.
```

### Feature bullets (for the website, press kit, or Play "What's new")
- One tap from opening the app to a running reset.
- 90-second guided reset: paced breathing, 5-4-3-2-1 grounding, calm closing lines.
- Works fully offline; no account, no analytics, no ads, no tracking.
- Haptic rhythm you can follow with your eyes closed; optional soft tones.
- Large text, reduced motion, screen-reader support.
- History and "What helped?" saved only on your device.
- Completely free: every reset and My plan. No subscription, no in-app purchase.

---

## Apple App Store Connect

| Field | Value |
|---|---|
| Primary category | Health & Fitness |
| Secondary category | Lifestyle |
| Keywords (max 100) | `panic,anxiety,breathe,breathing,grounding,calm,5-4-3-2-1,box breathing,sos,offline,private,night` |
| Price | Free (no in-app purchases) |
| Privacy Policy URL | `https://YOUR-DOMAIN/privacy.html` |
| Support URL | `https://YOUR-DOMAIN/` (or a support page) |
| Copyright | `2026 YOUR NAME` |

**In-app purchases:** none. Don't create any products in App Store Connect.

**Age rating questionnaire:** answer **None** to every content item, including *Medical/Treatment Information*; **No** to unrestricted web access, gambling, contests and user-generated content. Expected rating: **4+**.

**App Privacy — exact answers**
1. *App Privacy → Get Started*: "Do you or your third-party partners collect data from this app?" → **No, we do not collect data from this app.**
2. Publish. The product page shows **"Data Not Collected"**.
3. Why this is true: the app makes no network requests, has no third-party SDKs and sells nothing. Data saved on the device (settings, history, My plan) is not "collected", because it never leaves the device.

**App Review notes (paste into "Notes")**
```
No account or login, and no in-app purchases: every feature is free and works immediately
and offline (try airplane mode). Library has all six resets; My plan is on the Home screen.
Anchor is a self-help / wellness tool. It makes no medical, diagnostic or treatment claims, collects no data,
and shows the US 988 crisis line on the Home and Done screens. Deep link for testing: anchor://start
```

---

## Google Play Console

| Field | Value |
|---|---|
| App category | Health & Fitness |
| Contact email | `hello@example.com` → **replace** |
| Privacy policy | `https://YOUR-DOMAIN/privacy.html` |
| Ads | **No, my app does not contain ads** |
| App access | **All functionality is available without special access** (no login, no purchases) |
| Content rating (IARC) | Category: *Utility, Productivity, Communication or Other*. Answer **No** to violence, sexuality, language, controlled substances, gambling, user interaction/sharing and location sharing. Expected: **Everyone / PEGI 3** |
| Target audience | Recommended **13+** (13–15, 16–17, 18+). Not under 13, so the Families policy doesn't apply. *Your decision.* |
| Health apps declaration | Choose the closest **wellness** feature (e.g. stress management / relaxation). Do **not** pick medical device, disease management or clinical categories. *Option names change; check the live form.* |
| Monetization | **Free**, no in-app products. Don't create any under *Monetize*. |

**Data safety — exact answers**
1. "Does your app collect or share any of the required user data types?" → **No**.
2. The form skips the rest (encryption in transit and data deletion only apply when data is collected).
3. The store listing shows **"No data collected"** and **"No data shared with third parties"**.
4. Why this is true: Google counts data as "collected" only when it is sent off the device. Anchor sends nothing.

> ⚠ **Android Auto Backup is on** (`android:allowBackup="true"`). This doesn't change the Data safety answer (backups go to the user's own Google account, not to you), and the privacy policy mentions it. If you want "stays on this device" to be literally true, set it to `false`. Trade-off: history and My plan won't survive a phone change.

---

## Screenshot plan

The same 5 screens, in this order, for both stores. Captions go **above** the device frame, in white on slate (#0F172A), at most ~6 words.

| # | Screen to capture | State to set up | Caption |
|---|---|---|---|
| 1 | **Home** | Fresh install, default settings | **Panic attack? One tap.** |
| 2 | **Reset — breathing** | Classic reset, ~3.5 s in (circle nearly full, "Breathe in") | **Breathe with the circle.** |
| 3 | **Reset — grounding** | Skip once ("Find 5 things you can see.") | **Come back through your senses.** |
| 4 | **Done — with My plan** | My plan note "This passes. You are safe." and contact "Sam" (fictional) | **Your words. Your person. One tap.** |
| 5 | **History** | 4–5 sample resets with "What helped?" answers | **No account. No internet. No one watching.** |

Optional 6th for Play (up to 8 allowed): **Library** — *"Six resets. All free."*

**Sizes**
- Apple: iPhone 6.9" — **1320 × 2868** (1290 × 2796 also accepted). Because the app currently supports **iPad** (`TARGETED_DEVICE_FAMILY = 1,2`), Apple also requires **13" iPad** screenshots (2064 × 2752). Make the app iPhone-only in Xcode to skip them; see the release checklist.
- Google: phone, portrait 9:16, at least **1080 × 1920**. A **1024 × 500 feature graphic** is also required: the circle mark and "Anchor" on slate.

**Capture tips**
- Use real device or simulator builds, not browser mock-ups.
- Clean status bar:
  - iOS: `xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4`
  - Android: turn on System UI demo mode.
- Use only fictional data. Never show a real name or phone number.
- Screenshots must match the shipped app; don't add features that aren't there.

---

## Length check (re-run after edits)

```bash
node -e "for (const [n,max,s] of [
 ['Name',30,'Anchor: Panic Reset'],
 ['Apple subtitle',30,'One tap. 90 seconds. Offline.'],
 ['Google short description',80,'Panic attack? One tap. 90 seconds. No account, no internet, no one watching.'],
 ['Keywords',100,'panic,anxiety,breathe,breathing,grounding,calm,5-4-3-2-1,box breathing,sos,offline,private,night'],
]) console.log((s.length<=max?'ok  ':'OVER')+' '+n.padEnd(26)+s.length+'/'+max)"
```
