import type { DuckDir } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';
import { RenderLayer } from './types';
import { createGpuBackend } from './gpu/backend';
import { drawChibiPlayerV3 } from './playerChibiV3';

type Ctx = CanvasRenderingContext2D;
type VisualState = 'idle' | 'walk' | 'shoot' | 'dash' | 'hurt' | 'down' | 'interact';
type AtlasState = 'idle' | 'walk' | 'shoot' | 'interact';

const ATLAS_URL = new URL('../../assets/chibi/base-duck-final-atlas.png', import.meta.url).href;
const ATLAS_W = 1040;
const ATLAS_H = 208;
const FRAME_W = 52;
const FRAME_H = 52;
const COLS = 20;
const ROWS = 4;
const DRAW_W = 32;
const DRAW_H = 32;
const PIVOT_X = 16;
const PIVOT_Y = 29;
const TEXTURE_ID = 'base-duck-v5-premium-atlas';
const WEAPON_TEXTURE_ID = 'base-duck-v5-held-weapon';
const MUZZLE_TEXTURE_ID = 'base-duck-v5-muzzle';

const STATE_START: Record<AtlasState, number> = { idle: 0, walk: 4, shoot: 10, interact: 14 };
const STATE_FRAMES: Record<AtlasState, number> = { idle: 4, walk: 6, shoot: 4, interact: 6 };
const ROW: Record<DuckDir, number> = { down: 0, left: 1, right: 2, up: 3 };

const RUNTIME_FRAMES: Record<VisualState, number> = {
  idle: 12,
  walk: 16,
  shoot: 12,
  dash: 14,
  hurt: 8,
  down: 18,
  interact: 12,
};

export const CHIBI_BASE_DUCK_V5_AUTHORED_FRAMES = 80;
export const CHIBI_BASE_DUCK_V5_RUNTIME_POSES = 368;

export interface ChibiPlayerAtlasV5Input {
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
}

interface Pose {
  atlasState: AtlasState;
  atlasIndex: number;
  runtimeIndex: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  flash: number;
  shadowScale: number;
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
  c.width = 16;
  c.height = 9;
  const g = c.getContext('2d', { alpha: true });
  if (g) {
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#151a20'; g.fillRect(1, 1, 14, 6);
    g.fillStyle = '#36434d'; g.fillRect(3, 2, 10, 4);
    g.fillStyle = '#7b8d95'; g.fillRect(4, 2, 6, 1);
    g.fillStyle = '#d3aa50'; g.fillRect(2, 3, 2, 2);
    g.fillStyle = '#101319'; g.fillRect(10, 6, 3, 3);
  }
  weaponCanvas = c;
  return c;
}

function makeMuzzleCanvas(): HTMLCanvasElement {
  if (muzzleCanvas) return muzzleCanvas;
  const c = document.createElement('canvas');
  c.width = 12;
  c.height = 12;
  const g = c.getContext('2d', { alpha: true });
  if (g) {
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#fff7c2'; g.fillRect(4, 1, 4, 10); g.fillRect(1, 4, 10, 4);
    g.fillStyle = '#ffd45d'; g.fillRect(3, 3, 6, 6);
    g.fillStyle = '#f08c35'; g.fillRect(5, 0, 2, 12); g.fillRect(0, 5, 12, 2);
    g.fillStyle = '#fffbea'; g.fillRect(5, 5, 2, 2);
  }
  muzzleCanvas = c;
  return c;
}

function desiredState(input: ChibiPlayerAtlasV5Input): VisualState {
  if (input.dead) return 'down';
  if (input.hurt) return 'hurt';
  if (input.dashing) return 'dash';
  if (input.shooting) return 'shoot';
  if (input.interacting) return 'interact';
  if (input.moving) return 'walk';
  return 'idle';
}

function lockFrames(state: VisualState): number {
  if (state === 'shoot') return 12;
  if (state === 'dash') return 14;
  if (state === 'hurt') return 8;
  if (state === 'interact') return 12;
  return 0;
}

