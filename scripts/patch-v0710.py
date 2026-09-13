from pathlib import Path
import re

PLAYER = Path('src/game/graphics/playerChibiRemastered.ts')
INDEX = Path('index.html')

text = PLAYER.read_text()


def sub_once(label: str, pattern: str, replacement: str) -> None:
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one replacement, got {count}')


# Keep shoot feedback alive long enough to be readable even between gameplay/render ticks.
text = text.replace("rt.state === 'shoot' && input.frame - rt.enteredAt < 18", "rt.state === 'shoot' && input.frame - rt.enteredAt < 22")

sub_once(
    'walk pose',
    r"  if \(state === 'walk'\) \{.*?\n  \}\n  if \(state === 'shoot'\) \{",
    """  if (state === 'walk') {
    const vertical = dir === 'up' || dir === 'down';
    const i = Math.floor(tick / 2) % 12;
    const phase = (i / 12) * Math.PI * 2;
    const stride = Math.sin(phase);
    const plant = Math.cos(phase * 2);
    const lift = Math.max(0, Math.sin(phase * 2));
    const sideLean = dir === 'left' ? -.026 : dir === 'right' ? .026 : 0;
    return {
      authored: 'walk', index: i,
      scaleX: vertical ? 1 + plant * .022 : 1 + plant * .034,
      scaleY: vertical ? 1 - plant * .028 : 1 - plant * .038,
      rotation: vertical ? stride * .026 : sideLean + stride * .034,
      dx: vertical ? stride * .72 : stride * .9,
      dy: vertical ? -lift * 1.45 + plant * .18 : -Math.abs(stride) * 1.9 + plant * .2,
    };
  }
  if (state === 'shoot') {"""
)

sub_once(
    'shoot pose',
    r"  if \(state === 'shoot'\) \{.*?\n  \}\n  if \(state === 'interact'\) \{",
    """  if (state === 'shoot') {
    const i = Math.min(5, Math.floor(tick / 3));
    const kick = [1.0, 4.4, 5.4, 3.9, 2.1, .65][i] ?? 0;
    const horizontal = dir === 'left' || dir === 'right';
    const dx = dir === 'left' ? kick : dir === 'right' ? -kick : 0;
    const dy = dir === 'up' ? kick * .92 : dir === 'down' ? -kick * .78 : 0;
    const recoilPeak = i === 1 || i === 2;
    return {
      authored: 'shoot', index: i,
      scaleX: recoilPeak ? (horizontal ? 1.065 : 1.045) : 1,
      scaleY: recoilPeak ? .94 : 1,
      rotation: dir === 'left' ? -.036 * (kick / 5.4) : dir === 'right' ? .036 * (kick / 5.4) : 0,
      dx, dy,
    };
  }
  if (state === 'interact') {"""
)

sub_once(
    'muzzle flash',
    r"function drawMuzzle\(.*?\n\}\n\nfunction drawShotGlow",
    """function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number, bodyRotation = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, 0, bodyRotation);
  const vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  const mx = p.x + vx * 10.6;
  const my = p.y + vy * 10.6;
  const pulse = tick <= 3 ? 1.45 : tick <= 7 ? 1.08 : .76;
  ctx.save();
  ctx.translate(mx, my);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * .34;
  ctx.fillStyle = '#ffd66b';
  ctx.beginPath(); ctx.arc(0, 0, 10.5 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ff9b1f';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    const r = i % 2 === 0 ? 8.4 * pulse : 2.9 * pulse;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff9dc';
  ctx.beginPath(); ctx.arc(0, 0, 2.6 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffe6a0';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-vx * 1.2, -vy * 1.2);
  ctx.lineTo(vx * 12.5, vy * 12.5);
  ctx.stroke();
  ctx.restore();
}

function drawShotGlow"""
)

