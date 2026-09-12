import type { DuckDir } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';
import { RenderLayer } from './types';
import { createGpuBackend } from './gpu/backend';
import { drawChibiPlayerAtlasV5 } from './playerChibiAtlasV5';

type Ctx = CanvasRenderingContext2D;
type VisualState = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact';

const ATLAS_URL = new URL('../../assets/chibi/base-duck-definitive-atlas.png', import.meta.url).href;
const FRAME_W = 52;
const FRAME_H = 52;
const COLS = 76;
const ROWS = 8;
const ATLAS_W = COLS * FRAME_W;
const ATLAS_H = ROWS * FRAME_H;
const DRAW_W = 31;
const DRAW_H = 31;
const PIVOT_X = 15.5;
const PIVOT_Y = 28.0;
const TEXTURE_ID = 'base-duck-definitive-atlas';
const WEAPON_TEXTURE_ID = 'base-duck-definitive-held-weapon';
const MUZZLE_TEXTURE_ID = 'base-duck-definitive-muzzle';

const DIR_INDEX: Record<DuckDir, number> = { down: 0, left: 1, right: 2, up: 3 };
const STATE_META: Record<VisualState, { bank: 0 | 1; start: number; count: number }> = {
  idle: { bank: 0, start: 0, count: 16 },
  walk: { bank: 0, start: 16, count: 24 },
  shoot: { bank: 0, start: 40, count: 16 },
  dash: { bank: 0, start: 56, count: 20 },
  hurt: { bank: 1, start: 0, count: 12 },
  down: { bank: 1, start: 12, count: 20 },
  interact: { bank: 1, start: 32, count: 16 },
};

export const DUCK_DEFINITIVE_SOURCE_AUTHORED_FRAMES = 80;
export const DUCK_DEFINITIVE_BAKED_RASTER_FRAMES = 496;
export const DUCK_DEFINITIVE_DIRECTIONAL_FRAMES = 124;

export interface ChibiPlayerDefinitiveInput {
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
  state: VisualState;
  enteredAt: number;
  lastFrame: number;
  lastShot?: number;
  lastShoot: boolean;
  lastDash: boolean;
  lastHurt: boolean;
  lastInteract: boolean;
}

const runtimes = new WeakMap<object, Runtime>();
const fallbackRuntime = {};
let atlas: HTMLImageElement | undefined;
let weaponCanvas: HTMLCanvasElement | undefined;
let muzzleCanvas: HTMLCanvasElement | undefined;

type Backend = NonNullable<ReturnType<typeof createGpuBackend>>;
let gpu: {
  canvas: HTMLCanvasElement;
  renderer: Backend;
  atlasReady: boolean;
  weaponReady: boolean;
  muzzleReady: boolean;
} | null | undefined;

function getAtlas(): HTMLImageElement | undefined {
  if (typeof Image === 'undefined') return undefined;
  if (!atlas) {
    atlas = new Image();
    atlas.decoding = 'async';
    atlas.src = ATLAS_URL;
  }
  return atlas;
}

function makeWeaponCanvas(): HTMLCanvasElement {
  if (weaponCanvas) return weaponCanvas;
  const c = document.createElement('canvas');
  c.width = 18;
  c.height = 10;
  const g = c.getContext('2d', { alpha: true });
  if (g) {
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#0e1217'; g.fillRect(1, 2, 16, 6);
    g.fillStyle = '#27343d'; g.fillRect(3, 2, 11, 5);
    g.fillStyle = '#61737d'; g.fillRect(4, 2, 7, 1);
    g.fillStyle = '#c59b48'; g.fillRect(2, 4, 2, 2);
    g.fillStyle = '#0b0e12'; g.fillRect(11, 7, 4, 3);
    g.fillStyle = '#8d6d34'; g.fillRect(12, 7, 2, 2);
  }
  weaponCanvas = c;
  return c;
}

