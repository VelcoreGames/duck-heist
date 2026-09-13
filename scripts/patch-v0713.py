from pathlib import Path

root = Path('.')
enemy_path = root / 'src/game/graphics/enemyChibiV3.ts'
render_path = root / 'src/game/render.ts'
index_path = root / 'index.html'

enemy_code = r'''type Ctx = CanvasRenderingContext2D;

const FRAME = 72;
const PIVOT_X = 36;
const PIVOT_Y = 63;
const OUTLINE = '#332a2d';
const FEATHER = '#f2dfb8';
const FEATHER_LIGHT = '#fff3d5';
const FEATHER_SHADE = '#c9aa78';
const BEAK = '#ee9635';
const BEAK_LIGHT = '#ffb85a';
const BEAK_DARK = '#bf6724';
const NAVY = '#234160';
const NAVY_LIGHT = '#4a7090';
const NAVY_DARK = '#172a40';
const BRASS = '#d2ad58';
const RED = '#a84d52';

export interface PoliceDuckV3Input {
  ctx: Ctx;
  x: number;
  y: number;
  size: number;
  frame: number;
  dirX: number;
  dirY?: number;
  moving: boolean;
  hurt: boolean;
  elite?: boolean;
}

interface Motion {
  bob: number;
  step: number;
  leftLift: number;
  rightLift: number;
  tilt: number;
  blink: boolean;
  squashX: number;
  squashY: number;
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = OUTLINE, lw = 1.65) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lw) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, rad: number, fill: string, stroke = OUTLINE, lw = 1.55) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lw) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, w: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function motion(frame: number, moving: boolean, hurt: boolean): Motion {
  if (hurt) {
    const snap = frame % 4 < 2 ? -1 : 1;
    return {
      bob: -1.1,
      step: 0,
      leftLift: 0,
      rightLift: 0,
      tilt: snap * .055,
      blink: true,
      squashX: 1.055,
      squashY: .95,
    };
  }

  if (moving) {
    const cycle = frame % 24;
    const phase = (cycle / 24) * Math.PI * 2;
    const step = Math.sin(phase);
    const plant = Math.cos(phase * 2);
    return {
      bob: -Math.abs(step) * 1.48 + plant * .12,
      step,
      leftLift: Math.max(0, step) * 1.8,
      rightLift: Math.max(0, -step) * 1.8,
      tilt: step * .027,
      blink: false,
      squashX: 1 + plant * .018,
      squashY: 1 - plant * .021,
    };
  }

  const breathe = Math.sin(frame * .065);
  const blinkPhase = frame % 118;
  return {
    bob: -breathe * .32,
    step: 0,
    leftLift: 0,
    rightLift: 0,
    tilt: Math.sin(frame * .025) * .004,
    blink: blinkPhase >= 108 && blinkPhase <= 112,
    squashX: 1 - breathe * .005,
    squashY: 1 + breathe * .009,
  };
}

function facingMode(dirX: number, dirY: number) {
  if (Math.abs(dirY) > Math.abs(dirX) * .88) return dirY < 0 ? 'up' : 'down';
  return dirX < 0 ? 'left' : 'right';
}

function drawFeet(ctx: Ctx, m: Motion, mode: 'left' | 'right' | 'up' | 'down') {
  const horizontal = mode === 'left' || mode === 'right';
  const spread = horizontal ? 7.1 : 6.1;
  const depth = mode === 'up' ? -.5 : mode === 'down' ? .45 : 0;
  const stride = m.step * (horizontal ? 2.2 : 1.55);

  ellipse(ctx, 36 - spread - stride, 60.8 - m.leftLift + depth, 5.35, 2.25, BEAK, OUTLINE, 1.35);
  ellipse(ctx, 36 + spread + stride, 60.8 - m.rightLift - depth, 5.35, 2.25, BEAK, OUTLINE, 1.35);
  ctx.globalAlpha = .72;
  ellipse(ctx, 35.5 - spread - stride, 60.25 - m.leftLift + depth, 3.0, .72, BEAK_LIGHT, '', 0);
  ellipse(ctx, 35.5 + spread + stride, 60.25 - m.rightLift - depth, 3.0, .72, BEAK_LIGHT, '', 0);
  ctx.globalAlpha = 1;
}

function drawBody(ctx: Ctx, m: Motion, elite: boolean, mode: 'left' | 'right' | 'up' | 'down') {
  const y = 47 + m.bob;
  ctx.save();
  ctx.translate(36, y);
  ctx.rotate(m.tilt * (mode === 'left' ? -1 : 1));
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-36, -y);

  ellipse(ctx, 36, y, 12.8, 11.6, FEATHER, OUTLINE, 1.75);
  ctx.globalAlpha = .58;
  ellipse(ctx, 31.7, y - 4.2, 6.2, 4.2, FEATHER_LIGHT, '', 0);
  ctx.globalAlpha = .28;
  ellipse(ctx, 39.5, y + 5.4, 8.4, 3.6, FEATHER_SHADE, '', 0);
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(25.3, y - 5.2);
  ctx.quadraticCurveTo(36, y - 1.3, 46.7, y - 5.2);
  ctx.lineTo(44.8, y + 7.5);
  ctx.quadraticCurveTo(36, y + 10.8, 27.2, y + 7.5);
  ctx.closePath();
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.65;
  ctx.stroke();

  ctx.globalAlpha = .62;
  line(ctx, 28.4, y - 2.7, 43.6, y - 2.7, NAVY_LIGHT, 1.15);
  ctx.globalAlpha = 1;
  rounded(ctx, 29.3, y + 3.6, 13.4, 3.1, 1.45, NAVY_DARK, '', 0);
  rounded(ctx, 31.2, y - 2.2, 3.7, 4.8, 1, elite ? BRASS : RED, '', 0);
  rounded(ctx, 40.8, y - 2.1, 3.7, 3.7, 1, BRASS, '', 0);

  const wingY = y + .8;
  const wingSwing = m.step * 1.2;
  ellipse(ctx, 23.3, wingY + wingSwing * .25, 5.2, 7.0, NAVY_LIGHT, OUTLINE, 1.55);
  ellipse(ctx, 48.7, wingY - wingSwing * .25, 5.2, 7.0, NAVY_LIGHT, OUTLINE, 1.55);
  ctx.globalAlpha = .34;
  ellipse(ctx, 22.7, wingY - 1 + wingSwing * .25, 2.4, 4.4, '#7596ad', '', 0);
  ellipse(ctx, 48.1, wingY - 1 - wingSwing * .25, 2.4, 4.4, '#7596ad', '', 0);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawCap(ctx: Ctx, y: number, elite: boolean, back = false) {
  ctx.beginPath();
  ctx.moveTo(20.8, y - 8.7);
  ctx.quadraticCurveTo(36, y - 17.2, 51.2, y - 8.7);
  ctx.lineTo(49.5, y - 4.2);
  ctx.quadraticCurveTo(36, y - 8.8, 22.5, y - 4.2);
  ctx.closePath();
  ctx.fillStyle = NAVY_DARK;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.65;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(23.2, y - 8.0);
  ctx.quadraticCurveTo(36, y - 13.5, 48.8, y - 8.0);
  ctx.lineTo(47.7, y - 5.2);
  ctx.quadraticCurveTo(36, y - 8.6, 24.3, y - 5.2);
  ctx.closePath();
  ctx.fillStyle = NAVY;
  ctx.fill();

  rounded(ctx, 33.7, y - 11.2, 4.6, 4.5, 1.8, BRASS, '', 0);
  if (elite) rounded(ctx, 30.2, y - 15.0, 11.6, 2.1, 1, BRASS, '', 0);
  if (back) {
    ctx.globalAlpha = .34;
    line(ctx, 24.5, y - 4.9, 47.5, y - 4.9, '#7390a7', 1.0);
    ctx.globalAlpha = 1;
  }
}

function drawSideHead(ctx: Ctx, mode: 'left' | 'right', m: Motion, elite: boolean) {
  const sign = mode === 'right' ? 1 : -1;
  const y = 25 + m.bob;
  ctx.save();
  ctx.translate(36, y);
  ctx.rotate(m.tilt * .65);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-36, -y);

  ellipse(ctx, 36, y, 16.5, 15.1, FEATHER, OUTLINE, 1.85);
  ctx.globalAlpha = .64;
  ellipse(ctx, 30.2, y - 6.1, 7.4, 4.7, FEATHER_LIGHT, '', 0);
  ctx.globalAlpha = .27;
  ellipse(ctx, 40.0, y + 6.8, 9.2, 3.7, FEATHER_SHADE, '', 0);
  ctx.globalAlpha = 1;
  drawCap(ctx, y, elite);

  const eyeX = 36 + sign * 8.0;
  if (m.blink) line(ctx, eyeX - 2.3, y, eyeX + 2.3, y, OUTLINE, 1.75);
  else {
    ellipse(ctx, eyeX, y - 1.0, 2.8, 4.0, '#1d1920', '', 0);
    ellipse(ctx, eyeX - sign * .75, y - 2.3, .9, 1.2, '#fff9ea', '', 0);
  }
  line(ctx, eyeX - sign * 3.7, y - 5.2, eyeX + sign * 2.2, y - 4.3, OUTLINE, 1.45);

  const bx = 36 + sign * 18.0;
  ctx.beginPath();
  if (sign > 0) {
    ctx.moveTo(bx - 4.5, y + 3.8);
    ctx.quadraticCurveTo(bx + 5.5, y + 3.0, bx + 8.8, y + 7.5);
    ctx.quadraticCurveTo(bx + 2.8, y + 10.8, bx - 4.5, y + 8.5);
  } else {
    ctx.moveTo(bx + 4.5, y + 3.8);
    ctx.quadraticCurveTo(bx - 5.5, y + 3.0, bx - 8.8, y + 7.5);
    ctx.quadraticCurveTo(bx - 2.8, y + 10.8, bx + 4.5, y + 8.5);
  }
  ctx.closePath();
  ctx.fillStyle = BEAK;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.65;
  ctx.stroke();
  line(ctx, sign > 0 ? bx - 1.8 : bx + 1.8, y + 8.2, sign > 0 ? bx + 6.4 : bx - 6.4, y + 8.2, BEAK_DARK, 1.0);
  ctx.restore();
}

function drawFrontHead(ctx: Ctx, m: Motion, elite: boolean) {
  const y = 25 + m.bob;
  ctx.save();
  ctx.translate(36, y);
  ctx.rotate(m.tilt * .45);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-36, -y);

  ellipse(ctx, 36, y, 16.8, 15.2, FEATHER, OUTLINE, 1.85);
  ctx.globalAlpha = .62;
  ellipse(ctx, 30.8, y - 6.2, 7.0, 4.6, FEATHER_LIGHT, '', 0);
  ctx.globalAlpha = .25;
  ellipse(ctx, 40.3, y + 6.8, 8.9, 3.5, FEATHER_SHADE, '', 0);
  ctx.globalAlpha = 1;
  drawCap(ctx, y, elite);

  for (const ex of [30.4, 41.6]) {
    if (m.blink) line(ctx, ex - 2.0, y - .1, ex + 2.0, y - .1, OUTLINE, 1.65);
    else {
      ellipse(ctx, ex, y - 1.2, 2.45, 3.7, '#1d1920', '', 0);
      ellipse(ctx, ex - .65, y - 2.45, .75, 1.0, '#fff9ea', '', 0);
    }
  }
  line(ctx, 27.8, y - 5.0, 32.4, y - 4.3, OUTLINE, 1.25);
  line(ctx, 39.6, y - 4.3, 44.2, y - 5.0, OUTLINE, 1.25);

  ctx.beginPath();
  ctx.moveTo(27.6, y + 4.1);
  ctx.quadraticCurveTo(36, y + 1.8, 44.4, y + 4.1);
  ctx.quadraticCurveTo(42.0, y + 10.2, 36, y + 10.8);
  ctx.quadraticCurveTo(30.0, y + 10.2, 27.6, y + 4.1);
  ctx.closePath();
  ctx.fillStyle = BEAK;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  line(ctx, 29.2, y + 7.0, 42.8, y + 7.0, BEAK_DARK, 1.0);
  ctx.globalAlpha = .48;
  line(ctx, 31.0, y + 4.3, 37.5, y + 3.6, BEAK_LIGHT, .9);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBackHead(ctx: Ctx, m: Motion, elite: boolean) {
  const y = 25 + m.bob;
  ctx.save();
  ctx.translate(36, y);
  ctx.rotate(m.tilt * .35);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-36, -y);

  ellipse(ctx, 36, y, 16.6, 15.0, FEATHER, OUTLINE, 1.85);
  ctx.globalAlpha = .58;
  ellipse(ctx, 30.7, y - 6.2, 7.2, 4.6, FEATHER_LIGHT, '', 0);
  ctx.globalAlpha = .28;
  ellipse(ctx, 40.5, y + 6.4, 9.2, 3.7, FEATHER_SHADE, '', 0);
  ctx.globalAlpha = 1;
  drawCap(ctx, y, elite, true);

  // Rear feather separation keeps the back view readable without inventing accessories.
  ctx.globalAlpha = .36;
  line(ctx, 30.2, y + 4.2, 34.5, y + 7.2, FEATHER_SHADE, 1.15);
  line(ctx, 41.8, y + 4.2, 37.5, y + 7.2, FEATHER_SHADE, 1.15);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawHead(ctx: Ctx, dirX: number, dirY: number, m: Motion, elite: boolean) {
  const mode = facingMode(dirX, dirY);
  if (mode === 'down') drawFrontHead(ctx, m, elite);
  else if (mode === 'up') drawBackHead(ctx, m, elite);
  else drawSideHead(ctx, mode, m, elite);
}

function drawShadow(ctx: Ctx, gx: number, gy: number, scale: number, moving: boolean, elite: boolean) {
  ctx.save();
  ctx.fillStyle = '#241c20';
  ctx.globalAlpha = elite ? .13 : .10;
  ctx.beginPath();
  ctx.ellipse(gx, gy + 1.1, 10.8 * scale, 3.0 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = moving ? .075 : .095;
  ctx.beginPath();
  ctx.ellipse(gx, gy + .85, 8.2 * scale, 2.0 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawChibiPoliceDuckV3(input: PoliceDuckV3Input) {
  const { ctx, x, y, size, frame, dirX, dirY = 0, moving, hurt, elite = false } = input;
  const m = motion(frame, moving, hurt);
  const baseScale = Math.max(.67, Math.min(.92, size / 22));
  const scale = baseScale * (elite ? 1.045 : 1);
  const gx = x + size / 2;
  const gy = y + size;
  const mode = facingMode(dirX, dirY);

  drawShadow(ctx, gx, gy, scale, moving, elite);

  ctx.save();
  ctx.globalAlpha *= hurt && Math.floor(frame / 2) % 2 === 0 ? .76 : 1;
  ctx.translate(Math.round(gx), Math.round(gy));
  ctx.scale(scale, scale);
  ctx.translate(-PIVOT_X, -PIVOT_Y);
  drawFeet(ctx, m, mode);
  drawBody(ctx, m, elite, mode);
  drawHead(ctx, dirX, dirY, m, elite);
  ctx.restore();

  if (hurt) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = .12;
    ctx.fillStyle = '#ff806c';
    ctx.beginPath();
    ctx.ellipse(gx, gy - 20 * scale, 11 * scale, 15 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export const CHIBI_POLICE_DUCK_V3_FRAME_SIZE = FRAME;
'''

