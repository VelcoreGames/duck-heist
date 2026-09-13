from pathlib import Path
import re

root = Path('.')
player_path = root / 'src/game/graphics/playerChibiRemastered.ts'
index_path = root / 'index.html'

text = player_path.read_text()


def replace_regex(pattern: str, replacement: str, label: str) -> None:
    global text
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Expected one replacement for {label}, got {count}')
    text = updated

# Walk: retain the 12 authored drawings but make each two-tick hold visually unique.
replace_regex(
    r"  if \(state === 'walk'\) \{.*?\n  \}\n  if \(state === 'shoot'\) \{",
    """  if (state === 'walk') {
    const vertical = dir === 'up' || dir === 'down';
    const cycle = tick % 24;
    const i = Math.floor(cycle / 2) % 12;
    const phase = (cycle / 24) * Math.PI * 2;
    const stride = Math.sin(phase);
    const plant = Math.cos(phase * 2);
    const lift = Math.abs(Math.sin(phase));
    const sideLean = dir === 'left' ? -.024 : dir === 'right' ? .024 : 0;
    return {
      authored: 'walk', index: i,
      scaleX: vertical ? 1 + plant * .025 : 1 + plant * .032,
      scaleY: vertical ? 1 - plant * .031 : 1 - plant * .036,
      rotation: vertical ? stride * .031 : sideLean + stride * .036,
      dx: vertical ? stride * .86 : stride * .96,
      dy: vertical ? -lift * 1.68 + plant * .17 : -lift * 1.92 + plant * .18,
    };
  }
  if (state === 'shoot') {""",
    'walk block',
)

# Shoot: continuous attack/recovery motion between the six authored drawings.
replace_regex(
    r"  if \(state === 'shoot'\) \{.*?\n  \}\n  if \(state === 'interact'\) \{",
    """  if (state === 'shoot') {
    const i = Math.min(5, Math.floor(tick / 3));
    const attackT = Math.min(1, tick / 4);
    const recoverT = tick <= 4 ? 1 : Math.max(0, 1 - (tick - 4) / 17);
    const attack = 1 - Math.pow(1 - attackT, 3);
    const kick = 5.65 * (tick <= 4 ? attack : Math.pow(recoverT, 1.55));
    const horizontal = dir === 'left' || dir === 'right';
    const dx = dir === 'left' ? kick : dir === 'right' ? -kick : 0;
    const dy = dir === 'up' ? kick * .90 : dir === 'down' ? -kick * .76 : 0;
    const recoilPeak = tick >= 2 && tick <= 7;
    return {
      authored: 'shoot', index: i,
      scaleX: recoilPeak ? (horizontal ? 1.068 : 1.047) : 1 + kick * .0015,
      scaleY: recoilPeak ? .938 : 1 - kick * .0012,
      rotation: dir === 'left' ? -.038 * (kick / 5.65) : dir === 'right' ? .038 * (kick / 5.65) : 0,
      dx, dy,
    };
  }
  if (state === 'interact') {""",
    'shoot block',
)

# Interact: interpolate body motion across the authored sequence instead of stepping every two ticks.
replace_regex(
    r"  if \(state === 'interact'\) \{.*?\n  \}\n  if \(state === 'dash'\) \{",
    """  if (state === 'interact') {
    const i = Math.min(7, Math.floor(tick / 2));
    const progress = Math.min(1, tick / 15);
    const arc = Math.sin(progress * Math.PI);
    return {
      authored: 'interact', index: i,
      scaleX: 1 + arc * .014,
      scaleY: 1 + arc * .021,
      rotation: Math.sin(progress * Math.PI * 2) * .012,
      dx: Math.sin(progress * Math.PI * 2) * .18,
      dy: -arc * 1.82,
    };
  }
  if (state === 'dash') {""",
    'interact block',
)

# Give the raster art a warmer premium edge without changing the atlas itself.
old_draw = """  ctx.globalAlpha = alpha;
  ctx.translate(feetX + pose.dx + ghostOffsetX, feetY + pose.dy + ghostOffsetY);
  ctx.rotate(pose.rotation);
  ctx.drawImage(image, sx, sy, FRAME_W, FRAME_H, -PIVOT_X * pose.scaleX, -PIVOT_Y * pose.scaleY, w, h);
  ctx.restore();"""
new_draw = """  ctx.globalAlpha = alpha;
  ctx.translate(feetX + pose.dx + ghostOffsetX, feetY + pose.dy + ghostOffsetY);
  ctx.rotate(pose.rotation);
  ctx.filter = 'saturate(1.07) contrast(1.035)';
  ctx.shadowColor = 'rgba(54, 37, 25, .22)';
  ctx.shadowBlur = 1.15;
  ctx.shadowOffsetY = .55;
  ctx.drawImage(image, sx, sy, FRAME_W, FRAME_H, -PIVOT_X * pose.scaleX, -PIVOT_Y * pose.scaleY, w, h);
  ctx.shadowColor = 'transparent';
  ctx.filter = 'none';
  ctx.restore();"""
