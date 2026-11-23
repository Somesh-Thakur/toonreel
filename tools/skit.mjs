#!/usr/bin/env node
// ToonReel: render a skit spec (JSON) into a 1080x1920 MP4.
//
//   node tools/skit.mjs examples/cafe-rain.json            -> output/cafe-rain.mp4
//   node tools/skit.mjs my.json --still 120                -> one PNG frame (fast check)
//   node tools/skit.mjs my.json --check                    -> voice every line, print Whisper transcripts
//   node tools/skit.mjs my.json --draft                    -> 30% scale quick render
//
// Needs: Node 18+, ffmpeg on PATH, Python venv from setup (.venv) for edge-tts/whisper.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE = path.join(ROOT, "engine");
const IS_WIN = process.platform === "win32";
const PY =
  process.env.TOONREEL_PYTHON ||
  [path.join(ROOT, ".venv", IS_WIN ? "Scripts/python.exe" : "bin/python")].find((p) => fs.existsSync(p)) ||
  (IS_WIN ? "python" : "python3");
// call Remotion's CLI through node directly: no shell, so paths with spaces are safe on every OS
const REMOTION = path.join(ENGINE, "node_modules", "@remotion", "cli", "remotion-cli.js");
const remotion = (a) => run(process.execPath, [REMOTION, ...a], { cwd: ENGINE });

const { buildProps } = await import(pathToFileURL(path.join(ENGINE, "src/skit/core.js")).href);

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
if (!args[0] || args.includes("-h") || args.includes("--help")) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 9).join("\n").replace(/^\/\/ ?/gm, ""));
  process.exit(0);
}
const specPath = path.resolve(args[0]);
const flag = (f) => args.includes(f);
const opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const name = spec.name || path.basename(specPath, ".json");
const specDir = path.dirname(specPath);
const PUB = path.join(ENGINE, "public", name);
const TMP = path.join(ROOT, "work", name);
fs.mkdirSync(PUB, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const run = (cmd, a, o = {}) => {
  const r = spawnSync(cmd, a, { stdio: o.quiet ? "pipe" : "inherit", encoding: "utf8", ...o });
  if (r.status !== 0) throw new Error(`${cmd} ${a.join(" ")} failed\n${r.stderr || ""}`);
  return r.stdout;
};
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const cast = Object.fromEntries(spec.cast.map((c) => [c.id, c]));

// ---------------------------------------------------------------- --check
if (flag("--check")) {
  const lines = spec.beats
    .map((b, i) => b.say && { key: `b${i}_${b.say}`, text: b.text, voice: cast[b.say].voice, rate: cast[b.say].rate || "+0%", pitch: cast[b.say].pitch || "+0Hz" })
    .filter(Boolean);
  const lf = path.join(TMP, "lines.json");
  fs.writeFileSync(lf, JSON.stringify(lines, null, 1));
  run(PY, [path.join(ROOT, "tools/check_lines.py"), lf, "--out", path.join(TMP, "check")]);
  process.exit(0);
}

// ---------------------------------------------------------------- voices
const say = (key, text, voice, rate = "+0%", pitch = "+0Hz", words = true) => {
  const mp3 = path.join(TMP, `${key}.mp3`);
  const cj = path.join(TMP, `${key}.json`);
  const a = [path.join(ROOT, "tools/tts.py"), text, mp3, "--engine", "edge", "--voice", voice, `--rate=${rate}`, `--pitch=${pitch}`];
  if (words) a.push("--words", cj);
  run(PY, a, { quiet: true });
  const wav = path.join(TMP, `${key}.wav`);
  if (!words) {
    run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", mp3, wav]);
    return { wav, caps: [], dur: dur(wav) };
  }
  const tj = path.join(TMP, `${key}.t.json`);
  run(PY, [path.join(ROOT, "tools/tighten_voice.py"), mp3, cj, wav, tj, "--max-gap", "0.3", "--trim-edges"], { quiet: true });
  return { wav, caps: JSON.parse(fs.readFileSync(tj, "utf8")), dur: dur(wav) };
};

console.log(`ToonReel: ${name} (${spec.beats.length} beats)`);
const voiced = {};
spec.beats.forEach((b, i) => {
  if (!b.say) return;
  const c = cast[b.say];
  if (!c) throw new Error(`beat ${i}: unknown cast id "${b.say}"`);
  process.stdout.write(`  voicing ${b.say}: ${b.text.slice(0, 60)}\n`);
  voiced[i] = say(`b${i}`, b.text, c.voice, c.rate, c.pitch);
});

// ---------------------------------------------------------------- media: copy into engine/public/<name>/
const media = (p) => {
  if (!p) return p;
  const src = path.resolve(specDir, p);
  if (!fs.existsSync(src)) throw new Error(`media not found: ${p}`);
  const dst = path.join(PUB, path.basename(src));
  if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) fs.copyFileSync(src, dst);
  return `${name}/${path.basename(src)}`;
};
for (const b of spec.beats) {
  for (const sh of b.shots || (b.shot ? [b.shot] : [])) {
    if (sh.src) sh.src = media(sh.src);
    if (sh.image) sh.image = media(sh.image);
  }
  if (b.inset?.src) b.inset.src = media(b.inset.src);
}
if (spec.world_options?.interior) spec.world_options.interior = media(spec.world_options.interior);

