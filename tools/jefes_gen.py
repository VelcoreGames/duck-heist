# Jefes kawaii de Duck Heist: un cuerpo grande de frente por facción y
# accesorios por rol. Los colores de acento y secundario de cada jefe se
# aplican en el juego (ranuras A0-A3 y S0-S3), así los 145 jefes comparten
# 8 cuerpos pero cada uno conserva su identidad de color.
# Uso: python3 tools/jefes_gen.py [preview.png] -> src/game/kawaiiBossData.ts
import json, sys
from PIL import Image
sys.path.insert(0, 'tools')
from enemigos_gen import (Spr, WHITE, CREAM, PIGEON, GOLD, BEAK, RED, STEEL, DARK, GLASS, BROWN, MINT,
                          BREAD, PINK, OUT_D, OUT_L)

N = 56; GROUND = 52; CX = 28
ACC = ['A0', 'A1', 'A2', 'A3']; SEC = ['S0', 'S1', 'S2', 'S3']
CAMO_SPOT = '#4f6b3a'

def feet(s, dy=0, ramp=BEAK):
    for x in (22, 34): s.ell(x, GROUND - 1.2 + dy, 3.6, 1.9, [ramp[1], ramp[1], ramp[2], ramp[2]], 'feet')

def bird(step, body=WHITE, suit=ACC, neck=0):
    s = Spr(N); bob = [0, -1][step]
    feet(s)
    s.ell(CX, 41.5 + bob, 12.5, 9.6, body, 'body')
    if suit: s.ell(CX, 41.8 + bob, 12.5, 9.6, suit, 'suit', clip=lambda x, y: y >= 36 + bob)
    if neck: s.ell(CX, 33 + bob - neck / 2, 5, neck / 2 + 3, body, 'neck')
    hy = 24.5 + bob - neck
    s.ell(CX, hy, 14.6, 12.6, body, 'head')
    s.contact('head', 'body', body[2]); s.contact('head', 'suit', suit[2] if suit else body[2])
    return s, hy, bob

def beak_front(s, hy, kind='duck'):
    y = round(hy + 4.5)
    if kind == 'duck':
        s.rows(CX - 3, y, ['.bbbbb.', 'bhhbbbb', '.BBBBB.'], {'b': BEAK[1], 'h': BEAK[0], 'B': BEAK[2]})
    elif kind == 'small':
        s.rows(CX - 2, y, ['.bbb', 'bhbb', '.BB.'], {'b': BEAK[1], 'h': BEAK[0], 'B': BEAK[2]})

def blush(s, hy):
    for x in (15, 16, 39, 40): s.put(x, round(hy + 4), '#ff9eb2')

def finish(s, hy, beak='duck'):
    s.outline(OUT_D, OUT_L)
    beak_front(s, hy, beak); blush(s, hy)
    return s, [(19, round(hy)), (34, round(hy))]

def body_command(step):
    s, hy, bob = bird(step)
    top = round(hy - 12.6)
    s.ell(CX, top + 4.5, 14.5, 5.6, ACC, 'hat', clip=lambda x, y: y <= top + 6)
    s.box(14, top + 6, 29, 3, DARK, 'hat', 0); s.box(15, top + 5, 27, 1, SEC, 'hat', 0)
    s.ell(CX, top + 3, 2.4, 2.4, SEC, 'badge')
    for x, c in ((22, RED[1]), (24, '#8fc3ff'), (26, SEC[1])): s.put(x, round(40 + bob), c); s.put(x, round(41 + bob), SEC[2])
    s.box(27, round(37 + bob), 2, 10, SEC, 'button', 0)
    return finish(s, hy)

def body_finance(step):
    s, hy, bob = bird(step, CREAM)
    s.rows(CX - 4, round(hy - 15), ['.r.r.r', 'rrrrrr', 'rrrrrr'], {'r': RED[1]})
    s.rows(CX - 2, round(36 + bob), ['ss.ss', '.sss.', 'ss.ss'], {'s': SEC[1]})       # moño
    s.box(27, round(39 + bob), 2, 8, SEC, 'tie', 0)
    out = finish(s, hy, 'small')
    s.rows(31, round(hy - 2), ['ggggg', 'g...g', 'g...g', 'ggggg', '....g', '....g'], {'g': GOLD[1]})  # monóculo
    return out

