"""Pronunciation check: voice every script line, then let Whisper transcribe it back.

Prints, per line: the script, a Hindi-script transcript (shows how Hindi words were said)
and an English transcript (shows how English words/numbers were said). Re-word any line
where a word comes back wrong, before building the reel.

Usage:
  python check_lines.py lines.json [--out work/check]
lines.json: [{"key": "c1", "text": "...", "voice": "hi-IN-MadhurNeural", "rate": "+18%", "pitch": "+0Hz"}, ...]
"""
import argparse
import asyncio
import json
from pathlib import Path

import edge_tts
from faster_whisper import WhisperModel


async def tts(text, voice, rate, pitch, out):
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(out))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lines")
    ap.add_argument("--out", default="work/check")
    ap.add_argument("--model", default="small")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    lines = json.loads(Path(a.lines).read_text(encoding="utf-8"))
    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    for ln in lines:
        mp3 = out / f"{ln['key']}.mp3"
        asyncio.run(tts(ln["text"], ln["voice"], ln.get("rate", "+0%"), ln.get("pitch", "+0Hz"), mp3))
        hi = " ".join(s.text.strip() for s in model.transcribe(str(mp3), language="hi")[0])
        en = " ".join(s.text.strip() for s in model.transcribe(str(mp3), language="en")[0])
        print(f"[{ln['key']}] {ln['voice']}\n  script: {ln['text']}\n  hi:     {hi}\n  en:     {en}\n")


if __name__ == "__main__":
    main()
