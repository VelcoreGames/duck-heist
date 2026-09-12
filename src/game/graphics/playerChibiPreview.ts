import { getSkin, type DuckPalette } from '../data';
import type { DuckDir } from '../types';
import { CHIBI_PLAYER_PLAN } from './chibiProduction';
import type { CharacterState } from './types';

type Ctx = CanvasRenderingContext2D;

const FRAME = 64;
const PIVOT_X = 32;
const PIVOT_Y = 55;
const CACHE_LIMIT = 512;

const OUTLINE = '#171820';
const OUTLINE_SOFT = '#262934';
const CREAM = '#f4e2a2';
const CREAM_LIGHT = '#fff0bd';
const CREAM_SHADE = '#d7bb72';
const ORANGE = '#ef8f28';
const ORANGE_DARK = '#c96518';
const HAIR = '#181922';
const HAIR_LIGHT = '#30313d';
const GLASS = '#a8d6df';
const GLASS_SHINE = '#e7fbff';
const CLOTH = '#26343a';
const CLOTH_LIGHT = '#3d535a';
const CLOTH_DARK = '#16242a';
const METAL = '#66747d';
const METAL_LIGHT = '#a9bbc1';
const GOLD = '#e5bc54';

interface ChibiPlayerDrawInput {
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
  skinId?: string;
  alpha?: number;
  runtimeKey?: object;
  shotSequence?: number;
}

interface CachedFrame {
  key: string;
  canvas: HTMLCanvasElement;
  stamp: number;
}

interface PlayerPalette {
  body: string;
  light: string;
  shade: string;
  beak: string;
  beakDark: string;
  cloth: string;
  clothLight: string;
  accent: string;
}

const cache = new Map<string, CachedFrame>();
let stamp = 0;

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, _pixel = 1): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function pixelEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, step = 2): void {
  ctx.fillStyle = color;
  const safeRx = Math.max(step, rx);
  const safeRy = Math.max(step, ry);
  for (let yy = -safeRy; yy <= safeRy; yy += step) {
    const n = yy / safeRy;
    const span = Math.floor((safeRx * Math.sqrt(Math.max(0, 1 - n * n))) / step) * step;
    ctx.fillRect(Math.round(cx - span), Math.round(cy + yy), Math.max(step, span * 2 + step), step);
  }
}

function pixelDiamond(ctx: Ctx, cx: number, cy: number, r: number, color: string, step = 2): void {
  ctx.fillStyle = color;
  for (let yy = -r; yy <= r; yy += step) {
    const span = Math.max(step, r - Math.abs(yy));
    ctx.fillRect(Math.round(cx - span), Math.round(cy + yy), Math.round(span * 2), step);
  }
}

function paletteFor(skinId?: string): PlayerPalette {
  const skin = skinId ? getSkin(skinId) : undefined;
  const pal = skin?.palette as DuckPalette | undefined;
  const body = pal?.body ?? CREAM;
  const shade = pal?.shade ?? CREAM_SHADE;
  const light = pal?.dark === body ? CREAM_LIGHT : CREAM_LIGHT;
  return {
    body,
    light,
    shade,
    beak: pal?.beak ?? ORANGE,
    beakDark: pal?.beakDark ?? ORANGE_DARK,
    cloth: pal?.pack ?? CLOTH,
    clothLight: CLOTH_LIGHT,
    accent: skin?.overlay === 'gold' || skin?.overlay === 'king' ? GOLD : '#b43e45',
  };
}

interface PlayerVisualRuntime {
  state: CharacterState;
  enteredAt: number;
  lockUntil: number;
  lastFrame: number;
  lastShooting: boolean;
  lastDashing: boolean;
  lastHurt: boolean;
  lastShotSequence?: number;
}

const fallbackRuntimeKey = {};
const runtimeByKey = new WeakMap<object, PlayerVisualRuntime>();

function desiredState(input: ChibiPlayerDrawInput): CharacterState {
  if (input.dead) return 'down';
  if (input.hurt) return 'hurt';
  if (input.dashing) return 'dash';
  if (input.shooting) return 'shoot';
  if (input.moving) return 'walk';
  return 'idle';
}

function statePriority(state: CharacterState): number {
  switch (state) {
    case 'down': return 100;
    case 'hurt': return 90;
    case 'dash': return 80;
    case 'shoot': return 70;
    case 'interact': return 60;
    case 'celebrate': return 50;
    case 'walk': return 20;
    default: return 10;
  }
}

