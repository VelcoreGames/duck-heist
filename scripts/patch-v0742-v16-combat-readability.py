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

# Front/back weapons are authored as true screen-depth projections instead of
# simply rotating the long side-view rifle. This preserves the premium receiver
# language while avoiding the previous vertical-bar silhouette.
needle = """def pose(state: str, i: int, n: int):\n"""
insert = """def front_gun_layer(anchor: tuple[float,float], recoil: float=0.0, lowered: float=0.0, alpha: int=255):
    # Front/down aim: compact receiver at the shoulder, short foreshortened
    # barrel and a clearly visible muzzle ring toward the bottom of the screen.
    local=Image.new('RGBA',(S(20),S(25)),(0,0,0,0)); d=ImageDraw.Draw(local)
    d.rounded_rectangle(box(6.0,3.5,14.6,16.4), radius=S(1.45), fill=rgba(GUN_DARK,alpha), outline=rgba(INK,alpha), width=S(1.0))
    d.rounded_rectangle(box(7.1,4.6,13.5,14.4), radius=S(.8), fill=rgba(GUN_MID,alpha))
    d.rounded_rectangle(box(8.0,5.1,10.1,12.8), radius=S(.38), fill=rgba(GUN_HI,int(alpha*.92)))
    d.rounded_rectangle(box(7.0,14.0,13.9,20.3), radius=S(1.0), fill=rgba('#435159',alpha), outline=rgba(INK,alpha), width=S(.85))
    d.ellipse(box(5.8,18.1,15.1,24.0), fill=rgba('#182127',alpha), outline=rgba(INK,alpha), width=S(.9))
    d.ellipse(box(7.2,19.4,13.7,22.8), fill=rgba('#71848b',alpha))
    d.ellipse(box(8.2,20.0,12.7,22.1), fill=rgba('#dbe5e1',int(alpha*.72)))
    d.polygon([(S(6.7),S(10.0)),(S(2.8),S(12.2)),(S(4.0),S(18.1)),(S(7.7),S(15.9))], fill=rgba(WOOD,alpha))
    d.line([(S(4.0),S(12.8)),(S(6.5),S(11.5))], fill=rgba(BRASS,alpha), width=S(.75))
    cx=S(anchor[0]); cy=S(anchor[1]+lowered-recoil*.58)
    return local,(int(cx-local.width/2),int(cy-local.height/2))


def paste_front_gun(im, anchor, recoil=0.0, lowered=0.0, alpha=255):
    g,pos=front_gun_layer(anchor,recoil,lowered,alpha); im.alpha_composite(g,pos)


def rear_gun_layer(anchor: tuple[float,float], recoil: float=0.0, lowered: float=0.0, alpha: int=255):
    # Rear/up aim: narrow barrel above the right shoulder, compact receiver and
    # tucked stock below it. The clean hairless head remains the dominant shape.
    local=Image.new('RGBA',(S(19),S(27)),(0,0,0,0)); d=ImageDraw.Draw(local)
    d.ellipse(box(5.4,.5,14.2,5.2), fill=rgba('#182127',alpha), outline=rgba(INK,alpha), width=S(.85))
    d.ellipse(box(6.7,1.3,12.9,4.1), fill=rgba('#71848b',alpha))
    d.rounded_rectangle(box(6.2,3.2,13.7,16.8), radius=S(1.15), fill=rgba(GUN_DARK,alpha), outline=rgba(INK,alpha), width=S(.95))
    d.rounded_rectangle(box(7.2,4.0,12.6,14.7), radius=S(.7), fill=rgba(GUN_MID,alpha))
    d.rounded_rectangle(box(8.0,4.3,9.8,12.5), radius=S(.32), fill=rgba(GUN_HI,int(alpha*.9)))
    d.rounded_rectangle(box(5.5,14.8,14.3,20.2), radius=S(.9), fill=rgba('#3f4d55',alpha), outline=rgba(INK,alpha), width=S(.8))
    d.polygon([(S(7.0),S(17.0)),(S(3.1),S(19.7)),(S(4.4),S(26.0)),(S(8.2),S(22.6))], fill=rgba(WOOD,alpha))
    d.rectangle(box(11.9,16.6,17.0,18.4), fill=rgba(BRASS,alpha))
    cx=S(anchor[0]); cy=S(anchor[1]+lowered+recoil*.74)
    return local,(int(cx-local.width/2),int(cy-local.height/2))


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
new_weapon = """    # Direction-specific weapon perspective. Side views retain the long hero
    # blaster; front/back use compact screen-depth projections with visible grip.
    if state!='celebrate':\n        if direction in ('left','right'):\n            anchor=(45.2,38+bob*.25) if direction=='right' else (18.8,38+bob*.25)\n            paste_gun(im,direction,anchor,recoil,q['lowered'])\n            gx=anchor[0]-(4 if direction=='right' else -4)\n            gy=anchor[1]\n            ellipse(im,(gx-3.6,gy-3.0,gx+3.6,gy+3.2),WING,INK,1.1)\n            translucent_ellipse(im,(gx-2.4,gy-2.2,gx+1.5,gy-1.0),'#f7db84',95)\n        elif direction=='down':\n            anchor=(47.0,41.5+bob*.18)\n            paste_front_gun(im,anchor,recoil,q['lowered'])\n            ellipse(im,(39.3,37.6+bob*.16,47.6,46.8+bob*.16),WING,INK,1.1)\n            translucent_ellipse(im,(40.5,38.7+bob*.16,44.7,40.1+bob*.16),'#f7db84',95)\n        else:\n            anchor=(50.2,31.7+bob)\n            paste_rear_gun(im,anchor,recoil,q['lowered'])\n            ellipse(im,(41.2,34.8+bob*.2,50.8,45.8+bob*.2),WING,INK,1.1)\n            translucent_ellipse(im,(42.5,35.8+bob*.2,46.8,37.2+bob*.2),'#f7db84',72)\n"""
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
    """  if (dir === 'right') return { x: feetX + 17.6, y: feetY - 13.0, a: 0 };\n  if (dir === 'left') return { x: feetX - 17.6, y: feetY - 13.0, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 12.0, y: feetY - 28.0, a: -Math.PI / 2 };\n  return { x: feetX + 9.1, y: feetY - .2, a: Math.PI / 2 };\n""",
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

print('patched v0.7.42 compact projected weapons, muzzle alignment and recoil readability')
