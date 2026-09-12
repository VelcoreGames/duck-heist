from pathlib import Path

p=Path('src/game/render.ts')
s=p.read_text(encoding='utf-8')
s=s.replace("import { drawChibiPlayerDefinitive } from './graphics/playerChibiDefinitive';","import { drawChibiPlayerAtlasV4 } from './graphics/playerChibiAtlasV4';",1)
s=s.replace('drawChibiPlayerDefinitive({','drawChibiPlayerAtlasV4({',1)
p.write_text(s,encoding='utf-8')
print('Activated validated V4 player atlas')