function stateVisualDuration(state: CharacterState): number {
  const spec = CHIBI_PLAYER_PLAN[state];
  if (!spec) return 0;
  if (state === 'down') return Number.POSITIVE_INFINITY;
  return spec.frames * Math.max(1, spec.frameDuration);
}

function freshRuntime(frame: number): PlayerVisualRuntime {
  return {
    state: 'idle', enteredAt: frame, lockUntil: frame, lastFrame: frame,
    lastShooting: false, lastDashing: false, lastHurt: false,
  };
}

function resolveVisualState(input: ChibiPlayerDrawInput): { state: CharacterState; stateTick: number } {
  const key = input.runtimeKey ?? fallbackRuntimeKey;
  let runtime = runtimeByKey.get(key);
  if (!runtime || input.frame < runtime.lastFrame) {
    runtime = freshRuntime(input.frame);
    runtimeByKey.set(key, runtime);
  }

  const desired = desiredState(input);
  const shotChanged = input.shotSequence !== undefined &&
    input.shotSequence !== runtime.lastShotSequence;
  const edgeRetrigger =
    (desired === 'shoot' && (shotChanged || (input.shooting && !runtime.lastShooting))) ||
    (desired === 'dash' && input.dashing && !runtime.lastDashing) ||
    (desired === 'hurt' && input.hurt && !runtime.lastHurt);

  const higherPriority = statePriority(desired) > statePriority(runtime.state);
  const lockExpired = input.frame >= runtime.lockUntil;
  const canEnter = desired !== runtime.state && (higherPriority || lockExpired);
  const canRetrigger = edgeRetrigger && statePriority(desired) >= statePriority(runtime.state);

  if (canEnter || canRetrigger) {
    runtime.state = desired;
    runtime.enteredAt = input.frame;
    const duration = stateVisualDuration(desired);
    runtime.lockUntil = Number.isFinite(duration) ? input.frame + duration : Number.POSITIVE_INFINITY;
  } else if ((runtime.state === 'idle' || runtime.state === 'walk') && desired !== runtime.state) {
    runtime.state = desired;
    runtime.enteredAt = input.frame;
    const duration = stateVisualDuration(desired);
    runtime.lockUntil = Number.isFinite(duration) ? input.frame + duration : Number.POSITIVE_INFINITY;
  }

  runtime.lastFrame = input.frame;
  runtime.lastShooting = input.shooting;
  runtime.lastDashing = input.dashing;
  runtime.lastHurt = input.hurt;
  runtime.lastShotSequence = input.shotSequence;

  return { state: runtime.state, stateTick: Math.max(0, input.frame - runtime.enteredAt) };
}

function frameCount(state: CharacterState): number {
  return CHIBI_PLAYER_PLAN[state]?.frames ?? 1;
}

function frameDuration(state: CharacterState): number {
  return CHIBI_PLAYER_PLAN[state]?.frameDuration ?? 4;
}

function visualFrame(state: CharacterState, tick: number): number {
  const count = frameCount(state);
  const duration = Math.max(1, frameDuration(state));
  const raw = Math.floor(Math.max(0, tick) / duration);
  const loop = CHIBI_PLAYER_PLAN[state]?.loop ?? true;
  return loop ? raw % count : Math.min(count - 1, raw);
}

