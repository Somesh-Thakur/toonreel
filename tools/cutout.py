"""Remove background from an image (character art, photo of a person) -> transparent PNG.

Usage:
  python cutout.py input.png output.png [--model isnet-anime|u2net_human_seg|birefnet-general-lite]
Tip: isnet-anime is best for 2D/cartoon characters, u2net_human_seg for people.
"""
import argparse

from PIL import Image
from rembg import new_session, remove


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--model", default="isnet-anime")
    a = ap.parse_args()
    out = remove(Image.open(a.input), session=new_session(a.model))
    out.save(a.output)
    print(f"saved {a.output}")


if __name__ == "__main__":
    main()
