#!/usr/bin/env bash
set -euo pipefail

visual_root=/Users/joenermunch/.codex/visualizations/2026/07/18/019f7312-22d4-70b0-9d9a-47d69cabccc2
generated_root=/Users/joenermunch/.codex/generated_images
output_root=${1:-assets/candidates}

import_set() {
  name=$1
  shift
  import_set_grid "$name" 8 32 "$@"
}

import_set_grid() {
  name=$1
  rows=$2
  target_per_sheet=$3
  shift 3
  if [[ $# -ne 4 ]]; then
    echo "FAIL $name expected=4_sheets got=$#" >&2
    exit 1
  fi
  destination="$output_root/$name"
  mkdir -p "$destination"
  existing=$(find "$destination" -maxdepth 1 -type f -name 'frame-*.png' | wc -l | tr -d ' ')
  expected_total=$((target_per_sheet * 4))
  if [[ $existing -eq $expected_total ]]; then
    printf 'skipped=%s frames=%s\n' "$name" "$expected_total"
    return
  fi
  find "$destination" -maxdepth 1 -type f -name 'frame-*.png' -delete
  offset=0
  for sheet in "$@"; do
    [[ -f $sheet ]] || { echo "FAIL missing $sheet" >&2; exit 1; }
    temporary=$(mktemp -d)
    scripts/slice-spritesheet.sh "$sheet" "$temporary" --rows "$rows"
    source_per_sheet=$((rows * 4))
    frame=0
    while [[ $frame -lt $target_per_sheet ]]; do
      if [[ $target_per_sheet -eq 1 ]]; then
        source_frame=0
      else
        source_frame=$(((frame * (source_per_sheet - 1) + (target_per_sheet - 1) / 2) / (target_per_sheet - 1)))
      fi
      cp "$temporary/frame-$source_frame.png" "$destination/frame-$((offset + frame)).png"
      frame=$((frame + 1))
    done
    rm -rf "$temporary"
    offset=$((offset + target_per_sheet))
  done
  max_width=$(magick identify -format '%w\n' "$destination"/frame-*.png | sort -nr | head -1)
  max_height=$(magick identify -format '%h\n' "$destination"/frame-*.png | sort -nr | head -1)
  for frame_file in "$destination"/frame-*.png; do
    temporary=${frame_file}.normalized.png
    magick "$frame_file" -background none -gravity center -extent "${max_width}x${max_height}" "$temporary"
    mv "$temporary" "$frame_file"
  done
  printf 'imported=%s frames=%s\n' "$name" "$offset"
}

generated_set() {
  name=$1
  directory=$2
  files=()
  while IFS= read -r file; do files+=("$file"); done < <(stat -f '%B %N' "$directory"/exec-*.png | sort -n | head -4 | cut -d' ' -f2-)
  import_set "$name" "${files[@]}"
}

import_set niblet-stylus \
  "$visual_root/niblet-stylus-smooth-01/frames-000-031.png" \
  "$visual_root/niblet-stylus-smooth-01/frames-032-063.png" \
  "$visual_root/niblet-stylus-smooth-01/frames-064-095.png" \
  "$visual_root/niblet-stylus-smooth-01/frames-096-127.png"
import_set niblet-smart-stylus \
  "$visual_root/niblet-128/niblet-frames-000-031.png" \
  "$visual_root/niblet-128/niblet-frames-032-063.png" \
  "$visual_root/niblet-128/niblet-frames-064-095.png" \
  "$visual_root/niblet-128/niblet-frames-096-127.png"
import_set pixel-core-miko "$visual_root"/pixel-core-miko/pixel-core-miko-sheet-{1,2,3,4}.png
generated_set oscilla "$generated_root/019f7390-27cb-7121-b399-853e1d464534"
import_set usb-flash-spirit "$visual_root"/usb-flash-spirit/sheet-0{1,2,3,4}-frames-*.png
import_set koiwave-courier "$visual_root"/koiwave_courier_128/koiwave-courier-sheet-0{1,2,3,4}-frames-*.png
generated_set nixie-pulse "$generated_root/019f7390-5873-7782-bc56-9659eb8a86e3"
generated_set kiko-keycap "$generated_root/019f7390-6c95-7881-b431-84462a7c2791"
generated_set mikobyte-packet-manta "$generated_root/019f7390-7ca8-7e70-af17-c804c18dadae"
generated_set pixelin-holo-pad "$generated_root/019f7390-92ba-7152-ae78-cf02fafd7081"
generated_set gyromochi "$generated_root/019f7392-ddff-7f60-a97a-b886e72e4aba"
import_set nimbit /Users/joenermunch/Documents/WebDev/the-oracle/tmp/imagegen/nimbit-128/nimbit-sheet-0{1,2,3,4}-frames-*.png
import_set nimbi-9 "$visual_root"/nimbi-9/nimbi-9-sheet-0{1,2,3,4}-frames-*.png
generated_set bytebun-relay "$generated_root/019f7393-0e18-75b2-b986-5a9b255e1635"
generated_set glom "$generated_root/019f7393-1e5b-7fc1-878f-56c446bbb2bd"
generated_set bytebun-niko "$generated_root/019f7393-3361-7082-bc65-f4b97ab032ad"
generated_set bitbloom "$generated_root/019f7393-4506-7d71-9757-7bb561ad46d4"
generated_set cachekin "$generated_root/019f7393-546b-7360-9fb9-1d2bb3b07b65"
import_set_grid bytebun-nova 7 32 "$visual_root"/bytebun-nova-loop-sheet-{1,2,3,4}-of-4.png
import_set bitbit-oracle "$visual_root"/bitbit-oracle/bitbit-oracle-sheet-0{1,2,3,4}-frames-*.png

printf 'candidate_import=pass sets=20 frames=2560\n'
