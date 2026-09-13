from pathlib import Path
from PIL import Image
import colorsys

SRC = Path('src/assets/chibi/base-duck-remastered-atlas.png')
OUT = Path('docs/PLAYER_ATLAS_ASCII.txt')
img = Image.open(SRC).convert('RGBA')
assert img.size == (1200, 240), img.size

FW, FH = 40, 60
rows = {'down':0, 'up':1, 'left':2, 'right':3}
frames = {
    'idle0': 0,
    'walk0': 4,
    'walk3': 7,
    'walk6': 10,
    'walk9': 13,
    'shoot0': 16,
    'shoot2': 18,
    'shoot5': 21,
    'interact4': 26,
}

def glyph(px):
    r,g,b,a = px
    if a < 45: return ' '
    rf,gf,bf = r/255, g/255, b/255
    h,s,v = colorsys.rgb_to_hsv(rf,gf,bf)
    if v < .28: return '#'
    if s < .12:
        return 'W' if v > .82 else 'g'
    if .035 <= h <= .115 and s > .35: return 'O'
    if .11 <= h <= .19 and s > .22: return 'Y'
    if v > .82 and .08 <= h <= .20: return 'C'
    if b > r * 1.08 and b > g * 1.04: return 'B'
    if r > g * 1.18 and r > b * 1.15: return 'R'
    return '+'

lines = [
    'Duck Heist remastered atlas silhouette inspection',
    'Legend: # dark outline, Y yellow, O orange/beak/feet, C cream/light, g gray, W white, B blue, R red, + other',
    '',
]
for d,row in rows.items():
    for name,col in frames.items():
        crop = img.crop((col*FW,row*FH,(col+1)*FW,(row+1)*FH)).resize((20,30), Image.Resampling.LANCZOS)
        bbox = crop.getchannel('A').getbbox()
        lines.append(f'=== {d.upper()} · {name} · bbox20={bbox} ===')
        for y in range(30):
            lines.append(''.join(glyph(crop.getpixel((x,y))) for x in range(20)))
        lines.append('')
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text('\n'.join(lines))
print(f'wrote {OUT} with {len(lines)} lines')
