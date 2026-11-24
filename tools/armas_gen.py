# Generador de armas kawaii para Duck Heist (vista lateral, apuntando a la derecha).
# Cada arma se arma con piezas simples (cajas redondeadas, cañones, empuñaduras
# inclinadas, círculos); el sombreado y el contorno se calculan solos para que
# las 13 armas compartan el mismo estilo que el Pollito ladrón.
# Uso: python3 tools/armas_gen.py [preview.png]  -> escribe src/game/heldWeaponData.ts
import json, sys, math
from PIL import Image

# Materiales: (brillo, base, sombra)
MAT = {
    'metal': ('#e3e4f6', '#a9acd2', '#7477a6'),
    'dark':  ('#8c86b4', '#5d5785', '#3e3962'),
    'wood':  ('#ffd59a', '#e8a463', '#b8703e'),
    'pink':  ('#ffc2d4', '#ff8fb1', '#d95b86'),
    'gold':  ('#fff0a3', '#ffd45e', '#e09a2e'),
    'mint':  ('#d4fff2', '#8ff0d6', '#4cb8a4'),
    'cream': ('#fffaf0', '#fff1d6', '#e8cfa8'),
}
OUTLINE = '#2b1d2e'
W, H = 26, 12

class Gun:
    def __init__(s):
        s.px = [[None] * W for _ in range(H)]
    def set(s, x, y, c):
        if 0 <= x < W and 0 <= y < H: s.px[y][x] = c
    def box(s, x, y, w, h, mat, round_=True, shade=True):
        hi, base, sh = MAT[mat]
        for j in range(h):
            for i in range(w):
                if round_ and w > 2 and h > 2 and (i in (0, w - 1)) and (j in (0, h - 1)):
                    continue
                c = base
                if shade:
                    if j == 0 and h > 1: c = hi
                    elif j == h - 1 and h > 1: c = sh
                s.set(x + i, y + j, c)
    def grip(s, x, y, w, h, slant, mat):
        hi, base, sh = MAT[mat]
        for j in range(h):
            off = int(round(j * slant))
            for i in range(w):
                c = base
                if i == 0: c = hi
                elif i == w - 1: c = sh
                if j == h - 1: c = sh
                s.set(x - off + i, y + j, c)
    def circle(s, cx, cy, r, mat):
        hi, base, sh = MAT[mat]
        for y in range(H):
            for x in range(W):
                dx, dy = x + .5 - cx, y + .5 - cy
                if dx * dx + dy * dy <= r * r:
                    d = (-dx - dy) / max(r, .01)
                    s.set(x, y, hi if d > .6 else sh if d < -.5 else base)
    def dot(s, x, y, color):
        s.set(x, y, MAT[color][1] if color in MAT else color)
    def outline(s):
        out = []
        for y in range(H):
            for x in range(W):
                if s.px[y][x] is None and any(
                        0 <= x + dx < W and 0 <= y + dy < H and s.px[y + dy][x + dx] not in (None, OUTLINE)
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    out.append((x, y))
        for x, y in out: s.px[y][x] = OUTLINE

def build():
    G = {}
    # 1) Pistola 9 mm: corredera redonda, empuñadura caramelo, corazón rosa.
    g = Gun(); g.box(2, 1, 11, 3, 'metal'); g.box(13, 2, 1, 1, 'dark', False)
    g.box(3, 4, 7, 1, 'dark', False); g.grip(3, 5, 3, 4, .34, 'wood')
    g.dot(7, 5, 'dark'); g.dot(8, 5, 'dark'); g.dot(5, 2, 'pink'); g.dot(11, 1, 'mint')
    G['quack_blaster'] = (g, (4, 6), None, (14, 2))
    # 2) Escopeta 12: cañón largo, corredera de madera, cartuchos rosas en la culata.
    g = Gun(); g.box(0, 3, 5, 3, 'wood'); g.box(4, 2, 6, 3, 'dark'); g.box(9, 2, 10, 2, 'metal', False)
    g.box(10, 4, 8, 1, 'dark', False); g.box(11, 4, 6, 2, 'wood'); g.grip(6, 5, 2, 3, .3, 'dark')
    g.dot(1, 4, 'pink'); g.dot(2, 4, 'pink'); g.dot(18, 1, 'gold')
    G['breadcrumb_shotgun'] = (g, (6, 6), (13, 5), (19, 2))
    # 3) Subfusil: compacto, cargador recto, mira menta.
    g = Gun(); g.box(0, 2, 3, 2, 'dark', False); g.box(3, 1, 10, 3, 'metal'); g.box(13, 2, 3, 1, 'dark', False)
    g.box(8, 4, 2, 4, 'pink', False); g.grip(4, 4, 2, 4, .25, 'dark'); g.dot(6, 0, 'mint'); g.dot(7, 0, 'mint')
    G['feather_gun'] = (g, (5, 5), None, (16, 2))
    # 4) Carabina 5.56: culata, asa con mira, guardamanos con puntitos menta.
    g = Gun(); g.box(0, 2, 4, 3, 'dark'); g.box(4, 1, 9, 3, 'metal'); g.box(13, 2, 5, 2, 'dark', False)
    g.box(18, 2, 1, 1, 'metal', False); g.box(6, 0, 4, 1, 'dark', False); g.grip(5, 4, 2, 3, .3, 'dark')
    g.grip(10, 4, 2, 3, -.35, 'pink'); g.dot(15, 2, 'mint'); g.dot(17, 2, 'mint')
    G['bread_boomerang'] = (g, (5, 5), (14, 4), (19, 2))
    # 5) Fusil 7.62: muebles de madera cálida y cargador oscuro.
    g = Gun(); g.box(0, 2, 5, 3, 'wood'); g.box(5, 2, 8, 2, 'metal', False); g.box(13, 2, 5, 2, 'wood', False)
    g.box(18, 2, 2, 1, 'metal', False); g.box(8, 1, 3, 1, 'dark', False); g.grip(6, 4, 2, 3, .3, 'wood')
    g.grip(10, 4, 2, 4, -.25, 'dark'); g.dot(19, 1, 'gold')
    G['rubber_duck_cannon'] = (g, (6, 5), (14, 4), (20, 2))
    # 6) Lanzagranadas 40 mm: tubo gordito con franja rosa.
    g = Gun(); g.box(0, 3, 5, 3, 'wood'); g.box(4, 2, 4, 3, 'dark'); g.box(7, 1, 10, 5, 'metal')
    g.box(9, 1, 2, 5, 'pink', False); g.grip(5, 5, 2, 3, .3, 'wood'); g.dot(15, 0, 'gold')
    G['baguette_launcher'] = (g, (5, 6), (13, 6), (17, 3))
    # 7) Ametralladora ligera: cañón con camisa, caja de munición menta, bípode.
    g = Gun(); g.box(0, 2, 3, 3, 'dark'); g.box(3, 1, 10, 4, 'metal'); g.box(13, 2, 6, 2, 'dark', False)
    for xx in (14, 16): g.dot(xx, 2, 'metal')
    g.box(19, 2, 1, 1, 'metal', False); g.box(6, 5, 4, 3, 'mint'); g.grip(4, 5, 2, 3, .3, 'dark')
    g.dot(16, 4, 'dark'); g.dot(15, 5, 'dark'); g.dot(17, 5, 'dark'); g.box(6, 0, 4, 1, 'dark', False)
    G['quack_laser'] = (g, (4, 6), (14, 4), (20, 2))
    # 8) Revólver .357: cilindro dorado y empuñadura caramelo.
    g = Gun(); g.box(8, 1, 7, 2, 'metal', False); g.box(4, 1, 5, 3, 'metal'); g.circle(7.5, 3.5, 2.2, 'gold')
    g.grip(3, 4, 3, 4, .35, 'wood'); g.dot(14, 0, 'gold'); g.dot(6, 6, 'dark')
    G['golden_egg_revolver'] = (g, (4, 6), None, (15, 1.5))
    # 9) Pistola .45 suprimida: silenciador gordito.
    g = Gun(); g.box(2, 1, 10, 3, 'metal'); g.box(12, 1, 6, 3, 'dark'); g.box(3, 4, 6, 1, 'dark', False)
    g.grip(3, 5, 3, 4, .34, 'dark'); g.dot(5, 2, 'pink'); g.dot(14, 1, 'metal'); g.dot(15, 1, 'metal')
    G['tactical_toaster'] = (g, (4, 6), None, (18, 2))
    # 10) DMR 7.62: mira con lente menta, cañón largo.
    g = Gun(); g.box(0, 3, 5, 3, 'dark'); g.box(5, 3, 9, 2, 'metal', False); g.box(14, 3, 6, 1, 'metal', False)
    g.box(6, 0, 7, 2, 'dark'); g.dot(12, 1, 'mint'); g.dot(6, 1, 'mint'); g.box(14, 4, 5, 1, 'dark', False)
    g.grip(6, 5, 2, 3, .3, 'dark'); g.grip(10, 5, 2, 3, -.3, 'pink'); g.dot(19, 2, 'gold')
    G['egg_cannon'] = (g, (6, 6), (15, 5), (20, 3))
    # 11) Fusil de cerrojo .308: madera, mira grande, botón de cerrojo dorado.
    g = Gun(); g.box(0, 3, 6, 3, 'wood'); g.box(6, 3, 6, 2, 'metal', False); g.box(12, 3, 6, 2, 'wood', False)
    g.box(18, 3, 3, 1, 'metal', False); g.box(5, 0, 9, 2, 'dark'); g.dot(13, 1, 'mint'); g.dot(5, 1, 'mint')
    g.dot(9, 5, 'gold'); g.grip(6, 5, 2, 2, .4, 'wood')
    G['baguette_sniper'] = (g, (6, 6), (15, 5), (21, 3))
    # 12) Rifle pesado .50: cuerpo grande, freno de boca, caja y bípode.
    g = Gun(); g.box(0, 2, 4, 4, 'dark'); g.box(4, 1, 11, 5, 'metal'); g.box(15, 2, 5, 2, 'dark', False)
    g.box(20, 1, 2, 4, 'metal'); g.box(6, 0, 6, 1, 'dark', False); g.dot(11, 0, 'mint')
    g.box(9, 6, 3, 2, 'pink'); g.grip(5, 6, 2, 3, .3, 'dark'); g.dot(17, 4, 'dark'); g.dot(16, 5, 'dark'); g.dot(18, 5, 'dark')
    G['plasma_baker'] = (g, (5, 7), (14, 5), (22, 3))
    # 13) PDW 5.7: bullpup redondito con cargador menta arriba.
    g = Gun(); g.box(1, 1, 13, 4, 'metal'); g.box(3, 0, 8, 1, 'mint', False); g.box(14, 2, 2, 1, 'dark', False)
    g.grip(8, 5, 2, 3, .25, 'dark'); g.dot(4, 3, 'pink'); g.dot(1, 2, 'dark'); g.dot(1, 3, 'dark')
    G['homing_crumbs'] = (g, (8, 6), None, (16, 2))
    return G

def trim(g):
    xs = [x for y in range(H) for x in range(W) if g.px[y][x]]
    ys = [y for y in range(H) for x in range(W) if g.px[y][x]]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1

def main():
    G = build(); out = {}; palette = []
    def idx(c):
        if c not in palette: palette.append(c)
        return palette.index(c)
    prev = Image.new('RGBA', (W * 7 * 4 + 40, (H * 7 + 30) * 4), (43, 58, 63, 255))
    for n, (id_, (g, grip, front, muzzle)) in enumerate(G.items()):
        g.outline(); x0, y0, x1, y1 = trim(g)
        rows = [''.join(chr(48 + idx(g.px[y][x])) if g.px[y][x] else '.' for x in range(x0, x1)) for y in range(y0, y1)]
        sh = lambda p: None if p is None else [round(p[0] - x0, 2), round(p[1] - y0, 2)]
        out[id_] = {'rows': rows, 'grip': sh(grip), 'front': sh(front), 'muzzle': sh(muzzle)}
        im = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
        for y in range(y0, y1):
            for x in range(x0, x1):
                c = g.px[y][x]
                if c: im.putpixel((x - x0, y - y0), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
        big = im.resize((im.width * 7, im.height * 7), Image.NEAREST)
        cx, cy = 20 + (n % 4) * (W * 7 + 10), 20 + (n // 4) * (H * 7 + 30)
        prev.paste(big, (cx, cy), big)
        for p, col in ((grip, (255, 80, 80)), (front, (80, 255, 120)), (muzzle, (255, 255, 0))):
            if p:
                px_, py_ = cx + int((p[0] - x0) * 7), cy + int((p[1] - y0) * 7)
                for d in range(-3, 4):
                    prev.putpixel((px_ + d, py_), col + (255,)); prev.putpixel((px_, py_ + d), col + (255,))
    ts = ['// Generado por tools/armas_gen.py. No editar a mano.',
          '// Armas en vista lateral apuntando a la derecha; cada carácter es un índice de HELD_WEAPON_PALETTE.',
          'export const HELD_WEAPON_PALETTE=' + json.dumps(palette) + ';',
          'export type HeldWeaponSprite={rows:string[];grip:[number,number];front:[number,number]|null;muzzle:[number,number]};',
          'export const HELD_WEAPONS:Record<string,HeldWeaponSprite>=' + json.dumps(out, separators=(',', ':')) + ';', '']
    open('src/game/heldWeaponData.ts', 'w').write('\n'.join(ts))
    if len(sys.argv) > 1: prev.save(sys.argv[1])
    print(len(out), 'armas; paleta', len(palette))

main()
