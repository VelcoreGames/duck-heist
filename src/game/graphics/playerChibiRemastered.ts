import type { DuckDir } from '../types';
import { drawChibiPlayerV3 } from './playerChibiV3';

type Ctx = CanvasRenderingContext2D;
type State = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact';
type AuthoredState = 'idle' | 'walk' | 'shoot' | 'interact';

const ATLAS_URL = new URL('../../assets/chibi/base-duck-remastered-atlas.png', import.meta.url).href;
const FRAME_W = 40;
const FRAME_H = 60;
const DRAW_W = 24;
const DRAW_H = 36;
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
  celebrating?: boolean;
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
  dashEndedAt?: number;
  lastDir: DuckDir;
  wasMoving: boolean;
  moveStartedAt?: number;
  moveStoppedAt?: number;
  turnAt?: number;
  lastX: number;
  lastY: number;
  walkDistance: number;
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
  if (input.celebrating) return 'interact';
  if (input.interacting) return 'interact';
  return input.moving ? 'walk' : 'idle';
}

function resolveState(input: ChibiPlayerRemasteredInput): { state: State; tick: number; dashRecovery: number; moveStartAge: number; moveStopAge: number; turnAge: number; walkDistance: number } {
  const key = input.runtimeKey ?? fallbackKey;
  let rt = runtimes.get(key);
  if (!rt || input.frame < rt.lastFrame) {
    rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, lastShot: input.shotSequence, wasShoot: false, wasDash: false, wasHurt: false, lastDir: input.dir, wasMoving: input.moving, lastX: input.x, lastY: input.y, walkDistance: 0 };
    runtimes.set(key, rt);
  }

  const wanted = desiredState(input);
  const worldDx = input.x - rt.lastX;
  const worldDy = input.y - rt.lastY;
  const worldStep = Math.hypot(worldDx, worldDy);
  // Ignore room teleports/respawns. Normal locomotion advances the authored
  // gait by actual distance so feet no longer skate at different speeds.
  if (input.moving && !input.dashing && worldStep > .01 && worldStep < 8) {
    rt.walkDistance += worldStep;
  }
  rt.lastX = input.x;
  rt.lastY = input.y;
  if (rt.lastDir !== input.dir) {
    rt.lastDir = input.dir;
    rt.turnAt = input.frame;
  }
  if (!rt.wasMoving && input.moving) rt.moveStartedAt = input.frame;
  if (rt.wasMoving && !input.moving) rt.moveStoppedAt = input.frame;
  if (rt.wasDash && !input.dashing) rt.dashEndedAt = input.frame;
  const shotChanged = input.shotSequence !== undefined && rt.lastShot !== undefined && input.shotSequence !== rt.lastShot;
  const shootStart = !input.dead && !input.hurt && !input.dashing && (shotChanged || (wanted === 'shoot' && input.shooting && !rt.wasShoot));
  const dashStart = wanted === 'dash' && input.dashing && !rt.wasDash;
  const hurtStart = wanted === 'hurt' && input.hurt && !rt.wasHurt;

  if (wanted === 'down' && rt.state !== 'down') {
    rt.state = 'down';
    rt.enteredAt = input.frame;
  } else if (hurtStart) {
    rt.state = 'hurt';
    rt.enteredAt = input.frame;
  } else if (dashStart) {
    rt.state = 'dash';
    rt.enteredAt = input.frame;
  } else if (shootStart) {
    rt.state = 'shoot';
    rt.enteredAt = input.frame;
  } else if (rt.state === 'shoot' && input.frame - rt.enteredAt < 24) {
    // Hold the full authored recoil and recovery sequence.
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
  rt.wasMoving = input.moving;
  const dashRecovery = rt.dashEndedAt === undefined ? -1 : input.frame - rt.dashEndedAt;
  const moveStartAge = rt.moveStartedAt === undefined ? -1 : input.frame - rt.moveStartedAt;
  const moveStopAge = rt.moveStoppedAt === undefined ? -1 : input.frame - rt.moveStoppedAt;
  const turnAge = rt.turnAt === undefined ? -1 : input.frame - rt.turnAt;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt), dashRecovery, moveStartAge, moveStopAge, turnAge, walkDistance: rt.walkDistance };
}

