#!/usr/bin/env python3
"""Ohmnia PV promo — musique originale + bibliothèque de bruitages, 100 % synthétisés.

Déterministe (graine fixe) : relancer le script régénère exactement les mêmes fichiers.

    python tools/sound.py assets/audio

Sorties :
    musique-ohmnia.wav   bed musical 60 s, 48 kHz stéréo (120 BPM)
    sfx-*.wav            bruitages courts, placés à la racine de index.html

Structure musicale (temps absolus, calés sur la timeline des scènes) :
    0.0–2.75   jour : arpège clair en ré majeur + tic-tac
    2.75–3.4   coucher de soleil : glissando descendant, le filtre se ferme
    3.4–15.0   nuit / problème : ré mineur, ostinato tendu, battement sourd, riser
    15.0       bascule : impact + lever de soleil, passage en ré majeur
    15–22      logo : nappes + arpèges aériens
    22–54      groove (kick, clap, basse, arpèges), contre-chant à 38 s, pic à 46 s
    54–60      appel à l'action : accord final, résolution et extinction
"""

import os
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
BPM = 120.0
BEAT = 60.0 / BPM  # 0.5 s
BAR = 4 * BEAT  # 2 s
DUR = 60.0
N = int(SR * DUR)

rng = np.random.default_rng(20261015)


# ---------------------------------------------------------------- helpers
def tvec(n):
    return np.arange(n) / SR


def midi(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def ns(sec):
    return int(round(sec * SR))


def noise(n):
    return rng.standard_normal(n)


def sos_filter(x, kind, freq, order=2):
    sos = signal.butter(order, freq, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def bandpass(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def sweep_filter(x, f_start, f_end, kind="lowpass", block=512, curve="exp"):
    """Time-varying 2-pole filter, block-wise with state carry."""
    out = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nb):
        u = b / max(1, nb - 1)
        if curve == "exp":
            f = f_start * (f_end / f_start) ** u
        else:
            f = f_start + (f_end - f_start) * u
        f = float(np.clip(f, 20, SR / 2 - 200))
        sos = signal.butter(2, f, btype=kind, fs=SR, output="sos")
        seg = x[b * block:(b + 1) * block]
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0.0
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[b * block:(b + 1) * block] = y
    return out


def saw(freq, n, phase0=0.0):
    """PolyBLEP sawtooth; freq may be scalar or per-sample array."""
    f = np.full(n, float(freq)) if np.isscalar(freq) else np.asarray(freq, float)
    dt = f / SR
    phase = (phase0 + np.cumsum(dt)) % 1.0
    y = 2.0 * phase - 1.0
    m1 = phase < dt
    x = phase[m1] / dt[m1]
    y[m1] -= x + x - x * x - 1.0
    m2 = phase > 1.0 - dt
    x = (phase[m2] - 1.0) / dt[m2]
    y[m2] -= x * x + x + x + 1.0
    return y


def sine(freq, n, phase0=0.0):
    f = np.full(n, float(freq)) if np.isscalar(freq) else np.asarray(freq, float)
    return np.sin(2 * np.pi * (phase0 + np.cumsum(f) / SR))


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, hold=None):
    """Envelope of n samples; release starts at `hold` seconds (default: n - r)."""
    t = tvec(n)
    total = n / SR
    hold = total - r if hold is None else hold
    env = np.where(t < a, t / max(a, 1e-6), 1.0)
    dec = (t >= a) & (t < a + d)
    env = np.where(dec, 1.0 - (1.0 - s) * (t - a) / max(d, 1e-6), env)
    env = np.where((t >= a + d) & (t < hold), s, env)
    rel = t >= hold
    level_at_hold = s if hold >= a + d else np.interp(hold, [0, a, a + d], [0, 1, s])
    env = np.where(rel, level_at_hold * np.clip(1.0 - (t - hold) / max(r, 1e-6), 0, 1), env)
    return env


class Bus:
    def __init__(self, n=N):
        self.L = np.zeros(n)
        self.R = np.zeros(n)

    def add(self, sig, start, gain=1.0, pan=0.0):
        """Add mono (or (2, n) stereo) signal at `start` seconds."""
        i = ns(start)
        if i >= len(self.L):
            return
        if sig.ndim == 1:
            n = min(len(sig), len(self.L) - i)
            if n <= 0:
                return
            gl = gain * np.cos((pan + 1) * np.pi / 4)
            gr = gain * np.sin((pan + 1) * np.pi / 4)
            self.L[i:i + n] += sig[:n] * gl
            self.R[i:i + n] += sig[:n] * gr
        else:
            n = min(sig.shape[1], len(self.L) - i)
            if n <= 0:
                return
            self.L[i:i + n] += sig[0, :n] * gain
            self.R[i:i + n] += sig[1, :n] * gain

    def stereo(self):
        return np.vstack([self.L, self.R])


def make_ir(seconds=2.2, decay=0.55, seed=7, bright=6500):
    r = np.random.default_rng(seed)
    n = ns(seconds)
    t = tvec(n)
    env = np.exp(-t / decay)
    irs = []
    for ch in range(2):
        x = r.standard_normal(n) * env
        x = sos_filter(x, "lowpass", bright)
        x = sos_filter(x, "highpass", 180)
        # early reflections
        for k, (dly, g) in enumerate([(0.011, 0.6), (0.019, 0.45), (0.027, 0.35), (0.041, 0.25)]):
            j = ns(dly + 0.003 * ch * (k + 1))
            if j < n:
                x[j] += g * (1 if (k + ch) % 2 == 0 else -1)
        x[:ns(0.004)] = 0
        irs.append(x / np.sqrt(np.sum(x ** 2)))
    return irs


IR_HALL = make_ir(2.4, 0.6, seed=11)
IR_ROOM = make_ir(0.9, 0.22, seed=13, bright=8000)


def reverb(st, ir, mix=1.0):
    out = np.vstack([signal.fftconvolve(st[c], ir[c])[: st.shape[1]] for c in range(2)])
    return out * mix


def to_stereo(mono, width=0.0):
    return np.vstack([mono, mono])


# ---------------------------------------------------------------- instruments
def kick(amp=1.0, f0=150.0, f1=46.0, dur=0.5, muffled=False):
    n = ns(dur)
    t = tvec(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.22 if not muffled else 0.18))
    click = sos_filter(noise(n), "highpass", 2500) * np.exp(-t / 0.0025) * 0.35
    y = body + (0 if muffled else click)
    if muffled:
        y = sos_filter(y, "lowpass", 260)
    return y * amp


