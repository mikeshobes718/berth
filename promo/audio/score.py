"""Original score + SFX for the Berth promo, synthesized from scratch (no samples, no third-party audio).

usage: python3 score.py out/meta_a60.json out/audio_a60.wav [vo_dir]

The timeline JSON comes from the page itself (meta.mjs), so every hit, whoosh and riser lands
on the same frame as the visual it belongs to.
"""
import json, sys, os
import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d
import soundfile as sf

SR = 48000
DEBUG = {}
rng = np.random.default_rng(20270101)


# ----------------------------------------------------------------------------- dsp helpers
def tt(n): return np.arange(n) / SR
def midi(n): return 440.0 * 2 ** ((np.asarray(n, dtype=float) - 69) / 12)
def db(x): return 10 ** (x / 20)

def sos_lp(fc, order=2): return signal.butter(order, min(fc, SR * .45), 'low', fs=SR, output='sos')
def sos_hp(fc, order=2): return signal.butter(order, max(fc, 10), 'high', fs=SR, output='sos')
def sos_bp(lo, hi, order=2): return signal.butter(order, [max(lo, 10), min(hi, SR * .45)], 'band', fs=SR, output='sos')
def lp(x, fc, order=2): return signal.sosfilt(sos_lp(fc, order), x, axis=-1)
def hp(x, fc, order=2): return signal.sosfilt(sos_hp(fc, order), x, axis=-1)
def bp(x, lo, hi, order=2): return signal.sosfilt(sos_bp(lo, hi, order), x, axis=-1)