function stateMotion(state: CharacterState, index: number): {
  bob: number;
  squashX: number;
  squashY: number;
  lean: number;
  step: number;
  recoil: number;
  blink: boolean;
  wing: number;
} {
  const count = Math.max(1, frameCount(state));
  const t = index / count;
  switch (state) {
    case 'walk': {
      const cycle = Math.sin(t * Math.PI * 4);
      return {
        bob: -Math.round(Math.abs(cycle) * 2),
        squashX: 1 + Math.abs(cycle) * 0.035,
        squashY: 1 - Math.abs(cycle) * 0.035,
        lean: Math.sin(t * Math.PI * 2) * 0.5,
        step: cycle,
        recoil: 0,
        blink: false,
        wing: Math.sin(t * Math.PI * 4),
      };
    }
    case 'shoot': {
      const kick = index < 3 ? index / 2 : Math.max(0, 1 - (index - 2) / 6);
      return { bob: 0, squashX: 1 + kick * 0.035, squashY: 1 - kick * 0.035, lean: 0, step: 0, recoil: kick * 3, blink: false, wing: 1 };
    }
    case 'dash': {
      const rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
      return { bob: -1, squashX: 1.12 + rise * 0.08, squashY: 0.86 - rise * 0.05, lean: 0, step: 0, recoil: 0, blink: true, wing: -0.6 };
    }
    case 'hurt': {
      const shake = index % 2 === 0 ? -2 : 2;
      return { bob: -1, squashX: 1.08, squashY: 0.92, lean: shake, step: 0, recoil: 0, blink: true, wing: -1 };
    }
    case 'down': {
      const p = Math.min(1, index / Math.max(1, count - 1));
      return { bob: Math.round(p * 7), squashX: 1 + p * 0.28, squashY: 1 - p * 0.38, lean: p * 2, step: 0, recoil: 0, blink: true, wing: -0.5 };
    }
    case 'interact': {
      const wave = Math.sin(t * Math.PI * 2);
      return { bob: -Math.round(Math.max(0, wave)), squashX: 1, squashY: 1, lean: 0, step: 0, recoil: 0, blink: false, wing: wave };
    }
    case 'celebrate': {
      const jump = Math.max(0, Math.sin(t * Math.PI * 4));
      return { bob: -Math.round(jump * 5), squashX: 1 - jump * 0.04, squashY: 1 + jump * 0.05, lean: Math.sin(t * Math.PI * 4), step: 0, recoil: 0, blink: false, wing: 1 };
    }
    default: {
      const breath = Math.sin(t * Math.PI * 2);
      return { bob: -Math.round(Math.max(0, breath) * 1), squashX: 1 + breath * 0.012, squashY: 1 - breath * 0.012, lean: 0, step: 0, recoil: 0, blink: index === 8 || index === 9, wing: 0 };
    }
  }
}

function drawFeet(ctx: Ctx, pal: PlayerPalette, dir: DuckDir, step: number, downProgress: number): void {
  if (dir === 'up') {
    const swing = Math.round(step * 2);
    pixelEllipse(ctx, 26 - swing, 53, 5, 2, OUTLINE, 1);
    pixelEllipse(ctx, 38 + swing, 53, 5, 2, OUTLINE, 1);
    pixelEllipse(ctx, 26 - swing, 52, 4, 2, pal.beak, 1);
    pixelEllipse(ctx, 38 + swing, 52, 4, 2, pal.beak, 1);
    return;
  }
  if (downProgress > 0.7) {
    pixelEllipse(ctx, 23, 54, 6, 2, OUTLINE, 1);
    pixelEllipse(ctx, 41, 54, 6, 2, OUTLINE, 1);
    pixelEllipse(ctx, 23, 53, 5, 2, pal.beak, 1);
    pixelEllipse(ctx, 41, 53, 5, 2, pal.beak, 1);
    return;
  }
  const swing = Math.round(step * 3);
  if (dir === 'left' || dir === 'right') {
    const front = dir === 'right' ? 1 : -1;
    pixelEllipse(ctx, 29 + swing * front, 54, 6, 2, OUTLINE, 1);
    pixelEllipse(ctx, 38 - swing * front, 53, 5, 2, OUTLINE, 1);
    pixelEllipse(ctx, 29 + swing * front, 53, 5, 2, pal.beak, 1);
    pixelEllipse(ctx, 38 - swing * front, 52, 4, 2, pal.beak, 1);
  } else {
    pixelEllipse(ctx, 25 - swing, 54, 6, 2, OUTLINE, 1);
    pixelEllipse(ctx, 39 + swing, 54, 6, 2, OUTLINE, 1);
    pixelEllipse(ctx, 25 - swing, 53, 5, 2, pal.beak, 1);
    pixelEllipse(ctx, 39 + swing, 53, 5, 2, pal.beak, 1);
  }
}

function drawBackpack(ctx: Ctx, pal: PlayerPalette, dir: DuckDir, bob: number): void {
  if (dir === 'down') return;
  if (dir === 'up') {
    pixelEllipse(ctx, 32, 36 + bob, 13, 11, OUTLINE, 2);
    pixelEllipse(ctx, 32, 35 + bob, 11, 9, pal.cloth, 2);
    rect(ctx, 24, 35 + bob, 16, 3, pal.clothLight);
    rect(ctx, 30, 40 + bob, 4, 3, pal.accent);
    return;
  }
  const sideX = dir === 'right' ? 23 : 41;
  pixelEllipse(ctx, sideX, 37 + bob, 8, 10, OUTLINE, 2);
  pixelEllipse(ctx, sideX, 36 + bob, 6, 8, pal.cloth, 2);
  rect(ctx, sideX - 4, 34 + bob, 8, 2, pal.clothLight);
}

