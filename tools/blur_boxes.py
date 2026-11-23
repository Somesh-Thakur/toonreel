"""Blur rectangular regions (faces, phone numbers, notices) in an image.

Usage:
  python blur_boxes.py in.jpg out.jpg x,y,w,h [x,y,w,h ...] [--radius 18]
"""
import argparse

from PIL import Image, ImageDraw, ImageFilter


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("boxes", nargs="*")
    ap.add_argument("--radius", type=int, default=18)
    a = ap.parse_args()
    img = Image.open(a.input).convert("RGB")
    for b in a.boxes:
        x, y, w, h = map(int, b.split(","))
        region = img.crop((x, y, x + w, y + h)).filter(ImageFilter.GaussianBlur(a.radius))
        # soft oval mask so it looks natural
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, w - 1, h - 1), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(max(2, min(w, h) // 8)))
        img.paste(region, (x, y), mask)
    img.save(a.output, quality=95)
    print(f"saved {a.output} ({len(a.boxes)} boxes)")


if __name__ == "__main__":
    main()