const { props, crowdCues, slots, timeline } = buildProps(spec, voiced);

// ---------------------------------------------------------------- audio tracks
const mix = (clips, out, total) => {
  if (!clips.length) {
    run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", total.toFixed(3), out]);
    return;
  }
  const a = ["-y", "-hide_banner", "-loglevel", "error"];
  clips.forEach((c) => a.push("-i", c.wav));
  const parts = clips.map((c, i) => {
    const ms = Math.round(c.at * 1000);
    return `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${c.vol ?? 1},adelay=${ms}|${ms}[a${i}]`;
  });
  parts.push(`${clips.map((_, i) => `[a${i}]`).join("")}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)}[out]`);
  run("ffmpeg", [...a, "-filter_complex", parts.join(";"), "-map", "[out]", out]);
};
const T = props.durationSec;
const tracks = {};
for (const slot of ["broker", "girl", "uncle"]) {
  // each line starts where the shared timeline put it
  const clips = timeline.filter((b) => b.say && slots[b.say] === slot).map((b) => ({ wav: voiced[b.i].wav, at: b.from }));
  if (!clips.length) continue;
  mix(clips, path.join(PUB, `${slot}.wav`), T);
  tracks[slot] = `${name}/${slot}.wav`;
}
// crowd: short shouts from several voices at different pitches
if (crowdCues.length) {
  const cv = [["hi-IN-MadhurNeural", "+25Hz"], ["hi-IN-SwaraNeural", "+0Hz"], ["en-IN-PrabhatNeural", "-15Hz"], ["en-IN-NeerjaNeural", "+20Hz"], ["hi-IN-SwaraNeural", "+35Hz"]];
  const chatter = spec.crowd?.chatter || ["Kab hoga?", "Jaldi karo!", "Wow!", "Kya baat hai!", "Chalo chalo!"];
  const cheer = spec.crowd?.cheer || ["Yayyy!", "Woohoo!", "Wow!", "Yeahhh!", "Superb!"];
  const ch = chatter.slice(0, 5).map((tx, i) => say(`chat${i}`, tx, cv[i % 5][0], "+15%", cv[i % 5][1], false).wav);
  const cr = cheer.slice(0, 5).map((tx, i) => say(`cheer${i}`, tx, cv[i % 5][0], "+10%", cv[i % 5][1], false).wav);
  const clips = [];
  for (const c of crowdCues) (c.kind === "cheer" ? cr : ch).forEach((wav, i) => clips.push({ wav, at: c.atSec + i * (c.kind === "cheer" ? 0.1 : 0.32), vol: 0.45 }));
  mix(clips, path.join(PUB, "crowd.wav"), T);
  tracks.crowd = `${name}/crowd.wav`;
}
props.tracks = tracks;

const propsFile = path.join(PUB, "props.json");
fs.writeFileSync(propsFile, JSON.stringify(props, null, 1));
console.log(`  props -> ${path.relative(ROOT, propsFile)} (${T}s)`);

// ---------------------------------------------------------------- render
const outDir = path.resolve(opt("--out-dir", path.join(ROOT, "output")));
fs.mkdirSync(outDir, { recursive: true });
const rel = path.relative(ENGINE, propsFile);
if (flag("--still")) {
  const out = path.join(outDir, `${name}_still.png`);
  remotion(["still", "src/index.ts", "SkitReel", out, `--props=${rel}`, `--frame=${opt("--still", "60")}`]);
  console.log(`\n✔ ${out}`);
} else {
  const out = path.join(outDir, `${name}${flag("--draft") ? "_draft" : ""}.mp4`);
  const extra = flag("--draft") ? ["--scale=0.3"] : [];
  remotion(["render", "src/index.ts", "SkitReel", out, `--props=${rel}`, ...extra]);
  console.log(`\n✔ ${out}`);
}
