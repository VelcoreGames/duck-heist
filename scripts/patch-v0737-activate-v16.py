from pathlib import Path
import re

render=Path('src/game/render.ts')
s=render.read_text()
old="import { drawChibiPlayerRemastered } from './graphics/playerChibiRemastered';"
new="import { drawChibiPlayerAtlasV16 } from './graphics/playerChibiAtlasV16';"
if old not in s and new not in s:
    raise SystemExit('player renderer import anchor missing')
s=s.replace(old,new,1)
if 'drawChibiPlayerRemastered({' in s:
    s=s.replace('drawChibiPlayerRemastered({','drawChibiPlayerAtlasV16({',1)
elif 'drawChibiPlayerAtlasV16({' not in s:
    raise SystemExit('player renderer call anchor missing')
render.write_text(s)

lab=Path('src/game/graphics/playerVisualLab.ts')
l=lab.read_text()
old="import { drawChibiPlayerRemastered } from './playerChibiRemastered';"
new="import { drawChibiPlayerAtlasV16 } from './playerChibiAtlasV16';"
if old not in l and new not in l:
    raise SystemExit('player lab import anchor missing')
l=l.replace(old,new,1)
l=l.replace('drawChibiPlayerRemastered({','drawChibiPlayerAtlasV16({')
l=l.replace('PLAYER VISUAL LAB · v15 · 120 AUTHORED','PLAYER VISUAL LAB · v16 · 464 RASTER')
lab.write_text(l)

index=Path('index.html')
h=index.read_text()
h2,n=re.subn(r'<meta name="duck-heist-build" content="[^"]+" />','<meta name="duck-heist-build" content="0.7.37-chibi-v16" />',h,count=1)
if n!=1: raise SystemExit('build marker missing')
index.write_text(h2)
