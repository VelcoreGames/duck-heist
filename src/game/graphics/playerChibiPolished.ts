import type { DuckDir } from '../types';
import { drawChibiPlayerV3 } from './playerChibiV3';

type Ctx = CanvasRenderingContext2D;
type State = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact';
type AuthoredState = 'idle' | 'walk' | 'shoot' | 'interact';

const ATLAS_URL = new URL('../../assets/chibi/base-duck-approved-atlas.png', import.meta.url).href;
const FRAME_W = 20;
const FRAME_H = 30;
const COLS = 30;
const ROWS = 4;
const DRAW_W = 24;
const DRAW_H = 36;
const PIVOT_X = DRAW_W / 2;
const PIVOT_Y = DRAW_H - 1.2;
const STATE_START: Record<AuthoredState, number> = { idle: 0, walk: 4, shoot: 16, interact: 22 };
const STATE_COUNT: Record<AuthoredState, number> = { idle: 4, walk: 12, shoot: 6, interact: 8 };
const ROW: Record<DuckDir, number> = { down: 0, up: 1, left: 2, right: 3 };

export const POLISHED_DUCK_AUTHORED_FRAMES = 120;

export interface ChibiPlayerPolishedInput {
  ctx: Ctx;
  x: number;
  y: number;
  frame: number;
  dir: DuckDir;
  moving: boolean;
  hurt: boolean;
  dashing: boolean;
  shooting: boolean;
  dead?: boolean;
  interacting?: boolean;
  skinId?: string;
  alpha?: number;
  runtimeKey?: object;
  shotSequence?: number;
}

interface Runtime {
  state: State;
  enteredAt: number;
  lastFrame: number;
  lastShot?: number;
  wasShoot: boolean;
  wasDash: boolean;
  wasHurt: boolean;
}

interface Pose {
  authored: AuthoredState;
  index: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  dx: number;
  dy: number;
  flash: number;
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

function desiredState(input: ChibiPlayerPolishedInput): State {
  if (input.dead) return 'down';
  if (input.hurt) return 'hurt';
  if (input.dashing) return 'dash';
  if (input.shooting) return 'shoot';
  if (input.interacting) return 'interact';
  return input.moving ? 'walk' : 'idle';
}

function resolveState(input: ChibiPlayerPolishedInput): { state: State; tick: number } {
  const key = input.runtimeKey ?? fallbackKey;
  let rt = runtimes.get(key);
  if (!rt || input.frame < rt.lastFrame) {
    rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, wasShoot: false, wasDash: false, wasHurt: false };
    runtimes.set(key, rt);
  }

  const wanted = desiredState(input);
  const shotChanged = input.shotSequence !== undefined && input.shotSequence !== rt.lastShot;
  const shootStart = wanted === 'shoot' && (shotChanged || (input.shooting && !rt.wasShoot));
  const dashStart = wanted === 'dash' && input.dashing && !rt.wasDash;
  const hurtStart = wanted === 'hurt' && input.hurt && !rt.wasHurt;

  if (shootStart || dashStart || hurtStart || (wanted === 'down' && rt.state !== 'down')) {
    rt.state = wanted;
    rt.enteredAt = input.frame;
  } else if (rt.state === 'shoot' && input.frame - rt.enteredAt < 12) {
    // Let the six authored recoil frames finish.
  } else if (rt.state === 'hurt' && input.frame - rt.enteredAt < 9) {
    // Keep impact readable even if i-frames change quickly.
  } else if (rt.state === 'down') {
    // Terminal for this player instance.
  } else if (rt.state !== wanted) {
    rt.state = wanted;
    rt.enteredAt = input.frame;
  }

  rt.lastFrame = input.frame;
  rt.lastShot = input.shotSequence;
  rt.wasShoot = input.shooting;
  rt.wasDash = input.dashing;
  rt.wasHurt = input.hurt;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt) };
}

