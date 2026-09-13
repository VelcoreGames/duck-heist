from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:110]!r}')
    p.write_text(text.replace(old, new, 1))


GEN='scripts/generate-player-chibi-v16.py'
RUNTIME='src/game/graphics/playerChibiAtlasV16.ts'
INDEX='index.html'

# Dedicated front/back projections reuse the premium side-blaster geometry, but
# rotate it into screen-depth views so details survive without covering the face.
needle = """def pose(state: str, i: int, n: int):\n"""
insert = """def front_gun_layer(anchor: tuple[float,float], recoil: float=0.0, lowered: float=0.0, alpha: int=255):
    # Muzzle points toward the bottom of the screen. The detailed receiver stays
    # recognizable instead of collapsing into a featureless vertical rectangle.
    return gun_layer(270,(anchor[0],anchor[1]-recoil*.55),0,lowered,alpha)


def paste_front_gun(im, anchor, recoil=0.0, lowered=0.0, alpha=255):
    g,pos=front_gun_layer(anchor,recoil,lowered,alpha); im.alpha_composite(g,pos)


def rear_gun_layer(anchor: tuple[float,float], recoil: float=0.0, lowered: float=0.0, alpha: int=255):
    # Rear aim mirrors the projection upward and keeps the receiver outside the
    # right edge of the clean, hairless head silhouette.
    return gun_layer(90,(anchor[0],anchor[1]+recoil*.75),0,lowered,alpha)


def paste_rear_gun(im, anchor, recoil=0.0, lowered=0.0, alpha=255):
    g,pos=rear_gun_layer(anchor,recoil,lowered,alpha); im.alpha_composite(g,pos)


def pose(state: str, i: int, n: int):
"""
replace_once(GEN, needle, insert)

# Remove the old gun hidden behind the entire back silhouette; projected weapons
# are drawn after the head and then locked to the shoulder by the gripping wing.
replace_once(
    GEN,
    """    # Weapon behind the body only when aiming upward.\n    recoil=q['recoil']*.55\n    if direction=='up' and state not in ('celebrate',):\n        # Offset to the shoulder so the rear weapon remains readable instead of\n        # disappearing completely behind the large chibi head.\n        paste_gun(im,direction,(49.5,34.0+bob),recoil,q['lowered'])\n\n""",
    """    recoil=q['recoil']*.55\n\n""",
)

old_weapon = """    # Foreground weapon and gripping wing. It is integrated into every pose.\n    if direction!='up' and state!='celebrate':\n        if direction=='right': anchor=(45.2,38+bob*.25)\n        elif direction=='left': anchor=(18.8,38+bob*.25)\n        else: anchor=(40.5,43.0+bob*.18)\n        paste_gun(im,direction,anchor,recoil,q['lowered'])\n        gx=anchor[0]-(4 if direction=='right' else -4 if direction=='left' else 2)\n        gy=anchor[1]+(1 if direction=='down' else 0)\n        ellipse(im,(gx-3.6,gy-3.0,gx+3.6,gy+3.2),WING,INK,1.1)\n        translucent_ellipse(im,(gx-2.4,gy-2.2,gx+1.5,gy-1.0),'#f7db84',95)\n    elif direction=='up' and state!='celebrate':\n        # Wing closes over the shifted rear weapon grip.\n        ellipse(im,(41.0,35.0+bob*.2,50.8,46.0+bob*.2),WING,INK,1.1)\n"""
new_weapon = """    # Direction-specific weapon perspective. Side views use the long blaster,\n    # front/back views rotate the same premium receiver into depth.\n    if state!='celebrate':\n        if direction in ('left','right'):\n            anchor=(45.2,38+bob*.25) if direction=='right' else (18.8,38+bob*.25)\n            paste_gun(im,direction,anchor,recoil,q['lowered'])\n            gx=anchor[0]-(4 if direction=='right' else -4)\n            gy=anchor[1]\n            ellipse(im,(gx-3.6,gy-3.0,gx+3.6,gy+3.2),WING,INK,1.1)\n            translucent_ellipse(im,(gx-2.4,gy-2.2,gx+1.5,gy-1.0),'#f7db84',95)\n        elif direction=='down':\n            anchor=(49.0,41.5+bob*.18)\n            paste_front_gun(im,anchor,recoil,q['lowered'])\n            ellipse(im,(40.0,37.8+bob*.16,48.8,47.2+bob*.16),WING,INK,1.1)\n            translucent_ellipse(im,(41.2,39.0+bob*.16,45.6,40.5+bob*.16),'#f7db84',95)\n        else:\n            anchor=(51.0,32.0+bob)\n            paste_rear_gun(im,anchor,recoil,q['lowered'])\n            ellipse(im,(41.8,35.0+bob*.2,51.3,46.2+bob*.2),WING,INK,1.1)\n            translucent_ellipse(im,(43.0,36.0+bob*.2,47.2,37.3+bob*.2),'#f7db84',72)\n"""
replace_once(GEN, old_weapon, new_weapon)

