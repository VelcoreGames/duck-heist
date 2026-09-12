from pathlib import Path
from math import sin, cos, pi
from PIL import Image, ImageEnhance, ImageDraw

SRC = Path('src/assets/chibi/base-duck-final-atlas.png')
DST = Path('src/assets/chibi/base-duck-definitive-atlas.png')
CELL = 52
SRC_COLS = 20
SRC_ROWS = 4
OUT_COLS = 76
OUT_ROWS = 8
PIVOT = (26, 47)

DIRS = ['down', 'left', 'right', 'up']
DIR_VEC = {
    'down': (0, 1),
    'left': (-1, 0),
    'right': (1, 0),
    'up': (0, -1),
}

STATE = {
    'idle':     {'bank': 0, 'start': 0,  'count': 16},
    'walk':     {'bank': 0, 'start': 16, 'count': 24},
    'shoot':    {'bank': 0, 'start': 40, 'count': 16},
    'dash':     {'bank': 0, 'start': 56, 'count': 20},
    'hurt':     {'bank': 1, 'start': 0,  'count': 12},
    'down':     {'bank': 1, 'start': 12, 'count': 20},
    'interact': {'bank': 1, 'start': 32, 'count': 16},
}

SRC_STATE_START = {'idle': 0, 'walk': 4, 'shoot': 10, 'interact': 14}
SRC_STATE_COUNT = {'idle': 4, 'walk': 6, 'shoot': 4, 'interact': 6}

IDLE_SEQ = [0,0,1,1,2,2,3,3,3,2,2,1,1,0,0,0]
WALK_SEQ = [0,0,1,1,2,2,3,3,4,4,5,5,5,4,4,3,3,2,2,1,1,0,0,0]
SHOOT_SEQ = [0,0,1,1,2,2,3,3,3,2,2,1,1,0,0,0]
INTERACT_SEQ = [0,1,1,2,2,3,4,5,5,5,4,3,2,1,0,0]
DASH_SEQ = [0,1,1,2,2,3,3,4,5,5,5,4,3,2,1,1,0,0,1,0]
HURT_SEQ = [3,3,2,2,2,1,1,1,0,0,0,0]
DOWN_SEQ = [2,2,2,2,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0]


def crop_source(sheet: Image.Image, direction: str, state: str, index: int) -> Image.Image:
    row = DIRS.index(direction)
    col = SRC_STATE_START[state] + (index % SRC_STATE_COUNT[state])
    return sheet.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL)).convert('RGBA')


def transform_about_pivot(img: Image.Image, sx=1.0, sy=1.0, angle=0.0, dx=0, dy=0) -> Image.Image:
    nw = max(1, round(CELL * sx))
    nh = max(1, round(CELL * sy))
    resized = img.resize((nw, nh), Image.Resampling.NEAREST)
    px = PIVOT[0] * sx
    py = PIVOT[1] * sy
    if abs(angle) > 0.001:
        resized = resized.rotate(angle, resample=Image.Resampling.NEAREST, center=(px, py), expand=False)
    out = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ox = round(PIVOT[0] + dx - px)
    oy = round(PIVOT[1] + dy - py)
    out.alpha_composite(resized, (ox, oy))
    return out


def tint_alpha(img: Image.Image, rgb, strength: float) -> Image.Image:
    strength = max(0.0, min(1.0, strength))
    tint = Image.new('RGBA', img.size, (*rgb, 0))
    a = img.getchannel('A').point(lambda v: round(v * strength))
    tint.putalpha(a)
    return Image.alpha_composite(img, tint)


def ghost(img: Image.Image, offset, alpha=0.22, warm=True) -> Image.Image:
    g = img.copy()
    if warm:
        g = tint_alpha(g, (255, 214, 96), 0.16)
    a = g.getchannel('A').point(lambda v: round(v * alpha))
    g.putalpha(a)
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    layer.alpha_composite(g, offset)
    layer.alpha_composite(img)
    return layer


def sparkles(img: Image.Image, phase: int) -> Image.Image:
    out = img.copy()
    d = ImageDraw.Draw(out)
    pts = [(5, 12), (44, 16), (8, 31), (42, 34)]
    for i, (x, y) in enumerate(pts):
        if (phase + i) % 4 == 0:
            c = (255, 237, 161, 190)
            d.point((x, y), fill=c)
            if x + 1 < CELL: d.point((x + 1, y), fill=c)
            if y + 1 < CELL: d.point((x, y + 1), fill=c)
    return out


