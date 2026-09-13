from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:90]!r}')
    p.write_text(text.replace(old, new, 1))


GEN = 'scripts/generate-player-chibi-v16.py'
RUNTIME = 'src/game/graphics/playerChibiAtlasV16.ts'
INDEX = 'index.html'

# --- Art: stronger hero silhouette and weapon integration -----------------
replace_once(
    GEN,
    "    # Compact blaster, designed to read at 30-ish final pixels without becoming a black block.\n    local=Image.new('RGBA',(S(32),S(18)),(0,0,0,0)); d=ImageDraw.Draw(local)\n    d.rounded_rectangle(box(3,5,27,12), radius=S(2.1), fill=rgba(GUN_DARK,alpha), outline=rgba(INK,alpha), width=S(1.1))\n    d.rounded_rectangle(box(6,6,23,9.5), radius=S(1), fill=rgba(GUN_MID,alpha))\n    d.rounded_rectangle(box(8,6.25,19,7.15), radius=S(.35), fill=rgba(GUN_HI,int(alpha*.9)))\n    d.rounded_rectangle(box(25,6.1,31,9.8), radius=S(.8), fill=rgba('#697980',alpha))\n    d.rectangle(box(27,6.6,31,7.25), fill=rgba('#d9e2df',int(alpha*.72)))\n    d.rounded_rectangle(box(4.2,7.3,7.1,10.4), radius=S(.6), fill=rgba(BRASS,alpha))\n    d.polygon([(S(15),S(10)),(S(20),S(10)),(S(18.2),S(17)),(S(14.2),S(17))], fill=rgba(INK,alpha))\n    d.rounded_rectangle(box(15.2,11,18.2,16), radius=S(.6), fill=rgba(WOOD,alpha))\n",
    "    # Compact hero blaster: readable metal planes, a short stock and a tucked grip.\n    # It stays visually attached to the wing instead of reading like a floating prop.\n    local=Image.new('RGBA',(S(34),S(18)),(0,0,0,0)); d=ImageDraw.Draw(local)\n    d.rounded_rectangle(box(3,5,28.5,12), radius=S(2.0), fill=rgba(GUN_DARK,alpha), outline=rgba(INK,alpha), width=S(1.1))\n    d.rounded_rectangle(box(6.2,6.0,24.2,9.55), radius=S(.9), fill=rgba(GUN_MID,alpha))\n    d.rounded_rectangle(box(8.2,6.18,20.6,7.1), radius=S(.32), fill=rgba(GUN_HI,int(alpha*.92)))\n    d.rounded_rectangle(box(26.3,6.05,33.0,9.9), radius=S(.72), fill=rgba('#697980',alpha))\n    d.rectangle(box(29.0,6.52,33.0,7.22), fill=rgba('#e4ece8',int(alpha*.78)))\n    d.rounded_rectangle(box(3.6,7.1,7.3,10.6), radius=S(.62), fill=rgba(BRASS,alpha))\n    d.polygon([(S(14.7),S(10)),(S(20.0),S(10)),(S(18.1),S(17)),(S(14.0),S(17))], fill=rgba(INK,alpha))\n    d.rounded_rectangle(box(15.0,10.9,18.1,16.1), radius=S(.55), fill=rgba(WOOD,alpha))\n    d.rounded_rectangle(box(4.3,10.6,11.2,12.6), radius=S(.55), fill=rgba('#6f452a',alpha))\n",
)
replace_once(
    GEN,
    "        q['bob']=-1.55*abs(sin(phase))\n        q['lean']=.92*sin(phase)\n        q['wing']=1.45*sin(phase+pi)\n        q['sway']=1.15*cos(phase)\n        q['plant']=cos(phase*2)\n",
    "        q['bob']=-1.35*abs(sin(phase))\n        q['lean']=.82*sin(phase)\n        q['wing']=1.55*sin(phase+pi)\n        q['sway']=1.35*cos(phase)\n        q['plant']=cos(phase*2)\n",
)
replace_once(
    GEN,
    "    head_cx=32 + (2.2*sign if side else vertical_sway*.42)\n    head_cy=22+bob\n    body_cx=32 + (.7*sign*q['lean']/4 if side else vertical_sway*.78)\n    body_cy=42+bob*.35\n    rx=18.2*(1+q['squash']*.12-q['stretch']*.05)\n    ry=16.9*(1-q['squash']*.10+q['stretch']*.03)\n    body_rx=10.7*(1+q['squash']*.45+q['stretch']*.18)\n    body_ry=12.4*(1-q['squash']*.40+q['stretch']*.18)\n",
    "    head_cx=32 + (2.4*sign if side else vertical_sway*.46)\n    head_cy=22+bob\n    body_cx=32 + (.65*sign*q['lean']/4 if side else vertical_sway*.82)\n    body_cy=42.2+bob*.35\n    rx=18.4*(1+q['squash']*.12-q['stretch']*.05)\n    ry=17.0*(1-q['squash']*.10+q['stretch']*.03)\n    body_rx=11.0*(1+q['squash']*.45+q['stretch']*.18)\n    body_ry=12.6*(1-q['squash']*.40+q['stretch']*.18)\n",
)
replace_once(
    GEN,
    "        lfx=27.5+q['sway']*.16; rfx=36.5+q['sway']*.16\n        lfy=fy+stride*2.75; rfy=fy-stride*2.75\n        depth=.11*stride\n",
    "        lfx=27.5+q['sway']*.19; rfx=36.5+q['sway']*.19\n        lfy=fy+stride*3.05; rfy=fy-stride*3.05\n        depth=.13*stride\n",
)
replace_once(GEN, "        paste_gun(im,direction,(46.5,31.5+bob),recoil,q['lowered'])\n", "        paste_gun(im,direction,(47.4,32.2+bob),recoil,q['lowered'])\n")
replace_once(
    GEN,
    "        if direction=='right': anchor=(45.5,38+bob*.25)\n        elif direction=='left': anchor=(18.5,38+bob*.25)\n        else: anchor=(39.5,38.5+bob*.25)\n",
    "        if direction=='right': anchor=(45.2,38+bob*.25)\n        elif direction=='left': anchor=(18.8,38+bob*.25)\n        else: anchor=(39.5,38.2+bob*.25)\n",
)
replace_once(GEN, "        ellipse(im,(39.0,33+bob*.2,49.0,44+bob*.2),WING,INK,1.1)\n", "        ellipse(im,(40.0,33.5+bob*.2,50.0,44.5+bob*.2),WING,INK,1.1)\n")