function poseFor(state: State, tick: number, _frame: number, dir: DuckDir, walkDistance = 0): Pose {
  if (state === 'walk') {
    // Los 12 dibujos authored se recorren completos. El movimiento extra sólo
    // acompaña el peso: ya no deforma la silueta de forma agresiva.
    const strideDistance = 30;
    const cycleDistance = ((walkDistance % strideDistance) + strideDistance) % strideDistance;
    const i = Math.floor((cycleDistance / strideDistance) * 12) % 12;
    const phase = (cycleDistance / strideDistance) * Math.PI * 2;
    const stride = Math.sin(phase);
    const plant = Math.cos(phase * 2);
    const lift = Math.abs(Math.sin(phase));
    const vertical = dir === 'up' || dir === 'down';
    const sideLean = dir === 'left' ? -.016 : dir === 'right' ? .016 : 0;
    return {
      authored: 'walk', index: i,
      scaleX: vertical ? 1 + plant * .022 : 1 + plant * .018,
      scaleY: vertical ? 1 - plant * .028 : 1 - plant * .020,
      rotation: vertical ? stride * .030 : sideLean + stride * .026,
      dx: vertical ? stride * .82 : stride * .76,
      dy: vertical ? -lift * 2.15 + plant * .24 : -lift * 1.72 + plant * .16,
    };
  }
  if (state === 'shoot') {
    // Ataque + recuperación authored: no congelar el frame 5 al final.
    const seq = [0,1,2,3,4,5,5,4,3,2,1,0];
    const i = seq[Math.min(seq.length - 1, Math.floor(tick / 2))];
    const attackT = Math.min(1, tick / 4);
    const recoverT = tick <= 4 ? 1 : Math.max(0, 1 - (tick - 4) / 20);
    const attack = 1 - Math.pow(1 - attackT, 3);
    const kick = 5.45 * (tick <= 4 ? attack : Math.pow(recoverT, 1.55));
    const horizontal = dir === 'left' || dir === 'right';
    const dx = dir === 'left' ? kick : dir === 'right' ? -kick : 0;
    const dy = dir === 'up' ? kick * .82 : dir === 'down' ? -kick * .68 : 0;
    const recoilPeak = tick >= 2 && tick <= 8;
    return {
      authored: 'shoot', index: i,
      scaleX: recoilPeak ? (horizontal ? 1.052 : 1.034) : 1,
      scaleY: recoilPeak ? .948 : 1,
      rotation: dir === 'left' ? -.034 * (kick / 5.45) : dir === 'right' ? .034 * (kick / 5.45) : 0,
      dx, dy,
    };
  }
  if (state === 'interact') {
    const seq = [0,1,2,3,4,5,6,7,6,5,4,3,2,1,0];
    const i = seq[Math.min(seq.length - 1, Math.floor(tick / 2))];
    const progress = Math.min(1, tick / 28);
    const arc = Math.sin(progress * Math.PI);
    return {
      authored: 'interact', index: i,
      scaleX: 1 + arc * .008,
      scaleY: 1 + arc * .012,
      rotation: Math.sin(progress * Math.PI * 2) * .009,
      dx: Math.sin(progress * Math.PI * 2) * .14,
      dy: -arc * 1.45,
    };
  }
  if (state === 'dash') {
    // Anticipation -> stretch -> recovery. Keeps the authored walk silhouette
    // but gives the dash a readable chibi action arc in every direction.
    const i = Math.floor(tick * 1.45) % 12;
    const t = Math.min(1, tick / 10);
    const launch = Math.min(1, tick / 2);
    const anticipation = 1 - launch;
    const driveT = Math.max(0, Math.min(1, (t - .08) / .82));
    const drive = Math.sin(driveT * Math.PI);
    const recover = Math.max(0, Math.min(1, (t - .72) / .28));
    const stretch = drive * .058 * (1 - recover * .42);
    const squash = anticipation * .052;
    const horizontal = dir === 'left' || dir === 'right';
    return {
      authored: 'walk', index: i,
      scaleX: horizontal ? .985 - squash + stretch : 1.018 + squash * .38 - stretch * .24,
      scaleY: horizontal ? 1.018 + squash * .38 - stretch * .24 : .985 - squash + stretch,
      rotation: 0,
      dx: 0,
      dy: horizontal ? -.58 - drive * .24 : -drive * .18,
    };
  }
  if (state === 'hurt') {
    const seq = [2,3,2,1,0];
    const i = seq[Math.min(seq.length - 1, Math.floor(tick / 2))];
    const impact = Math.max(0, 1 - tick / 10);
    const snap = tick < 2 ? -1 : tick < 5 ? 1 : tick < 7 ? -.35 : 0;
    const v = dashVector(dir);
    return {
      authored: 'idle', index: i,
      scaleX: 1 + impact * .028,
      scaleY: 1 - impact * .034,
      rotation: snap * .034,
      dx: -v.x * impact * 1.15 + snap * .28,
      dy: -v.y * impact * .72 - impact * .52,
    };
  }
  if (state === 'down') {
    const t = Math.min(1, tick / 28);
    const ease = 1 - Math.pow(1 - t, 3);
    const settleT = Math.max(0, Math.min(1, (t - .68) / .32));
    const settle = Math.sin(settleT * Math.PI) * (1 - settleT);
    const fallSign = dir === 'left' || dir === 'up' ? -1 : 1;
    return {
      authored: 'idle', index: Math.min(3, Math.floor(tick / 7)),
      scaleX: 1 + ease * .075 + settle * .025,
      scaleY: 1 - ease * .19 - settle * .018,
      rotation: fallSign * (ease * 1.18 - settle * .12),
      dx: fallSign * (ease * 2.55 - settle * .35),
      dy: ease * 3.85 - settle * .62,
    };
  }
  const i = Math.floor(tick / 10) % 4;
  const breathe = Math.sin(tick * .075);
  const settle = Math.cos(tick * .04);
  return {
    authored: 'idle', index: i,
    scaleX: 1 - breathe * .006,
    scaleY: 1 + breathe * .011,
    rotation: settle * .004,
    dx: settle * .10,
    dy: -breathe * .48,
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
  ctx.filter = 'saturate(1.07) contrast(1.035)';
  ctx.shadowColor = 'rgba(54, 37, 25, .22)';
  ctx.shadowBlur = 1.15;
  ctx.shadowOffsetY = .55;
  ctx.drawImage(image, sx, sy, FRAME_W, FRAME_H, -PIVOT_X * pose.scaleX, -PIVOT_Y * pose.scaleY, w, h);
  ctx.shadowColor = 'transparent';
  ctx.filter = 'none';
  ctx.restore();
}

function weaponAnchor(dir: DuckDir, feetX: number, feetY: number, recoil = 0, bodyRotation = 0) {
  const base = dir === 'left'
    ? { x: feetX - 7.1 + recoil, y: feetY - 14.4, a: Math.PI, behind: false }
    : dir === 'right'
      ? { x: feetX + 7.1 - recoil, y: feetY - 14.4, a: 0, behind: false }
      : dir === 'up'
        ? { x: feetX, y: feetY - 21.5 + recoil, a: -Math.PI / 2, behind: true }
        : { x: feetX + .6, y: feetY - 8.8 - recoil, a: Math.PI / 2, behind: false };
  if (Math.abs(bodyRotation) < .0001) return base;
  const ox = base.x - feetX;
  const oy = base.y - feetY;
  const c = Math.cos(bodyRotation);
  const sn = Math.sin(bodyRotation);
  return {
    ...base,
    x: feetX + ox * c - oy * sn,
    y: feetY + ox * sn + oy * c,
    a: base.a + bodyRotation,
  };
}

function drawWeapon(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, recoil = 0, bodyRotation = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, recoil, bodyRotation);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);

  ctx.fillStyle = '#14181d';
  ctx.beginPath();
  ctx.roundRect(-5.9, -2.25, 11.7, 4.15, 1.45);
  ctx.fill();

  ctx.fillStyle = '#505b62';
  ctx.beginPath();
  ctx.roundRect(-4.7, -1.48, 8.9, 2.15, .82);
  ctx.fill();

  ctx.fillStyle = '#aeb8b8';
  ctx.beginPath();
  ctx.roundRect(-3.15, -1.30, 5.7, .62, .28);
  ctx.fill();

  ctx.fillStyle = '#22272b';
  ctx.beginPath();
  ctx.moveTo(.25, 1.15);
  ctx.quadraticCurveTo(2.75, 1.0, 3.05, 1.8);
  ctx.lineTo(2.0, 5.15);
  ctx.quadraticCurveTo(.7, 5.0, -.05, 4.18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#a86e32';
  ctx.beginPath();
  ctx.roundRect(.62, 2.18, 1.55, 2.42, .48);
  ctx.fill();

  ctx.fillStyle = '#d8b76b';
  ctx.beginPath();
  ctx.roundRect(-4.72, -.55, 1.25, 1.0, .38);
  ctx.fill();

  ctx.fillStyle = '#cfd8d7';
  ctx.beginPath();
  ctx.roundRect(4.55, -.72, 2.65, .88, .36);
  ctx.fill();

  ctx.fillStyle = '#77858a';
  ctx.beginPath();
  ctx.roundRect(6.45, -.92, 1.15, 1.26, .34);
  ctx.fill();
  ctx.restore();
}

