# Deploying the web app (PWA) on Coolify

The repo ships a two-stage **`Dockerfile`**:
1. Node 22 runs `npm ci && npm run build` (including the bundle-budget check).
2. nginx 1.30 serves `dist/`, configured by `deploy/nginx.conf` and `deploy/security-headers.conf`.

Coolify's proxy terminates HTTPS, and the container serves plain HTTP on port 80.

| Path | Cache-Control | Why |
|---|---|---|
| `/assets/*`, `/workbox-*.js` | `public, max-age=31536000, immutable` | file names are content-hashed |
| `/`, `*.html` (incl. `/privacy.html`), `/sw.js`, `/manifest.webmanifest` | `no-cache` | always revalidated, so updates reach people |
| icons (`*.png`, `*.svg`) | `public, max-age=86400` | not hashed |
| unknown paths | the app shell (`no-cache`) | `/?action=start` etc. |
| missing `/assets/*` | **404** | never index.html served as JavaScript |

Every response also carries these headers:
- **HSTS**;
- a strict **CSP**: `default-src 'self'`, `script-src 'self'`, `connect-src 'self'`. The browser itself enforces "no network calls";
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `COOP`;
- a `Permissions-Policy` that leaves Screen Wake Lock allowed.

**nginx keeps no access logs**, which matches what `privacy.html` promises. Pages are gzip-compressed. `/healthz` is the health check.

Test it locally first:
```bash
docker build -t anchor-web . && docker run --rm -p 8088:80 anchor-web
scripts/smoke-web.sh http://localhost:8088      # 28 checks
```

---

## Coolify settings (v4)

**Before you start:**
- Point a DNS **A** record (and **AAAA** if you use IPv6) for your subdomain, e.g. `anchor.example.com`, at the Coolify server, so the Let's Encrypt certificate can be issued.
- **Recommended:** create a **`production`** branch for Coolify to deploy, and merge `main` into it when you release. Every task currently gets pushed to `main`, so auto-deploying `main` would publish work-in-progress.

*Projects → your project → + New → Resource*:

| Setting | Value |
|---|---|
| Source | **Public Repository**: `https://github.com/Koushik-Saha/anchor-app` |
| Branch | `production` (recommended; see above) or `main` |
| Build Pack | **Dockerfile** |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Ports Exposes | `80` |
| Ports Mappings | *(empty; the proxy routes to the container)* |
| Domains | `https://anchor.example.com` (the `https://` prefix makes Coolify issue the certificate) |
| Redirect | **Redirect to HTTPS**: on. If you add `www`, redirect it to the non-www name (or vice versa) |
| Environment Variables | *none*: the build needs no secrets |
| Persistent Storage | *none* |
| Health Check | **Enabled**, Path `/healthz`, Port `80`, Method `GET`, Return code `200`, Scheme `http` |
| Auto Deploy (webhook) | On, for the `production` branch only |
| Resource limits (optional) | Memory 128 MB is plenty for nginx |

**Proxy logs (privacy):** check that Coolify's proxy isn't writing access logs either. Go to *Servers → your server → Proxy → Configuration*: for Traefik, there should be no `--accesslog=true` (remove it if present); for Caddy, no `log` directive on this site. `privacy.html` says server logs are short-lived at most. If you keep proxy logs, set a short retention and leave the policy as is.

**Then:** click **Deploy**, watch the build log (it ends with `App JS total (gzip): 29.x KB`), and wait until the health check is green.

---

## Post-deploy smoke test

Run it after every deploy. Replace `anchor.example.com` with your domain.

### A. Automated (2 min)
```bash
scripts/smoke-web.sh https://anchor.example.com          # expect: 28 passed, 0 failed
curl -sI http://anchor.example.com | head -3              # expect 301/308 → https
npx -y lighthouse@11.7.1 https://anchor.example.com --only-categories=pwa --view   # expect PWA score 1
```

### B. Android (Chrome)
1. Open `https://anchor.example.com`. Check the padlock: valid certificate, no warnings.
2. Install it: after one reset, the Done screen offers **Add to Home Screen**. Or use Chrome menu → **Install app**. The Anchor icon appears on the home screen.
3. Long-press the icon: **Start reset** appears in the shortcut menu.
4. Turn on **airplane mode** (Wi-Fi off too), then swipe Anchor away from recent apps.
5. Open Anchor from the icon. It opens full-screen with no browser bar, on Home.
6. Tap **Start reset** and let the **whole classic reset run, without Skip** (~93 s). Check that:
   - the circle breathes;
   - the phone vibrates at each phase;
   - the screen stays on;
   - it reaches **"You did it."** on its own.
7. Tap an answer to "What helped?", then open Settings → History: the reset is listed.
8. Still offline: long-press the icon → **Start reset**. It opens straight into the breathing circle.
9. Still offline: open `https://anchor.example.com/privacy.html` in Chrome. It loads from the cache.

### C. iPhone (Safari, iOS 16.4+)
1. Open the URL in **Safari** → **Share** → **Add to Home Screen** → Add. The Done screen also shows this hint on iPhone.
2. Turn on airplane mode and close Safari.
3. Open Anchor from the home screen: full-screen, slate status bar.
4. Run the **whole classic reset without Skip**, through to Done. (iOS web apps can't vibrate; that's expected. Native haptics come with the App Store app.)
5. Answer "What helped?" and check History.
6. *Expected differences on iOS web:* home-screen shortcuts (long-press → Start reset) aren't supported for web apps on iOS; the App Store app has `anchor://start` instead.

### D. Everything free on the web (any browser)
1. Library → tap **Box breathing**. It starts straight away: no panel, price or lock badge. Do the same with **Extended reset** and **Night reset**.
2. Home → **My plan** opens the form directly. Save a note, finish a reset, and Done shows it.
3. No screen mentions unlocking, buying or the mobile app. Settings has no Purchase section.

### E. Privacy page
- `https://anchor.example.com/privacy.html` loads over HTTPS in the dark theme, with the real contact email (not `example.com`).
- This exact URL is what both store listings use.

### F. Update check (after your *second* deploy)
- Open the installed app, close it, and open it again. It should be on the new version: the service worker updates in the background and takes over on the next launch.

> All of A, and the offline / privacy parts of B–E, were run automatically against this exact Docker image on localhost before release: 28/28 HTTP checks, plus a full 94 s classic reset offline with zero console errors or CSP violations. Real phones are still needed for install, haptics and wake lock.
