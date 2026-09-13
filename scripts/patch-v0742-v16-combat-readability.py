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

# Dedicated front/back weapon perspectives. Side views retain the detailed hero blaster.
needle = """def pose(state: str, i: int, n: int):\n"""
insert = """def front_gun_layer(anchor: tuple[float,float], recoil: float=0.0, lowered: float=0.0, alpha: int=255):
    # Foreshortened front view: the muzzle points toward the bottom of the screen
    # without running across the duck's eyes or beak.
    local=Image.new('RGBA',(S(20),S(30)),(0,0,0,0)); d=ImageDraw.Draw(local)
    d.rounded_rectangle(box(7.0,3.0,14.0,20.5), radius=S(1.45), fill=rgba(GUN_DARK,alpha), outline=rgba(INK,alpha), width=S(1.0))
    d.rounded_rectangle(box(8.1,4.1,12.9,17.2), radius=S(.75), fill=rgba(GUN_MID,alpha))
    d.rounded_rectangle(box(9.0,4.7,10.7,14.2), radius=S(.35), fill=rgba(GUN_HI,int(alpha*.92)))
    d.rounded_rectangle(box(5.8,17.0,15.2,24.0), radius=S(1.15), fill=rgba('#263139',alpha), outline=rgba(INK,alpha), width=S(.9))
    d.rounded_rectangle(box(7.0,20.0,14.1,25.5), radius=S(.7), fill=rgba('#65757b',alpha))
    d.rectangle(box(8.0,22.2,13.2,23.2), fill=rgba('#e3ece9',int(alpha*.78)))
    d.polygon([(S(7.2),S(12.0)),(S(3.3),S(14.0)),(S(4.2),S(21.0)),(S(8.2),S(18.4))], fill=rgba(WOOD,alpha))
    cx=S(anchor[0]); cy=S(anchor[1]+lowered-recoil*.55)
    return local,(int(cx-local.width/2),int(cy-local.height/2))


def paste_front_gun(im, anchor, recoil=0.0, lowered=0.0, alpha=255):
    g,pos=front_gun_layer(anchor,recoil,lowered,alpha); im.alpha_composite(g,pos)


def rear_gun_layer(anchor: tuple[float,float], recoil: float=0.0, lowered: float=0.0, alpha: int=255):
    # Rear view exposes the barrel along the right shoulder. It is deliberately
    # narrow so the clean, hairless head silhouette remains dominant.
    local=Image.new('RGBA',(S(18),S(32)),(0,0,0,0)); d=ImageDraw.Draw(local)
    d.rounded_rectangle(box(6.0,2.0,13.2,25.0), radius=S(1.35), fill=rgba(GUN_DARK,alpha), outline=rgba(INK,alpha), width=S(1.0))
    d.rounded_rectangle(box(7.2,3.0,12.0,21.5), radius=S(.7), fill=rgba(GUN_MID,alpha))
    d.rounded_rectangle(box(8.0,3.6,9.7,18.0), radius=S(.3), fill=rgba(GUN_HI,int(alpha*.92)))
    d.rounded_rectangle(box(5.2,1.0,14.0,6.0), radius=S(.8), fill=rgba('#65757b',alpha), outline=rgba(INK,alpha), width=S(.8))
    d.rectangle(box(7.0,1.8,12.4,2.8), fill=rgba('#e5eeeb',int(alpha*.78)))
    d.polygon([(S(7.0),S(18.0)),(S(3.0),S(21.0)),(S(4.5),S(29.0)),(S(8.5),S(25.0))], fill=rgba(WOOD,alpha))
    cx=S(anchor[0]); cy=S(anchor[1]+lowered+recoil*.75)
    return local,(int(cx-local.width/2),int(cy-local.height/2))


def paste_rear_gun(im, anchor, recoil=0.0, lowered=0.0, alpha=255):
    g,pos=rear_gun_layer(anchor,recoil,lowered,alpha); im.alpha_composite(g,pos)


def pose(state: str, i: int, n: int):
"""
replace_once(GEN, needle, insert)