function drawBody(ctx: Ctx, pal: PlayerPalette, dir: DuckDir, motion: ReturnType<typeof stateMotion>): void {
  const bodyY = 39 + motion.bob;
  const bodyRx = Math.round(14 * motion.squashX);
  const bodyRy = Math.round(12 * motion.squashY);
  pixelEllipse(ctx, 32, bodyY, bodyRx + 2, bodyRy + 2, OUTLINE, 2);
  pixelEllipse(ctx, 32, bodyY - 1, bodyRx, bodyRy, pal.body, 2);
  pixelEllipse(ctx, 29, bodyY - 4, Math.max(4, bodyRx - 5), Math.max(3, bodyRy - 6), pal.light, 2);
  rect(ctx, 21, bodyY + 5, 22, 3, pal.shade);

  // Chaleco criminal/banco: da identidad y separa cabeza/cuerpo.
  rect(ctx, 21, bodyY - 1, 22, 8, pal.cloth);
  rect(ctx, 23, bodyY, 18, 2, pal.clothLight);
  rect(ctx, 30, bodyY, 4, 7, CLOTH_DARK);
  rect(ctx, 31, bodyY + 1, 2, 4, pal.accent);

  const wingShift = Math.round(motion.wing * 3);
  if (dir === 'down' || dir === 'up') {
    pixelEllipse(ctx, 19 - Math.max(0, wingShift), bodyY + 1, 6, 8, OUTLINE, 2);
    pixelEllipse(ctx, 45 + Math.max(0, wingShift), bodyY + 1, 6, 8, OUTLINE, 2);
    pixelEllipse(ctx, 20 - Math.max(0, wingShift), bodyY, 4, 6, pal.body, 2);
    pixelEllipse(ctx, 44 + Math.max(0, wingShift), bodyY, 4, 6, pal.body, 2);
  } else {
    const front = dir === 'right' ? 47 : 17;
    const back = dir === 'right' ? 18 : 46;
    pixelEllipse(ctx, back, bodyY + 1, 5, 7, OUTLINE, 2);
    pixelEllipse(ctx, back, bodyY, 3, 5, pal.shade, 2);
    pixelEllipse(ctx, front + (dir === 'right' ? wingShift : -wingShift), bodyY, 7, 5, OUTLINE, 2);
    pixelEllipse(ctx, front + (dir === 'right' ? wingShift : -wingShift), bodyY - 1, 5, 3, pal.body, 2);
  }
}

function drawHair(ctx: Ctx, dir: DuckDir, headY: number): void {
  if (dir === 'up') {
    rect(ctx, 20, headY - 12, 24, 9, HAIR);
    rect(ctx, 18, headY - 8, 5, 10, HAIR);
    rect(ctx, 41, headY - 9, 5, 11, HAIR);
    rect(ctx, 23, headY - 15, 6, 5, HAIR);
    rect(ctx, 29, headY - 17, 7, 6, HAIR);
    rect(ctx, 36, headY - 14, 6, 5, HAIR);
    rect(ctx, 23, headY - 11, 16, 2, HAIR_LIGHT);
    return;
  }
  if (dir === 'down') {
    rect(ctx, 20, headY - 12, 24, 7, HAIR);
    rect(ctx, 19, headY - 9, 5, 9, HAIR);
    rect(ctx, 41, headY - 9, 5, 8, HAIR);
    rect(ctx, 22, headY - 15, 6, 6, HAIR);
    rect(ctx, 27, headY - 17, 6, 7, HAIR);
    rect(ctx, 33, headY - 16, 5, 6, HAIR);
    rect(ctx, 38, headY - 13, 6, 5, HAIR);
    rect(ctx, 23, headY - 10, 14, 2, HAIR_LIGHT);
    return;
  }
  const flip = dir === 'left' ? -1 : 1;
  const center = 32;
  rect(ctx, 20, headY - 12, 24, 8, HAIR);
  rect(ctx, flip > 0 ? 19 : 40, headY - 9, 5, 10, HAIR);
  rect(ctx, 24, headY - 16, 7, 6, HAIR);
  rect(ctx, 30, headY - 18, 7, 7, HAIR);
  rect(ctx, 36, headY - 15, 6, 6, HAIR);
  rect(ctx, center - 8, headY - 10, 14, 2, HAIR_LIGHT);
}

