from pathlib import Path

renderer = Path('src/game/graphics/playerChibiRemastered.ts')
s = renderer.read_text()


def once(old: str, new: str, label: str) -> None:
    global s
    if old not in s:
        raise SystemExit(f'v0.7.6 renderer patch missing: {label}')
    s = s.replace(old, new, 1)


once(
    "} else if (rt.state === 'shoot' && input.frame - rt.enteredAt < 14) {",
    "} else if (rt.state === 'shoot' && input.frame - rt.enteredAt < 18) {",
    'shoot hold',
)
once(
    """  if (state === 'walk') {
    const i = Math.floor(frame / 2) % 12;
    const phase = (i / 12) * Math.PI * 2;
    const vertical = dir === 'up' || dir === 'down';""",
    """  if (state === 'walk') {
    const vertical = dir === 'up' || dir === 'down';
    const i = Math.floor(frame / (vertical ? 3 : 2)) % 12;
    const phase = (i / 12) * Math.PI * 2;""",
    'vertical walk cadence',
)
once(
    """      scaleX: 1 + compression * (vertical ? .045 : .014),
      scaleY: 1 - compression * (vertical ? .038 : .014),
      rotation: vertical ? sway * .038 : sideLean + sway * .008,
      dx: sway * (vertical ? 1.55 : .38),
      dy: -Math.abs(sway) * (vertical ? 2.45 : 1.05) + (vertical ? compression * .22 : 0),""",
    """      scaleX: 1 + compression * (vertical ? .058 : .014),
      scaleY: 1 - compression * (vertical ? .050 : .014),
      rotation: vertical ? sway * .052 : sideLean + sway * .008,
      dx: sway * (vertical ? 2.05 : .38),
      dy: -Math.abs(sway) * (vertical ? 3.05 : 1.05) + (vertical ? compression * .34 : 0),""",
    'vertical stride visibility',
)
once(
    """function drawShadow(ctx: Ctx, feetX: number, feetY: number, state: State, alpha: number): void {""",
    """function drawVerticalStepAccent(ctx: Ctx, feetX: number, feetY: number, poseIndex: number, dir: DuckDir, alpha: number): void {
  const phase = (poseIndex / 12) * Math.PI * 2;
  const stride = Math.sin(phase);
  const lead = stride >= 0 ? 1 : -1;
  const depth = dir === 'up' ? -1.2 : .25;
  ctx.save();
  ctx.globalAlpha = .86 * alpha;
  ctx.fillStyle = '#e68b2f';
  ctx.beginPath();
  ctx.ellipse(feetX + lead * 3.25, feetY + depth, 2.45, 1.05, lead * .12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = .42 * alpha;
  ctx.fillStyle = '#c86d22';
  ctx.beginPath();
  ctx.ellipse(feetX - lead * 2.65, feetY + depth + .55, 1.9, .78, -lead * .08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShadow(ctx: Ctx, feetX: number, feetY: number, state: State, alpha: number): void {""",
    'vertical step accent helper',
)
once(
    "if (tick > 4) return;",
    "if (tick > 8) return;",
    'shot glow duration',
)
once(
    "ctx.globalAlpha = alpha * (.16 - tick * .025);",
    "ctx.globalAlpha = alpha * Math.max(.055, .24 - tick * .022);",
    'shot glow strength',
)
once(
    """  if (state === 'dash') {
    const v = dashVector(input.dir);""",
    """  if (state === 'walk' && (input.dir === 'up' || input.dir === 'down')) {
    drawVerticalStepAccent(ctx, feetX, feetY, pose.index, input.dir, opacity);
  }

  if (state === 'dash') {
    const v = dashVector(input.dir);""",
    'vertical step accent call',
)
once(
    "if (tick <= 6) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.42, 1 - tick * .10), tick);",
    "if (tick <= 10) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.48, 1 - tick * .065), tick);",
    'muzzle duration',
)
once(
    "document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v4';",
    "document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v5';",
    'renderer marker',
)
renderer.write_text(s)

engine = Path('src/game/engine.ts')
e = engine.read_text()
old = '    player.shootFlash = 4;'
new = '    player.shootFlash = 10;'
if old not in e:
    raise SystemExit('v0.7.6 engine patch missing: shootFlash duration')
engine.write_text(e.replace(old, new, 1))
print('v0.7.6 motion legibility patch applied')
