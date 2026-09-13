from pathlib import Path
from PIL import Image
import colorsys

SRC=Path('src/assets/chibi/base-duck-chibi-v16-atlas.png')
OUT=Path('docs/PLAYER_V16_ASCII.txt')
F=64
rows={'down':0,'up':1,'left':2,'right':3}
starts={'idle':0,'walk':12,'shoot':32,'dash':44,'hurt':60,'down':68,'interact':88,'celebrate':100}
sel=[('idle0',0),('idle8',8),('walk0',12),('walk5',17),('walk10',22),('walk15',27),('shoot0',32),('shoot4',36),('shoot11',43),('dash0',44),('dash7',51),('dash15',59),('hurt2',62),('down0',68),('down10',78),('down19',87),('interact6',94),('celebrate8',108)]
img=Image.open(SRC).convert('RGBA'); img.load(); assert img.size==(7424,256),img.size

def glyph(p):
    r,g,b,a=p
    if a<55:return ' '
    h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
    if v<.28:return '#'
    if s<.12:return 'W' if v>.84 else 'g'
    if .035<=h<=.115 and s>.42:return 'O'
    if .105<=h<=.19 and s>.20:return 'Y'
    if v>.86 and .08<=h<=.20:return 'C'
    if b>r*1.08 and b>g*1.04:return 'B'
    if r>g*1.22 and r>b*1.18:return 'R'
    return '+'

lines=['Duck Heist player V16 silhouette inspection','Legend # outline, Y feather, O orange, C cream, g/W neutral, B blue, R red, + other','']
for d,row in rows.items():
    for name,col in sel:
        fr=img.crop((col*F,row*F,(col+1)*F,(row+1)*F)).resize((32,32),Image.Resampling.LANCZOS)
        a=fr.getchannel('A'); bbox=a.getbbox()
        meaningful=sum(1 for v in a.getdata() if v>64)
        lines.append(f'=== {d.upper()} · {name} · bbox32={bbox} alpha64={meaningful} ===')
        for y in range(32):lines.append(''.join(glyph(fr.getpixel((x,y))) for x in range(32)))
        lines.append('')
OUT.write_text('\n'.join(lines))
print('wrote',OUT)
