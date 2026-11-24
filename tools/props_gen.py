# Objetos destructibles kawaii de Duck Heist (20 familias + 12 piezas de lujo).
# Cada objeto llena su caja de impacto visible (OBSTACLE_FAMILY_PHYSICS.projectile)
# para que lo que se ve coincida con lo que choca. Las ranuras M (color principal)
# y A (acento) se tiñen en el juego con la paleta de cada piso.
# Uso: python3 tools/props_gen.py [preview.png] -> src/game/kawaiiPropData.ts
import json, sys, math
from PIL import Image
sys.path.insert(0, 'tools')
from enemigos_gen import Spr

N = 32
INK, INK_L = '#25203a', '#4f4874'
M = ['M0', 'M1', 'M2', 'M3']; A = ['A0', 'A1', 'A2', 'A3']
def R(*c): return list(c)
SCREEN = R('#4a4370', '#2a2440', '#201b36', '#171328')
MINT = R('#dcfff4', '#8ff0d6', '#5cc4a8', '#3f9c88')
PAPER = R('#ffffff', '#fffaf0', '#e8dcc8', '#c9b89c')
LEAF = R('#c8f5a8', '#8fd67a', '#5fae5a', '#3f8a48')
POT = R('#ffd6e2', '#ff9eb8', '#e0708f', '#b5506c')
WATER = R('#e8fbff', '#a8e4ff', '#6fbbe8', '#4a8cc2')
CASH = R('#e2ffd8', '#a6e69a', '#6cbf78', '#4f9a5c')
GOLD = R('#fff0a3', '#ffd45e', '#e09a2e', '#b8761f')
GEM = R('#f0ffff', '#a8f4ff', '#62cfe8', '#3d98c2')
RED = R('#ffb3bd', '#ff6b7f', '#d9455c', '#a8304a')
WOOD = R('#f6c88a', '#d9935a', '#a8643c', '#7d4a2c')
DARK = R('#8a85b0', '#5b5680', '#3f3a60', '#2d2948')

def base_shadow(s, x0, x1, y=30):
    for x in range(x0, x1): s.put(x, y, None) if False else None

