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
"""  if (state === 'down') {
    const t = Math.min(1, tick / 22);
    const ease = 1 - Math.pow(1 - t, 3);
    const fallSign = dir === 'left' || dir === 'up' ? -1 : 1;
    return {
      authored: 'idle', index: Math.min(3, Math.floor(tick / 6)),
      scaleX: 1 + ease * .08,
      scaleY: 1 - ease * .20,
      rotation: fallSign * ease * 1.22,
      dx: fallSign * ease * 2.45,
      dy: ease * 3.6,
    };
  }""",
"""  if (state === 'down') {
    const t = Math.min(1, tick / 28);
    const ease = 1 - Math.pow(1 - t, 3);
    const settleT = Math.max(0, Math.min(1, (t - .68) / .32));
    const settle = Math.sin(settleT * Math.PI) * (1 - settleT);
    const fallSign = dir === 'left' || dir === 'up' ? -1 : 1;
    return {
      authored: 'idle', index: Math.min(3, Math.floor(tick / 7)),
      scaleX: 1 + ease * .075 + settle * .025,
      scaleY: 1 - ease * .19 - settle * .018,
      rotation: fallSign * (ease * 1.18 - settle * .12),
      dx: fallSign * (ease * 2.55 - settle * .35),
      dy: ease * 3.85 - settle * .62,
    };
  }""", 'down pose')

marker = "function drawGrip(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, bodyRotation = 0): void {"
insert = r'''function drawDroppedWeapon(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number): void {
  if (tick < 7) return;
  const t = Math.min(1, (tick - 7) / 16);
  const ease = 1 - Math.pow(1 - t, 3);
  const side = dir === 'left' || dir === 'up' ? -1 : 1;
  const x = feetX + side * (4.5 + ease * 4.8);
  const y = feetY - 8 + ease * 8.1 - Math.sin(t * Math.PI) * 3.0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(side * (.28 + ease * 1.05));
  ctx.fillStyle = '#15191e';
  ctx.beginPath(); ctx.roundRect(-5.6, -1.8, 11.2, 3.6, 1.15); ctx.fill();
  ctx.fillStyle = '#59656b';
  ctx.beginPath(); ctx.roundRect(-4.35, -1.1, 8.1, 1.62, .65); ctx.fill();
  ctx.fillStyle = '#c9d2d1';
  ctx.beginPath(); ctx.roundRect(3.85, -.58, 2.25, .68, .28); ctx.fill();
  ctx.fillStyle = '#a86e32';
  ctx.beginPath();
  ctx.moveTo(.1, 1.0); ctx.lineTo(2.35, 1.15); ctx.lineTo(1.55, 4.3); ctx.lineTo(.15, 3.75); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

'''
if marker not in src:
    raise SystemExit('dropped weapon marker missing')
src = src.replace(marker, insert + marker, 1)

shadow_marker = "function drawShadow(ctx: Ctx, feetX: number, feetY: number, state: State, alpha: number, poseDy = 0): void {"
impact = r'''function drawDownImpact(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick < 15 || tick > 25) return;
  const t = (tick - 15) / 10;
  const fade = (1 - t) * alpha;
  ctx.save();
  ctx.globalAlpha = fade * .18;
  ctx.strokeStyle = '#e9d2a6';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(feetX, feetY + 1.1, 4.5 + t * 7.5, 1.25 + t * 1.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = fade * .095;
  ctx.fillStyle = '#f4e1bd';
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    const r = 3.4 + i * 1.25 + t * 2.2;
    ctx.beginPath();
    ctx.arc(feetX + Math.cos(a) * r, feetY + .8 + Math.sin(a) * 1.8, .72, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

'''
if shadow_marker not in src:
    raise SystemExit('down impact marker missing')
src = src.replace(shadow_marker, impact + shadow_marker, 1)

src = replace_once(src,
"""  const authoredWeapon = state === 'shoot' || state === 'interact';
  const wp = weaponAnchor(input.dir, actorFeetX, actorFeetY, 0, pose.rotation);
  if (!authoredWeapon && wp.behind) {""",
"""  const authoredWeapon = state === 'shoot' || state === 'interact';
  const detachedWeapon = state === 'down' && tick >= 7;
  const wp = weaponAnchor(input.dir, actorFeetX, actorFeetY, 0, pose.rotation);
  if (!authoredWeapon && !detachedWeapon && wp.behind) {""",
'detached weapon behind')

src = replace_once(src,
"""  if (!authoredWeapon && !wp.behind) {
    drawWeapon(ctx, input.dir, actorFeetX, actorFeetY, opacity, 0, pose.rotation);
    drawGrip(ctx, input.dir, actorFeetX, actorFeetY, opacity, pose.rotation);
  }

  if (state === 'shoot') {""",
"""  if (!authoredWeapon && !detachedWeapon && !wp.behind) {
    drawWeapon(ctx, input.dir, actorFeetX, actorFeetY, opacity, 0, pose.rotation);
    drawGrip(ctx, input.dir, actorFeetX, actorFeetY, opacity, pose.rotation);
  }
  if (detachedWeapon) {
    drawDroppedWeapon(ctx, input.dir, feetX, feetY, opacity, tick);
    drawDownImpact(ctx, feetX, feetY, tick, opacity);
  }

  if (state === 'shoot') {""",
'detached weapon foreground')

src = replace_once(src,
"""  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v13';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v13';""",
"""  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v14';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v14';""",
'v14 renderer markers')

PLAYER.write_text(src)

html = INDEX.read_text()
html = replace_once(html, '0.7.33-distance-synced-gait-v13', '0.7.34-down-state-polish-v14', 'build marker')
INDEX.write_text(html)

print('v0.7.34 down-state polish patch applied')
