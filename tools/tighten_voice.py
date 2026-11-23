"""Shorten long pauses between words in a voiceover and shift captions to match.

Usage:
  python tighten_voice.py voice.mp3 captions.json out_voice.wav out_captions.json [--max-gap 0.3]
"""
import argparse
import json
import subprocess
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("voice")
    ap.add_argument("captions")
    ap.add_argument("out_voice")
    ap.add_argument("out_captions")
    ap.add_argument("--max-gap", type=float, default=0.3, help="seconds of silence to keep at most")
    ap.add_argument("--trim-edges", action="store_true", help="also cut silence before the first / after the last word")
    a = ap.parse_args()

    caps = json.loads(Path(a.captions).read_text(encoding="utf-8"))
    max_gap = int(a.max_gap * 1000)
    # segments of audio to keep, in ms
    keep, shift, out = [], 0, []
    seg_start = 0
    if a.trim_edges and caps:
        # drop silence before the first word (keep 60 ms of air)
        seg_start = max(0, caps[0]["startMs"] - 60)
        shift = seg_start
    for i, c in enumerate(caps):
        if i > 0:
            gap = c["startMs"] - caps[i - 1]["endMs"]
            if gap > max_gap:
                cut_from = caps[i - 1]["endMs"] + max_gap // 2
                cut_to = c["startMs"] - max_gap // 2
                keep.append((seg_start, cut_from))
                shift += cut_to - cut_from
                seg_start = cut_to
        out.append({**c, "startMs": c["startMs"] - shift, "endMs": c["endMs"] - shift,
                    "timestampMs": (c["timestampMs"] or c["startMs"]) - shift})
    # optionally drop silence after the last word (keep 150 ms tail)
    keep.append((seg_start, caps[-1]["endMs"] + 150 if a.trim_edges and caps else None))

    parts, labels = [], []
    for i, (s, e) in enumerate(keep):
        end = f":end={e/1000:.3f}" if e is not None else ""
        parts.append(f"[0:a]atrim=start={s/1000:.3f}{end},asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[a{i}]")
    fc = ";".join(parts) + f";{''.join(labels)}concat=n={len(keep)}:v=0:a=1[out]"
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", a.voice,
                    "-filter_complex", fc, "-map", "[out]", a.out_voice], check=True)
    Path(a.out_captions).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"removed {shift/1000:.2f}s of pauses -> {a.out_voice}")


if __name__ == "__main__":
    main()