function poseFor(state: State, tick: number, frame: number, dir: DuckDir): Pose {
  if (state === 'walk') {
    const i = Math.floor(frame / 3) % 12;
    const phase = i / 12 * Math.PI * 2;
    return {
      authored: 'walk', index: i,
      scaleX: 1 + Math.cos(phase * 2) * .018,
      scaleY: 1 - Math.cos(phase * 2) * .018,
      rotation: dir === 'left' ? -.015 : dir === 'right' ? .015 : 0,
      dx: Math.round(Math.sin(phase) * .45),
      dy: Math.round(-Math.abs(Math.sin(phase)) * 1.2),
      flash: 0,
    };
  }
  if (state === 'shoot') {
    const i = Math.min(5, Math.floor(tick / 2));
    const kick = [0, 1.8, 2.8, 1.8, .8, 0][i] ?? 0;
    const dx = dir === 'left' ? kick : dir === 'right' ? -kick : 0;
    const dy = dir === 'up' ? kick : dir === 'down' ? -kick * .35 : 0;
    return { authored: 'shoot', index: i, scaleX: 1 + (i === 2 ? .025 : 0), scaleY: 1 - (i === 2 ? .025 : 0), rotation: 0, dx, dy, flash: i >= 1 && i <= 2 ? .13 : 0 };
  }
  if (state === 'interact') {
    const i = Math.min(7, Math.floor(tick / 3));
    const arc = Math.sin((i / 7) * Math.PI);
    return { authored: 'interact', index: i, scaleX: 1 + arc * .015, scaleY: 1 + arc * .02, rotation: 0, dx: 0, dy: -Math.round(arc * 2), flash: 0 };
  }
  if (state === 'dash') {
    const i = tick % 12;
    const t = Math.min(1, tick / 10);
    const pulse = Math.sin(t * Math.PI);
    const horizontal = dir === 'left' || dir === 'right';
    return {
      authored: 'walk', index: i,
      scaleX: horizontal ? 1.12 + pulse * .12 : .94 - pulse * .035,
      scaleY: horizontal ? .92 - pulse * .03 : 1.12 + pulse * .12,
      rotation: 0,
      dx: 0,
      dy: horizontal ? -1 : 0,
      flash: 0,
    };
  }
  if (state === 'hurt') {
    const i = Math.floor(tick / 2) % 4;
    return {
      authored: 'idle', index: i,
      scaleX: 1.035, scaleY: .965,
      rotation: tick % 2 === 0 ? -.035 : .035,
      dx: tick % 2 === 0 ? -1.2 : 1.2,
      dy: -1,
      flash: .38,
    };
  }
  if (state === 'down') {
    const t = Math.min(1, tick / 20);
    const ease = 1 - Math.pow(1 - t, 3);
    return {
      authored: 'idle', index: 0,
      scaleX: 1 + ease * .13,
      scaleY: 1 - ease * .22,
      rotation: (dir === 'left' ? -1 : 1) * ease * 1.18,
      dx: (dir === 'left' ? -1 : 1) * ease * 2.5,
      dy: ease * 4,
      flash: 0,
    };
  }
  const i = Math.floor(frame / 11) % 4;
  const breathe = Math.sin(frame * .055);
  return { authored: 'idle', index: i, scaleX: 1 - breathe * .008, scaleY: 1 + breathe * .012, rotation: 0, dx: 0, dy: -breathe * .35, flash: 0 };
}

function sourceRect(dir: DuckDir, pose: Pose) {
  const col = STATE_START[pose.authored] + Math.min(STATE_COUNT[pose.authored] - 1, pose.index);
  return { sx: col * FRAME_W, sy: ROW[dir] * FRAME_H };
}

