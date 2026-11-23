"""Jump-cut: remove silences / dead air from a talking clip using ffmpeg only.

Usage:
  python cut_silence.py input.mp4 output.mp4 [--noise -32dB] [--min 0.35] [--pad 0.08]
"""
import argparse
import re
import subprocess


def probe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True).stdout
    return float(out.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--noise", default="-32dB")
    ap.add_argument("--min", type=float, default=0.35, help="min silence length (s) to cut")
    ap.add_argument("--pad", type=float, default=0.08, help="keep this much air around speech")
    a = ap.parse_args()

    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", a.input, "-af",
                          f"silencedetect=noise={a.noise}:d={a.min}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    dur = probe_duration(a.input)

    keep, t = [], 0.0
    for s, e in zip(starts, ends + [dur] * (len(starts) - len(ends))):
        if s - t > 0.05:
            keep.append((max(0, t - a.pad), min(dur, s + a.pad)))
        t = e
    if dur - t > 0.05:
        keep.append((max(0, t - a.pad), dur))
    if not keep:
        raise SystemExit("nothing to keep")

    sel = "+".join(f"between(t,{s:.3f},{e:.3f})" for s, e in keep)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", a.input,
                    "-vf", f"select='{sel}',setpts=N/FRAME_RATE/TB",
                    "-af", f"aselect='{sel}',asetpts=N/SR/TB",
                    "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-c:a", "aac", a.output], check=True)
    kept = sum(e - s for s, e in keep)
    print(f"{len(keep)} segments kept, {dur:.1f}s -> {kept:.1f}s : {a.output}")


if __name__ == "__main__":
    main()