function resolveState(input: ChibiPlayerAtlasV5Input): { state: VisualState; tick: number } {
  const key = input.runtimeKey ?? fallbackRuntime;
  let rt = runtimes.get(key);
  if (!rt || input.frame < rt.lastFrame) {
    rt = { state: 'idle', enteredAt: input.frame, lastFrame: input.frame, lastShoot: false, lastDash: false, lastHurt: false };
    runtimes.set(key, rt);
  }

  const desired = desiredState(input);
  const shotChanged = input.shotSequence !== undefined && input.shotSequence !== rt.lastShot;
  const retrigger =
    (desired === 'shoot' && (shotChanged || input.shooting && !rt.lastShoot)) ||
    (desired === 'dash' && input.dashing && !rt.lastDash) ||
    (desired === 'hurt' && input.hurt && !rt.lastHurt);
  const elapsed = input.frame - rt.enteredAt;
  const locked = rt.state === 'down' || elapsed < lockFrames(rt.state);

  if (desired === 'down' && rt.state !== 'down') {
    rt.state = 'down';
    rt.enteredAt = input.frame;
  } else if (retrigger) {
    rt.state = desired;
    rt.enteredAt = input.frame;
  } else if (!locked && rt.state !== desired) {
    rt.state = desired;
    rt.enteredAt = input.frame;
  }

  rt.lastFrame = input.frame;
  rt.lastShoot = input.shooting;
  rt.lastDash = input.dashing;
  rt.lastHurt = input.hurt;
  rt.lastShot = input.shotSequence;
  return { state: rt.state, tick: Math.max(0, input.frame - rt.enteredAt) };
}

function runtimeIndex(state: VisualState, tick: number, globalFrame: number): number {
  const count = RUNTIME_FRAMES[state];
  if (state === 'idle') return Math.floor(globalFrame / 5) % count;
  if (state === 'walk') return Math.floor(globalFrame / 2) % count;
  if (state === 'down') return Math.min(count - 1, Math.floor(tick / 2));
  return Math.min(count - 1, tick);
}

function atlasIndex(state: VisualState, index: number): { atlasState: AtlasState; index: number } {
  if (state === 'idle') {
    const seq = [0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 0];
    return { atlasState: 'idle', index: seq[index % seq.length] };
  }
  if (state === 'walk') {
    const seq = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 4, 3, 2, 1];
    return { atlasState: 'walk', index: seq[index % seq.length] };
  }
  if (state === 'shoot') {
    const seq = [0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 0];
    return { atlasState: 'shoot', index: seq[index % seq.length] };
  }
  if (state === 'interact') {
    return { atlasState: 'interact', index: Math.min(5, Math.floor(index / 2)) };
  }
  if (state === 'dash') {
    const seq = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 1, 2, 3];
    return { atlasState: 'walk', index: seq[index % seq.length] };
  }
  if (state === 'hurt') {
    return { atlasState: 'idle', index: index < 2 ? 3 : index < 5 ? 2 : 1 };
  }
  return { atlasState: 'idle', index: index < 7 ? 2 : index < 13 ? 1 : 0 };
}

function directionalOffset(dir: DuckDir, amount: number): { x: number; y: number } {
  if (dir === 'left') return { x: -amount, y: 0 };
  if (dir === 'right') return { x: amount, y: 0 };
  if (dir === 'up') return { x: 0, y: -amount };
  return { x: 0, y: amount };
}

