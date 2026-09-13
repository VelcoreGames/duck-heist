import { chibiThemeForFloor } from './themes';

type Ctx = CanvasRenderingContext2D;
const W = 480;
const H = 352;
const OUTLINE = '#30272b';

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = '', lw = 0) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function glow(ctx: Ctx, x: number, y: number, radius: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 3, x, y, radius);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
}
function inlay(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 1.25;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.stroke(); ctx.restore();
}
function motes(ctx: Ctx, frame: number, colorA: string, colorB: string, seed: number, count = 10) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const p = (frame * .0085 + i / count + seed * .037) % 1;
    const x = 100 + ((i * 83 + seed * 29) % 280) + Math.sin(frame * .017 + i * 2.2) * 12;
    const y = 280 - p * 205;
    ctx.globalAlpha = (1 - p) * .30;
    ctx.fillStyle = i % 3 === 0 ? colorA : colorB;
    ctx.beginPath(); ctx.arc(x, y, i % 4 === 0 ? 1.45 : .85, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawChibiItemRoomDecorV3(ctx: Ctx, frame: number, floorIndex: number) {
  const t = chibiThemeForFloor(floorIndex);
  const cx = W / 2, cy = H / 2;
  glow(ctx, cx, cy, 150, '#9d66c7', .12);
  ctx.save();
  const rug = ctx.createLinearGradient(cx - 80, cy - 55, cx + 80, cy + 55);
  rug.addColorStop(0, '#6b3451'); rug.addColorStop(.5, '#823955'); rug.addColorStop(1, '#532a48');
  ctx.fillStyle = rug; ctx.beginPath(); ctx.roundRect(cx - 78, cy - 56, 156, 112, 13); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = .92; ctx.strokeStyle = t.gold; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx - 70, cy - 48, 140, 96, 10); ctx.stroke();
  ctx.globalAlpha = .32; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(cx - 62, cy - 40, 124, 80, 8); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const px = cx + Math.cos(a) * 57, py = cy + Math.sin(a) * 35;
    glow(ctx, px, py, 15, t.lightColor, .07 + Math.sin(frame * .05 + i) * .015);
  }
  motes(ctx, frame, '#f2d07a', '#c28cdd', 1, 12);
}

export function drawChibiShopRoomDecorV3(ctx: Ctx, frame: number, floorIndex: number) {
  const t = chibiThemeForFloor(floorIndex);
  const cx = W / 2, cy = H / 2 + 12;
  glow(ctx, cx, 112, 135, '#e5b06b', .075);
  ctx.save();
  const rug = ctx.createLinearGradient(cx - 140, cy, cx + 140, cy);
  rug.addColorStop(0, '#5b2831'); rug.addColorStop(.5, '#873845'); rug.addColorStop(1, '#5b2831');
  ctx.fillStyle = rug; ctx.beginPath(); ctx.roundRect(cx - 140, cy - 67, 280, 134, 12); ctx.fill();
  ctx.strokeStyle = t.gold; ctx.globalAlpha = .62; ctx.lineWidth = 2; ctx.stroke();
  ctx.globalAlpha = .25; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx - 131, cy - 58, 262, 116, 9); ctx.stroke(); ctx.restore();
  for (let i = -2; i <= 2; i++) {
    ctx.save(); ctx.globalAlpha = .10; ctx.fillStyle = t.trim;
    ctx.beginPath(); ctx.ellipse(cx + i * 48, cy, 17, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  motes(ctx, frame, t.gold, t.lightColor, 4, 7);
}

export function drawChibiBossRoomDecorV3(ctx: Ctx, frame: number, floorIndex: number, exitReady: boolean) {
  const t = chibiThemeForFloor(floorIndex);
  const cx = W / 2, cy = H / 2;
  const pulse = .72 + Math.sin(frame * .04) * .08;
  glow(ctx, cx, cy, 172, '#9d3a3f', .055);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = '#6f3035'; ctx.globalAlpha = .5; ctx.lineWidth = 3;
  ctx.strokeRect(-66, -66, 132, 132);
  ctx.strokeStyle = t.gold; ctx.globalAlpha = .22; ctx.lineWidth = 1.3; ctx.strokeRect(-57, -57, 114, 114); ctx.restore();
  ctx.save(); ctx.strokeStyle = '#9b4649'; ctx.globalAlpha = .35 * pulse; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 78, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([5, 7]); ctx.strokeStyle = t.gold; ctx.globalAlpha = .22; ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  if (exitReady) glow(ctx, cx, cy, 190, t.lightColor, .035 + Math.sin(frame * .045) * .01);
}

export function drawChibiTreasureRoomDecorV3(ctx: Ctx, frame: number, floorIndex: number, secret = false) {
  const t = chibiThemeForFloor(floorIndex);
  const cx = W / 2, cy = H / 2;
  glow(ctx, cx, cy, secret ? 125 : 155, secret ? '#9d72bd' : t.lightColor, secret ? .075 : .095);
  inlay(ctx, cx - 105, cy - 68, 210, 136, secret ? '#9470a7' : t.gold, secret ? .28 : .42);
  inlay(ctx, cx - 94, cy - 57, 188, 114, t.trim, .15);
  ctx.save(); ctx.globalAlpha = secret ? .11 : .16; ctx.strokeStyle = secret ? '#b89ac8' : t.gold; ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(cx + i * 34, cy - 49); ctx.lineTo(cx + i * 34, cy + 49); ctx.stroke();
  }
  ctx.restore();
  motes(ctx, frame, secret ? '#c8a8dc' : '#ffe5a0', secret ? t.accent : t.gold, secret ? 8 : 6, secret ? 8 : 12);
}

export function drawChibiHiddenDoorV3(ctx: Ctx, x: number, y: number, dir: string, frame: number, floorIndex: number) {
  const t = chibiThemeForFloor(floorIndex);
  const horizontal = dir === 'up' || dir === 'down';
  ctx.save();
  rr(ctx, x + 2, y + 2, 28, 28, 5, t.wallShadow, OUTLINE, 1.2);
  rr(ctx, x + 5, y + 5, 22, 22, 4, t.wall, '', 0);
  ctx.globalAlpha = .28; ctx.fillStyle = t.trim;
  if (horizontal) { ctx.fillRect(x + 7, y + 8, 18, 1); ctx.fillRect(x + 7, y + 23, 18, 1); }
  else { ctx.fillRect(x + 8, y + 7, 1, 18); ctx.fillRect(x + 23, y + 7, 1, 18); }
  ctx.globalAlpha = 1;
  const pulse = .32 + Math.sin(frame * .035) * .04;
  ctx.strokeStyle = t.wallShadow; ctx.lineWidth = 1.6; ctx.beginPath();
  ctx.moveTo(x + 16, y + 5); ctx.lineTo(x + 13, y + 12); ctx.lineTo(x + 18, y + 17); ctx.lineTo(x + 14, y + 25); ctx.stroke();
  ctx.globalAlpha = pulse; ctx.strokeStyle = t.gold; ctx.lineWidth = .8; ctx.beginPath();
  ctx.moveTo(x + 16.5, y + 6); ctx.lineTo(x + 14, y + 12); ctx.lineTo(x + 18.5, y + 17); ctx.stroke();
  ctx.restore();
}