function makeMuzzleCanvas(): HTMLCanvasElement {
  if (muzzleCanvas) return muzzleCanvas;
  const c = document.createElement('canvas');
  c.width = 14;
  c.height = 14;
  const g = c.getContext('2d', { alpha: true });
  if (g) {
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#fffbed'; g.fillRect(6, 0, 2, 14); g.fillRect(0, 6, 14, 2);
    g.fillStyle = '#ffe47b'; g.fillRect(4, 2, 6, 10); g.fillRect(2, 4, 10, 6);
    g.fillStyle = '#f1a43f'; g.fillRect(5, 4, 4, 6); g.fillRect(4, 5, 6, 4);
    g.fillStyle = '#fffef7'; g.fillRect(6, 6, 2, 2);
  }
  muzzleCanvas = c;
  return c;
}

function desiredState(input: ChibiPlayerDefinitiveInput): VisualState {
  if (input.dead) return 'down';
  if (input.hurt) return 'hurt';
  if (input.dashing) return 'dash';
  if (input.shooting) return 'shoot';
  if (input.interacting) return 'interact';
  if (input.moving) return 'walk';
  return 'idle';
}

function lockTicks(state: VisualState): number {
  if (state === 'shoot') return 16;
  if (state === 'dash') return 20;
  if (state === 'hurt') return 12;
  if (state === 'interact') return 24;
  return 0;
}

function resolveState(input: ChibiPlayerDefinitiveInput): { state: VisualState; tick: number } {
  const key = input.runtimeKey ?? fallbackRuntime;
  let rt = runtimes.get(key);
  if (!rt || input.frame < rt.lastFrame) {
    rt = {
      state: 'idle', enteredAt: input.frame, lastFrame: input.frame,
      lastShoot: false, lastDash: false, lastHurt: false, lastInteract: false,
    };
    runtimes.set(key, rt);
  }

  const desired = desiredState(input);
  const shotChanged = input.shotSequence !== undefined && input.shotSequence !== rt.lastShot;
  const retrigger =
    (desired === 'shoot' && (shotChanged || (input.shooting && !rt.lastShoot))) ||
    (desired === 'dash' && input.dashing && !rt.lastDash) ||
    (desired === 'hurt' && input.hurt && !rt.lastHurt) ||
    (desired === 'interact' && !!input.interacting && !rt.lastInteract);

  const elapsed = input.frame - rt.enteredAt;
  const locked = rt.state === 'down' || elapsed < lockTicks(rt.state);

  if (desired === 'down' && rt.state !== 'down') {
    rt.state = 'down'; rt.enteredAt = input.frame;
  } else if (retrigger) {
    rt.state = desired; rt.enteredAt = input.frame;
  } else if (!locked && rt.state !== desired) {
    rt.state = desired; rt.enteredAt = input.frame;
  }

  rt.lastFrame = input.frame;
  rt.lastShoot = input.shooting;
  rt.lastDash = input.dashing;
  rt.lastHurt = input.hurt;
  rt.lastInteract = !!input.interacting;
  rt.lastShot = input.shotSequence;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt) };
}

function frameIndex(state: VisualState, tick: number, globalFrame: number): number {
  const count = STATE_META[state].count;
  if (state === 'idle') return Math.floor(globalFrame / 5) % count;
  if (state === 'walk') return Math.floor(globalFrame / 2) % count;
  if (state === 'down') return Math.min(count - 1, Math.floor(tick / 2));
  if (state === 'interact') return Math.min(count - 1, Math.floor(tick / 1.5));
  return Math.min(count - 1, tick);
}

function regionFor(dir: DuckDir, state: VisualState, index: number) {
  const meta = STATE_META[state];
  const col = meta.start + Math.min(meta.count - 1, index);
  const row = DIR_INDEX[dir] * 2 + meta.bank;
  return {
    col,
    row,
    region: {
      textureId: TEXTURE_ID,
      u0: col / COLS,
      v0: row / ROWS,
      u1: (col + 1) / COLS,
      v1: (row + 1) / ROWS,
    },
  };
}

