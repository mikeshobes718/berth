#!/usr/bin/env bash
# Size-capped delivery encode (two pass) from rendered frames + audio. usage: ./deliver.sh <variant> <name> [MiB=29]
set -euo pipefail
cd "$(dirname "$0")"
v=$1; name=$2; mib=${3:-29}
dur=$(python3 -c "import json;print(json.load(open('out/meta_$v.json'))['duration'])")
abr=192
vbr=$(python3 -c "print(int(($mib*1024*1024*8/$dur)/1000 - $abr - 60))")
POST="[0]format=gbrp,split[a][b];[b]scale=480:270,curves=all='0/0 0.55/0 1/1',gblur=sigma=10,scale=1920:1080[g];[a][g]blend=all_mode=screen:all_opacity=0.5,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]"
X="-c:v libx264 -preset slow -b:v ${vbr}k -maxrate $((vbr*2))k -bufsize $((vbr*2))k -profile:v high -level 4.2 -g 120 -x264-params aq-mode=3:aq-strength=0.9 -colorspace bt709 -color_primaries bt709 -color_trc bt709"
mkdir -p out/deliver
ffmpeg -loglevel error -y -framerate 60 -i out/frames_$v/%05d.jpg -filter_complex "$POST" -map "[v]" $X -pass 1 -passlogfile out/deliver/$v -an -f mp4 /dev/null
ffmpeg -loglevel error -y -framerate 60 -i out/frames_$v/%05d.jpg -i out/audio_$v.wav -filter_complex "$POST" -map "[v]" -map 1:a $X -pass 2 -passlogfile out/deliver/$v \
  -c:a aac -b:a ${abr}k -ar 48000 -movflags +faststart -shortest out/deliver/$name.mp4
echo "DELIVER out/deliver/$name.mp4 $(du -m out/deliver/$name.mp4 | cut -f1)MiB video ${vbr}k"
