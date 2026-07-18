#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 INPUT OUTPUT_DIR [--already-alpha] [--rows N]" >&2
  exit 64
fi

input_file=$1
output_dir=$2
shift 2
alpha_mode=
rows=8
while [[ $# -gt 0 ]]; do
  case $1 in
    --already-alpha) alpha_mode=--already-alpha; shift ;;
    --rows) rows=${2:?--rows needs a value}; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 64 ;;
  esac
done
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
fi

inset=5
padding=8
mkdir -p "$output_dir"

python3 "$(dirname "$0")/slice_alpha_grid.py" \
  "$normalized" "$output_dir" \
  --columns 4 --rows "$rows" --inset "$inset" --padding "$padding"

frame_count=$(find "$output_dir" -maxdepth 1 -type f -name 'frame-*.png' | wc -l | tr -d ' ')
expected_count=$((4 * rows))
if [[ $frame_count -ne $expected_count ]]; then
  echo "expected $expected_count frames, got $frame_count from $input_file" >&2
  exit 1
fi
