"""Word-level captions with faster-whisper (free, offline).

Outputs Remotion `Caption[]` JSON (text/startMs/endMs/timestampMs/confidence)
plus an .srt next to it.

Usage:
  python transcribe.py input.mp4 out/captions.json [--model small] [--lang hi] [--device cpu|cuda]
"""
import argparse
import json
from pathlib import Path

from faster_whisper import WhisperModel


def srt_time(ms: int) -> str:
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def align_script(captions, script):
    """Map known script words onto Whisper's timeline.

    Equal word counts -> 1:1. Otherwise each script word gets a slice of the spoken
    time proportional to its length, walking through Whisper's word spans so pauses survive.
    """
    p = Path(script)
    text = p.read_text(encoding="utf-8") if script.endswith(".txt") and p.exists() else script
    words = text.split()
    if not captions or not words:
        return captions
    if len(words) == len(captions):
        return [{**c, "text": " " + w} for c, w in zip(captions, words)]

    # Build a "speech clock": concatenated spoken intervals (no silences).
    spans = [(c["startMs"], c["endMs"]) for c in captions]
    total_speech = sum(e - s for s, e in spans)
    weights = [len(w) + 1 for w in words]
    wsum = sum(weights)

    def at(speech_ms):  # speech-clock ms -> real ms
        acc = 0
        for s, e in spans:
            if acc + (e - s) >= speech_ms:
                return s + (speech_ms - acc)
            acc += e - s
        return spans[-1][1]

    out, acc = [], 0.0
    for w, wt in zip(words, weights):
        a = at(acc)
        acc += total_speech * wt / wsum
        b = at(acc)
        out.append({"text": " " + w, "startMs": int(a), "endMs": int(b),
                    "timestampMs": int((a + b) / 2), "confidence": None})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--model", default="small", help="tiny|base|small|medium|large-v3")
    ap.add_argument("--lang", default=None, help="en, hi, ... (auto if omitted)")
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--script", default=None,
                    help="known script text (or .txt path): keep Whisper timing, show these exact words "
                         "(e.g. Roman-script Hinglish instead of Devanagari)")
    args = ap.parse_args()

    compute = "int8" if args.device == "cpu" else "float16"
    model = WhisperModel(args.model, device=args.device, compute_type=compute)
    segments, info = model.transcribe(
        args.input, language=args.lang, word_timestamps=True, vad_filter=True
    )

    captions, srt = [], []
    for i, seg in enumerate(segments, 1):
        srt.append(f"{i}\n{srt_time(int(seg.start*1000))} --> {srt_time(int(seg.end*1000))}\n{seg.text.strip()}\n")
        for w in seg.words or []:
            captions.append({
                # Remotion convention: leading space marks a word boundary
                "text": w.word if w.word.startswith(" ") else " " + w.word,
                "startMs": int(w.start * 1000),
                "endMs": int(w.end * 1000),
                "timestampMs": int((w.start + w.end) / 2 * 1000),
                "confidence": round(w.probability, 3),
            })

    if args.script:
        captions = align_script(captions, args.script)

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(captions, ensure_ascii=False, indent=1), encoding="utf-8")
    out.with_suffix(".srt").write_text("\n".join(srt), encoding="utf-8")
    print(f"lang={info.language} words={len(captions)} -> {out}")


if __name__ == "__main__":
    main()
