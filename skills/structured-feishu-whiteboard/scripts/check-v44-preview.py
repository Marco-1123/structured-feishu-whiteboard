#!/usr/bin/env python3
import sys
from pathlib import Path

from PIL import Image


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


if len(sys.argv) < 2:
    fail("usage: python3 scripts/check-v44-preview.py preview.png [preview.png ...]")

for raw_path in sys.argv[1:]:
    path = Path(raw_path)
    if not path.exists() or path.stat().st_size == 0:
        fail(f"missing or empty preview: {path}")
    with Image.open(path) as source:
        image = source.convert("RGB")
        if image.width < 500 or image.height < 300:
            fail(f"preview is too small: {path} ({image.width}x{image.height})")
        image.thumbnail((900, 900))
        pixels = list(image.getdata())
    total = max(1, len(pixels))
    near_black = sum(1 for r, g, b in pixels if r < 24 and g < 24 and b < 24) / total
    non_background = sum(1 for r, g, b in pixels if min(r, g, b) < 238) / total
    if near_black > 0.08:
        fail(f"preview contains an abnormal near-black area: {path} ({near_black:.2%})")
    if non_background < 0.01:
        fail(f"preview appears blank: {path} ({non_background:.2%} non-background pixels)")
    print(f"ok: {path} black={near_black:.2%} content={non_background:.2%}")
