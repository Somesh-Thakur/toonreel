#!/usr/bin/env bash
# ToonReel setup (macOS / Linux). Needs: python3.10+, Node 18+, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"

for bin in python3 node npm ffmpeg; do
  command -v "$bin" >/dev/null || { echo "Missing: $bin. Install it first (ffmpeg: brew install ffmpeg / apt install ffmpeg)."; exit 1; }
done

echo "==> Python tools (.venv)"
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r requirements.txt

echo "==> Remotion engine (npm)"
( cd engine && npm install --no-audit --no-fund )

echo "==> Demo assets + sound effects"
.venv/bin/python tools/make_sfx.py

echo
echo "Done. Try:  node tools/skit.mjs examples/street-chef.json"
