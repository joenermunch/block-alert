#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 0 ]]; then
  roots=("$@")
else
  roots=(assets/candidates assets/full assets/compact)
fi
source_count=$(find "${roots[@]}" -type f -name 'frame-*.png' | wc -l | tr -d ' ')
[[ $source_count -gt 0 ]] || { echo 'no PNG frames found' >&2; exit 1; }

while IFS= read -r source; do
  destination=${source%.png}.webp
  temporary=${destination}.tmp.webp
  quality=92
  [[ $source == assets/candidates/* ]] && quality=90
  magick "$source" -quality "$quality" "$temporary"
  mv "$temporary" "$destination"
done < <(find "${roots[@]}" -type f -name 'frame-*.png' | sort)

webp_count=$(find "${roots[@]}" -type f -name 'frame-*.webp' | wc -l | tr -d ' ')
if [[ $webp_count -ne $source_count ]]; then
  echo "frame conversion mismatch png=$source_count webp=$webp_count" >&2
  exit 1
fi

find "${roots[@]}" -type f -name 'frame-*.png' -delete
printf 'runtime_asset_optimization=pass frames=%s\n' "$webp_count"
