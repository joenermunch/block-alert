#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
[[ $# -eq 0 ]] || { echo "usage: $0" >&2; exit 64; }
source_root=assets/generated-source-v2
output_root=assets/candidates-v2
helper=${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py
manifest="$source_root/manifest.json"
[[ -f $manifest ]] || { echo "missing manifest: $manifest" >&2; exit 1; }

mapfile -t mascots < <(python3 - "$manifest" <<'PY'
import json, sys
with open(sys.argv[1], encoding='utf-8') as handle:
    print(*json.load(handle)['mascots'], sep='\n')
PY
)

rm -rf "$output_root"
mkdir -p "$output_root"
work_root=$(mktemp -d)
trap 'rm -rf "$work_root"' EXIT

for mascot in "${mascots[@]}"; do
  source="$source_root/$mascot/sheet-01.png"
  [[ -f $source ]] || { echo "missing generated sheet: $source" >&2; exit 1; }
  alpha="$work_root/$mascot-alpha.png"
  sliced="$work_root/$mascot-sliced"
  python3 "$helper" \
    --input "$source" --out "$alpha" --auto-key border --soft-matte \
    --transparent-threshold 12 --opaque-threshold 220 --despill --force >/dev/null
  python3 scripts/validate_generated_sheet.py "$alpha" --columns 4 --rows 4
  scripts/slice-spritesheet.sh "$alpha" "$sliced" --already-alpha --rows 4

  destination="$output_root/$mascot"
  mkdir -p "$destination"
  for runtime_frame in $(seq 0 127); do
    source_frame=$((runtime_frame % 16))
    cp "$sliced/frame-$source_frame.png" "$destination/frame-$runtime_frame.png"
  done
  max_width=$(magick identify -format '%w\n' "$destination"/*.png | sort -nr | head -1)
  max_height=$(magick identify -format '%h\n' "$destination"/*.png | sort -nr | head -1)
  for frame in "$destination"/*.png; do
    temporary="$frame.normalized.png"
    magick "$frame" +repage -background none -gravity center \
      -extent "${max_width}x${max_height}" +repage "$temporary"
    mv "$temporary" "$frame"
  done
  printf 'generated_import=%s frames=128\n' "$mascot"
done

scripts/optimize-runtime-assets.sh "$output_root"
printf 'generated_v2_import=pass mascots=%s frames=%s\n' "${#mascots[@]}" "$(( ${#mascots[@]} * 128 ))"
