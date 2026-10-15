#!/usr/bin/env node
// assemble.mjs — writes index.html for the Ohmnia PV promo (same shape as the
// product-launch assembler, so transitions.mjs inject / carve.mjs work on it),
// with the project's specifics: local GSAP (no CDN in this environment), two
// narration lines inside the merged chaos→bascule frame, host-made music bed
// and synthesized SFX placed at absolute times from audio_cues.json.
//
//   node tools/assemble.mjs            # all frames whose file exists
//   node tools/assemble.mjs --no-audio # visual preview only
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { parseStoryboard } from "../../../.claude/skills/product-launch-video/scripts/lib/storyboard.mjs";

const dir = resolve(new URL("..", import.meta.url).pathname);
const noAudio = process.argv.includes("--no-audio");
const W = 1920, H = 1080;

const manifest = parseStoryboard(readFileSync(join(dir, "STORYBOARD.md"), "utf8"));
let t = 0;
const frames = manifest.frames.map((f) => {
  const dur = parseFloat(f.duration);
  const id = f.src.split("/").pop().replace(/\.html?$/, "");
  const fr = { id, src: f.src, start: Math.round(t * 1000) / 1000, duration: dur };
  t += dur;
  return fr;
});
const TOTAL = Math.round(t * 1000) / 1000;

const probe = (rel) => {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(dir, rel)], { encoding: "utf8" });
    return Math.round(parseFloat(out) * 1000) / 1000;
  } catch {
    return null;
  }
};

const cues = JSON.parse(readFileSync(join(dir, "audio_cues.json"), "utf8"));
const body = [];
for (const f of frames) {
  if (!existsSync(join(dir, f.src))) {
    console.log(`  - ${f.id}: not built yet — skipped`);
    continue;
  }
  body.push(
    `      <div`,
    `        id="el-${f.id}"`,
    `        class="scene"`,
    `        data-composition-id="${f.id}"`,
    `        data-composition-src="${f.src}"`,
    `        data-start="${f.start}"`,
    `        data-duration="${f.duration}"`,
    `        data-track-index="1"`,
    `      ></div>`,
  );
}
body.push("");

const audioMeta = { voices: [], bgm: null, sfx: [] };
if (!noAudio) {
  body.push(`      <!-- voix off (Gemini TTS, Charon) -->`);
  cues.voice.forEach((v, i) => {
    const d = probe(v.file);
    if (d == null) throw new Error(`missing voice file ${v.file}`);
    body.push(
      `      <audio`,
      `        id="el-voice-${i + 1}"`,
      `        src="${v.file}"`,
      `        data-start="${v.start}"`,
      `        data-duration="${d}"`,
      `        data-track-index="10"`,
      `        data-volume="${v.volume ?? 1}"`,
      `        data-audio-group="voiceover"`,
      `      ></audio>`,
    );
    audioMeta.voices.push({ line: i + 1, path: v.file, start: v.start, duration_s: d });
  });
  body.push("", `      <!-- musique (synthèse originale, tools/sound.py) -->`);
  body.push(
    `      <audio`,
    `        id="el-bgm"`,
    `        src="${cues.music.file}"`,
    `        data-start="0"`,
    `        data-duration="${TOTAL}"`,
    `        data-track-index="11"`,
    `        data-volume="${cues.music.volume}"`,
    `      ></audio>`,
    "",
    `      <!-- bruitages -->`,
  );
  audioMeta.bgm = { path: cues.music.file, source: "host", volume: cues.music.volume };
  const laneEnds = []; // greedy lane allocation: overlapping cues never share a track
  cues.sfx.forEach((s, i) => {
    const d = probe(s.file);
    if (d == null) throw new Error(`missing sfx file ${s.file}`);
    let lane = laneEnds.findIndex((end) => end <= s.at - 0.001);
    if (lane < 0) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = s.at + d;
    body.push(
      `      <audio`,
      `        id="el-sfx-${i}"`,
      `        src="${s.file}"`,
      `        data-start="${s.at}"`,
      `        data-duration="${d}"`,
      `        data-track-index="${20 + lane}"`,
      `        data-volume="${s.volume ?? 0.4}"`,
      `      ></audio>`,
    );
    audioMeta.sfx.push({ file: s.file, at: s.at, duration_s: d, volume: s.volume ?? 0.4, source: "host" });
  });
}

const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        width: ${W}px;
        height: ${H}px;
        overflow: hidden;
        background: #000;
      }
      #root {
        position: relative;
        width: ${W}px;
        height: ${H}px;
        overflow: hidden;
        background: #F5F7FB;
      }
      .scene {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${TOTAL}"
      data-width="${W}"
      data-height="${H}"
    >
${body.join("\n")}
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
writeFileSync(join(dir, "index.html"), html);
if (!noAudio) writeFileSync(join(dir, "audio_meta.json"), JSON.stringify(audioMeta, null, 2) + "\n");
console.log(`✓ index.html — ${frames.length} frames planned, total ${TOTAL}s${noAudio ? " (no audio)" : `, ${audioMeta.voices.length} voix, ${audioMeta.sfx.length} sfx`}`);
