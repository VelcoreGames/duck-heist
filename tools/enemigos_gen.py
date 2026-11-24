# Enemigos kawaii de Duck Heist (y la paloma de la tienda), en el mismo estilo
# que el Pollito ladrón: formas redondas con sombreado hue-shift, contorno
# selectivo y ojos que se dibujan en el juego (enojados, parpadeo, daño).
# Los enemigos usan contorno frío (azul-morado) para distinguirse del pato.
# Uso: python3 tools/enemigos_gen.py [preview.png] -> src/game/kawaiiEnemyData.ts
import math, json, sys
from PIL import Image

N = 34            # lienzo 34x34
GROUND = 31       # línea de los pies; el juego la alinea con la base del enemigo
LIGHT = (-.62, -.78)
OUT_D, OUT_L = '#25203a', '#4f4874'
BIRD_SCALE = 1.13

def R(*c): return list(c)
# Rampas: brillo, base, sombra, sombra profunda
WHITE = R('#ffffff', '#f0ebf6', '#cbc2df', '#a597c2')
PIGEON = R('#dfe4f0', '#aeb6cb', '#8189a8', '#5f6688')
CREAM = R('#fffaf0', '#fbefd6', '#e6cfa6', '#c9a57c')
NAVY = R('#86a6f0', '#5677d0', '#3d55a6', '#2d3d7e')
SKY = R('#c9e4ff', '#8fc3ff', '#5f93d9', '#4569a8')
MINT = R('#dcfff4', '#93ebd0', '#5cc4a8', '#3f9c88')
CAMO = R('#d3e6a4', '#9fc26c', '#729752', '#557242')
RIOT = R('#93a4cc', '#5f709c', '#45527b', '#333d5e')
GOLD = R('#fff0a3', '#ffd45e', '#e09a2e', '#b8761f')
BEAK = R('#ffc27a', '#ff9a3d', '#e0602c', '#b8481f')
RED = R('#ffb3bd', '#ff6b7f', '#d9455c', '#a8304a')
PINK = R('#ffd6e2', '#ffb3c8', '#e88aa6', '#c26a88')
BREAD = R('#ffe2a8', '#f2b765', '#cc8640', '#a0612c')
CROIS = R('#fff0b0', '#ffc861', '#e8963a', '#bb6a2a')
STEEL = R('#e6e8f6', '#b4b8d8', '#8388b0', '#5f6390')
DARK = R('#8a85b0', '#5b5680', '#3f3a60', '#2d2948')
BROWN = R('#d9a77a', '#a87452', '#7d5238', '#5a3a28')
BEIGE = R('#fff1d6', '#e8d2a8', '#c8ad80', '#a58b62')
GLASS = R('#e8fbff', '#bdeaf7', '#8cc9e0', '#6aa3c2')