def fam(i):
    s = Spr(N)
    if i == 0:   # cajero automático
        s.box(4, 5, 24, 25, M); s.box(7, 8, 18, 10, SCREEN); s.box(9, 10, 9, 1, MINT, 'scr', 0); s.box(9, 13, 6, 1, MINT, 'scr', 0)
        s.box(8, 20, 9, 6, DARK); [s.put(9 + (k % 3) * 3, 21 + (k // 3) * 2, MINT[1]) for k in range(6)]
        s.box(19, 21, 6, 2, SCREEN, 'slot', 0); s.box(19, 25, 6, 2, CASH, 'cash', 0); s.box(6, 3, 20, 3, A)
    elif i == 1:  # separador con cordón de terciopelo
        for x in (5, 24):
            s.box(x, 10, 3, 18, A, 'post', 0); s.ell(x + 1.5, 9, 2.4, 2.4, A, 'knob'); s.ell(x + 1.5, 28.5, 3.6, 1.6, A, 'base')
        for x in range(8, 24):
            y = 13 + round(3 * math.sin((x - 8) / 16 * math.pi)); s.put(x, y, RED[1]); s.put(x, y + 1, RED[2])
    elif i == 2:  # exhibidor de folletos
        s.box(14, 6, 4, 22, A, 'pole', 0); s.ell(16, 28.5, 8, 2, M, 'base')
        for k, y in enumerate((6, 13, 20)):
            s.box(5, y, 22, 6, M)
            for j, c in enumerate((RED, MINT, GOLD, WATER)): s.box(7 + j * 5, y + 1, 3, 4, c, 'br', 0)
    elif i == 3:  # cofre / bolsa de documentos
        s.ell(16, 23, 11, 7, M, 'body'); s.box(6, 18, 20, 4, M, 'lid', 0)
        s.box(14, 19, 4, 5, A); s.ell(16, 14, 5, 4, A, 'handle'); s.ell(16, 14.5, 3, 2.4, [None] * 4, 'hole') if False else None
        for y in range(13, 16):
            for x in range(13, 20):
                if ((x + .5 - 16) / 3) ** 2 + ((y + .5 - 15) / 2) ** 2 <= 1: s.px[y][x] = None
    elif i == 4:  # cofre blindado
        s.box(2, 13, 28, 17, M); s.box(2, 13, 28, 5, M, 'lid'); s.box(2, 17, 28, 2, A, 'band', 0)
        for x in (6, 24): s.box(x, 13, 2, 17, A, 'strap', 0)
        s.box(13, 19, 6, 6, A); s.put(15, 21, INK); s.put(16, 21, INK); s.put(15, 22, INK)
    elif i == 5:  # columna
        s.box(6, 0, 20, 4, A); s.box(8, 4, 16, 23, M, 'shaft', 0); s.box(6, 27, 20, 4, A)
        for x in (11, 15, 19): s.box(x, 5, 1, 21, ['M2'] * 4, 'flute', 0)
        for x in (10, 14, 18): s.box(x, 5, 1, 21, ['M0'] * 4, 'flute', 0)
    elif i == 6:  # estación biométrica
        s.box(10, 18, 12, 12, M); s.box(5, 7, 22, 12, M)
        s.box(8, 9, 16, 8, SCREEN); s.ell(16, 13, 3, 3, MINT, 'print')
        for y in (12, 14): s.box(14, y, 5, 1, ['#2a2440'] * 4, 'ln', 0)
        s.box(7, 26, 18, 4, A)
    elif i == 7:  # alarma con baliza
        s.box(9, 18, 14, 12, M); s.box(11, 20, 10, 4, SCREEN); s.box(12, 21, 3, 2, RED, 'led', 0)
        s.box(15, 10, 2, 8, A, 'pole', 0); s.ell(16, 8, 5.5, 4.5, RED, 'beacon', clip=lambda x, y: y <= 9)
        s.box(10, 9, 12, 2, A, 'ring', 0)
    elif i == 8:  # archivero
        s.box(4, 1, 24, 29, M)
        for y in (3, 10, 17, 24): s.box(6, y, 20, 6, M, 'drawer'); s.box(13, y + 2, 6, 2, A, 'handle', 0)
    elif i == 9:  # maletín
        s.box(4, 15, 24, 15, M); s.box(4, 15, 24, 3, M, 'lid'); s.box(11, 11, 10, 2, A, 'h', 0); s.box(11, 11, 2, 5, A, 'h', 0); s.box(19, 11, 2, 5, A, 'h', 0)
        for x in (7, 23): s.box(x, 18, 3, 3, A, 'clasp', 0)
    elif i == 10:  # contadora de billetes
        s.box(4, 15, 24, 15, M); s.box(6, 10, 20, 7, M, 'top'); s.box(8, 6, 14, 5, CASH, 'bills'); s.box(9, 7, 12, 1, ['#ffffff'] * 4, 'shine', 0)
        s.box(8, 19, 8, 4, SCREEN); s.box(9, 20, 6, 2, MINT, 'n', 0); s.box(19, 19, 6, 6, A)
    elif i == 11:  # carrito
        s.box(5, 18, 22, 8, M); s.box(7, 9, 9, 9, PAPER, 'box'); s.box(16, 12, 9, 6, PAPER, 'box')
        s.box(26, 6, 2, 14, A, 'handle', 0); s.box(24, 6, 4, 2, A, 'grip', 0)
        for x in (8, 23): s.ell(x, 28, 2.6, 2.6, DARK, 'wheel')
    elif i == 12:  # caja fuerte
        s.box(4, 0, 24, 30, M); s.box(6, 3, 20, 24, M, 'door'); s.ell(16, 14, 5, 5, A, 'dial'); s.put(16, 11, INK)
        s.box(22, 12, 3, 5, A, 'handle', 0); s.box(6, 27, 20, 3, DARK, 'foot', 0)
    elif i == 13:  # jaula de valores con lingotes
        s.box(2, 6, 28, 3, A); s.box(2, 27, 28, 3, A)
        s.box(6, 20, 9, 4, GOLD, 'bar'); s.box(17, 20, 9, 4, GOLD, 'bar'); s.box(11, 16, 10, 4, GOLD, 'bar')
        for x in range(3, 30, 4): s.box(x, 9, 2, 18, A, 'rod', 0)
    elif i == 14:  # impresora
        s.box(8, 3, 16, 6, PAPER); s.box(4, 8, 24, 13, M); s.box(6, 21, 20, 9, M, 'tray')
        s.box(7, 11, 7, 3, SCREEN); s.box(8, 12, 4, 1, MINT, 'l', 0); s.box(20, 11, 3, 3, MINT, 'b', 0); s.box(8, 22, 16, 2, PAPER, 'out', 0)
    elif i == 15:  # silla
        s.box(8, 7, 16, 12, M); s.box(6, 18, 20, 6, M, 'seat'); s.box(5, 15, 3, 7, A, 'arm', 0); s.box(24, 15, 3, 7, A, 'arm', 0)
        s.box(15, 24, 2, 4, DARK, 'leg', 0); s.box(8, 28, 16, 2, DARK, 'base', 0)
        for x in (8, 15, 23): s.ell(x + .5, 30, 1.4, 1.2, DARK, 'wheel')
    elif i == 16:  # maceta grande
        s.ell(16, 11, 12, 10, LEAF, 'leaf'); s.ell(9, 7, 5, 5, LEAF, 'leaf'); s.ell(23, 8, 5, 5, LEAF, 'leaf'); s.ell(16, 3, 5, 4, LEAF, 'leaf')
        s.box(8, 19, 16, 11, POT); s.box(7, 19, 18, 3, POT, 'rim')
        for x, y in ((12, 6), (20, 11), (14, 13)): s.put(x, y, '#ff9eb8'); s.put(x + 1, y, '#ffd6e2')
    elif i == 17:  # garrafón de agua
        s.ell(16, 6, 6.5, 6, WATER, 'bottle'); s.box(13, 11, 6, 2, WATER, 'neck', 0)
        s.box(8, 13, 16, 17, M); s.box(11, 17, 3, 3, RED, 'tap', 0); s.box(18, 17, 3, 3, WATER, 'tap', 0); s.box(10, 23, 12, 2, DARK, 'tray', 0)
    elif i == 18:  # consola de vigilancia
        for k, x in enumerate((3, 12, 21)):
            s.box(x, 5, 8, 7, DARK); s.box(x + 1, 6, 6, 5, MINT if k != 1 else WATER, 'scr', 0)
        s.box(2, 14, 28, 6, M, 'desk'); s.box(4, 20, 4, 10, M, 'leg', 0); s.box(24, 20, 4, 10, M, 'leg', 0)
        s.box(11, 15, 10, 2, DARK, 'kb', 0); s.box(13, 12, 6, 2, DARK, 'stand', 0)
    elif i == 19:  # servidor
        s.box(5, 0, 22, 30, M)
        for y in range(3, 27, 5): s.box(7, y, 18, 4, DARK, 'unit'); s.box(9, y + 1, 2, 2, MINT, 'led', 0); s.box(12, y + 1, 2, 2, GOLD, 'led', 0)
    s.outline(INK, INK_L)
    return s

def lux(name):
    s = Spr(N)
    if name == 'fountain':
        s.ell(16, 25, 15, 5.5, M, 'basin'); s.ell(16, 24, 12, 3.2, WATER, 'water')
        s.box(14, 10, 4, 13, A, 'spout', 0); s.ell(16, 9, 4, 3, A, 'top')
        for k in range(5): s.put(11 - k, 7 + k * 2, WATER[1]); s.put(21 + k, 7 + k * 2, WATER[1]); s.put(16, 3 + k, WATER[0])
    elif name == 'pedestal':
        s.box(9, 13, 14, 17, M); s.box(7, 12, 18, 3, A); s.box(7, 27, 18, 3, A)
        s.ell(16, 7, 5, 6, POT, 'vase'); s.box(14, 1, 4, 2, POT, 'lip', 0)
    elif name == 'easel':
        for x0, x1 in ((7, 11), (25, 21)):
            for y in range(4, 31): s.put(round(x0 + (x1 - x0) * (y - 4) / 26), y, WOOD[2])
        s.box(5, 4, 22, 17, A); s.box(7, 6, 18, 13, WATER, 'canvas'); s.ell(16, 13, 4, 4, GOLD, 'duck'); s.put(19, 13, BEAKC)
    elif name == 'money_stack':
        for k, y in enumerate((24, 19, 14)): s.box(5 + k, y, 22 - k * 2, 5, CASH); s.box(14, y, 4, 5, PAPER, 'band', 0)
    elif name == 'money_pile':
        s.ell(16, 24, 13, 7, CASH, 'pile'); s.box(9, 14, 10, 5, CASH, 'b'); s.box(15, 11, 9, 5, CASH, 'b')
        for x, y in ((8, 24), (21, 22), (14, 27), (24, 26)): s.ell(x, y, 2.2, 2.2, GOLD, 'coin')
    elif name == 'gold_bars':
        for x, y in ((4, 24), (12, 24), (20, 24), (8, 19), (16, 19), (12, 14)): s.box(x, y, 9, 5, GOLD, 'bar')
    elif name == 'duck_statue':
        s.box(7, 24, 18, 6, M); s.box(6, 23, 20, 2, A)
        s.ell(16, 17, 7, 6, A, 'body'); s.ell(16, 8, 6, 6, A, 'head'); s.rows(20, 8, ['bb', 'bbb'], {'b': BEAKC})
    elif name == 'swirl':
        s.box(9, 25, 14, 5, M); s.box(15, 14, 2, 11, A, 'stem', 0)
        for k in range(26):
            a = k * .55; rr = 2 + k * .32; s.ell(16 + math.cos(a) * rr * .8, 14 - k * .35 + math.sin(a) * rr * .5, 1.6, 1.6, A, 'sw')
    elif name == 'gem_pile':
        s.ell(16, 25, 13, 6, DARK, 'base')
        for x, y, r in ((10, 21, 4), (20, 21, 4.5), (15, 16, 4.2), (24, 25, 3), (8, 26, 3)):
            s.ell(x, y, r, r * 1.1, GEM, 'gem')
    elif name == 'gem_case':
        s.box(4, 18, 24, 12, M); s.box(5, 6, 22, 13, ['#e8fbff', '#cdeffb', '#a6dbee', '#86c4dc'], 'glass')
        for x in (10, 16, 22): s.ell(x, 14, 2.4, 2.8, GEM if x != 16 else RED, 'gem')
    elif name == 'crystal':
        s.box(9, 25, 14, 5, M)
        for y in range(2, 26):
            w = 9 - abs(y - 12) * .45
            for x in range(round(16 - w), round(16 + w)): s.put(x, y, GEM[0] if x < 14 else GEM[1] if x < 18 else GEM[2])
    elif name == 'crown_case':
        s.box(2, 20, 28, 10, M); s.box(3, 8, 26, 13, ['#e8fbff', '#cdeffb', '#a6dbee', '#86c4dc'], 'glass')
        s.rows(9, 11, ['g..g..g..g..g', 'gg.gg.g.gg.gg', 'ggggggggggggg', 'grgggbgggrggg', 'ggggggggggggg'], {'g': GOLD[1], 'r': RED[1], 'b': GEM[1]})
    s.outline(INK, INK_L)
    return s

BEAKC = '#ff9a3d'
LUX = {17: 'fountain', 62: 'pedestal', 77: 'fountain', 82: 'easel', 83: 'money_stack', 88: 'money_pile', 89: 'gold_bars',
       93: 'duck_statue', 96: 'swirl', 97: 'fountain', 102: 'easel', 103: 'gem_pile', 108: 'gem_pile', 109: 'gem_case',
       113: 'duck_statue', 116: 'crystal', 117: 'fountain', 118: 'crown_case'}

CHARS = ''.join(ch for ch in (chr(c) for c in range(35, 127)) if ch not in '\\.ABCDEFGH')
FIXED = {}
def enc(s):
    rows = []
    for y in range(N):
        row = ''
        for x in range(N):
            c = s.px[y][x]
            if c is None: row += '.'; continue
            if c[0] in 'MA' and len(c) == 2 and c[1].isdigit(): row += {'M': 'ABCD', 'A': 'EFGH'}[c[0]][int(c[1])]; continue
            if c not in FIXED: FIXED[c] = CHARS[len(FIXED)]
            row += FIXED[c]
        rows.append(row)
    return rows

def main():
    fams = [enc(fam(i)) for i in range(20)]
    luxn = sorted(set(LUX.values())); luxs = {n: enc(lux(n)) for n in luxn}
    pal = [None] * len(FIXED)
    for c, ch in FIXED.items(): pal[CHARS.index(ch)] = c
    ts = ['// Generado por tools/props_gen.py. No editar a mano.',
          '// Objetos 32x32 (base en y=30). A-D = color principal del piso, E-H = acento del piso.',
          'export const KAWAII_PROP_CHARS=' + json.dumps(CHARS) + ';',
          'export const KAWAII_PROP_PALETTE=' + json.dumps(pal) + ';',
          'export const KAWAII_PROP_FAMILIES:string[][]=' + json.dumps(fams, separators=(',', ':')) + ';',
          'export const KAWAII_PROP_LUXURY:Record<string,string[]>=' + json.dumps(luxs, separators=(',', ':')) + ';',
          'export const KAWAII_PROP_LUXURY_KEYS:Record<number,string>=' + json.dumps({str(k): v for k, v in LUX.items()}) + ';', '']
    open('src/game/kawaiiPropData.ts', 'w').write('\n'.join(ts))
    if len(sys.argv) > 1:
        demo = {'M0': '#e6ebf8', 'M1': '#b9c4e0', 'M2': '#8f9cc4', 'M3': '#6c78a3', 'A0': '#fff0a3', 'A1': '#ffd45e', 'A2': '#e09a2e', 'A3': '#b8761f'}
        allr = fams + [luxs[n] for n in luxn]
        im = Image.new('RGBA', (10 * 34 * 3, ((len(allr) + 9) // 10) * 34 * 3), (190, 200, 210, 255))
        inv = {v: k for k, v in FIXED.items()}
        for n, rows in enumerate(allr):
            t = Image.new('RGBA', (N, N), (0, 0, 0, 0))
            for y, row in enumerate(rows):
                for x, ch in enumerate(row):
                    if ch == '.': continue
                    k = 'ABCDEFGH'.find(ch)
                    c = demo[('M' if k < 4 else 'A') + str(k % 4)] if k >= 0 else inv[ch]
                    t.putpixel((x, y), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
            t = t.resize((N * 3, N * 3), Image.NEAREST); im.paste(t, ((n % 10) * 102 + 3, (n // 10) * 102 + 3), t)
        im.save(sys.argv[1])
    print(len(fams), 'familias,', len(luxs), 'lujo, paleta', len(pal))

if __name__ == '__main__':
    main()