# Runtime combat feedback: align muzzle points to the authored projections and
# make recoil/flash visible at gameplay scale without changing weapon mechanics.
replace_once(
    RUNTIME,
    """    const kick = .82 * (tick <= 4 ? 1 - Math.pow(1 - attack, 3) : Math.pow(recover, 1.6));\n""",
    """    const kick = 1.05 * (tick <= 4 ? 1 - Math.pow(1 - attack, 3) : Math.pow(recover, 1.72));\n""",
)
replace_once(
    RUNTIME,
    """    else if (dir === 'up') dy = kick * .68;\n    else dy = -kick * .48;\n    scaleX = 1 + kick * .018; scaleY = 1 - kick * .016;\n""",
    """    else if (dir === 'up') dy = kick * .72;\n    else dy = -kick * .54;\n    scaleX = 1 + kick * .020; scaleY = 1 - kick * .018;\n""",
)
replace_once(
    RUNTIME,
    """  if (dir === 'right') return { x: feetX + 20.0, y: feetY - 13.0, a: 0 };\n  if (dir === 'left') return { x: feetX - 20.0, y: feetY - 13.0, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 11.5, y: feetY - 27.0, a: -Math.PI / 2 };\n  return { x: feetX + 10.8, y: feetY + .2, a: 1.08 };\n""",
    """  if (dir === 'right') return { x: feetX + 17.6, y: feetY - 13.0, a: 0 };\n  if (dir === 'left') return { x: feetX - 17.6, y: feetY - 13.0, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 12.5, y: feetY - 27.6, a: -Math.PI / 2 };\n  return { x: feetX + 11.2, y: feetY - .4, a: Math.PI / 2 };\n""",
)
replace_once(
    RUNTIME,
    """  if (tick > 4) return;\n  const p = muzzlePoint(dir, feetX, feetY);\n  const fade = Math.max(.10, 1 - tick / 5);\n""",
    """  if (tick > 6) return;\n  const p = muzzlePoint(dir, feetX, feetY);\n  const fade = Math.max(.08, 1 - tick / 7);\n""",
)
replace_once(
    RUNTIME,
    """  ctx.moveTo(0, 0); ctx.lineTo(6.8, -2.2); ctx.lineTo(4.4, 0); ctx.lineTo(7.6, 2.2); ctx.closePath(); ctx.fill();\n  ctx.globalAlpha = alpha * fade * .52;\n  ctx.fillStyle = '#f5a933';\n  ctx.beginPath(); ctx.ellipse(2.2, 0, 5.8, 3.4, 0, 0, Math.PI * 2); ctx.fill();\n""",
    """  ctx.moveTo(0, 0); ctx.lineTo(8.7, -2.7); ctx.lineTo(5.4, 0); ctx.lineTo(9.4, 2.7); ctx.closePath(); ctx.fill();\n  ctx.globalAlpha = alpha * fade * .58;\n  ctx.fillStyle = '#f5a933';\n  ctx.beginPath(); ctx.ellipse(2.7, 0, 6.9, 3.9, 0, 0, Math.PI * 2); ctx.fill();\n  ctx.globalAlpha = alpha * fade * .9;\n  ctx.fillStyle = '#fff9d8';\n  ctx.beginPath(); ctx.arc(.8, 0, 1.35, 0, Math.PI * 2); ctx.fill();\n""",
)
# V16.3 already tracks muzzle coordinates with runtime recoil translation; keep
# that invariant explicit so this patch fails if the renderer regresses.
replace_once(
    RUNTIME,
    """  if (state === 'shoot') drawMuzzle(ctx, input.dir, feetX + pose.dx, feetY + pose.dy, tick, alpha);\n""",
    """  if (state === 'shoot') drawMuzzle(ctx, input.dir, feetX + pose.dx, feetY + pose.dy, tick, alpha);\n""",
)
replace_once(INDEX,'0.7.41-chibi-v16-weapon-perspective','0.7.42-chibi-v16-combat-readability')

print('patched v0.7.42 projected premium weapons, muzzle alignment and recoil readability')