function dashVector(dir: DuckDir) {
  if (dir === 'left') return { x: -1, y: 0 };
  if (dir === 'right') return { x: 1, y: 0 };
  if (dir === 'up') return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function drawFrame(ctx: Ctx, image: HTMLImageElement, dir: DuckDir, pose: Pose, feetX: number, feetY: number, alpha: number, ghostOffsetX = 0, ghostOffsetY = 0): void {
  const { sx, sy } = sourceRect(dir, pose);
  const w = DRAW_W * pose.scaleX;
  const h = DRAW_H * pose.scaleY;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.translate(feetX + pose.dx + ghostOffsetX, feetY + pose.dy + ghostOffsetY);
  ctx.rotate(pose.rotation);
  ctx.drawImage(image, sx, sy, FRAME_W, FRAME_H, -PIVOT_X * pose.scaleX, -PIVOT_Y * pose.scaleY, w, h);
  if (pose.flash > 0) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pose.flash * alpha;
    ctx.fillStyle = '#fff2d4';
    ctx.beginPath(); ctx.ellipse(0, -17, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function weaponAnchor(dir: DuckDir, feetX: number, feetY: number, recoil = 0) {
  if (dir === 'left') return { x: feetX - 8 + recoil, y: feetY - 14, a: Math.PI, behind: false };
  if (dir === 'right') return { x: feetX + 8 - recoil, y: feetY - 14, a: 0, behind: false };
  if (dir === 'up') return { x: feetX, y: feetY - 22 + recoil, a: -Math.PI / 2, behind: true };
  return { x: feetX + 1, y: feetY - 8 - recoil, a: Math.PI / 2, behind: false };
}

function drawWeapon(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, recoil = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, recoil);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(p.x), Math.round(p.y));
  ctx.rotate(p.a);
  ctx.fillStyle = '#171b21'; ctx.fillRect(-6, -3, 13, 7);
  ctx.fillStyle = '#44515a'; ctx.fillRect(-4, -2, 10, 4);
  ctx.fillStyle = '#87969c'; ctx.fillRect(-2, -2, 6, 1);
  ctx.fillStyle = '#b88b45'; ctx.fillRect(-5, -1, 2, 3);
  ctx.fillStyle = '#11151a'; ctx.fillRect(1, 2, 3, 4);
  ctx.fillStyle = '#c6d1cf'; ctx.fillRect(5, -1, 3, 2);
  ctx.restore();
}

function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number): void {
  const p = weaponAnchor(dir, feetX, feetY, 0);
  const length = 10;
  const vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  const mx = p.x + vx * length;
  const my = p.y + vy * length;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(mx), Math.round(my));
  ctx.fillStyle = '#fff1a8'; ctx.fillRect(-2, -2, 5, 5);
  ctx.fillStyle = '#ffb33d'; ctx.fillRect(-1, -4, 3, 9); ctx.fillRect(-4, -1, 9, 3);
  ctx.fillStyle = '#fff9dd'; ctx.fillRect(-1, -1, 3, 3);
  ctx.restore();
}

function drawLoadingDuck(ctx: Ctx, feetX: number, feetY: number, alpha: number): void {
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(18,16,18,.18)'; ctx.beginPath(); ctx.ellipse(feetX, feetY + 1, 8, 2.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#39291a'; ctx.beginPath(); ctx.arc(feetX, feetY - 18, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f6d36c'; ctx.beginPath(); ctx.arc(feetX, feetY - 18, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f29a38'; ctx.fillRect(feetX - 5, feetY - 14, 10, 3);
  ctx.fillStyle = '#f1c95c'; ctx.beginPath(); ctx.ellipse(feetX, feetY - 6, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawChibiPlayerPolished(input: ChibiPlayerPolishedInput): void {
  if (typeof document === 'undefined') return;
  if (input.skinId && input.skinId !== 'robber') {
    drawChibiPlayerV3(input);
    return;
  }

  const image = getAtlas();
  const feetX = Math.round(input.x + 8);
  const feetY = Math.round(input.y + 18);
  const opacity = Math.max(0, Math.min(1, input.alpha ?? 1));
  const { state, tick } = resolveState(input);
  const pose = poseFor(state, tick, input.frame, input.dir);

  const ctx = input.ctx;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = .2 * opacity * (state === 'dash' ? .72 : 1);
  ctx.fillStyle = '#161219';
  const shadowW = state === 'down' ? 9 : state === 'dash' ? 10 : 8.5;
  const shadowH = state === 'down' ? 2.6 : 2.2;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1, shadowW, shadowH, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (!image || !image.complete || image.naturalWidth !== 600 || image.naturalHeight !== 120) {
    drawLoadingDuck(ctx, feetX, feetY, opacity);
    document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-polished-loading';
    return;
  }

  if (state === 'dash') {
    const v = dashVector(input.dir);
    for (let i = 4; i >= 1; i--) {
      drawFrame(ctx, image, input.dir, pose, feetX, feetY, opacity * (.035 + (5 - i) * .025), -v.x * i * 4.2, -v.y * i * 4.2);
    }
  }

  const authoredWeapon = state === 'shoot' || state === 'interact' || state === 'down';
  const wp = weaponAnchor(input.dir, feetX, feetY, 0);
  if (!authoredWeapon && wp.behind) drawWeapon(ctx, input.dir, feetX, feetY, opacity);

  drawFrame(ctx, image, input.dir, pose, feetX, feetY, opacity * (state === 'dash' ? .93 : 1));

  if (!authoredWeapon && !wp.behind) drawWeapon(ctx, input.dir, feetX, feetY, opacity);
  if (state === 'shoot' && tick >= 2 && tick <= 5) drawMuzzle(ctx, input.dir, feetX, feetY, opacity * (1 - Math.max(0, tick - 3) * .2));

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-polished-v1';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored';
  document.documentElement.dataset.duckHeistPlayerState = state;
}
