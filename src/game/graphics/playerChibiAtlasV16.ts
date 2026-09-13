import type { DuckDir } from '../types';
import { drawChibiPlayerRemastered, type ChibiPlayerRemasteredInput } from './playerChibiRemastered';

type Ctx = CanvasRenderingContext2D;
type State = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact' | 'celebrate';

const ATLAS_URL = new URL('../../assets/chibi/base-duck-chibi-v16-atlas.png', import.meta.url).href;
const FRAME = 64;
const COLS = 116;
const ROWS = 4;
const ATLAS_W = COLS * FRAME;
const ATLAS_H = ROWS * FRAME;
const DRAW = 46;
const PIVOT_X = DRAW * (32 / 64);
const PIVOT_Y = DRAW * (58 / 64);

const START: Record<State | 'celebrate', number> = {
  idle: 0,
  walk: 12,
  shoot: 32,
  dash: 44,
  hurt: 60,
  down: 68,
  interact: 88,
  celebrate: 100,
};
const COUNT: Record<State | 'celebrate', number> = {
  idle: 12,
  walk: 20,
  shoot: 12,
  dash: 16,
  hurt: 8,
  down: 20,
  interact: 12,
  celebrate: 16,
};
const ROW: Record<DuckDir, number> = { down: 0, up: 1, left: 2, right: 3 };

export const CHIBI_PLAYER_V16_RASTER_FRAMES = 464;
export type ChibiPlayerAtlasV16Input = ChibiPlayerRemasteredInput;

interface Runtime {
  state: State;
  enteredAt: number;
  lastFrame: number;
  lastShot?: number;
  wasShoot: boolean;
  wasDash: boolean;
  wasHurt: boolean;
  prevX: number;
  prevY: number;
  walkDistance: number;
  lastDir: DuckDir;
  turnAt?: number;
}

const runtimes = new WeakMap<object, Runtime>();
const fallbackKey = {};
let atlas: HTMLImageElement | undefined;

function getAtlas(): HTMLImageElement | undefined {
  if (typeof Image === 'undefined') return undefined;
  if (!atlas) {
    atlas = new Image();
    atlas.decoding = 'async';
    atlas.src = ATLAS_URL;
  }
  return atlas;
}

function desired(input: ChibiPlayerAtlasV16Input): State {
  if (input.dead) return 'down';
  if (input.hurt) return 'hurt';
  if (input.dashing) return 'dash';
  if (input.shooting) return 'shoot';
  if (input.celebrating) return 'celebrate';
  if (input.interacting) return 'interact';
  if (input.moving) return 'walk';
  return 'idle';
}

function resolve(input: ChibiPlayerAtlasV16Input): { state: State; tick: number; walkDistance: number; turnAge: number } {
  const key = input.runtimeKey ?? fallbackKey;
  let rt = runtimes.get(key);
  if (!rt || input.frame < rt.lastFrame) {
    rt = {
      state: 'idle', enteredAt: input.frame, lastFrame: input.frame,
      lastShot: input.shotSequence, wasShoot: false, wasDash: false, wasHurt: false,
      prevX: input.x, prevY: input.y, walkDistance: 0, lastDir: input.dir,
    };
    runtimes.set(key, rt);
  }

  const dx = input.x - rt.prevX;
  const dy = input.y - rt.prevY;
  const step = Math.hypot(dx, dy);
  if (input.moving && !input.dashing && step > .01 && step < 8) rt.walkDistance += step;
  rt.prevX = input.x;
  rt.prevY = input.y;
  if (rt.lastDir !== input.dir) {
    rt.lastDir = input.dir;
    rt.turnAt = input.frame;
  }

  const wanted = desired(input);
  const shotChanged = input.shotSequence !== undefined && rt.lastShot !== undefined && input.shotSequence !== rt.lastShot;
  const shootStart = (input.shooting && !rt.wasShoot) || shotChanged;
  const dashStart = wanted === 'dash' && input.dashing && !rt.wasDash;
  const hurtStart = wanted === 'hurt' && input.hurt && !rt.wasHurt;
  const age = input.frame - rt.enteredAt;

  if (wanted === 'down' && rt.state !== 'down') {
    rt.state = 'down'; rt.enteredAt = input.frame;
  } else if (hurtStart) {
    rt.state = 'hurt'; rt.enteredAt = input.frame;
  } else if (dashStart) {
    rt.state = 'dash'; rt.enteredAt = input.frame;
  } else if (shootStart) {
    rt.state = 'shoot'; rt.enteredAt = input.frame;
  } else if (rt.state === 'shoot' && age < 24) {
    // play all twelve authored recoil/recovery frames
  } else if (rt.state === 'dash' && age < 16) {
    // play full sixteen-frame anticipation/drive/recovery arc
  } else if (rt.state === 'hurt' && age < 12) {
    // keep impact readable
  } else if (rt.state === 'down') {
    // terminal for this runtime key
  } else if (rt.state !== wanted) {
    rt.state = wanted; rt.enteredAt = input.frame;
  }

  rt.lastFrame = input.frame;
  rt.lastShot = input.shotSequence;
  rt.wasShoot = input.shooting;
  rt.wasDash = input.dashing;
  rt.wasHurt = input.hurt;
  const turnAge = rt.turnAt === undefined ? -1 : input.frame - rt.turnAt;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt), walkDistance: rt.walkDistance, turnAge };
}