class Spr:
    def __init__(s, n=None):
        s.n = n or N
        s.px = [[None] * s.n for _ in range(s.n)]
        s.part = [[None] * s.n for _ in range(s.n)]
    def ok(s, x, y): return 0 <= x < s.n and 0 <= y < s.n
    def put(s, x, y, c, part='detail'):
        if s.ok(x, y): s.px[y][x] = c; s.part[y][x] = part
    def ell(s, cx, cy, rx, ry, ramp, part='body', bias=0.0, clip=None):
        for y in range(s.n):
            for x in range(s.n):
                nx, ny = (x + .5 - cx) / rx, (y + .5 - cy) / ry
                r = math.hypot(nx, ny)
                if r > 1 or (clip and not clip(x, y)): continue
                d = nx * LIGHT[0] + ny * LIGHT[1] + bias
                if d > .42 and .36 < r < .92: c = ramp[0]
                elif d > -.3: c = ramp[1]
                elif d < -.66 and r > .76: c = ramp[3]
                else: c = ramp[2]
                s.put(x, y, c, part)
    def box(s, x0, y0, w, h, ramp, part='box', round_=1):
        for j in range(h):
            for i in range(w):
                if round_ and (i in (0, w - 1)) and (j in (0, h - 1)): continue
                c = ramp[1]
                if j == 0 or (i == 0 and j < h - 1): c = ramp[0]
                if j == h - 1 or i == w - 1: c = ramp[2]
                if j == h - 1 and i == w - 1: c = ramp[3]
                s.put(x0 + i, y0 + j, c, part)
    def rows(s, x0, y0, rows, pal, part='detail'):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in pal: s.put(x0 + i, y0 + j, pal[ch], part)
    def contact(s, top, bottom, color):
        for y in range(1, N):
            for x in range(s.n):
                if s.part[y][x] == bottom and s.part[y - 1][x] == top: s.px[y][x] = color
    def outline(s, dark=OUT_D, light=OUT_L):
        out = {}
        for y in range(s.n):
            for x in range(s.n):
                if s.px[y][x] is not None: continue
                nb = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                      if s.ok(x + dx, y + dy) and s.px[y + dy][x + dx] is not None]
                if nb:
                    lit = sum((x - a) * LIGHT[0] + (y - b) * LIGHT[1] for a, b in nb) > .3
                    out[(x, y)] = light if lit else dark
        for (x, y), c in out.items(): s.put(x, y, c, 'outline')

def feet(s, pts, ramp=BEAK):
    for x, y in pts: s.ell(x, y, 2.1, 1.2, [ramp[1], ramp[1], ramp[2], ramp[2]], 'feet')

# ---------------------------------------------------------------- aves
def bird(step, k=1.0, body=WHITE, suit=None, head=None, beak='duck', hat=None, prop=None,
         neck=0, extra=None, cy_off=0, wide=1.0):
    """Ave chibi en 3/4 mirando a la derecha. Devuelve sprite y ojos."""
    k *= BIRD_SCALE  # tamaño nativo: el juego dibuja a los enemigos a escala 1 (píxel parejo)
    s = Spr(); head = head or body
    lift = [(-1, 0), (0, 0), (0, -1), (0, 0)][step]; bob = [0, -1, 0, -1][step]
    hx, hy = 16.5, GROUND - 14.2 * k + bob + cy_off - neck
    bx, by = 16, GROUND - 5.2 * k + bob + cy_off
    feet(s, [(13.2, GROUND - .6 + lift[0]), (18.8, GROUND - .6 + lift[1])])
    s.ell(bx, by, 5.4 * k * wide, 4.4 * k, body, 'body')
    if suit:
        s.ell(bx, by + .3, 5.4 * k * wide, 4.4 * k, suit, 'suit', clip=lambda x, y: y >= by - 1.4 * k)
    if neck:
        s.ell(16.8, by - 3.5 * k - neck / 2, 2.6 * k, neck / 2 + 2.2, head, 'neck')
    s.ell(hx, hy, 6.9 * k, 6.1 * k, head, 'head')
    s.contact('head', 'body', body[2]); s.contact('head', 'suit', suit[2] if suit else body[2])
    eyes = [(round(hx - 3.6 * k), round(hy - .2)), (round(hx + 1.6 * k), round(hy - .2))]
    if hat: hat(s, hx, hy, k)
    if extra: extra(s, hx, hy, bx, by, k, step)
    s.outline()
    # pico 3/4 a la derecha, bajo los ojos
    bxk, byk = round(hx + 2.6 * k), round(hy + 1.6 * k)
    if beak == 'duck':
        s.rows(bxk - 1, byk, ['.bb.', 'bhbbb', '.BBB.'], {'b': BEAK[1], 'h': BEAK[0], 'B': BEAK[2]})
    elif beak == 'small':
        s.rows(bxk, byk, ['bb', 'BBb'], {'b': BEAK[1], 'B': BEAK[2]})
    elif beak == 'pigeon':
        s.rows(bxk, byk, ['ww.', 'bbb'], {'w': '#f3eefa', 'b': '#c9a0a8'})
    elif beak == 'goose':
        s.rows(bxk - 1, byk - 1, ['.bbb.', 'bhbbbb', '.BBBB'], {'b': BEAK[1], 'h': BEAK[0], 'B': BEAK[2]})
    if prop: prop(s, bx, by, k, step)
    return s, eyes

