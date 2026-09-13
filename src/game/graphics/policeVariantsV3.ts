import { drawChibiPoliceDuckV3 } from './enemyChibiV3';

type Ctx = CanvasRenderingContext2D;

export type PoliceVariantV3 = 'rapid' | 'shotgun' | 'riot';

export interface PoliceVariantV3Input {
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
  variant: PoliceVariantV3;
  telegraph?: number;
  shieldAngle?: number;
  charging?: boolean;
  recovering?: boolean;
}

const OUTLINE = '#332a2d';
const BRASS = '#d2ad58';
const BRASS_LIGHT = '#f1d88a';
const METAL = '#55666b';
const METAL_LIGHT = '#9eb1b2';
const NAVY_DARK = '#172a40';
const RED = '#a84d52';
const RED_LIGHT = '#d67b72';

function facingAngle(dirX: number, dirY: number) {
  if (Math.abs(dirY) > Math.abs(dirX)) return dirY < 0 ? -Math.PI / 2 : Math.PI / 2;
  return dirX < 0 ? Math.PI : 0;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUTLINE, lw = 1.25) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lw) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function rapidAccessory(ctx: Ctx, gx: number, gy: number, scale: number, angle: number, frame: number, moving: boolean) {
  ctx.save();
  ctx.translate(gx, gy - 25 * scale);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Red scarf is the rapid unit's silhouette cue; it trails only while moving.
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, 8);
  ctx.quadraticCurveTo(-13, 7 + Math.sin(frame * .18) * 2, -18 - (moving ? 4 : 0), 10 + Math.cos(frame * .14) * 2);
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-7, 8);
  ctx.quadraticCurveTo(-13, 7 + Math.sin(frame * .18) * 2, -18 - (moving ? 4 : 0), 10 + Math.cos(frame * .14) * 2);
  ctx.stroke();
  ctx.fillStyle = RED_LIGHT;
  ctx.globalAlpha = .72;
  ctx.beginPath(); ctx.arc(-8.5, 7.7, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (moving) {
    ctx.save();
    ctx.strokeStyle = '#d8eadf';
    ctx.globalAlpha = .12;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const drift = ((frame * 1.4 + i * 7) % 14);
      const px = gx - Math.cos(angle) * (10 + drift) * scale + Math.sin(angle) * (i - 1) * 4 * scale;
      const py = gy - 14 * scale - Math.sin(angle) * (10 + drift) * scale;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - Math.cos(angle) * 6 * scale, py - Math.sin(angle) * 6 * scale);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function shotgunAccessory(ctx: Ctx, gx: number, gy: number, scale: number, angle: number, telegraph: number) {
  ctx.save();
  ctx.translate(gx, gy - 21 * scale);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  rr(ctx, 2, -2.4, 17, 4.8, 1.5, NAVY_DARK);
  rr(ctx, 5, -1.5, 12, 2.2, .8, METAL, '', 0);
  rr(ctx, 15, -1.0, 8, 2.0, .7, METAL_LIGHT, OUTLINE, 1.0);
  rr(ctx, 0, 1.0, 6.5, 3.2, 1.2, '#835c39', OUTLINE, 1.0);
  rr(ctx, 8.5, 2.0, 3.0, 6.0, 1.0, '#60422f', OUTLINE, 1.0);
  ctx.fillStyle = BRASS;
  ctx.beginPath(); ctx.arc(3.5, -.2, 1.1, 0, Math.PI * 2); ctx.fill();

  if (telegraph > .05) {
    ctx.globalAlpha = .35 + telegraph * .42;
    ctx.fillStyle = '#f2c86e';
    ctx.beginPath();
    ctx.moveTo(23, 0);
    ctx.lineTo(28 + telegraph * 4, -3.5);
    ctx.lineTo(27 + telegraph * 5, 0);
    ctx.lineTo(28 + telegraph * 4, 3.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function riotAccessory(ctx: Ctx, gx: number, gy: number, scale: number, shieldAngle: number, charging: boolean, recovering: boolean) {
  const dist = 10 * scale;
  const sx = gx + Math.cos(shieldAngle) * dist;
  const sy = gy - 20 * scale + Math.sin(shieldAngle) * dist;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(shieldAngle);
  ctx.scale(scale, scale);

  const shieldFill = charging ? '#445f67' : '#394e57';
  ctx.beginPath();
  ctx.moveTo(-1, -11);
  ctx.quadraticCurveTo(9, -10, 11, -5);
  ctx.lineTo(11, 9);
  ctx.quadraticCurveTo(5, 13, -1, 10);
  ctx.closePath();
  ctx.fillStyle = shieldFill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.globalAlpha = .58;
  ctx.strokeStyle = METAL_LIGHT;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(1.8, -8.5);
  ctx.quadraticCurveTo(7, -7, 8.2, -3);
  ctx.stroke();
  ctx.globalAlpha = 1;

  rr(ctx, 2.3, -2.7, 5.4, 5.4, 1.4, BRASS, OUTLINE, 1.0);
  ctx.fillStyle = BRASS_LIGHT;
  ctx.globalAlpha = .72;
  ctx.fillRect(3.4, -1.6, 2.8, .9);
  ctx.globalAlpha = 1;

  if (recovering) {
    ctx.globalAlpha = .22;
    ctx.strokeStyle = '#d8e4dc';
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(5, 0, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

export function drawChibiPoliceVariantV3(input: PoliceVariantV3Input) {
  const {
    ctx, x, y, size, frame, dirX, dirY, moving, hurt, elite = false,
    variant, telegraph = 0, shieldAngle = 0, charging = false, recovering = false,
  } = input;

  drawChibiPoliceDuckV3({ ctx, x, y, size, frame, dirX, dirY, moving, hurt, elite });

  const gx = x + size / 2;
  const gy = y + size;
  const baseScale = Math.max(.67, Math.min(.92, size / 22)) * (elite ? 1.045 : 1);
  const angle = facingAngle(dirX, dirY);

  if (variant === 'rapid') rapidAccessory(ctx, gx, gy, baseScale, angle, frame, moving);
  else if (variant === 'shotgun') shotgunAccessory(ctx, gx, gy, baseScale, angle, telegraph);
  else riotAccessory(ctx, gx, gy, baseScale, shieldAngle, charging, recovering);
}