function poseFor(state: VisualState, tick: number, globalFrame: number, dir: DuckDir): Pose {
  const ri = runtimeIndex(state, tick, globalFrame);
  const base = atlasIndex(state, ri);
  let scaleX = 1;
  let scaleY = 1;
  let rotation = 0;
  let offsetX = 0;
  let offsetY = 0;
  let flash = 0;
  let shadowScale = 1;

  if (state === 'idle') {
    const breath = Math.sin((ri / RUNTIME_FRAMES.idle) * Math.PI * 2);
    offsetY = ri === 3 || ri === 4 ? -1 : 0;
    scaleX = 1 + breath * .012;
    scaleY = 1 - breath * .012;
    shadowScale = 1 - Math.max(0, -offsetY) * .04;
  } else if (state === 'walk') {
    const stride = Math.sin((ri / RUNTIME_FRAMES.walk) * Math.PI * 4);
    offsetY = -Math.round(Math.abs(stride));
    rotation = stride * .018;
    scaleX = 1 + Math.abs(stride) * .016;
    scaleY = 1 - Math.abs(stride) * .018;
    shadowScale = .96 + (1 - Math.abs(stride)) * .04;
  } else if (state === 'shoot') {
    const recoil = [0, 1, 3, 4, 3, 2, 1, 0, 0, 0, 0, 0][ri] ?? 0;
    const v = directionalOffset(dir, -recoil);
    offsetX = v.x;
    offsetY = v.y;
    scaleX = 1 + recoil * .008;
    scaleY = 1 - recoil * .006;
  } else if (state === 'dash') {
    const t = ri / Math.max(1, RUNTIME_FRAMES.dash - 1);
    const wave = Math.sin(t * Math.PI);
    scaleX = 1.06 + wave * .08;
    scaleY = .94 - wave * .05;
    offsetY = -1;
    shadowScale = 1.12 + wave * .12;
  } else if (state === 'hurt') {
    rotation = (ri % 2 === 0 ? -1 : 1) * .055;
    offsetX = ri % 2 === 0 ? -1 : 1;
    offsetY = -1;
    scaleX = 1.05;
    scaleY = .95;
    flash = ri < 5 ? .42 - ri * .055 : .08;
  } else if (state === 'down') {
    const t = ri / Math.max(1, RUNTIME_FRAMES.down - 1);
    rotation = (dir === 'left' ? -1 : 1) * t * 1.18;
    scaleX = 1 + t * .12;
    scaleY = 1 - t * .18;
    offsetY = Math.round(t * 5);
    shadowScale = 1 + t * .16;
  } else if (state === 'interact') {
    const wave = Math.sin((ri / RUNTIME_FRAMES.interact) * Math.PI * 2);
    offsetY = -Math.round(Math.max(0, wave));
    rotation = wave * .018;
  }

  return { atlasState: base.atlasState, atlasIndex: base.index, runtimeIndex: ri, scaleX, scaleY, rotation, offsetX, offsetY, flash, shadowScale };
}

function regionFor(dir: DuckDir, pose: Pose) {
  const col = STATE_START[pose.atlasState] + Math.min(STATE_FRAMES[pose.atlasState] - 1, pose.atlasIndex);
  const row = ROW[dir];
  return {
    col,
    row,
    region: { textureId: TEXTURE_ID, u0: col / COLS, v0: row / ROWS, u1: (col + 1) / COLS, v1: (row + 1) / ROWS },
  };
}

