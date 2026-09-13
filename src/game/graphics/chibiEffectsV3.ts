import type { Enemy, Particle, Projectile } from '../types';

type Ctx = CanvasRenderingContext2D;
const OUTLINE = '#30272b';

function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, alpha = 1, rotation = 0) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = fill;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function glow(ctx: Ctx, x: number, y: number, radius: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, radius);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
}
function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = '', lw = 0) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function sparkle(ctx: Ctx, x: number, y: number, size: number, color: string, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y); ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.stroke(); ctx.restore();
}
function flame(ctx: Ctx, x: number, y: number, size: number, phase: number, alpha: number) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(Math.sin(phase) * .09);
  ctx.fillStyle = '#ef6a3f'; ctx.beginPath(); ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * .82, -size * .35, size * .62, size * .75, 0, size);
  ctx.bezierCurveTo(-size * .72, size * .65, -size * .72, -size * .28, 0, -size); ctx.fill();
  ctx.fillStyle = '#ffd06b'; ctx.beginPath(); ctx.moveTo(0, -size * .55);
  ctx.bezierCurveTo(size * .38, -.1 * size, size * .32, size * .48, 0, size * .6);
  ctx.bezierCurveTo(-size * .34, size * .42, -size * .28, 0, 0, -size * .55); ctx.fill(); ctx.restore();
}

function projectilePalette(type: string, friendly: boolean) {
  if (type === 'plasma_bread') return { core: '#d8a4f1', rim: '#8f57b9', glow: '#c88cf0' };
  if (type === 'drone_shot' || type === 'enemy_bullet') return { core: '#ffd5cf', rim: '#d84945', glow: '#ff5b4f' };
  if (type === 'pistol') return { core: '#eef7ff', rim: '#6797c9', glow: '#8ac5ef' };
  if (type === 'buckshot') return { core: '#fff1b7', rim: '#db8635', glow: '#ffb85a' };
  if (type.includes('gold') || type === 'coin_proj' || type.includes('quack')) return { core: '#fff8c9', rim: '#d59c35', glow: '#f4d56a' };
  if (type.includes('yolk')) return { core: '#fff0a0', rim: '#e9a625', glow: '#f7c847' };
  return friendly ? { core: '#fff1be', rim: '#b57d3e', glow: '#e7bd70' } : { core: '#ffe0dc', rim: '#b74643', glow: '#e85c57' };
}