def sweep_filter(x, fcs, kind='low', block=256, q_order=2):
    """time varying filter: fcs is an array (same length as x) of cutoffs"""
    y = np.zeros_like(x); zi = None
    for i in range(0, len(x), block):
        fc = float(np.clip(fcs[min(i + block // 2, len(x) - 1)], 30, SR * .45))
        if kind == 'low': sos = sos_lp(fc, q_order)
        elif kind == 'high': sos = sos_hp(fc, q_order)
        else: sos = sos_bp(fc / 1.5, fc * 1.5, q_order)
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        y[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return y

def saw(freq, n, phase0=0.0):
    f = np.full(n, freq, float) if np.isscalar(freq) else np.asarray(freq, float)
    dt = f / SR
    ph = (phase0 + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt; t = ph[m] / dt[m]; y[m] -= t + t - t * t - 1
    m = ph > 1 - dt; t = (ph[m] - 1) / dt[m]; y[m] -= t * t + t + t + 1
    return y

def sine(freq, n, phase0=0.0):
    f = np.full(n, freq, float) if np.isscalar(freq) else np.asarray(freq, float)
    return np.sin(2 * np.pi * (phase0 + np.cumsum(f) / SR))

def adsr(n, a=.005, d=.1, s=.7, r=.1, hold=None):
    """hold = seconds before release; default n - r"""
    t = tt(n); dur = n / SR
    hold = dur - r if hold is None else hold
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = t > hold
    e[rel] *= np.exp(-(t[rel] - hold) / max(r / 4, 1e-6))
    return e

def pan(x, p):
    """p in [-1,1] -> stereo (2,n), constant power"""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])

def st(x): return np.stack([x, x]) if x.ndim == 1 else x

def make_ir(rt60, lp_fc=7000, pre=.012, seed=1):
    r = np.random.default_rng(seed)
    n = int(SR * rt60 * 1.1); t = tt(n)
    dec = np.exp(-6.91 * t / rt60)
    ir = r.standard_normal((2, n)) * dec
    ir = lp(ir, lp_fc)
    ir[:, :int(SR * .004)] *= np.linspace(0, 1, int(SR * .004))
    ir = np.concatenate([np.zeros((2, int(SR * pre))), ir], axis=1)
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))

def convolve(x, ir):
    x = st(x)
    return np.stack([signal.fftconvolve(x[c], ir[c])[:x.shape[1]] for c in range(2)])

def delay(x, sec, fb=.4, taps=5, pingpong=True):
    x = st(x); y = np.zeros_like(x); d = int(sec * SR)
    for k in range(1, taps + 1):
        g = fb ** k
        if d * k >= x.shape[1]: break
        src = x[::-1] if (pingpong and k % 2) else x
        y[:, d * k:] += g * src[:, :x.shape[1] - d * k]
    return y

def resample_to_sr(x, sr_in):
    if sr_in == SR: return x
    from math import gcd
    g = gcd(SR, sr_in)
    return signal.resample_poly(x, SR // g, sr_in // g)


# ----------------------------------------------------------------------------- instruments
def kick(style):
    if style == 'hype':
        n = int(SR * .42); t = tt(n)
        f = 44 + 120 * np.exp(-t / .03) + 40 * np.exp(-t / .006)
        body = sine(f, n) * np.exp(-t / .26)
        click = hp(rng.standard_normal(n), 2500) * np.exp(-t / .003) * .35
        return np.tanh(1.8 * (body + click)) * .95
    n = int(SR * .9); t = tt(n)
    f = 38 + 130 * np.exp(-t / .045) + 50 * np.exp(-t / .008)
    body = sine(f, n) * np.exp(-t / .5)
    click = hp(rng.standard_normal(n), 2000) * np.exp(-t / .004) * .3
    return np.tanh(2.2 * (body + click)) * .95

def clap():
    n = int(SR * .5); t = tt(n); y = np.zeros(n)
    noise = bp(rng.standard_normal(n), 900, 3500)
    for k, off in enumerate([0, .010, .021, .031]):
        o = int(off * SR); e = np.zeros(n); e[o:] = np.exp(-(t[:n - o]) / (.006 if k < 3 else .13))
        y += noise * e * (1 if k < 3 else .9)
    return y * .5

def snare():
    n = int(SR * .6); t = tt(n)
    nz = bp(rng.standard_normal(n), 1400, 9000) * np.exp(-t / .16)
    body = sine(185 * (1 + .4 * np.exp(-t / .01)), n) * np.exp(-t / .07)
    return np.tanh(1.5 * (nz * .8 + body * .7)) * .6

def hat(open_=False):
    n = int(SR * (.35 if open_ else .08)); t = tt(n)
    x = hp(rng.standard_normal(n), 7500, 4)
    return x * np.exp(-t / (.11 if open_ else .016)) * (.28 if open_ else .3)

def crash(length=2.2):
    n = int(SR * length); t = tt(n)
    x = hp(rng.standard_normal(n), 3500, 2)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in [3130, 4870, 6230, 7710]) * .04
    return (x * .5 + hp(metal, 3000)) * np.exp(-t / (length / 3.2)) * .5

def tom(f0=90):
    n = int(SR * .45); t = tt(n)
    return np.tanh(1.4 * sine(f0 * (1 + .6 * np.exp(-t / .02)) * np.exp(-t / 1.2), n) * np.exp(-t / .18)) * .7

def supersaw(notes, dur, fc=3000, voices=7, detune=.18, a=.01, r=.25, d=.3, s=.8, seed=0):
    n = int(SR * dur); out = np.zeros((2, n))
    r_ = np.random.default_rng(seed)
    for note in notes:
        f = float(midi(note))
        for v in range(voices):
            dt = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
            x = saw(f * 2 ** (dt / 12), n, r_.random())
            out += pan(x, (v - (voices - 1) / 2) / ((voices - 1) / 2) * .85)
    out = lp(out, fc, 2) * adsr(n, a, d, s, r)
    return out / (len(notes) * voices) * 2.2

def pluck(note, dur=.35, bright=4000, kind='saw'):
    n = int(SR * dur); t = tt(n); f = float(midi(note))
    if kind == 'bell':
        mod = sine(f * 3.5, n) * 2.2 * np.exp(-t / .12)
        x = np.sin(2 * np.pi * f * t + mod) * .6 + sine(f * 2, n) * .15 * np.exp(-t / .2)
        return x * np.exp(-t / (dur / 3))
    x = saw(f, n) * .6 + saw(f * 1.005, n) * .4
    fcs = 300 + bright * np.exp(-t / .06)
    return sweep_filter(x, fcs, 'low', 128) * np.exp(-t / (dur / 3.5))

def bass_note(note, dur, style):
    n = int(SR * dur); t = tt(n); f = float(midi(note))
    if style == 'hype':
        x = saw(f, n) * .55 + sine(f / 2, n) * .9
        x = sweep_filter(x, 180 + 1400 * np.exp(-t / .05), 'low', 128)
        return np.tanh(1.6 * x) * adsr(n, .003, .12, .75, .03) * .55
    # 808 style sub with a short glide in
    fg = f * (1 + .25 * np.exp(-t / .03))
    x = sine(fg, n) + .18 * sine(fg * 2, n)
    return np.tanh(1.7 * x) * adsr(n, .004, .6, .65, .08) * .55

def noise_riser(dur, lo=300, hi=9000):
    n = int(SR * dur); t = tt(n); p = t / dur
    x = rng.standard_normal(n)
    x = sweep_filter(x, lo * (hi / lo) ** (p ** 1.6), 'band', 256)
    return x * (p ** 2.2) * .5

def pitch_riser(dur, note):
    n = int(SR * dur); t = tt(n); p = t / dur
    f = float(midi(note)) * 2 ** (p ** 1.5 * 2)
    x = saw(f, n) * .5 + saw(f * 1.01, n) * .5
    return lp(x, 3000) * p ** 2 * .22

def whoosh(dur, soft=False):
    n = int(SR * max(dur, .15)); t = tt(n); p = t / (n / SR)
    x = rng.standard_normal(n)
    x = sweep_filter(x, 250 * (5000 / 250) ** np.sin(p * np.pi * .9), 'band', 256)
    e = np.sin(np.pi * np.clip(p, 0, 1)) ** 1.5
    y = np.stack([x * e * np.cos(p * np.pi / 2), x * e * np.sin(p * np.pi / 2)])
    return y * (.35 if soft else .6)

def boom(size=1.0, style='hype'):
    L = 1.8 if style == 'hype' else 2.8
    n = int(SR * L); t = tt(n)
    sub = sine(52 * (1 + 1.5 * np.exp(-t / .05)) * (1 - .35 * t / L), n) * np.exp(-t / (.5 if style == 'hype' else .9))
    nz = lp(rng.standard_normal(n), 900) * np.exp(-t / .12) * .6
    top = hp(rng.standard_normal(n), 2000) * np.exp(-t / .05) * .25
    return np.tanh(1.5 * (sub + nz + top)) * .8 * size

def type_clicks(dur, chars):
    n = int(SR * (dur + .1)); y = np.zeros(n)
    k = max(3, int(chars))
    for i in range(k):
        o = int((i / k * dur + rng.uniform(-.012, .012)) * SR)
        if o < 0 or o >= n - 600: continue
        m = int(SR * .02); t = tt(m)
        c = bp(rng.standard_normal(m), 1800, 6500) * np.exp(-t / .0035) * rng.uniform(.5, 1)
        c += sine(160, m) * np.exp(-t / .008) * .25
        y[o:o + m] += c
    return y * .22

def ocean(n, seed=3):
    r = np.random.default_rng(seed)
    x = r.standard_normal((2, n))
    x = lp(x, 700, 2)
    t = tt(n)
    swell = .5 + .5 * np.sin(2 * np.pi * .11 * t + np.array([[0], [1.3]])) ** 2
    return x * swell * .12


# ----------------------------------------------------------------------------- arrangement
PROG = {
    'hype': [[57, 60, 64, 69], [53, 57, 60, 65], [55, 60, 64, 67], [55, 59, 62, 67]],     # Am F C G
    'cinema': [[53, 56, 60, 65, 67], [49, 53, 56, 61, 63], [51, 56, 60, 63, 70], [51, 55, 58, 63, 65]],  # Fm9 Db Ab Eb
}
ROOT = {'hype': [33, 29, 36, 31], 'cinema': [29, 25, 32, 27]}
PENTA = {'hype': [81, 84, 86, 88, 91, 93, 96], 'cinema': [77, 80, 82, 84, 87, 89, 92]}

def section_at(sections, beat):
    for s in sections:
        if s['beat'] <= beat < s['beat'] + s['len']: return s
    return sections[-1]

def render(meta, vo_dir=None):
    style = 'hype' if meta['bpm'] >= 110 else 'cinema'
    bpm = meta['bpm']; B = 60 / bpm; S16 = B / 4
    dur = meta['duration']; N = int(round(dur * SR)) + SR * 4
    bus = {k: np.zeros((2, N)) for k in ['drums', 'bass', 'chords', 'arp', 'fx', 'amb', 'vo']}
    sends = {k: np.zeros((2, N)) for k in ['short', 'long']}

    def put(name, x, t, gain=1.0, p=0.0, send=None, sgain=.3):
        x = st(x) if x.ndim == 2 else pan(x, p)
        i = int(round(t * SR))
        if i >= N or i + x.shape[1] <= 0: return
        if i < 0: x = x[:, -i:]; i = 0
        m = min(x.shape[1], N - i)
        bus[name][:, i:i + m] += x[:, :m] * gain
        if send: sends[send][:, i:i + m] += x[:, :m] * gain * sgain

    secs = meta['sections']; beats = meta['beats']
    K = kick(style); C = clap(); SN = snare(); HC = hat(); HO = hat(True)
    prog = PROG[style]; roots = ROOT[style]
    kick_times = []

    total16 = beats * 4
    for s16 in range(total16):
        beat = s16 / 4; t = beat * B; bar = int(beat // 4); step = s16 % 16
        sec = section_at(secs, beat); kind = sec['kind']
        sp = (beat - sec['beat']) / max(sec['len'], 1e-6)   # progress through section 0..1
        ch = prog[bar % 4]; root = roots[bar % 4]
        first = abs(beat - sec['beat']) < 1e-6
        pre_gap = kind == 'riser' and beat >= sec['beat'] + sec['len'] - .5
        if style == 'hype':
            if kind in ('build', 'drop') and step % 4 == 0:
                put('drums', K, t, 1.0); kick_times.append(t)
            if kind == 'drop' and step in (4, 12): put('drums', C, t, .85, send='short', sgain=.35)
            if kind == 'build' and sp > .5 and step in (4, 12): put('drums', C, t, .6, send='short', sgain=.3)
            if kind == 'break' and step == 12: put('drums', C, t, .35, send='long', sgain=.5)
            if kind == 'drop':
                put('drums', HC, t, (.5 if step % 2 else .28), p=.25)
                if step % 4 == 2: put('drums', HO, t, .55, p=-.2)
            if kind == 'build': put('drums', HC, t, .12 + .4 * sp, p=.2)
            if kind == 'break' and step % 2 == 0: put('drums', HC, t, .12, p=.2)
            if kind == 'riser' and not pre_gap:
                rate = 4 if sp < .5 else 2 if sp < .8 else 1
                if step % rate == 0: put('drums', SN, t, .25 + .6 * sp, send='short', sgain=.3)
            # bass
            if kind == 'drop' and step % 4 == 2: put('bass', bass_note(root + 12, S16 * 1.8, 'hype'), t, 1.0)
            if kind == 'drop' and step in (7, 15): put('bass', bass_note(root + 24, S16 * .9, 'hype'), t, .5)
            if kind == 'build' and sp > .25 and step % 4 == 2: put('bass', bass_note(root + 12, S16 * 1.6, 'hype'), t, .7)
            if kind == 'break' and step == 0: put('bass', bass_note(root, B * 4, 'cinema'), t, .6)
            # chords
            if step == 0 and kind in ('drop', 'build', 'break', 'intro'):
                fc = {'drop': 4200, 'build': 900 + 3000 * sp, 'break': 1800, 'intro': 500 + 1500 * sp}[kind]
                g = {'drop': .9, 'build': .7, 'break': .75, 'intro': .6}[kind]
                put('chords', supersaw(ch, B * 4.1, fc=fc, a=.02 if kind == 'drop' else .4, r=.3, seed=bar), t, g, send='long', sgain=.35)
            # arp 16ths
            if kind in ('drop', 'build', 'break') or (kind == 'intro' and step % 2 == 0):
                pat = [0, 1, 2, 3, 4, 3, 2, 1][(s16 % 8)]
                notes = sorted(ch)[:4] + [sorted(ch)[0] + 12]
                nn = notes[pat % len(notes)] + 12
                g = {'drop': .28, 'build': .2 + .1 * sp, 'break': .3, 'intro': .15}[kind]
                put('arp', pluck(nn, .25, 2500 if kind != 'intro' else 900), t, g, p=(.35 if s16 % 2 else -.35), send='short', sgain=.4)
            if kind == 'outro' and first:
                put('drums', K, t, 1.0); put('fx', crash(3.5), t, .8, send='long', sgain=.4)
                put('chords', supersaw(prog[0], B * 10, fc=5000, a=.005, d=1.5, s=.35, r=2.5, seed=99), t, 1.0, send='long', sgain=.6)
                put('bass', bass_note(roots[0], B * 6, 'cinema'), t, .9)
            if kind == 'outro' and beat - sec['beat'] < 8 and step % 2 == 0 and not first:
                nn = [69, 72, 76, 81, 84, 81, 76, 72][(s16 // 2) % 8] + 12
                fade = 1 - (beat - sec['beat']) / 8
                put('arp', pluck(nn, .4, 1600), t, .2 * fade, p=(.4 if s16 % 4 else -.4), send='long', sgain=.5)
        else:  # cinema, half time
            if kind == 'drop':
                if step in (0, 10): put('drums', K, t, 1.0); kick_times.append(t)
                if step == 8: put('drums', SN, t, .9, send='long', sgain=.35); put('drums', C, t, .4, send='long', sgain=.2)
                roll = (bar % 2 == 1 and step >= 12)
                if step % 2 == 0 or roll: put('drums', HC, t, .3 if step % 4 == 0 else .2, p=.3)
                if step in (0, 10): put('bass', bass_note(root + 12, S16 * (10 if step == 0 else 6), 'cinema'), t, .95)
            if kind in ('break', 'break2'):
                if step == 0: put('drums', K, t, .55); kick_times.append(t)
                if kind == 'break2' and step % 4 == 2: put('drums', HC, t, .14, p=.3)
                if step == 0: put('bass', bass_note(root + 12, B * 4, 'cinema'), t, .6)
            if kind == 'build':
                if step % 2 == 0: put('drums', tom(70 + 30 * sp), t, .25 + .5 * sp, send='long', sgain=.3)
                put('drums', HC, t, .08 + .25 * sp, p=.3)
            if kind == 'riser' and not pre_gap:
                rate = 4 if sp < .5 else 2 if sp < .8 else 1
                if step % rate == 0: put('drums', SN, t, .2 + .6 * sp, send='long', sgain=.25)
            if step == 0 and kind in ('drop', 'build', 'break', 'break2', 'intro'):
                fc = {'drop': 3200, 'build': 900 + 2200 * sp, 'break': 1900, 'break2': 2300, 'intro': 450 + 1300 * sp}[kind]
                g = {'drop': .75, 'build': .7, 'break': .8, 'break2': .8, 'intro': .7}[kind]
                put('chords', supersaw(ch, B * 4.2, fc=fc, a=.35 if kind != 'drop' else .05, d=.8, s=.85, r=.6, seed=bar), t, g, send='long', sgain=.55)
            if kind == 'intro' and step == 0:
                put('bass', sine(float(midi(roots[0] + 12)), int(B * 4.1 * SR)) * adsr(int(B * 4.1 * SR), .8, 1, .9, .5) * .45, t, 1.0)
            if kind in ('drop', 'break', 'break2', 'build') and step % 2 == 0:
                pat = [0, 2, 4, 1, 3, 4, 2, 1][(s16 // 2) % 8]
                nn = sorted(ch)[pat % len(ch)] + 12
                g = {'drop': .22, 'break': .3, 'break2': .32, 'build': .22}[kind]
                put('arp', pluck(nn, .7, 0, 'bell'), t, g, p=(.4 if s16 % 4 else -.4), send='long', sgain=.45)
            if kind == 'intro' and step % 8 == 0 and beat >= 2:
                nn = PENTA['cinema'][int(beat) % 5] - 12
                put('arp', pluck(nn, 1.2, 0, 'bell'), t, .2, p=(.5 if bar % 2 else -.5), send='long', sgain=.7)
            if kind == 'outro' and first:
                put('drums', K, t, 1.0); put('fx', crash(4), t, .7, send='long', sgain=.5)
                put('chords', supersaw(prog[0], B * 7, fc=4200, a=.005, d=2, s=.4, r=2.5, seed=77), t, 1.0, send='long', sgain=.7)
                put('bass', bass_note(roots[0] + 12, B * 5, 'cinema'), t, .9)
                for i, nn in enumerate([77, 80, 84, 89]):
                    put('arp', pluck(nn, 2.0, 0, 'bell'), t + B * (1 + i * .5), .18, p=(-.4 + i * .27), send='long', sgain=.7)
        if kind == 'drop' and first:
            put('fx', crash(2.6), t, .55, send='long', sgain=.35)

    # ambience for the harbor scenes
    if style == 'cinema':
        oc = ocean(N)
        env = np.zeros(N)
        for s in secs:
            if s['kind'] in ('intro', 'break2', 'outro'):
                a = int(s['beat'] * B * SR); b = int((s['beat'] + s['len']) * B * SR)
                env[a:b] = 1
        env = np.convolve(env, np.ones(int(SR * .8)) / int(SR * .8), mode='same')
        bus['amb'] += oc * env * 1.6

    # cue driven sfx
    for c in meta['cues']:
        t = c['t']; ty = c['type']
        if ty == 'hit':
            put('fx', boom(c.get('size', 1), style), t, .9, send='long', sgain=.3)
            if c.get('size', 1) >= 1: put('fx', crash(2.4), t, .45, send='long', sgain=.3)
        elif ty == 'thump':
            put('fx', tom(95 if style == 'hype' else 75), t, .6 * c.get('size', 1), send='short', sgain=.3)
        elif ty == 'whoosh':
            L = c.get('len', .5) * B + .2
            put('fx', whoosh(L, c.get('soft')), t - L * .6, .8)
        elif ty == 'riser':
            L = c.get('len', 2) * B
            put('fx', noise_riser(L), t, .9, p=0, send='long', sgain=.2)
            put('fx', pitch_riser(L, 45 if style == 'hype' else 41), t, 1.0)
        elif ty == 'swell':
            L = max(c.get('len', 2) * B, .5)
            x = noise_riser(L, 150, 2500) * .7
            put('fx', x, t, .6, send='long', sgain=.6)
        elif ty == 'blip':
            pn = PENTA[style][int(c.get('pitch', 0)) % len(PENTA[style])]
            put('fx', pluck(pn, .18, 0, 'bell'), t, .25, p=(-.3 + .15 * (int(c.get('pitch', 0)) % 5)), send='short', sgain=.6)
        elif ty == 'ding':
            for i, pn in enumerate([PENTA[style][0], PENTA[style][2] + 12]):
                put('fx', pluck(pn, 1.4, 0, 'bell'), t + i * .06, .22, send='long', sgain=.5)
        elif ty == 'type':
            L = c.get('len', 1.5) * B
            put('fx', type_clicks(L, c.get('chars', 20)), t, 1.0, p=.1)
        elif ty == 'drop':
            if c.get('final'): put('fx', crash(4), t, .5, send='long', sgain=.4)

    # sidechain pump from kicks
    sc = np.ones(N)
    rel = .16 if style == 'hype' else .28; depth = .6 if style == 'hype' else .45
    tt_ = tt(int(SR * rel * 4))
    shape = 1 - depth * np.exp(-tt_ / (rel / 2.2)) * np.clip(tt_ / .004, 0, 1)
    for kt in kick_times:
        i = int(kt * SR); m = min(len(shape), N - i)
        sc[i:i + m] = np.minimum(sc[i:i + m], shape[:m])
    for k in ('bass', 'chords', 'arp'): bus[k] *= sc
    sends['long'] *= sc

    # voiceover
    if vo_dir and meta.get('vo'):
        for v in meta['vo']:
            f = os.path.join(vo_dir, v['id'] + '.wav')
            x, sr = sf.read(f)
            if x.ndim > 1: x = x.mean(axis=1)
            x = resample_to_sr(x, sr)
            x = hp(x, 85, 2)
            # gentle compression
            env = np.sqrt(signal.lfilter([1 - .998], [1, -.998], x ** 2) + 1e-9)
            g = np.minimum(1, (db(-18) / np.maximum(env, 1e-6)) ** .35)
            x = x * g
            x = x / (np.abs(x).max() + 1e-9) * .9
            put('vo', x, v['t'], 1.0, send='short', sgain=.08)

    # reverbs
    ir_s = make_ir(1.1 if style == 'hype' else 1.6, 6500, seed=5)
    ir_l = make_ir(2.4 if style == 'hype' else 4.2, 5000, seed=9)
    wet = convolve(sends['short'], ir_s) * .55 + convolve(sends['long'], ir_l) * .6

    music = bus['drums'] * db(-2) + bus['bass'] * db(-1) + bus['chords'] * db(-7) + bus['arp'] * db(-6) + bus['fx'] * db(-3) + bus['amb'] + wet
    music = hp(music, 28, 2)
    if bus['vo'].any():
        v = np.abs(bus['vo']).max(axis=0)
        v = maximum_filter1d(v, int(SR * .25))
        v = np.convolve(v, np.ones(int(SR * .2)) / int(SR * .2), mode='same')
        k = np.clip(v / (v.max() + 1e-9) * 2.5, 0, 1)
        mid = bp(music, 220, 5200, 2)
        music = (music - mid * .55 * k) * (1 - .5 * k)
    DEBUG["music"] = music; DEBUG["vo"] = bus["vo"] * db(5)
    mix = music + bus["vo"] * db(5)

    mix = mix[:, :int(round(dur * SR))]
    # glue: soft clip, loudness, limiter
    mix = np.tanh(mix * 1.1) / 1.1
    return mix

def master(mix, target_lufs=-14.0, ceiling_db=-1.2):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    L = meter.integrated_loudness(mix.T)
    mix = mix * db(target_lufs - L)
    # lookahead peak limiter on 4x oversampled peaks
    ceil = db(ceiling_db)
    up = signal.resample_poly(mix, 4, 1, axis=1)
    pk = np.abs(up).max(axis=0).reshape(-1, 4).max(axis=1)[:mix.shape[1]]
    look = int(SR * .004)
    pk = maximum_filter1d(pk, look * 2 + 1)
    g = np.minimum(1, ceil / np.maximum(pk, 1e-9))
    g = signal.lfilter([1 - .9995], [1, -.9995], g - 1) + 1
    g = np.minimum(g, ceil / np.maximum(pk, 1e-9))
    mix = mix * g
    fade = int(SR * .35)
    mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
    return mix, L, meter.integrated_loudness(mix.T)

if __name__ == '__main__':
    meta = json.load(open(sys.argv[1])); out = sys.argv[2]
    vo_dir = sys.argv[3] if len(sys.argv) > 3 else None
    mix = render(meta, vo_dir)
    mix, l0, l1 = master(mix)
    sf.write(out, mix.T, SR, subtype='PCM_24')
    print(f"{out}: {mix.shape[1] / SR:.2f}s  loudness {l0:.1f} -> {l1:.1f} LUFS  peak {20 * np.log10(np.abs(mix).max()):.2f} dBFS")
