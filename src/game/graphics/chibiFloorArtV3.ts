import { chibiThemeForFloor } from './themes';

const T = 32;
type Ctx = CanvasRenderingContext2D;

function hash(x: number, y: number, seed: number) {
  let n = Math.imul(x + seed * 17, 374761393) ^ Math.imul(y - seed * 11, 668265263);
  n = (n ^ (n >>> 13)) >>> 0;
  return Math.imul(n, 1274126177) >>> 0;
}
function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); ctx.restore();
}
function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, alpha = 1, width = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function dot(ctx: Ctx, x: number, y: number, color: string, alpha = 1, r = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function floorDetails(ctx: Ctx, px: number, py: number, x: number, y: number, floorIndex: number, h: number) {
  const t = chibiThemeForFloor(floorIndex);
  if (t.id === 'security') {
    if (h % 4 === 0) { line(ctx, px + 7, py + 9, px + 25, py + 9, t.trim, .12); line(ctx, px + 7, py + 22, px + 25, py + 22, t.wallShadow, .18); }
    if (h % 7 === 0) { dot(ctx, px + 7, py + 7, t.trim, .23, .8); dot(ctx, px + 25, py + 25, t.trim, .18, .8); }
  } else if (t.id === 'archives') {
    if (h % 3 === 0) { line(ctx, px + 5, py + 22, px + 14, py + 18, t.grout, .18); line(ctx, px + 14, py + 18, px + 24, py + 20, t.trim, .09); }
    if (h % 8 === 0) rect(ctx, px + 8, py + 7, 9, 2, t.lightColor, .07);
  } else if (t.id === 'executive') {
    if ((x + y) % 3 === 0) { rect(ctx, px + 3, py + 3, T - 6, T - 6, t.accent, .045); line(ctx, px + 7, py + 16, px + 25, py + 16, t.trim, .08); }
  } else if (t.id === 'vault') {
    rect(ctx, px + 4, py + 4, T - 8, T - 8, t.metal, .07);
    if (h % 2 === 0) { dot(ctx, px + 6, py + 6, t.trim, .17, .75); dot(ctx, px + 26, py + 26, t.trim, .12, .75); }
  } else if (t.id === 'gold_reserve') {
    if (h % 3 === 0) rect(ctx, px + 6, py + 7, T - 12, 3, t.lightColor, .10);
    line(ctx, px + 5, py + 26, px + 26, py + 5, t.gold, .08);
  }
}

function wallDetails(ctx: Ctx, px: number, py: number, x: number, y: number, floorIndex: number, h: number, cleanStart: boolean, frame: number) {
  const t = chibiThemeForFloor(floorIndex);
  rect(ctx, px, py, T, T, '#17191c');
  rect(ctx, px + 1, py + 1, T - 2, T - 2, t.wallShadow);
  rect(ctx, px + 2, py + 2, T - 4, 5, t.trim, .46);
  rect(ctx, px + 3, py + 3, T - 6, 1, t.lightColor, .25);
  rect(ctx, px + 3, py + 8, T - 6, 12, t.wall);
  rect(ctx, px + 4, py + 9, T - 8, 1, t.trim, .16);
  rect(ctx, px + 2, py + 21, T - 4, 9, t.wood);
  rect(ctx, px + 3, py + 22, T - 6, 1, t.trim, .13);
  rect(ctx, px + 1, py + 29, T - 2, 2, '#17191c', .72);

  if (cleanStart) return;
  const seed = h % 11;
  if (t.id === 'security' && seed < 3) {
    rect(ctx, px + 8, py + 10, 16, 8, '#14242c'); rect(ctx, px + 10, py + 12, 12, 4, t.accent, .25);
    rect(ctx, px + 20, py + 11, 2, 2, frame % 60 < 30 ? '#9bd7df' : t.wallShadow, .9);
  } else if (t.id === 'archives' && seed < 4) {
    rect(ctx, px + 7, py + 10, 18, 9, t.wood); rect(ctx, px + 9, py + 12, 14, 1, t.gold, .30); rect(ctx, px + 9, py + 15, 10, 2, t.floorA, .55);
  } else if (t.id === 'executive' && seed < 3) {
    rect(ctx, px + 9, py + 10, 14, 9, t.wood); rect(ctx, px + 10, py + 11, 12, 7, t.accent, .45); rect(ctx, px + 13, py + 13, 6, 2, t.gold, .28);
  } else if (t.id === 'vault' && seed < 4) {
    rect(ctx, px + 7, py + 9, 18, 11, t.metal); dot(ctx, px + 16, py + 14, t.gold, .55, 3); dot(ctx, px + 16, py + 14, '#25272b', .8, 1.4);
  } else if (t.id === 'gold_reserve' && seed < 5) {
    rect(ctx, px + 6, py + 10, 20, 7, t.gold, .45); rect(ctx, px + 8, py + 11, 16, 2, t.lightColor, .18);
  }
  void x; void y;
}

export function drawChibiFloorTileV3(
  ctx: Ctx, x: number, y: number, wall: boolean,
  gx: number, gy: number, frame: number, floorIndex: number,
) {
  const t = chibiThemeForFloor(floorIndex);
  const px = x * T, py = y * T;
  const h = hash(x + gx * 19, y + gy * 23, floorIndex + 1);
  const cleanStart = gx === 0 && gy === 0;
  if (wall) { wallDetails(ctx, px, py, x, y, floorIndex, h, cleanStart, frame); return; }

  // Slabs visuales de 64x64: la lógica sigue en tiles de 32, pero la junta fuerte solo cae cada 2 tiles.
  const slabX = Math.floor(x / 2), slabY = Math.floor(y / 2);
  const base = (slabX + slabY) % 2 === 0 ? t.floorA : t.floorB;
  rect(ctx, px, py, T, T, base);
  if (x % 2 === 0) rect(ctx, px, py, 1, T, t.grout, .55); else rect(ctx, px, py, 1, T, t.grout, .12);
  if (y % 2 === 0) rect(ctx, px, py, T, 1, t.grout, .55); else rect(ctx, px, py, T, 1, t.grout, .12);
  if (x % 2 === 1) rect(ctx, px + T - 1, py + 2, 1, T - 2, t.lightColor, .045);
  if (y % 2 === 1) rect(ctx, px + 2, py + T - 1, T - 2, 1, t.lightColor, .045);
  rect(ctx, px + 4, py + 4, T - 8, 1, t.lightColor, .045);
  floorDetails(ctx, px, py, x, y, floorIndex, h);
}
