from pathlib import Path

p = Path('src/game/render.ts')
s = p.read_text(encoding='utf-8')

old_import = "import { drawChibiPlayerAtlasV5 } from './graphics/playerChibiAtlasV5';"
new_import = "import { drawChibiPlayerDefinitive } from './graphics/playerChibiDefinitive';"
if old_import in s:
    s = s.replace(old_import, new_import, 1)
elif new_import not in s:
    raise SystemExit('definitive player import anchor missing')

if 'drawChibiPlayerAtlasV5({' in s:
    s = s.replace('drawChibiPlayerAtlasV5({', 'drawChibiPlayerDefinitive({', 1)
elif 'drawChibiPlayerDefinitive({' not in s:
    raise SystemExit('definitive player call anchor missing')

old = (
    '      hurt: p.hurtTimer > 0, dashing: p.dashTimer > 0, shooting: p.shootFlash > 0,\n'
    '      skinId: engine.equippedSkin, runtimeKey: p, shotSequence: p.shotCounter,'
)
new = (
    '      hurt: p.hurtTimer > 0, dashing: p.dashTimer > 0, shooting: p.shootFlash > 0,\n'
    '      dead: p.hp <= 0,\n'
    '      skinId: engine.equippedSkin, runtimeKey: p, shotSequence: p.shotCounter,'
)
if old in s:
    s = s.replace(old, new, 1)
elif '      dead: p.hp <= 0,' not in s:
    raise SystemExit('definitive player dead-state anchor missing')

old_guard = '  if (p.hp > 0) {\n    drawChibiPlayerDefinitive({'
new_guard = '  {\n    drawChibiPlayerDefinitive({'
if old_guard in s:
    s = s.replace(old_guard, new_guard, 1)

p.write_text(s, encoding='utf-8')
print('Activated definitive player renderer')
