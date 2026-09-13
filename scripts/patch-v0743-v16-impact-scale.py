from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text=path.read_text()
    count=text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:120]!r}')
    path.write_text(text.replace(old,new,1))

GEN=Path('scripts/generate-player-chibi-v16.py')
RUNTIME=Path('src/game/graphics/playerChibiAtlasV16.ts')
INDEX=Path('index.html')

# Slightly larger gameplay presentation. This is renderer-only and does not alter
# collision, physics, player coordinates or any hitbox dimensions.
replace_once(RUNTIME, 'const DRAW = 42;\n', 'const DRAW = 44;\n')
replace_once(
    RUNTIME,
    """    const impact = Math.max(0, 1 - tick / 14);\n    const snap = tick < 3 ? -1 : tick < 7 ? .55 : -.18;\n    rotation = snap * .048 * impact;\n    const v = dashVector(dir);\n    dx = -v.x * impact * .82; dy = -v.y * impact * .52 - impact * .34;\n""",
    """    const impact = Math.max(0, 1 - tick / 14);\n    const snap = tick < 3 ? -1 : tick < 7 ? .58 : -.20;\n    rotation = snap * .062 * impact;\n    const v = dashVector(dir);\n    dx = -v.x * impact * 1.05; dy = -v.y * impact * .70 - impact * .48;\n    scaleX = 1 + impact * .024; scaleY = 1 - impact * .030;\n""",
)
replace_once(
    RUNTIME,
    """    const settle = Math.min(1, index / Math.max(1, COUNT.down - 1));\n    scaleX = 1 + settle * .038; scaleY = 1 - settle * .040; dy = settle * .44;\n""",
    """    const settle = Math.min(1, index / Math.max(1, COUNT.down - 1));\n    const contact = Math.sin(Math.min(1, settle * 1.35) * Math.PI);\n    scaleX = 1 + settle * .052 + contact * .010;\n    scaleY = 1 - settle * .052 - contact * .008;\n    dy = settle * .65;\n""",
)
replace_once(
    RUNTIME,
    """  const w = (state === 'down' ? 11.8 : state === 'dash' ? 10.0 : 9.45) * (1 - airborne * .12);\n  const h = (state === 'down' ? 2.95 : 2.36) * (1 - airborne * .08);\n""",
    """  const w = (state === 'down' ? 12.25 : state === 'dash' ? 10.4 : 9.85) * (1 - airborne * .12);\n  const h = (state === 'down' ? 3.05 : 2.46) * (1 - airborne * .08);\n""",
)
replace_once(
    RUNTIME,
    """  if (dir === 'right') return { x: feetX + 17.6, y: feetY - 13.0, a: 0 };\n  if (dir === 'left') return { x: feetX - 17.6, y: feetY - 13.0, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 11.7, y: feetY - 27.8, a: -Math.PI / 2 };\n  return { x: feetX + 8.7, y: feetY - .5, a: Math.PI / 2 };\n""",
    """  if (dir === 'right') return { x: feetX + 18.45, y: feetY - 13.6, a: 0 };\n  if (dir === 'left') return { x: feetX - 18.45, y: feetY - 13.6, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 12.25, y: feetY - 29.15, a: -Math.PI / 2 };\n  return { x: feetX + 9.1, y: feetY - .55, a: Math.PI / 2 };\n""",
)
replace_once(
    RUNTIME,
    """  ctx.globalAlpha = alpha * t * .65;\n  ctx.strokeStyle = '#fff2c8';\n  ctx.lineWidth = 1.2;\n""",
    """  ctx.globalCompositeOperation = 'lighter';\n  ctx.globalAlpha = alpha * t * .72;\n  ctx.strokeStyle = '#fff2c8';\n  ctx.lineWidth = 1.28;\n""",
)

# Stronger authored hurt snap and a slightly clearer terminal fall. Base duck
# remains clean-headed: no hair, eyewear or added costume elements.
replace_once(
    GEN,
    """    elif state=='hurt':\n        t=i/(n-1); impact=1-t\n        snap=(1 if i<2 else -1 if i<4 else .42 if i<6 else 0)\n        q['hurt']=impact; q['lean']=snap*3.25*impact; q['bob']=-1.35*impact; q['squash']=.055*impact; q['blink']=True\n""",
    """    elif state=='hurt':\n        t=i/(n-1); impact=1-t\n        snap=(1 if i<2 else -1 if i<4 else .46 if i<6 else 0)\n        q['hurt']=impact; q['lean']=snap*4.10*impact; q['bob']=-1.65*impact\n        q['squash']=.065*impact; q['wing']=1.65*impact; q['lowered']=1.45*impact; q['blink']=True\n""",
)
replace_once(GEN, "ang=64*turn_sign*(1-(1-down)**2)\n", "ang=68*turn_sign*(1-(1-down)**2)\n")
replace_once(GEN, "translate=(S(turn_sign*3.6*down),S(7.2*down))", "translate=(S(turn_sign*3.4*down),S(7.6*down))")
replace_once(GEN, "a:int(a*.11*q['hurt'])", "a:int(a*.15*q['hurt'])")

replace_once(INDEX, '0.7.42-chibi-v16-combat-readability', '0.7.43-chibi-v16-impact-scale')

print('patched v0.7.43 visual scale, hurt snap and down settle; gameplay/hitboxes unchanged')
