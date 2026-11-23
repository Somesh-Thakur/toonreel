# Agent instructions

This repository is an agent skill for making 3D and 2D cartoon reels (including "In this town…" style 3D story shorts). Read and follow [SKILL.md](SKILL.md) whenever the user asks for a reel, short, skit or captioned vertical video.

- Setup: `setup.ps1` (Windows) or `setup.sh` (macOS/Linux).
- Main command: `node tools/skit.mjs <spec.json> [--check | --draft | --still <frame>]`.
- Examples: `examples/*.json`.
