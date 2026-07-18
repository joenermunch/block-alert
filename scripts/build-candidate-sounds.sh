#!/usr/bin/env bash
set -euo pipefail

output_dir=${1:-assets/sounds/candidates}
ffmpeg_bin=${FFMPEG_BIN:-/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg}
sample_file=${MUSIC_BOX_SAMPLE:-scripts/source-assets/music-box-c-sharp.wav}

mkdir -p "$output_dir"

names=(
  niblet-stylus niblet-smart-stylus pixel-core-miko oscilla usb-flash-spirit
  koiwave-courier nixie-pulse kiko-keycap mikobyte-packet-manta pixelin-holo-pad
  gyromochi nimbit nimbi-9 bytebun-relay glom bytebun-niko bitbloom cachekin
  bytebun-nova bitbit-oracle
)
key_offsets=(0 2 4 5 7 9 -1 1 3 6 0 4 2 7 5 9 -1 3 1 6)
patterns=(
  '0 4 7 12 9 7 4 0' '0 7 9 12 7 4 2 0' '0 2 4 7 11 9 7 4'
  '0 4 9 7 12 11 7 4' '0 7 4 9 12 9 7 0' '0 2 7 9 14 12 7 4'
  '0 5 9 12 9 5 2 0' '0 4 7 11 14 11 7 4' '0 3 7 10 12 10 7 3'
  '0 7 12 14 12 9 7 4' '0 4 9 12 16 12 9 7' '0 2 5 9 12 9 5 2'
  '0 7 11 14 11 7 4 0' '0 5 7 12 14 12 7 5' '0 4 7 9 12 16 12 7'
  '0 2 4 9 7 12 9 4' '0 3 5 10 12 10 5 3' '0 4 11 9 14 11 7 4'
  '0 5 9 14 12 9 5 0' '0 7 9 16 14 12 9 7'
)

for index in "${!names[@]}"; do
  out="$output_dir/${names[$index]}.wav"
  read -r -a steps <<< "${patterns[$index]}"
  filters=()
  labels=()
  split_labels=''
  for note_index in "${!steps[@]}"; do split_labels+="[s$note_index]"; done
  filters+=( "[0:a]asplit=8$split_labels" )
  for note_index in "${!steps[@]}"; do
    semitone=$((steps[note_index] + key_offsets[index]))
    rate=$(awk -v step="$semitone" 'BEGIN { printf "%.3f", 48000 * exp(log(2) * step / 12) }')
    delay=$((note_index * 430 + (note_index % 3 == 2 ? 70 : 0)))
    duration=1.24
    fade_start=0.42
    fade_duration=0.82
    if [[ $note_index -eq 7 ]]; then
      duration=1.86
      fade_start=0.64
      fade_duration=1.22
    fi
    filters+=( "[s$note_index]asetrate=$rate,aresample=44100,atrim=0:$duration,asetpts=N/SR/TB,volume=0.54,afade=t=in:st=0:d=0.012,afade=t=out:st=$fade_start:d=$fade_duration,adelay=$delay|$delay[n$note_index]" )
    labels+=( "[n$note_index]" )
  done
  filter_chain=$(IFS=';'; echo "${filters[*]}")
  mix_labels=$(printf '%s' "${labels[@]}")
  "$ffmpeg_bin" -hide_banner -loglevel error -y -i "$sample_file" \
    -filter_complex "$filter_chain;$mix_labels amix=inputs=8:duration=longest:normalize=0,aecho=0.8:0.55:80|160:0.11|0.055,lowpass=f=7600,alimiter=limit=0.64,apad=pad_dur=0.42[out]" \
    -map '[out]' -ac 1 -ar 22050 -c:a pcm_s16le "$out"
done

printf 'candidate_sounds=%s\n' "${#names[@]}"