def body_bakery(step):
    s, hy, bob = bird(step, WHITE, None)
    s.ell(CX, 43 + bob, 11, 8, ACC, 'apron', clip=lambda x, y: y >= 37 + bob)
    top = round(hy - 12)
    for dx, r in ((-6, 5.2), (0, 6.4), (6, 5.2)): s.ell(CX + dx, top - 4, r, 5, WHITE, 'hat')
    s.box(17, top, 23, 4, WHITE, 'hat', 0); s.box(17, top + 3, 23, 1, SEC, 'hat', 0)
    for x, y in ((18, 44), (25, 46), (33, 42), (37, 47)): s.put(x, round(y + bob), '#fffaf0')  # harina
    return finish(s, hy)

def body_riot(step):
    s, hy, bob = bird(step, WHITE, ACC, neck=3)
    s.ell(CX, hy - 2, 15.6, 12, ACC, 'helmet', clip=lambda x, y: y <= hy + 1)
    s.box(12, round(hy - 3), 33, 5, GLASS, 'visor', 0)
    s.box(20, round(38 + bob), 17, 7, DARK, 'vest', 1); s.ell(CX, 41 + bob, 2.2, 2.2, SEC, 'badge')
    return finish(s, hy)

def body_war(step):
    s, hy, bob = bird(step, WHITE, ACC, neck=2)
    s.ell(CX, hy - 5, 15.4, 9.5, ACC, 'helmet', clip=lambda x, y: y <= hy - 3)
    for x, y in ((18, -10), (25, -12), (33, -9), (38, -6), (21, -6)): s.put(x, round(hy + y), CAMO_SPOT); s.put(x + 1, round(hy + y), CAMO_SPOT)
    for i in range(14): s.put(18 + i, round(35 + bob + i * .75), SEC[1 if i % 3 else 2])  # cartuchera
    return finish(s, hy)

def body_wealth(step):
    s, hy, bob = bird(step, R_GOLDEN, ACC)
    s.ell(CX, 35.5 + bob, 13, 3.2, WHITE, 'fur')
    top = round(hy - 12)
    s.box(19, top - 9, 19, 11, DARK, 'tophat', 1); s.box(15, top + 1, 27, 3, DARK, 'tophat', 1)
    s.box(19, top - 1, 19, 2, SEC, 'tophat', 0)
    for i in range(9): s.put(22 + i, round(39 + bob + abs(4 - i) * .5), GOLD[1 if i % 2 else 0])  # cadena
    return finish(s, hy)

R_GOLDEN = ['#fff6c2', '#ffe07a', '#f0b84a', '#c98a32']

def body_tech(step):
    s = Spr(N); bob = [0, -1][step]
    for x in (20, 36): s.box(x - 3, GROUND - 4, 6, 4, DARK, 'foot', 1)
    s.box(12, 14 + bob, 33, 36, ACC, 'body', 1)
    s.box(16, 18 + bob, 25, 15, DARK, 'screen', 1)
    s.box(27, 7 + bob, 2, 7, DARK, 'antenna', 0); s.ell(28, 6 + bob, 2.6, 2.6, SEC, 'bulb')
    s.box(9, 30 + bob, 4, 9, DARK, 'arm', 1); s.box(44, 30 + bob, 4, 9, DARK, 'arm', 1)
    for i, c in enumerate((RED[1], SEC[1], MINT[1])): s.box(19 + i * 6, 38 + bob, 4, 3, [c, c, c, c], 'btn', 0)
    s.box(18, 44 + bob, 21, 2, DARK, 'grill', 0)
    s.outline(OUT_D, OUT_L)
    return s, [(20, 23 + bob), (33, 23 + bob)]

def body_vault(step):
    s = Spr(N); bob = [0, -1][step]
    for x in (20, 36): s.box(x - 3, GROUND - 4, 6, 4, DARK, 'foot', 1)
    s.ell(CX, 30 + bob, 19, 19, ACC, 'body')
    s.ell(CX, 30 + bob, 14.5, 14.5, STEEL, 'door')
    for a in range(8):
        import math
        x, y = CX + math.cos(a * math.pi / 4) * 17, 30 + bob + math.sin(a * math.pi / 4) * 17
        s.ell(x, y, 1.4, 1.4, SEC, 'bolt')
    s.ell(CX, 37 + bob, 4, 4, SEC, 'dial'); s.put(CX, 34 + bob, DARK[2])
    s.outline(OUT_D, OUT_L)
    return s, [(21, 25 + bob), (32, 25 + bob)]

