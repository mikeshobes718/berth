"""Generate voiceover lines with Kokoro (Apache 2.0), voice af_heart.
Usage: python3 vo.py lines.json outdir   (lines: [{id, text, maxSec}])"""
import json, sys, os
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
MODEL = os.environ.get('KOKORO_DIR', '/home/user/tts')
k = Kokoro(f"{MODEL}/kokoro-v1.0.onnx", f"{MODEL}/voices-v1.0.bin")
lines = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
voice = os.environ.get('VOICE', 'af_heart')
res = {}
for L in lines:
    speed = L.get('speed', 1.0)
    for _ in range(6):
        s, sr = k.create(L['text'], voice=voice, speed=speed, lang='en-us')
        # trim silence
        a = np.abs(s); thr = 0.01 * a.max()
        nz = np.where(a > thr)[0]
        s = s[max(0, nz[0] - int(.02 * sr)): nz[-1] + int(.08 * sr)]
        dur = len(s) / sr
        if 'maxSec' not in L or dur <= L['maxSec'] or speed >= 1.25: break
        speed = round(min(1.25, speed * (dur / L['maxSec']) * 1.02), 3)
    sf.write(f"{out}/{L['id']}.wav", s, sr)
    res[L['id']] = {'dur': round(dur, 3), 'speed': speed}
    print(L['id'], round(dur, 2), 's  speed', speed, '  max', L.get('maxSec'), '|', L['text'])
json.dump(res, open(f"{out}/durations.json", 'w'), indent=1)
