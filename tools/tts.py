"""Free voiceover.

Engines:
  edge    - Microsoft Edge neural voices (free, needs internet, great Hindi/English)
  kokoro  - fully offline (models/kokoro-v1.0.onnx), English + some Hindi voices

Usage:
  python tts.py "Text here" out/voice.mp3 --engine edge --voice hi-IN-MadhurNeural
  python tts.py script.txt out/voice.wav --engine kokoro --voice am_michael
  python tts.py --list-edge hi        # list edge voices for a language prefix

Good edge voices: hi-IN-MadhurNeural (male), hi-IN-SwaraNeural (female),
en-IN-PrabhatNeural, en-US-AndrewNeural, en-US-AvaNeural, en-GB-RyanNeural
Kokoro voices: am_michael, am_adam, af_heart, af_bella, bm_george, hm_omega, hf_alpha (Hindi)
"""
import argparse
import asyncio
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


async def edge(text, out, voice, rate, pitch, words_out=None, spoken=None):
    """Save audio; optionally also exact per-word timings (Remotion Caption[] JSON).

    `spoken` lets the voice read a slightly different string (e.g. softened punctuation)
    while captions keep the original `text`.
    """
    import json
    import edge_tts
    comm = edge_tts.Communicate(spoken or text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    caps = []
    with open(out, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                s = chunk["offset"] / 10_000  # 100ns ticks -> ms
                e = s + chunk["duration"] / 10_000
                caps.append({"text": " " + chunk["text"], "startMs": int(s), "endMs": int(e),
                             "timestampMs": int((s + e) / 2), "confidence": None})
    if words_out:
        # re-attach punctuation from the script so captions read naturally
        toks = text.split()
        ti = 0
        for c in caps:
            w = c["text"].strip()
            while ti < len(toks) and w.lower() not in toks[ti].lower():
                ti += 1
            if ti < len(toks):
                c["text"] = " " + toks[ti]
                ti += 1
        Path(words_out).write_text(json.dumps(caps, ensure_ascii=False, indent=1), encoding="utf-8")


async def list_edge(prefix):
    import edge_tts
    for v in await edge_tts.list_voices():
        if v["ShortName"].lower().startswith(prefix.lower()):
            print(v["ShortName"], v["Gender"])


def kokoro(text, out, voice, speed, lang):
    import soundfile as sf
    from kokoro_onnx import Kokoro
    k = Kokoro(str(HERE / "models/kokoro-v1.0.onnx"), str(HERE / "models/voices-v1.0.bin"))
    samples, sr = k.create(text, voice=voice, speed=speed, lang=lang)
    sf.write(str(out), samples, sr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("text", nargs="?")
    ap.add_argument("output", nargs="?")
    ap.add_argument("--engine", default="edge", choices=["edge", "kokoro"])
    ap.add_argument("--voice", default=None)
    ap.add_argument("--rate", default="+0%", help="edge: e.g. +10%%")
    ap.add_argument("--pitch", default="+0Hz", help="edge: e.g. -5Hz (deeper)")
    ap.add_argument("--speed", type=float, default=1.0, help="kokoro speed")
    ap.add_argument("--lang", default="en-us", help="kokoro: en-us, en-gb, hi")
    ap.add_argument("--list-edge", metavar="PREFIX")
    ap.add_argument("--words", help="edge: write exact word timings (captions JSON) here")
    a = ap.parse_args()

    if a.list_edge:
        asyncio.run(list_edge(a.list_edge))
        return
    if not a.text or not a.output:
        ap.error("text and output required")

    text = Path(a.text).read_text(encoding="utf-8") if a.text.endswith(".txt") and Path(a.text).exists() else a.text
    out = Path(a.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    if a.engine == "edge":
        # The free Edge voice service sometimes drops a request, and rejects a few sentences
        # outright (e.g. "Want one too? ..."). Retry, then retry with softened punctuation;
        # captions always keep the original text.
        import re
        import time
        soft = re.sub(r"[?]+", ".", text)
        softer = re.sub(r"[^\w\s,.'₹%-]", " ", text, flags=re.UNICODE)
        attempts = [None, None, soft, softer, softer]
        for n, spoken in enumerate(attempts):
            try:
                asyncio.run(edge(text, out, a.voice or "en-US-AndrewNeural", a.rate, a.pitch, a.words, spoken))
                if n:
                    print(f"tts ok after retry {n}{' (softened punctuation)' if spoken else ''}", file=sys.stderr)
                break
            except Exception as e:
                if n == len(attempts) - 1:
                    raise
                print(f"tts retry {n + 1}: {type(e).__name__}", file=sys.stderr)
                time.sleep(1.0 * (n + 1))
    else:
        kokoro(text, out, a.voice or "am_michael", a.speed, a.lang)
    print(f"saved {out}")


if __name__ == "__main__":
    sys.exit(main())
