---
name: toonreel
description: Make free 3D and 2D cartoon skit reels (Instagram Reels, YouTube Shorts, TikTok) from a script. Blocky 3D toy characters for "In this town…" story shorts (walking, dancing, shrinking, orbiting cameras) or original flat-2D characters, all with lip-sync, free neural voices (Hindi, English and 400+ others), word-by-word captions, crowds, speech bubbles, game-show quizzes, price cards and CTAs, plus captioned edits of your own footage. Use when the user asks to make, edit, caption or script a short vertical video, reel, short or animated skit.
---

# ToonReel — free 3D and 2D cartoon reels from a script

Everything runs locally and free: Remotion renders React → MP4 (three.js for the 3D worlds), Microsoft Edge neural voices (free, online) or Kokoro (offline) speak the lines, faster-whisper checks pronunciation and captions real footage, ffmpeg does the rest. Output is 1080×1920, 30 fps, H.264.

Paths below are relative to this skill's folder (`<skill>/`).

## 0. One-time setup (check first)

If `<skill>/.venv` or `<skill>/engine/node_modules` is missing, run setup (needs Python 3.10+, Node 18+, ffmpeg on PATH; ask before installing system packages):
- Windows: `powershell -ExecutionPolicy Bypass -File <skill>/setup.ps1`
- macOS/Linux: `bash <skill>/setup.sh`

## 1. Workflow for a skit reel (main use)

1. **Brief in one message:** what it promotes (or the story), language, length (35–50 s for skits, ≤40 s if YouTube Shorts matters), call-to-action text, any footage/photos to show.
2. **Pick a fresh idea** (see "Idea bank"), and write the script as beats. Hook at frame 0: a character speaking in the first second.
3. **Write the spec** `my-reel.json` (format below; copy `examples/*.json`). Put any footage paths relative to the JSON file.
4. **Pronunciation check:** `node <skill>/tools/skit.mjs my-reel.json --check` voices every line and prints Whisper's Hindi + English transcripts. Re-word any line that comes back wrong (see "Voice rules"), then check again.
5. **Draft:** `node <skill>/tools/skit.mjs my-reel.json --draft` (30% scale, fast). Look at frames: `ffmpeg -i output/<name>_draft.mp4 -vf "select='not(mod(n\,90))',scale=240:-1,tile=6x2" -frames:v 1 -update 1 sheet.png` and read the image. Fix overlaps/timing in the JSON.
6. **Render:** `node <skill>/tools/skit.mjs my-reel.json` → `<skill>/output/<name>.mp4`. QA duration + loudness (`ffmpeg -i X.mp4 -af volumedetect -f null -`).
7. Hand over the MP4 plus a caption, hashtags and title for each platform. Trending music is added inside the app, never baked in.

## 2. Skit spec format

```jsonc
{
  "name": "my-reel",                     // output file name
  "world": "town",                        // 3D: town | classroom | bedroom   2D: home | station | cart | studio | shop
  "world_options": {                      // all optional
    "board": "STATION", "boardLocal": "स्टेशन", "banner": "OPEN",   // station
    "cartLabel": "BURGERS",                                          // cart
    "sign": "QUIZ TIME!", "signSub": "Episode 1",                    // studio
    "shopSign1": "OFFICE SPACE", "shopSign2": "CITY", "interior": "photo.jpg", // shop (rolling shutter)
    "night": true, "extras": 4               // 3D: night lighting; number of background people
  },                                        // 3D also: "sign" (town shop), "board" (classroom, \n = new line), "poster" (bedroom)
  "hook": { "text": "Work from home… *with 18 people?!*" },   // *word* = yellow accent
  "tour": { "layout": "tall" },           // tall (vertical footage) | photo (4:3) | wide (16:9)
  "cast": [                               // up to 3 drawn characters, plus any number of narrators
    { "id": "host", "voice": "hi-IN-MadhurNeural", "rate": "+18%", "pitch": "+0Hz", "color": "#FFD400",
      "look": { "style": "suit", "hat": "none", "glasses": true, "mustache": false, "outfit": "#1F3A5F", "tie": "#E53935" } },
    { "id": "narrator", "narrator": true, "voice": "en-US-ChristopherNeural" },  // voice + captions, never drawn
    { "id": "kid", "voice": "en-US-AnaNeural", "pos": [3.2, 0], "look": { "style": "hoodie" } }  // 3D: start spot [x, z]
  ],
  "crowd": { "chatter": ["Kab khulega?"], "cheer": ["Yayyy!"] },   // optional crowd shouts
  "beats": [ /* see below */ ],
  "end_hold": 2.4                         // seconds to hold the last frame
}
```

**Beats** play in order. One action per beat; extras apply for that beat:

