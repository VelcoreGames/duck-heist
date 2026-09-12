type Ctx = CanvasRenderingContext2D;

const FRAME = 72;
const PIVOT_X = 36;
const PIVOT_Y = 63;
const OUTLINE = '#27232b';
const FEATHER = '#f2e2bd';
const FEATHER_LIGHT = '#fff3d6';
const FEATHER_SHADE = '#d1b98d';
const BEAK = '#ef9737';
const BEAK_DARK = '#c86b24';
const NAVY = '#29476a';
const NAVY_LIGHT = '#4b7197';
const NAVY_DARK = '#1b2d47';
const BRASS = '#d3ae54';
const RED = '#a84449';

export interface PoliceDuckV3Input {
  ctx: Ctx;
  x: number;
  y: number;
  size: number;
  frame: number;
  dirX: number;
  moving: boolean;
  hurt: boolean;
  elite?: boolean;
}

interface Motion { bob: number; step: number; tilt: number; blink: boolean; squashX: number; squashY: number; }

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = OUTLINE, lw = 2) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, rad: number, fill: string, stroke = OUTLINE, lw = 2) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, rad); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, w: number) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); }

function motion(frame: number, moving: boolean, hurt: boolean): Motion {
  if (hurt) { const i = Math.floor(frame / 2) % 8; return { bob: -1, step: 0, tilt: (i % 2 ? 1 : -1) * .06, blink: true, squashX: 1.07, squashY: .94 }; }
  if (moving) { const i = Math.floor(frame / 3) % 12; const t = i / 12; const s = Math.sin(t * Math.PI * 4); return { bob: -Math.abs(s) * 1.3, step: s, tilt: Math.sin(t * Math.PI * 2) * .025, blink: false, squashX: 1 + Math.abs(s) * .02, squashY: 1 - Math.abs(s) * .025 }; }
  const i = Math.floor(frame / 5) % 10; return { bob: i === 4 ? -.5 : 0, step: 0, tilt: 0, blink: i === 8, squashX: 1, squashY: 1 };
}

function drawFeet(ctx: Ctx, m: Motion) {
  const s = m.step * 3;
  ellipse(ctx, 28 - s, 61, 6, 2.7, BEAK, OUTLINE, 1.7);
  ellipse(ctx, 44 + s, 61, 6, 2.7, BEAK, OUTLINE, 1.7);
}

function drawBody(ctx: Ctx, m: Motion, elite: boolean) {
  const y = 47 + m.bob;
  ctx.save(); ctx.translate(36, y); ctx.rotate(m.tilt); ctx.scale(m.squashX, m.squashY); ctx.translate(-36, -y);
  ellipse(ctx, 36, y, 13.5, 12.2, FEATHER, OUTLINE, 2.3);
  ellipse(ctx, 32, y - 4, 7, 5, FEATHER_LIGHT, '', 0);
  ctx.globalAlpha = .32; ellipse(ctx, 39, y + 5, 9, 4, FEATHER_SHADE, '', 0); ctx.globalAlpha = 1;

  // Tailored police vest instead of a rectangular body block.
  ctx.beginPath(); ctx.moveTo(25, y - 5); ctx.quadraticCurveTo(36, y - 1, 47, y - 5); ctx.lineTo(45, y + 8); ctx.quadraticCurveTo(36, y + 12, 27, y + 8); ctx.closePath();
  ctx.fillStyle = NAVY; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  ctx.globalAlpha = .65; line(ctx, 28, y - 2, 44, y - 2, NAVY_LIGHT, 1.5); ctx.globalAlpha = 1;
  rounded(ctx, 29, y + 4, 14, 3.5, 1.5, NAVY_DARK, '', 0);
  rounded(ctx, 31, y - 2, 4, 5, 1, elite ? BRASS : RED, '', 0);
  rounded(ctx, 41, y - 2, 4, 4, 1, BRASS, '', 0);

  ellipse(ctx, 22.5, y + 1, 5.8, 7.7, NAVY_LIGHT, OUTLINE, 2);
  ellipse(ctx, 49.5, y + 1, 5.8, 7.7, NAVY_LIGHT, OUTLINE, 2);
  ctx.restore();
}