export function drawChibiProjectileV3(ctx: Ctx, p: Projectile, frame: number) {
  const speed = Math.hypot(p.vx, p.vy) || 1;
  const vx = p.vx / speed, vy = p.vy / speed;
  const ang = Math.atan2(vy, vx);
  const pal = projectilePalette(p.type, p.friendly);
  const nuclear = Boolean(p.nuclear);
  const pulse = 1 + Math.sin(frame * .22 + p.x * .03) * .07;
  const trail = Math.min(12, 4.5 + speed * 1.35) * (nuclear ? 1.2 : 1);

  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
  if (nuclear) {
    glow(ctx, 0, 0, 15, 'rgba(156,235,105,.95)', .22);
    ctx.strokeStyle = 'rgba(183,244,126,.48)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, 8.5 + Math.sin(frame * .16) * 1.2, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  glow(ctx, -1.5, 0, nuclear ? 11 : 7, pal.glow, nuclear ? .22 : .14);
  const tg = ctx.createLinearGradient(-trail, 0, 1, 0);
  tg.addColorStop(0, 'rgba(255,255,255,0)'); tg.addColorStop(1, pal.glow);
  ctx.save(); ctx.globalAlpha = nuclear ? .28 : .19; ctx.fillStyle = tg;
  ctx.beginPath(); ctx.moveTo(-trail, 0); ctx.lineTo(-2, -2.1); ctx.lineTo(1, 0); ctx.lineTo(-2, 2.1); ctx.closePath(); ctx.fill(); ctx.restore();

  switch (p.type) {
    case 'quack': case 'quack_power': case 'quack_laser': {
      const r = p.type === 'quack_power' ? 4.5 : 3.4;
      ellipse(ctx, 0, 0, r * pulse, r * .84, pal.rim, .95);
      ellipse(ctx, .4, -.45, r * .63, r * .50, pal.core, 1);
      sparkle(ctx, .5, -.6, 1.35, '#ffffff', .82); break;
    }
    case 'breadcrumb': case 'homing_crumb': {
      ctx.rotate(frame * .055);
      rounded(ctx, -3.2, -2.4, 6.4, 4.8, 1.8, '#c78e4a', OUTLINE, .65);
      rounded(ctx, -2.1, -1.55, 4.2, 2.7, 1.2, '#ebc882');
      ellipse(ctx, .9, -.7, .65, .45, '#fff1c6', .8); break;
    }
    case 'baguette': case 'sniper_baguette': {
      const w = p.type === 'sniper_baguette' ? 13 : 11;
      rounded(ctx, -w / 2, -2.2, w, 4.4, 2.1, '#d69b50', OUTLINE, .7);
      rounded(ctx, -w / 2 + 1, -1.45, w - 2, 2.45, 1.2, '#efc77c');
      for (let i = -1; i <= 1; i++) { ctx.strokeStyle = '#b97739'; ctx.lineWidth = .65; ctx.beginPath(); ctx.moveTo(i * 3 - .7, -1.4); ctx.lineTo(i * 3 + .8, .1); ctx.stroke(); } break;
    }
    case 'bread_boomerang': {
      ctx.rotate(frame * .21); ctx.strokeStyle = '#d69b50'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, 5, .35, Math.PI - .35); ctx.stroke();
      ctx.strokeStyle = '#f0c87e'; ctx.lineWidth = 1.65; ctx.beginPath(); ctx.arc(0, -.3, 5, .45, Math.PI - .45); ctx.stroke(); break;
    }
    case 'rubber_duck': {
      ctx.rotate(-ang);
      ellipse(ctx, -1, 1, 4.2, 2.7, '#f1d153', .98); ellipse(ctx, 1.7, -1.7, 2.4, 2.3, '#f6dd66', 1);
      rounded(ctx, 3.2, -1.8, 3.5, 1.5, .7, '#ea8c2d'); ellipse(ctx, 2.2, -2.2, .42, .52, '#292126'); break;
    }
    case 'feather': {
      ctx.rotate(frame * .12); ctx.strokeStyle = '#d5d6d5'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-4.5, 0); ctx.lineTo(4.5, 0); ctx.stroke();
      ctx.fillStyle = '#f8f5e9'; ctx.beginPath(); ctx.ellipse(0, -1, 4.6, 1.5, -.18, 0, Math.PI * 2); ctx.fill(); break;
    }
    case 'golden_egg': case 'egg_shell': case 'yolk': {
      const fill = p.type === 'egg_shell' ? '#f7f0df' : p.type === 'yolk' ? '#f3bd36' : '#f3cb4a';
      ellipse(ctx, 0, 0, 3.2, 4.2, fill, 1, -.12);
      ellipse(ctx, -1, -1.4, .8, 1.15, '#fff9df', .65, -.12); break;
    }
    case 'plasma_bread': {
      glow(ctx, 0, 0, 10, pal.glow, .28);
      rounded(ctx, -4.2, -3.1, 8.4, 6.2, 2.4, pal.rim, OUTLINE, .65);
      rounded(ctx, -3, -2, 6, 3.7, 1.8, pal.core); sparkle(ctx, -1, -1.3, 1.25, '#fff', .7); break;
    }
    case 'toast': case 'toast_stick': {
      ctx.rotate(frame * .035);
      rounded(ctx, -3.8, -3.7, 7.6, 7.4, 2.1, '#98592e', OUTLINE, .65);
      rounded(ctx, -2.7, -2.7, 5.4, 5.1, 1.6, '#d79955');
      if (p.type === 'toast_stick') flame(ctx, -1.4, -4.3, 2.4, frame * .18, .72); break;
    }
    case 'coin_proj': {
      ellipse(ctx, 0, 0, 3.7, 3.7, '#c98b28'); ellipse(ctx, 0, -.2, 2.65, 2.65, '#f4cf56');
      ctx.strokeStyle = '#fff0a1'; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(0, 0, 1.45, -.8, .8); ctx.stroke(); break;
    }
    case 'enemy_bullet': case 'pistol': case 'buckshot': case 'drone_shot': {
      const rr = p.type === 'buckshot' ? 2.7 : 3.1;
      ellipse(ctx, 0, 0, rr, rr * .82, pal.rim); ellipse(ctx, .45, -.35, rr * .53, rr * .42, pal.core);
      sparkle(ctx, .5, -.45, .9, '#ffffff', .7); break;
    }
    case 'briefcase': {
      rounded(ctx, -4.5, -3.2, 9, 6.4, 1.4, '#644435', OUTLINE, .7);
      rounded(ctx, -1.8, -4.2, 3.6, 1.7, .65, '#3f302b');
      rounded(ctx, -.8, -.5, 1.6, 1.3, .35, '#d4ad5e'); break;
    }
    case 'dough_ball': {
      ellipse(ctx, 0, 0, 4.5, 4.1, '#d8ad74'); ellipse(ctx, -1, -1.2, 2.5, 2, '#efd3a4', .76); break;
    }
    default: {
      ellipse(ctx, 0, 0, 3.3, 3.0, pal.rim); ellipse(ctx, .4, -.4, 1.8, 1.55, pal.core); break;
    }
  }
  ctx.restore();
}