function drawFace(ctx: Ctx, pal: PlayerPalette, dir: DuckDir, headY: number, blink: boolean): void {
  if (dir === 'up') return;
  if (dir === 'down') {
    // lentes cuadrados grandes
    rect(ctx, 20, headY - 3, 11, 8, OUTLINE, 1);
    rect(ctx, 33, headY - 3, 11, 8, OUTLINE, 1);
    rect(ctx, 22, headY - 1, 7, 4, GLASS, 1);
    rect(ctx, 35, headY - 1, 7, 4, GLASS, 1);
    rect(ctx, 31, headY, 2, 2, OUTLINE, 1);
    rect(ctx, 23, headY - 1, 2, 1, GLASS_SHINE, 1);
    rect(ctx, 36, headY - 1, 2, 1, GLASS_SHINE, 1);
    if (blink) {
      rect(ctx, 24, headY + 1, 4, 1, OUTLINE, 1);
      rect(ctx, 37, headY + 1, 4, 1, OUTLINE, 1);
    } else {
      rect(ctx, 25, headY, 2, 3, OUTLINE, 1);
      rect(ctx, 38, headY, 2, 3, OUTLINE, 1);
      rect(ctx, 25, headY, 1, 1, '#fff', 1);
      rect(ctx, 38, headY, 1, 1, '#fff', 1);
    }
    pixelEllipse(ctx, 32, headY + 7, 7, 4, OUTLINE, 1);
    pixelEllipse(ctx, 32, headY + 6, 6, 3, pal.beak, 1);
    rect(ctx, 27, headY + 7, 10, 1, pal.beakDark);
    return;
  }

  const side = dir === 'right' ? 1 : -1;
  const eyeX = 32 + side * 7;
  rect(ctx, eyeX - 5, headY - 3, 10, 8, OUTLINE, 1);
  rect(ctx, eyeX - 3, headY - 1, 6, 4, GLASS, 1);
  rect(ctx, eyeX - 2, headY - 1, 2, 1, GLASS_SHINE, 1);
  if (blink) rect(ctx, eyeX - 2, headY + 1, 4, 1, OUTLINE, 1);
  else rect(ctx, eyeX + side, headY, 2, 3, OUTLINE, 1);
  const beakX = 32 + side * 17;
  rect(ctx, side > 0 ? beakX - 2 : beakX - 8, headY + 4, 10, 5, OUTLINE, 1);
  rect(ctx, side > 0 ? beakX - 1 : beakX - 7, headY + 5, 8, 3, pal.beak, 1);
  rect(ctx, side > 0 ? beakX : beakX - 6, headY + 7, 6, 1, pal.beakDark, 1);
}

function drawHead(ctx: Ctx, pal: PlayerPalette, dir: DuckDir, motion: ReturnType<typeof stateMotion>, downProgress: number): void {
  const headY = 22 + motion.bob + Math.round(downProgress * 6);
  const rx = Math.round((dir === 'left' || dir === 'right' ? 14 : 16) * motion.squashX);
  const ry = Math.round(15 * motion.squashY);
  pixelEllipse(ctx, 32, headY, rx + 2, ry + 2, OUTLINE, 2);
  pixelEllipse(ctx, 32, headY - 1, rx, ry, pal.body, 2);
  pixelEllipse(ctx, 27, headY - 5, Math.max(4, rx - 6), 5, pal.light, 2);
  if (dir === 'up') rect(ctx, 22, headY + 6, 20, 4, pal.shade);
  drawHair(ctx, dir, headY);
  drawFace(ctx, pal, dir, headY, motion.blink);
}