# Sombreros y accesorios (dibujados en coordenadas de la cabeza)
def cap(color=NAVY, badge=GOLD, visor=True):
    def f(s, hx, hy, k):
        top = round(hy - 6.1 * k)
        s.ell(hx - .3, top + 2.2, 6.2 * k, 2.8, color, 'hat', clip=lambda x, y: y <= top + 3)
        if visor: s.box(round(hx - 1), top + 3, round(6.4 * k), 2, DARK, 'hat', 0)
        s.put(round(hx - .5), top + 1, badge[1]); s.put(round(hx + .5), top + 1, badge[0])
    return f

def helmet(color=RIOT, visor_c=GLASS):
    def f(s, hx, hy, k):
        s.ell(hx, hy - 1.6 * k, 7.4 * k, 5.6 * k, color, 'hat', clip=lambda x, y: y <= hy - .4 * k)
        s.box(round(hx - 5 * k), round(hy - 1.6 * k), round(10.5 * k), 2, visor_c, 'hat', 0)
    return f

def beret(color=CAMO):
    def f(s, hx, hy, k):
        s.ell(hx - 1.2, hy - 5.3 * k, 6.4 * k, 2.6, color, 'hat')
        s.put(round(hx + 3 * k), round(hy - 7 * k), color[2])
    return f

def nurse():
    def f(s, hx, hy, k):
        top = round(hy - 6.4 * k)
        s.box(round(hx - 3.5), top, 7, 3, WHITE, 'hat')
        s.rows(round(hx - 1), top, ['.r.', 'rrr', '.r.'], {'r': RED[1]})
    return f

def peaked(color=NAVY):
    def f(s, hx, hy, k):
        top = round(hy - 6.6 * k)
        s.ell(hx - .2, top + 2.4, 7.2 * k, 3.2, color, 'hat', clip=lambda x, y: y <= top + 3.5)
        s.box(round(hx - 5 * k), top + 3, round(11 * k), 2, GOLD, 'hat', 0)
        s.box(round(hx - .5), top, 2, 2, GOLD, 'hat', 0)
    return f

def fedora():
    def f(s, hx, hy, k):
        top = round(hy - 7.2 * k)
        s.box(round(hx - 7.4 * k), top + 3, round(14.8 * k), 2, BROWN, 'hat', 0)
        s.ell(hx - .2, top + 2.4, 5 * k, 3, BROWN, 'hat', clip=lambda x, y: y <= top + 3)
        s.box(round(hx - 4.4 * k), top + 2, round(9 * k), 1, RED, 'hat', 0)
    return f

def comb():
    def f(s, hx, hy, k):
        s.rows(round(hx - 2), round(hy - 8 * k), ['.r.r', 'rrrr', 'rrrr'], {'r': RED[1]})
    return f

def tuft(color):
    def f(s, hx, hy, k):
        s.rows(round(hx - 1), round(hy - 7.6 * k), ['.o', 'oo', '.o'], {'o': color})
    return f

def both(*fs):
    def f(*a):
        for g in fs: g(*a)
    return f

# Objetos en la mano (a la derecha del cuerpo)
def gun(kind='pistol'):
    def f(s, bx, by, k, step):
        x, y = round(bx + 4.4 * k), round(by - .5)
        pal = {'m': STEEL[1], 'h': STEEL[0], 'd': DARK[1], 'w': BREAD[1], 'p': PINK[1]}
        art = {'pistol': ['hmmm', 'dd..'], 'shotgun': ['hmmmmmm', 'wwd.dd.'],
               'rifle': ['..dd....', 'hmmmmmmm', 'ww.d....'], 'baton': ['d', 'd', 'd', 'w'],
               'radio': ['d.', 'dd', 'pd'], 'bag': ['.w.', 'www', 'www'], 'grenade': ['.d', 'pp', 'pp']}[kind]
        s.rows(x, y, art, pal)
        s.ell(x - .3, y + 1.2, 1.6, 1.5, WHITE if kind != 'radio' else PIGEON, 'hand')
    return f