# --- Runtime: larger readable hero, cleaner dash, stronger vertical gait ---
replace_once(RUNTIME, "const DRAW = 40;\n", "const DRAW = 42;\n")
replace_once(RUNTIME, "    const strideDistance = vertical ? 34 : 40;\n", "    const strideDistance = vertical ? 32 : 38;\n")
replace_once(
    RUNTIME,
    "    dx = vertical ? stride * .34 : stride * .20;\n    dy = -lift * .58;\n    rotation = vertical ? stride * .008 : stride * (dir === 'left' ? -.012 : .012);\n",
    "    const plant = Math.cos(phase * 2);\n    dx = vertical ? stride * .42 : stride * .23;\n    dy = vertical ? -lift * .68 : -lift * .58;\n    scaleX = 1 + plant * .005;\n    scaleY = 1 - plant * .006;\n    rotation = vertical ? stride * .010 : stride * (dir === 'left' ? -.013 : .013);\n",
)
replace_once(
    RUNTIME,
    "    rotation = snap * .038 * impact;\n    const v = dashVector(dir);\n    dx = -v.x * impact * .68; dy = -v.y * impact * .45 - impact * .28;\n",
    "    rotation = snap * .048 * impact;\n    const v = dashVector(dir);\n    dx = -v.x * impact * .82; dy = -v.y * impact * .52 - impact * .34;\n",
)
replace_once(
    RUNTIME,
    "    scaleX = 1 + settle * .025; scaleY = 1 - settle * .028; dy = settle * .34;\n",
    "    scaleX = 1 + settle * .038; scaleY = 1 - settle * .040; dy = settle * .44;\n",
)
replace_once(RUNTIME, "  ctx.filter = 'saturate(1.045) contrast(1.028)';\n", "  ctx.filter = 'saturate(1.060) contrast(1.035)';\n")
replace_once(
    RUNTIME,
    "  const w = (state === 'down' ? 11.2 : state === 'dash' ? 9.6 : 9.0) * (1 - airborne * .12);\n  const h = (state === 'down' ? 2.8 : 2.25) * (1 - airborne * .08);\n",
    "  const w = (state === 'down' ? 11.8 : state === 'dash' ? 10.0 : 9.45) * (1 - airborne * .12);\n  const h = (state === 'down' ? 2.95 : 2.36) * (1 - airborne * .08);\n",
)
replace_once(
    RUNTIME,
    "  if (dir === 'right') return { x: feetX + 16.5, y: feetY - 12.5, a: 0 };\n  if (dir === 'left') return { x: feetX - 16.5, y: feetY - 12.5, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 2.4, y: feetY - 26.2, a: -Math.PI / 2 };\n  return { x: feetX + 6.5, y: feetY - 2.8, a: 1.29 };\n",
    "  if (dir === 'right') return { x: feetX + 18.0, y: feetY - 13.0, a: 0 };\n  if (dir === 'left') return { x: feetX - 18.0, y: feetY - 13.0, a: Math.PI };\n  if (dir === 'up') return { x: feetX + 3.0, y: feetY - 27.6, a: -Math.PI / 2 };\n  return { x: feetX + 7.0, y: feetY - 3.2, a: 1.29 };\n",
)
replace_once(
    RUNTIME,
    "  for (let i = 0; i < 4; i++) {\n    const side = (i - 1.5) * 3.0;\n",
    "  for (let i = 0; i < 3; i++) {\n    const side = (i - 1) * 3.4;\n",
)
replace_once(
    RUNTIME,
    "    ctx.globalAlpha = alpha * (1 - t) * (.11 + i * .025);\n    ctx.strokeStyle = i % 2 ? '#f4c95d' : '#fff0b5';\n    ctx.lineWidth = 1.15 + (3 - i) * .12;\n",
    "    ctx.globalAlpha = alpha * (1 - t) * (.13 + i * .022);\n    ctx.strokeStyle = i % 2 ? '#f4c95d' : '#fff0b5';\n    ctx.lineWidth = 1.20 + (2 - i) * .12;\n",
)
replace_once(
    RUNTIME,
    "    for (let i = 4; i >= 1; i--) {\n      drawFrame(ctx, image, input.dir, state, Math.max(0, index - i), feetX, feetY, alpha * (.035 + (4 - i) * .026), pose, -v.x * i * 3.8, -v.y * i * 3.8);\n    }\n",
    "    for (let i = 3; i >= 1; i--) {\n      drawFrame(ctx, image, input.dir, state, Math.max(0, index - i), feetX, feetY, alpha * (.025 + (3 - i) * .020), pose, -v.x * i * 4.4, -v.y * i * 4.4);\n    }\n",
)
replace_once(
    RUNTIME,
    "  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha * (state === 'dash' ? .96 : 1), pose);\n",
    "  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha, pose);\n",
)
replace_once(INDEX, '0.7.39-chibi-v16-premium-motion', '0.7.40-chibi-v16-hero-pass')

print('patched v0.7.40 V16 hero scale, gait, weapon, dash clarity, recoil and damage presentation')