def clap(amp=1.0):
    n = ns(0.35)
    t = tvec(n)
    x = bandpass(noise(n), 900, 4200)
    env = np.zeros(n)
    for k, off in enumerate([0.0, 0.009, 0.018]):
        j = ns(off)
        env[j:] += np.exp(-(t[: n - j]) / 0.006) * (0.8 if k < 2 else 1.0)
    env += np.exp(-np.maximum(t - 0.022, 0) / 0.11) * (t > 0.022) * 0.8
    return x * env * amp


def hat(amp=1.0, open_=False):
    n = ns(0.35 if open_ else 0.08)
    t = tvec(n)
    x = sos_filter(noise(n), "highpass", 7500)
    x += 0.4 * sos_filter(noise(n), "bandpass", [9000, 14000]) if False else 0
    return x * np.exp(-t / (0.11 if open_ else 0.022)) * amp


def crash(amp=1.0, dur=2.8):
    n = ns(dur)
    t = tvec(n)
    x = sos_filter(noise(n), "highpass", 4200) * np.exp(-t / 0.9)
    x += sos_filter(noise(n), "bandpass", [2500, 7000]) * np.exp(-t / 0.35) * 0.5
    return x * amp


def boom(amp=1.0, dur=1.8, f0=70.0, f1=34.0):
    n = ns(dur)
    t = tvec(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.12)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    y += sos_filter(noise(n), "lowpass", 900) * np.exp(-t / 0.08) * 0.5
    return y * amp