enemy_path.write_text(enemy_code)

render = render_path.read_text()
old = """  const player = engine.player;
  const dirX = (player.x + 7) > (e.x + e.size / 2) ? 1 : -1;"""
new = """  const player = engine.player;
  const toPlayerX = (player.x + 7) - (e.x + e.size / 2);
  const toPlayerY = (player.y + 8) - (e.y + e.size / 2);
  const dirX = toPlayerX >= 0 ? 1 : -1;
  const dirY = toPlayerY >= 0 ? 1 : -1;"""
if old not in render:
    raise SystemExit('drawEnemy direction marker not found')
render = render.replace(old, new, 1)

old_call = """          ctx, x: e.x, y: e.y, size: e.size, frame: f + e.id * 7, dirX,
          moving: Math.abs(e.vx) + Math.abs(e.vy) > 0.08, hurt, elite: e.elite,"""
new_call = """          ctx, x: e.x, y: e.y, size: e.size, frame: f + e.id * 7,
          dirX: Math.abs(toPlayerX) >= Math.abs(toPlayerY) ? dirX : 0,
          dirY: Math.abs(toPlayerY) > Math.abs(toPlayerX) ? dirY : 0,
          moving: Math.abs(e.vx) + Math.abs(e.vy) > 0.08, hurt, elite: e.elite,"""
if old_call not in render:
    raise SystemExit('police call marker not found')
render = render.replace(old_call, new_call, 1)
render_path.write_text(render)

index = index_path.read_text()
if '0.7.12-premium-lobby' not in index:
    raise SystemExit('Expected v0.7.12 marker not found')
index = index.replace('0.7.12-premium-lobby', '0.7.13-police-chibi')
index_path.write_text(index)

print('Applied v0.7.13 police chibi pass')
