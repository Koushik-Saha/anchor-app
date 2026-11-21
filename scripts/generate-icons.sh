#!/usr/bin/env bash
# Regenerates the PNG app icons in public/ from the SVG sources, using the
# locally installed Google Chrome as the renderer (no npm dependency).
# Run after changing public/icon.svg or public/icon-maskable.svg, then commit the PNGs.
#
#   icon.svg          → icon-96.png (shortcut), icon-192.png, icon-512.png   (purpose "any": rounded, transparent corners)
#   icon-maskable.svg → icon-maskable-512.png (Android adaptive icon), apple-touch-icon.png (180, iOS masks it itself)
set -euo pipefail

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
cd "$(dirname "$0")/../public"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

render() { # <svg> <size> <out.png>
  local svg="$1" size="$2" out="$3"
  cat >"$tmp/page.html" <<HTML
<!doctype html><html><body style="margin:0;background:transparent">
<img src="file://$PWD/$svg" width="$size" height="$size" style="display:block">
</body></html>
HTML
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --allow-file-access-from-files \
    --window-size="$size,$size" --screenshot="$PWD/$out" "file://$tmp/page.html" >/dev/null 2>&1
  echo "  $out ($(sips -g pixelWidth -g pixelHeight "$out" | awk '/pixel/{printf "%s ", $2}'))"
}

echo "Rendering icons:"
render icon.svg 96 icon-96.png
render icon.svg 192 icon-192.png
render icon.svg 512 icon-512.png
render icon-maskable.svg 512 icon-maskable-512.png
render icon-maskable.svg 180 apple-touch-icon.png
