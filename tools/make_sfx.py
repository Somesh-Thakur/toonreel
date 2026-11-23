"""Generate every sound effect (pure ffmpeg synthesis, no downloads) + small demo assets.

Writes engine/public/sfx/*.wav and engine/public/demo/{voice.mp3, clip.mp4}.
Run once after install:  python tools/make_sfx.py
"""
import asyncio
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SFX = ROOT / "engine/public/sfx"
DEMO = ROOT / "engine/public/demo"

# name: (lavfi source, audio filter or None)
EFFECTS = {
    "whoosh": ("anoisesrc=d=0.5:c=pink:a=0.6", "highpass=f=300,lowpass=f=4000,afade=t=in:d=0.25,afade=t=out:st=0.25:d=0.25,volume=1.5"),
    "pop": ("aevalsrc=0.8*sin(2*PI*(400+1200*t)*t)*exp(-25*t):d=0.18", None),
    "shutter": ("anoisesrc=d=1.1:c=white:a=0.5", "bandpass=f=2500:w=1800,tremolo=f=24:d=0.9,afade=t=in:d=0.05,afade=t=out:st=0.8:d=0.3,volume=2.2"),
    "roar": ("anoisesrc=d=2.2:c=pink:a=0.5", "highpass=f=250,lowpass=f=3500,tremolo=f=7:d=0.5,afade=t=in:d=0.25,afade=t=out:st=1.2:d=1.0,volume=1.3"),
    "applause": ("anoisesrc=d=2.4:c=pink:a=0.6", "bandpass=f=2200:w=2600,tremolo=f=17:d=1,tremolo=f=11:d=0.6,afade=t=in:d=0.1,afade=t=out:st=1.4:d=1.0,volume=2.2"),
    "rain": ("anoisesrc=d=9:c=pink:a=0.35", "highpass=f=900,lowpass=f=7000,afade=t=in:d=0.8,afade=t=out:st=7.8:d=1.2"),
    "thunder": ("anoisesrc=d=2.2:c=brown:a=0.9", "lowpass=f=180,tremolo=f=6:d=0.6,afade=t=in:d=0.05,afade=t=out:st=0.6:d=1.6,volume=3"),
    "magic": ("aevalsrc=0.3*sin(2*PI*(880+880*t)*t)*exp(-3*t)+0.25*sin(2*PI*1320*t)*exp(-4*t)+0.2*sin(2*PI*1760*t)*exp(-5*t):d=1.2", None),
    "ding": ("aevalsrc=0.45*sin(2*PI*1046*t)*exp(-4*t)*lt(t\\,0.25)+0.45*sin(2*PI*1568*(t))*exp(-3*(t-0.18))*gte(t\\,0.18):d=1.2", None),
    "boom": ("aevalsrc=0.9*sin(2*PI*(90-40*t)*t)*exp(-2.5*t):d=1.2", None),
    "horn": ("aevalsrc=0.25*(sin(2*PI*311*t)+sin(2*PI*370*t)+0.5*sin(2*PI*622*t))*(1-exp(-12*t))*exp(-0.9*t):d=2.2", "afade=t=out:st=1.6:d=0.6"),
    "typing": ("anoisesrc=d=4:c=white:a=0.5", "highpass=f=2500,tremolo=f=14:d=1,tremolo=f=9:d=0.8,afade=t=in:d=0.2,afade=t=out:st=3.4:d=0.6,volume=1.2"),
    "cooker": ("aevalsrc=0.35*sin(2*PI*(1900+120*sin(2*PI*7*t))*t)*(1-exp(-6*t))*exp(-0.6*t):d=1.6", "afade=t=out:st=1.1:d=0.5"),
}


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *map(str, args)], check=True)


def main():
    SFX.mkdir(parents=True, exist_ok=True)
    DEMO.mkdir(parents=True, exist_ok=True)
    for name, (src, af) in EFFECTS.items():
        ff("-f", "lavfi", "-i", src, *(["-af", af] if af else []), SFX / f"{name}.wav")
    print(f"sfx: {len(EFFECTS)} effects -> {SFX}")

    # demo footage (a moving gradient) and a demo voice line
    ff("-f", "lavfi", "-i", "gradients=s=1080x1920:rate=30:speed=0.05", "-t", "4", "-pix_fmt", "yuv420p", "-c:v", "libx264", DEMO / "clip.mp4")
    try:
        import edge_tts

        asyncio.run(edge_tts.Communicate("Every reel needs a hook.", "en-US-AndrewNeural").save(str(DEMO / "voice.mp3")))
    except Exception as e:  # offline is fine: the demo voice is optional
        print("demo voice skipped:", e)
    print(f"demo assets -> {DEMO}")


if __name__ == "__main__":
    main()
