from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p=Path(path); text=p.read_text(); count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old!r}')
    p.write_text(text.replace(old,new,1))

GEN='scripts/generate-player-chibi-v16.py'
RUNTIME='src/game/graphics/playerChibiAtlasV16.ts'

replace_once(GEN,"            anchor=(49.0,41.5+bob*.18)\n","            anchor=(47.0,41.5+bob*.18)\n")
replace_once(GEN,"            ellipse(im,(40.0,37.8+bob*.16,48.8,47.2+bob*.16),WING,INK,1.1)\n","            ellipse(im,(38.4,37.8+bob*.16,47.2,47.2+bob*.16),WING,INK,1.1)\n")
replace_once(GEN,"            translucent_ellipse(im,(41.2,39.0+bob*.16,45.6,40.5+bob*.16),'#f7db84',95)\n","            translucent_ellipse(im,(39.6,39.0+bob*.16,44.0,40.5+bob*.16),'#f7db84',95)\n")
replace_once(RUNTIME,"  return { x: feetX + 11.2, y: feetY - .4, a: Math.PI / 2 };\n","  return { x: feetX + 9.8, y: feetY - .4, a: Math.PI / 2 };\n")
print('shifted front projection left for late down-state clipping margin')
