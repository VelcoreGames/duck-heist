type Ctx = CanvasRenderingContext2D;

export type ChibiBirdEnemyKind = 'pigeon' | 'goose';

export interface ChibiBirdEnemyV3Input {
  ctx: Ctx;
  x: number;
  y: number;
  size: number;
  frame: number;
  dirX: number;
  dirY: number;
  moving: boolean;
  hurt: boolean;
  elite?: boolean;
  kind: ChibiBirdEnemyKind;
}

const OUTLINE = '#342b2e';
const PIGEON = '#8f9a9a';
const PIGEON_LIGHT = '#c3ccca';
const PIGEON_DARK = '#657173';
const GOOSE = '#eee5cf';
const GOOSE_LIGHT = '#fff7e5';
const GOOSE_DARK = '#c6b899';
const BEAK = '#e7943d';
const VEST = '#29484b';
const VEST_LIGHT = '#456d6c';
const BRASS = '#ccaa5b';

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = OUTLINE, lw = 1.4) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUTLINE, lw = 1.25) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function facing(dirX: number, dirY: number) {
  if (Math.abs(dirY) > Math.abs(dirX)) return dirY < 0 ? 'up' : 'down';
  return dirX < 0 ? 'left' : 'right';
}

export function drawChibiBirdEnemyV3(input: ChibiBirdEnemyV3Input) {
  const { ctx, x, y, size, frame, dirX, dirY, moving, hurt, elite = false, kind } = input;
  const isGoose = kind === 'goose';
  const scale = Math.max(.72, Math.min(1.0, size / (isGoose ? 19 : 18))) * (elite ? 1.035 : 1);
  const cx = x + size / 2;
  const feetY = y + size;
  const mode = facing(dirX, dirY);
  const cycle = frame % 24;
  const phase = cycle / 24 * Math.PI * 2;
  const step = moving ? Math.sin(phase) : 0;
  const lift = moving ? Math.abs(step) * 1.25 : 0;
  const breathe = moving ? 0 : Math.sin(frame * .055) * .28;
  const bob = -lift - breathe;
  const tilt = moving ? step * .025 : Math.sin(frame * .027) * .006;
  const body = isGoose ? GOOSE : PIGEON;
  const light = isGoose ? GOOSE_LIGHT : PIGEON_LIGHT;
  const dark = isGoose ? GOOSE_DARK : PIGEON_DARK;
  const headY = isGoose ? -24 : -20;

  ctx.save();
  ctx.fillStyle = '#241c20'; ctx.globalAlpha = .09;
  ctx.beginPath(); ctx.ellipse(cx, feetY + 1, (isGoose ? 11.5 : 10) * scale, 2.7 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = hurt && Math.floor(frame / 2) % 2 === 0 ? .62 : 1;
  ctx.translate(cx, feetY + bob);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);

  const spread = isGoose ? 5.7 : 5.0;
  ellipse(ctx, -spread - step * 1.3, -1 - Math.max(0, step) * 1.2, 3.8, 1.65, BEAK, OUTLINE, 1.1);
  ellipse(ctx, spread + step * 1.3, -1 - Math.max(0, -step) * 1.2, 3.8, 1.65, BEAK, OUTLINE, 1.1);

  ellipse(ctx, 0, -10, isGoose ? 10.5 : 10, isGoose ? 11.8 : 10.4, body, OUTLINE, 1.65);
  ctx.globalAlpha = .52; ellipse(ctx, -3.6, -14, 5.1, 3.7, light, '', 0); ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(-9.2, -13.4); ctx.quadraticCurveTo(0, -9.2, 9.2, -13.4);
  ctx.lineTo(8, -4.2); ctx.quadraticCurveTo(0, -.8, -8, -4.2); ctx.closePath();
  ctx.fillStyle = VEST; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.globalAlpha = .5; ctx.strokeStyle = VEST_LIGHT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5.8, -10.7); ctx.lineTo(5.8, -10.7); ctx.stroke(); ctx.globalAlpha = 1;
  rr(ctx, -2.2, -10, 4.4, 4.2, 1.1, BRASS, '', 0);

  if (isGoose) {
    rr(ctx, -4.7, -27.5, 9.4, 15.5, 4.2, body, OUTLINE, 1.5);
    ctx.globalAlpha = .48; rr(ctx, -2.6, -26.2, 3.1, 9.3, 1.5, light, '', 0); ctx.globalAlpha = 1;
  }

  ellipse(ctx, 0, headY, isGoose ? 9.2 : 10.7, isGoose ? 8.8 : 9.7, body, OUTLINE, 1.65);
  ctx.globalAlpha = .55; ellipse(ctx, -3.5, headY - 3.3, 4.3, 2.7, light, '', 0); ctx.globalAlpha = 1;

  if (mode === 'up') {
    ctx.globalAlpha = .38;
    ctx.strokeStyle = dark; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-4, headY + 2); ctx.lineTo(0, headY + 5); ctx.lineTo(4, headY + 2); ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (mode === 'down') {
    for (const ex of [-3.5, 3.5]) {
      ellipse(ctx, ex, headY - 1.2, 1.65, 2.3, '#211d22', '', 0);
      ellipse(ctx, ex - .4, headY - 2, .45, .55, '#fff6de', '', 0);
    }
    ctx.beginPath(); ctx.moveTo(-5, headY + 3); ctx.quadraticCurveTo(0, headY + 1.7, 5, headY + 3); ctx.quadraticCurveTo(2.8, headY + 7, 0, headY + 7.2); ctx.quadraticCurveTo(-2.8, headY + 7, -5, headY + 3); ctx.closePath();
    ctx.fillStyle = BEAK; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  } else {
    const s = mode === 'right' ? 1 : -1;
    ellipse(ctx, s * 4.2, headY - 1.5, 1.7, 2.45, '#211d22', '', 0);
    ellipse(ctx, s * 3.8, headY - 2.3, .45, .55, '#fff6de', '', 0);
    ctx.beginPath();
    ctx.moveTo(s * 6.7, headY + 2.5); ctx.lineTo(s * 12.5, headY + 4.4); ctx.lineTo(s * 6.7, headY + 6.1); ctx.closePath();
    ctx.fillStyle = BEAK; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  }

  if (!isGoose) {
    // Pigeon neck iridescence, kept subtle and material-like.
    ctx.globalAlpha = .28;
    ctx.fillStyle = '#708f83'; ctx.beginPath(); ctx.ellipse(-3, -15.8, 3.2, 2.2, -.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#816e8e'; ctx.beginPath(); ctx.ellipse(3, -15.2, 2.7, 1.8, .35, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (elite) {
    rr(ctx, -4.3, headY - (isGoose ? 11 : 12), 8.6, 2.2, 1, BRASS, OUTLINE, .9);
  }
  ctx.restore();
}
