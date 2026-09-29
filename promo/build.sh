#!/usr/bin/env bash
# Full pipeline: timeline -> voiceover -> score -> frames -> YouTube-ready MP4.
# usage: ./build.sh [variants...]   (default: a30 b30 a60 b60)
set -euo pipefail
cd "$(dirname "$0")"
VARIANTS=${*:-"a30 b30 a60 b60"}
declare -A NAME=([a30]=Berth_A_Hype_30s [a60]=Berth_A_Hype_60s [b30]=Berth_B_Harbor_30s [b60]=Berth_B_Harbor_60s)
mkdir -p out/final
node meta.mjs $VARIANTS
if ls out/meta_b*.json >/dev/null 2>&1; then
  python3 - <<'PY'
import json, glob
lines = {}
for f in glob.glob('out/meta_b*.json'):
    for x in json.load(open(f))['vo']:
        p = lines.get(x['id']); m = min(x['maxSec'], p['maxSec']) if p else x['maxSec']
        lines[x['id']] = {'id': x['id'], 'text': x['text'], 'maxSec': round(m, 3)}
json.dump(list(lines.values()), open('out/vo_lines.json', 'w'), indent=1)
PY
  [ -f out/vo/durations.json ] || (cd audio && python3 vo.py ../out/vo_lines.json ../out/vo)
fi
POST="[0]format=gbrp,split[a][b];[b]scale=480:270,curves=all='0/0 0.55/0 1/1',gblur=sigma=10,scale=1920:1080[g];[a][g]blend=all_mode=screen:all_opacity=0.5,noise=c0s=4:c0f=t,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]"
for v in $VARIANTS; do
  python3 audio/score.py out/meta_$v.json out/audio_$v.wav out/vo
  node render.mjs $v 60 6
  ffmpeg -loglevel error -y -framerate 60 -i out/frames_$v/%05d.jpg -i out/audio_$v.wav -filter_complex "$POST" \
    -map "[v]" -map 1:a -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.2 -g 30 -bf 2 \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
    -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest out/final/${NAME[$v]}.mp4
  echo "ENCODED out/final/${NAME[$v]}.mp4 $(du -h out/final/${NAME[$v]}.mp4 | cut -f1)"
done
