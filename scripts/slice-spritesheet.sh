#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "usage: $0 INPUT OUTPUT_DIR [--already-alpha]" >&2
  exit 64
fi

input_file=$1
output_dir=$2
alpha_mode=${3:-}
helper=/Users/joenermunch/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py
work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
normalized="$work_dir/normalized.png"

if [[ $alpha_mode == --already-alpha ]]; then
  cp "$input_file" "$normalized"
elif [[ -z $alpha_mode ]]; then
  python3 "$helper" \
    --input "$input_file" \
    --out "$normalized" \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --despill \
    --force >/dev/null
else
  echo "unknown option: $alpha_mode" >&2
  exit 64
fi

read -r source_width source_height < <(magick identify -format '%w %h\n' "$normalized")
grid_width=$((source_width / 4 * 4))
grid_height=$((source_height / 8 * 8))
cell_width=$((grid_width / 4))
cell_height=$((grid_height / 8))
inset=5
padding=8
output_width=$((cell_width - inset * 2 + padding * 2))
output_height=$((cell_height - inset * 2 + padding * 2))
mkdir -p "$output_dir"

magick "$normalized" \
  -crop "${grid_width}x${grid_height}+0+0" \
  +repage \
  -crop "${cell_width}x${cell_height}" \
  +repage \
  -shave "${inset}x${inset}" \
  -bordercolor none \
  -border "$padding" \
  "$output_dir/frame-%d.png"

frame_count=$(find "$output_dir" -maxdepth 1 -type f -name 'frame-*.png' | wc -l | tr -d ' ')
if [[ $frame_count -ne 32 ]]; then
  echo "expected 32 frames, got $frame_count from $input_file" >&2
  exit 1
fi