| Key | Meaning |
|---|---|
| `say` + `text` | cast id speaks the line (captions coloured per speaker) |
| `pause: 1.2` | silence (let a gag land, crowd chant, suspense) |
| `enter: "host"` | presenter appears in a magic poof (+ sparkle sound); in 3D any character can enter |
| `exit: "kid"` | 3D: character vanishes in a poof |
| `shutter: 1.0` | shop world: rolling shutter opens |
| `dive: 0.6` | camera dives in, white flash → next scene |
| `scene` | `wide` · `close` · `closeup:<id>` · `tour` (screen with footage) · `cta` — carries forward. 3D adds `orbit` (camera circles the cast), `top` (bird's-eye), `low` (worm's-eye), and `close:<id>` / `low:<id>` / `orbit:<id>` to centre one character |
| `shot` / `shots` | tour screen content, split across the beat: `{ "src": "clip.mp4", "trim": 12.5 }`, `{ "image": "p.jpg", "pan": [0, -38] }`, `{ "title": "500 sq ft", "bg": "#00897B" }` |
| `sticker` | chip on screen: `"Lift + stairs"` or `{ "text": "550 sq ft", "icon": "area" }` (icons: pin, area) |
| `card` | big yellow card `{ "title": "RENT", "value": "₹65,000", "unit": "per month", "sub": "Deposit: 4 months" }`; stays until the next card/CTA; `card: null` hides it |
| `quiz` | game-show board `{ "question", "options": [4], "answer": 2 }`; later beats `lock: true` (orange + boom) and `reveal: true` (green + ding) |
| `cta` | end card `{ "line": "Call / WhatsApp", "value": "98xxx xxxxx", "footer": "…" }` |
| `pose` | `{ "<id>": { "armAngle": -145 } }` point up-right · `-95` point right · `-165` raise hand · `leftArmAngle: 95` point left · `cheer: true` · `jump: 40`. 3D adds `dance`, `wave`, `point`, `shock`, `sad` (tears), `angry`, `spin`, `sit`, `lie`, `sleep`, `ghost: 0.3` (see-through), `size: 2` (this beat only) |
| `move` | 3D: `{ "kid": [x, z] }` walks there over the beat (`"walk": 1.6` sets the seconds on a beat with no line); `{ "kid": { "to": [x, z], "run": true } }` runs. x ≈ −8…8 (left/right), z ≈ −4…4 (back/front) |
| `face` | 3D: `{ "mom": "kid" }` turns toward another character (three-quarters, never fully away from the camera); `"camera"`, `"left"`, `"right"`, `"back"` — carries forward |
| `size` | 3D: `{ "kid": 0.5 }` shrinks (or grows) with a bouncy spring and a sound; carries forward until changed |
| `crowd` | `calm` · `excited` (bouncing + chatter) · `cheer` (arms up + shouts) — carries forward |
| `rain` | `true` / `false` — carries forward |
| `bubbles` | `[{ "text", "x", "y", "tail": "right", "color", "delay" }]` comic speech bubbles |
| `inset` | pop-up proof video `{ "src", "trim", "x", "y", "w", "h", "label": "LIFT ✓" }` |
| `confetti`, `sfx` | `true`; `["ding", "boom", "thunder", "rain", "typing", "cooker", "horn", "applause", "magic", "pop", "whoosh", "shutter", "roar", "shrink", "grow", "boing", "laugh"]` |
| `captions: false` | hide captions for this beat (e.g. while a phone number is read out; show it on the CTA card) |

**Looks** (`look`, same keys in 2D and 3D): `style` uniform | suit | kurti | chef | hoodie · `hat` none | cap | beret | helmet | chef · `hairStyle` short | long | bun · `female` · `glasses` · `mustache` · colours `skin`, `hair`, `outfit`, `outfitDark`, `tie`, `hatColor`, `lips`; 3D also `pants`, `shoes`.

### 3D story shorts ("In this town…")

The 3D worlds draw original blocky toy characters (rounded blocks, ink outlines, big cartoon eyes) in a low-poly set, rendered with three.js on your GPU (`--gl=angle` is passed automatically; on a machine with no GPU pass `--gl swangle`). The format that is going viral on Shorts and TikTok:

1. **Rule** (narrator, frame 0, over an `orbit` shot): "In this town, every time you lie, you shrink." The hook text repeats it in ≤ 6 words.
2. **Temptation**: a character is pushed to break the rule within 5 seconds.
3. **Consequence, escalating** 2–3 times. Show it physically: `size`, `ghost`, `spin`, `lie`, `exit`. Cut between `closeup:<id>`, `low:<id>` and `top` so every 2–4 s the picture changes.
4. **Twist**: the reveal, a rule reversal or a deadpan narrator line ("She was not far away.").
5. **Loop or CTA**: the last line sets up the next episode; the narrator asks to follow.