def suit_badge(s, hx, hy, bx, by, k, step):
    s.put(round(bx - 1), round(by), GOLD[1]); s.put(round(bx), round(by), GOLD[0])

def sunglasses(s, hx, hy, bx, by, k, step):
    y = round(hy - .4)
    s.rows(round(hx - 5 * k), y, ['ddddd.dddd', 'ddhd...dhd'], {'d': '#2a2440', 'h': '#7f7aa8'})

def goggles(s, hx, hy, bx, by, k, step):
    y = round(hy - 2.4 * k)
    s.rows(round(hx - 5 * k), y, ['ggg.ggg', 'gmg.gmg'], {'g': DARK[1], 'm': MINT[1]})

def mustache(s, hx, hy, bx, by, k, step):
    s.rows(round(hx), round(hy + 3.4 * k), ['bb.bb', '.bbb.'], {'b': BROWN[2]})

def medals(s, hx, hy, bx, by, k, step):
    s.rows(round(bx - 2), round(by - 1), ['r.b', 'g.g'], {'r': RED[1], 'b': SKY[1], 'g': GOLD[1]})

def pigeon_neck(s, hx, hy, bx, by, k, step):
    for x in range(round(bx - 3), round(bx + 4)):
        y = round(by - 3.4 * k)
        if s.px[y][x] is not None: s.put(x, y, MINT[1] if x % 2 else '#b9a3e8')

def grenade_belt(s, hx, hy, bx, by, k, step):
    y = round(by + 1)
    for x in range(round(bx - 4), round(bx + 4), 2): s.put(x, y, PINK[1]); s.put(x + 1, y, DARK[1])

def k9_vest(s, hx, hy, bx, by, k, step):
    s.box(round(bx - 4), round(by - 2), 8, 4, DARK, 'vest')
    s.rows(round(bx - 2), round(by - 1), ['k.9'], {'k': GOLD[0], '9': GOLD[0]})

def monocle(s, hx, hy, bx, by, k, step):
    s.rows(round(hx + 1.6 * k) - 1, round(hy - 1.4), ['ggg', 'g.g', 'ggg', '..g'], {'g': GOLD[1]})

def coat(s, hx, hy, bx, by, k, step):
    s.ell(bx, by + .8, 5.8 * k, 4.6 * k, BEIGE, 'coat', clip=lambda x, y: y >= by - 2)
    s.put(round(bx), round(by + 1), BROWN[2]); s.put(round(bx), round(by + 3), BROWN[2])

# ---------------------------------------------------------------- comida y máquinas
def bagel(step):
    s = Spr(); cx, cy = 16, GROUND - 7
    s.ell(cx, cy, 8, 7, BREAD, 'body')
    seeds = [(-5, -3), (-1, -5), (3, -4), (5, -1), (-6, 1), (4, 3), (-3, 4)]
    rot = step % 2
    for dx, dy in seeds:
        x, y = cx + dx + (rot if dy < 0 else -rot), cy + dy
        if s.px[y][x]: s.put(x, y, '#fff6dc')
    for y in range(N):  # agujero del bagel (transparente, con su propio contorno)
        for x in range(N):
            if ((x + .5 - cx) / 2.6) ** 2 + ((y + .5 - (cy - 3.4)) / 1.3) ** 2 <= 1: s.px[y][x] = None; s.part[y][x] = None
    s.outline()
    return s, [(cx - 3, cy), (cx + 1, cy)]

