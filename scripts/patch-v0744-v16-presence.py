from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text=path.read_text()
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:120]!r}')
    path.write_text(text.replace(old,new,1))

RUNTIME=Path('src/game/graphics/playerChibiAtlasV16.ts')
INDEX=Path('index.html')

# A/B candidate: increase only rendered presence. Player coordinates, collision,
# physics, movement, weapon mechanics and hitboxes are untouched.
replace_once(RUNTIME, 'const DRAW = 44;\n', 'const DRAW = 46;\n')
replace_once(
    RUNTIME,
    """  const w = (state === 'down' ? 12.25 : state === 'dash' ? 10.4 : 9.85) * (1 - airborne * .12);\n  const h = (state === 'down' ? 3.05 : 2.46) * (1 - airborne * .08);\n""",
    """  const w = (state === 'down' ? 12.55 : state === 'dash' ? 10.65 : 10.05) * (1 - airborne * .12);\n  const h = (state === 'down' ? 3.10 : 2.50) * (1 - airborne * .08);\n""",
)
replace_once(
    RUNTIME,
    """  if (dir === 'right') return { x: feetX + 18.45, y: feetY - 13.6, a: 0 };\n  if (dir === 'left') return { x: feetX - 18.45, y: feetY - 13.6, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 12.25, y: feetY - 29.15, a: -Math.PI / 2 };\n  return { x: feetX + 9.1, y: feetY - .55, a: Math.PI / 2 };\n""",
    """  if (dir === 'right') return { x: feetX + 19.25, y: feetY - 14.2, a: 0 };\n  if (dir === 'left') return { x: feetX - 19.25, y: feetY - 14.2, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 12.80, y: feetY - 30.45, a: -Math.PI / 2 };\n  return { x: feetX + 9.50, y: feetY - .58, a: Math.PI / 2 };\n""",
)
replace_once(INDEX, '0.7.43-chibi-v16-impact-scale', '0.7.44-chibi-v16-presence-candidate')
print('patched v0.7.44 visual-presence candidate; gameplay/hitboxes unchanged')