export function drawChibiCoinV3(ctx: Ctx, x: number, y: number, frame: number, golden = false) {
  const bob = Math.abs(Math.sin(frame * .075 + x * .03)) * 2.2;
  const spin = .28 + Math.abs(Math.cos(frame * .085 + x * .02)) * .72;
  const cy = y - bob;
  ellipse(ctx, x, y + 2.2, golden ? 5.6 : 4.7, 1.65, '#261d1a', .12);
  if (golden) glow(ctx, x, cy, 11, 'rgba(255,216,90,.92)', .14);
  ctx.save(); ctx.translate(x, cy); ctx.scale(spin, 1);
  ellipse(ctx, 0, 0, golden ? 5 : 4.2, golden ? 5 : 4.2, golden ? '#b97a1e' : '#b78b52');
  ellipse(ctx, 0, -.25, golden ? 4 : 3.25, golden ? 4 : 3.25, golden ? '#f1c94c' : '#e0bf8a');
  ctx.strokeStyle = golden ? '#fff0a6' : '#f6e5c2'; ctx.globalAlpha = .65; ctx.lineWidth = .7;
  ctx.beginPath(); ctx.arc(0, 0, golden ? 2.15 : 1.75, -.85, .85); ctx.stroke(); ctx.restore();
  if (golden) sparkle(ctx, x + 4.2, cy - 4, 1.9 + Math.sin(frame * .12) * .45, '#fff5c2', .65);
}