def croissant(step):
    s = Spr(); lift = [(-1, 0), (0, 0), (0, -1), (0, 0)][step]
    feet(s, [(13, GROUND - .6 + lift[0]), (19, GROUND - .6 + lift[1])], DARK)
    cy = GROUND - 7 + [0, -1, 0, -1][step]
    for dx, r in ((-7, 2.8), (-4.2, 3.6), (0, 4.6), (4.2, 3.6), (7, 2.8)):
        s.ell(16 + dx, cy + abs(dx) * .28, r * 1.05, r, CROIS, 'body')
    for dx in (-5.6, -2.1, 2.1, 5.6):
        x = round(16 + dx)
        for y in range(N):
            if s.px[y][x] == CROIS[1]: s.put(x, y, CROIS[2])
    s.outline()
    return s, [(13, round(cy - 1)), (17, round(cy - 1))]

def toaster(step):
    s = Spr(); pop = [0, -1, -2, -1][step]
    s.box(9, 7 + pop, 5, 6, BREAD, 'toast'); s.box(15, 8 - pop // 2, 5, 5, BREAD, 'toast')
    s.box(7, 11, 18, 14, PINK, 'body', 1)
    s.box(6, 24, 20, 3, DARK, 'base', 1)
    s.rows(23, 16, ['dd', 'd.', 'dd'], {'d': DARK[1]})
    s.outline()
    return s, [(11, 16), (17, 16)]

def drone(step):
    s = Spr(); cy = 15 + [0, -1, 0, 1][step]
    for side in (-1, 1):
        x0 = 16 + side * 9
        s.box(x0 - 1, cy - 5, 3, 4, DARK, 'arm', 0)
        w = 8 if step % 2 == 0 else 4
        s.box(x0 - w // 2, cy - 6, w, 1, STEEL, 'prop', 0)
    s.ell(16, cy, 7.5, 6.5, SKY, 'body')
    s.box(13, cy - 8, 3, 2, RED, 'siren', 0); s.box(16, cy - 8, 3, 2, NAVY, 'siren', 0)
    s.ell(16, cy + 1, 4, 3.6, GLASS, 'face')
    s.outline()
    return s, [(14, cy), (17, cy)]

def camera(step, wheels=False):
    s = Spr(); bob = 0 if not wheels else [0, -1, 0, -1][step]
    if wheels:
        s.box(9, 21 + bob, 14, 4, DARK, 'cart', 1)
        for x in (11, 20): s.ell(x, 26, 2.2, 2.2, DARK, 'wheel')
    else:
        s.box(15, 18, 3, 9, DARK, 'pole', 0); s.box(11, 26, 11, 2, DARK, 'base', 1)
    s.box(7, 9 + bob, 16, 10, STEEL, 'body', 1)
    s.ell(22, 14 + bob, 4.4, 4.4, DARK, 'lens'); s.ell(22, 14 + bob, 2.8, 2.8, GLASS, 'glass')
    s.put(9, 10 + bob, RED[1]); s.put(10, 10 + bob, RED[0])
    s.outline()
    return s, [(11, 13 + bob), (15, 13 + bob)]

def bank_turret(step):
    s = Spr()
    s.box(6, 21, 20, 6, DARK, 'base', 1)
    s.ell(16, 18, 9, 8, GOLD, 'dome', clip=lambda x, y: y <= 21)
    s.box(21, 14, 8, 3, STEEL, 'barrel', 0)
    s.box(10, 21, 12, 2, NAVY, 'band', 0)
    s.outline()
    return s, [(12, 15), (17, 15)]

def atm(step):
    s = Spr(); lift = [(-1, 0), (0, 0), (0, -1), (0, 0)][step]
    feet(s, [(12, GROUND - .6 + lift[0]), (20, GROUND - .6 + lift[1])], DARK)
    bob = [0, -1, 0, -1][step]
    bob += 2
    s.box(6, 4 + bob, 20, 23, MINT, 'body', 1)
    s.box(9, 7 + bob, 14, 9, DARK, 'screen', 1)
    s.box(11, 19 + bob, 10, 2, DARK, 'slot', 0)
    s.box(12, 22 + bob, 8, 2, R('#d6ffd8', '#9ae6a0', '#6cbf78', '#4f9a5c'), 'cash', 0)
    for x in (9, 23): s.put(x, 25 + bob, GOLD[1])
    s.outline()
    return s, [(12, 11 + bob), (18, 11 + bob)]

# ---------------------------------------------------------------- catálogo
def make(id_, step):
    if id_ == 'policia_pato':
        return bird(step, 1.0, WHITE, NAVY, hat=cap(), extra=suit_badge, prop=gun('pistol'))
    if id_ == 'policia_rapido':
        return bird(step, .86, WHITE, SKY, hat=cap(SKY, GOLD), beak='small',
                    extra=lambda s, hx, hy, bx, by, k, st: s.rows(round(bx - 7), round(by - 1), ['ss.', '.ss', 'ss.'], {'s': SKY[0]}))
    if id_ == 'policia_escopeta':
        return bird(step, 1.06, WHITE, NAVY, hat=cap(), extra=both(sunglasses, suit_badge), prop=gun('shotgun'), wide=1.08)
    if id_ == 'policia_antidisturbios':
        return bird(step, 1.12, WHITE, RIOT, hat=helmet(), extra=suit_badge, wide=1.1)
    if id_ == 'security_pigeon':
        return bird(step, 1.0, PIGEON, DARK, beak='pigeon', hat=cap(DARK, GOLD), extra=pigeon_neck, prop=gun('radio'))
    if id_ == 'guard_goose':
        return bird(step, 1.0, WHITE, NAVY, beak='goose', neck=4, hat=cap(), prop=gun('baton'))
    if id_ == 'banker_chicken':
        return bird(step, 1.04, CREAM, R('#d6ffd8', '#9ae6a0', '#6cbf78', '#4f9a5c'), beak='small', hat=comb(), extra=monocle, prop=gun('bag'))
    if id_ == 'policia_francotirador':
        return bird(step, 1.04, WHITE, CAMO, hat=beret(), extra=goggles, prop=gun('rifle'))
    if id_ == 'policia_medico':
        return bird(step, 1.0, WHITE, MINT, hat=nurse(), prop=None,
                    extra=lambda s, hx, hy, bx, by, k, st: s.rows(round(bx - 1), round(by - 1), ['.r.', 'rrr', '.r.'], {'r': RED[1]}))
    if id_ == 'policia_capitan':
        return bird(step, 1.12, WHITE, NAVY, hat=peaked(), extra=both(mustache, medals), prop=gun('pistol'))
    if id_ == 'ganso_k9':
        return bird(step, 1.02, WHITE, None, beak='goose', neck=4, hat=None, extra=k9_vest)
    if id_ == 'policia_granadero':
        return bird(step, 1.06, WHITE, CAMO, hat=helmet(CAMO, CAMO), extra=grenade_belt, prop=gun('grenade'))
    if id_ == 'policia_porra':
        return bird(step, 1.0, WHITE, NAVY, hat=cap(), extra=suit_badge, prop=gun('baton'))
    if id_ == 'shop_pigeon':
        return bird(step, 1.06, PIGEON, None, beak='pigeon', hat=fedora(), extra=both(coat, pigeon_neck))
    if id_ == 'rolling_bagel': return bagel(step)
    if id_ == 'evil_croissant': return croissant(step)
    if id_ == 'robot_cajero': return atm(step)
    objs = {'toaster_turret': lambda: toaster(step), 'dron_policial': lambda: drone(step), 'security_camera': lambda: camera(step),
            'camara_movil': lambda: camera(step, True), 'torreta_banco': lambda: bank_turret(step)}
    if id_ in objs:
        # Diseñados sobre un suelo en y=29: se bajan 2 px para la línea de pies nueva.
        s, e = objs[id_](); t = Spr()
        for y in range(N - 2):
            for x in range(N): t.px[y + 2][x] = s.px[y][x]
        return t, [(ex, ey + 2) for ex, ey in e]
    raise KeyError(id_)

STYLE = {  # cómo se dibujan los ojos en el juego
    'shop_pigeon': 'friendly', 'toaster_turret': 'led', 'dron_policial': 'led', 'security_camera': 'none',
    'camara_movil': 'none', 'torreta_banco': 'led', 'robot_cajero': 'led', 'policia_escopeta': 'shades',
}
IDS = ['policia_pato', 'policia_rapido', 'policia_escopeta', 'policia_antidisturbios', 'security_pigeon',
       'guard_goose', 'banker_chicken', 'policia_francotirador', 'policia_medico', 'policia_capitan',
       'ganso_k9', 'policia_granadero', 'policia_porra', 'shop_pigeon', 'rolling_bagel', 'evil_croissant',
       'toaster_turret', 'dron_policial', 'security_camera', 'camara_movil', 'torreta_banco', 'robot_cajero']
CHARS = ''.join(chr(c) for c in range(35, 127) if chr(c) not in '\\.')

def main():
    palette = []; data = {}
    prev = Image.new('RGBA', (8 * (N * 8 + 12), 3 * (N * 4 + 14)), (43, 58, 63, 255))
    for n, id_ in enumerate(IDS):
        frames = []; eyes = []
        for step in range(4):
            s, e = make(id_, step)
            rows = []
            for y in range(N):
                row = ''
                for x in range(N):
                    c = s.px[y][x]
                    if c is None: row += '.'; continue
                    if c not in palette: palette.append(c)
                    row += CHARS[palette.index(c)]
                rows.append(row)
            frames.append(rows); eyes.append(e)
            if step < 2:
                im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
                for y in range(N):
                    for x in range(N):
                        c = s.px[y][x]
                        if c: im.putpixel((x, y), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
                for (ex, ey) in e:
                    if STYLE.get(id_) not in ('none',):
                        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)): im.putpixel((ex + dx, ey + dy), (32, 23, 43, 255))
                        im.putpixel((ex, ey), (255, 255, 255, 255))
                big = im.resize((N * 4, N * 4), Image.NEAREST)
                prev.paste(big, ((n % 8) * (N * 8 + 12) + step * (N * 4 + 4), (n // 8) * (N * 4 + 14)), big)
        # recorta filas/columnas vacías comunes a todos los frames
        data[id_] = {'frames': frames, 'eyes': eyes, 'style': STYLE.get(id_, 'angry')}
    ts = ['// Generado por tools/enemigos_gen.py. No editar a mano.',
          '// Sprites 32x32: cada carácter es un índice de KAWAII_ENEMY_PALETTE; "." es transparente.',
          '// La línea de los pies está en y=%d y el centro en x=16.' % GROUND,
          'export const KAWAII_ENEMY_SIZE=%d;' % N, 'export const KAWAII_ENEMY_GROUND=%d;' % GROUND,
          'export const KAWAII_ENEMY_CHARS=' + json.dumps(CHARS) + ';',
          'export const KAWAII_ENEMY_PALETTE=' + json.dumps(palette) + ';',
          "export type KawaiiEnemyEyes='angry'|'friendly'|'led'|'none'|'shades';",
          'export const KAWAII_ENEMIES:Record<string,{frames:string[][];eyes:[number,number][][];style:KawaiiEnemyEyes}>=' +
          json.dumps(data, separators=(',', ':')) + ';', '']
    open('src/game/kawaiiEnemyData.ts', 'w').write('\n'.join(ts))
    if len(sys.argv) > 1: prev.save(sys.argv[1])
    print(len(data), 'personajes; paleta', len(palette))

if __name__ == '__main__':
    main()
