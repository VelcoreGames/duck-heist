import type { DuckDir } from '../types';
import { drawChibiPlayerV3 } from './playerChibiV3';

type Ctx = CanvasRenderingContext2D;
type State = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact';
type AuthoredState = 'idle' | 'walk' | 'shoot' | 'interact';

const ATLAS_URL = new URL('../../assets/chibi/base-duck-remastered-atlas.png', import.meta.url).href;
const FRAME_W = 40;
const FRAME_H = 60;
const DRAW_W = 27;
const DRAW_H = 40.5;
const PIVOT_X = DRAW_W / 2;
const PIVOT_Y = DRAW_H - 1.35;
const STATE_START: Record<AuthoredState, number> = { idle: 0, walk: 4, shoot: 16, interact: 22 };
const STATE_COUNT: Record<AuthoredState, number> = { idle: 4, walk: 12, shoot: 6, interact: 8 };
const ROW: Record<DuckDir, number> = { down: 0, up: 1, left: 2, right: 3 };

export const REMASTERED_DUCK_AUTHORED_FRAMES = 120;

export interface ChibiPlayerRemasteredInput {
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

function desiredState(input: ChibiPlayerRemasteredInput): State {
  if (input.dead) return 'down';
  if (input.hurt) return 'hurt';
  if (input.dashing) return 'dash';
  if (input.shooting) return 'shoot';
  if (input.interacting) return 'interact';
  return input.moving ? 'walk' : 'idle';
}

function resolveState(input: ChibiPlayerRemasteredInput): { state: State; tick: number } {
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
    // Complete the six authored recoil frames.
  } else if (rt.state === 'hurt' && input.frame - rt.enteredAt < 10) {
    // Keep the impact reaction readable.
  } else if (rt.state === 'down') {
    // Down is terminal for this runtime instance.
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
    const i = Math.floor(frame / 2) % 12;
    const phase = (i / 12) * Math.PI * 2;
    const sideLean = dir === 'left' ? -.018 : dir === 'right' ? .018 : 0;
    return {
      authored: 'walk', index: i,
      scaleX: 1 + Math.cos(phase * 2) * .014,
      scaleY: 1 - Math.cos(phase * 2) * .014,
      rotation: sideLean + Math.sin(phase) * .008,
      dx: Math.sin(phase) * .38,
      dy: -Math.abs(Math.sin(phase)) * 1.05,
    };
  }
  if (state === 'shoot') {
    const i = Math.min(5, Math.floor(tick / 2));
    const kick = [0, 1.15, 2.15, 1.5, .65, 0][i] ?? 0;
    const dx = dir === 'left' ? kick : dir === 'right' ? -kick : 0;
    const dy = dir === 'up' ? kick : dir === 'down' ? -kick * .32 : 0;
    return {
      authored: 'shoot', index: i,
      scaleX: i === 2 ? 1.018 : 1,
      scaleY: i === 2 ? .982 : 1,
      rotation: 0, dx, dy,
    };
  }
  if (state === 'interact') {
    const i = Math.min(7, Math.floor(tick / 2));
    const arc = Math.sin((i / 7) * Math.PI);
    return {
      authored: 'interact', index: i,
      scaleX: 1 + arc * .012,
      scaleY: 1 + arc * .018,
      rotation: Math.sin((i / 7) * Math.PI * 2) * .01,
      dx: 0,
      dy: -arc * 1.7,
    };
  }
  if (state === 'dash') {
    const i = Math.floor(tick * 1.35) % 12;
    const t = Math.min(1, tick / 10);
    const pulse = Math.sin(t * Math.PI);
    const horizontal = dir === 'left' || dir === 'right';
    return {
      authored: 'walk', index: i,
      scaleX: horizontal ? 1.08 + pulse * .12 : .965 - pulse * .025,
      scaleY: horizontal ? .94 - pulse * .025 : 1.08 + pulse * .12,
      rotation: 0,
      dx: 0,
      dy: horizontal ? -.7 : 0,
    };
  }
  if (state === 'hurt') {
    const i = Math.floor(tick / 2) % 4;
    const snap = tick % 2 === 0 ? -1 : 1;
    return {
      authored: 'idle', index: i,
      scaleX: 1.025, scaleY: .975,
      rotation: snap * .026,
      dx: snap * .85,
      dy: -.8,
    };
  }
  if (state === 'down') {
    const t = Math.min(1, tick / 20);
    const ease = 1 - Math.pow(1 - t, 3);
    return {
      authored: 'idle', index: 0,
      scaleX: 1 + ease * .10,
      scaleY: 1 - ease * .18,
      rotation: (dir === 'left' ? -1 : 1) * ease * 1.16,
      dx: (dir === 'left' ? -1 : 1) * ease * 2.1,
      dy: ease * 3.4,
    };
  }
  const i = Math.floor(frame / 12) % 4;
  const breathe = Math.sin(frame * .052);
  return {
    authored: 'idle', index: i,
    scaleX: 1 - breathe * .006,
    scaleY: 1 + breathe * .009,
    rotation: 0,
    dx: 0,
    dy: -breathe * .28,
  };
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

function drawFrame(
  ctx: Ctx,
  image: HTMLImageElement,
  dir: DuckDir,
  pose: Pose,
  feetX: number,
  feetY: number,
  alpha: number,
  ghostOffsetX = 0,
  ghostOffsetY = 0,
): void {
  const { sx, sy } = sourceRect(dir, pose);
  const w = DRAW_W * pose.scaleX;
  const h = DRAW_H * pose.scaleY;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = alpha;
  ctx.translate(feetX + pose.dx + ghostOffsetX, feetY + pose.dy + ghostOffsetY);
  ctx.rotate(pose.rotation);
  ctx.drawImage(image, sx, sy, FRAME_W, FRAME_H, -PIVOT_X * pose.scaleX, -PIVOT_Y * pose.scaleY, w, h);
  ctx.restore();
}

function weaponAnchor(dir: DuckDir, feetX: number, feetY: number, recoil = 0) {
  if (dir === 'left') return { x: feetX - 7.1 + recoil, y: feetY - 14.4, a: Math.PI, behind: false };
  if (dir === 'right') return { x: feetX + 7.1 - recoil, y: feetY - 14.4, a: 0, behind: false };
  if (dir === 'up') return { x: feetX, y: feetY - 21.5 + recoil, a: -Math.PI / 2, behind: true };
  return { x: feetX + .6, y: feetY - 8.8 - recoil, a: Math.PI / 2, behind: false };
}

function drawWeapon(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, recoil = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, recoil);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);

  // Small robber blaster: short silhouette, metallic top plane, warm grip.
  ctx.fillStyle = '#17191d';
  ctx.beginPath();
  ctx.moveTo(-5.6, -2.35); ctx.lineTo(5.5, -2.35); ctx.lineTo(6.7, -.6);
  ctx.lineTo(5.6, 1.55); ctx.lineTo(-5.6, 1.55); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4f5960';
  ctx.fillRect(-3.9, -1.45, 8.9, 2.15);
  ctx.fillStyle = '#a9b3b4';
  ctx.fillRect(-2.7, -1.35, 5.4, .65);
  ctx.fillStyle = '#20252a';
  ctx.beginPath(); ctx.moveTo(.3, 1.2); ctx.lineTo(3.2, 1.2); ctx.lineTo(2.2, 5.2); ctx.lineTo(.1, 4.45); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a96f32';
  ctx.fillRect(.7, 2.25, 1.65, 2.25);
  ctx.fillStyle = '#d7b66d';
  ctx.fillRect(-4.55, -.55, 1.25, 1.05);
  ctx.fillStyle = '#d5dcda';
  ctx.fillRect(4.9, -.75, 2.05, .9);
  ctx.restore();
}