sub_once(
    'walk foot accents',
    r"function drawWalkStepAccent\(.*?\n\}\n\nfunction drawShadow",
    """function drawWalkStepAccent(ctx: Ctx, feetX: number, feetY: number, poseIndex: number, dir: DuckDir, alpha: number): void {
  const phase = (poseIndex / 12) * Math.PI * 2;
  const stride = Math.sin(phase);
  const lead = stride >= 0 ? 1 : -1;
  const horizontal = dir === 'left' || dir === 'right';
  const facing = dir === 'left' ? -1 : 1;
  ctx.save();
  ctx.fillStyle = '#e68b2f';
  ctx.globalAlpha = .90 * alpha;
  ctx.beginPath();
  if (horizontal) {
    ctx.ellipse(feetX + facing * lead * 3.0, feetY + .12, 2.65, 1.0, facing * .16, 0, Math.PI * 2);
  } else {
    const front = dir === 'down' ? 1 : -1;
    ctx.ellipse(feetX + lead * 2.25, feetY + front * lead * 1.35, 2.25, .95, lead * .09, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = .44 * alpha;
  ctx.fillStyle = '#c86d22';
  ctx.beginPath();
  if (horizontal) {
    ctx.ellipse(feetX - facing * lead * 2.15, feetY + .58, 1.8, .7, -facing * .12, 0, Math.PI * 2);
  } else {
    const front = dir === 'down' ? 1 : -1;
    ctx.ellipse(feetX - lead * 2.15, feetY - front * lead * .95 + .25, 1.75, .7, -lead * .08, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function drawDashBurst(ctx: Ctx, feetX: number, feetY: number, dir: DuckDir, tick: number, alpha: number): void {
  const v = dashVector(dir);
  const px = -v.y;
  const py = v.x;
  const t = Math.min(1, tick / 10);
  const fade = Math.max(.16, 1 - t * .78) * alpha;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const side = (i - 1.5) * 3.1;
    const back = 7 + i * 4.2;
    const len = 8.5 + i * 2.4;
    const sx = feetX - v.x * back + px * side;
    const sy = feetY - 13 - v.y * back + py * side;
    ctx.globalAlpha = fade * (.15 + i * .035);
    ctx.strokeStyle = i % 2 === 0 ? '#ffe59b' : '#f4c95d';
    ctx.lineWidth = i < 2 ? 1.7 : 1.15;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - v.x * len, sy - v.y * len);
    ctx.stroke();
  }
  ctx.globalAlpha = fade * .22;
  ctx.strokeStyle = '#fff0b8';
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.ellipse(feetX - v.x * 3, feetY - 8 - v.y * 3, 8.8 + t * 4.5, 4.2 + t * 2.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawShadow"""
)

old_dash = """  if (state === 'dash') {
    const v = dashVector(input.dir);
    for (let i = 5; i >= 1; i--) {
      const ghostAlpha = opacity * (.018 + (6 - i) * .020);
      drawFrame(ctx, image, input.dir, pose, feetX, feetY, ghostAlpha, -v.x * i * 3.6, -v.y * i * 3.6);
    }
  }
"""
new_dash = """  if (state === 'dash') {
    const v = dashVector(input.dir);
    drawDashBurst(ctx, feetX, feetY, input.dir, tick, opacity);
    for (let i = 6; i >= 1; i--) {
      const ghostAlpha = opacity * (.022 + (7 - i) * .024);
      drawFrame(ctx, image, input.dir, pose, feetX, feetY, ghostAlpha, -v.x * i * 4.15, -v.y * i * 4.15);
    }
  }
"""
if old_dash not in text:
    raise SystemExit('dash render block not found')
text = text.replace(old_dash, new_dash, 1)

text = text.replace("if (tick <= 10) drawMuzzle", "if (tick <= 14) drawMuzzle", 1)
text = text.replace("Math.max(.48, 1 - tick * .065)", "Math.max(.56, 1 - tick * .045)", 1)
text = text.replace("canvas2d-chibi-remastered-v7", "canvas2d-chibi-remastered-v8")
text = text.replace("120-authored-remastered-v7", "120-authored-remastered-v8")

PLAYER.write_text(text)

index = INDEX.read_text()
if '0.7.9-motion-polish' not in index:
    raise SystemExit('expected v0.7.9 build marker not found')
index = index.replace('0.7.9-motion-polish', '0.7.10-motion-clarity', 1)
INDEX.write_text(index)
