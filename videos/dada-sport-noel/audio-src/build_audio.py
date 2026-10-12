"""Bande-son de « Les Chevaux de l'Étoile » — Dada Sport Paris.

Construit trois pistes alignées sur la timeline de la vidéo (79 s, 48 kHz, stéréo) :
  - voix-off.wav : les blocs de voix du Père Noël, traités (EQ, compression, salle)
  - musique.wav  : partition originale synthétisée (boîte à musique, cordes, piano,
                   célesta), déjà « carvée » sous la voix
  - ambiance.wav : vent, pas dans la neige, grelots lointains, chute d'étoile,
                   scintillements des cadeaux

Usage : python build_audio.py <dossier_blocs_voix> <dossier_sortie>
Les blocs de voix attendus sont D_b1.wav … D_b9.wav (Kokoro + rubberband).
Tout est déterministe (générateur aléatoire à graine fixe).
"""

import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
TOTAL = 79.0
N = int(TOTAL * SR)
rng = np.random.default_rng(1225)

VO_DIR = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

# Placement des blocs de voix (secondes, timeline globale).
VO_STARTS = [5.8, 17.0, 28.2, 40.3, 44.8, 48.9, 53.0, 59.8, 71.2]

# Instants clés partagés avec la vidéo.
STAR_FALL = (17.6, 20.6)  # l'étoile descend vers l'écurie
SLEIGH = (23.0, 27.5)  # grelots du traîneau qui s'éloigne
WALK = (28.5, 39.0)  # pas dans la neige (cavalière + cheval)
STEP = 0.55  # intervalle entre deux appuis
REVEALS = [44.4, 48.5, 52.6]  # Tinka, Giovani Winter, New Tzara
END_SWELL = 69.4


def t_axis(n):
    return np.arange(n) / SR


def place(buf, x, start):
    i = int(round(start * SR))
    if i >= buf.shape[-1]:
        return
    x = x[..., : buf.shape[-1] - i]
    buf[..., i : i + x.shape[-1]] += x


def env_adsr(n, a, d, s, r, sustain_len=None):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    if sustain_len is None:
        sustain_len = max(0, n - a_n - d_n - r_n)
    s_n = int(sustain_len)
    e = np.concatenate(
        [
            np.linspace(0, 1, max(a_n, 1)) ** 2,
            np.linspace(1, s, max(d_n, 1)),
            np.full(s_n, s),
            np.linspace(s, 0, max(r_n, 1)) ** 1.5,
        ]
    )
    out = np.zeros(n)
    out[: min(n, len(e))] = e[:n]
    return out


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pan(x, p):
    """p in [-1, 1] → stéréo à puissance constante."""
    ang = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(ang), x * np.sin(ang)])


def lowpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "low")
    return signal.lfilter(b, a, x, axis=-1)


def highpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x, axis=-1)


def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, x, axis=-1)


def peaking(x, f0, gain_db, q=0.9):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b = [1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]
    a = [1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A]
    return signal.lfilter(b, a, x, axis=-1)


def shelf(x, f0, gain_db, kind="low"):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / 2 * np.sqrt(2)
    cw = np.cos(w0)
    sA = 2 * np.sqrt(A) * alpha
    if kind == "low":
        b = [A * ((A + 1) - (A - 1) * cw + sA), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sA)]
        a = [(A + 1) + (A - 1) * cw + sA, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sA]
    else:
        b = [A * ((A + 1) + (A - 1) * cw + sA), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sA)]
        a = [(A + 1) - (A - 1) * cw + sA, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sA]
    return signal.lfilter(b, a, x, axis=-1)


def make_ir(seconds, damp_hz, predelay=0.02, seed=7):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = t_axis(n)
    ir = np.zeros((2, n))
    for ch in range(2):
        noise = r.standard_normal(n)
        noise = lowpass(noise, damp_hz, 1)
        ir[ch] = noise * np.exp(-6.9 * t / seconds)
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros((2, pd)), ir], axis=1)
    ir /= np.sqrt((ir**2).sum(axis=1, keepdims=True))
    return ir


def reverb(x, ir, wet):
    """x stéréo (2, n) → stéréo, mixage dry/wet."""
    out = np.zeros_like(x)
    for ch in range(2):
        out[ch] = signal.fftconvolve(x[ch], ir[ch])[: x.shape[1]]
    return x * (1 - wet) + out * wet * 1.0