function drawGrip(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number): void {
  const p = weaponAnchor(dir, feetX, feetY, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f5cf74';
  const ox = dir === 'left' ? 2.8 : dir === 'right' ? -2.8 : 0;
  const oy = dir === 'up' ? 3.2 : dir === 'down' ? -2.8 : 0;
  ctx.beginPath();
  ctx.ellipse(p.x + ox, p.y + oy, 1.65, 1.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number): void {
  const p = weaponAnchor(dir, feetX, feetY, 0);
  const vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  const mx = p.x + vx * 9.4;
  const my = p.y + vy * 9.4;
  const pulse = tick <= 3 ? 1 : .72;
  ctx.save();
  ctx.translate(mx, my);
  ctx.globalAlpha = alpha * .19;
  ctx.fillStyle = '#ffbd48';
  ctx.beginPath(); ctx.arc(0, 0, 6.2 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffad27';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    const r = i % 2 === 0 ? 5.2 * pulse : 2.2 * pulse;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff6c7';
  ctx.beginPath(); ctx.arc(0, 0, 1.55 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawShadow(ctx: Ctx, feetX: number, feetY: number, state: State, alpha: number): void {
  const width = state === 'down' ? 9.5 : state === 'dash' ? 10.5 : 8.7;
  const height = state === 'down' ? 2.8 : 2.35;
  ctx.save();
  ctx.fillStyle = '#181319';
  ctx.globalAlpha = .07 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.15, width * 1.35, height * 1.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .11 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.05, width * 1.12, height * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .13 * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + .9, width * .83, height * .74, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLoadingDuck(ctx: Ctx, feetX: number, feetY: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(20,16,18,.16)';
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1, 8, 2.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7dc8b';
  ctx.beginPath(); ctx.arc(feetX, feetY - 19, 8.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f09a31';
  ctx.beginPath(); ctx.ellipse(feetX, feetY - 14.4, 5.3, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#efc968';
  ctx.beginPath(); ctx.ellipse(feetX, feetY - 6.4, 5.8, 6.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawChibiPlayerRemastered(input: ChibiPlayerRemasteredInput): void {
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

  drawShadow(ctx, feetX, feetY, state, opacity * (state === 'dash' ? .8 : 1));

  if (!image || !image.complete || image.naturalWidth !== 1200 || image.naturalHeight !== 240) {
    drawLoadingDuck(ctx, feetX, feetY, opacity);
    document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-remastered-loading';
    return;
  }

  if (state === 'dash') {
    const v = dashVector(input.dir);
    for (let i = 5; i >= 1; i--) {
      const ghostAlpha = opacity * (.018 + (6 - i) * .020);
      drawFrame(ctx, image, input.dir, pose, feetX, feetY, ghostAlpha, -v.x * i * 4.35, -v.y * i * 4.35);
    }
  }

  const authoredWeapon = state === 'shoot' || state === 'interact' || state === 'down';
  const wp = weaponAnchor(input.dir, feetX, feetY, 0);
  if (!authoredWeapon && wp.behind) {
    drawWeapon(ctx, input.dir, feetX, feetY, opacity);
    drawGrip(ctx, input.dir, feetX, feetY, opacity);
  }

  drawFrame(ctx, image, input.dir, pose, feetX, feetY, opacity * (state === 'dash' ? .94 : 1));

  if (!authoredWeapon && !wp.behind) {
    drawWeapon(ctx, input.dir, feetX, feetY, opacity);
    drawGrip(ctx, input.dir, feetX, feetY, opacity);
  }

  if (state === 'shoot' && tick >= 2 && tick <= 5) {
    drawMuzzle(ctx, input.dir, feetX, feetY, opacity * (1 - Math.max(0, tick - 3) * .18), tick);
  }

  if (state === 'hurt') {
    ctx.save();
    ctx.globalAlpha = .11 * opacity;
    ctx.fillStyle = '#ff725d';
    ctx.beginPath(); ctx.ellipse(feetX, feetY - 15, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v2';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered';
  document.documentElement.dataset.duckHeistPlayerState = state;
}
