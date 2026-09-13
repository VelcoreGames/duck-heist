from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {text.count(old)} for {old[:80]!r}')
    p.write_text(text.replace(old, new, 1))


GEN = 'scripts/generate-player-chibi-v16.py'
RUNTIME = 'src/game/graphics/playerChibiAtlasV16.ts'
INDEX = 'index.html'

# --- Authored atlas art ----------------------------------------------------
replace_once(
    GEN,
    "        'down':0.0,'reach':0.0,'jump':0.0,'lowered':0.0,\n",
    "        'down':0.0,'reach':0.0,'jump':0.0,'lowered':0.0,\n        'sway':0.0,'plant':0.0,\n",
)
replace_once(
    GEN,
    "    elif state=='walk':\n        q['stride']=sin(phase); q['bob']=-2.0*abs(sin(phase)); q['lean']=1.4*sin(phase); q['wing']=1.6*sin(phase+pi)\n",
    "    elif state=='walk':\n        # Premium gait: clear planted steps, less pogo bounce and a small lateral\n        # weight transfer that makes vertical walking read instead of slide.\n        q['stride']=sin(phase)\n        q['bob']=-1.55*abs(sin(phase))\n        q['lean']=.92*sin(phase)\n        q['wing']=1.45*sin(phase+pi)\n        q['sway']=1.15*cos(phase)\n        q['plant']=cos(phase*2)\n",
)
replace_once(
    GEN,
    "    elif state=='shoot':\n        t=i/(n-1); attack=min(1,t/.28); recover=max(0,1-(t-.28)/.72) if t>.28 else 1\n        q['recoil']=3.1*((1-(1-attack)**3) if t<=.28 else recover**1.6)\n        q['bob']=-.55*q['recoil']; q['squash']=.035*q['recoil']; q['blink']=False\n",
    "    elif state=='shoot':\n        t=i/(n-1); attack=min(1,t/.22); recover=max(0,1-(t-.22)/.78) if t>.22 else 1\n        q['recoil']=3.55*((1-(1-attack)**3) if t<=.22 else recover**1.72)\n        q['bob']=-.48*q['recoil']; q['squash']=.031*q['recoil']; q['blink']=False\n",
)
replace_once(
    GEN,
    "    elif state=='hurt':\n        t=i/(n-1); q['hurt']=1-t; q['lean']=(-1 if i%2==0 else 1)*4.0*(1-t); q['bob']=-1.2*(1-t); q['blink']=True\n",
    "    elif state=='hurt':\n        t=i/(n-1); impact=1-t\n        snap=(1 if i<2 else -1 if i<4 else .42 if i<6 else 0)\n        q['hurt']=impact; q['lean']=snap*3.25*impact; q['bob']=-1.35*impact; q['squash']=.055*impact; q['blink']=True\n",
)
replace_once(
    GEN,
    "    if direction=='up':\n        # Three-feather tuft/rim on back of head, no face pasted on backwards.\n        polygon(im,[(cx-5,cy-14),(cx-2,cy-18),(cx,cy-14),(cx+3,cy-18),(cx+5,cy-13)],FEATHER_TOP,INK,1.1)\n        translucent_ellipse(im,(cx-10,cy-10,cx-3,cy-5),'#fff8cd',72)\n        return\n",
    "    if direction=='up':\n        # Smooth clean crown: the base duck has no hair, hat or eyewear.\n        translucent_ellipse(im,(cx-10,cy-10,cx-3,cy-5),'#fff8cd',72)\n        translucent_ellipse(im,(cx+2,cy-9,cx+9,cy-5),'#c8923d',34)\n        return\n",
)
replace_once(
    GEN,
    "    # Whole chibi dimensions: ~55-60% head, compact body, small feet.\n    head_cx=32 + (2.2*sign if side else 0)\n    head_cy=22+bob\n    body_cx=32 + (.7*sign*q['lean']/4 if side else 0)\n",
    "    # Whole chibi dimensions: ~55-60% head, compact body, small feet.\n    # Front/back movement gets its own lateral weight transfer so vertical walk\n    # frames have a readable planted gait at gameplay scale.\n    vertical_sway=q['sway'] if (not side and state=='walk') else 0\n    head_cx=32 + (2.2*sign if side else vertical_sway*.42)\n    head_cy=22+bob\n    body_cx=32 + (.7*sign*q['lean']/4 if side else vertical_sway*.78)\n",
)
replace_once(GEN, "        base=draw_duck(direction,'idle',0,COUNTS['idle'])\n", "        base=draw_duck(direction,'idle',8,COUNTS['idle'])\n")
replace_once(GEN, "        ang=66*turn_sign*(1-(1-down)**2)\n", "        ang=64*turn_sign*(1-(1-down)**2)\n")
replace_once(GEN, "        rot=base.rotate(ang,resample=Image.Resampling.BICUBIC,center=(S(32),S(36)),translate=(S(turn_sign*4.2*down),S(7*down)),fillcolor=(0,0,0,0))\n", "        rot=base.rotate(ang,resample=Image.Resampling.BICUBIC,center=(S(32),S(36)),translate=(S(turn_sign*3.6*down),S(7.2*down)),fillcolor=(0,0,0,0))\n")
replace_once(
    GEN,
    "    if side:\n        lfx=27+stride*3.5; rfx=37-stride*3.5; lfy=fy; rfy=fy\n    else:\n        lfx=27.5; rfx=36.5; lfy=fy+stride*2.4; rfy=fy-stride*2.4\n    if state!='celebrate' or q['jump']<3.7:\n        ellipse(im,(lfx-4.1,lfy-1.6,lfx+3.7,lfy+2.4),FEET,INK,1.05)\n        ellipse(im,(rfx-3.7,rfy-1.6,rfx+4.1,rfy+2.4),FEET,INK,1.05)\n        translucent_ellipse(im,(lfx-2.8,lfy-1.0,lfx+1.7,lfy-.15),BEAK_HI,120)\n        translucent_ellipse(im,(rfx-1.7,rfy-1.0,rfx+2.8,rfy-.15),BEAK_HI,120)\n",
    "    if side:\n        lfx=27+stride*3.35; rfx=37-stride*3.35; lfy=fy; rfy=fy\n        lfs=rfs=1.0\n    else:\n        lfx=27.5+q['sway']*.16; rfx=36.5+q['sway']*.16\n        lfy=fy+stride*2.75; rfy=fy-stride*2.75\n        depth=.11*stride\n        if direction=='down': lfs,rfs=1+depth,1-depth\n        else: lfs,rfs=1-depth,1+depth\n    if state!='celebrate' or q['jump']<3.7:\n        ellipse(im,(lfx-4.1*lfs,lfy-1.6*lfs,lfx+3.7*lfs,lfy+2.4*lfs),FEET,INK,1.05)\n        ellipse(im,(rfx-3.7*rfs,rfy-1.6*rfs,rfx+4.1*rfs,rfy+2.4*rfs),FEET,INK,1.05)\n        translucent_ellipse(im,(lfx-2.8*lfs,lfy-1.0*lfs,lfx+1.7*lfs,lfy-.15*lfs),BEAK_HI,120)\n        translucent_ellipse(im,(rfx-1.7*rfs,rfy-1.0*rfs,rfx+2.8*rfs,rfy-.15*rfs),BEAK_HI,120)\n",
)
replace_once(
    GEN,
    "    # tiny crown feathers are feathers, not hair/accessories\n    polygon(im,[(head_cx-5,head_cy-15),(head_cx-2.4,head_cy-18),(head_cx,head_cy-15.2),(head_cx+3,head_cy-18.2),(head_cx+5.2,head_cy-14.6)],FEATHER_TOP,INK,1.0)\n",
    "    # Keep the base silhouette smooth: no hair tuft, hat or glasses.\n",
)
replace_once(GEN, "        paste_gun(im,direction,(47,31+bob),recoil,q['lowered'])\n", "        paste_gun(im,direction,(46.5,31.5+bob),recoil,q['lowered'])\n")
replace_once(
    GEN,
    "        if direction=='right': anchor=(45.0,38+bob*.25)\n        elif direction=='left': anchor=(19.0,38+bob*.25)\n        else: anchor=(39.0,39+bob*.25)\n",
    "        if direction=='right': anchor=(45.5,38+bob*.25)\n        elif direction=='left': anchor=(18.5,38+bob*.25)\n        else: anchor=(39.5,38.5+bob*.25)\n",
)
replace_once(GEN, "        ellipse(im,(39.5,33+bob*.2,49.5,44+bob*.2),WING,INK,1.1)\n", "        ellipse(im,(39.0,33+bob*.2,49.0,44+bob*.2),WING,INK,1.1)\n")

