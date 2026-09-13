type Ctx = CanvasRenderingContext2D;

type DoorStyle = 'gold' | 'boss' | 'green' | 'orange' | 'purple' | 'silver' | string;

const OUTLINE = '#2f272b';
const WOOD = '#654236';
const WOOD_DARK = '#382522';
const TEAL = '#294c4d';
const TEAL_LIGHT = '#3d6865';
const CREAM = '#e8dcc8';
const CREAM_LIGHT = '#fff3dc';
const BRASS = '#c7a457';
const BRASS_LIGHT = '#f1db91';

function accent(style: DoorStyle) {
  switch (style) {
    case 'gold': return ['#d1aa4d', '#f3dd82'];
    case 'boss': return ['#a94c4f', '#e17868'];
    case 'green': return ['#438265', '#78b58e'];
    case 'orange': return ['#b86c37', '#e3a05b'];
    case 'purple': return ['#77558d', '#ac82be'];
    default: return ['#708286', '#b4c1c0'];
  }
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUTLINE, lw = 1.45) {
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

function shadow(ctx: Ctx, x: number, y: number, horizontal: boolean) {
  ctx.save();
  ctx.fillStyle = '#211a1e';
  ctx.globalAlpha = .11;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 18, horizontal ? 15 : 7, horizontal ? 4 : 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawChibiLobbyDoorV3(
  ctx: Ctx,
  x: number,
  y: number,
  dir: string,
  style: DoorStyle,
  locked: boolean,
  anim: number,
  frame: number,
) {
  const horizontal = dir === 'up' || dir === 'down';
  const [a, hi] = accent(style);
  const open = Math.max(0, Math.min(1, anim));
  const pulse = .66 + Math.sin(frame * .055) * .08;

  shadow(ctx, x, y, horizontal);
  ctx.save();

  if (horizontal) {
    rr(ctx, x + 1, y + 4, 30, 24, 5, WOOD_DARK);
    rr(ctx, x + 3, y + 6, 26, 20, 4, WOOD);
    rr(ctx, x + 5, y + 8, 22, 16, 3, TEAL);
    ctx.fillStyle = TEAL_LIGHT;
    ctx.fillRect(x + 6, y + 9, 20, 2);

    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 3, y + 5, 26, 2);
    ctx.globalAlpha = .55;
    ctx.fillStyle = BRASS_LIGHT;
    ctx.fillRect(x + 6, y + 5, 13, 1);
    ctx.globalAlpha = 1;

    const gap = 3 + open * 11;
    rr(ctx, x + 6, y + 11, Math.max(2, 10 - gap * .42), 10, 2, a, '', 0);
    rr(ctx, x + 26 - Math.max(2, 10 - gap * .42), y + 11, Math.max(2, 10 - gap * .42), 10, 2, a, '', 0);
    ctx.fillStyle = '#151b1d';
    ctx.globalAlpha = .38 + open * .42;
    ctx.fillRect(x + 16 - gap * .5, y + 10, gap, 13);
    ctx.globalAlpha = 1;

    rr(ctx, x + 13, y + 2, 6, 5, 2, a);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = hi;
    ctx.fillRect(x + 14.5, y + 3, 3, 1);
    ctx.globalAlpha = 1;
  } else {
    rr(ctx, x + 4, y + 1, 24, 30, 5, WOOD_DARK);
    rr(ctx, x + 6, y + 3, 20, 26, 4, WOOD);
    rr(ctx, x + 8, y + 5, 16, 22, 3, TEAL);
    ctx.fillStyle = TEAL_LIGHT;
    ctx.fillRect(x + 9, y + 6, 2, 20);

    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 5, y + 3, 2, 26);
    ctx.globalAlpha = .55;
    ctx.fillStyle = BRASS_LIGHT;
    ctx.fillRect(x + 5, y + 6, 1, 13);
    ctx.globalAlpha = 1;

    const gap = 3 + open * 11;
    rr(ctx, x + 11, y + 6, 10, Math.max(2, 10 - gap * .42), 2, a, '', 0);
    rr(ctx, x + 11, y + 26 - Math.max(2, 10 - gap * .42), 10, Math.max(2, 10 - gap * .42), 2, a, '', 0);
    ctx.fillStyle = '#151b1d';
    ctx.globalAlpha = .38 + open * .42;
    ctx.fillRect(x + 10, y + 16 - gap * .5, 12, gap);
    ctx.globalAlpha = 1;

    rr(ctx, x + 25, y + 13, 5, 6, 2, a);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = hi;
    ctx.fillRect(x + 26, y + 14.5, 1, 3);
    ctx.globalAlpha = 1;
  }

  if (locked) {
    ctx.globalAlpha = .84;
    const cx = x + 16, cy = y + 16;
    rr(ctx, cx - 4, cy - 1, 8, 7, 2, '#6f5731', OUTLINE, 1.2);
    ctx.strokeStyle = BRASS_LIGHT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy - 1, 3.2, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = CREAM_LIGHT;
    ctx.globalAlpha = .70;
    ctx.fillRect(cx - .7, cy + 1, 1.4, 2.2);
  } else {
    ctx.globalAlpha = .20;
    ctx.fillStyle = CREAM;
    if (horizontal) ctx.fillRect(x + 8, y + 25, 16, 1);
    else ctx.fillRect(x + 25, y + 8, 1, 16);
  }

  ctx.restore();
}
