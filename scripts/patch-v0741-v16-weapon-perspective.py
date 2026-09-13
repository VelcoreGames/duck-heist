from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))


GEN='scripts/generate-player-chibi-v16.py'
RUNTIME='src/game/graphics/playerChibiAtlasV16.ts'
INDEX='index.html'

# Front view: lower and foreshorten the gun so the face remains completely readable.
replace_once(
    GEN,
    "    else:\n        angle=74; ay-=recoil*.72\n",
    "    else:\n        # Front aim uses a foreshortened diagonal instead of a near-vertical rifle\n        # crossing the hero's face. Keep recoil along the authored screen axis.\n        angle=62; ay-=recoil*.42\n",
)
replace_once(
    GEN,
    "        else: anchor=(39.5,38.2+bob*.25)\n",
    "        else: anchor=(40.5,43.0+bob*.18)\n",
)

# Back view: expose enough of the weapon outside the head silhouette to read as armed,
# while the wing still closes over the grip so it does not float.
replace_once(
    GEN,
    "        paste_gun(im,direction,(47.4,32.2+bob),recoil,q['lowered'])\n",
    "        paste_gun(im,direction,(49.5,34.0+bob),recoil,q['lowered'])\n",
)
replace_once(
    GEN,
    "        ellipse(im,(40.0,33.5+bob*.2,50.0,44.5+bob*.2),WING,INK,1.1)\n",
    "        ellipse(im,(41.0,35.0+bob*.2,50.8,46.0+bob*.2),WING,INK,1.1)\n",
)

# Runtime muzzle anchors must match the authored barrel endpoints after perspective changes.
replace_once(
    RUNTIME,
    "  if (dir === 'right') return { x: feetX + 18.0, y: feetY - 13.0, a: 0 };\n  if (dir === 'left') return { x: feetX - 18.0, y: feetY - 13.0, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 3.0, y: feetY - 27.6, a: -Math.PI / 2 };\n  return { x: feetX + 7.0, y: feetY - 3.2, a: 1.29 };\n",
    "  if (dir === 'right') return { x: feetX + 20.0, y: feetY - 13.0, a: 0 };\n  if (dir === 'left') return { x: feetX - 20.0, y: feetY - 13.0, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 11.5, y: feetY - 27.0, a: -Math.PI / 2 };\n  return { x: feetX + 10.8, y: feetY + .2, a: 1.08 };\n",
)

replace_once(INDEX,'0.7.40-chibi-v16-hero-pass','0.7.41-chibi-v16-weapon-perspective')
print('patched v0.7.41 front/back weapon perspective and muzzle alignment')
