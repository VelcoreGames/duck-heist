import type { DuckDir } from '../types';
import { drawChibiPlayerRemastered, type ChibiPlayerRemasteredInput } from './playerChibiRemastered';

type Ctx = CanvasRenderingContext2D;
type State = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact';

const ATLAS_URL = new URL('../../assets/chibi/base-duck-chibi-v16-atlas.png', import.meta.url).href;
const FRAME = 64;
const COLS = 116;
const ROWS = 4;
const ATLAS_W = COLS * FRAME;
const ATLAS_H = ROWS * FRAME;
const DRAW = 42;
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
    const kick = .82 * (tick <= 4 ? 1 - Math.pow(1 - attack, 3) : Math.pow(recover, 1.6));
    if (dir === 'left') dx = kick;
    else if (dir === 'right') dx = -kick;
    else if (dir === 'up') dy = kick * .68;
    else dy = -kick * .48;
    scaleX = 1 + kick * .018; scaleY = 1 - kick * .016;
  } else if (state === 'dash') {
    const t = Math.min(1, tick / 15);
    const drive = Math.sin(t * Math.PI);
    const horizontal = dir === 'left' || dir === 'right';
    scaleX = horizontal ? 1 + drive * .034 : 1 - drive * .020;
    scaleY = horizontal ? 1 - drive * .020 : 1 + drive * .034;
    dy = -drive * .42;
  } else if (state === 'hurt') {
    const impact = Math.max(0, 1 - tick / 14);
    const snap = tick < 3 ? -1 : tick < 7 ? .55 : -.18;
    rotation = snap * .048 * impact;
    const v = dashVector(dir);
    dx = -v.x * impact * .82; dy = -v.y * impact * .52 - impact * .34;
  } else if (state === 'down') {
    const settle = Math.min(1, index / Math.max(1, COUNT.down - 1));
    scaleX = 1 + settle * .038; scaleY = 1 - settle * .040; dy = settle * .44;
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
  const w = (state === 'down' ? 11.8 : state === 'dash' ? 10.0 : 9.45) * (1 - airborne * .12);
  const h = (state === 'down' ? 2.95 : 2.36) * (1 - airborne * .08);
  ctx.save();
  ctx.fillStyle = '#231912';
  ctx.globalAlpha = .065 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.3, w * 1.42, h * 1.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .13 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.0, w, h, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function muzzlePoint(dir: DuckDir, feetX: number, feetY: number): { x: number; y: number; a: number } {
  if (dir === 'right') return { x: feetX + 18.0, y: feetY - 13.0, a: 0 };
  if (dir === 'left') return { x: feetX - 18.0, y: feetY - 13.0, a: Math.PI };
  if (dir === 'up') return { x: feetX + 3.0, y: feetY - 27.6, a: -Math.PI / 2 };
  return { x: feetX + 7.0, y: feetY - 3.2, a: 1.29 };
}

function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick > 4) return;
  const p = muzzlePoint(dir, feetX, feetY);
  const fade = Math.max(.10, 1 - tick / 5);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * fade;
  ctx.fillStyle = '#fff2ad';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(6.8, -2.2); ctx.lineTo(4.4, 0); ctx.lineTo(7.6, 2.2); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = alpha * fade * .52;
  ctx.fillStyle = '#f5a933';
  ctx.beginPath(); ctx.ellipse(2.2, 0, 5.8, 3.4, 0, 0, Math.PI * 2); ctx.fill();
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
  if (tick > 9) return;
  const t = 1 - tick / 10;
  ctx.save();
  ctx.globalAlpha = alpha * t * .65;
  ctx.strokeStyle = '#fff2c8';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    const a = -.9 + i * .45;
    ctx.beginPath();
    ctx.moveTo(feetX + Math.cos(a) * 12, feetY - 20 + Math.sin(a) * 9);
    ctx.lineTo(feetX + Math.cos(a) * 17, feetY - 20 + Math.sin(a) * 13);
    ctx.stroke();
  }
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

  drawFrame(ctx, image, input.dir, state, index, feetX, feetY, alpha, pose);
  if (state === 'shoot') drawMuzzle(ctx, input.dir, feetX + pose.dx, feetY + pose.dy, tick, alpha);
  if (state === 'hurt') drawHurtFx(ctx, feetX, feetY, tick, alpha);

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-atlas-v16';
  document.documentElement.dataset.duckHeistPlayerFrames = '464-raster-chibi-v16';
  document.documentElement.dataset.duckHeistPlayerState = state;
  document.documentElement.dataset.duckHeistPlayerVisualFrame = `${state}:${index}`;
}
