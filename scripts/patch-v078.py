from pathlib import Path

player_path = Path('src/game/graphics/playerChibiRemastered.ts')
src = player_path.read_text()


def swap(old: str, new: str, label: str) -> None:
    global src
    if old not in src:
        raise SystemExit(f'missing patch target: {label}')
    src = src.replace(old, new, 1)


swap(
    "const DRAW_W = 27;\nconst DRAW_H = 40.5;",
    "const DRAW_W = 24;\nconst DRAW_H = 36;",
    'player visual size',
)

swap(
    """  if (state === 'walk') {
    const vertical = dir === 'up' || dir === 'down';
    const i = Math.floor(frame / (vertical ? 3 : 2)) % 12;
    const phase = (i / 12) * Math.PI * 2;
    const sway = Math.sin(phase);
    const compression = Math.cos(phase * 2);
    const sideLean = dir === 'left' ? -.018 : dir === 'right' ? .018 : 0;
    return {
      authored: 'walk', index: i,
      scaleX: 1 + compression * (vertical ? .058 : .014),
      scaleY: 1 - compression * (vertical ? .050 : .014),
      rotation: vertical ? sway * .052 : sideLean + sway * .008,
      dx: sway * (vertical ? 2.05 : .38),
      dy: -Math.abs(sway) * (vertical ? 3.05 : 1.05) + (vertical ? compression * .34 : 0),
    };
  }""",
    """  if (state === 'walk') {
    const vertical = dir === 'up' || dir === 'down';
    const i = Math.floor(tick / 2) % 12;
    const phase = (i / 12) * Math.PI * 2;
    const sway = Math.sin(phase);
    const compression = Math.cos(phase * 2);
    const lift = Math.abs(sway);
    const sideLean = dir === 'left' ? -.028 : dir === 'right' ? .028 : 0;
    return {
      authored: 'walk', index: i,
      scaleX: 1 + compression * (vertical ? .052 : .038),
      scaleY: 1 - compression * (vertical ? .046 : .042),
      rotation: vertical ? sway * .046 : sideLean + sway * .038,
      dx: sway * (vertical ? 1.55 : .95),
      dy: -lift * (vertical ? 2.45 : 2.15) + compression * .28,
    };
  }""",
    'walk pose',
)

swap(
    """  const i = Math.floor(frame / 12) % 4;
  const breathe = Math.sin(frame * .052);
  return {
    authored: 'idle', index: i,
    scaleX: 1 - breathe * .006,
    scaleY: 1 + breathe * .009,
    rotation: 0,
    dx: 0,
    dy: -breathe * .28,
  };""",
    """  const i = Math.floor(tick / 7) % 4;
  const breathe = Math.sin(tick * .11);
  const settle = Math.cos(tick * .055);
  return {
    authored: 'idle', index: i,
    scaleX: 1 - breathe * .012,
    scaleY: 1 + breathe * .022,
    rotation: settle * .006,
    dx: settle * .18,
    dy: -breathe * .72,
  };""",
    'idle pose',
)

swap(
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
}""",
    """function drawWalkStepAccent(ctx: Ctx, feetX: number, feetY: number, poseIndex: number, dir: DuckDir, alpha: number): void {
  const phase = (poseIndex / 12) * Math.PI * 2;
  const stride = Math.sin(phase);
  const lead = stride >= 0 ? 1 : -1;
  const horizontal = dir === 'left' || dir === 'right';
  const facing = dir === 'left' ? -1 : 1;
  ctx.save();
  ctx.globalAlpha = .88 * alpha;
  ctx.fillStyle = '#e68b2f';
  ctx.beginPath();
  if (horizontal) {
    ctx.ellipse(feetX + facing * lead * 3.1, feetY + .18, 2.75, 1.02, facing * .16, 0, Math.PI * 2);
  } else {
    const depth = dir === 'up' ? -1.05 : .22;
    ctx.ellipse(feetX + lead * 3.05, feetY + depth, 2.35, 1.0, lead * .12, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = .40 * alpha;
  ctx.fillStyle = '#c86d22';
  ctx.beginPath();
  if (horizontal) {
    ctx.ellipse(feetX - facing * lead * 2.2, feetY + .62, 1.85, .72, -facing * .12, 0, Math.PI * 2);
  } else {
    const depth = dir === 'up' ? -1.05 : .22;
    ctx.ellipse(feetX - lead * 2.45, feetY + depth + .55, 1.75, .72, -lead * .08, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}""",
    'walk foot accent',
)

swap(
    """  if (state === 'walk' && (input.dir === 'up' || input.dir === 'down')) {
    drawVerticalStepAccent(ctx, feetX, feetY, pose.index, input.dir, opacity);
  }""",
    """  if (state === 'walk') {
    drawWalkStepAccent(ctx, feetX, feetY, pose.index, input.dir, opacity);
  }""",
    'walk accent call',
)

swap(
    "document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v5';\n  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered';\n  document.documentElement.dataset.duckHeistPlayerState = state;",
    "document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v6';\n  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v6';\n  document.documentElement.dataset.duckHeistPlayerState = state;\n  document.documentElement.dataset.duckHeistPlayerVisualFrame = `${pose.authored}:${pose.index}`;",
    'runtime diagnostics',
)

player_path.write_text(src)

index_path = Path('index.html')
html = index_path.read_text()
if '0.7.7-deploy-check' not in html:
    raise SystemExit('missing 0.7.7 marker in index.html')
index_path.write_text(html.replace('0.7.7-deploy-check', '0.7.8-motion-pass', 1))