BODIES = {'command': body_command, 'finance': body_finance, 'bakery': body_bakery, 'riot': body_riot,
          'war': body_war, 'wealth': body_wealth, 'tech': body_tech, 'vault': body_vault}

# ------------------------------------------------------------ accesorios por rol (ancla = mano/punto)
P = 28
def prop_canvas():
    return Spr(P)

def prop_shield():
    s = prop_canvas(); s.box(6, 2, 16, 24, SEC, 'rim', 1); s.box(8, 4, 12, 20, GLASS, 'glass', 1)
    s.ell(14, 14, 3.2, 3.2, ACC, 'emblem'); s.outline(OUT_D, OUT_L); return s, (14, 14)

def prop_gavel():
    s = prop_canvas(); s.box(13, 9, 3, 17, BROWN, 'handle', 0); s.box(5, 2, 19, 8, SEC, 'head', 1)
    s.box(5, 4, 2, 4, ACC, 'band', 0); s.box(22, 4, 2, 4, ACC, 'band', 0); s.outline(OUT_D, OUT_L); return s, (14, 20)

def prop_cannon():
    s = prop_canvas(); s.box(2, 8, 22, 9, STEEL, 'tube', 1); s.box(20, 6, 6, 13, DARK, 'mouth', 1)
    s.box(6, 8, 3, 9, SEC, 'ring', 0); s.ell(8, 20, 4, 4, DARK, 'wheel'); s.outline(OUT_D, OUT_L); return s, (8, 13)

def prop_horns():
    s = prop_canvas()
    for side in (-1, 1):  # cuernos de toro curvos hacia afuera y arriba
        for i in range(8):
            t = i / 7
            x = 14 + side * (6 + t * 6); y = 15 - t * t * 9
            s.ell(x, y, 2.3 - t * 1.1, 1.9 - t * .6, SEC if i < 6 else ['S3'] * 4, 'horn')
    s.outline(OUT_D, OUT_L); return s, (14, 14)

def prop_keys():
    s = prop_canvas(); s.ell(14, 10, 6, 6, GOLD, 'ring')
    for y in range(N if False else 0): pass
    s2 = s
    for (x, y) in ((10, 15), (17, 16)):
        s2.box(x, y, 2, 8, GOLD, 'key', 0); s2.box(x - 1, y + 6, 4, 2, GOLD, 'bit', 0)
    for y in range(28):
        for x in range(28):
            if ((x + .5 - 14) / 3.4) ** 2 + ((y + .5 - 10) / 3.4) ** 2 <= 1: s2.px[y][x] = None
    s2.outline(OUT_D, OUT_L); return s2, (14, 6)

def prop_rod():
    s = prop_canvas(); s.box(13, 6, 2, 20, DARK, 'rod', 0); s.ell(14, 5, 3.4, 3.4, SEC, 'ball')
    s.box(9, 18, 10, 2, SEC, 'coil', 0); s.box(10, 21, 8, 2, SEC, 'coil', 0); s.outline(OUT_D, OUT_L); return s, (14, 24)

def prop_cape():
    s = prop_canvas()
    for y in range(4, 27):
        w = 7 + (y - 4) * .35
        for x in range(round(14 - w), round(14 + w)): s.put(x, y, ACC[2] if abs(x - 14) > w - 2 else ACC[3], 'cape')
    s.outline(OUT_D, OUT_L); return s, (14, 4)

def prop_card():
    s = prop_canvas(); s.box(9, 6, 10, 14, WHITE, 'card', 1)
    s.rows(12, 10, ['r.r', 'rrr', '.r.'], {'r': RED[1]}); s.outline(OUT_D, OUT_L); return s, (14, 18)

def prop_core():
    s = prop_canvas(); s.ell(14, 14, 7, 7, DARK, 'shell'); s.ell(14, 14, 4.6, 4.6, MINT, 'core'); s.outline(OUT_D, OUT_L); return s, (14, 14)