# --- Runtime presentation -------------------------------------------------
replace_once(RUNTIME, "const DRAW = 38;\n", "const DRAW = 40;\n")
replace_once(
    RUNTIME,
    "  prevY: number;\n  walkDistance: number;\n}",
    "  prevY: number;\n  walkDistance: number;\n  lastDir: DuckDir;\n  turnAt?: number;\n}",
)
replace_once(
    RUNTIME,
    "      prevX: input.x, prevY: input.y, walkDistance: 0,\n",
    "      prevX: input.x, prevY: input.y, walkDistance: 0, lastDir: input.dir,\n",
)
replace_once(
    RUNTIME,
    "  if (input.moving && step > .01 && step < 10) rt.walkDistance += step;\n  rt.prevX = input.x;\n  rt.prevY = input.y;\n\n  const wanted = desired(input);\n",
    "  if (input.moving && !input.dashing && step > .01 && step < 8) rt.walkDistance += step;\n  rt.prevX = input.x;\n  rt.prevY = input.y;\n  if (rt.lastDir !== input.dir) {\n    rt.lastDir = input.dir;\n    rt.turnAt = input.frame;\n  }\n\n  const wanted = desired(input);\n",
)
replace_once(
    RUNTIME,
    "function resolve(input: ChibiPlayerAtlasV16Input): { state: State; tick: number; walkDistance: number } {\n",
    "function resolve(input: ChibiPlayerAtlasV16Input): { state: State; tick: number; walkDistance: number; turnAge: number } {\n",
)
replace_once(
    RUNTIME,
    "  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt), walkDistance: rt.walkDistance };\n}",
    "  const turnAge = rt.turnAt === undefined ? -1 : input.frame - rt.turnAt;\n  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt), walkDistance: rt.walkDistance, turnAge };\n}",
)
replace_once(
    RUNTIME,
    "function frameIndex(state: State, tick: number, frame: number, walkDistance: number): number {\n  if (state === 'idle') return Math.floor(frame / 6) % COUNT.idle;\n  if (state === 'walk') {\n    const strideDistance = 44;\n    const cycle = ((walkDistance % strideDistance) + strideDistance) % strideDistance;\n    return Math.floor((cycle / strideDistance) * COUNT.walk) % COUNT.walk;\n  }\n  if (state === 'shoot') return Math.min(COUNT.shoot - 1, Math.floor(tick / 2));\n  if (state === 'dash') return Math.min(COUNT.dash - 1, tick);\n  if (state === 'hurt') return Math.min(COUNT.hurt - 1, Math.floor(tick * COUNT.hurt / 12));\n  if (state === 'down') return Math.min(COUNT.down - 1, Math.floor(tick * COUNT.down / 30));\n  return Math.floor(tick / 2) % COUNT.interact;\n}\n",
    "function frameIndex(state: State, tick: number, frame: number, walkDistance: number, dir: DuckDir): number {\n  if (state === 'idle') return Math.floor(frame / 7) % COUNT.idle;\n  if (state === 'walk') {\n    const vertical = dir === 'up' || dir === 'down';\n    const strideDistance = vertical ? 34 : 40;\n    const cycle = ((walkDistance % strideDistance) + strideDistance) % strideDistance;\n    return Math.floor((cycle / strideDistance) * COUNT.walk) % COUNT.walk;\n  }\n  if (state === 'shoot') return Math.min(COUNT.shoot - 1, Math.floor(tick / 2));\n  if (state === 'dash') return Math.min(COUNT.dash - 1, tick);\n  if (state === 'hurt') return Math.min(COUNT.hurt - 1, Math.floor(tick * COUNT.hurt / 14));\n  if (state === 'down') return Math.min(COUNT.down - 1, Math.floor(tick * COUNT.down / 34));\n  return Math.floor(tick / 2) % COUNT.interact;\n}\n\ninterface VisualPose { scaleX: number; scaleY: number; rotation: number; dx: number; dy: number; }\n\nfunction visualPose(state: State, tick: number, index: number, dir: DuckDir, turnAge: number): VisualPose {\n  let scaleX = 1, scaleY = 1, rotation = 0, dx = 0, dy = 0;\n  if (state === 'walk') {\n    const phase = (index / COUNT.walk) * Math.PI * 2;\n    const stride = Math.sin(phase);\n    const lift = Math.abs(stride);\n    const vertical = dir === 'up' || dir === 'down';\n    dx = vertical ? stride * .34 : stride * .20;\n    dy = -lift * .58;\n    rotation = vertical ? stride * .008 : stride * (dir === 'left' ? -.012 : .012);\n  } else if (state === 'shoot') {\n    const attack = Math.min(1, tick / 4);\n    const recover = tick <= 4 ? 1 : Math.max(0, 1 - (tick - 4) / 20);\n    const kick = .82 * (tick <= 4 ? 1 - Math.pow(1 - attack, 3) : Math.pow(recover, 1.6));\n    if (dir === 'left') dx = kick;\n    else if (dir === 'right') dx = -kick;\n    else if (dir === 'up') dy = kick * .68;\n    else dy = -kick * .48;\n    scaleX = 1 + kick * .018; scaleY = 1 - kick * .016;\n  } else if (state === 'dash') {\n    const t = Math.min(1, tick / 15);\n    const drive = Math.sin(t * Math.PI);\n    const horizontal = dir === 'left' || dir === 'right';\n    scaleX = horizontal ? 1 + drive * .034 : 1 - drive * .020;\n    scaleY = horizontal ? 1 - drive * .020 : 1 + drive * .034;\n    dy = -drive * .42;\n  } else if (state === 'hurt') {\n    const impact = Math.max(0, 1 - tick / 14);\n    const snap = tick < 3 ? -1 : tick < 7 ? .55 : -.18;\n    rotation = snap * .038 * impact;\n    const v = dashVector(dir);\n    dx = -v.x * impact * .68; dy = -v.y * impact * .45 - impact * .28;\n  } else if (state === 'down') {\n    const settle = Math.min(1, index / Math.max(1, COUNT.down - 1));\n    scaleX = 1 + settle * .025; scaleY = 1 - settle * .028; dy = settle * .34;\n  }\n  if (turnAge >= 0 && turnAge < 4 && state !== 'down' && state !== 'hurt') {\n    const turn = 1 - turnAge / 4;\n    scaleX *= 1 - turn * .018; scaleY *= 1 + turn * .010;\n  }\n  return { scaleX, scaleY, rotation, dx, dy };\n}\n",
)
replace_once(
    RUNTIME,
    "  alpha: number,\n  ox = 0,\n  oy = 0,\n): void {\n",
    "  alpha: number,\n  pose: VisualPose,\n  ox = 0,\n  oy = 0,\n): void {\n",
)
replace_once(
    RUNTIME,
    "  ctx.globalAlpha = alpha;\n  ctx.filter = 'saturate(1.035) contrast(1.025)';\n  ctx.drawImage(\n    image,\n    col * FRAME, row * FRAME, FRAME, FRAME,\n    feetX - PIVOT_X + ox, feetY - PIVOT_Y + oy, DRAW, DRAW,\n  );\n  ctx.filter = 'none';\n",
    "  ctx.globalAlpha = alpha;\n  ctx.translate(feetX + pose.dx + ox, feetY + pose.dy + oy);\n  ctx.rotate(pose.rotation);\n  ctx.filter = 'saturate(1.045) contrast(1.028)';\n  ctx.shadowColor = 'rgba(54, 37, 25, .18)';\n  ctx.shadowBlur = .8;\n  ctx.shadowOffsetY = .35;\n  ctx.drawImage(\n    image,\n    col * FRAME, row * FRAME, FRAME, FRAME,\n    -PIVOT_X * pose.scaleX, -PIVOT_Y * pose.scaleY, DRAW * pose.scaleX, DRAW * pose.scaleY,\n  );\n  ctx.shadowColor = 'transparent';\n  ctx.filter = 'none';\n",
)
replace_once(RUNTIME, "  if (tick > 10) return;\n", "  if (tick > 4) return;\n")
replace_once(RUNTIME, "  const fade = Math.max(.12, 1 - tick / 11);\n", "  const fade = Math.max(.10, 1 - tick / 5);\n")
replace_once(
    RUNTIME,
    "  const { state, tick, walkDistance } = resolve(input);\n  const index = frameIndex(state, tick, input.frame, walkDistance);\n  const ctx = input.ctx;\n",
    "  const { state, tick, walkDistance, turnAge } = resolve(input);\n  const index = frameIndex(state, tick, input.frame, walkDistance, input.dir);\n  const pose = visualPose(state, tick, index, input.dir, turnAge);\n  const ctx = input.ctx;\n",
)
replace_once(
    RUNTIME,
    "      drawFrame(ctx, image, input.dir, state, Math.max(0, index - i), feetX, feetY, alpha * (.035 + (4 - i) * .026), -v.x * i * 3.8, -v.y * i * 3.8);\n",
    "      drawFrame(ctx, image, input.dir, state, Math.max(0, index - i), feetX, feetY, alpha * (.035 + (4 - i) * .026), pose, -v.x * i * 3.8, -v.y * i * 3.8);\n",
)
replace_once(
    RUNTIME,
    "  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha * (state === 'dash' ? .96 : 1));\n  if (state === 'shoot') drawMuzzle(ctx, input.dir, feetX, feetY, tick, alpha);\n",
    "  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha * (state === 'dash' ? .96 : 1), pose);\n  if (state === 'shoot') drawMuzzle(ctx, input.dir, feetX + pose.dx, feetY + pose.dy, tick, alpha);\n",
)

# Build marker for cache/prod verification.
replace_once(INDEX, '0.7.38-chibi-v16-polish', '0.7.39-chibi-v16-premium-motion')

print('patched V16 premium art, vertical gait, recoil, dash, hurt/down presentation and clean base silhouette')
