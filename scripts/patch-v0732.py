from pathlib import Path

PLAYER = Path('src/game/graphics/playerChibiRemastered.ts')
INDEX = Path('index.html')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


src = PLAYER.read_text()

src = replace_once(src,
"""  wasHurt: boolean;
  dashEndedAt?: number;
}""",
"""  wasHurt: boolean;
  dashEndedAt?: number;
  lastDir: DuckDir;
  wasMoving: boolean;
  moveStartedAt?: number;
  moveStoppedAt?: number;
  turnAt?: number;
}""", 'runtime motion fields')

src = replace_once(src,
"function resolveState(input: ChibiPlayerRemasteredInput): { state: State; tick: number; dashRecovery: number } {",
"function resolveState(input: ChibiPlayerRemasteredInput): { state: State; tick: number; dashRecovery: number; moveStartAge: number; moveStopAge: number; turnAge: number } {",
'resolve return type')

src = replace_once(src,
"""    rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, lastShot: input.shotSequence, wasShoot: false, wasDash: false, wasHurt: false };""",
"""    rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, lastShot: input.shotSequence, wasShoot: false, wasDash: false, wasHurt: false, lastDir: input.dir, wasMoving: input.moving };""",
'runtime init')

src = replace_once(src,
"""  const wanted = desiredState(input);
  if (rt.wasDash && !input.dashing) rt.dashEndedAt = input.frame;""",
"""  const wanted = desiredState(input);
  if (rt.lastDir !== input.dir) {
    rt.lastDir = input.dir;
    rt.turnAt = input.frame;
  }
  if (!rt.wasMoving && input.moving) rt.moveStartedAt = input.frame;
  if (rt.wasMoving && !input.moving) rt.moveStoppedAt = input.frame;
  if (rt.wasDash && !input.dashing) rt.dashEndedAt = input.frame;""",
'motion transition detection')

src = replace_once(src,
"""  rt.wasDash = input.dashing;
  rt.wasHurt = input.hurt;
  const dashRecovery = rt.dashEndedAt === undefined ? -1 : input.frame - rt.dashEndedAt;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt), dashRecovery };""",
"""  rt.wasDash = input.dashing;
  rt.wasHurt = input.hurt;
  rt.wasMoving = input.moving;
  const dashRecovery = rt.dashEndedAt === undefined ? -1 : input.frame - rt.dashEndedAt;
  const moveStartAge = rt.moveStartedAt === undefined ? -1 : input.frame - rt.moveStartedAt;
  const moveStopAge = rt.moveStoppedAt === undefined ? -1 : input.frame - rt.moveStoppedAt;
  const turnAge = rt.turnAt === undefined ? -1 : input.frame - rt.turnAt;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt), dashRecovery, moveStartAge, moveStopAge, turnAge };""",
'motion transition return')

marker = "function drawShotGlow(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number, bodyRotation = 0): void {"
insert = r'''function drawCasing(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number, bodyRotation = 0): void {
  if (tick < 2 || tick > 8) return;
  const p = weaponAnchor(dir, feetX, feetY, 0, bodyRotation);
  const age = tick - 2;
  const side = dir === 'left' ? 1 : dir === 'right' ? -1 : dir === 'up' ? 1 : -1;
  const ex = dir === 'left' || dir === 'right' ? side * (2.3 + age * .82) : side * (3.2 + age * .88);
  const ey = dir === 'left' || dir === 'right' ? -2.2 - age * .48 + age * age * .12 : -1.7 - age * .34 + age * age * .11;
  ctx.save();
  ctx.translate(p.x + ex, p.y + ey);
  ctx.rotate(bodyRotation + age * .72 * side);
  ctx.globalAlpha = alpha * Math.max(.18, 1 - age / 7);
  ctx.fillStyle = '#d8a84d';
  ctx.beginPath();
  ctx.roundRect(-1.25, -.48, 2.5, .96, .35);
  ctx.fill();
  ctx.fillStyle = '#fff0a8';
  ctx.globalAlpha *= .55;
  ctx.fillRect(-.72, -.36, 1.05, .20);
  ctx.restore();
}

'''
if marker not in src:
    raise SystemExit('casing insertion marker missing')
src = src.replace(marker, insert + marker, 1)

src = replace_once(src,
"""  const { state, tick, dashRecovery } = resolveState(input);
  const pose = poseFor(state, tick, input.frame, input.dir);
  const ctx = input.ctx;""",
"""  const { state, tick, dashRecovery, moveStartAge, moveStopAge, turnAge } = resolveState(input);
  const pose = poseFor(state, tick, input.frame, input.dir);
  if (state === 'walk' && moveStartAge >= 0 && moveStartAge < 5) {
    const a = 1 - moveStartAge / 5;
    pose.scaleX *= 1 + a * .018;
    pose.scaleY *= 1 - a * .024;
    pose.dy += a * .72;
  }
  if (state === 'idle' && moveStopAge >= 0 && moveStopAge < 7) {
    const t = moveStopAge / 7;
    const settle = Math.sin(t * Math.PI) * (1 - t);
    pose.scaleX *= 1 + settle * .024;
    pose.scaleY *= 1 - settle * .020;
    pose.dy += settle * .42;
  }
  if (state !== 'down' && turnAge >= 0 && turnAge < 5) {
    const t = 1 - turnAge / 5;
    const sign = input.dir === 'left' || input.dir === 'up' ? -1 : 1;
    pose.rotation += sign * t * .028;
    pose.dx += sign * t * .32;
  }
  const ctx = input.ctx;""",
'render transition pose')

src = replace_once(src,
"""  if (state === 'shoot') {
    drawShotGlow(ctx, input.dir, actorFeetX, actorFeetY, opacity, tick, pose.rotation);
    if (tick <= 10) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.52, 1 - tick * .06), tick, pose.rotation);
  }""",
"""  if (state === 'shoot') {
    drawShotGlow(ctx, input.dir, actorFeetX, actorFeetY, opacity, tick, pose.rotation);
    if (tick <= 10) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.52, 1 - tick * .06), tick, pose.rotation);
    drawCasing(ctx, input.dir, actorFeetX, actorFeetY, opacity, tick, pose.rotation);
  }""",
'casing render')

src = replace_once(src,
"""  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v11';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v11';""",
"""  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v12';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v12';""",
'v12 renderer markers')

PLAYER.write_text(src)

html = INDEX.read_text()
html = replace_once(html, '0.7.31-player-polish-v11', '0.7.32-player-transitions-v12', 'build marker')
INDEX.write_text(html)

print('v0.7.32 player transitions v12 patch applied')
