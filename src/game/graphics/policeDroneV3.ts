type Ctx = CanvasRenderingContext2D;

export interface PoliceDroneV3Input {
  ctx: Ctx;
  x: number;
  y: number;
  size: number;
  frame: number;
  hurt: boolean;
  elite?: boolean;
  telegraph?: number;
}

const OUTLINE = '#322a2e';
const NAVY = '#294b63';
const NAVY_LIGHT = '#52768b';
const NAVY_DARK = '#182f40';
const METAL = '#718386';
const BRASS = '#cca858';
const BRASS_LIGHT = '#f0d886';
const RED = '#b94d51';

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUTLINE, lw = 1.25) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = OUTLINE, lw = 1.25) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function drawChibiPoliceDroneV3(input: PoliceDroneV3Input) {
  const { ctx, x, y, size, frame, hurt, elite = false, telegraph = 0 } = input;
  const scale = Math.max(.72, Math.min(1.05, size / 18));
  const cx = x + size / 2;
  const baseY = y + size * .72;
  const bob = Math.sin(frame * .11) * 1.15;
  const tilt = Math.sin(frame * .073) * .035;
  const rotor = frame * .34;

  ctx.save();
  ctx.fillStyle = '#241c20';
  ctx.globalAlpha = .095;
  ctx.beginPath(); ctx.ellipse(cx, y + size + 2, 10.8 * scale, 2.8 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = hurt && Math.floor(frame / 2) % 2 === 0 ? .56 : 1;
  ctx.translate(cx, baseY + bob);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);

  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-16, -8); ctx.moveTo(9, -4); ctx.lineTo(16, -8); ctx.stroke();
  ctx.strokeStyle = METAL; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-16, -8); ctx.moveTo(9, -4); ctx.lineTo(16, -8); ctx.stroke();

  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 16, -8); ctx.rotate(rotor * side);
    ctx.strokeStyle = 'rgba(47,42,46,.75)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(190,203,198,.45)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-5, -.8); ctx.lineTo(5, -.8); ctx.stroke();
    ctx.restore();
    ellipse(ctx, side * 16, -8, 2.6, 2.3, BRASS, OUTLINE, 1.1);
  }

  ellipse(ctx, 0, 0, 11.7, 8.7, NAVY, OUTLINE, 1.65);
  ctx.globalAlpha = .55; ellipse(ctx, -3.8, -3.2, 5.2, 2.8, NAVY_LIGHT, '', 0); ctx.globalAlpha = 1;
  rr(ctx, -8.2, 1.7, 16.4, 5.8, 2.4, NAVY_DARK, OUTLINE, 1.2);

  ellipse(ctx, 0, 2.2, 4.25, 4.0, METAL, OUTLINE, 1.15);
  ellipse(ctx, 0, 2.1, 2.25, 2.15, elite ? BRASS : RED, '', 0);
  ctx.globalAlpha = .78 + Math.sin(frame * .14) * .12;
  ellipse(ctx, -.65, 1.5, .65, .65, '#fff2d0', '', 0);
  ctx.globalAlpha = 1;

  rr(ctx, -2.8, -7.2, 5.6, 4.6, 1.6, BRASS, OUTLINE, 1.0);
  ctx.globalAlpha = .65; ctx.fillStyle = BRASS_LIGHT; ctx.fillRect(-1.8, -6.3, 2.9, .8); ctx.globalAlpha = 1;

  rr(ctx, -10.5, 3.8, 3.7, 4.0, 1.2, METAL, OUTLINE, 1.0);
  rr(ctx, 6.8, 3.8, 3.7, 4.0, 1.2, METAL, OUTLINE, 1.0);

  if (telegraph > .05) {
    ctx.save();
    ctx.globalAlpha = .18 + telegraph * .36;
    ctx.strokeStyle = '#eacb77'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 2, 7 + telegraph * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