function dirVector(dir: DuckDir): { x: number; y: number } {
  if (dir === 'left') return { x: -1, y: 0 };
  if (dir === 'right') return { x: 1, y: 0 };
  if (dir === 'up') return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function weaponBob(state: VisualState, index: number): number {
  if (state === 'walk') return -Math.round(Math.abs(Math.sin((index / 24) * Math.PI * 2)));
  if (state === 'dash') return -1;
  if (state === 'hurt') return index < 4 ? -1 : 0;
  return 0;
}

function weaponPose(dir: DuckDir, feetX: number, feetY: number, bob: number) {
  if (dir === 'left') return { x: feetX - 12, y: feetY - 14 + bob, rotation: Math.PI, order: 1 };
  if (dir === 'right') return { x: feetX + 12, y: feetY - 14 + bob, rotation: 0, order: 1 };
  if (dir === 'up') return { x: feetX, y: feetY - 23 + bob, rotation: -Math.PI / 2, order: -1 };
  return { x: feetX, y: feetY - 8 + bob, rotation: Math.PI / 2, order: 1 };
}

function muzzlePose(dir: DuckDir, feetX: number, feetY: number) {
  if (dir === 'left') return { x: feetX - 21, y: feetY - 14, rotation: Math.PI };
  if (dir === 'right') return { x: feetX + 21, y: feetY - 14, rotation: 0 };
  if (dir === 'up') return { x: feetX, y: feetY - 31, rotation: -Math.PI / 2 };
  return { x: feetX, y: feetY, rotation: Math.PI / 2 };
}

function ensureGpu(image: HTMLImageElement) {
  if (gpu === null) return undefined;
  if (!gpu) {
    const canvas = document.createElement('canvas');
    try {
      const renderer = createGpuBackend(canvas, {
        width: CANVAS_WIDTH, height: CANVAS_HEIGHT, quality: 'high', powerPreference: 'high-performance',
      });
      if (!renderer) { gpu = null; return undefined; }
      gpu = { canvas, renderer, atlasReady: false, weaponReady: false, muzzleReady: false };
    } catch {
      gpu = null;
      return undefined;
    }
  }
  if (!gpu.atlasReady && image.complete && image.naturalWidth === ATLAS_W && image.naturalHeight === ATLAS_H) {
    gpu.renderer.registerTexture({ id: TEXTURE_ID, source: image, nearest: true, premultiplyAlpha: false });
    gpu.atlasReady = true;
  }
  if (!gpu.weaponReady) {
    gpu.renderer.registerTexture({ id: WEAPON_TEXTURE_ID, source: makeWeaponCanvas(), nearest: true, premultiplyAlpha: false });
    gpu.weaponReady = true;
  }
  if (!gpu.muzzleReady) {
    gpu.renderer.registerTexture({ id: MUZZLE_TEXTURE_ID, source: makeMuzzleCanvas(), nearest: true, premultiplyAlpha: false });
    gpu.muzzleReady = true;
  }
  return gpu.atlasReady ? gpu : undefined;
}

function shouldDrawSeparateWeapon(state: VisualState): boolean {
  return state === 'idle' || state === 'walk' || state === 'dash' || state === 'hurt';
}

function drawGpu(
  input: ChibiPlayerDefinitiveInput,
  image: HTMLImageElement,
  state: VisualState,
  index: number,
  feetX: number,
  feetY: number,
  opacity: number,
): boolean {
  const rt = ensureGpu(image);
  if (!rt) return false;
  const selected = regionFor(input.dir, state, index);
  const bob = weaponBob(state, index);
  const wp = weaponPose(input.dir, feetX, feetY, bob);

  rt.renderer.beginFrame({
    camera: { x: 0, y: 0, zoom: 1 },
    tick: input.frame,
    style: {
      ambientDarkness: 0,
      ambientTint: [1, .985, .95],
      tintStrength: .018,
      vignette: 0,
      lightStrength: .16,
      exposure: 1.1,
      gamma: 1.04,
      saturation: 1.06,
    },
  });

  const shadowPulse = state === 'walk' ? .94 + Math.abs(Math.cos((index / 24) * Math.PI * 2)) * .06
    : state === 'dash' ? 1.12 : state === 'down' ? 1.18 : 1;
  rt.renderer.submitShadow('duck-definitive-shadow', feetX, feetY + 1, 17.5 * shadowPulse, 4.2, .23 * opacity, feetY - 1);

  if (state === 'dash') {
    const v = dirVector(input.dir);
    for (let i = 4; i >= 1; i--) {
      rt.renderer.submitSprite({
        id: `duck-definitive-ghost-${i}`,
        layer: RenderLayer.ACTORS,
        sortY: feetY - .2,
        order: -20 + i,
        x: feetX - v.x * i * 4,
        y: feetY - v.y * i * 4,
        width: DRAW_W,
        height: DRAW_H,
        pivotX: PIVOT_X,
        pivotY: PIVOT_Y,
        rotation: 0,
        color: [1, .91, .64, opacity * (.028 + i * .013)],
        region: selected.region,
        effects: { rim: .08 },
      });
    }
  }

  if (shouldDrawSeparateWeapon(state) && wp.order < 0) {
    rt.renderer.submitSprite({
      id: 'duck-definitive-weapon-back', layer: RenderLayer.ACTORS, sortY: feetY, order: wp.order,
      x: wp.x, y: wp.y, width: 18, height: 10, pivotX: 9, pivotY: 5, rotation: wp.rotation,
      color: [1, 1, 1, opacity],
      region: { textureId: WEAPON_TEXTURE_ID, u0: 0, v0: 0, u1: 1, v1: 1 },
      effects: { metallic: .3, sheen: .18 },
    });
  }

  rt.renderer.submitSprite({
    id: 'duck-definitive-player',
    layer: RenderLayer.ACTORS,
    sortY: feetY,
    order: 0,
    x: feetX,
    y: feetY,
    width: DRAW_W,
    height: DRAW_H,
    pivotX: PIVOT_X,
    pivotY: PIVOT_Y,
    rotation: 0,
    color: [1, 1, 1, opacity],
    region: selected.region,
    effects: { outline: .055, rim: input.hurt ? .22 : .05, flash: input.hurt && index < 6 ? .13 : 0 },
  });

  if (shouldDrawSeparateWeapon(state) && wp.order >= 0) {
    rt.renderer.submitSprite({
      id: 'duck-definitive-weapon-front', layer: RenderLayer.ACTORS, sortY: feetY, order: wp.order,
      x: wp.x, y: wp.y, width: 18, height: 10, pivotX: 9, pivotY: 5, rotation: wp.rotation,
      color: [1, 1, 1, opacity],
      region: { textureId: WEAPON_TEXTURE_ID, u0: 0, v0: 0, u1: 1, v1: 1 },
      effects: { metallic: .3, sheen: .18 },
    });
  }

  if (state === 'shoot' && index >= 4 && index <= 7) {
    const mp = muzzlePose(input.dir, feetX, feetY);
    const pulse = index === 4 || index === 5 ? 14 : 10;
    rt.renderer.submitSprite({
      id: 'duck-definitive-muzzle', layer: RenderLayer.PROJECTILES, sortY: feetY + .1, order: 6,
      x: mp.x, y: mp.y, width: pulse, height: pulse, pivotX: pulse / 2, pivotY: pulse / 2, rotation: mp.rotation,
      color: [1, 1, 1, opacity],
      region: { textureId: MUZZLE_TEXTURE_ID, u0: 0, v0: 0, u1: 1, v1: 1 },
      blend: 'add', effects: { emissive: .95 },
    });
    rt.renderer.submitLight({
      x: mp.x, y: mp.y, radius: 30, color: [1, .69, .24], intensity: .2, innerRadius: .2, falloff: 2.2, priority: 99,
    });
  }

  rt.renderer.submitLight({
    x: feetX, y: feetY - 14, radius: 30, color: [1, .84, .54], intensity: .035, innerRadius: .2, falloff: 2,
  });
  rt.renderer.endFrame();
  rt.renderer.gl.finish();

  input.ctx.save();
  input.ctx.imageSmoothingEnabled = false;
  input.ctx.drawImage(rt.canvas, 0, 0);
  input.ctx.restore();

  document.documentElement.dataset.duckHeistPlayerRenderer = 'webgl2-duck-definitive';
  document.documentElement.dataset.duckHeistPlayerFrames = '496-baked-raster-from-80-approved-source-frames';
  document.documentElement.dataset.duckHeistPlayerFrame = `${state}:${index}:${selected.row}:${selected.col}`;
  return true;
}

function drawWeaponCanvas(ctx: Ctx, dir: DuckDir, feetX: number, feetY: number, bob: number, opacity: number) {
  const wp = weaponPose(dir, feetX, feetY, bob);
  const weapon = makeWeaponCanvas();
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(wp.x, wp.y);
  ctx.rotate(wp.rotation);
  ctx.drawImage(weapon, -9, -5);
  ctx.restore();
}

function drawCanvasFallback(
  input: ChibiPlayerDefinitiveInput,
  image: HTMLImageElement,
  state: VisualState,
  index: number,
  feetX: number,
  feetY: number,
  opacity: number,
): void {
  const selected = regionFor(input.dir, state, index);
  const sx = selected.col * FRAME_W;
  const sy = selected.row * FRAME_H;
  const bob = weaponBob(state, index);
  const separateWeapon = shouldDrawSeparateWeapon(state);
  const wp = weaponPose(input.dir, feetX, feetY, bob);

  input.ctx.save();
  input.ctx.imageSmoothingEnabled = false;
  input.ctx.globalAlpha = .23 * opacity;
  input.ctx.fillStyle = '#17161b';
  input.ctx.beginPath(); input.ctx.ellipse(feetX, feetY + 1, state === 'dash' ? 10.5 : 8.8, 2.1, 0, 0, Math.PI * 2); input.ctx.fill();
  input.ctx.restore();

  if (separateWeapon && wp.order < 0) drawWeaponCanvas(input.ctx, input.dir, feetX, feetY, bob, opacity);

  input.ctx.save();
  input.ctx.imageSmoothingEnabled = false;
  input.ctx.globalAlpha = opacity;
  input.ctx.drawImage(image, sx, sy, FRAME_W, FRAME_H, feetX - PIVOT_X, feetY - PIVOT_Y, DRAW_W, DRAW_H);
  input.ctx.restore();

  if (separateWeapon && wp.order >= 0) drawWeaponCanvas(input.ctx, input.dir, feetX, feetY, bob, opacity);

  if (state === 'shoot' && index >= 4 && index <= 7) {
    const mp = muzzlePose(input.dir, feetX, feetY);
    const muzzle = makeMuzzleCanvas();
    input.ctx.save();
    input.ctx.globalCompositeOperation = 'lighter';
    input.ctx.globalAlpha = opacity;
    input.ctx.translate(mp.x, mp.y);
    input.ctx.rotate(mp.rotation);
    input.ctx.drawImage(muzzle, -7, -7);
    input.ctx.restore();
  }

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-duck-definitive-fallback';
  document.documentElement.dataset.duckHeistPlayerFrames = '496-baked-raster-from-80-approved-source-frames';
  document.documentElement.dataset.duckHeistPlayerFrame = `${state}:${index}:${selected.row}:${selected.col}`;
}

function drawLoadingFallback(input: ChibiPlayerDefinitiveInput, feetX: number, feetY: number, opacity: number): void {
  const g = input.ctx;
  g.save();
  g.globalAlpha = opacity;
  g.imageSmoothingEnabled = false;
  g.fillStyle = 'rgba(17,16,20,.22)'; g.beginPath(); g.ellipse(feetX, feetY + 1, 8, 2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b2026'; g.beginPath(); g.arc(feetX, feetY - 14, 8.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f3da58'; g.beginPath(); g.arc(feetX, feetY - 14, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ef9b39'; g.fillRect(feetX - 5, feetY - 10, 10, 3);
  g.fillStyle = '#f3da58'; g.fillRect(feetX - 6, feetY - 6, 12, 5);
  g.restore();
}

export function drawChibiPlayerDefinitive(input: ChibiPlayerDefinitiveInput): void {
  if (typeof document === 'undefined') return;
  if (input.skinId && input.skinId !== 'robber') {
    drawChibiPlayerAtlasV5(input);
    return;
  }

  const image = getAtlas();
  const feetX = Math.round(input.x + 8);
  const feetY = Math.round(input.y + 18);
  const opacity = Math.max(0, Math.min(1, input.alpha ?? 1));
  const resolved = resolveState(input);
  const index = frameIndex(resolved.state, resolved.tick, input.frame);

  if (!image || !image.complete || image.naturalWidth !== ATLAS_W || image.naturalHeight !== ATLAS_H) {
    drawLoadingFallback(input, feetX, feetY, opacity);
    return;
  }
  if (drawGpu(input, image, resolved.state, index, feetX, feetY, opacity)) return;
  drawCanvasFallback(input, image, resolved.state, index, feetX, feetY, opacity);
}