function drawWeapon(ctx: Ctx, dir: DuckDir, motion: ReturnType<typeof stateMotion>, state: CharacterState, index: number): void {
  const recoil = Math.round(motion.recoil);
  const muzzle = state === 'shoot' && index >= 2 && index <= 3;
  const y = 39 + motion.bob;
  ctx.save();
  if (dir === 'right') {
    rect(ctx, 43 - recoil, y - 5, 13, 6, OUTLINE, 1);
    rect(ctx, 45 - recoil, y - 4, 10, 4, METAL, 1);
    rect(ctx, 47 - recoil, y - 3, 7, 1, METAL_LIGHT, 1);
    rect(ctx, 45 - recoil, y, 4, 5, OUTLINE, 1);
    rect(ctx, 46 - recoil, y, 2, 4, CLOTH_DARK, 1);
    if (muzzle) {
      pixelDiamond(ctx, 60, y - 2, 5, '#fff4b0', 1);
      pixelDiamond(ctx, 59, y - 2, 3, ORANGE, 1);
    }
  } else if (dir === 'left') {
    rect(ctx, 8 + recoil, y - 5, 13, 6, OUTLINE, 1);
    rect(ctx, 9 + recoil, y - 4, 10, 4, METAL, 1);
    rect(ctx, 10 + recoil, y - 3, 7, 1, METAL_LIGHT, 1);
    rect(ctx, 15 + recoil, y, 4, 5, OUTLINE, 1);
    rect(ctx, 16 + recoil, y, 2, 4, CLOTH_DARK, 1);
    if (muzzle) {
      pixelDiamond(ctx, 4, y - 2, 5, '#fff4b0', 1);
      pixelDiamond(ctx, 5, y - 2, 3, ORANGE, 1);
    }
  } else if (dir === 'up') {
    rect(ctx, 28, 18 + recoil, 8, 17, OUTLINE, 1);
    rect(ctx, 30, 19 + recoil, 4, 14, METAL, 1);
    rect(ctx, 31, 19 + recoil, 2, 9, METAL_LIGHT, 1);
    if (muzzle) pixelDiamond(ctx, 32, 12, 5, '#fff4b0', 1);
  } else {
    rect(ctx, 28, 39 - recoil, 8, 18, OUTLINE, 1);
    rect(ctx, 30, 40 - recoil, 4, 14, METAL, 1);
    rect(ctx, 31, 41 - recoil, 2, 8, METAL_LIGHT, 1);
    if (muzzle) pixelDiamond(ctx, 32, 61, 4, '#fff4b0', 1);
  }
  ctx.restore();
}

function drawDashTrails(ctx: Ctx, dir: DuckDir, index: number): void {
  const fade = Math.max(0, 1 - index / 16);
  ctx.globalAlpha = 0.22 + fade * 0.16;
  const horizontal = dir === 'left' || dir === 'right';
  if (horizontal) {
    const right = dir === 'right';
    for (let i = 0; i < 4; i++) {
      const x = right ? 7 - i * 6 : 57 + i * 6;
      rect(ctx, x, 25 + i * 5, 10 + i * 3, 2, i % 2 ? CREAM_LIGHT : ORANGE);
    }
  } else {
    const down = dir === 'down';
    for (let i = 0; i < 4; i++) {
      const y = down ? 8 - i * 5 : 58 + i * 5;
      rect(ctx, 20 + i * 5, y, 16, 2, i % 2 ? CREAM_LIGHT : ORANGE);
    }
  }
  ctx.globalAlpha = 1;
}

function drawSkinAccent(ctx: Ctx, skinId: string | undefined, dir: DuckDir): void {
  const overlay = skinId ? getSkin(skinId)?.overlay : undefined;
  if (!overlay || overlay === 'none') return;
  if (overlay === 'gold' || overlay === 'king') {
    rect(ctx, 25, 4, 14, 4, OUTLINE, 1);
    rect(ctx, 26, 4, 12, 3, GOLD, 1);
    rect(ctx, 26, 1, 3, 4, GOLD, 1);
    rect(ctx, 31, 0, 3, 5, '#fff1a5', 1);
    rect(ctx, 36, 1, 3, 4, GOLD, 1);
  } else if (overlay === 'fedora') {
    rect(ctx, 18, 5, 28, 4, OUTLINE, 1);
    rect(ctx, 22, 0, 20, 7, HAIR, 1);
    rect(ctx, 22, 5, 20, 2, '#a9373e', 1);
  } else if (overlay === 'chef') {
    pixelEllipse(ctx, 32, 4, 12, 6, OUTLINE, 2);
    pixelEllipse(ctx, 32, 3, 10, 5, '#f4f5ef', 2);
    rect(ctx, 23, 6, 18, 4, '#d8ddd8', 1);
  } else if (overlay === 'ninja') {
    rect(ctx, 18, 8, 28, 7, OUTLINE, 1);
    rect(ctx, 20, 9, 24, 5, '#20232b', 1);
    rect(ctx, dir === 'left' ? 14 : 42, 10, 10, 2, '#b23b43', 1);
  } else if (overlay === 'prison') {
    rect(ctx, 22, 37, 20, 2, '#f4f4f4', 1);
    rect(ctx, 22, 43, 20, 2, '#f4f4f4', 1);
  }
}

