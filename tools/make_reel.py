"""One-command reel builder. Everything free; renders 1080x1920 30fps H.264 for Instagram.

  # 1) 2D character narrates your script (voice + lip-sync + captions)
  python tools/make_reel.py character --name story01 \
      --script "Socho, ek chhoti si dukaan se bada brand kaise banta hai..." \
      --voice hi-IN-MadhurNeural --hook "Small shop, *big brand*" --scene sunset --hat cap

  # 2) Your own footage -> captions + hook + punch-ins (+ optional silence cut)
  python tools/make_reel.py captions --name vlog01 --video input/me.mp4 --cut-silence --lang hi

  # 3) AI clips (Flow / Kling / Hailuo / Dreamina free credits) -> cinematic story
  python tools/make_reel.py story --name zombie01 --clips input/c1.mp4 input/c2.mp4 input/c3.mp4 input/c4.mp4 \
      --grades zombie cold cold memory --transitions cut cut fade flash \
      --texts "Day 47" "" "" "Before." --music assets/music/piano.mp3 --letterbox 140

Add --preview to render only a 1-frame PNG check instead of the whole MP4.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
STUDIO = ROOT / "engine"
PUBLIC = STUDIO / "public"
OUT = ROOT / "output"
WORK = ROOT / "work"
PY = sys.executable


def run(cmd, **kw):
    print("»", " ".join(str(c) for c in cmd))
    subprocess.run([str(c) for c in cmd], check=True, **kw)


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def stage(src, name, sub=""):
    """Copy a file into studio/public/<name>/ and return its public-relative path."""
    dst_dir = PUBLIC / name / sub
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / Path(src).name
    if Path(src).resolve() != dst.resolve():
        shutil.copy2(src, dst)
    return dst.relative_to(PUBLIC).as_posix()


def render(comp, props, name, preview, frame=None):
    WORK.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)
    pfile = WORK / f"{name}.props.json"
    pfile.write_text(json.dumps(props, ensure_ascii=False, indent=1), encoding="utf-8")
    npx = "npx.cmd" if sys.platform == "win32" else "npx"
    if preview:
        out = OUT / f"{name}_preview.png"
        run([npx, "remotion", "still", "src/index.ts", comp, out, f"--props={pfile}",
             f"--frame={frame if frame is not None else 45}"], cwd=STUDIO)
    else:
        out = OUT / f"{name}.mp4"
        run([npx, "remotion", "render", "src/index.ts", comp, out, f"--props={pfile}"], cwd=STUDIO)
    print(f"\n✅ {out}")
    return out


def captions_for(audio_or_video, name, lang, script, model):
    cap = WORK / f"{name}.captions.json"
    cmd = [PY, TOOLS / "transcribe.py", audio_or_video, cap, "--model", model]
    if lang:
        cmd += ["--lang", lang]
    if script:
        cmd += ["--script", script]
    run(cmd)
    return json.loads(cap.read_text(encoding="utf-8"))


def cmd_character(a):
    script = Path(a.script).read_text(encoding="utf-8") if a.script.endswith(".txt") else a.script
    (PUBLIC / a.name).mkdir(parents=True, exist_ok=True)
    voice = PUBLIC / a.name / ("voice.wav" if a.engine == "kokoro" else "voice.mp3")
    tts = [PY, TOOLS / "tts.py", script, voice, "--engine", a.engine, "--rate", a.rate, "--pitch", a.pitch]
    if a.voice:
        tts += ["--voice", a.voice]
    run(tts)
    caps = captions_for(voice, a.name, a.lang, script, a.model)
    props = {
        "voice": voice.relative_to(PUBLIC).as_posix(),
        "captions": caps,
        "durationSec": round(duration(voice) + 0.6, 2),
        "scene": a.scene,
        "particles": a.particles,
        "look": {"hat": a.hat, "mustache": not a.no_mustache,
                 **({"outfit": a.outfit} if a.outfit else {}),
                 **({"skin": a.skin} if a.skin else {})},
    }
    if a.hook:
        props["hook"] = a.hook
    if a.music:
        props["music"] = stage(a.music, a.name)
        props["musicVolume"] = a.music_volume
    render("CharacterReel", props, a.name, a.preview)


def cmd_captions(a):
    src = Path(a.video)
    if a.cut_silence:
        cut = WORK / f"{a.name}_cut.mp4"
        run([PY, TOOLS / "cut_silence.py", src, cut])
        src = cut
    if a.reframe:
        vert = WORK / f"{a.name}_9x16.mp4"
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src, "-vf",
             "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", "-c:a", "copy", vert])
        src = vert
    caps = captions_for(src, a.name, a.lang, a.script, a.model)
    props = {
        "video": stage(src, a.name),
        "captions": caps,
        "durationSec": round(duration(src), 2),
        "punchEverySec": a.punch,
    }
    if a.hook:
        props["hook"] = a.hook
    if a.music:
        props["music"] = stage(a.music, a.name)
        props["musicVolume"] = a.music_volume
    render("CaptionedReel", props, a.name, a.preview)


def cmd_story(a):
    n = len(a.clips)
    pad = lambda lst, d: (lst or []) + [d] * (n - len(lst or []))
    grades, trans, texts = pad(a.grades, "none"), pad(a.transitions, "cut"), pad(a.texts, "")
    durs = pad(a.durations, None)
    clips = []
    for i, c in enumerate(a.clips):
        d = float(durs[i]) if durs[i] else round(duration(c) - 0.05, 2)
        clip = {"src": stage(c, a.name, "clips"), "durationSec": d, "grade": grades[i],
                "transition": trans[i], "push": a.push}
        if texts[i]:
            clip["text"] = texts[i]
        clips.append(clip)
    props = {"clips": clips, "durationSec": sum(c["durationSec"] for c in clips),
             "letterbox": a.letterbox, "particles": a.particles}
    if a.music:
        props["music"] = stage(a.music, a.name)
        props["musicVolume"] = a.music_volume
    render("StoryReel", props, a.name, a.preview)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="mode", required=True)

    def common(p):
        p.add_argument("--name", required=True)
        p.add_argument("--hook")
        p.add_argument("--music")
        p.add_argument("--music-volume", type=float, default=0.12)
        p.add_argument("--preview", action="store_true")

    c = sub.add_parser("character")
    common(c)
    c.add_argument("--script", required=True, help="text or .txt path")
    c.add_argument("--engine", default="edge", choices=["edge", "kokoro"])
    c.add_argument("--voice")
    c.add_argument("--rate", default="+5%")
    c.add_argument("--pitch", default="+0Hz")
    c.add_argument("--lang", default=None)
    c.add_argument("--model", default="small")
    c.add_argument("--scene", default="mountains", choices=["mountains", "night", "sunset", "plain"])
    c.add_argument("--particles", default="snow", choices=["snow", "ash", "none"])
    c.add_argument("--hat", default="helmet", choices=["helmet", "cap", "beret", "none"])
    c.add_argument("--outfit")
    c.add_argument("--skin")
    c.add_argument("--no-mustache", action="store_true")
    c.set_defaults(fn=cmd_character)

    v = sub.add_parser("captions")
    common(v)
    v.add_argument("--video", required=True)
    v.add_argument("--lang")
    v.add_argument("--script", help="exact words spoken (keeps Roman-script Hinglish)")
    v.add_argument("--model", default="small")
    v.add_argument("--cut-silence", action="store_true")
    v.add_argument("--reframe", action="store_true", help="center-crop landscape to 9:16 first")
    v.add_argument("--punch", type=float, default=3.0)
    v.set_defaults(fn=cmd_captions)

    s = sub.add_parser("story")
    common(s)
    s.add_argument("--clips", nargs="+", required=True)
    s.add_argument("--grades", nargs="*", help="none cold zombie war warm memory bw")
    s.add_argument("--transitions", nargs="*", help="cut fade flash (how each clip enters)")
    s.add_argument("--texts", nargs="*")
    s.add_argument("--durations", nargs="*", help="seconds per clip (default: full clip)")
    s.add_argument("--letterbox", type=int, default=0)
    s.add_argument("--particles", default="none", choices=["snow", "ash", "none"])
    s.add_argument("--push", action="store_true", help="slow push-in on every clip")
    s.set_defaults(fn=cmd_story, music_volume=0.8)

    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