function frameIndex(state: State, tick: number, frame: number, walkDistance: number, dir: DuckDir): number {
  if (state === 'idle') return Math.floor(frame / 7) % COUNT.idle;
  if (state === 'walk') {
    const vertical = dir === 'up' || dir === 'down';
    const strideDistance = vertical ? 32 : 38;
    const cycle = ((walkDistance % strideDistance) + strideDistance) % strideDistance;
    return Math.floor((cycle / strideDistance) * COUNT.walk) % COUNT.walk;
  }
  if (state === 'shoot') return Math.min(COUNT.shoot - 1, Math.floor(tick / 2));
  if (state === 'dash') return Math.min(COUNT.dash - 1, tick);
  if (state === 'hurt') return Math.min(COUNT.hurt - 1, Math.floor(tick * COUNT.hurt / 14));
  if (state === 'down') return Math.min(COUNT.down - 1, Math.floor(tick * COUNT.down / 34));
  if (state === 'celebrate') return Math.floor(tick / 3) % COUNT.celebrate;
  return Math.floor(tick / 2) % COUNT.interact;
}

interface VisualPose { scaleX: number; scaleY: number; rotation: number; dx: number; dy: number; }

function visualPose(state: State, tick: number, index: number, dir: DuckDir, turnAge: number): VisualPose {
  let scaleX = 1, scaleY = 1, rotation = 0, dx = 0, dy = 0;
  if (state === 'walk') {
    const phase = (index / COUNT.walk) * Math.PI * 2;
    const stride = Math.sin(phase);
    const lift = Math.abs(stride);
    const vertical = dir === 'up' || dir === 'down';
    const plant = Math.cos(phase * 2);
    dx = vertical ? stride * .42 : stride * .23;
    dy = vertical ? -lift * .68 : -lift * .58;
    scaleX = 1 + plant * .005;
    scaleY = 1 - plant * .006;
    rotation = vertical ? stride * .010 : stride * (dir === 'left' ? -.013 : .013);
  } else if (state === 'shoot') {
    const attack = Math.min(1, tick / 4);
    const recover = tick <= 4 ? 1 : Math.max(0, 1 - (tick - 4) / 20);
    const kick = 1.12 * (tick <= 4 ? 1 - Math.pow(1 - attack, 3) : Math.pow(recover, 1.72));
    if (dir === 'left') dx = kick;
    else if (dir === 'right') dx = -kick;
    else if (dir === 'up') dy = kick * .72;
    else dy = -kick * .54;
    scaleX = 1 + kick * .020; scaleY = 1 - kick * .018;
  } else if (state === 'dash') {
    const t = Math.min(1, tick / 15);
    const drive = Math.sin(t * Math.PI);
    const horizontal = dir === 'left' || dir === 'right';
    scaleX = horizontal ? 1 + drive * .034 : 1 - drive * .020;
    scaleY = horizontal ? 1 - drive * .020 : 1 + drive * .034;
    dy = -drive * .42;
  } else if (state === 'hurt') {
    const impact = Math.max(0, 1 - tick / 14);
    const snap = tick < 3 ? -1 : tick < 7 ? .58 : -.20;
    rotation = snap * .062 * impact;
    const v = dashVector(dir);
    dx = -v.x * impact * 1.05; dy = -v.y * impact * .70 - impact * .48;
    scaleX = 1 + impact * .024; scaleY = 1 - impact * .030;
  } else if (state === 'down') {
    const settle = Math.min(1, index / Math.max(1, COUNT.down - 1));
    const contact = Math.sin(Math.min(1, settle * 1.35) * Math.PI);
    scaleX = 1 + settle * .052 + contact * .010;
    scaleY = 1 - settle * .052 - contact * .008;
    dy = settle * .65;
  } else if (state === 'celebrate') {
    const phase = (index / COUNT.celebrate) * Math.PI * 2;
    const lift = Math.max(0, Math.sin(phase));
    scaleX = 1 + lift * .012;
    scaleY = 1 - lift * .010;
    dy = -lift * .35;
  }
  if (turnAge >= 0 && turnAge < 4 && state !== 'down' && state !== 'hurt') {
    const turn = 1 - turnAge / 4;
    scaleX *= 1 - turn * .018; scaleY *= 1 + turn * .010;
  }
  return { scaleX, scaleY, rotation, dx, dy };
}