def pad_note(m, dur, amp=1.0, cutoff=1800.0, a=0.35, r=0.7, detune=0.09, glide=None):
    """Supersaw-ish pad voice -> stereo (2, n)."""
    n = ns(dur + r)
    f = midi(m)
    if glide is not None:  # glide = (start_s, end_s, ratio)
        t = tvec(n)
        g0, g1, ratio = glide
        u = np.clip((t - g0) / max(g1 - g0, 1e-6), 0, 1)
        mult = ratio ** (u ** 1.6)
        freqs = f * mult
    else:
        freqs = f
    L = np.zeros(n)
    R = np.zeros(n)
    voices = [(-detune, -0.7), (-detune / 3, -0.25), (detune / 3, 0.25), (detune, 0.7)]
    for k, (cents_frac, pan) in enumerate(voices):
        ratio = 2 ** (cents_frac / 12)
        y = saw(freqs * ratio, n, phase0=0.13 * k)
        gl = np.cos((pan + 1) * np.pi / 4)
        gr = np.sin((pan + 1) * np.pi / 4)
        L += y * gl
        R += y * gr
    sub = sine(freqs * 0.5, n) * 0.35
    L += sub
    R += sub
    env = adsr(n, a=a, d=0.3, s=0.85, r=r, hold=dur)
    L = sos_filter(L, "lowpass", cutoff) * env
    R = sos_filter(R, "lowpass", cutoff) * env
    return np.vstack([L, R]) * amp * 0.22


def pluck(m, amp=1.0, decay=0.22, bright=5200.0, dark=1100.0, dur=0.6):
    n = ns(dur)
    t = tvec(n)
    f = midi(m)
    y = saw(f, n) * 0.7 + saw(f * 2.0006, n) * 0.18 + sine(f, n) * 0.4
    e_fast = np.exp(-t / (decay * 0.35))
    e_slow = np.exp(-t / decay)
    out = sos_filter(y, "lowpass", bright) * e_fast + sos_filter(y, "lowpass", dark) * (e_slow - e_fast * 0.5)
    out *= np.minimum(1.0, t / 0.002)
    return out * amp * 0.5


def keys(m, amp=1.0, dur=1.6):
    """Soft electric-piano-ish note."""
    n = ns(dur)
    t = tvec(n)
    f = midi(m)
    y = (sine(f, n) * np.exp(-t / 0.9)
         + 0.45 * sine(2 * f, n) * np.exp(-t / 0.45)
         + 0.18 * sine(3 * f, n) * np.exp(-t / 0.25)
         + 0.08 * sine(4.01 * f, n) * np.exp(-t / 0.12))
    y += sos_filter(noise(n), "bandpass", [1500, 5000]) * np.exp(-t / 0.004) * 0.05
    y *= np.minimum(1.0, t / 0.003)
    return y * amp * 0.45


def bass_note(m, dur, amp=1.0):
    n = ns(dur + 0.05)
    t = tvec(n)
    f = midi(m)
    y = saw(f, n) * 0.55 + sine(f, n) * 0.8 + sine(f * 0.5, n) * 0.25
    y = sos_filter(y, "lowpass", 520)
    env = adsr(n, a=0.004, d=0.12, s=0.75, r=0.05, hold=dur)
    return y * env * amp * 0.55


def lead_note(m, dur, amp=1.0):
    n = ns(dur + 0.35)
    t = tvec(n)
    f = midi(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) / 0.3, 0, 1))
    y = saw(f, n) * 0.35 + sine(f, n) * 0.6 + sine(2 * f, n) * 0.12
    y = sos_filter(y, "lowpass", 3200)
    env = adsr(n, a=0.03, d=0.2, s=0.7, r=0.3, hold=dur)
    return y * env * amp * 0.4


def noise_riser(dur, amp=1.0, lo=250.0, hi=7000.0):
    n = ns(dur)
    t = tvec(n)
    x = noise(n)
    x = sweep_filter(x, lo, hi, kind="lowpass")
    x = sos_filter(x, "highpass", 150)
    env = (t / dur) ** 2.2
    return x * env * amp


def reverse_swell(dur, amp=1.0):
    x = crash(1.0, dur)[::-1]
    return x * amp


