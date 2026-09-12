from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

SRC = Path('src/assets/chibi/base-duck-approved-atlas.png')
DST = Path('src/assets/chibi/base-duck-remastered-atlas.png')
SRC_FRAME_W = 20
SRC_FRAME_H = 30
SCALE = 2
FRAME_W = SRC_FRAME_W * SCALE
FRAME_H = SRC_FRAME_H * SCALE
COLS = 30
ROWS = 4


def _remaster(frame: Image.Image) -> Image.Image:
    hi = frame.resize((FRAME_W, FRAME_H), Image.Resampling.LANCZOS).convert('RGBA')
    px = hi.load()
    for y in range(FRAME_H):
        t = y / max(1, FRAME_H - 1)
        body_gain = 1.045 - 0.085 * t
        for x in range(FRAME_W):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            # Warm dark-brown outline instead of flat black.
            if r < 135 and g < 125 and b < 110:
                px[x, y] = (max(8, int(r * .72)), max(6, int(g * .68)), max(5, int(b * .70)), a)
                continue
            # Cream/yellow feathers: top light, gentle lower-body shade.
            if r > 185 and g / max(1, r) > .70:
                rr = min(255, int(r * body_gain + 3))
                gg = min(255, int(g * body_gain + 3))
                bb = min(255, int(b * body_gain + 2))
                if t < .42:
                    rr, gg, bb = min(255, rr + 4), min(255, gg + 4), min(255, bb + 2)
                elif t > .68:
                    rr, gg, bb = int(rr * .97), int(gg * .95), int(bb * .93)
                px[x, y] = (rr, gg, bb, a)
            # Beak and feet: richer orange without changing authored shapes.
            elif r > 145 and g / max(1, r) < .74 and b < 150:
                px[x, y] = (min(255, int(r * 1.035 + 2)), min(255, int(g * .98 + 1)), min(255, int(b * .92)), a)

    alpha = hi.getchannel('A')
    dilated = alpha.filter(ImageFilter.MaxFilter(3))
    edge = ImageChops.subtract(dilated, alpha).point(lambda value: int(value * .34))
    outline = Image.new('RGBA', hi.size, (54, 36, 25, 0))
    outline.putalpha(edge)
    return Image.alpha_composite(outline, hi)


def main() -> None:
    src = Image.open(SRC).convert('RGBA')
    src.load()
    if src.size != (COLS * SRC_FRAME_W, ROWS * SRC_FRAME_H):
        raise SystemExit(f'Unexpected source atlas size: {src.size}')

    atlas = Image.new('RGBA', (COLS * FRAME_W, ROWS * FRAME_H), (0, 0, 0, 0))
    nonempty = 0
    for row in range(ROWS):
        for col in range(COLS):
            box = (
                col * SRC_FRAME_W,
                row * SRC_FRAME_H,
                (col + 1) * SRC_FRAME_W,
                (row + 1) * SRC_FRAME_H,
            )
            source_frame = src.crop(box)
            if source_frame.getchannel('A').getbbox():
                nonempty += 1
            atlas.alpha_composite(_remaster(source_frame), (col * FRAME_W, row * FRAME_H))

    if nonempty != COLS * ROWS:
        raise SystemExit(f'Expected {COLS * ROWS} non-empty frames, got {nonempty}')

    DST.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(DST, optimize=True)

    check = Image.open(DST).convert('RGBA')
    check.load()
    if check.size != (1200, 240):
        raise SystemExit(f'Unexpected remastered atlas size: {check.size}')
    for row in range(ROWS):
        for col in range(COLS):
            fr = check.crop((col * FRAME_W, row * FRAME_H, (col + 1) * FRAME_W, (row + 1) * FRAME_H))
            alpha = fr.getchannel('A')
            if not alpha.getbbox():
                raise SystemExit(f'Empty remastered frame {row}:{col}')
            opaque = sum(1 for value in alpha.getdata() if value > 0)
            if opaque >= FRAME_W * FRAME_H * .90:
                raise SystemExit(f'Frame {row}:{col} lost transparency')

    print(f'Remastered {COLS * ROWS} authored frames -> {DST} ({check.size[0]}x{check.size[1]})')


if __name__ == '__main__':
    main()