def compress(x, thresh_db=-20, ratio=3.0, attack=0.005, release=0.12):
    mono = np.abs(x).max(axis=0) if x.ndim == 2 else np.abs(x)
    lvl = np.zeros_like(mono)
    ga = np.exp(-1 / (attack * SR))
    gr = np.exp(-1 / (release * SR))
    # suiveur d'enveloppe vectorisé approximatif : filtre crête puis lissage
    peak = signal.lfilter([1 - gr], [1, -gr], mono)
    peak = np.maximum(peak, signal.lfilter([1 - ga], [1, -ga], mono))
    db = 20 * np.log10(np.maximum(peak, 1e-6))
    over = np.maximum(0, db - thresh_db)
    gain_db = -over * (1 - 1 / ratio)
    g = 10 ** (gain_db / 20)
    return x * g


# ------------------------------------------------------------------ instruments


def music_box(midi, dur=2.8, vel=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    f = mtof(midi)
    partials = [(1.0, 1.0, 1.6), (2.0, 0.32, 0.9), (3.01, 0.10, 0.5), (4.16, 0.12, 0.25), (5.43, 0.06, 0.12), (6.8, 0.04, 0.07)]
    y = np.zeros(n)
    for ratio, amp, dec in partials:
        if f * ratio > 15000:
            continue
        y += amp * np.sin(2 * np.pi * f * ratio * t + ratio) * np.exp(-t / dec)
    click = rng.standard_normal(int(0.004 * SR)) * np.linspace(1, 0, int(0.004 * SR)) * 0.08
    y[: len(click)] += click
    att = np.minimum(1, t / 0.002)
    return y * att * vel * 0.32


def celesta(midi, dur=2.2, vel=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    f = mtof(midi)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 1.1)
    y += 0.25 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.18)
    y += 0.12 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.6)
    att = np.minimum(1, t / 0.003)
    return y * att * vel * 0.22


def piano(midi, dur=4.0, vel=1.0):
    n = int(dur * SR)
    t = t_axis(n)
    f = mtof(midi)
    B = 0.0004
    y = np.zeros(n)
    for k in range(1, 12):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 12000:
            break
        amp = (1.0 / k**1.1) * (0.9 if k % 2 else 1.0)
        dec = 2.8 / (1 + 0.35 * (k - 1))
        y += amp * np.sin(2 * np.pi * fk * t + 0.3 * k) * np.exp(-t / dec)
    ham = lowpass(rng.standard_normal(int(0.01 * SR)), 2500, 1) * np.linspace(1, 0, int(0.01 * SR)) * 0.15
    y[: len(ham)] += ham
    rel = np.ones(n)
    rel[-int(0.3 * SR) :] = np.linspace(1, 0, int(0.3 * SR))
    att = np.minimum(1, t / 0.004)
    return lowpass(y * att * rel, 3200 if vel < 0.8 else 4500, 1) * vel * 0.18


def string_voice(midi, dur, attack=1.4, release=1.8, bright=1400, detune=(-6, 0, 7)):
    n = int((dur + release) * SR)
    t = t_axis(n)
    f = mtof(midi)
    y = np.zeros(n)
    vib = 1 + 0.0025 * np.sin(2 * np.pi * 5.1 * t + midi)
    for cents in detune:
        fd = f * 2 ** (cents / 1200)
        phase = 2 * np.pi * np.cumsum(fd * vib) / SR
        for k in range(1, 16):
            if fd * k > bright * 3:
                break
            y += np.sin(k * phase) / k
    y = lowpass(y, bright, 2)
    e = env_adsr(n, attack, 0.3, 0.85, release, sustain_len=max(0, int((dur - attack - 0.3) * SR)))
    return y * e * 0.05


