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
  idle: 16,
  walk: 20,
  shoot: 14,
  dash: 18,
  hurt: 10,
  down: 20,
  interact: 14,
};

export const CHIBI_BASE_DUCK_V5_AUTHORED_FRAMES = 80;
export const CHIBI_BASE_DUCK_V5_RUNTIME_POSES = 448;

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
  if (state === 'shoot') return RUNTIME_FRAMES.shoot;
  if (state === 'dash') return RUNTIME_FRAMES.dash;
  if (state === 'hurt') return RUNTIME_FRAMES.hurt;
  if (state === 'interact') return RUNTIME_FRAMES.interact;
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
  if (state === 'idle') return Math.floor(globalFrame / 4) % count;
  if (state === 'walk') return globalFrame % count;
  if (state === 'down') return Math.min(count - 1, Math.floor(tick / 2));
  return Math.min(count - 1, tick);
}

function atlasIndex(state: VisualState, index: number): { atlasState: AtlasState; index: number } {
  if (state === 'idle') {
    const seq = [0,0,1,1,2,2,3,3,3,2,2,1,1,0,0,0];
    return { atlasState: 'idle', index: seq[index % seq.length] };
  }
  if (state === 'walk') {
    const seq = [0,1,1,2,2,3,3,4,4,5,5,4,4,3,3,2,2,1,1,0];
    return { atlasState: 'walk', index: seq[index % seq.length] };
  }
  if (state === 'shoot') {
    const seq = [0,0,1,2,3,3,2,2,1,1,0,0,0,0];
    return { atlasState: 'shoot', index: seq[index % seq.length] };
  }
  if (state === 'interact') {
    const seq = [0,1,2,3,4,5,5,5,4,3,2,1,0,0];
    return { atlasState: 'interact', index: seq[index % seq.length] };
  }
  if (state === 'dash') {
    const seq = [0,0,1,2,3,4,5,5,5,4,3,2,1,0,0,1,1,0];
    return { atlasState: 'walk', index: seq[index % seq.length] };
  }
  if (state === 'hurt') {
    const seq = [3,3,2,2,2,1,1,1,0,0];
    return { atlasState: 'idle', index: seq[index % seq.length] };
  }
  const seq = [2,2,2,2,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0];
  return { atlasState: 'idle', index: seq[index % seq.length] };
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
    const phase = (ri / RUNTIME_FRAMES.idle) * Math.PI * 2;
    const breath = Math.sin(phase);
    const sway = Math.sin(phase * .5);
    offsetY = ri >= 4 && ri <= 7 ? -1 : 0;
    offsetX = Math.abs(sway) > .92 ? Math.sign(sway) : 0;
    scaleX = 1 + breath * .012;
    scaleY = 1 - breath * .014;
    rotation = sway * .006;
    shadowScale = .98 - Math.max(0, -offsetY) * .03;
  } else if (state === 'walk') {
    const phase = (ri / RUNTIME_FRAMES.walk) * Math.PI * 2;
    const stride = Math.sin(phase);
    const lift = Math.abs(Math.sin(phase * 2));
    const side = Math.cos(phase);
    offsetY = -Math.round(lift * 1.25);
    if (dir === 'left' || dir === 'right') offsetX = Math.round(side * .55);
    rotation = stride * (dir === 'left' ? -.022 : .022);
    scaleX = 1 + lift * .018;
    scaleY = 1 - lift * .02;
    shadowScale = .94 + (1 - lift) * .06;
  } else if (state === 'shoot') {
    const recoilCurve = [0,-1,1,3,5,4,3,2,1,0,0,0,0,0];
    const recoil = recoilCurve[ri] ?? 0;
    const v = directionalOffset(dir, -recoil);
    offsetX = v.x;
    offsetY = v.y - (ri === 2 ? 1 : 0);
    const kickSign = dir === 'left' ? 1 : -1;
    rotation = (ri >= 3 && ri <= 6 ? .018 : 0) * kickSign;
    scaleX = 1 + Math.max(0,recoil) * .009;
    scaleY = 1 - Math.max(0,recoil) * .007;
    flash = ri === 3 ? .11 : ri === 4 ? .06 : 0;
  } else if (state === 'dash') {
    const t = ri / Math.max(1, RUNTIME_FRAMES.dash - 1);
    const launch = Math.sin(Math.min(1, t * 1.35) * Math.PI);
    const anticipation = ri < 3 ? (3 - ri) / 3 : 0;
    const recovery = ri > 13 ? (ri - 13) / 4 : 0;
    const along = .09 * launch - .035 * anticipation;
    const across = -.055 * launch + .025 * anticipation;
    if (dir === 'left' || dir === 'right') {
      scaleX = 1 + along;
      scaleY = 1 + across;
    } else {
      scaleX = 1 + across;
      scaleY = 1 + along;
    }
    const nudge = directionalOffset(dir, Math.round(launch * 2));
    offsetX = nudge.x;
    offsetY = nudge.y - Math.round(launch);
    rotation = (dir === 'left' ? -.025 : dir === 'right' ? .025 : 0) * launch;
    if (recovery > 0) {
      scaleX += Math.sin(recovery * Math.PI) * .015;
      scaleY -= Math.sin(recovery * Math.PI) * .015;
    }
    shadowScale = 1.05 + launch * .17;
  } else if (state === 'hurt') {
    const t = ri / Math.max(1, RUNTIME_FRAMES.hurt - 1);
    const knock = Math.round((1 - t) * 3);
    const v = directionalOffset(dir, -knock);
    offsetX = v.x + (ri % 2 === 0 ? -1 : 1);
    offsetY = v.y - (ri < 3 ? 1 : 0);
    rotation = (ri % 2 === 0 ? -1 : 1) * (1 - t) * .06;
    scaleX = 1.05 - t * .04;
    scaleY = .95 + t * .04;
    flash = Math.max(0, .48 - ri * .055);
  } else if (state === 'down') {
    const t = ri / Math.max(1, RUNTIME_FRAMES.down - 1);
    const eased = 1 - Math.pow(1 - t, 2.2);
    rotation = (dir === 'left' ? -1 : 1) * eased * 1.22;
    scaleX = 1 + Math.sin(t * Math.PI) * .08 + t * .08;
    scaleY = 1 - eased * .2;
    offsetY = Math.round(eased * 6);
    offsetX = dir === 'left' ? -Math.round(eased * 2) : dir === 'right' ? Math.round(eased * 2) : 0;
    shadowScale = 1 + eased * .2;
  } else if (state === 'interact') {
    const phase = (ri / Math.max(1,RUNTIME_FRAMES.interact - 1)) * Math.PI;
    const lift = Math.sin(phase);
    offsetY = -Math.round(lift * 3);
    scaleX = 1 - lift * .025;
    scaleY = 1 + lift * .035;
    rotation = Math.sin(phase * 2) * .014;
    shadowScale = 1 - lift * .12;
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
    for (let i = 6; i >= 1; i--) {
      rt.renderer.submitSprite({
        id: `duck-v5-ghost-${i}`,
        layer: RenderLayer.ACTORS,
        sortY: feetY - .2,
        order: -20 + i,
        x: x - v.x * i * 4,
        y: y - v.y * i * 4,
        width,
        height,
        pivotX: PIVOT_X * pose.scaleX,
        pivotY: PIVOT_Y * pose.scaleY,
        rotation: pose.rotation,
        color: [1, .91, .62, opacity * (.025 + i * .014)],
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

  if (state === 'shoot' && pose.runtimeIndex >= 3 && pose.runtimeIndex <= 6) {
    const mp = muzzlePose(input.dir, feetX, feetY);
    const pulse = pose.runtimeIndex === 3 || pose.runtimeIndex === 4 ? 13 : 9;
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

  document.documentElement.dataset.duckHeistPlayerRenderer = 'webgl2-chibi-atlas-v5-motion-v2';
  document.documentElement.dataset.duckHeistPlayerFrames = '80-authored-448-runtime-poses';
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

  document.documentElement.dataset.duckHeistPlayerRenderer = 'canvas2d-chibi-atlas-v5-motion-v2-fallback';
  document.documentElement.dataset.duckHeistPlayerFrames = '80-authored-448-runtime-poses';
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