function drawFrame(
  ctx: Ctx,
  image: HTMLImageElement,
  dir: DuckDir,
  state: State,
  index: number,
  feetX: number,
  feetY: number,
  alpha: number,
  pose: VisualPose,
  ox = 0,
  oy = 0,
): void {
  const col = START[state] + Math.min(COUNT[state] - 1, Math.max(0, index));
  const row = ROW[dir];
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = alpha;
  ctx.translate(feetX + pose.dx + ox, feetY + pose.dy + oy);
  ctx.rotate(pose.rotation);
  ctx.filter = 'saturate(1.060) contrast(1.035)';
  ctx.shadowColor = 'rgba(54, 37, 25, .18)';
  ctx.shadowBlur = .8;
  ctx.shadowOffsetY = .35;
  ctx.drawImage(
    image,
    col * FRAME, row * FRAME, FRAME, FRAME,
    -PIVOT_X * pose.scaleX, -PIVOT_Y * pose.scaleY, DRAW * pose.scaleX, DRAW * pose.scaleY,
  );
  ctx.shadowColor = 'transparent';
  ctx.filter = 'none';
  ctx.restore();
}

function dashVector(dir: DuckDir): { x: number; y: number } {
  if (dir === 'left') return { x: -1, y: 0 };
  if (dir === 'right') return { x: 1, y: 0 };
  if (dir === 'up') return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function drawShadow(ctx: Ctx, feetX: number, feetY: number, state: State, alpha: number, index: number): void {
  const airborne = state === 'walk' ? Math.abs(Math.sin((index / COUNT.walk) * Math.PI * 2)) : state === 'dash' ? .42 : 0;
  const w = (state === 'down' ? 12.55 : state === 'dash' ? 10.65 : 10.05) * (1 - airborne * .12);
  const h = (state === 'down' ? 3.10 : 2.50) * (1 - airborne * .08);
  ctx.save();
  ctx.fillStyle = '#231912';
  ctx.globalAlpha = .065 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.3, w * 1.42, h * 1.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .13 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.0, w, h, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function muzzlePoint(dir: DuckDir, feetX: number, feetY: number): { x: number; y: number; a: number } {
  if (dir === 'right') return { x: feetX + 19.25, y: feetY - 14.2, a: 0 };
  if (dir === 'left') return { x: feetX - 19.25, y: feetY - 14.2, a: Math.PI };
  if (dir === 'up') return { x: feetX + 12.80, y: feetY - 30.45, a: -Math.PI / 2 };
  return { x: feetX + 9.50, y: feetY - .58, a: Math.PI / 2 };
}

function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick > 5) return;
  const p = muzzlePoint(dir, feetX, feetY);
  const fade = Math.max(.06, 1 - tick / 6);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.globalCompositeOperation = 'lighter';

  // Warm bloom sits behind the sharp flash so the muzzle reads at gameplay scale.
  ctx.globalAlpha = alpha * fade * .42;
  ctx.fillStyle = '#f5a933';
  ctx.beginPath(); ctx.ellipse(2.9, 0, 7.6, 4.15, 0, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = alpha * fade;
  ctx.fillStyle = '#fff0a8';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(9.8, -3.15); ctx.lineTo(6.0, 0); ctx.lineTo(10.35, 3.15); ctx.closePath(); ctx.fill();

  // Two short tongues prevent the front/back flash from reading as a flat oval.
  ctx.globalAlpha = alpha * fade * .72;
  ctx.fillStyle = '#fff7ca';
  ctx.beginPath(); ctx.moveTo(1.0, -.35); ctx.lineTo(7.1, -5.0); ctx.lineTo(5.0, -1.15); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1.0, .35); ctx.lineTo(7.1, 5.0); ctx.lineTo(5.0, 1.15); ctx.closePath(); ctx.fill();

  ctx.globalAlpha = alpha * fade * .95;
  ctx.fillStyle = '#fffbe3';
  ctx.beginPath(); ctx.arc(.8, 0, 1.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawDashFx(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, tick: number, alpha: number): void {
  const v = dashVector(dir);
  const t = Math.min(1, tick / 15);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const side = (i - 1) * 3.4;
    const px = -v.y, py = v.x;
    const sx = feetX - v.x * (8 + i * 3.5) + px * side;
    const sy = feetY - 15 - v.y * (8 + i * 3.5) + py * side;
    ctx.globalAlpha = alpha * (1 - t) * (.13 + i * .022);
    ctx.strokeStyle = i % 2 ? '#f4c95d' : '#fff0b5';
    ctx.lineWidth = 1.20 + (2 - i) * .12;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - v.x * (9 + i * 2), sy - v.y * (9 + i * 2)); ctx.stroke();
  }
  ctx.restore();
}