function dashVector(dir: DuckDir): { x: number; y: number } {
  if (dir === 'left') return { x: -1, y: 0 };
  if (dir === 'right') return { x: 1, y: 0 };
  if (dir === 'up') return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function ensureGpu(image: HTMLImageElement) {
  if (gpu === null) return undefined;
  if (!gpu) {
    const canvas = document.createElement('canvas');
    try {
      const renderer = createGpuBackend(canvas, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, quality: 'high', powerPreference: 'high-performance' });
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

function weaponPose(dir: DuckDir, feetX: number, feetY: number, bob = 0) {
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

function drawGpu(input: ChibiPlayerAtlasV5Input, image: HTMLImageElement, state: VisualState, pose: Pose, feetX: number, feetY: number, opacity: number): boolean {
  const rt = ensureGpu(image);
  if (!rt) return false;
  const selected = regionFor(input.dir, pose);
  const width = Math.round(DRAW_W * pose.scaleX);
  const height = Math.round(DRAW_H * pose.scaleY);
  const x = feetX + pose.offsetX;
  const y = feetY + pose.offsetY;

  rt.renderer.beginFrame({
    camera: { x: 0, y: 0, zoom: 1 },
    tick: input.frame,
    style: { ambientDarkness: 0, ambientTint: [1, .985, .95], tintStrength: .018, vignette: 0, lightStrength: .15, exposure: 1.1, gamma: 1.04, saturation: 1.055 },
  });

  rt.renderer.submitShadow('duck-v5-shadow', feetX, feetY + 1, 18 * pose.shadowScale, 4.5, .24 * opacity, feetY - 1);

  if (state === 'dash') {
    const v = dashVector(input.dir);
    for (let i = 4; i >= 1; i--) {
      rt.renderer.submitSprite({
        id: `duck-v5-ghost-${i}`,
        layer: RenderLayer.ACTORS,
        sortY: feetY - .2,
        order: -20 + i,
        x: x - v.x * i * 5,
        y: y - v.y * i * 5,
        width,
        height,
        pivotX: PIVOT_X * pose.scaleX,
        pivotY: PIVOT_Y * pose.scaleY,
        rotation: pose.rotation,
        color: [1, .9, .55, opacity * (.035 + i * .02)],
        region: selected.region,
        effects: { rim: .08 },
      });
    }
  }

  const separateWeapon = state !== 'shoot' && state !== 'interact' && state !== 'down';
  const wp = weaponPose(input.dir, feetX, feetY, pose.offsetY);
  if (separateWeapon && wp.order < 0) {
    rt.renderer.submitSprite({
      id: 'duck-v5-weapon-back', layer: RenderLayer.ACTORS, sortY: feetY, order: wp.order,
      x: wp.x, y: wp.y, width: 16, height: 9, pivotX: 8, pivotY: 4.5, rotation: wp.rotation,
      color: [1, 1, 1, opacity], region: { textureId: WEAPON_TEXTURE_ID, u0: 0, v0: 0, u1: 1, v1: 1 }, effects: { metallic: .28, sheen: .16 },
    });
  }

  rt.renderer.submitSprite({
    id: 'duck-v5-premium',
    layer: RenderLayer.ACTORS,
    sortY: feetY,
    order: 0,
    x,
    y,
    width,
    height,
    pivotX: PIVOT_X * pose.scaleX,
    pivotY: PIVOT_Y * pose.scaleY,
    rotation: pose.rotation,
    color: [1, 1, 1, opacity * (state === 'dash' ? .94 : 1)],
    region: selected.region,
    effects: { outline: .065, rim: input.hurt ? .24 : .055, flash: pose.flash },
  });

  if (separateWeapon && wp.order >= 0) {
    rt.renderer.submitSprite({
      id: 'duck-v5-weapon-front', layer: RenderLayer.ACTORS, sortY: feetY, order: wp.order,
      x: wp.x, y: wp.y, width: 16, height: 9, pivotX: 8, pivotY: 4.5, rotation: wp.rotation,
      color: [1, 1, 1, opacity], region: { textureId: WEAPON_TEXTURE_ID, u0: 0, v0: 0, u1: 1, v1: 1 }, effects: { metallic: .28, sheen: .16 },
    });
  }

  if (state === 'shoot' && pose.runtimeIndex >= 2 && pose.runtimeIndex <= 5) {
    const mp = muzzlePose(input.dir, feetX, feetY);
    const pulse = pose.runtimeIndex === 2 || pose.runtimeIndex === 3 ? 12 : 9;
    rt.renderer.submitSprite({
      id: 'duck-v5-muzzle', layer: RenderLayer.PROJECTILES, sortY: feetY + .1, order: 5,
      x: mp.x, y: mp.y, width: pulse, height: pulse, pivotX: pulse / 2, pivotY: pulse / 2, rotation: mp.rotation,
      color: [1, 1, 1, opacity], region: { textureId: MUZZLE_TEXTURE_ID, u0: 0, v0: 0, u1: 1, v1: 1 }, blend: 'add', effects: { emissive: .9 },
    });
    rt.renderer.submitLight({ x: mp.x, y: mp.y, radius: 28, color: [1, .68, .22], intensity: .18, innerRadius: .2, falloff: 2.2, priority: 99 });
  }

  rt.renderer.submitLight({ x: feetX, y: feetY - 14, radius: 30, color: [1, .83, .52], intensity: .035, innerRadius: .2, falloff: 2 });
  rt.renderer.endFrame();
  rt.renderer.gl.finish();

  input.ctx.save();
  input.ctx.imageSmoothingEnabled = false;
  input.ctx.drawImage(rt.canvas, 0, 0);
  input.ctx.restore();

  document.documentElement.dataset.duckHeistPlayerRenderer = 'webgl2-chibi-atlas-v5';
  document.documentElement.dataset.duckHeistPlayerFrames = '80-authored-368-runtime-poses';
  document.documentElement.dataset.duckHeistPlayerFrame = `${state}:${pose.runtimeIndex}:${selected.row}:${selected.col}`;
  return true;
}

function drawCanvasFallback(input: ChibiPlayerAtlasV5Input, image: HTMLImageElement, state: VisualState, pose: Pose, feetX: number, feetY: number, opacity: number): void {
  const selected = regionFor(input.dir, pose);
  const sx = selected.col * FRAME_W;
  const sy = selected.row * FRAME_H;
  const w = Math.round(DRAW_W * pose.scaleX);
  const h = Math.round(DRAW_H * pose.scaleY);
  const x = feetX + pose.offsetX;
  const y = feetY + pose.offsetY;

  input.ctx.save();
  input.ctx.imageSmoothingEnabled = false;
  input.ctx.globalAlpha = .24 * opacity;
  input.ctx.fillStyle = '#17161b';
  input.ctx.beginPath(); input.ctx.ellipse(feetX, feetY + 1, 9 * pose.shadowScale, 2.2, 0, 0, Math.PI * 2); input.ctx.fill();
  input.ctx.globalAlpha = opacity;
  input.ctx.translate(x, y);
  input.ctx.rotate(pose.rotation);
  input.ctx.drawImage(image, sx, sy, FRAME_W, FRAME_H, -PIVOT_X * pose.scaleX, -PIVOT_Y * pose.scaleY, w, h);
  input.ctx.restore();

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-atlas-v5-fallback';
  document.documentElement.dataset.duckHeistPlayerFrames = '80-authored-368-runtime-poses';
  document.documentElement.dataset.duckHeistPlayerFrame = `${state}:${pose.runtimeIndex}:${selected.row}:${selected.col}`;
}

function drawLoadingFallback(input: ChibiPlayerAtlasV5Input, feetX: number, feetY: number, opacity: number): void {
  const g = input.ctx;
  g.save();
  g.globalAlpha = opacity;
  g.imageSmoothingEnabled = false;
  g.fillStyle = 'rgba(17,16,20,.22)'; g.beginPath(); g.ellipse(feetX, feetY + 1, 8, 2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b2026'; g.beginPath(); g.arc(feetX, feetY - 15, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f3da58'; g.beginPath(); g.arc(feetX, feetY - 15, 7.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ef9b39'; g.fillRect(feetX - 5, feetY - 11, 10, 3);
  g.fillStyle = '#f3da58'; g.fillRect(feetX - 6, feetY - 7, 12, 6);
  g.restore();
}

export function drawChibiPlayerAtlasV5(input: ChibiPlayerAtlasV5Input): void {
  if (typeof document === 'undefined') return;

  if (input.skinId && input.skinId !== 'robber') {
    drawChibiPlayerV3(input);
    return;
  }

  const image = getAtlas();
  const feetX = Math.round(input.x + 8);
  const feetY = Math.round(input.y + 18);
  const opacity = Math.max(0, Math.min(1, input.alpha ?? 1));
  const resolved = resolveState(input);
  const pose = poseFor(resolved.state, resolved.tick, input.frame, input.dir);

  if (!image || !image.complete || image.naturalWidth !== ATLAS_W || image.naturalHeight !== ATLAS_H) {
    drawLoadingFallback(input, feetX, feetY, opacity);
    return;
  }
  if (drawGpu(input, image, resolved.state, pose, feetX, feetY, opacity)) return;
  drawCanvasFallback(input, image, resolved.state, pose, feetX, feetY, opacity);
}