def bells_jingle(dur, density=26, seed=3):
    """Grelots de traîneau : nuée de petites cloches inharmoniques."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    y = np.zeros(n)
    shake = 6.2
    for i in range(int(dur * density)):
        t0 = r.uniform(0, dur - 0.3)
        # regroupe autour des « secousses »
        t0 = np.round(t0 * shake) / shake + r.normal(0, 0.012)
        if t0 < 0 or t0 > dur - 0.3:
            continue
        f = r.uniform(2400, 5200)
        ln = int(0.28 * SR)
        tt = t_axis(ln)
        b = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.76 * tt) + 0.3 * np.sin(2 * np.pi * f * 5.4 * tt)) * np.exp(-tt / 0.06)
        i0 = int(t0 * SR)
        y[i0 : i0 + ln] += b[: n - i0] * r.uniform(0.4, 1.0)
    return y * 0.05


def snow_step(seed):
    r = np.random.default_rng(seed)
    ln = int(0.32 * SR)
    t = t_axis(ln)
    base = r.standard_normal(ln)
    crunch = np.zeros(ln)
    for _ in range(70):
        i = int(r.beta(1.6, 3.2) * (ln - 200))
        crunch[i : i + 30] += r.standard_normal(30) * r.uniform(0.3, 1.0)
    y = bandpass(base, 300, 2600) * 0.5 + bandpass(crunch, 900, 6500) * 1.4
    e = (1 - np.exp(-t / 0.01)) * np.exp(-t / 0.09)
    return y * e * 0.11


def sparkle_gliss(start_midi=84, n_notes=9, step=0.045, seed=0):
    r = np.random.default_rng(seed)
    scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26]
    out = np.zeros(int((n_notes * step + 2.4) * SR))
    for i in range(n_notes):
        m = start_midi + scale[i % len(scale)]
        note = celesta(m, 2.0, 0.55 + 0.4 * r.random())
        i0 = int(i * step * SR)
        out[i0 : i0 + len(note)] += note
    return out


# ------------------------------------------------------------------ musique

BAR = 3.0  # 3/4 à 60 bpm
# Accords par mesure (notes MIDI, la plus basse en premier).
CH = {
    "Bm": [47, 54, 59, 62, 66],
    "G": [43, 50, 55, 59, 62],
    "D": [50, 54, 57, 62, 66],
    "A": [45, 52, 57, 61, 64],
    "Em": [40, 52, 55, 59, 64],
    "F#": [42, 54, 58, 61, 66],
}
PROG = ["Bm", "G", "D", "A", "Bm", "G", "D", "Em", "F#", "Bm", "G", "D", "A", "G", "D", "A", "Bm", "G", "A", "Bm", "G", "D", "F#", "Bm", "G", "Bm"]

# Thème de la boîte à musique : (mesure, temps, note, durée)
B4, Cs5, D5, E5, Fs5, G5, A5, B5, As4, Cs6, D6 = 71, 73, 74, 76, 78, 79, 81, 83, 70, 85, 86
THEME_A = [
    (0, 0, Fs5, 1.5), (0, 1.5, E5, 0.5), (0, 2, D5, 1),
    (1, 0, B4, 1), (1, 1, D5, 1), (1, 2, G5, 1),
    (2, 0, Fs5, 2), (2, 2, E5, 0.5), (2, 2.5, D5, 0.5),
    (3, 0, Cs5, 1.5), (3, 1.5, D5, 0.5), (3, 2, E5, 1),
]
THEME_B = [
    (0, 0, D5, 1), (0, 1, G5, 1), (0, 2, B5, 1),
    (1, 0, A5, 1.5), (1, 1.5, G5, 0.5), (1, 2, Fs5, 1),
    (2, 0, G5, 1), (2, 1, E5, 1), (2, 2, B4, 1),
    (3, 0, As4, 1.5), (3, 1.5, Cs5, 0.5), (3, 2, Fs5, 1),
]


def build_music():
    L = np.zeros((2, N))
    R = lambda: None  # noqa: E731 (placeholder pour la lisibilité)

    mbox = np.zeros(N)
    cel = np.zeros(N)
    pno = np.zeros(N)
    strings = np.zeros((2, N))
    cello = np.zeros(N)

    def theme(seq, bar0, octave=0, vel=1.0, target=None):
        target = mbox if target is None else target
        for b, beat, m, d in seq:
            t0 = (bar0 + b) * BAR + beat
            v = vel * (0.85 + 0.15 * np.cos(beat))
            note = music_box(m + 12 * octave, 2.6, v)
            i0 = int(t0 * SR)
            target[i0 : i0 + len(note)] += note[: N - i0]

    # S1 (mesures 0–4) : boîte à musique seule puis nappe
    theme(THEME_A, 0, vel=0.9)
    for b, beat, m, d in [(4, 0, D5, 3)]:
        note = music_box(m, 3.2, 0.8)
        place(mbox, note, (b * BAR + beat))
    place(mbox, music_box(B4, 3.2, 0.5), 4 * BAR + 1.5)
    # S2 (5–8) : thème B, violoncelle
    theme(THEME_B, 5, vel=0.85)
    # S3 (9–12) : thème A une octave au-dessus, très doux ; piano en ostinato
    theme(THEME_A, 9, octave=1, vel=0.45)
    # S4 (13–18) : arpèges de célesta, majeur et chaleureux
    for bar in range(13, 19):
        notes = CH[PROG[bar]]
        arp = [notes[2] + 12, notes[3] + 12, notes[4] + 12, notes[3] + 12, notes[2] + 24, notes[4] + 12]
        for j, m in enumerate(arp):
            place(cel, celesta(m, 2.0, 0.55 if j else 0.75), bar * BAR + j * 0.5)
    # S5 (19–22) : retour du thème, plein
    theme(THEME_A, 19, vel=1.0)
    theme(THEME_A, 19, octave=-1, vel=0.35)
    # S6 (23–25) : fragment final et dernière note suspendue
    for b, beat, m, d in [(23, 0, Fs5, 1.5), (23, 1.5, E5, 0.5), (23, 2, D5, 1), (24, 0, B4, 1), (24, 1, D5, 1), (24, 2, Fs5, 1.2)]:
        place(mbox, music_box(m, 3.0, 0.8), b * BAR + beat)
    place(mbox, music_box(B5, 5.5, 0.75), 25 * BAR + 0.6)
    place(mbox, music_box(Fs5, 5.5, 0.4), 25 * BAR + 1.4)
    place(mbox, music_box(D6, 5.5, 0.3), 25 * BAR + 2.2)

    # Nappes de cordes : entrent à la mesure 2
    for bar, name in enumerate(PROG):
        if bar < 2:
            continue
        notes = CH[name]
        dur = BAR + (2.5 if bar == len(PROG) - 1 else 0.15)
        lvl = 0.55 if bar < 5 else 0.8 if bar < 13 else 0.95 if bar < 19 else 1.15 if bar < 23 else 0.8
        for k, m in enumerate(notes[1:]):
            v = string_voice(m, dur, attack=1.6 if bar == 2 else 0.9, release=1.6, bright=1200 + 120 * k)
            p = [-0.55, -0.2, 0.25, 0.6][k]
            place(strings, pan(v * lvl, p), bar * BAR - (0.0 if bar == 2 else 0.25))
        # violoncelle / contrebasse sur la fondamentale à partir de S2
        if bar >= 5:
            v = string_voice(notes[0], dur, attack=1.0, release=1.8, bright=700, detune=(-4, 4))
            place(cello, v * (1.3 if bar >= 19 else 1.0), bar * BAR - 0.25)

    # Piano grave : S3 → S5
    for bar in range(9, 23):
        notes = CH[PROG[bar]]
        place(pno, piano(notes[0], 4.0, 0.7), bar * BAR)
        place(pno, piano(notes[2], 3.0, 0.45), bar * BAR + 1)
        place(pno, piano(notes[1] + 12, 3.0, 0.4), bar * BAR + 2)
    # dernier accord de piano
    for m, dt in [(35, 0), (47, 0.05), (54, 0.1), (62, 0.15)]:
        place(pno, piano(m, 6.0, 0.6), 25 * BAR + dt)

    L += pan(mbox, 0.18) * 1.0
    L += pan(cel, -0.15) * 0.9
    L += pan(pno, -0.05) * 1.0
    L += strings * 1.0
    L += pan(cello, 0.0) * 0.9

    hall = make_ir(3.8, 5200, 0.03, seed=11)
    L = reverb(L, hall, 0.42)

    # Fondu d'entrée et de sortie
    t = t_axis(N)
    fade = np.clip(t / 1.2, 0, 1) * np.clip((TOTAL - t) / 3.0, 0, 1)
    return L * fade


# ------------------------------------------------------------------ voix


def build_vo():
    room = make_ir(1.4, 6000, 0.012, seed=21)
    vo = np.zeros((2, N))
    spans = []
    for i, start in enumerate(VO_STARTS):
        x, sr = sf.read(VO_DIR / f"D_b{i + 1}.wav")
        assert sr == SR, sr
        if x.ndim > 1:
            x = x.mean(axis=1)
        x = highpass(x, 70, 2)
        x = shelf(x, 160, 4.0, "low")  # coffre
        x = peaking(x, 320, -1.5, 1.0)  # moins de carton
        x = peaking(x, 2400, 1.5, 1.2)  # présence
        x = shelf(x, 8500, -3.0, "high")  # adoucit les artefacts
        x = x / (np.abs(x).max() + 1e-9) * 0.8
        x = compress(x, -18, 2.6, 0.006, 0.18)
        place(vo, np.stack([x, x]), start)
        spans.append((start, start + len(x) / SR))
    vo = reverb(vo, room, 0.16)
    return vo, spans


# ------------------------------------------------------------------ ambiance


def build_ambience():
    amb = np.zeros((2, N))
    t = t_axis(N)
    # Vent : bruit brun filtré, modulé lentement, décorrélé gauche/droite
    for ch in range(2):
        w = np.cumsum(rng.standard_normal(N))
        w = highpass(w, 40, 1)
        w = bandpass(w, 120, 1400, 1)
        w /= np.abs(w).max() + 1e-9
        mod = 0.55 + 0.45 * np.sin(2 * np.pi * (0.07 + 0.02 * ch) * t + ch) * np.sin(2 * np.pi * 0.023 * t + 1.3)
        gust = bandpass(rng.standard_normal(N), 700, 2600, 1)
        gust /= np.abs(gust).max() + 1e-9
        gust *= np.clip(np.sin(2 * np.pi * 0.05 * t + ch * 2), 0, 1) ** 3
        amb[ch] += w * mod * 0.5 + gust * 0.08
    # niveau du vent par scène
    lvl = np.interp(t, [0, 2, 15, 17, 27, 29, 39, 41, 57, 59, 69, 71, 79], [0, 1, 1, 0.75, 0.75, 1.1, 1.1, 0.45, 0.45, 0.8, 0.8, 0.5, 0])
    amb *= lvl

    # Chute de l'étoile : montée scintillante + souffle grave à l'impact
    s0, s1 = STAR_FALL
    n = int((s1 - s0 + 2.5) * SR)
    tt = t_axis(n)
    riser = np.zeros(n)
    for k in range(7):
        f = 900 + 380 * k
        sweep = f * (1 + 0.6 * np.clip(tt / (s1 - s0), 0, 1))
        riser += np.sin(2 * np.pi * np.cumsum(sweep) / SR + k) / (k + 1.5)
    riser *= np.clip(tt / (s1 - s0), 0, 1) ** 2 * np.exp(-np.clip(tt - (s1 - s0), 0, None) / 0.5)
    shimmer = bandpass(rng.standard_normal(n), 4000, 11000, 1) * np.clip(tt / (s1 - s0), 0, 1) ** 3 * np.exp(-np.clip(tt - (s1 - s0), 0, None) / 0.8)
    place(amb, pan(riser * 0.025 + shimmer * 0.06, 0.2), s0)
    m = int(3.0 * SR)
    tm = t_axis(m)
    whoom = lowpass(rng.standard_normal(m), 220, 2) * (1 - np.exp(-tm / 0.05)) * np.exp(-tm / 0.9) * 0.9
    whoom += np.sin(2 * np.pi * 48 * tm) * np.exp(-tm / 1.0) * 0.12
    place(amb, pan(whoom, 0), s1 - 0.1)
    place(amb, pan(sparkle_gliss(88, 12, 0.05, 4) * 0.8, 0.3), s1 - 0.05)

    # Grelots du traîneau qui s'éloigne (fondu, filtrés vers le lointain)
    g0, g1 = SLEIGH
    j = bells_jingle(g1 - g0, 30, 5)
    tj = t_axis(len(j))
    j *= np.clip(tj / 0.8, 0, 1) * np.clip((g1 - g0 - tj) / 2.5, 0, 1)
    j = lowpass(j, 6000, 1)
    sweep_pan = np.linspace(0.6, -0.4, len(j))
    place(amb, np.stack([j * np.cos((sweep_pan + 1) * np.pi / 4), j * np.sin((sweep_pan + 1) * np.pi / 4)]), g0)

    # Pas dans la neige : cheval (4 temps) + cavalière, alternés
    k = 0
    tstep = WALK[0]
    while tstep < WALK[1]:
        fade = np.clip((tstep - WALK[0]) / 1.5, 0, 1) * np.clip((WALK[1] - tstep) / 1.5, 0, 1)
        place(amb, pan(snow_step(100 + k) * (0.9 + 0.2 * (k % 2)) * fade, -0.15 + 0.1 * (k % 2)), tstep)
        if k % 2 == 0:
            place(amb, pan(snow_step(500 + k) * 0.55 * fade, 0.2), tstep + STEP * 0.5 + 0.06)
        k += 1
        tstep += STEP

    # Scintillements des cadeaux
    for i, r0 in enumerate(REVEALS):
        place(amb, pan(sparkle_gliss(84 + 2 * i, 10, 0.04, 30 + i) * 0.9, [-0.3, 0.0, 0.3][i]), r0 - 0.15)
        shim = bandpass(rng.standard_normal(int(2.2 * SR)), 5000, 12000, 1)
        ts = t_axis(len(shim))
        shim *= np.minimum(1, ts / 0.3) * np.exp(-ts / 0.7) * 0.03
        place(amb, pan(shim, 0), r0 - 0.2)
    # Ouverture du sapin (intro S4) et carte finale
    place(amb, pan(bells_jingle(3.0, 18, 9) * np.exp(-t_axis(int(3.0 * SR)) / 1.2) * 0.6, -0.2), 41.3)
    place(amb, pan(sparkle_gliss(79, 12, 0.07, 77) * 0.9, 0), END_SWELL)
    sw = int(4.0 * SR)
    ts = t_axis(sw)
    swell = bandpass(rng.standard_normal(sw), 2500, 9000, 1) * (ts / 4.0) ** 2 * np.exp(-np.clip(ts - 2.8, 0, None) / 0.4) * 0.03
    place(amb, pan(swell, 0), END_SWELL - 2.6)

    small = make_ir(2.2, 7000, 0.02, seed=31)
    amb = reverb(amb, small, 0.25)
    fade = np.clip(t / 1.5, 0, 1) * np.clip((TOTAL - t) / 2.5, 0, 1)
    return amb * fade


# ------------------------------------------------------------------ mix


def duck_curve(spans, depth_db=-7.0, attack=0.35, release=0.8):
    t = t_axis(N)
    g = np.zeros(N)
    for s, e in spans:
        up = np.clip((t - (s - attack)) / attack, 0, 1)
        down = np.clip(((e + release) - t) / release, 0, 1)
        g = np.maximum(g, np.minimum(up, down))
    return 10 ** (depth_db * g / 20)


def loudness_normalize(x, target_lufs):
    import pyloudnorm as pyln

    meter = pyln.Meter(SR)
    lufs = meter.integrated_loudness(x.T)
    return x * 10 ** ((target_lufs - lufs) / 20), lufs


def main():
    vo, spans = build_vo()
    music = build_music()
    amb = build_ambience()

    music *= duck_curve(spans, -7.5)
    amb *= duck_curve(spans, -4.0)

    vo, l_vo = loudness_normalize(vo, -18.0)
    music, l_mu = loudness_normalize(music, -25.0)
    amb, l_am = loudness_normalize(amb, -31.5)

    mix = vo + music + amb
    peak = np.abs(mix).max()
    if peak > 0.89:
        g = 0.89 / peak
        vo, music, amb, mix = vo * g, music * g, amb * g, mix * g
    for name, x in [("voix-off", vo), ("musique", music), ("ambiance", amb), ("mix-reference", mix)]:
        sf.write(OUT / f"{name}.wav", x.T.astype(np.float32), SR, subtype="PCM_16")
    import pyloudnorm as pyln

    print("loudness in (vo, music, amb):", round(l_vo, 1), round(l_mu, 1), round(l_am, 1))
    print("mix LUFS:", round(pyln.Meter(SR).integrated_loudness(mix.T), 1), "peak:", round(float(np.abs(mix).max()), 3))
    print("vo spans:", [(round(s, 2), round(e, 2)) for s, e in spans])


if __name__ == "__main__":
    main()
