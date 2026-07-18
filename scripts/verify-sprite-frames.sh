#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
failures=0
sets=0

for set_dir in \
  assets/full/working/* \
  assets/full/blocked/* \
  assets/compact/working/* \
  assets/compact/blocked/*; do
  [[ -d $set_dir ]] || continue
  sets=$((sets + 1))
  frame_count=$(find "$set_dir" -maxdepth 1 -type f -name 'frame-*.webp' | wc -l | tr -d ' ')
  if [[ $frame_count -ne 32 ]]; then
    echo "FAIL $set_dir frame_count=$frame_count expected=32" >&2
    failures=$((failures + 1))
    continue
  fi
  expected_dimensions=$(magick identify -format '%wx%h' "$set_dir/frame-0.webp")
  while IFS= read -r frame_file; do
    dimensions=$(magick identify -format '%wx%h' "$frame_file")
    if [[ $dimensions != "$expected_dimensions" ]]; then
      echo "FAIL $frame_file dimensions=$dimensions expected=$expected_dimensions" >&2
      failures=$((failures + 1))
    fi
    width=${dimensions%x*}
    height=${dimensions#*x}
    edge_alpha=$(magick "$frame_file" -alpha extract -alpha off -fill black \
      -draw "rectangle 4,4 $((width - 5)),$((height - 5))" \
      -format '%[fx:maxima.r]' info:)
    if [[ $edge_alpha != 0 ]]; then
      echo "FAIL $frame_file edge_alpha=$edge_alpha" >&2
      failures=$((failures + 1))
    fi
  done < <(find "$set_dir" -maxdepth 1 -type f -name 'frame-*.webp')
done

for set_dir in assets/candidates/*; do
  [[ -d $set_dir ]] || continue
  sets=$((sets + 1))
  frame_count=$(find "$set_dir" -maxdepth 1 -type f -name 'frame-*.webp' | wc -l | tr -d ' ')
  if [[ $frame_count -ne 128 ]]; then
    echo "FAIL $set_dir frame_count=$frame_count expected=128" >&2
    failures=$((failures + 1))
    continue
  fi
  expected_dimensions=$(magick identify -format '%wx%h' "$set_dir/frame-0.webp")
  while IFS= read -r frame_file; do
    dimensions=$(magick identify -format '%wx%h' "$frame_file")
    if [[ $dimensions != "$expected_dimensions" ]]; then
      echo "FAIL $frame_file dimensions=$dimensions expected=$expected_dimensions" >&2
      failures=$((failures + 1))
    fi
    width=${dimensions%x*}
    height=${dimensions#*x}
    edge_alpha=$(magick "$frame_file" -alpha extract -alpha off -fill black \
      -draw "rectangle 4,4 $((width - 5)),$((height - 5))" \
      -format '%[fx:maxima.r]' info:)
    if [[ $edge_alpha != 0 ]]; then
      echo "FAIL $frame_file edge_alpha=$edge_alpha" >&2
      failures=$((failures + 1))
    fi
  done < <(find "$set_dir" -maxdepth 1 -type f -name 'frame-*.webp')
done

if [[ $failures -ne 0 ]]; then
  echo "sprite_frame_check=fail sets=$sets failures=$failures" >&2
  exit 1
fi

echo "sprite_frame_check=pass sets=$sets"