Keep it 30–45 s, one rule per episode, a recurring cast (series get binged), the narrator in a calm deep voice (`en-US-ChristopherNeural`, `en-US-GuyNeural`, `hi-IN-MadhurNeural`) and the characters in brighter ones. Stories, characters and voices must be your own; don't copy another channel's characters or a game's branding. Examples: `examples/liar-town.json`, `examples/mind-reader-class.json`.

## 3. Voice rules (learned the hard way)

- Free voices: `hi-IN-MadhurNeural` (M), `hi-IN-SwaraNeural` (F), `en-IN-PrabhatNeural`, `en-IN-NeerjaNeural`, `en-US-AndrewNeural`, `en-US-AvaNeural`, `en-GB-RyanNeural`… list: `python tools/tts.py --list-edge en-` (any locale prefix).
- Same voice, different person: change `pitch` (−18Hz older, +12Hz younger) and `rate`.
- **Numbers, prices, sizes in English words** for Hinglish scripts ("seventy five thousand", "five twenty nine square feet") — Hindi voices read English words in English, which sounds pro.
- **If a Hindi word gets mangled, swap in the English word people actually say** ("40 seater office", not "40 logon ka office"; "Final answer!", not "Lock kar dijiye" which is heard as "log"). The `--check` step catches these.
- en-IN voices read some Hindi words the English way ("mere" → "meer"). Give them English-heavy lines.
- Place names may lose sounds at sentence start ("Hadapsar" → "Adapsar"); put another word first ("Location hai, Hadapsar…").
- The Edge service occasionally rejects a sentence (e.g. "Want one too?"); `tts.py` retries with softened punctuation automatically, captions keep the original text.

## 4. Other formats

```bash
# 2D narrator (one character talks to camera with lip-sync + captions)
python tools/make_reel.py character --name n1 --script "..." --voice en-US-AndrewNeural --hook "..." --scene sunset --hat cap

# your own footage -> word-by-word captions, silence cut, punch-in zooms, hook
python tools/make_reel.py captions --name v1 --video my.mp4 --cut-silence [--reframe] [--lang hi] [--script "exact words"]

# AI clips (Veo / Kling / Hailuo / Seedance free credits) -> cinematic story with colour grades
python tools/make_reel.py story --name s1 --clips a.mp4 b.mp4 c.mp4 --grades cold cold memory --transitions cut fade flash --texts "Day 1" "" "Before."
```
Live preview / custom code: `cd engine && npx remotion studio` (compositions: SkitReel, CharacterReel, CaptionedReel, StoryReel, ShowcaseReel, Mascot).

Helpers: `tools/cut_silence.py`, `tools/transcribe.py` (Whisper captions; `--script` keeps exact Roman-script words), `tools/tighten_voice.py`, `tools/blur_boxes.py` (blur faces/notices before publishing photos), `tools/cutout.py` (background removal, needs rembg).

## 5. Idea bank (rotate — never repeat the last idea)

3D rules: in this town your shadow tells the truth · lying shrinks you · whoever yawns first turns invisible · homework does itself if you sleep · the teacher hears thoughts · everyone has the same birthday except one kid · the floor is lava on Mondays. 2D: crowd waiting at a shutter → presenter steps out · Street vendor mobbed in the rain → magic rescue · Game show quiz with lock/reveal · Sceptical uncle vs Gen-Z with proof pop-ups · Work-from-home chaos, mom fed up · Bidding war between two buyers · Reporter interviews the product/place · Detective finds clues = features · Delivery boy delivers the keys · Countdown "gone in 3 days" · Mom & son excuses.

## 6. Quality rules

- Speaking character in frame 0; hook text ≤ 6 words with one `*accent*`.
- Keep text out of Instagram's UI zones (top ~220 px, bottom ~420 px, right ~140 px).
- Never let a footage shot run past the clean part of the clip (shaky/blurred tail, people's faces you can't show, other people's phone numbers).
- Blur faces of bystanders and private notices in photos before they go in a reel.
- Write files with ₹ … · ✓ via an editor or Python (UTF-8). Windows PowerShell 5.1 `Get-Content/Set-Content` corrupts them ("₹" → "â‚¹").
- Remotion's `<Video>` needs the `objectFit="cover"` **prop** (CSS objectFit is ignored).
- 3D: never animate with `useFrame`/clocks; everything is derived from the frame number so renders are identical. Check a few stills (`--still <frame>`) before a full render: a full 3D render takes a few minutes on a laptop GPU.
- Remotion fills props you leave out from the composition's defaults (the demo skit). `buildProps` sets every key explicitly; keep it that way if you add new ones.
