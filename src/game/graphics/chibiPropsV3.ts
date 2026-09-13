type Ctx = CanvasRenderingContext2D;

const OUTLINE = '#352a2d';
const SHADOW = 'rgba(28,22,26,.13)';
const WOOD = '#6b4738';
const WOOD_LIGHT = '#8a6250';
const WOOD_DARK = '#3b2824';
const TEAL = '#315352';
const TEAL_LIGHT = '#4d7470';
const CREAM = '#e7d9c1';
const CREAM_LIGHT = '#fff4df';
const MARBLE = '#d7c9af';
const MARBLE_LIGHT = '#f2e6cf';
const MARBLE_DARK = '#a99a81';
const GOLD = '#caa251';
const GOLD_LIGHT = '#efd98a';
const GOLD_DARK = '#8b6b31';
const METAL = '#748084';
const METAL_LIGHT = '#adb9bb';
const METAL_DARK = '#485255';
const RED = '#8f3440';
const RED_LIGHT = '#bd4f5c';

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = OUTLINE, lw = 1.55) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUTLINE, lw = 1.55) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string) { ctx.fillStyle = fill; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function shadow(ctx: Ctx, x: number, y: number, rx = 14, ry = 4) {
  ctx.save();
  ctx.fillStyle = SHADOW;
  ctx.globalAlpha = .62;
  ctx.beginPath(); ctx.ellipse(x + 16, y + 28.3, rx * 1.12, ry * 1.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .72;
  ctx.beginPath(); ctx.ellipse(x + 16, y + 27.9, rx * .82, ry * .72, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function counter(ctx: Ctx, x: number, y: number) {
  shadow(ctx, x, y, 15, 4);
  rr(ctx, x + 2, y + 10, 28, 17, 4, WOOD_DARK);
  rr(ctx, x + 4, y + 12, 24, 13, 3, WOOD);
  rect(ctx, x + 6, y + 13, 20, 2, WOOD_LIGHT);
  rr(ctx, x, y + 6, 32, 7, 3, MARBLE);
  rect(ctx, x + 3, y + 7, 26, 1, MARBLE_LIGHT);
  ctx.globalAlpha = .22; rect(ctx, x + 5, y + 9, 17, 1, '#ffffff'); ctx.globalAlpha = 1;
  rect(ctx, x + 5, y + 25, 22, 1, GOLD_DARK);
  rr(ctx, x + 8, y + 17, 16, 7, 2, GOLD_DARK, '', 0);
  rr(ctx, x + 9, y + 18, 14, 5, 2, TEAL, '', 0);
  rect(ctx, x + 10, y + 19, 12, 1, TEAL_LIGHT);
}

function barrier(ctx: Ctx, x: number, y: number) {
  shadow(ctx, x, y, 15, 3.5);
  ellipse(ctx, x + 7, y + 27, 5, 2.7, GOLD_DARK);
  ellipse(ctx, x + 25, y + 27, 5, 2.7, GOLD_DARK);
  rr(ctx, x + 5, y + 8, 4, 18, 2, GOLD);
  rr(ctx, x + 23, y + 8, 4, 18, 2, GOLD);
  ellipse(ctx, x + 7, y + 9, 4, 3, GOLD_LIGHT);
  ellipse(ctx, x + 25, y + 9, 4, 3, GOLD_LIGHT);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.bezierCurveTo(x + 14, y + 18, x + 18, y + 18, x + 23, y + 12); ctx.stroke();
  ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.bezierCurveTo(x + 14, y + 18, x + 18, y + 18, x + 23, y + 12); ctx.stroke();
  ctx.strokeStyle = RED_LIGHT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, y + 11.5); ctx.bezierCurveTo(x + 14, y + 16, x + 18, y + 16, x + 22, y + 11.5); ctx.stroke();
  ctx.globalAlpha = .32; ellipse(ctx, x + 6.4, y + 8.4, 1.4, .8, '#fff0b6', '', 0); ellipse(ctx, x + 24.4, y + 8.4, 1.4, .8, '#fff0b6', '', 0); ctx.globalAlpha = 1;
}

function shelf(ctx: Ctx, x: number, y: number) {
  shadow(ctx, x, y, 15, 4);
  rr(ctx, x + 3, y + 4, 26, 24, 3, METAL_DARK);
  rr(ctx, x + 5, y + 6, 22, 20, 2, TEAL);
  rect(ctx, x + 6, y + 13, 20, 2, METAL_LIGHT);
  rect(ctx, x + 6, y + 21, 20, 2, METAL_LIGHT);
  rr(ctx, x + 7, y + 8, 6, 4, 1, CREAM, '', 0);
  rr(ctx, x + 15, y + 7, 5, 5, 1, WOOD_LIGHT, '', 0);
  rr(ctx, x + 21, y + 8, 4, 4, 1, GOLD_DARK, '', 0);
  rr(ctx, x + 8, y + 17, 8, 3, 1, WOOD, '', 0);
  rr(ctx, x + 18, y + 16, 7, 4, 1, CREAM_LIGHT, '', 0);
}

function moneyBag(ctx: Ctx, x: number, y: number, frame: number) {
  const bob = Math.sin(frame * .04) * .6;
  shadow(ctx, x, y, 13, 4);
  ellipse(ctx, x + 16, y + 20 + bob, 11.5, 9.5, '#ad8b64');
  ctx.globalAlpha = .55; ellipse(ctx, x + 12, y + 17 + bob, 4, 3, '#d3b48a', '', 0); ctx.globalAlpha = 1;
  rr(ctx, x + 10, y + 8 + bob, 12, 6, 2, '#c7a478');
  rect(ctx, x + 9, y + 12 + bob, 14, 2, WOOD_DARK);
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = GOLD_DARK; ctx.fillText('$', x + 16, y + 21 + bob);
}

function breadCrate(ctx: Ctx, x: number, y: number) {
  shadow(ctx, x, y, 15, 4);
  ellipse(ctx, x + 10, y + 10, 6, 5, '#d7a75e');
  ellipse(ctx, x + 21, y + 9, 6, 4.5, '#e4bd73');
  rect(ctx, x + 7, y + 8, 6, 1, CREAM_LIGHT);
  rect(ctx, x + 18, y + 7, 5, 1, CREAM_LIGHT);
  rr(ctx, x + 3, y + 10, 26, 17, 3, '#8c5935');
  rect(ctx, x + 5, y + 14, 22, 3, '#a96c3c');
  rect(ctx, x + 5, y + 21, 22, 3, '#70432a');
  rect(ctx, x + 8, y + 11, 2, 15, WOOD_DARK);
  rect(ctx, x + 22, y + 11, 2, 15, WOOD_DARK);
}

function column(ctx: Ctx, x: number, y: number) {
  shadow(ctx, x, y, 14, 4);
  rr(ctx, x + 8, y + 3, 16, 25, 4, MARBLE);
  rect(ctx, x + 10, y + 5, 4, 20, MARBLE_LIGHT);
  rect(ctx, x + 21, y + 5, 2, 20, MARBLE_DARK);
  rr(ctx, x + 5, y + 1, 22, 6, 3, CREAM);
  rr(ctx, x + 5, y + 24, 22, 6, 3, CREAM);
  rect(ctx, x + 7, y + 6, 2, 18, GOLD_DARK);
  rect(ctx, x + 23, y + 6, 2, 18, GOLD_DARK);
}

function safe(ctx: Ctx, x: number, y: number, frame: number) {
  shadow(ctx, x, y, 15, 4);
  rr(ctx, x + 3, y + 5, 26, 23, 4, METAL_DARK);
  rr(ctx, x + 5, y + 7, 22, 19, 3, METAL);
  rect(ctx, x + 7, y + 9, 18, 2, METAL_LIGHT);
  rr(ctx, x + 9, y + 12, 14, 11, 2, '#59676a');
  ctx.globalAlpha = .24; rect(ctx, x + 7, y + 9, 11, 1, '#ffffff'); ctx.globalAlpha = 1;
  ellipse(ctx, x + 16, y + 17, 5, 5, GOLD_DARK);
  const a = frame * .025; const hx = Math.cos(a) * 4, hy = Math.sin(a) * 4;
  ellipse(ctx, x + 16 + hx, y + 17 + hy, 1.8, 1.8, GOLD_LIGHT, '', 0);
}

function rubble(ctx: Ctx, x: number, y: number) {
  shadow(ctx, x, y, 15, 3.5);
  rr(ctx, x + 4, y + 19, 11, 8, 2, MARBLE_DARK);
  rr(ctx, x + 12, y + 15, 13, 11, 2, MARBLE);
  rr(ctx, x + 21, y + 20, 7, 6, 2, WOOD_LIGHT);
  ellipse(ctx, x + 9, y + 16, 2, 2, GOLD, '', 0);
  ellipse(ctx, x + 18, y + 12, 2, 2, TEAL_LIGHT, '', 0);
}

export function drawChibiLobbyObstacleV3(ctx: Ctx, x: number, y: number, kind: number, frame: number) {
  switch (kind) {
    case 0: counter(ctx, x, y); break;
    case 1: barrier(ctx, x, y); break;
    case 2: shelf(ctx, x, y); break;
    case 3: moneyBag(ctx, x, y, frame); break;
    case 4: breadCrate(ctx, x, y); break;
    case 5: column(ctx, x, y); break;
    case 6: safe(ctx, x, y, frame); break;
    default: rubble(ctx, x, y); break;
  }
}