function renderFrame(state: CharacterState, dir: DuckDir, index: number, skinId?: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME;
  canvas.height = FRAME;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  const pal = paletteFor(skinId);
  const motion = stateMotion(state, index);
  const downProgress = state === 'down' ? index / Math.max(1, frameCount(state) - 1) : 0;

  if (state === 'dash') drawDashTrails(ctx, dir, index);
  drawFeet(ctx, pal, dir, motion.step, downProgress);
  drawBackpack(ctx, pal, dir, motion.bob);
  if (dir === 'up') drawWeapon(ctx, dir, motion, state, index);
  drawBody(ctx, pal, dir, motion);
  drawHead(ctx, pal, dir, motion, downProgress);
  drawSkinAccent(ctx, skinId, dir);
  if (dir !== 'up') drawWeapon(ctx, dir, motion, state, index);

  if (state === 'hurt') {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = index % 2 === 0 ? 0.5 : 0.18;
    rect(ctx, 0, 0, FRAME, FRAME, '#fff2d4');
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  return canvas;
}

function cacheKey(state: CharacterState, dir: DuckDir, index: number, skinId?: string): string {
  return `${skinId ?? 'robber'}|${state}|${dir}|${index}`;
}

function cachedFrame(state: CharacterState, dir: DuckDir, index: number, skinId?: string): HTMLCanvasElement {
  const key = cacheKey(state, dir, index, skinId);
  const hit = cache.get(key);
  if (hit) {
    hit.stamp = ++stamp;
    return hit.canvas;
  }
  const canvas = renderFrame(state, dir, index, skinId);
  cache.set(key, { key, canvas, stamp: ++stamp });
  if (cache.size > CACHE_LIMIT) {
    let oldest: CachedFrame | undefined;
    for (const item of cache.values()) if (!oldest || item.stamp < oldest.stamp) oldest = item;
    if (oldest) cache.delete(oldest.key);
  }
  return canvas;
}

/**
 * First playable chibi protagonist for the v0.5 redesign.
 * The visual anchor is decoupled from the 16px gameplay hitbox: x/y stay in legacy
 * gameplay coordinates, while a 64x64 chibi sprite is anchored to the same feet point.
 *
 * This renderer intentionally follows the final production frame counts. Each state and
 * direction resolves to the same numbered frame contract that the authored atlas will use,
 * so replacing generated frames with final art does not require changing gameplay code.
 */
export function drawChibiPlayerPreview(input: ChibiPlayerDrawInput): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveVisualState(input);
  const state = resolved.state;
  const index = visualFrame(state, resolved.stateTick);
  const sprite = cachedFrame(state, input.dir, index, input.skinId);
  const feetX = Math.round(input.x + 8);
  const feetY = Math.round(input.y + 18);
  const opacity = Math.max(0, Math.min(1, input.alpha ?? 1));

  input.ctx.save();
  input.ctx.imageSmoothingEnabled = false;

  // Contact shadow follows gameplay feet rather than the oversized sprite bounds.
  input.ctx.globalAlpha = 0.28 * opacity;
  input.ctx.fillStyle = '#11131a';
  input.ctx.fillRect(feetX - 11, feetY - 1, 22, 3);
  input.ctx.fillRect(feetX - 8, feetY + 2, 16, 2);

  input.ctx.globalAlpha = opacity;
  if (input.dashing) input.ctx.globalAlpha *= 0.86;
  input.ctx.drawImage(sprite, feetX - PIVOT_X, feetY - PIVOT_Y);
  input.ctx.restore();
}

export function clearChibiPlayerFrameCache(): void {
  for (const item of cache.values()) {
    item.canvas.width = 1;
    item.canvas.height = 1;
  }
  cache.clear();
}

export const CHIBI_PLAYER_RUNTIME_FRAME_COUNT = Object.values(CHIBI_PLAYER_PLAN)
  .filter((value): value is NonNullable<typeof value> => !!value)
  .reduce((sum, spec) => sum + spec.frames, 0) * 4;