function drawDroppedWeapon(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number): void {
  if (tick < 7) return;
  const t = Math.min(1, (tick - 7) / 16);
  const ease = 1 - Math.pow(1 - t, 3);
  const side = dir === 'left' || dir === 'up' ? -1 : 1;
  const x = feetX + side * (4.5 + ease * 4.8);
  const y = feetY - 8 + ease * 8.1 - Math.sin(t * Math.PI) * 3.0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(side * (.28 + ease * 1.05));
  ctx.fillStyle = '#15191e';
  ctx.beginPath(); ctx.roundRect(-5.6, -1.8, 11.2, 3.6, 1.15); ctx.fill();
  ctx.fillStyle = '#59656b';
  ctx.beginPath(); ctx.roundRect(-4.35, -1.1, 8.1, 1.62, .65); ctx.fill();
  ctx.fillStyle = '#c9d2d1';
  ctx.beginPath(); ctx.roundRect(3.85, -.58, 2.25, .68, .28); ctx.fill();
  ctx.fillStyle = '#a86e32';
  ctx.beginPath();
  ctx.moveTo(.1, 1.0); ctx.lineTo(2.35, 1.15); ctx.lineTo(1.55, 4.3); ctx.lineTo(.15, 3.75); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGrip(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, bodyRotation = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, 0, bodyRotation);
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

function drawMuzzle(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number, bodyRotation = 0): void {
  const p = weaponAnchor(dir, feetX, feetY, 0, bodyRotation);
  const vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  const mx = p.x + vx * 10.6;
  const my = p.y + vy * 10.6;
  const pulse = tick <= 3 ? 1.45 : tick <= 7 ? 1.08 : .76;
  ctx.save();
  ctx.translate(mx, my);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * .34;
  ctx.fillStyle = '#ffd66b';
  ctx.beginPath(); ctx.arc(0, 0, 10.5 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ff9b1f';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    const r = i % 2 === 0 ? 8.4 * pulse : 2.9 * pulse;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff9dc';
  ctx.beginPath(); ctx.arc(0, 0, 2.6 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffe6a0';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-vx * 1.2, -vy * 1.2);
  ctx.lineTo(vx * 12.5, vy * 12.5);
  ctx.stroke();
  ctx.restore();
}

function drawCasing(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number, bodyRotation = 0): void {
  if (tick < 2 || tick > 8) return;
  const p = weaponAnchor(dir, feetX, feetY, 0, bodyRotation);
  const age = tick - 2;
  const side = dir === 'left' ? 1 : dir === 'right' ? -1 : dir === 'up' ? 1 : -1;
  const ex = dir === 'left' || dir === 'right' ? side * (2.3 + age * .82) : side * (3.2 + age * .88);
  const ey = dir === 'left' || dir === 'right' ? -2.2 - age * .48 + age * age * .12 : -1.7 - age * .34 + age * age * .11;
  ctx.save();
  ctx.translate(p.x + ex, p.y + ey);
  ctx.rotate(bodyRotation + age * .72 * side);
  ctx.globalAlpha = alpha * Math.max(.18, 1 - age / 7);
  ctx.fillStyle = '#d8a84d';
  ctx.beginPath();
  ctx.roundRect(-1.25, -.48, 2.5, .96, .35);
  ctx.fill();
  ctx.fillStyle = '#fff0a8';
  ctx.globalAlpha *= .55;
  ctx.fillRect(-.72, -.36, 1.05, .20);
  ctx.restore();
}

function drawShotGlow(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, alpha: number, tick: number, bodyRotation = 0): void {
  if (tick > 8) return;
  const p = weaponAnchor(dir, feetX, feetY, 0, bodyRotation);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha * Math.max(.055, .24 - tick * .022);
  ctx.fillStyle = '#ffd46a';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, 9.5, 7.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawWalkStepAccent(ctx: Ctx, feetX: number, feetY: number, poseIndex: number, dir: DuckDir, alpha: number): void {
  // Ground contact accent, not a second pair of fake feet. The authored atlas
  // remains the silhouette; this only sells weight against polished floors.
  const phase = (poseIndex / 12) * Math.PI * 2;
  const stride = Math.sin(phase);
  const lead = stride >= 0 ? 1 : -1;
  const horizontal = dir === 'left' || dir === 'right';
  const facing = dir === 'left' ? -1 : 1;
  const front = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
  const cx = horizontal ? feetX + facing * lead * 2.25 : feetX + lead * 1.95;
  const cy = horizontal ? feetY + .72 : feetY + front * lead * .58 + .62;
  ctx.save();
  ctx.globalAlpha = .20 * alpha;
  ctx.strokeStyle = '#6f4b31';
  ctx.lineWidth = .75;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 2.55, .78, horizontal ? facing * .12 : lead * .08, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = .12 * alpha;
  ctx.fillStyle = '#fff1c8';
  ctx.beginPath();
  ctx.ellipse(cx - .35, cy - .28, 1.35, .32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFootfallDust(ctx: Ctx, feetX: number, feetY: number, poseIndex: number, dir: DuckDir, alpha: number): void {
  if (poseIndex !== 0 && poseIndex !== 6) return;
  const side = poseIndex === 0 ? -1 : 1;
  const backX = dir === 'left' ? 1.8 : dir === 'right' ? -1.8 : side * 1.1;
  const backY = dir === 'up' ? 1.15 : dir === 'down' ? -.35 : .45;
  ctx.save();
  ctx.fillStyle = '#f4dfba';
  ctx.globalAlpha = .13 * alpha;
  for (let i = 0; i < 3; i++) {
    const ox = backX * (i + 1) + side * (i - 1) * .75;
    const oy = backY * (i + 1) + i * .22;
    ctx.beginPath();
    ctx.ellipse(feetX + ox, feetY + oy, 1.25 - i * .18, .56 - i * .06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDashBurst(ctx: Ctx, feetX: number, feetY: number, dir: DuckDir, tick: number, alpha: number): void {
  const v = dashVector(dir);
  const px = -v.y;
  const py = v.x;
  const t = Math.min(1, tick / 10);
  const fade = Math.max(.16, 1 - t * .78) * alpha;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const side = (i - 1.5) * 3.1;
    const back = 7 + i * 4.2;
    const len = 8.5 + i * 2.4;
    const sx = feetX - v.x * back + px * side;
    const sy = feetY - 13 - v.y * back + py * side;
    ctx.globalAlpha = fade * (.15 + i * .035);
    ctx.strokeStyle = i % 2 === 0 ? '#ffe59b' : '#f4c95d';
    ctx.lineWidth = i < 2 ? 1.7 : 1.15;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - v.x * len, sy - v.y * len);
    ctx.stroke();
  }
  ctx.globalAlpha = fade * .22;
  ctx.strokeStyle = '#fff0b8';
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.ellipse(feetX - v.x * 3, feetY - 8 - v.y * 3, 8.8 + t * 4.5, 4.2 + t * 2.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}


function drawDashLanding(ctx: Ctx, feetX: number, feetY: number, dir: DuckDir, tick: number, alpha: number): void {
  if (tick < 0 || tick > 6) return;
  const t = tick / 6;
  const v = dashVector(dir);
  const fade = (1 - t) * alpha;
  ctx.save();
  ctx.globalAlpha = fade * .23;
  ctx.strokeStyle = '#f2d49b';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(feetX - v.x * 1.8, feetY + .7 - v.y * .65, 4.3 + t * 5.8, 1.3 + t * 1.35, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = fade * .12;
  ctx.fillStyle = '#f8e4bd';
  for (let i = 0; i < 4; i++) {
    const side = (i - 1.5) * 2.2;
    const px = -v.y;
    const py = v.x;
    ctx.beginPath();
    ctx.arc(feetX - v.x * (2 + i * 1.35) + px * side, feetY + .4 - v.y * (2 + i * .75) + py * side, .75 - i * .08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHurtAccent(ctx: Ctx, feetX: number, feetY: number, dir: DuckDir, tick: number, alpha: number): void {
  if (tick > 9) return;
  const impact = Math.max(0, 1 - tick / 10);
  const v = dashVector(dir);
  const cx = feetX - v.x * 5.2;
  const cy = feetY - 20 - v.y * 3.2;
  ctx.save();
  ctx.globalAlpha = alpha * impact * .78;
  ctx.strokeStyle = '#fff0c5';
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = -1.05 + i * .7 + (dir === 'left' ? Math.PI : 0);
    const r0 = 5.5 + i * .55;
    const r1 = r0 + 3.2 + tick * .22;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha * impact * .25;
  ctx.strokeStyle = '#e45f4f';
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.arc(feetX, feetY - 15, 10 + (1 - impact) * 4, -.35 * Math.PI, .65 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawDownImpact(ctx: Ctx, feetX: number, feetY: number, tick: number, alpha: number): void {
  if (tick < 15 || tick > 25) return;
  const t = (tick - 15) / 10;
  const fade = (1 - t) * alpha;
  ctx.save();
  ctx.globalAlpha = fade * .18;
  ctx.strokeStyle = '#e9d2a6';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(feetX, feetY + 1.1, 4.5 + t * 7.5, 1.25 + t * 1.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = fade * .095;
  ctx.fillStyle = '#f4e1bd';
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    const r = 3.4 + i * 1.25 + t * 2.2;
    ctx.beginPath();
    ctx.arc(feetX + Math.cos(a) * r, feetY + .8 + Math.sin(a) * 1.8, .72, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShadow(ctx: Ctx, feetX: number, feetY: number, state: State, alpha: number, poseDy = 0): void {
  const airborne = Math.min(1, Math.max(0, -poseDy / 3));
  const baseWidth = state === 'down' ? 9.5 : state === 'dash' ? 10.1 : 8.7;
  const width = baseWidth * (1 - airborne * .16);
  const height = (state === 'down' ? 2.8 : 2.35) * (1 - airborne * .10);
  const fade = 1 - airborne * .26;
  ctx.save();
  ctx.fillStyle = '#181319';
  ctx.globalAlpha = .07 * fade * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.15, width * 1.35, height * 1.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .11 * fade * alpha;
  ctx.beginPath(); ctx.ellipse(feetX, feetY + 1.05, width * 1.12, height * 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .13 * fade * alpha;
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
  const { state, tick, dashRecovery, moveStartAge, moveStopAge, turnAge, walkDistance } = resolveState(input);
  const pose = poseFor(state, tick, input.frame, input.dir, walkDistance);
  if (state === 'walk' && moveStartAge >= 0 && moveStartAge < 5) {
    const a = 1 - moveStartAge / 5;
    pose.scaleX *= 1 + a * .018;
    pose.scaleY *= 1 - a * .024;
    pose.dy += a * .72;
  }
  if (state === 'idle' && moveStopAge >= 0 && moveStopAge < 7) {
    const t = moveStopAge / 7;
    const settle = Math.sin(t * Math.PI) * (1 - t);
    pose.scaleX *= 1 + settle * .024;
    pose.scaleY *= 1 - settle * .020;
    pose.dy += settle * .42;
  }
  if (state !== 'down' && turnAge >= 0 && turnAge < 5) {
    const t = 1 - turnAge / 5;
    const sign = input.dir === 'left' || input.dir === 'up' ? -1 : 1;
    pose.rotation += sign * t * .028;
    pose.dx += sign * t * .32;
  }
  const ctx = input.ctx;

  drawShadow(ctx, feetX, feetY, state, opacity * (state === 'dash' ? .8 : 1), pose.dy);
  drawDashLanding(ctx, feetX, feetY, input.dir, dashRecovery, opacity);

  if (!image || !image.complete || image.naturalWidth !== 1200 || image.naturalHeight !== 240) {
    drawLoadingDuck(ctx, feetX, feetY, opacity);
    document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-remastered-loading';
    return;
  }

  if (state === 'walk') {
    drawFootfallDust(ctx, feetX, feetY, pose.index, input.dir, opacity);
    drawWalkStepAccent(ctx, feetX, feetY, pose.index, input.dir, opacity);
  }

  if (state === 'dash') {
    const v = dashVector(input.dir);
    drawDashBurst(ctx, feetX, feetY, input.dir, tick, opacity);
    for (let i = 4; i >= 1; i--) {
      const ghostAlpha = opacity * (.028 + (5 - i) * .028);
      drawFrame(ctx, image, input.dir, pose, feetX, feetY, ghostAlpha, -v.x * i * 4.4, -v.y * i * 4.4);
    }
  }

  const actorFeetX = feetX + pose.dx;
  const actorFeetY = feetY + pose.dy;
  const authoredWeapon = state === 'shoot' || state === 'interact';
  const detachedWeapon = state === 'down' && tick >= 7;
  const wp = weaponAnchor(input.dir, actorFeetX, actorFeetY, 0, pose.rotation);
  if (!authoredWeapon && !detachedWeapon && wp.behind) {
    drawWeapon(ctx, input.dir, actorFeetX, actorFeetY, opacity, 0, pose.rotation);
    drawGrip(ctx, input.dir, actorFeetX, actorFeetY, opacity, pose.rotation);
  }

  drawFrame(ctx, image, input.dir, pose, feetX, feetY, opacity * (state === 'dash' ? .94 : 1));

  if (!authoredWeapon && !detachedWeapon && !wp.behind) {
    drawWeapon(ctx, input.dir, actorFeetX, actorFeetY, opacity, 0, pose.rotation);
    drawGrip(ctx, input.dir, actorFeetX, actorFeetY, opacity, pose.rotation);
  }
  if (detachedWeapon) {
    drawDroppedWeapon(ctx, input.dir, feetX, feetY, opacity, tick);
    drawDownImpact(ctx, feetX, feetY, tick, opacity);
  }

  if (state === 'shoot') {
    drawShotGlow(ctx, input.dir, actorFeetX, actorFeetY, opacity, tick, pose.rotation);
    if (tick <= 12) drawMuzzle(ctx, input.dir, actorFeetX, actorFeetY, opacity * Math.max(.46, 1 - tick * .052), tick, pose.rotation);
    drawCasing(ctx, input.dir, actorFeetX, actorFeetY, opacity, tick, pose.rotation);
  }

  if (state === 'hurt') {
    drawHurtAccent(ctx, actorFeetX, actorFeetY, input.dir, tick, opacity);
  }

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-remastered-v15';
  document.documentElement.dataset.duckHeistPlayerFrames = '120-authored-remastered-v15';
  document.documentElement.dataset.duckHeistPlayerState = state;
  document.documentElement.dataset.duckHeistPlayerVisualFrame = `${pose.authored}:${pose.index}`;
}
