#!/usr/bin/env bash
# Post-deploy HTTP smoke test for the Anchor web app.
#   scripts/smoke-web.sh https://anchor.example.com
# Checks status codes, cache policy, security headers, content types and gzip.
# Exits non-zero if anything fails. Safe to run any time (read-only GETs).
set -uo pipefail

BASE="${1:?usage: scripts/smoke-web.sh <base-url>}"
BASE="${BASE%/}"
pass=0
fail=0

ok() { printf '  \033[32mPASS\033[0m %s\n' "$1"; pass=$((pass + 1)); }
bad() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fail=$((fail + 1)); }

# headers <path>: response headers (lower-cased names), following no redirects.
headers() { curl -sS -o /dev/null -D - -H 'Accept-Encoding: gzip' "$BASE$1" | tr -d '\r'; }
header() { grep -i "^$2:" <<<"$1" | head -1 | cut -d' ' -f2-; }
status() { head -1 <<<"$1" | awk '{print $2}'; }

expect() { # <label> <actual> <extended-regex>
  if grep -Eq -- "$3" <<<"$2"; then ok "$1"; else bad "$1 — got: ${2:-<none>}"; fi
}

echo "Anchor smoke test → $BASE"

echo "App shell"
h=$(headers /)
expect "/ → 200" "$(status "$h")" '^200$'
expect "/ is HTML" "$(header "$h" content-type)" '^text/html'
expect "/ is not cached (no-cache)" "$(header "$h" cache-control)" 'no-cache'
expect "/?action=start → 200" "$(status "$(headers '/?action=start')")" '^200$'
expect "/index.html no-cache" "$(header "$(headers /index.html)" cache-control)" 'no-cache'

echo "Security headers"
expect "HSTS" "$(header "$h" strict-transport-security)" 'max-age=[0-9]{7,}'
csp=$(header "$h" content-security-policy)
expect "CSP: default-src 'self'" "$csp" "default-src 'self'"
expect "CSP: connect-src 'self' (no network calls elsewhere)" "$csp" "connect-src 'self'"
expect "CSP: no inline scripts" "$csp" "script-src 'self';"
expect "nosniff" "$(header "$h" x-content-type-options)" 'nosniff'
expect "Referrer-Policy no-referrer" "$(header "$h" referrer-policy)" 'no-referrer'
expect "frame-ancestors / X-Frame-Options" "$(header "$h" x-frame-options)" 'DENY'
expect "Server header hides version" "$(header "$h" server)" '^(nginx|[^/]*)$'

echo "Service worker + manifest"
h=$(headers /sw.js)
expect "/sw.js → 200" "$(status "$h")" '^200$'
expect "/sw.js no-cache" "$(header "$h" cache-control)" 'no-cache'
expect "/sw.js is JavaScript" "$(header "$h" content-type)" 'javascript'
h=$(headers /manifest.webmanifest)
expect "manifest → 200" "$(status "$h")" '^200$'
expect "manifest content-type" "$(header "$h" content-type)" '^application/manifest\+json'
expect "manifest no-cache" "$(header "$h" cache-control)" 'no-cache'

echo "Hashed assets"
asset=$(curl -sS "$BASE/" | grep -oE '/assets/[^"]+\.js' | head -1)
if [ -n "$asset" ]; then
  h=$(headers "$asset")
  expect "$asset → 200" "$(status "$h")" '^200$'
  expect "hashed JS cached 1 year, immutable" "$(header "$h" cache-control)" 'max-age=31536000.*immutable'
  expect "hashed JS gzip-compressed" "$(header "$h" content-encoding)" 'gzip'
else
  bad "could not find a hashed /assets/*.js in index.html"
fi
# sw.js references the Workbox runtime without its .js extension.
wb=$(curl -sS "$BASE/sw.js" | grep -oE 'workbox-[A-Za-z0-9_-]+' | head -1)
if [ -n "$wb" ]; then
  expect "/$wb.js cached 1 year, immutable" "$(header "$(headers "/$wb.js")" cache-control)" 'max-age=31536000.*immutable'
else
  bad "could not find the Workbox runtime referenced by sw.js"
fi
expect "missing asset → 404 (not the app shell)" "$(status "$(headers /assets/does-not-exist.js)")" '^404$'

echo "Privacy page + icons"
h=$(headers /privacy.html)
expect "/privacy.html → 200" "$(status "$h")" '^200$'
expect "/privacy.html no-cache" "$(header "$h" cache-control)" 'no-cache'
if curl -sS "$BASE/privacy.html" | grep -q 'Anchor collects no data'; then ok "privacy page content"; else bad "privacy page content"; fi
expect "/icon-192.png → image/png" "$(header "$(headers /icon-192.png)" content-type)" '^image/png'

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
