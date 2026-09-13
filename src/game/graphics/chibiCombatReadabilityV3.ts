import type { Enemy } from '../types';

type Ctx = CanvasRenderingContext2D;
const OUTLINE = '#2d2429';

function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = '', lw = 0) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function glow(ctx: Ctx, x: number, y: number, radius: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, radius);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = g; ctx.fillRect(x-radius,y-radius,radius*2,radius*2); ctx.restore();
}

export function drawChibiEnemyHealthV3(ctx: Ctx, e: Enemy) {
  if (e.isBoss || e.hp >= e.maxHp || e.maxHp <= 0) return;
  const ratio = clamp(e.hp / e.maxHp);
  const w = Math.max(16, e.size + 4);
  const x = e.x + e.size / 2 - w / 2;
  const y = e.y - 8;
  const fill = e.elite ? '#e5ba43' : ratio < .3 ? '#e76659' : '#cf574f';
  ctx.save();
  rr(ctx, x - 1, y - 1, w + 2, 5, 2.5, 'rgba(20,15,18,.62)', OUTLINE, .75);
  rr(ctx, x, y, w, 3, 1.5, 'rgba(67,55,58,.78)');
  if (ratio > .015) {
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, 3, 1.5); ctx.clip();
    const g = ctx.createLinearGradient(x, y, x, y + 3);
    g.addColorStop(0, '#fff1c8'); g.addColorStop(.15, fill); g.addColorStop(1, e.elite ? '#a97824' : '#8d3738');
    ctx.fillStyle = g; ctx.fillRect(x, y, Math.max(1.5, w * ratio), 3); ctx.restore();
  }
  ctx.globalAlpha = .35; ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + .5, Math.max(0, w * ratio - 4), .55); ctx.restore();
}

function warningBadge(ctx: Ctx, cx: number, y: number, t: number, color: string) {
  const bob = Math.sin(t * Math.PI) * 1.8;
  ctx.save(); ctx.translate(cx, y - bob); ctx.globalAlpha = .64 + t * .3;
  glow(ctx, 0, 0, 8, color, .18);
  ctx.fillStyle = '#2b2023'; ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#fff1d7'; ctx.lineWidth = 1.35; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(0, 1); ctx.stroke();
  ctx.fillStyle = '#fff1d7'; ctx.beginPath(); ctx.arc(0, 3, .75, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function aimLine(ctx: Ctx, sx: number, sy: number, angle: number, reach: number, t: number, color: string, width: number) {
  const ex = sx + Math.cos(angle) * reach * t;
  const ey = sy + Math.sin(angle) * reach * t;
  const grad = ctx.createLinearGradient(sx, sy, ex, ey);
  grad.addColorStop(0, 'rgba(255,255,255,.05)'); grad.addColorStop(.35, color); grad.addColorStop(1, color);
  ctx.save(); ctx.globalAlpha = .18 + t * .42; ctx.strokeStyle = grad; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
  glow(ctx, ex, ey, 7, color, .07 + t * .08);
}

export function drawChibiEnemyTelegraphV3(ctx: Ctx, e: Enemy, frame: number, angle: number, reach: number) {
  if (e.telegraph <= .05) return;
  const t = clamp(e.telegraph);
  const cx = e.x + e.size / 2, cy = e.y + e.size / 2;
  const sx = cx + Math.cos(angle) * e.size * .48;
  const sy = cy + Math.sin(angle) * e.size * .48;
  const shotgun = e.behavior === 'shotgunner';
  const sniper = e.behavior === 'sniper';
  const shielded = e.behavior === 'shielded';
  const color = shotgun ? '#ef9b46' : shielded ? '#e6c15f' : '#eb6257';

  ctx.save();
  if (shotgun) {
    const spread = .20;
    for (const d of [-spread, 0, spread]) aimLine(ctx, sx, sy, angle + d, reach, t, color, d === 0 ? 1.65 : .85);
    ctx.globalAlpha = .11 + t * .12; ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle-spread) * reach * t, sy + Math.sin(angle-spread) * reach * t);
    ctx.lineTo(sx + Math.cos(angle+spread) * reach * t, sy + Math.sin(angle+spread) * reach * t);
    ctx.closePath(); ctx.fill();
  } else {
    aimLine(ctx, sx, sy, angle, sniper ? reach : reach, sniper ? 1 : t, color, sniper ? 1.15 : shielded ? 2.1 : 1.45);
  }
  if (sniper) {
    const ex = sx + Math.cos(angle) * reach, ey = sy + Math.sin(angle) * reach;
    ctx.globalAlpha = .28 + t * .35; ctx.strokeStyle = color; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.arc(ex, ey, 5 + Math.sin(frame*.12)*.7, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex-7,ey);ctx.lineTo(ex-3,ey);ctx.moveTo(ex+3,ey);ctx.lineTo(ex+7,ey);ctx.moveTo(ex,ey-7);ctx.lineTo(ex,ey-3);ctx.moveTo(ex,ey+3);ctx.lineTo(ex,ey+7);ctx.stroke();
  }
  ctx.restore();
  warningBadge(ctx, cx, e.y - 10, t, color);
}
