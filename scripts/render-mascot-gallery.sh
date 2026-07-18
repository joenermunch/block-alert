#!/usr/bin/env bash
set -euo pipefail

output=${1:-/private/tmp/block-alert-mascot-options.png}
font=/System/Library/Fonts/Supplemental/Arial.ttf
tiles=$(mktemp -d)
trap 'rm -rf "$tiles"' EXIT

names=(
  niblet-stylus niblet-smart-stylus pixel-core-miko oscilla usb-flash-spirit
  koiwave-courier nixie-pulse kiko-keycap mikobyte-packet-manta pixelin-holo-pad
  gyromochi nimbit nimbi-9 bytebun-relay glom bytebun-niko bitbloom cachekin
  bytebun-nova bitbit-oracle
)

index=1
for name in "${names[@]}"; do
  set_dir="assets/candidates/$name"
  source="$set_dir/frame-0.webp"
  [[ -f $source ]] || source="$set_dir/frame-0.png"
  magick "$source" -resize '210x185>' -background white -gravity center \
    -extent 230x190 -fill '#151515' -font "$font" -pointsize 15 \
    -gravity south -annotate +0+5 "$(printf '%02d  %s' "$index" "${name//-/ }")" \
    "$tiles/$(printf '%02d' "$index").png"
  index=$((index + 1))
done

[[ $index -eq 21 ]] || { echo "expected 20 mascots, got $((index - 1))" >&2; exit 1; }
magick montage "$tiles"/*.png -background white -tile 5x4 -geometry +8+8 "$output"
printf 'gallery=%s\n' "$output"
