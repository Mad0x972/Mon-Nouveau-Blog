#!/usr/bin/env node
// duck.mjs — after carve.mjs: replace the carve's slow "level" lane on the music bed
// with a phrase-accurate duck (full level between voice lines, DUCK_DB under them),
// keeping the carve's spectral EQ lanes. Speech bounds come from silencedetect on
// each voice file, placed at its audio_cues.json start.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const dir = resolve(new URL("..", import.meta.url).pathname);
const DUCK_DB = -9;
const BED_VOLUME = 0.9;
const PRE = 0.25; // ramp down before speech
const POST = 0.5; // ramp up after speech
const MERGE_GAP = 0.9; // keep ducked through gaps shorter than this

const cues = JSON.parse(readFileSync(join(dir, "audio_cues.json"), "utf8"));
const speech = cues.voice.map((v) => {
  const text = spawnSync("ffmpeg", ["-v", "info", "-i", join(dir, v.file), "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const starts = [...text.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...text.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const dur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(dir, v.file)], { encoding: "utf8" });
  const s0 = starts.length && starts[0] < 0.01 && ends.length ? ends[0] : 0;
  const e0 = starts.length && starts[starts.length - 1] > s0 ? starts[starts.length - 1] : dur;
  return [v.start + s0, v.start + e0];
});
// merge close regions
const regions = [];
for (const r of speech) {
  const last = regions[regions.length - 1];
  if (last && r[0] - last[1] < MERGE_GAP) last[1] = Math.max(last[1], r[1]);
  else regions.push([...r]);
}
const r3 = (x) => Math.round(x * 1000) / 1000;
const points = [];
const push = (t, v) => { if (t < 0) t = 0; if (points.length && t <= points[points.length - 1].t) t = points[points.length - 1].t + 0.001; points.push({ t: r3(t), v }); };
push(0, regions.length && regions[0][0] - PRE <= 0 ? DUCK_DB : 0);
for (const [s, e] of regions) {
  push(s - PRE, points[points.length - 1].v === DUCK_DB ? DUCK_DB : 0);
  push(s, DUCK_DB);
  push(e, DUCK_DB);
  push(e + POST, 0);
}

let html = readFileSync(join(dir, "index.html"), "utf8");
const i = html.indexOf('id="el-bgm"');
const a = html.lastIndexOf("<audio", i), b = html.indexOf("</audio>", i);
let tag = html.slice(a, b);
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const chain = JSON.parse(unesc(tag.match(/data-fx-chain="([^"]*)"/)[1]));
const auto = JSON.parse(unesc(tag.match(/data-automation="([^"]*)"/)[1]));
const gainNode = chain.nodes.find((n) => n.type === "gain");
if (!gainNode) throw new Error("carve gain node not found on el-bgm");
const target = `fx.${gainNode.id}.gain`;
auto.lanes = auto.lanes.filter((l) => l.target !== target);
auto.lanes.push({ target, points });
tag = tag.replace(/data-automation="[^"]*"/, `data-automation="${esc(JSON.stringify(auto))}"`);
tag = tag.replace(/data-volume="[^"]*"/, `data-volume="${BED_VOLUME}"`);
html = html.slice(0, a) + tag + html.slice(b);
writeFileSync(join(dir, "index.html"), html);
console.log(`✓ duck: ${regions.length} voice regions, ${points.length} points on ${target}, bed volume ${BED_VOLUME}, duck ${DUCK_DB} dB`);
for (const [s, e] of regions) console.log(`  voix ${s.toFixed(2)}–${e.toFixed(2)}s`);
