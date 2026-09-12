type Ctx = CanvasRenderingContext2D;

const FRAME = 56;
const PIVOT_X = 28;
const PIVOT_Y = 49;
const OUTLINE = '#151820';
const FEATHER = '#f1e5c6';
const FEATHER_LIGHT = '#fff4d8';
const FEATHER_SHADE = '#d8c69f';
const BEAK = '#ef8f28';
const BEAK_DARK = '#c96618';
const BLUE = '#294a78';
const BLUE_LIGHT = '#426da3';
const BLUE_DARK = '#19314f';
const GOLD = '#e4bc56';
const METAL = '#778892';

interface PoliceDuckInput {
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

interface Motion {
  bob: number;
  step: number;
  lean: number;
  blink: boolean;
  squashX: number;
  squashY: number;
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(Math.round(cx), Math.round(cy), Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

function motionFor(frame: number, moving: boolean, hurt: boolean): Motion {
  if (hurt) {
    const idx = Math.floor(frame / 2) % 8;
    return {
      bob: idx < 3 ? -2 : 0,
      step: 0,
      lean: idx % 2 === 0 ? -2 : 2,
      blink: true,
      squashX: 1.08,
      squashY: .92,
    };
  }
  if (moving) {
    const idx = Math.floor(frame / 3) % 14;
    const t = idx / 14;
    const step = Math.sin(t * Math.PI * 4);
    return {
      bob: -Math.round(Math.abs(step) * 2),
      step,
      lean: Math.sin(t * Math.PI * 2),
      blink: false,
      squashX: 1 + Math.abs(step) * .025,
      squashY: 1 - Math.abs(step) * .025,
    };
  }
  const idx = Math.floor(frame / 5) % 12;
  return {
    bob: idx === 4 || idx === 5 ? -1 : 0,
    step: 0,
    lean: 0,
    blink: idx === 9,
    squashX: 1,
    squashY: 1,
  };
}

function drawLegs(ctx: Ctx, m: Motion): void {
  const stride = Math.round(m.step * 2);
  rect(ctx, 18 - stride, 41 + Math.max(0, stride), 8, 5, OUTLINE);
  rect(ctx, 19 - stride, 40 + Math.max(0, stride), 6, 4, BEAK);
  rect(ctx, 16 - stride, 45 + Math.max(0, stride), 10, 3, BEAK_DARK);

  rect(ctx, 31 + stride, 41 + Math.max(0, -stride), 8, 5, OUTLINE);
  rect(ctx, 32 + stride, 40 + Math.max(0, -stride), 6, 4, BEAK);
  rect(ctx, 31 + stride, 45 + Math.max(0, -stride), 10, 3, BEAK_DARK);
}

function drawBody(ctx: Ctx, m: Motion, elite: boolean): void {
  ctx.save();
  ctx.translate(28, 34 + m.bob);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-28, -34);

  ellipse(ctx, 28, 34, 14, 12, OUTLINE);
  ellipse(ctx, 28, 33, 12, 10, BLUE);
  rect(ctx, 18, 29, 20, 4, BLUE_LIGHT);
  rect(ctx, 19, 38, 18, 4, BLUE_DARK);

  // camisa y corbata simplificadas para leer bien incluso a escala baja
  rect(ctx, 24, 27, 8, 5, FEATHER_LIGHT);
  rect(ctx, 27, 29, 3, 9, elite ? GOLD : '#b44648');
  rect(ctx, 28, 37, 1, 4, elite ? '#a67c1f' : '#792d31');

  // placa y cinturón
  rect(ctx, 20, 31, 5, 5, GOLD);
  rect(ctx, 21, 32, 3, 2, '#fff0a5');
  rect(ctx, 17, 38, 22, 3, OUTLINE);
  rect(ctx, 24, 38, 8, 3, METAL);

  // alas/brazos
  ellipse(ctx, 15, 34, 5, 8, OUTLINE);
  ellipse(ctx, 16, 34, 4, 6, BLUE_LIGHT);
  ellipse(ctx, 41, 34, 5, 8, OUTLINE);
  ellipse(ctx, 40, 34, 4, 6, BLUE_LIGHT);

  ctx.restore();
}

function drawHead(ctx: Ctx, dirX: number, m: Motion, elite: boolean): void {
  const side = dirX >= 0 ? 1 : -1;
  const headY = 17 + m.bob;
  ctx.save();
  ctx.translate(28 + m.lean, headY);
  ctx.scale(m.squashX, m.squashY);
  ctx.translate(-28, -headY);

  ellipse(ctx, 28, headY, 16, 14, OUTLINE);
  ellipse(ctx, 28, headY - 1, 14, 12, FEATHER);
  ellipse(ctx, 24, headY - 5, 7, 5, FEATHER_LIGHT);
  rect(ctx, 17, headY + 6, 20, 4, FEATHER_SHADE);

  // gorra policial con volumen, visera y placa
  rect(ctx, 14, headY - 15, 28, 5, OUTLINE);
  rect(ctx, 16, headY - 16, 24, 6, BLUE_DARK);
  rect(ctx, 18, headY - 18, 20, 4, BLUE);
  rect(ctx, 15, headY - 10, 27, 4, BLUE_LIGHT);
  rect(ctx, side > 0 ? 35 : 12, headY - 8, 10, 3, OUTLINE);
  rect(ctx, 26, headY - 16, 5, 5, GOLD);
  rect(ctx, 27, headY - 15, 3, 2, '#fff0a5');

  // ceja y ojo: expresivos pero todavía caricaturescos
  const eyeX = 28 + side * 7;
  rect(ctx, eyeX - 4, headY - 5, 8, 2, OUTLINE);
  if (m.blink) rect(ctx, eyeX - 3, headY, 6, 1, OUTLINE);
  else {
    ellipse(ctx, eyeX, headY - 1, 3, 4, '#fff8e8');
    rect(ctx, eyeX + side - 1, headY - 1, 3, 3, OUTLINE);
    rect(ctx, eyeX + side - 1, headY - 2, 1, 1, '#fff');
  }

  // pico lateral grande, importante para la silueta chibi
  const beakX = 28 + side * 16;
  rect(ctx, side > 0 ? beakX - 2 : beakX - 10, headY + 3, 12, 6, OUTLINE);
  rect(ctx, side > 0 ? beakX - 1 : beakX - 9, headY + 4, 10, 4, BEAK);
  rect(ctx, side > 0 ? beakX : beakX - 8, headY + 7, 8, 2, BEAK_DARK);

  // pequeña marca de élite integrada al sombrero, evita coronas flotantes gigantes
  if (elite) {
    rect(ctx, 23, headY - 21, 10, 3, GOLD);
    rect(ctx, 23, headY - 24, 2, 4, GOLD);
    rect(ctx, 27, headY - 25, 2, 5, '#fff0a5');
    rect(ctx, 31, headY - 24, 2, 4, GOLD);
  }

  ctx.restore();
}

export function drawChibiPoliceDuck(input: PoliceDuckInput): void {
  const { ctx, x, y, size, frame, dirX, moving, hurt, elite = false } = input;
  const m = motionFor(frame, moving, hurt);
  const scale = Math.max(.72, Math.min(1, size / 16));

  // El sprite visual es mayor que la hitbox; los pies siguen anclados a la misma base física.
  const groundX = x + size / 2;
  const groundY = y + size;

  ctx.save();
  ctx.globalAlpha *= hurt && Math.floor(frame / 2) % 2 === 0 ? .68 : 1;

  // sombra de contacto separada del cuerpo
  ellipse(ctx, groundX, groundY + 2, 14 * scale, 5 * scale, 'rgba(10,13,15,.32)');

  ctx.translate(Math.round(groundX), Math.round(groundY));
  ctx.scale(scale, scale);
  ctx.translate(-PIVOT_X, -PIVOT_Y);

  drawLegs(ctx, m);
  drawBody(ctx, m, elite);
  drawHead(ctx, dirX, m, elite);

  ctx.restore();
}

export const CHIBI_POLICE_DUCK_ANIMATION = {
  idle: { frames: 12, frameDuration: 5 },
  walk: { frames: 14, frameDuration: 3 },
  hurt: { frames: 8, frameDuration: 2 },
} as const;

export const CHIBI_POLICE_DUCK_FRAME_SIZE = FRAME;