PROPS = {'shield': prop_shield, 'gavel': prop_gavel, 'cannon': prop_cannon, 'horns': prop_horns, 'keys': prop_keys,
         'rod': prop_rod, 'cape': prop_cape, 'card': prop_card, 'core': prop_core}

FIXED = {}
def encode(px, n):
    rows = []
    for y in range(n):
        row = ''
        for x in range(n):
            c = px[y][x]
            if c is None: row += '.'; continue
            if c[0] in 'AS' and len(c) == 2: row += {'A': 'ABCD', 'S': 'EFGH'}[c[0]][int(c[1])]; continue
            if c not in FIXED: FIXED[c] = CHARS[len(FIXED)]
            row += FIXED[c]
        rows.append(row)
    return rows
CHARS = ''.join(ch for ch in (chr(c) for c in range(35, 127)) if ch not in '\\.ABCDEFGH')

def preview_img(px, n, acc, sec):
    pal = {'A0': '#cfe0ff', 'A1': acc, 'A2': '#3d55a6', 'A3': '#2d3d7e', 'S0': '#fff0a3', 'S1': sec, 'S2': '#e09a2e', 'S3': '#b8761f'}
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    for y in range(n):
        for x in range(n):
            c = px[y][x]
            if c: c = pal.get(c, c); im.putpixel((x, y), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    return im

def main():
    bodies = {}; props = {}
    prev = Image.new('RGBA', (8 * (N * 3 + 8), N * 3 * 2 + 20), (43, 58, 63, 255))
    for i, (fam, fn) in enumerate(BODIES.items()):
        frames, eyes = [], []
        for step in range(2):
            s, e = fn(step); frames.append(encode(s.px, N)); eyes.append(e)
            if step == 0:
                im = preview_img(s.px, N, '#5677d0', '#ffd45e')
                for ex, ey in e:
                    for dx in range(3):
                        for dy in range(3): im.putpixel((ex + dx, ey + dy), (32, 23, 43, 255))
                    im.putpixel((ex, ey), (255, 255, 255, 255))
                big = im.resize((N * 3, N * 3), Image.NEAREST); prev.paste(big, (i * (N * 3 + 8), 0), big)
        bodies[fam] = {'frames': frames, 'eyes': eyes}
    for i, (name, fn) in enumerate(PROPS.items()):
        s, anchor = fn(); props[name] = {'rows': encode(s.px, P), 'anchor': anchor}
        im = preview_img(s.px, P, '#5677d0', '#ffd45e').resize((P * 3, P * 3), Image.NEAREST)
        prev.paste(im, (i * (P * 3 + 8), N * 3 + 20), im)
    palette = [None] * len(FIXED)
    for c, ch in FIXED.items(): palette[CHARS.index(ch)] = c
    ts = ['// Generado por tools/jefes_gen.py. No editar a mano.',
          '// Cuerpos de jefe 56x56 de frente (pies en y=%d, centro x=%d) y accesorios 28x28.' % (GROUND, CX),
          '// A-D = rampa del color de acento del jefe, E-H = rampa del color secundario.',
          'export const KAWAII_BOSS_SIZE=%d;' % N, 'export const KAWAII_BOSS_GROUND=%d;' % GROUND,
          'export const KAWAII_BOSS_PROP_SIZE=%d;' % P,
          'export const KAWAII_BOSS_CHARS=' + json.dumps(CHARS) + ';',
          'export const KAWAII_BOSS_PALETTE=' + json.dumps(palette) + ';',
          'export const KAWAII_BOSS_BODIES:Record<string,{frames:string[][];eyes:[number,number][][]}>=' + json.dumps(bodies, separators=(',', ':')) + ';',
          'export const KAWAII_BOSS_PROPS:Record<string,{rows:string[];anchor:[number,number]}>=' + json.dumps(props, separators=(',', ':')) + ';', '']
    open('src/game/kawaiiBossData.ts', 'w').write('\n'.join(ts))
    if len(sys.argv) > 1: prev.save(sys.argv[1])
    print(len(bodies), 'cuerpos,', len(props), 'accesorios, paleta', len(palette))

if __name__ == '__main__':
    main()