# ---------------------------------------------------------------- music
def build_music():
    drums = Bus()
    music = Bus()
    send = Bus()  # reverb send
    duck_times = []

    D_MAJ_ARP = [69, 74, 76, 78, 81, 78, 76, 74]  # A4 D5 E5 F#5 A5 F#5 E5 D5

    # --- A. jour (0–2.75) : arpège clair + nappe douce
    music.add(pad_note(62, 2.6, amp=0.55, cutoff=2400, a=0.6, r=0.5), 0.0)
    music.add(pad_note(66, 2.6, amp=0.45, cutoff=2400, a=0.6, r=0.5), 0.0)
    music.add(pad_note(69, 2.6, amp=0.45, cutoff=2400, a=0.6, r=0.5), 0.0)
    for i in range(11):
        tt = 0.0 + i * 0.25
        if tt > 2.6:
            break
        k = keys(D_MAJ_ARP[i % 8] + 0, amp=0.55)
        music.add(k, tt, gain=0.9, pan=0.25 * np.sin(i))
        send.add(k, tt, gain=0.5)
    # tic-tac (0–2.75 noires, 3.4–15 croches)
    def tick(high=True, amp=0.5):
        n = ns(0.03)
        t = tvec(n)
        y = sine(3300 if high else 2400, n) * np.exp(-t / 0.004) + sos_filter(noise(n), "highpass", 4000) * np.exp(-t / 0.002) * 0.4
        return y * amp
    for i in range(6):
        drums.add(tick(i % 2 == 0, 0.32), i * 0.5, pan=0.15)

    # --- coucher de soleil (2.75–3.4) : glissando descendant, filtre qui se ferme
    for m in (62, 66, 69, 74):
        st = pad_note(m, 0.9, amp=0.5, cutoff=2600, a=0.02, r=0.4, glide=(0.0, 0.65, 2 ** (-5 / 12)))
        st = np.vstack([sweep_filter(st[0], 2600, 400), sweep_filter(st[1], 2600, 400)])
        music.add(st, 2.75)
        send.add(st, 2.75, gain=0.4)

    # --- B. nuit / problème (3.4–15) : ré mineur
    # drone grave
    music.add(pad_note(38, 11.4, amp=0.7, cutoff=380, a=0.8, r=0.3), 3.4)
    music.add(pad_note(45, 11.4, amp=0.45, cutoff=420, a=1.2, r=0.3), 3.4)
    for i in range(int((15.0 - 3.4) / 0.25)):
        tt = 3.5 + i * 0.25
        if tt >= 14.8:
            break
        drums.add(tick(i % 2 == 0, 0.22 if tt < 11 else 0.3), tt, pan=-0.2)
    # accords (2 s chacun) + ostinato en doubles croches
    prob_chords = [  # (start, root, chord tones)
        (5.0, 50, [50, 53, 57]),   # Dm
        (7.0, 46, [46, 50, 53]),   # Bb
        (9.0, 43, [43, 46, 50]),   # Gm
        (11.0, 45, [45, 49, 52]),  # A
        (13.0, 45, [45, 49, 52, 55]),  # A7
    ]
    for (st0, root, tones) in prob_chords:
        dur = 2.0 if st0 < 13.0 else 1.85
        cutoff = 700 + (st0 - 5.0) * 120
        for m in tones:
            p = pad_note(m + 12, dur, amp=0.32, cutoff=cutoff, a=0.25, r=0.25)
            music.add(p, st0)
            send.add(p, st0, gain=0.35)
        pattern = [0, 2, 1, 2]  # indices into tones (root, fifth, third…)
        for j in range(int(dur / 0.125)):
            tt = st0 + j * 0.125
            if tt >= 14.85:
                break
            m = tones[pattern[j % 4] % len(tones)] + (12 if j % 8 >= 4 else 0)
            p = pluck(m, amp=0.55 if j % 4 == 0 else 0.38, decay=0.09, bright=2600, dark=800, dur=0.25)
            music.add(p, tt, pan=0.3 if j % 2 else -0.3)
    # battement sourd
    for i in range(int((14.5 - 7.0) / 0.5) + 1):
        drums.add(kick(0.75, muffled=True), 7.0 + i * 0.5)
    # riser + swell vers la bascule
    drums.add(noise_riser(2.25, amp=0.32), 12.6)
    drums.add(reverse_swell(1.15, amp=0.5), 15.0 - 1.15)

    # --- C. jour / solution (15–54) : ré majeur, D A Bm G
    prog = [(62, [62, 66, 69]), (57, [57, 61, 64]), (59, [59, 62, 66]), (55, [55, 59, 62])]
    bass_roots = [38, 45, 47, 43]
    drums.add(boom(0.9), 15.0)
    drums.add(crash(0.55), 15.0)
    for b in range(20):
        st0 = 15.0 + b * BAR
        root, tones = prog[b % 4]
        bright = 1600 if st0 < 22 else (2200 if st0 < 46 else 3000)
        for m in tones:
            p = pad_note(m, BAR, amp=0.42, cutoff=bright, a=0.12 if b else 0.05, r=0.35)
            music.add(p, st0)
            send.add(p, st0, gain=0.3)
        # arpège pluck
        arp = [tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[1] + 12]
        step = 0.25 if st0 < 22 else 0.125
        for j in range(int(BAR / step)):
            tt = st0 + j * step
            m = arp[j % 4] + (12 if (j // 4) % 2 and st0 >= 38 else 0)
            p = pluck(m, amp=0.42 if j % 2 == 0 else 0.3, decay=0.16, bright=4800, dark=1300, dur=0.45)
            music.add(p, tt, pan=0.35 if j % 2 else -0.35)
            send.add(p, tt, gain=0.25)
        # rythmique à partir de 22 s
        if st0 >= 21.0:
            for q in range(4):
                tq = st0 + q * BEAT
                if tq < 22.0:
                    continue
                drums.add(kick(0.95), tq)
                duck_times.append(tq)
                drums.add(hat(0.16, open_=True), tq + BEAT / 2, pan=0.2)
                if q in (1, 3):
                    c = clap(0.42)
                    drums.add(c, tq, pan=-0.05)
                    send.add(c, tq, gain=0.3)
                if st0 >= 46.0:
                    for s16 in (0.125, 0.375):
                        drums.add(hat(0.09), tq + s16, pan=-0.25)
            # basse
            br = bass_roots[b % 4]
            for e in range(8):
                te = st0 + e * 0.25
                if te < 22.0:
                    continue
                m = br + (12 if e % 2 else 0)
                music.add(bass_note(m, 0.22, amp=0.9), te)
        elif st0 >= 17.0:
            for s in range(8):
                drums.add(hat(0.07), st0 + s * 0.25 + 0.125, pan=0.3)
    # petit roulement + riser avant 22 s
    for k in range(8):
        drums.add(clap(0.12 + 0.03 * k), 21.0 + k * 0.125)
    drums.add(noise_riser(1.0, amp=0.18), 21.0)
    # accent 30 s (rapport)
    drums.add(crash(0.32, 2.0), 30.0)
    # contre-chant 38–46
    lead_bars = [[78, 81, 78, 76], [76, 73, 76, 81], [74, 78, 83, 81], [83, 81, 79, 78]]
    for b in range(4):
        for rep in range(2):
            st0 = 38.0 + (b + rep * 4) * BAR if False else None
    for b in range(4):
        st0 = 38.0 + b * BAR
        for q, m in enumerate(lead_bars[b]):
            ln = lead_note(m, BEAT * 0.9, amp=0.75)
            music.add(ln, st0 + q * BEAT, pan=0.1)
            send.add(ln, st0 + q * BEAT, gain=0.45)
    for b in range(4):
        st0 = 46.0 + b * BAR
        for q, m in enumerate(lead_bars[b]):
            ln = lead_note(m + 12 if q == 3 and b == 3 else m, BEAT * 0.9, amp=0.85)
            music.add(ln, st0 + q * BEAT, pan=-0.1)
            send.add(ln, st0 + q * BEAT, gain=0.45)
    # roulement + riser vers 54 s
    for k in range(16):
        drums.add(clap(0.1 + 0.02 * k), 53.0 + k * 0.0625)
    drums.add(noise_riser(2.0, amp=0.25), 52.0)

    # --- D. appel à l'action (54–60)
    drums.add(crash(0.5, 3.0), 54.0)
    drums.add(boom(0.75, 2.0), 54.0)
    ending = [(54.0, 2.0, [62, 66, 69, 74]), (56.0, 1.0, [59, 62, 67, 71]), (57.0, 1.0, [61, 64, 69, 73]), (58.0, 2.0, [62, 66, 69, 74, 78])]
    for (st0, dur, tones) in ending:
        for m in tones:
            p = pad_note(m, dur if st0 < 58 else 1.4, amp=0.4, cutoff=2600, a=0.05, r=0.6 if st0 < 58 else 0.55)
            music.add(p, st0)
            send.add(p, st0, gain=0.4)
            k = keys(m + 12, amp=0.35, dur=2.0)
            music.add(k, st0)
            send.add(k, st0, gain=0.5)
    music.add(bass_note(38, 1.9, amp=0.9), 54.0)
    music.add(bass_note(43, 0.95, amp=0.8), 56.0)
    music.add(bass_note(45, 0.95, amp=0.8), 57.0)
    music.add(bass_note(38, 1.5, amp=0.8), 58.0)

    # --- sidechain sur nappes / basse (pompage léger)
    duck = np.ones(N)
    t = tvec(ns(0.4))
    shape = 1.0 - 0.45 * np.exp(-t / 0.09)
    for tq in duck_times:
        i = ns(tq)
        n = min(len(shape), N - i)
        duck[i:i + n] = np.minimum(duck[i:i + n], shape[:n])
    music.L *= duck
    music.R *= duck

    mix = drums.stereo() + music.stereo()
    wet = reverb(send.stereo() + 0.15 * drums.stereo(), IR_HALL, mix=0.55)
    mix = mix + wet
    # silence de respiration juste avant la bascule (sauf swell)
    g = np.ones(N)
    i0, i1 = ns(14.88), ns(15.0)
    g[i0:i1] = np.linspace(1, 0.25, i1 - i0)
    mix *= g
    # fondu final
    fade = np.ones(N)
    f0 = ns(59.0)
    fade[f0:] = np.linspace(1, 0, N - f0) ** 1.5
    mix *= fade
    # master : HPF, compression douce, saturation légère
    mix = np.vstack([sos_filter(mix[c], "highpass", 32) for c in range(2)])
    env = np.sqrt(signal.lfilter([0.0005], [1, -0.9995], (mix ** 2).mean(0)))
    thr = 0.18
    gain = np.where(env > thr, (thr / np.maximum(env, 1e-9)) ** 0.35, 1.0)
    mix = mix * gain
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
    return mix


# ---------------------------------------------------------------- SFX
def sfx_library():
    lib = {}

    def norm(x, peak=0.9):
        m = np.max(np.abs(x)) + 1e-9
        return x / m * peak

    def st(mono, wet=0.25, ir=IR_ROOM):
        s = np.vstack([mono, mono])
        return norm(s + reverb(s, ir, mix=wet))

    def whoosh(dur, lo, hi, peak_at=0.6, amp=1.0):
        n = ns(dur)
        t = tvec(n)
        x = noise(n)
        x = sweep_filter(x, lo, hi, kind="lowpass")
        x = sos_filter(x, "highpass", 120)
        u = t / dur
        env = np.where(u < peak_at, (u / peak_at) ** 2, ((1 - u) / (1 - peak_at)) ** 1.5)
        return x * env * amp

    lib["sfx-whoosh-down"] = st(whoosh(0.9, 5000, 300, 0.35), 0.3)
    lib["sfx-whoosh-soft"] = st(whoosh(0.6, 500, 4000, 0.6, 0.8), 0.2)
    lib["sfx-whoosh-up"] = st(whoosh(0.7, 400, 7000, 0.75), 0.25)

    # papiers : froissements (impulsions filtrées aléatoires mais graine fixe)
    def rustle(dur, density=180, amp=1.0, lo=1200, hi=7000, rise=0.15):
        n = ns(dur)
        t = tvec(n)
        x = np.zeros(n)
        r = np.random.default_rng(int(dur * 1000) + density)
        times = np.sort(r.uniform(0, dur * 0.95, int(density * dur)))
        for tt in times:
            i = ns(tt)
            ln = ns(r.uniform(0.004, 0.02))
            seg = r.standard_normal(min(ln, n - i)) * np.exp(-np.arange(min(ln, n - i)) / (ln * 0.3))
            x[i:i + len(seg)] += seg * r.uniform(0.3, 1.0)
        x = bandpass(x, lo, hi)
        env = np.minimum(1, t / rise) * np.exp(-np.maximum(t - dur * 0.5, 0) / (dur * 0.25))
        return x * env * amp

    lib["sfx-paper-flutter"] = st(rustle(1.1, 260) + whoosh(1.1, 600, 5000, 0.4, 0.5), 0.2)
    lib["sfx-paper-rustle"] = st(rustle(0.55, 220, rise=0.03), 0.15)
    lib["sfx-pages"] = st(rustle(0.7, 160, rise=0.02) + whoosh(0.7, 800, 6000, 0.5, 0.7), 0.25)

    def flick():
        n = ns(0.16)
        t = tvec(n)
        x = bandpass(noise(n), 1500, 6000) * np.exp(-t / 0.025)
        x += sine(900, n) * np.exp(-t / 0.01) * 0.3
        return x
    lib["sfx-photo-flick"] = st(flick(), 0.2)

    def stamp():
        n = ns(0.7)
        t = tvec(n)
        x = sine(80 * (1 + 0.5 * np.exp(-t / 0.02)), n) * np.exp(-t / 0.09)
        x += sos_filter(noise(n), "lowpass", 2500) * np.exp(-t / 0.015) * 0.8
        x += bandpass(noise(n), 300, 1200) * np.exp(-t / 0.05) * 0.4
        return x
    lib["sfx-stamp"] = st(stamp(), 0.2)

    def sms():
        n = ns(0.45)
        t = tvec(n)
        x = np.zeros(n)
        for k, (f, off) in enumerate([(1318.5, 0.0), (1760.0, 0.09)]):
            j = ns(off)
            tt = t[: n - j]
            x[j:] += (sine(f, n - j) + 0.3 * sine(2 * f, n - j)) * np.exp(-tt / 0.07) * np.minimum(1, tt / 0.002)
        return x
    lib["sfx-sms"] = st(sms(), 0.2)

    def error_tone():
        n = ns(0.35)
        t = tvec(n)
        x = (saw(220, n) * 0.4 + sine(220, n)) * np.exp(-t / 0.08)
        x = sos_filter(x, "lowpass", 1800)
        y = np.zeros(n)
        j = ns(0.11)
        y[j:] = x[: n - j]
        return x + y * 0.8
    lib["sfx-error"] = st(error_tone(), 0.15)

    def notif():
        n = ns(0.9)
        t = tvec(n)
        x = np.zeros(n)
        for f, off in [(988, 0.0), (784, 0.16)]:
            j = ns(off)
            tt = t[: n - j]
            x[j:] += (sine(f, n - j) + 0.25 * sine(3 * f, n - j)) * np.exp(-tt / 0.18) * np.minimum(1, tt / 0.003)
        return x
    lib["sfx-notif"] = st(notif(), 0.3)

    def snap():
        n = ns(0.3)
        t = tvec(n)
        x = sos_filter(noise(n), "highpass", 1800) * np.exp(-t / 0.006)
        x += sine(1700, n) * np.exp(-t / 0.02) * 0.5
        x += sine(110, n) * np.exp(-t / 0.06) * 0.6
        y = np.zeros(n)
        j = ns(0.045)
        y[j:] = x[: n - j] * 0.6
        return x + y
    lib["sfx-snap"] = st(snap(), 0.25)

    def sunrise():
        n = ns(1.6)
        t = tvec(n)
        x = whoosh(1.6, 300, 9000, 0.3, 0.6)
        for k, f in enumerate([587.3, 880, 1174.7, 1760, 2349.3]):
            tt = np.maximum(t - 0.05 * k, 0)
            x += sine(f, n) * np.exp(-tt / 0.6) * np.minimum(1, tt / 0.15) * 0.12
        return x
    lib["sfx-sunrise"] = st(sunrise(), 0.45, IR_HALL)

    def shimmer(dur=1.3):
        n = ns(dur)
        t = tvec(n)
        x = np.zeros(n)
        notes = [86, 90, 93, 98, 102, 105]
        for k, m in enumerate(notes):
            j = ns(0.06 * k)
            tt = t[: n - j]
            x[j:] += sine(midi(m), n - j) * np.exp(-tt / 0.35) * np.minimum(1, tt / 0.004) * (0.6 - 0.06 * k)
        return x
    lib["sfx-shimmer"] = st(shimmer(), 0.5, IR_HALL)

    def tap():
        n = ns(0.07)
        t = tvec(n)
        return sine(1400 * (1 + 0.6 * np.exp(-t / 0.004)), n) * np.exp(-t / 0.012) + sos_filter(noise(n), "highpass", 3000) * np.exp(-t / 0.002) * 0.3
    lib["sfx-tap"] = st(tap(), 0.1)

    def check():
        n = ns(0.2)
        t = tvec(n)
        f = 700 * (1 + 0.9 * np.minimum(t / 0.05, 1))
        return sine(f, n) * np.exp(-t / 0.06) * np.minimum(1, t / 0.002)
    lib["sfx-check"] = st(check(), 0.15)

    def pop():
        n = ns(0.12)
        t = tvec(n)
        f = 380 * (1 + 1.2 * np.exp(-t / 0.01))
        return sine(f, n) * np.exp(-t / 0.035)
    lib["sfx-pop"] = st(pop(), 0.15)

    def alert():
        n = ns(0.5)
        t = tvec(n)
        x = np.zeros(n)
        for off in (0.0, 0.14):
            j = ns(off)
            tt = t[: n - j]
            x[j:] += (sine(660, n - j) + 0.4 * sine(990, n - j)) * np.exp(-tt / 0.07) * np.minimum(1, tt / 0.003)
        return x
    lib["sfx-alert"] = st(alert(), 0.15)

    def shutter():
        n = ns(0.22)
        t = tvec(n)
        x = np.zeros(n)
        for off, a in ((0.0, 1.0), (0.07, 0.7)):
            j = ns(off)
            tt = t[: n - j]
            x[j:] += bandpass(noise(n - j), 1000, 8000) * np.exp(-tt / 0.008) * a
        return x
    lib["sfx-shutter"] = st(shutter(), 0.15)

    def pen():
        n = ns(1.3)
        t = tvec(n)
        x = bandpass(noise(n), 2500, 9000)
        am = 0.5 + 0.5 * np.sin(2 * np.pi * 7.5 * t) ** 2 + 0.3 * np.sin(2 * np.pi * 3.1 * t)
        env = np.minimum(1, t / 0.05) * np.minimum(1, (1.3 - t) / 0.12)
        return x * am * env * 0.6
    lib["sfx-pen"] = st(pen(), 0.08)

    def send():
        x = whoosh(0.55, 700, 8000, 0.7, 0.9)
        return x
    lib["sfx-send"] = st(send(), 0.2)

    def ding():
        n = ns(1.4)
        t = tvec(n)
        x = np.zeros(n)
        for f, a, d in ((1568, 1.0, 0.5), (2093, 0.55, 0.35), (3136, 0.25, 0.2), (4186, 0.12, 0.12)):
            x += sine(f, n) * a * np.exp(-t / d)
        return x * np.minimum(1, t / 0.002)
    lib["sfx-ding"] = st(ding(), 0.35, IR_HALL)

    def pin():
        n = ns(0.22)
        t = tvec(n)
        f = 520 * (1 + 0.8 * np.exp(-t / 0.02))
        return sine(f, n) * np.exp(-t / 0.05) + sos_filter(noise(n), "lowpass", 1500) * np.exp(-t / 0.01) * 0.3
    lib["sfx-pin"] = st(pin(), 0.2)

    def key():
        n = ns(0.06)
        t = tvec(n)
        return bandpass(noise(n), 1200, 7000) * np.exp(-t / 0.006) + sine(2600, n) * np.exp(-t / 0.004) * 0.2
    lib["sfx-key"] = st(key(), 0.08)

    def hit_soft():
        n = ns(0.9)
        t = tvec(n)
        x = sine(90 * (1 + 0.8 * np.exp(-t / 0.03)), n) * np.exp(-t / 0.18)
        x += sos_filter(noise(n), "bandpass", [800, 5000]) * np.exp(-t / 0.04) * 0.25
        return x
    lib["sfx-hit-soft"] = st(hit_soft(), 0.3, IR_HALL)

    def button():
        n = ns(0.35)
        t = tvec(n)
        x = tap()
        y = np.zeros(n)
        y[: len(x)] += x
        y += sine(1046.5, n) * np.exp(-t / 0.12) * 0.4 * (t > 0.04)
        return y
    lib["sfx-button"] = st(button(), 0.25)

    lib["sfx-tick"] = st(np.concatenate([tap()[: ns(0.03)] * 0.6, np.zeros(ns(0.02))]), 0.05)
    return lib


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "assets/audio"
    os.makedirs(out, exist_ok=True)
    only = set(sys.argv[2:])
    if not only or "music" in only:
        mix = build_music()
        sf.write(os.path.join(out, "musique-ohmnia.wav"), mix.T.astype(np.float32), SR, subtype="PCM_16")
        print("music", mix.shape, "peak", float(np.max(np.abs(mix))))
    if not only or "sfx" in only:
        for name, s in sfx_library().items():
            sf.write(os.path.join(out, name + ".wav"), s.T.astype(np.float32), SR, subtype="PCM_16")
        print("sfx written")


if __name__ == "__main__":
    main()