# Remove the old gun hidden behind the entire back silhouette; the dedicated rear
# weapon is drawn after the head and then locked to the shoulder by the wing.
replace_once(
    GEN,
    """    # Weapon behind the body only when aiming upward.\n    recoil=q['recoil']*.55\n    if direction=='up' and state not in ('celebrate',):\n        # Offset to the shoulder so the rear weapon remains readable instead of\n        # disappearing completely behind the large chibi head.\n        paste_gun(im,direction,(49.5,34.0+bob),recoil,q['lowered'])\n\n""",
    """    recoil=q['recoil']*.55\n\n""",
)

old_weapon = """    # Foreground weapon and gripping wing. It is integrated into every pose.\n    if direction!='up' and state!='celebrate':\n        if direction=='right': anchor=(45.2,38+bob*.25)\n        elif direction=='left': anchor=(18.8,38+bob*.25)\n        else: anchor=(40.5,43.0+bob*.18)\n        paste_gun(im,direction,anchor,recoil,q['lowered'])\n        gx=anchor[0]-(4 if direction=='right' else -4 if direction=='left' else 2)\n        gy=anchor[1]+(1 if direction=='down' else 0)\n        ellipse(im,(gx-3.6,gy-3.0,gx+3.6,gy+3.2),WING,INK,1.1)\n        translucent_ellipse(im,(gx-2.4,gy-2.2,gx+1.5,gy-1.0),'#f7db84',95)\n    elif direction=='up' and state!='celebrate':\n        # Wing closes over the shifted rear weapon grip.\n        ellipse(im,(41.0,35.0+bob*.2,50.8,46.0+bob*.2),WING,INK,1.1)\n"""
new_weapon = """    # Direction-specific weapon perspective. Side views use the long blaster,\n    # front/back views use compact authored projections so the gun stays readable\n    # without obscuring the face or disappearing behind the head.\n    if state!='celebrate':\n        if direction in ('left','right'):\n            anchor=(45.2,38+bob*.25) if direction=='right' else (18.8,38+bob*.25)\n            paste_gun(im,direction,anchor,recoil,q['lowered'])\n            gx=anchor[0]-(4 if direction=='right' else -4)\n            gy=anchor[1]\n            ellipse(im,(gx-3.6,gy-3.0,gx+3.6,gy+3.2),WING,INK,1.1)\n            translucent_ellipse(im,(gx-2.4,gy-2.2,gx+1.5,gy-1.0),'#f7db84',95)\n        elif direction=='down':\n            anchor=(46.0,43.0+bob*.18)\n            paste_front_gun(im,anchor,recoil,q['lowered'])\n            ellipse(im,(38.2,39.0+bob*.16,45.8,47.0+bob*.16),WING,INK,1.1)\n            translucent_ellipse(im,(39.2,40.0+bob*.16,43.4,41.4+bob*.16),'#f7db84',95)\n        else:\n            anchor=(52.0,32.0+bob)\n            paste_rear_gun(im,anchor,recoil,q['lowered'])\n            ellipse(im,(42.0,35.0+bob*.2,51.6,46.2+bob*.2),WING,INK,1.1)\n            translucent_ellipse(im,(43.1,36.0+bob*.2,47.3,37.3+bob*.2),'#f7db84',72)\n"""
replace_once(GEN, old_weapon, new_weapon)

# Runtime combat feedback: muzzle coordinates now match the authored barrel tips,
# muzzle flash tracks visual recoil, and the recoil layer has a crisper attack.
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
    """  if (dir === 'right') return { x: feetX + 17.6, y: feetY - 13.0, a: 0 };\n  if (dir === 'left') return { x: feetX - 17.6, y: feetY - 13.0, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 13.1, y: feetY - 27.6, a: -Math.PI / 2 };\n  return { x: feetX + 9.2, y: feetY - 2.0, a: Math.PI / 2 };\n""",
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

print('patched v0.7.42 dedicated front/back weapons, muzzle alignment and recoil readability')