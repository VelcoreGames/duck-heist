from pathlib import Path

player = Path('src/game/graphics/playerChibiRemastered.ts')
s = player.read_text()


def replace_once(old: str, new: str) -> None:
    global s
    if old not in s:
        raise SystemExit(f'missing expected block:\n{old[:180]}')
    s = s.replace(old, new, 1)

replace_once(
"""      scaleX: horizontal ? 1.08 + pulse * .12 : .965 - pulse * .025,
      scaleY: horizontal ? .94 - pulse * .025 : 1.08 + pulse * .12,
""",
"""      scaleX: horizontal ? 1.05 + pulse * .08 : .98 - pulse * .018,
      scaleY: horizontal ? .965 - pulse * .018 : 1.05 + pulse * .08,
""",
)

replace_once(
"""function weaponAnchor(dir: DuckDir, feetX: number, feetY: number, recoil = 0) {
  if (dir === 'left') return { x: feetX - 7.1 + recoil, y: feetY - 14.4, a: Math.PI, behind: false };
  if (dir === 'right') return { x: feetX + 7.1 - recoil, y: feetY - 14.4, a: 0, behind: false };
  if (dir === 'up') return { x: feetX, y: feetY - 21.5 + recoil, a: -Math.PI / 2, behind: true };
  return { x: feetX + .6, y: feetY - 8.8 - recoil, a: Math.PI / 2, behind: false };
}
""",
"""function weaponAnchor(dir: DuckDir, feetX: number, feetY: number, recoil = 0, bodyRotation = 0) {
  const base = dir === 'left'
    ? { x: feetX - 7.1 + recoil, y: feetY - 14.4, a: Math.PI, behind: false }
    : dir === 'right'
      ? { x: feetX + 7.1 - recoil, y: feetY - 14.4, a: 0, behind: false }
      : dir === 'up'
        ? { x: feetX, y: feetY - 21.5 + recoil, a: -Math.PI / 2, behind: true }
        : { x: feetX + .6, y: feetY - 8.8 - recoil, a: Math.PI / 2, behind: false };
  if (Math.abs(bodyRotation) < .0001) return base;
  const ox = base.x - feetX;
  const oy = base.y - feetY;
  const c = Math.cos(bodyRotation);
  const sn = Math.sin(bodyRotation);
  return {
    ...base,
    x: feetX + ox * c - oy * sn,
    y: feetY + ox * sn + oy * c,
    a: base.a + bodyRotation,
  };
}
""",
)

replace_once(
"""function drawWeapon(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, recoil = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, recoil);
""",
"""function drawWeapon(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, recoil = 0, bodyRotation = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, recoil, bodyRotation);
""",
)

replace_once(
"""function drawGrip(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number): void {
  const p = weaponAnchor(dir, feetX, feetY, 0);
""",
"""function drawGrip(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, bodyRotation = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, 0, bodyRotation);
""",
)

replace_once(
"""function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number): void {
  const p = weaponAnchor(dir, feetX, feetY, 0);
""",
"""function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number, bodyRotation = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, 0, bodyRotation);
""",
)

replace_once(
"""function drawShotGlow(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number): void {
  if (tick > 8) return;
  const p = weaponAnchor(dir, feetX, feetY, 0);
""",
"""function drawShotGlow(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number, bodyRotation = 0): void {
  if (tick > 8) return;
  const p = weaponAnchor(dir, feetX, feetY, 0, bodyRotation);
""",
)

replace_once(
"""function drawShadow(ctx: Ctx, feetX: number, feetY: number, state: State, alpha: number): void {
  const width = state === 'down' ? 9.5 : state === 'dash' ? 10.5 : 8.7;
  const height = state === 'down' ? 2.8 : 2.35;
  ctx.save();
  ctx.fillStyle = '#181319';
  ctx.globalAlpha = .07 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.15, width * 1.35, height * 1.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .11 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.05, width * 1.12, height * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .13 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + .9, width * .83, height * .74, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
""",
"""function drawShadow(ctx: Ctx, feetX: number, feetY: number, state: State, alpha: number, poseDy = 0): void {
  const airborne = Math.min(1, Math.max(0, -poseDy / 3));
  const baseWidth = state === 'down' ? 9.5 : state === 'dash' ? 10.1 : 8.7;
  const width = baseWidth * (1 - airborne * .16);
  const height = (state === 'down' ? 2.8 : 2.35) * (1 - airborne * .10);
  const fade = 1 - airborne * .26;
  ctx.save();
  ctx.fillStyle = '#181319';
  ctx.globalAlpha = .07 * fade * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.15, width * 1.35, height * 1.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .11 * fade * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.05, width * 1.12, height * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .13 * fade * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + .9, width * .83, height * .74, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
""",
)

replace_once(
"""  drawShadow(ctx, feetX, feetY, state, opacity * (state === 'dash' ? .8 : 1));
""",
"""  drawShadow(ctx, feetX, feetY, state, opacity * (state === 'dash' ? .8 : 1), pose.dy);
""",
)

replace_once(
"""      drawFrame(ctx, image, input.dir, pose, feetX, feetY, ghostAlpha, -v.x * i * 4.35, -v.y * i * 4.35);
""",
"""      drawFrame(ctx, image, input.dir, pose, feetX, feetY, ghostAlpha, -v.x * i * 3.6, -v.y * i * 3.6);
""",
)

replace_once(
"""  const wp = weaponAnchor(input.dir, actorFeetX, actorFeetY, 0);
  if (!authoredWeapon && wp.behind) {
    drawWeapon(ctx, input.dir, actorFeetX, actorFeetY, opacity);
    drawGrip(ctx, input.dir, actorFeetX, actorFeetY, opacity);
  }
""",
"""  const wp = weaponAnchor(input.dir, actorFeetX, actorFeetY, 0, pose.rotation);
  if (!authoredWeapon && wp.behind) {
    drawWeapon(ctx, input.dir, actorFeetX, actorFeetY, opacity, 0, pose.rotation);
    drawGrip(ctx, input.dir, actorFeetX, actorFeetY, opacity, pose.rotation);
  }
""",
)

replace_once(
"""  if (!authoredWeapon && !wp.behind) {
    drawWeapon(ctx, input.dir, actorFeetX, actorFeetY, opacity);
    drawGrip(ctx, input.dir, actorFeetX, actorFeetY, opacity);
  }

  if (state === 'shoot') {
    drawShotGlow(ctx, input.dir, actorFeetX, actorFeetY, opacity, tick);
    if (tick <= 10) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.48, 1 - tick * .065), tick);
  }
""",
"""  if (!authoredWeapon && !wp.behind) {
    drawWeapon(ctx, input.dir, actorFeetX, actorFeetY, opacity, 0, pose.rotation);
    drawGrip(ctx, input.dir, actorFeetX, actorFeetY, opacity, pose.rotation);
  }

  if (state === 'shoot') {
    drawShotGlow(ctx, input.dir, actorFeetX, actorFeetY, opacity, tick, pose.rotation);
    if (tick <= 10) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.48, 1 - tick * .065), tick, pose.rotation);
  }
""",
)

replace_once(
"""  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v6';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v6';
""",
"""  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v7';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v7';
""",
)

player.write_text(s)

index = Path('index.html')
h = index.read_text()
old = '<meta name="duck-heist-build" content="0.7.8-motion-pass" />'
new = '<meta name="duck-heist-build" content="0.7.9-motion-polish" />'
if old not in h:
    raise SystemExit('missing 0.7.8 build marker')
index.write_text(h.replace(old, new, 1))