def bake_frame(sheet: Image.Image, direction: str, state: str, i: int) -> Image.Image:
    vx, vy = DIR_VEC[direction]

    if state == 'idle':
        src = crop_source(sheet, direction, 'idle', IDLE_SEQ[i])
        phase = i / 16 * 2 * pi
        breath = sin(phase)
        sway = sin(phase * 0.5)
        dy = -1 if 4 <= i <= 7 else 0
        dx = 1 if sway > .92 else -1 if sway < -.92 else 0
        return transform_about_pivot(src, 1 + breath*.012, 1 - breath*.014, -sway*.35, dx, dy)

    if state == 'walk':
        src = crop_source(sheet, direction, 'walk', WALK_SEQ[i])
        phase = i / 24 * 2 * pi
        stride = sin(phase)
        lift = abs(sin(phase * 2))
        side = cos(phase)
        dx = round(side * .65) if direction in ('left', 'right') else 0
        dy = -round(lift * 1.35)
        ang = (-1 if direction == 'left' else 1) * stride * 1.35
        return transform_about_pivot(src, 1 + lift*.018, 1 - lift*.020, ang, dx, dy)

    if state == 'shoot':
        src = crop_source(sheet, direction, 'shoot', SHOOT_SEQ[i])
        recoil_curve = [0,0,1,2,4,5,4,3,2,1,1,0,0,0,0,0]
        recoil = recoil_curve[i]
        dx = -vx * recoil
        dy = -vy * recoil - (1 if i in (3,4) else 0)
        ang = (1 if direction == 'left' else -1) * (1.25 if 4 <= i <= 7 else 0)
        out = transform_about_pivot(src, 1 + recoil*.008, 1 - recoil*.006, ang, dx, dy)
        if i in (4,5): out = tint_alpha(out, (255, 247, 205), .08 if i == 5 else .12)
        return out

    if state == 'dash':
        src = crop_source(sheet, direction, 'walk', DASH_SEQ[i])
        t = i / 19
        launch = sin(min(1.0, t * 1.25) * pi)
        anticipation = max(0.0, (3-i)/3) if i < 3 else 0.0
        along = .105*launch - .035*anticipation
        across = -.060*launch + .020*anticipation
        if direction in ('left','right'):
            sx, sy = 1+along, 1+across
        else:
            sx, sy = 1+across, 1+along
        dx = round(vx * launch * 2)
        dy = round(vy * launch * 2 - launch)
        ang = (-1.4 if direction == 'left' else 1.4 if direction == 'right' else 0) * launch
        core = transform_about_pivot(src, sx, sy, ang, dx, dy)
        if launch > .15:
            trail = (-vx * (2 + round(launch*3)), -vy * (2 + round(launch*3)))
            core = ghost(core, trail, .14 + launch*.09, True)
        return core

    if state == 'hurt':
        src = crop_source(sheet, direction, 'idle', HURT_SEQ[i])
        t = i / 11
        knock = round((1-t)*3)
        dx = -vx*knock + (-1 if i % 2 == 0 else 1)
        dy = -vy*knock - (1 if i < 3 else 0)
        ang = (-1 if i % 2 == 0 else 1) * (1-t) * 3.4
        out = transform_about_pivot(src, 1.05-t*.04, .95+t*.04, ang, dx, dy)
        if i < 7: out = tint_alpha(out, (255, 238, 225), max(.04, .20-i*.025))
        return out

    if state == 'down':
        src = crop_source(sheet, direction, 'idle', DOWN_SEQ[i])
        t = i / 19
        eased = 1 - (1-t)**2.2
        sign = -1 if direction == 'left' else 1
        angle = sign * eased * 70
        sx = 1 + sin(t*pi)*.08 + t*.08
        sy = 1 - eased*.20
        dx = (-round(eased*2) if direction == 'left' else round(eased*2) if direction == 'right' else 0)
        dy = round(eased*6)
        return transform_about_pivot(src, sx, sy, angle, dx, dy)

    if state == 'interact':
        src = crop_source(sheet, direction, 'interact', INTERACT_SEQ[i])
        phase = i / 15 * pi
        lift = sin(phase)
        dy = -round(lift*3)
        angle = sin(phase*2) * .9
        out = transform_about_pivot(src, 1-lift*.025, 1+lift*.035, angle, 0, dy)
        return sparkles(out, i)

    raise ValueError(state)


def main():
    sheet = Image.open(SRC).convert('RGBA')
    if sheet.size != (1040, 208):
        raise SystemExit(f'Unexpected V5 source atlas size: {sheet.size}')

    out = Image.new('RGBA', (OUT_COLS*CELL, OUT_ROWS*CELL), (0,0,0,0))
    total = 0
    for d_idx, direction in enumerate(DIRS):
        for state, meta in STATE.items():
            row = d_idx*2 + meta['bank']
            for i in range(meta['count']):
                frame = bake_frame(sheet, direction, state, i)
                col = meta['start'] + i
                out.alpha_composite(frame, (col*CELL, row*CELL))
                total += 1

    if total != 496:
        raise SystemExit(f'Expected 496 raster frames, got {total}')
    DST.parent.mkdir(parents=True, exist_ok=True)
    out.save(DST, optimize=True)
    print(f'Wrote {DST} {out.size[0]}x{out.size[1]} with {total} baked raster frames')


if __name__ == '__main__':
    main()
