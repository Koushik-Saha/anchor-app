#!/usr/bin/env bash
# Regenerates every raster icon / splash image from the SVG sources, using the
# locally installed Google Chrome as the SVG renderer and ImageMagick to
# compose/flatten (no npm dependency). Commit the outputs.
#
# Sources:
#   public/icon.svg           rounded app icon (web "any" icons, Android legacy launcher)
#   public/icon-maskable.svg  full-bleed icon (web maskable, iOS app icon, Android round legacy)
#   resources/mark.svg        the mark alone, transparent (splash art)
# Android adaptive/themed icon and Android 12+ splash icon are vector drawables
# (android/app/src/main/res/drawable*/ic_launcher_foreground.xml, splash_icon.xml) — edit those directly.
set -euo pipefail

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLATE="#0F172A"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

render() { # <svg path> <size> <out.png>  (transparent where the SVG is)
  local svg="$1" size="$2" out="$3"
  cat >"$tmp/page.html" <<HTML
<!doctype html><html><body style="margin:0;background:transparent">
<img src="file://$svg" width="$size" height="$size" style="display:block">
</body></html>
HTML
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --allow-file-access-from-files \
    --window-size="$size,$size" --screenshot="$out" "file://$tmp/page.html" >/dev/null 2>&1
}

size_of() { sips -g pixelWidth -g pixelHeight "$1" | awk '/pixel/{printf "%s ", $2}'; }

# splash <w> <h> <out>: slate background with the mark centred at ~30% of the short side.
splash() {
  local w="$1" h="$2" out="$3" short mark
  short=$(( w < h ? w : h )); mark=$(( short * 30 / 100 ))
  render "$ROOT/resources/mark.svg" "$mark" "$tmp/mark.png"
  magick -size "${w}x${h}" "xc:$SLATE" "$tmp/mark.png" -gravity center -composite -alpha off "$out"
}

echo "Web (public/):"
for s in 96 192 512; do render "$ROOT/public/icon.svg" $s "$ROOT/public/icon-$s.png"; echo "  icon-$s.png"; done
render "$ROOT/public/icon-maskable.svg" 512 "$ROOT/public/icon-maskable-512.png"; echo "  icon-maskable-512.png"
render "$ROOT/public/icon-maskable.svg" 180 "$tmp/a.png"
magick "$tmp/a.png" -background "$SLATE" -alpha remove -alpha off "$ROOT/public/apple-touch-icon.png"; echo "  apple-touch-icon.png"

IOS="$ROOT/ios/App/App/Assets.xcassets"
if [ -d "$IOS" ]; then
  echo "iOS:"
  # App Store icons must be opaque (no alpha channel).
  render "$ROOT/public/icon-maskable.svg" 1024 "$tmp/ios.png"
  magick "$tmp/ios.png" -background "$SLATE" -alpha remove -alpha off "$IOS/AppIcon.appiconset/AppIcon-512@2x.png"
  echo "  AppIcon 1024 ($(size_of "$IOS/AppIcon.appiconset/AppIcon-512@2x.png"))"
  for f in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do
    splash 2732 2732 "$IOS/Splash.imageset/$f"
  done
  echo "  Splash 2732x2732 ×3"
fi

RES="$ROOT/android/app/src/main/res"
if [ -d "$RES" ]; then
  echo "Android:"
  # Legacy launcher icons (API < 26); API 26+ uses the vector adaptive icon.
  for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
    d="${pair%%:*}"; s="${pair##*:}"
    render "$ROOT/public/icon.svg" "$s" "$RES/mipmap-$d/ic_launcher.png"
    render "$ROOT/public/icon-maskable.svg" "$s" "$tmp/r.png"
    # Circle-crop: give the image an alpha channel first, then keep only the inside of the circle.
    magick "$tmp/r.png" -alpha set \( -size "${s}x${s}" xc:none -fill white -draw "circle $((s/2)),$((s/2)) $((s/2)),0" \) \
      -compose DstIn -composite "PNG32:$RES/mipmap-$d/ic_launcher_round.png"
    echo "  mipmap-$d ic_launcher / ic_launcher_round ($s)"
  done
  # Splash images used by @capacitor/splash-screen after launch (sizes match the template).
  for f in "$RES"/drawable/splash.png "$RES"/drawable-port-*/splash.png "$RES"/drawable-land-*/splash.png; do
    read -r w h <<<"$(size_of "$f")"
    splash "$w" "$h" "$f"
  done
  echo "  splash.png ×11"
fi