export function drawChibiPickupGlowV3(ctx: Ctx, x: number, y: number, frame: number, color: string, strong = false) {
  const pulse = .9 + Math.sin(frame * .065 + x * .04) * .1;
  ellipse(ctx, x, y + 7, strong ? 13 : 10, strong ? 4 : 3, '#20171a', strong ? .10 : .07);
  glow(ctx, x, y, (strong ? 19 : 15) * pulse, color, strong ? .13 : .08);
  ctx.save(); ctx.globalAlpha = strong ? .34 : .22; ctx.strokeStyle = color; ctx.lineWidth = .8;
  ctx.beginPath(); ctx.ellipse(x, y, (strong ? 12 : 9) * pulse, (strong ? 7 : 5.5) * pulse, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

export function drawChibiParticleV3(ctx: Ctx, p: Particle, frame: number) {
  const lifeAlpha = clamp(p.life > 1 ? p.life / 22 : p.life);
  const color = p.color || (p.type.includes('fire') ? '#ef6a3f' : p.type.includes('smoke') ? '#8f8b89' : '#f4d27a');
  const phase = frame * .06 + p.x * .04 + p.y * .02;
  if (p.type.includes('smoke') || p.type.includes('dust')) {
    ellipse(ctx, p.x, p.y, 2.8 + (1 - lifeAlpha) * 2.2, 1.8 + (1 - lifeAlpha) * 1.3, color, .18 + lifeAlpha * .22, phase * .08);
    return;
  }
  if (p.type.includes('fire') || p.type.includes('burn')) {
    flame(ctx, p.x, p.y, 2.6 + lifeAlpha * 1.4, phase, .35 + lifeAlpha * .55); return;
  }
  if (p.type.includes('explosion') || p.type.includes('boom')) {
    glow(ctx, p.x, p.y, 8 + (1 - lifeAlpha) * 4, color, .12 + lifeAlpha * .12);
    sparkle(ctx, p.x, p.y, 2 + lifeAlpha * 2.5, '#fff0b1', .45 + lifeAlpha * .4); return;
  }
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(phase);
  ctx.globalAlpha = .25 + lifeAlpha * .65; ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const r = i % 2 === 0 ? 2.2 + lifeAlpha * 1.6 : .8 + lifeAlpha * .45; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function eliteCrown(ctx: Ctx, cx: number, y: number, frame: number) {
  const bob = Math.sin(frame * .07) * .6;
  ctx.save(); ctx.translate(cx, y + bob); ctx.fillStyle = '#d9a634'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(-4.1, -3); ctx.lineTo(-1.2, -.4); ctx.lineTo(0, -4); ctx.lineTo(2, -.4); ctx.lineTo(4.5, -3); ctx.lineTo(5, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe78f'; ctx.globalAlpha = .72; ctx.beginPath(); ctx.roundRect(-3.5, .2, 7, 1, .45); ctx.fill(); ctx.restore();
}

export function drawChibiEnemyFxV3(ctx: Ctx, e: Enemy, frame: number, layer: 'under' | 'over') {
  const cx = e.x + e.size / 2, feetY = e.y + e.size + 1;
  if (layer === 'under') {
    if (e.spawnAnim > 0) {
      const t = clamp(1 - e.spawnAnim / 18);
      ctx.save(); ctx.strokeStyle = '#f0b35f'; ctx.globalAlpha = .16 + (1 - t) * .18; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(cx, feetY - 2, e.size * (.32 + t * .42), e.size * (.13 + t * .10), 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      glow(ctx, cx, feetY - 3, e.size * .75, 'rgba(244,181,94,.9)', (1 - t) * .07);
    }
    if (e.elite) {
      const pulse = .94 + Math.sin(frame * .075 + e.id) * .08;
      glow(ctx, cx, feetY - 4, e.size * .9, 'rgba(244,208,63,.92)', .065);
      ctx.save(); ctx.strokeStyle = '#dfb441'; ctx.globalAlpha = .22; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, feetY - 2, e.size * .62 * pulse, e.size * .20 * pulse, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (e.slowTimer > 0) {
      ellipse(ctx, cx, feetY - 1, e.size * .55, e.size * .15, '#70aeca', .12);
      ctx.save(); ctx.strokeStyle = '#a5d8e7'; ctx.globalAlpha = .28; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(cx, feetY - 2, e.size * .46, e.size * .11, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    return;
  }

  if (e.elite) {
    eliteCrown(ctx, cx, e.y - 7, frame + e.id * 3);
    for (let i = 0; i < 3; i++) {
      const p = (frame * .018 + i * .33 + e.id * .07) % 1;
      const sx = cx + Math.sin(i * 2.4 + frame * .025) * e.size * .55;
      const sy = feetY - p * e.size * 1.45;
      sparkle(ctx, sx, sy, 1.1 + (1 - p) * .6, '#ffeaa1', (1 - p) * .45);
    }
  }
  if (e.burn > 0) {
    for (let i = 0; i < 3; i++) {
      const p = ((frame + i * 9 + e.id * 3) % 24) / 24;
      const sx = cx + Math.sin(i * 2.1 + frame * .13) * e.size * .30;
      const sy = feetY - 4 - p * (e.size * .78);
      flame(ctx, sx, sy, 2.4 + (1 - p) * 1.5, frame * .1 + i, (1 - p) * .72);
    }
  }
}
