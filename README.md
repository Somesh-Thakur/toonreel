<p align="center">
  <img src="assets/liar-town.gif" width="270" alt="ToonReel 3D demo: blocky toy characters in a town; a girl shrinks every time she lies" />
  <img src="assets/street-chef.gif" width="270" alt="ToonReel 2D demo: a chef at a crowded food cart in the rain, a presenter appears in a puff of smoke" />
</p>

<h1 align="center">ToonReel</h1>
<p align="center"><b>Write a skit. Get a 3D or 2D cartoon reel.</b><br/>
A free, open-source skill for AI agents (Claude Code, Codex, Gemini CLI, Cursor…) that turns a script into a 1080×1920 reel for Instagram, YouTube Shorts and TikTok.</p>

<p align="center">
  <a href="https://someshthakur.tech/toonreel/"><b>Try the studio in your browser →</b></a>
</p>

---

## What you get

- **3D story shorts** in the viral "In this town…" style: original blocky toy characters that walk, dance, shrink, grow, turn see-through and vanish, a narrator voice, and orbiting, low-angle and bird's-eye cameras. Three 3D sets (town street, classroom, bedroom), by day or night, with background people.
- **Original flat-2D characters** with lip-sync driven by the real voice: suits, chefs, kurtas, hoodies, caps, buns, glasses, cheering, jumping, pointing.
- **Free voices** in 400+ languages and accents (Microsoft Edge neural voices, or Kokoro offline). Hindi, Hinglish and Indian English sound great.
- **Five 2D sets:** street shop with a rolling shutter, food cart in the rain, game-show studio, railway station with a passing train, crowded living room.
- **Crowds** that chatter and cheer, comic speech bubbles, confetti, rain, a magic "poof" entrance, camera dives.
- **Your footage or photos** on a "live tour" screen, with stickers, price cards, game-show quiz boards and an end card.
- **Word-by-word captions**, coloured per speaker, kept out of the Instagram UI zones.
- **Pronunciation check:** every line is voiced and transcribed back with Whisper before rendering, so mangled words get caught.
- Also: captions + silence cuts for your own talking videos, and cinematic stories from AI clips.

No subscription, no watermark, runs on your computer.

## Install

You need **Python 3.10+**, **Node 18+** and **ffmpeg** (`winget install Gyan.FFmpeg`, `brew install ffmpeg`, `apt install ffmpeg`).

**Claude Code**
```bash
git clone https://github.com/Somesh-Thakur/toonreel ~/.claude/skills/toonreel
cd ~/.claude/skills/toonreel && bash setup.sh      # Windows: powershell -File setup.ps1
```
Then just ask: *"Make a 40-second cartoon reel where a chef finds a new restaurant space."*

**Any agent that supports skills**
```bash
npx skills add Somesh-Thakur/toonreel
```
Agents that read `AGENTS.md` (Codex and others) pick it up from the repo too.

**No agent**
```bash
node tools/skit.mjs examples/street-chef.json --check   # hear every line, check pronunciation
node tools/skit.mjs examples/street-chef.json --draft   # quick 30% render
node tools/skit.mjs examples/street-chef.json           # final MP4 in output/
```

## A skit is a JSON file

```json
{
  "name": "street-chef",
  "world": "cart",
  "cast": [
    { "id": "host", "voice": "en-US-AndrewNeural", "look": { "style": "suit", "glasses": true } },
    { "id": "chef", "voice": "en-GB-RyanNeural", "look": { "style": "chef", "hat": "chef" } }
  ],
  "beats": [
    { "say": "chef", "text": "So many customers, and now it's raining!", "scene": "closeup:chef", "rain": true },
    { "enter": "host", "scene": "wide", "rain": false, "crowd": "cheer" },
    { "say": "host", "text": "Relax, chef! I found you a real restaurant." },
    { "dive": 0.6 },
    { "say": "host", "text": "Five hundred square feet.", "scene": "tour", "shot": { "src": "tour.mp4", "trim": 12 }, "sticker": "500 sq ft" },
    { "say": "host", "text": "Follow for more!", "cta": { "line": "Follow us", "value": "@yourbrand" } }
  ]
}
```

For 3D, set `"world": "town"` (or `classroom`, `bedroom`) and use the same beats plus `move`, `face`, `size`, `exit` and cameras like `orbit`, `top` and `low:kid`:

```json
{ "say": "narrator", "text": "In this town, every time you lie, you shrink.", "scene": "orbit" },
{ "say": "mia", "text": "I finished my homework!", "scene": "closeup:mia", "size": { "mia": 0.7 } },
{ "move": { "dad": [4.6, 0.6] }, "walk": 2, "scene": "wide" }
```

Build one visually in the [web studio](https://someshthakur.tech/toonreel/) (live preview in the browser, 2D and 3D), then download it and render. The full format (quizzes, cards, bubbles, poses, insets, sound effects, 3D moves and cameras) is in [SKILL.md](SKILL.md). Four complete examples are in [`examples/`](examples).

## How it works

```
skit.json ──► edge-tts (one take per line, exact word timings) ──► pause trimming
          ──► engine/src/skit/core.js  (beats → timeline, scenes, captions, cards, crowd cues)
          ──► ffmpeg (per-character voice tracks + crowd + synthesized sound effects)
          ──► Remotion (React → 1080×1920 MP4; three.js via @remotion/three for 3D worlds)
```
The same `core.js` runs in the browser studio with estimated timings, so the preview matches the render.

```
engine/      Remotion project: characters, sets, captions, compositions (src/three = 3D cast and sets)
tools/       skit.mjs (main), tts.py, check_lines.py, make_reel.py, transcribe.py, cut_silence.py, …
examples/    ready-to-render skits
web/         the browser studio (Vite + @remotion/player), built into docs/
```

## Credits and licence

MIT © Somesh Thakur. You can use, change and share ToonReel freely, including in commercial work, as long as the copyright line and licence stay in every copy, so credit to the original project travels with it. Rendering uses [Remotion](https://remotion.dev), which is free for individuals and companies of up to 3 people (larger companies need a Remotion license). Voices via [edge-tts](https://github.com/rany2/edge-tts) or [Kokoro](https://github.com/thewh1teagle/kokoro-onnx); captions via [faster-whisper](https://github.com/SYSTRAN/faster-whisper). All characters and sets (2D and 3D) are original, built in code with no downloaded models; 3D uses [three.js](https://threejs.org) (MIT) and [React Three Fiber](https://github.com/pmndrs/react-three-fiber) (MIT).