if old_draw not in text:
    raise SystemExit('drawFrame body marker not found')
text = text.replace(old_draw, new_draw, 1)

# Replace the blocky weapon with a compact rounded silhouette and clearer material separation.
replace_regex(
    r"function drawWeapon\(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, recoil = 0, bodyRotation = 0\): void \{.*?\n\}\n\nfunction drawGrip",
    """function drawWeapon(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, recoil = 0, bodyRotation = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, recoil, bodyRotation);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);

  ctx.fillStyle = '#14181d';
  ctx.beginPath();
  ctx.roundRect(-5.9, -2.25, 11.7, 4.15, 1.45);
  ctx.fill();

  ctx.fillStyle = '#505b62';
  ctx.beginPath();
  ctx.roundRect(-4.7, -1.48, 8.9, 2.15, .82);
  ctx.fill();

  ctx.fillStyle = '#aeb8b8';
  ctx.beginPath();
  ctx.roundRect(-3.15, -1.30, 5.7, .62, .28);
  ctx.fill();

  ctx.fillStyle = '#22272b';
  ctx.beginPath();
  ctx.moveTo(.25, 1.15);
  ctx.quadraticCurveTo(2.75, 1.0, 3.05, 1.8);
  ctx.lineTo(2.0, 5.15);
  ctx.quadraticCurveTo(.7, 5.0, -.05, 4.18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#a86e32';
  ctx.beginPath();
  ctx.roundRect(.62, 2.18, 1.55, 2.42, .48);
  ctx.fill();

  ctx.fillStyle = '#d8b76b';
  ctx.beginPath();
  ctx.roundRect(-4.72, -.55, 1.25, 1.0, .38);
  ctx.fill();

  ctx.fillStyle = '#cfd8d7';
  ctx.beginPath();
  ctx.roundRect(4.55, -.72, 2.65, .88, .36);
  ctx.fill();

  ctx.fillStyle = '#77858a';
  ctx.beginPath();
  ctx.roundRect(6.45, -.92, 1.15, 1.26, .34);
  ctx.fill();
  ctx.restore();
}

function drawGrip""",
    'weapon renderer',
)

# Footfall dust: tiny, low-opacity particles make the step cadence readable without changing collision or movement.
insert_marker = "\nfunction drawDashBurst(ctx: Ctx, feetX: number, feetY: number, dir: DuckDir, tick: number, alpha: number): void {"
if insert_marker not in text:
    raise SystemExit('dash burst marker not found')
footfall = """

function drawFootfallDust(ctx: Ctx, feetX: number, feetY: number, poseIndex: number, dir: DuckDir, alpha: number): void {
  if (poseIndex !== 0 && poseIndex !== 6) return;
  const side = poseIndex === 0 ? -1 : 1;
  const backX = dir === 'left' ? 1.8 : dir === 'right' ? -1.8 : side * 1.1;
  const backY = dir === 'up' ? 1.15 : dir === 'down' ? -.35 : .45;
  ctx.save();
  ctx.fillStyle = '#f4dfba';
  ctx.globalAlpha = .13 * alpha;
  for (let i = 0; i < 3; i++) {
    const ox = backX * (i + 1) + side * (i - 1) * .75;
    const oy = backY * (i + 1) + i * .22;
    ctx.beginPath();
    ctx.ellipse(feetX + ox, feetY + oy, 1.25 - i * .18, .56 - i * .06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
"""
text = text.replace(insert_marker, footfall + insert_marker, 1)

walk_call = """  if (state === 'walk') {
    drawWalkStepAccent(ctx, feetX, feetY, pose.index, input.dir, opacity);
  }"""
walk_call_new = """  if (state === 'walk') {
    drawFootfallDust(ctx, feetX, feetY, pose.index, input.dir, opacity);
    drawWalkStepAccent(ctx, feetX, feetY, pose.index, input.dir, opacity);
  }"""
if walk_call not in text:
    raise SystemExit('walk call marker not found')
text = text.replace(walk_call, walk_call_new, 1)

text = text.replace("canvas2d-chibi-remastered-v8", "canvas2d-chibi-remastered-v9")
text = text.replace("120-authored-remastered-v8", "120-authored-remastered-v9")

player_path.write_text(text)

index = index_path.read_text()
if '0.7.10-motion-clarity' not in index:
    raise SystemExit('Expected v0.7.10 build marker not found')
index = index.replace('0.7.10-motion-clarity', '0.7.11-chibi-fluidity')
index_path.write_text(index)

print('Applied v0.7.11 chibi fluidity patch')