function drawHead(ctx: Ctx, dirX: number, m: Motion, elite: boolean) {
  const sign = dirX >= 0 ? 1 : -1;
  const y = 25 + m.bob;
  ctx.save(); ctx.translate(36, y); ctx.rotate(m.tilt * .7); ctx.scale(m.squashX, m.squashY); ctx.translate(-36, -y);
  ellipse(ctx, 36, y, 17.2, 15.7, FEATHER, OUTLINE, 2.5);
  ctx.globalAlpha = .72; ellipse(ctx, 30, y - 6, 8, 5, FEATHER_LIGHT, '', 0); ctx.globalAlpha = 1;
  ctx.globalAlpha = .30; ellipse(ctx, 40, y + 7, 10, 4, FEATHER_SHADE, '', 0); ctx.globalAlpha = 1;

  // Cap follows the head curve and reads clearly without dominating the face.
  ctx.beginPath(); ctx.moveTo(20, y - 9); ctx.quadraticCurveTo(36, y - 19, 52, y - 9); ctx.lineTo(50, y - 4); ctx.quadraticCurveTo(36, y - 10, 22, y - 4); ctx.closePath();
  ctx.fillStyle = NAVY_DARK; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(23, y - 8); ctx.quadraticCurveTo(36, y - 15, 49, y - 8); ctx.lineTo(48, y - 5); ctx.quadraticCurveTo(36, y - 10, 24, y - 5); ctx.closePath(); ctx.fillStyle = NAVY; ctx.fill();
  rounded(ctx, 34, y - 12, 5, 5, 2, BRASS, '', 0);
  if (elite) rounded(ctx, 30, y - 16, 12, 2.5, 1, BRASS, '', 0);

  const eyeX = 36 + sign * 8.5;
  if (m.blink) line(ctx, eyeX - 2.5, y, eyeX + 2.5, y, OUTLINE, 2.2);
  else { ellipse(ctx, eyeX, y - 1, 3.2, 4.5, '#1b1820', '', 0); ellipse(ctx, eyeX - sign * .7, y - 2.2, 1, 1.3, '#fff7e5', '', 0); }
  line(ctx, eyeX - sign * 4, y - 5.5, eyeX + sign * 2.5, y - 4.4, OUTLINE, 1.8);

  const bx = 36 + sign * 19;
  ctx.beginPath();
  if (sign > 0) { ctx.moveTo(bx - 5, y + 4); ctx.quadraticCurveTo(bx + 6, y + 3, bx + 10, y + 8); ctx.quadraticCurveTo(bx + 3, y + 12, bx - 5, y + 9); }
  else { ctx.moveTo(bx + 5, y + 4); ctx.quadraticCurveTo(bx - 6, y + 3, bx - 10, y + 8); ctx.quadraticCurveTo(bx - 3, y + 12, bx + 5, y + 9); }
  ctx.closePath(); ctx.fillStyle = BEAK; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  line(ctx, sign > 0 ? bx - 2 : bx + 2, y + 8.7, sign > 0 ? bx + 7 : bx - 7, y + 8.7, BEAK_DARK, 1.2);
  ctx.restore();
}

export function drawChibiPoliceDuckV3(input: PoliceDuckV3Input) {
  const { ctx, x, y, size, frame, dirX, moving, hurt, elite = false } = input;
  const m = motion(frame, moving, hurt); const scale = Math.max(.72, Math.min(1.08, size / 16));
  const gx = x + size / 2, gy = y + size;
  ctx.save(); ctx.globalAlpha *= hurt && Math.floor(frame / 2) % 2 === 0 ? .72 : 1;
  ctx.fillStyle = 'rgba(25,22,29,.24)'; ctx.beginPath(); ctx.ellipse(gx, gy + 2, 14 * scale, 4 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(Math.round(gx), Math.round(gy)); ctx.scale(scale, scale); ctx.translate(-PIVOT_X, -PIVOT_Y);
  drawFeet(ctx, m); drawBody(ctx, m, elite); drawHead(ctx, dirX, m, elite); ctx.restore();
}

export const CHIBI_POLICE_DUCK_V3_FRAME_SIZE = FRAME;
