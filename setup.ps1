# ToonReel setup (Windows PowerShell). Needs: Python 3.10+, Node 18+, ffmpeg (winget install Gyan.FFmpeg).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

foreach ($bin in "python", "node", "npm", "ffmpeg") {
  if (-not (Get-Command $bin -ErrorAction SilentlyContinue)) { throw "Missing: $bin. Install it first (ffmpeg: winget install Gyan.FFmpeg)." }
}

Write-Host "==> Python tools (.venv)"
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -q --upgrade pip
.\.venv\Scripts\python.exe -m pip install -q -r requirements.txt

Write-Host "==> Remotion engine (npm)"
Push-Location engine; npm install --no-audit --no-fund; Pop-Location

Write-Host "==> Demo assets + sound effects"
.\.venv\Scripts\python.exe tools\make_sfx.py

Write-Host ""
Write-Host "Done. Try:  node tools/skit.mjs examples/street-chef.json"
