from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:120]!r}')
    path.write_text(text.replace(old, new, 1))

RUNTIME = Path('src/game/graphics/playerChibiAtlasV16.ts')
INDEX = Path('index.html')

# Slightly clearer whole-body recoil. Renderer-only: no weapon mechanics,
# projectile origin, collision or player hitbox values are touched.
replace_once(
    RUNTIME,
    "const kick = 1.05 * (tick <= 4 ? 1 - Math.pow(1 - attack, 3) : Math.pow(recover, 1.72));",
    "const kick = 1.12 * (tick <= 4 ? 1 - Math.pow(1 - attack, 3) : Math.pow(recover, 1.72));",
)

old_muzzle = """function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick > 6) return;
  const p = muzzlePoint(dir, feetX, feetY);
  const fade = Math.max(.08, 1 - tick / 7);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * fade;
  ctx.fillStyle = '#fff2ad';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(8.7, -2.7); ctx.lineTo(5.4, 0); ctx.lineTo(9.4, 2.7); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = alpha * fade * .58;
  ctx.fillStyle = '#f5a933';
  ctx.beginPath(); ctx.ellipse(2.7, 0, 6.9, 3.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha * fade * .9;
  ctx.fillStyle = '#fff9d8';
  ctx.beginPath(); ctx.arc(.8, 0, 1.35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
"""
new_muzzle = """function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick > 5) return;
  const p = muzzlePoint(dir, feetX, feetY);
  const fade = Math.max(.06, 1 - tick / 6);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.globalCompositeOperation = 'lighter';

  // Warm bloom sits behind the sharp flash so the muzzle reads at gameplay scale.
  ctx.globalAlpha = alpha * fade * .42;
  ctx.fillStyle = '#f5a933';
  ctx.beginPath(); ctx.ellipse(2.9, 0, 7.6, 4.15, 0, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = alpha * fade;
  ctx.fillStyle = '#fff0a8';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(9.8, -3.15); ctx.lineTo(6.0, 0); ctx.lineTo(10.35, 3.15); ctx.closePath(); ctx.fill();

  // Two short tongues prevent the front/back flash from reading as a flat oval.
  ctx.globalAlpha = alpha * fade * .72;
  ctx.fillStyle = '#fff7ca';
  ctx.beginPath(); ctx.moveTo(1.0, -.35); ctx.lineTo(7.1, -5.0); ctx.lineTo(5.0, -1.15); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1.0, .35); ctx.lineTo(7.1, 5.0); ctx.lineTo(5.0, 1.15); ctx.closePath(); ctx.fill();

  ctx.globalAlpha = alpha * fade * .95;
  ctx.fillStyle = '#fffbe3';
  ctx.beginPath(); ctx.arc(.8, 0, 1.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
"""
replace_once(RUNTIME, old_muzzle, new_muzzle)

old_hurt = """function drawHurtFx(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick > 9) return;
  const t = 1 - tick / 10;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * t * .72;
  ctx.strokeStyle = '#fff2c8';
  ctx.lineWidth = 1.28;
  for (let i = 0; i < 5; i++) {
    const a = -.9 + i * .45;
    ctx.beginPath();
    ctx.moveTo(feetX + Math.cos(a) * 12, feetY - 20 + Math.sin(a) * 9);
    ctx.lineTo(feetX + Math.cos(a) * 17, feetY - 20 + Math.sin(a) * 13);
    ctx.stroke();
  }
  ctx.restore();
}
"""
new_hurt = """function drawHurtFx(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick > 10) return;
  const t = Math.max(0, 1 - tick / 11);
  const cx = feetX, cy = feetY - 20;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  ctx.globalAlpha = alpha * t * .70;
  ctx.strokeStyle = '#fff2c8';
  ctx.lineWidth = 1.32;
  for (let i = 0; i < 6; i++) {
    const a = -2.55 + i * 1.02;
    const inner = 9.5 + (i % 2) * 1.3;
    const outer = 15.5 + (i % 3) * 1.15;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner * .72);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer * .78);
    ctx.stroke();
  }

  ctx.globalAlpha = alpha * t * .32;
  ctx.strokeStyle = '#f5b84f';
  ctx.lineWidth = .9;
  ctx.beginPath(); ctx.ellipse(cx, cy, 7.2 + (1 - t) * 2.8, 5.1 + (1 - t) * 1.8, 0, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = '#fff6b8';
  for (const [ox, oy, s] of [[-9, -8, 1.25], [10, -6, 1.05], [8, 8, .9]] as const) {
    ctx.globalAlpha = alpha * t * .62;
    ctx.save();
    ctx.translate(cx + ox, cy + oy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
  }
  ctx.restore();
}

function drawDownFx(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick < 15 || tick > 33) return;
  const t = Math.max(0, Math.min(1, (tick - 15) / 18));
  const burst = Math.sin(t * Math.PI);
  if (burst <= .01) return;
  ctx.save();

  // Small floor-contact puffs make the authored fall feel grounded without
  // obscuring the body or changing collision/gameplay information.
  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1;
    const lane = (i % 2) * 2.5;
    const x = feetX + side * (5.2 + t * (5.3 + lane));
    const y = feetY + .8 - burst * (1.5 + lane * .24);
    const r = (2.1 + lane * .18) * (1 - t * .28);
    ctx.globalAlpha = alpha * burst * (.10 + i * .012);
    ctx.fillStyle = i % 2 ? '#d8c191' : '#b79b69';
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.45, r * .62, 0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.globalAlpha = alpha * burst * .16;
  ctx.strokeStyle = '#876f4d';
  ctx.lineWidth = .78;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.05, 11.5 + t * 5.0, 2.0 + t * .65, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
"""
replace_once(RUNTIME, old_hurt, new_hurt)

replace_once(
    RUNTIME,
    """  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha, pose);
  if (state === 'shoot') drawMuzzle(ctx, input.dir, feetX + pose.dx, feetY + pose.dy, tick, alpha);
  if (state === 'hurt') drawHurtFx(ctx, feetX, feetY, tick, alpha);

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-atlas-v16';
""",
    """  if (state === 'down') drawDownFx(ctx, feetX, feetY, tick, alpha);
  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha, pose);
  if (state === 'shoot') drawMuzzle(ctx, input.dir, feetX + pose.dx, feetY + pose.dy, tick, alpha);
  if (state === 'hurt') drawHurtFx(ctx, feetX, feetY, tick, alpha);

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-atlas-v16';
""",
)
replace_once(
    RUNTIME,
    "document.documentElement.dataset.duckHeistPlayerFrames = '464-raster-chibi-v16';\n",
    "document.documentElement.dataset.duckHeistPlayerFrames = '464-raster-chibi-v16';\n  document.documentElement.dataset.duckHeistPlayerFx = 'v16.7-impact-fx';\n",
)
replace_once(INDEX, '0.7.44-chibi-v16-presence', '0.7.45-chibi-v16-impact-fx-candidate')

print('patched v0.7.45 V16.7 impact FX candidate; gameplay/hitboxes unchanged')