function drawHurtFx(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick > 10) return;
  const t = Math.max(0, 1 - tick / 11);
  const cx = feetX, cy = feetY - 20;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  ctx.globalAlpha = alpha * t * .70;
  ctx.strokeStyle = '#fff2c8';
  ctx.lineWidth = 1.32;
  for (let i = 0; i < 6; i++) {
    const a = -2.55 + i * 1.02;
    const inner = 9.5 + (i % 2) * 1.3;
    const outer = 15.5 + (i % 3) * 1.15;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner * .72);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer * .78);
    ctx.stroke();
  }

  ctx.globalAlpha = alpha * t * .32;
  ctx.strokeStyle = '#f5b84f';
  ctx.lineWidth = .9;
  ctx.beginPath(); ctx.ellipse(cx, cy, 7.2 + (1 - t) * 2.8, 5.1 + (1 - t) * 1.8, 0, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = '#fff6b8';
  for (const [ox, oy, s] of [[-9, -8, 1.25], [10, -6, 1.05], [8, 8, .9]] as const) {
    ctx.globalAlpha = alpha * t * .62;
    ctx.save();
    ctx.translate(cx + ox, cy + oy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
  }
  ctx.restore();
}

function drawDownFocus(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
  const t = Math.max(0, Math.min(1, tick / 34));
  const fade = 1 - Math.max(0, (t - .78) / .22);
  const strength = alpha * (.92 + Math.sin(Math.min(1, t * 1.4) * Math.PI) * .08) * fade;
  if (strength <= .01) return;
  ctx.save();
  const g = ctx.createRadialGradient(feetX, feetY - 10, 3, feetX, feetY - 10, 31);
  g.addColorStop(0, `rgba(10,7,7,${.20 * strength})`);
  g.addColorStop(.58, `rgba(10,7,7,${.12 * strength})`);
  g.addColorStop(1, 'rgba(10,7,7,0)');
  ctx.fillStyle = g;
  ctx.fillRect(feetX - 34, feetY - 44, 68, 50);

  // A restrained warm contact glow separates the yellow body from nearby
  // enemies without reading as a magical shield or changing scene lighting.
  ctx.globalAlpha = .11 * strength;
  ctx.fillStyle = '#f6d789';
  ctx.beginPath(); ctx.ellipse(feetX, feetY + .8, 14.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawDownFx(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick < 15 || tick > 33) return;
  const t = Math.max(0, Math.min(1, (tick - 15) / 18));
  const burst = Math.sin(t * Math.PI);
  if (burst <= .01) return;
  ctx.save();

  // Small floor-contact puffs make the authored fall feel grounded without
  // obscuring the body or changing collision/gameplay information.
  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1;
    const lane = (i % 2) * 2.5;
    const x = feetX + side * (5.2 + t * (5.3 + lane));
    const y = feetY + .8 - burst * (1.5 + lane * .24);
    const r = (2.1 + lane * .18) * (1 - t * .28);
    ctx.globalAlpha = alpha * burst * (.10 + i * .012);
    ctx.fillStyle = i % 2 ? '#d8c191' : '#b79b69';
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.45, r * .62, 0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.globalAlpha = alpha * burst * .16;
  ctx.strokeStyle = '#876f4d';
  ctx.lineWidth = .78;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.05, 11.5 + t * 5.0, 2.0 + t * .65, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function drawChibiPlayerAtlasV16(input: ChibiPlayerAtlasV16Input): void {
  if (typeof document === 'undefined') return;
  if (input.skinId && input.skinId !== 'robber') {
    drawChibiPlayerRemastered(input);
    return;
  }
  const image = getAtlas();
  if (!image || !image.complete || image.naturalWidth !== ATLAS_W || image.naturalHeight !== ATLAS_H) {
    drawChibiPlayerRemastered(input);
    document.documentElement.dataset.duckHeistPlayerRenderer = 'chibi-v16-loading-fallback';
    return;
  }

  const feetX = Math.round(input.x + 8);
  const feetY = Math.round(input.y + 18);
  const alpha = Math.max(0, Math.min(1, input.alpha ?? 1));
  const { state, tick, walkDistance, turnAge } = resolve(input);
  const index = frameIndex(state, tick, input.frame, walkDistance, input.dir);
  const pose = visualPose(state, tick, index, input.dir, turnAge);
  const ctx = input.ctx;

  drawShadow(ctx, feetX, feetY, state, alpha, index);
  if (state === 'dash') {
    const v = dashVector(input.dir);
    drawDashFx(ctx, input.dir, feetX, feetY, tick, alpha);
    for (let i = 3; i >= 1; i--) {
      drawFrame(ctx, image, input.dir, state, Math.max(0, index - i), feetX, feetY, alpha * (.025 + (3 - i) * .020), pose, -v.x * i * 4.4, -v.y * i * 4.4);
    }
  }

  if (state === 'down') {
    drawDownFocus(ctx, feetX, feetY, tick, alpha);
    drawDownFx(ctx, feetX, feetY, tick, alpha);
  }
  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha, pose);
  if (state === 'shoot') drawMuzzle(ctx, input.dir, feetX + pose.dx, feetY + pose.dy, tick, alpha);
  if (state === 'hurt') drawHurtFx(ctx, feetX, feetY, tick, alpha);

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-atlas-v16';
  document.documentElement.dataset.duckHeistPlayerFrames = '464-raster-chibi-v16';
  document.documentElement.dataset.duckHeistPlayerFx = 'v16.8-death-focus';
  document.documentElement.dataset.duckHeistPlayerState = state;
  document.documentElement.dataset.duckHeistPlayerVisualFrame = `${state}:${index}`;
}
